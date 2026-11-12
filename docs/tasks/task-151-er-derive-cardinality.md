# Task 151 — `derive.ts`：FK 正規化、nullable、唯一鍵、多重性、中間表、診斷

> 規格 [notecraft-er-cardinality.md](../notecraft-er-cardinality.md) §4、§11.1；Q1、Q2、Q3、Q5、Q6、Q7、Q9 定案。
> 依賴 [Task 150](task-150-er-diagram-edges-refactor.md)。

## 範圍

全部在 `derive.ts`，維持**純函式、只有 `import type`**（`scripts/checks` 以 Node strip-types 直接載入）。畫面本 Task 不改，只確認新推導不讓既有畫面壞掉。

### 1. 型別（`types.ts`，§4.1）

- `Edge` 改為：`id`、`child`、`parent`、`cols`、`refCols`（`string[] | null`）、`col`（= `cols.join(', ')`，保留給既有程式碼）、`self`、`card`、`cardFrom`、`optional`、`name?`、`note?`、`origin`
- 新增 `ErJunction`、`ErDiagnosticCode`、`ErDiagnostic`
- `ErDerived`（在 `derive.ts`）新增 `pkOf`、`uniqueKeysOf`、`fksOfColumn`、`junctions`、`manyToManyOf`、`diagnostics`

### 2. FK 正規化（§4.2）

依序：表層 `foreignKeys[]` → 欄位層 `fk`。

| 規則 | 內容 |
| --- | --- |
| `fk` 解析（Q5） | 整串剛好是表名 → 參照該表的 PK；否則從**最後一個** `.` 切開成表與欄位 |
| 表層與欄位層重複 | 表層有 `columns` 剛好是 `[這一欄]` 的 FK → 略過欄位層；兩邊目標不同時記 `fk-duplicate` |
| 父表不存在 | 記 `fk-missing-table`，**不產生 edge**（同 v1.2） |
| 參照欄位 | `references.columns` → 簡寫的欄位名 → 父表 PK；都沒有時 `refCols = null`、記 `ref-no-pk`，線照畫 |
| 檢查（只記診斷） | `fk-missing-column`、`ref-missing-column`、`fk-arity`、`ref-not-unique`（參照欄位集合不等於父表任何唯一鍵） |
| 完全重複 | 只留第一條，記 `fk-duplicate` |
| 疑似拆開的複合 FK（Q6） | 同表多條單欄 FK 指向同一父表、參照欄位合起來剛好是父表的複合 PK → 記 `fk-maybe-composite`，**收掉這幾條各自的 `ref-not-unique`**；不合併 |

edge id：欄位層 `${child}.${col}`（與 v1.2 相同）；表層 `${child}.fk:${name ?? columns.join('+')}`。

### 3. nullable、唯一鍵、多重性（§4.3、§4.4）

- `nullable(c) = c.nullable ?? requirement[c.required].nullable ?? false`（Q1）
- 唯一鍵：PK（全部 `pk: true` 的欄位，依欄位順序，非空時算一組）、每個 `unique: true` 的欄位、每個 `indexes[].unique`
- 父端：任一 FK 欄位 nullable → `zero-or-one`，否則 `one`
- 子端：存在唯一鍵 U ⊆ FK 欄位集合 → `zero-or-one`，否則 `zero-or-many`
- `cardinality.parent`／`child` 明確寫的優先，**與約束矛盾也照用、不發診斷**（Q3）；`cardFrom` 記來源
- 子表欄位不存在時，該欄當作不可為 null

### 4. 中間表（§4.5、Q9）

- 自動判斷：剛好兩條 FK、兩者欄位聯集**等於**某個唯一鍵、兩條父端都是 `one`；額外欄位不影響
- `junction: false` → 不算；`junction: true`：剛好兩條但條件 2 不成立 → 照算、記 `junction-not-unique`；不是剛好兩條 → 不算、記 `junction-invalid`
- `ErJunction.auto` = 資料沒寫 `junction: true`
- `manyToManyOf(t)`：`t` 是 `a.parent` 或 `b.parent` 的中間表

### 5. 其他推導

