---
Project Name: NoteCraft — ER Diagram Renderer v1.3（多重性、複合 FK、參照欄位、多對多）
文件類型: Design Document
文件版本: v1.0.0
開發模式: Waterfall
技術選型: 確定（沿用 plugin 既有技術棧：React + TypeScript + lucide-react，不新增 runtime 套件）
文件狀態: 已定案、待實作 —— §13 的 11 題已於 2026-11-12 逐題確認，全部採用建議；實作後回填見 §15
文件作者: 建宇
建立日期: 2026-11-12
更新日期: 2026-11-12
依賴文件: docs/notecraft-er-docs.md（v1.2 設計）、docs/notecraft-plugin-system.md、plugins/er-diagram-renderer/README.md
---

# ER Diagram Renderer v1.3 — 設計文件

補強官方 plugin `er-diagram-renderer`（v1.2.0 → 1.3.0）表達「資料表關聯」的能力：
**多重性**（crow's foot，畫在線的兩端）、**複合外鍵**、**參照欄位**（不再寫死 `id`）、**多對多**（中間表與收合開關）、**資料檢查**。

定位是**通用的 ER Diagram**：資料格式只用關聯式資料庫的通用概念（主鍵、外鍵、唯一約束、可否為 null、多重性、中間表），不帶任何 ORM、框架或資料庫產品的欄位或用語。資料可能是手寫的，也可能由工具從 DDL、migration 或 ORM 模型轉出來，所以格式必須**好手寫、也好用程式產生**。

> 本文的行號以 `feat/er-cardinality` 起點（main `232375f`）為準。
> **與本文不同之處以本文為準**；經過討論才定案的地方都標了 §13 的題號。

---

## 1. 這份文件要解決什麼

### 1.1 起點：現況問題核對

需求列了七個現況問題，逐一對照程式碼的結果：

| # | 問題 | 結論 | 位置 |
| :-- | :-- | :-- | :-- |
| 1 | edge 只有 `{ id, child, parent, col, self }`，每條線都是同一個三角箭頭 | 屬實 | `types.ts:108-114`；`diagram.tsx:686-691`（兩個三角 marker）、`:699`（只掛 `markerEnd`）；`local-diagram.tsx:155-160` |
| 2 | FK 上的 `unique` 只顯示 UQ，不會畫成 1:1；可為 null 的 FK 也不會畫成 0..1 | 屬實 | unique 只出現在徽章迴圈（`diagram.tsx:777-785`、`wiki.tsx:419-425`）；`derive.ts:78-88` 建 edge 時不看 unique 也不看 required；`required` 是自訂語彙（`types.ts:26-28`），`requirement[]` 沒有任何「可否為 null」的資訊（`schema.json:80-107`） |
| 3 | `fk` 只能寫父表名、只支援單欄 FK | 屬實 | `types.ts:31-32`、`schema.json:315-318`；`derive.ts:80-86` 一欄一條 edge |
| 4 | 參照的父表欄位寫死 `id` | 屬實，**範例資料裡就有一例** | `wiki.tsx:357`、`:362`、`:388`、`:406`。`example/schema.json` 的 `option_item.type_code → option_type`：`option_type` 的 PK 是 `id`，但 `type_code` 參照的其實是 `option_type.code`（unique），Wiki 卻顯示成 `option_type.id` |
| 5 | 多對多只看得到中間表的兩條 FK | 屬實 | 程式裡沒有中間表或 M:N 的概念 |
| 6 | FK 指向不存在的表時直接略過 | 大致屬實 | `derive.ts:80`、`diagram.tsx:105` 都直接過濾掉；`renderer.tsx:74-90` 的 dev 警告只涵蓋 orphan group 與未分群的表。**例外**：Wiki 欄位表（`wiki.tsx:359-364`）會把這種 FK 畫成灰色、title「父表不在這份資料檔裡」。`schema.json:317` 也把「略過」寫成既定行為 |
| 7 | 「參照／被參照」清單只列欄位配對 | 屬實 | `wiki.tsx:378-410` |

### 1.2 讀程式時另外發現的結構問題

這些不在需求的七條裡，但不處理就做不出需求要的效果：

| 問題 | 位置 | 影響 |
| :-- | :-- | :-- |
| **edge 有兩份推導** | `diagram.tsx:101-115` 不用 `D.edges`，自己由 `c.fk` 重算；`:85-92` 的跨 scope 計數也直接讀 `c.fk` | 複合 FK、多重性、中間表收合若只改 `derive.ts`，Diagram 不會跟著變 |
| **「這欄是不是 FK」直接讀 `c.fk`** | 卡片預設顯示欄（`diagram.tsx:136-137`）、FK 徽章（`c[f.key]` truthy，`:777`）、Wiki 欄位表 | 只出現在表層 `foreignKeys[]` 的欄位會沒有 FK 徽章、也不會預設顯示 |
| **marker 用 `fill` 畫** | `styles.ts:86-87` | crow's foot 是線條，要改用 stroke |
| **自我參照迴圈太小** | `diagram.tsx:381-394`：兩端只差 16px（`ay ± 8`） | 兩端各一個 crow's foot 會疊在一起 |
| **local diagram 每對表只畫一條線** | `derive.ts:94-95` 的 `parentTables`／`childTables` 會去重；窄版（`local-diagram.tsx:88-92`）整列共用一條主幹 | 同一對表的多條 FK 多重性不同時，現在的結構畫不出來 |
| **marker id 是文件層級** | `erd-arrow`、`erd-arrow-on`、`erd-la` | 同一頁有多個 ER 內嵌時，目前 marker 內容相同所以沒事；marker 種類變多後要加上實例前綴 |
| **圖例在窄寬度整個藏起來** | `styles.ts:351` | 多重性圖例不能只放工具列 |

### 1.3 目標

1. 線的兩端畫出 crow's foot（IE notation）；**不寫也有合理結果**（由 nullable、PK、唯一約束推導），寫了則以明確值為準
2. 支援複合 FK、參照父表 PK 以外的唯一鍵、複合 PK、複合唯一鍵
3. 中間表可以明確標示，也能自動判斷；Diagram 可以把中間表收合成 M:N
4. 資料裡的參照錯誤（表或欄位不存在、欄數對不上、參照的不是唯一鍵、中間表條件不成立）在 dev console 與 build log 都看得到，並由 repo 的 plugin 檢查流程把關
5. **v1.2 的資料檔不用修改就能正確渲染**

### 1.4 非目標

