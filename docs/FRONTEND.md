# 前端架构

> 状态：已评审 · 最后更新：2026-09-18
> 实现进度：目标架构如下；落地以 [ROADMAP.md](ROADMAP.md) 为准（现为 **M0** UI 壳 + 自绘顶栏 + 设置分段 + 开始/编排双表面）。

## 1. 技术栈

| 领域 | 现状 |
| --- | --- |
| 框架 | React 19 + TypeScript（strict） |
| 构建 | Vite 6（开发服务器即 UI 预览） |
| 样式 | Tailwind CSS 4 + `tokens.css` 语义 token |
| 组件库 | 内置 `src/ui`（shadcn 种子，见第 3 节） |
| 模板编辑 | 有序步骤列表（拖拽按键 / 鼠标 / 预设）；完整属性表属 M2 |
| 客户端状态 | Zustand + Immer + zundo（zundo 仅编辑器撤销） |
| 服务端状态 | TanStack Query |
| 表单 | React Hook Form + Zod |
| 表达式编辑 | CodeMirror 6（M2 引入） |
| 图标 | lucide-react |
| 测试 | Vitest + Testing Library；Playwright e2e 属 M5 |

技术栈以本表为准。新增运行时依赖先写 ADR。

## 2. 应用骨架

默认路径是作业台。模板页才出步骤列表。

```
┌─────────────────────────────────────────────────────┐
│  自绘顶栏（拖动 / 最小化 / 最大化 / 关闭）              │
├──────────┬──────────────────────────────────────────┤
│          │  开始：预设卡 + 步骤勾选 + 试一次          │
│  搜索    │  模板：拖拽步骤列表                        │
│  开始    │  运行记录 / 按键映射 / 组件                │
│  编辑    │                                          │
│  运行记录 │                                          │
│  按键映射 │                                          │
│  组件    │                                          │
│  设置    │                                          │
│          │                                          │
├──────────┴──────────────────────────────────────────┤
│ 状态栏：可以运行 / 正在运行（术语进 tooltip）          │
└─────────────────────────────────────────────────────┘
```

- 路由：TanStack Router；`/`（开始）、`/edit`（模板）、`/history`、`/keymap`（按键映射方案）、`/gallery`（组件；旧路径 `/dev/gallery` 仍可用）。`/settings` 只打开设置 Dialog 并回到 `/`。`/flows/:id`、`/history/:executionId` 属后续里程碑。
- 主题：**light-first**（日光石色作业台），token 驱动；深色为午夜锌色的同一 token 集。界面用词用「浅色 / 深色」，不用「纸面 / 夜间」。
- 空/加载/错误三态是每个页面的必备件（`ui/patterns/EmptyState`、`ErrorState`、`LoadingState`）。

## 2.1 默认体验

人话在前：展示名用「打开记事本」；`window.find`、`traceId`、`dry-run`、命令 id 不出现在默认界面。全局搜索仍可用 id 匹配，只是不展示。

| 表面 | M0 已落地 | M2 规划 |
| --- | --- | --- |
| 开始 `/` | 模板卡 + 进程/识别方式 + 步骤勾选（写编辑器 `disabled`，关联文件时 dirty→保存进 `*.flow.json`）+ 试一次；迁移横幅 | OS 文件对话框 |
| 编辑 `/edit` | 有序步骤列表；积木点选/拖入；属性表字段 Zod+RHF；顶栏进程；草稿/`flow_open`/`flow_save`；`flow.validate` 钉步骤；迁移横幅 | OS 文件对话框 |
| 组件 `/gallery` | 左侧分组目录 + 关键词过滤 + 滚动同步高亮；分区展示变体 / 禁用 / 空态 | — |
| 搜索 | Overlay 命令盒；占位显示「搜索」，回车执行命令；分组 + 快捷键 | 接入编辑器命令 |
| 设置 Dialog | Folia 式左侧分组：外观 / 常规 / 桌面 / 快捷键 / 调试 / 关于；`DialogHeader` / `DialogFooter` 插槽；浅色/深色只在外观页；快捷键页可跳到按键映射 | 凭据、签名更新通道（M4/M5） |
| 按键映射 `/keymap` | 方案是一整套命名映射表（宏表）；内置「默认」只读不可删；本机 localStorage，不改系统按键；模板页可切方案并拖入映射 | 系统级热键、方案导入导出 |
| 侧栏 | 可收起为图标轨，展开时可拖拽改宽度；搜索在顶部，设置与收起在底部 | — |
| 顶栏 | 无边框自绘；主题快捷切换在设置图标左侧；设置在窗口三键左侧 | — |
| 状态栏 | 就绪用人话；执行控制条（试一次/预演/暂停/继续/取消） | — |
| 日志面板 | 级别过滤、可选 trace 聚合、仅最近一次；开始页与模板页共用 | traceId 常驻排障细节 |
| 运行记录 | 本会话摘要；失败项可跳回模板对应步骤；最近预演↔试一次逐步对照 | 引擎历史分页详情页 |

