# 安全模型

> 状态：已评审 · 最后更新：2026-09-12
> 实现进度：下文为完整安全目标；M0 仅具备基础 CSP / capabilities 收紧。落地节奏见 [ROADMAP.md](ROADMAP.md)。

Lanius 的本质是"替用户操作电脑"，安全模型围绕两个事实构建：流程文件可能来自不可信来源；执行能力（键鼠、文件、HTTP）本身是高权限的。

## 1. 威胁模型

| 威胁 | 场景 | 对策（章节） |
| --- | --- | --- |
| 恶意流程文件 | 用户打开来路不明的 `.flow.json` | 信任分级（§4）、危险节点确认（§5）、dry-run（§5） |
| 凭据泄露 | 密码写进流程文件/日志/历史 | keyring 引用（§3）、日志脱敏（§6） |
| Webview 注入 | XSS 借桥接层拿到原生能力 | CSP + capabilities 最小化（§2） |
| 引擎被劫持 | sidecar 通道被本机其他进程利用 | stdio 无监听端口（§2）、帧大小上限 |
| 供应链 | 依赖被投毒 | lockfile + audit（§7） |
| 更新通道 | 更新包被替换 | 签名更新（§7） |

## 2. 应用加固

- **CSP**：`tauri.conf.json` 收紧到 `default-src 'self'`；禁 `unsafe-eval`；样式走构建产物，禁远程字体/图片。
- **capabilities**：`src-tauri/capabilities/default.json` 只声明用到的权限。M0 为无边框自绘顶栏增加了窗口 close / minimize / maximize / start-dragging 等；仍无任意 fs / 远程内容。新增权限必须过 review 并在 ADR 记录理由。
- **无远程内容**：webview 只加载本地构建产物；`http.request` 节点在引擎侧执行，不经 webview。
- **stdio 通道**：引擎不监听任何网络端口；stdio 天然只有父进程可达。帧上限 1 MiB，超限断开。

## 3. 凭据管理

- 真实值只存系统 keyring（Windows Credential Manager / macOS Keychain / Secret Service），由 Rust 壳经 `keyring` crate 读写。
- 流程文件、执行历史、日志中只允许出现 `secret://<name>` 引用。
- 引擎需要凭据时：节点把 `secretRef` 交给壳的 `secret_get`（经 RPC 回调约定，M4 细化），值在内存中传递，使用节点标记 `sensitive: true` 的端口——该端口值**不进**历史与日志。
- UI 提供凭据管理页（设置 → 凭据），只显示名称列表，永不回显值。

## 4. 信任分级

| 级别 | 来源 | 行为 |
| --- | --- | --- |
| 可信 | 用户自建 / 显式标记信任 | 正常运行 |
| 未信任 | 外部导入、首次打开 | 禁止自动运行（含开机自启/快捷键触发）；打开即提示；首次运行逐条确认危险节点 |

信任记录存本机（流程 id + 文件哈希），文件被修改后哈希失配自动降级为未信任。

## 5. 危险操作与 dry-run

- 节点按 `side_effect` 与 `danger_level`（`safe` / `caution` / `destructive`）分级。`fs.write` 覆盖、`process.terminate`、发送 HTTP POST 等属 `destructive`。
- 未信任流程中的 `destructive` 节点：执行前弹确认对话框，列出节点将做什么（目标路径/URL/进程）。
- **dry-run 原则**：任何流程都能用 mock driver 完整预演，UI 在执行前提供"预演"入口，预演轨迹与真实执行同构可比。
- 全局开关：`设置 → 执行 → 禁止所有 destructive 节点`。

## 6. 日志与历史脱敏

- 引擎日志管线内置脱敏处理器：`sensitive` 端口值、keyring 值、HTTP Authorization 头一律渲染为 `***`。
- 执行历史的输入/输出摘要同样过脱敏；截图类产物不落历史库。
- traceId 不含任何用户信息（ULID 随机）。

## 7. 供应链与更新

- **当前**：前端以 `pnpm-lock.yaml` 锁定依赖；引擎仅有 `pyproject.toml`（尚无 `uv.lock` / 哈希锁定）。
- **目标（M5）**：引擎引入 lockfile；CI 跑 `pnpm audit` 与 `pip-audit`，高危阻断。
- 新增依赖评估清单见 [CONTRIBUTING.md](../CONTRIBUTING.md#依赖管理)。
- 应用更新走 Tauri updater，包签名公钥内置；引擎不独立更新，随应用同包下发。
- 发布产物附 SBOM（M5）。

## 8. 安全响应

发现漏洞：在仓库开 security advisory（不公开细节）→ 修复版本发布 → advisory 公开。凭据类事故额外强制轮换指引。
