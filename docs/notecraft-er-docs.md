---
Project Name: NoteCraft — ER Diagram Renderer v1.2（Schema／Table 導覽 + Wiki + Diagram）
文件類型: Design Document
文件版本: v1.0.0
開發模式: Waterfall
技術選型: 確定（沿用 plugin 既有技術棧：React + TypeScript + lucide-react，不新增 runtime 套件）
文件狀態: 已實作（plugin v1.2.0／notecraftapp v1.3.0，Task 76–86，2026-09-27）—— §15 的 10 題已於 2026-09-27 逐題確認（紀錄見 §16）；實作後回填見 §17
文件作者: 建宇
建立日期: 2026-09-27
更新日期: 2026-09-27
依賴文件: docs/notecraft-plugin-system.md、docs/notecraft-workbench.md、docs/prototype/design_handoff_er_docs/README.md、plugins/er-diagram-renderer/README.md
---

# ER Diagram Renderer v1.2 — 設計文件

把官方 plugin `er-diagram-renderer` 從「單一關聯圖」擴充成 DBdocs 式的資料庫文件介面：**導覽樹**（Schema → 分群 → Table）、**Wiki**（總覽／Schema／Table 三種頁面）、**Diagram**（v1.1.0 的無限畫布，功能不減，加上 schema 範圍與 Wiki 雙向跳轉）。同一個元件同時服務 `mode: 'page'`（`/view/<路徑>`）與 `mode: 'embed'`（`<PluginView>` 內嵌在筆記裡）。

> 視覺與互動的**像素級規格**以 [design_handoff_er_docs/README.md](prototype/design_handoff_er_docs/README.md) 與 `prototype/er/er.css` 為準，本文不重抄。
> 本文負責 handoff 沒有回答的事：**prototype 是瀏覽器端 Babel 的單頁 demo，實作是要在 Astro SSR + hydration、plugin 安裝／打包規則、工作台殼裡跑的官方 plugin**，兩者之間的落差要怎麼接；app 端要配合改哪些地方；以及動工前必須先問清楚的問題（§15）。
> **與設計稿不同之處一律以本文為準**。

---

## 1. 這份文件要解決什麼

### 1.1 起點

Handoff 的相容性清單（10 條）寫得很完整，但它是站在「plugin 內部」看的。實際對照 codebase 後，有五類落差 README 沒處理：

| 落差 | 說明 |
| :-- | :-- |
| **SSR／hydration** | Prototype 在 `useState` 初始值裡直接讀 `localStorage` 還原路由。實作時 `PluginHost` 會先 SSR 再 hydrate（`/view` 是 `client:load`、內嵌是 `client:visible`），初始值不同會造成 hydration mismatch；專案規則也是「靠 localStorage 的東西 SSR 一律當作沒有」 |
| **打包與安裝** | 拆檔本身可行（glob 只認 `renderer.tsx`，但 Vite 會跟著相對 import 打包；install lint 會掃目錄內所有 `.ts/.tsx`），**但從 GitHub store 安裝時只下載 `registry.json` 的 `files` 清單** —— 新檔沒登記，使用者裝到的是缺檔的 plugin，build 直接失敗 |
| **app 端的 `meta.description`** | 它被原字串送進五個地方：`<meta name="description">`、`/view` Toolbar 說明文字（**pagefind 索引來源**）、`/wb-index.json`、系列章節資料。Markdown 化之後，這些地方全會出現 `**`、`##`、反引號。這是 app 的責任，不在 plugin 內 |
| **頁面高度** | Handoff 說 page 模式「高度 100%（佔滿資料檔頁的內容區）」，但 `/view` 的 `.nc-dv-stage` 是有 padding、隨內容長高、由 `#nc-scroll` 捲動的區塊 —— plugin 內的 `height:100%` 解析不到確定高度 |
| **測試** | Handoff 要求「逐條實作並寫測試」，但專案**沒有任何 test runner**；`check-plugins` 也只驗證、只 build **一份** example（`manifest.example` 是單一字串） |

### 1.2 目標

1. **v1.1 資料檔零修改可渲染**，且在「沒有 `schemas`」時介面自動降一層（不顯示只有一個節點的 Schema 層、不顯示範圍切換）
2. **導覽 + Wiki + Diagram** 三件事照 handoff 的外觀與互動實作，page／embed 共用同一棵元件樹
3. **Diagram 零回歸**：縮放、平移、fit 寬度、雙擊還原、聚焦、搜尋命中數、hub 收折、展開欄位、tooltip、Esc 逐層退，全部行為與 v1.1.0 相同
4. **資料格式 v1.2** 只做選填新增：頂層 `schemas[]`、`groups[].schema`、`groups[].description`、`tables[].description`，`meta.description` 語意擴充為 Markdown
5. **app 端配合**：`meta.description` 在所有非 plugin 的出口一律去除 Markdown 標記
6. **發佈護欄**：兩份範例（v1.1、v1.2）都在 `check-plugins` 裡驗 schema、都實際 build 一次

### 1.3 非目標（本次明確不做）

| 項目 | 原因 |
| :-- | :-- |
| 完整 Markdown（表格、圖片、程式碼區塊、HTML、巢狀清單） | Handoff 只列 8 種語法。完整 Markdown 函式庫不在白名單內，且 install lint 禁用 `dangerouslySetInnerHTML` —— 迷你 parser 輸出 React 元素正好兩全 |
| `pii` 欄位的顯示 | Schema 註明「v1.2 渲染器仍不顯示」 |
| 由資料推導以外的關聯資訊（多欄外鍵、指向非 `id` 欄的 FK） | 現行 `fk` 只存父表名，隱含指向 `id`。局部關聯圖與「`→ parent.id`」chip 都依此假設 |
| 深色模式 | 工作台本版不啟用，plugin 跟隨 |
| 轉檔腳本 `scripts/er-schema-from-tsx.mjs` 產出新欄位 | Handoff 第 9 條；只需確認產物通過 v1.2 驗證（新欄位皆選填，必然通過） |
| 把 Esc 接進工作台的 `wb-escape` 堆疊 | Plugin 必須能在使用者專案獨立 build，不 import app 內部模組。改用「先檢查 `defaultPrevented`」與堆疊和平共處（§10） |
| 導覽樹的鍵盤方向鍵移動（roving tabindex） | 首版以 Tab 走訪所有按鈕即可；列為日後增強 |

---

## 2. 現況盤點：哪些留、哪些改、哪些走

### 2.1 Plugin 檔案

| 現有 | 去向 |
| :-- | :-- |
| `plugins/er-diagram-renderer/renderer.tsx`（1102 行、單檔） | **拆檔**（§4.1）。畫布邏輯幾乎原封搬進 `diagram.tsx`，外層改為 Docs 外殼 |
| `schema.json`（v1.1） | 以 handoff 的 `schema.json`（v1.2）**取代**；`$id` 不變 |
| `example/schema.json`（v1.1，5 張表） | **改名** `example/schema.v1.1.json`，保留作相容測試（§12） |
| —— | 新增 `example/schema.json` ← handoff 的 v1.2 範例（3 schemas、6 groups、14 張表）。維持 `manifest.example` 指向它，store 頁與 `install-plugin` 的預設行為不變 |
| `notecraft-plugin.json` `version: 1.1.0` | → `1.2.0`；`engines` 維持 `>=0.6.0`（見 §11.3） |
| `README.md` | 更新「它畫出什麼」「資料長什麼樣」；新增一節說明 Markdown 支援範圍與 app 版本差異 |
| `plugins/registry.json` 該項 | `version` → `1.2.0`；`files` 補上所有新檔（`check-plugins` 會比對集合，漏一個就 fail） |

### 2.2 v1.1 行為的去留

