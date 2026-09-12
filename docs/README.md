# 文档索引

本目录是 Lanius Desktop 的设计与规范真源。根目录 [README.md](../README.md) 只做产品简介与快速开始。

## 阅读约定

| 标记 | 含义 |
| --- | --- |
| 目标态 | 架构/协议/产品的设计意图，可超前于代码 |
| 已实现 / 落地 | 与当前仓库一致（对照 [ROADMAP.md](ROADMAP.md) 当前里程碑） |
| 规划 · Mx | 尚未落地，归属对应里程碑 |

域文档默认写**目标态**；与代码对照时以文首「实现进度」与 PROTOCOL/ARCHITECTURE 中的落地列为准。

域文档只写本仓库的现状、目标态与约束。选型过程、否决备选、外部产品对照只放在 [adr/](adr/)，不写进域文档正文。

## 文档地图

| 文档 | 职责 | 与代码同步度 |
| --- | --- | --- |
| [PRODUCT.md](PRODUCT.md) | 愿景、用户、范围与非目标 | 产品层，不绑定实现细节 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 进程拓扑、目录、关键机制、红线 | 目录树已对齐 M0；机制含规划 |
| [PROTOCOL.md](PROTOCOL.md) | JSON-RPC / invoke / 错误模型 | 方法表含落地列 |
| [ENGINE.md](ENGINE.md) | 引擎模块、driver、执行语义 | 模块树标注规划项 |
| [FRONTEND.md](FRONTEND.md) | UI 架构、组件库、状态、命令 | 技术栈区分已依赖/未引入 |
| [FLOW-FORMAT.md](FLOW-FORMAT.md) | `*.flow.json` 与迁移链 | 与 `schemas/flow.schema.json` 对齐 |
| [SECURITY.md](SECURITY.md) | 威胁模型与控制 | 多为目标态（M4/M5） |
| [ROADMAP.md](ROADMAP.md) | M0–M5 范围与验收 | 实现进度锚点 |
| [WORKFLOW.md](WORKFLOW.md) | 变更分类、开发回路、IDE 门禁 | 已落地（Workspace / 任务 / 规则） |
| [adr/](adr/) | 架构决策记录 | 0001–0009 已接受 |

根目录规范：

| 文档 | 职责 |
| --- | --- |
| [../lanius-desktop.code-workspace](../lanius-desktop.code-workspace) | 官方 Cursor / VS Code Workspace 入口 |
| [../CONTRIBUTING.md](../CONTRIBUTING.md) | 人类贡献者规范全集 |
| [../AGENTS.md](../AGENTS.md) | AI 代理硬约束（与 CONTRIBUTING 冲突时以本文件为准） |
| [../examples/hello.flow.json](../examples/hello.flow.json) | 示例流程 |

## 待补 ADR（登记，正文待写）

下列主题已在域文档出现，落地前宜补 ADR（或明确声明由域文档承载）：

- 流程 `schemaVersion` 与迁移链（见 FLOW-FORMAT）
- SQLite 执行历史路径与保留策略（见 ENGINE）
- 信任分级与危险节点确认（见 SECURITY）
- dry-run ≡ mock driver（见 ENGINE）
- 键鼠全局互斥 / V1 不并行（见 ENGINE / ARCHITECTURE）
