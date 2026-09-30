---
Project Name: NoteCraft Workbench — Dashboard 總覽改版
文件類型: Design Document
文件版本: v1.0.0
開發模式: Waterfall
技術選型: 確定（沿用既有技術棧，不新增套件；圖表全部手寫 SVG／CSS）
文件狀態: 已實作（notecraftapp v1.4.0，Task 87–91，2026-09-29）—— §15 的 6 題已於 2026-09-29 逐題確認（紀錄見 §16）；實作後回填見 §17
文件作者: 建宇
建立日期: 2026-09-29
更新日期: 2026-09-29
依賴文件: docs/notecraft-workbench.md（§4 殼、§5 索引、§5.4 時間基準、§8.1 現行 Dashboard、§8.2.1 列的 DOM 規則）、docs/notecraft-prd.md、docs/prototype/design_handoff_workbench_dashboard/README.md
分支: feat/dashboard-redesign
---

# NoteCraft Workbench — Dashboard 總覽改版設計文件

把工作台首頁「總覽」分頁從 v1.0.0 的 **12 欄 widget grid** 換成 handoff 的**兩列固定版面**：上列三張 KPI 卡（筆記總數、本週更新、AI 待生成）加一張寬的「寫作頻率」堆疊長條；下列三欄等高的內容卡（最近更新／系列＋標籤分布馬賽克／更新日誌），整頁填滿一個視窗高度、卡片內各自捲動。

> 視覺與互動的**像素級規格**以 [design_handoff_workbench_dashboard/README.md](prototype/design_handoff_workbench_dashboard/README.md) 與 `source/pt-dash2.css`、`source/pt-dash2.jsx` 為準，本文不重抄。
> 本文負責 handoff 沒有回答的事：prototype 的資料轉接層（`pt-data.jsx`）是假造的，codebase 有真正的工作台索引與兩個**只存在於瀏覽器**的資料來源（今天的日期、localStorage 的閱讀進度）；handoff 有三處與 v1.0.0 已定案的決策相牴觸（時間基準、資料夾色、四態閱讀狀態），動工前已逐題決定聽誰的（§15、§16）。
> **與設計稿不同之處一律以本文為準**，全部列在 §1.3。

---

## 1. 這份文件要解決什麼

### 1.1 起點

Handoff 是一份 high-fidelity 的單頁 React prototype，資料來自 `window.NOTES`／`window.SERIES` 與 `pt-data.jsx` 的轉接層。讀過 codebase 之後，有四類落差 README 沒處理：

| 落差 | 說明 |
| :-- | :-- |
| **資料來源** | prototype 的 `readingStatus()` 有四態（含「未發佈」）、`FOLDER_COLOR` 對五個假資料夾寫死顏色、系列有 `green` accent。codebase 是三態（PRD 已定案不做未發佈）、資料夾不分色（workbench Q6）、accent 只有 `blue / orange / navy` |
| **時間基準** | README 明說「最新日期一律以資料中最大的 `updated` 值為基準，不使用系統今天日期」。workbench Q10 定案的正好相反：相對量一律以**今天**在瀏覽器算，理由是靜態站很久沒寫時不該看起來仍像最近很活躍 |
| **SSR** | prototype 是純 client app，沒有「第一次繪製沒有 localStorage、沒有今天」的問題。codebase 是 Astro 靜態站，閱讀狀態環形圖、堆疊長條、更新日誌的週窗在伺服器端都算不出來，要有佔位策略（§5） |
| **既有規則** | 「單擊開 Drawer 的列是容器，內含並排的 `<button>` 與常駐的 `<a class="wb-row-open">`」（workbench Q27／§8.2.1）；`workbench.css` 規則裡不出現色碼字面值；`id="nc-scroll"` 不可拿掉。prototype 三條都沒遵守 |

### 1.2 目標

1. **總覽分頁**照 handoff 重做：Row 1 四張卡、Row 2 三欄等高、卡片內捲動、整頁不捲動（§6）
2. 兩個瀏覽器端資料來源（今天、閱讀進度）有一致的 **SSR 佔位 → hydrate 補齊**策略，不觸發 hydration mismatch（§5）
3. 新增的十幾個色值全部收成 `--wb-*` token，樣式規則維持零色碼字面值（§7）
4. 版面演算法（treemap、週窗、閱讀狀態彙總）抽成**純函式**，用專案既有的 `scripts/checks/*.mjs` 機制做斷言（§4.3）
5. 「本週」「AI 佇列」兩個 Tab 與 Drawer 行為**不動**（Q4 已定案：三個 Tab 保留）

### 1.3 非目標與刻意的偏離

| 項目 | 決定 | 為什麼 |
| :-- | :-- | :-- |
| 深色模式 | **不做**。handoff 的 `.wb-dark` 覆寫與 `#1f2b3e` 一律不移植 | workbench.css 移植時已明確移除深色模式（檔頭註解第 3 條） |
| 「未發佈」閱讀狀態 | **拿掉**。環形圖、圖例、堆疊長條都只有三段 | PRD §7.1 Q2、workbench Q7：不引入未發佈判定 |
| 資料夾色（`FOLDER_COLOR`） | **不移植**。時間軸節點與日誌圓點一律 `--wb-blue-l`（Q1 已定案） | workbench Q6 定案資料夾不分色；prototype 的對照表也只對它的五個假資料夾有效 |
| 系列 `green` accent | 不加。三種 accent 對映既有 `.wb-acc-*` | `SeriesAccent` 型別與 `ACCENT` 表只有三種，registry schema 也只收三種 |
| 時間基準 | **維持 Q10：今天**（Q2 已定案） | 見 §5.1 |
| 列的 DOM | 「最近更新」節點與「更新日誌」卡片不是單一 `<button>`，而是容器內並排的 `<button class="wb-row-main">` 與 `<a class="wb-row-open">` | workbench Q27：連結不可包在按鈕裡、常駐「開啟」圖示 |
| 「查看全部」「前往佇列」「查看全部筆記」 | 一律是真連結 `<a>`，不是 `<button onClick={onRoute}>` | MPA；可中鍵開新分頁 |
| 系列卡「下一篇」是資料檔章節 | 按鈕直接連到 `/view/…` | prototype 退回系列頁；codebase 的 `WbChapter.href` 已解析好，workbench §8.1 也是這樣定的 |
| 寫作頻率的區間（8／12／16 週） | 元件 state，不進網址、不進偏好 | 照 prototype；workbench Q3 也說分組與搜尋字串不進網址，同一精神 |
| 舊 widget grid 的樣式 | `.wb-grid`、`.wb-wg*`、`.wb-kpi*`、`.wb-spark*`、`.wb-tagchart`、`.wb-tagrow*`、`.wb-series*`、`.wb-bar`、`.wb-row-more` **刪除** | 全 repo 只有 `DashboardWorkbench.tsx` 用到（2026-09-29 grep 確認；Sidebar 只共用 `.wb-acc-*` 與 `.wb-sb-swatch`，這兩個留） |
| `recharts` | 不用。堆疊長條與環形圖照 prototype 手寫 | prototype 本來就是 CSS flex 長條與一個 `<circle>`；引 recharts 只會讓像素對不上 |
| 標籤名前綴 `#` | 照 handoff 在方塊與 tooltip 顯示 `#標籤名` | 只是視覺；篩選連結仍用原名 |