- `parentsOf`／`childrenOf`／`parentTables`／`childTables` 語意不變
- `fksOfColumn(t, c)`：`c` 在 `edge.cols` 裡的 edge（含複合）
- `diagnostics` 依資料順序

### 6. `scripts/checks/er-derive.mjs`（§11.1）

既有 10 項斷言照留（`v12()` 改讀 `example/schema.v1.2.json`，另加 `v13()` 讀 `example/schema.json`），新增：

| # | 斷言 |
| --- | --- |
| ⑪ | v1.1、v1.2 範例：每條 edge 父端 `one`；子端除 FK 本身是唯一鍵者外都是 `zero-or-many`；edge 數、`id` 與 v1.2 相同；v1.1 的 `contract.sign_item_id` 子端是 `zero-or-one`（Q7） |
| ⑫ | nullable 優先序：欄位 > 語彙 > false |
| ⑬ | 子端：FK = PK、FK 有單欄 unique、FK 包含複合唯一鍵 → `zero-or-one`；FK 只是複合唯一鍵的一部分 → `zero-or-many` |
| ⑭ | 明確覆寫：只寫一端、兩端都寫、與約束矛盾都照用；`cardFrom` 正確 |
| ⑮ | `fk` 簡寫：`"t"`、`"t.c"`、表名本身含 `.`；與表層重複時表層優先 |
| ⑯ | 參照欄位：省略時用 PK、複合 PK、參照 unique 欄位 |
| ⑰ | 中間表：PK 與 unique 兩種成立、帶額外欄位、自我多對多、FK 可為 null 時不成立、`junction: false`、`junction: true` 但條件不成立 |
| ⑱ | 診斷：v1.3 範例**零診斷**；10 種代碼各一份刻意寫壞的資料，且 `fk-maybe-composite` 不連帶 `ref-not-unique` |
| ⑲ | v1.3 範例：`case_member` 是中間表、`delivery` 是一條複合 FK、`option_item → option_type` 的 `refCols` 是 `["code"]`、`contract_item → contract` 子端是 `one-or-many`、`customer_profile` 與 `contract.quotation_id` 是 1:1 |

## 要改的既有檔案

`plugins/er-diagram-renderer/types.ts`、`derive.ts`；`scripts/checks/er-derive.mjs`。編譯錯誤需要時才最小幅度調整 `diagram.tsx`、`wiki.tsx`、`local-diagram.tsx`（例如型別名稱），**不改行為**。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 斷言 | — | `npm run check:er` | ①–⑲ 全過 |
| 護欄 | — | `npm run check-plugins` | 通過 |
| 型別 | — | `npx tsc --noEmit` | 錯誤數不增加 |
| 只有 `import type` | — | `grep -n "^import" derive.ts types.ts` | 只有 `import type` |
| 既有畫面 | v1.2 範例 | dev 開 Diagram、Wiki | 與 Task 150 完成時相同（多重性還沒畫） |
| v1.3 範例 | — | dev 開 Diagram | `option_item → option_type`、`delivery → contract_item` 的線出現了（Task 149 時缺） |

## 依賴

Task 150。

## 實作記錄（2026-11-12）

- `derive.ts` 新增 `deriveKeys`／`deriveEdges`／`deriveJunctions` 三支內部函式，另匯出 `parseFkRef`；仍只有 `import type`
- edge id 若撞名（例：兩條表層 FK 同欄位、沒寫 `name`），後者加 `#2`、`#3`，避免 React key 重複
- `ref-not-unique` 只在參照欄位都存在、欄數也對得上時才判斷，避免同一個錯誤同時報 `fk-arity`／`ref-missing-column` 又報一次
- 中間表的判斷條件 3 用推導後的 `card.parent === 'one'`（明確指定 `parent: one` 也算）
- `er-derive.mjs`：`v12()` 改讀 `example/schema.v1.2.json`、新增 `v13()`；斷言 ⑪–⑲ 用小型合成資料逐條驗規則，⑪ 另以舊算法逐條比對 v1.1、v1.2 範例的 edge id
- v1.3 範例：35 條外鍵、1 張中間表（`case_member`）、零診斷。tsc 錯誤數維持 40
