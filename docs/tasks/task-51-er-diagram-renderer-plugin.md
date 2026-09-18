# Task 51 — ER Diagram Renderer（第一個官方 plugin）

> 對應 [notecraft-plugin-system.md](../notecraft-plugin-system.md) §8（實作階段 P4）。
> 依賴 [Task 46](task-46-plugin-contract-types.md)。可與 48–50 並行。
> **這是驗證整套契約的第一個真實案例** —— 它踩到的坑就是契約的缺口。

## 為什麼要有這一步

`trendmile/.notecraft/components/schema-er-diagram.tsx` 共 751 行，其中約 600 行渲染邏輯
對任何一份資料庫 schema 都通用，卻和 TrendMile 的 36 張表焊死在同一個檔案裡。
換一個專案要畫 ER 圖，只能整份 copy 再改資料。

## 範圍

### 1. 盤點與分類（規格 §8.1）

| 目前在 tsx 裡 | 去向 |
| --- | --- |
| `TABLES`（36 張表、297 個欄位，~48 KB 單行字面量） | → `tables` |
| `LAYOUT`（五欄、每欄放哪些 group） | → `layout.columns` |
| `GROUP_LABEL`（從 TABLES 反推、目前重複） | → 正規化成 `groups`，表只留 `group` key |
| `REQ_TITLE`（必填 / 可為空 / 條件 / 系統） | → `requirement`，連圖例文案一起 |
| PK / FK / UQ / IX / GEN / TRG / ENC 徽章 | → `flags` / `derivations` |
| `DEFAULT_ROWS = 6` | → `options.defaultRows` |
| `option_item` 特例（工具列「顯示 option_item 的 N 條連線」） | → `options.hubTables` |
| hint 文案、搜尋 placeholder | → `options` |
| `EDGES`（由 `cols[].fk` 推導） | **衍生，不入 JSON**，renderer 自己算 |
| CSS、量測、路徑計算、聚焦 / 搜尋 / 展開 / tooltip / 全寬覆蓋層 | 留在 renderer |
| `p`（PII 旗標，資料裡有、渲染器沒用到） | 保留為選填 `pii` |

**只抽 `TABLES` 是不夠的** —— 中間那類「只對 TrendMile 成立」的常數不抽出來，換個專案還是要改程式。

### 2. `schema.json`（資料的 JSON Schema）

依規格 §8.2 的草案定義。app 只約定 `meta.title` / `meta.description`，
其餘（含 `meta.backTo`）由本 plugin 自行解讀。

### 3. 欄位鍵名：短鍵 → 長鍵（規格 §8.3）

`n/t/r/d/pk/fk/u/i/g/p/s` → `name/type/required/default/pk/fk/unique/index/derivation/pii/note`，
boolean 為 false 時省略；`required` 的值也從 `y/n/c/s` 改成 `required/nullable/condition/system`。

檔案會從 48 KB 長到約 81 KB。**這是為可讀性付的錢** —— 壓縮過的短鍵 JSON 人改不動、AI 也難產，
等於白做。

### 4. 轉檔腳本

一次性腳本，把現行 `TABLES` 轉成新 `schema.json`（短鍵→長鍵、`groupLabel` 正規化成 `groups`）。
放 `scripts/`，用完保留供他人遷移參考。

### 5. renderer 改吃 props

- 常數段全部刪掉，改讀 `props.data`
- `LAYOUT` / `REQ_TITLE` / `DEFAULT_ROWS` / `option_item` 改讀 `data.layout` / `data.requirement` / `options`
- **`mode === "page"` 時隱藏自帶的「展開全寬」按鈕** —— 獨立頁已是全寬（Q22），
  留著會有兩個功能重疊的按鈕
- import 只能用白名單（Q11）：現行用到 `react` 與 `lucide-react`，都在清單內

### 6. 套件檔案

```
plugins/er-diagram-renderer/
├── notecraft-plugin.json
├── renderer.tsx
├── schema.json
├── example/schema.json      # 5 張表的縮小版，可直接 build
├── screenshot.png
└── README.md
```

`example/` 可直接取 [design_brief_plugin_system/sample-data/er-schema.sample.json](../prototype/design_brief_plugin_system/sample-data/er-schema.sample.json)。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 新舊畫面等價 | 轉檔後的完整資料 | 並排比對舊元件 | 聚焦、搜尋命中數、展開欄位、tooltip、全寬五項行為一致 |
| 換資料即換圖 | 改用 `example/schema.json` | 重新 build | 畫出 5 張表的圖，無程式碼改動 |
| page 模式無重複按鈕 | `mode="page"` | 檢視工具列 | 「展開全寬」不出現 |
| embed 模式有按鈕 | `mode="embed"` | 檢視工具列 | 「展開全寬」正常運作 |
| 資料驗證可擋 | 刪掉某表的 `name` | build | 驗證失敗並指出該欄位 |
| 白名單乾淨 | 掃 `renderer.tsx` 的 import | lint | 只有 `react` 與 `lucide-react` |

