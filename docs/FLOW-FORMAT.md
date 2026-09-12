# 流程文件格式（`*.flow.json`）

> 状态：已评审 · 最后更新：2026-09-12
> 真源 schema：[`schemas/flow.schema.json`](../schemas/flow.schema.json)

## 1. 设计目标

1. **可版本化**：纯文本 JSON，Git diff 可读，code review 可行。
2. **永续可开**：`schemaVersion` + 单向迁移链，任何历史版本文件都能被当前版本打开。
3. **可校验**：JSON Schema 静态校验 + 引擎语义校验（`flow.validate`）双层。
4. **人类可手写**：紧急情况下能手改，字段命名自解释，拒绝魔法缩写。

## 2. 顶层结构

```jsonc
{
  "schemaVersion": 1,
  "id": "flow_01J8ZEXAMPLE",
  "name": "每日报表导出",
  "description": "从 ERP 导出昨日销售报表并邮件发送",
  "variables": {
    "reportDir": { "type": "string", "default": "C:/reports" }
  },
  "settings": {
    "timeoutMs": 600000,
    "onError": "stop"            // stop | continue | goto:<nodeId>
  },
  "nodes": [ /* 见第 3 节 */ ],
  "edges": [ /* 见第 4 节 */ ],
  "metadata": {
    "createdWith": "0.1.0",
    "modifiedWith": "0.1.0",
    "tags": ["erp", "daily"]
  }
}
```

规则：

- `schemaVersion` 必填，整数，单调递增。
- `id` 在创建时分配（ULID），复制流程时重新生成。
- 凭据类值**禁止**出现在文件里；用 `"password": { "secretRef": "secret://erp-password" }` 引用 keyring。
- 未知顶层字段保留不丢（forward-compatible），但校验期给 warning。

## 3. 节点

```jsonc
{
  "id": "click_login",                  // 流程内唯一，kebab/snake 均可
  "type": "element.click",              // 引擎注册表中的节点类型
  "nodeVersion": 1,                     // 节点定义版本（缺省 = 1）
  "label": "点击登录按钮",               // 画布显示名
  "position": { "x": 320, "y": 160 },   // 画布坐标（纯展示，不影响语义）
  "config": {
    "locator": { "by": "automationId", "value": "btnLogin" },
    "timeoutMs": 30000
  },
  "inputs": {
    "window": { "from": "find_login_window.outputs.handle" }
  },
  "disabled": false
}
```

- `config` 的合法性由该节点类型的 `config_schema` 决定（引擎侧 Pydantic / 前端侧 codegen 类型）。
- `inputs.*.from` 是数据绑定路径：`<nodeId>.outputs.<port>`；常量直接写字面量。
- 字符串值中的 `{{ variables.reportDir }}` 为模板插值（无 eval，见 ENGINE.md 5.5）。

## 4. 连线

```jsonc
{ "id": "e1", "from": "open_erp", "to": "find_login_window", "kind": "control" }
```

- `kind: "control"`：执行顺序（拓扑排序的输入）。
- 数据依赖只通过 `inputs.*.from` 声明；执行器把数据依赖并入拓扑约束。连线只有 `control` 一种语义。
- 分支：`flow.if` 节点有命名出口（`then`/`else`），连线上带 `branch: "then"`。

## 5. 版本迁移链

- 迁移函数注册表：`migrations[fromVersion] = (flow) => flow'`，单向只增不改。
- 打开旧文件：引擎按链逐跳迁移到当前版本，迁移结果经 `flow.migrate` 返回 UI，用户确认后写回。
- 迁移必须幂等、必须保留未知字段、必须在执行历史里记录 `migratedFrom → migratedTo`。
- 新增破坏性变更的流程：升 `CURRENT_SCHEMA_VERSION` → 写迁移函数 → 补迁移测试（旧版本 golden file → 新版本）。

## 6. 校验清单（`flow.validate` 语义层）

- 图合法性：无环、无悬空 control 边、恰好一个入口（无入边节点）。
- 节点合法性：type 在注册表存在、config 过 schema、必填 inputs 有绑定。
- 绑定合法性：`from` 路径存在且类型兼容（端口类型表由注册表提供）。
- 资源合法性：`secretRef` 命名合法；`fs.*` 路径不越出用户授权目录（M5 沙箱）。
- 告警类：并行结构串行化提示、未知字段、节点版本过旧。

校验结果 `issues[]` 每项含 `severity`、`nodeId?`、`message`、`code`，UI 按 nodeId 挂到画布。