### 预设积木（规范先写死，实现随 M2 / 引擎节点）

UI 按「我想做什么」分组，不展示机器 ID。每块积木映射引擎节点类型。

| 分组 | 积木（人话） | 映射（实现用，不展示） | 备注 |
| --- | --- | --- | --- |
| 按键 | 方案里的一条 | `kind: binding` → `keyboard.press` | 先选方案再拖入；流程存 `profileId` + `mappingId` + `keys` |
| 鼠标 | 单击、双击、移动到 | `mouse.click` / `mouse.dblclick` / `mouse.move` | |
| 预设 | 等一会、记一条日志 | `core.wait` / `core.log` | `vision.wait` 先占位 |
| 目标 | 开跑时选进程，不进步骤列表 | `target.match` + `target.locate` | 探测可改 |

属性表字段走 Zod + RHF；校验句写「缺了什么、点哪里补」。表达式进阶折叠仍可后补。

## 3. 内置组件库 `src/ui`

### 3.1 三层结构

| 层 | 内容 | 规则 |
| --- | --- | --- |
| `primitives/` | **Radix Primitive 包装**（Dialog、Tooltip、Separator、Slot、Label、Checkbox、Switch、Radio、Tabs、Slider、Progress、Toggle、Collapsible、ScrollArea、Avatar）+ **`react-primitive` 封装**（Button、Input、Select、Card…）+ **Kbd**（Themes 同款：`Slot` + `<kbd>`，`asChild` 合成）+ **自研定制交互**（Overlay、SplitPane、Menu、ContextMenu、Draggable） | 不含业务词。非定制化优先包官方 Primitive；没有对应件再用 `@radix-ui/react-primitive`（节点表无 `textarea` / `table` 时用语义 HTML）。不引入 Radix Themes 运行时。原生 Select 不换成 combobox。Toast 是展示卡片，不接全局 Toast 队列 |
| `composed/` | 跨 primitive 组合：FormField、SettingRow、ChoiceGroup、SearchField、CopyButton、NumberField、FileField、KeyRecorder | 不含具体页面语义 |
| `patterns/` | 业务模式：PageHeader、EmptyState、ErrorState、LoadingState、StatusBadge | 可含业务词，不含页面布局 |

### 3.2 铁律

1. **Radix 底层**：非定制化 primitive 以 Radix 为底层封装（见 [ADR-0009](adr/0009-radix-primitive-wrappers.md)）。业务代码不能直引 `@radix-ui/*`。
2. **唯一出口**：业务代码只能 `from "@/ui"`（barrel）。ESLint `no-restricted-imports` 禁止 `@/ui/primitives/*` 等深路径与 `@radix-ui/*` 直引。
3. **token 驱动**：颜色/间距/圆角只引用 `tokens.css` 的 CSS 变量对应的 Tailwind token；`text-gray-500`、`#fff` 这类写死值由 lint 拦截。
4. **shadcn 工作流**：`components.json` 保留，新增 primitive 用 `pnpm dlx shadcn add <name>`，落盘后人工过一遍 token 合规。
5. **升级路径**：组件先在页面里写 → 第二次出现提为 composed → 跨模块复用且有业务语义提为 patterns。禁止「预防性抽象」。
6. **文档**：侧栏「组件」打开 `/gallery`。左侧目录按分组跳转，过滤框筛区块；每个组件至少覆盖主路径与禁用/空态。

## 4. 样式规范

- Tailwind 4，`@theme` 在 `tokens.css` 中把 CSS 变量映射为 utility token（`bg-surface`、`text-fg-muted`、`border-line`、`font-display`…）。
- 语义 token：`--surface-*`（背景）、`--fg-*`（前景）、`--accent-*`（强调/状态）。新增颜色必须先加 token。
- 根节点 dataset：`data-theme` / `data-accent` / `data-font` / `data-motion`；强调色 terracotta / ink / moss / dusk，字体 mixed / hei / song。
- 视觉方向：Folia 式沉浸玻璃——日光石色 / 午夜锌色、毛玻璃浮层、约 12px 圆角、浮动侧栏与面板；标题用 `--font-display`（系统衬线），正文用 `--font-sans`。颜色只走 `tokens.css`；玻璃面用 `glass-panel` / `glass-card`。滚动条在 `tokens.css` 全局重写：细轨道、圆头滑块、无上下箭头。
- 文案：自研 `src/lib/i18n`（`zh-CN` / `en`），不引入 i18next。
- 动效只服务理解与反馈（`animate-rise` / `fade` / `pop` / `page`，150–380ms；卡片 `hover-lift`）；`data-motion="reduce"` 与 `prefers-reduced-motion` 同时生效。

