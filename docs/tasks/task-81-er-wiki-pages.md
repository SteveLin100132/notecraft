# Task 81 — Wiki 三頁：總覽、Schema、Table（含空狀態與隱含模式）

> 規格 [notecraft-er-docs.md](../notecraft-er-docs.md) §5.3、§8.3；Q5（局部圖在 Task 82）。
> 設計交付 README〈Wiki：總覽頁〉〈Wiki：Schema 頁〉〈Wiki：Table 頁〉、相容性第 2、4、5 條；prototype `er/er-docs.jsx › ErOverview／ErSchemaPage／ErTablePage`。
> 依賴 [Task 79](task-79-er-mini-markdown.md)、[Task 80](task-80-er-shell-nav-routing.md)。

## 範圍

新增 `wiki.tsx`，取代 Task 80 的佔位。像素值照 handoff；以下只列**偏離與補充**。

### 1. 共通

- 頁面 padding 28px 36px 64px（embed 20px 24px 40px），**滿版、無 max-width**
- 所有 `description`（`meta`／`schemas[]`／`groups[]`／`tables[]`）一律 `<ErMarkdown>`，`onLink` 走 Task 80 的路由（Wiki 換頁）
- 「在 Diagram 檢視／聚焦」按鈕 = Task 80 的「點 Diagram 分頁」投影

### 2. 總覽

| 項目 | 有 `schemas` | 隱含模式 |
| --- | --- | --- |
| 統計列 | `N schemas · N 張表 · N 個欄位 · N 條外鍵`；`meta.source` 靠右「來源：…」 | 拿掉 schemas 那格 |
| 卡片區標題 | `Schemas` + 數量 | `分群` + 數量 |
| 卡片 | `key` + label + 「N 張表」；description 以 `stripMarkdown(…, 'first')`、2 行截斷；分群 chips | group label + 表數；group description 首段；**前 6 個表名** chips（mono） |
| 卡片點擊 | Schema 頁 | 導覽展開並捲到該分群（沒有分群頁） |

「語彙」小節照 handoff 三欄（必填性／欄位徽章／衍生欄）。

### 3. Schema 頁（隱含模式不存在，route 一律回退總覽）

- H1 = `key`（mono 22px 藍）+ label；右側「在 Diagram 檢視」
- 每個分群一節：H2 分群名 + 表數 chip；`groups[].description` 走 **Markdown**（prototype 是純文字 `<p>`）
- 表格清單欄：`資料表｜說明｜欄位｜父／子`
  - 說明：`stripMarkdown(description, 'first')`、2 行截斷；無則淡色「尚無說明」（`--neutral-400`）
  - 父／子：`parentTables(n).length／childTables(n).length`（已去重、排除自我參照）
  - 整列是按鈕 → Table 頁
- **空狀態**：schema 底下 0 個 group → 「這個 schema 底下還沒有分群。在資料檔的 `groups[].schema` 指定歸屬。」

### 4. Table 頁

由上而下，照 handoff 1–8。補充：

1. 麵包屑：有 schemas → `crm`（可點）› 分群名；隱含模式 → 只剩分群名（不可點）
2. 統計列的 `§2.1`：plugin 不能 import DS 的 `Badge`，自己做 `.erd-badge--blue`（樣式對齊 DS Badge）；前綴取 `options.sectionPrefix`
3. 說明空狀態：「這張表還沒有說明。在資料檔的 `tables[].description` 以 Markdown 撰寫。」
4. **欄位表**：th sticky；fk 欄的「`→ parent.id`」chip 可點 → 父表頁；**父表不在資料檔內**時 chip 為不可點的淡色
5. **關聯**：局部關聯圖先放佔位（Task 82）；下方兩欄「參照（本表 → 父表）」含自我參照與 hub 註記、「被參照（子表 → 本表）」照 handoff，整列可點；空時各自顯示「沒有外鍵欄位。」「沒有其他表指向這張表。」
6. **索引與唯一鍵**：0 筆時顯示「沒有索引或唯一鍵。」（prototype 是空白）
7. **衍生欄**：有才顯示
8. 區段 H2 保留 `id`（`cols`／`rel`／`idx`／`der`），但**不做**錨點導覽

### 5. 字面色值

- warning 徽章字色 `#8a6412`：在 CSS 字串開頭定義 `--erd-warn-ink`，規則只引用它（v1.1 本來就寫死同一值，一併收斂）
- 其他半透明色一律 `color-mix()`

## 要改的既有檔案

新增 `plugins/er-diagram-renderer/wiki.tsx`；改 `renderer.tsx`、`styles.ts`、`plugins/registry.json`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| v1.1 總覽 | `/view/schema-demo.er` | Wiki | 統計列無 schemas；卡片區「分群 11」 |
| v1.1 無 description | 同上 | 開任一表 | 說明空狀態文案；其餘區塊照常 |
| v1.2 總覽 | `er-v12.er.json` | Wiki | `meta.description` 的 `## 閱讀順序` 與清單正確渲染；`` `crm` `` 可點進 Schema 頁 |
| Schema 頁 | 同上 | 點 `crm` | 分群節、表格清單；無說明的表顯示「尚無說明」 |
| Schema 空狀態 | 測試資料加一個沒有 group 的 schema | 點它 | 導覽顯示 0、頁面顯示空狀態文案 |
| 反引號連結 | 某表 description 內 `` `contract_item` `` | 點 | 開該表 |
| fk chip | 有 fk 的欄位 | 點 `→ customer.id` | 開 `customer` 頁、捲回頂端 |
| 首行說明 | description 以 `## ` 開頭的 schema | 看總覽卡片 | 顯示第一個非標題段落，不出現 `##` |
| 父／子去重 | 兩個欄位指向同一父表的表 | 看 Schema 頁父／子欄 | 算一張 |
| 隱含模式 schema route | localStorage 塞 `{kind:'schema',key:'_all'}` | reload `schema-demo.er` | 總覽 |
| 護欄 | — | `npx tsc --noEmit && npx astro build && npm run check-plugins` | 通過 |

## 依賴

Task 79、Task 80。

## 實作記錄（2026-09-27）

- 隱含模式的分群卡片不整張可點（沒有分群頁可去），改為表名 chip 各自可點
- 全站 reset 會吃掉清單符號，`.erd-md` 明確補 `list-style`；參照清單的標籤加 `white-space: nowrap`
- 順手修 app：dev 下改資料檔後 Ajv「schema already exists」整站 500（獨立 commit `fix(plugins)`）
