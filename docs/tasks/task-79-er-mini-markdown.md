# Task 79 — 迷你 Markdown：React 渲染、純文字模式、自動連結、連結白名單

> 規格 [notecraft-er-docs.md](../notecraft-er-docs.md) §8.5、§8.3（首行說明）、§12.1；Q10 定案。
> 設計交付 README〈Markdown（Wiki 內文）〉；prototype `er/er-core.jsx › ErMarkdown／ErInline`。
> 依賴 [Task 78](task-78-er-derive-compat-checks.md)（`linkTargets`、`scripts/checks` 串接）。

## 範圍

### 1. 兩個檔案

| 檔案 | 內容 | 為什麼分開 |
| --- | --- | --- |
| `markdown-text.ts` | 解析器（字串 → 區塊／行內 token 陣列）、`resolveCodeLink()`、`safeHref()`、`stripMarkdown()` | 無 JSX、零 runtime import，`scripts/checks` 能以 Node strip-types 直接載入（Node 不轉 JSX） |
| `markdown.tsx` | `<ErMarkdown src onLink targets />`：把 token 轉成 React 元素 | 需要 JSX |

**不用** `dangerouslySetInnerHTML`（install lint 本來就會擋），也不引入 Markdown 函式庫。

### 2. 支援的語法（只有這 8 種）

`##`（→ `h3`，15px）、`###`（→ `h4`，14px）、段落、`-` 清單、`1.` 清單、`>` 引言、`**粗體**`、`` `code` ``、`[文字](url)`。
其餘一律當文字（含 `*斜體*`、表格、圖片、HTML 標籤 —— 標籤以文字輸出，React 會自動跳脫）。
樣式照 handoff：內文 14px／1.8 `--text-body`；引言 `--surface-accent-soft` 底、`--radius-md`、13px。

### 3. 連結白名單 `safeHref(url)`

| url | 結果 |
| --- | --- |
| `http:`、`https:`、`mailto:` | 連結；外部連結加 `target="_blank" rel="noopener noreferrer"` |
| 單一 `/` 開頭（`/^\/(?!\/)/`） | 站內連結，同分頁 |
| `#…` | 錨點 |
| 其他（`javascript:`、`data:`、`vbscript:`、`//host`、相對路徑） | **整段 `[文字](url)` 原樣當純文字輸出** |

判定前先 trim 並轉小寫比對協定、去掉控制字元（`java\tscript:` 這類繞法）。React 對 `javascript:` href 只警告不擋，這一條不能省。

### 4. 反引號自動連結 `resolveCodeLink(code, targets)`（Q10）

| 反引號內容 | 結果 |
| --- | --- |
| `customer`（無前綴） | 是表名 → `{ kind: 'table' }`；否則是 schema key → `{ kind: 'schema' }`；兩者皆是 → **表名優先**；皆否 → 一般 code |
| `table:customer` | 只找表。找到 → 連結、**顯示文字 `customer`**；找不到 → 一般 code、**保留原字串** `table:customer` |
| `schema:crm` | 只找 schema，其餘同上。隱含模式（`targets.schemas` 為空）一律找不到 |

- 前綴只認 `table:`、`schema:` 兩個，全小寫、冒號後不可有空白；`table:customer.id` 這種帶 `.` 的當一般 code
- 比對大小寫敏感
- 連結樣式：`--blue-50` 底、`--blue-700` 字、hover `--blue-100`；`href` 用 `#table:<name>`／`#schema:<key>`（讓中鍵、複製連結有東西可複製），`onClick` `preventDefault` 後呼叫 `onLink(route)`

### 5. 純文字模式 `stripMarkdown(src, mode)`

- `mode: 'first'`：第一個**非標題**段落（空行前），合併為單行 —— Schema 卡片、Schema 頁表格的「說明」欄用（取代 prototype 的 `split('\n')[0].replace(/[`*]/g,'')`，後者遇到以 `## 標題` 開頭的 description 會顯示「## 標題」）
- `mode: 'all'`：全文、區塊以空白分隔，合併為單行
- 行內：`**x**` → `x`、`` `x` `` → `x`、`[x](u)` → `x`；**反引號內的 `table:`／`schema:` 前綴一律去掉**（純文字模式不知道目標存不存在）
- 卡片的 2 行截斷用 CSS `-webkit-line-clamp`，不在字串層截

### 6. 斷言 `scripts/checks/er-markdown.mjs`

串進 `check-plugins`，並加到 `package.json` 的 `check:er`（改成依序跑兩支）。至少涵蓋：

| # | 輸入 | 期望 |
| --- | --- | --- |
| ① | `[x](javascript:alert(1))` | 純文字 token，無連結 |
| ② | `[x](JavaScript:alert(1))`、`[x]( javascript:…)`、`[x](java\tscript:…)` | 同 ① |
| ③ | `[x](//evil.example)`、`[x](data:text/html,…)` | 同 ① |
| ④ | `[x](/notes/a)`、`[x](https://a.b)`、`[x](#c)`、`[x](mailto:a@b)` | 連結 |
| ⑤ | `` `customer` `` 且 `customer` 同時是表名與 schema key | table |
| ⑥ | `` `schema:customer` `` 同上 | schema，顯示 `customer` |
| ⑦ | `` `table:nope` `` | 一般 code，顯示 `table:nope` |
| ⑧ | 隱含模式下 `` `schema:_all` `` | 一般 code |
| ⑨ | `stripMarkdown('## 標題\n\n**粗** 與 `table:x`', 'first')` | `粗 與 x` |
| ⑩ | 交付包 v1.2 範例的 `meta.description` 以 `'all'` 攤平 | 不含 `#`、`**`、`` ` ``、`](` |
| ⑪ | `<script>alert(1)</script>` 當段落 | 文字 token，原樣保留（由 React 跳脫） |

## 要改的既有檔案

新增 `plugins/er-diagram-renderer/{markdown-text.ts, markdown.tsx}`、`scripts/checks/er-markdown.mjs`；改 `package.json`（`check:er`）、`plugins/registry.json`（`files`）。
本 Task **只做元件與斷言**，掛到 Wiki 頁是 Task 81。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 斷言 | — | `npm run check:er` | 兩支全過 |
| 護欄 | — | `npm run check-plugins` | 通過；install lint 掃到 `markdown.tsx` 沒有 `dangerouslySetInnerHTML` |
| 型別 | — | `npx tsc --noEmit` | 通過 |

## 依賴

Task 78。

## 實作記錄（2026-09-27）

- `#` 視同 `##`（否則單一 `#` 開頭的行會卡在段落判定外）；`stripMarkdown` 以原始行分區塊，段落、引言、清單之間沒有空行也切開
- 踩到：install lint 逐行找 `dangerouslySetInnerHTML` 字樣，**註解裡提到也算違規**，改寫措辭
