---
Project Name: NoteCraft Workbench — 首頁「更新月曆」頁籤
文件類型: Design Document
文件版本: v0.2.0
開發模式: Waterfall
技術選型: 確定（沿用既有技術棧，不新增套件；月曆全部 CSS grid，無圖表函式庫）
文件狀態: 已實作（notecraftapp v1.5.0，Task 92–95，2026-09-30）—— §15 的 5 題已於 2026-09-30 逐題確認（紀錄見 §16）；實作後回填見 §17
文件作者: 建宇
建立日期: 2026-09-30
更新日期: 2026-09-30
依賴文件: docs/notecraft-workbench.md（§4 殼、§5.4 時間基準、§8.1 Dashboard 三 Tab、§8.2.1 列的 DOM 規則）、docs/notecraft-workbench-dashboard.md（§4.2 時間工具、§5 SSR 佔位、§7.2 `--wb-dv-*` token、§16 Q2／Q4／Q6）、docs/prototype/design_handoff_update_calendar/README.md
分支: feat/dashboard-update-calendar
---

# NoteCraft Workbench — 首頁「更新月曆」頁籤設計文件

把工作台首頁（`/`）的第二個 Tab「本週」從 v1.0.0 的 **近 7 日 `NoteRow` 列表** 換成 handoff 的 **「更新月曆」**：每篇筆記依 `updatedAt` 放進日期格，顏色代表閱讀狀態（配色與總覽的寫作頻率長條相同）；有「月」（每篇一個 14px 色塊、整月一屏、不捲動）與「週」（每篇一張卡片：狀態、標題、系列、標籤、AI 數）兩種檢視。點色塊或卡片開既有的筆記 Drawer。頁籤順序改為 `總覽 ｜ 更新月曆 ｜ AI 佇列`。

> 視覺與互動的**像素級規格**以 [design_handoff_update_calendar/README.md](prototype/design_handoff_update_calendar/README.md) 與 `source/pt-cal.jsx`、`source/pt-cal.css` 為準，本文不重抄。
> 本文負責 handoff 沒有回答的事：prototype 的「今天」與閱讀狀態都是假的（最新 `updated`、四態），codebase 的這兩個量**只存在於瀏覽器**、SSR 要佔位；handoff 的「週」是日曆週（日→六），而 v1.0.0 起全站的「本週」是滾動 7 天，兩者要不要統一（§15 Q1）；月色塊 14×14 塞不下「列的 DOM 規則」要求的常駐開啟連結（§15 Q2）。
> **與設計稿不同之處一律以本文為準**，全部列在 §1.3。

---

## 1. 這份文件要解決什麼

### 1.1 起點

Handoff 是總覽改版（v1.4.0）同一套 prototype 的延伸：`pt-cal.jsx` 新增 `PtCalendar`／`CalNote`／`CalDot`，資料仍走 `pt-data.jsx` 的 `ptRows()`。讀過 codebase 之後，有五類落差 README 沒處理：

| 落差 | 說明 |
| :-- | :-- |
| **「本週」的定義** | codebase 的「本週」Tab、總覽「本週更新」KPI、更新日誌的 `weekWindow()` 全是**滾動 7 天**（今天與前 6 天；workbench Q10、Dashboard Q2）。月曆的週檢視、月檢視的 `.thiswk` 高亮、「本週」按鈕，都是**日曆週**（週日到週六）。一個頁面裡兩種「本週」 |
| **今天** | README 明說 prototype 以最新 `updated` 當今天、正式版改用系統日期。系統日期在 SSR 拿不到（`now` 初值 `null`），月曆**整個格區**都依賴 anchor，佔位策略要比總覽的單張卡更粗（§5） |
| **閱讀狀態四態** | `DV_RS` 有「未發佈」，找不到狀態時「一律視為 `unpublished`」。codebase 三態、`readingStatus()` 預設 `not-started`（PRD §7.1 Q2、workbench Q7、Dashboard §1.3） |
| **列的 DOM 規則** | prototype 的 `CalNote`、`CalDot` 都是單一 `<button onClick onDoubleClick>`。workbench Q27／§8.2.1：單擊開 Drawer 的列是容器，內含 `<button class="wb-row-main">` 與常駐 `<a class="wb-row-open">`。週卡片放得下，月色塊放不下 |
| **既有規則** | `workbench.css` 規則零色碼（handoff 的 `.cal-cell` 三個底色、`.cal-dot` 的 `rgba` 都是字面值）；`id="nc-scroll"` 不可拿掉；Tab key 目前是 `week`、寫進 `?tab=week` |

### 1.2 目標

1. **「本週」Tab 換成「更新月曆」**：月／週兩種檢視、導覽、圖例、色塊與卡片照 handoff 還原（§6）
2. 「今天」與閱讀狀態沿用總覽的 **SSR 佔位 → hydrate 補齊** 策略，零 hydration mismatch；`now`／`live`／`readingVersion` 仍只由 `DashboardWorkbench` 持有一份（§5）
3. 月曆的日期演算法（月格、日曆週、翻頁、標題）抽成 **純函式** `src/lib/wb-calendar.ts`，用 `scripts/checks` 斷言鎖住週數 4／5／6、跨月跨年、週日起算（§4.3）
4. 新色值收成 `--wb-cal-*` token；閱讀狀態三段**直接沿用**總覽的 `.dv-rs-*` class 與 `DV_RS` 常數，不再定義第二份（§7）
5. 「總覽」「AI 佇列」Tab、Drawer、殼**不動**

### 1.3 非目標與刻意的偏離

| 項目 | 決定 | 為什麼 |
| :-- | :-- | :-- |
| 「未發佈」閱讀狀態 | **拿掉**。圖例三項、色塊三色；`unpublished` 的斜紋色（`#c3cad6`／`#f3f5f8`）不收 token | PRD §7.1 Q2、Dashboard §1.3；`readingStatus()` 永遠回三態之一，不存在「找不到狀態」 |
| 深色模式 | **不做**。handoff §Design Tokens 要求的三個底色深色值不提供 | Dashboard §1.3 同一決定；`workbench.css` 檔頭第 3 條 |
| 時間基準 | **今天**（系統日期、當地日界線） | handoff 自己也這樣要求；與 workbench Q10 一致 |
| 週的定義 | 月曆**日曆週（週日→週六）**；「本週更新」KPI 與更新日誌**維持滾動 7 天**（Q1 已定案） | 月曆格子天生是日曆週；KPI 的語意在 v1.4.0 已定，改動範圍不在本次 |
| 月色塊的 DOM | 純 `<button>` 走 `rowHandlers`，**沒有**常駐 `wb-row-open`（Q2 已定案）；CLAUDE.md 的「列的 DOM 規則」加一句「格狀小目標（treemap 方塊、月色塊）例外」 | 14×14 塞不下第二個目標；treemap 方塊（Dashboard §6.4）已是同樣的先例 |
| 週卡片的 DOM | 容器 `.cal-note` 內並排 `<button class="wb-row-main">` 與 `<a class="wb-row-open">` | workbench §8.2.1；與更新日誌的 `.dv-ev` 同一做法 |
| Tab key | `week` → **`calendar`**，網址 `?tab=calendar`；讀到舊的 `?tab=week` 視同 `calendar` | 名稱要跟內容；舊網址可能已被書籤或 Palette 歷史記住，一行相容不花錢 |
| `view`／`anchor` | **元件 state，不進網址、不進偏好**（Q3 已定案） | 與寫作頻率區間、更新日誌 `off`／`pick` 同精神（Dashboard §1.3、§6.5） |
| 「本週」按鈕文案 | 照 handoff **「本週」**（Q4 已定案） | high-fidelity；月檢視時跳到當月是 README 明寫的行為 |
| 格子底色上的小字（星期、「N 篇」、補位格日期、卡片狀態文字） | `--wb-ink-3` → **既有 `--wb-muted-ink`**（Q5 已定案） | handoff 的灰在淡藍底上只有 3.8:1（§10）；Task 74 已為同類問題建了這個 token |
| 月檢視「還有 N 篇」 | **不做**。`pt-cal.css` 殘留的 `.cal-more` 與 `CAL_MAX` 不移植 | README 明說「月檢視不再有展開按鈕」；格頭的「N 篇」已提供計數 |
| `.cal-dot` 的 `title` 原生 tooltip | 照 handoff 用原生 `title` | 與寫作頻率長條相同；不做浮層 |
| 閱讀狀態文案 | 沿用總覽 `DV_RS` 的「已完成／閱讀中／待開始」 | 同一頁兩個 Tab 要一致；`readingMeta()` 的「未開始」用在 Board 與 pill，不動 |
| 舊「本週」列表 | **刪除**：`DashboardWorkbench` 的 `tab === "week"` 分支、`NoteRow` import（若無他用）、三列 `wb-skel` 骨架 | 被月曆取代；近 7 日的清單在總覽「更新日誌」仍有 |
| 週日起算 | 照 handoff | README 明寫；台灣月曆慣例 |

