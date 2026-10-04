# Task 118 — build 期接點：Content Collection、plugin 資料檔、間接引用、產物斷言

> 規格 [notecraft-ignore-config.md](../notecraft-ignore-config.md) §3.4、§5.1、§5.2、§5.5、§6、§7；Q3、Q4、Q5、Q6 定案（§12）。
> 前置：Task 117。

## 為什麼要有這一步

build 產物是作者實際部署出去的東西。「被排除 = 不出現在任何產物」（規格 §6）要在這一步成立：筆記、plugin 資料檔、圖片附件三條路都要擋（Q3），並以 build 後的斷言兜底，防日後新增的接點忘了套 ignore。

## 範圍

### 1. `notecraftDir` 收斂到一份

- `astro.config.mjs`、`src/lib/plugins.ts` 改用 `resolveNotecraftDir(process.env, process.cwd())`／`resolveNotesDir(...)`；拿掉兩處手抄的優先序與「兩者必須一致」的註解（改成指向 `notes-ignore.mjs`）
- `src/content/config.ts`、`src/lib/series.ts` 的 notesDir 推導同樣改用 `resolveNotesDir`

### 2. `src/lib/notes-ignore-state.ts`（新增，build 期單例）

- 模組層快取一份 `loadNotesIgnore(resolveNotecraftDir(...))`，給 Content config、`plugins.ts`、`series.ts`、remark plugin 共用（與 `workbench.ts`／`plugins.ts` 相同的 build 期快取模式）
- 首次載入時印**一次**規格 §7 的訊息，全部只用相對路徑與 `.notecraft/ignore.json` 字樣：
  - 有規則：`[ignore] .notecraft/ignore.json：7 條規則，排除 23 個檔案（另有內建排除）`（檔數於 §3 走訪完成後補印，見下）
  - 未知頂層鍵、`builtinNegations`、`findShadowedIgnoreFiles` 各 warn 一次（Q2、Q5、Q6）
- 格式錯誤 → 直接 throw，不 catch（Q4 = build fail）

### 3. Content Collection（`src/content/config.ts`）

- 新增 `src/lib/ignoring-loader.ts`：`ignoringLoader(inner: Loader, ig): Loader`
  - `load(ctx)` 時把 `ctx.store` 換成 proxy：`set(entry)` 若 `ig.ignores(entry.filePath 相對 notesDir)` → 不寫入，且 `store.delete(entry.id)`（dev 下規則外的檔被排除後，既有 entry 要消失）；其他方法原樣轉發
  - 被丟掉的 `filePath` 累計到一個 Set，給 §2 的「排除 N 個檔案」與 §5 的連結 warn
