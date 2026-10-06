# Task 121 — 官方 store 不再隨 npm 發佈、同 id 撞名以使用者安裝為準

> 規格 [notecraft-workbench-plugin-empty-states.md](../notecraft-workbench-plugin-empty-states.md) §2；Q4 定案（§14）。
> 無前置依賴，**本批第一個做**：不先做這步，npx viewer 永遠看不到「0 個外掛」，Task 123 的空狀態做了也驗不到。

## 為什麼要有這一步

`package.json` 的 `files` 含 `"plugins/"`，而 `plugins.ts`／`PluginHost.tsx` 會 glob app 根目錄的 `/plugins/*/renderer.tsx`（Q17，原意只給主 repo 用）。CLI 執行時 app 根目錄是 `node_modules/notecraftapp/`，於是每個 viewer 工作區都「內建」了 `er-diagram-renderer` 與 `openapi-renderer`：

- `/plugins` 顯示「已安裝 2、啟用中 2」，即使 `.notecraft/plugins/` 不存在（原始回報：`sme-ai-talent-2026-proposal`）
- 兩個 renderer 被打包進所有使用者的 client chunk
- `plugins.json` 沒安裝就能引用官方外掛，與官網文件「指到尚未安裝的 Plugin，build 會失敗」矛盾

另外同一個 id 同時在 `plugins/` 與 `.notecraft/plugins/` 時，renderer 取使用者那份（glob 後寫入者勝），manifest 與 schema 卻取 app 根目錄那份（`PLUGIN_ROOTS` 順序），兩邊版本可以不同。

## 範圍

### 1. `package.json`

- `files` 移除 `"plugins/"`
- 其餘不動（`schemas/`、`CHANGELOG.md` 等必須保留）

### 2. `src/lib/plugins.ts`

- `PLUGIN_ROOTS` 順序改為 `.notecraft/plugins` 在前、`<cwd>/plugins` 在後
- `getPlugins()` 走訪 `rendererModules` 時，同一個 id 出現兩次 → build 期 `warn` 一次：
  `plugin "<id>" 同時存在於 plugins/ 與 .notecraft/plugins/，採用 .notecraft/plugins/ 的版本`
  （訊息只用相對路徑，不得出現本機絕對路徑）
- 確認 Map 最終寫入的是 `@notes` 那份 renderer（現況已是，但要寫註解說明「順序即優先序」，避免日後調換 glob 順序時靜默改變）

### 3. `src/components/islands/PluginHost.tsx`

- glob 順序不動（`@notes` 後寫入、覆蓋前者）；補同一句「順序即優先序」註解，與 `plugins.ts` 對應

### 4. `src/components/wb/PluginDrawer.tsx`

- `source.kind === "builtin"` 的來源文案：「內建 ・ 隨 notecraftapp 發佈」→「內建 ・ 主 repo 官方 store」

### 5. `src/lib/workbench.ts`

- `buildPlugins()` 的 `builtin` 判斷以 `rec.dir` 為準，`PLUGIN_ROOTS` 換序後撞名的 plugin `dir` 會落在 `.notecraft/plugins/`，自然判成 `installed`。只需確認、不需改；若實測不符再修

### 6. 護欄 `scripts/check-plugins.mjs`

- 新增一項：`npm pack --dry-run --json`，解析 `files[].path`，有任何以 `plugins/` 開頭的 → `fail("plugins/ 不可隨 npm 發佈（Task 121）")`
- 放在 build 步驟之前（秒級、不受 `--skip-build` 影響）

## 要改的既有檔案

`package.json`、`src/lib/plugins.ts`、`src/components/islands/PluginHost.tsx`、`src/components/wb/PluginDrawer.tsx`、`scripts/check-plugins.mjs`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 打包 | — | `npm pack --dry-run` | 清單沒有 `plugins/`；仍含 `schemas/ignore.schema.json`、`CHANGELOG.md` |
| 護欄 | 暫時把 `"plugins/"` 加回 `files` | `npm run check-plugins -- --skip-build` | 失敗並指出 Task 121；改回後通過 |
| viewer 0 外掛 | `npm pack` 出的 tarball 裝進一個沒有 `.notecraft/plugins/` 的暫存工作區 | `notecraftapp view` 開 `/plugins?tab=installed` | 0 個外掛（此時畫面仍是舊的 `PluginEmptyState`，Task 123 才換） |
| 未安裝即引用 | 同上工作區，`plugins.json` 寫 `er-diagram-renderer` 規則 | `notecraftapp build` | build fail，訊息含 `npx notecraftapp install-plugin er-diagram-renderer` |
| 主 repo | — | `npx astro dev` 開 `/plugins?tab=installed` | 仍見 2 個外掛、來源「內建 ・ 主 repo 官方 store」 |
| 撞名 | 主 repo 暫時把 `plugins/openapi-renderer` 複製到 `.notecraft/plugins/`，改其 manifest `version` | `npx astro build` | build log 出現撞名 warn 一次；Drawer 版本為 `.notecraft` 那份、來源為「已安裝」；驗完刪除複本 |
| 全套 | — | `npx tsc --noEmit && npx astro build && npm run check-plugins` | 通過；tsc 錯誤數不增加 |

## 依賴

無。

## 實作記錄（2026-10-06）

- `npm pack --dry-run` 不再含 `plugins/`；把 `"plugins/"` 暫時加回 `files`，`check-plugins -- --skip-build` 失敗並指出「打包清單含 36 個檔」，改回後通過
- `check-plugins` 經 `npm_execpath` 執行 npm（`npm run` 時恆有；直接 `node scripts/check-plugins.mjs` 時退回 `npm`，Windows 加 `shell`）
- **viewer 實測要繞過 `~/.notecraft/app-<version>/`**：CLI 首次執行會把套件複製到那裡，之後一律在那裡跑；同版號的目錄已存在時，解開 tarball 後直接執行會被 re-exec 到舊的那份（本機 `app-1.10.1` 仍含 `plugins/`，第一次實測因此誤判）。改設 `NOTECRAFTAPP_DEV=1` 直接從解開的套件執行（`node_modules` symlink 到主 repo）
- 實測（tarball＋空工作區）：`/plugins` 的外掛清單為空；`PluginHost` chunk 從 213 KB 降到 4 KB（兩個官方 renderer 不再打包）；`plugins.json` 引用未安裝的 `er-diagram-renderer` → build fail，訊息含安裝指令
- 撞名：主 repo 暫時複製 `openapi-renderer` 到 `.notecraft/plugins/` 並改版號 9.9.9 → build log warn 一次；`/plugins` 的 openapi 為 9.9.9、來源 `installed`，ER 仍為 `builtin`；驗完已刪除複本
- `workbench.ts` 的 `builtin` 判斷不需修改（以 `rec.dir` 為準，換序後自然判對）
- tsc 錯誤數 40，與改動前相同（`plugins.ts` 的 5 個皆為既有）；主 repo build 63 頁
