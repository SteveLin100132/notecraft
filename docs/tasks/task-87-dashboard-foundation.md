# Task 87 — Dashboard 總覽地基：token、`dv-` 樣式、時間工具、純函式與斷言、island props

> 規格 [notecraft-workbench-dashboard.md](../notecraft-workbench-dashboard.md) §3、§4、§7、§9；Q1、Q2、Q6 定案（§16）。
> 設計交付 [design_handoff_workbench_dashboard](../prototype/design_handoff_workbench_dashboard/) README；視覺定稿以 `source/pt-dash2.css` 為準。
> 無前置依賴，**本批第一個做**；Task 88–90 都靠它。

## 為什麼要有這一步

七張卡共用同一套 `dv-` class、同一組閱讀狀態顏色、同一個「今天」。先把樣式、token、純函式一次到位並用斷言鎖住，
之後三個 Task 只管各自卡片的 JSX 與資料，不必邊做邊補 CSS、也不會各自算出不同的週窗。

## 範圍

### 1. `src/styles/workbench.css`：token

`:root` 的「工作台專用、DS 無對應」區段追加（規格 §7.2 的表，**照 handoff 原值**，Q28 精神）：

```css
  /* ── Dashboard 總覽（規格 docs/notecraft-workbench-dashboard.md §7.2）── */
  --wb-dv-warn-n: #c47a12;        /* AI 待生成大數字 */
  --wb-dv-ai-ok: #23855a;         /* AI x/y 全部生成；系列卡綠勾勾 */
  --wb-dv-hover-line: #9dbde6;    /* .dv-btn／.dv-ev／.dv-full hover 邊框；第 5 名方塊斜紋前景 */
  --wb-dv-tip-bg: #132033;        /* 標籤 tooltip 底 */
  --wb-dv-tip-ink-2: #b9c6d8;     /* tooltip 第二行 */
  --wb-dv-day-on: #e6effa;        /* 日誌選中日期底 */
  --wb-dv-gold-soft: #fdf1de;     /* 閱讀中斜紋底；第 3／6 名方塊底 */
  --wb-dv-blue-soft-fg: #7fa6d8;  /* 待開始斜紋前景 */
  --wb-dv-blue-soft: #eaf1fb;     /* 待開始斜紋底；第 4 名方塊底 */
  --wb-dv-blue-softer: #f3f7fd;   /* 第 5 名方塊斜紋底 */
  --wb-dv-gold-ink: #7a4a08;      /* 第 3 名方塊文字 */
  --wb-dv-gold-ink-2: #8a560c;    /* 第 6 名方塊文字 */
```

z-index 階梯加 `--wb-z-tip: 50;`（標籤 tooltip；在 `.wb-main` 內、低於所有浮層）。

**不新增** `--wb-dv-ai-warn`：「AI x/y 有待生成」改用既有 `--wb-warn-ink`（Q6）。

### 2. `workbench.css`：刪舊 widget 規則、移植 `dv-` 規則

刪除（2026-09-29 grep 確認只有 `DashboardWorkbench.tsx` 在用；刪之前再 grep 一次）：

| 規則 | 備註 |
| --- | --- |
| `.wb-grid` 與它的兩條 `@media`（1180／800） | |
| `.wb-wg`、`.wb-wg-h`、`.wb-wg-t`、`.wb-wg-m`、`.wb-wg-b` | |
| `.wb-kpi`、`.wb-kpi-n`、`.wb-kpi-u`、`.wb-kpi-row`、`.wb-kpi-side`、`.wb-kpi-sub` 及其 `b` 變體 | |
| `.wb-bar`、`.wb-bar.lg`、`.wb-bar i` | reduced-motion 列表裡的 `.wb-bar i` 一併移除 |
| `.wb-spark*` | reduced-motion 列表裡的 `.wb-spark-b` 一併移除 |
| `.wb-series-list`、`.wb-series`、`.wb-series-top`、`.wb-series-n`、`.wb-series-c`、`.wb-series-next`、`.wb-series-item`、`.wb-series-foot` 及其子規則 | |
| `.wb-tagchart`、`.wb-tagrow*`、`a.wb-tagrow` 的 `text-decoration:none` | 第 440 行那條長選擇器裡的 `a.wb-series,a.wb-tagrow` 也拿掉；reduced-motion 的 `.wb-tagrow-track i` 一併移除 |
| `.wb-row-more` | |

**保留**：`.wb-acc-*`、`.wb-sb-swatch`（Sidebar 在用）、`.wb-row-main`、`.wb-row-open`、`.wb-empty`、`.wb-skel`。

移植 `source/pt-dash2.css`（125 行）到被刪規則的原位置，區塊註解「Dashboard 總覽（規格 docs/notecraft-workbench-dashboard.md §7）」。**數值不調整**，但：

