# ADR-0008：统一错误模型 + traceId 三层贯穿

- 状态：已接受
- 日期：2026-09-11

## 背景

错误会跨越 UI / Rust / Python 三层产生与传播。各层原生错误形态不同（JS Error、Rust Result、Python Exception），若各自为战，用户看到的是堆栈或"未知错误"，排查靠猜。

## 决策

定义统一错误模型（schema 真源 `schemas/error.schema.json`）：

```
{ code: "层.领域.原因", message, severity, source, nodeId?, traceId, details?, retryable? }
```

- `code` 命名规范 `{layer}.{domain}.{reason}`，全小写 camelCase 段。
- `traceId`（ULID）由壳在收到 UI 请求时分配，贯穿三层：日志、通知、执行历史、错误都携带。
- 各层边界负责把原生异常映射进模型：Python 异常在 RPC 层捕获映射；Rust 用 thiserror 枚举对应 `shell.*` 域；UI 按 severity 决定呈现（toast / 内联 / 错误页）。

## 理由

- 用户可见的每个错误都有结构化身份（code）与排查线索（traceId），支持"把 traceId 发给开发者"的排障模式。
- 三层日志可用同一 traceId 串起完整链路，执行历史与日志面板据此聚合。
- 错误码可枚举 = 可测试、可文档化、可做本地化键。

## 后果

- 所有层禁止裸抛/裸传异常 → lint 与 review 清单兜底（Rust 禁 unwrap、Python 禁裸 raise 出 RPC 层）。
- 错误码清单需要维护 → 随 schema 演进，codegen 产出 TS 常量。

## 备选（已否决）

- **各层原生异常直传**：跨层序列化不可控，用户可见信息随机。
- **仅 HTTP 式数字码**：表达力不足，无法携带领域与节点上下文。
