# NoteCraft

以 Astro + MDX 為核心、由 AI 生成視覺化與動態互動元件並嵌入筆記的個人筆記 Web App。完整規格見 [docs/notecraft-prd.md](docs/notecraft-prd.md)。

## 技術棧

- **框架**：Astro 5 + `@astrojs/mdx`，輸出 `output: 'static'`
- **內容**：MDX 筆記放在 `src/content/notes/`，以 Content Collections 管理 frontmatter（title / description / tags / createdAt / updatedAt）
- **UI**：React（僅用於 AI 生成的互動元件）+ TailwindCSS
- **動畫 / 互動**：`motion`（Framer Motion，npm 套件名即 `motion`，**勿與舊 motion.js 混淆**）
- **圖表**：`recharts`（標準圖表）、`d3`（非標準）、手寫 SVG（流程 / 時序 / 架構圖優先）
- **搜尋**：`pagefind`（build 階段索引）
- **部署**：Netlify 靜態部署，**無 Function、無執行時 API**
- **Node ^22.x、TypeScript**

## 目錄結構

```
src/
├── content/notes/              MDX 筆記原始檔
├── components/generated/        AI 生成的視覺化元件（一個 id 對應一個 .tsx）
├── components/wb/               Workbench 工作台的殼與各頁 island（Rail／Sidebar／Header／NotesWorkbench／Drawer／Palette…）
├── components/wb/dashboard/     Dashboard「總覽」的七張卡＋「更新月曆」的 Calendar／CalCell／CalDot／CalNote（不是獨立 island，由 DashboardWorkbench 渲染）
├── components/wb/tabs/          筆記頁籤：TabBar（island 入口，layout 每頁掛）＋TabStrip／TabMenu／TabAll／TabSheet／TabPop
├── components/wb/update/        檢查更新：UpdateHost（island 入口，layout 每頁掛）＋UpdateBlock／UpdateDrawer／UpdateChangelog／UpdateToast／UpdateParts
├── components/islands/          其他 React island（TagEditor、Toc、PluginHost、SeriesNav…）
├── layouts/WorkbenchLayout.astro  三欄工作台的殼，所有頁面共用（簡報頁例外）
├── lib/workbench.ts             工作台索引（build 期、模組層快取）；client-safe 型別在 lib/wb-types.ts
├── lib/wb-dashboard.ts          總覽的純函式（treemap／方塊等級／其他 N 個）；只能 import type、無 JSX，scripts/checks/wb-dashboard.mjs 直接載入斷言
├── lib/wb-calendar.ts           更新月曆的純函式（月格／日曆週／翻頁／標題）；同樣只能 import type、不 import wb-time.ts，scripts/checks/wb-calendar.mjs 斷言
├── lib/wb-tabs.ts               頁籤清單的純函式（ensure／close／固定／移動／LRU／鄰居／重開）；只能 import type、不碰 window，scripts/checks/wb-tabs.mjs 斷言
├── lib/wb-tabs-store.ts         頁籤的 localStorage 讀寫（每次寫入先重讀、storage 事件同步）；lib/toast.ts 是 ToastHost 掛載前的提示佇列
├── lib/wb-nav.ts                換頁轉場分類（peer／drill／section）；lib/wb-tabs-prepaint.ts、lib/series-progress-pure.ts 是殼的預繪。三者都以 toString() 內嵌進 inline script：函式必須自足、只能 import type，check:wb 斷言
├── lib/update-check.ts          檢查更新的純函式（semver／落後版數／Node 需求／快取／toast 條件）；lib/changelog-parse.ts 解析 CHANGELOG。兩者只能 import type，scripts/checks/upd-*.mjs 斷言（npm run check:upd）
├── lib/update-store.ts          檢查更新的狀態（模組單例、localStorage、fetch）；lib/update-prepaint.ts 是 Rail 圓點預繪（toString() 內嵌）；lib/update-env.ts 是 build 期環境
├── lib/notes-ignore.mjs          .notecraft/ignore.json 的比對、走訪（walkNotes）與 .notecraft 位置解析（resolveNotecraftDir）；.mjs 是因為 Astro、dev-api、CLI 三種環境共用，scripts/checks/notes-ignore.mjs 斷言（npm run check:ignore）；build／dev 期單例在 lib/notes-ignore-state.mjs
├── styles/workbench.css         工作台樣式（--wb-* token；規則裡不出現色碼字面值）
├── dev-api/                     dev-only API（handlers.mjs 供 astro dev 與 CLI 共用）
├── pages/
│   ├── wb-index.json.ts        build 期輸出 /wb-index.json，給 Palette 與 Dashboard Drawer 延遲載入
│   ├── notes/[...slug].astro   筆記檢視頁
│   ├── plugins/                Plugin 資料檔與已安裝外掛
│   └── settings.astro          設定與關於
└── ...
.claude/
├── agents/                     四個 Subagent 設定檔
│   ├── note-scanner.md
│   ├── visualize-planner.md
│   ├── component-generator.md
│   └── mdx-writer.md
└── skills/
    └── content-visualize/SKILL.md
```