| 要做的事 | 說明 |
| --- | --- |
| **零色碼** | 每個 hex 換成 §1 的 token；`#fff` 換 `--wb-panel`；`rgba(19,32,51,.18)` 收成 `--wb-a-tip-18`（加進半透明色那段） |
| **`.wb-dark .dv-days button.on` 不搬** | 不做深色模式（規格 §1.3） |
| **斜紋** | `repeating-linear-gradient(135deg,var(--wb-gold) 0 1.6px,var(--wb-dv-gold-soft) 1.6px 5px)` 這類寫法；方塊第 3／5 名週期 **6px**、其餘 5px，照原樣 |
| **`@keyframes ncGrow`** | prototype 的 CSS 沒附這段（動畫定義在它的殼裡）；補 `@keyframes ncGrow{from{transform:scaleY(0)}to{transform:scaleY(1)}}` |
| **reduced-motion** | 既有的 `@media(prefers-reduced-motion:reduce)` 列表加 `.dv-stack`（`animation:none`）與 `.dv-tile`（`transition:none`） |
| **`.dv-body`** | 覆寫 `.wb-body` 的 padding 為 `16px 20px 20px`；其餘（`overflow:auto`、`--wb-bg`）沿用 |
| **節點與圓點顏色** | `.dv-tl-dot{border-color:var(--wb-blue-l)}`、`.dv-ev-t i{background:var(--wb-blue-l)}` 直接寫死（Q1：不分色），不留 `--c` |
| **多行列的 `.wb-row-main`** | `.dv-tl-node>.wb-row-main,.dv-ev>.wb-row-main{height:auto;flex-direction:column;align-items:stretch;gap:2px}`；既有 `.wb-row-main` 是單行列用的 `height:100%;align-items:center` |
| **捲動列** | `.dv-card .dv-*-list` 的隱藏／hover 顯示規則照搬；`::-webkit-scrollbar{width:6px}` 特異度高於 `.wb-app ::-webkit-scrollbar`，不動全域 |

響應式三條 `@media`（1180／980／680）照搬。

### 3. `src/lib/wb-time.ts`

| 函式 | 改動 |
| --- | --- |
| `weekBuckets(dates, n, now)` | `label` 改為該週**結束日**的 `M/D`（不補零）。唯一呼叫端是 Dashboard |
| `weekOf(s, n, now): number` | **新增**。`s` 在往回 `n` 週的第幾格（0 = 最早、`n−1` = 本週）；不在窗內或日期不合法 → `−1`。與 `weekBuckets` 的分格一致（同一個 `daysBetween` 除以 7） |
| `weekWindow(offset, now): { start: string; end: string; days: string[] }` | **新增**。以今天為結束日、往前 `offset` 週的 7 天；三者皆 `YYYY-MM-DD`（當地日） |
| `mdShort(s)` | **新增**。`"2026-09-08"` → `"9/8"` |

一律經 `localDay()`；不新增 `Date` 解析。

### 4. `src/lib/wb-dashboard.ts`（新增，純函式）

```ts
import type { WbTagStat } from "@/lib/wb-types";
export type ReadingKey = "done" | "reading" | "not-started";
export type Rect = { x: number; y: number; w: number; h: number };
export type TreemapItem = { k: string; l?: string; v: number; rest?: boolean };

export function countByStatus(statuses: ReadingKey[]): Record<ReadingKey, number>;
/** 遞迴二分 treemap（pt-dash2.jsx dvTreemap 原樣）；輸入依 v 遞減，座標為 % */
export function treemap<T extends { v: number }>(items: T[], x: number, y: number, w: number, h: number): (T & Rect)[];
/** 依方塊實際像素決定顯示等級：≥120×84 big、≥60×42 full、≥24×22 num、否則 none */
export function tileTier(pw: number, ph: number): "big" | "full" | "num" | "none";
/** 前 max 名 + 「其他 N 個」（值 = useTotal − 前 max 名總和；N = total − max；N ≤ 0 時不加） */
export function topTagsWithRest(tags: WbTagStat[], max: number, total: number, useTotal: number): TreemapItem[];
/** 依排名取方塊配色索引：0–2 固定，之後 3 + (i % 3)；rest 回 −1 */
export function tileStyleIndex(i: number, rest: boolean): number;
```

**只能 `import type`、不能有 JSX**（要被 Node `--experimental-strip-types` 直接載入）。

### 5. `scripts/checks/wb-dashboard.mjs`（新增）

比照 `app-strip-markdown.mjs` 的寫法（`assert/strict`、`✓／✗` 輸出、失敗 `process.exit(1)`）。`check-plugins` 會自動串跑 `scripts/checks/*.mjs`；另在 `package.json` 加 `"check:wb"` 單跑這支。

| 斷言 | 內容 |
| --- | --- |
| treemap 面積守恆 | 任意 1–12 項輸入，`Σ w·h = 100·100`（容差 1e-6） |
| treemap 不重疊 | 任兩塊矩形交集面積為 0 |
| treemap 面積成比例 | 每塊 `w·h / 10000 ≈ v / Σv` |
| 退化情況 | 第一項超過一半（`k === 0` 分支）不產生 0 寬塊；單一項填滿；空陣列回空 |
| `tileTier` 邊界 | `(120,84)` big、`(119,84)` full、`(60,42)` full、`(59,42)` num、`(24,22)` num、`(23,22)` none |
| `topTagsWithRest` | 12 個標籤 → 11 + rest（值與 N 正確）；11 個 → 無 rest；rest 值為 0 時仍不加 |
| `tileStyleIndex` | `[0,1,2,3,4,5,3,4,5]`（i = 0…8）；rest → −1 |
| `weekWindow(0, now)` | `end` 是 `now` 的當地日、`days.length === 7`、`days[6] === end` |
| `weekOf` 與 `weekBuckets` 一致 | 固定 `now` 與一組日期，兩者每格計數相同；窗外 → −1 |
| `weekBuckets` label | 最後一格 label 是今天的 `M/D` |
| `mdShort` | `"2026-09-08"` → `"9/8"`、`"2026-12-31"` → `"12/31"` |

