# Task 136 — 收尾：示範與規模 fixture、全狀態驗收、文件回填、發版

> 規格 [notecraft-workbench-notes-graph.md](../notecraft-workbench-notes-graph.md) §15、§16.1、§17、§21；Q11、Q12 定案（§20）。
> 前置：Task 132–135。

## 為什麼要有這一步

repo 目前 25 篇筆記的邊不多，看不到 handoff 的大部分狀態（第 4 級樞紐需要被 8 篇以上連入）。以產生器做出與 prototype 相近的工作區，逐一對照 14 個狀態，再回填文件、發版。

## 範圍

### 1. `scripts/fixtures/notes-graph-sample.mjs`（新增，Q11）

放 `fixtures/`，不放 `checks/`，不併入 `check-plugins`。比照 `define-ref-scale.mjs`：`npm pack` 後在暫存目錄建 viewer 工作區，設 `NOTECRAFTAPP_DEV=1`。

| 參數 | 內容 |
| --- | --- |
| （預設） | 約 65 篇、5 個資料夾（含一層巢狀）、3 個系列（其中一個含資料檔章節）、12 個標籤、3 個資料檔、約 15 篇孤島、3 個被 8 篇以上連入的樞紐 |
| `--n 300`、`--n 1000` | 規模測試：邊數約節點數的 1.2 倍、孤島約 20% |
| `--no-links` | 完全沒有邊的工作區（驗空狀態 B） |
| `--build` | build 後跑斷言，並印出 `serve` 指令供瀏覽器檢查 |

預設工作區的連結寫法要涵蓋規格 §4.4 的每一列：`/notes/…`（含中文 slug、URL 編碼、帶 hash）、相對 `.md`、不帶副檔名的相對連結、檔名含空白與大寫、`/view/…`、`<PluginView>`、`meta.backTo`；另放幾個不該算的：圍欄程式碼裡的連結、圖片、外部網址、連到不存在的筆記。定義引用用 `::::define`／`::include`／`:ref`。亂數固定種子，每次產生的內容相同。

`--build` 的斷言：

- `/wb-index.json` 的 `graph.edges` 數量與各種類的次數，和產生器自己算的預期值相同
- 三個樞紐的連入數 ≥ 8
- 不該算的連結都沒有產生邊
- 產物不含本機路徑
- `--n` 時印出 build 時間與邊數（不斷言）

### 2. 全狀態驗收

以預設工作區逐項走規格 §17 的清單，對照 handoff H§3 的 14 個狀態；`--n 300` 驗狀態 12（hover 與搜尋沒有可見的延遲、縮放不掉幀），`--no-links` 驗狀態 11。另外確認：

- 主專案（25 篇）的 Graph 正常
- viewer 的 `view`、`build`＋`serve` 行為一致
- `NOTECRAFT_BASE=/x` build 後所有 Graph 產生的連結帶前綴
- `ignore.json` 排除一篇被連到的筆記後，它不是節點、沒有邊

發現的問題在本 Task 修掉，並記在實作記錄。

### 3. 文件

- `CLAUDE.md`：
  - 目錄結構加 `components/wb/graph/`、`lib/wb-graph.ts`、`lib/wb-graph-layout.ts`、`lib/wb-graph-prefs.ts`、`lib/links-scan.mjs`
  - Workbench 段落加一條「Graph 檢視（v1.13.0）」：邊只由 `buildGraphEdges` 計算、UI 不自己數；佈局是純函式且由 `check:wb` 鎖住；SSR 不輸出節點；樞紐與清除篩選是真的連結；偏好存 `nc-graph-prefs-v1`；`gr-` 規則在 860px 媒體規則之前；JS 常數與 `--wb-gr-*` 由斷言對照；改 `links-scan.mjs` 要重啟 dev server；fixture 指令
- `docs/notecraft-workbench.md`：`/notes` 的 view 清單、`WbIndex.graph`、`?view=graph`
- `docs/notecraft-prd.md`：新增 Phase 4.28、§4.1 目標加一項、文件版本升 `v1.24.0`、Changelog
- `docs/notecraft-workbench-define-ref.md`：§9 補一句 `DefNote.links` 的用途（指向本規格）
- 規格 §21「實作後回填」：各 Task 的實測結論、與規格不同之處；狀態改為已實作
- `docs/tasks/README.md`：本批標為已完成
- 官網 `site/`：在「使用工作台」相關章節新增一頁，說明 Graph 的兩種模式與「哪些寫法會變成邊」。`site` 的 `astro build` 若仍有既有的失敗，以 site dev server 確認渲染

### 4. 發版

- `CHANGELOG.md`：`## [1.13.0] - YYYY-MM-DD`，「新增」筆記頁 Graph 檢視（文件關聯、標籤關聯）；格式依 `npm run check:upd`
- `package.json` 版號 `1.13.0`（Q12）
- 確認 `package.json` 的 `files` 已涵蓋新檔（`src/components/wb/`、`src/lib/` 都是整個資料夾，預期不用改）

## 要改的既有檔案

`CLAUDE.md`、`docs/notecraft-prd.md`、`docs/notecraft-workbench.md`、`docs/notecraft-workbench-define-ref.md`、`docs/notecraft-workbench-notes-graph.md`、`docs/tasks/README.md`、官網的新頁與側欄設定、`CHANGELOG.md`、`package.json`。新增 `scripts/fixtures/notes-graph-sample.mjs`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 示範 | — | `node scripts/fixtures/notes-graph-sample.mjs --build` | 全部斷言通過 |
| 規模 | — | `… --n 300 --build`、`… --n 1000 --build` | build 成功；瀏覽器裡 300 節點操作順暢；1,000 節點的表現符合 Task 131 的結論 |
| 空狀態 B | — | `… --no-links --build` | 文件模式顯示空狀態 B |
| 驗收清單 | — | 規格 §17 | 全部打勾 |
| 檢查更新 | — | `npm run check:upd` | CHANGELOG 格式通過 |
| 打包 | — | `npm pack --dry-run` | 含 `src/components/wb/graph/`、`src/lib/wb-graph*.ts`、`src/lib/links-scan.mjs`；不含 `scripts/fixtures/` |
| 全套 | — | `npx tsc --noEmit && npx astro build && npm run check-plugins && npm run check:upd` | 通過；tsc 錯誤數不增加 |

## 依賴

Task 132–135。