| v1.1 行為 | v1.2 |
| :-- | :-- |
| 工具列（搜尋、hub 開關、圖例）、提示列、聚焦列 | 留，在 Diagram 分頁內。聚焦列多一顆「開啟 Wiki」 |
| 內嵌時工具列上的「展開全寬」 | **搬到外殼 bar 最右**（gold pill）；原位的 hold 卡片保留 |
| 全寬覆蓋層（`position:fixed`、鎖 body 捲動） | 留。覆蓋層內裝的是**整個外殼**（導覽 + Wiki/Diagram），不再只是畫布 |
| 畫布高度：embed 560／page `clamp(420px, 100vh-230px, 1200px)`／overlay `100vh-150px` | embed 改 **440**（外殼固定 580，扣 bar 44 與工具列、提示列；prototype 在 600 外殼中為 460，等比扣 20）；page 沿用 v1.1 的 `clamp(420px, calc(100vh - 250px), 1200px)`（Q4）；全寬覆蓋層內外殼佔滿視窗、畫布填滿 main；`options.canvasHeight` 仍優先 |
| window 上的 Esc 監聽 | 留，但只在 Diagram 分頁且有東西可退時才處理，並尊重 `defaultPrevented`（§10） |

### 2.3 App 端

| 檔案 | 改動 |
| :-- | :-- |
| `src/lib/plugins.ts` `readMeta()` | `description` 多產兩份純文字版：第一段（顯示用）與全文（索引用）（§11.1） |
| `src/pages/view/[...path].astro` | Toolbar 說明、`<meta description>` 改用純文字版；`.nc-dv-stage` **不動**（Q4） |
| `src/lib/workbench.ts`、`src/lib/series.ts` | `description` 改用純文字版 |
| `scripts/check-plugins.mjs` | 驗證並 build `example/` 下所有 `.json`；串接 `scripts/checks/*.mjs`（§12.1，Q6 已定案） |
| `src/content/notes/schema-demo.er.json` | 不改（它就是 v1.1 零修改相容的真實案例：36 表、11 群、5 欄） |

---

## 3. 名詞

| 名詞 | 意義 |
| :-- | :-- |
| **Schema** | 資料檔 `schemas[]` 的一項，導覽第一層。與資料庫的 schema 概念對應，但只是分類，不影響 Diagram 版面 |
| **隱含 schema** | 資料檔沒有 `schemas` 時，推導層自動補的 `{ key: '_all', label: '全部' }`。UI 上**不以節點形式出現**（§5.3） |
| **分群（group）** | 既有的 `groups[]`，導覽第二層，也是 Diagram 的卡片分群 |
| **Route** | Wiki 目前頁：`overview`／`schema`／`table` |
| **範圍（scope）** | Diagram 只畫某個 schema 的表；`null` = 全部 |
| **聚焦（focus）** | Diagram 裡點選一張表；與 Route 同步 |
| **外殼（shell）** | bar + nav + main 的三段結構，page 與 embed 共用 |
| **hold 卡片** | 內嵌時開啟全寬後，留在筆記原位的虛線框佔位卡 |

---

## 4. 架構

### 4.1 拆檔（Q1 已定案）

查證結果：

- `PluginHost.tsx` 與 `plugins.ts` 的 glob 只匹配 `/plugins/*/renderer.tsx`，但 Vite 會把它的相對 import 一併打包 —— **拆檔可行**
- `bin/install-plugin.mjs` 的 `inspectFiles` 掃描 plugin 目錄內**所有** `.ts/.tsx`，白名單與 `dangerouslySetInnerHTML` 禁令一體適用；允許的副檔名為 `.tsx .ts .json .md .css .svg .png`
- 從 GitHub store 安裝時**只下載 `registry.json` 的 `files`**；本機來源與 git clone 則整個目錄

建議切法（沿用 handoff 提議，微調名稱）：

```
plugins/er-diagram-renderer/
├── renderer.tsx     入口：props 型別、選項合併、外殼（bar／nav／main）、路由與同步、embed 全寬
├── types.ts         ErDiagramData／ErTable／ErColumn／ErOptions／Route（+ v1.2 新欄位）
├── derive.ts        erDerive()：byName、groupByKey、schemas（含隱含）、schemaOf*、edges、parentsOf/childrenOf、tree、孤兒 group
├── diagram.tsx      Diagram 分頁（自 v1.1 renderer.tsx 搬移）+ scope + 開啟 Wiki
├── local-diagram.tsx Table 頁的局部關聯圖（量測 DOM + ResizeObserver）
├── nav.tsx          導覽樹 + 篩選
├── wiki.tsx         Overview／SchemaPage／TablePage
├── markdown.tsx     迷你 Markdown → React 元素；自動連結
├── markdown-text.ts stripMarkdown()（純文字摘要；無 JSX，供 scripts/checks 直接跑）
├── styles.ts        CSS 字串（全部 .erd-root 前綴）
├── schema.json
├── example/schema.json        v1.2
├── example/schema.v1.1.json   v1.1（相容測試）
├── notecraft-plugin.json
└── README.md
```

- 檔名用 kebab-case、不用子資料夾：registry `files` 清單與 install 的路徑處理都最單純
- 型別仍**自帶一份** `PluginRendererProps<T>`（理由同 v1.1：`@notes` 在主 repo 與使用者專案指向不同根）
- 相對 import 一律寫副檔名以外的路徑（`./derive`），與 codebase 其他 TS 一致
- **install lint 的已知缺口**：它逐行比對 `import … from`，多行 import 的 `} from 'x'` 若獨立一行不會被檢查。本 plugin 的 import 全部來自白名單，不受影響；缺口本身另開 issue，不在本次範圍

### 4.2 元件樹

```
ErDocsRenderer (renderer.tsx, default export)
├── <style>{CSS}</style>
├── [embed & wide] HoldCard
├── Shell  ← 同一個 JSX 在 wide 時渲染進 Overlay
│   ├── Bar：導覽開關｜Tabs｜Crumb 或 ScopePills｜[embed] 展開全寬
│   ├── Nav（navOpen 時）
│   └── Main
│       ├── tab=wiki    → Overview | SchemaPage | TablePage（內含 LocalDiagram、Markdown）
│       └── tab=diagram → Diagram（v1.1 畫布 + scope）
└── [embed & wide] Overlay(role=dialog)
```

Diagram 在切換 Wiki／Diagram 時**卸載**（不是 `display:none`）。v1.1 的 `touched` 旗標、fit、量測都在掛載時重跑，行為最可預期；代價是切回 Diagram 時縮放／平移不保留 —— 與 handoff「切換範圍時重置視角旗標、重新 fit」的精神一致。Diagram 內部 state 的去留（Q8 已定案）：`query` 與 `showHubEdges` **提升到外殼 state**，切回 Diagram 時仍在；`expanded`、`hover`、`tip`、視角不保留。提升的兩者不寫入 localStorage（§6.3 的持久化形狀不變）。

範圍（scope）變動時 `query` 保留、只在新範圍內重新比對。

### 4.3 設定合併

沿用三層：內建預設 < 資料檔 `options` < `plugins.json` 的 `options`。v1.2 **不新增選項**。`canvasHeight` 語意不變：有給就覆蓋畫布高度（page／embed／overlay 皆然）。

---

## 5. 資料層

### 5.1 Schema v1.2

直接採用 handoff 的 `schema.json`：與 v1.1 逐字比對，差異**只有**新增 `schemas`、`groups[].schema`、`groups[].description`、`tables[].description` 四個選填屬性，以及三處 `description` 註解文字。`additionalProperties: false` 維持；`$id` 不變（同一 URL、內容更新）。

型別（`types.ts`）：

```ts
export interface ErSchema { key: string; label: string; description?: string }
export interface ErGroup  { key: string; label: string; schema?: string; description?: string }
export interface ErTable  { /* v1.1 欄位… */ description?: string }
export interface ErDiagramData { /* v1.1 欄位… */ schemas?: ErSchema[]; groups: ErGroup[] }
```

### 5.2 推導（`derive.ts`）

以 prototype 的 `erDerive` 為底，補上它沒處理的邊界：

