# 架构决策记录（ADR）

每条 ADR 记录一个不可逆或高代价决策：背景、决策、后果、被否决的备选。决策一旦被新 ADR 推翻，旧 ADR 标记 `已废弃` 但**不删除**。

| 编号 | 决策 | 状态 |
| --- | --- | --- |
| [0001](0001-tauri-over-electron.md) | 桌面壳选 Tauri 2 而非 Electron | 已接受 |
| [0002](0002-react-over-vue.md) | 前端框架选 React 而非 Vue | 已接受 |
| [0003](0003-python-sidecar.md) | 执行引擎用 Python sidecar 而非 Rust 原生 | 已接受 |
| [0004](0004-jsonrpc-over-stdio.md) | 壳与引擎间用 JSON-RPC 2.0 over stdio | 已接受 |
| [0005](0005-schema-single-source.md) | JSON Schema 为跨层类型唯一真源 | 已接受 |
| [0006](0006-builtin-component-library.md) | 组件库内置 `src/ui` 而非独立包 | 已接受 |
| [0007](0007-command-registry.md) | 集中式命令注册表 | 已接受 |
| [0008](0008-error-model.md) | 统一错误模型 + traceId 三层贯穿 | 已接受 |

新 ADR 模板：复制任意一条，改编号与标题，状态从 `提议` 开始。
