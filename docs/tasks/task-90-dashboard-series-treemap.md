# Task 90 — Dashboard 中欄：系列卡與標籤分布馬賽克

> 規格 [notecraft-workbench-dashboard.md](../notecraft-workbench-dashboard.md) §4.3、§6.3、§6.4、§6.6、§10；Q5 定案；
> 系列排序沿用 [notecraft-workbench.md](../notecraft-workbench.md) Q15a。
> 設計交付 README §5、§6；原始碼 `source/pt-dash2.jsx` 的 `DvSeries`、`DvTags`、`dvTreemap`、`DV_TILE`。
> 依賴 [Task 87](task-87-dashboard-foundation.md)（純函式與斷言）。可與 Task 88、89 並行。

## 範圍

### 1. `SeriesCard.tsx`

- 資料：`series.filter(s => s.chapters.length > 0)` → `seriesProgress(chapters.map(c => c.ref), live)` → 排序 **進行中 → 未開始 → 已讀完**（進行中依 `pct` 高到低，其餘依 registry 順序；與現行 `SeriesProgressWidget` 同）→ **取前 3**（Q5）
- 副標「共 N 個系列」的 N 是排序前的總數；右上 `<a className="dv-link" href="/series">查看全部</a>`
- 每列 `.dv-sl-row`：
  - 頂：`<a className="dv-sl-n" href={`/series/${s.id}`}>`（8px 色塊 `.dv-sw` 底色 `var(--gc)`，由容器 `wb-acc-${s.accent}` 給）＋右側「**done**／total 篇」
  - 進度條 `.dv-sl-bar`：已完成段 `var(--gc)`、閱讀中段 `.rd` 金色斜紋；`title="已完成 a・閱讀中 b・待開始 c"`
  - 底：未讀完 → 「下一篇 `{next.title}`」＋ `<a className="dv-btn" href={next.href}>開始閱讀／繼續閱讀 ›</a>`（`ChevronRight` 13px）；`p.completed` → `.dv-sl-done`（`Check` 13px）「已全部閱讀」
  - 名稱連結與「下一篇」連結是兩個獨立 `<a>`，同列不巢狀
- `live=false`（SSR）：全部未開始、進度條空、**不顯示按鈕**、排序為 registry 順序（與 v1.0.0 相同）
- 無系列：副標「共 0 個系列」、內容一行「尚未定義系列」＋ `.dv-link` 到 `/series`
- `.dv-midcol .dv-sl{max-height:58%}` 與清單 `max-height:258px` 由 CSS 負責；3 個系列以內不會捲

### 2. `TagTreemap.tsx`

- 輸入：`topTagsWithRest(tags, 11, tagTotal, tagUseTotal)`（Task 87）→ `treemap(items, 0, 0, 100, 100)`
- 副標「`tagTotal` 個標籤・共標記 `tagUseTotal` 次」；右上 `.dv-link` 到 `/tags`
- 量測：`ref` 掛在 `.dv-tm`；`useEffect` 內 `getBoundingClientRect` + `requestAnimationFrame` 一次 + `ResizeObserver` + `window.resize`；**量到 0×0 不更新 `sz`**（隱藏的 Browser pane 會量到 0）；`sz` 初值 `{ w: 360, h: 220 }`
- 每塊 `<button type="button" className="dv-tile …">`：
  - `style`：`left/top/width/height` 為 %，`background`／`color` 依 `tileStyleIndex()` 取六組 token；`rest` → `--wb-bg`／`--wb-ink-3`
  - `tileTier(pw, ph)`：`big` → 名稱 13px＋數字 26px；`full` → 名稱＋數字；`num` → 只有數字（加 `.num`）；`none` → 無文字
  - `aria-label`：`#名稱：N 篇`；rest：`其他 N 個標籤：M 篇`
  - 點擊：一般 → `location.assign("/notes?tag=" + encodeURIComponent(name))`；rest → `/tags`；`⌘/Ctrl` 或中鍵 → `window.open`
  - hover：`setHov(k)`，其他塊加 `.dim`
