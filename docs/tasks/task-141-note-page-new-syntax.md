# Task 141 — 新語法：摺疊問答、並排圖片、定義清單、數學公式

> 規格 [notecraft-workbench-note-page.md](../notecraft-workbench-note-page.md) §5.2；Q4、Q5 定案（§14）。
> 前置：Task 137。

## 範圍

### 1. `:::details`

- `:::details[問題]` 或 `:::details{q="問題"}`，加 `open` 預設展開
- 輸出 `<details class="nc-det">`；**連續**的多個 details 包成 `.nc-dets` 群組（間距 8px）
- 白卡 radius 8px、summary 700 `.94em`、箭頭旋轉 90°

### 2. `:::figures`

- 內放多張圖片，每張的 title（`![alt](src "說明")`）當 figcaption
- 兩欄、gap 16px；≤860 單欄

### 3. 定義清單 `:::dl`（Q5，不引入套件）

- 寫法（於本 Task 定稿後回填規格）：
  ```md
  :::dl
  - **Frontmatter**：檔案開頭以 `---` 包住的 YAML。
  - **Slug**：由檔名產生的網址片段。
  :::
  ```
  每個清單項以開頭的粗體為 `<dt>`、其餘（去掉前導冒號）為 `<dd>`；不符合形式的項目 warn 並整項當作 `<dd>`
- 樣式依 handoff `.md-dl`；≤860 單欄

### 4. 數學公式（Q4）

- 新增依賴 `remark-math`、`rehype-katex`、`katex`（作者已同意，§14 Q4）；同步加進 CLAUDE.md 的技術棧說明
- `$…$` 行內、`$$…$$` 獨立；獨立公式置中、`--wb-bg` 底、radius 8px；品牌主題不顯示編號
- KaTeX CSS **只在筆記頁載入**；字型隨 build 輸出，確認 viewer（npm 套件）與 `NOTECRAFT_BASE` 下路徑正確
- 檢查 `$` 對既有筆記的影響：掃全站筆記中非程式碼的 `$`（例如金額），有誤判則以 `singleDollarTextMath` 設定或跳脫處理，結論寫回規格
- 嵌入（`::include`）與預覽卡裡的公式：確認 `this.parse()` 子樹走同一條管線
- 官網示範是否需要 KaTeX CSS：`sync-nc-prose.mjs` 只抽 prose 區段，另外處理

## 要改的既有檔案

`src/lib/remark-notecraft-directives.ts`、`astro.config.mjs`、`package.json`、`src/styles/global.css`、`src/pages/notes/[...slug].astro`（KaTeX CSS）、`CLAUDE.md`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 對照 | handoff 範例的 details／figures／dl／數學 | 截圖 | 一致 |
| `$` 誤判 | 主專案全部筆記 | build | 沒有被誤當公式的段落 |
| viewer | `npm pack` 後 `NOTECRAFTAPP_DEV=1` build | 開含公式的筆記 | 字型載入成功 |
| base | `NOTECRAFT_BASE=/x` | 同上 | 同上 |
| 全套 | — | `npx tsc --noEmit && npx astro build` | 通過 |

## 實作記錄（2026-10-31）

- 新增 `remark-math`、`rehype-katex`、`katex`；主專案的 `$` 金額沒有被誤判（全站無 `.katex` 產物）；`:::details` 連續的包成 `.nc-dets`
- 詳見規格 §15