---

## 2. 現況盤點：哪些留、哪些改、哪些走

| 檔案 | 處置 |
| :-- | :-- |
| `src/pages/index.astro` | **改**：props 多帶 `tagUseTotal`、`pending`，`tags` 從前 10 改前 11，精簡列對最新 7 篇保留 `description`（§4.1） |
| `src/components/wb/DashboardWorkbench.tsx` | **改**：保留 Tab 切換、`now`／`live`／Drawer／`useWbIndex` 這層殼；`tab === "overview"` 的 JSX 整段換成 `<Overview …/>`。「本週」「AI 佇列」分支不動 |
| `src/components/wb/dashboard/*.tsx` | **新增**：Overview 與七張卡（§3.2） |
| `src/lib/wb-dashboard.ts` | **新增**：純函式（treemap、閱讀狀態彙總、方塊文字等級）；`import type` only、無 JSX（§4.3） |
| `src/lib/wb-time.ts` | **擴充**：`weekBuckets` 的 label 改成該週**結束日**、加 `weekOf()`、`weekWindow()`、`mdShort()`（§4.2） |
| `src/styles/workbench.css` | **改**：檔頭 `:root` 加一組 `--wb-dv-*` token；刪舊 widget 規則；追加 `dv-` 規則（§7） |
| `scripts/checks/wb-dashboard.mjs` | **新增**：treemap 與週窗的斷言，掛進 `check-plugins` 的 checks 串（§4.3） |
| `WbHeader`、`NoteDrawer`、`useWbIndex`、`NoteRow` | **不動**。「本週」Tab 仍用 `NoteRow`，總覽不再用 |
| `src/components/wb/ui.tsx` 的 `Seg`／`MiniButton`／`Pill` | **不用於總覽**。handoff 是 high-fidelity，`.dv-seg`（方框 26px）與 `.wb-seg`（pill 24px）長得不一樣；`.dv-btn`、`.dv-tag` 同理。其他頁不受影響 |

---

## 3. 架構

### 3.1 殼不變

仍是 `WorkbenchLayout` 的 `bare` 模式：Header Tab、Toolbar、Body、Drawer 由同一個 island（`DashboardWorkbench`）輸出。總覽的 Body 是：

```
<div id="nc-scroll" class="wb-body dv-body" data-wb-rows>   ← id 不可拿掉（Toc 與筆記頁 script 靠它）
  <DvPatterns/>                                              ← 一次性的 SVG <pattern> defs
  <div class="dv-wrap">
    <div class="dv-row1"> KPI ｜ KPI ｜ KPI(AI) ｜ 寫作頻率 </div>
    <div class="dv-row2"> 最近更新 ｜ [系列 / 標籤分布] ｜ 更新日誌 </div>
  </div>
</div>
```

- `.wb-body` 既有的 `padding:14px 16px 20px` 由 `.dv-body` 覆寫成 `16px 20px 20px`；背景同為 `--wb-bg`
- `.wb-body` 是 `overflow:auto`。桌面上 `.dv-wrap` 剛好填滿（`min-height:100%`、Row 2 `flex:1 1 0`），Body 本身不會出現捲動列；視窗高度不足 Row 1 + 380px 時 Body 才捲動，這是 handoff 定的 `min-height:380px` 的自然結果，接受
- ≤980px 時 Row 2 高度 `auto`、卡片內捲動取消，整個 Body 捲動（handoff §響應式）

### 3.2 元件切分

```
src/components/wb/dashboard/
├── Overview.tsx        版面：Row 1／Row 2／中欄；收 rows、series、tags、pending、now、live、onSelect
├── DvCard.tsx          卡片殼（標題／副標／右側 slot）
├── KpiCard.tsx         筆記總數、本週更新（含 Ring）；AI 待生成另有 spark 背景，同檔以 variant 區分
├── Ring.tsx            84×84 環形圖；parts 三段
├── FreqChart.tsx       寫作頻率：DvSeg + 圖例 + 堆疊長條
├── Timeline.tsx        最近更新（7 篇）
├── SeriesCard.tsx      系列（最多 3 個）
├── TagTreemap.tsx      標籤分布：ResizeObserver、tooltip、hover dim
├── UpdateLog.tsx       更新日誌：週導覽、日期列、事件卡
└── patterns.tsx        DvPatterns（SVG defs）與閱讀狀態三段的常數
```

- 全部是 `DashboardWorkbench` 的子元件，不是獨立 island；沒有新的 `client:*` 掛載點
- `now`、`live`（閱讀進度版本）、`sel`／`onSelect` 由 `DashboardWorkbench` 持有並往下傳；子元件**不自己** `new Date()`、不自己監聽 `READING_EVENT`。一個 island 只有一個「現在」，各卡片才不會差一天
- 純計算（treemap、彙總）在 `src/lib/wb-dashboard.ts`，元件只做 JSX 與 DOM 量測

---

## 4. 資料層

### 4.1 island props（`index.astro`）

| prop | 來源 | 說明 |
| :-- | :-- | :-- |
| `rows` | `index.notes` 精簡列 | 已依 `updatedAt` 遞減（`getAllNotes` 的排序）。**最新 7 篇保留 `description`**，其餘清空；標記 `prompt` 一律清空（沿用 v1.0.0「Dashboard 只 inline 精簡列」的決定，只放寬時間軸要顯示的 7 筆） |
| `series` | `index.series` | 不變 |
| `tags` | `index.tags.slice(0, 11)` | 由前 10 改前 11（handoff `MAX = 11`） |
| `tagTotal` | `index.tags.length` | 副標「N 個標籤」 |
| `tagUseTotal` | `index.tags` 的 `count` 總和 | **新增**。副標「共標記 M 次」與 tooltip 百分比的分母。treemap 只拿到前 11 筆，分母得在 build 期算好 |
| `pending` | `index.pending` | **新增**。AI 待生成卡的大數字與「分布於 N 篇筆記」；不再由 island 從 `rows` 重算 |
| `workspaceLabel`、`isDev` | 不變 | |

