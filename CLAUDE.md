# CLAUDE.md

> 本文件为 Claude Code 提供项目上下文。最后更新：2026-06-30

## 项目概览

跨平台备忘录系统。单文件 Cloudflare Worker 后端 + 三种前端入口，数据存于 Cloudflare D1。

- **`worker.js`** — 单文件后端，内嵌两段 HTML 常量：
  - `HTML`：完整备忘录网页（增删改查 / 自动保存 / 搜索），由 `/` 提供
  - `WIDGET_HTML`：桌面壁纸用页面，由 `/widget` 提供，外观全部由 URL 参数驱动
- **`wrangler.toml`** — 绑定 D1 数据库 `memo-db`（表 `memos`：id, title, content, created_at, updated_at）
- **`android/`** — 原生 Kotlin 桌面小组件源码（非 APK，需拷进 Android Studio 项目编译）

### 接口一览

| 路由 | 用途 | 消费方 |
|------|------|--------|
| `/` | 完整网页 | 浏览器 |
| `/widget` | 壁纸自动刷新页（读 URL 参数调外观） | Windows + Lively Wallpaper |
| `/api/widget` | 纯文本标题清单（`• 标题`，≤100 条） | Android 小组件 |
| `/api/widget.json` | JSON 标题清单 | `/widget` 页面内部 |
| `/api/memos`、`/api/memos/:id` | 增删改查 | 网页前端 |

## 常用命令

```bash
wrangler deploy        # 部署（改完 worker.js 后跑一次，数据库无需重配）
wrangler login         # 首次登录
```

改外观/位置/刷新率**无需重新部署**——只改 Lively 里 `/widget?参数` 的 URL 即可。
参数：`bg`/`card`/`blur`/`pos`(tr/tl/br/bl/center)/`margin`/`width`/`rate`。详见 README。

## 关键约束

- `worker.js` 是单文件，HTML/CSS/JS 以模板字符串内嵌——**改 HTML 内的 JS 时注意反引号与 `${}` 转义**（正则里 `\d` 要写 `\\d`）。
- `/widget` 与 `/api/widget.json` 同源部署，页面内用相对路径 `fetch`，勿写死域名。
- 改代码后必须 `node --check worker.js` 验证语法，再 `wrangler deploy`。

---

## 踩坑经验（2026-06-30）

本项目早期用 Rainmeter 做 Windows 端，踩了一连串坑后最终弃用，改为 Lively + 网页方案。教训固化如下：

### 陷阱 1 — Rainmeter 中文乱码（`备忘录`→`澶囧繕褰`）
- **现象**：标题显示为乱码。
- **根因**：`.ini` 存为 UTF-8 BOM，老版 Rainmeter 忽略 BOM 按 GBK 解码。
- **有效解**：`.ini` 改存 **UTF-16 LE**（Rainmeter 唯一无歧义识别的编码）。

### 陷阱 2 — `io.popen` is nil（点刷新即崩溃）
- **现象**：`attempt to call field 'popen' (a nil value)`。
- **根因**：**Rainmeter 内置 Lua 出于安全禁用了 `io.popen`**，用 Lua 调 `curl.exe` 这条路在 Rainmeter 里根本不可行。
- **教训**：不要在 Rainmeter Lua 里尝试任何外部进程调用。

### 陷阱 3 — WebParser 读本地文件报 `ErrorCode=12006`
- **根因**：`Url=#CURRENTPATH#file.txt` 解析成裸 `C:\...`，WinINet 把 `C:` 当协议。
- **有效解**：加 `file://` 前缀。另：WebParser 默认按 UTF-8 解码，**不要**设 `CodePage=1`（非法值，会毁掉中文；UTF-8 是 `65001` 或留默认 `0`）。

### 陷阱 4 — 不报错但列表空白
- **根因**：正则用了 `(?siU)`，`U` 开关使 `(.*)` 变非贪婪 → 匹配到空串。
- **教训**：抓整页文本要用贪婪 `(?s)(.*)`。

### 走过的弯路（已放弃）
1. **curl.exe + Lua io.popen + WebParser 读本地文件** —— 因陷阱 2 注定不可行，整套废弃。
2. **WebParser 直连 HTTPS** —— 不崩了但静默不刷新（WebParser 网络层在部分机器上不工作且不报错，难调）。

### 最终有效方案 ✅
**彻底弃用 Rainmeter**，改为 **Lively Wallpaper + 网页**：
- 给 Worker 加 `/widget` 页面（深色卡片、自动轮询 `/api/widget.json`、外观由 URL 参数驱动）。
- 浏览器内核原生处理 UTF-8 与 HTTPS，编码/证书/网络坑**从根上消失**。
- 外观可调且无需重新部署（URL 参数化）。

**核心教训**：当一个老旧工具（Rainmeter）在编码、网络、脚本三方面连环踩坑时，不要逐个修补——
评估其能力边界，及时换用现代方案（浏览器渲染）往往是更省力的根治。
