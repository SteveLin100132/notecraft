# Task 157 — 執行目錄模組：建立／同步、鎖檔、純函式斷言

> 規格 [notecraft-multi-instance.md](../notecraft-multi-instance.md) §5.1–§5.3、§6、§10.2；Q1、Q2、Q3、Q4 定案（§11）。
> Task 158 的 CLI 接線、Task 159 的 fixture 都建立在這裡的函式上。本 Task 不改 CLI 的任何行為。

## 為什麼先做這一步

「每個工作區一份執行目錄」的正確性全看三件事：該不該重建（戳記比對）、複製哪些東西（清單）、能不能啟動（鎖檔）。先把這三件事寫成純函式並以斷言鎖住，Task 158 只負責接線；同步與鎖的邊界案例（戳記壞掉、連結目標消失、上次當掉留下的鎖）一次在這裡處理完。

## 範圍

### 1. `bin/run-root.mjs`（新檔）

模組頂層**不可有副作用**（`notecraftapp.mjs` 頂層會 re-exec，不能被 check 載入；這支要能被 `scripts/checks/` 直接 import）。只 import `node:*`。

純函式（不碰檔案系統）：

- `RUN_ROOT_LAYOUT = 1`
- `runRootDirFor(cacheDir)` → `<cacheDir>/app`（Q2）
- `runRootEntries(pkgFiles)`：輸入 `package.json` 的 `files`，輸出要複製的頂層項目（去掉 glob 的尾巴、去重）。排除 `bin/`、`README.md`、`CHANGELOG.md`、`LICENSE`；`src/components/*.astro` 這類 glob 收斂成 `src`
- `needsResync(stamp, current)`：`stamp` 是 `.nc-run.json` 讀到的值（可能是 `null` 或壞掉的物件），`current` 是 `{ layout, appVersion, appRoot, devPackage, linkOk }`；回傳 `{ resync: boolean, why: string }`。`devPackage: true` 一律重建；`linkOk: false` 一律重建
- `lockState(lock, isAlive)`：`lock` 可能是 `null` 或壞掉的物件，`isAlive(pid)` 由呼叫端注入；回傳 `"free" | "held" | "stale"`
- `formatLockMessage(lock)`：§6 的文案。`url` 有值時：`這個筆記資料夾已經在 <url> 執行中（<command>，pid <pid>）。要同時開，請先關掉它。`；`build` 沒有 url 時改說「正在 build」

有副作用的函式：

- `ensureRunRoot({ appRoot, cacheDir, appVersion, devPackage, log })`：§5.3 的流程。複製到 `app.next/` → 建 `node_modules` 連結（`process.platform === "win32"` 用 `"junction"`，其餘 `"dir"`）→ 寫 `.nc-run.json` → 刪舊 `app/` → `rename`。回傳 `runRoot` 路徑。重建時以 `log` 印一行原因（`why`）
- `acquireLock(runRoot, { command, url })`：以 `fs.openSync(…, "wx")` 建立 `.nc-state/lock.json`；已存在時讀出來交給 `lockState`，`stale` 就刪掉重試一次，`held` 就回傳 `{ ok: false, lock }`。成功時回傳 `{ ok: true, release }`，`release()` 同步刪檔且可重複呼叫
- `isPidAlive(pid)`：`process.kill(pid, 0)`，`ESRCH` 為 false、`EPERM` 為 true

### 2. `bin/run-root.d.mts`

給之後可能的 `.ts` 呼叫端與編輯器用；與 `notes-ignore.d.mts` 同一個寫法。

### 3. 斷言 `scripts/checks/run-root.mjs`

- `runRootEntries`：以**真實的** `package.json` 跑一次，必須包含 `src`、`public`、`schemas`、`astro.config.mjs`、`tailwind.config.mjs`、`tsconfig.json`，不可包含 `bin`、`README.md`、`CHANGELOG.md`
- `needsResync`：無戳記、壞 JSON 物件、layout 不同、版本不同、appRoot 不同、連結壞掉、dev 套件 → 都要 `resync: true` 且 `why` 不為空；全部相同 → `false`
- `lockState`：`null` → free；pid 活著 → held；pid 不存在 → stale；缺 `pid` 欄位的壞物件 → stale
- `formatLockMessage`：有 url、沒有 url 兩種
- 用暫存資料夾實跑一次 `ensureRunRoot`（假的 appRoot：幾個檔＋空的 `node_modules/`）：第一次建立、第二次沿用、改版本後重建、刪掉連結目標後重建；`acquireLock` 第二次拿不到、`release` 後拿得到、寫一個 pid 不存在的鎖後拿得到
- 依 CLAUDE.md，`check-plugins` 會自動執行 `scripts/checks/` 底下的每一支；另在 `package.json` 加 `"check:run-root"` 方便單跑

## 不做

- CLI 接線、`astro.config.mjs`、護欄（Task 158）
- 清除舊工作區的執行目錄（§9.3）

## 驗收

- [ ] `npm run check:run-root` 通過（Node 22.6+）
- [ ] `bin/run-root.mjs` 以 `node -e "import('./bin/run-root.mjs')"` 載入時不建立任何檔案、不印任何東西
- [ ] `npm pack --dry-run` 的清單包含 `bin/run-root.mjs`（`files` 已含 `bin/`，確認即可）
- [ ] `npx tsc --noEmit` 錯誤數不增加
