"""凭据引用解析与日志/通知脱敏。"""

from __future__ import annotations

import json

import pytest

from lanius_engine.drivers.mock import MockDriver
from lanius_engine.history import truncate_summary
from lanius_engine.models import FlowFile, LaniusError
from lanius_engine.nodes.registry import default_registry
from lanius_engine.runtime.executor import Executor
from lanius_engine.runtime.secrets import (
    REDACTED,
    EnvSecretProvider,
    MemorySecretProvider,
    SecretRegistry,
    create_secret_provider,
    get_secret_registry,
    parse_secret_name,
    resolve_config_value,
    resolve_secret_ref,
)
from lanius_engine.runtime.state import ExecutionState


def test_parse_secret_name_strips_prefix() -> None:
    assert parse_secret_name("secret://erp-password") == "erp-password"
    assert parse_secret_name("erp.password_1") == "erp.password_1"


def test_parse_secret_name_rejects_illegal() -> None:
    with pytest.raises(LaniusError) as exc:
        parse_secret_name("secret://")
    assert exc.value.error.code == "engine.secret.invalidRef"
    with pytest.raises(LaniusError) as exc2:
        parse_secret_name("secret://bad name")
    assert exc2.value.error.code == "engine.secret.invalidRef"


def test_resolve_missing_raises() -> None:
    provider = MemorySecretProvider({})
    with pytest.raises(LaniusError) as exc:
        resolve_secret_ref("secret://missing", provider)
    assert exc.value.error.code == "engine.secret.notFound"


def test_resolve_remembers_for_redaction() -> None:
    registry = SecretRegistry()
    provider = MemorySecretProvider({"pw": "s3cret-value"})
    assert resolve_secret_ref("secret://pw", provider, registry=registry) == "s3cret-value"
    assert registry.redact_text("password=s3cret-value ok") == f"password={REDACTED} ok"
    assert registry.redact({"Authorization": "Bearer tok123"}) == {
        "Authorization": REDACTED
    }
    assert registry.redact_text("Authorization: Bearer tok123") == (
        f"Authorization: Bearer {REDACTED}"
    )


def test_resolve_config_value_object_and_string() -> None:
    provider = MemorySecretProvider({"x": "plain"})
    assert resolve_config_value({"secretRef": "secret://x"}, provider) == "plain"
    assert resolve_config_value("secret://x", provider) == "plain"
    assert resolve_config_value("hello", provider) == "hello"


def test_env_secret_provider(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LANIUS_SECRETS", json.dumps({"token": "abc"}))
    provider = EnvSecretProvider()
    assert provider.get("token") == "abc"
    assert provider.get("nope") is None


def test_env_secret_provider_invalid_json(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LANIUS_SECRETS", "{not-json")
    with pytest.raises(LaniusError) as exc:
        EnvSecretProvider()
    assert exc.value.error.code == "engine.secret.invalidEnv"


def test_create_secret_provider_memory() -> None:
    p = create_secret_provider({"a": "1"})
    assert p.get("a") == "1"


def test_truncate_summary_redacts_known_secrets() -> None:
    get_secret_registry().clear()
    get_secret_registry().remember("top-secret")
    assert truncate_summary({"password": "top-secret"}) == {"password": REDACTED}


def make_template(steps: list[dict], **overrides: object) -> FlowFile:
    raw = {
        "schemaVersion": 2,
        "id": "secret-flow",
        "name": "凭据",
        "steps": steps,
        **overrides,
    }
    return FlowFile.model_validate(raw)


async def test_set_var_secret_ref_redacts_log() -> None:
    get_secret_registry().clear()
    secrets = MemorySecretProvider({"erp-password": "P@ssw0rd!"})
    executor = Executor(default_registry(), MockDriver(), secrets=secrets)
    flow = make_template(
        [
            {
                "id": "set",
                "kind": "preset",
                "type": "data.setVar",
                "config": {"name": "pw", "value": {"secretRef": "secret://erp-password"}},
            }
        ]
    )
    events: list[tuple[str, dict]] = []
    record = await executor.start(
        flow, mode="dryRun", on_event=lambda e, p: events.append((e, p))
    )
    assert record.state == ExecutionState.DONE
    logs = [p for e, p in events if e == "execution.log" and p.get("nodeId") == "set"]
    assert logs
    assert "P@ssw0rd!" not in logs[0]["message"]
    assert REDACTED in logs[0]["message"]


async def test_type_text_resolves_secret_ref() -> None:
    get_secret_registry().clear()
    driver = MockDriver()
    secrets = MemorySecretProvider({"login": "hunter2"})
    executor = Executor(default_registry(), driver, secrets=secrets)
    flow = make_template(
        [
            {
                "id": "type",
                "kind": "preset",
                "type": "keyboard.type",
                "config": {"text": "secret://login"},
            }
        ],
        target={"match": {"exe": "app.exe"}, "locate": {"channel": "a11y", "source": "user"}},
    )
    driver.windows["hwnd-1"] = {"title": "App", "exe": "app.exe", "className": ""}
    record = await executor.start(flow, mode="run")
    assert record.state == ExecutionState.DONE
    typed = [c.args[0] for c in driver.calls if c.method == "type_text"]
    assert typed == ["hunter2"]


async def test_missing_secret_fails_execution() -> None:
    executor = Executor(
        default_registry(),
        MockDriver(),
        secrets=MemorySecretProvider({}),
    )
    flow = make_template(
        [
            {
                "id": "type",
                "kind": "preset",
                "type": "keyboard.type",
                "config": {"text": {"secretRef": "secret://nope"}},
            }
        ]
    )
    record = await executor.start(flow, mode="dryRun")
    assert record.state == ExecutionState.FAILED
    assert record.error is not None
    assert record.error["code"] == "engine.secret.notFound"
