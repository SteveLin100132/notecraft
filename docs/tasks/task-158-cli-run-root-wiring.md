# Task 158 — CLI 改用執行目錄：view／build／serve、astro.config、護欄、快取指紋

> 規格 [notecraft-multi-instance.md](../notecraft-multi-instance.md) §5.4–§5.6、§6、§7、§8；Q3、Q4、Q5、Q7 定案（§11）。
> 依賴 [Task 157](task-157-run-root-module.md)（`ensureRunRoot`、`acquireLock`）。

## 為什麼

Task 157 備好了執行目錄與鎖，這一步讓三個子命令真的在各自的執行目錄裡跑 astro，並補上換了 cwd 之後會出現的兩個缺口：Vite 的 `fs.allow`（連結的真實路徑）與「產物不可含本機絕對路徑」的護欄（不再涵蓋 app 本體）。

## 範圍

### 1. `bin/notecraftapp.mjs`

- 新增 `usesRunRoot()`：packageRoot 有 `.git` → `false`（主 repo，Q5）；其餘（含 `NOTECRAFTAPP_DEV=1`）→ `true`。注意現有的 `isDevSource()` 把兩者合在一起，不能直接拿來用
- 新增 `prepareRoot(notesDir, command, url)`：
  - `usesRunRoot()` 為 false → 印一行「主 repo 模式：不支援多個筆記資料夾同時執行」，回傳 `packageRoot`，不加鎖
  - 否則 `ensureRunRoot({ appRoot: packageRoot, cacheDir: cacheDirFor(notesDir), appVersion: pkgJson.version, devPackage: process.env.NOTECRAFTAPP_DEV === "1" })` → `acquireLock` → 拿不到就印 `formatLockMessage` 並 `process.exit(1)`（Q3、Q4）→ `process.on("exit", release)`
- `view`（L734–737）：`cwd: runRoot`；env 多 `NOTECRAFT_RUN_ROOT: "1"`（只在 `usesRunRoot()` 時）；`astroBin` 可沿用 packageRoot 的
- `build`／`serve`：`ensureBuild`、`atomicRebuild`、`startBackgroundRebuild` 的 `cwd` 參數改傳 `runRoot`（L758、L804、L820）；`runAstroBuild` 的 env 同樣加 `NOTECRAFT_RUN_ROOT`
- `startStaticServer(packageRoot, …)`（L810）不變（§5.5）
- `buildStageDir`（L573）：`usesRunRoot()` 時改成 `<runRoot>/.nc-state/build/`；主 repo 維持 `node_modules/.notecraft-build/<hash>/`。`runAstroBuild` 的「outDir 必須在 cwd 底下」斷言不動
- L572 的註解改寫：說明並行靠的是每個工作區的執行目錄，不是 staging 目錄的命名
- `buildFingerprint()`：加入 `runRootLayout: RUN_ROOT_LAYOUT`（Q7）；`shouldRebuild` 的「指紋不同」訊息要能顯示這一項的變化

### 2. `astro.config.mjs`

只在 `process.env.NOTECRAFT_RUN_ROOT === "1"` 時（§5.4）：

- `cacheDir: "./.nc-state/astro"`
- `vite.cacheDir: "./.nc-state/vite"`
- `vite.server.fs.allow` 另加 `fs.realpathSync(path.resolve("node_modules"))`

沒有這個變數時，設定物件必須與現在**完全相同**（主 repo `npm run dev`、`check-plugins` 都不受影響）。

### 3. 護欄（§5.6）

- `src/lib/no-local-path-integration.mjs`：`roots` 加入 app 本體路徑 = `path.dirname(fs.realpathSync(path.resolve("node_modules")))`；與 `process.cwd()` 相同時不重複
- `src/lib/workbench.ts` 的 `assertNoAbsolutePath`：同樣加入 app 本體路徑。`.ts` 端不碰 `node:*`，路徑由既有的 `.mjs` 單例（`defs-state.mjs` 或 `notes-ignore-state.mjs`）提供一個 getter，實作時擇一並在本檔回填
- `src/lib/content-layer-guard-integration.mjs` 的說明與錯誤訊息：「app 根」改成「astro 的 cwd（執行目錄或主 repo）」

## 不做

- 整合 fixture（Task 159）；文件（Task 160）

## 驗收

- [ ] 以 `npm pack` 的套件加 `NOTECRAFTAPP_DEV=1` 手動重現設計文件 §1 的四個情境，全部顯示正確內容（Task 159 會自動化）
- [ ] 同一個筆記資料夾開第二個 `view`：非 0 結束、訊息含第一個的網址；第一個關掉後可以再開；`kill -9` 第一個之後也可以再開（過期鎖）
- [ ] `view` 開著時跑 `build`：非 0 結束、訊息說明正在執行
- [ ] 瀏覽器開 `view` 的筆記頁：console 沒有 403（dev toolbar 的 entrypoint 正常載入）
- [ ] 主 repo 的 `npm run dev` 與 `notecraftapp view`：行為與改動前相同，`node_modules/.astro`、`node_modules/.vite` 照舊使用
- [ ] 刻意讓產物含 `~/.notecraft/app-<v>/` 的路徑（暫時改一個欄位）：build 失敗並指出該路徑；改回後通過
- [ ] `npm run check-plugins` 通過；`npx tsc --noEmit && npx astro build` 通過，tsc 錯誤數不增加
