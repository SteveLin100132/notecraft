# Task 60 — 工作台索引：`src/lib/workbench.ts` 與 `/wb-index.json`

> 規格 [notecraft-workbench.md](../notecraft-workbench.md) §5（全節）、§5.4（時間基準）；
> Q2、Q4、Q5、Q6、Q8、Q10、Q25 定案。
> 設計交付的 `prototype/wb/pt-data.jsx` 是**反面教材** —— 它的資料夾樹是用 `category` 與 `tags` 假造的，不要照抄。
> 對應實作階段 **P2**。無前置依賴，可與 [Task 59](task-59-workbench-style-foundation.md) 並行。

## 為什麼要有這一步

現在同一批東西在 `index.astro`、`notes/index.astro`、`BaseLayout.astro` 各算一次
（`BaseLayout` 每一頁都重跑 `getAllNotes()` + `parseMarkers()` 只為了算一個待生成數）。
新殼每頁都要資料夾樹、系列、待生成數，再各算各的會讓 build 時間乘上頁數。收成一份、模組層快取。

## 範圍

### 1. `src/lib/workbench.ts`（新增，build 期，用 `node:fs`，**不可進 client bundle**）

型別照規格 §5.1。重點欄位：

| 欄位 | 怎麼來 |
| --- | --- |
| `WbNoteRow.slug` | `entry.id`。只用於 `/notes/<slug>` 網址與 localStorage key |
| `WbNoteRow.path` | `path.relative(notesDir, path.resolve(process.cwd(), entry.filePath))`，統一正斜線、含副檔名。**不是 slug** |
| `WbNoteRow.folder` | `path` 的資料夾分段（真實名稱）；根目錄為 `[]` |
| `WbNoteRow.markers` | 既有 `parseMarkers(body)`，保留 `id`／`type`／`status`／`prompt` |
| `WbNoteRow.series` | 由 `loadSeries()` 反查；`index` 是該筆記在 `slugs` 裡的序（含資料檔章節在內的序，1 起算） |
| `WbNoteRow.hasFrontmatter` | 見下方 §3 |
| `WbNoteRow.hasDeck` | 既有 `hasDeck(slug)` |
| `WbNoteRow.promptPath` | notesDir 相對專案根 + `/` + `path`；notesDir 不在專案根下時只用 `path`。**僅 dev 輸出** |
| `WbIndex.folders` | 由所有 `path` 建樹，**不限層數**；每個節點的 `count` 含子孫 |
| `WbIndex.series` | 每個系列帶 `chapters`（沿用 `getSeriesChapters()`，筆記與 `view:` 資料檔一視同仁） |
| `WbIndex.dataFiles` | 既有 `getDataFiles()`，另加 `dir`（所在資料夾，根目錄為 `""`） |
| `WbIndex.pending` | `{ markers, notes }`，`status !== "generated"` 即算待生成（與現行 `BaseLayout` 一致） |
| `WbIndex.workspaceLabel` | 見下方 §4 |

**不帶**的欄位：`words`（Q9 定案字數整個拿掉）、資料夾 `color`（Q6 定案不分色）。

`getWorkbenchIndex()` 以模組層變數快取，一次 build 只算一次。

> **為什麼不能用 `entry.id` 反推路徑**：Astro glob loader 預設會把 id slug 化（轉小寫、空白變連字號），
> `My Notes/ER Diagram.md` 的 id 是 `my-notes/er-diagram`。主專案的檔名本來就是 slug 形式所以看不出差別，
> viewer 使用者的資料夾會對不上。資料夾樹、`?folder=` 的值、所有顯示用路徑都要從真實路徑來。

### 2. 資料夾樹的排序

同層依名稱 `localeCompare("zh-Hant")`。「根目錄」不是樹的節點，由 UI 在 List 分組時放最前（README §5.2）。

### 3. `hasFrontmatter`（規格 §5.2.1）

讀原始檔頭比對 `/^﻿?---\r?\n/`。有區塊但內容空白、或只缺 `title`，都**算有**。
讀檔失敗視為有。必須讀原始檔：`enrichNote()` 補完預設值後已無從分辨。

### 4. `workspaceLabel`（規格 §5.2.2）

| 情境 | 值 |
| --- | --- |
| 主專案 | notesDir 相對 `process.cwd()` → `src/content/notes` |
| viewer（有 `NOTECRAFT_USER_CWD`） | 專案資料夾名 + `/` + notesDir 相對專案根 → `trendmile/docs` |
| notesDir 不在專案根底下 | 只用 notesDir 的資料夾名，**不輸出 `../`** |

**本機絕對路徑不得出現在任何輸出**。

### 5. `src/pages/wb-index.json.ts`（新增，靜態端點）

build 期輸出 `/wb-index.json`，**不是執行時 API**。給 Palette 與 Dashboard 上的 Drawer 延遲載入用（Q2 混合式）。
輸出前做兩件事：

