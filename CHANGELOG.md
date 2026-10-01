# Changelog

本檔案記錄 `notecraftapp` 這個 npm 套件的所有重要變更。

格式依循 [Keep a Changelog 1.1.0](https://keepachangelog.com/zh-TW/1.1.0/)，版號依循 [Semantic Versioning](https://semver.org/lang/zh-TW/)。

## [1.7.0] - 2026-10-01

### 新增

- 工作台的**筆記頁籤**（設計文件 `docs/notecraft-workbench-note-tabs.md`）：主區最上方一條頁籤列，開過的筆記與資料檔頁會留下頁籤，不用回列表或側欄重找。可固定、拖曳排序（滑鼠裝置）、中鍵關閉；右鍵選單有關閉其他／關閉右側／全部關閉、固定、複製連結、在新視窗開啟；右側「全部頁籤」可篩選並重開剛關閉的
- 切回頁籤時回到上次的捲動位置（網址帶 `#標題` 時以標題為準）
- 鍵盤：`⌥.`／`⌥,` 切換頁籤、`⌥W` 關閉、`⌥⇧T` 重開剛關閉的；頁籤列本身可用方向鍵、`Home`／`End`、`Delete` 操作
- 未固定頁籤上限 20 個，超過時自動關閉最久沒看的那個並提示
- ⌘K 指令面板最上方新增「已開啟的頁籤」
- 手機改為 Header 右上角的頁籤計數鈕，點開是底部抽屜

### 變更

- 平板寬度的側欄開關按鈕下移到 Header 區，讓位給頁籤列
- dev 環境刪除筆記時一併關閉它的頁籤

### 內部

- 新增 `src/lib/wb-tabs.ts`（頁籤清單純函式）、`src/lib/wb-tabs-store.ts`（localStorage，key 依工作區分開）、`src/lib/toast.ts`（ToastHost 掛載前的提示佇列）；`check:wb` 串上 `scripts/checks/wb-tabs.mjs`
- `WorkbenchLayout` 新 prop `tab`：筆記頁與資料檔頁以它宣告自己是頁籤

## [1.6.0] - 2026-10-01

### 新增

- 新的官方 plugin **`openapi-renderer`**（1.0.0，設計文件 `docs/notecraft-openapi-renderer.md`）：把筆記資料夾內的 OpenAPI 3.0／3.1 文件（JSON）渲染成 API 文件 —— tag → operation 導覽（文字與 method 篩選）、總覽／Tag／Operation／Schema 四種頁面、參數表與欄位樹（`$ref`、循環參照、`oneOf`／`anyOf`／`allOf`、超過三層「深入」）、範例 JSON 與 cURL／fetch、可分享的深連結（`#op/…`、`#schema/…`）。3.2 以 3.1 規則盡力渲染並警示，Swagger 2.0 顯示轉檔指引。安裝：`npx notecraftapp install-plugin openapi-renderer`
- plugin manifest 新增選填的 `meta`：以 JSON Pointer 指定資料檔的標題／描述／「回到來源筆記」從哪裡取（例：OpenAPI 的 `/info/title`），省略時沿用資料檔的 `meta.*`
- `<PluginView>` 新增 `options`（只影響這一處內嵌，例：指定要顯示哪一支 operation）與 `anchor`（「開啟完整檢視頁」連結附帶的 hash）

### 修正

- 筆記內嵌資料檔時，外框的「資料檔 · <plugin 名稱>」膠囊在窄寬度下不再斷成多行

### 內部

- 新增 `src/lib/plugin-meta.ts`（JSON Pointer 取值）與 `scripts/checks/app-plugin-meta.mjs`；`npm run check:oar` 跑 OpenAPI plugin 的推導、範例、Markdown 對照與樣式斷言
- 規模測試用的 OpenAPI 產生器 `scripts/fixtures/oar-large-spec.mjs`（20 個 tag、280 支 operation）

## [1.5.1] - 2026-09-30

### 變更

- 儀表板「更新日誌」卡片與「AI 佇列」分頁沒有資料時，改為插圖式空狀態（插圖＋標題＋說明；設計文件 `docs/notecraft-workbench-empty-states.md`），取代原本的單行灰字
- 更新日誌依情境顯示三種文案：本週沒有更新、過去某週沒有更新、選了沒有更新的日期（整週有更新時）；空狀態不出現捲軸，視窗較矮時插圖自動縮小
- AI 佇列清空時顯示「AI 佇列已清空」與「前往筆記」連結

### 內部

- 新增 `src/components/wb/EmptyState.tsx`；插圖顏色全走既有 `--wb-*` token，不新增 token

## [1.5.0] - 2026-09-30

### 變更

- 儀表板的「本週」Tab 改為「更新月曆」（設計文件 `docs/notecraft-workbench-calendar.md`）：每篇筆記依更新日落在日期格，顏色即閱讀狀態（與總覽寫作頻率同一組配色）。**月檢視**每篇一顆色塊、整月一屏不捲動；**週檢視**每篇一張卡片（狀態、標題、系列、標籤、AI 已生成／總數），筆記多時只有該格內捲。‹ › 翻月／翻週、「本週」回今天、三段圖例計數、週／月切換
- 點色塊或卡片開既有的筆記 Drawer、雙擊開啟；週卡片有常駐「開啟」連結，鍵盤語意與筆記列表相同
- 月曆用**日曆週（週日→週六）**；總覽「本週更新」與更新日誌仍是滾動 7 天，兩者數字可以不同
- 網址 `?tab=calendar`；舊的 `?tab=week` 仍可用、視同月曆

### 移除

- 儀表板「本週」Tab 的近 7 日筆記列表（資訊仍在總覽的「更新日誌」）

### 內部

- 新增 `src/lib/wb-calendar.ts`（月格／日曆週／翻頁／標題的純函式）與 `scripts/checks/wb-calendar.mjs`；`npm run check:wb` 一併跑
- `workbench.css` 新增 `--wb-cal-*` 四個底色與 `--wb-a-blue-12`；月曆規則放在 860px 媒體規則之前

## [1.4.1] - 2026-09-29

### 修正

- 儀表板「更新日誌」卡片裡的系列圖示比系列標題低、不在同一水平：改為與同列其他欄一樣垂直置中，長標題的省略號行為不變

## [1.4.0] - 2026-09-29

### 變更

- 儀表板「總覽」整頁改版（設計文件 `docs/notecraft-workbench-dashboard.md`）：上列三張 KPI 卡（筆記總數與本週更新各附依閱讀狀態分段的環形圖、AI 待生成）加寫作頻率堆疊長條（8／12／16 週切換），下列三欄等高的「最近更新」時間軸、「系列」（最多 3 個、一鍵開始／繼續閱讀）＋「標籤分布」馬賽克（treemap，點方塊即篩選）、「更新日誌」（週導覽、按日篩選）。整頁填滿一個視窗高度、清單在卡片內捲動；≤980px 改為整頁捲動、≤680px 單欄
- 時間軸節點與日誌卡片單擊開 Drawer、雙擊開啟，列尾有常駐「開啟」連結，鍵盤語意與筆記列表相同
- 「本週」「AI 佇列」兩個 Tab 不變

### 移除

- 總覽的「AI 視覺化生成率」百分比卡與「待生成 @ai-visualize 標記」widget（資訊改由「AI 待生成」卡與「AI 佇列」Tab 提供）
- 總覽的「近 30 日更新」數字

### 內部

- 新增 `npm run check:wb`：treemap 面積守恆／不重疊／成比例、週窗與分格一致的斷言（`scripts/checks/wb-dashboard.mjs`，`check-plugins` 會一併跑）
- `weekBuckets()` 的 label 改為該週結束日；新增 `weekOf()`、`weekWindow()`、`mdShort()`

## [1.3.0] - 2026-09-27

### 新增

- 資料檔的 `meta.description` 允許 Markdown。app 用到它的地方 —— `/view` 頁的 `<meta name="description">` 與 Toolbar 說明、`/wb-index.json`、系列章節 —— 一律去除標記、只取第一段純文字；`/view` 頁另以隱藏元素把全文純文字交給 pagefind 索引（顯示第一段、索引全文）。原本就是純文字的描述，輸出與先前逐字相同。原文仍在 `data.meta.description` 給 plugin 使用
- `npm run check-plugins` 會驗證並 build plugin `example/` 底下的所有 `.json`（不再只有 `manifest.example`），並串接 `scripts/checks/*.mjs` 的純函式斷言（以 Node 22.6+ 原生 strip-types 直接載入 `.ts`，不引入 test runner）；新增 `npm run check:er`

### 變更

- 資料檔渲染頁（`/view/*`）改為滿版：渲染區不再留 padding，由 plugin 自行決定內距

### 修正

- `astro dev` 下改動資料檔或 `plugins.json` 後，重新編譯 plugin 的 dataSchema 丟出「schema with key or id … already exists」導致整站 500：清快取時一併清掉 Ajv 已註冊的 schema

## [1.2.3] - 2026-09-26

### 修正

- Windows 上筆記專案與 viewer app（`~/.notecraft/app-<version>/`）位於不同磁碟時，plugin 渲染器與簡報無法載入：`/plugins`、`/settings`、`/view/*`、MDX 內的 `<PluginView>` 與 `/present/<slug>` 失敗並丟 `Could not import ../../../D:/...`，筆記工具列也因此一律顯示「生成簡報」。成因是 `import.meta.glob("@notes/...")` 解析到 Vite root 以外時，以 importer 的相對路徑產生 specifier，跨磁碟時得到 `../../X:/...` 這種不存在的路徑；`src/lib/vite-cross-drive-content.ts` 新增 `resolveId` 把它還原成磁碟機絕對路徑。同磁碟與 macOS／Linux 不會產生這種 id，行為不變

## [1.2.2] - 2026-09-25

### 修正

- viewer 模式下 AI 生成元件、plugin 渲染器與筆記 MDX 內的 Tailwind class 失效：`tailwind.config.mjs` 的 `content` 只掃 app 的 `src/`，使用者專案的 `.notecraft/components/`、`.notecraft/plugins/` 與筆記資料夾都不在範圍，只有剛好在 `src/` 也用過的 class 才會進 CSS（`grid-cols-7`、`bg-[#1F4E8C]` 這類則沒有）。現在依 `NOTECRAFT_USER_CWD`／`NOTECRAFT_NOTES_DIR` 一併掃描，位置判斷與 `@notes` alias 一致；`view` 下改元件新增的 class 也會即時生效。主專案（未設這兩個環境變數）行為不變

## [1.2.1] - 2026-09-25

**Windows 支援修正**。

### 修正

- 筆記與 viewer app（`~/.notecraft/app-<version>/`）位於不同磁碟時（如筆記在 `D:`），`build`／`serve`／`view` 失敗並丟 `[commonjs--resolver] The URL must be of scheme file`。成因是 Astro 以 `path.relative` 記錄 content entry 路徑、跨磁碟時得到 `d:/...` 被當成 URL scheme；新增 `src/lib/vite-cross-drive-content.ts` 在 Astro 解析前改寫為 `file:///` URL
- Windows 首次執行時 `npm install` 必定失敗（`spawnSync("npm")` 找不到 `npm.cmd`）；改為在 Windows 經 shell 執行。安裝失敗時一併移除半成品目錄，避免下次執行跳過安裝、帶著缺相依的 app 啟動
- Windows 上 `serve` 自動開啟瀏覽器時崩潰（`spawn("start")` ENOENT，`start` 是 cmd 內建指令）；改走 `cmd /c start`，且開啟失敗只印提示、不再讓 server 結束
- `serve --no-open` 與 `serve --no-watch` 無效（所有平台）：citty 把 `--no-xxx` 解析成 `xxx: false`，程式卻讀 `args["no-xxx"]`。旗標改宣告為預設 true 的 `open`／`watch`，指令用法不變
- `install-plugin` 把 Windows 絕對路徑（`D:\my-plugin`、`D:/my-plugin`、`\\server\share\...`）當成 GitHub 來源：前者被視為官方 id、後者被拆成 owner `D:`，一路退到 git clone 整個 repo 才失敗；磁碟機與 UNC 路徑現在一律視為本地路徑
- `install-plugin` 的 git clone 退路在失敗時（clone 失敗、repo 內沒有指定子目錄）不清暫存目錄，整份 clone 留在系統 tmp（所有平台）；子目錄不存在時也改為明確錯誤訊息
- `npm run check-plugins` 在 Windows 崩潰（`spawnSync("npx")` 找不到 `npx.cmd`，錯誤處理又讀了 undefined 的 stderr）；改以 node 直接執行 `astro.js`

## [1.2.0] - 2026-09-22

### 新增

- 筆記目錄的子項目可展開與收合：有子項目的章節右側有展開鈕，點標題文字仍是跳轉；目錄標頭新增「全部展開／全部收合」按鈕（整篇沒有子項目時不顯示）
- 目前位置藏在收合的分支裡時，由看得到的最近上層代為標示橘色左緣，不必展開也知道讀到哪一章
- 設定頁新增「筆記 › 目錄預設狀態」（全部收合／全部展開，預設全部收合），存於 `nc-workbench-prefs-v1` 的 `tocDefault`；SSR 一律收合、掛載後才套用，目錄標頭的按鈕只影響當下頁面、不回寫設定

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
