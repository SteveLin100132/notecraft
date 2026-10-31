# Task 142 — 外框：AI 視覺化、PluginView、待生成標記原位渲染、系列導覽

> 規格 [notecraft-workbench-note-page.md](../notecraft-workbench-note-page.md) §5.5、§7、§11；Q6、Q9 定案（§14）。
> 前置：Task 137。

## 範圍

### 1. `GeneratedFrame.astro`

- 改為 `.md-viz` 外觀：外框 radius 10px、36px 標頭（金色 sparkle、類型 `--wb-blue-l` 700 11px、`generated/<id>.tsx` 等寬）；inline style 改 class
- **「複製提示詞」與放大鈕都保持現況**（Q9）；放大仍是 `VizZoom`，行為不改
- `data-nc-viz-body` 不可拿掉
- 資料檔模式（`<PluginView>`）：layers icon、「資料檔 · {pluginLabel}」、資料檔路徑、「開啟檢視頁 ↗」（`--wb-blue-l` 700 11.5px）、放大鈕；dev 的「以 VS Code 編輯」保留
- 屬性仍是 `src`；找不到資料檔仍 build fail（規格 §11）

### 2. 待生成標記原位渲染（Q6，規格 §5.5）

- remark：`@ai-visualize` 註解（`mdxFlowExpression`）status 為 `pending`／`failed` 時，在原位輸出 `div.nc-aim[data-pagefind-ignore]` 的 hast；`generated`／`locked` 不輸出
- 外觀依 handoff `.md-aim`（金色虛線框、標頭 `@ai-visualize · <id>`、類型、狀態 pill、PROMPT、「尚未生成……」）
- `[...slug].astro` 移除文首的 `AiMarkerCard` 清單；Header 的「待生成 N」pill 保留
- 解析失敗的註解（YAML 壞掉）不 throw，原樣略過
- 嵌入（`::include`）的子樹不輸出（placeholder 規則）
- 確認 `note-scanner`／`mdx-writer` 讀寫的原始碼格式不受影響（只改渲染）

### 3. 系列導覽 `SeriesNav`

- 移到頁尾 `.md-foot` 之前；外觀依 handoff `.md-series`（上列系列名＋「第 n / N 章」、下列上一章／下一章兩欄、560px 以下單欄）
- 資料檔章節前往 `/view/…`；閱讀進度 key 規則不變

## 要改的既有檔案

`src/components/GeneratedFrame.astro`、`src/components/PluginView.astro`、`src/components/AiMarkerCard.astro`（改為樣式來源或刪除）、`src/components/SeriesNav.astro`、`src/pages/notes/[...slug].astro`、`src/lib/remark-notecraft-*.ts`（標記輸出）、`src/styles/global.css`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 外框 | `md-viz` 範例 | 截圖 | 一致；放大仍是 VizZoom |
| 待生成 | pending、failed、generated、locked 各一 | build | 只有前兩者原位出現卡片；文首無清單 |
| pagefind | 同上 | 搜尋 prompt 文字 | 搜不到 |
| 系列 | 系列中間章、含資料檔章節 | 點上一章／下一章 | 正確導覽 |
| 全套 | — | `npx tsc --noEmit && npx astro build` | 通過 |