- `ON DELETE`／`ON UPDATE` 等參照動作（需求已移除）
- 三元以上的關聯（三組以上 FK 的表）收合成多邊關係
- 自動版面配置：版面仍由 `layout.columns` 決定
- 依多重性改變卡片排序或線的路徑
- Chen notation、UML 等其他表示法
- 改 `.notecraft/plugins.json` 的對應機制或 `PluginView` 的嵌入方式（需求限制）

---

## 2. 名詞

| 名詞 | 意思 |
| :-- | :-- |
| **子表**／**父表** | FK 所在的表是子表，被參照的表是父表（沿用 v1.2 用語） |
| **父端**／**子端** | 線靠父表的那一端／靠子表的那一端 |
| **父端多重性** | 「每一筆子資料對到幾筆父資料」：`one`（`\|\|`，恰好 1）或 `zero-or-one`（`o\|`，0 或 1） |
| **子端多重性** | 「每一筆父資料有幾筆子資料」：`zero-or-many`（`o<`）、`one-or-many`（`\|<`）、`zero-or-one`（`o\|`）、`one`（`\|\|`） |
| **唯一鍵** | PK（全部 `pk: true` 的欄位組成一組）、單欄 `unique: true`、`indexes[]` 裡 `unique: true` 的欄位組合 |
| **FK 群組** | 一條 FK 涉及的子表欄位集合；單欄 FK 只有一欄 |
| **參照欄位** | FK 在父表那一側對應的欄位，與子表欄位逐一配對 |
| **中間表** | 用兩組 FK 把兩張表連成多對多的表 |
| **收合／展開** | Diagram 的中間表顯示模式：收合時只畫一條 M:N 線，展開時照實際結構畫 |

> 「父端」「子端」很容易搞反：**父端的符號描述的是子資料那一側的數量限制**（每筆子資料對到幾筆父資料）。README 要用一張圖講清楚。

---

## 3. Schema v1.3

### 3.1 差異總覽

全部是**選填新增**，`additionalProperties: false` 維持，每個新欄位都有 `description`。`$id` 不變。

| 位置 | 新欄位 | 型別 | 用途 |
| :-- | :-- | :-- | :-- |
| `requirement[]` | `nullable` | `boolean` | 這個必填性語彙在資料庫層是否可為 null。欄位沒寫 `nullable` 時採用（§4.3） |
| `tables[].columns[]` | `nullable` | `boolean` | 這一欄是否可為 null；優先於語彙上的值 |
| `tables[].columns[].fk` | （語意擴充） | `string` | 可寫 `"表名"` 或 `"表名.欄位名"`（§4.2） |
| `tables[]` | `foreignKeys` | `ErForeignKey[]` | 表層 FK：複合 FK、指定參照欄位、覆寫多重性 |
| `tables[]` | `indexes` | `ErIndex[]` | 表層索引與唯一約束（含複合） |
| `tables[]` | `junction` | `boolean` | `true`：明確標示為中間表；`false`：關掉自動判斷；不寫：自動判斷 |
| `options` | `collapseJunctions` | `boolean` | Diagram 預設是否收合中間表（預設 `false`） |

> 表層唯一約束只用一個 `indexes[]` 陣列，以 `unique: true` 區分，不另開 `uniques[]`。需求提的 `uniques[]／indexes[]（{ name?, columns, unique? }）` 若拆兩個陣列，`uniques[]` 項目再帶 `unique?` 會重複（Q4）。

### 3.2 型別（`types.ts`）

```ts
/** 父端：每筆子資料對到幾筆父資料 */
export type ErParentCardinality = 'one' | 'zero-or-one'
/** 子端：每筆父資料有幾筆子資料 */
export type ErChildCardinality = 'zero-or-many' | 'one-or-many' | 'zero-or-one' | 'one'

export interface ErForeignKey {
  /** 約束名稱。顯示在 Wiki、也用於 edge id；不寫時以欄位名組合代替 */
  name?: string
  /** 子表（本表）上的欄位，順序與 references.columns 逐一配對 */
  columns: string[]
  references: {
    table: string
    /** 父表上的欄位。不寫時用父表的 PK（含複合 PK） */
    columns?: string[]
  }
  /** 明確指定的多重性，優先於推導結果；只寫一端時另一端照推導 */
  cardinality?: { parent?: ErParentCardinality; child?: ErChildCardinality }
  note?: string
}

export interface ErIndex {
  name?: string
  columns: string[]
  unique?: boolean
  note?: string
}

export interface ErColumn {
  /* v1.2 欄位… */
  /** "表名" 或 "表名.欄位名"：單欄 FK 的簡寫，內部轉成 foreignKeys（v1.3 起可帶欄位名） */
  fk?: string
  /** v1.3：是否可為 null。不寫時看 requirement[].nullable，再不行當作不可為 null */
  nullable?: boolean
}

export interface ErTable {
  /* v1.2 欄位… */
  foreignKeys?: ErForeignKey[]   // v1.3
  indexes?: ErIndex[]            // v1.3
  junction?: boolean             // v1.3
}

export interface ErDiagramData {
  /* v1.2 欄位… */
  requirement: { key: string; label: string; marker: string; title?: string; nullable?: boolean }[]
}

export interface ErOptions {
  /* v1.2 欄位… */
  collapseJunctions: boolean     // v1.3，DEFAULT_OPTIONS 為 false
}
```

### 3.3 `schema.json` 片段

```jsonc
"foreignKeys": {
  "type": "array",
  "description": "表層外鍵（v1.3）。複合外鍵、參照父表 PK 以外的唯一鍵、或要明確指定多重性時使用；單欄外鍵也可以只在欄位上寫 fk。",
  "items": {
    "type": "object",
    "required": ["columns", "references"],
    "additionalProperties": false,
    "properties": {
      "name":    { "type": "string", "description": "約束名稱，顯示在 Wiki" },
      "columns": { "type": "array", "minItems": 1, "uniqueItems": true, "items": { "type": "string" },
                   "description": "本表的欄位，順序與 references.columns 逐一配對" },
      "references": {
        "type": "object", "required": ["table"], "additionalProperties": false,
        "description": "被參照的父表與欄位",
        "properties": {
          "table":   { "type": "string", "description": "父表名" },
          "columns": { "type": "array", "minItems": 1, "items": { "type": "string" },
                       "description": "父表上被參照的欄位，必須是父表的 PK 或唯一鍵。不寫時用父表的 PK（含複合 PK）" }
        }
      },
      "cardinality": {
        "type": "object", "additionalProperties": false,
        "description": "明確指定的多重性，優先於推導結果。只寫一端時另一端照推導",
        "properties": {
          "parent": { "enum": ["one", "zero-or-one"], "description": "每筆子資料對到幾筆父資料" },
          "child":  { "enum": ["zero-or-many", "one-or-many", "zero-or-one", "one"], "description": "每筆父資料有幾筆子資料。one-or-many 與 one 無法由約束推導，只能在這裡寫" }
        }
      },
      "note": { "type": "string", "description": "說明，顯示在 Wiki 的關聯清單" }
    }
  }
}
```

