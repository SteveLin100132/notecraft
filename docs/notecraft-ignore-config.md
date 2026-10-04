---
Project Name: NoteCraft — `.notecraft/ignore.json`（排除檔案設定）
文件類型: Design Document
文件版本: v1.0.0
開發模式: Waterfall
技術選型: 確定 —— 比對引擎新增 `ignore`（node-ignore）runtime 依賴（Q1 = A）；其餘沿用既有技術棧
文件狀態: 已實作（notecraftapp v1.10.0，Task 117–120，2026-10-04）—— §12 的 7 題已全數確認；實作後回填見 §13
文件作者: 建宇
建立日期: 2026-10-04
更新日期: 2026-10-04
依賴文件: docs/notecraft-plugin-system.md（`.notecraft/` 與 `plugins.json` 的路徑解析、失敗一律 build fail）、docs/notecraft-npx-viewer-v2.md（`userCwd`／`notesDir`、快取失效、watcher）、docs/notecraft-workbench.md
分支: feat/ignore-config
目標版本: notecraftapp 1.10.0
---

# NoteCraft — `ignore.json` 設計文件

讓作者在 `.notecraft/ignore.json` 寫一組 **類 `.gitignore`** 的規則，被命中的檔案與資料夾 NoteCraft **一律不讀**（範圍是所有檔案，不限 `.md`／`.mdx`，Q3 = A）：不成為筆記、不被 plugin 認領、不出現在資料夾樹與新增筆記的下拉選單、不被複製進 build 產物、改了也不觸發 rebuild。

典型用途：

- 筆記資料夾就是既有專案的 `docs/`，裡面混著 `CHANGELOG.md`、`adr/template.md`、`node_modules` 以外的 vendor 文件，不想變成筆記
- 草稿、私人筆記（`drafts/`、`**/*.private.md`）不想進部署站
- 大型 JSON（測試 fixture、API dump）放在筆記資料夾內，但不該被 plugin 規則掃到、也不該拖慢 build

---

## 1. 現況：NoteCraft 在哪些地方「讀」筆記資料夾

在設計規則前先盤點。目前**沒有任何單一入口**，至少有 9 處各自走訪 `notesDir`，跳過的東西也各不相同：

| # | 位置 | 讀什麼 | 目前跳過 |
| :-- | :-- | :-- | :-- |
| 1 | `src/content/config.ts` — `glob({ pattern: "**/*.{md,mdx}" })` | 筆記（Content Layer） | 只有 `.` 開頭（tinyglobby 預設 `dot: false`）；**`node_modules`、`dist` 不跳過** |
| 2 | `src/lib/plugins.ts` — `walk()` | 給 `plugins.json` 規則比對的所有檔案 | `.` 開頭、`node_modules`、`dist`、`.git` |
| 3 | `src/dev-api/handlers.mjs` — `listMdx()` | 標籤統計／改名／刪除、刪筆記時找引用 | `.` 開頭資料夾 |
| 4 | `src/dev-api/handlers.mjs` — `handleFolderList()` | 新增筆記的資料夾下拉 | `.` 開頭、`node_modules`、`dist` |
| 5 | `src/dev-api/handlers.mjs` — `findNoteFile()`、`handleNotesAsset()` | slug → 檔案、`/notes-assets/*` 即時送檔 | 無（只擋路徑逃逸） |
| 6 | `src/lib/notes-assets-integration.ts` | build 時把筆記引用的圖片複製進 `dist/notes-assets/` | 無 |
| 7 | `bin/notecraftapp.mjs` — `shouldRebuild()` 的 `walkMdx`／`walkJson`、`countMdx`、`countPluginInputs` | 快取失效判斷 | `.` 開頭；JSON 另跳 `node_modules` |
| 8 | `bin/notecraftapp.mjs` — chokidar watcher | `serve` 的背景 rebuild | `notesDir` 第一層 `.` 開頭（`.notecraft` 例外） |
| 9 | `.claude/agents/note-scanner.md`（含 `skill-template/` 副本） | AI 標記掃描 | 由 subagent 自行 Glob，無規則 |

另外兩處會**間接**碰到檔案：

- `src/lib/remark-notecraft-notes-assets.ts` 把 `[x](./a.mdx)` 改寫成 `/notes/a`、把相對圖片改寫成 `/notes-assets/…`
- `src/lib/series.ts` 依 `series.json` 的章節識別碼找筆記（找不到時 warn「找不到對應筆記，已跳過」）