「其他 N 個」方塊的 `N = tagTotal − 11`、值 `= tagUseTotal − 前 11 筆 count 總和`，兩者都能從上述 props 推出，不再多傳。

### 4.2 `wb-time.ts` 的擴充

| 函式 | 行為 |
| :-- | :-- |
| `weekBuckets(dates, n, now)` | **label 改為該週結束日**（handoff：`M/D` 為當週的結束日）。唯一呼叫端是 Dashboard，改語意不加參數 |
| `weekOf(s, n, now): number` | **新增**。`s` 落在往回 `n` 週的第幾格（0 = 最早、`n−1` = 本週），不在窗內回 `−1`。堆疊長條要按閱讀狀態分段，必須知道每篇落在哪一格，`weekBuckets` 只回總數不夠 |
| `weekWindow(offset, now): { start: string; end: string; days: string[] }` | **新增**。以今天為結束日、往前 `offset` 週的 7 天窗，全部是 `YYYY-MM-DD` 當地日；供更新日誌的週導覽與日期列 |
| `mdShort(s)` | **新增**。`"2026-09-08"` → `"9/8"`（不補零）。既有 `md()` 是 `"09/08"`，其他頁在用，不改 |

比較一律走 `localDay()`，不用 `new Date("YYYY-MM-DD")`（那是 UTC）。

### 4.3 `wb-dashboard.ts`（純函式）與斷言

```ts
export type ReadingKey = "done" | "reading" | "not-started";
export function countByStatus(statuses: ReadingKey[]): Record<ReadingKey, number>;
export function treemap<T extends { v: number }>(items: T[], x, y, w, h): (T & Rect)[];   // 遞迴二分，座標為 %
export function tileTier(pw: number, ph: number): "big" | "full" | "num" | "none";        // 依像素決定顯示等級
export function topTagsWithRest(tags, max, total, useTotal): TreemapItem[];               // 前 11 + 「其他」
```

- 檔案**只能 `import type`、不能有 JSX**，因為要被 `scripts/checks/wb-dashboard.mjs` 以 Node 22.6+ `--experimental-strip-types` 直接載入（與 `scripts/checks/er-derive.mjs` 同一套）
- 斷言內容：treemap 輸出的面積總和 = 100%×100%、任兩塊不重疊、每塊面積 ∝ `v`（容差 1e-6）；`k === 0` 的退化情況（第一項就超過一半）不會產生 0 寬的塊；`weekWindow(0)` 的 `end` 是今天、`days.length === 7`；`weekOf` 與 `weekBuckets` 對同一組日期的計數一致
- 掛進 `package.json` 的 `check:er` 串（或另起 `check:wb`，見 Task 87）；`check-plugins` 已會串跑 `scripts/checks/*.mjs`

---

## 5. 兩個瀏覽器端資料來源與 SSR 佔位

總覽有 7 張卡，其中 5 張依賴「今天」或 localStorage。原則沿用 workbench §5.4 與 §8.1：**伺服器算不出來的量，第一次繪製以佔位輸出，hydrate 後才填**；靠 localStorage 的東西 SSR 一律當作沒有。

### 5.1 時間基準：今天（Q10），不是最新更新日

Handoff 用「資料中最大的 `updated`」當基準，好處是 demo 資料永遠好看；壞處是站很久沒寫時，本週更新、寫作頻率、更新日誌全都會「假裝」最近有活動。workbench Q10 已定案用今天，本文維持（Q2 已定案，2026-09-29）。後果：

- 「本週更新」＝ `withinDays(updatedAt, 7, now)`（今天與前 6 天），與「本週」Tab 同一個定義
- 寫作頻率最後一格 = 今天往回 6 天到今天；很久沒寫時右側是空的，**這是對的**
- 更新日誌 `off = 0` 的窗以今天結束；「下一週」在 `off = 0` 停用

### 5.2 佔位表

| 卡片 | 依賴 | SSR／首次 render | hydrate 後 |
| :-- | :-- | :-- | :-- |
| 筆記總數 | 大數字：build 期；環形圖與圖例：localStorage | 大數字照畫；環只畫底環（`--wb-line-2`）；圖例三個標籤都在、數字為「—」 | 三段填入 |
| 本週更新 | 今天 + localStorage | 大數字「—」、環只畫底環、圖例「—」 | 全部填入 |
| AI 待生成 | build 期 | 完整畫（含 spark 背景） | 不變 |
| 寫作頻率 | 今天 + localStorage | 圖例、Y 軸「—」、基準線、日期標籤空字串；**不畫任何長條** | 長條進場（`ncGrow`） |
| 最近更新 | 無（`M/D` 直接從字串取） | 完整畫 | 不變 |
| 系列 | localStorage | `seriesProgress(refs, live=false)`：全部未開始、進度條空、按鈕不顯示（與 v1.0.0 相同） | 套真實進度與排序 |
| 標籤分布 | 無，但方塊文字等級要量容器 | 座標是 %，完整畫；文字等級以 handoff 的預設 `360×220` 估算 | `ResizeObserver` 量到後重算等級（多半只是 class 換掉） |
| 更新日誌 | 今天 | 週導覽文字「—」、日期列 7 格空 `<b>`、清單**不輸出**（連「沒有更新」文案也不出，避免閃一下） | 全部填入 |

- `live` 沿用 `DashboardWorkbench` 現有的 `useReadingVersion()`，`now` 沿用現有的 `useState<Date | null>`；不新增第二套
- 閱讀狀態變動（`READING_EVENT`、跨分頁 `storage`）→ 版本號加一 → 兩張 KPI 的環、寫作頻率的分段、系列卡一起重算。prototype 的 `ncSubscribe` 對應的就是這個

### 5.3 hydration mismatch 的邊界

