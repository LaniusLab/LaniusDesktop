# ADR-0006：组件库内置 `src/ui` 而非独立包

- 状态：已接受
- 日期：2026-09-11

## 背景

项目需要统一的设计系统。候选：直接全量引入现成组件库（MUI/AntD）、抽独立的 npm 包自研、在仓库内置组件层（shadcn 模式）。

## 决策

在仓库内置三层组件库 `src/ui`（primitives / composed / patterns），以 shadcn/ui 为种子（Radix UI primitives + Tailwind token），barrel 文件 `@/ui` 为唯一出口，ESLint `no-restricted-imports` 强制。保留 `components.json` 使 shadcn CLI 持续可用。文档用 dev-only 路由 `/dev/gallery`，不引入 Storybook。

## 理由

- shadcn 模式 = 拥有源码：样式完全 token 化，与产品设计语言绑定，无第三方主题妥协。
- 独立 npm 包的版本编排成本对单应用仓库是纯负担；内置层随应用原子演进。
- 三层 + barrel + lint 规则提供了与独立包同等的边界约束，但没有发布流水线。
- Radix 解决无障碍与交互细节，团队精力集中在设计语言与业务模式。

## 后果

- 组件质量责任在团队自身 → gallery 活文档 + 组件测试兜底。
- 若未来拆多应用，再评估抽包（届时 primitives 层可直接平移）。

## 备选（已否决）

- **MUI/AntD 全量引入**：主题系统与本项目 token 体系冲突，包体大，深度定制痛苦。
- **独立 npm 包**：单应用阶段收益为零，成本真实存在。
- **Storybook**：与 dev-only gallery 路由功能重叠，多一套构建与部署。
