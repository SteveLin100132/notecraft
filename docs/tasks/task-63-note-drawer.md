# Task 63 — 筆記 Drawer：單擊預覽

> 規格 [notecraft-workbench.md](../notecraft-workbench.md) §8.2（Drawer 的動作列與 Metadata）、§5.2.2（路徑顯示）、§4.5（z-index）、§10；
> Q7、Q9、Q11、Q17、Q18、Q25、Q26 定案。
> 設計交付 README §5.2 的 Drawer 段；原始碼 `prototype/wb/pt-views.jsx` 的 `PtDrawer`。
> 依賴 [Task 62](task-62-notes-list-toolbar-filters.md)。對應實作階段 **P4** 的後半。

## 範圍

### 1. `src/components/wb/NoteDrawer.tsx`（新增）

右側 480px（平板 420、手機滿版）、白底、左 1px 邊、陰影與滑入動畫照 README §5.2／§8。
scrim `rgba(22,28,40,.18)`。props：`row: WbNoteRow`、`series`（供「同系列章節」）、`onClose`。

接到 `NotesWorkbench` 的選取狀態：再點同一列、點 scrim、按 `Escape`（走 Task 61 的 `wb-escape` 堆疊）都會關。
**選取不進網址**，換頁即關。

### 2. 內容（由上到下）

| 區塊 | 內容 |
| --- | --- |
| 頂列 38px | `workspaceLabel` + `/` + `path`（**全站唯一串接兩者之處**）、關閉鈕 |
| 標題 19px/700 | 右側一顆收藏星號（重用 `FavoriteButton` 的邏輯，樣式改 24px 方形 icon 鈕） |
| pill 列 | AI 狀態、系列「<名> #<序>」（系列色）。**不放**設計稿的「筆記狀態」pill（Q7：沒有 `status` frontmatter） |
| 動作列 | 見 §3 |
| 摘要 | `description`，13px/1.8；沒有就整段不顯示 |
| Metadata | 路徑／資料夾／系列／建立／更新／標籤。**沒有「字數」**（Q9）。標籤 chip 可點 → `/notes?tag=…` |
| @ai-visualize 標記 | 綠／黃點 + id + `type ・ 已生成/待生成`；`title` 帶 prompt。沒有標記時顯示一句灰字 |
| 同系列章節 | 序號方塊 + 標題；目前這篇粗體並標「目前」；資料檔章節標「資料檔」、**可點**（→ `/view/…`，prototype 裡點不了，修掉）；右上「系列總覽 →」 |

「更新」那一列的「（N 天前）」用 `wb-time.ts` 在瀏覽器算（Q10）；SSR 不輸出括號內容。
**Drawer 裡不放閱讀狀態控制**（Q26 定案）。

### 3. 動作列（規格 §8.2）

由左到右：

| 動作 | 樣式 | 顯示條件與行為 |
| --- | --- | --- |
| 開啟筆記 | solid | 一律。`<a href="/notes/<slug>">` |
| 簡報 | 三段式（Q17） | `hasDeck` → solid「▶ 簡報」連 `/present/<slug>`（slug 要 `normalize("NFC")`）；無 deck 且 dev → ghost「生成簡報」複製提示詞；無 deck 且正式 → **不顯示** |
| 複製生成提示 | ghost | **僅 dev 且有待生成標記**。複製對話範本 + Toast，點擊後短暫顯示「已複製」 |

文字用「簡報」「複製生成提示」，不用設計稿的「轉簡報」「生成 N 個標記」（規格有說明理由）。

### 4. `src/lib/prompts.ts`（新增）

- `buildRegeneratePrompt({ promptPath, pendingIds })` —— 把 `RegenerateButton.tsx` 裡的範本字串搬過來，
  **路徑改用 `promptPath`**。現行範本寫死 `src/content/notes/${slug}.mdx`，對子資料夾、`.md`、viewer 都是錯的
- `buildDeckPrompt({ promptPath, slug })` —— 同理，取代 `GenerateDeckButton` 目前吃的 `note.filePath`

`RegenerateButton.tsx`、`GenerateDeckButton.tsx` 本 Task 先改成呼叫這兩個函式（行為不變、路徑變對）；
它們的外觀在 [Task 69](task-69-note-page-header-actions.md) 才換。

### 5. 無障礙（規格 §10）

`role="dialog"`、`aria-modal="true"`、`aria-labelledby` 指向標題；開啟時 focus 移到關閉鈕，關閉時還原到原本那一列；
Tab 在 Drawer 內循環。`prefers-reduced-motion` 時不做滑入。

### 6. 資料來源的兩種模式

| 使用處 | 資料 |
| --- | --- |
| `/notes` | 列表本來就有完整的 `WbNoteRow`，直接傳 |
| Dashboard（[Task 66](task-66-dashboard-widgets.md)） | 只 inline 了精簡列；開 Drawer 時才 `fetch("/wb-index.json")`，載入中顯示骨架 |

把「給 slug、回傳 row」包成 `useWbIndex()` hook（模組層快取 Promise，同頁只抓一次），Palette（Task 65）共用。

## 要改的既有檔案

`NotesWorkbench.tsx`（接上 Drawer）、`RegenerateButton.tsx`、`GenerateDeckButton.tsx`（改用 `prompts.ts`）。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 開與關 | `/notes` | 單擊列 → 再單擊同列 | Drawer 滑入 → 關閉 |
| Esc 順序 | Drawer 開著，再開新增筆記 Modal | 按 `Escape` 兩次 | 先關 Modal、再關 Drawer |
| 有簡報 | 某筆記有 deck | 開 Drawer | solid「簡報」；點了進 `/present/…` |
| 無簡報、正式環境 | `astro build` 後預覽 | 開 Drawer | 沒有簡報按鈕、沒有複製生成提示 |
| 提示詞路徑正確 | dev，`private/` 下、有待生成標記的筆記 | 按「複製生成提示」 | 剪貼簿內容的路徑是 `src/content/notes/private/<檔名>.mdx`，不是 `<slug>.mdx` |
| 資料檔章節可點 | 某系列含資料檔 | 在 Drawer 點該章節 | 進 `/view/…` |
| 路徑不含絕對路徑 | — | 看頂列與 Metadata | 都是相對路徑 |
| 焦點管理 | 鍵盤操作 | `Space` 開、`Escape` 關 | 焦點回到原本那一列 |
| 收藏同步 | Drawer 裡按星號 | 看 Toolbar | 「收藏 N」即時更新 |

## 依賴

Task 62。

## 實作記錄（2026-09-22）

- Drawer 的外框（scrim、滑入、焦點管理、`Escape`）先寫在 `NoteDrawer`，Task 70 抽成 `DrawerShell` 與 `PluginDrawer` 共用
- `wb/actions.tsx`：三段式簡報鈕、複製生成提示、收藏 icon 鈕 —— 筆記頁首與 Drawer 共用同一套，`FavoriteButton`／`GenerateDeckButton` 的舊外觀在 Task 69 刪除
- `lib/prompts.ts` 集中對話範本；`RegenerateButton`／`GenerateDeckButton` 先改吃 `promptPath`
- 實測：`Escape` 先關 Modal 再關 Drawer；正式 build 的 `/notes` 沒有「複製生成提示」字串
