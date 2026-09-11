# ADR-0003：执行引擎用 Python sidecar 而非 Rust 原生

- 状态：已接受
- 日期：2026-09-11

## 背景

桌面 UI 自动化需要成熟的平台 API 绑定。引擎也可以直接用 Rust 写（accessibility crate 等），或内嵌 Python 解释器（PyO3）。

## 决策

引擎为**独立 Python 3.11+ 进程**（sidecar），PyInstaller 打包，经 Tauri externalBin 随应用分发。技术栈：Typer + Pydantic v2 + structlog + pytest；driver 层 pywinauto / pyobjc / pyatspi + mock。

## 理由

- pywinauto（Windows UIA）、pyobjc（macOS AX）、pyatspi（Linux AT-SPI）是各平台最成熟的自动化绑定，生态远超 Rust 对应物。
- 独立进程 = 故障隔离：引擎崩溃不拖垮壳；壳可捕获退出码并重启。
- Python 是自动化用户与扩展者的母语：自定义节点（Python 类）门槛最低。
- sidecar 模式让引擎可独立测试（CI 无显示器跑全量），也可独立发版调试。

## 后果

- 引入跨进程通信开销与协议维护成本 → 由 ADR-0004/0005 的协议与 schema 真源机制对冲。
- 分发体积增加（PyInstaller 产物 ~30–50 MiB）→ 接受，换取生态。
- 需要双语言工程纪律 → CONTRIBUTING.md 分别定义 Python/Rust 规范，CI 双语种检查。

## 备选（已否决）

- **Rust 原生引擎**：平台绑定生态不成熟，等于自己重写 pywinauto。
- **PyO3 内嵌**：故障隔离丧失，GIL 与打包复杂度高，崩溃即全崩。
