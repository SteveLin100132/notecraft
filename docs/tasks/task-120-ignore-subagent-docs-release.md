# Task 120 — note-scanner、文件回填、發版

> 規格 [notecraft-ignore-config.md](../notecraft-ignore-config.md) §5.6、§6（不保證的事）、§9.3、§10；Q7 定案（§12，不做 UI）。
> 前置：Task 117、118、119。

## 為什麼要有這一步

前三個 Task 讓程式行為正確，但作者知道怎麼寫 `ignore.json`、知道它「不是存取控制」、AI 掃描也尊重它，這個功能才算完成。`skill-template/` 會隨套件發佈給 viewer 使用者，也要同步。

## 範圍

### 1. note-scanner subagent

- `.claude/agents/note-scanner.md` 與 `skill-template/.claude/agents/note-scanner.md` 加一段「排除的檔案」：
  - 掃描前先讀 `.notecraft/ignore.json`（位置照規格 §3.1 的優先序；只讀一處）
  - 命中的檔與資料夾不列入結果；內建排除（`.` 開頭、`node_modules/`、`dist/`）一律跳過
  - 附規格 §3.3 的語意摘要表（任何深度、`/` 錨定、結尾 `/`、`*`／`**`、`!` 後者勝、資料夾排除後救不回）
  - 孤兒元件判斷：只被**被排除筆記**引用的元件，回報時標「引用者已被 ignore.json 排除」，**不**直接當孤兒（避免作者誤刪）
- 不提供給 subagent 呼叫的 CLI（規格 §5.6）
- ⚠️ `skill-template/` 目前在工作區有作者未提交的修改（7 個檔，本批分支建立前就存在）。動 `skill-template/.claude/agents/note-scanner.md` 前先 `git status` 確認它不在其中；**不要把那些修改一起 commit**

### 2. 文件

| 檔案 | 內容 |
| --- | --- |
| `README.md` | 新增「排除檔案」一節：位置、§3.2 範例、§3.3 語意表、`archive/*` 與 `!` 的陷阱、內建排除、「不是存取控制、只保證 `dist/` 乾淨」（§6） |
| `CLAUDE.md` | `.notecraft/` 結構加 `ignore.json`；目錄結構加 `lib/notes-ignore.mjs`（三種環境共用）；新增一條規則：「**所有走訪 notesDir 的地方一律經 `walkNotes()`／`walkNotesAsync()`**，不要再自寫 `readdir` 遞迴」；`notecraftDir` 只由 `resolveNotecraftDir()` 決定 |
| `docs/notecraft-ignore-config.md` | 文件狀態改「已實作」、版本 v1.0.0；新增「§13 實作後回填」：實測數字（`ignore-sample` 的排除檔數、build 時間差）、與規格不同之處 |
| `docs/notecraft-plugin-system.md` | `.notecraft/` 結構圖加 `ignore.json`；「`files` 的基準是 notesDir」旁註明 ignore 先於 `files`／`exclude` |
| `docs/notecraft-npx-viewer-v2.md` | 快取失效 Pass 1／1.5 與 watcher 的段落補一句「被 ignore.json 排除的檔不計」 |
| `docs/notecraft-prd.md` | 依慣例補 Phase 4.25 條目（用 `bump-prd` skill 決定 PRD 版號與 changelog） |
| `docs/tasks/README.md` | 本批標「✅ 已完成」與日期；各 Task 檔末加「實作記錄」 |

### 3. 發版

- `CHANGELOG.md` 加 `## [1.10.0] - YYYY-MM-DD`（標題格式必須符合 `check:upd` 的 regex）：
  - `新增`：`.notecraft/ignore.json`（類 `.gitignore` 語法、所有檔案都適用、改了自動生效）
  - `修正`：筆記資料夾內 `node_modules/` 底下的 Markdown 不再被當成筆記
  - `內部`：走訪 notesDir 收斂到 `notes-ignore.mjs`；`notecraftDir` 解析收斂到一份；`check:ignore`
- `package.json` 版號 `1.10.0`；`npm run check:upd` 必須通過（版本第一段要等於 `package.json`）

### 4. 手動驗收（規格 §9.3）

以 `notecraftapp view <ignore-sample>` 與 `notecraftapp serve <ignore-sample>` 實際跑過規格 §9.3 的 6 條，並以 viewer 對一個真實的既有專案 `docs/` 跑一次（例如本 repo 的 `docs/`，加 `prototype/` 與 `tasks/` 規則），確認 Sidebar 與 build log 符合預期。

## 要改的既有檔案

`.claude/agents/note-scanner.md`、`skill-template/.claude/agents/note-scanner.md`、`README.md`、`CLAUDE.md`、`CHANGELOG.md`、`package.json`、`docs/notecraft-ignore-config.md`、`docs/notecraft-plugin-system.md`、`docs/notecraft-npx-viewer-v2.md`、`docs/notecraft-prd.md`、`docs/tasks/README.md`、`docs/tasks/task-117〜119`（實作記錄）。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| subagent | `ignore-sample`，`drafts/b.mdx` 有一個 `@ai-visualize` 標記 | 請 note-scanner 列出標記 | 不含 `drafts/b.mdx` 的標記 |
| 版本 | — | `npm run check:upd` | 通過（CHANGELOG 第一段是 1.10.0） |
| 打包 | — | `npm pack --dry-run` | 含 `schemas/ignore.schema.json`、`src/lib/notes-ignore.mjs`、`skill-template/.claude/agents/note-scanner.md` |
| schema | jsDelivr 上線後 | 開規格 §3.2 的 `$schema` 網址 | 200 |
| 全套 | — | `npx tsc --noEmit && npx astro build && npm run check-plugins` | 通過；tsc 錯誤數不增加 |
| 交付 | — | — | 開 PR `feat/ignore-config` → main |

## 依賴

Task 117、118、119。

## 實作記錄（2026-10-04）

- note-scanner 兩份都加「排除的檔案」一節與孤兒判斷規則。`skill-template/` 版**手動套用同一段文字**、沒有跑 `npm run sync-skill`：sync 會從 `.claude/` 重新產生整個 `skill-template/`，蓋掉作者在 `skill-template/` 其他 7 個檔尚未提交的修改。新增段落不含任何會被 sync 替換的路徑，`prepublishOnly` 重新 sync 時結果相同
- `bump-prd` skill 需要 Git Bash，本機 Git Bash 當掉（留下 `sh.exe.stackdump`，已刪除），PRD 依 Phase 4.24 的格式手動補 Phase 4.25、v1.21.0
- 文件：README「排除檔案」、CLAUDE.md（目錄、`.notecraft/` 結構、新增一節規則、dev-only API）、plugin-system §4.1、npx-viewer-v2 §7.2、設計文件 §13 回填與 §5.3 更正、CHANGELOG 1.10.0、`package.json` 1.10.0
- 以本 repo `docs/` 對 viewer 實測與 jsDelivr 上 `$schema` 網址，需發佈後才能驗（未做）
