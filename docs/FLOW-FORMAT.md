# 流程文件格式（`*.flow.json`）

> 状态：已评审 · 最后更新：2026-09-18
> 真源 schema：[`schemas/flow.schema.json`](../schemas/flow.schema.json)
> 实现进度：schemaVersion **2** 已落地（有序 `steps` + `target`）。v1 `nodes`/`edges` 打开时迁移。

## 1. 设计目标

1. **可版本化**：纯文本 JSON，Git diff 可读，code review 可行。
2. **永续可开**：`schemaVersion` + 单向迁移链，任何历史版本文件都能被当前版本打开。
3. **可校验**：JSON Schema 静态校验 + 引擎语义校验（`flow.validate`）双层。
4. **人类可手写**：紧急情况下能手改，字段命名自解释，拒绝魔法缩写。
5. **模板即键鼠剧本**：步骤是按键方案条目、鼠标预设与注册表操作的有序列表，在选定窗口句柄上执行（[ADR-0010](adr/0010-template-sequence-over-dag.md)）。

## 2. 顶层结构

```jsonc
{
  "schemaVersion": 2,
  "id": "flow_01J8ZEXAMPLE",
  "name": "对选定窗口跑模板",
  "description": "选进程后按方案里的键鼠与预设操作执行",
  "keymapProfileId": "default",
  "target": {
    "match": { "exe": "client.exe", "title": "", "className": "UnityWndClass" },
    "locate": {
      "channel": "vision",          // a11y | vision
      "source": "probe",            // probe | user
      "capture": "client",          // client | screen
      "visionPack": "template"
    }
  },
  "variables": {
    "who": { "type": "string", "default": "世界" }
  },
  "settings": {
    "timeoutMs": 600000,
    "onError": "stop"            // stop | continue | goto:<stepId>
  },
  "steps": [ /* 见第 3 节 */ ],
  "metadata": {
    "createdWith": "0.1.0",
    "modifiedWith": "0.1.0",
    "tags": ["example"]
  }
}
```

规则：

- `schemaVersion` 必填，整数，单调递增。当前写入版本为 2。
- `id` 在创建时分配（ULID），复制模板时重新生成。
- **禁止**把 pid 写入文件；目标只用 `exe` / 标题模式 / 窗口类名。当次 pid 只出现在 `flow.start` 的 `inputs`。
- `keymapProfileId` 是编排调色板默认方案；步骤里的按键仍带 `profileId` + `mappingId`，并冗余 `keys` 给引擎（引擎不读 UI localStorage）。
- 凭据类值**禁止**出现在文件里；用 `"password": { "secretRef": "secret://erp-password" }` 引用 keyring。
- 未知顶层字段保留不丢（forward-compatible），但校验期给 warning。
- v1 的 `nodes` / `edges` 仍可出现在磁盘上；引擎迁移为 `steps` 后不再作为执行真源。

## 3. 步骤

```jsonc
{
  "id": "press_enter",
  "kind": "binding",                 // binding | mouse | preset
  "type": "keyboard.press",
  "profileId": "default",
  "mappingId": "d-enter",
  "keys": "Enter",
  "label": "回车",
  "config": {},
  "disabled": false
}
```

| kind | 含义 | `type` |
| --- | --- | --- |
| `binding` | 按键方案中的一条 | 默认 `keyboard.press`；`keys` 为发出的键 |
| `mouse` | 鼠标预设 | `mouse.click` / `mouse.dblclick` / `mouse.move` |
| `preset` | 引擎注册表中的操作 | 如 `core.wait`、`core.log`；`vision.wait` 属后续 |

- `config` 的合法性由该 `type` 的 `config_schema` 决定。
- 字符串值中的 `{{ variables.who }}` 为模板插值（无 eval，见 ENGINE.md 5.5）。
- 顺序即执行顺序；`disabled` 的步骤记为 skipped。

## 4. 目标与定位

开跑前必须选定进程。引擎按窗口特征推荐 `locate`，用户可改。覆盖优先级：

1. 当次 `flow.start.inputs.target` / `inputs.locate`
2. 文件里的 `target`
3. 若 `match` 为空：不调用 `find_window`（仅纯计算步骤仍可跑）

`channel: a11y` 走控件树（M4 driver）；`vision` 走截图识别（识图节点未排期落地前，通道仍作为绑定记录）。切换通道不自动改写步骤类型。

## 5. 版本迁移链

- 迁移函数注册表：`migrations[fromVersion] = (flow) => flow'`，单向只增不改。
- 打开旧文件：引擎按链逐跳迁移到当前版本。v1 DAG 按 control 边拓扑序变成 `kind: preset` 的 `steps`。
- 迁移必须幂等、必须保留未知字段、必须在执行历史里记录 `migratedFrom → migratedTo`（历史落盘属 M1）。
- 新增破坏性变更的流程：升 `CURRENT_SCHEMA_VERSION` → 写迁移函数 → 补迁移测试（旧版本 golden file → 新版本）。

## 6. 校验清单（`flow.validate` 语义层）

- 步骤合法性：`kind` 合法；解析出的 `type` 在注册表存在；`binding` 有 `keys`。
- v1 遗留图：迁移期无环、无悬空 control 边。
- 资源合法性：`secretRef` 命名合法；`fs.*` 路径不越出用户授权目录（M5 沙箱）。
- 告警类：未知字段、节点版本过旧、作业所需通道与 `locate.channel` 不匹配（后续）。

校验结果 `issues[]` 每项含 `severity`、`nodeId?`（步骤 id）、`message`、`code`，UI 按步骤 id 挂到列表。
