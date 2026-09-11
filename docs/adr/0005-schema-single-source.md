# ADR-0005：JSON Schema 为跨层类型唯一真源

- 状态：已接受
- 日期：2026-09-11

## 背景

流程文件格式、RPC 方法载荷、错误模型同时被 TypeScript（UI）、Rust（壳）、Python（引擎）消费。三端手写类型必然漂移。

## 决策

`schemas/` 目录下的 JSON Schema（draft 2020-12）是唯一真源。TS 类型与校验函数由 `scripts/codegen-schema.mjs` 生成到 `src/lib/gen/`；Python 侧 Pydantic 模型初期手写对齐，CI 脚本比对字段漂移，M1 后替换为完整生成。Rust 侧仅消费错误模型等少量结构，手写 serde 类型并纳入同一漂移检查。

## 理由

- 单一真源消灭"改了一端忘另一端"的整类 bug。
- JSON Schema 语言中立，三端都能消费；同时直接服务于 `*.flow.json` 的外部工具校验（编辑器、CI lint）。
- codegen 产物入库 + CI `--check` 模式，保证产物与真源永不失步。

## 后果

- 新增/变更协议多一步 codegen 流程 → 已写进 PROTOCOL.md §7 的标准操作。
- 生成器本身需要维护 → 保持生成器小而笨（只支持用到的 schema 子集），拒绝做成通用框架。

## 备选（已否决）

- **三端手写 + 口头约定**：漂移只是时间问题。
- **以 Python Pydantic 为真源反向生成**：把协议绑死在单一语言工具链上，外部工具（非 Python）消费困难。
