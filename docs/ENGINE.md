# Python 引擎设计

> 状态：已评审 · 最后更新：2026-09-18
> 实现进度：目标设计如下；模块树中标注 `（规划）` 的尚未落地。当前里程碑见 [ROADMAP.md](ROADMAP.md)（**M0** 完成骨架；**M1** 进行中：history / 通知 / data 节点已落地）。

引擎（`lanius-engine`）是全部业务语义的所在：流程校验、执行、节点实现、平台自动化。它以 sidecar 形态运行，通过 stdio JSON-RPC 与壳通信（见 [PROTOCOL.md](PROTOCOL.md)）。

## 1. 设计目标

1. **语义唯一真源**：流程怎么校验、怎么执行、怎么取消，只有这里说了算。
2. **可测试**：driver 层有完整 mock 实现，CI 在无显示器的 Linux 容器里跑全量测试。
3. **可观测**：structlog 结构化日志，traceId 贯穿，执行历史落 SQLite（历史落盘属 M1）。
4. **可扩展**：新增节点 = 新增一个类 + 注册，不改执行器。

## 2. 模块划分

```
engine/src/lanius_engine/
├── __main__.py        # 入口：stdio 服务循环（NDJSON 帧）
├── rpc/
│   ├── server.py      # JSON-RPC 解析/分发/错误映射
│   └── methods.py     # 方法实现（注册制）
├── nodes/
│   ├── base.py        # Node 协议：inputs/outputs/config schema/execute
│   ├── registry.py    # 节点注册表（type → 类）
│   └── core/          # 已落地：log、wait、assert、press、mouse、data.*、fs.*；控制：if/loop/wait/subflow/tryCatch |
├── drivers/
│   ├── base.py          # Driver 抽象接口
│   ├── mock.py          # Mock driver（CI/测试/dry-run 用）
│   ├── capabilities.py  # 三平台能力矩阵
│   ├── factory.py       # LANIUS_DRIVER / create_driver
│   ├── windows.py           # pywinauto UIA 绑定（可注入 backend 测路径）
│   ├── windows_backend.py   # PywinautoBackend；Recording 别名
│   ├── recording_backend.py # 三平台共用 RecordingDesktopBackend（CI）
│   ├── macos.py / macos_backend.py   # pyobjc 骨架 + Recording；AX 真绑定后续
│   └── linux.py / linux_backend.py   # pyatspi 骨架 + Recording；真绑定后续
├── runtime/
│   ├── executor.py    # 执行器：有序 steps + 状态机
│   ├── state.py       # 执行状态机定义
│   ├── scope.py       # 变量作用域链
│   ├── secrets.py     # secret:// 解析（可注入 SecretProvider）+ 脱敏登记
│   └── cancel.py      # 协作式取消原语
├── models/            # Pydantic v2 模型（对齐 schemas/）
├── history.py         # SQLite 执行历史（M1 已落地）
├── cli.py             # 调试 CLI：validate / run 按 steps（含 v1 迁移）
└── logging.py         # structlog 配置（JSON、traceId、凭据脱敏）
```

## 3. Driver 抽象

### 3.1 能力接口

`drivers/base.py` 定义抽象基类，按能力分组：

| 能力 | 方法示例 | 说明 |
| --- | --- | --- |
| 鼠标 | `click(x, y, button)`、`move(x, y)` | 坐标为窗口客户区或屏幕物理像素 |
| 键盘 | `press(keys)`、`type_text(text)`、`hotkey(*keys)` | `press` 走按键方案的 `keys` 字符串 |
| 窗口 | `find_window(query)`、`activate(handle)`、`bounds(handle)` | query 支持标题/类名/进程名 |
| 元素 | `find_element(locator)`、`element_click(locator)` | `locate.channel=a11y` 时使用；UI 探测 RPC：`driver.elementFind` |
| 屏幕 | `screenshot(region?)` | 返回临时文件路径（不进 stdio） |
| 剪贴板 | `clipboard_get()`、`clipboard_set(text)` | |
| 进程 | `launch(cmd)`、`terminate(pid)` | |

### 3.2 平台实现矩阵

