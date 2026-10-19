# Lanius Desktop

跨平台桌面自动化平台：用可视化编排把重复性桌面操作变成可版本化、可审计、可复用的自动化资产。

Lanius（伯劳）由三部分组成：Tauri 2 桌面壳、React 19 前端工作台、Python 执行引擎 sidecar。三层之间通过类型安全的协议通信，任何一层都不越权持有另一层的职责。

开源组织 [LaniusLab](https://github.com/LaniusLab) · 仓库 [LaniusDesktop](https://github.com/LaniusLab/LaniusDesktop) · 许可 [MIT](LICENSE)。

## 特性

- **先开跑后编排**：开始页选模板、选进程、确认识别方式、试一次；需要时再把按键与预设拖进顺序，保存为可 diff 的 `*.flow.json`
- **跨平台 UI 控制**：Python 引擎封装平台 driver（Windows 先行；macOS/Linux 能力子集），统一抽象
- **类型安全协议**：JSON Schema 为唯一真源，TypeScript 与 Python 双端对齐，CI 校验生成产物
- **可观测执行**：执行状态机 + 结构化日志 + traceId 三层贯穿（完整通知流见后续里程碑）
- **安全优先**：CSP 收紧、capabilities 最小化、凭据进系统 keyring、危险操作二次确认、dry-run 预演
- **命令系统**：集中式命令注册表，命令面板、快捷键、菜单共享同一真源

## 架构概览

三层职责与通信路径详见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。简图：

```
UI (React) ──invoke/event──▶ Rust 壳 ──JSON-RPC/stdio──▶ Python 引擎
```

## 技术栈

| 层 | 技术 |
| --- | --- |
| 桌面壳 | Tauri 2（Rust） |
| 前端 | React 19 · TypeScript · Vite · Tailwind CSS 4 · 内置组件库（shadcn 种子） |
| 模板编辑 | 有序步骤列表（拖拽按键 / 鼠标 / 预设） |
| 状态 | Zustand + Immer + zundo · TanStack Query |
| 表单 | React Hook Form + Zod |
| 引擎 | Python 3.11+ · Typer · Pydantic v2 · structlog |
| 通信 | Tauri invoke/event · JSON-RPC 2.0 over stdio |
| 测试 | Vitest + Testing Library · pytest（Playwright e2e 为规划） |
| 打包 | PyInstaller（引擎）· Tauri bundler（应用） |

## 快速开始

环境要求：Node 22+、pnpm 9+、Python 3.11+、Rust 1.83+，以及 Tauri 系统依赖（见 [CONTRIBUTING.md](CONTRIBUTING.md#环境准备)）。日常回路见 [docs/WORKFLOW.md](docs/WORKFLOW.md)。

在 Cursor / VS Code 中打开 [`lanius-desktop.code-workspace`](lanius-desktop.code-workspace)（任务、调试与三语言设置的官方入口）。

```bash
# 安装前端依赖
pnpm install

# 启动前端开发服务器（浏览器可预览 UI）
pnpm dev

# 启动完整桌面应用（需要 Tauri 系统依赖）
pnpm tauri dev

# 引擎侧：创建虚拟环境并运行测试
python3 -m venv engine/.venv
# Unix / macOS：
engine/.venv/bin/pip install -e "engine[dev]"
engine/.venv/bin/pytest engine/tests
# Windows：
# engine\.venv\Scripts\python -m pip install -e "engine[dev]"
# engine\.venv\Scripts\python -m pytest engine/tests

# 版本号同步（改版本只改根 package.json，然后运行）
pnpm version:sync
```

## 文档地图

完整索引与「目标态 / 实现态」约定见 [docs/README.md](docs/README.md)。

| 文档 | 内容 |
| --- | --- |
| [docs/PRODUCT.md](docs/PRODUCT.md) | 产品定位、用户画像、场景与范围 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 总体架构、进程拓扑、目录结构、关键机制 |
| [docs/PROTOCOL.md](docs/PROTOCOL.md) | JSON-RPC 协议、错误模型、schema 同步 |
| [docs/ENGINE.md](docs/ENGINE.md) | Python 引擎：driver 抽象、节点系统、执行语义 |
| [docs/FRONTEND.md](docs/FRONTEND.md) | 前端架构、内置组件库、状态管理、命令系统 |
| [docs/FLOW-FORMAT.md](docs/FLOW-FORMAT.md) | `*.flow.json` 文件格式与迁移链 |
| [docs/SECURITY.md](docs/SECURITY.md) | 威胁模型与安全控制 |
| [docs/ROADMAP.md](docs/ROADMAP.md) | 里程碑 M0–M5 与验收标准 |
| [docs/WORKFLOW.md](docs/WORKFLOW.md) | 变更分类、开发回路、IDE 门禁 |
| [docs/adr/](docs/adr/) | 架构决策记录 |
| [examples/hello.flow.json](examples/hello.flow.json) | 示例模板 |
| [CONTRIBUTING.md](CONTRIBUTING.md) | 开发规范全集 |
| [AGENTS.md](AGENTS.md) | AI 编码代理硬约束 |

## 仓库状态

当前处于 **M0**：三层骨架已就位；开始页选进程后与模板页可走通 `flow.run`；模板可改步骤属性并保存本机草稿。完整 `*.flow.json` 存盘、识图与平台 driver 见后续里程碑（[ROADMAP](docs/ROADMAP.md)）。
