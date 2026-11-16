# Task 159 — 整合驗證：`scripts/fixtures/multi-instance.mjs`、Windows 實機

> 規格 [notecraft-multi-instance.md](../notecraft-multi-instance.md) §1、§9.1、§10.3。
> 依賴 [Task 158](task-158-cli-run-root-wiring.md)。

## 為什麼

這個問題只有在「兩個行程同時跑」時才出現，純函式斷言測不到。把設計文件 §1 的手動重現寫成一支腳本，之後任何動到 CLI、`astro.config.mjs` 或 Astro 升版的改動都能重跑。

## 範圍

### 1. `scripts/fixtures/multi-instance.mjs [--build] [--keep]`

放 `scripts/fixtures/`（**不放** `scripts/checks/`，那裡每支都會被 `check-plugins` 執行）。沿用 `plugin-empty-states.mjs` 的作法：`npm pack` → 解到暫存資料夾 → `npm install --omit=dev` → 以 `NOTECRAFTAPP_DEV=1` 執行，避免 re-exec 到 `~/.notecraft/app-<version>/`。

- 產生兩個工作區（內容、`ignore.json`、`plugins.json` 都不同），每篇筆記含唯一的標記字串（例：`MARKER-A-1`）
- `HOME` 指到暫存資料夾，讓 `~/.notecraft/cache/` 落在暫存區、不碰作者真正的快取
- 自動挑空的 port；每個步驟以 `fetch` 輪詢到 200 為止，逾時失敗
- 結束時（含失敗、Ctrl+C）關掉所有子行程；`--keep` 保留暫存資料夾供檢查

斷言：

1. 兩個 `view` 同時啟動 → 各自只含自己的標記；各改一篇筆記後仍正確；對方的筆記頁 404
2. 同一個工作區開第二個 `view` → 非 0 結束、輸出含第一個的網址；關掉第一個後再開成功；以 SIGKILL 結束後再開成功（過期鎖）
3. `view` 開著時跑同一工作區的 `build` → 非 0 結束
4. `--build`：兩個 `serve --rebuild --no-open` 同時啟動 → 兩份 `dist` 各自只含自己的標記；關掉後單獨重啟其中一個（不加 `--rebuild`）仍正確
5. 被排除的檔（`subA/`、`note-B3.mdx`）不出現在任何一邊的產物
6. 結束後兩個執行目錄的 `.nc-state/lock.json` 都已刪除，沒有殘留行程

### 2. Windows 實機（手動）

在 Windows 跑上面的 1、2、4，另外確認：

- `node_modules` 是 junction（`dir` 顯示 `<JUNCTION>`），不需要系統管理員
- 瀏覽器開筆記頁 console 沒有 403
- 筆記放在另一顆磁碟（例如 `D:\notes`）時兩個工作區仍正確（`vite-cross-drive-content.ts` 的情境）

### 3. 既有 fixture

`scripts/fixtures/ignore-dev.mjs` 為了繞開共用 `.astro/data-store.json` 會觸碰 `ignore.json` 強制重新同步（`notecraft-ignore-config.md` §13.3）。確認改用執行目錄後它仍通過；這段繞法保留（無害），在本檔回填是否還需要。

## 驗收

- [ ] `node scripts/fixtures/multi-instance.mjs` 與 `--build` 在 macOS 通過
- [ ] 在 Task 158 之前的 commit 上跑會失敗（證明腳本確實測到這個問題），結果記在下方實作記錄
- [ ] Windows 實機項目全部通過，記錄 Node 與 Windows 版本
- [ ] `node scripts/fixtures/ignore-dev.mjs` 通過

## 實作記錄（2026-11-16）

- `HOME`／`USERPROFILE` 指到暫存資料夾；POSIX 以 process group 起子行程，結束時連 astro 一起收（Windows 用 `taskkill /T /F`）；SIGKILL 的過期鎖情境在 Windows 略過
- 鎖檔實際在 `cache/<hash>/run.lock.json`（Task 157），斷言 6 改看這個位置
- 本機的 worktree 曾因 `node_modules` 過舊（缺 `ignore`、`three`）讓 CLI 在 import 時就失敗，`npm install` 後正常；與本功能無關
- 驗收結果（macOS，Node 22.16）：
  - `node scripts/fixtures/multi-instance.mjs --build`：8 項全過
  - 在修正前的 commit（`295c896`，只拿掉「打包內容要有 `bin/run-root.mjs`」那行斷言）跑：**4 項失敗** —— A 的頁面缺 `MARKER-A-1`（顯示 B 的筆記）、A 的存檔沒反映、重複啟動沒被擋、view 中 build 沒被擋。證明腳本確實測到這個問題
  - `node scripts/fixtures/ignore-dev.mjs`：16 項全過。§13.3 的繞法（觸碰 `ignore.json` 強制重新同步）保留：它跑在主 repo 模式，那裡仍共用一個 root
  - **Windows 實機尚未驗證**（junction、`fs.allow`、跨磁碟）