- 伺服器與瀏覽器的**第一次** render 必須一模一樣：`now` 初值 `null`、`live` 初值 `false`，兩邊都畫佔位；真值只在 `useEffect` 裡 `setNow`／版本號加一之後才進 render。這是現有 `DashboardWorkbench` 的做法，七張卡都照做就不會有 hydration 警告。長條的 `<span>`、日誌清單這些「掛載後才出現」的節點也因此不參與 hydration 比對
- 反例：在 `useState(() => new Date())` 或 render 裡直接呼叫 `readingStatus()`，兩邊就會不同
- 標籤方塊的文字等級在 SSR 以 `360×220` 估：`sz` 的初值就是 `{ w: 360, h: 220 }`，不是 0（prototype 寫 `sz.w || 360`，效果相同但初值寫明比較不容易被改壞）

---

## 6. 各卡片：handoff 沒講、或與 codebase 有出入的部分

### 6.1 Row 1

**筆記總數／本週更新（`KpiCard`）**
- `parts` 三段：`done` 實心 `--wb-blue`、`reading` 金色斜紋、`not-started` 淡藍斜紋。handoff 的「未發佈數量為 0 時不顯示」規則隨四態一起消失
- 環形圖 SVG 的 `stroke` 要引用 `<pattern>`：`stroke="url(#dvp-reading)"`；`<pattern>` 內的 `<rect>` 顏色**用 `style={{ fill: "var(--wb-…)" }}`**，SVG 的 presentation attribute（`fill="var(…)"`）在部分瀏覽器不解析 CSS 變數
- 各段之間留 2px 間隙：只有一段時不留（prototype 的 `gap` 判斷保留）

**AI 待生成**
- 大數字 = `pending.markers`、「分布於 N 篇」= `pending.notes`，都來自 props
- 「前往佇列」是 `<a href={ROUTES.aiQueue}>`（`/notes?pending=1`，Q3 已定案），與 Rail 的 AI 按鈕一致
- spark 背景的漸層 `stop-color` 同樣用 `style` 寫 CSS 變數；三條 `<path>` 的 `d` 照 `pt-dash2.jsx` 原樣搬

**寫作頻率（`FreqChart`）**
- 每週的分段來源：`weekOf(r.updatedAt, n, now)` 分格 → 每格內以 `readingStatus(r.slug)` 分三段（`live=false` 時不畫）
- `top = max(2, 單週最大值)`；Y 軸三個刻度、三條虛線格線照 handoff
- 日期標籤：每隔 `ceil(n/6)` 週一個，**最後一週一定有**（prototype 的 `(n−1−i) % every === 0`）
- tooltip 用原生 `title`（照 prototype），不做浮層
- `ncGrow` 動畫：`@keyframes ncGrow` 目前不在 `workbench.css`，要新增；`prefers-reduced-motion` 下 `animation:none`（併進既有的 reduced-motion 規則列表）

### 6.2 最近更新（`Timeline`）

- 取 `rows.slice(0, 7)`；`description` 只有這 7 筆有（§4.1）
- **DOM**（workbench §8.2.1 的規則套到時間軸節點）：

```
<li>
  <span class="dv-tl-dot" style="--c: …"/>
  <div class="dv-tl-node" [class.sel]>             ← 容器，不是 button
    <button type="button" class="wb-row-main" data-wb-rowfocus aria-pressed …>  標題／路徑／日期／描述／meta  </button>
    <a class="wb-row-open" href="/notes/<slug>" aria-label="開啟筆記：<標題>">→</a>
  </div>
</li>
```

  - `rowHandlers(slug, onSelect)` 沿用（單擊 Drawer、雙擊開啟、Enter 開啟、Space 切換、⌘/Ctrl 點擊開新分頁）
  - `.dv-tl-node` 的 hover 底色、圓角、padding 從 prototype 的 button 搬到容器；`wb-row-open` 沿用既有樣式（淡灰、hover 變藍），靠右垂直置中
- 節點圓點的 `--c` 一律 `--wb-blue-l`（Q1 已定案：不分色）；`.dv-tl-dot` 與 `.dv-ev-t i` 的顏色直接寫在 CSS 規則裡，不再用 inline style 帶 `--c`
- 路徑顯示 `r.path`（真實路徑，含副檔名），不是 slug；日期 `mdShort(r.updatedAt)`
- meta 列：前 2 個標籤 pill、`+N`、最右 `AI 已生成/總數`（有待生成 → 既有 `--wb-warn-ink`，否則 `--wb-dv-ai-ok`；Q6 已定案）；沒有標記時整個 AI 段不出

### 6.3 系列（`SeriesCard`）

- 資料：`series.filter(s => s.chapters.length > 0)`，排序**維持 v1.0.0 的「進行中 → 未開始 → 已讀完，同組內依完成度」**（workbench Q15a），再取前 3 個（handoff「最多 3 個系列」，Q5 已定案）；副標「共 N 個系列」的 N 是排序前的總數。第 4 個起不顯示、也不做卡內捲動，由「查看全部」承接
- 進度條兩段：已完成實心系列色（`--gc`，由 `.wb-acc-*` 給）、閱讀中金色斜紋
- 「下一篇」按鈕 `.dv-btn` 是 `<a href={next.href}>`；資料檔章節直接連 `/view/…`
- 系列名稱是 `<a href="/series/<id>">`；同一列內名稱連結與「下一篇」連結是兩個獨立的 `<a>`，沒有巢狀
- `p.completed` 時顯示綠色勾勾「已全部閱讀」（handoff 文案；v1.0.0 是「已全部讀完」，改用 handoff 的）

### 6.4 標籤分布（`TagTreemap`）

- 輸入：`topTagsWithRest(tags, 11, tagTotal, tagUseTotal)`；「其他 N 個」的 N、值見 §4.1
- 版面：`treemap()` 純函式，座標 %；元件只負責 `ResizeObserver` + `window.resize` 量容器像素、算 `tileTier()`
- 方塊是 `<button type="button">`（照 prototype）；點擊：一般方塊 → `location.assign("/notes?tag=" + encodeURIComponent(name))`、「其他」→ `/tags`。**不做成 `<a>`** 的原因：方塊內容要依像素等級切換、且要 hover dim 其他方塊；做成連結沒有額外好處，而 `aria-label` 已含名稱與數量
  - 補一條：`⌘/Ctrl`＋點擊或中鍵 → `window.open`，與列的規則一致
- tooltip：`position:fixed`、跟隨滑鼠、右邊界 clamp `innerWidth − 180`；`z-index` 用一個新 token `--wb-z-tip: 50`（在 `.wb-main` 內、低於 Drawer 的 590/600，正確）。只在滑鼠事件上出現，鍵盤 focus 不出 tooltip，但 `aria-label` 有同樣資訊
- 配色依排名套 `DV_TILE`（前 3 固定，之後在 4–6 循環）；六組底色／字色都收成 token（§7）
- ≤980px：容器固定高 220px（handoff）；hover dim 在觸控裝置上不會發生，接受

