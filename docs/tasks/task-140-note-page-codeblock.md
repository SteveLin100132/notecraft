# Task 140 — 程式碼區塊：新外觀、語法色、diff、註解彈窗、`:::code-group`

> 規格 [notecraft-workbench-note-page.md](../notecraft-workbench-note-page.md) §5.2、§5.3、§5.4；Q10 定案（§14）。
> 前置：Task 137。

## 範圍

### 1. 外觀（規格 §5.3）

- `nc-cb` 結構不變；標頭品牌「檔名 → 語言 → 複製」、經典「語言（金色）→ 檔名 → 複製」，以 CSS `order` 處理
- 品牌 34px 標頭、radius 8px；經典 40px、radius 12px、淡藍陰影、pill 複製鍵
- 內文字級 `0.8em`（經典 `.84em`，Q10：跟著倍率縮放），line-height 1.75／1.85
- 強調行：金色 13% 底、行號欄 2px（經典 3px、行號 700）金色內陰影
- 語法色定義為 `--wb-cd-*`（`workbench.css` 第一個 `:root`），規則只引用變數；`type`／`attr`／`punct` 的對應依規格 §5.3；**簡報的 `<Code>` 不受影響**
- 暗色語法色先不寫（Q1）

### 2. diff

- ```` ```diff ```` 區塊：每行第一個字元 `+`／`-`／空白決定類型，輸出時去掉；行號欄改顯示 `+`／`−`／空白；行加 `is-add`／`is-del`
- 每列 `min-height: 1.75em`，空白列不塌陷
- 語法切詞：`diff` 本身沒有語言，內容以純文字顯示；可用 `lang=ts` meta 指定內容語言（`code-tokenize.ts` 已有的語言）
- 複製的內容去掉 `+`／`-` 前綴

### 3. 程式碼註解（規格 §5.4）

- 語法 `:::annotate` + `(n)!` 不變
- 行尾補 `// `（已以 `//` 結尾不重複；非 `//` 註解語言依語言用 `#` 等，無法判斷時不補）＋ 1.75em 圓圈，金底白字、hover scale 1.12、展開時 `--wb-blue`
- 彈窗 400px、圓圈下方 14px、左偏 280px 並夾在區塊寬度內；藍色編號開頭；`.94em`、line-height 1.9
- 下方清單：script 初始化成功後加 `.is-enhanced` 以 CSS 隱藏（不用 `hidden`，pagefind 照常索引）
- 同時只展開一則；點同一個、點外面、Esc 關閉

### 4. `:::code-group`（新語法）

- `:::code-group` 內放多個圍欄程式碼；分頁名取 `title`，沒有則取語言標籤
- 輸出沿用 tabs 的 DOM 與 `nc-tabs.ts`；內層程式碼去外框與圓角
- 內容不是圍欄程式碼的子節點 → 照 directive 錯誤處理慣例（還原成字面並 warn）

## 要改的既有檔案

`src/lib/remark-notecraft-codeblock.ts`、`src/lib/code-tokenize.ts`（diff meta 解析）、`src/lib/remark-notecraft-directives.ts`、`src/pages/notes/[...slug].astro`（註解、複製 script）、`src/styles/global.css`、`src/styles/workbench.css`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 對照 | handoff 兩篇範例的程式碼 | 兩主題截圖 | 一致 |
| diff | 含空白行的 diff | build | 行號欄 `+ − ␠`、空白行不塌陷；複製結果無前綴 |
| 註解 | 3 個註解 | 依序點、Esc、點外面 | 只開一則；無 JS 時清單可見 |
| code-group | 3 個分頁 | 切換 | 只顯示一個；方向鍵可用 |
| 簡報 | 有程式碼的 deck | 開簡報 | 外觀不變 |
| 全套 | — | `npx tsc --noEmit && npx astro build` | 通過 |
