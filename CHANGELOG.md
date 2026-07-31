# Changelog

本檔案記錄 `notecraftapp` 這個 npm 套件的所有重要變更。

格式依循 [Keep a Changelog 1.1.0](https://keepachangelog.com/zh-TW/1.1.0/)，版號依循 [Semantic Versioning](https://semver.org/lang/zh-TW/)。

## [未發布]

---

## [0.3.0] - 2026-07-31

把一篇筆記一鍵轉成 16:9 多頁簡報。這是 0.2.4 之後累積三週的成果，也是套件第一次帶簡報功能。

### 新增

- **筆記轉簡報（Note → Presentation）** —— 路由 `/present/<slug>`，含檢視模式（縮覽 + 當前頁）與播放模式（Fullscreen、鍵盤 ←/→/Esc 導覽、大綱跳頁）。筆記既有的 `@ai-visualize` 互動元件原樣嵌入，播放時仍可操作
- **`content-present` Skill 與 `present-planner` / `slide-generator` 兩個 Subagent** —— 由 `init-skill` 一併安裝，與既有 `@ai-visualize` 管線完全隔離
- **deck 原子層**（`src/components/deck/`）—— 字級階梯 `scale.ts`、內容頁強制外框 `SlideChrome`（含可用區計算）、6 個 block 元件（Rows / Cards / Stages / Kpi / Table / Compare）、`FitToArea`（把比投影片高的既有元件等比縮入）、`IconName` → lucide 查表
- **dev-only 溢出偵測** —— 投影片是 1600×900 固定座標系、`overflow: hidden`，內容溢出不會報錯只會被裁掉；超出時畫紅框並在 console 印出頁碼
- **Dashboard「已生成簡報」統計**，以及筆記頁功能列的「簡報」入口與 dev-only「生成簡報」按鈕

### 變更

- **版型從 8 種收斂為 6 種**：保留 `cover` / `section` / `quote` / `closing` / `full-visual`（結構固定、不需要創意），內容頁改為 **`custom` 自由頁**（可自由排版，但只能組合原子層）
- **識別色與狀態色分離**：`Tone` 拆成 `SeriesTone`（blue / orange / muted）與 `StatusTone`（good / warning / critical，一律附 icon + 文字標籤）
- **`init-skill` 現在安裝 3 個 Skill + 6 個 Subagent**（原為 `content-visualize` + 4 個 Subagent；`trendlink-design` 自 0.2.4 起、簡報管線自本版起）
- 「生成簡報」按鈕的提示詞**不再列舉版型、不再寫死輸出路徑**，改由 Skill 定義 —— 避免每次改制都要同步一份清單

### 移除

- 版型 `bullets`、`media`、`compare` 退役 —— 前兩者由 `custom` 取代，`compare` 降級為 block 元件

### 修正

- **`files` 白名單補上 `src/components/deck/`** —— 否則發佈出去的套件缺少全部簡報渲染元件，使用者一跑 `npx notecraftapp` 就會因找不到模組而 build 失敗
- 中文檔名筆記的簡報判定與路由失效（CJK slug 以 NFC 正規化）
- 狀態色在暗色投影片上不可讀 —— 補上 status 的暗色 300 階與 `--warning-700`（原本 `danger-500` 在暗底僅 3.11:1、`warning-500` 在白底僅 2.26:1）

---

## [0.2.4] - 2026-07-10

### 新增

- `trendlink-design` 設計系統納入 `skill-template`，隨 `init-skill` 一併安裝

---

## [0.2.3] - 2026-07-10

### 修正

- 修正三個阻擋 viewer 端對端跑通的 bug

---

## [0.2.2] - 2026-07-10

### 變更

- README 補上 `init-skill` 與 `serve --watch` 說明，v2 特性從 roadmap 移到已完成

> `0.2.1` 曾 bump 版號但未成功發佈到 npm，故無對應條目。

---

## [0.2.0] - 2026-07-10

AI 視覺化管線正式可用的一版。

### 新增

- **`notecraftapp init-skill`** —— 一鍵把 `content-visualize` Skill 與 4 個 Subagent 設定安裝到當前專案的 `.claude/`，含版本比對（`--check`）與衝突處理（`--force` / 互動 prompt）
- **背景 rebuild + SSE auto reload**（`serve` 預設開啟）—— chokidar 監看檔案變動、debounce 後 `astro build` 到暫存目錄再原子交換，rebuild 失敗保留舊 dist；瀏覽器經 SSE 自動 reload
- 外部 `.notecraft/components/*.tsx` 透過 `@notes/*` alias 被 `astro build` 解析
- 元件 import 白名單集中管理 —— `component-generator` 產出前先 lint，白名單外套件走「徵詢作者」路徑，不會直接撞 build

---

## [0.1.1] – [0.1.3] - 2026-07-09

> 這三個 patch 於同日連續發佈，逐版對應關係已無法從紀錄還原，故合併記述。

### 修正

- 系列設定改為兩個位置都接受：`<notesDir>/.notecraft/series.json` 與 `<專案根>/.notecraft/series.json`
- `series.json` 的 slug 寬容化 —— `.md` / `.mdx` 副檔名、開頭的 `./`、多餘的 `/` 都對到同一筆
- 筆記之間的 `.md` / `.mdx` 內連結重寫為 `/notes/<slug>`，不再 404

---

## [0.1.0] - 2026-07-09

首次發佈到 npm。把原本只能在自己 repo 跑的 Astro 筆記站，變成一行 `npx` 就能開在任何 md/mdx 資料夾上的工具。

### 新增

- **CLI 三個子命令** —— `view`（Astro dev，HMR + 可寫入）、`build`（產靜態站，含快取失效偵測）、`serve`（Node 靜態伺服器）
- 遷移到 Astro **Content Layer**，支援指向外部資料夾的筆記
- **frontmatter 全 optional** —— 缺欄位自動 fallback（標題取 H1 或檔名、描述取首段、日期取檔案 mtime）
- **巢狀資料夾** slug 保留階層（`guides/oauth/flow.mdx` → `/notes/guides/oauth/flow`）
- **MDX 相對圖片路徑**自動解析為 `/notes-assets/*`
- 寫入 API 的路徑安全 —— 只綁 `127.0.0.1`、`path.resolve` + prefix 檢查 + symlink 防護

---

> **0.1.0 之前**：2026-06-12 起本專案是一個純自用的 Astro + MDX 筆記站，AI 視覺化管線、系列與閱讀進度、Markdown 擴充語法（Admonitions / Tabs / Tooltips / Badge / Steps）、程式碼區塊增強等功能都在那個階段完成，尚未套件化，故不列入本檔。完整脈絡見 [docs/notecraft-prd.md](./docs/notecraft-prd.md) 的 Change Log 一節。

[未發布]: https://github.com/SteveLin100132/notecraft/compare/main...HEAD
[0.3.0]: https://www.npmjs.com/package/notecraftapp/v/0.3.0
[0.2.4]: https://www.npmjs.com/package/notecraftapp/v/0.2.4
[0.2.3]: https://www.npmjs.com/package/notecraftapp/v/0.2.3
[0.2.2]: https://www.npmjs.com/package/notecraftapp/v/0.2.2
[0.2.0]: https://www.npmjs.com/package/notecraftapp/v/0.2.0
[0.1.0]: https://www.npmjs.com/package/notecraftapp/v/0.1.0
