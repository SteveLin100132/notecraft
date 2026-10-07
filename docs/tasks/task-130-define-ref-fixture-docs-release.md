# Task 130 — 收尾：規模 fixture、刪除筆記提醒、文件回填、發版 1.12.0

> 規格 [notecraft-workbench-define-ref.md](../notecraft-workbench-define-ref.md) §13、§14.1、§15、§18；Q10、Q11、Q12 定案（§17）。
> 前置：Task 126–129。

## 為什麼要有這一步

範例筆記只有 3 篇（Q10），「≥10 篇引用」與「同頁嵌入兩次」看不到，要靠 fixture 驗；刪除被引用的筆記會讓 build 失敗，dev 的刪除對話框要先提醒；最後同步文件並發版。

## 範圍

### 1. 規模 fixture `scripts/fixtures/define-ref-scale.mjs`（新增）

放 `fixtures/`，不放 `checks/`，不併入 `check-plugins`（比照 `ignore-sample.mjs`）。

- 在暫存目錄建 viewer 工作區：1 篇來源（含 1 個 define）、12 篇引用筆記（皆 `:ref`）、其中 1 篇另外 `::include` 同一個 define 兩次
- 預設印出 `serve` 指令供瀏覽器檢查；`--build` 時 build 並斷言：
  - `/wb-index.json` 該 define 的 `refs.length === 12`；同時 ref 與 include 的那篇只算 1 篇，`kinds` 為 `["inc", "ref"]`（規格 §4.2）
  - 嵌入兩次的頁面標題 id 有 `-2` 後綴、整頁沒有重複 id
  - 本機絕對路徑不出現在產物
- 以 `NOTECRAFTAPP_DEV=1` 執行打包後的套件（同 `plugin-empty-states.mjs`）

### 2. 刪除筆記的提醒（Q11）

- `src/dev-api/handlers.mjs` 的刪除計畫（`handleDeletePlan`）回應加上 `referencedBy: { slug, title, ids }[]`（由 `getDefIndex()` 計算，只用相對資訊）
- `DeleteNoteButton.tsx` 的確認對話框（已經會讀 `GET …/delete-plan`）：有 `referencedBy` 時列出這些筆記，並提示「刪除後 build 會失敗，請修改這些引用」。**不擋刪除**
- 刪除流程不變（硬刪除、先關頁籤）

### 3. Subagent 與 Skill 說明

- `.claude/agents/note-scanner.md`、`skill-template/.claude/agents/note-scanner.md`：補一句 define 內的 `@ai-visualize` 標記照常處理；嵌入處會顯示 placeholder
- `.claude/agents/mdx-writer.md`、`skill-template/.claude/agents/mdx-writer.md`：寫回的 `import` 一律放檔頭，不放進 define 內

### 4. 文件

- `CLAUDE.md`：新增「定義與引用（v1.12.0）」一段，列出貫穿規則（只寫 id、全域唯一、`remarkNotecraftDefs` 的位置、placeholder、template 與 pagefind、`--wb-*` token、只做亮色）；目錄結構補上新檔
- `docs/notecraft-prd.md` §7.1：Markdown 擴充語法加入 define／include／ref
- `docs/notecraft-workbench.md`：Drawer、Palette 章節連到本規格
- 官網 `/docs`：`site/src/content/docs/writing/` 目前只有程式碼區塊有獨立頁、沒有擴充語法總頁，新增 `writing/define-ref.mdx`（三個指令的語法、範例、限制、placeholder），並加進側欄導覽。位置與標題先與作者確認
- 規格 §18「實作後回填」：各 Task 的實測結論；文件版本升 `v1.0.0`、狀態改為已實作
- `docs/tasks/README.md`：本批標為已完成

### 5. 發版

- `CHANGELOG.md`：`## [1.12.0] - YYYY-MM-DD`，「新增」定義區塊、嵌入、行內引用、反向連結；依 `npm run check:upd` 的格式
- `package.json` 版號 `1.12.0`（Q12）

## 要改的既有檔案

`src/dev-api/handlers.mjs`、`src/components/islands/DeleteNoteButton.tsx`、`.claude/agents/` 與 `skill-template/.claude/agents/` 的 note-scanner、mdx-writer、`CLAUDE.md`、`docs/notecraft-prd.md`、`docs/notecraft-workbench.md`、`docs/notecraft-workbench-define-ref.md`、`docs/tasks/README.md`、`site/src/content/docs/writing/define-ref.mdx`（新增）與側欄設定、`CHANGELOG.md`、`package.json`。新增 `scripts/fixtures/define-ref-scale.mjs`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 規模 | — | `node scripts/fixtures/define-ref-scale.mjs --build` | 全部斷言通過 |
| 刪除提醒 | dev，刪除系統 Overview | 開確認對話框 | 列出請假功能規格、帳號權限規格；仍可刪除 |
| 刪除後 | 刪除後 | `astro build` | 失敗並指出要改的引用（之後以 git 復原） |
| 全套 | — | `npx tsc --noEmit && npx astro build && npm run check-plugins && npm run check:upd` | 通過；tsc 錯誤數不增加 |
| 驗收清單 | — | 規格 §15 | 全部打勾 |

## 依賴

Task 126–129。
