# Task 78 — `derive.ts`：資料推導、v1.1 相容規則、dev warn，與 `scripts/checks` 基礎

> 規格 [notecraft-er-docs.md](../notecraft-er-docs.md) §5.2、§5.3、§5.4、§8.2（比對函式）、§12.1；Q6、Q7 定案。
> 設計交付 README〈相容性要求〉第 1–5、8、10 條；prototype `er/er-core.jsx › erDerive`。
> 依賴 [Task 77](task-77-er-split-files.md)。

## 範圍

### 1. `derive.ts`（純函式、零 runtime import）

`export function erDerive(data: ErDiagramData): ErDerived`，回傳：

| 欄位 | 規則 |
| --- | --- |
| `byName`、`groupByKey` | `Map` |
| `schemas`、`implicit` | `data.schemas` 非空 → 用它、`implicit=false`；否則 `[{ key: '_all', label: '全部' }]`、`implicit=true` |
| `schemaOfGroup(g)` | `groups[g].schema` 存在且對得到 → 它；否則 `schemas[0].key` |
| `schemaOfTable(t)` | `schemaOfGroup(table.group)` |
| `orphanGroups` | `schema` 缺漏**或**指向不存在 key 的 group key 清單。**只在 `implicit=false` 時**才算 |
| `ungroupedTables` | `group` 指向不存在 group 的表名清單。推導時歸入 `schemas[0]` 底下的虛擬分群 `{ key: '__ungrouped', label: '未分群' }`（排在該 schema 最後） |
| `edges` | 同 v1.1：`columns[].fk` 且父表存在；`{ id: 'table.col', child, parent, col, self }` |
| `parentsOf(n)`／`childrenOf(n)` | 排除自我參照的 edge 陣列 |
| `parentTables(n)`／`childTables(n)` | **以表名去重**、依 `tables[]` 原順序的表名陣列（UI 的「N 張父表」、局部關聯圖、Schema 頁的父／子欄都用它） |
| `tree` | schema → group（依 `layout.columns` 出現順序；沒出現在 layout 的 group 接在最後、依 `groups[]` 原順序）→ table（依 `tables[]` 原順序） |
| `linkTargets` | `{ tables: Set<string>; schemas: Set<string> }`，隱含模式下 `schemas` 為空集合（不含 `_all`） |

另外匯出 `matchTable(table, query)`：表名、表 label、欄位名，不分大小寫；回傳 `{ hit: boolean; byName: boolean; columns: string[] }`。
**導覽篩選（Task 80）與 Diagram 搜尋（Task 83）共用這一支**（Q7）。本 Task 同時把 `diagram.tsx` 現有的搜尋比對改為呼叫它 —— 結果必須與 v1.1 完全一致（v1.1 也是比表名、label、欄位名）。

`derive.ts` 只能有 `import type`（見 §12.1 限制）。

### 2. dev 模式 warn（§5.4）

放在 `renderer.tsx`（不是 `derive.ts`，後者保持純函式）：

- `useEffect` 內印，SSR 不印
- 判定：`import.meta.env?.DEV`
- 模組層 `const warned = new Set<string>()`，以 `file.path` 為 key，同頁多個內嵌、HMR 重掛都只印一次
- 內容（有才印，兩則各自獨立）：
  - `[er-diagram-renderer] <file.path>：N 個 group 的 schema 缺漏或無效，已歸入 "<schemas[0].key>"：a, b, c`
  - `[er-diagram-renderer] <file.path>：N 張表的 group 不存在，已歸入「未分群」：x, y`
- **不 throw**

### 3. `scripts/checks/` 與串接