| 平台 | 库 | 状态 |
| --- | --- | --- |
| Windows | pywinauto（UIA 后端） | M4：`WindowsDriver` 已绑键鼠/窗口/剪贴板；`asyncio.to_thread`；optional `[windows]` |
| macOS | pyobjc（AX API） | M4：`MacosDriver` + 可注入 Recording；真 AX 后续；需辅助功能授权 |
| Linux | pyatspi（AT-SPI2） | M4：`LinuxDriver` + 可注入 Recording；真 AT-SPI 后续 |
| 任意 | mock | 默认；CI 与 dry-run |

选择：`create_driver()` / 环境变量 `LANIUS_DRIVER=mock|windows|macos|linux|auto`（默认 `mock`；`auto` 在 win32→windows，darwin→macos，其余→mock）。

能力支持级别（`drivers/capabilities.py` · `PLATFORM_MATRIX`）：

| 能力 | mock | windows | macos | linux |
| --- | --- | --- | --- | --- |
| mouse.click / move | mock | full | subset | subset |
| keyboard.press / type | mock | full | subset | subset |
| window.find / activate | mock | full | subset | subset |
| clipboard | mock | full | subset | subset |
| element.find / click | mock | full | subset | subset |
| screen.capture | planned | full | planned | planned |
| process.launch / terminate | mock | full | subset | subset |

缺失或未接线调用的错误码：

| code | 何时 |
| --- | --- |
| `engine.driver.unsupportedPlatform` | 强制指定了非本机平台的 driver |
| `engine.driver.backendMissing` | 本机平台正确但未装 optional extra |
| `engine.driver.notImplemented` | 后端已装，具体绑定尚未合入（当前 macOS/Linux 真 AX/AT-SPI） |
| `engine.driver.unknownBackend` | `LANIUS_DRIVER` 非法值 |
| `engine.driver.windowNotFound` | mock/真实查找窗口失败（已有） |
| `engine.driver.elementNotFound` | 元素定位失败 |

macOS 授权（真 AX 接线后）：系统设置 → 隐私与安全性 → 辅助功能，为应用开启；修改后需重启引擎。错误 `details.settingsPath` 已预留。

### 3.3 Mock driver 契约

mock 维护一份内存中的虚拟桌面（窗口树、元素树、剪贴板），操作会改变这份状态，测试断言状态变化。dry-run 即用 mock driver 跑完整流程。

## 4. 节点系统

### 4.1 Node 协议

```python
class Node(Protocol):
    type: ClassVar[str]            # 如 "mouse.click"，全局唯一
    version: ClassVar[int]         # 节点定义版本，配合流程迁移
    side_effect: ClassVar[bool]    # 是否有副作用（dry-run 跳过或 mock）
    inputs: ClassVar[dict[str, Port]]    # 输入端口（类型/必填/默认值）
    outputs: ClassVar[dict[str, Port]]   # 输出端口
    config_schema: ClassVar[type[BaseModel]]  # Pydantic 配置模型

    async def execute(self, ctx: NodeContext) -> NodeResult: ...
```

`NodeContext` 提供：driver、作用域、logger（已绑定 traceId/nodeId）、cancel event、剩余超时预算。节点**不得**自己 import driver 单例或读写全局状态。

### 4.2 注册表

`registry.py` 维护 `type → Node 类` 映射。内置节点在包导入时注册；自定义节点经入口点（entry points，`lanius_engine.nodes` 组）发现。注册表内容经 `engine.hello` 上报给 UI，模板积木面板由此渲染——**节点定义以引擎为准，前端不硬编码可执行 type 清单**。

### 4.3 内置节点清单（V1）

- 流程控制：`flow.if`、`flow.loop`、`flow.wait`、`flow.subflow`、`flow.tryCatch`（嵌套进 steps；已落地）
- 按键：`keyboard.press`（`kind: binding`）
- 鼠标：`mouse.click`、`mouse.dblclick`、`mouse.move`
- 诊断：`core.log`、`core.wait`、`core.assert`
- 数据：`data.setVar`、`data.template`
- 文件：`fs.readText`、`fs.writeText`、`fs.exists`
- 窗口绑定在模板 `target`，不作为默认步骤
- 元素 / HTTP 等仍按里程碑补节点，以 preset 步骤接入

## 5. 执行器与状态机

### 5.1 执行状态机

```
idle → validating → running ⇄ paused → done
                     │           │
                     ├───────────┴──→ failed
                     └────────────────→ cancelled
```