## 5. 模板编辑器（flow-editor）

- 有序步骤列表受控于 zustand 编辑器分片（zundo 撤销栈）。
- 左侧调色板：当前按键方案映射表、鼠标预设、引擎预设操作；点选或拖入列表。
- 点选步骤打开右侧属性：名称、这次跳过、按键、等待毫秒、鼠标坐标、日志内容。
- 本机草稿写入 `localStorage`（`lanius.template.v3`）；顶栏保存清 dirty。有关联路径时 `Mod+S` 经 `flow_save` 写盘；`Mod+O` / 另存为走路径提示（OS 对话框待 dialog 插件）。
- 顶栏与开始页共用目标进程 / 识别方式。
- 缺按键 / 负等待 / 空文本时列表钉「待补」、属性表内联错误；防抖调用 `flow.validate`，issue 列表可点选定位步骤。
- 撤销边界：模板操作进 zundo 栈；选中步骤与引擎执行状态**不进**撤销栈。
- 开始页与模板页的「试一次」必须触发同一 `flow.run`，禁止第二套执行路径。

## 6. 状态管理

| 分片 | 内容 | 实现 |
| --- | --- | --- |
| `editorStore` | 当前模板步骤、目标进程、locate、选中步骤、dirty 标记 | zustand + zundo；草稿 `localStorage` |
| `executionStore` | 最近一次执行状态镜像与本会话运行摘要（渲染用，非真源） | zustand，由 event / `flow.run` 结果驱动 |
| `uiStore` | 主题/强调色/字体/动效/语言、窗口偏好、全局搜索开合 | zustand；桌面壳以 `prefs.json` 为真源 |
| `keymapStore` | 按键方案（完整映射表）与编排默认方案 | zustand；本机 `localStorage`，不进协议 |
| 服务端数据 | 历史列表、引擎信息、节点注册表 | TanStack Query，event 触发失效 |

规则：派生值用 selector 计算，不另存一份；跨分片通信走命令（见下），不直接互调 set。

## 7. 命令系统

集中式命令注册表：

```ts
registry.register({
  id: "flow.run",                 // 全局唯一，域.动词
  title: "试一次",
  scope: "editor",                // global | editor | history…
  shortcut: "Mod+Enter",
  when: (ctx) =>
    ctx.engine.status === "ready" &&
    ctx.execution.phase !== "running" &&
    ctx.execution.phase !== "validating",
  run: (ctx) => ctx.bridge.flowRun({ mode: "run" }),
});
```

- 全局搜索（`src/modules/search`，Overlay 浮层）、菜单、快捷键、按钮都只是注册表的触发器；同一动作不存在第二份实现。搜索索引在 `src/lib/search`，不依赖 Dialog。
- `when` 子句求值上下文显式注入，不读全局单例（可测试）。
- 快捷键冲突在注册时检测（dev 下 throw）。

## 8. 桥接层（`src/lib/bridge`）

- 每个 invoke 一个类型安全 wrapper：参数/返回类型来自 `src/lib/gen/`（schema codegen 产物）。
- `useTauriEvent(channel, handler)`：订阅 hook，卸载自动退订。
- 错误处理：壳返回的错误模型在这里分类——`fatal` 进 ErrorState 页，`error` 进 toast，`warning` 进内联提示；排障用 traceId，默认界面不常驻。

## 9. 表单模式

节点属性面板统一：Zod schema（由节点 config schema 生成或手写对齐）→ RHF `resolver` → `FormField`（composed）渲染。校验失败信息内联展示，不弹窗。

## 10. 测试与性能

- 组件测试：Vitest + Testing Library，只测行为不测实现；bridge 层用 vi.mock 替换。
- e2e：Playwright 跑 Vite dev server（web 层流程）；Tauri 内 e2e 在 M5 评估。
- 性能预算：首屏 JS < 350 KiB gzip；步骤列表 500 步交互 60fps；全局搜索打开 < 100ms。CI 记录 bundle 体积趋势。
