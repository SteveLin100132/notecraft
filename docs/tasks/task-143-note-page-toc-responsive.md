# Task 143 — 目錄與響應式

> 規格 [notecraft-workbench-note-page.md](../notecraft-workbench-note-page.md) §3.3、§6；Q7 定案（§14）。
> 前置：Task 137、138（標題錨點）。

## 範圍

### 1. `Toc.tsx`

- 收錄範圍**維持 H1–H3**（Q7），標頭統計維持 H1／H2／H3；`inc-` 標題 icon 保留
- 標頭「目錄」11px 700 letter-spacing .1em，品牌為 `--wb-blue`
- 「全部收合／展開」移到標頭下方
- 收合後在收合鈕顯示子項數
- scrollspy 判定線 140 → 120px；目前項目 700 藍字＋2px 金色左框，品牌另加藍色 9% 底與右側圓角；上層路徑 600 藍字
- 目前項目在收合段落內時**直接顯示該項**（取代現況的 `.proxy`）
- `position: sticky; top: 24px`、最大高度 `100vh − 170px`
- 點擊平滑捲到 −24px、reduced-motion 直接跳（不變）
- `tocDefault` 偏好沿用
- 取標題文字時排除 `.nc-anc`

### 2. 窄畫面

- 單欄時目錄在內文上方，收成 42px「目錄 ＋ 目前章節」單列按鈕，點開展開列表、點項目後收合
- 寬度判斷不再量 `.wb-host`：改用與版面相同的 container query（`Toc` 只需知道是否窄版時，以 `matchMedia` 無法表達 container 的話，改量 `.np-page`）

### 3. 響應式整體

- 三段：完整（220px 目錄、gap 48）／中段（184px、gap 28、左右 padding 28／24）／單欄（padding `20px 20px 150px`、H1 24px、隱藏錨點、並排圖片與定義清單單欄）
- 門檻以內容寬換算（Task 137 定值），實測電腦、平板（殼為平板模式）、手機三種寬度與 Sidebar 收合／展開

## 要改的既有檔案

`src/components/islands/Toc.tsx`、`src/pages/notes/[...slug].astro`、`src/styles/workbench.css`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 對照 | handoff 4 篇 × 三種寬度 | 截圖 | 一致（目錄層級以 Q7 為準） |
| scrollspy | 長筆記 | 捲動 | 目前項目與上層路徑正確；收合中也顯示 |
| Sidebar | 寬螢幕收合／展開 Sidebar | — | 版面依內容寬切換 |
| 手機 | 375px | 點目錄按鈕、點項目 | 展開→捲動→收合 |
| 全套 | — | `npx tsc --noEmit && npx astro build` | 通過 |

## 實作記錄（2026-10-31）

- 目錄量 `.np-host` 寬度（< 720 單欄）；目前項目在收合段落裡直接顯示；收合鈕顯示直接子項數
- 詳見規格 §15