**結論**：ignore 不能只加在 Content Collection 一處，否則會出現「Sidebar 沒有這篇，但標籤改名時還是改到它」「筆記被排除，圖片卻照樣被複製進部署站」這類不一致。本設計的核心就是把 9 處收斂到同一個比對函式（§4）。

---

## 2. 目標與非目標

### 2.1 目標

1. 新設定檔 `.notecraft/ignore.json`，語法盡量貼近 `.gitignore`，作者不用學新東西（§3）
2. **一個比對模組**、所有走訪點共用；dev（`astro dev`／`notecraftapp view`）、`build`、`serve` 行為一致（§4、§5）
3. 被排除的檔案**不會出現在任何輸出**（HTML、`/wb-index.json`、pagefind 索引、`notes-assets`）—— 作者拿它來藏私人筆記時可以信任（§6）
4. 改 `ignore.json` 會生效：dev server 自動重啟、`serve` 自動 rebuild、`view`／`build` 的快取會失效（§5.4）
5. 規則的語意由 `scripts/checks/` 斷言鎖住（§9）

### 2.2 非目標

| 項目 | 決定 | 為什麼 |
| :-- | :-- | :-- |
| 讀 `.gitignore` | **不做**（不自動繼承） | `.gitignore` 排除的常是 build 產物，與「不想當筆記」是兩件事；反過來，私人草稿常常有 commit 但不想上站。自動繼承會讓行為難以預測 |
| 每個子資料夾各放一份（巢狀 `.gitignore` 那種） | **不做** | 只有一個 `.notecraft/`；多份檔會讓 `userCwd`／`notesDir` 的解析更複雜 |
| UI 編輯 ignore 規則 | **不做** | 與 `plugins.json`、`series.json` 一樣手寫；dev-only API 只有 `plugins.json` 的 `disabled` 有寫入介面 |
| 排除 `.notecraft/` 內的東西（plugin、元件） | **不做** | `ignore.json` 管的是「筆記資料夾的內容」；`.notecraft/` 是 NoteCraft 自己的設定 |
| 依 frontmatter 排除（如 `draft: true`） | **不做**（可日後另案） | 那是「讀了再決定不發佈」，與「根本不讀」不同層 |

---

## 3. 檔案格式

### 3.1 位置

`<notecraftDir>/ignore.json`，`notecraftDir` 與 `plugins.json` **完全同一套優先序**（`src/lib/plugins.ts`、`astro.config.mjs`）：

```
NOTECRAFT_USER_CWD 有設 → <userCwd>/.notecraft/ignore.json
否則 NOTECRAFT_NOTES_DIR 有設 → <notesDir>/.notecraft/ignore.json
否則（主專案）            → <cwd>/.notecraft/ignore.json
```

> `series.json` 是兩處都找（`notesDir` 近的優先），`plugins.json` 只找一處。ignore 跟 `plugins.json` 走，因為兩者都是「決定哪些檔案被誰處理」，放在同一個資料夾、同一個基準最不會錯位（Q6 = A，已定案）。**只讀這一處、不合併**：例如 `notecraftapp view ./docs` 從專案根執行時，只讀 `<專案根>/.notecraft/ignore.json`，`docs/.notecraft/ignore.json` 即使存在也不讀 —— 這時 build 印 warn 一次：「找到 docs/.notecraft/ignore.json，但目前讀的是 .notecraft/ignore.json，前者不會生效」，免得作者以為規則有作用。

**檔案不存在 = 沒有規則**（只套 §3.4 的內建排除），不印任何訊息。

### 3.2 形狀

```jsonc
{
  "$schema": "https://cdn.jsdelivr.net/npm/notecraftapp/schemas/ignore.schema.json",
  "ignore": [
    "drafts/",
    "**/*.private.md",
    "CHANGELOG.md",
    "/README.md",
    "fixtures/**/*.json",
    "archive/*",
    "!archive/keep-this.mdx"
  ]
}
```

- 頂層是物件、規則在 `ignore: string[]`（Q2 = A，已定案）。物件而不是裸陣列，是為了留 `$schema` 與日後的欄位；頂層是陣列 → 格式錯誤（處置見 §7）
- `ignore` 鍵省略視同空陣列（只寫 `$schema` 的檔是合法的）
- 未知的頂層鍵：build 印 warn、不 fail（拼錯 `ignores` 時作者看得到）
- 空字串與只有空白的元素忽略；以 `#` 開頭的元素視為註解（JSON 不能寫註解，這是 `.gitignore` 的對應物）。要比對真的以 `#` 開頭的檔名用 `\#`

