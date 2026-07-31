# Task 41 — `<Terminal>` / `<Frame>` / `<Mark>` 三個小原子

> 對應 [deck-atoms-inventory.md](../deck-atoms-inventory.md) §2 A4/A5/E2–E4/F4、§4.1、§4.2。
> 依賴 [Task 38](task-38-deck-code-atom.md)（`atoms.deck.tsx` 骨架、`codeTokens`）。

三個都便宜（各 ~60 行）、設計含量低但出現頻率高，合併成一個 Task。

## 1. `<Terminal>` — 終端機 / CLI 輸出卡（A4、A5）

**實證**：mfe p8–p11（`npx create-mf-app` 的互動問答，連用 4 頁）、dataint p32（`lb4 app`）、
dataint p5/p33、tus p6/p11（npm 徽章 + 單行安裝指令）。

```ts
export interface TermLine {
  text: string;
  kind?: "cmd" | "out" | "prompt" | "choice" | "dim";   // 決定前綴與顏色
}
export interface TerminalProps extends BlockBaseProps {
  lines: TermLine[];
  title?: string;          // 視窗標題列（給 mfe p8 那種「Host Application」）
  compact?: boolean;       // 單行安裝指令模式（A5）：無標題列、單行、左側語言徽章
}
```

- `kind` 的顏色取自 [Task 38](task-38-deck-code-atom.md) 的 `codeTone(dark)`，
  **不另配一套**（終端機和程式碼在同一份簡報裡出現，色不一致會很明顯）。
- `compact` 模式對應 A5：`npm install @uppy/tus` 這種單行，不需要視窗外框。
- **不做游標閃爍動畫** —— 靜態畫面，且 `live === false` 的縮覽頁掛十幾個計時器沒有意義。

## 2. `<Frame>` — 瀏覽器 / 視窗擬真框（E2–E4）

**實證**：mfe p4（中央瀏覽器框包住微前端組合）、mfe p8–p11（框內放 UI 線框）、
tus p2（上傳中對話框 + 錯誤紅框）、tus p13/p14（兩個視窗截圖並排）。

```ts
export interface FrameProps extends BlockBaseProps {
  kind?: "browser" | "window" | "dialog";   // 預設 browser
  url?: string;                             // browser 的網址列文字
  title?: string;                           // window / dialog 的標題列
  tone?: SeriesTone | StatusTone;           // dialog 的狀態框（tus p2 的錯誤紅框）
  children: ReactNode;
}
```

- `browser`：圓點 ×3 + 網址列。`window`：標題列 + 最小化/最大化/關閉。
  `dialog`：標題 + 可選 `tone` 邊框。
- **只畫外框，不管內容** —— 內容是 `children`（截圖 `<img>`、UI 線框、`<Terminal>`、任意 JSX）。
- E3「UI 線框稿」**不做成元件** —— 那就是幾個灰色 `<div>`，`custom` 頁自己寫比填 props 快。

## 3. `<Mark>` — 行內螢光筆（F4）

**實證**：5 份簡報**全都大量使用**，是本批出現頻率最高的視覺手法，
也是最容易被硬編色碼的地方（一個 `<span style={{background:"#ffe58f"}}>` 就破功了）。

```ts
export interface MarkProps { dark: boolean; tone?: SeriesTone | StatusTone; children: ReactNode }
```

- 實作只有一個 `<span>`，但**必須在 `theme.ts` 補螢光筆底色的明暗兩階** ——
  這才是這個元件存在的理由。
- 亮色底可沿用 `--orange-50` 一類的既有 token（與筆記端 `.nc-cb__line.is-hl` 對齊）；
  暗色需新配並確認文字在其上仍達對比要求，比照 audit §3.2-D 記錄數值。

## 關鍵落地規則

1. 三個元件都收 `dark`，顏色一律經 `dkt(dark)` / `codeTone(dark)` / `toneColor()`，**不硬編色碼**。
2. 字級一律取 `DS`，**不寫字面數字**。
3. `<Terminal>` 的等寬字型走 `var(--font-mono)`。
4. **都不做互動、不做動畫**（投影片是靜態畫面）。
5. `<Frame>` 與 `<Mark>` 不繼承 `BlockShell` 的 `flex: 1 1 auto` 語意時要明確標註 ——
   `<Mark>` 是 inline 元素，不走 `BlockShell`。
6. 全型別標註、無 `any`、無 emoji。

## 實作步驟

1. `Mark.tsx` 先做（最小，順便把 `theme.ts` 的螢光筆 token 補上，後兩個都可能用到）。
2. `Terminal.tsx`：先 `compact` 單行、再完整視窗模式。
3. `Frame.tsx`：`browser` → `window` → `dialog`。
4. `blocks/index.ts` barrel 補匯出。
5. `atoms.deck.tsx` 補一頁（三個原子可共用一頁，各佔一區）：
   `<Frame kind="browser">` 內放 `<Terminal>`、旁邊一段含 `<Mark>` 的文字。
6. `/present/atoms` 逐頁截圖，亮暗兩色。

## 驗收

- [x] `<Terminal>` 的 5 種 `kind` 顏色取自 `codeTone`，與 `<Code>` 一致
- [x] `<Terminal compact>` 能表達 tus p6 的單行安裝指令
- [x] `<Frame>` 三種 `kind` 外觀正確；`children` 放 UI 線框 / `<Terminal>` / 任意 JSX 都正常
- [x] `<Frame kind="dialog" tone="critical">` 能表達 tus p2 的錯誤框（含 X icon + 「上傳失敗」文字）
- [x] `<Mark>` 在亮暗兩色下文字皆可讀，6 個 tone × 兩種主題的對比值已記錄
- [x] 三者皆無動畫、無互動、無計時器（`grep` 確認）
- [x] 無硬編色碼（`Mark.tsx` 的 4 個 hex 全在註解裡）、無字面字級、無 `any`、無 emoji
- [x] `/present/atoms` 亮暗各 12 頁皆無溢出
- [x] `npx tsc --noEmit`（18 = 既有基準線）`&& npx astro build` 通過

