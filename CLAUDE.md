# CLAUDE.md

> 本文件为 Claude Code 提供项目上下文。最后更新：2026-06-30

## 项目概览

跨平台备忘录系统。单文件 Cloudflare Worker 后端 + 三种前端入口，数据存于 Cloudflare D1。

- **`worker.js`** — 单文件后端，内嵌两段 HTML 常量：
  - `HTML`：完整备忘录网页（增删改查 / 自动保存 / 搜索），由 `/` 提供
  - `WIDGET_HTML`：桌面壁纸用页面，由 `/widget` 提供，外观全部由 URL 参数驱动
- **`wrangler.toml`** — 绑定 D1 数据库 `memo-db`（表 `memos`：id, title, content, created_at, updated_at）

### D1 数据库

表 `memos` 结构（建库时手动执行）：
```sql
CREATE TABLE IF NOT EXISTS memos (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT    NOT NULL DEFAULT '',
  content    TEXT    NOT NULL DEFAULT '',
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
```
无自动迁移机制——schema 变更需手动在 D1 console 或 `wrangler d1 execute` 执行。

- **`android/`** — 原生 Kotlin 桌面小组件源码（非 APK，需拷进 Android Studio 项目编译）
  | 文件 | 职责 |
  |------|------|
  | `MemoWidgetProvider.kt` | 小组件主逻辑：刷新调度、按钮事件、WorkManager 注册 |
  | `MemoRefreshWorker.kt` | 后台抓取 `/api/widget`，结果存 SharedPreferences |
  | `MemoWidgetService.kt` | RemoteViewsService，为 ListView 提供数据 |
  | `MemoRemoteViewsFactory.kt` | 把标题渲染成列表行 |

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
wrangler dev                # 本地开发服务器（D1 用本地 SQLite，改完即刷）
node --check worker.js     # 部署前必须跑：验证模板字符串转义无误
wrangler deploy            # 部署到线上（改完 worker.js 后跑一次）
wrangler login             # 首次登录
```

改外观/位置/刷新率**无需重新部署**——只改 Lively 里 `/widget?参数` 的 URL 即可。
参数：`bg`/`card`/`blur`/`pos`(tr/tl/br/bl/center)/`margin`/`width`/`rate`。详见 README。

## 关键约束

- `worker.js` 是单文件，HTML/CSS/JS 以模板字符串内嵌——**改 HTML 内的 JS 时注意反引号与 `${}` 转义**（正则里 `\d` 要写 `\\d`）。
- `/widget` 与 `/api/widget.json` 同源部署，页面内用相对路径 `fetch`，勿写死域名。
- 改代码后必须 `node --check worker.js` 验证语法，再 `wrangler deploy`。

## 前端约定

- 自动保存：编辑后 2.5 秒无操作自动 PUT，无需手动保存
- 键盘快捷键：`Ctrl/Cmd+S` 手动保存、`Ctrl/Cmd+N` 新建、`Esc` 关闭对话框
- 备忘录按 `updated_at` 降序排列，新建的插到顶部

---

## 踩坑经验（2026-06-30）

### Rainmeter 踩坑记录（已弃用，仅备考）
早期用 Rainmeter 做桌面端，遇到连环坑（UTF-8 BOM→GBK 乱码、Lua `io.popen` 被安全禁用、
WebParser 本地路径解析错 `ErrorCode=12006`、正则 `U` 开关致静默空匹配），
最终弃用改用 Lively Wallpaper + `/widget` 页面方案。
**核心教训**：老工具编码/网络/脚本连环踩坑时，评估能力边界、换用现代方案（浏览器渲染）更省力。
详见 README「Windows 桌面小组件」章节。
