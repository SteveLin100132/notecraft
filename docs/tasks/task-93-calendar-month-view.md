# Task 93 — 更新月曆：月檢視（state、日期格、色塊、導覽、圖例、週月切換）

> 規格 [notecraft-workbench-calendar.md](../notecraft-workbench-calendar.md) §4.4、§5、§6.1–§6.4、§6.6、§8、§10；Q1–Q5 定案（§16）。
> 設計交付 README §Screen（工具列、月曆格、日期格、月檢視色塊）、§Interactions、§State Management；原始碼 `source/pt-cal.jsx` 的 `PtCalendar`、`CalDot`。
> 依賴 [Task 92](task-92-calendar-foundation.md)。可與 Task 94 並行（Task 94 只加週檢視的分支與 `CalNote`）。

## 範圍

### 1. `Calendar.tsx`：state 與衍生值（規格 §4.4）

| 名稱 | 說明 |
| --- | --- |
| `view: CalView` | `useState<CalView>("month")` |
| `anchor: string \| null` | `useState<string \| null>(null)`；`useEffect(() => { if (now && !anchor) setAnchor(iso(now)) }, [now])`。**不可**在初值算今天（SSR 沒有） |
| `today` | `now ? iso(now) : null`（`iso` 從 `wb-calendar.ts` export 一份，或元件內三行） |
| `days` | 月：`calMonthGrid(anchor).days`；週：`calWeekOf(anchor).days`（Task 94 接） |
| `byDay` | `useMemo(() => groupByDay(rows), [rows])` |
| `inRange` | 月檢視排除 `!calInMonth(d, anchor)` 的補位格 |
| `counts` | `live ? countByStatus(inRange.map(r => readingStatus(r.slug))) : null`；`useMemo` 依 `[inRange, live, readingVersion]`（`readingVersion` 是刻意的依賴，加 eslint 註解，與 `KpiCard.useReadingParts` 同寫法） |
| `thisWeek` | `today ? calWeekOf(today) : null` |

`anchor === null` 時渲染 Task 92 的空殼（工具列「—」、只有星期列）。

### 2. 工具列 `.cal-bar`（規格 §6.1）

- 導覽：`<button type="button" aria-label={view === "month" ? "上一個月" : "上一週"}>` 內 `ChevronLeft` 16px `strokeWidth 1.7`；`›` 同理；`disabled={!anchor}`
- 「本週」`.cal-today`：`setAnchor(today)`（Q4：文案照 handoff）
- `<h2 className="cal-title tnum">{calTitle(view, anchor)}<span>共更新 {inRange.length} 篇</span></h2>`
- 圖例 `.dv-legend`：`DV_RS.map(s => <span><i className={s.cls}/>{s.l}<b className="tnum">{counts ? counts[s.k] : "—"}</b></span>)`
- `.dv-seg`：`["week","month"]` 兩顆 `<button type="button" aria-pressed className={on ? "on" : ""}>`，文字「週」「月」；切換只 `setView`，anchor 不動

### 3. 月曆格與日期格（規格 §6.2、§6.3；`CalCell.tsx`）

- `.cal-grid.mo` 加 inline `style={{ gridTemplateRows: \`auto repeat(${weeks}, minmax(0,1fr))\` }}`
- 7 個 `.cal-wd` 永遠輸出（SSR 也有）
- 每格 `<div className={"cal-cell" + out + today + thiswk} aria-current={isToday ? "date" : undefined}>`
  - `out`：月檢視且 `!calInMonth(d, anchor)`
  - `today`：`d === today`
  - `thiswk`：**只在月檢視**、`thisWeek.days.includes(d)`
- 格頭 `.cal-cell-h`：`<b className="tnum">{calCellLabel(d, false)}</b>`（月檢視首格不算 firstCell；1 日自動變 `M/D`）＋ 有筆記時 `<span className="tnum">{n} 篇</span>`
- 內容區 `.cal-cell-b`：月檢視 `list.map(r => <CalDot …/>)`
- 空範圍：格子照畫、副標「共更新 0 篇」、圖例三個 0；不出文案

### 4. `CalDot.tsx`（規格 §6.4；Q2）

