# Task 69 — 筆記內文頁：新頁首接手標題與動作

> 規格 [notecraft-workbench.md](../notecraft-workbench.md) §8.3（全節）、§5.2.2、§11；Q9、Q11、Q12、Q16、Q17、Q18 定案。
> 設計交付 README §5.3（**注意：README 說「隱藏 NoteView 自帶 header」，但 prototype 實際沒隱藏，標題出現兩次。以規格 §8.3 為準**）。
> 依賴 [Task 61](task-61-workbench-shell.md)、[Task 63](task-63-note-drawer.md)（`prompts.ts`）。對應實作階段 **P9**。

## 定案的版面

```
┌─ 頁首 ──────────────────────────────────────────────┐
│ NoteCraft / 筆記 / 根目錄                             │
│ ← 專案 vs 產品  (已生成 2)                            │
│                             [▶ 簡報] [☆] [⋯]          │
├─ 內文 ──────────────────────────────────────────────┤
│ (專案管理) (PM) +                 ← 標籤編輯          │
│ 描述文字……                                           │
│ ◷ 更新於 2026/09/18   [未開始|閱讀中|已完成]           │
│ ──────────────────────────────────────────────────  │
│ 內文……                                     目錄      │
└─────────────────────────────────────────────────────┘
```

## 範圍

### 1. [src/pages/notes/[...slug].astro](../../src/pages/notes/%5B...slug%5D.astro) 的區塊去留

| 現有區塊 | 去向 |
| --- | --- |
| 「返回筆記列表」連結 | **移除**，頁首返回鍵接手（→ `/notes`） |
| 內文 `h1.nc-note-title` | **移除**。頁首 `h1` 是該頁唯一的 h1 |
| `TagEditor` | 留在內文最上方 |
| 描述 | 留 |
| 資訊列：更新日、`ReadingControl` | 留 |
| 資訊列：「N/M 視覺化已生成」 | **移除**，與頁首 AI pill 重複 |
| 動作列（整列） | **移除**，全部上移到頁首 |
| 待生成標記卡片、`.nc-prose`、`DonePrompt`、`SeriesNav`、`Toc` | 不動 |
| 頁尾：建立日 + 檔案路徑 | 留；路徑由 `note.filePath` 改為索引的 `path`（規格 §5.2.2，順手修 viewer 下的 `../`） |

對應的 `.nc-note-title` 等 CSS 一併清掉。

### 2. 頁首

- 返回鍵、麵包屑 `NoteCraft / 筆記 / <所在資料夾>`。第三段連到 `/notes?folder=<路徑>`；根目錄顯示「根目錄」、連到 `/notes`
- pill **只有 AI 狀態**（四態規則同 `PtAiPill`）。設計稿的「N 字」pill 不做（Q9）
- **長標題**：README 規定頁首標題單行省略，但內文大標題拿掉後，被截斷的標題別處看不到全文。
  **僅筆記頁**放寬為最多兩行（`-webkit-line-clamp:2`）。給 `Header.astro` 加一個 `titleLines?: 1 | 2` prop，預設 1
- **pagefind**：頁首 `h1` 在 `data-pagefind-body`（`.nc-prose`）之外。給 `Header.astro` 加 `pagefindTitle?: boolean`，
  為真時在 `h1` 上標 `data-pagefind-meta="title"`。**這點規格標為待驗證**，見驗收

### 3. 頁首動作（由左到右）

設計稿的「**版型庫**」按鈕**不放**（Q16：它是簡報系統的規格展示頁，codebase 無此頁；`/present/atoms` 是開發用驗證 deck、不隨 npm 發佈）。

| 動作 | 樣式 | 顯示條件 |
| --- | --- | --- |
| 簡報 | 三段式（Q17） | 有 deck → solid「▶ 簡報」連 `/present/<slug>`（`normalize("NFC")`）；無 deck 且 dev → ghost「生成簡報」；無 deck 且正式 → 不顯示 |
| 收藏 ☆ | 24px 方形 icon 鈕 | 一律（Q11） |
| ⋯ 更多 | 24px 方形 icon 鈕 | **僅 dev**。選單內三項全是 dev-only，正式環境整顆不渲染 |

