# Task 74 — 響應式三段與無障礙收尾

> 規格 [notecraft-workbench.md](../notecraft-workbench.md) §9、§10、§4.5；Q26、Q27 定案。
> 設計交付 README §6；`prototype/wb/pt.css` 的 `@media` 區塊（313 行起、384 行起、405–441 行）。
> 依賴 Task 62–73 全部（要有頁面才能驗）。對應實作階段 **P12**。

## 為什麼獨立成一個 Task

各頁 Task 都只在桌面寬度下驗收。響應式與無障礙是橫跨所有頁面的事，集中做一輪才不會每頁各漏一點。
Task 59 已把 `pt.css` 的 `@media` 規則搬進來，本 Task 是**逐頁實測並補洞**，不是從零寫。

## 範圍

### 1. 三段斷點（README §6）

| 斷點 | 行為 |
| --- | --- |
| **桌面 >1100** | 三欄常駐 |
| **平板 861–1100** | Sidebar 變抽屜（從 Rail 右邊滑出，220ms，scrim `rgba(18,24,34,.4)`）；頁首左側出現 32px 漢堡鈕 `.wb-mburger`、`.wb-hd-top` 左 padding 54；標籤欄縮為 110px；Drawer 420px；四種 view 保留 |
| **手機 ≤860** | `.wb-app` 縱向；**Rail 變底部 54px Tab bar**（sticky bottom、5 鈕 44×44、Logo 隱藏）；Sidebar 272px 抽屜；Drawer 滿版；**只提供 List**；列改多行（標題換行、隱藏標籤欄與 group 統計）；Dashboard 單欄；流程列縱向；設定列上下堆疊 |

另有 Dashboard 的 1180（widget span 6）與 800（span 12）、窄手機 560。

**prototype 的 `body.pt-mobile` 等 class 是給設計師強制預覽用的，正式版只用 media query**（Task 59 已清）。
`useNarrow()` hook（`matchMedia("(max-width:860px)")`）只用在「需要改變渲染內容」的地方：`/notes` 的 Tab 列、`?view=` 的忽略。
**純樣式差異一律交給 CSS**，不要用 JS 判斷寬度來換 class。

### 2. 逐頁檢查清單

每一頁在 1280／1000／390 三個寬度下各走一遍：

| 頁面 | 重點 |
| --- | --- |
| 全站 | 手機底部 Tab bar 不遮住 Body 最後一列（Body 要留 54px + `env(safe-area-inset-bottom)`）；Sidebar 抽屜開著時 Body 不可捲 |
| `/notes` | 手機只有 List、Tab 列整條不顯示；`?view=board` 被忽略但**不改寫網址**（轉回桌面時仍是 Board）；Toolbar 過寬時橫向捲動且隱藏 scrollbar；「開啟」圖示在多行列裡垂直置中、點擊區仍有 24px |
| Drawer | 平板 420、手機滿版；手機滿版時關閉鈕要夠大（≥40px 點擊區） |
| Board | 平板可橫向捲動、欄 `min-width:260px`（≤860 的規則在平板用不到，確認 232px 在 861 寬時不擠） |
| Dashboard | 1180 → 兩欄、800 → 單欄；長條圖在單欄時不超寬 |
| 筆記頁 | 見下方 §3 |
| 系列詳情 | 手機上 mini button 不被擠出列外 |
| `/plugins` | plugin id chip 的 168px 欄在手機隱藏或換行 |
| `/settings` | 流程列 ≤860 縱向；設定列上下堆疊 |
| Palette | `max-width:92vw`；手機上距頂改 8vh，避免被鍵盤頂掉 |

### 3. 筆記頁 TOC 的斷點

現況 TOC 在視窗 ≥1025 時出現在右側。新殼吃掉 292px（Rail 52 + Sidebar 240），同樣的視窗寬度下主區窄很多。
實測後另訂斷點，原則：**內文欄至少 640px 時才顯示右側 TOC**。以視窗寬換算約落在 1320 上下（292 + 32×2 padding + 640 + 40 gap + 220 TOC），
以實際排版為準；平板寬度（Sidebar 收成抽屜）要另算一次。記下最後採用的數值與理由。

### 4. 觸控（Q26）

Task 64 已做「`(pointer: fine)` 才可拖」。本 Task 用實機或 DevTools 觸控模擬確認：