- `glob()` 的 `pattern` **維持字串** `"**/*.{md,mdx}"`，不放負向 pattern（規格 §5.1：Astro glob loader 的 dev watcher 以 `picomatch.isMatch(entry, 陣列)` 判斷，負向 pattern 會失效）
- `filePath` 是相對 Astro root 的路徑：先轉絕對、再相對 notesDir、`\` 轉 `/`；落在 notesDir 外的視為不排除（不應發生）
- 順帶修掉的既有問題：`notesDir/node_modules/**/*.md` 不再成為筆記（內建排除，規格 §3.4）

### 4. Plugin 資料檔（`src/lib/plugins.ts`）

- `walk()` 與 `SKIP_DIRS` 換成 `walkNotes(notesDir, ig, …)`；`ScannedFile` 的 `mtimeMs` 照舊在 callback 裡 `statSync`
- 順序：**ignore 先、`plugins.json` 的 `files`／`exclude` 後**；被排除的 JSON 對 plugin 規則等同不存在
- 既有「規則命中 0 檔」的 warn：若同一組 glob 對 `ignoredFiles` 有命中，訊息補「（另有 N 個檔被 .notecraft/ignore.json 排除）」
- `<PluginView src>` 指向被排除的資料檔：沿用既有「資料檔沒被 plugin 認領」的 build fail，訊息補一句排除原因

### 5. 間接引用

| 檔案 | 改法 |
| --- | --- |
| `src/lib/remark-notecraft-notes-assets.ts` | 筆記連結 `[x](./b.mdx)` 目標被排除 → **照樣改寫**成 `/notes/<slug>`，build warn「`a.mdx` 連到被排除的 `drafts/b.mdx`，該連結會 404」。圖片目標被排除 → **不改寫**，warn「`a.mdx` 引用被排除的 `private/x.png`，不會出現在產物」。同一組（來源，目標）只 warn 一次 |
| `src/lib/series.ts` | 章節對到被排除的筆記或 `view:` 資料檔 → 沿用「已跳過」，訊息改為「已被 .notecraft/ignore.json 排除，已跳過」（以 ig 判斷，不是只看找不到） |
| `src/dev-api/handlers.mjs` 的 `copyNotesAssetsAfterBuild` | 從產物收集到的 `/notes-assets/<rel>`，`rel` 被排除 → 不複製、warn（理論上 remark 已不改寫，這裡是第二道） |

### 6. 產物斷言（規格 §6 第 4 點）

- 新增 `src/lib/ignore-guard-integration.mjs`（`astro:build:done`），排在 `notesAssets` **之後**、與 `noLocalPath` 並列；不併進 `no-local-path-integration.mjs`（職責不同，失敗訊息也要各自清楚）
- 斷言兩件事，違反直接 throw：
  1. `<outDir>/notes-assets/` 底下沒有任何被排除的路徑
  2. `<outDir>/wb-index.json` 的筆記與資料檔 `path` 沒有任何一條被排除
- 主專案模式（無 `NOTECRAFT_NOTES_DIR`）也要跑：主專案的 `src/content/notes/` 同樣可以放 `ignore.json`

### 7. 整合範例 `scripts/fixtures/ignore-sample/`（新增，**不放 `scripts/checks/`**）

```
ignore-sample/
├── .notecraft/ignore.json        drafts/、**/*.private.md、fixtures/**/*.json、private/、archive/*、!archive/keep.mdx、!dist/
├── .notecraft/plugins.json       一條會命中 fixtures/x.json 的規則（應因排除而 0 檔）
├── a.mdx                         連到 ./drafts/b.mdx、引用 ./private/x.png
├── drafts/b.mdx
├── c.private.md
├── archive/old.md、archive/keep.mdx
├── node_modules/pkg/README.md    內建排除的回歸案例
├── fixtures/x.json
└── private/x.png
```

用 `NOTECRAFT_NOTES_DIR` 指向它 build 一次，人工核對規格 §9.2 的清單（驗收表）。

## 要改的既有檔案

`astro.config.mjs`、`src/content/config.ts`、`src/lib/plugins.ts`、`src/lib/series.ts`、`src/lib/remark-notecraft-notes-assets.ts`、`src/dev-api/handlers.mjs`（只動 `copyNotesAssetsAfterBuild`）。新增 `src/lib/notes-ignore-state.ts`、`src/lib/ignoring-loader.ts`、`src/lib/ignore-guard-integration.mjs`、`scripts/fixtures/ignore-sample/`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 無設定 | repo 本身（沒有 `ignore.json`） | `npx astro build` | 頁數與 main 相同；log 沒有 `[ignore]` 字樣 |
| 筆記 | `ignore-sample` | build | 沒有 `/notes/drafts/b`、`/notes/c.private`、`/notes/archive/old`、`node_modules` 內的頁；有 `/notes/archive/keep` |
| 索引 | 同上 | 讀 `dist/wb-index.json`、`dist/pagefind/` | 不含被排除的 path；搜尋 `b.mdx` 的獨特字串零結果 |
| plugin | 同上 | build | 沒有 `/view/fixtures/x`；log 有「另有 1 個檔被 .notecraft/ignore.json 排除」 |
| 圖片 | 同上 | build | `dist/notes-assets/private/` 不存在；log 有 `a.mdx` 引用 `private/x.png` 的 warn |
| 連結 | 同上 | build | `a.mdx` 的連結是 `/notes/drafts/b`；log 有 404 warn |
| warn | 同上 | build | log 有 `!dist/` 不會生效（內建）一行；有 `[ignore] … 條規則，排除 … 個檔案` 一行；全部沒有本機絕對路徑 |
| 格式錯誤 | `ignore.json` 改成 `[]` | build | 失敗，訊息含 `.notecraft/ignore.json` 與「頂層必須是物件」 |
| 遮蔽 | `NOTECRAFT_USER_CWD` 指向另一個有 `ignore.json` 的資料夾 | build | 只套 userCwd 那份；warn notesDir 那份不會生效 |
| 兜底 | 暫時讓 `ignoringLoader` 不過濾 | build | `ignore-guard-integration` throw 並指出是哪個 path；改回後綠 |
| 全套 | — | `npx tsc --noEmit && npx astro build && npm run check-plugins` | 通過；tsc 錯誤數不增加 |

## 依賴

Task 117。
