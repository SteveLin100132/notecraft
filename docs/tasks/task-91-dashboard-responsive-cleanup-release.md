# Task 91 — Dashboard 收尾：響應式、無障礙、viewer 空狀態、清理、文件回填與發版

> 規格 [notecraft-workbench-dashboard.md](../notecraft-workbench-dashboard.md) §9、§10、§11、§12、§13、§14、§17。
> 依賴 [Task 88](task-88-dashboard-kpi-freq.md)、[Task 89](task-89-dashboard-timeline-log.md)、[Task 90](task-90-dashboard-series-treemap.md)。本批最後一個。
> **本 Task 完成後**才把 `feat/dashboard-redesign` 併回 `main`。

## 範圍

### 1. 響應式三段（規格 §9）

| 視窗寬 | 檢查 |
| --- | --- |
| 1400 | Row 1 四欄、Row 2 三欄等高；Body 無捲動列；卡片內清單各自捲 |
| 1100 | Row 1 三欄＋寫作頻率整列；Sidebar 已收成抽屜（殼既有） |
| 900 | Row 2 兩欄、更新日誌整列；清單取消內捲、整頁捲動；日誌清單 `max-height:320`；treemap 固定高 220 |
| 760 | 同上，Rail 變底部 Tab bar；Body 底部留 54px（殼既有規則），最後一張卡不被遮 |
| 600 | 兩列都單欄；treemap 小塊自動退級；tooltip 不出現但 `aria-label` 在 |

視窗高 700 時：Row 2 `min-height:380` 生效，Body 出現捲動列（規格 §3.1 接受的行為），卡片內清單仍可捲。

### 2. 無障礙（規格 §10）

- 列：`data-wb-rowfocus`、`aria-pressed`、Enter／Space／↑↓、常駐 `wb-row-open`（Task 89 已做，這裡全頁走一次 Tab 序）
- 寫作頻率容器 `role="img"` + `aria-label`；`.dv-seg` 三顆 `aria-pressed`
- 環 `aria-hidden`；方塊 `aria-label`；日期格 `aria-pressed`；週導覽 `aria-label`
- `.dv-link`、`.dv-btn`、`.dv-full`、`.dv-tile` 的 `:focus-visible` 樣式沿用全站
- `prefers-reduced-motion`：`ncGrow` 停、方塊 transition 停
- 用 axe（瀏覽器擴充或 `@axe-core/cli`）掃一次 `/`，contrast 與 name 類 0 筆 serious

### 3. viewer 空狀態實測（規格 §12）

用 `tmp/notecraft-test`（`.claude/launch.json` 的 `viewer-poc`）與一個只有 3 篇筆記、無系列、無標籤的臨時資料夾各跑一次：

| 檢查 | 預期 |
| --- | --- |
| 無系列 | 系列卡「尚未定義系列」＋連到 `/series` |
| 無標籤 | 標籤卡「尚無標籤」 |
| 3 篇筆記 | 時間軸 3 個節點；treemap 只有幾塊仍填滿 |
| `grep -r "$HOME" dist/` | 0 筆 |
| `npm pack --dry-run` | `src/components/wb/dashboard/**`、`src/lib/wb-dashboard.ts` 在清單內（`files` 既有的 `src/components/wb/`、`src/lib/` 涵蓋） |

### 4. 清理

- `DashboardWorkbench.tsx`：刪 `Widget`、`SeriesProgressWidget`、舊總覽 JSX、不再用的 import（`GroupHeader`、`MiniButton`、`weekBuckets`、`withinDays` 等 —— 逐一 grep 確認「本週」「AI 佇列」分支沒在用才刪）；`stats` 的 `done`／`total`／`pct` 若已無人用一併刪
- `workbench.css`：再 grep 一次 Task 87 列的舊 class，確認 0 引用
- `src/lib/wb-time.ts`：`weekBuckets` 若在 `FreqChart` 只用 label，考慮是否只留 `weekOf` + label 函式；**不要**為了刪函式改斷言的涵蓋範圍

### 5. 文件回填

