# Task 138 — 內文基本樣式：標題、行內元素、引言、表格、圖片、註腳、待辦、螢光

> 規格 [notecraft-workbench-note-page.md](../notecraft-workbench-note-page.md) §2.2、§5.1、§5.6、§5.7；Q5、Q7 定案（§14）。
> 前置：Task 137。

## 為什麼要有這一步

現況字級是絕對值、只寫到 H3，kbd／mark／圖片／註腳／待辦沒有樣式。這一步把標準 Markdown 的所有元素依 handoff 寫成兩種主題、全部改 em。

## 範圍

### 1. 樣式（`global.css` prose 區段內，`.np-d`／`.np-o` 前綴）

對照 handoff `np.css` 與 H§「內文 `.md-flow`」的表：

- 基礎：`font-size: var(--md-fs)`、line-height 1.85、`--wb-ink-2`、段落 `margin 0 0 1em`、`text-wrap: pretty`
- **H1**（Q7：內文 H1 保留、比 H2 大一階，依主題調色）、H2（品牌金色短線）、H3–H6
- 標題錨點：remark 在 h1–h6 插入 `a.nc-anc[aria-hidden][tabindex=-1]`，hover 顯示 `#`；≤860 隱藏；`Toc` 取標題文字時要排除它
- 引言（品牌左框／經典金框金底）、巢狀引言、`cite`
- 表格：外框、th、`.r`／`.c` 對齊、表說明；經典白底
- hr、行內 code、kbd、del、連結
- 螢光 `mark`：`--wb-gold` 30%
- 圖片：圓角 8px＋框、`figure`／`figcaption`
- 經典主題灰底上的元件改白底 `--wb-panel`
- 起訖註解 `prose styles for MDX note bodies`／`unstyled button reset` 不可動

### 2. 螢光 `==文字==`（Q5）

`src/lib/remark-notecraft-mark.ts`（新增）：在文字節點中找 `==…==`（不跨段、不含換行、程式碼內不處理）轉成 `<mark>`。排在 `remarkNotecraftDirectives` 之後。

### 3. 註腳（規格 §5.6）

GFM 輸出的 `section.footnotes` 加 `nc-fns`、標題「註腳」、上標 `[n]`、返回 `↩`；樣式 `margin-top 3em`、上框、`.84em`。

### 4. 待辦清單（規格 §5.7）

`li.task-list-item` 的樣式（1.05em 方框、勾選藍底白勾、文字變灰加刪除線）；頁內 script 移除 `disabled`，勾選只改 class、不持久化。

## 要改的既有檔案

`src/styles/global.css`、`astro.config.mjs`（remark 順序）、`src/pages/notes/[...slug].astro`（待辦 script）。新增 `src/lib/remark-notecraft-mark.ts`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 對照 | handoff `md-basics` 轉成本專案語法的筆記 | 兩主題各截圖 | 與 prototype 一致 |
| 字級 | 倍率 1.25 | 開同一篇 | 所有內文元素等比放大 |
| 螢光 | `==a==`、程式碼內的 `==b==` | build | 前者是 `<mark>`，後者原樣 |
| 錨點 | — | 滑過標題 | 左側出現 `#`；目錄文字不含 `#` |
| 待辦 | 已勾選與未勾選各一 | 點擊 | 可切換；重新整理回到原狀 |
| 官網 | — | site dev | 官網示範的內文樣式正常（品牌） |
| 全套 | — | `npx tsc --noEmit && npx astro build` | 通過；tsc 錯誤數不增加 |