---

## 2. 現況盤點：哪些留、哪些改、哪些走

| 檔案 | 處置 |
| :-- | :-- |
| `src/components/wb/DashboardWorkbench.tsx` | **改**：`TABS` 第二項改 `{ key: "calendar", label: "更新月曆" }`；`?tab=` 解析接受 `calendar` 與舊 `week`；`tab === "calendar"` 渲染 `<Calendar …/>`；刪舊「本週」JSX。`now`／`live`／`readingVersion`／`sel`／`onSelect`／Drawer 這層殼不動 |
| `src/components/wb/dashboard/Calendar.tsx` | **新增**：Body（工具列 + 格區），收 `rows`、`now`、`live`、`readingVersion`、`sel`、`onSelect`（§3.2） |
| `src/components/wb/dashboard/CalCell.tsx`、`CalNote.tsx`、`CalDot.tsx` | **新增**：日期格、週卡片、月色塊 |
| `src/lib/wb-calendar.ts` | **新增**：純函式（月格、日曆週、翻頁、標題、分組）；`import type` only、無 JSX（§4.3） |
| `scripts/checks/wb-calendar.mjs` | **新增**：斷言；`package.json` 的 `check:wb` 串上它（`check-plugins` 會自動跑 `scripts/checks/*.mjs`） |
| `src/styles/workbench.css` | **改**：`:root` 加 `--wb-cal-*` 與 `--wb-a-blue-12`；追加 `cal-` 規則（§7） |
| `src/pages/index.astro` | **不動**。月曆吃的欄位（`slug`／`title`／`updatedAt`／`series.title`／`tags`／`markers`）精簡列都有 |
| `src/components/wb/dashboard/patterns.tsx` | **不動**，被月曆 import（`DV_RS`）。月曆沒有 SVG，不需要 `DvPatterns` |
| `src/lib/wb-time.ts` | **不動**。月曆的日期工具自成一檔（§4.2 說明為什麼不放這裡） |
| `WbHeader`、`NoteDrawer`、`useWbIndex`、`NoteRow` 的 `rowHandlers`／`OpenLink` | **不動**，沿用 |
| `src/components/wb/ui.tsx` 的 `Seg` | **不用**。handoff 是 `.dv-seg`（方框 26px），總覽已有這條規則，直接沿用 class |

---

## 3. 架構

### 3.1 殼不變

仍是 `WorkbenchLayout` 的 `bare` 模式，`DashboardWorkbench` 這個 island 輸出頁首 Tab、Body、Drawer。月曆的 Body：

```
<div id="nc-scroll" class="wb-body cal-body" data-wb-rows>     ← id 不可拿掉；data-wb-rows 給 ↑↓ 鍵盤移焦用
  <div class="cal-bar">  ‹ › 本週 ｜ 標題 + 共更新 N 篇 ｜ 圖例 ｜ 週/月 </div>
  <div class="cal-grid mo|wk" style="grid-template-rows: …">
    .cal-wd ×7
    .cal-cell ×(週數×7 或 7)
      .cal-cell-h  日期數字 ＋ N 篇
      .cal-cell-b  CalDot ×N（月）｜ CalNote ×N（週）
  </div>
</div>
```

- `.wb-body` 既有的 `padding:14px 16px 20px` 由 `.cal-body` 覆寫成 `14px 20px 20px`；背景同為 `--wb-bg`
- `.wb-body` 是 `overflow:auto`。月檢視 `.cal-grid.mo{flex:1 1 auto;min-height:0}` 加上每列 `minmax(0,1fr)` 讓整月填滿剩餘高度、不捲動；視窗高度不足「工具列 + 週數 × 64px」時 Body 才出現捲動列，接受（與總覽 Row 2 `min-height:380` 同一種取捨）
- 週檢視 `.cal-grid.wk` 的格子 `minmax(320px,1fr)`，筆記超出時**只有該格內捲**（`overflow:auto`）；Body 不捲
- ≤900px 時格區改橫向捲動（handoff §響應式），Body 仍不橫捲：`overflow-x` 在 `.cal-grid` 上

### 3.2 元件切分

```
src/components/wb/dashboard/
├── Calendar.tsx      Body：view／anchor state、工具列、格區；收 rows、now、live、readingVersion、sel、onSelect
├── CalCell.tsx       一個日期格：格頭（日期／今天膠囊／N 篇）＋ 內容區
├── CalNote.tsx       週卡片（容器 + wb-row-main + wb-row-open）
├── CalDot.tsx        月色塊（純 button）
└── patterns.tsx      既有：DV_RS 三段常數（月曆 import 它）
```

- 全部是 `DashboardWorkbench` 的子元件，不是新 island；沒有新的 `client:*` 掛載點
- `now`、`live`、`readingVersion`、`sel`／`onSelect` 由 `DashboardWorkbench` 往下傳；`Calendar` **不自己** `new Date()`、不自己監聽 `READING_EVENT`。prototype 的 `ncSubscribe` 對應的就是 `readingVersion` 變動觸發的重算
- `view`／`anchor` 是 `Calendar` 的 state（§4.4）；切 Tab 離開再回來會重置為「月、今天」，接受（更新日誌的 `off` 也是這樣）
- 日期演算法全在 `src/lib/wb-calendar.ts`，元件只做 JSX

---

## 4. 資料層

### 4.1 island props

不改。`index.astro` 的精簡列已含月曆要的所有欄位；prototype `ptRow` 欄位對映如下：

