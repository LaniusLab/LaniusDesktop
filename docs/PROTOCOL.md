# 进程间通信协议

> 状态：已评审 · 最后更新：2026-09-12
> 实现进度：下文含目标协议全集；「落地」列对照当前代码（M0）。目标态以 [ROADMAP.md](ROADMAP.md) 为准。

本文档定义 Rust 壳与 Python 引擎之间的 JSON-RPC 2.0 协议，以及 UI 与壳之间的 invoke/event 约定。

## 1. 传输层

- **通道**：sidecar 的 stdin/stdout。stderr 专用于引擎崩溃前的最后诊断输出，壳捕获后写入日志文件。
- **帧格式**：NDJSON——每帧为一行完整 JSON（UTF-8，`\n` 结尾，行内不得出现裸换行）。
- **背压**：单行上限 1 MiB，超限直接断开并记 `transport.frameTooLarge`。大 payload（如截图）走临时文件 + 路径引用，不进 stdio。
- **编码纪律**：引擎 stdout 只允许协议帧；日志走 stderr 或日志文件。Python 侧严禁 `print`（ruff 规则强制）。

## 2. JSON-RPC 2.0 信封

```jsonc
// 请求
{ "jsonrpc": "2.0", "id": 42, "method": "flow.start", "params": { "path": "…" } }

// 成功响应
{ "jsonrpc": "2.0", "id": 42, "result": { "executionId": "…" } }

// 失败响应（error 对象遵循第 4 节错误模型）
{ "jsonrpc": "2.0", "id": 42, "error": { "code": "engine.flow.validationFailed", "message": "…", "data": { … } } }

// 通知（无 id，无响应）—— M1+ 目标；M0 尚无通知流
{ "jsonrpc": "2.0", "method": "execution.log", "params": { … } }
```

规则：

- `id` 由壳侧单调递增分配（u64），引擎永不主动发起请求，只发通知。
- 不支持 batch。
- 未识别方法返回标准码 `-32601`，并附 `data.methodName`。
- 协议握手：`engine.hello` 交换 `protocolVersion`（语义化三段）。主版本不一致即拒绝连接；次版本差异按能力清单降级。

## 3. 方法清单

落地列：`已实现` = 当前仓库可调用；其余为后续里程碑目标。

### 3.1 引擎元信息

| 方法 | 参数 | 结果 | 落地 | 说明 |
| --- | --- | --- | --- | --- |
| `engine.hello` | `{ protocolVersion, clientVersion }` | `{ protocolVersion, engineVersion, capabilities[], nodeTypes[] }` | 已实现 | 握手，必须是第一个请求 |
| `engine.ping` | `{}` | `{ pong: true, uptimeMs }` | 已实现 | 心跳 |
| `engine.shutdown` | `{}` | `{}` | 已实现 | 优雅退出（取消执行；历史落盘属 M1） |

### 3.2 流程与执行

| 方法 | 参数 | 结果 | 落地 | 说明 |
| --- | --- | --- | --- | --- |
| `flow.validate` | `{ flow }` 或 `{ path }` | `{ ok, issues[] }` | 已实现 | 静态校验，不执行 |
| `flow.migrate` | `{ flow }` | `{ flow, migratedFrom, migratedTo }` | M2 | 迁移到当前 schemaVersion |
| `flow.start` | `{ path \| flow, mode, inputs? }` | 见下 | 已实现（同步） | UI 传入当前模板 `flow`；`inputs.target` / `inputs.locate` 覆盖绑定；全局互斥 |
| `flow.pause` / `flow.resume` | `{ executionId }` | `{}` | M1 | 暂停/继续 |
| `flow.cancel` | `{ executionId, reason? }` | `{}` | 已实现 | 协作式取消 |
| `execution.get` | `{ executionId }` | `{ record }` | M1 | 查询单条执行记录 |
| `execution.list` | `{ limit, offset, filter? }` | `{ records[], total }` | M1 | 历史分页 |

**M0 `flow.start` 现实**：调用同步跑完后返回（含 `executionId`、`finalState`、`nodeRuns` 等摘要），**尚无**进度通知。目标态（M1+）：立即返回 `{ executionId }`，进度经 §3.3 通知推送；壳侧对长调用放开 RPC 超时（见 §6）。

### 3.3 通知（引擎 → 壳 → UI）

| 通知 | 载荷要点 | 落地 | 时机 |
| --- | --- | --- | --- |
| `execution.stateChanged` | `{ executionId, from, to, traceId }` | M1 | 状态机每次迁移 |
| `execution.nodeStarted` | `{ executionId, nodeId, traceId }` | M1 | 节点进入执行 |
| `execution.nodeFinished` | `{ executionId, nodeId, status, durationMs, outputsSummary }` | M1 | 节点结束 |
| `execution.log` | `{ executionId, level, message, fields, traceId }` | M1 | 结构化日志流 |
| `engine.heartbeat` | `{ uptimeMs, activeExecutions }` | M1 | 每 30s |
## 4. 错误模型

所有层的错误统一为下述结构（JSON Schema 见 `schemas/error.schema.json`）：

```jsonc
{
  "code": "engine.flow.validationFailed",  // 层.领域.原因，见命名规范
  "message": "节点 click_login 缺少必填参数 selector",  // 面向用户，可本地化
  "severity": "error",                      // info | warning | error | fatal
  "source": "engine",                       // ui | shell | engine
  "nodeId": "click_login",                  // 可选：关联节点
  "traceId": "01J…",                        // 必含：三层贯穿
  "details": { "missing": ["selector"] },   // 可选：结构化上下文
  "retryable": false                        // 可选：是否可安全重试
}
```

