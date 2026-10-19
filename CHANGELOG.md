# Changelog

本文件遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。
发布流水线（`.github/workflows/release.yml`）在合并进 `release` 分支后，会把对应版本章节写入 GitHub Release 正文。

## [Unreleased]

### Changed

- CI：代码检查仅在 `main`（及面向 `main` 的 PR）运行；Windows 打包仅在 push 到 `release` 时运行。
- Release：关闭 macOS / Linux 打包矩阵，仅发布 Windows 安装包；Release 正文由本 Changelog 生成。

## [0.2.0] - 2026-10-19

### Added

- GitHub Actions Release 工作流（Tauri 打包）。
- 开始页指令条、插入菜单、思维导图视图、记事本多行输入预设。
- 引擎 schema v3：嵌套控制流、文本类型、mock vision 能力。

### Changed

- 版本同步至 `0.2.0`（根 `package.json` → 三端）。
