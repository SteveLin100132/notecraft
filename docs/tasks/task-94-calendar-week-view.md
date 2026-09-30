# Task 94 — 更新月曆：週檢視（卡片、格內捲動、週標題）

> 規格 [notecraft-workbench-calendar.md](../notecraft-workbench-calendar.md) §3.1、§6.2、§6.3、§6.5、§7.3、§10；Q1、Q5 定案（§16）；
> 列的 DOM 規則見 [notecraft-workbench.md](../notecraft-workbench.md) §8.2.1（Q27）。
> 設計交付 README §Screen（週檢視：筆記卡片）；原始碼 `source/pt-cal.jsx` 的 `CalNote`。
> 依賴 [Task 92](task-92-calendar-foundation.md)。可與 Task 93 並行；若先於 93 完成，`view` state 與 `.dv-seg` 由本 Task 先接。

## 範圍

### 1. `Calendar.tsx`：週檢視分支

- `view === "week"`：`days = calWeekOf(anchor).days`（7 天，週日起）；`.cal-grid.wk`（不設 inline `gridTemplateRows`，走 CSS 的 `auto minmax(320px,1fr)`）
- 標題 `calTitle("week", anchor)`：「2026 年 9/27 – 10/3」；跨年週的年份取週日那天
- `inRange = days.flatMap(d => byDay[d] ?? [])`（週檢視沒有補位格，7 天全算）
- 導覽 `aria-label`「上一週／下一週」；`calShift("week", anchor, ±1)`
- 日期格：**不加** `.thiswk`；`today` 照加；首格（`i === 0`）`calCellLabel(d, true)` → `M/D`
- 內容區 `.cal-cell-b`：`list.map(r => <CalNote …/>)`；筆記多時只有該格 `overflow:auto` 內捲，Body 不捲

### 2. `CalNote.tsx`（規格 §6.5；容器 DOM）

```tsx
<div className={"cal-note" + (selected ? " sel" : "")}>
  <button type="button" className="wb-row-main" data-wb-rowfocus aria-pressed={selected} {...rowHandlers(r.slug, onSelect)}>
    <span className="cal-note-st"><i className={DV_RS[status].cls} aria-hidden="true" />{label}</span>
    <span className="cal-note-t">{r.title}</span>
    {r.series ? <span className="cal-note-sr"><BookOpen size={11} strokeWidth={1.7} aria-hidden="true" />{r.series.title}</span> : null}
    {(r.tags.length || r.markers.length) ? (
      <span className="cal-note-meta">
        {r.tags.slice(0, 2).map(t => <span key={t} className="dv-tag">{t}</span>)}
        {r.tags.length > 2 ? <span className="dv-tag more">+{r.tags.length - 2}</span> : null}
        {r.markers.length ? <span className={"dv-ai" + (c.pending ? " warn" : "")}><Sparkles size={11} strokeWidth={1.7} aria-hidden="true" />{c.done}/{r.markers.length}</span> : null}
      </span>
    ) : null}
  </button>
  <OpenLink slug={r.slug} title={r.title} />
</div>
```

- `c = markerCounts(r.markers)`；`status`／`label` 與 `CalDot` 同一套（`live ? readingStatus() : "not-started"`、`DV_RS`）
- `rowHandlers`／`OpenLink` 來自 `NoteRow.tsx`；`<a>` 不在 `<button>` 內
- 系列標題是純文字（藍色），不是第二個連結
- `.dv-ai.warn` 的顏色是既有 `--wb-warn-ink`（Dashboard Q6），不用 handoff 的 `#b86e0e`
- 不 `memo`

### 3. 樣式確認（Task 92 已移植，這裡實測）

- `.cal-note>.wb-row-main` 的直排覆寫生效：狀態列／標題／系列／meta 由上而下，`text-align:left`
- `.cal-note-t` 2 行 clamp、`.cal-note-sr` 單行省略、`.cal-note-meta` 換行
- `.cal-note:hover` 上移 1px＋陰影；`wb-row-open` 淡灰 → hover 藍，對齊狀態列
- `.cal-grid.wk .cal-cell` 的捲動列平時隱藏、hover 才顯示

## 要改的既有檔案

`src/components/wb/dashboard/Calendar.tsx`、`CalCell.tsx`（內容區依 `view` 切換）。新增 `CalNote.tsx`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 並排比對 | prototype 與 dev 都切「週」、同一週 | — | 標題「2026 年 9/27 – 10/3」格式一致；首格「9/27」、其餘只有日；所有格一般底色、無淡藍當週底；今天膠囊在 |
| 卡片四層 | 某篇有系列、3 個標籤、AI 2/3 | — | 狀態色條＋文字、標題、書本圖示＋系列名、2 個標籤 + 「+1」、橘色「2/3」靠右 |
| 卡片省略 | 某篇無系列、無標籤、無標記 | — | 只有狀態列與標題；沒有空的 `.cal-note-sr`／`.cal-note-meta` |
| 長標題 | 標題超過 2 行 | — | 第 2 行末省略號；卡片高度不再增加 |
| 格內捲動 | 視窗高 800、某天 10 篇 | — | 只有該格捲動，Body 與其他格不動；hover 該格才出現細捲動列 |
| 切檢視 | 在月檢視翻到 2026-08 後切「週」 | — | 顯示 anchor（8/1）所在週 `7/26 – 8/1`；再切回「月」仍是 8 月 |
| 翻週（跨年） | 在 `2026 年 12/27 – 1/2` 那週按 › | — | 標題「2027 年 1/3 – 1/9」（年取週日那天）；按 ‹ 回「2026 年 12/27 – 1/2」 |
| HTML 合法 | — | `document.querySelectorAll("button a, a button").length` | 0；每張卡恰一個 `wb-row-open` |
| Drawer／開啟 | 單擊主區、雙擊、Enter、`→`、⌘點擊 | — | 與筆記列表相同：Drawer／開啟／新分頁；`.sel` 底色 |
| 鍵盤 | focus 在週日格第 1 張卡 | ↓ 到底 | 越過格界進下一格的第 1 張 |
| 閱讀狀態 | 改某篇狀態 | — | 該卡的色條與文字、圖例數字同幀更新 |
| 對比 | DevTools 取 `.cal-note-st` 的 color | — | `--wb-muted-ink` |
| hydration | dev console | 切週、翻週、開 Drawer | 0 筆 warning |
| build | — | `npx tsc --noEmit && npx astro build` | 通過 |

## 依賴

Task 92。

## 實作記錄（2026-09-30）

- `CalNote.tsx`（容器 + `.wb-row-main` 直排 + `OpenLink`）；`readingSeg()` 與 `CalDot` 共用
- 兩處小修：`.cal-note-st` 加 `white-space:nowrap`（窄格子裡「待開始」會被擠成直排）、系列標題多包一層 `<span>` 讓省略號生效
- 實測 2026 年 9/20 – 9/26：2 張卡片（標籤 2 個 + 「+1」、無系列）、`button a, a button` 為 0、每張卡一個 `wb-row-open`；週標題「2026 年 9/27 – 10/3」、首格「9/27」、無 `.thiswk`；viewer 專案 8 篇同一格內捲
