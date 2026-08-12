# Changelog

本檔案記錄 `notecraftapp` 這個 npm 套件的所有重要變更。

格式依循 [Keep a Changelog 1.1.0](https://keepachangelog.com/zh-TW/1.1.0/)，版號依循 [Semantic Versioning](https://semver.org/lang/zh-TW/)。

## [未發布]

---

## [0.5.0] - 2026-08-12

生成元件是為**內文欄寬**（約 720px）設計的，但並排雙欄結構圖、RACI 矩陣、寬表格在那個寬度下會被擠壓、橫向溢出，或退化成小框裡的橫向捲動。這一版給每個元件一個放大入口——把它搬進全螢幕的可拖曳縮放畫布來讀。

畫布不是新做的：它就是 0.4.0 簡報 `full-visual` 版型那塊 `CanvasViewport`。當初它解的是「1600×900 固定座標系會裁掉高元件」，而筆記內文碰到的是同一個問題的另一面，所以這一版只是幫它多接一個呼叫端，元件本身零改動。

### 新增

- **生成元件放大檢視（Viz Zoom）** —— 每個 AI 生成內容外框卡片的標題列最右側常駐「放大檢視」鈕，點下去進入 full-bleed 覆蓋層（不是 modal，四周不留背景）：64px 標題列 / 可拖曳平移、可縮放的畫布 / 說明列。畫布尺寸由視窗扣掉標題列與說明列**實測**高度推導，`resize` 時重算
  - **元件互動完整保留** —— 該點的照樣能點、該拖的照樣能拖；指標在元件內容上時事件交給元件，不會誤觸畫布平移（按 ⌥ 才從元件上起手拖曳）
  - 純滾輪即縮放、拖曳空白處平移、雙擊空白處還原置中、指標在畫布上時 `+` / `−` / `0` 生效
  - **Esc 關閉**（capture 階段攔截，不會被簡報 / modal 的 Esc handler 搶走）；開啟時鎖捲動、關閉時還原原本的 `overflow` 值
- **匯出 PNG** —— 覆蓋層標題列可將元件匯出為 `<id>.png`：以離屏乾淨副本為來源，因此是 **100% 原尺寸、白底、2x**，**不受當下縮放與平移影響**。`html-to-image` 走動態 import，只在首次匯出時載入、不進 initial bundle

### 變更

- Toast 的 z-index 由 700 提到 950 —— 讓提示能蓋過放大檢視覆蓋層（900）與簡報播放（800）。先前簡報模式發出的提示同樣會被自己的底色擋住，一併修掉
- `GeneratedFrame` 的元件本體多包一層 `data-nc-viz-body` 標記容器（放大檢視靠它找到要搬移的節點）；外框的視覺與既有互動不變

---

## [0.4.0] - 2026-08-02

簡報的品質瓶頸不在提示詞，在**版型存量**。這一版把原子層從 14 個補到 29 個，並把內容頁的預設從「AI 每頁重新設計版面」改成「AI 挑一個設計好的原子、把資料填進去」。

### 新增

- **15 個整頁級原子**（`src/components/deck/blocks/`）—— 預期獨佔內容區、一頁一個：
  - 論證與收斂：`<Summary>` 開場濃縮、`<Triad>` 主張加三支柱、`<Decision>` 決策記錄、`<Cross>` 兩面向交叉推論
  - 定位與取捨：`<Quadrant>` 兩軸四象限、`<Spectrum>` 一維取捨光譜、`<Heatmap>` 單色階強度矩陣
  - 結構與關係：`<Layers>` 分層堆疊、`<Roster>` 中心與周邊角色、`<Contents>` 章節導覽
  - 量化：`<Waterfall>` 累計拆解、`<Share>` 分段佔比條、`<Ranking>` 排序榜、`<BeforeAfter>` 量化前後對比、`<Risk>` 風險研判
- **可查詢的原子目錄** `.claude/skills/content-present/references/atoms.md` —— 29 個原子的選型判準、必填欄位、容量上限，以及「內容型態 → 用哪個」速查表。`present-planner` 規劃前必讀，選型從憑印象改為查表
- `<Compare>` 與 `<Kpi>` 補上 `/present/atoms` 驗證頁 —— 這兩個自 0.3.0 起就缺，而該 deck 的規範是「每個原子至少一頁」

### 變更

- **內容頁的預設從「自由排版」改為「選頁填字」** —— 挑一個整頁級原子填資料是第 1 級，組合級並排是第 2 級，自己寫 JSX 降為第 3 級且須寫明理由
- **同一份 deck 內整頁級原子不得重複** —— 頁頁不同由規則保證，不靠運氣。15 個足夠撐起 10–14 頁
- 自己寫版面新增一條正當理由：**內容有強烈的固有幾何形狀**（形狀本身就是論點的一部分，拆進通用原子會弄丟它）。選頁填字保證的是下限、不是上限
- `content-present` skill 版本 `1.0.0-alpha.1` → `1.1.0-alpha.1`；`present-planner` / `slide-generator` 兩個 subagent 同步改寫
- 密度基準改寫：內容頁「2–3 個區塊」→「通常 1 個」，密度改由原子的項數承載
- few-shot 首選改為 `atoms.deck.tsx`（29 個原子每個至少一頁，抄欄位比猜 props 可靠）

### 修正

- **`sync-skill-template.mjs` 在 Windows 上排除清單完全失效** —— `path.relative` 回傳反斜線、`TRENDLINK_EXCLUDES` 寫正斜線，`ui_kits/dutymate` 這種帶目錄的 entry 比不中。在 Windows 跑一次 `sync-skill` 就會把 47 個未公開的 Duty Mate 素材（約 1.3 MB）複製進要發布的 `skill-template/`。比對前先把路徑正規化成正斜線
- **`sync-skill-template.mjs` 現在會同步 skill 的 `references/` 目錄** —— 先前只複製 `SKILL.md`，viewer 版會拿到一份指向不存在的 `atoms.md` 的說明
- `<Spectrum>` 兩端的標記卡改為位移量跟著 `at` 走 —— 固定 `translateX(-50%)` 會讓 `at=0`/`at=1` 的卡各突出半個卡寬，與其他頁的左右邊界對不齊（未溢出，但視覺不齊）

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
[0.5.0]: https://www.npmjs.com/package/notecraftapp/v/0.5.0
[0.4.0]: https://www.npmjs.com/package/notecraftapp/v/0.4.0
[0.3.0]: https://www.npmjs.com/package/notecraftapp/v/0.3.0
[0.2.4]: https://www.npmjs.com/package/notecraftapp/v/0.2.4
[0.2.3]: https://www.npmjs.com/package/notecraftapp/v/0.2.3
[0.2.2]: https://www.npmjs.com/package/notecraftapp/v/0.2.2
[0.2.0]: https://www.npmjs.com/package/notecraftapp/v/0.2.0
[0.1.0]: https://www.npmjs.com/package/notecraftapp/v/0.1.0
