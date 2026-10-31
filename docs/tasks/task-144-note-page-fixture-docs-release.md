# Task 144 — 收尾：驗收 fixture、官網同步、文件回填、發版 1.14.0

> 規格 [notecraft-workbench-note-page.md](../notecraft-workbench-note-page.md) §10、§12.1；Q11、Q12 定案（§14）。
> 前置：Task 137–143。

## 範圍

### 1. `scripts/fixtures/note-page-sample.mjs`（新增）

- 把 handoff 4 篇範例（`md-basics`、`md-advanced`、`md-viz`、`annual-leave-spec`）以**本專案語法**寫成 MDX，輸出到暫存 notesDir（不進 `src/content/notes/`），含 4 個定義、1 個資料檔與 plugins.json、pending 標記
- 比照既有 fixture：`npm pack` 後設 `NOTECRAFTAPP_DEV=1`；`--build` 後斷言：每篇都有 H1、註腳、`<mark>`、KaTeX 輸出存在；`nc-aim` 只出現在 pending；產物無本機路徑；並印 `serve` 指令供截圖
- 放 `fixtures/`，不放 `checks/`

### 2. 全項驗收

兩主題 × 三種寬度 × 4 篇逐項對照 handoff；主專案 25 篇 build 與既有語法不退化；viewer、`NOTECRAFT_BASE=/x`、`ignore.json` 各跑一次。發現的問題在本 Task 修掉並記錄。

### 3. 官網

- `sync-nc-prose.mjs` 抽出的樣式在官網以品牌主題呈現（Q11）：`.ncp` 根加上 `np-d` 或等效處理
- 官網語法說明頁補上新語法（code-group、details、figures、dl、數學、`==螢光==`、步驟 err／skip、diff）

### 4. 文件

- `CLAUDE.md`：目錄結構與新的「筆記閱讀頁（v1.14.0）」段落（主題 class、`--md-fs`、預繪、樣式落點、KaTeX、待生成標記原位渲染、目錄維持 H1–H3）
- `docs/notecraft-prd.md`：新 Phase、版本、Changelog
- 規格新增「實作後回填」、狀態改為已實作
- `docs/tasks/README.md`：本批標為已完成

### 5. 發版

- `CHANGELOG.md`：`## [1.14.0] - YYYY-MM-DD`，格式依 `npm run check:upd`
- `package.json` 版號 `1.14.0`；確認 `files` 涵蓋新檔與 KaTeX 相關資產
- 開 PR 併回 main
