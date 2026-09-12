# 工作开发流

> 状态：已落地 · 最后更新：2026-09-12
> 实现进度：与 M0 脚手架对齐；门禁命令与当前 `package.json` / CI 一致
> 规范细节见 [CONTRIBUTING.md](../CONTRIBUTING.md)；红线见 [AGENTS.md](../AGENTS.md)；范围见 [ROADMAP.md](ROADMAP.md)

本文档回答「今天改哪一层、按什么顺序改、改完怎么验」。编码风格、命名、测试金字塔仍以 CONTRIBUTING 为准，不在此重复。

## 1. 用 Workspace 打开

官方入口是仓库根目录的 [`lanius-desktop.code-workspace`](../lanius-desktop.code-workspace)。

| 打开方式 | 结果 |
| --- | --- |
| 打开 `.code-workspace` | 三语言设置、任务、调试、推荐扩展一并生效 |
| 直接打开文件夹 | `.vscode/` 仍会生效；以 Workspace 为准 |

首次打开后按提示安装推荐扩展，并确认 Python 解释器指向 `engine/.venv`（Windows：`engine\.venv\Scripts\python.exe`）。分层由任务组、调试配置和 `.cursor/rules/` 表达。

## 2. 三层工作面

```
UI (src/)  ──invoke/event──▶  壳 (src-tauri/)  ──JSON-RPC/stdio──▶  引擎 (engine/)
                                    ▲
                            真源：schemas/
```

| 工作面 | 目录 | 日常命令 | 禁止 |
| --- | --- | --- | --- |
| UI | `src/` | `pnpm dev` / `pnpm test` | 裸 `invoke`、直连 Python、深路径引 `@/ui/*` |
| 壳 | `src-tauri/` | `cargo check --manifest-path src-tauri/Cargo.toml` | handler 里写业务规则、`unwrap`/`expect` |
| 引擎 | `engine/` | `pnpm engine:test` / `pnpm engine:lint` | `print`、弹窗、读 UI 状态 |
| 协议 | `schemas/` | `pnpm codegen` | 手改 `src/lib/gen/` |

完整桌面闭环用 `pnpm tauri dev`（会先拉起 Vite `127.0.0.1:43191`）。只改 UI 观感时用 `pnpm dev` 即可。

Windows 开发机若系统里没有 `python3` 命令：从本 Workspace 打开的集成终端会注入 `LANIUS_ENGINE_CMD`，指向引擎 venv。也可在外部终端手动设置：

```text
LANIUS_ENGINE_CMD=E:\path\to\engine\.venv\Scripts\python.exe -m lanius_engine
```

## 3. 先选变更类型

动手前先归类。一类变更走一条回路，不要混提。