### 3.3 規則語意（`.gitignore` 子集）

基準一律是 **`notesDir`**（與 `plugins.json` 的 `files` 相同），路徑分隔符一律 `/`，Windows 也是。

| 寫法 | 意義 | 例 |
| :-- | :-- | :-- |
| `name` | 不含 `/` → **任何深度**的同名檔或資料夾 | `CHANGELOG.md` 命中 `CHANGELOG.md`、`api/CHANGELOG.md` |
| `/name` | 開頭 `/` → 只錨定在 `notesDir` 根 | `/README.md` 只命中根目錄那一份 |
| `a/b` | 中間有 `/` → 相對 `notesDir` 根 | `guides/old.md` |
| `dir/` | 結尾 `/` → **只比對資料夾**，整棵子樹排除 | `drafts/` |
| `*`、`?`、`[abc]` | 不跨 `/` 的萬用字元 | `*.private.md` |
| `**` | 跨任意層 | `fixtures/**/*.json`、`**/tmp/` |
| `!pattern` | **反向**：把先前排除的再納回；**後寫的規則勝** | `!archive/keep-this.mdx` |
| `#…` | 註解 | `"# 私人筆記"` |

與 `.gitignore` 一致的那條陷阱照樣成立：**資料夾本身被排除時，裡面的檔案無法用 `!` 救回**（走訪時整個資料夾直接不進去）。上例要寫 `archive/*` 而不是 `archive/`，`!archive/keep-this.mdx` 才有效。文件與 build 訊息都要提醒（§7）。

### 3.4 內建排除（不必寫、不能用 `!` 解除）

把 §1 表格各自為政的跳過規則統一成一份，**所有走訪點都套**：

- 名稱以 `.` 開頭的檔案與資料夾（含 `.git`、`.notecraft`、`.obsidian`、`.vscode`）
- `node_modules/`
- `dist/`

> 這會**修掉一個既有不一致**：Content Collection 目前會收 `notesDir/node_modules/**/*.md`（tinyglobby 預設不排除 `node_modules`），而 Sidebar 以外的地方都不收。

內建規則**不能被 `!` 解除**（Q5 = A，已定案）：`.notecraft`、`.git` 被當成筆記資料夾只會出事。實作上內建規則加在使用者規則**之後**（§4.2），`ignore` 的「後寫的勝」讓 `!node_modules/` 之類的規則覆蓋不到。使用者寫了這類規則時 warn 一次：「`!dist/` 不會生效：`dist/` 是內建排除」。

---

## 4. 比對模組

### 4.1 一份 `.mjs`，三種執行環境共用

使用者分布在三種環境：Astro／Vite（`.ts`）、dev-api（`handlers.mjs`，astro dev 與 CLI 共用）、CLI（`bin/notecraftapp.mjs`，純 Node）。比照 `src/lib/no-local-path-integration.mjs` 的做法，核心寫成 **`src/lib/notes-ignore.mjs` + `notes-ignore.d.ts`**：

```ts
// notes-ignore.d.ts
export interface NotesIgnore {
  /** relPath：相對 notesDir、以 / 分隔；資料夾要帶結尾 /。 */
  ignores(relPath: string): boolean;
  /** 規則數（不含內建、不含註解），給 build log。 */
  readonly ruleCount: number;
  /** 實際讀到的檔案路徑；沒有檔為 null。給訊息與 watcher 用。 */
  readonly source: string | null;
}

/** 純函式：從規則字串建立比對器。無 I/O，scripts/checks 直接斷言。 */
export function createNotesIgnore(patterns: readonly string[]): NotesIgnore;

/** 讀 <notecraftDir>/ignore.json。格式錯誤 throw（訊息含檔案路徑與哪一個元素）。 */
export function loadNotesIgnore(notecraftDir: string): NotesIgnore;

/** 共用的走訪：已排除的資料夾不進入（剪枝），回傳相對路徑。 */
export function walkNotes(notesDir: string, ig: NotesIgnore, opts?: { onFile?(rel: string, abs: string, stat: import("node:fs").Stats): void }): void;
```