| 項目 | 規則 |
| :-- | :-- |
| `schemas` | `data.schemas` 非空 → 用它；否則 `[{ key: '_all', label: '全部' }]`，並記 `implicit = true` |
| `schemaOfGroup(g)` | `groups[g].schema` 存在且對得到 → 它；否則 `schemas[0].key` |
| 孤兒 group | `schema` 缺漏**或**指向不存在的 key 的 group，收成清單。**只在有 `schemas` 時**才算孤兒（隱含模式下全部 group 本來就沒有 schema） |
| `tables` 的 `group` 指向不存在的 group | v1.1 就有的邊界。Schema 已要求 `group` 必填但不驗參照；推導時歸入 `schemas[0]` 底下一個虛擬分群「未分群」，一併 warn（v1.1 在畫布上是直接不畫，屬靜默遺漏） |
| `edges` | 同 v1.1：`columns[].fk` 且父表存在；`self = fk === table.name` |
| `parentsOf`／`childrenOf` | 排除自我參照；UI 顯示「N 張父表」時以**表名去重**計數（一張表兩個欄位指向同一父表只算一張） |
| `tree` | schema → group（依 `layout.columns` 出現順序，沒出現的接在最後，依 `groups[]` 原順序）→ table（依 `tables[]` 原順序） |
| 反引號自動連結集合 | 表名集合 + schema key 集合（**隱含模式下不含 `_all`**）。無前綴且撞名時**表名優先**；可用 `table:`／`schema:` 前綴明確指定（Q10，見 §8.5） |

全部包在 `useMemo(() => erDerive(data), [data])`。

### 5.3 沒有 `schemas` 時（handoff 第 2 條，prototype 未做）

| 位置 | 有 `schemas` | 隱含模式 |
| :-- | :-- | :-- |
| 導覽樹 | 「SCHEMAS N」區段標題 → schema 列 → 分群 → 表 | 區段標題改「分群 N」，**直接從分群開始**；分群名改為可收合的列（caret + 分群名 + 表數），取代 schema 列的角色 |
| Diagram bar | 「範圍」pill 群 | **不顯示**；crumb 位置留空 |
| 總覽頁 | 統計列「N schemas · …」、Schemas 卡片區 | 統計列拿掉 schemas 那格；卡片區標題改「分群」，每張卡是一個 group（上緣色條同，內容：group label + 表數 + description 首行 + 前 6 個表名 chips） |
| Schema 頁 | 正常 | **不存在**。`route.kind === 'schema'` 一律回退總覽 |
| Table 頁麵包屑 | `crm › 客戶` | 只剩分群名（不可點）|
| bar crumb | `crm · customer` | `customer` |

### 5.4 dev 模式的 warn

- 時機：`derive` 結果算出後，於 `useEffect` 內印（SSR 期不印，避免 build log 與瀏覽器各一次）
- 判定 dev：plugin 拿不到 `import.meta.env.DEV`？——**拿得到**，plugin 是被主專案的 Vite 打包的。以 `import.meta.env?.DEV` 判定（加可選鏈，萬一日後被別的 bundler 吃進去也不 throw）
- 一次：以模組層 `Set<string>` 記錄已警告過的 `file.path`，同頁多個內嵌或 HMR 重掛都只印一次
- 內容：`[er-diagram-renderer] <file.path>：N 個 group 的 schema 缺漏或無效，已歸入 "<schemas[0].key>"：a, b, c`

---

## 6. 路由、狀態與同步

### 6.1 State

```ts
type Route = { kind: 'overview' } | { kind: 'schema'; key: string } | { kind: 'table'; key: string }
route: Route
tab: 'wiki' | 'diagram'
scope: string | null        // Diagram 範圍；隱含模式恆為 null
focus: string | null        // Diagram 聚焦；與 route 同步
navOpen: boolean            // page 預設開、embed 預設關
wide: boolean               // 僅 embed
dgQuery: string             // Diagram 搜尋字串（Q8：提升到外殼，切換分頁保留）
showHubEdges: boolean       // Diagram hub 連線開關（同上）
```

### 6.2 同步規則

直接採用 handoff〈Interactions & Behavior〉表，另補兩條 prototype 行為不一致處：

| 情境 | prototype | 本文 |
| :-- | :-- | :-- |
| Diagram 中從導覽點表，範圍是「全部」 | 不切範圍（`if (dgScope && …)`），聚焦 | 同 prototype：全部已含所有表，不動範圍 |
| 聚焦後按 Esc 取消聚焦 | route 停在該表 | 同：取消聚焦不改 route（回到 Wiki 仍是那張表，符合「最後看的東西」） |
| 範圍 pill 點「全部」 | route → overview | 同 |
| 範圍 pill 點某 schema | route → 該 schema 頁 | 同 |

「切 Diagram 時依 route 決定範圍」與「在 Diagram 內改範圍時回寫 route」兩者互為表裡：**Wiki route 是唯一真相，scope／focus 由它投影而來**，唯二例外是「Diagram 內點畫布空白處取消聚焦」與上表的 Esc —— 這兩者只清 focus。

### 6.3 持久化與 hydration（Q2）

- key：`erd:v1:<file.path>:<mode>`。`file.path` 是相對 notesDir 的路徑（不含本機絕對路徑，符合專案規則）；多一段 `v1` 讓日後改形狀時可直接換 key
- 存的形狀：`{ route, tab, scope }`；`navOpen`／`wide`／`focus` 不存
- **SSR 與首次 client render 一律用預設值**（overview、wiki、null），`useEffect` 掛載後才讀 localStorage 並套用 —— 避免 hydration mismatch，也符合「靠 localStorage 的東西 SSR 一律當作沒有」
  - 代價：reload 後會先閃一下總覽再跳到原頁。`/view` 是 `client:load`，閃爍約一幀；內嵌是 `client:visible`，捲到時才掛載，閃爍通常看不到
  - Q2 已定案接受此閃爍，不做遮蔽
- 讀取時**驗證**：route 指向不存在的 schema／table、隱含模式下的 schema route、tab 不是兩者之一、scope 指向不存在的 key → 各自回退預設，不白屏
- 寫入：state 變動時寫，包 `try/catch`（隱私模式、配額滿時靜默）
- 同一份資料檔在同一篇筆記內嵌兩次：共用同一個 key，後寫者勝。可接受，不另加 instance id

### 6.4 捲動

捲動容器依情境不同（Q4 已定案）：

| 情境 | 誰捲動 | Wiki 換頁時 |
| :-- | :-- | :-- |
| page | 外殼隨內容長高，由工作台的 `#nc-scroll` 捲動；nav 為 sticky、自己捲 | 若外殼頂端已捲出視野，把 `#nc-scroll` 捲到外殼頂端（`shell.scrollIntoView({ block: 'start' })`）；還在視野內則不動 |
| embed（580px） | main 自己捲（外殼高度固定） | main 捲回頂端 |
| 全寬覆蓋層 | 外殼佔滿視窗，nav 與 main 各自捲 | main 捲回頂端 |

- plugin **不**以 id 查 `#nc-scroll`（那是 app 的內部約定，viewer／未來版面可能不同），一律用 `scrollIntoView` 交給瀏覽器找最近的捲動祖先
- Table 頁內的 fk chip／關聯列跳頁，同上規則；**不做**錨點（`#cols` 等 id 保留給日後 TOC 用）

---

## 7. 樣式與 token

- 所有 class 前綴 `erd-`、全部規則以 `.erd-root` 起頭（prototype 的 `erx-` 全數改名）。CSS 仍以字串注入 `<style>`，不新增 `.css` 檔 —— 維持「plugin 自帶樣式、不碰 app 的 Tailwind 掃描」
- 顏色一律 TrendLink DS 變數。Handoff 裡出現的三個**字面色值**要處理：
  | 字面值 | 處理 |
  | :-- | :-- |
  | 選中底 `rgba(27,79,156,.1)` | 改 `color-mix(in srgb, var(--blue-700) 10%, transparent)` |
  | 分群名「`--blue-700` 80% 透明」 | 同上，`color-mix(... 80% ...)`；或 `opacity:.8` 套在文字元素 |
  | warning 徽章字色 `#8a6412` | v1.1 已有同一值（寫死）。沿用現況寫法、集中成 CSS 字串開頭的一個 custom property `--erd-warn-ink`，規則只引用它 —— 比照工作台 `--wb-*` 的做法 |