`indexes`、`junction`、`nullable`、`collapseJunctions` 依 §3.1 的型別照寫；`fk` 的 `description` 改為「單欄外鍵的簡寫：寫 `表名` 時參照父表 PK，寫 `表名.欄位名` 時參照指定欄位。指向不存在的表時不畫線，並在開發模式與 build log 提示」。

---

## 4. 推導規則（`derive.ts`）

推導仍是純函式、只有 `import type`（`scripts/checks` 要以 Node strip-types 直接載入）。所有畫面只讀推導結果，**不再自己讀 `c.fk`**。

### 4.1 推導結果的新型別

```ts
export interface Edge {
  /** 單欄簡寫：`${child}.${col}`（與 v1.2 相同，React key 不變）；表層：`${child}.fk:${name ?? columns.join('+')}` */
  id: string
  child: string
  parent: string
  /** 子表欄位 */
  cols: string[]
  /** 父表欄位；解析不出來時是 null（父表沒有 PK、又沒寫 references.columns） */
  refCols: string[] | null
  /** 顯示用：cols.join(', ')。保留 v1.2 的欄位名，既有程式碼不必全改 */
  col: string
  self: boolean
  card: { parent: ErParentCardinality; child: ErChildCardinality }
  /** 各端是明確指定還是推導來的；Wiki 會標出「指定」 */
  cardFrom: { parent: 'explicit' | 'derived'; child: 'explicit' | 'derived' }
  /** 任一 FK 欄位可為 null */
  optional: boolean
  name?: string
  note?: string
  origin: 'column' | 'table'
}

export interface ErJunction {
  table: string
  /** 兩條 FK；a 在前，順序依資料 */
  a: Edge
  b: Edge
  /** 自動判斷出來的（資料沒寫 junction: true） */
  auto: boolean
}

export type ErDiagnosticCode =
  | 'fk-missing-table' | 'fk-missing-column' | 'ref-missing-column'
  | 'fk-arity' | 'ref-no-pk' | 'ref-not-unique'
  | 'fk-duplicate' | 'fk-maybe-composite'
  | 'junction-invalid' | 'junction-not-unique'

export interface ErDiagnostic {
  code: ErDiagnosticCode
  table: string
  message: string
}

export interface ErDerived {
  /* v1.2 欄位… edges 改為上面的 Edge */
  /** 每張表的 PK 欄位（依欄位順序）；沒有時為空陣列 */
  pkOf: (table: string) => string[]
  /** 每張表的唯一鍵：PK、單欄 unique、indexes[].unique */
  uniqueKeysOf: (table: string) => string[][]
  /** 這一欄參與的 FK（含複合）；卡片徽章、預設顯示欄、Wiki 欄位表都看它 */
  fksOfColumn: (table: string, col: string) => Edge[]
  junctions: Map<string, ErJunction>
  /** 本表作為兩端之一的多對多 */
  manyToManyOf: (table: string) => ErJunction[]
  diagnostics: ErDiagnostic[]
}
```

### 4.2 FK 正規化

每張表依序處理，產出該表的 `Edge[]`：

1. **表層 `foreignKeys[]`**，依資料順序。
2. **欄位層 `fk`**，依欄位順序，轉成單欄 FK：
   - `"x"` 剛好是某張表的表名 → 參照該表，`references.columns` 不寫（用 PK）
   - 否則以**最後一個** `.` 切開：前段是表、後段是欄位。這樣 `crm.customer` 這種帶 schema 的表名，只要它真的是表名就不會被切開
   - 如果表層已有一條 FK 的 `columns` 剛好是 `[這一欄]`：以表層為準、略過欄位層；兩邊指向不同的父表或欄位時記 `fk-duplicate`
3. **父表不存在** → 記 `fk-missing-table`，**不產生 edge**（與 v1.2 行為相同）。
4. **參照欄位**：`references.columns` → 欄位簡寫的欄位名 → 父表的 PK。三者都沒有（父表沒有 PK）時 `refCols = null`，記 `ref-no-pk`，線照畫。
5. **檢查**（只記診斷，不影響畫線）：
   - 子表欄位不存在 → `fk-missing-column`
   - 參照欄位在父表不存在 → `ref-missing-column`
   - 兩邊欄數不同 → `fk-arity`
   - 參照欄位的集合**不等於**父表的任何唯一鍵 → `ref-not-unique`（資料庫本來就不允許 FK 指向非唯一鍵）
6. **完全重複**（子欄位、父表、參照欄位都一樣）→ 只留第一條，記 `fk-duplicate`。
7. **疑似拆開的複合 FK**：同一張表有兩條以上的單欄 FK 指向同一張父表，而且它們的參照欄位合起來剛好等於父表的複合 PK → 記 `fk-maybe-composite`（「這幾欄可能是一條複合 FK，請改寫到 foreignKeys」）。**不自動合併**：同一對表之間本來就可能有兩條獨立的 FK。這幾條各自的 `ref-not-unique`（單看一欄並不唯一）不另外列出，只留 `fk-maybe-composite` 一則，避免同一個錯誤出現三次。

### 4.3 nullable

```
nullable(欄位) = 欄位.nullable
              ?? requirement[欄位.required].nullable
              ?? false
```

- 欄位上的值優先：從 DDL 轉出來的資料每欄都有 NOT NULL 資訊，逐欄寫最直接
- 語彙上的值是手寫時的捷徑：範例的 `nullable`、`condition`（條件必填，資料庫層其實可為 null）各標一次即可
- 兩處都沒寫時當作**不可為 null**，所以 v1.2 的資料父端一律顯示 `one`，符合相容要求
- **不靠語彙的 key 名稱猜**（例如看到 `"nullable"` 就當可為 null）：語彙是使用者自訂的，猜錯比不猜更糟

### 4.4 多重性

設 FK 群組為 S（子表欄位集合），子表的唯一鍵為 U₁…Uₙ：

| 端 | 推導 | 明確覆寫 |
| :-- | :-- | :-- |
| 父端 | S 中**任一欄** nullable → `zero-or-one`；否則 `one` | `cardinality.parent` |
| 子端 | 存在 Uᵢ ⊆ S → `zero-or-one`（1:1）；否則 `zero-or-many` | `cardinality.child`；`one-or-many`、`one` 只能明確寫 |

