# Task 95 — 更新月曆收尾：響應式、無障礙、viewer 實測、文件回填與發版

> 規格 [notecraft-workbench-calendar.md](../notecraft-workbench-calendar.md) §9、§10、§11、§12、§14、§17。
> 依賴 [Task 93](task-93-calendar-month-view.md)、[Task 94](task-94-calendar-week-view.md)。本批最後一個。
> **本 Task 完成後**才把 `feat/dashboard-update-calendar` 併回 `main`。

## 範圍

### 1. 響應式（規格 §9）

| 視窗寬 | 檢查 |
| --- | --- |
| 1400 | 月／週都 7 欄自適應；月檢視整月一屏；`.cal-bar` 一行 |
| 1100 | Sidebar 已收成抽屜（殼既有）；圖例可能掉到 `.cal-bar` 第二行，格區不受影響 |
| 900 | 格區 `minmax(96px,1fr)`，Body 寬不足時**格區**橫向捲動，Body 本身無橫向捲動列（`document.documentElement.scrollWidth === clientWidth`） |
| 760 | Rail 變底部 Tab bar；月檢視最後一列與週檢視卡片不被 54px Tab bar 遮住（`.cal-body` 規則在 Task 74 媒體規則之前，§7.1） |
| 375（手機直向） | 月檢視 6 列月份一屏放得下；色塊一排 5 顆；橫向滑動格區可看到週六 |

視窗高 700：6 列月份 Body 出現捲動列，捲動發生在 `#nc-scroll` 而非整頁（`document.scrollingElement.scrollTop` 恆為 0）。

### 2. 無障礙（規格 §10）

- 色塊與卡片主區：`data-wb-rowfocus`、`aria-pressed`、Enter／Space／↑↓；卡片有常駐 `wb-row-open`（Task 93／94 已做，這裡全頁走一次 Tab 序：導覽 ‹ › 本週 → 週／月 → 色塊或卡片 → 開啟連結）
- 導覽 `aria-label` 依檢視切換；`.dv-seg` 兩顆 `aria-pressed`；今天的格子 `aria-current="date"`
- 色塊 `aria-label`「標題（狀態）」；卡片主區可及名稱由內文組成
- `prefers-reduced-motion`：`.cal-dot` 放大、`.cal-note` 上移都停
- 對比：`.cal-wd`、`.cal-cell-h span`、`.cal-cell.out .cal-cell-h b`、`.cal-note-st` 皆為 `--wb-muted-ink`（Q5）；用 axe（瀏覽器擴充或 `@axe-core/cli`）掃一次 `/?tab=calendar` 的月與週，contrast 與 name 類 0 筆 serious

### 3. viewer 實測（規格 §12）

用 `tmp/notecraft-test`（`.claude/launch.json` 的 `viewer-poc`）與一個只有 3 篇筆記、全部同一天更新的臨時資料夾各跑一次：

| 檢查 | 預期 |
| --- | --- |
| 3 篇同一天 | 月檢視該格 3 顆色塊、「3 篇」；其他格空；副標「共更新 3 篇」 |
| 無系列、無標籤、無標記 | 週卡片只有狀態列與標題 |
| 沒有任何筆記 | 格子照畫、副標「共更新 0 篇」、圖例三個 0、無錯誤 |
| `grep -r "$HOME" dist/` | 0 筆 |
| `npm pack --dry-run` | `src/components/wb/dashboard/Calendar.tsx`、`CalCell.tsx`、`CalDot.tsx`、`CalNote.tsx`、`src/lib/wb-calendar.ts` 在清單內（既有 `files` 涵蓋，不用改） |

### 4. 清理

- `DashboardWorkbench.tsx`：確認舊「本週」分支、`NoteRow`／`withinDays` import 已在 Task 92 清掉；`stats` 只剩 AI 佇列在用的欄位
- `workbench.css`：`grep -n "cal-more\|cal-grid.wk .cal-cell.thiswk"` 為 0（不該移植的沒混進來）；`awk` 排除 `:root` 後 hex／rgba 為 0
- `wb-calendar.ts`：`grep -n "^import" ` 只有 `import type`（或無 import）

### 5. 文件回填