- 圓角：NoteCraft 工作台已把 `--radius-*` 縮一級，直接引用變數即可，prototype 的數值已套用
- 動態：`--duration-fast`、`--ease-out`；按鈕 press `scale(.97)`；hover 上移 1px 與陰影加深在 `prefers-reduced-motion: reduce` 下取消位移
- 等寬字：`--font-mono`（表名、欄名、型別、schema key）

---

## 8. 各畫面

像素值見 handoff〈Screens / Views〉。以下只記**偏離與補充**。

### 8.1 外殼

- **高度**（Q3 已定案）：embed 一律 **580px**、外殼**不畫外框與圓角**（由 `GeneratedFrame` 提供，避免雙框）；外殼容器寬 ≤ 520px 時改 `min(580px, 75vh)`，畫布高度隨之扣減。`options.canvasHeight` 仍只管畫布高度；page 模式外殼**不設高度**、隨內容長高（Q4 已定案，見 §6.4）
- **bar 的標題**：prototype 在 embed 且非 bare 時於 bar 顯示 `meta.title`。實作上 `<PluginView>` 一律包 `GeneratedFrame`，外框標題列已顯示 caption／plugin 標題，**bar 不再重複標題**（等同 prototype 的 bare 分支）
- bar 在窄寬度（容器 < 520px）時：Tabs 只留 icon + 文字縮為 `aria-label`、crumb 隱藏、範圍 pill 改水平捲動

### 8.2 導覽

- 篩選比對（Q7 已定案）：表名、表 label、**欄位名**，不分大小寫；與 Diagram 搜尋**共用同一個比對函式**（放 `derive.ts`，一併納入 `scripts/checks`）。prototype 只比表名與 label —— 導覽篩「customer_id」查不到會讓人以為沒有這欄
- 表名或 label 未命中、只因欄位命中的表：表列 label 位置改顯示命中的欄名（mono、`--blue-700`），多於一欄時為「`customer_id` …」；hover `title` 列出全部命中欄。表名／label 有命中時照常顯示 label
- 命中數 `命中/總數`：藍＝有、`--danger-500`＝0（沿用 v1.1 `erd-hits` 語彙）
- 收合狀態不持久化（每次載入依預設：page 全展開、embed 只展開 route 所在的 schema）
- 目前 route 的節點在載入與換頁時 `scrollIntoView({ block: 'nearest' })`

### 8.3 Wiki：總覽／Schema／Table

照 handoff。補充：

- **Schema 卡片與 Schema 頁表格的「首行說明」**：用 `stripMarkdown()` 取第一個非標題段落的純文字，而非 prototype 的 `split('\n')[0].replace(/[`*]/g,'')` —— 後者遇到以 `## 標題` 開頭的 description 會顯示「## 標題」
- **Schema 空狀態**（handoff 第 4 條）：schema 底下 0 個 group 時，頁面顯示「這個 schema 底下還沒有分群。在資料檔的 `groups[].schema` 指定歸屬。」
- **分群說明** `groups[].description` 也走 Markdown（prototype 是純文字 `<p>`；schema 註明它是 Markdown）
- **Table 頁統計列**的 `§2.1`：prototype 用 DS 的 `Badge` 元件；plugin 不能 import app 元件，改為 plugin 自己的 `.erd-badge--blue`（樣式對齊 DS Badge）
- **欄位表的 fk chip**：`→ parent.id`；父表不存在（fk 指向不在資料檔內的表）時 chip 顯示為不可點的淡色，與 v1.1「edge 不畫」一致
- **索引與唯一鍵**：0 筆時整節顯示「沒有索引或唯一鍵。」而非空白（prototype 是空的 `div`）

### 8.4 局部關聯圖

- 量測：`useLayoutEffect` + `ResizeObserver`（觀察容器）；字型載入完成（`document.fonts.ready`）後再量一次 —— Noto Sans TC 較晚到，首量會偏
- 父／子各超過 8 張時（Q5 已定案），欄內只顯示前 8 張 + 「另有 N 張」chip，點擊以 `scrollIntoView` 捲到下方對應的「參照」／「被參照」清單（清單永遠列全部）。張數以**表名去重**計；前 8 張依 `tables[]` 原順序。hub 表的子表可能上百，不設上限會把頁面拉到數千 px
- 自我參照不佔名額（它畫在本表節點下方的註記，不是一個節點）
- 窄寬度（容器 < 560px）：三欄改上下三列（父 → 本表 → 子），連線改垂直貝茲

### 8.5 迷你 Markdown（安全性）

- 只支援 handoff 列的 8 種語法；輸出 React 元素，**不用** `dangerouslySetInnerHTML`（install lint 本來就會擋）
- `[文字](url)` 的 `url` 必須通過白名單：`http:`、`https:`、`mailto:`、單一 `/` 開頭的站內路徑、`#` 錨點；其餘（`javascript:`、`data:`、`vbscript:`、`//host`）**當純文字輸出**。React 對 `javascript:` href 只警告不擋，這一條不能省
- 外部連結加 `target="_blank" rel="noopener noreferrer"`
- 自動連結（Q10 已定案）：反引號內容**完全相等**於表名或 schema key 才連（大小寫敏感，資料庫名稱本就大小寫敏感）
  | 反引號內容 | 結果 |
  | :-- | :-- |
  | `customer`（無前綴） | 是表名 → Table 頁；否則是 schema key → Schema 頁；兩者皆是 → **表名優先**；皆否 → 一般 code |
  | `table:customer` | 只找表。找到 → Table 頁，**顯示文字去掉前綴**（`customer`）；找不到 → 一般 code、保留原字串（讓作者看得出引用壞了） |
  | `schema:crm` | 只找 schema，其餘同上。隱含模式下一律找不到 |
  - 前綴只認這兩個、全小寫、冒號後不可有空白；`table:` 後面若含 `.`（如 `table:customer.id`）不在支援範圍，當一般 code
  - `stripMarkdown`（plugin 與 app 兩支）遇到帶前綴的反引號：找得到與否無從得知（app 端沒有表清單），**一律去掉 `table:`／`schema:` 前綴**再輸出純文字
  - README「資料長什麼樣」補一段說明前綴語法
- `stripMarkdown(src)`：同一支 parser 的純文字模式，給卡片摘要用；app 端的去標記**另寫一份**（§11.1），因為 app 不能 import plugin

### 8.6 Diagram

照 handoff：scope 過濾欄／群／edge、跨 scope 連線數提示（`--orange-600`）、切換 scope 重置 `touched` 並重新 fit、聚焦列「開啟 Wiki」、搜尋只搜範圍內。

補充：
- 範圍變動時，若目前 focus 不在新範圍內 → 清 focus
- hub 表不在範圍內時，「顯示 hub 連線」開關與圖例中的 hub 項隱藏
- 提示列文案沿用 `options.hint`

### 8.7 embed 與全寬

- 全寬覆蓋層沿用 v1.1 的 `position:fixed` + 鎖 body 捲動。**注意 z-index**：v1.1 用 `2147483000`，高於工作台 §4.5 階梯的一切（含 Palette、Toast）。沿用 —— 全寬是讀者主動進入的模態，應蓋過一切；Toast 被蓋住可接受
- 與 `GeneratedFrame` 的「放大檢視」（`VizZoom`）並存：兩者都能把內容攤開。v1.1 就是如此，維持；VizZoom 把 `data-nc-viz-body` 搬進全螢幕畫布後，plugin 的容器寬度變大，外殼的 container query（§9）會自然切到寬版
- 導覽點選後自動收起：僅 embed 且非全寬

---

## 9. 響應式

Handoff 用 `@media (max-width:760px)`。但**筆記內文欄就是 760px**，桌面上的內嵌永遠吃不到這條、手機上的 page 模式卻吃得到 —— 判斷依據應該是**外殼自己的寬度**，不是視窗。

