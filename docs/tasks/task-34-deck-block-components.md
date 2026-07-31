# Task 34 — Block 元件庫（6 個）

> 對應 [deck-slide-contract.md](../deck-slide-contract.md) v0.2 §5.3、§5.3.1、§12 決議 2。
> 依賴 [Task 31](task-31-deck-type-union-v02.md)（`SeriesTone`/`StatusTone`/`IconName`）、
> [Task 32](task-32-deck-scale-status-tokens.md)（`DS`/`DGAP`/status token）。

## 範圍

新增 `src/components/deck/blocks/`，**6 個**元件 + 一個 barrel `index.ts`：

| 元件 | 用途 | 建議上限 | 出處（實證頁） |
| --- | --- | --- | --- |
| `<Rows>` | N 列清單，每列可帶右欄註記 | 6 列 | 提案 P2 五大痛點、月會 P3 Issue 類型 |
| `<Cards>` | N 欄卡片，可分組帶色帶 | 6 欄 | 月會 P6/P8/P9、提案 P4 |
| `<Stages>` | 水平流程段（`plain`/`active`/`dashed` 變體） | 5 段 | 提案 P2 PAST→NOW→FUTURE |
| `<Kpi>` | 數字帶（含 `emphasis` 大數字卡） | 5 格 | 月會 P3、提案 P6 |
| `<Table>` | 表格 / 對照矩陣（cell `icon`/`tone`/`emphasis`、`highlightCol`） | 6×6 | 提案 P3、月會 P10 |
| `<Compare>` | 左右對比（VS 軸 / 建議徽章 / pros-cons） | — | 提案 P4/P5 |

**不做** v0.1 的 `text` / `columns` / `viz`（理由見契約 §5.3.1：純版面，在 `custom` 頁裡
`columns` ≈ `display:flex`、`text` ≈ 一個 `<p>` + 字級 token、`viz` ≈ 直接 import）。

## 這些元件的職責：吃下設計工藝，讓 custom 頁不必操心

`custom` 頁 import 它們就自動達成 audit 的 B-1/B-2/B-3；自己寫 JSX 才要自己守規則。
因此**設計細節必須封在元件內**：

1. **B-1 字級**：一律取 `DS`，不寫字面數字。
2. **B-2 `text-wrap: balance`**：所有標題類文字（`heading`、`CardItem.title`、`RowItem.k`）加上。
3. **B-3 `tabular-nums`**：`<Table>` 的數字格與 `<Kpi>` 的**非** emphasis 數字加
   `font-variant-numeric: tabular-nums`；**`<Kpi>` 的 `emphasis` 大數字不加**
   （dataviz 反樣式：等寬數字讓大字號的 `121` 看起來鬆散）。
4. **A-6 狀態色**：收到 `StatusTone` 時**必須同時輸出 icon + 文字標籤**，不可只有色塊。
5. **A-3 編號**：`RowItem.n` / `CardItem.n` 是 optional —— 元件只在有值時渲染，
   **不要自動補 01/02/03**（編號必須編碼真實序列，不是裝飾）。

## 關鍵落地規則

1. **欄位定義沿用 v0.1 §4 的對應段落**（`RowItem` / `CardItem` / `CardGroup` / `StageItem` /
   `KpiItem` / `TableCell` / `CompareSide` 等），唯一改動：移除 `kind` 判別欄位（各自是獨立元件）、
   `tone` 依語意改用 `SeriesTone` 或 `StatusTone`。
   沿用的理由：那套欄位設計已通過契約 §10 的 17 頁逐頁驗證。
2. **每個元件都收 `dark: boolean`**，內部 `const c = dkt(dark)` 取色。**不硬編色碼。**
3. **上限是「建議」而非型別強制** —— v0.2 已無型別層密度保護，改由
   [Task 36](task-36-present-skill-agents-v02.md) 的 SKILL 規則 +
   [Task 35](task-35-custom-slide-frame.md) 的溢出偵測 + 截圖驗證把關。
   但元件在超過建議上限時可 `console.warn`（dev-only）。