| prototype | codebase | 說明 |
| :-- | :-- | :-- |
| `r.updated`（`YYYY-MM-DD`） | `r.updatedAt.slice(0, 10)` | frontmatter 允許帶時間；分組 key 一律取前 10 碼 |
| `r.series?.title` | `r.series?.title` | `WbNoteSeriesRef`，不在系列為 `null` |
| `r.tags` | `r.tags` | 已 trim／去重（標籤字串規範） |
| `r.markers.length` | `r.markers.length` | AI 總數 |
| `r.ai[0]`／`r.ai[1]` | `markerCounts(r.markers).done`／`.pending` | 既有 helper |
| `window.readingStatus(slug)` | `live ? readingStatus(slug) : "not-started"` | §5 |
| 資料順序（更新新 → 舊） | `rows` 已依 `updatedAt` 遞減 | 同一天內色塊／卡片順序照 `rows` 原順序即可，不再排序 |

### 4.2 為什麼另開 `wb-calendar.ts`、不放 `wb-time.ts`

`wb-time.ts` 的所有函式都是「以今天為錨、往回數」的**滾動窗**（`withinDays`、`weekOf`、`weekWindow`）。月曆是「以 anchor 為錨、對齊日曆邊界」的另一套語意（月的 1 日、週日）。混在同一檔會讓 `weekWindow`（滾動 7 天）與 `calWeekOf`（日曆週）並排出現，很容易被拿錯。兩檔都是純函式、都被 `scripts/checks` 載入，規則相同。

`wb-calendar.ts` 不 `import` `wb-time.ts`：被 Node `--experimental-strip-types` 直接載入的檔，相對 import 必須帶副檔名，而 tsc／Vite 那邊不帶；避免這個分歧，需要的 3 行 `iso()`／`localDay()` 在檔內自己寫（與 `wb-time.ts` 的私有 `iso()` 相同實作）。

### 4.3 `wb-calendar.ts`（純函式）與斷言

日期一律以 **`YYYY-MM-DD` 當地日字串**進出，`Date` 只在函式內部短暫存在；state 裡的 `anchor` 也是字串，序列化與比較都不會踩到 UTC 位移。

```ts
export type CalView = "month" | "week";
export type CalWeek = { start: string; end: string; days: string[] };            // 週日→週六，7 天
export type CalMonth = { year: number; month: number; weeks: 4 | 5 | 6; days: string[]; first: string; last: string };

export function calWeekOf(iso: string): CalWeek;                                  // iso 所在的日曆週
export function calMonthGrid(iso: string): CalMonth;                              // iso 所在月：days 從當月 1 日所在週的週日起、共 weeks×7 天
export function calShift(view: CalView, anchor: string, dir: -1 | 1): string;    // 月：±1 月、回傳該月 1 日；週：±7 天
export function calTitle(view: CalView, anchor: string): string;                 // 「2026 年 9 月」／「2026 年 9/20 – 9/26」
export function calCellLabel(iso: string, firstCell: boolean): string;           // 1 日或首格 → 「M/D」，否則「D」
export function calInMonth(iso: string, anchor: string): boolean;                // 是否與 anchor 同年月（補位格判斷、inRange）
export function groupByDay<T extends { updatedAt: string }>(rows: T[]): Record<string, T[]>;  // key = updatedAt 前 10 碼
```

- 檔案**只能 `import type`、不能有 JSX**（與 `wb-dashboard.ts` 同一條規則）
- `weeks = ceil((當月 1 日的星期 + 當月天數) / 7)`，照 handoff；型別收成 `4 | 5 | 6`，斷言鎖住不會出現 7
- 斷言（`scripts/checks/wb-calendar.mjs`，用 2026-09-30 驗過的日曆事實）：

| 斷言 | 依據 |
| :-- | :-- |
| `calMonthGrid("2026-02-10")`：`weeks === 4`、`days[0] === "2026-02-01"`、`days[27] === "2026-02-28"` | 2026 年 2 月 1 日是週日、28 天，剛好 4 列 —— 沒有補位格的極端情況 |
| `calMonthGrid("2026-08-15")`：`weeks === 6`、`days[0] === "2026-07-26"`、`days[41] === "2026-09-05"` | 8 月 1 日是週六、31 天 → 6 列，前後都有補位格 |
| `calMonthGrid("2026-09-29")`：`weeks === 5`、`days[0] === "2026-08-30"`、`days[2] === "2026-09-01"` | 9 月 1 日是週二 → 首列 2 個補位格 |
| 所有 grid：`days.length === weeks * 7`、`days[0]` 是週日、相鄰兩天差 1 天、`first` 與 `last` 分別是當月 1 日與月底 | 連續性與週日起算 |
| `calWeekOf("2026-09-29")` → `2026-09-27 … 2026-10-03`；`calWeekOf("2026-12-30")` → `2026-12-27 … 2027-01-02` | 跨月、跨年 |
| `calShift("month", "2026-01-31", 1) === "2026-02-01"`；`calShift("month", "2026-03-01", -1) === "2026-02-01"` | 從 31 日翻月不會溢到 3 月（`Date` 的 `setMonth` 陷阱）；回傳一律是 1 日 |
| `calShift("week", "2026-09-29", ±1)` → `2026-10-06`／`2026-09-22` | ±7 天 |
| `calTitle("month", "2026-09-29") === "2026 年 9 月"`；`calTitle("week", "2026-09-29") === "2026 年 9/27 – 10/3"`；跨年週的標題年份取**週日那天**的年份（prototype：`start.getFullYear()`） | 不補零；handoff 範例 `2026 年 9/20 – 9/26` |
| `calCellLabel("2026-10-01", false) === "10/1"`、`calCellLabel("2026-10-02", false) === "2"`、`calCellLabel("2026-10-02", true) === "10/2"` | 1 日與週檢視首格 |
| `groupByDay([{updatedAt:"2026-09-29T10:00:00"}, {updatedAt:"2026-09-29"}])` 只有一個 key、長度 2；空陣列回 `{}` | 時間部分忽略 |

`check:wb` 改為串跑 `wb-dashboard.mjs && wb-calendar.mjs`（秒級）。

### 4.4 `Calendar` 的 state 與衍生值

| 名稱 | 型別 | 說明 |
| :-- | :-- | :-- |
| `view` | `CalView` | 初值 `"month"` |
| `anchor` | `string \| null` | 初值 `null`；`now` 從 `null` 變成有值的那次 effect 設為 `iso(now)`。**不能**用 `useState(() => iso(new Date()))`（SSR 沒有今天） |
| `today` | 衍生 | `now ? iso(now) : null` |
| `days` | 衍生 | 月：`calMonthGrid(anchor).days`；週：`calWeekOf(anchor).days` |
| `byDay` | 衍生 | `groupByDay(rows)`，`useMemo` 只依 `rows` |
| `inRange` | 衍生 | `days.flatMap(d => (view === "month" && !calInMonth(d, anchor)) ? [] : byDay[d] ?? [])`；副標與圖例的分母 |
| `counts` | 衍生 | `live ? countByStatus(inRange.map(r => readingStatus(r.slug))) : null`；`useMemo` 依 `inRange, live, readingVersion` |
| `thisWeek` | 衍生 | `today ? calWeekOf(today) : null`；只在月檢視用來標 `.thiswk` |

翻頁：`setAnchor(calShift(view, anchor, dir))`。「本週」：`setAnchor(today)`。切檢視：只改 `view`，anchor 不動（handoff）。三個動作都不需要清任何東西 —— prototype 的 `setOpen({})` 是給已拿掉的「還有 N 篇」用的。

---

