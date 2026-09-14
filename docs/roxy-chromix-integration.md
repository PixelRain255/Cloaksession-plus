# Roxy 风格与 Chromix 集成记录

本文记录本项目对本机 Roxy Browser 的只读观察、Chromix 运行时集成方式、验证证据和阶段提交。Roxy 仅作为视觉与交互参考，不复制其专有代码、二进制或品牌资源。

## 参考对象

- Roxy 安装目录：`D:\RoxyBrowser`
- 主程序：`D:\RoxyBrowser\RoxyBrowser.exe`
- 调查方式：只读目录清单和已解包资源清单，没有启动、修改、卸载或关闭 Roxy。
- 可观察线索：Electron/Chromium 桌面应用、左侧工作区导航、紧凑 Profile 表格、活动/弹窗工作流，以及 `Inter`、`DM Mono`、`JetBrains Mono`、`Archivo` 等字体资源。
- 限制：`resources\app.asar` 未解包，不读取或复制 Roxy 专有实现。当前实现采用这些交互模式作为参考，使用本项目自己的 React/Tauri 组件。

## Chromix 版本

目标版本为 Chromix `v152.0.7977.82`，release 地址：

`https://github.com/xiaozhou26/Chromix/releases/tag/v152.0.7977.82`

Windows x64 资产：`chromix-win-x64.zip`

已从 GitHub release 元数据确认的 SHA-256：

`b4eed76824f5eae0b85de57081aa6b8c7ab8fcbee0432453ffb494900cae0c1e`

发布说明确认该包包含 `chrome.exe`，版本为 Chromium `152.0.7977.82`，并建议使用发布附件中的 `SHA256SUMS` 校验。浏览器 ZIP 不提交到本仓库；下载包和解压目录只放在本机或会话 scratch 目录。

## 安装与配置