- 新增 `scripts/checks/er-derive.mjs`：`import { erDerive, matchTable } from '../../plugins/er-diagram-renderer/derive.ts'`，以 `node:assert/strict` 斷言；讀兩份範例 JSON 當輸入
- 執行需 `--experimental-strip-types`（**Node 22.6+**；22.18+ 已預設開啟，照樣帶上以相容 22.6–22.17）。注意 `package.json` 的 `engines.node` 是 `>=22.0.0`：這只影響維護者跑 `check-plugins`／`prepublishOnly`，不影響使用者安裝 app，因此**不改 `engines`**；改在 `check-plugins` 開頭檢查 `process.versions.node` < 22.6 時印明確錯誤並結束，而不是讓 Node 丟「bad option」
- `scripts/check-plugins.mjs`：manifest／schema 驗證之後、build 之前，依序以 `spawnSync(process.execPath, ['--experimental-strip-types', file])` 執行 `scripts/checks/*.mjs`，任一非零即 fail；`--skip-build` **不**略過它們
- `package.json` 加 `"check:er": "node --experimental-strip-types scripts/checks/er-derive.mjs"`（Task 79 會把 markdown 那支也加進來）
- `scripts/` 不在 npm 套件的 `files` 內，不會隨 npm 發佈 —— 確認一次

### 4. 斷言清單

| # | 輸入 | 期望 |
| --- | --- | --- |
| ① | `schema.v1.1.json` | `implicit=true`；`tree` 只有 `_all`；`orphanGroups=[]`；`linkTargets.schemas` 為空 |
| ② | `schema.json`（v1.2） | 3 個 schema；每個 schema 下的 group 順序與 `layout.columns` 一致 |
| ③ | v1.2，刪掉某 group 的 `schema` | 該 group 歸 `schemas[0]`；`orphanGroups` 含它 |
| ④ | v1.2，某 group 的 `schema` 改成 `"nope"` | 同 ③ |
| ⑤ | 一張表有自我參照 fk | `parentsOf`／`childrenOf` 不含它；`edges` 含它且 `self=true` |
| ⑥ | 一張表兩個欄位指向同一父表 | `parentsOf` 長度 2、`parentTables` 長度 1 |
| ⑦ | 表的 `group` 指向不存在的 key | 出現在 `ungroupedTables`，且在 `tree` 的 `__ungrouped` 分群下 |
| ⑧ | 有 group 沒出現在 `layout.columns` | 在該 schema 的 group 清單最後 |
| ⑨ | `matchTable` | 表名、label、欄位名各命中一次；大小寫不同仍命中；只因欄位命中時 `byName=false` 且 `columns` 列出命中欄 |
| ⑩ | 有 `schemas`、但某 schema 底下 0 個 group | `tree` 仍列出該 schema，`groups=[]` |

## 要改的既有檔案

新增 `plugins/er-diagram-renderer/derive.ts`、`scripts/checks/er-derive.mjs`；改 `diagram.tsx`（搜尋改用 `matchTable`）、`renderer.tsx`（warn）、`scripts/check-plugins.mjs`、`package.json`、`plugins/registry.json`（`files` 補 `derive.ts`）。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 斷言全過 | — | `npm run check:er` | 10 項通過，結束碼 0 |
| 串進護欄 | 故意把 ① 的期望改錯 | `npm run check-plugins -- --skip-build` | fail，且指出是 `er-derive.mjs` |
| Diagram 搜尋無回歸 | `/view/schema-demo.er` | 搜尋 `customer`、`_id`、`客戶` | 命中數與 Task 77 完成時相同 |
| warn 一次 | dev；在一份 v1.2 測試資料刪掉某 group 的 `schema` | 開該 `/view` 頁，再 HMR 存檔一次 | console 只有一則 warn，列出該 group |
| 正式環境不印 | 同上資料 | `npm run build && npm run preview` | 無 warn |
| v1.1 無 warn | `schema-demo.er` | dev 開頁 | 無 warn |

## 依賴

Task 77。

## 實作記錄（2026-09-27）

- `derive.ts` 另匯出 `IMPLICIT_SCHEMA_KEY`／`UNGROUPED_KEY`；`scripts/checks/er-derive.mjs` 10 項斷言全過
- `check-plugins` 開頭檢查 Node ≥ 22.6，並以 `--disable-warning=ExperimentalWarning` 執行 checks
- 新增 v1.2 測試資料檔 `src/content/notes/testing/er-v12.er.json`（後續 Task 驗收共用）；dev warn 實測只印一次
