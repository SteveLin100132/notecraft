# Task 64 — `/notes`：Board、Table、Timeline 三種 view

> 規格 [notecraft-workbench.md](../notecraft-workbench.md) §8.2（Board 段、Table 六欄）、§8.2.1；Q7、Q9、Q26、Q27 定案。
> 設計交付 README §5.2；原始碼 `prototype/wb/pt-views.jsx` 的 `PtBoard`／`PtTable`／`PtTimeline`。
> 依賴 [Task 63](task-63-note-drawer.md)。對應實作階段 **P5**。

三種 view 共用 Task 62 的過濾結果、Task 63 的 Drawer，以及規格 §8.2.1 的點擊語意（單擊選取、雙擊／`Enter` 開啟、常駐「開啟」連結）。
**分組切換在這三種 view 隱藏**；篩選 chip 與搜尋照常。

## 範圍

### 1. Board（`src/components/wb/views/BoardView.tsx`）

**三欄**，不是設計稿的四欄（Q7：維持 PRD 2026-06-16「不引入未發佈判定」）：

| 欄 | key | 色 |
| --- | --- | --- |
| 未開始 | `not-started` | `--wb-ink-3` |
| 閱讀中 | `reading` | `--wb-blue-l` |
| 已完成 | `done` | `--wb-ok` |

- 欄 `min-width:232px`、`flex:1` 均分、底 `--wb-bg`、圓角 8；欄頭 swatch + 名稱 + 計數
- 卡片（README §5.2）：標題 12.5px/700；系列 chip（系列色描邊「<系列名> #<序>」）+ 前 2 個標籤；底部那一行 AI pill + 日期 + **「開啟」圖示（最右）**
- 欄底說明：「待生成 N 個標記」／「標記皆已生成」
- **不做**：第四欄「未發佈」、斜紋底的不可拖卡片、「草稿與規劃中，不計入進度」說明

**拖曳**：HTML5 DnD，drop 時呼叫既有 `setReadingStatus(slug, key)`；其他 view 靠既有 `READING_EVENT` 同步。
拖曳中卡片 `opacity:.45` + 虛線邊，目標欄藍虛線底。「開啟」圖示不作為拖曳把手（在它上面 `draggable={false}`、`onDragStart` 攔掉）。

**只在有精確指標的裝置上可拖**（Q26）：

```ts
const canDrag = useSyncExternalStore(subscribe, () => matchMedia("(pointer: fine)").matches, () => false);
```

SSR／首次 render 一律 `false`。為假時卡片 `draggable={false}`、不帶「拖曳可改變閱讀狀態」的 `title`，CSS 以 `@media (pointer: coarse)` 拿掉抓取游標。
觸控裝置上 Board 是純總覽。**不做觸控拖曳，Drawer 也不加狀態控制。**

閱讀狀態在 localStorage：SSR 把所有卡片放在「未開始」，hydrate 後才分欄。為了不讓卡片在眼前跳欄，
hydrate 前欄內容 `visibility:hidden`（欄頭照常顯示）。

順手依 Q7 把 [src/lib/reading-progress.ts](../../src/lib/reading-progress.ts) `readingMeta()` 的首態文案由「待開始」改為「**未開始**」——
設計稿全站用「未開始」，這是唯一的文案來源，改一處即可。改完 grep「待開始」確認沒有別處寫死。

### 2. Table（`TableView.tsx`）

**六欄 + 一個圖示欄**：標題／資料夾／系列／標籤／AI 標記／更新日／（開啟圖示，32px、無表頭文字）。
**沒有「字數」欄**（Q9），空出的寬度由標題欄吸收。

- `th` sticky、高 30、11px/700 灰；`td` 高 38、12.5px、單行省略 max 280；更新日右對齊、tabular-nums
- 「資料夾」顯示完整相對資料夾路徑，根目錄顯示「—」
- `<tr>` 掛點擊處理；鍵盤焦點由標題格內的 `<button>` 承接；連結在末欄（規格 §8.2.1）
- 預設依更新日倒序。**不做**點表頭排序（規格定案排序不保留）

### 3. Timeline（`TimelineView.tsx`）

依 `updatedAt` 的月份分段：月份標頭（12.5px/700「YYYY 年 M 月」+「N 篇」+ 分隔線）；
每列：44px 日期（`m/d`）+ 13px 垂直軸（1px 線 + 7px 藍圓點）+ 標題 + 路徑 + 標籤 + AI pill + 「開啟」圖示。
月份由新到舊，月內由新到舊。

### 4. 接線

`NotesWorkbench` 的 Tab 切換真正生效；`?view=` 依 Task 62 的規則讀寫。
手機（≤860）只保留 List：Tab 列只剩一個就整條不顯示，`?view=board` 被忽略（細節在 [Task 74](task-74-responsive-a11y.md)，本 Task 先用 `useNarrow()` 擋掉）。

## 要改的既有檔案

`NotesWorkbench.tsx`、`src/lib/reading-progress.ts`（一處文案）。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 三欄 | — | 開 Board | 只有未開始／閱讀中／已完成 |
| 拖曳改狀態 | 桌面、滑鼠 | 把卡片從「未開始」拖到「已完成」 | 卡片移欄；重整後仍在；開該筆記，`ReadingControl` 顯示已完成 |
| 跨 view 同步 | Board 拖完 | 切到系列詳情頁 | 該章節狀態一致 |
| 觸控不可拖 | DevTools 模擬觸控裝置並重整 | 長按卡片 | 不進入拖曳、沒有拖曳提示；單擊仍開 Drawer |
| 觸控筆電可拖 | 主要指標為滑鼠的觸控筆電 | 用滑鼠拖 | 可拖 |
| 不跳欄 | 有多篇已完成的筆記 | 重整 Board 並逐格看 | 卡片不會先出現在「未開始」再跳走 |
| 圖示不當把手 | — | 從「開啟」圖示開始拖 | 不觸發卡片拖曳；點擊正常開啟 |
| Table 六欄 | — | 開 Table | 無「字數」欄；標題欄較寬 |
| 篩選一致 | `?folder=private&view=table` | 切三種 view | 筆數與 List 相同 |
| 文案 | — | grep「待開始」 | 0 筆 |

## 依賴

Task 63。

## 已知取捨（規格已記錄，不是 bug）

只用鍵盤的使用者無法在 Board 上改狀態，須進筆記頁用 `ReadingControl`，或到系列詳情頁用單鍵推進。

## 實作記錄（2026-09-22）

- 拖曳的驗證用合成 `DragEvent`（Browser pane 的模擬拖曳不觸發 HTML5 DnD）：drop 後 localStorage 寫入、Sidebar 系列進度同步 1/6；從「開啟」圖示起拖 `defaultPrevented`
- `useSyncExternalStore` 讀 `(pointer: fine)`，SSR 一律 false；hydrate 前欄內容 `visibility:hidden`
- 「待開始」→「未開始」除了 `readingMeta()` 還有 `ReadingControl` 與 `seriesShared` 的統計文案共 3 處
- 手機（390）實測 `?view=board` 被忽略、Tab 列整條不顯示、網址未被改寫