- 外殼設 `container-type: inline-size; container-name: erd`，斷點改 `@container erd (max-width: 760px)`（工作台 TOC 已用 container query 解決同樣問題，前例可循）
- ≤760：nav 改覆蓋（absolute、`--shadow-lg`），頁面 padding 20px 18px
- ≤520：bar 精簡（§8.1）
- ≤560：局部關聯圖改直向（§8.4）
- 這表示**桌面上的內嵌也會使用覆蓋式導覽**（760 內文欄 − frame padding < 760）—— 正符合 handoff「embed 導覽預設收」的意圖

---

## 10. 無障礙與鍵盤

- Tabs：`role="tablist"`／`role="tab"`／`aria-selected`、`aria-controls` 指向 main；左右方向鍵切換
- 導覽：`<nav aria-label="Schema 與資料表">`；caret 按鈕 `aria-expanded`；目前節點 `aria-current="page"`
- 範圍 pill：`role="radiogroup"` + `role="radio"`／`aria-checked`
- 全寬覆蓋層：`role="dialog" aria-modal="true" aria-label="<title>（全寬檢視）"`；開啟時焦點移到覆蓋層、關閉時還給「展開全寬」按鈕（v1.1 沒做焦點管理，順手補）
- **Esc**（沿用 v1.1 逐層退，補兩條）：
  1. 事件已 `defaultPrevented` → 不處理（工作台 `wb-escape` 的 Palette／Drawer 先處理掉的 Esc 不再被 plugin 吃一次）
  2. 焦點在 plugin 外、且不在全寬 → 不處理（同一篇筆記兩個內嵌時，按一次 Esc 不會兩張圖同時取消聚焦）
  3. 順序：tooltip／focus → 導覽覆蓋（≤760 時）→ 全寬
  - 需驗證：`VizZoom` 的 Esc 監聽在 capture 階段。若 plugin 在 VizZoom 內按 Esc，VizZoom 會先關；這與「逐層退」相反。實作時確認 VizZoom 是否 `preventDefault`，必要時 plugin 在 capture 階段先處理並 `stopPropagation`（僅在它確實有東西可退時）

---

## 11. App 端配合

### 11.1 `meta.description` 去除 Markdown（handoff 第 6 條）

它在 app 的出口：

| 出口 | 位置 |
| :-- | :-- |
| `<meta name="description">` | `view/[...path].astro` → `WorkbenchLayout.astro:70` |
| `/view` Toolbar 說明文字（**pagefind 索引**） | `view/[...path].astro:73-75` |
| `/wb-index.json` `dataFiles[].description` | `workbench.ts:271-281` |
| 系列章節 `description` | `series.ts:180` |

做法：

- 新增 `src/lib/strip-markdown.ts`：去除 `#`／`>`／`-`／`1.` 行首、`**`／`__`／`*`／`_`、反引號、`[文字](url)` → `文字`、圖片語法、HTML 標籤。兩個函式：
  - `stripMarkdownFirst(src)`：第一個非標題段落（空行前），合併為單行
  - `stripMarkdownAll(src)`：全文，區塊之間以空白分隔，合併為單行
- `readMeta()` 回傳 `description`（原字串）、`descriptionText`（第一段）、`descriptionIndex`（全文）
- **顯示第一段、索引全文**（Q9 已定案）：

  | 出口 | 用哪一份 |
  | :-- | :-- |
  | `<meta name="description">` | `descriptionText` |
  | `/view` Toolbar 說明文字 | `descriptionText`，**移除**它身上的 `data-pagefind-body` |
  | `/view` 頁新增的索引元素 | `descriptionIndex`，標 `data-pagefind-body` |
  | `/wb-index.json` `dataFiles[].description` | `descriptionText` |
  | 系列章節 `description` | `descriptionText` |

- 索引元素：`<div data-pagefind-body hidden aria-hidden="true">{descriptionIndex}</div>`，放在 stage 之外。只在 `descriptionIndex` 與 `descriptionText` 不同時輸出；相同（純文字、單段）時仍把 `data-pagefind-body` 留在 Toolbar 上，行為與現況一致
- **需驗證**：pagefind 對 `hidden` 屬性的元素是否照常索引（它解析 build 後的 HTML、不套 CSS，預期會；若不會，改用 `.sr-only` 式的視覺隱藏並保留 `aria-hidden`）。驗證方式：build 後以 v1.2 範例的第二段內文（例：「閱讀順序」）在 Palette 內文組搜得到
- 為什麼顯示只取第一段：Toolbar 是一行文字，而 v1.2 範例的 description 有 `## 閱讀順序` 與清單，整篇攤平會是一長串；第一段恰好是摘要
- 既有的 `excerpt()`（`notes.ts`）不共用：它是給筆記本文用的（丟掉整行標題／清單），不處理行內標記
- **這是 app 的改動，跨所有 plugin 生效** —— 任何 plugin 的資料檔 `meta.description` 寫 Markdown 都會被乾淨地攤平。已是純文字的 description 結果不變

### 11.2 `/view` 頁高度（Q4 已定案：不改 app）

採選項 C，app 端**不動**：

- 外殼在 page 模式不設高度，Wiki 頁隨內容長高，整頁由 `#nc-scroll` 捲動
- nav：`position: sticky; top: 0; align-self: flex-start; max-height: calc(100dvh - var(--erd-page-offset)); overflow: auto`。`--erd-page-offset` 預設約為工作台頁首 + Toolbar + stage 上方 padding（實作時量測，約 110px）；**算錯只會讓導覽底部多留白或略短，不會破版**
- bar：同樣 sticky（`top: 0`，nav 的 sticky `top` 讓出 bar 高度 44px），捲動長頁時分頁與導覽開關仍在
- Diagram 分頁：畫布高度沿用 v1.1 的 `clamp()`，行為與 v1.1 相同
- 代價：與 DBdocs 相比，導覽不是「頁面左側整條獨立捲動區」，而是隨頁捲動時貼在頂端的面板；接受

### 11.3 版本與 `engines`

- `engines.notecraftapp` 維持 `>=0.6.0`：v1.2 plugin 在舊 app 上**能跑**，差別只在 app 端的 description 會出現 Markdown 符號，屬外觀退化非功能失效
- Q4 定案不改 app 版面，`engines` 不因此升版
- App 版號：§11.1 是新增行為 → notecraftapp **1.3.0**（現為 1.2.3）

---

## 12. 驗證與測試

### 12.1 自動化（Q6 已定案）

專案沒有 test runner。**不新增** vitest 或任何套件，延伸既有護欄：

| 驗證 | 做法 |
| :-- | :-- |
| 兩份範例都通過 v1.2 schema | `check-plugins` 改為：`manifest.example` 仍是主範例；另外驗證 `example/` 目錄下**所有** `.json`（Ajv2020） |
| 兩份範例都能 build | `check-plugins` 把 `example/*.json` 全部放進同一個 fixture 的 `docs/`（檔名保留、副檔名對上 fixture 的 `plugins.json` 規則），**一次** build。逐一 build 會讓 check 時間隨範例數倍增 |
| v1.1 資料的推導 | 測試**不放**在 plugin 目錄內（放了會被 install lint 當成 plugin 程式掃描、也會被 registry 要求登記、還會隨安裝發給使用者）。改放 `scripts/checks/er-derive.mjs`，以 `node --experimental-strip-types`（Node 22.6+）直接 import `derive.ts` 跑 assert |
| `derive` 的斷言 | ① v1.1：`implicit=true`、tree 只有 `_all`、無孤兒；② v1.2：3 schemas、群序依 layout；③ 刪掉某 group 的 `schema` → 歸 `schemas[0]` 並列入孤兒；④ 指向不存在 key → 同 ③；⑤ 自我參照不計入 parents/children；⑥ 同父表兩個 fk 去重後算一張 |
| Markdown | 自動連結的解析（無前綴撞名、`table:`／`schema:` 前綴、找不到時保留原字串、隱含模式）；`stripMarkdown()` 與 app 端 `strip-markdown.ts` 的對照案例（含 `javascript:` 連結被當文字）。app 端那支同樣要保持零 runtime import，才能被 strip-types 直接載入 |
| 執行方式 | `check-plugins` 在 manifest／schema 驗證之後、build 之前依序 `spawn` 執行 `scripts/checks/*.mjs`，任一個非零結束即 fail；`--skip-build` 不略過它們（很快）。另加 `npm run check:er` 方便單跑 |
| 轉檔腳本 | 以 `schema-demo.er.json`（本就是轉檔產物）驗 v1.2 schema 通過 |