1. 从上述 release 下载 `chromix-win-x64.zip`。
2. 使用 Windows 解压工具解压到本机目录，例如 `D:\Chromix\152.0.7977.82\`。
3. 在 Cloaksession 的 `Settings -> Browser engine` 选择 `Chromix`。
4. 在 `Settings -> Browser binary` 指向解压目录中的 `chrome.exe`。实现应同时接受包含该文件的目录路径，并在启动前归一化为可执行文件路径。
5. 完全重启 Cloaksession，使引擎和二进制路径进入新的浏览器驱动实例。
6. 创建或编辑 Profile，配置代理、指纹、启动页和扩展后启动 Profile。

Chromix 使用标准 Chromium 启动参数、独立 Profile 用户数据目录、CDP 远程调试端口和现有代理 bridge；CloakBrowser 专属的 `--fingerprint-*` 启动参数不能传给 Chromix。保存的 Profile 指纹字段仍可作为应用配置保留，但具体覆盖效果取决于标准 Chromium/CDP 能力。

## 当前实现状态

- [x] 主 Profile 工作台：左侧文字导航、紧凑列表、搜索、状态/标签筛选、全选和批量启动/停止。
- [x] Profile 编辑入口继续复用现有后端持久化，保留代理、指纹、启动页和扩展组件。
- [x] Settings、MCP 页面挂载统一的 Roxy 风格工作区样式入口。
- [x] Chromix Rust 引擎变体、路径归一化、标准 CDP bootstrap 与安全策略代码已实现；scratch Rust `1.98.1` 已安装并完成静态枚举核对。
- [x] Chromix 原始运行时 smoke：release ZIP SHA-256 校验通过；`chrome.exe` headless 启动后报告 `Chrome/152.0.7977.82`、CDP protocol `1.3`、目标页可读，关闭后进程数为 0。
- [ ] Windows x64 通过 Tauri Profile 流程的真实启动、CDP 基础检查和正常关闭：应用尚未能由 Cargo 构建，当前阻塞是缺少 Windows MSVC `link.exe`；原始 Chromix CDP smoke 已通过。
- [ ] 完整 UI bundle：系统 Node `v16.14.0` 无法运行 Vite 6；校验完整的 Node 22 便携二进制在本机执行时异常退出；`npx tsc -b` 已通过，`vite build` 尚未完成。

## 验证命令

在 Node 22、Rust stable 和 Windows MSVC 环境中执行：

```powershell
npm install --prefix crates/tauri-app/ui --legacy-peer-deps
npm --prefix crates/tauri-app/ui run build
cargo check --workspace
cargo test --workspace
```

前端当前已在本机执行 `npx tsc -b` 并通过。`npm --prefix crates/tauri-app/ui run build` 已实际执行，但 Vite 启动阶段因 Node 16 报错：`node:fs/promises` 不提供 Vite 6 使用的导出。尝试的 Node 22 便携包通过官方 SHA-256 校验，但 `node.exe --version` 以系统异常码 `-1073741819` 退出。Rust 使用 scratch Cargo `1.98.1` 实际执行过；`cargo check --workspace` 在依赖 build script 链接阶段因 `link.exe` 不存在失败。

真实 Chromix 原始运行时检查已在 scratch 完成，命令等价于：

```powershell
chrome.exe --headless=new --disable-gpu --remote-debugging-port=9334 --user-data-dir=<scratch> data:text/html,<title>chromix-smoke</title><p>ok</p>
Invoke-WebRequest http://127.0.0.1:9334/json/version
Invoke-WebRequest http://127.0.0.1:9334/json/list
```

实际结果：`browser=Chrome/152.0.7977.82`、`protocol=1.3`、`targetCount=1`、页面标题包含 `chromix-smoke`，结束后 `remainingChromixProcesses=0`。完整 Tauri 流程仍需在安装 Visual Studio Build Tools/MSVC linker 后执行：

```powershell
$env:RUN_CDP_INTEGRATION = "1"
$env:MULTIZEN_TEST_BINARY = "D:\Chromix\152.0.7977.82\chrome.exe"
cargo test -p browser-launcher --test driver -- --ignored
cargo test -p cdp-driver --test integration -- --ignored
```

执行真实测试前按仓库 README 设置 `RUN_CDP_INTEGRATION=1`、`MULTIZEN_TEST_BINARY` 或 `MULTIZEN_TEST_CDP`。必须验证启动一个 Profile、连接 CDP、完成基础状态或页面检查、关闭 Profile，并记录浏览器版本和退出结果。

## 限制与安全

- 本系统不承诺匿名、防检测或防泄漏；代理、指纹和 CDP 行为必须在实际内核和网络环境中验证。
- Profile 数据库、代理凭据、MCP token 和浏览器用户目录属于本地敏感数据，备份和共享整个数据目录前应先关闭应用。
- Chromix 二进制、Roxy 文件和第三方字体不进入仓库；分发时遵循各自许可证，Chromix release 提供 `LICENSE.chromium` 与 `LICENSE.chromix`。
- 浏览器路径必须指向可信的本地可执行文件，不要把未经校验的下载目录配置为运行时。
- 未完成真实内核启动验证前，不宣称跨平台运行时行为已验证。Windows x64 是本阶段第一验证平台。

## 排障与回滚

- 启动失败：检查 `Settings -> Browser binary` 是否指向 `chrome.exe`，确认 `--remote-debugging-port` 未被占用，并查看 Tauri 日志中的 `spawn`/CDP 错误。
- 代理失败：先使用无代理 Profile 验证 Chromix 启动，再检查代理类型、端口、认证和 SOCKS5 bridge。
- Profile 状态异常：关闭 Profile 后重新启动；不要手动删除用户数据目录。必要时退出应用后从备份恢复。
- 回滚 UI：回退到本阶段对应 Git 提交即可；不删除已有 Profile 数据库或用户目录。
- 回滚运行时：在 Settings 改回现有 `CloakBrowser` 或 `Chrome for Testing`，填写对应可执行文件路径并重启应用。

## 阶段提交

| 阶段 | 提交 | 推送状态 |
| --- | --- | --- |
| Roxy 风格 Profile 工作台、搜索筛选、批量启动/停止、响应式侧栏 | `b566661` | 已推送 `origin/main` |
| Chromix 引擎配置、路径归一化、标准 CDP bootstrap 与安全策略 | `d9fb710` | 已推送 `origin/main` |
| Settings/MCP/活动日志统一页面样式、审查修正与集成文档 | `f288288` | 已推送 `origin/main` |
| 全量构建、测试与真实 Chromix 验证 | 原始 Chromix smoke 已通过；UI/Rust 完整构建待 Node 22 与 MSVC linker 环境 | 待完成 |

## 变更边界

每个独立阶段完成后创建语义化提交并推送到当前分支的 `origin/main`。不执行强制推送、不重写 Git 历史，不把大体积浏览器运行时提交进仓库。若推送失败，保留本地提交并在本表和最终报告中记录失败原因。