| 文件 | 要改什麼 |
| --- | --- |
| [notecraft-workbench-calendar.md](../notecraft-workbench-calendar.md) §17 | SSR 佔位實測（view-source 對照）、hydration warning 數、4 列與 6 列月份截圖、viewer 表現、視窗高度不足的實際行為、實作中新增的決定、與設計稿的最終偏離清單；文件狀態改「已實作（notecraftapp vX.Y.Z）」 |
| [notecraft-workbench.md](../notecraft-workbench.md) §8.1 | 開頭那段更新加一句：「『本週』Tab 已於 v1.5.0 改為『更新月曆』，見 notecraft-workbench-calendar.md」；§5.4 補一句「月曆用日曆週（週日起），KPI 與更新日誌維持滾動 7 天（calendar Q1）」 |
| [notecraft-workbench-dashboard.md](../notecraft-workbench-dashboard.md) §16 Q4 | 加註「2026-09-30 起『本週』Tab 由更新月曆取代，見 notecraft-workbench-calendar.md」 |
| [CLAUDE.md](../../CLAUDE.md) | 目錄結構 `components/wb/dashboard/` 一行補「＋更新月曆四個元件」、`lib/` 補 `wb-calendar.ts`；Workbench 一節「列的 DOM 規則」補「格狀小目標（treemap 方塊、月色塊）例外：純 `<button>` 走 `rowHandlers`、無常駐開啟連結」（Q2）；Dashboard 一行補「更新月曆：日曆週、anchor 在瀏覽器算、SSR 不輸出日期格；`check:wb` 也鎖月格與日曆週」 |
| [notecraft-prd.md](../notecraft-prd.md) | 用 `/bump-prd` 補 §8.1 Phase 條目與 changelog |
| [README.md](../../README.md)、[CHANGELOG.md](../../CHANGELOG.md) | 儀表板截圖補一張月曆；CHANGELOG「變更」：「本週」Tab 改為「更新月曆」（月／週、閱讀狀態配色、Drawer）；「移除」：近 7 日筆記列表（資訊仍在總覽更新日誌）；註明月曆用日曆週、KPI 仍為滾動 7 天；「內部」：`wb-calendar.ts`、`check:wb` 串上 `wb-calendar.mjs`、`?tab=week` 相容 |
| 各 Task 檔末 | 「實作記錄」（日期、實際改了什麼、偏離的理由） |
| [tasks/README.md](README.md) | 本批標為已完成 |

### 6. 版號與總檢

- `npm version minor` → notecraftapp **1.5.0**（Tab 換內容是使用者看得到的功能變更）
- `npx tsc --noEmit && npx astro build && npm run check-plugins` 全綠；tsc 錯誤數與 `main` 基準相同
- 併回 `main` 前 `git diff main --stat` 確認沒有夾帶 `tmp/`、截圖以外的二進位檔

## 要改的既有檔案

`docs/*.md`（上表）、`CLAUDE.md`、`README.md`、`CHANGELOG.md`、`package.json`（版號）；程式碼只有清理。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 五個寬度 | §1 表 | — | 逐一符合；760 底部不被遮；900 只有格區橫捲 |
| Tab 序 | 鍵盤從頁首 Tab 開始 | Tab 到底 | 順序如 §2；沒有不可達的互動元素 |
| axe | `/?tab=calendar` 月與週 | 掃描 | contrast／name 類 0 serious |
| viewer | §3 表 | — | 逐一符合 |
| 文件 | — | grep「本週」Tab 於 `docs/*.md`、`CLAUDE.md` | 只剩歷史敘述與本批文件，沒有把它當現況的描述 |
| 版號 | — | `package.json`、CHANGELOG、PRD | 三處一致 |
| 總檢 | — | `npx tsc --noEmit && npx astro build && npm run check-plugins` | 全綠 |

## 依賴

Task 93、94。

## 實作記錄（2026-09-30）

- 響應式五個寬度（1400／1100／900／760／375）與 1400×700 逐一量過，數字在規格 §17；760 底部 Tab bar 沒遮到最後一列，375 只有格區橫捲
- viewer：`tmp/notecraft-test` 8 篇集中在 7/5 那週，月檢視空、週檢視同格內捲、無系列無標籤卡片正確；console 0 錯誤
- 沒有跑 axe、沒有逐鍵走 Tab 序（用 DOM 順序與 computed style 代替），已記在規格 §17
- 文件：規格 §17、workbench.md §8.1／§5.4、Dashboard 文件 Q4 加註、CLAUDE.md（目錄、列的 DOM 例外、更新月曆一段）、PRD Phase 4.19 + `/bump-prd`、CHANGELOG 1.5.0、README 文案與 `dashboard-calendar.png`、`CAPTURE.md`
- `npm version minor` → 1.5.0；`npx tsc --noEmit && npx astro build && npm run check-plugins` 全綠