### 4.1 错误码命名规范

`{layer}.{domain}.{reason}`，全小写 camelCase 段：

- layer：`ui` / `shell` / `engine`
- domain：`flow` / `runtime` / `driver` / `transport` / `auth` / `io`
- reason：具体原因，如 `validationFailed`、`timeout`、`cancelled`、`busy`、`notFound`、`permissionDenied`

示例：`engine.driver.windowNotFound`、`shell.sidecar.crashed`、`ui.editor.unsavedChanges`。

### 4.2 映射规则

- JSON-RPC 层错误（`-32700` 等标准码）由壳转换为 `shell.transport.*` 域错误后再呈现。
- Python 异常不得直接序列化给用户；引擎捕获后映射为错误模型，原始堆栈进日志文件（带 traceId 关联）。
- Rust 侧 `thiserror` 枚举一一对应 `shell.*` 域；handler 禁止 `unwrap`/`expect`。

## 5. traceId 规范

- 由壳在收到 UI 请求时分配（ULID），作为 JSON-RPC 请求的扩展字段 `meta.traceId` 传给引擎。
- 引擎产生的所有日志、通知、历史记录必须携带同一 traceId。
- UI 侧日志面板按 traceId 聚合；执行历史详情页以 traceId 为主键关联。

## 6. 取消与超时语义

- `flow.cancel` 是**协作式**：引擎置位该执行的 cancel event，节点在下一个安全点（每次 driver 调用前后、循环迭代边界）检查并退出。节点实现必须响应取消，长阻塞调用必须带超时。
- 超时两层：节点级（节点 config 的 `timeoutMs`，默认 30s）与流程级（流程 settings 的 `timeoutMs`，默认 10min）。超时即失败，错误码 `engine.runtime.timeout`。
- 壳侧对 RPC 调用本身有超时；**目标态**下 `flow.start` 等长调用立即返回 `executionId`、进度走通知，因而不受短超时约束。**M0** 的 `flow.start` 仍为同步跑完，壳侧超时需覆盖整次执行时长。

## 7. Schema 同步

- 真源：`schemas/` 下的 JSON Schema（draft 2020-12）。
- 当前落地：`flow.schema.json`、`error.schema.json`、`shell-prefs.schema.json`、`shell-debug.schema.json`；`pnpm codegen` / `pnpm codegen:check` 生成并校验 `src/lib/gen/`。
- **尚未落地**：`schemas/rpc/` 分方法 schema、Python 字段漂移自动比对；M1 起补齐。
- 新增/变更跨层类型的流程：改 schema → `pnpm codegen` → 实现引擎端 → 实现壳封装 → UI 接入 → 补协议测试。
- 协议测试：`engine/tests/test_rpc.py` 覆盖已注册方法的正常/错误路径；壳侧 Rust 集成测试用 mock 引擎（M1）。

## 8. UI ↔ 壳 invoke 约定

| invoke 命令 | 参数 | 返回 | 对应 RPC | 落地 |
| --- | --- | --- | --- | --- |
| `engine_info` | — | `EngineInfo` | `engine.hello` | 已实现 |
| `engine_ping` | — | ping 结果 | `engine.ping` | 已实现 |
| `engine_call` | `{ method, params }` | RPC result | 透传任意方法 | 已实现 |
| `flow_run` | `{ mode }`（M0 用内置 demo flow） | 执行结果摘要 | `flow.start` | 已实现 |
| `flow_cancel` | `{ executionId }` | — | `flow.cancel` | 已实现 |
| `flow_open` | — | `{ path, flow }` | 文件对话框 + `flow.migrate` | M2 |
| `flow_save` | `{ path, flow }` | — | 壳写盘（先过 `flow.validate`） | M2 |
| `execution_list` | `{ limit, offset }` | `ExecutionPage` | `execution.list` | M1 |
| `secret_set` / `secret_get` / `secret_delete` | `{ key, value? }` | — | 壳内 keyring，不过引擎 | M4 |
| `prefs_get` | — | `ShellPrefs` | 读 `prefs.json` | 已实现 |
| `prefs_set` | `{ prefs }` | `ShellPrefs` | 写盘 + 同步开机自启 | 已实现 |
| `shell_debug_info` | — | `ShellDebugInfo` | 系统 / 路径 | 已实现 |
| `logs_tail` | — | `string` | 壳日志末 200 行 | 已实现 |
| `updater_list` | — | `UpdaterListResult`（见 `schemas/shell-updater.schema.json`） | 公开 GitHub Releases（published；draft 不可见） | 已实现 |
| `updater_check` | — | `UpdaterCheckResult` | 相对当前版本是否有带 Windows 包的更新 | 已实现 |
| `updater_download` | `{ tag }` | `UpdaterDownloadResult` | 下载该 tag 的 preferred setup.exe/msi | 已实现 |
| `updater_install` | `{ path }` | `UpdaterInstallResult` | Windows 上交互式启动安装器；签名静默属 M5 | 已实现 |

事件通道命名（目标）：`execution://event`、`engine://status`、`shell://notification`、`updater://progress`。UI 只通过 `src/lib/bridge/` 的封装访问，不散落裸 `invoke` 调用。

应用内更新说明：版本真源是 **GitHub Release tag**（非 `CHANGELOG.md`）。默认只列 published；draft（如未发布的 `v0.2.0`）需在 GitHub 上 Publish 后才会出现。安装模式为交互式启动 NSIS/MSI，**不是** M5 签名静默通道（ADR-0011）。
