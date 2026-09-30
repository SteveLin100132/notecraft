# Task 92 — 更新月曆地基：token、`cal-` 樣式、純函式與斷言、Tab 改名、空殼

> 規格 [notecraft-workbench-calendar.md](../notecraft-workbench-calendar.md) §2、§3、§4、§5、§7、§9；Q1、Q2、Q5 定案（§16）。
> 設計交付 [design_handoff_update_calendar](../prototype/design_handoff_update_calendar/) README；視覺定稿以 `source/pt-cal.css` 為準。
> 無前置依賴，**本批第一個做**；Task 93、94 都靠它。

## 為什麼要有這一步

月檢視與週檢視共用同一個工具列、同一套 `cal-` class、同一組日期演算法與同一個「今天」。先把樣式、token、純函式一次到位並用斷言鎖住（週數 4／5／6、跨月跨年、`setMonth` 溢位），之後兩個 Task 只管各自的 JSX，不會各自算出不同的週。

## 範圍

### 1. `src/styles/workbench.css`：token

`:root` 的 `--wb-dv-*` 區段之後追加（規格 §7.2，**照 handoff 原值**，Q28 精神）：

```css
  /* ── Dashboard 更新月曆（規格 docs/notecraft-workbench-calendar.md §7.2）── */
  --wb-cal-cell: #f8fafc;         /* 當月日期格底 */
  --wb-cal-cell-out: #f4f7fb;     /* 前後月補位格底 */
  --wb-cal-thiswk: #e6eef9;       /* 月檢視當週底 */
  --wb-cal-thiswk-line: #d3e0f2;  /* 當週框線 */
```

半透明色那段補 `--wb-a-blue-12: rgba(27,79,156,.12);`（`.cal-dot` inset 描邊、`.cal-note:hover` 陰影）。

**不新增**閱讀狀態相關 token：三段沿用 `.dv-rs-done`／`.dv-rs-reading`／`.dv-rs-ns`。「未發佈」的 `#c3cad6`／`#f3f5f8` 不收。

### 2. `workbench.css`：移植 `cal-` 規則

移植 `source/pt-cal.css`（32 行）到總覽 `dv-` 區塊之後、**Task 74 那段 `@media(max-width:860px){.wb-body{padding-bottom:…}}` 之前**（同特異度，手機底部留白要贏；規格 §7.1）。區塊註解「Dashboard 更新月曆（規格 docs/notecraft-workbench-calendar.md §7）」。**數值不調整**，但：

| 要做的事 | 說明 |
| --- | --- |
| **零色碼** | `#f8fafc`／`#f4f7fb`／`#e6eef9`／`#d3e0f2` → 上表 token；`#fff` → `--wb-panel`／`--wb-on`（今天膠囊字）；`rgba(27,79,156,.12)` → `--wb-a-blue-12`、`.06` → 既有 `--wb-a-blue-06` |
| **小字顏色（Q5）** | `.cal-wd`、`.cal-cell-h`（含 `span`）、`.cal-cell.out .cal-cell-h b`、`.cal-note-st` 的 `--wb-ink-3` 改 **`--wb-muted-ink`**；`.cal-title span`（副標，白底）維持 `--wb-ink-3` |
| **不移植** | `.cal-more`（月檢視沒有「還有 N 篇」）；`.cal-grid.wk .cal-cell.thiswk` 還原規則（週檢視根本不加 `.thiswk`） |
| **`.cal-note` 容器化（規格 §6.5）** | `.cal-note` 改 `display:flex;align-items:flex-start;gap:4px`（padding／邊框／陰影／hover 上移留在容器）；新增 `.cal-note>.wb-row-main{flex:1;min-width:0;height:auto;display:flex;flex-direction:column;align-items:stretch;gap:4px;padding:0;text-align:left}`、`.cal-note>.wb-row-open{align-self:flex-start}` |
| **選中態** | `.cal-note.sel{background:var(--wb-a-blue-08)}`；`.cal-dot.sel{box-shadow:0 0 0 2px var(--wb-panel),0 0 0 3px var(--wb-blue)}` |
| **色塊底色走 class** | `.cal-dot` 本身不設 `background`，由 `.dv-rs-*` 給；`.cal-note-st i` 同理，只給 34×8 全圓角與 `flex:none` |
| **捲動列** | `.cal-grid.wk .cal-cell` 加進總覽「平時隱藏、hover 才顯示」那組（`scrollbar-width:thin;scrollbar-color:transparent transparent;scrollbar-gutter:stable`，hover `var(--wb-line)`，`::-webkit-scrollbar{width:6px}`） |
| **reduced-motion** | 既有 `@media(prefers-reduced-motion:reduce)` 列表加 `.cal-dot`、`.cal-note`（`transition:none`） |
| **`.cal-body`** | 覆寫 `.wb-body` 的 padding 為 `14px 20px 20px`；`overflow:auto`、`--wb-bg` 沿用 |
| **`aria-current`** | `.cal-cell[aria-current="date"] .cal-cell-h b` 與 `.cal-cell.today .cal-cell-h b` 同一條規則（元件兩者都掛） |

