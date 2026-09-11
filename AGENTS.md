# AGENTS.md — AI 编码代理硬约束

本文件面向在本仓库工作的 AI 编码代理（Cursor Cloud Agent 等）。与 [CONTRIBUTING.md](CONTRIBUTING.md) 冲突时，以本文件的硬约束为准。

## 架构红线（违反即返工）

1. **UI 不直连 Python**：跨层调用一律经 Rust 壳（invoke/event → JSON-RPC）。
2. **Rust 无业务逻辑**：handler 只做参数校验、转发、错误规范化。
3. **引擎不碰呈现**：Python 只产出事件与结构化数据，不弹窗、不读 UI 状态。
4. **协议先 schema 后实现**：任何跨层方法变更必须先改 `schemas/`，再 `pnpm codegen`，再双端实现。
5. **`src/lib/gen/` 是生成产物**：禁止手改。
6. **版本号只改根 `package.json`**，然后 `pnpm version:sync`；禁止直接改 `Cargo.toml` / `tauri.conf.json` / `pyproject.toml` 的 version 字段。

## 代码纪律（机器可检查项）

- TS：禁 `any`、禁非空断言、组件只从 `@/ui` barrel 引组件、禁写死颜色（用 tokens）。
- Python：禁 `print`、全量类型标注、异常必须映射到统一错误模型。
- Rust：invoke handler 禁 `unwrap`/`expect`。
- 错误：任何用户可见错误必须含 `code`（层.领域.原因）与 `traceId`。
- 注释只解释意图/权衡/约束；禁止复述代码的灌水注释；TODO 必须带 issue 号。

## 提交前验证清单

按顺序执行，全绿才允许提交：

```bash
pnpm codegen:check        # schema 产物同步
pnpm lint && pnpm typecheck && pnpm test          # 前端
pnpm engine:lint && pnpm engine:test              # 引擎
cargo check --manifest-path src-tauri/Cargo.toml  # 壳（环境允许时）
```

## 上下文入口

开始任何任务前先读：

1. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) §6 架构红线
2. [docs/PROTOCOL.md](docs/PROTOCOL.md)（涉及跨层通信时）
3. [docs/adr/](docs/adr/README.md) 中与本任务相关的决策
4. [docs/ROADMAP.md](docs/ROADMAP.md) 确认当前里程碑范围——不实现超出当前里程碑的功能

## 禁止事项

- 不创建 PR（除非用户明确要求）；提交推送到当前分支。
- 不引入文档集中未列出的新依赖；确需引入时先写 ADR 并停下等确认。
- 不修改 `docs/adr/` 中已接受的 ADR 内容（新决策写新 ADR）。
- 不为通过测试而削弱断言或 mock 掉被测对象。
