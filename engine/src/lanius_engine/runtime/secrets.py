"""凭据引用解析与脱敏登记（SECURITY.md §3 / §6）。

协议约束：引擎永不主动发起 JSON-RPC 请求（PROTOCOL.md §2），故本模块不通过
stdio 回调壳的 secret_get。解析走可注入 SecretProvider：

- MemorySecretProvider：单测
- EnvSecretProvider：读 LANIUS_SECRETS JSON（CI / 临时接线）

壳侧 reverse-RPC → secret_get 属后续切片；届时再加 CallbackSecretProvider。
"""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass, field
from typing import Any, Protocol, runtime_checkable

from lanius_engine.models import LaniusError

SECRET_PREFIX = "secret://"
REDACTED = "***"
# 与 schemas/shell-secret.schema.json $defs.secretName 对齐
_SECRET_NAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")
_AUTH_HEADER = re.compile(
    r"(?i)(authorization\s*[:=]\s*)(['\"]?)(bearer\s+)?([^\s'\"]+)(\2)",
)
_BEARER_TOKEN = re.compile(r"(?i)\b(bearer\s+)(\S+)")
_SENSITIVE_KEYS = frozenset(
    {"authorization", "password", "passwd", "secret", "token", "api_key", "apikey"}
)


@runtime_checkable
class SecretProvider(Protocol):
    def get(self, name: str) -> str | None:
        """按名称取明文；不存在返回 None。"""
        ...


@dataclass
class MemorySecretProvider:
    mapping: dict[str, str] = field(default_factory=dict)

    def get(self, name: str) -> str | None:
        return self.mapping.get(name)


@dataclass
class EnvSecretProvider:
    """从环境变量 LANIUS_SECRETS（JSON 对象）读取；启动时解析一次。"""

    env_var: str = "LANIUS_SECRETS"
    _mapping: dict[str, str] = field(default_factory=dict, init=False, repr=False)

    def __post_init__(self) -> None:
        raw = os.environ.get(self.env_var, "").strip()
        if not raw:
            return
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise LaniusError.of(
                "engine.secret.invalidEnv",
                f"{self.env_var} 不是合法 JSON",
                details={"envVar": self.env_var},
            ) from exc
        if not isinstance(parsed, dict):
            raise LaniusError.of(
                "engine.secret.invalidEnv",
                f"{self.env_var} 必须是 JSON 对象",
                details={"envVar": self.env_var},
            )
        mapping: dict[str, str] = {}
        for key, value in parsed.items():
            if not isinstance(key, str) or not isinstance(value, str):
                raise LaniusError.of(
                    "engine.secret.invalidEnv",
                    f"{self.env_var} 的键与值都必须是字符串",
                    details={"envVar": self.env_var, "key": key},
                )
            mapping[key] = value
        self._mapping = mapping

    def get(self, name: str) -> str | None:
        return self._mapping.get(name)


@dataclass
class CompositeSecretProvider:
    providers: list[SecretProvider]

    def get(self, name: str) -> str | None:
        for provider in self.providers:
            value = provider.get(name)
            if value is not None:
                return value
        return None


class SecretRegistry:
    """已解析明文登记表：日志 / 历史摘要渲染为 ***。"""

    def __init__(self) -> None:
        self._values: set[str] = set()

    def remember(self, value: str) -> None:
        if value:
            self._values.add(value)

    def clear(self) -> None:
        self._values.clear()

    def known_values(self) -> frozenset[str]:
        return frozenset(self._values)

    def redact_text(self, text: str) -> str:
        out = text
        # 长值优先，避免短串误伤
        for secret in sorted(self._values, key=len, reverse=True):
            if secret and secret in out:
                out = out.replace(secret, REDACTED)
        out = _AUTH_HEADER.sub(rf"\1\2\3{REDACTED}\5", out)
        out = _BEARER_TOKEN.sub(rf"\1{REDACTED}", out)
        return out

    def redact(self, value: Any) -> Any:
        if isinstance(value, str):
            return self.redact_text(value)
        if isinstance(value, dict):
            out: dict[Any, Any] = {}
            for key, item in value.items():
                if (
                    isinstance(key, str)
                    and key.lower() in _SENSITIVE_KEYS
                    and isinstance(item, str)
                ):
                    out[key] = REDACTED
                else:
                    out[key] = self.redact(item)
            return out
        if isinstance(value, list):
            return [self.redact(v) for v in value]
        if isinstance(value, tuple):
            return tuple(self.redact(v) for v in value)
        return value


_REGISTRY = SecretRegistry()


def get_secret_registry() -> SecretRegistry:
    return _REGISTRY


def create_secret_provider(
    mapping: dict[str, str] | None = None,
) -> SecretProvider:
    """默认：显式 mapping → Memory；否则 Env（可为空表）。"""
    if mapping is not None:
        return MemorySecretProvider(mapping)
    return EnvSecretProvider()


def parse_secret_name(ref: str) -> str:
    """从 secret://<name> 或裸 name 解析并校验名称。"""
    text = ref.strip()
    if text.startswith(SECRET_PREFIX):
        text = text[len(SECRET_PREFIX) :]
    if not text or not _SECRET_NAME.match(text):
        raise LaniusError.of(
            "engine.secret.invalidRef",
            f"非法凭据引用: {ref!r}",
            details={"ref": ref},
        )
    return text


def resolve_secret_ref(
    ref: str,
    provider: SecretProvider,
    *,
    registry: SecretRegistry | None = None,
    node_id: str | None = None,
) -> str:
    name = parse_secret_name(ref)
    value = provider.get(name)
    if value is None:
        raise LaniusError.of(
            "engine.secret.notFound",
            f"凭据不存在: {name}",
            node_id=node_id,
            details={"key": name},
        )
    store = registry if registry is not None else get_secret_registry()
    store.remember(value)
    return value


def is_secret_ref(raw: Any) -> bool:
    if isinstance(raw, dict) and "secretRef" in raw:
        return True
    return isinstance(raw, str) and raw.strip().startswith(SECRET_PREFIX)


def resolve_config_value(
    raw: Any,
    provider: SecretProvider,
    *,
    interpolate_fn: Any | None = None,
    registry: SecretRegistry | None = None,
    node_id: str | None = None,
) -> Any:
    """解析配置值：secretRef 对象 / secret:// 字符串 / 普通字符串插值。"""
    if isinstance(raw, dict) and "secretRef" in raw:
        return resolve_secret_ref(
            str(raw["secretRef"]),
            provider,
            registry=registry,
            node_id=node_id,
        )
    if isinstance(raw, str):
        stripped = raw.strip()
        if stripped.startswith(SECRET_PREFIX):
            return resolve_secret_ref(
                stripped,
                provider,
                registry=registry,
                node_id=node_id,
            )
        if interpolate_fn is not None:
            return interpolate_fn(raw)
        return raw
    return raw
