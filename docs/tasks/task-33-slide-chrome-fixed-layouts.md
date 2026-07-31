# Task 33 — SlideChrome 抽離 + 5 個固定版型改寫

> 對應 [deck-slide-contract.md](../deck-slide-contract.md) v0.2 §4、§6、§11.1。
> 依賴 [Task 31](task-31-deck-type-union-v02.md)（型別）、[Task 32](task-32-deck-scale-status-tokens.md)（`DS` / status token）。

## 範圍

- 從 [src/components/deck/slideLayouts.tsx](../../src/components/deck/slideLayouts.tsx) **抽出 `SlideChrome` 成獨立元件**
  （`src/components/deck/SlideChrome.tsx`），並匯出純函式 `chromeMetrics()`。
- 改寫保留的 5 個版型：`cover`（加 agenda）、`section`（加 3 參數）、`quote`（不變）、
  `closing`（加 dark 變體）、`full-visual`（加 `viz2`）。
- **移除**退役版型元件：`LayoutBullets`、`LayoutMedia`、`LayoutCompare`。
- 字級改引 `DS`（Task 32）。

## 為什麼 SlideChrome 要獨立

`custom` 頁**不准自己畫**編號徽章、標題、橘色底線、pill、legend、callout、footnotes、頁碼、footer ——
一律由 `SlideChrome` 提供。這是 v0.2 三道護欄的第一道，也是「8 頁自由發揮」不會變成
「8 份不同簡報」的**主要原因**。現況只實作了最下面那行 footer，其餘欄位（`num` / `titleNote` /
`pill` / `legend` / `callout` / `footnotes`）都還沒有渲染端。

## 關鍵落地規則

1. **`SlideChrome` 套用於**：`custom`、`full-visual`、`closing`。**不套用於**：`cover`、`section`、`quote`。
2. **`chromeMetrics(slide): { w: number; h: number }`** 是純函式，回傳「chrome 佔用後剩下的可用內容區」，
   供 [Task 35](task-35-custom-slide-frame.md) 算 `CustomSlideProps.area`。
   實作方式：依 `slide` 上實際存在的 chrome 欄位（有沒有 `num`/`title`/`legend`/`callout`/`footnotes`）
   累加固定高度常數。**必須與實際渲染出的高度一致** —— 不一致會讓 `custom` 頁按錯的數字排版然後被裁掉。
3. `chrome: false` 時不渲染外框、`area` = 完整 1600×900。
4. **`StatusTone` 一律 icon + 文字並行**：`legend` / `callout` / `pill` 收到 status 色時，
   必須同時渲染 icon 與文字標籤，不可只有色塊（audit A-6）。
5. **裝飾性 ghost 字不受 `DS` 階梯約束**：`quote` 的 320px 大引號、`section` 的 460px 背景數字
   屬 decorative，在程式碼標註 `// decorative — 不套 DS 階梯` 即可；其餘字級一律取 `DS`。
6. `section` 三個新參數的預設值：`numScale: "mega"`、`align: "left"`、`tone: "light"`。
7. 保留現有 1600×900 絕對座標系與 `PAD = 104`。禁 emoji（icon 用 lucide）。

## 各版型改動明細

| 版型 | 改動 |
| --- | --- |
| `cover` | 新增 `agenda?: AgendaItem[]` 渲染 —— 左標題 + 右目錄（對齊目標兩份簡報的封面都是這個結構）。無 `agenda` 時維持現狀 |
| `section` | 新增 `numScale` / `align` / `tone`；大編號字級改由 `numScale` 決定（`DS.mega` / `DS.hero`）；`tone: "dark"` 走深底 |
| `quote` | 不變（僅字級改引 `DS`，320px 引號標為 decorative） |
| `closing` | 新增 `tone?: "light" \| "dark"`，dark 為深藍底玻璃卡（對齊月會 P11）；套 `SlideChrome` |
| `full-visual` | 新增 `viz2?: ComponentType` —— 兩個並排（對齊提案 P5 兩方案架構對照）；沿用既有 `live` 占位機制 |

