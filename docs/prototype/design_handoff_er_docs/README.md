# Handoff：ER Diagram Renderer v1.2 — Schema／Table 導覽 + Wiki + Diagram

## Overview
把 `er-diagram-renderer`（NoteCraft plugin，現行 v1.1.0）從「單一關聯圖」擴充成 DBdocs 式的資料庫文件介面：

1. **導覽清單**：Schema → 分群（group）→ Table 三層樹，可篩選、可收合
2. **Wiki**：總覽頁、Schema 頁、Table 頁，內文來自資料檔中新增的 Markdown `description`
3. **Diagram**：現有的無限畫布關聯圖（功能不減），新增「依 Schema 限定範圍」與「聚焦 → 開啟 Wiki」的雙向跳轉

同一個元件要支援 `mode: 'page'`（資料檔獨立頁）與 `mode: 'embed'`（內嵌在筆記裡）兩種情境。

> ⚠ **JSON Schema 有調整（v1.1 → v1.2）**，必須向下相容，詳見〈[資料格式與相容性](#資料格式與相容性必讀)〉。這是本次改版最重要的一節，請先讀。

## About the Design Files
`prototype/` 裡的檔案是用 **HTML + React（瀏覽器端 Babel）做的設計參考**，用來呈現預期的外觀與互動，**不是**要直接搬進 repo 的程式碼。任務是在 plugin 既有的環境裡重做：`plugins/er-diagram-renderer/renderer.tsx`（React + TypeScript + `lucide-react`，樣式以 `.erd-root` 前綴的 CSS 字串注入，吃 NoteCraft 的 CSS 變數）。沿用 renderer.tsx 的既有慣例：

- props 型別自帶一份（`PluginRendererProps<T>`），不從 `@notes/...` import
- 所有 class 前綴 `erd-root`（prototype 用的是 `erx-`，實作時請改回 `erd-`）
- 圖示用 `lucide-react`（prototype 是手寫的 Lucide 風格 SVG，路徑僅供參考）
- 設定三層合併：內建預設 < 資料檔 `options` < `plugins.json` 的 `options`

檔案可以拆：renderer.tsx 目前 1100 行，加上 Wiki 後建議拆成 `renderer.tsx`（外殼與路由）、`diagram.tsx`（畫布，幾乎原封搬移）、`wiki.tsx`（三種頁面）、`nav.tsx`、`markdown.tsx`、`derive.ts`、`styles.ts`。plugin 的 build 流程若只接受單檔，就維持單檔、以區塊註解分段。

## Fidelity
**High-fidelity。** 顏色、字級、間距、圓角、互動都是定稿。色彩一律用 TrendLink 設計系統的 CSS 變數（下方〈Design Tokens〉）；NoteCraft 工作台把圓角縮小一級（見 tokens），prototype 已套用。

---

## 資料格式與相容性（必讀）

### 變更摘要（全部為**選填新增**，沒有任何欄位被移除或改名）

| 位置 | 新欄位 | 型別 | 用途 |
|---|---|---|---|
| 頂層 | `schemas[]` | `{ key, label, description? }` | 導覽第一層；順序即導覽順序 |
| `meta.description` | （既有欄位，語意擴充） | string，**允許 Markdown** | Wiki 總覽頁內文 |
| `groups[]` | `schema` | string → `schemas[].key` | 分群歸屬哪個 schema |
| `groups[]` | `description` | string（Markdown） | Schema 頁該分群下的說明 |
| `tables[]` | `description` | string（Markdown） | Table Wiki 頁的表說明 |

完整規格：`schema.json`（v1.2，由 v1.1 原檔加欄位產生，其餘逐字保留）。可跑的 v1.2 範例：`example/schema.json`（3 schemas、6 groups、15 tables）。

### 相容性要求——請逐條實作並寫測試

1. **v1.1 資料檔必須零修改就能渲染。** 舊的 `example/schema.json`（無 `schemas`、無任何 `description`）要能正常顯示導覽、Wiki 與 Diagram。
2. **沒有 `schemas` 時**：建立一個隱含 schema（`{ key: '_all', label: '全部' }`），所有 group 歸在它底下。此時：
   - 導覽樹**省略 Schema 那一層**，直接從分群開始（只有一個節點的層級沒有意義）——prototype 目前仍會顯示「全部」這層，實作時請修正
   - Diagram 分頁**隱藏「範圍」切換**
   - 總覽頁的「Schemas」區塊改為列出分群
3. **`groups[].schema` 缺漏或指向不存在的 key**：歸入 `schemas[0]`，並在 dev 模式 `console.warn` 一次（列出所有孤兒 group）。不要 throw。
4. **有 `schemas` 但某個 schema 底下沒有任何 group／table**：導覽仍列出（顯示 0），Schema 頁顯示空狀態。
5. **所有 `description` 缺漏**：Wiki 頁照常渲染，表說明處顯示空狀態文案「這張表還沒有說明。在資料檔的 `tables[].description` 以 Markdown 撰寫。」；Schema 頁表格的說明欄顯示淡色「尚無說明」。
6. **`meta.description` 現在可能含 Markdown。** NoteCraft 把它用於頁面描述與搜尋索引——請確認 NoteCraft 端取用時會先去除 Markdown 標記（至少 `` ` `` `**` `#` `>` `-` 與連結語法），否則搜尋結果會出現原始符號。若這不在 plugin 的控制範圍，請在 README 註明並開 issue。
7. **`additionalProperties: false`** 仍然有效。v1.2 的 schema.json 已把新欄位加進 `properties`；使用 v1.1 schema.json 驗證 v1.2 資料會失敗——這是預期的，`notecraft-plugin.json` 的 `version` 請升到 `1.2.0`，`$schema` URL 不變（同一路徑、內容更新）。
8. **`layout.columns` 仍決定 Diagram 版面**，不因 schemas 改變。它同時決定導覽樹內分群的順序（分群依在 `layout.columns` 中出現的順序排列；沒出現在 layout 的 group 接在最後）。
9. **轉檔腳本** `scripts/er-schema-from-tsx.mjs` 不需要產出新欄位，但產出的檔案必須能通過 v1.2 schema 驗證（它本來就不會產生新欄位，確認一下即可）。
10. **型別**：在 `ErDiagramData` 加 `schemas?: { key: string; label: string; description?: string }[]`；`groups` 項目加 `schema?: string; description?: string`；`ErTable` 加 `description?: string`。全部可選。

### 依然不存的東西（由既有欄位推導）
- 關聯 edges ← `columns[].fk`（沿用）
- 索引與唯一鍵清單 ← `pk`／`unique`／`index`
- 衍生欄清單 ← `derivation`
- 父表／子表數 ← edges（排除自我參照）

### 建議的驗證測試
- `example/schema.json`（v1.1 原檔）→ 渲染不報錯、導覽無 Schema 層
- 本資料夾 `example/schema.json`（v1.2）→ 三層導覽
- 刪掉某個 group 的 `schema` → 歸入第一個 schema + warn
- `ajv` 用 v1.2 schema.json 驗證兩份範例都通過

---

## Screens / Views

### 外殼（page 與 embed 共用）
```
┌ bar 44px ────────────────────────────────────────────────┐
│ [≡] │ Wiki │ Diagram │                 crumb／範圍切換 │ [展開全寬]* │
├ nav 248px ─┬ main（flex:1, overflow:auto）──────────────┤
│ 篩選        │ Wiki 頁 或 Diagram                          │
│ 總覽        │                                             │
│ SCHEMAS 3  │                                             │
│ ▸ crm 客戶… │                                             │
└────────────┴─────────────────────────────────────────────┘
* 僅 embed
```
- 外殼 `display:flex; flex-direction:column`；page 模式高度 100%（佔滿資料檔頁的內容區），embed 模式固定 600px（放在工作台 figure 內時為 580px、去外框）
- **bar**：高 44px，底線 1px `--border-subtle`，左右 padding 14px，gap 12px
  - 導覽開關 30×30，圓角 `--radius-md`，icon 15px；hover 底 `--blue-50`、字 `--blue-700`
  - 分頁：高度撐滿 bar，padding 0 12px，13px／500 `--text-muted`；選中 700 `--blue-700`，下緣 2px `--orange-400` 圓角橫條（左右內縮 10px）
  - Wiki 分頁右側 crumb：11.5px `--text-muted`，code 為 `--blue-700`（「總覽」／「schema · crm」／「crm · customer」）
  - Diagram 分頁右側「範圍」：pill 按鈕高 24px、padding 0 10px、11.5px；選中 `--blue-700` 底白字；選項「全部」+ 每個 schema key（mono）
- **nav**：寬 248px（embed 220px），右框線 `--border-subtle`，底 `--surface-page`
  - 篩選框：高 30px pill，margin 10px 10px 4px；有輸入時顯示「命中/總數」（藍 = 有、紅 `--danger-500` = 0）
  - 「總覽」項：home icon
  - 區段標題 `SCHEMAS  3`：10.5px／700，letter-spacing .1em，`--text-muted`
  - Schema 列：caret（20px 寬，展開時旋轉 90°，140ms）+ db icon + `key`（mono 12px `--blue-700`）+ label（600 `--text-strong`）+ 表數
  - 分群：左側 1px 垂直線（margin-left 20px），分群名 10.5px／700 `--blue-700` 80% 透明
  - Table 列：高 28px，table icon + `name`（mono `--neutral-800`）+ label（11px muted，超出省略）
  - 選中：底 `rgba(27,79,156,.1)`、字 `--blue-700` 700；Table 選中再加左側 2px `--orange-400` inset 陰影
  - 篩選時自動展開所有 schema、隱藏無命中的 schema／分群
- **main**：Wiki 時 `overflow:auto`（每次換頁捲回頂端）；Diagram 時 padding 14px 16px 16px

### Wiki：總覽頁
- 頁面 padding 28px 36px 64px（embed 20px 24px 40px），**寬度滿版、無 max-width**
- Eyebrow `DATABASE`：11px／700，tracking wide，`--orange-500`
- H1 `meta.title`：24px／700／1.3 `--text-strong`（embed 20px）
- 統計列：`N schemas · N 張表 · N 個欄位 · N 條外鍵`，12px muted、數字 `--text-strong` tabular；`meta.source` 靠右「來源：…」
- `meta.description` → Markdown
- `Schemas` 小節：卡片 grid `repeat(auto-fill, minmax(240px,1fr))` gap 12px。卡片：padding 14px 16px，1px `--border-subtle`，上緣 3px `--blue-500`，`--radius-lg`，`--shadow-xs`；hover `--shadow-sm` + 上移 1px。內容：`key`（mono 14px 700 藍）+ label（13px 600）+ 右側「N 張表」；description 第一行（去除 Markdown，最多 2 行截斷）；分群 chips（11px，`--blue-50` 底 `--blue-700` 字，pill）
- `語彙` 小節：說明「本份資料自訂的標示方式。這些叫法寫在資料檔裡，換專案可以改。」三欄 `auto-fit minmax(200px,1fr)`：必填性（圓點 + label + title）、欄位徽章（badge + label）、衍生欄（warning badge + label）

### Wiki：Schema 頁
- Eyebrow `SCHEMA`；H1 = `key`（mono 22px 藍）+ label；右側按鈕「在 Diagram 檢視」（藍 pill）
- `schemas[].description` → Markdown
- 每個分群一個小節：H2 分群名 + 表數 chip；`groups[].description`（13px muted）
- 表格清單（整列可點 → Table 頁）：欄 `minmax(150px,1.1fr) | minmax(0,2fr) | 48px | 60px` = 資料表（name mono 600 藍 / label 11.5px muted 兩行）、說明（description 首行、2 行截斷；無則「尚無說明」neutral-400）、欄位數、父／子（去重後的表數）。表頭 32px `--surface-page` 11px／700；列 min-height 48px，hover `--blue-50`

### Wiki：Table 頁
由上而下：
1. 麵包屑：`crm`（可點，回 Schema 頁）› 分群名，11.5px
2. H1 = `name`（mono）+ label；右側「在 Diagram 聚焦」
3. 統計列：`§2.1`（DS `Badge tone="blue"`）· N 個欄位 · N 張父表 · N 張子表
4. `description` → Markdown，或空狀態
5. **欄位**（H2 + 數量 chip）：表格外框 1px `--border-subtle` `--radius-lg`，可水平捲動。欄：欄位（mono 12.5px 600）｜型別（mono 11.5px muted）｜必填（圓點 + label）｜預設（mono 或「—」neutral-300）｜標示（PK/FK/UQ/IX + 衍生徽章，10px）｜說明（min-width 220px；有 fk 時前面放 `→ parent.id` 連結 chip，點擊跳該表）。th sticky，11px／700，`--surface-page`；td padding 8px 12px；列 hover `--neutral-50`
6. **關聯**：
   - **局部關聯圖**：三欄 grid `1fr auto 1fr`、gap 72px，padding 16px 18px，點陣背景（同 Diagram 畫布）。左「父表 N」、中「本表」、右「子表 N」。節點為小卡（name mono 12px 藍 + label 11px），可點跳 Wiki；本表節點用 `--gradient-accent` 底、`--shadow-accent`、字 `--blue-950`；自我參照時本表下方註記「自我參照」。連線為 SVG 貝茲曲線 1.3px `--blue-300`，箭頭指向**父表**（同 FK 方向），量測 DOM 後繪製、ResizeObserver 重算
   - 下方兩欄 `auto-fit minmax(260px,1fr)`：「參照（本表 → 父表）」列出 `table.col → parent.id`（含自我參照與 hub 註記 chip）；「被參照（子表 → 本表）」列出 `child.col → table.id`。整列可點
7. **索引與唯一鍵**：pk／unique／index 欄位清單，每列：欄位名｜徽章｜「主鍵、唯一、一般索引」文字
8. **衍生欄**（有才顯示）：說明「這些欄位由資料庫維護或特殊儲存，應用層不應直接寫入。」每列：欄位名｜warning 徽章｜**derivation label**　note

### Markdown（Wiki 內文）
只支援：`##`（15px 標題）、`###`（14px）、段落、`-`／`1.` 清單、`>` 引言（`--surface-accent-soft` 底、`--radius-md`、13px）、`**粗體**`、`` `code` ``、`[文字](url)`。內文 14px／1.8 `--text-body`。
**自動連結**：反引號內容若恰為表名 → 連到該 Table 頁；若恰為 schema key → 連到 Schema 頁（code 改 `--blue-50` 底 `--blue-700` 字，hover `--blue-100`）。不要引入完整 Markdown 函式庫的 HTML 輸出（避免 XSS）；若要用 library，請關閉 raw HTML。

### Diagram 分頁
**完整沿用 renderer.tsx v1.1.0 的行為與樣式**（畫布、fit 寬度、⌘/Ctrl+滾輪縮放、拖曳平移、雙擊還原、聚焦、搜尋命中數、hub 收折、展開欄位、tooltip、Esc）。差異只有：
- **範圍（scope）**：只畫所選 schema 的表；`layout.columns` 中沒有表的 group／整欄要濾掉。跨範圍的 edge 不畫，提示列尾加「另有 N 條跨 schema 連線未顯示。」（`--orange-600`）。切換範圍時重置「使用者已動過視角」旗標、重新 fit
- **聚焦列**多一顆「開啟 Wiki」（藍 pill + book icon），在「取消聚焦（Esc）」左側
- 聚焦一張表會同步把 Wiki 路由設為該表（切回 Wiki 就是那張表）
- 搜尋框只搜範圍內的表
- **embed 模式**：原本的「展開全寬」移到外殼 bar 最右（gold pill；開啟後變 ghost「回到本文」）；原位留下 hold 卡片（虛線框 + 「… 已在全寬檢視開啟。」+「回到本文」）。畫布高度 embed 460px，page 用原本的 `clamp(420px, calc(100vh - 250px), 1200px)`；`options.canvasHeight` 仍優先

## Interactions & Behavior

| 動作 | 結果 |
|---|---|
| 導覽點「總覽」／Schema／Table | Wiki：換頁並捲回頂端。Diagram：總覽→範圍全部、清聚焦；Schema→範圍該 schema、清聚焦；Table→聚焦該表（範圍不含它時切到它的 schema） |
| 點 Diagram 分頁 | 依目前 Wiki 路由決定：總覽→全部；Schema 頁→該 schema；Table 頁→該表 schema + 聚焦 |
| Wiki「在 Diagram 檢視／聚焦」 | 同上 |
| Diagram 聚焦列「開啟 Wiki」 | 切到 Wiki、開該表 |
| Diagram 點卡片標頭 | 聚焦／取消（同 v1.1）+ 同步 Wiki 路由 |
| Wiki 內任何表名連結、fk chip、關聯列、局部圖節點 | 開該 Table 頁 |
| embed 下點導覽項 | 換頁後自動收起導覽（全寬時不收） |
| Esc | Diagram：取消聚焦與 tooltip → 再按關閉全寬（沿用 v1.1 的逐層退） |

- 導覽開關：page 預設開，embed 預設關
- 轉場：卡片 hover 140ms（`--duration-fast`），全寬覆蓋層淡入 160ms `--ease-out`，按鈕 press `scale(.97)`
- **持久化**：`{ route, tab, dgScope }` 存 localStorage，key 以資料檔路徑區分（例：`erd:<file.path>:page`／`:embed`）。reload 回到原頁
- **響應式**（≤760px）：nav 改為覆蓋在內容上（absolute、`--shadow-lg`），頁面 padding 20px 18px

## State Management
```ts
type Route = { kind: 'overview' } | { kind: 'schema'; key: string } | { kind: 'table'; key: string }
route: Route                 // Wiki 目前頁
tab: 'wiki' | 'diagram'
dgScope: string | null       // Diagram 範圍，null = 全部
focus: string | null         // Diagram 聚焦的表（與 route 同步）
navOpen: boolean
wide: boolean                // 僅 embed
// Diagram 內部狀態沿用 v1.1：hover, expanded, query, showHubEdges, tip, view, …
```
衍生資料（`useMemo`，見 prototype `er-core.jsx › erDerive`）：`byName`、`groupByKey`、`schemas`（含隱含 fallback）、`schemaOfGroup`、`schemaOfTable`、`edges`、`parentsOf`、`childrenOf`、`tree`（schema → groups（依 layout 順序）→ tables）。
路由指向不存在的 schema／table（資料改名後 localStorage 殘留）→ 回退到總覽，不要白屏。

## Design Tokens
全部來自 TrendLink 設計系統（`tokens/*.css`），NoteCraft 已載入。常用：
- 藍：`--blue-50 #eef4fb` `--blue-100 #d6e4f5` `--blue-300 #7ba6da` `--blue-400 #4d84cb` `--blue-500 #2c6ebb` `--blue-600 #1f5aa6` `--blue-700 #1b4f9c` `--blue-800 #163f7d` `--blue-950 #0b1f3e`
- 橘：`--orange-50 #fdf4e6` `--orange-200 #f6cd86` `--orange-300 #f2b955` `--orange-400 #ed9b26` `--orange-500 #e37b24` `--orange-600 #c7641a` `--orange-700 #a04f15`
- 中性：`--neutral-50 #f6f8fb` `--neutral-100 #eef1f6` `--neutral-200 #e1e6ee` `--neutral-300 #cbd3df` `--neutral-400 #9aa6b8` `--neutral-500 #6c798e` `--neutral-600 #4f5b6e` `--neutral-700 #3a4456` `--neutral-800 #262e3d` `--neutral-900 #161c28`
- 語意：`--danger-50/500 #fbeaea/#d64545` `--success-50/500 #e7f6ee/#2e9e6b` `--warning-50 #fcf3da`（warning 徽章字色 `#8a6412`，與工作台一致）
- 別名：`--text-strong/body/muted`、`--surface-page/card/sunken/accent-soft`、`--border-subtle/default`、`--gradient-accent`、`--focus-ring`
- 圓角（NoteCraft 工作台覆寫）：`--radius-xs 2px` `--radius-sm 3px` `--radius-md 5px` `--radius-lg 8px`；pill 999px
- 陰影：`--shadow-xs 0 1px 2px rgba(17,47,93,.06)` `--shadow-sm 0 2px 6px rgba(17,47,93,.08)` `--shadow-lg 0 14px 34px rgba(17,47,93,.12)` `--shadow-accent 0 8px 22px rgba(227,123,36,.32)`
- 動態：`--duration-fast 140ms` `--duration-normal 220ms` `--ease-out cubic-bezier(.16,1,.3,1)`
- 字體：`--font-sans`（Noto Sans TC）、`--font-mono`

## Assets
無圖片。圖示全為 Lucide：`Search X Plus Minus Maximize2 Info ChevronDown ChevronUp ChevronRight Table Database BookOpen Workflow(或 Network) Home ArrowLeft ArrowRight Expand PanelLeft`。

## Files
- `schema.json` — **v1.2 資料規格**（取代 `plugins/er-diagram-renderer/schema.json`）
- `example/schema.json` — v1.2 範例（15 張表）；建議放到 `example/schema.v1.2.json` 並保留原 v1.1 範例做相容測試
- `prototype/ER Diagram Docs.html` — 直接用瀏覽器開啟（雙擊即可，支援 `file://`）；上方可切換 page／embed。為了能離線開啟，四支 `er/*.jsx` 的內容已**內嵌**在 HTML 裡（`<script type="text/babel" data-src="…">`）；`er/` 資料夾內的同名檔案是相同內容的閱讀用副本
- `prototype/er/er-core.jsx` — 資料推導（`erDerive`）、迷你 Markdown、徽章元件
- `prototype/er/er-diagram.jsx` — Diagram（移植自 renderer.tsx）+ 局部關聯圖 `ErLocalDiagram`
- `prototype/er/er-docs.jsx` — 外殼、導覽、三種 Wiki 頁、路由與同步邏輯
- `prototype/er/er.css` — 全部樣式
- `prototype/er/er-data.jsx` — 範例資料（與 `example/schema.json` 同內容）
- `prototype/er/SCHEMA_CHANGES.md` — schema 變更摘要（簡版）

## 驗收清單
- [ ] v1.1 範例零修改可渲染；無 Schema 層、無範圍切換
- [ ] v1.2 範例三層導覽；篩選顯示命中數
- [ ] Wiki 三種頁面與空狀態
- [ ] 反引號表名／schema key 自動連結
- [ ] Table 頁局部關聯圖連線正確（箭頭指向父表），視窗縮放後重算
- [ ] Diagram 行為與 v1.1 無回歸（縮放、平移、聚焦、搜尋、hub、展開、tooltip、Esc）
- [ ] 範圍切換、跨 schema 連線提示
- [ ] Wiki ↔ Diagram 雙向跳轉與路由同步
- [ ] embed：導覽預設收、全寬覆蓋層、hold 卡片
- [ ] localStorage 殘留無效路由時回退總覽
- [ ] `notecraft-plugin.json` version → 1.2.0；README 更新「資料長什麼樣」一節