```tsx
<button
  type="button"
  className={"cal-dot " + DV_RS[status].cls + (selected ? " sel" : "")}
  data-wb-rowfocus
  aria-pressed={selected}
  title={`${r.title}${r.series ? "・" + r.series.title : ""}・${label}`}
  aria-label={`${r.title}（${label}）`}
  {...rowHandlers(r.slug, onSelect)}
/>
```

- `status = live ? readingStatus(r.slug) : "not-started"`；`label` 取 `DV_RS` 的 `l`（已完成／閱讀中／待開始）
- **沒有** `wb-row-open`（treemap 方塊同一例外）；不 `memo`
- 底色只靠 `.dv-rs-*` class，**不寫 inline `style`**

### 5. 閱讀狀態即時更新（規格 §5.3）

`readingVersion` 變 → `counts` 重算、`CalDot` 隨父層重畫。不在 `Calendar` 內另掛 `READING_EVENT`。

## 要改的既有檔案

`src/components/wb/dashboard/Calendar.tsx`（Task 92 空殼接上 state）。新增 `CalCell.tsx`、`CalDot.tsx`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 並排比對 | 開 prototype 與 dev `/?tab=calendar`，都翻到 2026-09 | — | 5 列、首列 8/30、8/31 為補位格、9/1 顯示「9/1」、今天膠囊、當週淡藍底；色塊 14×14、圓角 3、間距 4 |
| 4 列月份 | 翻到 2026-02 | — | 剛好 4 列、沒有補位格、格子等高、整月一屏（1400×900 Body 無捲動列） |
| 6 列月份 | 翻到 2026-08 | — | 6 列、前後都有補位格、仍整月一屏；視窗高 768 時 Body 出現捲動列（不是整頁） |
| 翻頁 | 在 1 月 31 日的月份按 › | — | 到 2 月（不是 3 月）；標題「2026 年 2 月」 |
| 本週 | 翻到別的月份後按「本週」 | — | 回今天所在月、當週淡藍底 |
| 副標與圖例 | 當月有 N 篇 | — | 副標「共更新 N 篇」；圖例三個數字加總 = N；補位格的筆記不計 |
| 閱讀狀態 | Drawer 或另一分頁改某篇為「已完成」 | — | 該色塊變實心藍、圖例數字同幀更新，不重整頁面 |
| Drawer | 單擊色塊 | — | Drawer 開；`.sel` 描邊；再點同一顆關閉；Network 一次 `wb-index.json` |
| 開啟 | 雙擊／Enter／⌘點擊／中鍵 | — | 進 `/notes/<slug>`（後兩者新分頁） |
| 鍵盤 | focus 在某顆色塊 | ↓ | 到 DOM 順序的下一顆（同格內下一顆，格末跳下一格） |
| tooltip | hover 色塊 | — | 原生 `title`「標題・系列・狀態」；無系列時只有兩段 |
| hydration | dev console | 開頁、翻頁、切檢視、改閱讀狀態 | 0 筆 hydration warning |
| SSR | `dist/index.html` | — | 無 `cal-cell`；標題「—」 |
| 對比 | DevTools 取 `.cal-wd`、`.cal-cell-h span` 的 color | — | 是 `--wb-muted-ink`（`#4f5b6e`） |
| build | — | `npx tsc --noEmit && npx astro build && npm run check:wb` | 通過 |

## 依賴

Task 92。

## 實作記錄（2026-09-30）

- `Calendar.tsx`／`CalCell.tsx`／`CalDot.tsx`；`anchor` 用 `now ? calIso(now) : null` 的 lazy 初值加 effect（規格 §17 有說明），`counts` 以 `readingVersion` 為刻意依賴
- 實測 2026-09：35 格、5 列 108px 等高、8/30 與 8/31 補位、9/1 顯示「9/1」、30 日膠囊、27–30 淡藍底、22 日 2 顆色塊；2026-02：28 格 136px；2026-08：42 格；1400×900 Body 無捲動列，1400×700 翻到 8 月仍一屏
- 1 月 31 日 → 2 月、「本週」回當月都對；改閱讀狀態後色塊 class 與圖例同幀變；單擊 Drawer、`.sel` 描邊、`Escape` 關閉；dev console 0 hydration warning
- `.cal-wd`、`.cal-cell-h span` computed color `rgb(79,91,110)`