tsconfig path alias：`@/*` → `./src/*`、特別是 `@/components/generated/<id>` 用於 MDX 寫回的 import。

## AI 標記區塊（核心機制）

筆記中以 MDX 註解標記需 AI 處理的位置：

```mdx
{/* @ai-visualize
id: oauth-flow
type: diagram | chart | timeline | table | motion | free
prompt: |
  自然語言描述
status: pending | generated | locked | failed
*/}
```

處理流程由作者在 Claude Code 對話中觸發，依序由四個 Subagent 協作：

1. **note-scanner**（haiku, 唯讀）— 掃描 MDX 找出標記區塊、列出孤兒元件
2. **visualize-planner**（sonnet, 唯讀）— 依 `content-visualize-skill` 決策樹規劃方案
3. **component-generator**（sonnet, 可寫檔）— 寫元件到 `src/components/generated/<id>.tsx`，跑 `tsc --noEmit` + `astro build` 驗證，失敗自動修最多 3 次
4. **mdx-writer**（haiku, Edit only）— 在標記區塊下方寫入 `import` 與 JSX、更新 `status`

### 處理規則

- `status: locked` 永不覆寫；`status: failed` 預設不重跑，除非作者調 prompt 後明確要求
- 同檔內 `id` 重複 → 標註錯誤、跳過該重複 id，**不中止其他標記**
- **孤兒元件**（標記已刪、元件還在）由 note-scanner 回報，**必須作者明確同意才可刪除**
- 驗證未通過前**不寫回 MDX**，避免引用到壞元件
- 只有含互動 / 動畫時加 `client:visible`；純靜態 SVG 不加
- `GeneratedFrame` 的元件本體外面那層 `data-nc-viz-body` 是「放大檢視」的搬移目標，**不可拿掉**（見 [VizZoom.tsx](src/components/islands/VizZoom.tsx)）

### 元件白名單

允許 import：`react`、`motion`、`recharts`、`d3`、`clsx`、`tailwind-merge`、`lucide-react`（圖示）、專案內相對路徑。其他套件**先在對話中徵詢作者**。

### 視覺化選型（決策樹要點）

| Prompt 描述 | 採用方式 |
| --- | --- |
| 流程 / 時序 / 狀態機 / 架構 | 手寫 SVG（不引入函式庫） |
| 有軸的量化資料 | recharts；非標準才用 d3 |
| 時間軸 / Gantt | 手寫 SVG |
| 含豐富欄位的比較表 | Tailwind `<table>`，不要做成 SVG |
| 動畫 / 互動 / scroll-driven | `motion`（Framer Motion） |
| 複合需求 | 組合上述，不要二選一 |

### 樣式規範

