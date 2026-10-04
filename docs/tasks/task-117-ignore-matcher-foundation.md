# Task 117 — ignore 地基：比對模組、`walkNotes()`、`resolveNotecraftDir()`、斷言、JSON Schema

> 規格 [notecraft-ignore-config.md](../notecraft-ignore-config.md) §3、§4、§7、§9.1；Q1、Q2、Q4、Q5、Q6 定案（§12）。
> 無前置依賴，**本批第一個做**；Task 118、119、120 都靠它。

## 為什麼要有這一步

筆記資料夾目前被 9 個地方各自走訪，跳過的東西各不相同（規格 §1）。這一步先做出**唯一一份**比對與走訪的實作，後面三個 Task 只負責把各接點換過去。規則語意寫錯時 build 照樣全綠，只有斷言抓得到，所以斷言跟比對模組一起交付。

## 範圍

### 1. 依賴

- `npm i ignore`（node-ignore），放 `dependencies`：viewer 是從 npm 安裝後執行，`devDependencies` 不會被裝（Q1）

### 2. `src/lib/notes-ignore.mjs` ＋ `src/lib/notes-ignore.d.ts`（新增）

寫成 `.mjs` 是因為三種執行環境都要用：Astro／Vite（`.ts`）、`src/dev-api/handlers.mjs`（astro dev 與 CLI 共用）、`bin/notecraftapp.mjs`（純 Node）。做法比照 `src/lib/no-local-path-integration.mjs`。