- 觸控裝置上 Board 卡片長按不進入拖曳、不出現系統的拖放／選取介面（必要時加 `-webkit-touch-callout:none; user-select:none`）
- 單點列 → 開 Drawer；點「開啟」圖示 → 直接進筆記
- 觸控裝置沒有雙擊：確認雙擊不是**唯一**的開啟路徑（有 Drawer 的「開啟筆記」與常駐圖示兩條）

### 5. 無障礙底線（規格 §10）

| 項目 | 要求 |
| --- | --- |
| 地標 | Rail `<nav aria-label="主要導覽">`、Sidebar `<nav aria-label="工作區">`、主區 `<main>`；加一個「跳到主要內容」的 skip link |
| 焦點可見 | 所有可互動元素有 focus ring（`--focus-ring`）；不可用 `outline:none` 而沒有替代 |
| Rail 按鈕 | 純圖示，必須有 `aria-label`；目前頁 `aria-current="page"` |
| Sidebar 樹 | caret 是 `<button aria-expanded>`；資料夾連結與 caret 是兩個獨立的可聚焦元素 |
| 浮層 | Drawer、Palette、Sidebar 抽屜、「⋯」選單：開啟時 focus 移入、關閉時還原；`Escape` 依 Palette → Modal → Drawer → 抽屜的順序關 |
| Switch／segmented／Tab | `role="switch"`；segmented 用 `role="radiogroup"`；頁首 Tab 用 `role="tablist"`，左右鍵切換 |
| 動效 | `prefers-reduced-motion: reduce` 時關閉 Drawer 滑入、scrim 淡入、caret 旋轉、Switch、抽屜、進度條過場。island 內用 `useReducedMotion()` |
| 對比 | pill 文字色對其底色 ≥ 4.5:1。`--wb-warn-ink`、`--wb-ok-ink`、`--wb-danger-ink` 是為此存在的，抽測三種 pill |
| 純鍵盤走一遍 | 不碰滑鼠完成：開 Palette 找筆記 → 回列表 → 選一列開 Drawer → 關閉 → 進筆記 → 開「⋯」選單 |

**已知取捨（不是 bug，不要在本 Task「修」它）**：只用鍵盤無法在 Board 上改閱讀狀態（Q26 定案），路徑在筆記頁與系列詳情頁。

### 6. z-index 總檢

規格 §4.5 的階梯：抽屜 500／490、Drawer 600／590、Tab bar 650、`VizZoom` 900、Modal／Toast／Palette 1000。
實測幾個組合：手機上 Drawer 開著時 Tab bar 是否被蓋住（應該被蓋）；`VizZoom` 開著時按 `⌘K`；簡報全螢幕不受影響。

## 要改的既有檔案

主要是 `src/styles/workbench.css`；零星的 `aria-*` 補在各 `wb/` 元件；`src/pages/notes/[...slug].astro` 的 TOC 斷點。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 無水平捲軸 | 390 寬 | 逐頁開 | 任何頁面的 `document.documentElement.scrollWidth` ≤ 視窗寬 |
| Tab bar 不遮內容 | 390 寬、長列表 | 捲到底 | 最後一列完整可見 |
| 抽屜 | 1000 寬 | 點漢堡鈕 → `Escape` | 開啟、關閉、焦點回漢堡鈕 |
| 手機只有 List | 390 寬，網址 `?view=board` | — | 顯示 List；網址不被改寫 |
| TOC 不擠內文 | 視窗 1100–1400 逐步拉寬 | — | TOC 出現時內文欄 ≥ 640px |
| reduced motion | 系統開啟「減少動態效果」 | 開 Drawer | 直接出現、無滑入 |
| 純鍵盤 | — | 走 §5 最後一列的流程 | 全程可完成，焦點位置隨時看得見 |
| 螢幕閱讀器抽測 | VoiceOver | 聚焦 Rail 的各按鈕與某一列的「開啟」圖示 | 讀出有意義的名稱（如「開啟筆記：專案 vs 產品」） |
| 觸控 | DevTools 觸控模擬並重整 | 長按 Board 卡片 | 不拖曳、無系統選單 |

## 依賴

Task 62–73。

## 注意

驗畫面前確認 Browser pane 是**可見**的 —— 隱藏時 `client:visible` 的 island 不會 hydrate，容易誤判。
另外筆記頁的捲動發生在內層 `#nc-scroll`，不是 `window`；用 `window.scrollTo` 之類的方式驗不到東西。