## 5. 兩個瀏覽器端資料來源與 SSR 佔位

原則同 Dashboard §5：**伺服器算不出來的量，第一次繪製以佔位輸出，hydrate 後才填**；靠 localStorage 的東西 SSR 一律當作沒有。月曆比總覽更依賴今天 —— 沒有 anchor 就沒有格子，所以佔位是「整個格區空著」而不是逐格「—」。

### 5.1 佔位表

| 區塊 | 依賴 | SSR／首次 render（`now === null`） | hydrate 後 |
| :-- | :-- | :-- | :-- |
| 導覽三顆按鈕 | 今天 | 照畫、`disabled` | 啟用 |
| 標題 | 今天 | 「—」 | 「2026 年 9 月」 |
| 副標「共更新 N 篇」 | 今天 | 「共更新 — 篇」 | 填入 |
| 圖例 | 今天 + localStorage | 三個標籤都在、數字「—」 | `live` 為真後填入 |
| 週／月切換 | 無 | 照畫、「月」選中；`disabled` | 啟用 |
| 星期列 `.cal-wd` ×7 | 無 | 照畫 | 不變 |
| 日期格 | 今天 | **不輸出任何 `.cal-cell`**；`.cal-grid.mo` 仍在（`flex:1` 撐住高度，不會跳版） | 一次填入整月／整週 |
| 色塊／卡片的閱讀狀態 | localStorage | 格子都還沒有，不適用 | `live ? readingStatus() : "not-started"`（`now` 與 `readingVersion` 在同一個 commit 的 effect 裡各自 set，React 會合併成一次 re-render；萬一分兩次，中間那幀全是「待開始」，無害） |

- 與更新日誌的做法一致：日誌在 `now === null` 時輸出空的 `.dv-log-list`、連空文案都不出；月曆同樣不輸出「沒有更新」之類的文案（handoff 也沒有這種文案）
- 不做 skeleton 格：格數要靠 anchor 才知道是 28／35／42，假的 35 格在 4 列或 6 列月份會跳一下，不如空著

### 5.2 hydration mismatch 的邊界

- 伺服器與瀏覽器的第一次 render 必須一模一樣：`now` 初值 `null`、`anchor` 初值 `null`、`live` 初值 `false`。真值只在 `useEffect` 之後進 render
- `DashboardWorkbench` 現有的 `useEffect(() => { …; setNow(new Date()) }, [])` 與 `useReadingVersion()` 不動；`Calendar` 只多一個 `useEffect(() => { if (now && !anchor) setAnchor(iso(now)) }, [now])`
- 反例：在 `useState` 初值、`useMemo` 初次計算或 render 裡直接呼叫 `new Date()`／`readingStatus()`／`localStorage`

### 5.3 閱讀狀態變動

Drawer、Board、筆記頁改了閱讀狀態 → `READING_EVENT`／跨分頁 `storage` → `readingVersion` 加一 → `counts` 重算、`CalDot`／`CalNote` 因父層 re-render 重讀 `readingStatus()`。`CalDot`／`CalNote` **不 memo**，讓它們跟著父層重畫最省事（一個月最多幾十顆）。

---

## 6. 各區塊：handoff 沒講、或與 codebase 有出入的部分

### 6.1 工具列 `.cal-bar`

- 導覽按鈕是 `<button type="button">`，icon 用 `lucide-react` 的 `ChevronLeft`／`ChevronRight`（16px、`strokeWidth 1.7`，與更新日誌相同）；`aria-label` 「上一個月／下一個月」或「上一週／下一週」**依 `view` 切換**（prototype 固定寫「上一頁」，改掉）
- 「本週」按鈕：`.cal-today`，文案照 handoff「本週」（Q4 已定案）；月檢視按下去 anchor 回今天、畫面跳到當月
- 標題 `<h2 class="cal-title tnum">`，內含 `<span>` 副標；副標的 N = `inRange.length`
- 圖例沿用總覽的 `.dv-legend`，色塊 `<i className={s.cls}>`（`dv-rs-done`／`dv-rs-reading`／`dv-rs-ns`），數字 `<b class="tnum">`；`.cal-right .dv-legend b` 的粗體與色碼由 handoff 的規則補上
- 週／月切換沿用 `.dv-seg`：兩顆 `<button type="button" aria-pressed>`，選中加 `.on`。順序照 handoff「週 ｜ 月」，預設「月」
- `.cal-bar` 是 `flex-wrap:wrap`：窄視窗時 `.cal-right` 會掉到第二行，handoff 預期行為

### 6.2 月曆格 `.cal-grid`

- `gridTemplateRows` 只在月檢視以 inline style 設 `auto repeat(${weeks}, minmax(0,1fr))`（`weeks` 是 4／5／6，動態值不進 CSS）；週檢視走 `.cal-grid.wk` 的固定規則
- 星期列 `.cal-wd` 7 格永遠輸出（SSR 也有）；`aria-hidden` 不加，它們是有意義的欄標題
- 日期格 `key` 用 ISO 字串；翻頁時整批換掉，不做動畫（handoff 沒有翻頁動畫）
- 格區容器加 `role="grid"`？**不加**。這不是可用方向鍵在格間移動的表格，↑↓ 走 `data-wb-rowfocus` 在筆記之間移動（§10）；加了 `role="grid"` 反而要補一整套 gridcell 語意

### 6.3 日期格 `CalCell`

- class：`cal-cell` + `out`（月檢視、`!calInMonth(d, anchor)`）+ `today`（`d === today`）+ `thiswk`（月檢視、`d` 在 `thisWeek.days` 內）。週檢視**不加** `thiswk`（handoff：週檢視全用一般色；CSS 已有 `.cal-grid.wk .cal-cell.thiswk` 的還原規則，但既然不加就不需要那條，**不移植**）
- 格頭：`<b class="tnum">{calCellLabel(d, view === "week" && i === 0)}</b>`；有筆記時 `<span class="tnum">{n} 篇</span>`
- 今天的膠囊只是 `.cal-cell.today .cal-cell-h b` 的樣式，DOM 不變
- 內容區 `.cal-cell-b`：月檢視 `flex-wrap` 橫排色塊、週檢視直排卡片，由 `.cal-grid.mo`／`.wk` 的後代選擇器切換，元件不用管
- 週檢視格子 `overflow:auto` 的捲動列：沿用總覽「平時隱藏、hover 才顯示細灰」的做法（Dashboard §7.4），選擇器加 `.cal-grid.wk .cal-cell`
- 月檢視格子 `overflow:hidden`：一天的色塊多到超出格高時**會被裁切**，格頭的「N 篇」仍顯示正確數字。以 1400×900 估算：5 列月份每格約 140px 高，可放 5 排 × 8 顆 = 40 顆，實務上不會碰到；記在 §14

### 6.4 月色塊 `CalDot`（Q2 已定案：純 button）