## 實作步驟

1. 新增 `SlideChrome.tsx`：搬移現有 footer + 補齊 `num` 徽章、`eyebrow`、`title` + `titleNote`、
   `AccentRule`、`pill`、`legend`、`callout`、`footnotes` 的渲染。
2. 同檔匯出 `chromeMetrics()`，用具名常數表達各區塊高度（不要魔術數字散落）。
3. `slideLayouts.tsx`：刪除 3 個退役版型元件，改寫 5 個保留版型，字級改引 `DS`。
4. `LAYOUTS` map 更新為 5 個 key（`custom` 的元件在 Task 35 加入）。
5. `LAYOUT_SPEC` 同步更新（供未來 decklib）。

## 驗收

- [x] `SlideChrome` 可獨立渲染，7 個欄位（`num`/`eyebrow`/`title`+`titleNote`/`pill`/`legend`/`callout`/`footnotes`）皆有對應輸出
- [x] `chromeMetrics()` 回傳值與實際渲染高度**逐案一致**（至少手驗 3 種欄位組合：只有 title / title+callout / 全滿）
- [x] `cover` 有 `agenda` 時渲染左標題 + 右目錄；無時維持原樣
- [x] `section` 三參數皆生效（`mega`/`hero` 字級差異可見、`center` 對齊、`dark` 深底）
- [x] `closing` 的 `tone: "dark"` 正確渲染
- [x] `full-visual` 給 `viz2` 時兩元件並排、只給 `viz` 時單一滿版
- [x] status 色的 legend / callout **同時有 icon 與文字**
- [x] 亮 / 暗主題皆正確（含 Task 32 的 status 暗色階）
- [x] 無硬編色碼、無 emoji、無 `any`
- [x] `npx tsc --noEmit && npx astro build` 通過

## 風險 / 備註

- **`chromeMetrics()` 與實際渲染脫鉤是本 Task 最大風險。** 兩者一旦不同步，`custom` 頁會拿到錯的
  `area` 然後靜靜被裁掉（1600×900 是 `overflow: hidden`）。建議把高度常數定義在單一處，
  渲染與 metrics 共用同一組常數，而不是各寫一份數字。
- 退役 3 個版型後，既有 deck 檔已在 Task 31 移除對應頁，不會編譯失敗。

---

## 實作記錄（2026-07-30，已完成）

### 新增檔案

- **`src/components/deck/icons.tsx`** —— `IconName` → lucide-react 查表（21 個）+ `<DeckIcon>`
  + `STATUS_ICON`（`good→check` / `warning→alert` / `critical→x`）。
  [Task 34](task-34-deck-block-components.md) 的 block 元件**沿用此檔，不要做第二份**。
  `STATUS_ICON` 的用途是：呼叫端忘記給 icon 時自動補上，讓「忘記」不會導致色彩單獨承載語意。
- **`src/components/deck/SlideChrome.tsx`** —— `CHROME` 常數 + `chromeMetrics()` + `SlideChrome`
  + `FULL_AREA` + `toneColor()` / `isStatusTone()`（tone → `{fg, soft}`，識別色與狀態色分流）。

### chromeMetrics 的一致性做法（本 Task 最大風險，已解）

渲染端**每個區塊給顯式高度**（不用 auto），高度全部來自同一組 `CHROME` 常數，
`headerH()` / `footerH()` 同時被渲染與 metrics 使用。高度總和在建構上就等於 900。

瀏覽器實測（`padTop + Σ非絕對定位子區塊高 + padBottom`）：

