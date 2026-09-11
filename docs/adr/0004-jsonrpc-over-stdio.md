# ADR-0004：壳与引擎间用 JSON-RPC 2.0 over stdio

- 状态：已接受
- 日期：2026-09-11

## 背景

壳（Rust）与引擎（Python）需要双向通信：请求/响应（启动执行、查询历史）与流式推送（执行进度、日志）。候选：stdio + 自定义协议、本地 HTTP、Unix socket/named pipe、gRPC。

## 决策

**JSON-RPC 2.0 over stdio**，NDJSON 帧（一行一个 JSON 对象）。UI 不直连引擎，一律经壳转发。

## 理由

- stdio 无端口、无权限配置、无本机其他进程蹭连的 attack surface（安全模型 §2）。
- JSON-RPC 2.0 天然区分 request/response/notification，语义正好覆盖"调用 + 事件流"。
- NDJSON 帧双方实现各 <100 行，调试直接 `echo … | python -m lanius_engine`。
- 无序列化中间件依赖（不引 protobuf/capnp），schema 真源机制（ADR-0005）保证类型同步。

## 后果

- 大 payload（截图）不能走 stdio → 约定走临时文件 + 路径引用（PROTOCOL.md §1）。
- 半双工风险需纪律：引擎 stdout 只许协议帧，日志走 stderr/文件；ruff 禁 `print`。
- 无连接多路复用概念，并发请求靠 id 关联，壳维护 pending 表。

## 备选（已否决）

- **本地 HTTP/WebSocket**：开端口引入权限与安全问题；webview 直连诱惑破坏三层边界。
- **gRPC**：对两个进程的本机通信过重；流式优势被 notification 覆盖。
- **自定义二进制协议**：调试成本与实现成本双高，收益（体积）对本场景无意义。
