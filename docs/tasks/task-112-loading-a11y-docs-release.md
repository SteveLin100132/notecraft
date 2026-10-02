# Task 112 — Loading 與轉場收尾：reduced motion、響應式、瀏覽器、文件回填與發版

> 規格 [notecraft-workbench-loading-transitions.md](../notecraft-workbench-loading-transitions.md) §13、§14、§15、§16、§17、§20、§22。
> 設計交付 README「Reduced motion」「Screens / States」的響應式段。
> 依賴 [Task 111](task-111-loading-skeletons-viz-island.md)。本批最後一個。
> **本 Task 完成後**開 PR 把 `feat/loading-transitions` 併回 `main`。

## 範圍

### 1. Reduced motion 總檢（規格 §13）

DevTools 模擬 `prefers-reduced-motion: reduce`，逐項對照 handoff 表：

| 項目 | 預期 |
| --- | --- |
| 主區換頁 | 舊頁直接消失；新頁 100ms linear 淡入，無位移 |
| 頁籤指示器、抽屜 | 直接跳到新位置 |
| 骨架 | 150ms 後直接出現；無 shimmer |
| 進度線 | 靜態滿版、opacity .55 |
| 骨架／佔位／「—」換內容 | 直接替換 |

`grep -n "animation\|transition" src/styles/workbench.css` 的「Loading 與轉場」區塊，每條動畫都要在 reduced-motion 區塊有對應。

### 2. 響應式總檢（規格 §14）

| 視窗寬 | 檢查 |
| --- | --- |
| 1400 | peer／drill／section 三種轉場；頁籤指示器滑動；筆記骨架兩欄 |
| 1100 | Sidebar 抽屜：點項目後抽屜先滑出、新頁淡入；`nc-drawer` 補間正常 |
| 861 | 同上邊界 |
| 860 | 頁籤列隱藏、計數框預繪；筆記骨架單欄 |
| 375 | 同上；進度線在 Header 頂端；底部 Tab bar 不參與轉場 |

`document.documentElement.scrollWidth === clientWidth`（無整頁橫捲）；轉場中也一樣（`::view-transition` 的快照不可撐出橫捲）。

### 3. 瀏覽器（規格 §13 支援表）

| 瀏覽器 | 檢查 |
| --- | --- |
| Chrome（最新） | 全部功能 |
| Safari 18.2+ | 轉場（`document.referrer` 退回路徑）、指示器滑動；無 Navigation API 時 type 判斷正確 |
| Firefox | 無轉場、無錯誤；頁籤預繪、系列進度、捲動還原照常（這些不依賴 View Transitions） |

手邊沒有的版本照實寫在規格 §22「仍未驗證」。

### 4. 無障礙（規格 §15）

- Tab 序：skip link → 頁籤列（只停一次，預繪層 `aria-hidden` 不搶焦點）→ Header → Toolbar → Body
- VoiceOver：骨架不被唸出；`aria-busy` 內容到了移除；`VizIsland` 佔位不唸「互動圖表載入中」以外的東西
- axe 掃 `/notes/<任一>`（1400 與 375）：0 serious。若沒跑，照實記在規格 §22

### 5. npx viewer 實測（規格 §17）

用 `.claude/launch.json` 的 `viewer-poc` 與另一個工作區（同一個埠）：

| 檢查 | 預期 |
| --- | --- |
| 兩個工作區各開頁籤 | 預繪讀各自的 key；切換工作區不出現另一個工作區的頁籤 |
| BASE 部署 | `NOTECRAFT_BASE=/notecraft/demo` build：三種 type 正確、預繪連結帶前綴 |
| `grep -r "$HOME" dist/` | 0 筆 |
| `npm pack --dry-run` | `src/lib/wb-nav.ts`、`wb-tabs-prepaint.ts`、`series-progress-pure.ts`、`src/components/wb/NoteSkeleton.astro`、`ListSkeleton.astro`、`src/components/islands/VizIsland.tsx` 在清單內 |

### 6. 清理

- `grep -rn "\-\-nc-" src/` 為 0（token 全改 `--wb-*`）
- `grep -rn "wb-dark\|pt-mobile\|pt-tablet\|nc-rm\|nc-boot\|nc-ghost\|nc-mid\|nc-title" src/` 為 0（不該移植的沒混進來）
- `awk` 排除 `:root` 後 `workbench.css` 的 hex／rgba 為 0
- `wb-nav.ts`、`wb-tabs-prepaint.ts`、`series-progress-pure.ts` 只有 `import type`

### 7. 文件回填

