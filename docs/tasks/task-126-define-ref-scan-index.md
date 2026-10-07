# Task 126 — 地基：掃描器 `defs-scan.ts`、索引 `defs-state.mjs`、錯誤與 warn、斷言、範例筆記

> 規格 [notecraft-workbench-define-ref.md](../notecraft-workbench-define-ref.md) §2、§3、§4.1、§4.2、§14.1；Q4、Q6、Q7、Q8、Q10 定案（§17）。
> 前置：Task 125（slug 共用函式的位置）。Task 127、129、130 靠它。

## 為什麼要有這一步

引用數、反向連結、錯誤檢查在 remark plugin、`workbench.ts`、dev-api 三處都要用。先把「讀原始碼 → 每篇的 defines／includes／refs」做成純函式並鎖上斷言，再做一個三處共用的單例，後面的 Task 只負責輸出與 UI。

## 範圍

### 1. `src/lib/defs-scan.ts`（新增，純函式）

只能 `import type`（或帶副檔名的相對 import，例如 `./note-text.ts`）、無 JSX、不碰 `node:*`。

```ts
export interface ScanDefine { id: string; label: string; line: number; start: number; end: number; components: number }
export interface ScanUse { id: string; line: number; inDefine: string | null }
export interface ScanError { line: number; message: string }
export interface ScanResult { defines: ScanDefine[]; includes: ScanUse[]; refs: ScanUse[]; errors: ScanError[] }

export function scanDefs(source: string): ScanResult;
export function isValidDefId(id: string): boolean;          // §2.2，允許中文（Q4）
export function suggestIds(id: string, all: readonly string[]): string[];   // 編輯距離 ≤2，最多 3 個
```

- 排除圍欄程式碼、MDX 註解（沿用 `note-text.ts` 的 `stripNonProse` 規則，行號要保留）、行內 code span
- define：容器 fence `:{3,}define{…}`，以冒號數配對收尾；`start`／`end` 是 define **內容**的 offset（不含 fence 行）
- label 依 §2.3：`label` 屬性（Q6）→ 內容第一個 `**粗體**` 的純文字 → id
- `components`：define 內區塊 JSX 的數量，連續的算一個（§2.5）
- `errors`：缺 id、格式不符、巢狀 define、define 不在最上層（Q7，前一個未收尾的容器 fence 不是 define）、define 內有 `import`／`export`、`include` 自己這篇的 define

### 2. `src/lib/defs-state.mjs`（新增，globalThis 單例）＋`.d.mts`

比照 `notes-ignore-state.mjs`：`globalThis[Symbol.for("notecraft.defs")]`。

```ts
export function getDefIndex(): DefIndex;        // 走訪 notesDir（walkNotes）、掃描、彙整；以各檔 mtime＋size 當快取鍵
export function resetDefIndex(): void;          // dev integration 用（Task 127）
export function assertDefIndex(index: DefIndex): void;   // 有錯誤就 throw（彙整成一則訊息，列出全部錯誤）
```

- `DefIndex = { defs: Map<string, DefEntry>; byNote: Map<string /* slug */, { defines: string[]; references: { id; kinds }[] }>; errors: …; warnings: … }`
- 跨檔才看得出的錯誤在這裡判斷：id 重複、找不到 id（附 `suggestIds`）、循環嵌入、深度超過 4 層
- 反向連結依 §4.2 的五條規則計算並排序；「資料夾樹順序」與 `buildFolderTree` 同一套排序（`localeCompare(…, "zh-Hant")`）
- **git-ignored warn**（Q8）：在 git repo 內時，對「有被引用的 define 所在檔」批次執行一次 `git check-ignore --stdin`；引用端是已追蹤的檔、來源是 ignored → warn。不在 git repo、或 `git` 不存在 → 略過，不報錯
- 所有訊息只用 notesDir 相對路徑

### 3. 斷言 `scripts/checks/defs-scan.mjs`（新增）

| 斷言 | 內容 |
| --- | --- |
| 基本 | 3 種指令各一，位置、行號、id 正確 |
| 巢狀容器 | `::::define` 內含 `:::note`、`:::tabs`，收尾配對正確 |
| 排除 | 圍欄程式碼、MDX 註解、行內 code 裡的 `:ref`／`::include` 不算 |
| label | `label` 屬性優先；沒有就取第一個粗體；都沒有回 id |
| components | 區塊 JSX 計數；連續兩個算 1 |
| id 格式 | 中文 id 通過；空白、`..`、開頭 `.` 不通過 |
| 錯誤 | 巢狀 define、不在最上層、define 內 import、include 自己，各一組 |
| inDefine | define 內的 ref／include 記到該 define |
| 建議 | `hr.role-admn` 建議 `hr.role-admin` |
| 純度 | 原始碼不含非 `import type` 的 import、不含 `node:` |

