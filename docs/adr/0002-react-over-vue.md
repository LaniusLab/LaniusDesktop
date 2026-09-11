# ADR-0002：前端框架选 React 而非 Vue

- 状态：已接受
- 日期：2026-09-11

## 背景

团队历史项目（Minecraft-Utilities 等）均使用 Vue 3 + Vuetify，Vue 经验更深。Lanius 的核心差异化模块是自动化流程的可视化编排画布。

## 决策

选 **React 19**。画布只是平台的一个模块而非主体，但它是生态约束最强的模块，框架选择服从它。

## 理由

- 可视化编排画布的生态决定性因素：React Flow v12 是同领域最成熟、维护最活跃的库（类型完善、受控模式、大数据量优化路径清晰）；Vue Flow 是其移植版，能力与更新节奏滞后。
- 画布需要细粒度的受控状态与撤销栈，React + Zustand + Immer + zundo 组合有成熟范式。
- 组件库自研（ADR-0006）后，Vue 侧的 Vuetify 经验优势不再关键；Radix UI 提供了更彻底的无样式 primitive 起点。

## 后果

- 团队需要适应 React 心智模型（hooks 纪律、不可变更新）；通过 CONTRIBUTING.md 的 TS/React 纪律与 lint 规则兜底。
- 历史项目的 Vue 组件资产不可复用——接受，因为新项目组件库本就自研。

## 备选（已否决）

- **Vue 3 + Vue Flow**：画布生态风险集中在最核心的差异化模块上，不可接受。
- **Svelte/Solid**：生态与团队熟悉度双输。