色票、字級、間距、圓角、陰影一律遵循外部 **`trendlink-design` Skill**。生成元件前先讀取其 SKILL.md，優先使用其 token / class，**不要硬編碼色碼**。僅在 prompt 明確要求跳脫設計系統時例外，並在對話中說明。

## Workbench 工作台（v1.0.0）

殼是 Rail 52 + Sidebar 240 + 主區（Header／Toolbar 40／Body），**整頁不捲動**，只有 `#nc-scroll.wb-body` 與 Sidebar 內部捲動。
完整設計見 [docs/notecraft-workbench.md](docs/notecraft-workbench.md)，像素級規格在 `docs/prototype/design_handoff_workbench/`。

- **殼的切分**：能在 build 期畫完的用 `.astro`（Rail、Sidebar 樹、靜態頁首）；Header Tab／Toolbar／Body／Drawer 是同一份 state 的頁面
  （`/notes`、Dashboard、`/plugins`、`/settings`）由**同一個 island** 渲染，layout 以 `bare` 掛它；只有 Toolbar 與 Body 由 island 輸出的用 `bareBody`
- **`id="nc-scroll"` 不可拿掉**：`Toc`、筆記頁 inline script 靠它找捲動容器。island 自己輸出 Body 時也要帶這個 id
- **列的 DOM 規則**：單擊開 Drawer 的列是容器，內含並排的 `<button class="wb-row-main">` 與常駐的 `<a class="wb-row-open">`，**連結不可包在按鈕裡**；
  格狀的小目標（標籤分布 treemap 方塊、月曆的 14px 色塊）例外：純 `<button>` 走 `rowHandlers`、無常駐開啟連結（Dashboard §6.4、Calendar Q2）；
  單擊即導覽的列（系列、標籤、資料檔）整列是 `<a>`
- **資料夾與顯示用路徑一律來自真實檔案路徑**（`WbNoteRow.path`），不是會被 slug 化的 `entry.id`；`?folder=` 的值也是真實路徑。slug 只用於 `/notes/<slug>` 與 localStorage key
- **本機絕對路徑不得出現在任何輸出的 HTML／JSON**（`/wb-index.json` 序列化後若含 cwd 會直接 throw）。唯一例外是 dev-only 的 `vscode://` 連結。
  build 完由 `src/lib/no-local-path-integration.mjs` 掃整個產物的 `.html`／`.json` 兜底（含 island props）；要給 dev 用的路徑（如 `rendererPath`）一律 `isDev &&` 守衛
- **`astro build --outDir` 必須在 astro 的 cwd（app 根）底下**：否則 Astro 5 經 `<cwd>/.astro/` 中轉、把 content layer 的 `data-store.json`（筆記原文＋本機路徑）等整包複製進產物，並在 build 後刪掉 `.astro/`。
  CLI 一律 build 到 `node_modules/.notecraft-build/<hash>/` 再搬進快取（`runAstroBuild` 會斷言）；`src/lib/content-layer-guard-integration.mjs` 在產物端兜底，`node scripts/fixtures/content-layer-leak.mjs [--app <另一磁碟的 app>]` 是整合驗證（1.10.1）