`FavoriteButton.tsx`、`GenerateDeckButton.tsx` 保留邏輯，外觀改為工作台樣式（`.wb-btn-ghost`／icon 鈕）。

### 4. 「⋯」選單 `src/components/wb/MoreMenu.tsx`（新增）

| 項目 | 行為 |
| --- | --- |
| 以 VS Code 編輯 | `vscode://file/<絕對路徑>` 連結。絕對路徑只在 dev 才輸出，正式 build 的 HTML 裡不存在（規格 §5.2.2 的唯一例外） |
| 重新生成提示 | **僅在有待生成標記時出現**。呼叫 Task 63 的 `buildRegeneratePrompt()`、複製到剪貼簿、Toast |
| （分隔線） | |
| 刪除筆記 | danger 樣式。點了開**現有 `DeleteNoteButton` 的確認對話框**，含孤兒元件提示 |

- `role="menu"`、項目 `role="menuitem"`；`↑` `↓` 移動、`Enter` 執行、`Escape` 或點外面關閉（走 `wb-escape`）；關閉後 focus 回觸發鈕
- **`DeleteNoteButton` 的刪除邏輯原封不動搬用**。它「送出 DELETE 的同一刻就 `location.replace("/notes")`、請求帶 `keepalive`、Toast 經 `sessionStorage` 傳到下一頁」
  是為了避開 Astro dev 刪檔後 HMR 把當前頁載成 404 的競態 —— **不要「整理」成先 await 再導頁**
- 做法：把 `DeleteNoteButton` 拆成 `useDeleteNote()`（對話框 + 邏輯）與觸發 UI；選單項只呼叫 `open()`。`RegenerateButton.tsx` 的獨立按鈕外觀不再使用，刪除該檔

### 5. 內文容器

Body 用 `.wb-body`（灰底）內包 `.wb-host{padding:26px 32px 60px}`。`Toc` 的 sticky 以 `#nc-scroll` 為基準，Task 61 已保留該 id。

## 要改的既有檔案

`src/pages/notes/[...slug].astro`、`Header.astro`／`WbHeader.tsx`（兩個新 prop）、`FavoriteButton.tsx`、`GenerateDeckButton.tsx`、`DeleteNoteButton.tsx`。
刪除 `RegenerateButton.tsx`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 標題只有一個 | 任一筆記頁 | `document.querySelectorAll("h1").length` | 1 |
| 長標題 | 標題超過一行的筆記 | 桌面寬度 | 最多兩行；`title` 屬性有全文 |
| 麵包屑 | `private/` 下的筆記 | 點第三段 | 進 `/notes?folder=private` |
| 有簡報 | — | 看頁首 | solid「簡報」，點了進簡報 |
| 無簡報、正式環境 | `astro build` 後預覽 | 看頁首 | 只有收藏星號；沒有簡報、沒有「⋯」 |
| 版型庫已移除 | — | 找「版型庫」字樣 | 沒有 |
| 選單鍵盤 | dev | `Tab` 到「⋯」→ `Enter` → `↓` → `Escape` | 開啟、移動、關閉並回到觸發鈕 |
| 重新生成提示的條件 | dev，標記全部已生成的筆記 | 開「⋯」 | 沒有「重新生成提示」這一項 |
| 刪除仍安全 | dev，刪一篇測試筆記 | 確認刪除 | 立即回到 `/notes` 並出現「已刪除筆記」Toast；**不會**閃過 404 |
| 孤兒元件提示 | dev，筆記含已生成元件 | 開刪除對話框 | 仍列出會一併處理的元件 id |
| **pagefind 標題（待驗證項）** | `npm run build` 後預覽 | 用 Palette 全文搜尋某篇內文的詞 | 結果的標題是筆記標題，不是空白或網址。若不是，改用在 `.nc-prose` 開頭放一個視覺隱藏的標題元素 |
| 路徑 | viewer 模式 | 看頁尾路徑 | 相對 notesDir，沒有 `../` |

## 依賴

Task 61、Task 63。