- `<button type="button" class="cal-dot {DV_RS[status].cls}" data-wb-rowfocus aria-pressed={sel === slug} title aria-label {...rowHandlers(slug, onSelect)}>`
- **底色用 `.dv-rs-*` class**，不用 inline `style={{ background }}`（Dashboard §17「閱讀狀態三段用 class」的同一決定；規則零色碼才守得住）
- `title`：`{標題}・{系列標題}・{狀態}`，沒有系列省略中段；`aria-label`：`{標題}（{狀態}）`
- 選中態（Drawer 開著）：`.cal-dot.sel` 套與 hover 相同的雙層描邊（`0 0 0 2px var(--wb-panel), 0 0 0 3px var(--wb-blue)`），不放大；handoff 沒定義選中態，這是最省的延伸
- `rowHandlers` 給的：單擊 Drawer、雙擊／Enter 開啟、⌘/Ctrl 點擊與中鍵開新分頁、Space 切換、↑↓ 在 `[data-wb-rowfocus]` 間移動。**沒有**常駐 `wb-row-open`（Q2）
- `prefers-reduced-motion`：`transform` transition 關掉（併進既有的 reduced-motion 選擇器列表）

### 6.5 週卡片 `CalNote`

**DOM**（workbench §8.2.1 套到卡片）：

```
<div class="cal-note" [class.sel]>                                      ← 容器（prototype 是 button）
  <button type="button" class="wb-row-main" data-wb-rowfocus aria-pressed …>
    <span class="cal-note-st"><i class="dv-rs-…"/>已完成</span>
    <span class="cal-note-t">標題（最多 2 行）</span>
    <span class="cal-note-sr"><BookOpen 11/>系列標題</span>           ← 有系列才輸出
    <span class="cal-note-meta"> .dv-tag ×≤2 ｜ .dv-tag.more +N ｜ .dv-ai [.warn] <Sparkles 11/>x/y </span>   ← 有標籤或標記才輸出
  </button>
  <a class="wb-row-open" href="/notes/<slug>" aria-label="開啟筆記：<標題>">→</a>
</div>
```

- `.cal-note` 從 prototype 的直排 button 改成**橫排容器**：`display:flex; align-items:flex-start; gap:4px`；handoff 的 padding／邊框／陰影／hover 上移搬到容器。`.cal-note>.wb-row-main` 覆寫全域 `.wb-row-main` 的 `height:100%; align-items:center; gap:inherit` → `flex:1; min-width:0; height:auto; flex-direction:column; align-items:stretch; gap:4px; padding:0`（與 `.dv-ev>.wb-row-main` 同一組覆寫）
- `wb-row-open` 沿用既有樣式（淡灰 → hover 藍），`align-self:flex-start` 對齊狀態列
- 狀態列的色條 `<i class="dv-rs-…">`，`.cal-note-st i` 給尺寸（34×8 全圓角）
- 標籤 `.dv-tag`、`+N`（`.dv-tag.more`）、AI `.dv-ai`／`.dv-ai.warn` 全部是總覽既有規則；`.warn` 用既有 `--wb-warn-ink`（Dashboard Q6，handoff 的 `#b86e0e` 不採用）
- 系列標題是純文字，**不是**第二個連結（與 `.dv-ev` 相同，卡片內只有主區與開啟兩個目標）
- 選中態 `.cal-note.sel`：`background: var(--wb-a-blue-08)`，與 `.dv-ev.sel` 同值

### 6.6 空資料

| 情況 | 呈現 |
| :-- | :-- |
| 範圍內沒有筆記 | 格子照畫、格頭沒有「N 篇」、副標「共更新 0 篇」、圖例三個 0。不另出文案（handoff 沒有） |
| 沒有任何筆記 | 同上 |
| 筆記 `updatedAt` 不合法或缺 | `groupByDay` 取前 10 碼對不到任何格，該篇在月曆上不出現；不報錯。`WbNoteRow.updatedAt` 由 `workbench.ts` 保證是字串 |

---

## 7. 樣式與 token

### 7.1 命名與位置

- class 沿用 prototype 的 `cal-` 前綴、名稱**完全一致**（`workbench.css` 檔頭第 4 條）；例外是 §6.5 的容器化帶來的 `.cal-note>.wb-row-main` 與 `.sel` 兩條新規則
- `cal-` 規則追加在 `workbench.css` 總覽 `dv-` 區塊之後，加區塊註解「Dashboard 更新月曆（規格 docs/notecraft-workbench-calendar.md §7）」；**必須放在 Task 74 的 `@media(max-width:860px){.wb-body{padding-bottom:…}}` 之前**，否則 `.cal-body` 的 `padding` 會蓋掉手機底部 Tab bar 的 54px 留白（同一特異度，後者要贏）
- 規則裡**不出現色碼字面值**；handoff 的每一個 hex／rgba 都對到下表

### 7.2 新增 token（`:root`，接在 `--wb-dv-*` 那段之後）

| token | 值 | 用途 | DS 有沒有對應 |
| :-- | :-- | :-- | :-- |
| `--wb-cal-cell` | `#f8fafc` | 當月日期格底 | 無（`--neutral-50` 是 `#f6f8fb`，就是 `--wb-bg`，格子會與 Body 同色而消失） |
| `--wb-cal-cell-out` | `#f4f7fb` | 前後月補位格底 | 無 |
| `--wb-cal-thiswk` | `#e6eef9` | 月檢視當週底 | 無（`--blue-50` 是 `#eef4fb`，偏白；`--wb-dv-day-on` 是 `#e6effa`，差一階、不共用） |
| `--wb-cal-thiswk-line` | `#d3e0f2` | 當週框線 | 無（`--blue-100` 是 `#d6e4f5`） |
| `--wb-a-blue-12` | `rgba(27,79,156,.12)` | `.cal-dot` 的 inset 描邊；`.cal-note:hover` 陰影 | 半透明色那段目前有 `.06/.07/.08/.10/.14`，補 `.12` |

已有對應、直接用既有 token 的：按鈕／卡片邊框 `--wb-line`、格線 `--wb-line-2`、白底 `--wb-panel`、hover 底 `--wb-bg`、文字 `--wb-ink`／`--wb-ink-2`、格子底色上的小字 `--wb-muted-ink`（Q5 已定案；handoff 的 `--wb-ink-3` 只留給白底上的副標與圖例文字）、藍 `--wb-blue`、今天膠囊與選中 seg 的白字 `--wb-on`、系列名 `--wb-blue`、AI 完成 `--wb-dv-ai-ok`、AI 待生成 `--wb-warn-ink`、卡片陰影 `--wb-a-blue-06`、選中底 `--wb-a-blue-08`。

閱讀狀態三段**不新增任何 token**：`.dv-rs-done`／`.dv-rs-reading`／`.dv-rs-ns` 三條規則與 `--wb-gold`、`--wb-dv-gold-soft`、`--wb-dv-blue-soft-fg`、`--wb-dv-blue-soft` 都是 v1.4.0 已有的。

Handoff 的四個新底色都沒有 DS 對應，處置與 workbench Q28、Dashboard §7.2 一致：**照 prototype 原值**收成 token。深色值不提供（§1.3）。

### 7.3 捲動列

週檢視格子 `overflow:auto`：加進總覽的「平時隱藏、hover 才顯示」規則組（`scrollbar-width:thin; scrollbar-color:transparent transparent; scrollbar-gutter:stable`，hover 時 `var(--wb-line)`），選擇器 `.cal-grid.wk .cal-cell`；`::-webkit-scrollbar{width:6px}` 同樣加上。

### 7.4 字型與數字

Noto Sans TC 由 layout 載入；所有數字（標題、日期、N 篇、圖例）加 `.tnum`。`.cal-note-t` 的 `text-wrap:pretty` 照搬（不支援的瀏覽器忽略）。

---

## 8. 路由與互動