## 風險 / 備註

- **`<Mark>` 是三個裡最重要的**，儘管它最小。它高頻、且不做的話 AI 一定會自己寫
  硬編色碼的 `<span>` —— 那正是 v0.2 把設計決策下移到原子層要防的退化（契約 §1.2）。
- `<Frame>` 的擬真程度要克制：畫出「這是一個瀏覽器」就夠，
  不要去仿真實 Chrome 的分頁、書籤列、擴充功能圖示 —— 那些是雜訊，
  而且一旦畫得太像，內容的線框感就會顯得廉價（mfe p8–p11 的處理就很節制，可作標準）。

---

## 實作記錄（2026-07-31，已完成）

### 產出

| 檔案 | 行數 |
| --- | --- |
| `src/components/deck/blocks/Terminal.tsx` | 191 |
| `src/components/deck/blocks/Frame.tsx` | 129 |
| `src/components/deck/blocks/Mark.tsx` | 56 |
| `src/components/deck/blocks/index.ts` | barrel 補匯出 |
| `src/components/generated/atoms.deck.tsx` | 補兩頁，deck 由 10 頁增為 **12 頁** |

### 唯一一個需要改方向的地方：`<Mark>` 的底色

原規劃寫「底色可沿用既有 token」，我第一版就用 `toneColor(tone, c).soft`
（亮色 = `orange-50` #fdf4e6）。**畫出來是錯的** —— 疊在白底上幾乎看不見，
整個標記只剩下緣那條線，讀起來不像螢光筆，像「這段文字下面有底線」。

改為用 **`color-mix(in srgb, ${t.fg} 26%, transparent)`** 從 tone 的前景色即時調底色。
`color-mix` 是專案既有用法（`global.css:34` 的 focus ring、多個 `@ai-visualize` 元件都在用），
不是新引進的技術。

**沒有照原規劃在 `theme.ts` 開 `markBg`**，理由寫在元件註解裡：
單一 `markBg` 會失去 tone 支援（`<Mark tone="critical">` 就標不出來），
而 6 個 tone × 明暗兩階 = 12 個新 token 只為一個 `<span>`，不划算。
`color-mix` 一行就涵蓋全部組合。

實測對比（文字 vs 螢光筆底）：

| | orange | blue | muted | good | warning | critical |
| --- | --- | --- | --- | --- | --- | --- |
| 亮色（ink on 底） | 13.12 | 11.05 | 13.89 | 12.84 | 12.01 | 11.92 |
| 暗色（body on 底） | 6.13 | 6.85 | 5.63 | 6.51 | 6.01 | 6.90 |

螢光筆底與頁面底的亮度比落在 **1.23–1.93**，足以看出「這裡被標記過」而不刺眼。

### `<Terminal>` 的語意分色

`kind` 對映 `codeTone(dark)` 的哪一格，是照 mfe p8–p11 的實際配色決定的：

| kind | 前綴 | 取色 | 用途 |
| --- | --- | --- | --- |
| `cmd` | `>` | `string`（綠） | 使用者輸入的指令 |
| `prompt` | `?` | `keyword`（藍） | CLI 的提問 |
| `choice` | 縮排 | `attr`（天藍） | 選項 / 被選中的值 |
| `out` | — | `plain` | 一般輸出 |
| `dim` | — | `punct` | 版本號、路徑等次要輸出 |

卡片底沿用 [Task 38](task-38-deck-code-atom.md) 新增的 `codeSurface` / `codeHeader`
—— 終端機與程式碼卡在同一頁出現時，底色不一致會非常明顯。

### `<Frame>` 的克制原則

只畫「這是一個瀏覽器 / 視窗 / 對話框」，**不仿真實 Chrome 的分頁、書籤列、擴充功能圖示**。
理由寫在檔頭：那些是雜訊，而且外框畫得太像，裡面的線框內容就會顯得廉價
（mfe p8–p11 的處理很節制，以它為標準）。

`kind="dialog"` 收 `StatusTone` 時**一定同時畫 icon**（audit A-6：色彩不可單獨承載語意）——
實測 `tone="critical"` 會出現 X icon + 「上傳失敗」文字 + 紅框三者並存。

### 驗證（DOM 實測）

| 項目 | 結果 |
| --- | --- |
| `<Mark>` 6 個 tone | 底色 `color(srgb … / 0.26)`、下緣線分別為 orange-300 / blue-300 / danger-300 / success-300 / warning-300 —— 全部走 token |
| `<Mark>` 是否撐開行高 | **沒有**。兩行段落實測 72px = 2 × `lineHeight` 36px；一行段落 36px。行內 padding 不進入行盒，符合預期 |
| 動畫 / 計時器 | `grep animation\|setInterval\|setTimeout\|requestAnimationFrame` = 0 |
| 溢出 | 亮暗各 12 頁全數 `ok` |
| Task 38 迴歸 | 26 個筆記頁、32 個程式碼區塊本體仍逐位元組相同 |

### 建議上限（回填給 [Task 45](task-45-present-skill-agents-atoms.md)）

| 原子 | 上限 | 備註 |
| --- | --- | --- |
| `<Terminal>` | **18 行** | `compact` 模式不套用（本來就是單行） |
| `<Frame>` | — | 外框本身無密度問題，受限的是 children |
| `<Mark>` | — | 無數量上限，但 SKILL 應提醒「一頁標超過 3–4 處就等於沒標」 |
