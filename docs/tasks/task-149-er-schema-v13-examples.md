# Task 149 — 資料格式 v1.3：schema、型別、v1.2 範例保留與 v1.3 範例

> 規格 [notecraft-er-cardinality.md](../notecraft-er-cardinality.md) §3、§7.2、§8；Q1、Q2、Q4、Q11 定案。
> 第一個 Task，無依賴。

## 為什麼先做這一步

範例資料是之後每一步的回歸保護：v1.1、v1.2、v1.3 三份範例從第一個 commit 起就由 `check-plugins` 驗證、build。
本 Task **只動資料格式與型別，不動推導與畫面**，v1.2 的渲染結果必須完全不變。

## 範圍

### 1. 保留 v1.2 範例

- `example/schema.json` **原樣**複製成 `example/schema.v1.2.json`（`cp`，不經過格式化工具；之後一個欄位都不准改）
- `example/schema.v1.1.json` 不動

### 2. `schema.json`（§3.1、§3.3）

全部是選填新增，`additionalProperties: false` 維持，每個新屬性都要有 `description`：

| 位置 | 新屬性 |
| --- | --- |
| `requirement[]` | `nullable: boolean` |
| `tables[].columns[]` | `nullable: boolean`；`fk` 的 description 改為「`表名` 或 `表名.欄位名`」 |
| `tables[]` | `foreignKeys: ErForeignKey[]`（`name?`、`columns`（minItems 1、uniqueItems）、`references: { table, columns? }`、`cardinality?: { parent?, child? }`、`note?`） |
| `tables[]` | `indexes: ErIndex[]`（`name?`、`columns`（minItems 1、uniqueItems）、`unique?`、`note?`） |
| `tables[]` | `junction: boolean` |
| `options` | `collapseJunctions: boolean` |

`cardinality.parent` 的 enum 是 `one`／`zero-or-one`；`cardinality.child` 是 `zero-or-many`／`one-or-many`／`zero-or-one`／`one`。
頂層 `description` 補一句「v1.3 新增多重性、複合外鍵、索引與中間表（皆選填，v1.2 資料檔不改也合法）」。`$id` 不變。

### 3. `types.ts`（§3.2）

- 新增 `ErParentCardinality`、`ErChildCardinality`、`ErForeignKey`、`ErIndex`
- `ErColumn` 加 `nullable?`；`fk` 的註解改成「`表名` 或 `表名.欄位名`」
- `ErTable` 加 `foreignKeys?`、`indexes?`、`junction?`
- `ErDiagramData.requirement[]` 加 `nullable?`
- `ErOptions` 加 `collapseJunctions: boolean`，`DEFAULT_OPTIONS.collapseJunctions = false`
- **`Edge` 型別本 Task 不動**（Task 151 才改），只能有 `import type` 的規則照舊

### 4. v1.3 範例（§8）

改寫 `example/schema.json`，在現有 14 張表上調整並新增 `customer_profile`、`delivery`、`case_member`：

| 情況 | 寫法 |
| --- | --- |
| 語彙標 nullable | `requirement` 的 `nullable`、`condition` 加 `nullable: true` |
| 可選 FK | `contract.case_id → biz_case`（`required: "nullable"`） |
| 1:1（PK 就是 FK） | `customer_profile`：PK `customer_id`，`fk: "customer"` |
| 1:1（FK 有 unique） | `contract.quotation_id → quotation` 加 `unique: true`（一份報價最多成交一份合約；它本來就可為 null → 1:1（可選）） |
| 非 `id` 參照 | `option_item.type_code` 改 `fk: "option_type.code"` |
| 複合 PK | `contract_item` 加 `line_no`，PK 改 `(contract_id, line_no)`，拿掉原本的代理 `id` 或保留成一般欄位（擇一，寫進實作記錄） |
| 複合 FK | `delivery.foreignKeys: [{ columns: ["contract_id", "line_no"], references: { table: "contract_item" } }]` |
| 複合唯一鍵 | `option_item.indexes: [{ name: "uq_option_item_code", columns: ["type_code", "code"], unique: true }]`；拿掉 `code` 的單欄 `unique` |
| 明確多重性 | `contract_item` 的 `foreignKeys` 指向 `contract`，`cardinality: { child: "one-or-many" }` |
| 中間表（自動判斷） | `case_member`：PK `(case_id, employee_id)`、`role` 欄位；兩個 FK 都不可為 null |

- 新表放進既有的 group 與 schema；`layout.columns` 把 `case_member` 排在 `biz_case` 與 `employee` 所在欄之間
- 每張新表都寫 `description`（Markdown），說明它示範哪一種關聯
- `meta.description` 補一段「這份範例示範的關聯種類」
- **本 Task 結束時，v1.2 的推導會略過 `option_type.code` 這條 FK、也看不到表層 `foreignKeys`**：這是預期中的過渡狀態，Task 151 補上

### 5. registry

`plugins/registry.json` 的 er-diagram-renderer `files` 加 `example/schema.v1.2.json`。版號**不動**（Task 156 才升 1.3.0）。

## 要改的既有檔案

`plugins/er-diagram-renderer/schema.json`、`types.ts`、`example/schema.json`；新增 `example/schema.v1.2.json`；`plugins/registry.json`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 三份範例過 schema | — | `npm run check-plugins -- --skip-build` | 通過；v1.1、v1.2、v1.3 範例都用新的 `schema.json` 驗過 |
| 三份範例都能 build | — | `npm run check-plugins` | `配 3 份 example 資料 build 成功` |
| v1.2 範例原樣 | — | `git diff --no-index` 比對 `schema.v1.2.json` 與上一個 commit 的 `example/schema.json` | 完全相同 |
| 新欄位都有說明 | — | 以 script 掃 `schema.json` 中 v1.3 新增的每個 property | 都有 `description` |
| 型別 | — | `npx tsc --noEmit` | 錯誤數不增加 |
| 畫面不變 | dev 開 v1.2 範例 | 對照本 Task 前的截圖 | Diagram、Wiki 完全相同 |

## 依賴

無。
