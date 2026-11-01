# Task 148 — viewer 三模式 fixture、WebGL context 驗證、文件與發版

> 規格 [notecraft-generated-three.md](../notecraft-generated-three.md) §4.3、§6 V4／V6／V7、§7；Q3／Q4 定案（§13）。
> 依賴 Task 147（要有範例元件）。本批最後一個。

## 為什麼要有這一步

主專案能 build 不代表 npx viewer 能：viewer 的元件在 `<notesDir>/.notecraft/components/`、app 之外，`three` 與 `three/addons/...` 要靠 `vite.resolve.dedupe` 從 app root 解析。另外「unmount 不殘留 WebGL context」要在**同一份文件內反覆 mount／unmount**的情境測 —— 筆記頁之間是 MPA 換頁，瀏覽器本來就會回收，測不出洩漏（規格 §2）。

## 範圍

### 1. `scripts/fixtures/three-viewer.mjs`

仿 `scripts/fixtures/plugin-empty-states.mjs` 的形狀：

- `npm pack` → 解開到暫存資料夾、`NOTECRAFTAPP_DEV=1`（否則 CLI 會 re-exec 到 `~/.notecraft/app-<version>/` 的舊副本）
- 產生暫存工作區（**不同磁碟或至少 app 之外**）：一篇筆記 + `.notecraft/components/platform-topology-3d.tsx`（複製 Task 147 的元件，import 改走 `@notes/components/…`）
- 參數：`--build`（跑 `notecraftapp build` 並斷言產物有 three chunk、無錯誤）、`--out <dir>`（只產生工作區，供手動跑 `view`／`serve`）
- 放 `scripts/fixtures/`，**不要放 `scripts/checks/`**

### 2. V4 viewer 三模式

用 fixture 工作區手動跑並以瀏覽器確認（可旋轉、可點選、無 console 錯誤）：

- `notecraftapp view`（astro dev）
- `notecraftapp serve`（改元件存檔 → 背景 rebuild → auto reload 後仍正常）
- `notecraftapp build`

若出現 `Could not resolve "three/addons/..."` → 依規格 §4.3 在 `astro.config.mjs` 為 `three` 加 `resolve.alias`（只在 `notesDir` 時），並記在實作記錄。

### 3. V6 WebGL context 不殘留

- (a) **簡報翻頁**：做一份暫時的 deck（不 commit），含 full-visual 頁沿用範例元件、前後各一頁其他版型；`/present/<slug>` 來回翻頁 ≥ 30 次
- (b) **HMR**：`view` 模式改範例元件存檔 ≥ 20 次
- (c) **放大檢視**：開關 VizZoom ≥ 20 次
- 三者 console 都不得出現 `Too many active WebGL contexts` 或 `CONTEXT_LOST` 以外的 WebGL 警告；以 `javascript_tool` 確認 unmount 後文件內 `canvas` 數量回到預期
- 在元件 cleanup 暫時加計數（`console.count`）確認每次 unmount 都有跑 `forceContextLoss`，驗完移除

### 4. V7 減少動態

`prefers-reduced-motion: reduce` 下以 rAF 計數確認迴圈未啟動（主專案驗過一次，這裡在 viewer `build` 產物再驗一次）。

### 5. 文件

- `docs/notecraft-npx-viewer-v2.md` §6.5 清單與 §6.6 常數範例加 `three`，補「子路徑以 root package 比對」
- `docs/notecraft-plugin-system.md` 白名單那一行加 `three`（Q4）
- `CLAUDE.md`：「元件白名單」加 `three`；「視覺化選型」表加一列「空間關係本身是重點 → three（等角）」；技術棧加一行 3D
- `docs/notecraft-prd.md`：§8.1 新增 Phase 4.30（v1.26.0 追加）、版本紀錄一行（可用 `bump-prd` skill）
- 規格文件回填「實作記錄」一節：與規格不同之處、驗證結果、bundle 大小（three chunk gzip 後）
- `docs/tasks/README.md` 這一節標 ✅

### 6. 發版

- `package.json` `1.14.0` → `1.15.0`
- `CHANGELOG.md` 新增 `## [1.15.0] - YYYY-MM-DD`：
  - 新增：AI 生成的互動元件可以使用 three.js 做 3D 場景（只建議用在空間關係是重點的圖；範例見 md-viz）
  - 內部：新增依賴 `three`（`~0.187.0`）與 `@types/three`；content-visualize skill 升到 `2.1.0-alpha.1`，viewer 使用者跑 `notecraftapp init-skill` 取得 3D 規範
- `npm run check:upd`（CHANGELOG 標題格式）、`npm run check-plugins`（`prepublishOnly` 也會跑）

## 要改的既有檔案

`docs/notecraft-npx-viewer-v2.md`、`docs/notecraft-plugin-system.md`、`docs/notecraft-prd.md`、`docs/notecraft-generated-three.md`、`docs/tasks/README.md`、`CLAUDE.md`、`CHANGELOG.md`、`package.json`、`package-lock.json`；新增 `scripts/fixtures/three-viewer.mjs`；視 §2 結果可能改 `astro.config.mjs`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| viewer build | fixture 工作區 | `node scripts/fixtures/three-viewer.mjs --build` | 通過；產物有 three chunk |
| viewer view／serve | `--out` 工作區 | 各模式開該筆記 | 元件正常；serve 改檔後 auto reload 仍正常 |
| 簡報翻頁 | 暫時 deck | 來回翻 ≥ 30 次 | 無「Too many active WebGL contexts」 |
| HMR | `view` | 存檔 ≥ 20 次 | 同上 |
| VizZoom | — | 開關 ≥ 20 次 | 同上 |
| 減少動態 | viewer build 產物 | reduce 模擬 | 無 rAF 迴圈 |
| 發版檢查 | — | `npx tsc --noEmit && npx astro build && npm run check-plugins && npm run check:upd` | 通過；tsc 錯誤數不增加 |
| 本機路徑 | — | build 後 | `no-local-path-integration` 無報錯 |

## 依賴

Task 147。

## 實作記錄（2026-11-01）

- `three-viewer.mjs --build` 通過：`three/addons/...` 由 dedupe 從 app root 解析，`astro.config.mjs` 不需要 alias；Git Bash 下 GNU tar 會把 `C:\…` 的冒號當遠端主機，改為只傳檔名
- view／serve 以工作區內的 wrapper 啟動打包出來的 CLI 實測：3D 元件掛上、可互動；serve 改元件存檔 → 背景 rebuild → 自動 reload
- 環境限制（與 three 無關，寫在 fixture 檔頭）：junction 共用 node_modules 時產物沒有 CSS（改動前的 `6c343f1` 同樣如此，真實安裝的 app-1.14.0 有）；共用的 `node_modules/.astro/` content 快取會記著上一個工作區
- 簡報翻頁（暫時 deck，未 commit）mount／unmount 32 次：建立 32、釋放 32，無 WebGL 警告
- 文件：npx-viewer-v2 §6.5／§6.6、plugin-system §6.4、CLAUDE.md（技術棧、元件白名單、選型表）、PRD Phase 4.30（v1.26.0）、CHANGELOG 1.15.0；`check:upd`、`check-plugins` 通過
