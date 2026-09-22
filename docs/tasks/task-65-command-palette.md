# Task 65 — 指令面板 ⌘K（含全文搜尋）

> 規格 [notecraft-workbench.md](../notecraft-workbench.md) §8.9、§5.3、§4.5；Q2、Q13、Q14 定案。
> 設計交付 README §5.11；原始碼 `prototype/wb/pt-app.jsx` 的 `PtPalette`。
> 依賴 [Task 60](task-60-workbench-index.md)、[Task 61](task-61-workbench-shell.md)。對應實作階段 **P6**。
> **建議排在 Task 62 之前**，理由見文末。

## 兩個搜尋入口的分工（先看這張表）

| 入口 | 範圍 | 比對 |
| --- | --- | --- |
| 各列表頁 Toolbar 的搜尋框 | 只過濾**當頁列表** | 字串比對 |
| **Palette（本 Task）** | **全站跳轉**，每一頁都有 | 字串比對 + **pagefind 全文** |

現有的 `PagefindSearch.tsx`（只在 `/notes` 上方）由本 Task 取代並刪除。

## 範圍

### 1. `src/components/wb/Palette.tsx`（新增）

由 `WorkbenchLayout` 以 `client:idle` 全站掛一次。平時不渲染任何 DOM；
收到 `nc-open-palette` 事件（Rail 搜尋鈕）或 `⌘K`／`Ctrl+K` 才開。

外觀照 README §5.11：scrim `rgba(22,28,40,.32)`、面板 560px（max 92vw）、距頂 14vh、圓角 12；
46px 輸入列（search icon + 14px input +「Esc 關閉」）；結果區 max 320px 捲動，沿用 `.wb-row`。z-index 1000。

### 2. 結果分組

| 組 | 上限 | 來源 | 列 | 開啟 |
| --- | --: | --- | --- | --- |
| 筆記 | 7 | `/wb-index.json` | doc icon + 標題 + 路徑 + AI pill | `/notes/<slug>` |
| 系列 | 3 | 同上 | swatch + 名稱 +「系列 ・ N 章」+ `NN%` pill | `/series/<id>` |
| 標籤 | 4，**僅有輸入時** | 同上 | tag icon + 名稱 +「N 篇」pill | `/notes?tag=…` |
| 資料檔 | 3，**僅有輸入時** | 同上 | 金色 doc icon + 標題 + 路徑 + plugin id chip | `/view/<路徑>` |
| 內文 | 5，**僅有輸入時** | **pagefind** | doc icon + 標題 + 一行摘要 | pagefind 回傳的 `url` |

- 沒有輸入時顯示最近更新的 7 篇筆記 + 前 3 個系列（prototype 的行為）
- 「資料檔」組是 README 沒有的：資料檔已移出筆記列表（Q14），補上以免只能靠導覽找到
- 系列的 `NN%` 讀 localStorage，面板開啟時才算
- 全空時顯示「找不到相符的項目」

### 3. 資料載入

**第一次開啟時**才 `fetch("/wb-index.json")`（用 Task 63 的 `useWbIndex()`，模組層快取）。
載入中輸入框可用，結果區顯示三列骨架。不把索引 inline 進每一頁 —— N 篇筆記就會重複 N 次。

### 4. pagefind「內文」組

- 同樣在第一次開啟時才動態載入，沿用現行寫法以避開 Vite 靜態分析：
  ``const url = "/pagefind/" + "pagefind.js"; await import(/* @vite-ignore */ url)``
- 索引只存在於正式 build。**dev 下載入失敗 → 整組不顯示、不報錯、不進 console.error**（與現況相同）
- debounce 150ms；每次查詢帶遞增序號，**較晚回來的舊結果丟棄**
- 以 `url` 對回 slug，已出現在「筆記」組的不重複列出
- 摘要用 pagefind 的 `excerpt`，其中 `<mark>…</mark>` 要轉成粗體。**不可用 `dangerouslySetInnerHTML`**：
  以正則切成「一般文字／命中文字」片段，先對每段做 HTML entity 解碼，再用 React 節點組回

### 5. 鍵盤

| 鍵 | 行為 |
| --- | --- |
| `⌘K`／`Ctrl+K` | 開啟（`preventDefault`）；已開啟時聚焦輸入框 |
| `↑` `↓` | 在所有組之間連續移動選取；選取項自動捲入可視範圍。Prototype 沒做，補上 |
| `Enter` | 開啟選取項；沒移動過選取時開第一筆（README 的行為） |
| `⌘/Ctrl`+`Enter` | 新分頁開啟 |
| `Escape`、點 scrim | 關閉（走 `wb-escape` 堆疊，優先序最高） |

`role="dialog"` + `aria-modal`；結果區 `role="listbox"`、各列 `role="option"` + `aria-selected`；輸入框 `aria-activedescendant` 指向選取項。
開啟時記住原焦點，關閉時還原。

### 6. 刪除 `PagefindSearch.tsx`

`src/pages/notes/index.astro` 對它的引用一併移除（若 Task 62 尚未做，由本 Task 移除）。

## 要改的既有檔案

`WorkbenchLayout.astro`（掛上 Palette）、`src/pages/notes/index.astro`。刪除 `src/components/islands/PagefindSearch.tsx`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 每頁可開 | 任一頁（含筆記頁、資料檔頁） | `⌘K` | 面板開啟 |
| 不開就不載入 | 任一頁，開 DevTools Network | 不開面板 | 沒有 `wb-index.json`、沒有 `pagefind.js` 的請求 |
| 只抓一次 | 開關面板三次 | 看 Network | `wb-index.json` 只有一筆 |
| dev 無全文 | `astro dev` | 輸入關鍵字 | 沒有「內文」組、console 無錯誤 |
| 全文命中 | `npm run build` 後 `astro preview` | 輸入一個只出現在某篇內文的詞 | 「內文」組列出該篇，摘要中命中詞為粗體 |
| 去重 | 輸入某篇的標題 | — | 該篇只在「筆記」組出現一次 |
| 舊結果不蓋新結果 | 快速輸入再刪除 | — | 最後顯示的是最後一次查詢的結果 |
| 摘要不注入 HTML | 某篇內文含 `<img onerror=…>` 字樣的程式碼區塊並被命中 | — | 以純文字顯示，不被當成標籤 |
| 資料檔搜得到 | 專案有資料檔 | 輸入其標題 | 「資料檔」組出現，Enter 進渲染頁 |
| 鍵盤 | — | `↓` ×3 → `Enter` | 開啟第 4 筆 |
| 焦點還原 | 從某列按 `⌘K` 再 `Escape` | — | 焦點回到該列 |

## 依賴

Task 60、Task 61。

## 為什麼建議排在 Task 62 之前

Task 62 重寫 `/notes` 時會拿掉頁面上方的 `PagefindSearch`。Palette 還沒做的話，全文搜尋會有一段空窗。
先做本 Task，拿掉舊搜尋框的同一刻新入口就已經在了。

## 實作記錄（2026-09-22）

- dev 下**連 pagefind 的請求都不發**（必然 404，瀏覽器會在 console 印網路錯誤）；正式 build 才動態載入
- `excerptNodes()` 以正則切 `<mark>` 片段、各自 entity 解碼後組回 React 節點
- 實測（`astro preview`）：搜 "cosine" 三筆內文命中且命中詞粗體；搜 "Voyage" 時標題命中的那篇只在「筆記」組出現、不重複在「內文」組
- `⌘K` 開啟後 `wb-index.json` 只請求一次；輸入法選字中的 `Enter` 不觸發