- **相對於「今天」的量在瀏覽器算**（`lib/wb-time.ts`，當地時區），SSR 以「—」佔位；靠 localStorage 的東西（閱讀進度、收藏、偏好）SSR 一律當作沒有
- 篩選全在 query string（`?folder=`、`?series=`、`?tag=`、`?pending=1`、`?fav=1`、`?view=`），island 內切換用 `history.replaceState`；分組與搜尋字串不進網址
- `Escape` 走 `lib/wb-escape.ts` 的共用堆疊（Palette → Modal → Drawer → Sidebar 抽屜），浮層不要各自掛 keydown
- 樣式規則只引用 `--wb-*` token；DS 沒有的七個值集中在 `workbench.css` 開頭
- **Dashboard 總覽**（v1.4.0，[docs/notecraft-workbench-dashboard.md](docs/notecraft-workbench-dashboard.md)）：兩個瀏覽器端資料來源（今天、localStorage 閱讀進度）只由 `DashboardWorkbench` 各持有一份往下傳（`now`／`live`／`readingVersion`），SSR 一律佔位（「—」、只畫底環、不畫長條、不輸出日誌清單）；class 沿用 prototype 的 `dv-` 名稱、新色值全在 `--wb-dv-*`；treemap 與週窗由 `npm run check:wb` 鎖住
- **更新月曆**（v1.5.0，[docs/notecraft-workbench-calendar.md](docs/notecraft-workbench-calendar.md)）：`?tab=calendar`（舊 `?tab=week` 視同）。月曆用**日曆週（週日→週六）**，總覽 KPI「本週更新」與更新日誌仍是滾動 7 天，兩者數字可以不同；`anchor` 由 `now` 推、SSR 不輸出任何日期格；`view`／`anchor` 不進網址；新底色在 `--wb-cal-*`、格子上的小字用 `--wb-muted-ink`；`cal-` 規則必須放在 860px 媒體規則之前；月格與日曆週由 `check:wb` 鎖住
- **筆記頁籤**（v1.7.0，[docs/notecraft-workbench-note-tabs.md](docs/notecraft-workbench-note-tabs.md)）：Header 之上 34px 頁籤列，由 layout 每頁掛 `TabBar client:load`；頁面以 layout 的 **`tab` prop** 宣告自己是頁籤（目前只有筆記頁與 `/view` 資料檔頁）。
  清單存 `nc-tabs-v1:<workspaceLabel>`（依工作區分開），**含標題快照**、idle 時以 `/wb-index.json` 覆寫並清掉已不存在的；SSR 只輸出空列（手機是空的計數框）。
  頁籤是 `<a role="tab">` 並排 ✕（中鍵關閉）；捲動還原遇網址 hash 讓位、還原期間不記錄；快捷鍵只用 ⌥ 且比對 `event.code`、輸入元件內不攔；
  頁面剛載入時要發的提示走 `lib/toast.ts`（`nc-toast` 事件在 ToastHost 掛載前會遺失）；刪除筆記要先關掉對應頁籤
- **Loading 與轉場**（v1.8.0，[docs/notecraft-workbench-loading-transitions.md](docs/notecraft-workbench-loading-transitions.md)）：跨文件 View Transitions，只有 `.nc-main-pane` 命名 `nc-main`，Rail／Sidebar／頁籤列不動；
  **`@view-transition` 必須在 head 的 inline `<style>`**（只放外部 CSS 時，快速就緒的頁面會被 Chrome 中止轉場），與 `workbench.css` 的同名規則由 `check:wb` 對照；head 固定 `rel=expect` 主區開頭的 `#nc-pane-start`（否則新頁快照沒有主區）。
  頁籤列與 Sidebar 系列進度由 inline script 在第一次繪製前預繪，頁籤畫在**島外**的 `#nt-pre`（**不可改 island 自己的 DOM**，React 18 會 hydration mismatch），TabBar 清單含目前頁面時移除；`.nt-ind` 的 `view-transition-name` 同一份文件只能有一個。
  捲動還原在主區結尾的 inline script（`data-nc-restored`）；`.nc-main-pane` 不設 position（Drawer 以 `.wb-main` 為定位基準）。骨架外層不用 `.wb-host` class（`Toc.tsx` 以它量寬度）。新 token 一律 `--wb-*`，每條動畫要有 reduced-motion 對應
