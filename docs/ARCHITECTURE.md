# 总体架构

> 状态：已评审 · 最后更新：2026-10-19
> 实现进度：目标架构如下；落地范围以 [ROADMAP.md](ROADMAP.md) 当前里程碑为准（现为 **M0**）；现行打包门禁为 Windows / `release` 分支

## 1. 进程拓扑

Lanius Desktop 由三个进程角色组成，职责严格分层：

```
┌────────────────────────────────────────────────────────┐
│ Webview 进程（前端 UI）                                  │
│ React 19 + TypeScript + Vite + Tailwind 4               │
│ 职责：渲染、交互、编辑器状态、命令分发                      │
│ 禁止：直接访问文件系统/网络执行副作用、直连 Python          │
└───────────────────┬────────────────────────────────────┘
                    │ Tauri invoke（请求/响应）
                    │ Tauri event（壳 → UI 推送）
┌───────────────────▼────────────────────────────────────┐
│ Rust 主进程（Tauri 壳）                                  │
│ 职责：窗口/托盘/全局快捷键/自动更新/keyring/              │
│       sidecar 生命周期守护、JSON-RPC client、            │
│       事件转发、错误规范化                                │
│ 禁止：任何业务逻辑（节点语义、流程校验规则等）              │
└───────────────────┬────────────────────────────────────┘
                    │ JSON-RPC 2.0 over stdio（NDJSON 帧）
┌───────────────────▼────────────────────────────────────┐
│ Python sidecar（lanius-engine）                          │
│ 职责：流程校验、执行器、节点注册表、driver 层、           │
│       执行历史写入、结构化日志                            │
│ 禁止：持有 UI 状态、直接弹窗（一切呈现经壳转发给 UI）      │
└────────────────────────────────────────────────────────┘
```

### 分层规则

- **UI 不直连 Python**：跨层调用经 Rust（invoke / event → JSON-RPC）。
- **Rust 不写业务逻辑**：handler 只做参数校验、转发、错误规范化。
- **Python 不碰呈现**：引擎只产出事件与结构化数据，呈现由 UI 决定。

## 2. 职责矩阵

| 能力 | UI (React) | Rust 壳 | Python 引擎 |
| --- | --- | --- | --- |
| 渲染与交互 | ✅ | — | — |
| 流程文件读写 | — | ✅（对话框/路径） | ✅（解析/校验/迁移） |
| 执行语义（状态机/取消/超时） | — | — | ✅ |
| 节点实现 | — | — | ✅ |
| 平台 UI 自动化 | — | — | ✅（driver 层） |
| 窗口/托盘/快捷键 | — | ✅ | — |
| keyring 凭据 | — | ✅ | 仅持引用 |
| 执行历史存储 | — | — | ✅（SQLite） |
| 自动更新 | — | ✅ | — |
| 日志采集 | 展示 | 转发 | 产出（structlog） |

## 3. 通信路径

### 3.1 UI ↔ Rust：invoke / event

- **invoke**：UI 发起的请求/响应调用（如 `flow_open`、`engine_request`）。所有 invoke 在 `src/lib/bridge/` 下有类型安全封装，组件不直接调 `@tauri-apps/api`。
- **event**：壳向 UI 的推送通道（执行进度、引擎日志、sidecar 状态）。UI 侧用 `useTauriEvent` hook 订阅，组件卸载自动退订。

### 3.2 Rust ↔ Python：JSON-RPC 2.0 over stdio

- 帧格式：NDJSON（一行一个完整 JSON 对象），见 [PROTOCOL.md](PROTOCOL.md)。
- Rust 侧维护请求 id 计数器与 pending 表；引擎的通知（notification）被转成 Tauri event 转发给 UI。
- sidecar 崩溃：壳捕获退出码 → 通知 UI → 按策略重启（指数退避，上限 3 次）→ 重启后重放 `engine.hello` 握手。

### 3.3 一次执行的完整链路

```
用户点击运行
  → UI: commands.run("flow.run")
  → invoke("flow_run", { path })                     [UI → Rust]
  → Rust: 校验参数 → 分配 traceId → rpc.call("flow.start")
  → Python: 校验 → 状态机 running → 逐节点执行
  → Python 通知: execution.nodeStarted / log / ...   [Python → Rust]
  → Rust: 补 traceId → emit("execution://event", …)  [Rust → UI]
  → UI: 步骤高亮 + 日志面板追加
  → Python 响应: { executionId, finalState }          [原路返回]
```