`notecraftDir` 的解析目前在 `astro.config.mjs` 與 `src/lib/plugins.ts` 各寫一份（已有註解要求兩者一致），這次順手抽成 `resolveNotecraftDir()` 放進同一個 `.mjs`，CLI 也改用它，第三份不要再手抄。

### 4.2 比對引擎（Q1 = A，已定案）

`.gitignore` 的語意細節不少：無 `/` 時比對 basename、結尾 `/` 只比資料夾、`!` 後者勝、跳脫字元、資料夾排除後不能救回子項。

- **採用：新增依賴 [`ignore`](https://www.npmjs.com/package/ignore)**（node-ignore），放 `dependencies`（viewer 安裝後要能跑）。零依賴、ESLint／Prettier 都用它、照 git 的測試案例實作。它是 **app 的 runtime 依賴**，不是生成元件或 plugin 的 import，**不受元件白名單限制**
- `createNotesIgnore()` 只做三件事交給 `ignore`：過濾註解與空白、在使用者規則**之後**補上內建排除（§3.4，讓 `!` 解除不了，見 Q5）、把資料夾路徑補結尾 `/` 再呼叫 `ig.ignores()`
- 未採用：以既有的 `picomatch` 自寫轉換層 —— basename 比對、資料夾語意、`!` 的順序都要自己處理，`scripts/checks` 要多寫一倍的案例

### 4.3 快取

模組層快取一份 `NotesIgnore`（與 `workbench.ts`、`plugins.ts` 相同的 build 期快取模式）。dev 期間 `ignore.json` 變動走 §5.4 的重啟，不做熱替換，快取就不需要失效邏輯。

---

## 5. 各接點的改法

### 5.1 Content Collection（筆記）

**不能**只把規則塞進 `glob()` 的 `pattern` 陣列：

- tinyglobby 的負向 pattern（`!drafts/**`）在初次載入時有效，但 Astro glob loader 的 **dev watcher** 用 `picomatch.isMatch(entry, pattern陣列)` 判斷變動檔案——陣列是「任一命中就算」，`!drafts/**` 會讓**所有** drafts 以外的檔都命中，`drafts/` 裡的檔則落回 `**/*.md` 命中。結果是：排除的筆記一被存檔，就在 dev 裡冒出來
- 也無法表達「資料夾排除後不能救回子項」

改為包一層 loader，攔下 `store.set`：

```ts
// src/content/config.ts
const ig = loadNotesIgnore(resolveNotecraftDir());
const notes = defineCollection({
  loader: ignoringLoader(glob({ pattern: "**/*.{md,mdx}", base: notesBase }), ig),
  schema: …,
});
```

`ignoringLoader` 把 `context.store` 換成一個 proxy：`set({ filePath })` 時若 `ig.ignores(filePath 相對 notesDir)` 就丟掉（並把既有同 id 的 entry 刪掉）。初次載入與 dev watcher 都走 `syncData → store.set`，一處攔截兩者都涵蓋。

> tinyglobby 仍會**列出**被排除的檔（只是不 parse）。大型被排除子樹（例如 10 萬個檔的 vendor 資料夾）的走訪成本仍在。若實測有感，再改成自寫 loader 用 `walkNotes()` 剪枝；第一版不做。

### 5.2 Plugin 資料檔（`src/lib/plugins.ts`）

`walk()` 換成 `walkNotes()`。順序是 **ignore 先、`plugins.json` 規則後**：被排除的 JSON 對 plugin 來說等同不存在，`files` 與 `exclude` 都不會看到它。

- 規則若因此一個檔都沒命中，沿用既有「規則命中 0 檔」的 warn，訊息加一句「（另有 N 個檔被 ignore.json 排除）」，免得作者找不到原因
- 不另做「ignore 與 plugins.json 衝突」的錯誤：ignore 本來就是更上層的開關

### 5.3 dev-only API（`src/dev-api/handlers.mjs`）

| 函式 | 改法 |
| :-- | :-- |
| `listMdx()` | 改用 `walkNotes()`。標籤統計、改名、刪除**不會碰到被排除的檔**——它們不是筆記，也不在 UI 上 |
| `handleFolderList()` | 被排除的資料夾不列入新增筆記的下拉 |
| `findNoteFile()` | slug 對到被排除的檔 → 當作不存在（404）。避免從舊頁籤或書籤對被排除的筆記改標籤、刪除 |
| `handleNotesAsset()` | 被排除的檔回 404（理由見 §6） |
| `POST /api/notes` | 目標路徑會被排除 → **400**，訊息「這個位置被 .notecraft/ignore.json 排除，建立後不會出現在 NoteCraft」。`npm run new-note`（`scripts/new-note.mjs`）是**獨立實作**、不經 handlers（初稿寫「共用同一段邏輯」有誤，2026-10-04 更正），另外加同一個檢查、共用同一句訊息（`IGNORED_LOCATION_MESSAGE`） |

handler 每次請求都重讀 `ignore.json` 很便宜，但與 Content Layer 的快照會不一致；統一取 §4.3 的模組快取，靠 §5.4 的重啟換新。

### 5.4 讓變更生效

| 情境 | 機制 |
| :-- | :-- |
| `astro dev`／`notecraftapp view` | 新增小 integration `notes-ignore-integration.mjs`：`astro:server:setup` 時 `server.watcher.add(ignore.json)`，`add`／`change`／`unlink` 時 `server.restart()` 並印「ignore.json 已變更，重新啟動」。Content Layer 會整個重載 |
| `notecraftapp serve` 的 chokidar watcher | `isWatchedFile` 已涵蓋 `.notecraft/*.json`，ignore.json 變動 → rebuild；**同時**重新 `loadNotesIgnore()`，之後被排除檔的變動不觸發 rebuild（在 `ignored` callback 裡用新的比對器） |
| `notecraftapp view`／`build` 的快取 | `shouldRebuild` Pass 2 已比對 `.notecraft/*.json` 的 mtime，ignore.json 改了自然失效。Pass 1／1.5 與 `countMdx`／`countPluginInputs` 改用 `walkNotes()`：被排除的檔改了**不再**觸發 rebuild，檔案數也不計入（`writeMeta` 寫入的 `fileCount` 同步改算法；舊快取的數字會對不上而重建一次，可接受） |

### 5.5 間接引用

- **筆記間連結**（`remark-notecraft-notes-assets.ts`）：連到被排除的 `.md(x)` 時仍改寫成 `/notes/<slug>`（不改寫的話連結會指向一個不存在的相對 `.mdx` 檔，一樣壞），build 印 warn：「`a.mdx` 連到被排除的 `drafts/b.mdx`，該連結會 404」
- **圖片**：指向被排除檔 → 不改寫、不複製，build warn（§6）
- **系列**（`series.ts`）：章節是被排除的筆記 → 沿用既有「找不到對應筆記，已跳過」，訊息改為「已被 ignore.json 排除，已跳過」。`view:` 章節同理
- **`<PluginView src>`**：指向被排除的資料檔 → 沿用既有「資料檔沒被 plugin 認領」的 build fail，訊息補上排除原因

### 5.6 AI subagent

`note-scanner` 由 subagent 自己 Glob，不經過上面的程式。在 `.claude/agents/note-scanner.md` 與 `skill-template/.claude/agents/note-scanner.md` 加一段：「若 `.notecraft/ignore.json` 存在，先讀它，命中的檔不列入掃描結果」，並附 §3.3 的語意摘要。不提供 CLI 讓 subagent 呼叫（多一個介面要維護），subagent 用 Glob＋自行判斷已足夠，誤判的代價只是多列一個標記。

---

## 6. 隱私保證

作者會拿 ignore 藏私人筆記，所以「被排除 = 不出現在任何產物」要是一個**保證**，不是盡力而為：

1. 被排除的 `.md(x)` 不進 Content Layer → 沒有頁面、不在 `/wb-index.json`、不在 pagefind 索引、不在 Dashboard 統計
2. 被排除的資料檔不被 plugin 認領 → 沒有 `/view/…` 頁、資料不 inline 進 island props
3. 被排除的圖片／附件不被 `notes-assets-integration` 複製、dev 不送（`handleNotesAsset` 404）—— **即使有一篇沒被排除的筆記引用它**。被引用時 build warn，作者可自行決定要不要調規則
4. build 完由現有的 `no-local-path-integration.mjs` 同一趟掃描**順便**斷言：產物中沒有任何 `notes-assets/<被排除路徑>` 檔案、`/wb-index.json` 沒有被排除筆記的 path。違反直接 throw（防的是日後新增的接點忘了套 ignore）

不保證的事（寫進使用說明）：

- 被排除的檔**仍在硬碟上**、仍會被 git commit；ignore 不是存取控制
- 若部署方式是把整個 repo 丟上去（而不是只部署 `dist/`），檔案照樣公開

---

## 7. 訊息與錯誤

| 狀況 | 行為 |
| :-- | :-- |
| `ignore.json` 不存在 | 靜默，只套內建排除 |
| JSON 壞掉、頂層不是物件、`ignore` 不是字串陣列 | **build fail**（Q4 = A，已定案），訊息含檔案路徑與第幾個元素。dev（`astro dev`／`view`）同樣由 `loadNotesIgnore()` throw，畫面出現 Astro 錯誤頁；修好存檔後 §5.4 的重啟會恢復。`serve` 的背景 rebuild 失敗則沿用既有 fallback 錯誤頁 |
| 未知頂層鍵 | warn |
| 規則語法無效（例如未閉合的 `[`） | build fail，指出是哪一條 |
| 某條規則一個檔都沒命中 | **不** warn（`.gitignore` 也不會；常見寫法是預先列好） |
| 每次 build／dev 啟動 | 有規則時印一行：`[ignore] .notecraft/ignore.json：7 條規則，排除 23 個檔案（另有內建排除）` |
| `!` 規則因父資料夾已被排除而無效 | warn 一次：「`!archive/keep-this.mdx` 不會生效：`archive/` 整個資料夾已被排除，請改寫成 `archive/*`」。偵測方式：走訪時記下被剪枝的資料夾，比對有沒有 `!` 規則的前綴落在其中 |

`[ignore]` 訊息只印相對路徑與 `.notecraft/ignore.json`，不印本機絕對路徑（與既有慣例一致；build log 不在產物內，但保持習慣）。

---

## 8. UI

第一版**不做 UI**（Q7 = A，已定案）。build log 一行摘要已足夠讓作者確認規則有生效。

若之後要做，最自然的位置是「設定與關於」頁加一個唯讀的「排除的檔案」區塊（規則清單＋排除檔數），資料在 build 期就能算好，不需要新的 API。但要注意：列出規則或被排除的路徑會讓它們進入部署站 HTML，私人檔名本身可能就是敏感資訊 —— 屆時應只在 dev 顯示（`import.meta.env.DEV`），或只顯示數字。

---

## 9. 驗證

### 9.1 純函式斷言：`scripts/checks/notes-ignore.mjs`

`createNotesIgnore()` 無 I/O，直接載入 `.mjs` 斷言（納入 `npm run check-plugins` 串接的 `scripts/checks/*`，另加 `npm run check:ignore` 秒級跑單支）。至少涵蓋：

| 規則 | 命中 | 不命中 |
| :-- | :-- | :-- |
| `CHANGELOG.md` | `CHANGELOG.md`、`a/b/CHANGELOG.md` | `CHANGELOG.mdx` |
| `/README.md` | `README.md` | `docs/README.md` |
| `drafts/` | `drafts/`、`x/drafts/`（資料夾） | 檔案 `drafts` |
| `**/*.private.md` | `a.private.md`、`a/b/c.private.md` | `a.private.mdx` |
| `fixtures/**/*.json` | `fixtures/a.json`、`fixtures/x/y.json` | `other/fixtures/a.json` |
| `archive/*` + `!archive/keep.mdx` | `archive/a.md` | `archive/keep.mdx` |
| `archive/` + `!archive/keep.mdx` | 走訪時 `archive/` 被剪枝，`keep.mdx` **不會**被看到 | — |
| `# 註解`、`""`、`"  "` | 不產生規則 | — |
| （內建）`!node_modules/` | 仍排除 `node_modules/` | — |
| Windows 路徑 | 呼叫端傳入前已轉 `/`；傳入含 `\` 的路徑 → throw（抓呼叫端漏轉） | — |

### 9.2 整合

- 範例筆記資料夾 `scripts/fixtures/ignore-sample/`（**不放 `scripts/checks/`**），含 `ignore.json`、被排除的 md、被排除的 JSON（會命中某條 plugin 規則）、被排除但被引用的圖片。實際 build 一次，斷言：沒有對應頁面、`wb-index.json` 不含、`dist/notes-assets` 不含、build log 有 §7 的 warn
- `npx tsc --noEmit`（不新增錯誤）＋ `npx astro build`

### 9.3 手動驗收

1. `notecraftapp view ./docs`，在 `.notecraft/ignore.json` 加 `drafts/` → dev server 自動重啟、Sidebar 的 `drafts` 資料夾消失、`/notes/drafts/x` 404
2. 存檔一篇被排除的筆記 → dev 裡**不會**冒出來（§5.1 的 watcher 陷阱）
3. 移掉規則 → 重啟後回來
4. `notecraftapp serve` 期間改 ignore.json → 背景 rebuild；之後改被排除的檔 → 不 rebuild
5. 新增筆記下拉沒有被排除的資料夾；手動 `POST /api/notes` 到被排除路徑 → 400
6. 舊頁籤指向已被排除的筆記 → 頁籤在 idle 覆寫時被清掉（既有機制：`/wb-index.json` 沒有的就移除）

---

## 10. 文件與發佈

- `README.md`：新增「排除檔案」一節（§3 的格式、§3.3 語意表、§3.3 的 `archive/*` 陷阱、§6 的「不是存取控制」）
- `CLAUDE.md`：`.notecraft/` 結構加 `ignore.json`；「幾條不會變的規則」加「所有走訪 notesDir 的地方一律經 `walkNotes()`」
- JSON Schema：`schemas/ignore.schema.json`，加進 `package.json` 的 `files`，讓 §3.2 的 `$schema` 網址在 jsDelivr 上有效
- `CHANGELOG.md`：`## [1.10.0]`，`新增`：ignore.json；`修正`：Content Collection 收進 `node_modules` 內 md 的問題（§3.4）
- `skill-template/` 的 note-scanner 同步（§5.6）

---

## 11. 實作切分（決策已定，可拆 Task）

1. **地基**：`notes-ignore.mjs`／`.d.ts`（`createNotesIgnore`、`loadNotesIgnore`、`walkNotes`、`resolveNotecraftDir`）＋ `scripts/checks/notes-ignore.mjs` ＋ JSON Schema
2. **build 期接點**：Content Collection（`ignoringLoader`）、`plugins.ts`、`series.ts` 訊息、remark 連結／圖片 warn、`notes-assets-integration`、產物斷言（§6.4）
3. **dev 接點**：`handlers.mjs` 五處、`notes-ignore-integration`（重啟）
4. **CLI**：`shouldRebuild`／`countMdx`／`countPluginInputs`／watcher、`resolveNotecraftDir` 換用
5. **文件與發佈**：README、CLAUDE.md、note-scanner（兩份）、CHANGELOG、版號

---

## 12. 決策紀錄

以下 7 題已於 2026-10-04 逐題確認，全部採建議選項。

| # | 問題 | 選項 | 建議 |
| :-- | :-- | :-- | :-- |
| Q1 | 比對引擎 | A. 新增 `ignore` 套件　B. 以既有 `picomatch` 自寫 `.gitignore` 子集 | ✅ **已定：A**（2026-10-04）—— 語意與 git 一致、少一堆自己維護的邊界案例；runtime 依賴、不涉及元件白名單 |
| Q2 | 檔案形狀 | A. `{ "ignore": [...] }`　B. 裸陣列 `[...]` | ✅ **已定：A**（2026-10-04）—— 可放 `$schema`、日後可擴充 |
| Q3 | 範圍 | A. 所有檔案（筆記、plugin 資料檔、圖片附件）　B. 只有 `.md`／`.mdx` | ✅ **已定：A**（2026-10-04）—— 「NoteCraft 不讀」才名副其實，也才撐得起 §6 的隱私保證 |
| Q4 | `ignore.json` 格式錯誤 | A. build fail　B. warn 並當作沒有規則 | ✅ **已定：A**（2026-10-04）—— 靜默失效會讓私人筆記上站；與 plugin「失敗一律 build fail」一致 |
| Q5 | 內建排除（`.` 開頭、`node_modules`、`dist`）能否用 `!` 解除 | A. 不行　B. 可以 | ✅ **已定：A**（2026-10-04）—— `.notecraft`、`.git` 被當成筆記資料夾只會出事；真有需要再開 |
| Q6 | 去哪裡找 `ignore.json` | A. 與 `plugins.json` 同一處（單一 `notecraftDir`）　B. 與 `series.json` 一樣 `notesDir`、`userCwd` 兩處都找並合併 | ✅ **已定：A**（2026-10-04）—— 規則基準與 plugin 規則一致；兩處合併的優先序難以說明 |
| Q7 | UI | A. 不做，只有 build log　B. 「設定與關於」加唯讀區塊 | ✅ **已定：A**（2026-10-04）—— 第一版範圍最小；日後若做，規則與路徑只在 dev 顯示（§8） |

---

## 13. 實作後回填（2026-10-04，notecraftapp v1.10.0，Task 117–120）

### 13.1 與本文不同之處

| 項目 | 本文原寫 | 實際 | 原因 |
| :-- | :-- | :-- | :-- |
| 型別檔 | `notes-ignore.d.ts` | `notes-ignore.d.mts` | `.ts` 以 `./notes-ignore.mjs` import 時 TypeScript 找 `.d.mts` |
| build 期單例 | `notes-ignore-state.ts`、模組層快取 | `notes-ignore-state.mjs`、掛 `globalThis` | dev-api 與 integration 是 `.mjs` 也要用；astro.config 與 Vite SSR 各有一份模組實例，掛模組層會讀兩次、印兩次 |
| 語法錯誤（§7） | 交給 `ignore` 套件 throw | 自己擋未閉合的 `[` | `ignore` 對無效寫法靜默當成不命中、從不 throw；不擋就違反 Q4 |
| Content Collection（§5.1） | 只攔 `store.set` | 三層：字面負向 pattern＋包 `context.watcher`＋`store.set` 兜底 | 只攔 `store.set` 時被排除的檔仍被讀、parse frontmatter（壞 YAML 讓整個 build 失敗），dev watcher 還會把 notesDir 的 `.json` 當筆記同步 |
| §1 盤點 | 9 處 | 10 處 | `handlers.mjs` 另有一份 `resolveNotecraftDir()`，已改為委派 |
| `npm run new-note`（§5.3） | 與 handlers 共用邏輯 | 獨立實作，另加同一個檢查 | `scripts/new-note.mjs` 只 import `node:*` |
| 訊息中的檔名（§7） | 相對路徑 | 一律 `.notecraft/ignore.json`；被遮蔽的那份以 `.notecraft/` 所在資料夾為基準 | viewer 的 cwd 是 app 根，相對 cwd 會變成 `../../…` |
| 刪筆記的孤兒判斷 | 未提 | 連被排除的筆記一起看 | 被排除的筆記仍在硬碟上，它引用的元件被刪會讓日後取消排除時壞掉 |
| `serve` 的父行程 | 未提 | 啟動時設 `NOTECRAFT_NOTES_DIR`／`NOTECRAFT_USER_CWD` | 父行程送 `/notes-assets/*` 時 handlers 收到的 cwd 是 packageRoot，不設會讀到錯的 `.notecraft/` |
| `serve` 的 watcher | 被排除的資料夾不 watch | 同左，但**啟動時**被排除、之後取消排除的資料夾要重開 `serve` 才會被 watch | chokidar 的 `ignored` 只在遇到路徑時判斷一次 |

### 13.2 驗證

- `npm run check:ignore`：18 組（語意、內建排除、剪枝、`!` 救不回、JSON 形狀、路徑解析、遮蔽）
- `node scripts/fixtures/ignore-sample.mjs`：以範例資料夾實際 build，8 項（無頁面、`archive/*`＋`!` 救回、`wb-index.json`、附件、build log、無絕對路徑、壞檔 build fail）；暫時讓 loader 不過濾時，產物護欄列出 5 個外洩 path 並 throw
- `node scripts/fixtures/ignore-dev.mjs`：astro dev 的 dev API、notes-assets、存檔不冒出、改／刪 `ignore.json` 重啟；`notecraftapp build` 的快取；`notecraftapp serve` 的 watcher
- 主專案 build 49 頁不變；tsc 錯誤 51 → 40（新檔 0 個）；`check-plugins` 通過

### 13.3 已知限制

- 同一個 app 根底下有另一個 astro 行程同時在跑（例如作者在 repo 開著 `npm run dev`，又跑 `ignore-dev.mjs`）時，兩者共用 `.astro/data-store.json`，新起的 dev server 可能讀到另一個專案的筆記，直到下一次重新同步（既有行為，與 ignore 無關；依序切換筆記資料夾時 Astro 會偵測設定變更而清空 store，不受影響）。`ignore-dev.mjs` 遇到時會觸碰 `ignore.json` 強制重新同步
- 取消排除一個會被 plugin 規則命中、但不符 schema 的資料檔，build 會照「失敗一律 build fail」失敗——這是預期，但作者可能以為是 ignore 的問題