另一支 `scripts/checks/defs-index.mjs` 以 fixture 目錄（`scripts/checks/fixtures/defs/`，非 `.mjs`，不會被當成檢查執行）測跨檔規則：重複、找不到、循環、深度、反向連結五條規則、排序。若 `defs-state.mjs` 依賴 `node:fs`，這支直接以 Node 執行即可。

### 4. `package.json`

- 新增 `check:defs`（帶 strip-types 旗標），串兩支斷言
- `check-plugins` 會自動跑到 `scripts/checks/*.mjs`，確認 fixture 子目錄不會被誤執行

### 5. 範例筆記（Q10，3 篇）

`src/content/notes/testing/define-ref/`，內容照規格 §14.1 的表。`hr.leave-chart` 內放一個現有的生成元件（例如 `rr-raci`），檔頭照常 import。

本 Task 只建檔；Task 127 之前，這些指令會被 `remarkNotecraftDirectives` 的安全網還原成字面文字（不會掉字、build 不會壞）。

## 要改的既有檔案

`package.json`。新增 `src/lib/defs-scan.ts`、`src/lib/defs-state.mjs`、`src/lib/defs-state.d.mts`、`scripts/checks/defs-scan.mjs`、`scripts/checks/defs-index.mjs`、`scripts/checks/fixtures/defs/`、範例筆記 3 篇。

**本 Task 不接進 build**（`assertDefIndex` 在 Task 127 才呼叫），站台行為除了多出 3 篇範例筆記以外沒有變化。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 斷言 | Node 22.6+ | `npm run check:defs` | 全綠 |
| 錯誤 | fixture 有重複 id、找不到 id、循環 | `defs-index.mjs` | 三種錯誤都被抓到，訊息含相對路徑與行號 |
| warn | 已追蹤的筆記引用 `private/` 的 define | `getDefIndex()` | 印一則 warn，不 throw |
| 範例 | 3 篇範例筆記 | `getDefIndex()` | 引用數符合規格 §14.1；`hr.term-carryover` 為 0 |
| 全套 | — | `npm run check-plugins` | 通過 |
| build | — | `npx tsc --noEmit && npx astro build` | 通過；tsc 錯誤數不增加 |

## 依賴

Task 125。

## 實作記錄（2026-10-07）

- **掃描器改成 `src/lib/defs-scan.mjs`＋`.d.mts`，不是 `.ts`**：dev-api 的 `handlers.mjs` 也被 CLI 以純 Node 載入（Task 130 的刪除提醒要用索引），不能 import `.ts`；與 `notes-ignore.mjs` 同理。檔案零 import，`check:defs` 斷言純度
- 斷言併成一支 `scripts/checks/defs.mjs`（22 項），跨檔規則以 `buildDefIndex(files)` 純函式加 inline fixture 測，不需要 `fixtures/defs/` 目錄
- `#id` 簡寫與 remark-directive 相同：遇到 `.` 就是 class 的開始，所以帶點的 id（`hr.role-admin`）只能寫 `id="…"`；斷言鎖住這個行為，規格 §2.1 要補註
- 循環偵測一開始只從筆記最上層的 include 出發，沒被引用的 define 互相 include 會漏掉；改成對每個 define 都走一次
- 掃描器多回傳 `h1`（給沒有 frontmatter title 的筆記當標題），斷言以現有全部筆記對照 `note-text.ts` 的 `firstH1`
- 需要 import 的元件只算大寫開頭或含 `.` 的 JSX；小寫 HTML 元素（`<br />`）不需要 import，嵌入時照常渲染
- 範例筆記 3 篇在 `testing/define-ref/`：7 個定義（含 0 篇引用的 `hr.term-carryover` 與含元件的 `hr.leave-raci`）
- git-ignored warn 以暫存檔實測：`testing/` 的筆記引用 `private/` 的定義時印出 warn
- 66 頁（+3 篇範例）；tsc 錯誤數 40 不變