4. 元件**不含**外框與頁碼（那是 `SlideChrome`），也**不做**絕對定位 ——
   一律以 flex / grid + `DGAP` 排版，讓 `custom` 頁能自由組合。
5. 全型別標註、無 `any`、無 required-less props 破壞、禁 emoji（icon 用 lucide + `IconName` 查表）。

## 實作步驟

1. `blocks/icon.tsx`：`IconName` → lucide-react 元件的查表（21 個），供各 block 與 `SlideChrome` 共用。
   （若 Task 33 已建立此查表則沿用，不要做兩份。）
2. 逐一實作 6 個元件，每個一個檔案。順序建議：`Rows` → `Cards` → `Kpi` → `Table` → `Stages` → `Compare`
   （前四個是高用量、後兩個設計細節較多）。
3. `blocks/index.ts` barrel 匯出。
4. 建一個臨時驗證頁或直接在 [Task 37](task-37-regenerate-existing-decks.md) 的 deck 裡實測 ——
   本 Task 不新增正式頁面。

## 驗收

- [x] 6 個元件皆可獨立渲染（亮色實測；暗色見下方實作記錄的說明）
- [x] 字級**全部**取自 `DS`，無字面數字（decorative 例外需程式碼註明）
- [x] `<Table>` 數字格與 `<Kpi>` 非 emphasis 數字有 `tabular-nums`；`<Kpi>` emphasis 大數字**沒有**
- [x] 標題類文字有 `text-wrap: balance`
- [x] 傳入 `StatusTone` 時 icon 與文字標籤同時出現
- [x] `n` 未給值時**不**渲染編號（不自動補 01/02/03）
- [x] `<Cards>` 的 `groups` 色帶、`<Table>` 的 `highlightCol`、`<Stages>` 的三種 variant、
      `<Compare>` 的 VS 軸與 badge 皆生效
- [x] 無硬編色碼、無 emoji、無 `any`
- [x] `npx tsc --noEmit && npx astro build` 通過

## 風險 / 備註

- 契約 §12.1 留了一個次要決定：**props 欄位名沿用 v0.1 的 `k`/`v`/`n`/`desc`/`noteLabel`，
  還是趁重寫改成更好讀的名字？** 本 Task 預設沿用（已通過 17 頁驗證）；若要改名，
  在開工前定案，不要做一半再改。
- 這 6 個元件是 `custom` 頁的一致性來源。**做得不好用，AI 就會繞過它們自己畫** ——
  props 要好填、預設值要合理，寧可少一個參數也不要逼呼叫端填一堆。

---

## 實作記錄（2026-07-30，已完成）

### 產出

`src/components/deck/blocks/`：`shell.tsx`（共用底座）+ 6 個元件 + `index.ts` barrel。
icon 查表沿用 [Task 33](task-33-slide-chrome-fixed-layouts.md) 建立的
`src/components/deck/icons.tsx`，**沒有做第二份**。
`toneColor()` / `isStatusTone()` 沿用 `SlideChrome.tsx` 的匯出。

欄位名**沿用 v0.1**（`k`/`v`/`n`/`desc`/`noteLabel`/`tag`…）—— 作者 2026-07-30 裁定，
理由是那套欄位已通過契約 §10 的 17 頁驗證。

`<Compare>` 的 `blocks?: LeafBlock[]` 未實作（v0.2 已無 `LeafBlock` 聯集）；
要在對比欄內放任意內容，由 `custom` 頁自己寫 JSX。

### 驗證過程中修掉的兩個問題

1. **`<Kpi>` 的 emphasis 大數字被裁字。** 原本用 `DS.hero`（116px），
   `165,690` 這種 7 字元數字直接溢出卡片。
   排查後發現**尺寸選錯了**：`DS.hero` 是封面／章節編號的尺度，而參考簡報的 KPI 數字
   其實只有 45pt ≈ 50px（提案 P6）、44pt ≈ 49px（月會 P3）。
   已改為 emphasis → `DS.h1`(62)、一般 → `DS.h2`(40)，並讓 emphasis 卡
   `flex: "0 0 auto"` + 數字 `nowrap`（按內容取寬，不可能再裁字）。