- 子端用「**包含**某個唯一鍵」而不是「等於」：unique(a) 而 FK 是 (a, b) 時，S 一樣唯一
- SQL 的 unique 允許多筆 NULL，但不影響結論：每筆父資料最多只會被一筆子資料參照
- 明確寫的值優先，**即使與約束矛盾也照畫**（例如沒有唯一鍵卻寫 `child: 'zero-or-one'`）：明確值代表作者的意圖，資料庫約束可能只是還沒補上。不另發警告
- `optional = 父端是 zero-or-one`，給 Wiki 文字用

### 4.5 中間表

**自動判斷**（資料沒寫 `junction`）三個條件都成立才算：

1. 這張表剛好有兩條 FK（不論指向哪裡，自我多對多也算）
2. 兩條 FK 的欄位聯集**等於**某個唯一鍵（PK 或 unique）
3. 兩條 FK 的父端都是 `one`（FK 欄位都不可為 null）

- 中間表帶有額外欄位（例如 `role`、`created_at`）**仍然算**：收合時卡片還在（§5.5），欄位不會消失
- `junction: false` → 一律不算
- `junction: true`：
  - 剛好兩條 FK、條件 2 不成立 → 照樣當中間表，記 `junction-not-unique`
  - 不是剛好兩條 FK → 不當中間表，記 `junction-invalid`

自動判斷可以涵蓋「兩組 FK 合成複合 PK」與「代理主鍵加上 unique(a, b)」這兩種常見寫法；後者以前做不到，所以需求放寬成「PK 或 unique」。

### 4.6 M:N 的多重性

收合後 A —— B 這條線兩端的符號，取自中間表 J 的兩條 FK：

- **B 端** = `edge(J→A).card.child`：每筆 A 有幾筆 J，也就是每筆 A 連到幾筆 B
- **A 端** = `edge(J→B).card.child`

兩條 FK 預設都是 `zero-or-many`，所以兩端都是 many；作者若在中間表的 FK 上寫了 `one-or-many`，收合後的線也會跟著顯示「至少一筆」。

### 4.7 父／子表計數與總覽數字

- `parentsOf`／`childrenOf`／`parentTables`／`childTables` 的語意不變（排除自我參照、以表名去重）
- 總覽的「N 條外鍵」= `edges.length`：**複合 FK 算一條**（v1.2 每欄一條）。v1.2 資料沒有複合 FK，數字不變
- 總覽多一格「M 組多對多」（`junctions.size`），沒有時不顯示

### 4.8 診斷輸出

| 時機 | 行為 |
| :-- | :-- |
| 瀏覽器、dev | 沿用 `renderer.tsx:74-90` 的位置與「每個 `file.path` 只印一次」，把診斷依代碼分組印在同一則 `console.warn` |
| SSR（build 與 dev 的伺服器端） | **新增**：`typeof window === 'undefined'` 時每個 `file.path` 印一次，做法與 openapi plugin 對 Swagger 2.0 的處理相同。用工具產生資料後直接 build 的人看不到 dev console，只看得到 build log（Q10） |
| 正式環境的瀏覽器 | 不印 |

**不讓 build 失敗**：v1.2 已把「指向不存在的表時略過」寫成既定行為，參照錯誤一律只提示。

訊息範例：

```
[er-diagram-renderer] erd/sales.er.json：3 個資料問題
- contract.case_id → biz_cases：父表不存在，這條外鍵不畫（fk-missing-table）
- delivery (contract_id, line_no) → contract_item (id)：欄數不同（fk-arity）
- case_member：標了 junction: true，但有 3 條外鍵，不當中間表處理（junction-invalid）
```

---

## 5. 畫法

### 5.1 marker 的形狀

線從子表畫到父表（`diagram.tsx:396-410`，x1 在子表、x2 在父表），所以**父端是 `markerEnd`、子端是 `markerStart`**。每個 marker 只畫一個朝向，起點端用 `orient="auto-start-reverse"` 自動翻轉。

座標系：`markerUnits="userSpaceOnUse"`（不隨線寬縮放，focus 時線變粗 marker 不會跟著變大），`viewBox="0 0 16 12"`，`refX=16 refY=6`。線從左邊進來，**x = 16 就是卡片邊緣**：

```
            卡片邊緣 →│
one           ──────┼─┼│        兩條直槓：x=10、x=13
zero-or-one   ────○──┼│         圓 cx=5 r=3，直槓 x=13
one-or-many   ───┼──<│          直槓 x=6；三叉 (9,6)→(16,1)、(9,6)→(16,6)、(9,6)→(16,11)
zero-or-many  ─○────<│          圓 cx=4 r=3；三叉同上
```

SVG（以 `one-or-many` 為例）：

```svg
<marker id="{uid}-one-or-many-base" viewBox="0 0 16 12" refX="16" refY="6"
        markerWidth="16" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
  <path d="M6 1 V11 M9 6 L16 1 M9 6 L16 6 M9 6 L16 11" />
</marker>
```

- 圓圈 `fill` 用畫布底色、`stroke` 用線色，蓋住穿過它的線
- 子端 `one` 與父端 `one` 是同一個形狀；子端 `zero-or-one` 與父端 `zero-or-one` 也是。實際只有 4 種形狀
- 三叉的寬度（y 1→11）比卡片的欄位列高小，接在卡片中線上不會出界

### 5.2 marker 的顏色與狀態

marker 的內容不是 `.erd-edge` 的子孫，吃不到 `.erd-edge--on path` 的規則，所以**每種「形狀 × 色調」各一個 marker**：

| 色調 | 用在 | 顏色 |
| :-- | :-- | :-- |
| `base` | 一般、`dim`、`off` 狀態 | `--blue-300`（`dim`／`off` 的淡化靠 path 自身的 `opacity`） |
| `on` | 聚焦、hover、搜尋命中 | `--orange-500` |
| `opt` | hub 邊（`erd-edge--opt`） | `--neutral-300`（v1.2 hub 邊的三角其實沿用藍色，順手修正） |
| `local` | local diagram | `--blue-400` |

4 種形狀 × 4 種色調 = 16 個 marker，由一個小元件 `<ErMarkers uid>` 用 map 產生。

- **`uid`**：`useId()` 去掉非英數字元後當前綴，避免同一頁多個內嵌互相引用到對方的 marker。`useId` 在 SSR 與 hydration 一致
- **待實作時確認**：`path` 的 `opacity` 是否連 marker 一起淡化。規格上 marker 屬於元素本身的繪製，Chrome／Safari／Firefox 都要實測；不行就把 `dim`／`off` 也做成獨立色調
- 不採用 `context-stroke`：可以省掉多份 marker，但各瀏覽器的支援程度不一

### 5.3 Diagram 的線