- 正式 build（`!import.meta.env.DEV`）剝掉 `promptPath`
- 輸出字串不得含 `process.cwd()` 的值。專案沒有測試框架，build 後以 grep 驗證（見驗收）；端點內另加一道防呆：序列化後若含該字串就 `throw`，讓 build 失敗而不是悄悄洩漏

### 6. 瀏覽器端時間工具 `src/lib/wb-time.ts`（新增，純函式、可進 client）

Q10 定案相對量在瀏覽器以 `Date.now()` 計算：

- `localDay(s: "YYYY-MM-DD"): Date` —— 用 `new Date(y, m-1, d)`，**當地時區**日界線
- `daysAgoLabel(s, now?)`、`withinDays(s, n, now?)`
- `weekBuckets(dates: string[], n = 8, now?)` —— 以**今天**為最後一天，每 7 天一格往回 n 格，回傳 `{ label: "m/d", count }[]`。
  不採 prototype「以最新一篇筆記日期為基準」的做法

順手修 [src/lib/dates.ts](../../src/lib/dates.ts) 的 `daysAgo()`：預設基準日用 `toISOString()` 取的是 **UTC**，
台灣時間早上八點前「今天」會算成昨天，改成取當地日期。

### 7. 連帶：`GET /api/folders` 改為遞迴

[src/dev-api/handlers.mjs](../../src/dev-api/handlers.mjs) 的 `handleFolderList` 目前只列 notesDir 的**第一層**。
樹不限層數之後，新增筆記的下拉選單要能選到子資料夾。改成遞迴列出，沿用既有的略過規則（`.` 開頭、`node_modules`、`dist`）。
回傳格式不變（字串陣列、以 `/` 結尾），`NewNoteModal` 不必改。

## 要改的既有檔案

`src/lib/dates.ts`、`src/dev-api/handlers.mjs`。其餘皆新增。
`src/lib/notes.ts` 的 `buildDashboardStats()` **先不刪**，[Task 66](task-66-dashboard-widgets.md) 換掉 Dashboard 之後才沒有呼叫者。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 巢狀資料夾 | `src/content/notes/private/` 下有筆記 | 讀 `folders` | 出現 `private` 節點，`count` 正確；根目錄筆記的 `folder` 為 `[]` |
| 路徑不是 slug | 暫時放一個 `Test Dir/My Note.md` | 讀該筆 `path` 與 `slug` | `path` 是 `Test Dir/My Note.md`，`slug` 是 slug 化後的值；驗完刪掉 |
| 無 frontmatter | 一個開頭沒有 `---` 的 `.md` | 讀 `hasFrontmatter` | `false`；有 `---` 但沒寫 title 的為 `true` |
| 不洩漏絕對路徑 | `astro build` | `grep -c "$(pwd)" dist/wb-index.json` | 0 |
| 正式 build 無 `promptPath` | 同上 | grep `promptPath` | 0 筆 |
| 系列含資料檔 | 某系列有 `view:` 章節 | 讀該系列 `chapters` | 資料檔章節在內、`kind: "data"` |
| 週窗以今天為終點 | 固定 `now` 傳入 `weekBuckets` | 檢查最後一格 | 涵蓋 `now` 往回 6 天到 `now` |
| 時區 | 將系統時區設為 `Asia/Taipei`、`now` 為當地 07:00 | `daysAgoLabel(今天)` | 「今天」而非「1 天前」 |
| 子資料夾可選 | dev，`private/` 下再建一層 | `GET /api/folders` | 兩層都列出 |
| viewer | `npm run viewer:build -- <某外部資料夾>` | 讀 `workspaceLabel` 與任一 `path` | 無 `../`、無絕對路徑 |

## 依賴

無。

## 待驗證（規格標明未實測）

viewer 模式下 `entry.filePath` 是否真的變成一長串 `../`。不論結果如何，本 Task 的算法（先 resolve 成絕對、再對 notesDir 取相對）都成立；
只是把實測結果記在實作記錄裡，讓規格 §5.2.2 那句「推測」變成事實。

## 實作記錄（2026-09-22）

- **待驗證項①實測**：viewer 模式下 `entry.filePath` 確為 `../../../../../private/tmp/…/docs/plain.md`；先 resolve 成絕對再對 notesDir 取相對後，`path` 是 `My Notes/ER Diagram.md`、`slug` 是 `my-notes/er-diagram`，JSON 內 `../` 與絕對路徑 0 筆
- 標記的 `prompt` 截到 240 字：索引 71 KB（30 篇），長提示詞會撐大 Palette 的載入量
- `getWorkbenchIndex()` 在 dev 下每次請求重算（檔案會變），正式 build 才走模組層快取
- `GET /api/folders` 的 handler 在 dev server 啟動時載入，改完要重啟 dev 才生效（不是 HMR）
