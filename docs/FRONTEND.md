# 前端架构

> 状态：已评审 · 最后更新：2026-09-12
> 实现进度：目标架构如下；落地以 [ROADMAP.md](ROADMAP.md) 为准（现为 **M0** UI 壳 + 自绘顶栏 + 设置分段 + 开始/编排双表面）。

## 1. 技术栈

| 领域 | 现状 |
| --- | --- |
| 框架 | React 19 + TypeScript（strict） |
| 构建 | Vite 6（开发服务器即 UI 预览） |
| 样式 | Tailwind CSS 4 + `tokens.css` 语义 token |
| 组件库 | 内置 `src/ui`（shadcn 种子，见第 3 节） |
| 画布 | React Flow v12（`@xyflow/react`）；完整积木编辑器属 M2 |
| 客户端状态 | Zustand + Immer + zundo（zundo 仅编辑器撤销） |
| 服务端状态 | TanStack Query |
| 表单 | React Hook Form + Zod |
| 表达式编辑 | CodeMirror 6（M2 引入） |
| 图标 | lucide-react |
| 测试 | Vitest + Testing Library；Playwright e2e 属 M5 |

技术栈以本表为准。新增运行时依赖先写 ADR。

## 2. 应用骨架

默认路径是作业台。编辑页才出画布。

```
┌─────────────────────────────────────────────────────┐
│  自绘顶栏（拖动 / 最小化 / 最大化 / 关闭）              │
├──────────┬──────────────────────────────────────────┤
│          │  开始：预设卡 + 步骤勾选 + 试一次          │
│  开始    │  编辑：画布（脚本入口）                    │
│  编辑    │  运行记录 / 设置 / 组件                    │
│  运行记录 │                                          │
│  设置    │                                          │
│  组件    │                                          │
│          │                                          │
├──────────┴──────────────────────────────────────────┤
│ 状态栏：可以运行 / 正在运行（术语进 tooltip）          │
└─────────────────────────────────────────────────────┘
```

- 路由：TanStack Router；`/`（开始）、`/edit`（编辑）、`/history`、`/settings`、`/gallery`（组件；旧路径 `/dev/gallery` 仍可用）。`/flows/:id`、`/history/:executionId` 属后续里程碑。
- 主题：**light-first**（浅色作业台），token 驱动；深色为同一 token 集的另一组值。界面用词用「浅色 / 深色」，不用「纸面 / 夜间」。
- 空/加载/错误三态是每个页面的必备件（`ui/patterns/EmptyState`、`ErrorState`、`LoadingState`）。

## 2.1 默认体验

人话在前：展示名用「打开记事本」；`window.find`、`traceId`、`dry-run`、命令 id 不出现在默认界面。全局搜索仍可用 id 匹配，只是不展示。

| 表面 | M0 已落地 | M2 规划 |
| --- | --- | --- |
| 开始 `/` | mock 预设卡 + 步骤勾选；试一次走 `flow.run`；「编辑步骤」进 `/edit` | 勾选与 `*.flow.json` 同步；预设是可运行文件的投影 |
| 编辑 `/edit` | 演示画布、人话节点、同一 `flow.run` | 积木面板、属性表、保存、校验上图 |
| 组件 `/gallery` | 侧栏入口，展示 `src/ui` 组件与状态 | — |
| 搜索 | Overlay 浮层；标题分组 + 快捷键 | 接入编辑器命令 |
| 设置 `/settings` | 外观 / 常规 / 快捷键 / 调试 / 关于；偏好经壳落盘 | 凭据、签名更新通道（M4/M5） |
| 顶栏 | 无边框自绘；关闭行为由壳执行 | — |
| 状态栏 | 就绪/忙碌用人话；traceId 不常驻 | 执行控制条（M3） |

### 预设积木（规范先写死，实现随 M2 / 引擎节点）

UI 按「我想做什么」分组，不展示机器 ID。每块积木映射引擎节点类型。

| 分组 | 积木（人话） | 映射（实现用，不展示） | 备注 |
| --- | --- | --- | --- |
| 按键 | 按一下指定键、组合键、输入一段文字 | `keyboard.press` / `keyboard.hotkey` / `keyboard.type` | 预设键位可点选 |
| 鼠标 | 单击、双击、移动到 | `mouse.click` / `mouse.dblclick` / `mouse.move` | |
| 窗口 | 找到窗口、等到出现、切到前台 | `window.find` / `window.wait` / `window.focus` | |
| 节奏 | 等一会、等到画面稳定 | `core.wait` | |
| 记录 | 记下一条日志 | `core.log` | M0 演示已有 |
| 控制 | 如果、重复 | `flow.if` / `flow.loop` | M2 后半，可先灰掉 |

