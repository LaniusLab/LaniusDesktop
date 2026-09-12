# ADR-0009：非定制化 primitive 以 Radix 为底层

- 状态：已接受
- 日期：2026-09-13

## 背景

`src/ui` 按 ADR-0006 以 shadcn 模式内置，Radix 负责无障碍与交互。部分通用件（如 `Kbd`）曾完全自绘 HTML，未走 Radix 封装，和「项目基于 Radix」不一致。

## 决策

- **有对应 Radix Primitive 的**：只做薄包装 + token 样式。业务代码仍只从 `@/ui` 引入。当前包括 Dialog、Tooltip、Separator、Slot、Label、Checkbox、Switch、Radio Group、Tabs、Slider、Progress、Toggle / Toggle Group、Collapsible、Scroll Area、Avatar。
- **没有对应 Primitive 的通用件**（原生 Select、Input、Button、Card 等）：用 `@radix-ui/react-primitive` 封装原生元素，样式走 `tokens.css`。该包节点表不含 `textarea` / `table`，这些保持语义 HTML。Select 保持原生 `<select>`，不换成 Radix Select（那是 combobox，会破坏 `<option>` 用法）。
- **Kbd**：对齐 [Radix Themes `Kbd`](https://github.com/radix-ui/themes/blob/main/packages/radix-ui-themes/src/components/kbd.tsx)——默认 `<kbd>`，可点击用 `asChild` + `Slot`。只复刻结构，不引入 Themes 运行时；外观走 `.ui-kbd`。
- **真正定制的交互**：继续自研（Overlay、SplitPane、Menu、ContextMenu、Draggable）。Toast 目前是展示卡片，不用 `@radix-ui/react-toast` 的全局队列。
- **不引入 `@radix-ui/themes`**：Themes 是完整主题系统，与 Folia token / ADR-0006 否决全量组件库冲突。键帽外观用 token 复刻 classic 样式，不接 Themes 运行时。

## 理由

- 与 0006「Radix 解决无障碍与交互细节，精力集中在设计语言」对齐。
- `@radix-ui/react-primitive` 已是 Dialog / Tooltip 的传递依赖，升为直接依赖不扩大供应链品类。
- Themes 会带入第二套颜色、圆角与 CSS 变量，破坏 token 单一真源。

## 后果

- 新增「普通」primitive 先找 Radix Primitive，没有再用 `react-primitive`，最后才自研。
- 录制键帽用 `<Kbd asChild><Primitive.button /></Kbd>`，Slot 把 `.ui-kbd` 合成到按钮上。

## 备选（已否决）

- **继续纯自绘 HTML**：与「基于 Radix」的封装约定不一致。
- **引入 Radix Themes 的 `Kbd`**：好看，但拖进整套主题，否决理由同 ADR-0006。