- **檢查更新**（v1.9.0，[docs/notecraft-workbench-update-check.md](docs/notecraft-workbench-update-check.md)）：瀏覽器端直接查 `registry.npmjs.org/notecraftapp`，**部署站也提示**（dev-only 原則的刻意例外），**不分 viewer／部署站、只有一套文案**。
  結果存 `nc-update-v1`（**`cur` 與目前版本不同就整份作廢**）、30 分鐘節流；自動檢查失敗零痕跡（不顯示、不寫 `at`、不印錯誤），只有手動失敗顯示一行字。
  layout 每頁掛 `wb/update/UpdateHost client:idle`（toast、Drawer portal 進 `#nc-main`）；Rail「設定與關於」的圓點由 Rail 之後的 inline script 以 `lib/update-prepaint.ts` 的 `railHint` 預繪（`toString()` 內嵌，必須自足）。
  store 是 `lib/update-store.ts` 模組單例，`UpdateHost`／`SettingsView`／`Palette` 共用。CHANGELOG 由 jsDelivr `notecraftapp@<latest>/CHANGELOG.md` 取、GitHub raw 備援，所以 **`CHANGELOG.md` 必須留在 `package.json` 的 `files`**；
  只列 npm 上發佈過的版本（沒單獨發佈的段落不列）、「內部」類別不顯示；版本標題必須是 `## [x.y.z] - YYYY-MM-DD`，`npm run check:upd` 以真實 CHANGELOG 斷言（含與官網 `readReleases()` 對照）
- **空狀態插圖**（v1.5.1，[docs/notecraft-workbench-empty-states.md](docs/notecraft-workbench-empty-states.md)）：只有更新日誌與 AI 佇列用 `wb/EmptyState.tsx`（class 沿用 prototype 的 `pt-empty*`），其他空狀態仍是 `wb-empty`／`dv-empty` 單行字；插圖 SVG 的顏色用 `style` 寫 `--wb-*` 變數（presentation attribute 在部分瀏覽器不解析）、不新增 token；更新日誌空時清單加 `is-empty`（不捲），矮視窗（≤820 高）規則縮插圖

## Plugin System（v0.6.0）

讓結構化 JSON 資料檔被「可安裝的渲染器」畫成頁面。與 `@ai-visualize` 的分界：
**同一種形狀的資料會反覆出現 → plugin；只為這一段文字服務 → `@ai-visualize`。**

完整設計見 [docs/notecraft-plugin-system.md](docs/notecraft-plugin-system.md)。

```
<專案根>/.notecraft/
├── ignore.json                     排除檔案（類 .gitignore，見下方「排除檔案」）
├── plugins.json                    映射：哪些檔案交給哪個 plugin
└── plugins/
    ├── _types.d.ts                 安裝時產生，供 renderer 取 PluginRendererProps
    └── <id>/
        ├── notecraft-plugin.json   身分證（id / title / version / dataSchema / engines）
        ├── renderer.tsx            入口，檔名固定
        └── schema.json             資料的 JSON Schema
```

### 幾條不會變的規則

- **`plugins.json` 頂層 `disabled: string[]`**（v1.0.0）：停用的 plugin 其所有規則在比對前就略過、等同不存在，也不參與安裝檢查（壞掉的 plugin 先停用，站仍 build 得出來）。停用不是解除安裝，renderer 仍在 client chunk
- **`meta.backTo` 是 app 層約定的第三個 meta 欄位**（與 `meta.title`、`meta.description` 並列）：「回到來源筆記」的站內路徑，只接受單一 `/` 開頭，不符者忽略並 warn
- **manifest 的 `meta`（v1.6.0）以 JSON Pointer 改指上述三個欄位的來源**（例：OpenAPI 的 `/info/title`、`/x-notecraft-back-to`），給資料格式不是自己定的 plugin 用；省略的鍵退回 `meta.<鍵>`。取值在 `src/lib/plugin-meta.ts`，之後的清理（去 Markdown、backTo 驗證）與 `meta.*` 相同
- **`<PluginView src options anchor>`（v1.6.0）**：`options` 淺合併在規則的 options 之上、只影響這一處內嵌；`anchor` 是「開啟完整檢視頁」連結的 hash，app 不解讀。prop 叫 `src`（不是 `file`）
- **入口固定 `renderer.tsx`**，manifest 不放 `entry`；吃哪些檔完全由 `plugins.json` 的 `files` 決定，manifest 也不放 `accepts`
- **`files` 的基準是 notesDir** —— 資料檔必須放在筆記資料夾內；不允許比對 `.md` / `.mdx`
- **一檔被多條規則命中 → 第一條勝**，build 印 warn
- **失敗一律 build fail**（plugin 未裝、JSON 壞、schema 不符）。只有「渲染器在瀏覽器 throw」才走錯誤卡片
- **plugin 只能 import 既有白名單**（與 AI 生成元件共用 `src/lib/generated-component-whitelist.ts`），安裝時就擋、不拖到 build
- **資料一律 inline 成 island props**；超過 256 KB 印警告（注意 Astro 的 props 編碼會讓 HTML 約為 JSON 的 3 倍）

