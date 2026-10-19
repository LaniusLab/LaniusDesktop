"""流程文件模型，真源为 schemas/flow.schema.json（docs/FLOW-FORMAT.md）。

保留未知字段（extra="allow"）以支持前向兼容：新版本写入的字段在旧引擎上
打开时不丢失，迁移链负责语义升级而非字段清洗。
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

CURRENT_SCHEMA_VERSION = 3


class FlowVariable(BaseModel):
    model_config = ConfigDict(extra="allow")

    type: Literal["string", "number", "boolean"] = "string"
    default: Any = None


class FlowSettings(BaseModel):
    model_config = ConfigDict(extra="allow")

    timeout_ms: int = Field(default=600_000, alias="timeoutMs", gt=0)
    on_error: str = Field(default="stop", alias="onError")


class FlowTargetMatch(BaseModel):
    model_config = ConfigDict(extra="allow")

    exe: str = ""
    title: str = ""
    class_name: str = Field(default="", alias="className")

    def is_empty(self) -> bool:
        return not (self.exe or self.title or self.class_name)


class FlowLocate(BaseModel):
    model_config = ConfigDict(extra="allow")

    channel: Literal["a11y", "vision"] = "a11y"
    source: Literal["probe", "user"] = "probe"
    capture: Literal["client", "screen"] = "client"
    vision_pack: str = Field(default="template", alias="visionPack")


class FlowTarget(BaseModel):
    model_config = ConfigDict(extra="allow")

    match: FlowTargetMatch = Field(default_factory=FlowTargetMatch)
    locate: FlowLocate = Field(default_factory=FlowLocate)


class FlowStep(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    kind: Literal["binding", "mouse", "preset", "control"]
    type: str = ""
    mapping_id: str = Field(default="", alias="mappingId")
    profile_id: str = Field(default="", alias="profileId")
    keys: str = ""
    label: str = ""
    config: dict[str, Any] = Field(default_factory=dict)
    disabled: bool = False
    then: list[FlowStep] = Field(default_factory=list)
    else_: list[FlowStep] = Field(default_factory=list, alias="else")
    body: list[FlowStep] = Field(default_factory=list)

    def node_type(self) -> str:
        if self.kind == "binding":
            return self.type or "keyboard.press"
        if self.kind == "control":
            return self.type or ""
        if self.type:
            return self.type
        return ""


class FlowNode(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    type: str
    node_version: int = Field(default=1, alias="nodeVersion", ge=1)
    label: str = ""
    position: dict[str, float] = Field(default_factory=lambda: {"x": 0.0, "y": 0.0})
    config: dict[str, Any] = Field(default_factory=dict)
    inputs: dict[str, Any] = Field(default_factory=dict)
    disabled: bool = False


class FlowEdge(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    from_: str = Field(alias="from")
    to: str
    kind: Literal["control"] = "control"
    branch: str | None = None


class FlowFile(BaseModel):
    model_config = ConfigDict(extra="allow")

    schema_version: int = Field(alias="schemaVersion", ge=1)
    id: str
    name: str
    description: str = ""
    keymap_profile_id: str = Field(default="default", alias="keymapProfileId")
    target: FlowTarget = Field(default_factory=FlowTarget)
    variables: dict[str, FlowVariable] = Field(default_factory=dict)
    settings: FlowSettings = Field(default_factory=FlowSettings)
    steps: list[FlowStep] = Field(default_factory=list)
    nodes: list[FlowNode] = Field(default_factory=list)
    edges: list[FlowEdge] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


FlowStep.model_rebuild()