### 6.5 更新日誌（`UpdateLog`）

- state：`off`（週位移）、`pick`（選中的 ISO 日期或 null）；切週時清 `pick`。都是元件 state，不進網址
- 窗：`weekWindow(off, now)`；`inWeek = rows.filter(r => r.updatedAt in days)`；`list = pick ? inWeek.filter(r => r.updatedAt === pick) : inWeek`
- 副標「本週／該週共更新 N 篇筆記」的 N 是 `inWeek.length`（不受 `pick` 影響，照 prototype）
- 日期格是 `<button aria-pressed={pick === s}>`；有更新的格加 `.has`（金色小點）
- 事件卡 `.dv-ev` 的 DOM 同 §6.2：容器內 `<button class="wb-row-main">` + `<a class="wb-row-open">`。第二行的系列名稱是純文字（藍色），**不是**第二個連結，避免卡片內有兩個可點目標
- 「查看全部筆記」`.dv-full` 是 `<a href="/notes">`
- 空狀態只在 `now !== null` 之後出現；v1.5.1 起是插圖式 `EmptyState`（清單加 `is-empty`、不捲），文案三種，見 [notecraft-workbench-empty-states.md](notecraft-workbench-empty-states.md) §4.1

### 6.6 空資料

| 情況 | 呈現 |
| :-- | :-- |
| 沒有任何筆記 | KPI 0；環只畫底環；寫作頻率全空；最近更新「尚無筆記」；更新日誌走既有空文案 |
| 沒有系列 | 系列卡副標「共 0 個系列」、內容一行「尚未定義系列」+ `.dv-link` 連到 `/series`（該頁有引導文案） |
| 沒有標籤 | 標籤卡副標「0 個標籤」、內容「尚無標籤」 |
| 沒有待生成 | AI 卡大數字 0、「分布於 0 篇筆記」，spark 照畫 |

不做額外的空狀態插圖。（v1.5.1 起更新日誌與 AI 佇列例外，見 [notecraft-workbench-empty-states.md](notecraft-workbench-empty-states.md)；本表其他項目不變。）

---

## 7. 樣式與 token

### 7.1 命名與位置

- class 一律沿用 prototype 的 `dv-` 前綴、名稱**完全一致**（與 workbench.css 檔頭第 4 條同一規則：各卡片實作會拿 `pt-dash2.jsx` 對照）
- `dv-` 規則全部追加在 `workbench.css`，放在被刪掉的舊 widget 規則原位置附近，加一行區塊註解「Dashboard 總覽（規格 docs/notecraft-workbench-dashboard.md §7）」
- 規則裡**不出現色碼字面值**；handoff 的每一個 hex 都要對到下表

### 7.2 新增 token（`:root`，放在「工作台專用、DS 無對應」那一段）

| token | 值 | 用途 | DS 有沒有對應 |
| :-- | :-- | :-- | :-- |
| `--wb-dv-warn-n` | `#c47a12` | AI 待生成大數字 | 無（`--orange-600` 是 `#c7641a`，色相偏紅，不採用） |
| `--wb-dv-ai-ok` | `#23855a` | 「AI x/y」全部生成 | 無（`--success-500` 是 `#2e9e6b`） |
| `--wb-dv-hover-line` | `#9dbde6` | `.dv-btn`、`.dv-ev`、`.dv-full` hover 邊框；第 5 名方塊的斜紋前景 | 無（`--blue-200` 是 `#adc8e8`） |
| `--wb-dv-tip-bg` | `#132033` | tooltip 底 | 無 |
| `--wb-dv-tip-ink-2` | `#b9c6d8` | tooltip 第二行 | 無 |
| `--wb-dv-day-on` | `#e6effa` | 日誌選中日期底 | 無（`--blue-50` 是 `#eef4fb`，偏白） |
| `--wb-dv-gold-soft` | `#fdf1de` | 閱讀中斜紋底、第 3／6 名方塊底 | 無（`--orange-50` 是 `#fdf4e6`） |
| `--wb-dv-blue-soft-fg` | `#7fa6d8` | 待開始斜紋前景 | 無 |
| `--wb-dv-blue-soft` | `#eaf1fb` | 待開始斜紋底、第 4 名方塊底 | 無 |
| `--wb-dv-blue-softer` | `#f3f7fd` | 第 5 名方塊斜紋底 | 無 |
| `--wb-dv-gold-ink` | `#7a4a08` | 第 3 名方塊文字 | 無 |
| `--wb-dv-gold-ink-2` | `#8a560c` | 第 6 名方塊文字 | 無 |
| `--wb-z-tip` | `50` | 標籤 tooltip | z-index 階梯（§4.5）新增一階，低於所有浮層 |

已有對應、直接用既有 token 的：已完成 `--wb-blue`、金色 `--wb-gold`、第 1／2 名方塊 `--wb-blue`／`--wb-blue-l`、第 5 名方塊文字 `--wb-blue-d`、底環 `--wb-line-2`、「其他」方塊 `--wb-bg`／`--wb-ink-3`、綠勾勾 `--wb-dv-ai-ok`（與 AI 完成同色，handoff 兩處都是 `#23855a`）。

Handoff 的新 hex 都沒有 DS 對應，處置與 workbench Q28 一致：**照 prototype 原值**收成 token，不強行套 DS 相近色。唯一例外是「AI x/y 有待生成」的 `#b86e0e`（對比不足，Q6 已定案改用既有 `--wb-warn-ink`），不新增 token。

### 7.3 斜紋

- CSS：`repeating-linear-gradient(135deg, var(--fg) 0 1.6px, var(--bg) 1.6px 5px)`；**方塊的第 3／5 名週期是 6px**（`pt-dash2.jsx` `DV_TILE` 寫 `1.6px 6px`），圖例、長條、進度條是 5px。照原樣，不統一
- SVG：`<pattern width=5 height=5 patternUnits="userSpaceOnUse" patternTransform="rotate(45)">` 內兩個 `<rect>`，顏色走 `style`（§6.1）。`DvPatterns` 只在總覽 Body 內輸出一次；id 固定 `dvp-reading`、`dvp-ns`，同頁不會出現第二份總覽，不會撞 id

### 7.4 捲動列