### 渲染器要透過 `PluginHost` 掛載

**不要**從 `getPlugins()` 取出元件直接掛 `client:load` —— build 會以 `NoMatchingImport` 失敗。
Astro 的 hydration 指令要在編譯期就知道元件來自哪個模組。渲染器的 glob 在
`src/components/islands/PluginHost.tsx` 裡（會進 client chunk），
`src/lib/plugins.ts` 只做 build 期解析（它用 `node:fs`，不能進 client）。
既有的簡報頁是同一個形狀。

### 系列

章節識別碼可以是筆記 slug，也可以是 `view:<路徑去副檔名>`。兩者一視同仁：有序號、
計入進度分母、可標記已完成。**閱讀進度的 localStorage key 用未經轉換的識別碼原字串**
（含 `view:` 前綴），否則筆記 `a/b` 與資料檔 `view:a/b` 會撞同一格。

### 官方 store

repo 根目錄的 `plugins/`，隨 GitHub 發佈 —— **推上預設分支就等於發佈**。
因此 `npm run check-plugins` 是必要的護欄：驗 manifest、registry 無漂移、
`example/` 底下**所有** `.json` 通過自己的 schema，並實際配這些資料 build 一次（官方 plugin 以此保留舊版資料格式的範例當相容測試）。
它也串接 `scripts/checks/*.mjs` —— 以 Node 22.6+ 原生 strip-types 直接載入 plugin／app 的純函式 `.ts` 做斷言（不引入 test runner）；
**被它載入的 `.ts` 只能有 `import type`（或帶副檔名的相對 import，如 `./derive.ts`）、不能有 JSX**。`prepublishOnly` 會跑它。
規模測試用的產生器放 `scripts/fixtures/`，**不要放 `scripts/checks/`**（那裡每支 `.mjs` 都會被當成檢查執行）。

- **plugin 以 `<style>{CSS}</style>` 注入樣式時，CSS 字串不可含 `< > & " '`**：React SSR 會把它們跳脫成實體，`<style>` 裡不會解回來，選擇器壞掉且 hydration 失敗（ER plugin 由 `scripts/checks/er-styles.mjs`、OpenAPI plugin 由 `oar-styles.mjs` 把關）
- **資料檔 `meta.description` 允許 Markdown**：app 端的 `ResolvedDataFile.description` 已是第一段純文字、`descriptionIndex` 是全文純文字（`src/lib/strip-markdown.ts`）；不要在 app 端直接輸出 `data.meta.description`

### OpenAPI Renderer（官方 plugin，v1.0.0／app v1.6.0）

[docs/notecraft-openapi-renderer.md](docs/notecraft-openapi-renderer.md)；像素級規格在 `docs/prototype/design_handoff_openapi_renderer/`。

