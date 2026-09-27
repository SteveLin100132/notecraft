# Task 85 — App 端：資料檔 `meta.description` 去除 Markdown（顯示第一段、索引全文）

> 規格 [notecraft-er-docs.md](../notecraft-er-docs.md) §11.1、§11.3、§12.1；Q9、Q10 定案。
> 設計交付 README〈相容性要求〉第 6 條。
> 相關：[notecraft-workbench.md](../notecraft-workbench.md) §8.7（Toolbar 說明文字、pagefind 標記）、[Task 72](task-72-view-page-header.md)。
> 依賴 [Task 79](task-79-er-mini-markdown.md)（斷言要與 plugin 的 `stripMarkdown` 對照）。**這是本批唯一動到 app 的 Task**，跨所有 plugin 生效。

## 為什麼是 app 的事

`meta.description` 由 app 讀出後**原字串**送進四個出口，plugin 管不到：

| 出口 | 位置 |
| --- | --- |
| `<meta name="description">` | `view/[...path].astro` → `WorkbenchLayout.astro:70` |
| `/view` Toolbar 說明文字（目前是 **pagefind 索引來源**） | `view/[...path].astro:73-75` |
| `/wb-index.json` `dataFiles[].description` | `workbench.ts:271-281` |
| 系列章節 `description` | `series.ts:180` |

v1.2 範例的 description 有 `**粗體**`、`## 閱讀順序`、清單與反引號 —— 不處理的話全會原樣出現。

## 範圍

### 1. `src/lib/strip-markdown.ts`（零 runtime import）

- `stripMarkdownFirst(src)`：第一個**非標題**段落（空行前），合併為單行
- `stripMarkdownAll(src)`：全文，區塊以空白分隔，合併為單行
- 去除：行首 `#`／`>`／`-`／`*`／`1.`；行內 `**`／`__`、反引號、`[文字](url)` → `文字`、`![alt](url)` → `alt`、HTML 標籤
- 反引號內的 `table:`／`schema:` 前綴一律去掉（Q10）
- 已是純文字、單段的 description：兩個函式都回傳原字串（trim 後）
- 不與 plugin 的 `markdown-text.ts` 共用 —— app 不能 import plugin；兩支行為以斷言對照（見 §4）
- 既有 `excerpt()`（`notes.ts`）不改、不共用：它丟整行、不處理行內標記

### 2. `readMeta()` 與四個出口

[src/lib/plugins.ts](../../src/lib/plugins.ts) `readMeta()` 多回兩個欄位，`ResolvedDataFile` 型別同步（`plugin-types.ts`）：

| 欄位 | 值 |
| --- | --- |
| `description` | 原字串（保留，plugin 的 props 不受影響） |
| `descriptionText` | `stripMarkdownFirst()` |
| `descriptionIndex` | `stripMarkdownAll()` |

| 出口 | 改用 |
| --- | --- |
| `<meta name="description">` | `descriptionText` |
| Toolbar 說明文字 | `descriptionText` |
| `/wb-index.json` | `descriptionText` |
| 系列章節 | `descriptionText` |

### 3. pagefind：顯示第一段、索引全文（Q9）

`view/[...path].astro`：

- `descriptionIndex !== descriptionText` 時：Toolbar 的 `.wb-tb-lbl` **移除** `data-pagefind-body`；另輸出
  `<div data-pagefind-body hidden aria-hidden="true">{descriptionIndex}</div>`，放在 stage 之外
- 兩者相同時：維持現況（標記留在 Toolbar 上）
- 頁首 h1 的索引標記（`indexHeader`）不動
- **需驗證**：pagefind 會不會索引 `hidden` 屬性的元素。它解析 build 後的 HTML、不套 CSS，預期會；若不會，改用視覺隱藏 class（`position:absolute; width:1px; height:1px; overflow:hidden; clip-path:inset(50%)`）並保留 `aria-hidden`。結論寫進設計文件 §17

### 4. 斷言 `scripts/checks/app-strip-markdown.mjs`

串進 `check-plugins`（與 Task 78、79 同一機制）。案例與 [Task 79](task-79-er-mini-markdown.md) §6 的 ⑨⑩ 相同，並**直接比對** `stripMarkdownFirst/All` 與 plugin `stripMarkdown(…, 'first'|'all')` 對同一批輸入的輸出一致 —— 兩支分開實作，這是防止它們漂移的唯一機制。

### 5. 版號

notecraftapp **1.3.0**（新增行為）：`package.json`、`CHANGELOG.md`（「變更」：資料檔 `meta.description` 允許 Markdown，app 端顯示與索引時去除標記）。
plugin `engines` **不升**（`>=0.6.0`）：舊 app 上只是顯示 Markdown 符號，屬外觀退化。

## 要改的既有檔案

新增 `src/lib/strip-markdown.ts`、`scripts/checks/app-strip-markdown.mjs`；改 `src/lib/plugins.ts`、`src/lib/plugin-types.ts`、`src/pages/view/[...path].astro`、`src/lib/workbench.ts`、`src/lib/series.ts`、`package.json`、`CHANGELOG.md`。
確認 `src/lib/` 在 npm 套件 `files` 內（viewer 模式需要）。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 純文字不變 | `schema-demo.er.json`（純文字 description） | `npm run build` | `<meta description>`、Toolbar、`wb-index.json` 與改動前逐字相同；Toolbar 仍帶 `data-pagefind-body`、無 hidden 元素 |
| Markdown 攤平 | `er-v12.er.json`（v1.2 範例的 description） | `npm run build` 後看 `dist/view/testing/er-v12.er/index.html` | `<meta description>` 與 Toolbar 只有第一段、不含 `**`、`#`、`` ` `` |
| 索引全文 | 同上 | `npm run build && npm run preview`，Palette 內文組搜 description 第二段以後的詞（例：「閱讀順序」） | 搜得到該資料檔頁 |
| 欄位名仍不進索引 | 同上 | 搜某個欄位名 | 沒有結果 |
| wb-index | 同上 | 讀 `dist/wb-index.json` | 該檔 `description` 為第一段純文字 |
| 前綴 | description 含 `` `table:customer` `` | build | 純文字為 `customer` |
| 兩支一致 | — | `npm run check-plugins` | `app-strip-markdown.mjs` 通過 |
| viewer | `npx notecraftapp view ./<含 v1.2 資料檔的資料夾>`（本機 pack） | 看 `/view` 頁 | 同上 |
| 型別與 build | — | `npx tsc --noEmit && npx astro build` | 通過 |

## 依賴

Task 79。

## 實作記錄（2026-09-27）

- 偏離：`ResolvedDataFile.description` 本身改為第一段純文字（不另開 `descriptionText`），新增 `descriptionIndex` —— 沒有任何出口需要原文，漏改的出口也自動安全
- pagefind 實測會索引 `hidden` 元素：第二段以後的詞搜得到、欄位名搜不到；純文字描述的頁面輸出與先前逐字相同
- `app-strip-markdown.mjs` 以 33 組輸入對照 app 與 plugin 兩份實作，逐字相同