## 依賴

Task 46（型別與 manifest schema）。驗證行為需 Task 47，但可先以硬編 props 開發。

## 風險

中高。**這是唯一一個「已經有正確答案」的 Task** —— 舊元件的行為就是驗收基準，
任何行為差異都是回歸。特別注意連線路徑的量測邏輯：它會除以當下的 transform 倍率
（舊元件 `measure()` 的註解說明了為什麼），抽成 plugin 後放大檢視的層級可能改變，需重新確認。

## 實作記錄（2026-09-18）

產出 `plugins/er-diagram-renderer/`（manifest / renderer.tsx / schema.json / example / README）
與轉檔腳本 `scripts/er-schema-from-tsx.mjs`。

**外部化的範圍**：除了 `TABLES`，連 `LAYOUT`、`REQ_TITLE`、PK/FK/UQ/IX/GEN/TRG/ENC 徽章、
`DEFAULT_ROWS`、寫死的 `option_item` 特例、hint 與搜尋 placeholder 全部進了資料檔。
CSS 的語彙 class 也跟著改名（`erd-dot--y` → `erd-dot--solid`、`erd-k--pk` → `erd-k--danger`），
讓樣式掛在「語意」而非「某個專案的叫法」上。

**實際數字**：36 張表、297 個欄位、69 個外鍵（其中 24 條指向 `option_item`、4 條自環）、11 個群組。
短鍵轉長鍵後資料檔從 48 KB 長到 81 KB。

> 先前文件裡寫的「80 張表」是誤植 —— 80 是來源筆記檔名 `80-field-inventory` 的編號前綴，
> 不是表數。相關文件已更正。

**PluginHost 島（架構修正）**

原本打算讓 `/view` 頁從 `getPlugins()` 取出元件直接掛 `client:load`，**build 直接失敗**
（`NoMatchingImport`）—— Astro 的 hydration 指令要在編譯期就知道元件來自哪個模組，
從 Map 取出的元件它無從產生 client 進入點。

改成既有簡報頁的形狀（`<PresentApp slug={...} client:only>` 只傳字串、由島自己查表）：
新增 `src/components/islands/PluginHost.tsx`，渲染器的 glob 放在島裡（會進 client chunk），
`src/lib/plugins.ts` 只做 build 期解析（它用了 `node:fs`，本來就不能進 client）。
這件事影響 Task 48，已在該 Task 註記。

**A/B 驗收**（舊元件與新 plugin 並排渲染同一份資料，以 DOM 比對）

| 項目 | 結果 |
| --- | --- |
| 卡片 36、欄位 187、連線 45、群組 11、展開鈕 20 | 完全相同 |
| 190 個徽章（PK 48 / FK 69 / UQ 30 / IX 45 / TRG 3）逐一比對 | 完全相同 |
| 必填性圓點 113 / 5 / 44 / 29 | 完全相同 |
| 搜尋 `quotation` →「3 張表・2 個欄位」、`zzz-none` →「查無符合」 | 完全相同 |
| 聚焦 `contract` 的資訊列（5 張父表、3 張子表、逐一列名） | 完全相同 |
| 展開 / 收合、tooltip（`id　bigint　預設 identity` / `代理主鍵`） | 完全相同 |
| 全寬覆蓋層（role=dialog、36 卡、body overflow 鎖定與還原） | 機制相同；文案改吃 `meta.title`（舊版寫死「盤點圖」，只對那一篇筆記成立） |
| 工具列「顯示 option_item 的 24 條連線」 | 完全相同 |

**過程中抓到兩個 bug，都是機械改名造成、且靜態 build 抓不到**

1. **命名遮蔽**：`TABLES` → `tables` 撞到搜尋 memo 裡的區域變數 `const tables = new Set()`，
   導致 `for (const t of tables)` 迭代空集合 —— **搜尋永遠回「查無符合」**。
   互動測試才現形。已改名區域變數並補上 `tables` 相依。
2. **`focusTable.sec` 漏改**：改名規則是 `\bt\.sec\b`，而 `focusTable.sec` 裡沒有 `t.sec` 這個子字串，
   整個漏掉 → 聚焦資訊列的章節號變成空白。**build 不做型別檢查（esbuild 只剝型別），所以無聲通過。**

順帶修正的相依陣列：`related`、`measure` 原本吃模組常數所以給空陣列，改吃 props 後補上 `edges`；
`opts` 改用 `useMemo` 穩定識別，否則每次 render 都重建物件、害 `hubTables` 與 `isHubEdge` 跟著失效。

**未做**：`screenshot.png`（Task 57 的 store 交付）。README 暫時不放圖。
