# Task 108 — 筆記頁籤收尾：平板、手機計數鈕與抽屜、viewer 實測、文件回填與發版

> 規格 [notecraft-workbench-note-tabs.md](../notecraft-workbench-note-tabs.md) §9、§11、§12、§14、§17；Q5 定案（§16）。
> 設計交付 README §6、§7、「動畫」；視覺定稿 `pt-tabs.css` 的 RWD 段與 `PtTabCount`／`PtTabSheet`。
> 依賴 [Task 107](task-107-tabs-menu-shortcuts-scroll.md)。本批最後一個。
> **本 Task 完成後**開 PR 把 `feat/note-tabs` 併回 `main`。

## 範圍

### 1. 平板（861–1100）

- `.wb-mburger{top:43px}` 加進既有 `@media(min-width:861px) and (max-width:1100px)` 區塊（34 + 9；README §6）
- 檢查漢堡鈕落在 Header 區、不壓到頁籤列；Sidebar 抽屜開啟時頁籤列在 scrim 下

### 2. 手機（≤860）

- `.nt-bar{display:none}`
- **計數鈕 `.nt-count`**：layout 在 `.wb-mburger` 旁輸出佔位 `<span class="nt-count-slot" id="nt-count"></span>`；TabBar 以 `createPortal` 渲染按鈕進去（規格 §3.2）。SSR 時是 32×32 空框（外框照規格，無數字），hydrate 後補數字
  - 樣式照 README §7；目前頁面是頁籤之一時框與字改 `--wb-blue-l`
  - 頁籤數 0 時仍顯示（數字 0），點開是空清單＋提示文字（README 未定義，採空狀態同一句文案）
- `.wb-hd-top{padding-right:54px}` 加進既有 `@media(max-width:860px)` 殼區塊（`WbHeader` 用同一個 class，`bare` 頁一起生效）
- **`src/components/wb/tabs/TabSheet.tsx`**（新增，底部抽屜）：照 README §7
  - z-index `--wb-z-overlay`（蓋過底部 Tab bar 650；規格 §9）
  - `pushEscape(close)`；開啟時焦點移到標題列的關閉鈕，關閉後回到計數鈕；`role="dialog"`、`aria-modal="true"`、`aria-label="已開啟的頁籤"`
  - 列點擊導覽；44×44 關閉鈕；底部「重開剛關閉的」「全部關閉」；`env(safe-area-inset-bottom)`
  - 不提供拖曳排序
  - 開啟時 `.wb-body` 不捲（沿用 `body.wb-sb-open` 的做法加一個 `body.nt-sheet-open`）

### 3. 動畫與 reduced-motion

- 選單／下拉 fade 120ms、遮罩 opacity .14s、抽屜 220ms `cubic-bezier(.22,.7,.3,1)`、scrim 160ms
- 既有 `@media(prefers-reduced-motion:reduce)` 規則列表加 `.nt-pop`、`.nt-scrollwrap::before`、`::after`、`.nt-sheet`、`.nt-sheet-scrim`（`animation:none;transition:none`）

### 4. 響應式總檢

| 視窗寬 | 檢查 |
| --- | --- |
| 1400 | 頁籤列吃主區寬；15 個頁籤溢出可捲 |
| 1100 | Sidebar 為抽屜；漢堡鈕在 `top:43px`；頁籤列照常 |
| 861 | 同上邊界 |
| 860 | 頁籤列消失；Header 右上計數鈕；標題不被計數鈕壓到（54px 讓位） |
| 375 | 計數鈕與漢堡鈕左右對稱；抽屜蓋過底部 Tab bar；長標題兩行內省略 |

`document.documentElement.scrollWidth === clientWidth`（無整頁橫捲），`document.scrollingElement.scrollTop` 恆為 0。

### 5. npx viewer 實測（規格 §11）

用 `.claude/launch.json` 的 `viewer-poc`（`tmp/notecraft-test`）與另一個工作區（臨時資料夾、3 篇筆記）各跑一次、**同一個埠**：

| 檢查 | 預期 |
| --- | --- |
| 工作區 A 開 3 個頁籤 → 關 viewer → 用同一埠開工作區 B | B 的頁籤列是空的；**不**出現「筆記已不存在」 |
| B 開 2 個 → 切回 A | A 的 3 個頁籤還在 |
| localStorage | 兩個 key：`nc-tabs-v1:<A 的 label>`、`nc-tabs-v1:<B 的 label>` |
| `grep -r "$HOME" dist/` | 0 筆 |
| `npm pack --dry-run` | `src/components/wb/tabs/*`、`src/lib/wb-tabs.ts`、`wb-tabs-store.ts`、`toast.ts` 在清單內（既有 `files` 涵蓋，不用改） |

### 6. 無障礙

- 走一次 Tab 序：skip link → 頁籤列（只停一次）→ Header → Toolbar → Body
- 螢幕閱讀器（VoiceOver）：頁籤列唸「已開啟的頁籤，分頁標籤」、各頁籤唸「標題，分頁標籤，已選取 N/M」；✕ 不在 Tab 序但可由 VO 游標到達且唸「關閉 標題」
- axe 掃 `/notes/<任一>`（桌面與 375）：name、role、contrast 類 0 serious。若沒跑，照實記在規格 §17