handoff 的「平時隱藏、hover 卡片才顯示細灰捲動列、`scrollbar-gutter:stable`」照搬。注意 `.wb-app ::-webkit-scrollbar` 既有的 10px 全域規則會被 `.dv-card .dv-*-list::-webkit-scrollbar{width:6px}` 以更高特異度覆寫，不用動全域規則。

### 7.5 字型與數字

Noto Sans TC 已由 layout 載入；數字一律加 `.tnum`（既有 class）。46px 大數字用 `font-weight:700`（handoff），不是舊 widget 的 900。

---

## 8. 路由與互動

| 觸發 | 去向 |
| :-- | :-- |
| 「前往佇列」 | `/notes?pending=1`（`ROUTES.aiQueue`，Q3 已定案） |
| 最近更新／系列／標籤分布的「查看全部」 | `/notes`、`/series`、`/tags` |
| 「查看全部筆記」 | `/notes` |
| 時間軸節點、日誌卡片 主區 | 單擊 Drawer（`onSelect`，`useWbIndex().load()`）、雙擊／Enter 開啟 `/notes/<slug>` |
| 時間軸節點、日誌卡片 `wb-row-open` | `/notes/<slug>` |
| 系列名稱 | `/series/<id>` |
| 「開始閱讀／繼續閱讀」 | `next.href`（`/notes/…` 或 `/view/…`） |
| 標籤方塊 | `/notes?tag=<name>`；「其他」→ `/tags` |
| 日期格 | 切換 `pick`（同格再點取消） |
| 週導覽 | `off ± 1`，`off = 0` 時「下一週」`disabled` |

- Drawer 的開關、`Escape` 堆疊、scrim 全部沿用 `DashboardWorkbench` 現有實作；總覽只是多了兩處會呼叫 `onSelect` 的列
- Tab 切換（`?tab=`）不動

---

## 9. 響應式

Handoff 的三個斷點 **1180／980／680** 直接採用（以視窗寬度算，與 prototype 相同；不改成 container query）。與殼的斷點疊加後的實際行為：

| 視窗寬 | 殼 | 總覽 |
| :-- | :-- | :-- |
| >1180 | 三欄 | Row 1 四欄、Row 2 三欄等高、卡片內捲動 |
| 981–1180 | 1100 以下 Sidebar 收成抽屜 | Row 1 三欄 + 寫作頻率整列；Row 2 不變 |
| 861–980 | 抽屜 | Row 2 兩欄、高度 auto、更新日誌整列；清單取消內捲；標籤圖固定高 220 |
| 681–860 | **Rail 變底部 Tab bar**（54px） | 同上；Body 底部要留 54px（既有規則） |
| ≤680 | 底部 Tab bar | 兩列都單欄 |

- 舊的 `@media(max-width:1180px){.wb-grid>.wb-wg{…}}` 與 800 那條隨 `.wb-grid` 一起刪
- 手機上 treemap 方塊變小，`tileTier()` 會自動退到只顯示數字或不顯示；tooltip 在觸控上不會出現，`aria-label` 仍在

---

## 10. 無障礙與鍵盤

- 兩處列（時間軸、日誌）走 §8.2.1 的完整鍵盤語意：`data-wb-rowfocus`、`aria-pressed`、Enter／Space／↑↓（既有的 `rowHandlers` 與 focus 管理，不另寫）
- 寫作頻率的圖表容器 `role="img"` + `aria-label` 一句話總結（「近 12 週每週更新：…」），欄位本身不進 tab 序；分段控制三顆 `<button aria-pressed>`
- 環形圖 `aria-hidden`，資訊由旁邊的圖例文字提供
- 標籤方塊 `aria-label="#名稱：N 篇"`；「其他」`aria-label="其他 N 個標籤：M 篇"`
- 日期格 `aria-pressed`，週導覽兩顆按鈕 `aria-label="上一週／下一週"`
- `.dv-link` 是 `<a>`，focus 樣式沿用全站的 `:focus-visible`
- `prefers-reduced-motion`：`ncGrow`、方塊的 `opacity/filter` transition 一律 `animation:none; transition:none`，併進 `workbench.css` 既有的 reduced-motion 選擇器列表
- 對比（WCAG 相對亮度算的）：`--wb-dv-tip-ink-2` on `--wb-dv-tip-bg` 約 9.4:1、`--wb-dv-gold-ink` on `--wb-dv-gold-soft` 約 6.7:1、白字 on `--wb-blue-l` 約 5.2:1，皆過 4.5:1；handoff 的 `#b86e0e` on 白約 4.0:1，10.5px 的 AI 計數不過，**改用既有 `--wb-warn-ink`（`#8a6412`，約 5.3:1）**（Q6 已定案）

---

## 11. dev／正式環境差異

總覽本身沒有 dev-only 元素。沿用：頁首「＋ 新增筆記」（`isDev`）、Drawer 內的「複製生成提示」（`isDev`）。閱讀進度、Drawer、tooltip 正式環境皆可用。

---

## 12. npx viewer 相容性

- 新目錄 `src/components/wb/dashboard/` 在 `package.json` `files` 的 `src/components/wb/` 之下，自動涵蓋；`src/lib/wb-dashboard.ts` 在 `src/lib/` 之下。**不用改 `files`**
- viewer 專案通常沒有系列、標籤少：§6.6 的空狀態要在 `tmp/notecraft-test` 上實測（Task 91）
- `/wb-index.json` 不改結構（`tagUseTotal` 在 `index.astro` 算、不進索引），viewer 的 Palette 與 Drawer 不受影響

---

## 13. 實作階段

| Task | 目標 | 前置 | 驗收 |
| :-- | :-- | :-- | :-- |
| **87** 地基 | `--wb-dv-*` token、`dv-` CSS 全部移植（含捲動列、`ncGrow`、reduced-motion）、刪舊 widget 規則；`wb-time.ts` 擴充；`wb-dashboard.ts` 純函式 + `scripts/checks/wb-dashboard.mjs`；`index.astro` 新 props；`DashboardWorkbench` 掛空的 `<Overview/>` | §15 定案 | `check:wb` 綠；總覽是四張空卡與三張空卡的骨架 |
| **88** Row 1 | `DvCard`、`KpiCard`＋`Ring`、AI 卡 spark、`FreqChart`＋`DvSeg` | 87 | 三張 KPI 與長條和 prototype 並排比對；SSR 佔位、hydrate 後填入；改閱讀狀態後環與長條即時變 |
| **89** 最近更新＋更新日誌 | `Timeline`、`UpdateLog`；兩處列的容器 DOM 與 `rowHandlers`；Drawer 連動 | 87 | 單擊 Drawer、雙擊開啟、Enter／Space、常駐開啟圖示；週導覽與日期篩選 |
| **90** 系列＋標籤分布 | `SeriesCard`、`TagTreemap`（ResizeObserver、tooltip、dim、tier） | 87 | treemap 面積與 `count` 成正比；縮放視窗方塊文字等級切換；「其他」方塊 |
| **91** 收尾 | 三段響應式、無障礙、viewer 空狀態實測、刪 `DashboardWorkbench` 舊 JSX 與無用 import、CLAUDE.md／PRD 一行更新、`npm version minor`、本文 §16／§17 回填 | 88–90 | `npx tsc --noEmit && npx astro build && npm run check-plugins` 綠；tsc 錯誤數不增加 |

