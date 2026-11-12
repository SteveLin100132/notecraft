# Task 154 — Wiki 與 local diagram：參照欄位、多重性文字、多對多

> 規格 [notecraft-er-cardinality.md](../notecraft-er-cardinality.md) §4.7、§5.7、§6。
> 依賴 [Task 152](task-152-er-crowfoot-markers.md)（共用 `markers.tsx`）；可與 Task 153 並行。

## 範圍

### 1. 多重性文字（§6.1）

在 `wiki.tsx` 加一個純函式（或放 `derive.ts` 以便 `er-derive.mjs` 斷言，**擇一並記入實作記錄**）：

| 子端 × 父端 | 「參照」清單 | 「被參照」清單 |
| --- | --- | --- |
| many × `one` | N:1 | 1:N |
| many × `zero-or-one` | N:1（可選） | 1:N（可選） |
| `zero-or-one`／`one` × `one` | 1:1 | 1:1 |
| `zero-or-one`／`one` × `zero-or-one` | 1:1（可選） | 1:1（可選） |

- 子端 `one-or-many`／`one` 再加「至少一筆」
- 明確指定的（`cardFrom` 任一端 `explicit`）加「指定」小標
- hover（`title`）是完整句子：「每筆 customer 有 0..N 筆 contract；每筆 contract 對應 1 筆 customer」

### 2. Table 頁（§6.2）

| 區塊 | 內容 |
| --- | --- |
| 頁首資訊列 | 本表是中間表：「中間表：A ↔ B」，自動判斷的加「自動判斷」 |
| 欄位表說明欄 | `→ parent.refCol`（逐欄配對，取 `refCols[i]`）；複合 FK 加小標「複合 FK name」；`refCols` 為 null 時 `parent.?`；父表不存在時沿用現有灰色樣式（`erd-fkref--missing`）並顯示 `fk` 原字串 |
| 關聯清單 | 每列：`child.(cols)` → `parent.(refCols)` + 多重性文字 + 小標（自我參照、hub、複合、指定）+ `note` |
| 多對多 | 關聯清單下方新區塊：列出「B（經由 J）」，點了開 B；本表是中間表時改寫「連接 A 與 B」 |
| 索引與唯一鍵 | 改用推導：PK 一列（複合時「主鍵（複合）a, b」）、單欄 unique／index、`indexes[]` 每項一列（`name`、欄位組合、唯一或一般、`note`） |

移除 `wiki.tsx:357`、`:362`、`:388`、`:406` 寫死的 `.id`。

### 3. 總覽（§4.7、§6.3）

- 「N 條外鍵」= `D.edges.length`（複合 FK 算一條）
- 有中間表時多一格「M 組多對多」
- 語彙區塊標出 `nullable: true` 的必填性（例：「可空・資料庫可為 null」）

### 4. local diagram（§5.7）

- 寬版：節點仍每張表一個，**每條 FK 一條線**；同一對表多條 FK 時在節點中線上下各錯開 6px，最多 4 條，超過畫 1 條並在節點上標 `×N`；兩端 marker 用 `local` 色調（`ErMarkers` 以自己的 `uid`）
- 窄版（< 560px）：主幹不畫 marker，改在每個父／子表節點加多重性文字小標（`N:1`、`1:1`…；同一對表多條且不同時列第一條並加 `×N`）
- 本表是 M:N 的一端時，中間表節點加小標「M:N → B」
- 移除 `erd-la` marker

## 要改的既有檔案

`plugins/er-diagram-renderer/wiki.tsx`、`local-diagram.tsx`、`styles.ts`（可能還有 `derive.ts`、`scripts/checks/er-derive.mjs`）。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 非 id 參照 | v1.3 範例 | 開 `option_item` | 欄位表 `type_code → option_type.code`；索引區有 `uq_option_item_code (type_code, code)` |
| 複合 FK | — | 開 `delivery` | 兩欄各寫 `→ contract_item.contract_id`／`.line_no` 加「複合 FK」；關聯清單一列 |
| 多重性文字 | — | 開 `contract` | 參照：`customer` N:1、`biz_case` N:1（可選）、`quotation` 1:1（可選）；被參照：`contract_item` 1:N 至少一筆、指定 |
| 1:1 | — | 開 `customer_profile` | 參照 `customer` 1:1 |
| 多對多 | — | 開 `biz_case`、`case_member` | `biz_case` 有「employee（經由 case_member）」；`case_member` 頁首「中間表：biz_case ↔ employee・自動判斷」 |
| 複合 PK | — | 開 `contract_item` | 索引區「主鍵（複合）contract_id, line_no」 |
| 總覽 | — | 開總覽 | 外鍵數正確、「1 組多對多」、語彙標出可空 |
| local 寬版 | — | `contract` 的局部圖 | 每條 FK 一條線、兩端 marker 正確 |
| local 窄版 | 容器 < 560px | — | 節點有多重性小標、無 marker |
| v1.2 範例 | — | 開幾張表 | 參照欄位顯示仍是 `.id`、多重性文字合理（N:1）、沒有多對多區塊 |
| 父表不存在 | 一份 `fk` 指向不存在表的測試資料 | 開該表 | 欄位表灰色顯示原字串，關聯清單沒有那條 |
| 護欄 | — | `npx tsc --noEmit && npx astro build && npm run check-plugins` | 通過 |

## 依賴

Task 152。

## 實作記錄（2026-11-12）

- 多重性文字放在 `derive.ts`（`cardinalityText`、`colsLabel`），`er-derive.mjs` 加 ⑳ 斷言
- Wiki：新增 `FkRefs`（欄位表的逐欄參照，複合外鍵加「複合外鍵 name」）與 `RelRow`（參照／被參照清單）；多對多區塊；頁首「中間表：A ↔ B（自動判斷）」；索引與唯一鍵改用推導（複合主鍵一列、`indexes[]` 每項一列）；總覽「N 組多對多」、語彙標「資料庫可為 null」
- **「至少一筆」只出現在被參照清單**：它描述的是父表那一側，放在子表的參照清單裡容易被讀成反方向（實測 `contract_item` 頁時發現）
- local diagram 與規格的差異：
  - **節點上一律寫多重性文字**（規格原本只在窄版寫）
  - 寬版的線在本表共用出發點，同一側的符號不一致時（例：`contract` 對 `quotation` 是 1:1、對其他父表是 N:1），疊在一起會變成誤導的組合符號，所以**那一側不畫 marker**，改看節點文字；遠端（父表／子表節點）的 marker 照畫
  - 同一對表多條外鍵時，節點一律標 `×N`（規格原本只在超過 4 條時標）
- 實測：`delivery`（複合外鍵逐欄配對）、`option_item`（`option_type.code`、複合唯一鍵 `uq_option_item_code`）、`case_member`（中間表）、`biz_case`（多對多 employee、`case_member` 節點標「M:N → employee」）、`contract_item`（複合主鍵）、窄版 375px（`.erd-local--v`、無 marker、節點有文字）
