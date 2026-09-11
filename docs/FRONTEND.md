# 前端架构

> 状态：已评审 · 最后更新：2026-09-11
> 关联决策：[ADR-0002](adr/0002-react-over-vue.md) [ADR-0006](adr/0006-builtin-component-library.md) [ADR-0007](adr/0007-command-registry.md)

## 1. 技术选型

| 领域 | 选型 | 备注 |
| --- | --- | --- |
| 框架 | React 19 + TypeScript（strict） | 见 ADR-0002 |
| 构建 | Vite 6 | 开发服务器即 UI 预览 |
| 样式 | Tailwind CSS 4 + CSS 变量 token | 禁写死颜色，见第 4 节 |
| 组件库 | 内置 `src/ui`（shadcn 为种子） | 见第 3 节 |
| 画布 | React Flow v12（`@xyflow/react`） | 只是模块之一，不是应用主体 |
| 客户端状态 | Zustand + Immer + zundo | zundo 仅用于编辑器撤销 |
| 服务端状态 | TanStack Query | 引擎/壳数据的缓存与失效 |
| 表单 | React Hook Form + Zod | 节点属性面板统一模式 |
| 代码编辑 | CodeMirror 6 | 表达式/模板编辑 |
| 图标 | lucide-react | 唯一图标来源 |
| 测试 | Vitest + Testing Library · Playwright | 组件测试 + e2e |

## 2. 应用骨架

```
┌────────────┬──────────────────────────────────────┐
│            │  PageHeader（标题/操作/命令面板入口）    │
│  侧边栏     ├──────────────────────────────────────┤
│  流程列表   │                                      │
│  执行历史   │              主工作区                  │
│  设置      │      （画布 / 历史详情 / 设置页）        │
│            │                                      │
├────────────┴──────────────────────────────────────┤
│ 状态栏：引擎状态 · 执行状态 · 当前 traceId           │
└───────────────────────────────────────────────────┘
```

- 路由：TanStack Router；`/flows/:id`（画布）、`/history`、`/history/:executionId`、`/settings`、dev-only `/dev/gallery`。
- 主题：dark-first，token 驱动，亮色主题为同一 token 集的另一组值。
- 空/加载/错误三态是每个页面的必备件，不是事后补丁（`ui/patterns/EmptyState`、`ErrorState`、`LoadingState`）。

## 3. 内置组件库 `src/ui`

### 3.1 三层结构

| 层 | 内容 | 规则 |
| --- | --- | --- |
| `primitives/` | Radix UI 的样式化包装：Button、Input、Dialog、Select、Tooltip… | 不含业务词；shadcn CLI 产物落此层 |
| `composed/` | 跨 primitive 组合：DataTable、FormField、SearchInput、ConfirmDialog… | 不含具体页面语义 |
| `patterns/` | 业务模式：PageHeader、EmptyState、ErrorState、ExecutionStatusBadge… | 可含业务词，不含页面布局 |

### 3.2 铁律

1. **唯一出口**：业务代码只能 `from "@/ui"`（barrel）。ESLint `no-restricted-imports` 禁止 `@/ui/primitives/*` 等深路径与 `@radix-ui/*` 直引。
2. **token 驱动**：颜色/间距/圆角只引用 `tokens.css` 的 CSS 变量对应的 Tailwind token；`text-gray-500`、`#fff` 这类写死值由 ESLint 规则拦截。
3. **shadcn 工作流**：`components.json` 保留，新增 primitive 用 `pnpm dlx shadcn add <name>`，落盘后人工过一遍 token 合规。
4. **升级路径**：组件先在页面里写 → 第二次出现提为 composed → 跨模块复用且有业务语义提为 patterns。禁止"预防性抽象"。
5. **文档**：dev-only 路由 `/dev/gallery` 渲染全部组件与状态变体，作为活文档；不引入 Storybook。

## 4. 样式规范

- Tailwind 4，`@theme` 在 `tokens.css` 中把 CSS 变量映射为 utility token（`bg-surface`、`text-fg-muted`、`border-line`…）。
- 语义 token 三层：`--surface-*`（背景）、`--fg-*`（前景）、`--accent-*`（强调/状态）。新增颜色必须先加 token。
- 动效：只用于状态反馈（150–250ms），禁止装饰性动画；尊重 `prefers-reduced-motion`。

## 5. 画布模块（flow-editor）

- React Flow v12 受控模式：节点/连线状态在 zustand 编辑器分片（Immer 结构共享 + zundo 撤销栈）。
- 节点类型清单来自引擎 `engine.hello` 上报的注册表；每种节点对应一个自定义 React 节点组件（统一外壳 `NodeShell`：标题、端口、状态环、错误角标）。
- 校验反馈实时映射到画布：引擎 `flow.validate` 的 issues 按 nodeId 挂到节点。
- 大流程性能：>500 节点开启 `onlyRenderVisibleElements`；连线默认贝塞尔，密集成团时降级直线。
- 撤销边界：画布操作进 zundo 栈；引擎执行产生的状态变化**不进**撤销栈。

## 6. 状态管理

| 分片 | 内容 | 实现 |
| --- | --- | --- |
| `editorStore` | 当前流程文档、选区、dirty 标记 | zustand + Immer + zundo |
| `executionStore` | 最近一次执行状态镜像（渲染用，非真源） | zustand，由 event 驱动 |
| `uiStore` | 主题、面板开合、命令面板开关 | zustand |
| 服务端数据 | 历史列表、引擎信息、节点注册表 | TanStack Query，event 触发失效 |

规则：派生值用 selector 计算，不另存一份；跨分片通信走命令（见下），不直接互调 set。

## 7. 命令系统

集中式命令注册表（ADR-0007）：

```ts
registry.register({
  id: "flow.run",                 // 全局唯一，域.动词
  title: "运行流程",
  scope: "editor",                // global | editor | history…
  shortcut: "Mod+Enter",
  when: (ctx) => ctx.editor.dirty === false && ctx.engine.status === "ready",
  run: (ctx) => ctx.bridge.flowRun({ mode: "run" }),
});
```

- 命令面板、菜单、快捷键、按钮都只是注册表的触发器；同一动作不存在第二份实现。
- `when` 子句求值上下文显式注入，不读全局单例（可测试）。
- 快捷键冲突在注册时检测（dev 下 throw）。

## 8. 桥接层（`src/lib/bridge`）

- 每个 invoke 一个类型安全 wrapper：参数/返回类型来自 `src/lib/gen/`（schema codegen 产物）。
- `useTauriEvent(channel, handler)`：订阅 hook，卸载自动退订。
- 错误处理：壳返回的错误模型在这里分类——`fatal` 进 ErrorState 页，`error` 进 toast，`warning` 进内联提示；统一附 traceId 复制按钮。

## 9. 表单模式

节点属性面板统一：Zod schema（由节点 config schema 生成或手写对齐）→ RHF `resolver` → `FormField`（composed）渲染。校验失败信息内联展示，不弹窗。

## 10. 测试与性能

- 组件测试：Vitest + Testing Library，只测行为不测实现；bridge 层用 vi.mock 替换。
- e2e：Playwright 跑 Vite dev server（web 层流程）；Tauri 内 e2e 在 M5 评估。
- 性能预算：首屏 JS < 350 KiB gzip；画布 500 节点交互 60fps；命令面板打开 < 100ms。CI 记录 bundle 体积趋势。