- 迁移只允许沿箭头；每次迁移发 `execution.stateChanged` 通知。
- `failed` 携带失败节点的错误模型；`cancelled` 记录取消来源（用户/超时/关闭）。
- 终态（done/failed/cancelled）必须落执行历史后才算完成。

### 5.2 调度模型

- 流程图先变成有序 `steps`（v1 DAG 经迁移）；存在环则迁移/校验期拒绝（`engine.flow.cycleDetected`）。
- 顺序执行（非并行）——键鼠是全局资源，并行分支在 V1 不支持。
- 全局互斥：引擎内一把 asyncio 锁，第二个 `flow.start` 收到 `engine.runtime.busy`。
- 开跑时可按 `target.match` 绑定窗口句柄（`find_window`），步骤在该句柄上下文中发键鼠。

### 5.3 协作式取消

- 每个执行持有 `cancel_event`；`flow.cancel` 置位。
- 检查点：每次 driver 调用前后、循环每次迭代、节点入口。
- 节点内的长阻塞（如 `element.waitFor`）必须自身带超时并在等待循环中轮询 cancel event。
- 取消后节点必须清理（释放窗口句柄、关闭临时文件），然后抛 `FlowCancelled`。

### 5.4 超时

- 节点级：`config.timeoutMs`，默认 30_000。
- 流程级：流程 `settings.timeoutMs`，默认 600_000。
- 实现：executor 为每个节点计算剩余预算 `min(节点剩余, 流程剩余)`，超时抛 `NodeTimeout` → 映射 `engine.runtime.timeout`。

### 5.5 变量与作用域

三层作用域链（查找自内向外）：

1. **节点局部**：节点 outputs 写入当前节点作用域，仅下游可见。
2. **循环作用域**：`flow.loop` 每次迭代产生新帧（`item`、`index`）。
3. **流程全局**：流程 `variables` 声明的初始值 + `data.setVar` 写入。

表达式：字符串中的 `{{ path.to.var }}` 模板插值。**不使用 `eval`**；需要计算的场景由专门节点（`data.template`）完成。插值失败即校验/运行期错误，不静默留空。

### 5.6 sideEffect 与 dry-run

- 每个节点类声明 `side_effect`。
- dry-run 模式：执行器把 driver 换成 mock，副作用节点实际作用于虚拟桌面；纯计算节点（模板、变量）照常执行。dry-run 产出与真实运行同构的节点轨迹，供 UI 预览"将会发生什么"。

## 6. 执行历史

SQLite（WAL 模式），默认路径 `~/.local/share/lanius/history.db`（平台惯例目录）：

- `executions`：id、flow_path、mode、trigger、状态机字段、起止时间、traceId、最终错误（JSON）
- `node_runs`：execution_id、node_id、status、起止、输入摘要、输出摘要、错误
- 摘要截断策略：单字段 > 4 KiB 截断并标记 `truncated: true`
- 保留策略：默认 10_000 条或 90 天，设置页可调；清理在空闲时执行

## 7. 日志规范

- structlog，JSON 渲染，输出到 stderr（开发）与滚动文件（生产，`logs/engine-*.log`，10 MiB × 5）。
- 必含字段：`ts`、`level`、`event`、`traceId`、`executionId?`、`nodeId?`。
- 级别纪律：节点输入输出摘要用 `debug`；状态迁移用 `info`；可恢复异常 `warning`；节点失败 `error`；引擎级崩溃 `critical`。
- 严禁 `print`（ruff `T201` 强制）。

## 8. 测试策略

- 框架：pytest + pytest-asyncio。
- 层次：模型/协议单测 → 节点单测（mock driver）→ 执行器集成测试（跑完整流程文件，断言 node_runs 轨迹）→ 协议 golden files。
- 覆盖率门槛：engine 整体 ≥ 80%，runtime/ 目录 ≥ 90%。
- CI 全程使用 mock driver，不需要显示器。

## 9. 打包

- PyInstaller onefile；入口 `lanius_engine.__main__`。
- 产物命名遵循 Tauri externalBin：`lanius-engine-x86_64-pc-windows-msvc.exe` 等，置于 `src-tauri/binaries/`。
- 版本号由 `pnpm version:sync` 从根 package.json 注入，引擎启动时经 `engine.hello` 上报。