`scripts/checks/*.mjs` 接進 `npm run check-plugins`，`prepublishOnly` 自然涵蓋。

限制：Node 的 strip-types 不解析省略副檔名的相對 import。因此 `derive.ts` 與 `markdown.tsx` 的純函式部分**只能有 `import type`**（型別 import 會被整行抹除），不可 runtime import 其他 plugin 檔；`stripMarkdown` 要放在不含 JSX 的 `.ts` 檔（Node 不轉 JSX）—— 實作時把它從 `markdown.tsx` 拆到 `markdown-text.ts`。

### 12.2 手動（瀏覽器）

用 `npm run dev` + Browser pane 走 handoff 的驗收清單，另加：

- [ ] `/view/schema-demo.er`（v1.1、36 表）：無 Schema 層、無範圍切換、Diagram 與 v1.1 並排比對無回歸
- [ ] `資料檔內嵌測試` 筆記：embed 580px、無雙框、導覽預設收、全寬 → hold 卡 → 回到本文、VizZoom 放大後切寬版
- [ ] localStorage 塞無效 route（改名後殘留）→ 回退總覽
- [ ] 手機寬度（375）page 與 embed
- [ ] `npx astro build` 後 `/view` 頁的 `<meta description>`、Toolbar 只有第一段且無 Markdown 符號；pagefind 搜得到 description 第二段以後的字（用 v1.2 範例另建一份測試資料檔驗）
- [ ] reload 無 hydration 警告（console）

---

## 13. 實作階段

單一分支 `feat/er-diagram-redesign`，依序 commit，每個 commit 皆可 build。Task 自 **76** 起編號。

| Task | 內容 | 章節 | 主要檔案 |
| :-- | :-- | :-- | :-- |
| [76](tasks/task-76-er-schema-v12-examples.md) | 資料格式 v1.2：schema、範例改名與新增、型別；**`check-plugins` 驗證並 build `example/` 下所有範例** | §5.1、§2.1、§12.1 | `schema.json`、`example/*`、`registry.json`、`scripts/check-plugins.mjs` |
| [77](tasks/task-77-er-split-files.md) | 拆檔（**純搬移、零行為變更**）：`types`／`styles`／`diagram` 自 `renderer.tsx` 切出；並排截圖比對 | §4.1 | `renderer.tsx`、`types.ts`、`diagram.tsx`、`styles.ts` |
| [78](tasks/task-78-er-derive-compat-checks.md) | `derive.ts` + 相容規則 + `matchTable` + dev warn；`scripts/checks` 串進 `check-plugins` | §5.2–5.4、§12.1 | `derive.ts`、`scripts/checks/er-derive.mjs` |
| [79](tasks/task-79-er-mini-markdown.md) | 迷你 Markdown + `stripMarkdown` + 自動連結（含前綴）+ 連結白名單 | §8.5 | `markdown.tsx`、`markdown-text.ts`、`scripts/checks/er-markdown.mjs` |
| [80](tasks/task-80-er-shell-nav-routing.md) | 外殼（580／sticky／全寬）+ 導覽 + 路由／同步 + 持久化 | §6、§8.1–8.2、§11.2 | `renderer.tsx`、`nav.tsx` |
| [81](tasks/task-81-er-wiki-pages.md) | Wiki 三頁 + 空狀態 + 隱含模式 | §5.3、§8.3 | `wiki.tsx` |
| [82](tasks/task-82-er-local-diagram.md) | 局部關聯圖（上限 8） | §8.4 | `local-diagram.tsx` |
| [83](tasks/task-83-er-diagram-scope.md) | Diagram：scope、跨 scope 提示、開啟 Wiki、`query`／`showHubEdges` 提升 | §8.6、§6.1 | `diagram.tsx`、`renderer.tsx` |
| [84](tasks/task-84-er-responsive-a11y.md) | 響應式（container query）+ 無障礙 + Esc | §9、§10 | `styles.ts`、各元件 |
| [85](tasks/task-85-app-meta-description-markdown.md) | App 端：`strip-markdown`、`readMeta`、四個出口、pagefind 全文索引元素；notecraftapp 1.3.0 | §11 | `src/lib/*`、`view/[...path].astro` |
| [86](tasks/task-86-er-docs-release.md) | README、版號 1.2.0、CHANGELOG、CLAUDE.md、plugin 規格、全面驗收、本文 §17 回填 | §2.1、§12.2 | manifest、registry、README、文件 |

依賴：`76 → 77 → 78 → 79`；`80` 依賴 78；`81` 依賴 79＋80；`82` 依賴 81；`83` 依賴 80（可與 81、82 並行）；`84` 依賴 81–83；`85` 依賴 79（可與 80–84 並行）；`86` 最後。

**Task 76 先建護欄**：v1.1 與 v1.2 兩份範例從第一個 commit 起就都驗證、都 build（原排在 Task 86，提前是為了讓之後每一步都有回歸保護）。**Task 77 刻意不改行為**：之後每一步的 diff 都能對著「已拆好的 v1.1」看，Diagram 回歸時容易定位。

---

## 14. 風險

| 風險 | 影響 | 緩解 |
| :-- | :-- | :-- |
| registry `files` 漏登記新檔 | store 安裝的使用者拿到缺檔 plugin，build fail | `check-plugins` 本就比對集合（多一個少一個都 fail）；推上預設分支 = 發佈，務必先跑 |
| Diagram 搬移時的回歸 | 縮放、fit、量測是 v1.1 花最多時間調的部分 | Task 77 純搬移；並排比對截圖 |
| hydration mismatch | console 警告、首繪閃爍 | §6.3：SSR 與首次 render 一律預設值 |
| 局部關聯圖在 hub 表上爆高 | 頁面數千 px、量測成本高 | §8.4 上限 8 + 「另有 N 張」 |
| `meta.description` 改 Markdown 後舊 app 顯示符號 | 外觀退化 | README 註明需要 notecraftapp ≥ 1.3.0 才會自動去標記 |
| Esc 與工作台／VizZoom 互相搶 | 一次 Esc 關兩層，或關錯層 | §10 三條規則；實作時實測 |
| 580px 內嵌在手機上過高 | 筆記內一塊 580px 的捲動區，捲動陷阱 | 容器寬 ≤ 520px 時 embed 高度改 `min(580px, 75vh)`（Q3 已定案） |

---

## 15. 待釐清問題

每題附建議。**全數已定案**，決議見 §16；Q9、Q10 未採用原建議。

### Q1. 拆檔還是維持單檔？ ✅ 已定案（§16）

- 查證：拆檔可行（§4.1）。代價是 registry `files` 從 5 個變 14 個、每次新增檔案都要記得登記
- **建議：拆**，照 §4.1 的切法。1100 行 + Wiki 預估會到 2200 行以上，單檔難以 review；Task 77 的「純搬移」也只有拆檔才有意義

### Q2. reload 後先閃總覽再跳原頁，可接受嗎？ ✅ 已定案（§16）

- 選項 A：接受（page 模式約一幀、embed 通常看不到）
- 選項 B：page 模式在讀完 localStorage 前以 `visibility:hidden` 包住 main
- **建議：A**。B 會讓 SSR 產出的內容在 JS 失敗時完全看不到

### Q3. 內嵌高度：600 還是 580 去外框？手機上呢？ ✅ 已定案（§16）

- Handoff 寫「embed 600px（放在工作台 figure 內時 580px、去外框）」。實際上 `<PluginView>` **一律**包在 `GeneratedFrame` 裡，不存在「不在 figure 內」的內嵌 —— 兩者其實是同一種情況
- **建議**：embed 一律 580px、外殼不畫外框與圓角（由 GeneratedFrame 提供）；容器寬 ≤ 520px（手機）時改 `min(580px, 75vh)`。`options.canvasHeight` 仍只管畫布高度

