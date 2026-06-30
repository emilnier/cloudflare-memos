# 📝 备忘录 Memo App

一个跨平台的备忘录系统。核心是一个部署在 **Cloudflare** 上的网页应用（增删改查、自动保存、搜索），
另外提供两种"桌面/手机一眼可见"的小组件方案：

- **Windows 端**：用 [Lively Wallpaper](https://www.rocksdanister.com/lively/) 把备忘录嵌进桌面壁纸
- **Android 端**：原生桌面小组件（Kotlin）

三端共用同一个后端，数据存在 Cloudflare D1 数据库里，全球边缘节点访问，免费额度足够个人使用。

---

## 目录

1. [整体架构](#一整体架构)
2. [第一步：部署 Cloudflare Worker（所有功能的基础）](#二第一步部署-cloudflare-worker所有功能的基础)
3. [Windows 桌面小组件（Lively Wallpaper）](#三windows-桌面小组件lively-wallpaper)
4. [壁纸 URL 参数大全](#四壁纸-url-参数大全)
5. [Android 桌面小组件](#五android-桌面小组件)
6. [常见问题 FAQ](#六常见问题-faq)

---

## 一、整体架构

```
                 ┌─────────────────────────────┐
                 │   Cloudflare Worker (后端)   │
                 │   worker.js + D1 数据库      │
                 └──────────────┬──────────────┘
                                │ 提供这些网址：
          ┌─────────────────────┼─────────────────────────┐
          │                     │                         │
   /  (完整网页)          /widget (壁纸页面)        /api/widget (纯文本)
   增删改查备忘录          Windows 端用              Android 端用
          │                     │                         │
     浏览器/手机          Lively Wallpaper          Android 小组件
```

- **后端只需部署一次**。之后 Windows 和 Android 两端都是直接连这个后端，不用各自配服务器。
- 你已经拥有：D1 数据库 `memo-db`（表 `memos`：id, title, content, created_at, updated_at）、`worker.js`（单文件后端 + 前端）、`wrangler.toml`（已配好数据库绑定）。

后端提供的网址（接口）一览：

| 网址 | 用途 | 谁在用 |
|------|------|--------|
| `/` | 完整的备忘录网页（新建/编辑/删除/搜索） | 浏览器、手机 |
| `/widget` | 桌面壁纸用的自动刷新页面 | Windows + Lively |
| `/api/widget` | 纯文本标题清单（每行一条，最多 100 条） | Android 小组件 |
| `/api/widget.json` | JSON 格式的标题清单 | `/widget` 页面内部调用 |
| `/api/memos` 等 | 增删改查接口 | 网页前端内部调用 |

---

## 二、第一步：部署 Cloudflare Worker（所有功能的基础）

> ⚠️ **不管你用 Windows 还是 Android，这一步都必须先做。** 没有部署后端，两端小组件都拿不到数据。

### 准备工作

1. 有一个 [Cloudflare 账号](https://dash.cloudflare.com/sign-up)（免费）。
2. 电脑装好 [Node.js](https://nodejs.org/)（装它是为了用 `npm` 命令；装 LTS 版即可）。
   - 验证是否装好：打开终端（Windows 按 `Win+R` 输入 `cmd` 回车），输入 `node -v`，能显示版本号就 OK。

### 部署步骤（约 3 分钟）

打开终端，依次执行：

1. **安装 wrangler**（Cloudflare 的命令行工具，只需装一次）：
   ```bash
   npm install -g wrangler
   ```

2. **登录 Cloudflare**（会自动打开浏览器让你授权，点同意即可）：
   ```bash
   wrangler login
   ```

3. **进入项目目录并部署**（把下面路径换成你电脑上 `memo-app` 文件夹的实际位置）：
   ```bash
   cd memo-app
   wrangler deploy
   ```

4. 部署成功后，终端会输出你的专属网址，形如：
   ```
   https://memo-app.你的子域名.workers.dev
   ```
   **把这个网址记下来**，后面 Windows 和 Android 两端都要用到它。

### 验证是否成功

在浏览器打开上面那个网址：
- 打开**根网址**（`.../`）应该能看到完整的备忘录网页，可以新建几条试试。
- 打开 **`.../api/widget`** 应该能看到纯文本的标题清单（每行一个 `• 标题`）。
- 打开 **`.../widget`** 应该能看到一张深色的备忘录小卡片。

三个都正常，后端就部署好了。

### 之后想改代码

改完 `worker.js` 后，再跑一次 `wrangler deploy` 就更新线上版本了，**数据库不用重新配置，已有数据也不会丢**。

---

## 三、Windows 桌面小组件（Lively Wallpaper）

原理：Lively Wallpaper 是一款免费开源软件，能把任意网页设成桌面动态壁纸。
我们把后端的 `/widget` 页面设成壁纸，备忘录就"贴"在了桌面上，每 5 秒自动刷新。

> 相比传统的 Rainmeter，这个方案**没有中文乱码、没有证书问题**，因为是浏览器内核原生渲染 UTF-8 和 HTTPS。

### 安装步骤

1. **安装 Lively Wallpaper**（二选一）：
   - 在 Microsoft Store（微软商店）搜索 "Lively Wallpaper" 安装；
   - 或到官网 [rocksdanister.com/lively](https://www.rocksdanister.com/lively/) 下载。

2. **把网页设成壁纸**：
   - 打开 Lively → 点左下角的 **`+`（Add Wallpaper）**
   - 在地址栏粘贴你的壁纸网址（把子域名换成你自己的）：
     ```
     https://memo-app.你的子域名.workers.dev/widget
     ```
   - 按回车 → 它会出现在壁纸列表里 → **双击**它设为当前壁纸。

3. 完成！备忘录卡片现在贴在桌面右上角，每 5 秒自动同步你在网页端的改动。

### 想换颜色 / 位置 / 刷新频率？

**好消息：改外观完全不用动代码、不用重新部署。** 只要在上面那个网址后面加参数即可。

例如，你想要**纯黑背景**（除了备忘录卡片，整个桌面背景纯黑）：

```
https://memo-app.你的子域名.workers.dev/widget?bg=000000&blur=0&card=000000
```

改法：在 Lively 里编辑这个壁纸的 URL（或删掉重新 Add），粘贴带参数的新网址，立即生效。

所有可用参数见下一节 👇

---

## 四、壁纸 URL 参数大全

在 `/widget` 后面加 `?参数1=值1&参数2=值2` 即可。参数之间用 `&` 连接，顺序随意。

| 参数 | 作用 | 可选值 / 示例 | 默认 |
|------|------|---------------|------|
| `bg` | 整页背景色 | `000000`（纯黑）、`transparent`（透明，透出桌面壁纸）、`ffffff`（白） | `transparent` |
| `card` | 备忘录卡片背景色 | `000000`、`24,26,32,0.82`（半透明深灰） | 半透明深灰 |
| `blur` | 卡片毛玻璃模糊半径（像素） | `0`（关闭，纯色背景时建议）、`18` | `18` |
| `pos` | 卡片位置 | `tr` 右上、`tl` 左上、`br` 右下、`bl` 左下、`center` 居中 | `tr` |
| `margin` | 卡片距屏幕边缘的距离（像素） | `32`、`50` | `32` |
| `width` | 卡片宽度（像素） | `300`、`360` | `300` |
| `rate` | 自动刷新间隔（秒） | `5`、`30`、`60` | `5` |

### 颜色值怎么写

- **六位十六进制**：`000000`（黑）、`ffffff`（白）、`1a1d23`（深灰）。不用加 `#`。
- **关键字**：`black`、`white`、`transparent`。
- **带透明度的 RGBA**：`24,26,32,0.82`（最后一位 0~1 是不透明度，越小越透）。

### 常用配方（直接抄，记得换子域名）

**① 纯黑背景，卡片与背景融为一体（你当前想要的）**
```
/widget?bg=000000&blur=0&card=000000
```

**② 纯黑背景，但卡片略亮、能看出边界**
```
/widget?bg=000000&blur=0
```

**③ 透明背景（透出你原本的桌面壁纸），卡片放左下角**
```
/widget?pos=bl
```

**④ 左下角、纯黑、卡片加宽、30 秒刷新一次（更省流量）**
```
/widget?bg=000000&blur=0&card=000000&pos=bl&width=360&rate=30
```

> 小贴士：卡片右上角有个小圆点是**连接状态指示灯**——🟢绿色=正常，🔴红色=抓取失败。

---

## 五、Android 桌面小组件

考虑到 Android 对后台任务的限制，采用「**每小时自动刷新一次 + 手动刷新按钮**」的方案，
不会快速消耗 Worker 的免费请求额度。

> ⚠️ 这**不是一个能直接安装的 APK**，而是一套 Kotlin 源码 + 资源文件，
> 需要你用 Android Studio 把它编译成 App 装到手机上。下面一步步教，跟着做即可。

### 第 1 步：安装 Android Studio

到 [developer.android.com/studio](https://developer.android.com/studio) 下载安装（免费，官方 IDE）。
第一次打开会自动下载 SDK，耐心等它装完。

### 第 2 步：新建一个空项目

打开 Android Studio → **New Project**，按下面选：

| 选项 | 选什么 |
|------|--------|
| 模板（Template） | **Empty Views Activity**（注意不是 "Empty Activity"，要带 **Views** 的那个） |
| Name | 随意，比如 `MemoWidget` |
| Package name | **`com.example.memowidget`**（强烈建议就用这个，省去改包名的麻烦） |
| Language | **Kotlin** |
| Minimum SDK | **API 23** 或更高 |
| Build configuration language | **Kotlin DSL**（即 `build.gradle.kts`，默认就是） |

点 Finish，等它构建完成（第一次会下载一些依赖，需要联网等几分钟）。

> 如果你执意要用别的 Package name（不是 `com.example.memowidget`），那么所有 `.kt` 文件开头的
> `package com.example.memowidget` 和 `AndroidManifest.xml` 里出现的 `com.example.memowidget`
> 都要一并替换成你的包名。**新手建议直接用默认包名，别折腾。**

### 第 3 步：放入文件（核心步骤，分"拷贝"和"合并"两类）

本项目的 `android/app/src/main/` 目录下，文件分两种处理方式：

#### 🟢 A 类：直接拷贝（整个文件复制过去，覆盖/新建即可）

这些文件你项目里本来没有，直接拷进**对应的同名目录**：

```
拷贝源（本项目）                                          →  放到你项目的（同名路径）

app/src/main/java/com/example/memowidget/
  ├─ MemoWidgetProvider.kt      小组件主逻辑（刷新调度、按钮事件）   →  app/src/main/java/com/example/memowidget/
  ├─ MemoRefreshWorker.kt       后台抓取数据（⚠️见第4步要改URL）    →  （同上目录）
  ├─ MemoWidgetService.kt       数据服务                           →  （同上目录）
  └─ MemoRemoteViewsFactory.kt  把标题渲染成列表行                  →  （同上目录）

app/src/main/res/
  ├─ layout/widget_memo.xml         小组件整体布局        →  app/src/main/res/layout/
  ├─ layout/widget_memo_item.xml    单条标题的行布局      →  app/src/main/res/layout/
  ├─ drawable/widget_background.xml  小组件背景           →  app/src/main/res/drawable/
  ├─ drawable/widget_refresh_btn_bg.xml  刷新按钮背景     →  app/src/main/res/drawable/
  ├─ drawable/ic_refresh.xml         刷新图标             →  app/src/main/res/drawable/
  └─ xml/memo_widget_info.xml        小组件元数据(尺寸等) →  app/src/main/res/xml/
```

> 💡 在 Android Studio 左侧把视图从 "Android" 切换成 **"Project"**，能看到和上面一模一样的真实文件夹结构，方便对照拷贝。
> `res/xml/` 目录如果不存在，右键 `res` → New → Directory，命名为 `xml` 即可。

#### 🟡 B 类：手动合并（你项目里**已经有同名文件**，不能直接覆盖，要打开两个文件把内容拼进去）

**① `AndroidManifest.xml`**（你的项目自带了一个，路径 `app/src/main/AndroidManifest.xml`）

打开你项目已有的 `AndroidManifest.xml`，把本项目该文件里的这两部分加进去：

- 把这两行 `<uses-permission>` 加到 `<manifest>` 标签内、`<application>` 标签**之前**：
  ```xml
  <uses-permission android:name="android.permission.INTERNET" />
  <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
  ```

- 把这一段 `<receiver>` 和 `<service>` 加到 `<application> ... </application>` 标签**之内**
  （和已有的 `<activity>` 节点并列）：
  ```xml
  <receiver
      android:name=".MemoWidgetProvider"
      android:exported="true">
      <intent-filter>
          <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
          <action android:name="com.example.memowidget.ACTION_REFRESH" />
      </intent-filter>
      <meta-data
          android:name="android.appwidget.provider"
          android:resource="@xml/memo_widget_info" />
  </receiver>

  <service
      android:name=".MemoWidgetService"
      android:exported="false"
      android:permission="android.permission.BIND_REMOTEVIEWS" />
  ```
  > ⚠️ 不要把你项目原本的 `<activity>`（启动页）删掉，只是**新增**上面这些。

**② `res/values/strings.xml`**（你的项目自带了一个）

打开你项目已有的 `strings.xml`，在 `<resources> ... </resources>` 之间**新增**这两行
（如果已经有 `app_name`，就只加 `widget_description` 那行，别重复）：
```xml
<string name="widget_description">实时显示你的备忘录标题清单</string>
```
（`app_name` 一般已存在，本组件用的名字是"备忘录小组件"，你可以改你项目里的 `app_name` 值，或保持原样都行。）

**③ `app/build.gradle.kts`**（依赖合并，文件在 `app` 目录下，注意别和项目根目录那个搞混）

打开你项目的 `app/build.gradle.kts`，找到 `dependencies { ... }` 这个区块，把下面三行加进去：
```kotlin
implementation("androidx.work:work-runtime-ktx:2.9.1")
implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
implementation("androidx.core:core-ktx:1.13.1")
```
> `core-ktx` 通常新项目已自带，重复了 Gradle 会提示，删掉重复的一行即可。
> 加完后，Android Studio 顶部会出现 **"Sync Now"** 黄色提示条，点它同步依赖。

> 📄 本项目里的 `android/app/build.gradle.snippet.kts` 只是给你参考用的"片段"文件，
> **它本身不参与编译，合并完依赖后可以忽略/删除它。**

### 第 4 步：必须改的一处——填入你的 Worker 地址

打开 `MemoRefreshWorker.kt`，找到第 29 行附近：
```kotlin
const val WIDGET_API_URL = "https://memo-app.YOUR-SUBDOMAIN.workers.dev/api/widget"
```
把 `YOUR-SUBDOMAIN` 换成你**第二步**部署后拿到的真实子域名。例如：
```kotlin
const val WIDGET_API_URL = "https://memo-app.abcd1234.workers.dev/api/widget"
```
> ⚠️ 这一步不改的话，小组件会一直空白（因为它不知道去哪拿数据）。

### 第 5 步：编译并安装到手机

1. 手机用数据线连电脑，并在手机上**开启「开发者选项」→「USB 调试」**
   （开发者选项的开启方法：设置 → 关于手机 → 连点"版本号"7 次）。
2. Android Studio 顶部会识别到你的手机，点绿色的 **Run ▶️** 按钮。
3. 它会自动编译、安装并启动 App 到你手机上。

### 第 6 步：把小组件添加到桌面

App 装好后，**长按手机桌面空白处** → 选「小组件 / Widgets」→ 找到「**备忘录小组件**」→ 拖到桌面。

### 刷新机制说明

- **自动刷新**：每小时一次，由 WorkManager 在后台调度（App 没打开也会跑）。
  系统省电策略可能让它延迟，这是 Android 系统本身的限制，所有第三方小组件都一样。
- **手动刷新**：点小组件右上角的圆形刷新图标，立即拉取最新数据。
- 删除小组件时会自动取消后台任务，不会偷偷耗电耗流量。

---

## 六、常见问题 FAQ

**Q：部署 Worker 时报错 `fetch failed` 怎么办？**
A：多半是临时网络波动，重新跑一次 `wrangler deploy` 即可。

**Q：Windows 壁纸卡片一直显示"暂无备忘录"或红色圆点？**
A：先在浏览器直接打开你的 `.../api/widget.json`，看有没有数据返回。
有数据就检查 Lively 里填的网址对不对（注意是 `/widget` 不是 `/api/widget`）；
没数据就回到第二步确认后端部署成功、且数据库里确实有备忘录。

**Q：Android 小组件空白？**
A：99% 是第 4 步的 `WIDGET_API_URL` 没改或改错。检查那一行地址，结尾必须是 `/api/widget`。

**Q：改了备忘录，小组件多久更新？**
A：Windows 端默认 5 秒（可用 `rate` 参数调）；Android 端默认每小时，或手动点刷新按钮立即更新。

**Q：流量/费用会很贵吗？**
A：Cloudflare Worker 免费额度是每天 10 万次请求。Windows 端 5 秒一次约每天 1.7 万次，
单人使用完全够。想更省可以把 `rate` 调大（如 `rate=30`）。

---

## 项目文件结构

```
memo-app/
├─ worker.js          后端 + 网页 + /widget 壁纸页面（单文件）
├─ wrangler.toml      Cloudflare 部署配置（数据库绑定）
├─ README.md          本文档
└─ android/           Android 小组件源码（拷进 Android Studio 项目用）
   └─ app/
      ├─ build.gradle.snippet.kts   依赖参考片段
      └─ src/main/
         ├─ AndroidManifest.xml     权限 + 组件声明（需合并）
         ├─ java/com/example/memowidget/   4 个 Kotlin 源文件
         └─ res/                     布局、图标、配置等资源
```