| 情境 | 畫法 |
| :-- | :-- |
| 一般 FK | 現有的貝茲曲線不變（兩端切線水平，marker 方向正確）；`markerStart` = 子端、`markerEnd` = 父端，依 `edgeState` 選色調 |
| 複合 FK | **一條線**；聚焦時中點的標籤是 `cols.join(', ')`（例：`contract_id, line_no`） |
| 自我參照 | 迴圈放大：`M x ay-14 C x+52 ay-14, x+52 ay+14, x ay+14`。兩端切線水平、間距 28px，可以容納兩個 12px 高的 marker |
| hub 邊 | 規則不變（預設收起、`opt` 色調）；兩端 marker 照畫 |
| 同一對表多條 FK | 照畫多條；v1.2 的兩條線會完全重疊，v1.3 依序把 `ay`／`by` 錯開 6px |

### 5.4 圖例

工具列的必填性圖例不動；**多重性圖例放在畫布右下、縮放鈕旁邊的「圖例」按鈕**，點開是一個小面板：

```
┌ 圖例 ─────────────────────────┐
│  ──┼┼   恰好一筆               │
│  ──○┼   零或一筆               │
│  ──┼<   一筆以上               │
│  ──○<   零或多筆               │
│  ─M:N─  多對多（中間表已收合）  │
└───────────────────────────────┘
```

- 每個圖示都是用同一組 marker 畫的 24px 短線，不另外做圖
- 放在畫布角落而不是工具列：工具列在窄寬度會隱藏圖例（`styles.ts:351`），畫布角落則一直都在
- Esc 會先關掉圖例面板（接上 `escapeRef` 的逐層退）

### 5.5 收合中間表

工具列多一個開關「收合 N 張中間表」，與 hub 開關並排；**這個範圍內有中間表時才顯示**。狀態放在外殼（`renderer.tsx`，與 `showHubEdges` 相同），初始值取 `opts.collapseJunctions`，切到 Wiki 再切回來會保留。

收合時：

- 中間表的卡片**縮成只剩標題列**（表名、label、一個 `M:N` 小標），不整張隱藏。整張隱藏會讓同欄底下的卡片往上移，使用者動過視角後畫面不會重新 fit，看起來像整張圖跳掉（Q8）
- 中間表的兩條 FK 不畫，改畫一條 A →（經過小卡）→ B 的線：
  - A 到小卡靠近 A 的那一側、小卡到 B 各是一段貝茲曲線，中間在小卡底下相連（SVG 在卡片底下，所以會被卡片蓋住）
  - A、B 在小卡同一側時，進出點上下錯開 6px
  - 兩端 marker 依 §4.6
- 自我多對多（A = B）：從 A 出發、經過小卡再回到 A

| 情境 | 收合時 |
| :-- | :-- |
| 聚焦 A | M:N 線亮起，B 與中間表算相關表、不淡化；聚焦列寫「與 B 多對多（經由 J）」 |
| 點小卡 | 聚焦中間表本身：暫時改畫它真正的兩條 FK，看得到實際結構 |
| 搜尋命中中間表的欄位 | 小卡高亮並顯示命中數，**不自動展開**（展開會改變版面） |
| scope | A、B、J 都在範圍內才畫 M:N 線；否則依原本兩條 FK 計入「跨 schema 連線」 |
| A 或 B 是 hub 表 | M:N 線跟著 hub 開關收起，色調用 `opt` |

展開時就是現在的樣子，只是兩端多了 marker。

**只影響 Diagram 主圖**：Wiki、local diagram、總覽數字一律照實際結構顯示。

### 5.6 卡片

| 項目 | 規則 |
| :-- | :-- |
| FK 徽章 | `fksOfColumn(t, c).length > 0` 就顯示，不再看 `c.fk`；hover 寫出參照目標（例：`→ contract_item.line_no（複合 FK）`） |
| PK 徽章 | 照舊每欄一個；複合 PK 時 title 寫「複合主鍵 (a, b)」 |
| UQ／IX 徽章 | 只看欄位上的 `unique`／`index`。**屬於複合唯一鍵的欄位不標 UQ**：單獨看那一欄並不唯一，標了會誤導 |
| 預設顯示的欄位 | PK 欄位加上所有參與 FK 的欄位（用 `fksOfColumn` 判斷），再補一般欄位到 `defaultRows` |

### 5.7 local diagram

- **寬版**：節點仍是每張表一個，但**每條 FK 一條線**。同一對表有多條 FK 時，線在節點中線上下各錯開 6px（最多畫 4 條，超過就畫 1 條並在節點上標 `×N`）。兩端 marker 用 `local` 色調
- **窄版**（上下三列）：維持整列一條主幹，不畫 marker；改在每個父／子表節點上加一個多重性文字小標（例如 `N:1`、`1:1`）。主幹是好幾條線共用的，畫上 marker 會表達錯
- 中間表照實際結構畫（中間表是子表）；本表是 M:N 的一端時，中間表節點加一個小標「M:N → B」

---

## 6. Wiki

### 6.1 多重性文字

清單裡的文字一律**從這一頁的表出發**來寫：

| 子端 × 父端 | 「參照」清單（本表是子表） | 「被參照」清單（本表是父表） |
| :-- | :-- | :-- |
| many × `one` | N:1 | 1:N |
| many × `zero-or-one` | N:1（可選） | 1:N（可選） |
| `zero-or-one`／`one` × `one` | 1:1 | 1:1 |
| `zero-or-one`／`one` × `zero-or-one` | 1:1（可選） | 1:1（可選） |
| 中間表收合的 M:N | M:N（經由 J） | — |

- 「（可選）」固定表示 **FK 可為 null**（父端是 `zero-or-one`）
- 子端是 `one-or-many` 或 `one` 時再加「至少一筆」
- 明確指定的值加一個「指定」小標，與推導來的區分
- hover 顯示完整句子：「每筆 customer 有 0..N 筆 contract；每筆 contract 對應 1 筆 customer」

### 6.2 Table 頁

| 區塊 | 變更 |
| :-- | :-- |
| 頁首資訊列 | 本表是中間表時加一格「中間表：A ↔ B」（自動判斷的加註「自動判斷」） |
| 欄位表的說明欄 | FK 參照改為 `→ parent.refCol`（逐欄配對）；複合 FK 在每一欄各寫自己配對的欄位，後面加小標 `複合 FK name`。`refCols` 為 null 時寫 `parent.?` |
| 關聯清單 | 每列：`child.(cols)` → `parent.(refCols)` + 多重性文字 + 小標（自我參照、hub、複合、指定）+ `note` |
| 多對多 | 關聯清單下方新增「多對多」區塊，列出「B（經由 J）」，點了開 B；本表是中間表時這個區塊改寫「連接 A 與 B」 |
| 索引與唯一鍵 | 改用推導結果：PK 一列（複合時「主鍵（複合）a, b」）、單欄 unique／index、`indexes[]` 每項一列（顯示 `name`、欄位組合、唯一或一般、`note`） |

