# 开发规范

> 本文档是贡献代码前必须读完的规范全集。AI 编码代理另有硬约束见 [AGENTS.md](AGENTS.md)。

## 环境准备

| 工具 | 版本 | 说明 |
| --- | --- | --- |
| Node | 22+ | 经 nvm/fnm 管理 |
| pnpm | 9+ | `corepack enable pnpm` |
| Python | 3.11+ | 引擎开发 |
| Rust | 1.83+ | rustup 管理，stable 工具链 |
| Tauri 系统依赖 | — | Linux：`libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev`；macOS：Xcode CLT；Windows：WebView2 + VS Build Tools |

```bash
pnpm install                                    # 前端依赖
python3 -m venv engine/.venv                    # 引擎虚拟环境
engine/.venv/bin/pip install -e "engine[dev]"   # 引擎依赖（含 dev 工具）
```

## 日常命令

| 命令 | 作用 |
| --- | --- |
| `pnpm dev` | Vite 开发服务器（浏览器预览 UI） |
| `pnpm tauri dev` | 完整桌面应用 |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | 前端静态检查与单测 |
| `pnpm engine:test` / `pnpm engine:lint` | 引擎测试与 ruff+mypy |
| `pnpm codegen` / `pnpm codegen:check` | schema 代码生成 / CI 校验 |
| `pnpm version:sync` | 版本号三端同步 |
| `pnpm check` | 上述全部检查的总和（提交前必跑） |

## 命名规范

- 文件：组件 `PascalCase.tsx`，其余 `kebab-case.ts`；Python `snake_case.py`；Rust `snake_case.rs`。
- 标识符：TS `camelCase` / 类型 `PascalCase`；Python `snake_case` / 类 `PascalCase`。
- 节点类型：`域.动词`（`element.click`）；错误码：`层.领域.原因`；命令 id：`域.动词`（`flow.run`）。
- 布尔变量带 `is/has/can/should` 前缀；事件处理函数 `handleXxx`。

## 注释规范

注释解释**意图、权衡、约束**，不复述代码。

```ts
// 好：键鼠是全局资源，并行分支在 V1 串行化，见 docs/ENGINE.md §5.2
const ordered = serializeParallelBranches(graph);

// 坏：对分支进行排序
const ordered = serializeParallelBranches(graph);
```

禁止：灌水注释（`// 定义函数`）、注释掉的死代码（Git 记得一切）、无 bug 编号的 TODO（`TODO(#123): …` 才合法）。

## TypeScript / React 纪律

- `strict: true`；禁止 `any`（`unknown` + 收窄替代）；禁止非空断言 `!`（例外需注释理由）。
- 组件 props 用 interface 显式声明；不导出的组件不写进 barrel。
- hooks 依赖数组不撒谎；需要绕过时用 `useEffectEvent` 或重构，不用 eslint-disable。
- 副作用只在 `useEffect` / 事件处理 / 命令 `run` 中；渲染函数纯净。
- 跨层调用只允许经 `src/lib/bridge/` 封装；组件内禁止裸 `invoke`。

## 状态管理规则

按 [FRONTEND.md](docs/FRONTEND.md) §6 的四分法归位。禁止：把引擎状态复制进 zustand 当第二真源；在 selector 外重复计算派生值；跨分片直接互调。

## 样式规则

- 只用 `tokens.css` 定义的语义 token（`bg-surface`、`text-fg-muted`…）；写死色值/任意值（`#fff`、`text-[13px]`）被 lint 拦截。
- 布局用 flex/grid utility；不用负 margin 奇技。
- 动效 150–250ms，仅状态反馈用途。

## Python 规范

- ruff（lint + format）+ mypy strict；全量类型标注，公共 API 有 docstring（意图，非复述）。
- 禁止 `print`（ruff T201）；日志走 structlog。
- 异常：节点与 RPC 层不得裸抛给用户；映射到错误模型（PROTOCOL.md §4）。
- 异步：执行器全链路 asyncio；阻塞调用（driver）经 `asyncio.to_thread` 隔离并带超时。
- 依赖进 `pyproject.toml`；锁定文件提交。

## Rust 规范

- handler 薄：参数校验 → 转发 → 错误规范化；业务规则出现即重构信号。
- 禁止在 invoke handler 中 `unwrap`/`expect`；错误用 thiserror 枚举进统一模型。
- 日志用 `tracing`；span 带 traceId。
- `cargo clippy -- -D warnings` 与 `cargo fmt --check` 进 CI。

## 协议开发流程

新增/变更跨层方法，严格按序：

1. 改 `schemas/` 真源
2. `pnpm codegen` 生成 TS 类型
3. 引擎端实现 + pytest
4. 壳侧 invoke 封装 + 错误映射
5. UI 接入
6. 更新 PROTOCOL.md 方法表

跳步的 PR 一律打回。

## 测试规范

- 金字塔：单测（多）→ 模块集成（中）→ e2e（少而精）。
- 命名：测试描述行为（`取消执行时节点在安全点退出`），不描述实现。
- mock 边界：引擎测试用 mock driver；前端测试 mock bridge；不 mock 被测对象本身。
- 覆盖率：引擎 ≥80%（runtime ≥90%）；前端核心模块（commands/editor store）≥80%。
- 每个 bugfix 附回归测试。

## Git 规范

- Conventional Commits：`feat|fix|docs|refactor|test|chore|build|ci(scope): 摘要`。
- 分支：M0 阶段直接在 `main` 快速迭代；M1 起启用 `develop` 集成分支，`feature/*` 自 `develop` 切出，PR 合回。
- 一个 PR 一个逻辑变更；重构与功能不混提。
- 提交前本地 `pnpm check` 全绿。

## Code Review 清单

- [ ] 架构红线未破（UI 不直连引擎 / Rust 无业务逻辑 / 引擎不碰呈现）
- [ ] 协议变更走了六步流程
- [ ] 错误走统一模型，含 code + traceId
- [ ] 新依赖过了评估清单
- [ ] 测试覆盖新行为与失败路径
- [ ] 无写死 token、无 `any`、无 `print`、无 `unwrap`
- [ ] 文档（含 ADR）随代码同步更新

## ADR 使用规则

满足任一即写 ADR：跨层协议变更、新增顶层依赖、推翻既有决策、安全模型变更。模板见 [docs/adr/](docs/adr/README.md)。

## 依赖管理

新增依赖前自问：维护活跃度？包体/体积代价？与现有选型重叠？安全记录？答案写进 PR 描述。运行时依赖升级随 PR；dev 依赖每月集中升级一次。

## 性能预算

- 首屏 JS < 350 KiB gzip；冷启动到可交互 < 3s
- 引擎 ping P95 < 50ms；千节点流程打开/校验 < 1s
- 超预算的 PR 需要 ADR 级理由

## 发布流程

1. 根 `package.json` 改版本 → `pnpm version:sync`
2. 更新 CHANGELOG（Keep a Changelog 格式）
3. `git tag vX.Y.Z` 触发打包流水线（三平台 + 引擎 PyInstaller + 签名）
4. 发布页附校验和与 SBOM（M5 起）
