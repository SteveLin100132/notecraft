# Changelog

本檔案記錄 `notecraftapp` 這個 npm 套件的所有重要變更。

格式依循 [Keep a Changelog 1.1.0](https://keepachangelog.com/zh-TW/1.1.0/)，版號依循 [Semantic Versioning](https://semver.org/lang/zh-TW/)。

## [1.1.1] - 2026-09-22

### 移除

- 資料檔頁（`/view/<路徑>`）底部的閱讀狀態、「已標記為完成」提示與系列導覽卡（上一章／下一章），頁面只渲染資料檔本身；屬於系列時仍在頁首以 pill 標示、可連到系列頁。資料檔章節因此不再自動標為「閱讀中」，也無法在此頁標記完成

## [1.1.0] - 2026-09-22

**筆記目錄支援 H1–H3 三層**。設計見 `docs/prototype/design_handoff_note_toc/`。

### 新增

- 筆記頁右側目錄從只列 H2 擴充為 H1 › H2 › H3 三層樹：依文件順序建樹、允許跳層；層級取相對深度，只有 H2／H3 的筆記外觀與改版前一致
- 目錄的目前位置之外，其所有上層標題同步標示（藍字 600）；H2 前置圓點、H3 前置短橫線
- 目錄標頭顯示各層數量（如 `H1×4 · H2×9 · H3×5`）
- 目錄過長時限高 `100vh − 120px` 並自己捲動，不撐開頁面
- 範例筆記 `http-caching`（4 章／9 節／5 小節）供目錄驗收

### 變更

- 內文 `# ` 標題改為「章」樣式：品牌藍、底線、上方 48px（內文第一個元素即為章標題時縮為 8px）。既有筆記開頭的單一 `# ` 會因此以章標題呈現，並成為目錄頂層
- 目錄的捲動偵測與點擊跳轉改為自動尋找最近的捲動容器（找不到退回 `window`），不再寫死 `#nc-scroll`；偵測以 `requestAnimationFrame` 節流；`prefers-reduced-motion` 時跳轉不做平滑捲動

### 修正

- 窄版（主區 < 900px）目錄面板點標頭展不開：展開讓頁面變高，觸發 ResizeObserver 又把面板收回
- 窄版點目錄項目會捲過頭：跳轉位置在面板收合前就計算，收合後內文上移約一個面板高

## [1.0.1] - 2026-09-22

### 變更

- 筆記頁內文改為滿版，撐到目錄欄左緣（原本內文欄與 `.nc-prose` 各自限寬 760px，寬螢幕時與目錄之間空出一段）；資料檔頁（`PluginView`）的 `.nc-prose` 仍維持 760px

## [1.0.0] - 2026-09-22

**Workbench 工作台** —— 外殼整個換掉：Rail 52 + 檔案樹 Sidebar 240 + 壓縮頁首／工具列／內容，整頁不捲動。
所有列表頁共用同一套資料列語彙。這是自 v0.1 以來最大的一次改版，殼與每個列表頁都重寫，因此直接進 **1.0.0**。設計見 `docs/notecraft-workbench.md`，像素級規格在 `docs/prototype/design_handoff_workbench/`。

### 新增

- **三欄工作台殼**：Sidebar 是不限層數的真實資料夾樹（viewer 使用者的 `My Notes/Deep Dir/` 原名顯示，不會被 slug 化）、系列進度、Plugin 資料檔、標籤；展開狀態與捲動位置跨頁保留
- **`/notes` 四種 view**：List（依資料夾／系列／標籤／月份分組）、Board（三欄，拖曳改閱讀狀態）、Table、Timeline；篩選全在網址（`?folder=`、`?series=`、`?tag=`、`?pending=1`、`?hasAi=1`、`?nofm=1`、`?fav=1`、`?view=`），舊的 `?tag=` 連結照常
- **Drawer 預覽**：單擊列開右側預覽（摘要、Metadata、標記、同系列章節），雙擊或列尾常駐的「開啟」圖示進筆記；`⌘`+點擊、中鍵開新分頁
- **`⌘K` 指令面板**：每一頁都能開，筆記／系列／標籤／資料檔 + pagefind 全文；索引第一次開啟才載入
- **Dashboard widget grid** + 總覽／本週／AI 佇列三個 Tab；近 7 日、近 30 日、近 8 週在瀏覽器以當地時區計算，不再是 build 當下的值
- **`/plugins`**：資料檔依資料夾分組、已安裝外掛列表與 Plugin Drawer（manifest、映射規則、命中檔、options、外掛檔案）；`/plugins/folder/<dir>`
- **Plugin 啟用／停用**：`plugins.json` 頂層 `disabled` 陣列；dev 下 `PUT /api/plugins/:id` 與列上的 Switch（只動 `disabled` 鍵、保留作者排版）；停用的 plugin 其規則等同不存在，壞掉的 plugin 先停用站仍 build 得出來
- **`/settings`**：預設 view、List 預設分組（存 `nc-workbench-prefs-v1`）；「關於」顯示工作區與版本
- **`meta.backTo`** 正式成為 app 層約定：只接受站內路徑，`https:`／`javascript:`／`//host` 一律忽略並 warn
- 筆記頁首接手標題與動作：簡報、收藏星號、dev 的「⋯」選單（VS Code、重新生成提示、刪除）；標題最多兩行
- 三段響應式（桌面／平板抽屜／手機底部 Tab bar）與無障礙底線：skip link、地標、`Escape` 關閉順序、reduced motion、pill 對比 ≥ 4.5:1
- `GET /api/folders` 改為遞迴列出所有層；`DELETE /api/notes/:slug` 補進文件

### 移除

- 筆記列表的多標籤同時篩選與排序欄位切換（單一標籤改由 `?tag=` 承接；排序固定更新日倒序，Table 除外）
- `/notes` 不再混排資料檔（入口改為 Rail 的 Plugin、Sidebar、`/plugins`、系列頁與 `⌘K`）；系列這條線仍完整混合顯示
- `/about` 與 `/view` 列表頁（靜態轉址到 `/settings?tab=about` 與 `/plugins`；`/view/<路徑>` 渲染頁不變）
- Dashboard 的「已生成簡報」統計與以建立日計的「本週／本月新增」
- 舊側邊欄的「細條」模式（`nc:sidebar`）

### 修正

- viewer 模式下筆記頁尾與「複製生成提示」的路徑原本是一長串 `../…` 或寫死的 `src/content/notes/<slug>.mdx`，改為相對 notesDir／專案根的真實路徑
- `daysAgo()` 預設基準日原本取 UTC，台灣時間早上八點前「今天」會算成昨天
- 「待開始」統一為「未開始」

### 變更

- **er-diagram-renderer v1.1.0**：版面由橫向捲軸改為**可縮放平移的無限畫布**。
  捲軸只能左右看、看不到全貌；要「先縮小看整體、再放大看局部」就得是畫布。
  拖曳平移、⌘/Ctrl＋滾輪縮放（以指標為錨點）、雙擊空白處還原。開啟時自動 fit **寬度**而非整張圖：這種版面往下長，用寬高都塞得下的倍率去 fit 會被高度壓到只剩兩成、一個字都讀不到。
  單純滾輪一律放行給頁面捲動 —— 頁面底下還有系列導覽，畫布把滾輪吃掉的話人就出不去了。
  新增 `options.canvasHeight` 可指定畫布高度。

---

## [0.6.0] - 2026-09-18

**Plugin System** —— 讓專案裡的結構化 JSON 資料檔，被一個可安裝的渲染器畫成頁面。

起因是一支 751 行的 ER Diagram 元件，其中 48 KB 是寫死的表定義：那 600 行渲染邏輯對任何一份
資料庫 schema 都通用，卻和某個專案的 36 張表焊死在同一個檔案裡。換一個專案要畫 ER 圖，
只能整份 copy 再改資料。

### 新增

- **`.notecraft/plugins.json`** —— 一份映射說明「哪些檔案由哪個 plugin 渲染」，`files` 支援
  `**/*.json` 萬用比對。沒有這個檔，整個功能零成本停用。
- **`/view/<path>` 資料檔檢視頁** —— 滿版版型（不套 1120 版心），sticky 頁首帶原始檔路徑、
  渲染它的 plugin 與更新時間。
- **側邊欄新增「資料 Data」** 與資料檔清單頁 `/view`；裝兩個以上 plugin 時才出現篩選列。
- **`/notes` 列表混排** —— 資料檔與筆記同節奏、橘系 Database icon 與 mono 路徑列可一眼分辨；
  套用標籤篩選時退出列表（它們沒有標籤）。
- **系列的一章可以是資料檔頁** —— `series.json` 的 `slugs` 混放 `view:<path>` 與筆記 slug，
  一視同仁：有序號、計入進度分母、可標記為已完成。
- **MDX 內嵌 `<PluginView src="..." />`** —— 沿用 `GeneratedFrame` 外框與放大檢視，只換標示。
- **`notecraftapp install-plugin`** —— 不帶參數列出官方 store；支援 `owner/repo`、子目錄、
  `#tag` 與本地路徑。安裝前一律確認，並擋下白名單外的 import、`dangerouslySetInnerHTML`、
  可執行檔與路徑逃脫。`--list` / `--remove` / `--apply` / `--as` / `--force` / `--yes`。
- **官方 plugin store**（repo 的 `plugins/`）與第一個 plugin **er-diagram-renderer**，
  含轉檔腳本 `scripts/er-schema-from-tsx.mjs`。
- **`npm run check-plugins`** —— 驗證 manifest、registry 無漂移、example 通過自己的 schema，
  並實際配 example 資料 build 一次。`prepublishOnly` 會跑它。

### 變更

- 系列的章節識別碼從「筆記 slug」放寬為 slug 或 `view:<路徑>`；閱讀進度的 localStorage key
  一律用未經轉換的識別碼原字串，避免筆記與資料檔撞 key。
- 系列相關文案的量詞由「篇」改為「章」（一章可以不是文章之後，「篇」就是錯字）。
- `GeneratedFrame` 與 `VizZoom` 支援自訂標示；預設行為與既有 AI 生成元件完全相同。
- 新增依賴：`picomatch`（glob 比對）、`ajv`（資料驗證，同時讓資料檔能用 `$schema` 取得
  編輯器補全）。

### 修正

- `series.json` 裡對不到的章節識別碼，警示訊息現在會區分「找不到筆記」「找不到資料檔」
  與「檔案存在但沒有 plugin 認領」——三者要修的東西完全不同。

---

## [0.5.1] - 2026-08-12

放大檢視對**寬型元件**沒有發揮作用——這一版把紙張寬度從寫死的 880px 改為依視窗計算。

原本的問題出在「放大」只是對舞台套 CSS `transform: scale()`，而 CSS transform **不改變版面寬度**：紙張固定 880px，響應式元件在放大檢視裡量到的父層寬度就永遠是 880，只排得出跟內文差不多的欄數，被迫往下堆成又窄又高的形狀。而 fit 取寬、高兩個比例的較小者，於是高度成為瓶頸，整張圖反而縮得比不放大還小——與這個功能的目的完全相反。

### 修正

- **紙張寬度改為依畫布可用寬度計算**（`clamp(可用寬度 - 96, 880, 1600)`）—— 響應式的寬元件（ER Diagram、寬表格、多欄矩陣）終於能在放大檢視裡攤開成又寬又矮的形狀，貼合橫向的視窗。下限 880 保證窄視窗不比先前差；上限 1600 避免超寬螢幕把為 720px 內文設計的元件拉到行寬過長。紙張寬度變動後，`CanvasViewport` 既有的 `ResizeObserver` 會自行重算 fit，不需手動還原

### 變更

- **匯出 PNG 的離屏副本改為固定 1600px 寬**，不再沿用紙張寬度 —— 兩者若共用同一個值，響應式元件會依寬度重排，同一張圖在 27 吋螢幕與筆電匯出的 PNG 會不一樣寬。匯出結果因此**跨螢幕可重現**，代價是可能與當下畫面差一個斷點。⚠️ 對照 0.5.0，匯出寬度由 880 變為 1600，同一元件重新匯出的圖會比舊版寬
- `VizZoom` 的 `natural` prop 拿掉預設值：有傳就照傳的用、沒傳才動態計算。目前 `GeneratedFrame` 不傳，保留為之後讓單張圖宣告偏好寬度的逃生口

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
[0.5.1]: https://www.npmjs.com/package/notecraftapp/v/0.5.1
[0.5.0]: https://www.npmjs.com/package/notecraftapp/v/0.5.0
[0.4.0]: https://www.npmjs.com/package/notecraftapp/v/0.4.0
[0.3.0]: https://www.npmjs.com/package/notecraftapp/v/0.3.0
[0.2.4]: https://www.npmjs.com/package/notecraftapp/v/0.2.4
[0.2.3]: https://www.npmjs.com/package/notecraftapp/v/0.2.3
[0.2.2]: https://www.npmjs.com/package/notecraftapp/v/0.2.2
[0.2.0]: https://www.npmjs.com/package/notecraftapp/v/0.2.0
[0.1.0]: https://www.npmjs.com/package/notecraftapp/v/0.1.0