- 只保證 OAS 3.0／3.1；其他 3.x 以 3.1 規則盡力渲染並警示；**Swagger 2.0 不 build fail**，dataSchema 放行、頁面顯示轉檔指引、SSR 時在 build log warn 一次
- dataSchema 只驗外形；`$ref` 斷掉、operationId 重複等瑕疵由 `derive.ts` 容錯並在 dev console warn，不 throw
- 路由照 app 規則只去 `.json`：`api/orders.openapi.json` → `/view/api/orders.openapi`
- page 模式位置與 hash 雙向同步（`#tag/x`、`#op/<operationId 或 method/path>[/responses/409]`、`#schema/X`），`replaceState`；**SSR 一律總覽、一律 cURL**，hash 與 `localStorage`（`oar:v1:lang`）都在 effect 後才讀
- **embed 不讀寫 hash、不掛 keydown、不畫外框**（外框是 `GeneratedFrame`）；連結走 `LinkCtx`（page 攔下走元件內路由、embed 是指向 `/view/…#…` 的真連結）
- Esc 晚一拍處理（`setTimeout` 後看 `defaultPrevented`）：工作台 `wb-escape` 也掛在 window，這樣不管誰先註冊都不會搶走 Palette／Drawer 的 Esc
- CSS 變數是 `--oar-*`（不是 handoff 的 `--wb-oa-*`，`--wb-*` 是 app 的命名空間）；斷點一律 container query
- 與 ER **不共用模組**（各自安裝）：`markdown-text.ts` 各持一份，由 `oar-markdown.mjs` 對照兩邊輸出；骨架樣式以相同數值對齊

## 排除檔案 `.notecraft/ignore.json`（v1.10.0）

[docs/notecraft-ignore-config.md](docs/notecraft-ignore-config.md)。`{ "ignore": [...] }`，語法同 `.gitignore`（`ignore` 套件），基準是 notesDir；被排除的檔**一律不讀**（筆記、plugin 資料檔、附件都算）。

- **走訪 notesDir 一律經 `walkNotes()`／`walkNotesAsync()`**（`lib/notes-ignore.mjs`），不要再自寫 `readdir` 遞迴；`.notecraft/` 的位置只由 `resolveNotecraftDir()` 決定（plugins.json、ignore.json、`@notes` alias 同一處，只讀一份）
- **內建排除**（`.` 開頭、`node_modules/`、`dist/`）加在使用者規則之後，`!` 解除不了
- 筆記 collection 用 `lib/ignoring-loader.ts` 包 `glob()`：**`glob()` 的 pattern 不可放使用者的負向 pattern**（Astro dev watcher 以 `picomatch.isMatch(陣列)` 判斷，負向 pattern 會讓被排除的筆記冒出來、甚至把 .json 當筆記）。初次載入用 `walkNotes()` 算出的字面負向 pattern，dev watcher 與 `store.set` 另外過濾
- `ignore.json` 格式錯誤一律 build fail；dev 期間它一變動就重啟 dev server（`lib/notes-ignore-integration.mjs`），`serve` 換新比對器並 rebuild
- 被排除 = 不出現在任何產物：`lib/ignore-guard-integration.mjs` 在 build 後掃 `notes-assets/` 與 `/wb-index.json`，違反直接 throw
- 刪筆記判斷孤兒元件時**連被排除的筆記一起看**（它們還在硬碟上）
- 整合驗證：`node scripts/fixtures/ignore-sample.mjs`（build）、`node scripts/fixtures/ignore-dev.mjs`（dev API、dev 重啟、CLI 快取與 serve watcher），各要幾分鐘，不在 `check-plugins` 裡

## dev-only API（僅 `astro dev` 期間存在，build 時不輸出）