### 6.3 總覽

統計列多「M 組多對多」（§4.7）。語彙區塊列出 `requirement[]` 時，標出 `nullable: true` 的項目（例如「可空・資料庫可為 null」），讓讀者知道多重性是怎麼推出來的。

---

## 7. 相容

### 7.1 v1.2 資料的呈現

| 項目 | v1.2 資料在 v1.3 的結果 |
| :-- | :-- |
| 能否通過 schema | 能：全部是選填新增 |
| 父端 | 一律 `one`（沒有 `nullable` 資訊就當作不可為 null） |
| 子端 | 預設 `zero-or-many`；FK 欄位本身有 `unique` 或剛好是 PK 時 `zero-or-one`。**這是需求預期的行為變化** |
| `fk` 寫表名 | 參照父表 PK；v1.2 資料的父表 PK 都叫 `id`，所以 Wiki 顯示不變 |
| 中間表 | v1.2 資料沒有複合唯一鍵，自動判斷幾乎不會成立；即使成立，Diagram 預設也是展開，只有 Wiki 多一行「多對多」 |
| 參照錯誤 | 以前沒有任何提示的地方，現在 dev console 與 build log 會出現警告 |

**範例資料的行為變化**：v1.1 範例的 `contract.sign_item_id`（`fk: option_item`、`unique: true`）會自動變成 1:1。這筆資料本身看起來不太合理，但它是相容測試資料，**不改**，在 README 註明這個變化（Q7）。

### 7.2 舊版範例

照 v1.1 的做法：

- 新增 `example/schema.v1.2.json`：目前的 `example/schema.json` **原樣**複製過去
- `example/schema.json` 改寫成 v1.3 範例（§8）
- 三份範例都用 **v1.3 的 `schema.json`** 驗證：`check-plugins.mjs:93-110` 本來就用同一份 schema 驗 `example/` 下的所有 `.json`

> 需求寫的「新、舊範例都能通過各自的 JSON Schema 驗證」跟現有流程不同：repo 裡沒有每個版本各自的 data schema，v1.1 範例目前就是用 v1.2 的 schema 驗。已定案採「全部用最新 schema 驗」，`check-plugins` 不改（Q11）。

### 7.3 舊版 app

plugin 沒有用到新的 app 功能，`engines.notecraftapp` 維持 `>=0.6.0`。

---

## 8. 範例資料（`example/schema.json` v1.3）

在現有 14 張表上調整並新增 3 張，涵蓋需求列出的每一種情況：

| 情況 | 範例 |
| :-- | :-- |
| 用語彙標 nullable | `requirement` 的 `nullable`、`condition` 加上 `nullable: true` |
| 可選 FK（N:1 可選） | `contract.case_id → biz_case`（nullable） |
| 1:1（PK 就是 FK） | 新增 `customer_profile`：PK `customer_id`，同時 `fk: "customer"` |
| 1:1（FK 有 unique） | `employee` 新增 `user_account_id`（unique、nullable）→ 1:1（可選） |
| 非 `id` 的參照欄位 | `option_item.type_code` 改成 `fk: "option_type.code"`（修正範例裡現有的錯誤） |
| 複合 PK | `contract_item` 的 PK 改為 `(contract_id, line_no)` |
| 複合 FK | 新增 `delivery`：`foreignKeys: [{ columns: ["contract_id", "line_no"], references: { table: "contract_item" } }]`（參照欄位不寫，示範用父表的複合 PK） |
| 複合唯一鍵 | `option_item.indexes: [{ name: "uq_option_item_code", columns: ["type_code", "code"], unique: true }]`；拿掉 `code` 欄位上原本的單欄 `unique` |
| 明確指定多重性 | `contract_item → contract` 寫 `cardinality: { child: "one-or-many" }`（每份合約至少一個項目） |
| 多對多（自動判斷） | 新增 `case_member`：PK `(case_id, employee_id)`，帶一個 `role` 欄位 → biz_case M:N employee |
| 自我參照 | `department.parent_id`（既有） |
| hub 表 | `option_item`（既有） |

`layout.columns` 把 `case_member` 放在 `biz_case` 與 `employee` 之間，收合後的 M:N 線才走得順。

---

## 9. README 與文件

README 要補：

- **v1.2 → v1.3 差異表**（同 §3.1）
- **推導規則表**（§4.3、§4.4、§4.5 精簡版）
- **圖例**：文字表格，加一張小 SVG（`.svg` 在 install 允許的副檔名清單裡）。不放 PNG 截圖：每次安裝 plugin 都會下載 README 的附件
- **「父端／子端」的對照圖**：避免搞反（§2）
- **在筆記裡內嵌**：`<PluginView src="erd/sales.er.json" />` 的寫法，`src` 的基準是 **notesDir**（與 `plugins.json` 的 `files` 相同，不是筆記檔所在的資料夾）；`options` 只影響這一處內嵌（例如 `options={{ collapseJunctions: true, canvasHeight: 640 }}`）
- **v1.1 範例 `sign_item_id` 的行為變化**（§7.1）

其他要同步的文件：

- `site/src/content/docs/guides/plugin-er.mdx`：官網的 ER plugin 指南，格式說明要跟著更新
- `CHANGELOG.md`：照 v1.1／v1.2 的慣例記一筆
- `CLAUDE.md` 的 Plugin System 段落：補一行 ER v1.3 的規則（推導只在 `derive.ts`、畫面不讀 `c.fk`）
- 本文 §15 實作後回填

---

## 10. 要改的檔案