`wb-time.ts` 目前無 Node 依賴、無 JSX，可直接被載入；若它 import 了什麼進不了 strip-types 的東西，把用到的函式搬進 `wb-dashboard.ts` 而不是繞開斷言。

### 6. `src/pages/index.astro`：props

| prop | 值 |
| --- | --- |
| `rows` | 精簡列；**最新 7 篇保留 `description`**（`rows` 已依 `updatedAt` 遞減），其餘清空；`markers[].prompt` 一律清空、`promptPath` 剝掉（同現況） |
| `tags` | `index.tags.slice(0, 11)` |
| `tagTotal` | `index.tags.length` |
| `tagUseTotal` | **新增**：`index.tags.reduce((a, t) => a + t.count, 0)` |
| `pending` | **新增**：`index.pending` |

`DashboardWorkbench` 的 props 型別同步；`stats.pending`／`pendingRows` 的自算保留給「AI 佇列」Tab 用，總覽改用 `pending` prop。

### 7. `DashboardWorkbench.tsx`：接空殼

- `tab === "overview"` 分支換成 `<Overview rows series tags tagTotal tagUseTotal pending now live sel onSelect />`
- 新增 `src/components/wb/dashboard/Overview.tsx`（`.dv-body`／`DvPatterns`／`.dv-wrap`／`.dv-row1`／`.dv-row2`／`.dv-midcol` 的骨架）與 `DvCard.tsx`、`patterns.tsx`（`DvPatterns` 與閱讀狀態三段常數 `DV_RS`：`k`／`l`／CSS 底色字串／SVG `url(#…)`）
- 七個卡位先放 `<DvCard title="…">` 空卡；Body 必須是 `<div id="nc-scroll" className="wb-body dv-body" data-wb-rows>`
- 舊的 `Widget`、`SeriesProgressWidget` 與總覽 JSX 先留著不刪（Task 91 清），但已不被 render

## 要改的既有檔案

`src/styles/workbench.css`、`src/lib/wb-time.ts`、`src/pages/index.astro`、`src/components/wb/DashboardWorkbench.tsx`、`package.json`（`check:wb`）。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 零色碼 | — | `grep -nE '#[0-9a-f]{3,8}\b|rgba\(' src/styles/workbench.css` 排除 `:root` 區段 | 0 筆 |
| 舊規則已清 | — | grep `wb-grid\|wb-wg\|wb-kpi\|wb-spark\|wb-tagrow\|wb-series-\|wb-bar\b\|wb-row-more` 於 `src/` | 只剩 `DashboardWorkbench.tsx` 裡尚未刪的舊 JSX（Task 91 清） |
| 斷言 | — | `npm run check:wb` | 全綠；`npm run check-plugins` 也會跑到它 |
| 骨架 | dev 開 `/` | — | 上列四張空卡、下列三欄（中欄兩張）；`#nc-scroll` 在；視窗 1400×900 Body 不出現捲動列 |
| 響應式骨架 | 視窗 1100／900／600 | — | Row 1 三欄＋整列、Row 2 兩欄、單欄 |
| props | dev 看 island props | — | 前 7 筆有 `description`、第 8 筆起為空；`tagUseTotal` 等於 `/tags` 頁所有計數總和 |
| build | — | `npx tsc --noEmit && npx astro build` | 通過；tsc 錯誤數不增加 |

## 依賴

無。

## 實作記錄（2026-09-29）

- token、`dv-` 規則、`ncGrow`、reduced-motion 照 §1–§2 做；閱讀狀態三段與 treemap 六組配色改成 class（`.dv-rs-*`、`.dv-tile-*`），不用 inline `background`，規則零色碼（`awk` 排除 `:root` 後 grep hex／rgba 為 0 筆）
- 舊 widget 規則連同 860px 那條殘留的 `.wb-grid` 覆寫一起刪；`DashboardWorkbench` 的 `Widget`／`SeriesProgressWidget`／`weekBuckets` 等死碼在本 Task 就清掉（不等 Task 91）
- `wb-time.ts`：`weekBuckets` 內部改呼叫 `weekOf`，兩者分格由斷言鎖住；`weekWindow` 用當地日建構，跨月／跨年由 `Date` 自行處理
- `scripts/checks/wb-dashboard.mjs` 11 組斷言全綠；`npm run check:wb` 需 Node 22.6+（shell 預設的舊 Node 會報 `bad option`，用 nvm 的 22.16）
- tsc 錯誤數 48 → 48（基準不變）；`astro build` 55 頁通過