| 类型 | 典型信号 | 回路 |
| --- | --- | --- |
| 协议 / 跨层方法 | 改 JSON-RPC 方法、invoke、错误码、flow/error 形状 | [§4.1](#41-协议变更最严) |
| 仅 UI | 组件、路由、store、全局搜索、设置文案；不改协议 | [§4.2](#42-仅-ui) |
| 仅引擎 | 节点、执行器、driver、RPC 实现；不改 schema | [§4.3](#43-仅引擎) |
| 仅壳 | sidecar 生命周期、无边框窗口、偏好落盘、错误规范化 | [§4.4](#44-仅壳) |
| 仅文档 | 域文档、ADR、本文件 | [§4.5](#45-仅文档) |

当前里程碑是 **M0**。ROADMAP 里标「规划 · Mx」且 x>0 的能力：可以补文档与 ADR 登记，**不实现**。

## 4. 回路

### 4.1 协议变更（最严）

跨层方法与共享类型的唯一真源是 `schemas/`（[ADR-0005](adr/0005-schema-single-source.md)）。跳步视为无效改动。

1. 改 `schemas/`（`flow.schema.json` / `error.schema.json`；`schemas/rpc/` 属 M1）
2. `pnpm codegen`，检查 `src/lib/gen/` 的 diff，禁止手改生成物
3. 引擎：Pydantic 模型与 RPC 方法 + `engine/tests`（含失败路径）
4. 壳：薄 handler / 允许列表 / 错误映射；需要时更新 `ALLOWED_METHODS`
5. UI：只经 `src/lib/bridge/` 接入
6. 更新 [PROTOCOL.md](PROTOCOL.md) 方法表的落地列

本地门禁：`pnpm codegen:check` 必须先绿，再跑受影响层的 lint/test。

### 4.2 仅 UI

1. 对照 [FRONTEND.md](FRONTEND.md) 把状态放对分片（Query / editor store / ui store / 局部 state）
2. 组件只从 `@/ui` 引入；颜色只用 `tokens.css` 语义 token
3. `pnpm dev` 看页面；相关单测用 `pnpm test` 或调试配置「UI: 调试当前 Vitest」
4. 不把引擎状态复制进 zustand 当第二真源

### 4.3 仅引擎

1. 类型标注完整；日志走 structlog；异常映射到统一错误模型
2. 阻塞 driver 经 `asyncio.to_thread` 并带超时
3. `pnpm engine:test` 与 `pnpm engine:lint`
4. 需要手搓 RPC 时：调试配置「引擎: stdio RPC」，或

```bash
echo {"jsonrpc":"2.0","id":1,"method":"engine.ping","params":{}} | python -m lanius_engine
```

在 `engine/` 下执行，并保证 `PYTHONPATH` 含 `engine/src`（调试配置已设）。

### 4.4 仅壳

1. handler 只做：校验参数 → 分配 `traceId` → 转发 → 规范化错误
2. 业务规则出现在 `commands.rs` 即重构到引擎
3. `cargo check --manifest-path src-tauri/Cargo.toml`；提交前能跑则再跑 clippy
4. 开发模式 sidecar 命令见 `sidecar.rs` 的 `resolve_engine_command`

### 4.5 仅文档

1. 域文档只写本仓库的现状与目标态；不写选型对照、否决备选、外部产品
2. 落地范围以 ROADMAP 与文首「实现进度」为准
3. 新的不可逆决策写新 ADR，不改已接受 ADR 的正文
4. 更新 [docs/README.md](README.md) 索引（若新增文档）

## 5. 三环验证

由内向外扩大，避免一上来跑全量。

| 环 | 何时 | 做什么 |
| --- | --- | --- |
| 内环 | 写代码时 | 单层热重载或单测：`pnpm dev` / 当前文件 Vitest / 当前文件 pytest |
| 中环 | 本层改完 | UI：`pnpm lint && pnpm typecheck && pnpm test`；引擎：`pnpm engine:lint && pnpm engine:test`；壳：`cargo check` |
| 外环 | 提交前 | `pnpm verify`（codegen + 前端 + 引擎）。环境允许时再 `pnpm verify:shell` |

`pnpm check` **不含**引擎与 cargo，只适合纯前端改动的中环。跨层或准备推送时用 `pnpm verify`。

CI（`.github/workflows/ci.yml`）按 job 拆成 frontend / engine / shell，本地外环应对齐这三块。跨层改动用 `pnpm verify`，不要只跑 `pnpm check`。

## 6. IDE 任务与调试

任务面板（终端 → 运行任务）按层分组：

| 任务 | 作用 |
| --- | --- |
| `环境: 安装前端依赖` | `pnpm install` |
| `环境: 安装引擎 venv` | 创建 `engine/.venv` 并 `pip install -e engine[dev]` |
| `UI: 开发服务器` | Vite，端口 43191 |
| `应用: Tauri 开发` | 完整三层 |
| `协议: 重新生成类型` | `pnpm codegen` |
| `检验: 前端 check` | `pnpm check` |
| `检验: 引擎` | lint + test |
| `检验: 外环 verify` | `pnpm verify` |
| `检验: 壳 cargo check` | `pnpm verify:shell` |

调试（F5）：

| 配置 | 用途 |
| --- | --- |
| `UI: 调试 Vite` | 浏览器里断点前端（预启动 Vite） |
| `UI: 调试当前 Vitest` | 当前测试文件 |
| `引擎: 调试当前 pytest` | 当前测试文件 |
| `引擎: stdio RPC` | 手工对 stdin 打 JSON-RPC |
| `壳: 调试开发构建` | CodeLLDB 跟 Rust（需扩展 `vadimcn.vscode-lldb`） |

## 7. 提交门禁

M0 直接在 `main` 快进；一个逻辑变更一次提交。信息遵循 Conventional Commits（见 CONTRIBUTING）。

提交前按序全绿（或等价地跑 `pnpm verify` + 可选 `pnpm verify:shell`）：

```bash
pnpm codegen:check
pnpm lint && pnpm typecheck && pnpm test
pnpm engine:lint && pnpm engine:test
cargo check --manifest-path src-tauri/Cargo.toml   # 环境允许时
```

用户可见错误必须带 `code`（`层.领域.原因`）与 `traceId`。TODO 必须带 issue 号。

## 8. AI 代理如何接入

代理硬约束仍是 [AGENTS.md](../AGENTS.md)。本流额外要求：

1. 先读本文判定变更类型，再改代码
2. 分层规则在 `.cursor/rules/`（打开对应文件时自动套用）
3. 不引入文档未列出的新依赖；确需引入先写 ADR 并停下
4. 不为让测试通过而削弱断言或 mock 被测对象