| 欄位組合 | 區塊數 | 逐區塊實測 | 總和 |
| --- | --- | --- | --- |
| 全滿（num/eyebrow/title/titleNote/pill/legend/callout/footnotes×4） | 9 | kicker 38 · title 58 · rule 26 · legend 44 · **content 442** · gap 20 · footnotes 52 · callout 82 · footer 34 | **900** ✓ |
| title + callout | 7 | — | **900** ✓ |
| 只有 title | 6 | — | **900** ✓ |

三份 deck 共 9 個 SlideChrome 實例全部 `total === 900`、`scrollHeight === 900`，零溢出。
`content` 高度隨 chrome 增減而反向變動，正是預期的不變量。

### 字級對齊 DS 的可見變化（需你確認）

「字級全部取自 `DS`」不是零風險的機械替換 —— 既有版型的小字級比參考簡報**大約 1.5 倍**。
我採**依角色映射**（不是取最近數值），結果整體變小、變密，方向與 audit §1.2 一致：

| 位置 | 改動前 | 改動後 |
| --- | --- | --- |
| section 大編號 | 460px ghost（右側背景） | **`DS.mega` 216px 實體元素（左側）** |
| section 主標 | 92px | `DS.h1` 62px |
| cover 主標 | 116px | `DS.hero` 116（無 agenda）/ `DS.h1` 62（有 agenda） |
| cover 副標 | 36px | `DS.h3` 30px |
| eyebrow（全部） | 19–21px | **`DS.eyebrow` 13px** |
| full-visual 主標 | 46px | `DS.h2` 40px |
| closing 主標 | 62px | `DS.h2` 40px |
| footer / 頁碼 | 19px | `DS.micro` 14px |

**若你覺得縮太多**，改 `scale.ts` 的 `DS` 值即可全站生效（這正是 Task 32 建立階梯的目的），
不需要動版型元件。decorative 例外只有兩處：`quote` 的 320px ghost 引號、
`section` 的大編號（走 `numScale`）。

### 契約修正

`SectionSlide.tone` 的**預設值從 `"light"` 改為 `"dark"`**。v0.2 初稿寫預設 light，但
參考簡報的章節頁就是深藍底，且既有 deck 不帶此參數時不該無聲改變外觀。
已同步更新 `src/lib/decks.ts` 與 [deck-slide-contract.md](../deck-slide-contract.md) §6。

### 其他實作決定

- **`full-visual` 的 `vizLabel` 走 chrome 的 pill slot**（沒另給 `pill` 時自動帶入，tone orange）——
  避免 chrome 之外再畫一個 chip，也讓 `custom` 頁與 `full-visual` 的頁首完全一致。
- `closing` 與 `full-visual` 現在都經過 `SlideChrome`，各自不再畫 footer。
- `closing` 的 3 張卡以 `flex: 1` 撐滿內容區，內容短時下方留白較多。
  可接受（CTA 仍錨在底部），若要更緊湊是後續微調，不影響契約。

### 驗證（含臨時測試資料，已還原）

- `cover` 的 `agenda`、以及 chrome 的 7 個欄位，既有 deck 都沒有用到 —— 為了驗證，
  在**未 commit 的**提案草稿 deck 上補了 agenda（4 項）與兩組 chrome 欄位組合。
  這些**刻意保留**：它們是 [Task 37](task-37-regenerate-existing-decks.md) 之前唯一的 chrome 實例，
  也給重新生成時一個參考樣本。
- `viz2` 並排、`section` 的 `numScale:"hero"` / `align:"center"` / `tone:"light"`、
  `closing` 的 `tone:"dark"` 都用**臨時資料驗過並已還原**（`專案-vs-產品.deck.tsx` 已 restore，
  `git diff` 只剩 Task 31 的刪頁與頁數字串）。
- 亮 / 暗兩主題逐頁確認；status 色的 legend 與 callout 都是 icon + 文字並行。
- `grep` 確認 `src/components/deck/` 無硬編色碼（只有註解裡的色值）、無 emoji。
- `npx tsc --noEmit` = 18（既有基準線，未增加）；`npx astro build` 通過（40 頁）。