属性先只暴露必填三项，表达式折叠。校验句写「缺了什么、点哪里补」。

## 3. 内置组件库 `src/ui`

### 3.1 三层结构

| 层 | 内容 | 规则 |
| --- | --- | --- |
| `primitives/` | Radix 包装（Button、Input、Dialog、Tooltip）+ 自研 Overlay / Switch / Select / Tabs / Kbd | 不含业务词；shadcn CLI 产物落此层；全局搜索用 Overlay，不用 Dialog |
| `composed/` | 跨 primitive 组合：FormField、SettingRow、ChoiceGroup | 不含具体页面语义 |
| `patterns/` | 业务模式：PageHeader、EmptyState、ErrorState、LoadingState、StatusBadge | 可含业务词，不含页面布局 |

### 3.2 铁律

1. **唯一出口**：业务代码只能 `from "@/ui"`（barrel）。ESLint `no-restricted-imports` 禁止 `@/ui/primitives/*` 等深路径与 `@radix-ui/*` 直引。
2. **token 驱动**：颜色/间距/圆角只引用 `tokens.css` 的 CSS 变量对应的 Tailwind token；`text-gray-500`、`#fff` 这类写死值由 lint 拦截。
3. **shadcn 工作流**：`components.json` 保留，新增 primitive 用 `pnpm dlx shadcn add <name>`，落盘后人工过一遍 token 合规。
4. **升级路径**：组件先在页面里写 → 第二次出现提为 composed → 跨模块复用且有业务语义提为 patterns。禁止「预防性抽象」。
5. **文档**：侧栏「组件」打开 `/gallery`，渲染全部组件与状态变体。

## 4. 样式规范

- Tailwind 4，`@theme` 在 `tokens.css` 中把 CSS 变量映射为 utility token（`bg-surface`、`text-fg-muted`、`border-line`、`font-display`…）。
- 语义 token：`--surface-*`（背景）、`--fg-*`（前景）、`--accent-*`（强调/状态）。新增颜色必须先加 token。
- 根节点 dataset：`data-theme` / `data-accent` / `data-font` / `data-motion`；强调色 terracotta / ink / moss / dusk，字体 mixed / hei / song。
- 视觉方向：纸面作业台；标题用 `--font-display`（系统衬线），正文用 `--font-sans`。
- 文案：自研 `src/lib/i18n`（`zh-CN` / `en`），不引入 i18next。
- 动效只服务理解与反馈（`animate-rise` / `fade` / `pop` / `page`，150–380ms；卡片 `hover-lift`）；`data-motion="reduce"` 与 `prefers-reduced-motion` 同时生效。

## 5. 画布模块（flow-editor）

- React Flow v12 受控模式：节点/连线状态在 zustand 编辑器分片（Immer 结构共享 + zundo 撤销栈）。
- 节点类型清单来自引擎 `engine.hello` 上报的注册表；每种节点对应自定义 React 节点（统一外壳 `NodeShell`）。画布上只显示人话标题。
- 校验反馈实时映射到画布：引擎 `flow.validate` 的 issues 按 nodeId 挂到节点。
- 大流程性能：>500 节点开启 `onlyRenderVisibleElements`；连线默认贝塞尔，密集成团时降级直线。
- 撤销边界：画布操作进 zundo 栈；引擎执行产生的状态变化**不进**撤销栈。
- 开始页与编排页的「试一次」必须触发同一 `flow.run`，禁止第二套执行路径。

## 6. 状态管理

| 分片 | 内容 | 实现 |
| --- | --- | --- |
| `editorStore` | 当前流程文档、选区、dirty 标记 | zustand + Immer + zundo |
| `executionStore` | 最近一次执行状态镜像（渲染用，非真源） | zustand，由 event 驱动 |
| `uiStore` | 主题/强调色/字体/动效/语言、窗口偏好、全局搜索开合 | zustand；桌面壳以 `prefs.json` 为真源 |
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
- 性能预算：首屏 JS < 350 KiB gzip；画布 500 节点交互 60fps；全局搜索打开 < 100ms。CI 记录 bundle 体积趋势。
