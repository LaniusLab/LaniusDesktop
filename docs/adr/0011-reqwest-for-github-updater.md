# ADR-0011：壳层经 curl 拉取 GitHub Releases 做应用内更新

- 状态：已接受
- 日期：2026-10-19

## 背景

产品要求以 **GitHub Release tag** 为版本真源，列出 published 版本、下载对应 Windows 安装包（msi / setup.exe）并启动安装器。壳负责自动更新（ARCHITECTURE 职责矩阵）；UI 禁止直连外网副作用。姊妹仓 Minecraft-Utilities 用 `reqwest` 完成同类路径。

## 决策

壳层通过 **`curl` 子进程**（Windows 10+ / macOS / Linux 均自带或常见）访问 GitHub：

1. `GET /repos/{owner}/{repo}/releases`（默认 published；draft 不在公开 API）
2. 下载 `browser_download_url` 指向的 Windows 资产到本机缓存目录

不引入 `reqwest` / Tauri updater 插件：当前仓库 `rust-version = 1.83`，crates.io 上较新的 HTTP/TLS 传递依赖已要求 edition2024 / Rust ≥1.85，无法在不抬 MSRV 的情况下干净落地。签名静默安装仍属 ROADMAP **M5**。

安装为 **交互式启动** 已下载的 setup.exe / `msiexec /i` msi。

## 理由

- HTTPS 是硬需求；`curl -fsSL` 在发版目标机上可用，错误可映射为 `shell.updater.networkFailed` + `traceId`。
- 避免为过渡能力抬高 MSRV 或引入与 toolchain 冲突的 TLS 栈。
- 与 M5「签名 Tauri updater」不冲突：本 ADR 明确为过渡实现。

## 后果

- 依赖本机 `curl`；缺失时返回明确错误码（可后续再评估抬 MSRV + reqwest）。
- draft release（如未发布的 `v0.2.0`）对无 token 的公开 API 不可见——需人工 Publish。
- 下载进度为粗粒度（开始 / 结束）；细粒度进度可在 M5 随 updater 插件一并做。

## 备选（已否决 / 推迟）

- **立刻引入 reqwest（同 MU）**：在 Rust 1.83 下传递依赖无法解析；抬 MSRV 后再议。
- **UI 直接 `fetch` GitHub**：违反架构红线。
- **立刻上 `tauri-plugin-updater` + 签名**：属 M5，当前无签名密钥与验收通道。