| 檔案 | 改什麼 |
| :-- | :-- |
| `plugins/er-diagram-renderer/schema.json` | §3 的新欄位；`fk` 的 description |
| `plugins/er-diagram-renderer/types.ts` | §3.2、§4.1 的型別；`DEFAULT_OPTIONS.collapseJunctions` |
| `plugins/er-diagram-renderer/derive.ts` | §4 全部：FK 正規化、nullable、唯一鍵、多重性、中間表、診斷 |
| `plugins/er-diagram-renderer/diagram.tsx` | 改用 `D.edges`（拿掉自己的推導）；marker；自我參照迴圈；多條線錯開；圖例面板；收合中間表；卡片徽章與預設顯示欄 |
| `plugins/er-diagram-renderer/local-diagram.tsx` | 每條 FK 一條線、marker、窄版文字小標、中間表小標 |
| `plugins/er-diagram-renderer/wiki.tsx` | 參照欄位、多重性文字、多對多區塊、索引與唯一鍵、總覽統計 |
| `plugins/er-diagram-renderer/renderer.tsx` | 收合開關的 state；診斷輸出（dev 瀏覽器與 SSR） |
| `plugins/er-diagram-renderer/styles.ts` | marker 的 stroke／fill、圖例面板、收合小卡、多重性小標。**CSS 不可含 `< > & " '`** |
| 新增 `plugins/er-diagram-renderer/markers.tsx` | `<ErMarkers uid>` 與 marker id 的組法，Diagram 與 local diagram 共用 |
| `plugins/er-diagram-renderer/example/schema.json` | §8 |
| 新增 `plugins/er-diagram-renderer/example/schema.v1.2.json` | 目前的範例原樣保留 |
| `plugins/er-diagram-renderer/notecraft-plugin.json` | `version: 1.3.0` |
| `plugins/er-diagram-renderer/README.md` | §9 |
| `plugins/registry.json` | 版號、`files` 加 `markers.tsx`、`example/schema.v1.2.json`（以及 README 的 SVG） |
| `scripts/checks/er-derive.mjs` | §11.1 的斷言 |
| `site/src/content/docs/guides/plugin-er.mdx`、`CHANGELOG.md`、`CLAUDE.md` | §9 |

`nav.tsx`、`markdown*.ts(x)`、`scripts/check-plugins.mjs` 不需要改。

---

## 11. 驗證

### 11.1 自動化

`scripts/checks/er-derive.mjs`（由 `check-plugins` 串接執行，也可用 `npm run check:er` 單跑）新增：

| 斷言 | 內容 |
| :-- | :-- |
| 相容 | v1.1、v1.2 範例：每條 edge 父端都是 `one`；子端除了 FK 本身是唯一鍵的，都是 `zero-or-many`；edge 數與 v1.2 的推導相同；`id` 與 v1.2 相同；v1.1 的 `contract.sign_item_id` 子端是 `zero-or-one`（Q7） |
| nullable | 欄位 > 語彙 > 預設 false 的優先序 |
| 子端 | FK 等於 PK、FK 有單欄 unique、FK 包含複合唯一鍵、FK 只是複合唯一鍵的一部分（不算） |
| 明確覆寫 | 只寫一端、兩端都寫、與約束矛盾也照用 |
| `fk` 簡寫 | `"t"`、`"t.c"`、表名本身含 `.`；與表層 FK 重複時表層優先 |
| 參照欄位 | 省略時用 PK、複合 PK、參照 unique 欄位 |
| 中間表 | 自動判斷成立（PK、unique 兩種）、帶額外欄位、自我多對多、FK 可為 null 時不成立、`junction: false`、`junction: true` 但條件不成立 |
| M:N 多重性 | §4.6 的對應 |
| 診斷 | 官方 v1.3 範例的診斷是**零**；每種診斷代碼各一份刻意寫壞的資料 |

`er-styles.mjs` 已經會檢查新加的 CSS。

### 11.2 手動（瀏覽器）

- 用 `node scripts/check-plugins.mjs` 之外，另建一個 fixture 筆記資料夾：v1.3 範例放在 `erd/` 底下，一篇筆記用 `<PluginView src="erd/sales.er.json" />` 內嵌
- 用 notecraftapp build 後在瀏覽器看：
  - [ ] page 模式（`/view/...`）：Diagram 的五種 marker、聚焦、hover、搜尋、hub 開關、自我參照、複合 FK 的標籤、圖例面板、收合／展開中間表
  - [ ] embed 模式：同上，加上「展開全寬」與放大檢視（VizZoom）裡的 marker 位置
  - [ ] Wiki：`customer_profile`（1:1）、`contract`（可選、至少一筆）、`delivery`（複合 FK）、`option_item`（非 `id` 參照、複合唯一鍵）、`case_member`（中間表）、`biz_case`／`employee`（多對多區塊）
  - [ ] local diagram：寬版與窄版（< 560px）
  - [ ] v1.2 範例並排對照：除了兩端 marker，畫面沒有其他變化
  - [ ] 同一篇筆記放兩個 ER 內嵌：marker 沒有互相干擾
  - [ ] reload 沒有 hydration 警告；build log 只出現預期中的診斷
- 截圖附在回報裡

---

## 12. 實作階段

在 `feat/er-cardinality` 上依序 commit，每個 commit 都能 build。Task 編號從 **149** 開始。

| Task | 內容 | 章節 |
| :-- | :-- | :-- |
| 149 | 資料格式：`schema.json`、`types.ts`、`example/schema.v1.2.json`、v1.3 範例、registry `files` | §3、§7.2、§8 |
| 150 | `derive.ts`：FK 正規化、nullable、唯一鍵、多重性、中間表、診斷；`er-derive.mjs` 斷言 | §4、§11.1 |
| 151 | Diagram 改用 `D.edges`（**純重構、零行為變更**），並排截圖比對 | §1.2 |
| 152 | marker 與 Diagram 的線：兩端 marker、色調、自我參照迴圈、多條線錯開、卡片徽章、圖例面板 | §5.1–5.4、§5.6 |
| 153 | 收合中間表 | §5.5 |
| 154 | Wiki 與 local diagram | §5.7、§6 |
| 155 | 診斷輸出（dev 瀏覽器、SSR build log） | §4.8 |
| 156 | README、版號 1.3.0、registry、官網指南、CHANGELOG、CLAUDE.md、瀏覽器驗收、本文回填 | §9、§11.2 |

依賴：`149 → 150 → 151 → 152 → 153`；`154` 依賴 150（可與 151–153 並行）；`155` 依賴 150；`156` 最後。

**Task 151 刻意不改行為**：Diagram 是 v1.1 花最多時間調的部分，先把推導搬到 `derive.ts` 並確認畫面完全一樣，之後的 diff 才看得出是 marker 還是推導出了問題。

---

## 13. 待釐清問題

2026-11-12 逐題確認，**11 題全部採用建議**；各題保留未採用的替代方案供日後參考。

### Q1. nullable 寫在哪？ ✅ 已定案
**定案（2026-11-12）**：採用建議。欄位 `nullable` 與語彙 `requirement[].nullable` 都支援，優先序為「欄位 > 語彙 > 不可為 null」（§3.1、§4.3）。
未採用的替代：只放欄位上（手寫的人要每欄都寫）；只放語彙上（轉檔工具得先把每欄映射成語彙，也無法表達「必填語意相同、但可否為 null 不同」的欄位）。