響應式 `@media(max-width:900px)` 那條照搬。

### 3. `src/lib/wb-calendar.ts`（新增，純函式）

```ts
export type CalView = "month" | "week";
export type CalWeek = { start: string; end: string; days: string[] };
export type CalMonth = { year: number; month: number; weeks: 4 | 5 | 6; days: string[]; first: string; last: string };

export function calWeekOf(iso: string): CalWeek;                                 // iso 所在日曆週（週日→週六）
export function calMonthGrid(iso: string): CalMonth;                             // 當月 1 日所在週的週日起、weeks×7 天
export function calShift(view: CalView, anchor: string, dir: -1 | 1): string;   // 月：new Date(y, m+dir, 1)；週：±7 天
export function calTitle(view: CalView, anchor: string): string;                // 「2026 年 9 月」／「2026 年 9/27 – 10/3」（年取週日那天）
export function calCellLabel(iso: string, firstCell: boolean): string;          // 1 日或首格 → 「M/D」；否則「D」
export function calInMonth(iso: string, anchor: string): boolean;               // 同年月
export function groupByDay<T extends { updatedAt: string }>(rows: T[]): Record<string, T[]>;  // key = updatedAt 前 10 碼
```

- **只能 `import type`、不能有 JSX**，**不 import `wb-time.ts`**（規格 §4.2）：需要的 `iso()`／`localDay()` 檔內自己寫
- 日期字串進、字串出；`Date` 只在函式內短暫存在
- `weeks = Math.ceil((first.getDay() + daysInMonth) / 7)`，回傳型別收成 `4 | 5 | 6`

### 4. `scripts/checks/wb-calendar.mjs`（新增）

比照 `wb-dashboard.mjs`（`assert/strict`、`✓／✗`、失敗 `process.exit(1)`）。`package.json` 的 `check:wb` 改為串跑 `wb-dashboard.mjs && wb-calendar.mjs`；`check-plugins` 會自動跑到。

| 斷言 | 內容 |
| --- | --- |
| 2026-02 | `calMonthGrid("2026-02-10")`：`weeks === 4`、`days[0] === "2026-02-01"`、`days[27] === "2026-02-28"`、`first`／`last` 正確 |
| 2026-08 | `weeks === 6`、`days[0] === "2026-07-26"`、`days[41] === "2026-09-05"` |
| 2026-09 | `weeks === 5`、`days[0] === "2026-08-30"`、`days[2] === "2026-09-01"` |
| 連續性 | 上述三組 + 2026-10、2026-11、2027-05：`days.length === weeks*7`、`days[0]` 是週日、相鄰兩天差 1 天、`weeks ∈ {4,5,6}` |
| 日曆週 | `calWeekOf("2026-09-29")` → `2026-09-27 … 2026-10-03`；`calWeekOf("2026-12-30")` → `2026-12-27 … 2027-01-02`；`days.length === 7`、`days[0]` 週日 |
| 翻月 | `calShift("month","2026-01-31",1) === "2026-02-01"`；`calShift("month","2026-03-01",-1) === "2026-02-01"`；`calShift("month","2026-12-15",1) === "2027-01-01"` |
| 翻週 | `calShift("week","2026-09-29",1) === "2026-10-06"`、`-1` → `"2026-09-22"` |
| 標題 | `calTitle("month","2026-09-29") === "2026 年 9 月"`；`calTitle("week","2026-09-29") === "2026 年 9/27 – 10/3"`；`calTitle("week","2026-12-30") === "2026 年 12/27 – 1/2"` |
| 格頭 | `calCellLabel("2026-10-01",false) === "10/1"`、`("2026-10-02",false) === "2"`、`("2026-10-02",true) === "10/2"` |
| 同月 | `calInMonth("2026-08-30","2026-09-15") === false`、`("2026-09-01","2026-09-15") === true` |
| 分組 | `groupByDay([{updatedAt:"2026-09-29T10:00:00"},{updatedAt:"2026-09-29"}])` 一個 key、長度 2；`[]` → `{}` |

