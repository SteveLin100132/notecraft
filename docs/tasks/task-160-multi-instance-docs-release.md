# Task 160 — 文件與發佈：CLAUDE.md、README、官網、CHANGELOG、1.16.0

> 規格 [notecraft-multi-instance.md](../notecraft-multi-instance.md) §8、§12；Q6 定案（§11）。
> 依賴 [Task 157](task-157-run-root-module.md)–[Task 159](task-159-multi-instance-fixture.md)。

## 範圍

### 1. CLAUDE.md

- 「`astro build --outDir` 必須在 astro 的 cwd（app 根）底下」那條：cwd 改成「執行目錄（viewer）或 app 根（主 repo）」，staging 位置改成 `<執行目錄>/.nc-state/build/`
- Workbench 段落後新增一節「多個工作區同時執行（v1.16.0）」，寫下不會變的規則：
  - viewer 的 astro 一律在 `~/.notecraft/cache/<hash>/app/` 執行，`node_modules` 是連到 `app-<version>` 的連結；主 repo（有 `.git`）不用執行目錄
  - `NOTECRAFT_RUN_ROOT=1` 時 `cacheDir`／`vite.cacheDir` 指到 `.nc-state/`、`fs.allow` 加連結的真實路徑；沒有這個變數時設定不可有任何差異
  - 新增執行期需要的頂層資料夾或設定檔時，要確認 `runRootEntries` 有收到（`check:run-root` 以真實 `package.json` 斷言）
  - 同一個筆記資料夾只能有一個行程（鎖檔 `.nc-state/lock.json`）
  - 「產物不可含本機絕對路徑」的護欄要涵蓋 app 本體路徑（cwd 不再是它）
  - 整合驗證 `node scripts/fixtures/multi-instance.mjs [--build]`
- 「待釐清項已收斂的決策」不需要改

### 2. 其他文件

- `README.md`：說明可以同時開多個筆記資料夾（不同 port）；同一個資料夾重複開會被擋下並顯示網址
- 官網文件：以 `grep -rn "\.notecraft/cache\|app-<" site/` 找出提到快取或執行位置的段落並更新
- `docs/notecraft-npx-viewer.md`、`docs/notecraft-npx-viewer-v2.md`：在提到「執行位置 `~/.notecraft/app-<v>/`」處加一句指向本設計文件
- `docs/notecraft-ignore-config.md` §13.3 第一項（共用 `.astro/data-store.json` 的已知限制）：註明已於 1.16.0 修正（主 repo 模式仍存在）

### 3. CHANGELOG 與版號

- `package.json` 版號 1.16.0
- `CHANGELOG.md` 新增 `## [1.16.0] - YYYY-MM-DD`（`check:upd` 斷言格式）：
  - 修正：同時開兩個筆記資料夾時，畫面顯示另一個資料夾的筆記、或 build 產物混入另一個資料夾的內容
  - 變更：升級後每個筆記資料夾第一次啟動會重新 build 一次，並在 `~/.notecraft/cache/<hash>/app/` 建立執行目錄（約 3 MB）
  - 新增：同一個筆記資料夾重複啟動時會顯示已在執行的網址並結束
  - 「內部」類別：執行目錄、鎖檔、fixture

### 4. 設計文件回填

`docs/notecraft-multi-instance.md` §13：與本文不同之處、驗證結果、已知限制；文件狀態改成「已實作」。

## 驗收

- [ ] `npm run check:upd` 通過（CHANGELOG 格式、與官網 `readReleases()` 對照）
- [ ] `npm run check-plugins` 通過（`prepublishOnly` 會跑）
- [ ] `npm pack --dry-run` 含 `bin/run-root.mjs`、`CHANGELOG.md`，不含 `plugins/`
- [ ] `npx tsc --noEmit && npx astro build` 通過，tsc 錯誤數不增加

## 實作記錄（2026-11-16）

- CHANGELOG：原本 Unreleased 裡已發佈的 er-diagram-renderer 1.3.0 一併收進 `## [1.16.0] - 2026-11-16`，Unreleased 留空
- 官網：`advanced/internals.mdx` 新增「執行目錄」與「同時開多個筆記資料夾」兩節、快取內容表加 `app/` 與 `run.lock.json`、重新 build 條件加一列；`resources/faq.mdx` 新增一題；`resources/upgrade.mdx` 加 1.16.0 列；`resources/contributing.mdx` 說明主 repo 與 `NOTECRAFTAPP_DEV=1` 的差異；`install.mdx`、`project-structure.mdx` 的快取說明改成「build 快取與執行目錄」
- `package.json`、`package-lock.json` 版號 1.16.0（**未發佈到 npm**）
- 驗收結果：`check:upd`、`check-plugins` 通過；`npm pack` 含 `bin/run-root.mjs`、`CHANGELOG.md`，不含 `plugins/`；tsc 無新增錯誤