### Q4. page 模式的高度：佔滿內容區，還是隨內容長高？ ✅ 已定案（§16）

- Handoff 要外殼「高度 100%、佔滿資料檔頁內容區」，nav 與 main 各自捲動（DBdocs 的樣子）
- 現況 `.nc-dv-stage` 有 `padding: 18px … 48px` 且隨內容長高，外層 `#nc-scroll` 捲動 —— plugin 內寫 `height:100%` 解析不到
- 選項 A（app 改）：`/view` 頁讓 stage 成為 `height:100%` 的 flex 容器、移除 padding；影響**所有** plugin 的獨立頁（目前官方只有這一個，使用者自製的會跟著變）→ 需要 manifest 新欄位讓 plugin 選擇，如 `"page": "fill"`
- 選項 B（plugin 自理）：外殼用 `height: calc(100dvh - <頁首 + Toolbar + stage padding>)`，數值寫死在 plugin；工作台頁首高度一變就錯
- 選項 C：外殼不佔滿，nav 用 `position: sticky` 貼齊 `#nc-scroll` 頂端、main 隨內容長高，整頁由 `#nc-scroll` 捲動
- **建議：C**。不動 app、不寫死數值；DBdocs 感只差在「導覽不獨立捲動」—— 以 sticky + `max-height: calc(100dvh - …)` 讓導覽在長清單時自己捲，這個 calc 只影響導覽高度，算錯也只是多留白。Diagram 分頁沿用 v1.1 的 `clamp()` 高度

### Q5. 局部關聯圖的父／子表上限？ ✅ 已定案（§16）

- **建議：各 8 張**，超過顯示「另有 N 張」chip 捲到下方清單（§8.4）。`option_item` 這類 hub 表在 demo 資料裡被 20+ 張表指向

### Q6. 測試怎麼做？ ✅ 已定案（§16）

- 選項 A：新增 vitest（devDependency）
- 選項 B：延伸 `check-plugins` + `scripts/checks/*.mjs`（Node 22 原生 strip-types），不加套件（§12.1）
- **建議：B**。與「沿用既有技術棧」一致，且這些斷言本來就屬於發佈護欄

### Q7. 導覽篩選要不要比對欄位名？ ✅ 已定案（§16）

- Prototype 只比表名與表 label；v1.1 的 Diagram 搜尋有比欄位名
- **建議：要**，與 Diagram 搜尋同一個比對函式。命中欄位時，表列右側顯示命中的欄名（最多 1 個 + 「…」）

### Q8. 切換 Wiki／Diagram 時，Diagram 的展開欄位與搜尋字串要保留嗎？ ✅ 已定案（§16）

- 視角（縮放／平移）一律重算（§4.2）
- **建議：保留 `query` 與 `showHubEdges`**（提升到外殼 state），`expanded` 不保留 —— 展開是對某次閱讀的局部操作

### Q9. `meta.description` 的純文字版取第一段還是全文？ ✅ 已定案（§16）

- **建議：第一段**（§11.1）。`<meta description>` 與 Toolbar 都是摘要的位置；全文攤平會把「## 閱讀順序 1. 先看…」塞進一行
- 連帶：pagefind 因此只索引第一段。若作者希望全文可搜，Toolbar 顯示第一段、另以 `data-pagefind-body` 的隱藏元素放全文純文字

### Q10. 表名與 schema key 撞名時的自動連結？ ✅ 已定案（§16）

- **建議：表名優先**（§5.2），README 註明避免撞名。不做 build 期檢查（plugin 無 build 期 hook）

---

## 16. 定案紀錄

全數已定案，格式同工作台設計文件 §16。

| # | 議題 | 決議 | 定案日 |
| :-- | :-- | :-- | :-- |
| Q1 | 拆檔還是維持單檔 | **拆檔**，照 §4.1 的切法：renderer／types／derive／diagram／local-diagram／nav／wiki／markdown／markdown-text／styles。所有新檔必須同步登記到 `registry.json` 的 `files`（store 安裝只下載清單內的檔），由 `check-plugins` 的集合比對把關。Task 77 先做純搬移、零行為變更 | 2026-09-27 |
| Q2 | reload 後先閃總覽再跳原頁 | **接受**。SSR 與首次 client render 一律用預設值（overview／wiki／全部），`useEffect` 掛載後才讀 localStorage 並驗證、套用；不以 `visibility:hidden` 遮蔽 main，確保 JS 失敗時仍看得到 SSR 的總覽 | 2026-09-27 |
| Q3 | 內嵌高度 | **580px、外殼去外框與圓角**（外框由 `GeneratedFrame` 提供）。查證 `<PluginView>` 一律包 `GeneratedFrame`，handoff 的「600」與「figure 內 580」是同一種情況。外殼容器寬 ≤ 520px 時改 `min(580px, 75vh)`；畫布高度 embed 預設 440；`options.canvasHeight` 仍只管畫布 | 2026-09-27 |
| Q4 | page 模式高度 | **選項 C：外殼隨內容長高、整頁由 `#nc-scroll` 捲動**；bar 與 nav 為 sticky，nav 以 `max-height: calc(100dvh - offset)` 自己捲。app 的 `/view` 頁與 manifest 規格皆不動、`engines` 不升；未採用「manifest 加 `page: fill`」與「plugin 寫死 calc 外殼高度」。Diagram 畫布沿用 v1.1 `clamp()`；全寬覆蓋層內外殼佔滿視窗。細節見 §6.4、§11.2 | 2026-09-27 |
| Q5 | 局部關聯圖的父／子表上限 | **各 8 張**（以表名去重、依 `tables[]` 原順序），超過時顯示「另有 N 張」chip，點擊捲到下方完整的參照／被參照清單；不在圖內展開。自我參照不佔名額。不區分是否為 hub 表 | 2026-09-27 |
| Q6 | 測試怎麼做 | **延伸 `check-plugins`，不新增套件**。`manifest.example` 仍為主範例（v1.2），但驗證與 build 涵蓋 `example/` 下所有 `.json`（v1.1 範例改名 `schema.v1.1.json` 保留）、同一個 fixture 一次 build；`derive`、`stripMarkdown`、連結白名單的斷言放 `scripts/checks/*.mjs`，以 Node 22 原生 strip-types 直接 import `.ts`，由 `check-plugins` 串接（`prepublishOnly` 自然涵蓋）。測試不放在 plugin 目錄內 | 2026-09-27 |
| Q7 | 導覽篩選是否比對欄位名 | **要**。比對表名、表 label、欄位名（不分大小寫），與 Diagram 搜尋共用同一個比對函式。僅因欄位命中的表，表列以命中的欄名取代 label 位置（最多 1 個 + 「…」，`title` 列全部） | 2026-09-27 |
| Q8 | 切換分頁時 Diagram 狀態的保留 | Diagram 維持**卸載**、視角每次重新 fit。**保留 `query` 與 `showHubEdges`**（提升到外殼 state、不持久化）；`expanded`、tooltip、hover 不保留。未採用 `display:none` 常駐（隱藏時量測會得 0） | 2026-09-27 |
| Q9 | `meta.description` 純文字版的範圍 | **顯示第一段、索引全文**（未採用建議的「一律第一段」）。`readMeta()` 產出 `descriptionText`（第一段）與 `descriptionIndex`（全文）；`<meta description>`、Toolbar、`/wb-index.json`、系列章節用第一段；`/view` 頁另輸出 `hidden` 的 `data-pagefind-body` 元素裝全文，Toolbar 上的索引標記移過去（兩者相同時維持現況）。待驗證 pagefind 會索引 `hidden` 元素。跨所有 plugin 生效 | 2026-09-27 |
| Q10 | 表名與 schema key 撞名時的自動連結 | **支援前綴指定**（未採用建議的「僅表名優先」）：反引號內可寫 `table:x`／`schema:x` 明確指定目標，連結顯示文字去掉前綴；指定目標不存在時當一般 code 並保留原字串。無前綴時撞名以表名優先。兩支 `stripMarkdown` 一律去掉前綴。README 補語法說明 | 2026-09-27 |