- `POST /api/notes` — 新增筆記（建檔 + 預設 frontmatter + AI 標記範本）
- `GET /api/tags` — 全站標籤統計
- `PUT /api/tags/:old` — 重新命名標籤（合併語意：若新名稱已存在則自動去重）
- `DELETE /api/tags/:tag` — 從所有 MDX 移除該標籤
- `PUT /api/notes/:slug/tags` — 替換單篇筆記標籤
- `DELETE /api/notes/:slug` — 刪除筆記（連帶處理未被其他筆記引用的生成元件）
- `GET /api/folders` — notesDir 底下所有層的資料夾（遞迴），供新增筆記的下拉選單
- `PUT /api/plugins/:id` body `{ enabled }` — 增刪 `.notecraft/plugins.json` 頂層 `disabled` 陣列的元素；只動這個鍵、保留作者排版

**所有 endpoint 僅綁定 `localhost`**。寫入後受影響 MDX 的 `updatedAt` 都要更新。
被 `.notecraft/ignore.json` 排除的檔對所有 endpoint 都不存在（標籤統計／改名／刪除不碰、slug 查找 404、資料夾不列、`/notes-assets/*` 404、新增到被排除的位置 400）。

### 標籤字串規範

trim 前後空白 → 過濾空字串 → 同篇內不分大小寫去重（保留首次出現的大小寫）。

## dev / 正式環境差異

下列功能**僅在 dev 環境顯示**，Netlify 正式環境完全隱藏：

- 「+ 新增筆記」按鈕（每頁頁首）
- 筆記頁首的「⋯」選單整顆：以 VS Code 編輯（`vscode://file/{絕對路徑}`）、重新生成提示（複製對話範本到剪貼簿）、刪除筆記
- Drawer 的「複製生成提示」與無 deck 時的「生成簡報」
- 筆記檢視頁的標籤 chip 編輯 UI
- `/tags` 頁面的重新命名 / 刪除控制
- `/plugins` 的啟用／停用 Switch（正式環境只留 pill）

判定方式：`import.meta.env.DEV`。（舊文件提到的 `LOCAL_EDIT=1` build 旗標在程式碼裡並不存在，2026-09-22 更正。）

## 工作慣例

- AI 視覺化**不在 CI 階段執行**，僅由作者於本機 Claude Code 對話觸發，產出隨原始碼一起 commit
- Dashboard 統計於 `astro build` 階段透過 Content Collections 預計算為 JSON，**無執行時 API**
- 元件強制 TypeScript（`.tsx`），禁用 `any`（除非註解說明理由），不可有 required props
- motion 元件預設 200–400ms ease-out，並用 `useReducedMotion()` 尊重 `prefers-reduced-motion`
- **沒有 pre-push hook**（`.git/hooks` 只有 sample、也沒有 husky）。每次 commit 前自己跑 `npx tsc --noEmit && npx astro build`；動到 plugin 相關的再跑 `npm run check-plugins`（只想跑純函式斷言用 `npm run check:er`／`npm run check:oar`，秒級）。本機 shell 預設 Node 16，`scripts/checks` 需要 22.6+（`.nvmrc` 是 22）。注意 `tsc --noEmit` 本來就有數十個既有錯誤（多在 `src/lib/workbench.ts` 等），看的是「有沒有新增」

## 待釐清項已收斂的決策

（PRD 中標 `[x]` 者，作為實作依據）

- VS Code 編輯按鈕在正式環境**完全隱藏**
- 新增筆記表單**不**讓使用者指定 AI 標記的 `type`，預設 `free`
- **保留** `npm run new-note` CLI 與按鈕共用建檔邏輯
- AI 生成元件強制 **TS（.tsx）**
- `type` 欄位列舉為**提示**，允許 `free`
- AI **不**在 Netlify CI 自動執行
- 白名單外套件**需先徵詢作者同意**才能 import
- Subagent 模型**寫死建議值**（haiku / sonnet），不用 `inherit`
- note-scanner / mdx-writer **獨立成 Subagent**
- **不**提供「新增空標籤」；**不**做軟刪除 / undo（依靠 git 復原）
- `references/svg-patterns.md` 等 Skill 參考檔初版**先不提供**，待累積案例後再回填