### 7. 清理

- `grep -n "nt-dot\|tabsDemo" src/` 為 0（不該移植的沒混進來）
- `awk` 排除 `:root` 後 `workbench.css` 的 hex／rgba 為 0
- `wb-tabs.ts` 只有 `import type`

### 8. 文件回填

| 文件 | 要改什麼 |
| --- | --- |
| [notecraft-workbench-note-tabs.md](../notecraft-workbench-note-tabs.md) §17 | 零位移實測（hydrate 前後 `#nc-scroll` top）、捲動還原在長筆記的實際誤差、bfcache 與 hash 的實測、viewer 雙工作區結果、五個寬度截圖、實作中新增的決定、與設計稿的最終偏離；文件狀態改「已實作（notecraftapp v1.7.0）」 |
| [notecraft-workbench.md](../notecraft-workbench.md) §4 | 殼的示意圖補「頁籤列（34px，Header 之上）」並連到本規格；§4.5 Escape 順序補「頁籤選單／下拉／手機抽屜」位置（與 Drawer 同級、後開的先關） |
| [CLAUDE.md](../../CLAUDE.md) | 目錄結構加 `components/wb/tabs/`、`lib/wb-tabs.ts`（純函式，`check:wb` 斷言）、`lib/wb-tabs-store.ts`；Workbench 一節加一條「**筆記頁籤**（v1.7.0，[docs/notecraft-workbench-note-tabs.md]）：清單存 `nc-tabs-v1:<workspaceLabel>`（含標題快照，idle 時以 `/wb-index.json` 校正與清除失效）；頁面以 layout 的 `tab` prop 宣告自己是頁籤；頁籤是 `<a role=tab>` 並排 ✕；捲動還原遇 hash 讓位；快捷鍵只用 ⌥ 且比對 `event.code`；頁面剛載入時的提示走 `lib/toast.ts`」 |
| [notecraft-prd.md](../notecraft-prd.md) | 用 `/bump-prd` 補 §8.1 Phase 4.22（v1.18.0）與 changelog |
| [README.md](../../README.md)、[CHANGELOG.md](../../CHANGELOG.md) | 截圖補一張多頁籤；CHANGELOG「新增」：筆記頁籤（固定、拖曳、右鍵選單、全部頁籤、⌥ 快捷鍵、捲動還原、⌘K 分區、手機計數鈕）；「內部」：`wb-tabs.ts`、`check:wb` 串上 `wb-tabs.mjs`、`lib/toast.ts` 佇列 |
| 各 Task 檔末 | 「實作記錄」（日期、實際改了什麼、偏離的理由） |
| [tasks/README.md](README.md) | 本批標為已完成 |

### 9. 版號與總檢

- `npm version minor` → notecraftapp **1.7.0**
- `npx tsc --noEmit && npx astro build && npm run check-plugins` 全綠；tsc 錯誤數與 `main` 基準相同
- 開 PR 前 `git diff main --stat` 確認沒有夾帶 `tmp/`、截圖以外的二進位檔

## 要改的既有檔案

`src/layouts/WorkbenchLayout.astro`（計數鈕佔位）、`src/components/wb/tabs/TabBar.tsx`、`src/styles/workbench.css`、`docs/*.md`（上表）、`CLAUDE.md`、`README.md`、`CHANGELOG.md`、`package.json`（版號）。新增 `src/components/wb/tabs/TabSheet.tsx`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 五個寬度 | §4 表 | — | 逐一符合 |
| 手機抽屜 | 375、3 個頁籤 | 點計數鈕 → 點第 2 列 | 抽屜蓋過底部 Tab bar；導覽到第 2 篇；`Esc` 可關 |
| 手機 SSR | 375 載入筆記頁 | hydrate 前後 | 計數鈕位置不動、Header 標題不位移 |
| viewer | §5 表 | — | 逐一符合 |
| reduced-motion | 系統開「減少動態效果」 | 開選單、抽屜 | 無動畫 |
| 文件 | — | — | §8 表逐項完成；規格狀態為「已實作」 |
| 版號 | — | `package.json`、CHANGELOG、PRD | 三處一致 |
| 總檢 | — | `npx tsc --noEmit && npx astro build && npm run check-plugins` | 全綠 |

## 依賴

Task 107。

## 實作記錄（2026-10-01）

- 計數鈕：layout 的 `.nt-count-slot` 本身是 SSR 空框，按鈕 portal 進去、透明無框
- 抽屜列同樣是容器內並排連結與關閉鈕；空狀態文案沿用頁籤列那句（手機用「點一列」）
- 實測 900（平板）、375（手機）、1280（桌面）；viewer 用同一埠先後跑兩個工作區，key 分開、互不清除
- 沒跑 axe／VoiceOver、沒補 README 截圖、1400／1100／861 未逐一量，記在規格 §17
- 版號直接改 `package.json`／`package-lock.json` 為 1.7.0（沿用 1.6.0 的做法，不打 tag）；PRD 以 `/bump-prd` 補 Phase 4.22
