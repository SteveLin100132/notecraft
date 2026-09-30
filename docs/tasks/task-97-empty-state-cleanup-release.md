# Task 97 — 空狀態插圖收尾：響應式實測、viewer、文件回填、發版 1.5.1

> 規格 [notecraft-workbench-empty-states.md](../notecraft-workbench-empty-states.md) §7、§10、§11、§15；Q4 定案（§14）。
> 前置：Task 96。

## 範圍

### 1. 實測

- 1280×800 與 Row 2 觸底高度：更新日誌空狀態各截一張
- ≤980px（清單 `max-height:320px`、`is-empty` 時高度＝內容）、≤680px 單欄、375px 手機：兩處空狀態各看一次
- Safari 與 Chrome 各確認一次 SVG 顏色有吃到 token（不是黑色）
- npx viewer：`tmp/notecraft-test`（無 `@ai-visualize` 標記）看 AI 佇列空狀態、更新日誌切到空週

### 2. 文件回填

- 規格 §15「實作後回填」（量測數字、是否加了矮視窗規則、與設計稿的最終偏離）；文件狀態改「已實作」
- `notecraft-workbench-dashboard.md` §6.5 加一行指向本規格
- CLAUDE.md「Workbench 工作台」加一行：空狀態插圖走 `EmptyState`（`pt-empty` class、SVG 以 `style` 上色、不新增 token）
- PRD `/bump-prd`、CHANGELOG

### 3. 發版

`npm version patch` → notecraftapp **1.5.1**；開 PR 併回 `main`。

## 驗收

- [x] `npx tsc --noEmit && npx astro build && npm run check-plugins` 綠；tsc 錯誤數不增加
- [ ] `grep -r "$HOME" dist/` 0 筆 —— 仍有 1 筆 main 上既有的（見實作記錄），本分支未新增
- [ ] 截圖附在 PR —— 未附（gh CLI 無法上傳圖片）；實測數字記在規格 §15

## 實作記錄（2026-09-30）

- viewer（`tmp/notecraft-test`，1280×760）：更新日誌空狀態套用矮視窗規則、不裁切
- Safari 未實測（驗證環境只有 Chromium），記在規格 §15「仍未做的」
- `grep -r "$HOME" dist/` 有 1 筆既有問題（ER plugin 內嵌的 `rendererPath`，main 上就有），另開任務
- PRD v1.16.0（Phase 4.20）；CLAUDE.md、Dashboard 文件 §6.5／§6.6 同步