| 文件 | 要改什麼 |
| --- | --- |
| [notecraft-workbench-dashboard.md](../notecraft-workbench-dashboard.md) §17 | SSR 佔位實測（view-source 對照）、hydration warning 數、treemap 在 viewer 專案的表現、視窗高度不足的實際行為、實作中新增的決定、與設計稿的最終偏離清單；文件狀態改「已實作（notecraftapp vX.Y.Z）」 |
| [notecraft-workbench.md](../notecraft-workbench.md) §8.1 | 開頭加一行：「總覽 Body 已於 v1.4.0 改版，見 notecraft-workbench-dashboard.md；本節的 widget grid 描述僅存歷史」。§13 P7 同樣加註 |
| [CLAUDE.md](../../CLAUDE.md) | 目錄結構加 `src/components/wb/dashboard/`、`src/lib/wb-dashboard.ts`；Workbench 一節補一條「Dashboard 總覽的相對量與閱讀狀態都在瀏覽器算、SSR 以佔位輸出；`scripts/checks/wb-dashboard.mjs` 鎖 treemap 與週窗」 |
| [notecraft-prd.md](../notecraft-prd.md) | 用 `/bump-prd` 補 §8.1 Phase 條目與 changelog |
| [README.md](../../README.md)、[CHANGELOG.md](../../CHANGELOG.md) | Dashboard 截圖換新；CHANGELOG 列出使用者看得到的改動：總覽版面、標籤分布改馬賽克、更新日誌、**移除**「AI 視覺化生成率」百分比卡與「待生成標記」widget（資訊改由 AI 待生成卡與 AI 佇列 Tab 提供） |
| 各 Task 檔末 | 「實作記錄」（日期、實際改了什麼、偏離的理由） |
| [tasks/README.md](README.md) | 本批標為已完成 |

### 6. 版號與總檢

- `package.json` `version` → **1.4.0**（`npm version minor`；總覽整頁重做、移除兩個 widget，屬 minor）
- 發版前：

```bash
npx tsc --noEmit && npx astro build && npm run check-plugins
```

- 全站逐頁走一遍：Dashboard 三個 Tab、Drawer、`/notes?pending=1`、`/notes?tag=…`、`/series`、`/tags`；確認本次沒動到的頁面沒被 CSS 刪除波及（特別是 Sidebar 的系列進度與 `.wb-acc-*`）
- 與 `prototype/NoteCraft-Workbench-Dashboard.html` 並排做最後一次視覺比對；**刻意偏離之處以規格 §1.3 為準**，不要「修回」設計稿

### 7. 合併

併回 `main` 前由作者確認。**不要自行 push 或發佈 npm。**

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 響應式 | §1 的五個寬度 | — | 各自符合 |
| a11y | axe 掃 `/` | — | serious 0 筆 |
| 無死碼 | — | `npx tsc --noEmit`；grep 舊 class 與舊元件名 | 通過；0 引用 |
| viewer | 兩個外部資料夾 | `viewer:build` | 空狀態正確、無絕對路徑 |
| 斷言 | — | `npm run check-plugins` | 含 `wb-dashboard.mjs` 全綠 |
| 文件一致 | — | 對照 CLAUDE.md、workbench 規格 §8.1、本批規格 §17 | 三者對總覽的描述一致 |
| 版號 | — | `package.json`、CHANGELOG | 1.4.0 |

## 依賴

Task 88–90。

## 實作記錄（2026-09-29）

- 響應式：1100／900／760／600 逐一截圖，Row 1／Row 2 的欄數、treemap 220 高、底部 Tab bar、無水平捲動皆符合 §1；1400×900 Body 無捲動列
- 無障礙：以 DOM 檢查 `aria-pressed`／`aria-label`／巢狀（0 筆）；**未跑 axe**（記入規格 §17「仍未做的」）
- viewer：`tmp/notecraft-test` 與一個 3 篇、無系列無標籤的暫存資料夾各 build 一次，空狀態文案正確、`grep -r "$HOME"` 0 筆；`src/components/wb/dashboard/` 與 `lib/wb-dashboard.ts` 已在 `files` 既有的目錄之下
- 清理：死碼已在 Task 87 清完，本 Task 只再 grep 一次舊 class（0 筆）
- 文件：規格 §17、workbench 規格 §8.1／P7 加註、CLAUDE.md、CHANGELOG 1.4.0、README、tasks README、PRD
- `package.json` → 1.4.0；`npx tsc --noEmit && npx astro build && npm run check-plugins` 通過
- README 的儀表板截圖未換（記入 §17）
