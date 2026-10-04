# Task 119 — dev 與 CLI 接點：dev-only API、dev server 重啟、快取失效、`serve` watcher、新增筆記

> 規格 [notecraft-ignore-config.md](../notecraft-ignore-config.md) §5.3、§5.4、§7；Q4、Q6 定案（§12）。
> 前置：Task 117、Task 118（`notes-ignore-state.ts`、`resolveNotecraftDir` 已收斂）。

## 為什麼要有這一步

Task 118 之後 build 產物已經乾淨，但 dev 與 CLI 還有三種不一致：標籤改名會改到被排除的檔、新增筆記能選被排除的資料夾、改了 `ignore.json` 不會生效（dev 不重啟、`serve` 照舊因被排除的檔變動而 rebuild）。這一步把 §1 盤點表剩下的接點全部換掉。

## 範圍

### 1. `src/dev-api/handlers.mjs`

比對器取自 `loadNotesIgnore(resolveNotecraftDir(...))`，模組層快取一份；astro dev 由 §2 的重啟換新，CLI `serve` 由 §4 換新（匯出 `resetNotesIgnore()` 給 CLI 呼叫）。

| 函式 | 改法 |
| --- | --- |
| `listMdx()` | 改用 `walkNotesAsync()`，只收 `.md`／`.mdx`。影響 `GET /api/tags`、`PUT /api/tags/:old`、`DELETE /api/tags/:tag`、刪筆記時找引用 —— 被排除的檔**不讀也不寫** |
| `handleFolderList()` | 改用 `walkNotesAsync()` 的資料夾回呼；被排除的資料夾（含內建）不列入；回傳形狀不變（`/` 結尾、父層在前） |
| `findNoteFile()` | 找到的檔被排除 → 回傳 `null`（呼叫端既有 404 路徑）；`PUT /api/notes/:slug/tags`、`DELETE /api/notes/:slug` 因此碰不到被排除的筆記 |
| `handleNotesAsset()` | `relPath` 被排除 → 404 `ignored`；在 `assertSafePath` **之後**判斷，順序不可反 |
| `POST /api/notes` | 目標相對路徑被排除 → **400** `{ error: "這個位置被 .notecraft/ignore.json 排除，建立後不會出現在 NoteCraft" }`；在建檔前判斷 |

- 錯誤訊息與回應都不得含本機絕對路徑
- `ignore.json` 格式錯誤時，handler 第一次取比對器會 throw → 回 500 並帶訊息（dev 頁面另有 Astro 錯誤頁，Q4）

### 2. `scripts/new-note.mjs`

- `npm run new-note` 自己寫檔、不經 handlers：同樣在建檔前以 `loadNotesIgnore` 判斷，被排除 → 印上面同一句、`process.exit(1)`
- 規格 §5.3 寫「CLI 共用同一段邏輯」與現況不符（`new-note.mjs` 只 import `node:*`），實作時順手更正規格文字

### 3. dev server 重啟：`src/lib/notes-ignore-integration.mjs`（新增）

- `astro:server:setup({ server, logger })`：`server.watcher.add(<notecraftDir>/ignore.json)`（檔案不存在也要加，才收得到 `add`）
- `add`／`change`／`unlink` 該路徑 → `logger.info("ignore.json 已變更，重新啟動 dev server")` → `server.restart()`；300ms debounce，避免編輯器的「刪除再寫入」連發兩次
- 只在 `astro:server:setup` 掛，build 不受影響；註冊於 `astro.config.mjs` 的 `integrations`
- 同時涵蓋 `astro dev` 與 `notecraftapp view`（後者就是 astro dev）

### 4. `bin/notecraftapp.mjs`

| 位置 | 改法 |
| --- | --- |
| 頂部 | `import { loadNotesIgnore, walkNotesAsync, resolveNotecraftDir } from "../src/lib/notes-ignore.mjs"`（`src/lib/` 已在 `files`，stable app root 也有） |
| `shouldRebuild` Pass 1 `walkMdx`、Pass 1.5 `walkJson` | 改用 `walkNotesAsync()`；被排除的檔不計數、不比 mtime |
| `countMdx`、`countPluginInputs` 的 `walkJson` | 同上，與 `shouldRebuild` 規則一致（`writeMeta` 寫入的 `fileCount` 因此可能少於舊快取 → 第一次執行會因「數量不同」重建一次，可接受，規格 §5.4） |
| Pass 1.6 `walkPlugins`、Pass 2 設定檔 | **不變**：`.notecraft/` 不受 ignore 管（規格 §2.2）；`ignore.json` 本來就在 Pass 2 的 `*.json` 裡，改了自然失效 |
| `isWatchedFile` | notesDir 底下的檔先以目前的比對器判斷，被排除 → `false`（不觸發 rebuild）；`.notecraft/ignore.json` 照舊回 `true` |
| watcher 的 `ignored` callback | 被排除的**資料夾**直接回 `true`，chokidar 不再深入（大型 vendor 資料夾省下 watch 成本） |
| `startBackgroundRebuild` 的事件處理 | 變動的是 `ignore.json` → 先 `loadNotesIgnore()` 換新比對器（成功才換；格式錯誤保留舊比對器、讓 rebuild 照常失敗並走既有 fallback 錯誤頁），再呼叫 `handlers.mjs` 的 `resetNotesIgnore()`，然後排 rebuild |
| watcher 註解 | 第 835–839 行「三類」註解補上 ignore |

