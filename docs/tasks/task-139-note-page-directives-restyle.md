# Task 139 — 既有擴充語法換外觀：tip、提示框、分頁、步驟、define／include／ref、badge

> 規格 [notecraft-workbench-note-page.md](../notecraft-workbench-note-page.md) §2.2、§5、§8、§11；Q2 定案（§14）。
> 前置：Task 137。

## 為什麼要有這一步

這些語法都已實作，只是外觀是舊的橘色系、單位是絕對值。**語法一律不改、不加別名**（Q2），只改輸出的少量結構與樣式。

## 範圍

| 語法 | 改動 |
| --- | --- |
| `:tip` | 點線底線、`--wb-rail` 深色泡泡、12px、最寬 240px |
| 提示框 `:::note/tip/info/warning/danger/success` | 品牌 C 樣式（白底、類型色 40% 框、標題列 10% 底 `.74em` letter-spacing .1em）；經典（7% 底、26% 框、radius 12px）；`{collapsible}` 版本箭頭旋轉 90°、hover 底線。`info`／`success` 是 handoff 沒有的類型，比照同一套規則配色（`info` 用 `--wb-blue-l`、`success` 用 `--wb-ok`） |
| `:::tabs` | 選中分頁改品牌藍 700＋2px 藍色底線（取代橘色上緣）；外框 radius 8px、內容區 `padding 1em 1.1em` |
| `::::steps` / `:::step` | `status` 新增 **`err`、`skip`**；五種狀態的標記與狀態 pill（已完成／進行中／未開始／需處理／已略過）；`current` 的外觀改為金框光暈；done 改藍底；垂直連接線、`skip` 虛線；`layout=horizontal` 每步至少 92px、可橫捲 |
| define／include／ref | 外觀已接近 handoff，只對齊數值、改 em；flash 行為不動 |
| `:badge` | 預設金色 16% 底、`blue` 變體藍色 12% 底，其他變體保留 |

- 浮層（tip、ref 預覽卡）160–180ms 淡入上移 3px，reduced-motion 關閉
- 註解與浮層的 Esc 若是自掛 keydown，改走 `lib/wb-escape.ts`

## 要改的既有檔案

`src/lib/remark-notecraft-directives.ts`（steps 狀態）、`src/styles/global.css`、`src/lib/nc-tip.ts`（如需）。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 對照 | handoff `md-advanced` 轉成本專案語法 | 兩主題截圖 | 與 prototype 一致 |
| 步驟 | 五種 status 各一 | build | 標記、pill、連接線正確；未知 status 不 throw |
| 相容 | 主專案既有筆記 | build | 所有既有語法照常渲染、無 build 錯誤 |
| 鍵盤 | 分頁 | 方向鍵／Home／End | 行為不變 |
| 全套 | — | `npx tsc --noEmit && npx astro build` | 通過 |