| 匯出 | 規則 |
| --- | --- |
| `BUILTIN_IGNORES` | `[".*", "node_modules/", "dist/"]`（規格 §3.4） |
| `createNotesIgnore(patterns)` | 純函式、無 I/O。過濾空字串、只有空白、`#` 開頭的元素（`\#` 開頭保留，交給 `ignore` 解讀）；`ignore().add(使用者規則).add(BUILTIN_IGNORES)` —— **內建規則加在後面**，`!` 解除不了（Q5）。回傳 `{ ignores(relPath), ruleCount, source: null, builtinNegations }` |
| `ignores(relPath)` | `relPath` 相對 notesDir、`/` 分隔；資料夾帶結尾 `/`。含 `\`、以 `/` 開頭、含 `..` 片段 → **throw**（抓呼叫端漏轉或路徑逃逸） |
| `builtinNegations` | 使用者寫的 `!` 規則中，去掉 `!` 後會被內建規則命中的那些（例 `!dist/`、`!.obsidian/`）；給 §7 的 warn |
| `parseIgnoreJson(text, sourceLabel)` | 純函式。JSON 壞、頂層不是物件（含頂層是陣列）、`ignore` 存在但不是字串陣列 → throw，訊息含 `sourceLabel` 與第幾個元素；`ignore` 省略 → `[]`；未知頂層鍵（`$schema` 以外）收進 `unknownKeys` 回傳（Q2、Q4） |
| `resolveNotecraftDir(env, cwd)` | `NOTECRAFT_USER_CWD` > `NOTECRAFT_NOTES_DIR` > `cwd`，各自接 `.notecraft`；與現行 `astro.config.mjs`、`src/lib/plugins.ts` 的邏輯**逐字等價**（Q6） |
| `resolveNotesDir(env, cwd)` | `NOTECRAFT_NOTES_DIR` 或 `<cwd>/src/content/notes` |
| `loadNotesIgnore(notecraftDir)` | 讀 `ignore.json`；不存在 → `createNotesIgnore([])`（`source: null`）；存在 → `parseIgnoreJson` ＋ `createNotesIgnore`，`source` 記檔案路徑。規則語法無效（`ignore` 套件 throw）→ 包成含「第幾條」的錯誤再 throw |
| `findShadowedIgnoreFiles(notesDir, notecraftDir)` | Q6 的 warn：`notesDir/.notecraft/ignore.json` 存在、但目前讀的不是它 → 回傳該路徑 |
| `walkNotes(notesDir, ig, onEntry)` | 同步遞迴；資料夾先以 `rel + "/"` 問 `ig.ignores()`，命中就**不進入**（剪枝）；檔案命中就略過；`readdir` 失敗當作空。`onEntry({ rel, abs, dirent })` 只收到沒被排除的檔案。另回傳 `{ prunedDirs, ignoredFiles }`（給 Task 118 的 log 與 `!` 無效 warn） |
| `walkNotesAsync(...)` | 同上的 async 版（`handlers.mjs`、CLI 用 `fs.promises`） |
| `deadNegations(ig, prunedDirs)` | 使用者的 `!` 規則中，前綴落在某個被剪枝資料夾內的（例 `archive/` ＋ `!archive/keep.mdx`）；給規格 §7 的 warn |

- 模組層**不做**快取：快取由呼叫端各自持有（Content config、`plugins.ts`、handlers 各一份），本模組保持可在斷言裡重複建立
- `.d.ts` 給 `.ts` 呼叫端型別；不得出現 `any`

### 3. `schemas/ignore.schema.json`（新增）

- draft 2020-12；`type: object`；`properties.$schema: string`、`properties.ignore: { type: array, items: string }`；`additionalProperties: true`（未知鍵只 warn，不在 schema 擋）
- `package.json` 的 `files` 加 `"schemas/"`，讓規格 §3.2 的 jsDelivr 網址有效

### 4. 斷言 `scripts/checks/notes-ignore.mjs`（新增）

比照 `scripts/checks/upd-derive.mjs` 的骨架（`assert/strict`、`check(name, fn)`、`✓／✗`、失敗 `process.exit(1)`）。

| 斷言 | 內容 |
| --- | --- |
| 任何深度 | `CHANGELOG.md` 命中 `CHANGELOG.md`、`a/b/CHANGELOG.md`；不命中 `CHANGELOG.mdx` |
| 根錨定 | `/README.md` 命中 `README.md`；不命中 `docs/README.md` |
| 資料夾 | `drafts/` 命中 `drafts/`、`x/drafts/`；不命中檔案 `drafts` |
| 萬用字元 | `**/*.private.md` 命中 `a.private.md`、`a/b/c.private.md`；不命中 `a.private.mdx`。`**/*.test.mdx` 與 `*.test.mdx` 對 `a.test.mdx`、`x/y/b.test.mdx` 結果相同 |
| 錨定的跨層 | `fixtures/**/*.json` 命中 `fixtures/a.json`、`fixtures/x/y.json`；不命中 `other/fixtures/a.json` |
| 反向 | `archive/*` ＋ `!archive/keep.mdx`：`archive/a.md` 命中、`archive/keep.mdx` 不命中 |
| 救不回 | 暫存資料夾建 `archive/keep.mdx`，規則 `archive/` ＋ `!archive/keep.mdx`：`walkNotes` 收不到 `keep.mdx`、`prunedDirs` 含 `archive/`、`deadNegations` 回傳 `!archive/keep.mdx` |
| 註解與空白 | `"# x"`、`""`、`"  "` 不計入 `ruleCount`；`\#tag.md` 命中檔名 `#tag.md` |
| 內建 | 無任何規則時 `.git/`、`.notecraft/`、`.obsidian/`、`.env`、`node_modules/`、`x/node_modules/`、`dist/` 都命中；寫了 `!node_modules/`、`!dist/` 仍命中，且 `builtinNegations` 列出兩條；使用者自己寫 `node_modules/` 不報錯、結果不變 |
| 輸入防呆 | `ignores("a\\b.md")`、`ignores("/a.md")`、`ignores("../a.md")` throw |
| JSON | `parseIgnoreJson`：`{}` → `[]`；`[]`（頂層陣列）throw；`{"ignore":"x"}` throw；`{"ignore":["a",1]}` throw 且訊息含「第 2 個」；`{"ignores":[]}` → `unknownKeys = ["ignores"]`；`$schema` 不算未知 |
| 語法錯誤 | `loadNotesIgnore` 遇 `ignore` 套件拒絕的規則 → throw 且訊息含是哪一條 |
| 路徑解析 | `resolveNotecraftDir`：三種 env 組合各一組，與 `plugins.ts` 現行結果相同 |
| 遮蔽 | `userCwd ≠ notesDir` 且兩邊都有 `ignore.json` → `findShadowedIgnoreFiles` 回傳 notesDir 那份；`userCwd` 未設 → 空 |

走訪類斷言在 `os.tmpdir()` 下建暫存樹，結束時刪除。

### 5. `package.json`

- `scripts` 加 `check:ignore`：`node scripts/checks/notes-ignore.mjs`（`.mjs` 不需 strip-types 旗標）；`check-plugins` 會自動跑到 `scripts/checks/*.mjs`

## 要改的既有檔案

`package.json`、`package-lock.json`。新增 `src/lib/notes-ignore.mjs`、`src/lib/notes-ignore.d.ts`、`schemas/ignore.schema.json`、`scripts/checks/notes-ignore.mjs`。

**本 Task 不改任何走訪點**（`astro.config.mjs`、`plugins.ts` 的 `notecraftDir` 也還不換），行為零變化。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 斷言 | Node 22.6+ | `npm run check:ignore` | 全綠 |
| 護欄 | 暫時把 `createNotesIgnore` 裡內建規則改成加在使用者規則**之前** | `npm run check:ignore` | 「內建」那組失敗；改回後綠 |
| 打包 | — | `npm pack --dry-run` | 清單含 `schemas/ignore.schema.json`；`dependencies` 含 `ignore` |
| 全套 | — | `npm run check-plugins` | 通過（含新斷言） |
| 零變化 | — | `npx tsc --noEmit && npx astro build` | 通過；tsc 錯誤數不增加；產物與 main 相同（頁數一致） |

## 依賴

無。