### 5. `DashboardWorkbench.tsx`：Tab 改名與空殼

- `type Tab = "overview" | "calendar" | "ai"`；`TABS` 第二項 `{ key: "calendar", label: "更新月曆" }`
- `?tab=` 解析：`t === "calendar" || t === "week"` → `setTab("calendar")`；寫回網址一律 `?tab=calendar`
- 刪 `tab === "week"` 整段 JSX（三列 `wb-skel`、`wb-empty`、`NoteRow` map）與 `const week = …`；`NoteRow`、`withinDays` import 若無他用一併刪（grep 確認「AI 佇列」分支沒用）
- `tab === "calendar"` 渲染 `<Calendar rows now live readingVersion sel onSelect />`
- 新增 `src/components/wb/dashboard/Calendar.tsx` **空殼**：`<div id="nc-scroll" className="wb-body cal-body" data-wb-rows>` + `.cal-bar`（三顆 `disabled` 導覽鈕、標題「—」、副標「共更新 — 篇」、`.dv-legend` 三項數字「—」、`.dv-seg` 週／月「月」on 且 `disabled`）+ `.cal-grid.mo`（只有 7 個 `.cal-wd`）。`view`／`anchor` state 與 `useEffect` 先不接（Task 93）

## 要改的既有檔案

`src/styles/workbench.css`、`src/components/wb/DashboardWorkbench.tsx`、`package.json`（`check:wb`）。新增 `src/lib/wb-calendar.ts`、`scripts/checks/wb-calendar.mjs`、`src/components/wb/dashboard/Calendar.tsx`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 零色碼 | — | `awk` 排除 `:root` 後 grep hex／rgba 於 `workbench.css` | 0 筆 |
| 規則位置 | — | `grep -n "cal-body\|padding-bottom:calc(20px" workbench.css` | `.cal-body` 的行號小於 860 媒體規則 |
| 斷言 | — | `npm run check:wb` | 兩支都綠；`npm run check-plugins` 也會跑到 |
| Tab | dev 開 `/` | — | 頁首 Tab 是「總覽 ｜ 更新月曆 ｜ AI 佇列」；點第二個網址變 `?tab=calendar` |
| 舊網址 | 開 `/?tab=week` | — | 落在「更新月曆」 |
| 空殼 | 開 `/?tab=calendar` | — | 工具列「—」、7 個星期標題、格區撐滿剩餘高度、Body 無捲動列；`#nc-scroll` 在 |
| SSR | `astro build` 後看 `dist/index.html` | — | 無 `cal-cell`、無 `cal-dot`；有 7 個 `cal-wd` |
| 死碼 | — | grep `NoteRow` 於 `DashboardWorkbench.tsx` | 0 筆（或僅 AI 佇列在用） |
| build | — | `npx tsc --noEmit && npx astro build` | 通過；tsc 錯誤數不增加 |

## 依賴

無。

## 實作記錄（2026-09-30）

- token、`cal-` 規則照 §1–§2 移植；`awk` 排除 `:root` 後 grep hex／rgba 為 0；`.cal-body` 在第 318 行、860px 的 `.wb-body{padding-bottom}` 在第 744 行，順序正確
- 移植時就把 `.cal-note` 容器化、`.dv-rs-*` 走 class、四處小字改 `--wb-muted-ink`；`.cal-more` 與週檢視的 `.thiswk` 還原規則沒搬
- `wb-calendar.ts` 自帶 3 行 `parse`／`addDays`／`calIso`，不 import `wb-time.ts`；`scripts/checks/wb-calendar.mjs` 12 組斷言全綠（含 2026-02 四列、2026-08 六列、1 月 31 日翻月、跨年週標題）
- `DashboardWorkbench`：`NoteRow`／`withinDays` import 與 `week` 集合一併刪掉；`?tab=week` 視同 `calendar`
- tsc 48 → 48；`astro build` 55 頁；`dist/index.html` 沒有任何 `cal-` 節點（Tab 初值是總覽，月曆不在 SSR 裡）