2. **block 在 flex 欄裡不會自動撐開** —— 呼叫端得自己記得加 `flex: 1`，
   這是 API 人機問題（本文風險段講的「做得不好用 AI 就會繞過它們自己畫」）。
   已在 `BlockShell` 給預設 `flex: "1 1 auto"`。
   **中間踩過一次坑**：先試 `flex: "1 1 0"`，結果在**高度未定**的父層（如
   `full-visual` 的 VizPanel）會塌成 0、整組 block 疊在一起消失。
   `basis: auto` 才是安全預設：有空間就分、沒有就用內容高度。

### 驗證方式（臨時 probe，已移除）

`custom` 版型要到 [Task 35](task-35-custom-slide-frame.md) 才有，所以借 `full-visual` 的
`viz` slot（型別就是 `ComponentType`）當渲染台：在**未 commit 的**提案草稿 deck 內
臨時定義 `ProbeA` / `ProbeB` 元件並掛上去。驗完已 restore，`grep TEMP|Probe` 為 0，
deck 檔也沒有殘留 `deck/blocks` 的 import。

逐項實測結果：

| 元件 | 驗到的欄位 |
| --- | --- |
| `<Kpi>` | emphasis 大數字卡 + 3 個小格；status tone 的 label 前自動帶 icon（check / alert / x）；小數字 tabular-nums、大數字不加 |
| `<Stages>` | `plain` / `active`（實心強調 + 2px 邊）/ `dashed`（虛線）三種 variant 外觀明顯不同；段間 ChevronRight |
| `<Rows>` | `n` / icon / `k` / `v` / `desc` / `noteLabel` chip / `note`；左側 tone 色條；critical 與 warning 自動帶 icon |
| `<Cards>` | `groups` 色帶（span 2/1/1）、`badge`（右上）、`n` + icon、`points`、`chips`、`meta` 沉底 |
| `<Table>` | `corner` 斜線標題、`head`、`rowHeads`、cell 的 icon + text + note、`emphasis` 加粗框、`highlightCol` 整欄 highlight；單色階（blue tone）熱度 |
| `<Compare>` | tag / name / `badge`（含 Check icon，不只顏色）/ `rows` k-v / `pros`（綠勾）/ `cons`（紅叉）/ 中央 VS 軸 |

### 暗色主題的驗證狀態（誠實說明）

**暗色只驗到 token 接線，沒有視覺實測。** 原因：這輪的渲染台是 `full-visual` 的 VizPanel，
它在暗色主題下會把元件包在白底面板上（Task 24 為了讓亮色設計的生成元件在暗色下可讀而設），
所以在那裡放暗色 block 反而看不出真實效果。

已確認的部分：`blocks/` 全檔 `grep` 無硬編色碼，所有顏色都經 `dkt(dark)` 或
`toneColor(tone, c)`，`dark` prop 一路傳到底。
**視覺上的暗色確認排在 [Task 35](task-35-custom-slide-frame.md)** —— `custom` 頁會把 block
直接畫在投影片表面上，那才是真實使用情境。

### 其他

- `grep` 確認 `blocks/` 無硬編色碼、無 `any`、無 emoji、**無字面字級**（全部走 `DS`）。
- 超過建議上限時 `warnOverLimit()` 在 dev `console.warn`（不阻斷渲染）。
- `<Table>` 整張表加 `fontVariantNumeric: "tabular-nums"`（CJK 文字不受影響，數字能縱向對齊）。
- `n` 未給值時不渲染編號，元件**不會**自動補 01/02/03（audit A-3）。
- `npx tsc --noEmit` = 18（既有基準線，未增加）；`npx astro build` 通過（40 頁）。