```
87 ─┬─ 88 ─┐
    ├─ 89 ─┼─ 91
    └─ 90 ─┘
```

**交付節奏**：全程在 `feat/dashboard-redesign` 單一分支，依 Task 逐步 commit，91 完成後併回 `main`。每個 commit 都要能通過 `npx tsc --noEmit && npx astro build`（`tsc` 本來就有數十個既有錯誤，看的是有沒有新增）。Task 文件已展開為 [Task 87](tasks/task-87-dashboard-foundation.md)、[88](tasks/task-88-dashboard-kpi-freq.md)、[89](tasks/task-89-dashboard-timeline-log.md)、[90](tasks/task-90-dashboard-series-treemap.md)、[91](tasks/task-91-dashboard-responsive-cleanup-release.md)（2026-09-29），索引與依賴圖見 [tasks/README.md](tasks/README.md)。

---

## 14. 風險

| 風險 | 說明 | 對策 |
| :-- | :-- | :-- |
| **整頁不捲動 vs 卡片內捲動** | Row 2 的 `flex:1 1 0; min-height:0` 鏈只要有一層漏了 `min-height:0`，內層清單就撐開整頁，退化成整頁捲動而 build 全綠 | Task 88／89 驗收各附一張「視窗 900px 高、清單超出」的截圖；`.dv-row2>.dv-card`、`.dv-midcol`、`.dv-tags`、`.dv-tm` 四層都要有 |
| **hydration 警告** | 兩張 KPI 的環、寫作頻率、日誌都是「SSR 佔位、client 補齊」；若有人把 `now` 或 `readingStatus` 搬進 render 初值就會 mismatch | §5.2 表為驗收清單；dev console 零 hydration warning 才算過 |
| **treemap 退化情況** | 第一個標籤就超過一半用量時 `k === 0`；標籤只有 1 個時 `items.length === 1` | 純函式 + 斷言（§4.3） |
| **ResizeObserver 在隱藏的 Browser pane** | pane 隱藏時量到 0×0，方塊文字全部消失，容易誤判成壞掉 | 量到 0 時**不更新** `sz`（沿用估算值）；驗畫面前確認 pane 可見（專案記憶） |
| **tooltip 與 Drawer 疊層** | tooltip `position:fixed` z 50，Drawer 開著時滑過方塊仍會出現在 scrim 下方 | 正確行為（scrim 蓋住它）；不需處理 |
| **`weekBuckets` label 語意改變** | 起始日 → 結束日 | 唯一呼叫端是 Dashboard；斷言鎖住 |
| **island 變大** | 七張卡全進 `client:load` 的同一個 chunk | 無 recharts、無 d3；估 +15 KB gzip，接受 |

---

## 15. 待釐清問題

6 題已於 2026-09-29 逐題確認，結論見 §16；本文即實作依據。

**Q1 🔴 時間軸節點與日誌圓點的顏色** —— ✅ 已定案：A 不分色（2026-09-29）
- **A（建議）不分色**：節點與圓點一律 `--wb-blue-l`。理由：Q6 的精神是資料夾沒有穩定的顏色語意；viewer 使用者的資料夾名千奇百怪，任何對照表都對不上
- B 依**系列** accent：在系列裡的筆記用系列色，不在的用 `--wb-blue-l`。多一層資訊、且系列色本來就存在
- C 依頂層資料夾在 5 色裡循環（hash）。看起來最像 handoff，但同色不代表同資料夾，會誤導

**Q2 🔴 時間基準** —— ✅ 已定案：A 維持 Q10（今天）（2026-09-29）
- **A（建議）維持 Q10（今天）**。理由見 §5.1；本週更新為 0、長條右側空白是**真實**狀態
- B 照 handoff。demo 永遠好看，但「本週更新」在一個月沒寫時會顯示上個月的那週
- C 折衷：寫作頻率與更新日誌用今天，只有「本週更新」KPI 改標「最近 7 天有更新的那週」。多一種語意，不建議

**Q3 🟡 「前往佇列」去向** —— ✅ 已定案：A `/notes?pending=1`（2026-09-29）
- **A（建議）`/notes?pending=1`**（`ROUTES.aiQueue`）：與 Rail 的 AI 按鈕、Sidebar 的待生成腳註一致；prototype 的 `goRoute("ai")` 也是去佇列列表頁
- B 本頁 `?tab=ai`：不換頁，但「AI 佇列」Tab 就在頁首、一步之遙，連結的價值低

**Q4 🟡 三個 Tab 去留** —— ✅ 已定案：A 保留三個 Tab（2026-09-29）
- **A（建議）保留三個 Tab**：本次範圍只換總覽；「本週」Tab 是完整的 `NoteRow` 列（有標籤、系列 pill、AI pill），資訊密度仍高於日誌卡
- B 拿掉「本週」，留「總覽／AI 佇列」。少一份重複；`?tab=week` 要導回總覽

**Q5 🟡 系列卡只顯示前 3 個** —— ✅ 已定案：A 最多 3 個（2026-09-29）
- **A（建議）照 handoff：最多 3 個**，依 v1.0.0 的排序（進行中優先）取前 3；「查看全部」到 `/series`。中欄高度有限，`max-height:58%` 本來就塞不下第 4 個
- B 全部顯示、卡內捲動。handoff 給了 `max-height:258px` 的清單，技術上可以；但排序後前 3 個已是最該看的

