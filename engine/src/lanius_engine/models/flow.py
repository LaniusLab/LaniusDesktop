"""流程文件模型，真源为 schemas/flow.schema.json（docs/FLOW-FORMAT.md）。

保留未知字段（extra="allow"）以支持前向兼容：新版本写入的字段在旧引擎上
打开时不丢失，迁移链负责语义升级而非字段清洗。
"""

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class FlowVariable(BaseModel):
    model_config = ConfigDict(extra="allow")

    type: Literal["string", "number", "boolean"] = "string"
    default: Any = None


class FlowSettings(BaseModel):
    model_config = ConfigDict(extra="allow")

    timeout_ms: int = Field(default=600_000, alias="timeoutMs", gt=0)
    on_error: str = Field(default="stop", alias="onError")


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
    variables: dict[str, FlowVariable] = Field(default_factory=dict)
    settings: FlowSettings = Field(default_factory=FlowSettings)
    nodes: list[FlowNode] = Field(default_factory=list)
    edges: list[FlowEdge] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)