| 觸發 | 去向 |
| :-- | :-- |
| Tab「更新月曆」 | `?tab=calendar`（`history.replaceState`）；`?tab=week` 進站視同 `calendar` |
| ‹ ／ › | 月：`calShift("month", anchor, ∓1)`（回該月 1 日）；週：±7 天 |
| 「本週」 | `anchor = today` |
| 週／月 | 只改 `view`，anchor 不動 |
| 色塊／卡片主區 | 單擊 Drawer（`onSelect`，同一篇再點關閉）、雙擊／Enter 開啟 `/notes/<slug>`、⌘/Ctrl 點擊與中鍵開新分頁 |
| 週卡片 `wb-row-open` | `/notes/<slug>` |
| 閱讀狀態變動 | `readingVersion` → 色塊、卡片狀態列、圖例數字重算 |

- Drawer 的開關、`Escape` 堆疊、scrim 全部沿用 `DashboardWorkbench` 現有實作；月曆只是多了一處會呼叫 `onSelect` 的列
- `view`／`anchor` 不進網址（Q3 已定案）；Palette 的「儀表板」項目仍連 `/`

---

## 9. 響應式

Handoff 只有一個斷點 **900px**（`grid-template-columns:repeat(7,minmax(96px,1fr))` + `overflow-x:auto`），直接採用。與殼的斷點疊加後：

| 視窗寬 | 殼 | 月曆 |
| :-- | :-- | :-- |
| >1100 | 三欄 | 7 欄自適應；月檢視整月一屏 |
| 901–1100 | Sidebar 收成抽屜 | 同上；`.cal-bar` 的圖例可能掉到第二行 |
| 861–900 | 抽屜 | 格區最小寬 7×96 + 6×6 = 708px，Body 寬不足時格區橫向捲動；月／週相同 |
| ≤860 | **Rail 變底部 Tab bar**（54px） | 同上；Body 底部要留 54px（既有規則，見 §7.1 的順序要求）；橫向捲動在觸控上是自然手勢 |

- 週檢視在 ≤900 仍是 7 格並排、每格最小 96px，卡片內的標題 2 行截斷會很常發生，接受（handoff 沒給更窄的版型）
- 月檢視在手機直向：6 列 × 64px 最小高 + 工具列 ≈ 460px，一屏放得下；色塊 14px 在 96px 寬格子裡一排 5 顆

---

## 10. 無障礙與鍵盤

- 色塊與卡片主區都掛 `data-wb-rowfocus` + `aria-pressed`，Body 掛 `data-wb-rows`：↑↓ 沿 DOM 順序在筆記之間移焦（跨格、跨列），Enter 開啟、Space 切 Drawer —— 既有的 `rowHandlers`，不另寫
- 色塊 `aria-label="{標題}（{狀態}）"`；卡片主區的可及名稱由內文組成（狀態、標題、系列、標籤、AI 數），不另加 `aria-label`
- 導覽按鈕 `aria-label` 依檢視切換（§6.1）；「本週」是文字按鈕，不需要
- 週／月切換 `aria-pressed`；圖例是純文字
- 星期列與格頭日期是純文字；今天的膠囊是純樣式，另加 `<span class="sr-only">今天</span>`？**不加** —— 全站沒有 `sr-only` 工具 class，且 `aria-label="今天"` 放在 `<b>` 上會蓋掉日期數字。改在格子上加 `aria-current="date"`（原生語意，螢幕閱讀器會唸「current date」）
- 週卡片的 `wb-row-open` 是真連結，`aria-label="開啟筆記：<標題>"`（既有 `OpenLink`）
- `prefers-reduced-motion`：`.cal-dot`（transform）、`.cal-note`（box-shadow／transform）併進 `workbench.css` 既有的 reduced-motion 選擇器列表
- 對比（WCAG 相對亮度算的，2026-09-30）：handoff 把小字全部指定 `--wb-ink-3`（`#6c798e`），在月曆的底色上**都不過 4.5:1** —— on `--wb-cal-cell` 4.2:1、on `--wb-cal-cell-out` 4.1:1、on `--wb-cal-thiswk` **3.8:1**、on 白 4.4:1。受影響的是 `.cal-wd`（12px 星期）、`.cal-cell-h span`（12px「N 篇」）、`.cal-cell.out .cal-cell-h b`（13.5px 補位格日期）、`.cal-note-st`（10.5px 狀態文字）。Task 74 為 muted pill 遇過同一題，已有 `--wb-muted-ink`（`#4f5b6e`，在這四個底上 5.9–6.6:1）→ Q5 已定案：這四處改用 `--wb-muted-ink`
- 白字 on `--wb-blue`（今天膠囊、選中 seg）7.9:1；`.dv-ai.warn` 用 `--wb-warn-ink` 5.4:1（Dashboard Q6）
- 色塊只靠顏色與斜紋區分狀態，但 `title`／`aria-label` 有狀態文字，且圖例並列，可接受

---

## 11. dev／正式環境差異

月曆本身沒有 dev-only 元素。沿用：頁首「＋ 新增筆記」（`isDev`）、Drawer 內的「複製生成提示」（`isDev`）。閱讀狀態、Drawer 正式環境皆可用。

---

## 12. npx viewer 相容性

- 新檔都在 `src/components/wb/dashboard/` 與 `src/lib/` 之下，`package.json` `files` 既有的 `src/components/wb/`、`src/lib/` 涵蓋；**不用改 `files`**
- viewer 專案的筆記可能全集中在一兩天：月檢視一格幾十顆色塊、週檢視一格內捲，都在設計內；Task 95 在 `tmp/notecraft-test` 實測
- `/wb-index.json` 不改結構；Palette 與 Drawer 不受影響
- `?tab=week` 舊網址相容（§8）

---

## 13. 實作階段

| Task | 目標 | 前置 | 驗收 |
| :-- | :-- | :-- | :-- |
| **92** 地基 | `--wb-cal-*`／`--wb-a-blue-12` token、`cal-` CSS 全部移植（含容器化的 `.cal-note`、捲動列、reduced-motion，放在 Task 74 區塊之前）；`wb-calendar.ts` 純函式 + `scripts/checks/wb-calendar.mjs`、`check:wb` 串接；`DashboardWorkbench` Tab 改名與 `?tab=week` 相容、刪舊「本週」JSX、掛空的 `<Calendar/>`（工具列佔位 + 星期列） | §15 定案 | `check:wb` 綠；Tab 顯示「更新月曆」、Body 是工具列「—」與 7 個星期標題；view-source 沒有任何 `.cal-cell` |
| **93** 月檢視 | `Calendar` 的 state 與衍生值、`CalCell`、`CalDot`；導覽／本週／圖例／週月切換；`thiswk`／`today`／`out` | 92 | 與 prototype 並排比對 2026-09；翻到 2026-02（4 列）與 2026-08（6 列）格子等高、整月一屏；改閱讀狀態後色塊與圖例同幀變；單擊 Drawer、雙擊開啟、↑↓ 移焦；dev console 零 hydration warning |
| **94** 週檢視 | `CalNote`（容器 DOM）、週標題、首格 `M/D`、格內捲動、`.wk` 不標 `thiswk` | 92 | 卡片四層資訊與 prototype 一致；`+N`／AI 顏色；常駐開啟連結；一格 10 篇時只有該格捲動、Body 不捲 |
| **95** 收尾 | ≤900 橫向捲動與 ≤860 底部留白實測；無障礙走一次 Tab 序；viewer 空狀態；文件回填（本文 §16／§17、workbench.md §8.1 一行、Dashboard 文件 Q4 加註、CLAUDE.md、PRD `/bump-prd`、CHANGELOG、README 截圖）；`npm version minor` → notecraftapp 1.5.0 | 93、94 | `npx tsc --noEmit && npx astro build && npm run check-plugins` 綠；tsc 錯誤數不增加；`grep -r "$HOME" dist/` 0 筆 |