| 文件 | 要改什麼 |
| --- | --- |
| [notecraft-workbench-loading-transitions.md](../notecraft-workbench-loading-transitions.md) §22 | Phase 0 量測（Task 109）與改後對照、高度盤點清單（Task 111）、實作中新增的決定、與設計稿的最終偏離、仍未驗證的瀏覽器；文件狀態改「已實作（notecraftapp v1.8.0）」 |
| [notecraft-workbench.md](../notecraft-workbench.md) §4 | 殼的示意圖補 `.nc-main-pane`（轉場範圍）、頁籤預繪層；連到本規格 |
| [notecraft-workbench-note-tabs.md](../notecraft-workbench-note-tabs.md) §5、§7.3 | 註明 SSR 空列之外另有預繪層、捲動還原已提前到 inline script，連到本規格 |
| [CLAUDE.md](../../CLAUDE.md) | 目錄結構加 `lib/wb-nav.ts`、`lib/wb-tabs-prepaint.ts`、`lib/series-progress-pure.ts`（純函式，以 `toString()` 內嵌 inline script，`check:wb` 斷言）；Workbench 一節加一條「**Loading 與轉場**（v1.8.0，[docs/notecraft-workbench-loading-transitions.md]）：跨文件 View Transitions 只有 `.nc-main-pane` 命名 `nc-main`，殼不動；type 由 `wb-nav.ts` 分 peer／drill／section；頁籤列與系列進度由 inline script 在第一次繪製前預繪（頁籤畫在島外的 `#nt-pre`，island 畫好後移除，**不可改 island 內的 DOM**）；`.nt-ind` 的 `view-transition-name` 同一份文件只能有一個；捲動還原在主區結尾的 inline script；骨架 150ms 後才出現；新 token 一律 `--wb-*`」 |
| [notecraft-prd.md](../notecraft-prd.md) | 用 `/bump-prd` 補 §8.1 Phase 4.23（v1.19.0）與 changelog |
| [README.md](../../README.md)、[CHANGELOG.md](../../CHANGELOG.md) | CHANGELOG「新增」：換頁轉場、頁籤指示器滑動、骨架、互動視覺化佔位、慢回應進度線；「變更」：Google Fonts 非阻塞、捲動還原提前、`/notes` 首屏改顯示骨架；「內部」：`wb-nav.ts`、`check:wb` 新斷言 |
| 各 Task 檔末 | 「實作記錄」（日期、實際改了什麼、偏離的理由） |
| [tasks/README.md](README.md) | 本批標為已完成 |

### 8. 版號與總檢

- `npm version minor` → notecraftapp **1.8.0**
- `npx tsc --noEmit && npx astro build && npm run check-plugins` 全綠；tsc 錯誤數與 `main` 基準相同
- 開 PR 前 `git diff main --stat` 確認沒有夾帶 `tmp/`、量測錄影、截圖以外的二進位檔

## 要改的既有檔案

`src/styles/workbench.css`（reduced motion、響應式修正）、`docs/*.md`（上表）、`CLAUDE.md`、`README.md`、`CHANGELOG.md`、`package.json`（版號）。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| reduced motion | 模擬 reduce | §1 每一項 | 符合表格 |
| 響應式 | §2 每個寬度 | 換頁、開抽屜 | 符合表格；無整頁橫捲 |
| Firefox | — | 換頁 | 無轉場、無錯誤，其他功能照常 |
| viewer | §5 | — | 全部符合 |
| 清理 | — | §6 每條 grep | 0 筆 |
| 總檢 | — | `npx tsc --noEmit && npx astro build && npm run check-plugins` | 全綠 |

## 依賴

[Task 111](task-111-loading-skeletons-viz-island.md)。

## 實作記錄（2026-10-02）

- **修正**：平板與手機寬度實測發現，新頁常在 `.nc-main-pane` 解析到之前就第一次繪製，快照裡沒有 `nc-main`，只有舊主區淡出、新內容直接跳出來。head 改為固定 `rel=expect` 主區開頭的 `#nc-pane-start`（推翻 Task 110 的「只在還原捲動時才加」）。代價是 Fast 4G 下切換筆記 FCP 晚約 125ms（舊頁停留，不是白屏），無節流無差別；之後 1400／1000／375 三種寬度每次轉場都有 `new(nc-main)`
- reduced motion：`document.getAnimations()` 確認群組 0ms、新主區 100ms linear 淡入；骨架、進度線、`.nc-swap-in` 都有對應規則
- 瀏覽器：Firefox 不轉場、其他功能照常、無錯誤；Safari 未驗證（Playwright WebKit 在 macOS 14 啟動即崩潰）
- viewer：BASE build 已在 Task 109 驗證；雙工作區同埠實測未做（磁碟空間不足）
- 清理：`--nc-*` 只剩既有的 `global.css` `--nc-tone-*`（與本批無關）；prototype 專用名稱只出現在註解；新規則零色碼；三支純函式只有 `import type`；`npm pack --dry-run` 含新檔
- 預先存在、與本批無關：`PluginView.astro` 在正式 build 也輸出 renderer 的本機絕對路徑（`rendererPath`），`main` 同樣存在，未在本批處理
