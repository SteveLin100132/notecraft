# Task 88 — Dashboard Row 1：三張 KPI 卡與寫作頻率

> 規格 [notecraft-workbench-dashboard.md](../notecraft-workbench-dashboard.md) §5（SSR 佔位）、§6.1；Q2、Q3、Q6 定案。
> 設計交付 README §1–§3；原始碼 `source/pt-dash2.jsx` 的 `DvStatKpi`、`DvRing`、`DvFreq`、`DvSeg` 與 `PtOverview` 裡的 AI 卡。
> 依賴 [Task 87](task-87-dashboard-foundation.md)。可與 Task 89、90 並行。

## 範圍

### 1. `Ring.tsx`

- 84×84、`R = 42 − 8`、`strokeWidth 12`、底環 `--wb-line-2`、從 12 點鐘開始（`rotate(-90)`）
- `parts` 三段（`done`／`reading`／`not-started`），值為 0 的段跳過；**多於一段時**每段尾端留 2px 間隙
- `stroke` 引用 `DvPatterns` 的 `url(#dvp-reading)`／`url(#dvp-ns)`；`done` 用 `var(--wb-blue)`
- `<pattern>` 內 `<rect>` 的顏色**用 `style={{ fill: "var(--wb-…)" }}`**，不用 `fill="var(…)"` 屬性
- `aria-hidden`；資訊由圖例提供

### 2. `KpiCard.tsx`（筆記總數、本週更新）

| 元素 | 值 | SSR／`live=false`／`now=null` |
| --- | --- | --- |
| 大數字 `.dv-kpi-n` | 筆記總數：`rows.length`；本週更新：`rows.filter(r => withinDays(r.updatedAt, 7, now)).length` | 總數照畫；本週「—」 |
| 環 | `countByStatus(rows.map(r => readingStatus(r.slug)))` | 只畫底環 |
| 圖例 `.dv-kpi-rs` | 三段固定都顯示（沒有「未發佈」那條規則） | 標籤在、數字「—」 |

閱讀狀態只在 `live` 為 true 時讀 `readingStatus()`；版本號變動時重算（由 `DashboardWorkbench` 傳下來的 `live`／版本號驅動，卡片內**不**自己監聽事件）。

### 3. AI 待生成卡

- 同一個 `KpiCard` 以 `variant="ai"` 區分，或獨立小元件；`className="dv-kpi dv-kpi-ai"`
- 大數字 `pending.markers`（`.warn` → `--wb-dv-warn-n`）；底部「分布於 **`pending.notes`** 篇筆記」；全部 build 期值，SSR 完整畫
- 標頭右上「前往佇列」：`<a className="dv-link" href={ROUTES.aiQueue}>`（Q3）
- spark 背景：三個 `<path d>` 與虛線格線照 `pt-dash2.jsx` 原樣；`stop-color` 用 `style`，`stroke="var(--wb-line)"` 的格線亦用 `style`；`mask` 與 `linearGradient` 的 id（`dvg-ai`、`dvg-fade`、`dvm-fade`）保留

### 4. `FreqChart.tsx` + `DvSeg`

- `range` state：`8 | 12 | 16`，預設 12；`.dv-seg` 三顆 `<button type="button" aria-pressed>`；不進網址、不進偏好
- 分格：`weekOf(r.updatedAt, n, now)`；每格內 `countByStatus(readingStatus)` 三段；`top = max(2, 單週最大值)`
- 堆疊：`.dv-stack` `flex-direction:column-reverse`，各段 `flex: v`、最小 2px；`height = tot/top`
- Y 軸 `top`／`round(top/2)`／`0`；虛線格線 0／50／100%；基準線在 `padding-bottom:18px` 上方
- 日期標籤：`every = ceil(n/6)`，`(n−1−i) % every === 0` 才顯示；label 來自 `weekBuckets` 的結束日
- 原生 `title`：「M/D 當週更新 N 篇：已完成 x、閱讀中 y、待開始 z」（值為 0 的段省略）
- 容器 `role="img"` + `aria-label`（「近 12 週每週更新：9/8 3 篇、…」），`now=null` 時「載入中」
- **SSR／`now=null`**：圖例照畫、Y 軸「—」、`.dv-col` 不渲染 `.dv-stack`、`<em>` 為空字串
- 進場動畫由 CSS `ncGrow` 負責（Task 87 已加）；不寫 JS 動畫

### 5. `Overview.tsx`

把 Task 87 的四張空卡換成實體：`<KpiCard label="筆記總數" …/>`、`<KpiCard label="本週更新" …/>`、AI 卡、`<FreqChart …/>`。

## 要改的既有檔案

`src/components/wb/dashboard/Overview.tsx`。新增 `Ring.tsx`、`KpiCard.tsx`、`FreqChart.tsx`（含 `DvSeg`）。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 並排比對 | prototype 開在旁邊 | 視窗 1400 | 四張卡的字級、間距、環的粗細、長條寬與圓角一致 |
| 佔位 | 停用 JS（或看 view-source） | — | 本週「—」、環只有底環、圖例「—」、長條區無長條 |
| 無 hydration 警告 | dev | 開 `/` 看 console | 0 筆 |
| 閱讀狀態即時 | 另開分頁把某篇標「已完成」 | 回到 `/` | 兩個環與該週長條的分段立即變 |
| 本週定義 | 系統日期改到最新筆記 10 天後 | 重整 | 本週更新 0、環只有底環；長條最右 1 格空 |
| 區間切換 | 點「16 週」 | — | 16 根、標籤每 3 週一個、最後一根有標籤 |
| 前往佇列 | 點 | — | 進 `/notes?pending=1`；中鍵開新分頁 |
| 無待生成 | 所有標記已生成 | — | AI 卡 0、「分布於 0 篇筆記」、spark 照畫 |
| reduced-motion | 系統設定開啟 | 重整 | 長條無進場動畫 |
| 對比 | — | 檢查「AI 待生成」大數字與圖例 | 大數字 46px 用 `--wb-dv-warn-n`（大字可過 3:1） |

## 依賴

Task 87。

## 實作記錄（2026-09-29）

- `Ring.tsx`／`KpiCard.tsx`（`StatKpi`、`AiKpi`、`useReadingParts`）／`FreqChart.tsx`（含 `DvSeg`）
- SVG 的 `<pattern>` 與 spark 漸層顏色一律 `style={{ fill／stopColor／stroke: "var(--wb-…)" }}`
- 「本週更新」的環在 `now` 為 null 時也視為 `live=false`（集合本身靠今天）；`readingVersion` 當 memo 依賴，改閱讀狀態後環、圖例、長條分段同幀更新（實測：寫 localStorage + dispatch 事件後 ring 出現 3 個 circle、圖例「已完成 1」）
- 與 prototype 並排：46px 大數字、環 12px、長條 20px 頂圓角 3px、日期每 2 週一個（12 週）一致；dev console 無 hydration 警告