```
92 ─┬─ 93 ─┐
    └─ 94 ─┴─ 95
```

**交付節奏**：全程在 `feat/dashboard-update-calendar` 單一分支，依 Task 逐步 commit，95 完成後併回 `main`。每個 commit 都要能通過 `npx tsc --noEmit && npx astro build`（`tsc` 本來就有數十個既有錯誤，看的是有沒有新增）。Task 文件待展開為 `docs/tasks/task-92…95-*.md`，並在 `tasks/README.md` 加一節（§15 已定案，可直接展開）。

---

## 14. 風險

| 風險 | 說明 | 對策 |
| :-- | :-- | :-- |
| **hydration 警告** | 整個格區是「SSR 不輸出、client 補齊」；若有人把 `anchor` 初值寫成 `iso(new Date())` 就 mismatch | §5.1 表為驗收清單；dev console 零警告才算過 |
| **月檢視整月一屏 vs 格子最小高** | `minmax(0,1fr)` 讓列等高，但 `.cal-cell{min-height:64px}` 在 6 列月份 + 矮視窗時會撐開格區，Body 出現捲動列 | 預期行為（§3.1）；Task 93 附一張 2026-08 在 768px 高的截圖確認捲動發生在 Body、不是整頁 |
| **月色塊被裁切** | 一天超過約 40 篇時 `overflow:hidden` 吃掉多的色塊，只有「N 篇」看得出來 | 接受；viewer 專案若真的一天匯入上百篇，週檢視可捲、Drawer 可開，資訊沒丟 |
| **`.cal-body` 蓋掉手機底部留白** | `.cal-body{padding:…}` 若放在 Task 74 的 860 媒體規則之後，底部 Tab bar 會遮住最後一列 | §7.1 規定放前面；Task 95 在 760 寬實測 |
| **`Date.setMonth` 溢位** | 1 月 31 日 `setMonth(+1)` 變 3 月 3 日 | `calShift` 一律以 `new Date(y, m + dir, 1)` 建構，斷言鎖住 |
| **兩種「本週」並存** | 總覽 KPI「本週更新」是滾動 7 天，月曆「本週」是日曆週，數字可能不同 | Q1 已定案維持並存；CHANGELOG 與 workbench.md §5.4 各加一句說明 |
| **↑↓ 移焦順序** | 月檢視色塊是 DOM 順序（同一格內新 → 舊、格與格由左到右由上到下），不是「同一欄往下」 | 接受；加 `role="grid"` 的成本遠高於收益（§6.2） |
| **island 變大** | 四個新元件 + 純函式 | 無新依賴；估 +4 KB gzip |

---

## 15. 待釐清問題

5 題已於 2026-09-30 逐題確認（全部採建議選項 A），結論見 §16；本文即實作依據。

**Q1 🔴 「週」的定義：月曆的日曆週 vs 全站既有的滾動 7 天** —— ✅ 已定案：A（2026-09-30）
- **A（建議）月曆用日曆週（週日→週六），總覽 KPI「本週更新」與更新日誌維持滾動 7 天**。理由：月曆格子天生對齊日曆邊界，handoff 的週檢視、`.thiswk`、「本週」按鈕也都是日曆週；KPI 的語意在 v1.4.0 已定案（Dashboard Q2），改它會擴大範圍。代價是同一頁兩個「本週」數字可能不同（週一時 KPI 算到上週四，月曆只算週日到週一）
- B 全站統一改日曆週：KPI「本週更新」、更新日誌的 `weekWindow()` 都改成週日起算。一致，但更新日誌「本週」在週一只剩兩天資料，v1.4.0 的長條圖分格也得跟著改
- C 月曆週檢視也用滾動 7 天（今天在最右格）。與 KPI 一致，但那就不是月曆，月檢視的 `.thiswk` 也無從定義

**Q2 🔴 月色塊的 DOM：純 `<button>` vs 容器＋常駐開啟連結** —— ✅ 已定案：A（2026-09-30）
- **A（建議）純 `<button>` 走 `rowHandlers`，沒有 `wb-row-open`**。理由：14×14 放不下第二個目標；treemap 方塊（Dashboard §6.4）已是同樣的例外，理由相同；雙擊／Enter／⌘點擊／中鍵都能開筆記，Drawer 內也有「開啟」。CLAUDE.md 的「列的 DOM 規則」要加一句「格狀的小目標（treemap 方塊、月色塊）例外」
- B 色塊做成 `<a href="/notes/<slug>">`、單擊直接開筆記、不開 Drawer。DOM 最單純，但與週檢視、總覽所有列的「單擊 Drawer」不一致
- C 容器內放色塊按鈕 + 一顆 8px 的迷你開啟連結。守住規則，但 22px 寬的目標在格子裡排不整齊、觸控更點不到

**Q3 🟡 `view`／`anchor` 進不進網址** —— ✅ 已定案：A（2026-09-30）
- **A（建議）不進**，都是元件 state。理由：與寫作頻率區間、更新日誌 `off`／`pick` 同精神（Dashboard §1.3）；workbench Q3 定的「進網址」是篩選條件，檢視方式與翻頁位置不是
- B `?tab=calendar&view=week` 進網址、anchor 不進。書籤能記住週檢視；但 `?view=` 在 `/notes` 是列表 view 的參數名，兩頁同名不同值，Palette 與 `wb-routes.ts` 要多一層判斷
- C 兩者都進（`&view=week&at=2026-09-27`）。可分享「看這一週」，但這是個人筆記站，需求弱

**Q4 🟡 「本週」按鈕文案** —— ✅ 已定案：A（2026-09-30）
- **A（建議）照 handoff「本週」**。理由：high-fidelity 交付，README 明寫「跳回包含今天的那一週（月檢視則跳到當月）」
- B 改「今天」。兩種檢視下語意都準（anchor 回今天）；但偏離設計稿，且與 Q1 一起看，「本週」剛好強調了月曆用的是日曆週

**Q5 🟡 格子底色上的小字：handoff 的 `--wb-ink-3` 不過 4.5:1（最差是當週底 3.8:1，§10）** —— ✅ 已定案：A（2026-09-30）
- **A（建議）改用既有 `--wb-muted-ink`**（`#4f5b6e`，5.9–6.6:1），套在 `.cal-wd`、`.cal-cell-h span`、`.cal-cell.out .cal-cell-h b`、`.cal-note-st` 四處；不新增 token。理由：Task 74 為 muted pill、Dashboard Q6 為 AI 計數都已做過同一種修正，這裡不該開倒車；肉眼差一階灰，版面不變
- B 照 handoff 原值。high-fidelity 交付；但 12px 以下的字在淡藍底上 3.8:1 是明確的 AA 失敗，且總覽的同類文字都在白底上（4.4:1），月曆是第一個把它放到有色底的地方

### 優先順序一覽

