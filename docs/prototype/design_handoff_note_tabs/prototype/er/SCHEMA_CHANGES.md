# schema.json v1.2 提案：Wiki 與 schemas 層

全部為**選填**新增，v1.1 的資料檔不改也能跑（沒有 `schemas` 時，全部 group 歸在單一「全部」下）。

## 新增欄位

| 位置 | 欄位 | 型別 | 說明 |
|---|---|---|---|
| 頂層 | `schemas[]` | `{ key, label, description? }` | 導覽第一層。順序即導覽順序 |
| `meta` | `description` | string (Markdown) | 原本就有；改為允許 Markdown，作為 Wiki 總覽頁內文 |
| `groups[]` | `schema` | string | 對應 `schemas[].key`；沒寫則歸第一個 schema |
| `groups[]` | `description` | string (Markdown) | Schema 頁該分群標題下的說明 |
| `tables[]` | `description` | string (Markdown) | Table Wiki 頁的表說明 |

```jsonc
"schemas": [{ "key": "crm", "label": "客戶關係", "description": "客戶主檔與業務案件…" }],
"groups":  [{ "key": "customer", "label": "客戶", "schema": "crm", "description": "…" }],
"tables":  [{ "name": "customer", "label": "客戶主檔", "group": "customer", "description": "…", "columns": [] }]
```

JSON Schema 片段（加進 `properties`）：

```json
"schemas": { "type": "array", "items": { "type": "object", "required": ["key","label"], "additionalProperties": false,
  "properties": { "key": {"type":"string"}, "label": {"type":"string"}, "description": {"type":"string"} } } }
```
`groups.items.properties` 加 `"schema": {"type":"string"}, "description": {"type":"string"}`；
`tables.items.properties` 加 `"description": {"type":"string"}`。

## Markdown 支援範圍
`##`／`###` 標題、段落、`-`／`1.` 清單、`>` 引言、`**粗體**`、`` `code` ``、`[文字](url)`。
反引號內容若剛好是表名或 schema key，自動連到該頁 Wiki（例：`` `contract_item` ``）。

## 不存的東西
- 關聯仍由 `columns[].fk` 推導
- 索引／唯一鍵清單、衍生欄清單由欄位的 `pk`／`unique`／`index`／`derivation` 推導
- 每張表的父／子表數由 edges 推導