## 要改的既有檔案

`src/dev-api/handlers.mjs`、`scripts/new-note.mjs`、`bin/notecraftapp.mjs`、`astro.config.mjs`（註冊 integration）、`docs/notecraft-ignore-config.md`（§5.3 更正）。新增 `src/lib/notes-ignore-integration.mjs`。

## 驗收

以 Task 118 的 `scripts/fixtures/ignore-sample/` 為筆記資料夾。

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 標籤 | `drafts/b.mdx` 有標籤 `t1`、`a.mdx` 也有 | `PUT /api/tags/t1` 改成 `t2` | 只有 `a.mdx` 被改、`updatedAt` 更新；`drafts/b.mdx` 原封不動（`git diff` 為空） |
| 資料夾 | — | `GET /api/folders` | 不含 `drafts/`、`private/`、`node_modules/`；含 `archive/` |
| 新增 | — | `POST /api/notes` 到 `drafts/new` | 400 與規格文字；沒有建檔 |
| CLI 新增 | — | `npm run new-note`，路徑填 `drafts/new` | exit 1、同一句訊息 |
| slug | — | `DELETE /api/notes/drafts/b` | 404；檔案還在 |
| 資產 | — | `GET /notes-assets/private/x.png` | 404 `ignored` |
| 逃逸 | — | `GET /notes-assets/..%2F..%2Fpackage.json` | 仍是既有 400（順序沒被改壞） |
| dev 重啟 | `notecraftapp view` 執行中 | 在 `ignore.json` 加 `archive/` | log「ignore.json 已變更，重新啟動 dev server」；Sidebar 的 `archive` 消失 |
| dev watcher 陷阱 | 同上 | 存檔 `drafts/b.mdx` | 不會出現在 Sidebar（規格 §5.1） |
| 刪檔 | 同上 | 刪掉 `ignore.json` | 重啟；`drafts/` 回來 |
| serve | `notecraftapp serve` 執行中 | 改 `drafts/b.mdx` | **不** rebuild |
| serve | 同上 | 改 `ignore.json` | rebuild 一次；之後改 `archive/old.md`（新規則排除）不 rebuild |
| serve 壞檔 | 同上 | `ignore.json` 存成壞 JSON | rebuild 失敗、fallback 錯誤頁顯示訊息；修好存檔後自動恢復 |
| 快取 | 已 `view` 過一次 | 只改被排除的 `c.private.md` 後再 `view` | 不 rebuild（log 走快取） |
| 全套 | — | `npx tsc --noEmit && npx astro build && npm run check-plugins` | 通過；tsc 錯誤數不增加 |

## 依賴

Task 117、Task 118。

## 實作記錄（2026-10-04）

- `handlers.mjs` 的五個接點已在 Task 118 的 commit 一起完成；handlers 以 notecraftDir 為 key 自己快取比對器，匯出 `resetHandlersIgnore()` 給 dev 重啟與 CLI 換新用
- `findNoteFile()` 不改（新增筆記的撞名檢查要看到硬碟上所有檔），另加 `findVisibleNoteFile()` 給改標籤、刪除、刪除計畫用
- 刪筆記的孤兒判斷**連被排除的筆記一起看**（只套內建排除）：被排除的筆記還在硬碟上，誤刪它引用的元件日後取消排除就壞了
- `IGNORED_LOCATION_MESSAGE` 放在 `notes-ignore.mjs`，`POST /api/notes` 與 `npm run new-note` 共用
- `notes-ignore-integration.mjs` 以 Vite 的 `server.restart()` 重啟：實測 log 出現「ignore.json 已變更，重新啟動 dev server」後 Content Layer 重新同步、被排除的 entry 消失
- CLI：`serve` 送 `/notes-assets/*` 時 handlers 收到的 cwd 是 packageRoot，所以 `serve` 啟動時在父行程設 `NOTECRAFT_NOTES_DIR`／`NOTECRAFT_USER_CWD`（與子行程相同）；`ignored` callback 用 chokidar 5 的 `(path, stats)` 簽名只剪資料夾
- `writeMeta` 的 `fileCount` 改成不含被排除的檔：從 1.9.0 升上來第一次 `view`／`build` 若數字不同會重建一次
- 驗證：`node scripts/fixtures/ignore-dev.mjs`（dev API、notes-assets、存檔不冒出、改／刪 `ignore.json` 重啟、build 快取、serve watcher）