Q1、Q2 影響 `wb-calendar.ts` 介面與 `CalDot` 的 DOM，Task 92 動工前先定；Q3–Q5 只影響 `Calendar.tsx` 幾行與四條 CSS 規則，可在 Task 93 動工前補定。

---

## 16. 定案紀錄

| # | 題目 | 結論 | 日期 |
| :-- | :-- | :-- | :-- |
| Q1 | 週的定義 | **月曆用日曆週（週日→週六）**：週檢視、月檢視 `.thiswk`、「本週」按鈕皆以此為準。總覽 KPI「本週更新」、更新日誌 `weekWindow()`、寫作頻率分格**維持滾動 7 天**（Dashboard Q2 不動）。同頁兩個「本週」數字可能不同，CHANGELOG 與 workbench.md §5.4 註明 | 2026-09-30 |
| Q2 | 月色塊的 DOM | **純 `<button>` 走 `rowHandlers`**（單擊 Drawer、雙擊／Enter 開啟、⌘/Ctrl 與中鍵新分頁），**不放**常駐 `wb-row-open`；與 treemap 方塊同一例外。CLAUDE.md「列的 DOM 規則」補一句「格狀小目標（treemap 方塊、月色塊）例外」 | 2026-09-30 |
| Q3 | `view`／`anchor` 進不進網址 | **不進**，都是 `Calendar` 的元件 state；切 Tab 離開再回來重置為「月、今天」。網址只有 `?tab=calendar` | 2026-09-30 |
| Q4 | 「本週」按鈕文案 | **照 handoff「本週」**：anchor 回今天，月檢視即跳到當月 | 2026-09-30 |
| Q5 | 格子底色上的小字顏色 | **改用既有 `--wb-muted-ink`**（`#4f5b6e`）套在 `.cal-wd`、`.cal-cell-h span`、`.cal-cell.out .cal-cell-h b`、`.cal-note-st` 四處；不新增 token。白底上的副標與圖例文字仍照 handoff 用 `--wb-ink-3` | 2026-09-30 |

---

## 17. 實作後回填

Task 92–95 已全部實作（2026-09-30，隨 notecraftapp v1.5.0），逐 Task commit 於 `feat/dashboard-update-calendar`。

| 待驗證項 | 結論 |
| :-- | :-- |
| SSR 佔位 | 正式 build 的 `index.html` 完全沒有 `cal-` 節點：island 的 Tab 初值是「總覽」，月曆只在切 Tab 或 `?tab=calendar` 的 effect 之後才掛，掛的時候 `now` 已在。`anchor` 仍以 `now ? calIso(now) : null` 做 lazy 初值，伺服器與首次 client render 兩邊都是 null，§5.1 的空殼分支保留但實際上只會出現在 `now` 尚未到的極端情況 |
| hydration 警告 | dev console 0 筆（含 `?tab=calendar` 直達、翻月、翻週、切檢視、開 Drawer、改閱讀狀態後） |
| 4 列／6 列月份 | 2026-02：28 格、無補位格、每列 136px 等高；2026-08：42 格、前後補位格、每列 108px；1400×900 時 Body `scrollHeight === clientHeight`（無捲動列）。1400×**700** 翻到 8 月每格 77px 仍一屏放完 —— Body 要到視窗高約 640 以下才會捲動 |
| 閱讀狀態即時 | 另寫 localStorage 並 dispatch `nc-reading-changed`：卡片狀態列 `dv-rs-done`、文字「已完成」、圖例「已完成 1／待開始 1」同幀更新；還原後回「待開始」 |
| Drawer 與列語意 | 單擊卡片主區 Drawer 開、`.sel` 與 `aria-pressed` 同步、`Escape` 關閉；`button a, a button` 為 0；每張卡恰一個 `wb-row-open` |
| viewer 專案 | `tmp/notecraft-test`（8 篇、集中在 2026-07-05 那週）：月檢視當月 0 篇、圖例三個 0、格子照畫；週檢視 8 張卡片在同一格內捲，無系列／無標籤的卡片只剩狀態列與標題；console 0 筆錯誤 |
| 響應式 | 1400：格 147px；1100：138px；900：110px、格區 `scrollWidth === clientWidth`（7×96+36 = 708 還塞得下）；760：Rail 變底部 54px Tab bar、最後一列底 826 < Body 底 846，`.cal-body` 沒蓋掉底部留白；375：格 96px、**格區**橫向捲動（708/335）、`documentElement` 無橫向捲動（375/375） |
| 對比 | `.cal-wd`、`.cal-cell-h span`、`.cal-note-st` 的 computed color 皆 `rgb(79,91,110)`（`--wb-muted-ink`，Q5） |
| 斷言 | `npm run check:wb`：wb-dashboard 11 組 + wb-calendar 12 組全綠 |
| build | `npx tsc --noEmit` 48 → 48（基準不變）；`astro build` 55 頁；`grep -r "$HOME" dist/` 0 筆 |

### 實作中新增的決定

| 項目 | 決定 | 為什麼 |
| :-- | :-- | :-- |
| **`anchor` 用 lazy 初值** | `useState(() => (now ? calIso(now) : null))` 加一個 `now` 變動的 effect，而不是只靠 effect | 月曆掛載時 `now` 幾乎一定已在；只靠 effect 會多一幀「—」空殼再跳成整月。初值在 `now` 為 null 時仍是 null，兩邊一致 |
| **`readingSeg()` 共用** | `CalDot.tsx` export，`CalNote` 也用 | 兩處的「`live ? readingStatus : not-started` → `DV_RS` 段」完全相同 |
| **`.cal-note-st` 加 `white-space:nowrap`** | 規格沒寫 | 容器化後右側多了開啟連結，800px 視窗的窄格子裡「待開始」被擠成直排三個字 |
| **`.cal-note-sr` 的省略號落在內層 `<span>`** | 系列標題多包一層 | prototype 把 `text-overflow` 放在 flex 容器上不會生效；與更新日誌 `.dv-ev-sr` 同一個修正 |
| **導覽按鈕 `disabled` 樣式** | `opacity:.5; cursor:default`，hover 底色只在 `:not(:disabled)` | prototype 沒有 disabled 態（它永遠有 anchor） |
| **reduced-motion 也取消 hover 位移** | `.cal-dot:hover,.cal-note:hover{transform:none}` | 只關 transition 的話放大／上移仍會瞬間發生 |
| **今天的格子加 `aria-current="date"`** | 純樣式的膠囊不帶語意 | 規格 §10 |
| **`check:wb` 串跑兩支** | `wb-dashboard.mjs && wb-calendar.mjs` | 與規格 §4.3 相同；`check-plugins` 自動掃 `scripts/checks/*.mjs` |

### 與設計稿的最終偏離

§1.3 的清單全數照做（三態、無深色、日曆週、月色塊純按鈕、週卡片容器化、`calendar` Tab key、不進網址、「本週」文案、小字改 `--wb-muted-ink`、不做「還有 N 篇」）。另加上表的 nowrap 與內層 span 兩條，都是版面修正、數值不變。

### 仍未做的

- 沒有跑 axe：`aria-*`、巢狀、對比是用 DOM 與 computed style 逐項查的，不是掃的
- Tab 序沒有逐鍵走完：只確認 DOM 順序（導覽 → 本週 → 週／月 → 色塊／卡片主區 → 開啟連結）與 `data-wb-rowfocus` 都在