**Q6 🟡 「AI x/y 有待生成」文字色 `#b86e0e` on 白約 4.0:1，10.5px 字不過 4.5:1** —— ✅ 已定案：A 改用既有 `--wb-warn-ink`（2026-09-29）
- **A（建議）改用既有 `--wb-warn-ink`（`#8a6412`，5.3:1）**，`--wb-dv-ai-warn` 不新增。與 warn pill 文字同色，站內語意一致；肉眼差異小
- B 照 handoff 原值。high-fidelity 交付；但 workbench Task 74 已為同類問題調過 pill 顏色，這裡不該開倒車

### 優先順序一覽

Q1、Q2 影響資料層與 Task 87 的純函式介面，先定；Q3–Q6 只影響單一卡片，可在 Task 88–90 動工前補定。

---

## 16. 定案紀錄

| # | 題目 | 結論 | 日期 |
| :-- | :-- | :-- | :-- |
| Q1 | 時間軸節點與日誌圓點的顏色 | **不分色**，一律 `--wb-blue-l`；`FOLDER_COLOR` 不移植、`--c` inline style 不做 | 2026-09-29 |
| Q2 | 時間基準 | **維持 workbench Q10：今天**（瀏覽器 `Date.now()`、當地日界線）。handoff 的「最新 `updated`」不採用；本週更新／寫作頻率／更新日誌三處同一基準，與「本週」Tab 定義一致 | 2026-09-29 |
| Q3 | 「前往佇列」去向 | `ROUTES.aiQueue`（`/notes?pending=1`），真連結 `<a>`；與 Rail 一致 | 2026-09-29 |
| Q4 | 三個 Tab 去留 | **保留**「總覽／本週／AI 佇列」，`?tab=` 行為不動；本次只換總覽 Body。「本週」與「更新日誌」的重複接受（前者是完整 `NoteRow` 列）。**2026-09-30 起「本週」Tab 由「更新月曆」取代**（notecraftapp v1.5.0），見 [notecraft-workbench-calendar.md](notecraft-workbench-calendar.md) | 2026-09-29 |
| Q5 | 系列卡顯示數 | **最多 3 個**：依 v1.0.0 排序（進行中 → 未開始 → 已讀完）取前 3；「查看全部」到 `/series` | 2026-09-29 |
| Q6 | AI 待生成文字色對比 | **改用既有 `--wb-warn-ink`**（約 5.3:1），不新增 `--wb-dv-ai-warn`；與 warn pill 同色 | 2026-09-29 |

---

## 17. 實作後回填

Task 87–91 已全部實作（2026-09-29，隨 notecraftapp v1.4.0），逐 Task commit 於 `feat/dashboard-redesign`。

| 待驗證項 | 結論 |
| :-- | :-- |
| SSR 佔位 | 正式 build 的 `index.html`：無 `dv-stack`、無 `dv-ev`（長條與日誌清單不輸出）、本週更新與圖例為「—」、環只有底環；時間軸 7 個節點與 treemap 方塊完整輸出。與 §5.2 表一致 |
| hydration 警告 | dev console 0 筆（含切週、日篩選、開 Drawer、改閱讀狀態後） |
| 閱讀狀態即時 | 另寫 localStorage 並 dispatch `nc-reading-changed` 後，兩個環、圖例數字、長條分段、系列卡同幀更新 |
| viewer 專案 | `tmp/notecraft-test`（有系列、有 plugin）與一個只有 3 篇、無系列無標籤的暫存資料夾各 build 一次：空狀態文案正確、`grep -r "$HOME" dist/` 0 筆、treemap 在 3 塊以內仍填滿 |
| 視窗高度不足 | 1400×900 時 Body 無捲動列、三張清單卡各自內捲；高度低於 Row 1 + 380 時 Body 整體捲動（§3.1 預期） |
| 響應式 | 1100：Row 1 三欄＋寫作頻率整列；900：Row 2 兩欄、日誌整列、treemap 220 高；760：底部 Tab bar；600：單欄、無水平捲動 |

### 實作中新增的決定

| 項目 | 決定 | 為什麼 |
| :-- | :-- | :-- |
| **閱讀狀態三段用 class 不用 inline background** | `.dv-rs-done`／`.dv-rs-reading`／`.dv-rs-ns` 三條規則放 CSS，元件只掛 class | prototype 是把 hatch 字串塞進 `style`；改成 class 才守得住「規則零色碼」 |
| **treemap 方塊配色同樣是 class** | `.dv-tile-0`…`.dv-tile-5`、`.dv-tile-rest` | 同上；`tileStyleIndex()` 只回索引 |
| **`readingVersion` 往下傳** | `DashboardWorkbench` 的 `useReadingVersion()` 回傳值直接當 prop，卡片以它為 memo 依賴 | 規格只寫 `live`；localStorage 變了 `rows` 不會變，沒有版本號 memo 不會重算 |
| **本週更新的環在 `now` 為 null 時也當 `live=false`** | `live && week !== null` | 「本週」的集合本身要靠今天，SSR 沒有集合就沒有環 |
| **`.dv-days` 的 `<b>` 給 `min-height:1.2em`** | SSR 日期格是空的，撐住高度避免 hydrate 後跳一下 | §5.2 說「7 格空 `<b>`」，沒說高度 |
| **日誌卡標題多包一層 `<span>`** | `.dv-ev-t>span{min-width:0;overflow:hidden;text-overflow:ellipsis}` | prototype 把文字直接放 flex 容器裡，長標題是被裁掉而不是省略號 |
| **`DashboardWorkbench` 的死碼在 Task 87 就清** | `Widget`、`SeriesProgressWidget`、`weekBuckets`／`withinDays(30)`／`maxTag` | 規格排在 Task 91；留著只會讓 tsc 多幾個未使用警告，沒有理由等 |
| **`.dv-tile` 的中鍵** | `onAuxClick` 攔 `button === 1` 開新分頁 | 與列的規則一致（規格 §6.4 只提 ⌘/Ctrl） |
| **check 串進 `check-plugins`、另加 `check:wb`** | `scripts/checks/wb-dashboard.mjs` 自動被 `check-plugins` 串跑；`npm run check:wb` 單跑秒級 | 與 `check:er` 同一做法 |

### 與設計稿的最終偏離

§1.3 的清單全數照做，沒有新增偏離。treemap 在 1400×900 的中欄實際高度約 120px（系列卡吃掉 58%），小塊自動退到只顯示數字，與 prototype 相同的取捨。

### 仍未做的

- 沒有跑 axe：本輪以 `read_page`／DOM 檢查 `aria-*` 與巢狀，對比數字是算的不是掃的
- `README.md` 的儀表板截圖（`docs/screenshots/dashboard.png`）尚未換成新版