traceId 由 Rust 分配并贯穿三层：UI 日志、Rust 日志、Python structlog、执行历史记录都带同一个 traceId。

## 4. 目录结构

与仓库当前布局对齐。标注 `（规划）` 的路径尚未落地，见 [ROADMAP.md](ROADMAP.md)。

```
LaniusDesktop/
├── lanius-desktop.code-workspace  # 官方 Cursor / VS Code Workspace
├── .editorconfig
├── .vscode/                    # 任务 / 调试 / 编辑器设置
├── .cursor/rules/              # 分层 Cursor 规则（配合 AGENTS.md）
├── package.json                # 版本号唯一真源 + 前端脚本
├── components.json             # shadcn CLI 配置（组件落 src/ui/primitives）
├── LICENSE                     # MIT（版权方 LaniusLab）
├── index.html
├── vite.config.ts
├── tsconfig.json
├── eslint.config.mjs
│
├── src/                        # 前端（React）
│   ├── main.tsx
│   ├── router.tsx
│   ├── ui/                     # 内置组件库（见 FRONTEND.md）
│   │   ├── primitives/         #   Radix 包装：Button/Input/Dialog…
│   │   ├── composed/           #   组合件：FormField…
│   │   ├── patterns/           #   业务模式：PageHeader/EmptyState…
│   │   ├── tokens.css          #   设计 token（CSS 变量）
│   │   └── index.ts            #   barrel，唯一出口 "@/ui"
│   ├── modules/
│   │   ├── layout/             # 应用壳布局（自绘顶栏 + 侧栏）
│   │   ├── start/              # 开始页（预设 + 勾选 + 试一次）
│   │   ├── flow-editor/        # 模板页（有序步骤；M2 属性/存盘）
│   │   ├── history/            # 运行记录页（M3）
│   │   ├── settings/           # 设置 Dialog（侧栏底部 + 顶栏入口）
│   │   ├── search/             # 全局搜索（Overlay，替代命令面板）
│   │   ├── dev/                # 组件页（侧栏「组件」）
│   │   └── runner/             # 执行控制条（M3）；日志面板后续 |
│   ├── lib/
│   │   ├── bridge/             # invoke/event 类型安全封装
│   │   ├── commands/           # 命令注册表
│   │   ├── i18n/               # 界面文案（zh-CN / en）
│   │   ├── search/             # 全局搜索索引
│   │   └── gen/                # schema codegen 产物（勿手改）
│   └── stores/                 # zustand 分片
│
├── src-tauri/                  # Rust 壳
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── capabilities/default.json
│   └── src/
│       ├── main.rs             # 入口 + 插件装配 + 关闭行为
│       ├── sidecar.rs          # 引擎进程守护 + JSON-RPC client
│       ├── commands.rs         # invoke handlers（薄）
│       ├── prefs.rs            # 本机偏好 / 自启 / 调试路径 / 日志
│       └── error.rs            # 壳层错误 → 统一错误模型
│
├── engine/                     # Python sidecar
│   ├── pyproject.toml
│   ├── src/lanius_engine/
│   │   ├── __main__.py         # stdio JSON-RPC 服务循环
│   │   ├── rpc/                # 协议层（注册制方法表）
│   │   ├── nodes/              # 节点基类 + 注册表 + 内置节点（core.log / wait）
│   │   ├── drivers/            # base / mock / factory / capabilities；windows / macos / linux（M4）
│   │   ├── runtime/            # 执行器、状态机、作用域、取消
│   │   ├── models/             # Pydantic 模型（对齐 schemas/）
│   │   ├── history.py          # （规划 · M1）SQLite 执行历史
│   │   └── logging.py          # structlog 配置
│   └── tests/
│
├── schemas/                    # JSON Schema 唯一真源
│   ├── flow.schema.json
│   ├── error.schema.json
│   ├── shell-prefs.schema.json
│   ├── shell-debug.schema.json
│   └── rpc/                    # （规划 · M1）各方法的 params/result schema
│
├── examples/
│   └── hello.flow.json         # 示例流程
│
├── scripts/
│   ├── codegen-schema.mjs      # schemas → TS 类型（flow / error / shell-prefs / shell-debug）
│   └── sync-version.mjs        # 根 package.json → 三端版本号
│
├── docs/                       # 本文档集（索引见 docs/README.md；日常回路见 WORKFLOW.md）
├── CHANGELOG.md                # Keep a Changelog；release 流水线写入 GitHub Release
└── .github/workflows/
    ├── ci.yml                  # main：代码检查
    └── release.yml             # release 分支 + Changelog 门禁：Windows 打包 + assets + SHA256SUMS
```