### Q2. 多重性覆寫寫在哪？ ✅ 已定案
**定案（2026-11-12）**：採用建議。只能寫在表層 `foreignKeys[].cardinality: { parent?, child? }`，只寫一端時另一端照推導；欄位層 `fk` 維持單純字串（§3.2）。單欄 FK 要覆寫時就改寫到表層，欄位上的 `fk` 可以留著，由 §4.2 第 2 點的規則以表層為準。
未採用的替代：欄位上也能寫 `cardinality`（同一件事兩種寫法）；`fk` 可寫成物件（schema 變複雜，程式產生時要選形狀）。

### Q3. 明確值與約束矛盾時要不要警告？ ✅ 已定案
**定案（2026-11-12）**：採用建議。照明確值畫、不發警告（§4.4）；Wiki 以「指定」小標區分明確值與推導值（§6.1）。
未採用的替代：照畫但警告（刻意這樣寫的人每次 build 都會看到）；以約束為準（無法表達資料庫沒強制的業務規則）。

### Q4. 表層唯一約束用一個陣列還是兩個？ ✅ 已定案
**定案（2026-11-12）**：採用建議。只用 `indexes: [{ name?, columns, unique?, note? }]`，以 `unique: true` 區分唯一約束與一般索引；欄位上的 `unique`／`index` 繼續當單欄簡寫（§3.1、§3.2）。
未採用的替代：拆成 `uniques[]` 與 `indexes[]`（多一個頂層鍵）；只加 `uniques[]`（複合的一般索引無法表達）。

### Q5. `fk: "a.b"` 的解析 ✅ 已定案
**定案（2026-11-12）**：採用建議。整串剛好是表名就當表名（參照 PK）；否則從最後一個 `.` 切開，前段是表、後段是欄位（§4.2）。例：表有 `customer`、`crm.customer` 時，`"crm.customer"` → 表 `crm.customer`，`"crm.customer.code"` → `crm.customer` 的 `code`。
未採用的替代：一律從最後一個 `.` 切（帶點的表名會被誤切）；改用其他分隔符號（不如 `table.column` 直覺）。

### Q6. 疑似拆開的複合 FK 要不要自動合併？ ✅ 已定案
**定案（2026-11-12）**：採用建議。照寫法畫成多條線、不合併，只提示 `fk-maybe-composite`，並收掉同一批 FK 各自的 `ref-not-unique`（§4.2 第 7 點）。
未採用的替代：自動合併（正確資料也可能被誤併）；不合併也不提示（寫錯的人不會發現）。

### Q7. v1.1 範例的 `sign_item_id` 要不要改？ ✅ 已定案
**定案（2026-11-12）**：採用建議。v1.1 範例原樣保留，README 註明它會自動變成 1:1；`er-derive.mjs` 斷言這個結果（§7.1、§11.1）。
未採用的替代：拿掉 `unique`（相容測試資料就不再是當年的原樣）。

### Q8. 收合時中間表要整張隱藏還是縮成小卡？ ✅ 已定案
**定案（2026-11-12）**：採用建議。收合時中間表縮成只剩標題列的小卡（表名、label、`M:N` 小標），M:N 線從小卡經過；預設展開，可用 `options.collapseJunctions` 改成預設收合（§5.5）。
未採用的替代：整張隱藏（同欄卡片會往上移，中間表點不到、搜尋不到）；保留原卡片只淡化（收合後畫面幾乎沒變乾淨）。

### Q9. 中間表的自動判斷條件 ✅ 已定案
**定案（2026-11-12）**：採用建議。剛好兩條 FK、兩者欄位聯集等於某個唯一鍵（PK 或 unique）、兩條都不可為 null 才自動判斷；帶額外欄位仍算；`junction: false` 可關閉、`junction: true` 依 §4.5 處理。複合 PK 的中間表與「代理主鍵＋unique(a, b)」兩種寫法都涵蓋。
未採用的替代：不能有額外欄位（帶一個 `created_at` 就判斷不到）；不自動判斷（不寫就沒有多對多語意）。

### Q10. 診斷要不要也印在 build log？ ✅ 已定案
**定案（2026-11-12）**：採用建議。dev 時瀏覽器 console 每個檔案印一次；SSR（含 build）時也每個檔案印一次，比照 openapi plugin 對 Swagger 2.0 的做法；一律不讓 build 失敗。官方範例由 `er-derive.mjs` 斷言零診斷（§4.8、§11.1）。
未採用的替代：只在 dev console（只跑 build 的人看不到）；嚴重問題讓 build 失敗（違反 v1.2「指向不存在的表時略過」的既定行為）。

### Q11. 「各自的 JSON Schema」 ✅ 已定案
**定案（2026-11-12）**：採用建議。照 v1.1 的做法新增 `example/schema.v1.2.json`（現有範例原樣複製），v1.1、v1.2、v1.3 三份範例都用 v1.3 的 `schema.json` 驗；`check-plugins` 不改（§7.2）。需求裡的「各自的 JSON Schema」以此解讀。
未採用的替代：另存舊版 data schema 並修改 `check-plugins`（動到 repo 流程，舊 schema 也會隨 store 發佈）；兩者都做（工作量最大）。

---

## 14. 風險

| 風險 | 影響 | 緩解 |
| :-- | :-- | :-- |
| 父端／子端搞反 | 圖上的符號整個顛倒，而且不容易一眼看出 | §2 的定義、§4.6 的對應都寫進 `er-derive.mjs` 斷言；README 加對照圖 |
| `path` 的 opacity 沒有連 marker 一起淡化 | 淡化的線兩端留著實心 marker，畫面很吵 | §5.2：實作時三種瀏覽器實測，不行就增加色調 |
| marker 在放大檢視（VizZoom）的 transform 下位置偏掉 | 兩端符號錯位 | `userSpaceOnUse` 跟著 SVG 座標走，理論上沒問題；§11.2 列為必看項目 |
| 收合後小卡改變版面高度 | 線的量測時機 | 與「展開全部 N 欄」同一條路徑（`measure` 的 deps 加上收合狀態） |
| 診斷在 build log 太吵 | 大型資料檔一次印幾十行 | 依代碼分組，每組最多列 10 筆，其餘寫「另有 N 筆」 |
| registry `files` 漏登記新檔 | 從 store 安裝的人拿到缺檔的 plugin | `check-plugins` 會比對；推上預設分支前一定要跑 |
| 官網指南忘了同步 | 官網格式說明與 plugin 不一致 | 列在 Task 156 |

---

## 15. 實作後回填

（實作完成後填寫：待驗證項的結論、實作中新增的決定、仍未做的。）
