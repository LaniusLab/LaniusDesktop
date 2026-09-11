# ADR-0001：桌面壳选 Tauri 2 而非 Electron

- 状态：已接受
- 日期：2026-09-11

## 背景

Lanius 需要常驻桌面（托盘、全局快捷键、自动更新），同时内嵌一个 Python sidecar。候选：Tauri 2、Electron、纯原生壳。

## 决策

选 **Tauri 2**。Rust 壳负责窗口/托盘/快捷键/更新/sidecar 守护，不承载业务逻辑。

## 理由

- 产物体积与内存占用比 Electron 低一个数量级（无捆绑 Chromium），对常驻工具类应用是关键体验指标。
- Rust 与系统层交互（keyring、全局快捷键、进程守护）生态成熟且类型安全。
- Tauri 的 capabilities 权限模型与 CSP 收紧天然契合本项目的安全模型（docs/SECURITY.md §2）。
- sidecar（externalBin）是一等公民机制，正好承载 Python 引擎。

## 后果

- 各平台 webview 内核不同（WebView2/WebKitGTK/WebKit），CSS 兼容性需测试矩阵覆盖；通过限制使用现代但成熟的 CSS 特性控制。
- Rust 编译需要系统依赖（Linux 上 webkit2gtk 开发包），CI 与开发环境需文档化。
- 团队需维护少量 Rust 代码；通过"Rust 不写业务逻辑"红线把复杂度锁在薄壳层。

## 备选（已否决）

- **Electron**：体积/内存代价大；能力模型宽松，安全收紧成本高。
- **纯原生（三平台各写一套）**：维护成本不可接受。