---

## 17. 實作後回填

Task 76–86 已全部實作（2026-09-27，plugin v1.2.0／notecraftapp v1.3.0），逐 Task commit 於 `feat/er-diagram-redesign`。

### 待驗證項的結論

| 待驗證項 | 結論 | 寫在 |
| :-- | :-- | :-- |
| pagefind 是否索引 `hidden` 屬性的元素 | **會**。build 後以 v1.2 範例 description 第二段以後的詞（「命名慣例」「軟刪除」）在 pagefind 搜得到 `/view/testing/er-v12.er/`；欄位名仍搜不到。不需要改用視覺隱藏 | §11.1 |
| `VizZoom` 的 capture 階段 Esc 是否破壞逐層退 | **會**：VizZoom 在 window capture 階段攔 Esc 並 `stopPropagation`，plugin 原本在 bubble 階段的監聽收不到。改為 plugin 也掛 capture —— 它比 VizZoom 早註冊、先執行，**有東西可退才** `stopImmediatePropagation`。實測放大檢視中：第一次 Esc 取消聚焦、第二次才關放大 | §10 |
| page 模式導覽的高度上限（原寫 `--erd-page-offset` 約 110px） | 不寫死：renderer 往上找最近的 `overflow-y: auto/scroll` 祖先、量它的 `clientHeight` 寫進 `--erd-scroll-h`（ResizeObserver 跟著更新），導覽 `max-height: calc(var(--erd-scroll-h) - 44px)`。不以 id 查 `#nc-scroll` | §11.2 |
| embed 畫布在 580 外殼內的實際高度 | 改為**填滿外殼剩餘高度**（flex），不寫死 440。1280 寬、導覽收起時實測：未聚焦 **434px**；聚焦時聚焦列約 120px、畫布約 330px。提示列在 embed 限一行、聚焦列關聯文字限兩行 | §2.2、§8.1 |

### 實作中新增的決定

| 項目 | 決定 | 為什麼 |
| :-- | :-- | :-- |
| **`<style>` 的 CSS 不可含 `< > & " '`** | 子代選擇器用空白、分頁底線改用 `linear-gradient` 背景（不用 `content: ""` 偽元素）；新增 `scripts/checks/er-styles.mjs` 把關，也檢查每條規則以 `.erd-root` 起頭 | React SSR 會把 `<style>` 文字裡的這些字元跳脫成實體，瀏覽器不會在 raw text 元素裡解回來 —— SSR 的選擇器壞掉、hydration 對不上、整個 island 退回 client render。v1.1 的 CSS 剛好沒用到這些字元，是新增 `>` 選擇器時才踩到 |
| **`ResolvedDataFile.description` 直接是第一段純文字**（未照 §11.1 另開 `descriptionText`） | `description` 改為純文字、新增 `descriptionIndex`（全文）；原文仍在 `data.meta.description` | app 沒有任何出口需要 Markdown 原文；改 `description` 本身的語意，漏改的出口也自動拿到純文字，比多一個欄位安全 |
| **全寬只換外層容器、不換外殼在樹上的位置** | `.erd-inline`／`.erd-overlay` 是同一個 div 換 class；hold 卡片是它前面的兄弟節點 | 換位置 React 會重掛，路由以外的狀態全歸零。v1.1 靠「同一段 JSX 搬兩處」保住狀態，拆檔後改用這個做法（Task 77 起） |
| **container 掛在外殼的外層容器上** | `container: erd / inline-size` 掛在 `.erd-inline` 與 `.erd-overlay`，不掛在外殼本身 | 外殼自己的高度（embed 窄版 `min(580px, 75vh)`）也要依寬度切換，元素不能查詢自己；覆蓋層是 fixed、寬度就是視窗，窄版規則自然不觸發 |
| **窄版導覽的背板與焦點** | 覆蓋式導覽加半透明背板（點擊收起）；開啟時焦點到篩選框、收起時若焦點在導覽內就還給導覽開關 | §10 只寫了全寬的焦點管理；覆蓋式導覽同樣是浮層 |
| **隱含模式的分群卡片不整張可點** | 卡片本身是靜態的，裡面的表名 chip 各自可點到 Table 頁 | §5.3 原寫「點卡片 → 導覽展開並捲到該分群」，但沒有分群頁可去；表名 chip 直接到表更有用 |
| **`--warning-700` 不存在於 DS** | v1.1 的衍生欄徽章字色寫的是 `var(--warning-700)`，DS 只有 `--warning-50/500`，實際一直是繼承色。改用集中定義的 `--erd-warn-ink: #8a6412` | §7 以為 v1.1 寫死了 hex，查證後其實是引用了不存在的 token |
| **`matchTable` 空字串回傳命中** | 導覽沒有篩選字時所有表都顯示；Diagram 只在有字時才呼叫 | 兩處共用一支，行為要能直接套用 |
| **`#` 視同 `##`** | 迷你 Markdown 的標題規則 `#{1,6}`：一個或兩個 `#` 為 h3、三個以上為 h4 | prototype 只認 `##`／`###`，單一 `#` 開頭的行會卡在段落判定外造成無限迴圈 |
| **資料檔頁滿版**（2026-09-27 作者追加） | app 的 `/view` 頁 `.nc-dv-stage` 拿掉 padding（原 `18px clamp(12px, 3vw, 40px) 48px`），背景改卡片色；ER 外殼在 page 模式不畫外框與圓角、`min-height` 撐滿捲動容器的可視高度；Diagram 分頁外殼**剛好等於**可視高度、畫布填滿剩餘空間（取代 v1.1 的 `clamp(420px, 100vh - 250px, 1200px)`，那個 250 是把舊 padding 算進去的猜測值） | 作者要求資料檔渲染頁以滿版呈現。改 app 端的 stage 會影響所有 plugin 的獨立頁：需要留白的 plugin 可以在自己的根元素加 padding，反過來要吃掉外層 padding 則做不到，所以 app 端不留 |
| **局部關聯圖改用直角折線**（2026-09-27 作者追加） | 取代 §8.4 的貝茲曲線：父表側、子表側各一條垂直主幹，放在欄距正中間（不是每條線各取中點 —— 節點寬度不一，主幹會散成好幾條錯開的豎線），轉角 8px 圓角，高度相同時直接畫水平線。窄寬度（< 560px）的上下三列改為整列一條主幹箭頭（本表 → 父表列、子表列 → 本表），列標籤靠左、隱藏「本表」標籤 | 兩欄距離拉開後，控制點只偏 40px 的貝茲曲線幾乎是斜直線，不好讀；窄版的節點會換成好幾列，逐一連線會穿過前一列的節點、也壓在置中的列標籤上 |
| **`check-plugins` 需要 Node 22.6+** | 開頭檢查版本，不足時明確報錯；`engines.node` 維持 `>=22.0.0` | 只影響維護者跑 `check-plugins`／`prepublishOnly`，不影響使用者安裝 app |

### 順手修的既有問題

- **dev 下改資料檔後整站 500**（`fix(plugins)` 那筆 commit）：`invalidatePluginCaches()` 只清了 validator 的 Map，Ajv 實例仍以 `$id` 記著舊 schema，下一次 compile 丟「schema with key or id … already exists」。清快取時一併 `ajv.removeSchema()`
- v1.1 renderer 的 `note` 可能為 `undefined` 的 4 個型別錯誤

### 仍未做的

- 導覽樹的方向鍵移動（roving tabindex）—— §1.3 已列為非目標
- `tsc --noEmit` 仍有 48 個既有錯誤（`src/lib/workbench.ts` 的 `process` 型別等），與本次改版無關；plugin 目錄內為 0
- install lint 的「多行 import 未檢查」缺口（§4.1）未修
- 驗證中發現：Browser pane 未繪製時 ResizeObserver 與 IntersectionObserver 不觸發（`client:visible` 不 hydrate、窄版判定不跑），截圖讓頁面繪製後即正常 —— 是測試環境的特性，不是程式問題
