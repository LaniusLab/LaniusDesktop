# 架构决策记录（ADR）

每条 ADR 记录一个不可逆或高代价决策：背景、决策、后果、被否决的备选。决策一旦被新 ADR 推翻，旧 ADR 标记 `已废弃` 但**不删除**。

| 编号 | 决策 | 状态 |
| --- | --- | --- |
| [0001](0001-tauri-over-electron.md) | 桌面壳：Tauri 2 | 已接受 |
| [0002](0002-react-over-vue.md) | 前端：React 19 | 已接受 |
| [0003](0003-python-sidecar.md) | 执行引擎：Python sidecar | 已接受 |
| [0004](0004-jsonrpc-over-stdio.md) | 壳与引擎：JSON-RPC 2.0 over stdio | 已接受 |
| [0005](0005-schema-single-source.md) | 跨层类型真源：JSON Schema | 已接受 |
| [0006](0006-builtin-component-library.md) | 组件库：内置 `src/ui` | 已接受 |
| [0007](0007-command-registry.md) | 集中式命令注册表 | 已接受 |
| [0008](0008-error-model.md) | 统一错误模型 + traceId 三层贯穿 | 已接受 |
| [0009](0009-radix-primitive-wrappers.md) | 非定制化 primitive 以 Radix 为底层 | 已接受 |

新 ADR 模板：复制任意一条，改编号与标题，状态从 `提议` 开始。

待补主题清单见 [../README.md](../README.md#待补-adr登记正文待写)（流程迁移、执行历史、信任分级、dry-run、全局互斥）。