## 5. 关键机制

### 5.1 sidecar 生命周期

1. **启动**：壳在 `setup` 中 spawn 引擎（开发模式用 `python -m lanius_engine`，生产模式用 PyInstaller 产物，经 `externalBin` 按 target triple 解析）。
2. **握手**：spawn 后壳发送 `engine.hello { protocolVersion, clientVersion }`，引擎回应能力清单；版本不兼容则拒绝并提示。
3. **心跳**：每 5s `engine.ping`，连续 3 次超时判定失活。
4. **重启**：指数退避（1s/2s/4s），上限 3 次；仍失败则进入降级态——UI 可编辑流程但禁止运行，状态栏明确提示。
5. **退出**：壳收到退出信号 → 发送 `engine.shutdown` → 等待 3s → SIGTERM → SIGKILL。引擎在收到 shutdown 时必须取消进行中的执行并落盘历史。

### 5.2 状态管理分层（前端）

| 状态类别 | 归属 | 例 |
| --- | --- | --- |
| 服务端/引擎状态 | TanStack Query + event 失效 | 执行历史列表、引擎信息 |
| 编辑器文档状态 | zustand + Immer + zundo | 当前流程的节点/连线/选区 |
| 全局 UI 状态 | zustand 轻量分片 | 主题、面板开合、全局搜索 |
| 组件局部状态 | useState | 输入框草稿、hover |

执行状态机**不复制**到前端 store：UI 只渲染引擎推送的最新状态，避免双真源。

### 5.3 Schema 同步流水线

```
schemas/*.schema.json（真源）
   │  pnpm codegen
   ├─→ src/lib/gen/*.ts        （TS 类型 + 校验函数）
   └─→ engine models 同步检查   （CI 比对字段漂移）
```

CI 执行 `pnpm codegen --check`：产物与仓库不一致则失败。手改 `src/lib/gen/` 视为无效改动。

### 5.4 版本号同步

根 `package.json` 的 `version` 是唯一真源。`pnpm version:sync` 写入：

- `src-tauri/tauri.conf.json` → `version`
- `src-tauri/Cargo.toml` → `[package] version`
- `engine/pyproject.toml` → `[project] version`

发布流水线先跑 `version:sync --check` 再构建。

### 5.5 打包与分发

- 引擎：PyInstaller onefile，输出名按 Tauri 规范 `lanius-engine-<target-triple>[.exe]`，置于 `src-tauri/binaries/`。
- 应用：当前 CI 打包门禁为 **Windows only**（`.github/workflows/release.yml`：merge 到 `release` + Changelog 含当前版本节与 `<!-- release:publish -->`；tag 为发布产物而非触发器）；macOS / Linux 目标态见 ROADMAP M5。
- 更新：Tauri updater + 签名校验；引擎随应用同包更新，不独立下发。
- 发布说明：根目录 `CHANGELOG.md`；`scripts/release-changelog.mjs` 提取版本章节写入 GitHub Release；安装包作为 Release assets（并保留 workflow artifact）。

## 6. 关键约束（架构红线）

1. UI 不得直连 Python；跨层一律过 Rust。
2. Rust handler 不得包含业务规则；发现即重构到引擎。
3. 引擎不得弹窗、不得直接读写 UI 状态。
4. 任何新的跨层方法必须先改 `schemas/`，再 codegen，再实现双端。
5. 键鼠等全局资源同一时刻只允许一个执行实例（引擎内全局互斥锁）。
6. 流程文件格式变更必须带迁移函数，迁移链单向只增不改。
