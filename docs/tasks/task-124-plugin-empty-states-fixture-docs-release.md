# Task 124 — 情境 fixture、文件回填、發版

> 規格 [notecraft-workbench-plugin-empty-states.md](../notecraft-workbench-plugin-empty-states.md) §11、§11.1、§12、§15；Q5 定案（§14，版號 `1.11.0`）。
> 前置：Task 121、122、123。fixture（§1）可以先於 Task 123 寫好，供 Task 123 驗收使用。

## 為什麼要有這一步

情境 3–7 在主 repo 都不會出現（主 repo 有 `plugins.json` 也有官方外掛），每次驗證都要手動搭工作區，又容易漏掉「正式環境不能有 `npx`」與「client chunk 不含官方 renderer」這兩條只看產物才知道的規則。另外這次移除內建外掛對「沒裝就引用」的工作區是行為改變，CHANGELOG 要寫清楚遷移方式。

## 範圍

### 1. `scripts/fixtures/plugin-empty-states.mjs`（新增）

放 `scripts/fixtures/`，**不放 `scripts/checks/`**（那裡每支都會被 `check-plugins` 執行）。

- 在 `os.tmpdir()` 建 5 個工作區（`fresh`／`noplugins`／`nomap`／`nohit`／`disabled`），各含 `notes/` 一篇筆記與一個 `schema.er.json`
  - 外掛以本機來源安裝：直接複製主 repo 的 `plugins/er-diagram-renderer/` 到 `.notecraft/plugins/`，並寫 `.installed.json`（`origin: "local:er-diagram-renderer"`）
  - `nohit` 的規則用 `none/*.er.json`；`disabled` 用頂層 `disabled: ["er-diagram-renderer"]`
- 預設模式：印出 5 個工作區路徑與對應的 `node bin/notecraftapp.mjs view <dir>` 指令，供手動逐一檢查
- `--build`：對每個工作區跑 `node bin/notecraftapp.mjs build`，斷言產物：
  - 情境 `fresh`／`noplugins`：`/plugins/index.html` 不含 `er-diagram-renderer`、`openapi-renderer`
  - 全部情境：產物 `.html` 不含 `npx`
  - 全部情境：client chunk（`_astro/*.js`）不含 `openapi-renderer` 專屬字串（例如 `--oar-`），`fresh`／`noplugins` 也不含 ER 專屬字串
- 結束時刪除暫存目錄（`--keep` 保留，方便除錯）
- 檔頭註解寫明需要幾分鐘、不併入 `check-plugins`（同 `ignore-sample.mjs`）

### 2. 文件

| 檔案 | 內容 |
| --- | --- |
| `docs/notecraft-workbench-plugin-empty-states.md` | 文件狀態改「已實作」、版本 v1.0.0；§15 回填：實測結果、與規格的偏離、fixture 執行時間 |
| `docs/notecraft-plugin-system.md` | §4.2 Q17 那段補「只限主 repo：`plugins/` 不隨 npm 發佈（v1.11.0），viewer 的官方外掛一律經 `install-plugin` 安裝」；Q 表 Q17 列同步 |
| `docs/notecraft-workbench.md` | §8.6 Plugin 頁補一句連到本規格；§8.6 表的「來源」列，「內建」說明改為「主 repo 官方 store」 |
| `CLAUDE.md` | Plugin System「幾條不會變的規則」加：「**`plugins/`（官方 store）不隨 npm 發佈**：app 根目錄的 glob 只給主 repo 用；同 id 撞名時以 `.notecraft/plugins/` 為準。`check-plugins` 以 `npm pack --dry-run` 把關」；Workbench 段落加一條 Plugin 空狀態摘要（情境判定在 `lib/wb-plugin-env.ts`、只看啟用中外掛；官方外掛清單在 `lib/official-plugins.ts`；正式環境不出現 `npx`）；目錄結構補兩個新 lib 檔與 `components/wb/plugins/` |
| `site/` 官網文件 | `getting-started/plugins.mdx` 確認敘述與新行為一致（「指到尚未安裝的 Plugin，build 會失敗」現在成立，不需改）；若 `/plugins` 頁的 Plate 截圖會因說明框消失而過時，記到 memory 的待同步清單，不在本 Task 重截 |
| `docs/notecraft-prd.md` | 依慣例補 Phase 4.26 條目（用 `bump-prd` skill 決定 PRD 版號與 changelog） |
| `docs/tasks/README.md` | 本批標「✅ 已完成」與日期；各 Task 檔末加「實作記錄」 |

### 3. 發版

- `CHANGELOG.md` 加 `## [1.11.0] - YYYY-MM-DD`（標題格式必須符合 `check:upd` 的 regex）：
  - `修正`：npx viewer 未安裝任何外掛時，「已安裝外掛」仍列出 ER Diagram 與 API 文件。原因是官方外掛隨 npm 套件發佈並被當成已安裝；現在只列 `.notecraft/plugins/` 實際安裝的外掛，沒用到的 renderer 也不再打包進頁面
  - `修正`：同一個外掛同時存在兩處時，渲染器與 manifest 來自不同版本
  - `新增`：`/plugins` 的空狀態與引導：沒安裝外掛、沒寫映射、映射沒命中、外掛全部停用，各有說明與可複製的指令；部署站只顯示安靜版本
  - `調整`：部署站不再顯示「安裝新外掛」說明框；停用中外掛的檔數顯示「—」
  - **升級注意**（寫在該版段落開頭）：若 `plugins.json` 引用了官方外掛但從未執行 `install-plugin`，升級後 build 會失敗，執行 `npx notecraftapp install-plugin <id>` 即可
  - `內部`：`wb-plugin-env.ts`、`official-plugins.ts`、`useCopyState`、`check-plugins` 打包斷言
- `package.json` 版號 `1.11.0`；`npm run check:upd` 必須通過

### 4. 收尾檢查

- `git status` 確認只 add 本批檔案（`package-lock.json` 在分支建立前就有未提交修改，確認來源後再決定是否納入）
- 開 PR 併回 main

## 要改的既有檔案

`CHANGELOG.md`、`package.json`、`CLAUDE.md`、`docs/notecraft-workbench-plugin-empty-states.md`、`docs/notecraft-plugin-system.md`、`docs/notecraft-workbench.md`、`docs/notecraft-prd.md`、`docs/tasks/README.md`、`docs/tasks/task-121～124`（實作記錄）。新增 `scripts/fixtures/plugin-empty-states.mjs`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| fixture | — | `node scripts/fixtures/plugin-empty-states.mjs --build` | 5 個工作區全數通過；暫存目錄已刪除 |
| fixture 護欄 | 暫時把 Task 123 的說明框 `isDev &&` 拿掉 | 同上 | 「產物不含 `npx`」失敗；改回後通過 |
| 版號 | — | `npm run check:upd` | 通過 |
| 打包 | — | `npm pack --dry-run` | 無 `plugins/`；含 `CHANGELOG.md` |
| 原始回報 | `npm pack` 的 tarball 裝進 `sme-ai-talent-2026-proposal` 的**複本** | `notecraftapp view ./notes` | `/plugins` 兩個頁籤都是情境 3 dev 畫面；Sidebar「尚無資料檔」 |
| 全套 | — | `npx tsc --noEmit && npx astro build && npm run check-plugins` | 通過；tsc 錯誤數不增加 |

## 依賴

Task 121、122、123。
