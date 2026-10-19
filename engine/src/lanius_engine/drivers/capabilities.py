"""Driver 能力矩阵（ENGINE.md §3.2）——缺失能力用明确错误码，不静默空实现。"""

from __future__ import annotations

from typing import Literal

Capability = Literal[
    "mouse.click",
    "mouse.move",
    "keyboard.press",
    "keyboard.type",
    "window.find",
    "window.activate",
    "clipboard",
    "element.find",
    "element.click",
    "screen.capture",
    "process.launch",
    "process.terminate",
]

SupportLevel = Literal["full", "subset", "planned", "mock"]

# 平台 → 能力 → 支持级别。planned = 尚未接线，调用须抛 engine.driver.capabilityMissing
PLATFORM_MATRIX: dict[str, dict[Capability, SupportLevel]] = {
    "mock": {
        "mouse.click": "mock",
        "mouse.move": "mock",
        "keyboard.press": "mock",
        "keyboard.type": "mock",
        "window.find": "mock",
        "window.activate": "mock",
        "clipboard": "mock",
        "element.find": "mock",
        "element.click": "mock",
        "screen.capture": "planned",
        "process.launch": "mock",
        "process.terminate": "mock",
    },
    "windows": {
        "mouse.click": "full",
        "mouse.move": "full",
        "keyboard.press": "full",
        "keyboard.type": "full",
        "window.find": "full",
        "window.activate": "full",
        "clipboard": "full",
        "element.find": "full",
        "element.click": "full",
        "screen.capture": "full",
        "process.launch": "full",
        "process.terminate": "full",
    },
    "macos": {
        "mouse.click": "subset",
        "mouse.move": "subset",
        "keyboard.press": "subset",
        "keyboard.type": "subset",
        "window.find": "subset",
        "window.activate": "subset",
        "clipboard": "subset",
        "element.find": "subset",
        "element.click": "subset",
        "screen.capture": "planned",
        "process.launch": "subset",
        "process.terminate": "subset",
    },
    "linux": {
        "mouse.click": "subset",
        "mouse.move": "subset",
        "keyboard.press": "subset",
        "keyboard.type": "subset",
        "window.find": "subset",
        "window.activate": "subset",
        "clipboard": "subset",
        "element.find": "subset",
        "element.click": "subset",
        "screen.capture": "planned",
        "process.launch": "subset",
        "process.terminate": "subset",
    },
}


def support_level(platform: str, capability: Capability) -> SupportLevel:
    matrix = PLATFORM_MATRIX.get(platform)
    if matrix is None:
        return "planned"
    return matrix.get(capability, "planned")


def is_callable(platform: str, capability: Capability) -> bool:
    level = support_level(platform, capability)
    return level in ("full", "subset", "mock")