- tooltip `.dv-tip`：`position:fixed`、`z-index: var(--wb-z-tip)`、`left = min(clientX + 12, innerWidth − 180)`、`top = clientY + 14`；第一行 `#名稱`（粗）、第二行「N 篇・P%」（P 以 `tagUseTotal` 為分母）；只跟滑鼠事件，`onMouseLeave` 清除
- 六組方塊配色（照 `DV_TILE` 順序）：
  1. `--wb-blue`／`--wb-on`
  2. `--wb-blue-l`／`--wb-on`
  3. 斜紋 `--wb-gold` on `--wb-dv-gold-soft`（週期 6px）／`--wb-dv-gold-ink`
  4. `--wb-dv-blue-soft`／`--wb-blue`
  5. 斜紋 `--wb-dv-hover-line` on `--wb-dv-blue-softer`（週期 6px）／`--wb-blue-d`
  6. `--wb-dv-gold-soft`／`--wb-dv-gold-ink-2`

  斜紋字串以 CSS 變數組出來（`repeating-linear-gradient(135deg,var(--wb-gold) 0 1.6px,var(--wb-dv-gold-soft) 1.6px 6px)`），不寫 hex
- 無標籤：副標「0 個標籤・共標記 0 次」、內容「尚無標籤」
- ≤980px：`.dv-tm` 固定高 220（CSS 已處理）；`tileTier` 自然退級

### 3. `Overview.tsx`

中欄 `.dv-midcol`：`<SeriesCard …/>` 在上、`<TagTreemap …/>` 在下。

## 要改的既有檔案

`src/components/wb/dashboard/Overview.tsx`。新增 `SeriesCard.tsx`、`TagTreemap.tsx`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 前 3 個 | 5 個系列：讀完／未開始／進行中 60%／進行中 20%／未開始 | — | 顯示 進行中 60%、進行中 20%、未開始（第一個）；副標「共 5 個系列」 |
| 繼續閱讀直達 | 某系列讀到第 3 章 | 點「繼續閱讀」 | 進第 3 章；下一章是資料檔則進 `/view/…` |
| 讀完 | 某系列全完成且進前 3 | — | 綠勾「已全部閱讀」、無按鈕 |
| SSR | view-source | — | 系列依 registry 順序、無按鈕、進度條空 |
| HTML 合法 | — | 檢查系列列 DOM | 兩個 `<a>` 並排、不巢狀 |
| 面積比例 | 標籤 A 10 篇、B 5 篇 | 量 DOM 寬高 | A 的面積約為 B 的 2 倍（±2%） |
| 其他 | 15 個標籤 | — | 11 塊 + 「其他 4 個」；點它進 `/tags` |
| 文字等級 | 視窗 1400 → 1000 → 700 | 縮放 | 大塊 `big` → 中塊只剩名稱＋數字 → 小塊只剩數字或無字；不閃、不報錯 |
| tooltip | 滑到任一塊（含無字的小塊） | — | 游標右下出現 `#名稱`／「N 篇・P%」；離開卡片消失；靠右邊時不超出視窗 |
| 篩選 | 點方塊 | — | 進 `/notes?tag=<原名>`（不帶 `#`）；`⌘`＋點擊開新分頁 |
| 對比 | — | 檢查六組方塊文字 | 皆 ≥ 4.5:1（規格 §10 的數字） |
| 零色碼 | — | grep `#[0-9a-f]{6}` 於 `TagTreemap.tsx` | 0 筆 |
| 隱藏 pane | Browser pane 隱藏時開頁再顯示 | — | 方塊文字仍在（量到 0 不更新） |
| 斷言 | — | `npm run check:wb` | 綠（Task 87 的 treemap 斷言涵蓋本 Task 用的函式） |

## 依賴

Task 87。

## 實作記錄（2026-09-29）

- `SeriesCard.tsx`／`TagTreemap.tsx`；treemap 與方塊等級全走 `lib/wb-dashboard.ts`，元件只量容器（量到 0×0 不更新 `sz`）
- 方塊配色用 `.dv-tile-{0..5}`／`.dv-tile-rest` class；中鍵以 `onAuxClick` 開新分頁
- 實測（30 篇、24 個標籤、7 個系列）：12 塊（11 + 其他 13 個）、面積與 count 成比例（#AI 陪跑筆記 18 篇 144×75 vs #專案管理 11 篇 144×46）、hover 出 tooltip「#AI 陪跑筆記／18 篇・29%」且其他 11 塊 `.dim`；系列卡顯示前 3 個、副標「共 7 個系列」、SSR 無 `.dv-btn`
- 1400×900 的中欄 treemap 實際約 313×121，小塊自動退到只顯示數字——與 prototype 相同的取捨
