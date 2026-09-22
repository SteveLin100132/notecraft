---
Project Name: NoteCraft Plugin System
文件類型: Design Document
文件版本: v1.0.0
開發模式: Waterfall
技術選型: 確定
文件狀態: 已實作（v0.6.0）
文件作者: 建宇
建立日期: 2026-09-18
更新日期: 2026-09-18
依賴文件: docs/notecraft-prd.md、docs/notecraft-npx-viewer-v2.md
---

# NoteCraft Plugin System — 設計文件

讓 NoteCraft 除了 md/mdx 之外，能把**結構化資料檔（JSON）**交給一個**可安裝的渲染器**畫成頁面。首批範例是把 TrendMile 專案裡寫死在 `.notecraft/components/schema-er-diagram.tsx` 的 ER Diagram，拆成「通用渲染器 + 純資料 schema.json」。

> v0.1.0 是問題清單，v0.2.0 已逐題定案（§14），本文即實作依據。

---

## 1. 這份文件要解決什麼

### 1.1 起點：一個被寫死在 tsx 裡的 ER Diagram

`trendmile/.notecraft/components/schema-er-diagram.tsx` 共 751 行：

| 區段 | 份量 | 性質 |
| :-- | --: | :-- |
| `TABLES` 常數（36 張表、297 個欄位的完整定義） | 1 行 / ~48 KB 單行 JSON 字面量 | **純資料** |
| `LAYOUT` 五欄分配、`GROUP_LABEL`、`REQ_TITLE`、`DEFAULT_ROWS` | ~25 行 | **版面／語彙設定**（目前寫死） |
| `CSS`、量測、連線路徑、聚焦／搜尋／展開／tooltip／全寬覆蓋層 | ~600 行 | **渲染邏輯**（可複用） |

那 600 行對任何一份資料庫 schema 都通用，卻和 TrendMile 的 36 張表焊死在同一個檔案裡。

### 1.2 目標

1. **渲染器與資料分離** — 渲染器是可安裝的套件，資料是一份人能讀、AI 能產、git 能 diff 的 JSON
2. **設定即映射** — `.notecraft/plugins.json` 一份設定說明「哪些檔案由哪個 plugin 渲染」，支援 `**/*.json` 萬用比對
3. **一行安裝** — `npx notecraftapp install-plugin`，無參數時列官方 store、給 GitHub 路徑時裝第三方
4. **與既有管線共存** — 不影響 `@ai-visualize` 生成元件與 deck 簡報

### 1.3 非目標（首版明確不做）

| 項目 | 原因 |
| :-- | :-- |
| plugin 自帶 npm 依賴 | 外部 tsx 沒有自己的 `node_modules`，rollup 解析不到就 build fail（viewer v2 §6.3.1 踩坑）。Q11 |
| JSON 以外的格式（yaml / csv / sql） | 整條線都是繞著 JSON 在跑（JSON Schema 驗證、`$schema` 補全）。Q21 |
| plugin 在 build 期跑任意 Node 程式碼 | 只允許「宣告式 manifest + 純前端渲染元件」，不提供 build hook、不執行安裝腳本 |
| AI 產生資料檔的 Skill / Subagent | 架構預留，等 schema 穩定後再做。Q18 |
| plugin marketplace 網站 | 官方 store 就是主 repo 的一個資料夾 + `registry.json` |
| 執行時 sandbox | 與 viewer v2 §8.3 的信任模型一致：安裝＝信任 |
| plugin 反向寫檔（編輯資料檔的 UI） | 首版純唯讀渲染 |

---

## 2. 與既有兩套機制的關係

| | `@ai-visualize` 生成元件 | deck 簡報 | **plugin（本文）** |
| :-- | :-- | :-- | :-- |
| 輸入 | MDX 內的自然語言 prompt | 一篇筆記的內容 | 一份結構化資料檔 |
| 產出 | `<id>.tsx`（一次性、綁這篇筆記） | `<slug>.deck.tsx` | 資料檔渲染成的頁面／區塊 |
| 誰寫的 | AI 每次重新生成 | AI 每次重新生成 | **人寫一次、到處複用** |
| 資料變了怎麼辦 | 重跑 AI，元件整個重寫 | 重跑 AI | **改 JSON 就好，渲染器不動** |
| 適用 | 一次性的敘事插圖、獨特隱喻 | 把筆記講給別人聽 | 反覆出現、結構穩定的資料型態 |

**判準**：同一種「形狀」的資料會在不同專案／不同時間反覆出現 → 做成 plugin；只為這一段文字服務 → 留給 `@ai-visualize`。

**未來的接點**：AI 之後可以只負責**產資料檔**，而不必每次重寫 600 行渲染邏輯。Q7b 選的 JSON Schema 天然就是 AI 的規格書。首版不做（Q18），但 schema 要寫到能當規格用。

---

## 3. 名詞

| 名詞 | 意義 |
| :-- | :-- |
| **plugin** | 一個可安裝的渲染器套件，放在 `.notecraft/plugins/<id>/` |
| **manifest** | plugin 自己的 `notecraft-plugin.json`，由 plugin 作者寫 |
| **專案設定** | 使用者專案的 `.notecraft/plugins.json`，由筆記作者寫 |
| **renderer** | plugin 的入口，固定為 `renderer.tsx`，default export 一個 React 元件 |
| **資料檔** | 被 plugin 渲染的來源 JSON（如 `planning/schema.json`） |
| **官方 store** | 主 repo 的 `plugins/` 目錄，CLI 即時從 GitHub 讀 |

---

## 4. 目錄與設定檔佈局

### 4.1 使用者專案端

```
<userCwd>/
├── .notecraft/
│   ├── series.json                     # 既有
│   ├── components/                     # 既有：@ai-visualize 生成元件、deck
│   ├── public/                         # 既有
│   ├── plugins.json                    # 新增：專案級映射（§5）
│   └── plugins/                        # 新增：已安裝的 plugin
│       └── er-diagram-renderer/
│           ├── notecraft-plugin.json   # manifest（§6.1）
│           ├── renderer.tsx            # 入口，檔名固定
│           ├── schema.json             # 資料的 JSON Schema（§6.3）
│           ├── example/schema.json
│           ├── .installed.json         # 安裝來源與 commit，供追溯
│           └── README.md
└── docs/                               # notesDir
    ├── planning/schema.json            # 資料檔（必須在 notesDir 內，見 §5.2）
    └── **/*.{md,mdx}
```

`.notecraft/` 沿用既有約定（Q1）：`@notes` alias、`series.json`、deck 的 glob 發現、CLI 快取失效偵測全綁在它上面，plugin 直接繼承這些，零額外接線。

### 4.2 主專案端（官方 store）

```
notecraft/
├── plugins/                            # 新增：官方 store
│   ├── registry.json                   # 索引（§10.1）
│   └── er-diagram-renderer/
│       ├── notecraft-plugin.json
│       ├── renderer.tsx
│       ├── schema.json
│       ├── example/schema.json
│       ├── screenshot.png
│       └── README.md
├── src/lib/plugins.ts                  # 新增：build 期解析（§7）
├── src/pages/view/[...path].astro      # 新增：資料檔頁面
└── bin/notecraftapp.mjs                # 擴充：install-plugin 子命令（§9）
```

主專案**自己也消費 `plugins/`**（Q17）：`src/lib/plugins.ts` 多掃一條 `/plugins/*/renderer.tsx`，讓官方 plugin 有地方能真的 build、能跑 CI。成本只有一行 glob。

### 4.3 兩份 JSON 的分工

| | 誰寫 | 職責 | 檔名 |
| :-- | :-- | :-- | :-- |
| A | 筆記作者 | 哪些檔案套哪個 plugin、給什麼 options | `.notecraft/plugins.json` |
| B | plugin 作者 | 我是誰、幾版、驗證用哪份 schema、需要哪版 app | `.notecraft/plugins/<id>/notecraft-plugin.json` |

名稱刻意不同（Q2b）：錯誤訊息、CLI 輸出、文件裡講到任何一份都不必再附路徑。

---

## 5. 專案設定 `.notecraft/plugins.json`

### 5.1 格式

```jsonc
{
  "$schema": "https://raw.githubusercontent.com/SteveLin100132/notecraft/main/plugins/plugins.schema.json",
  "disabled": ["timeline-renderer"],    // 可選（v1.0.0，Workbench Q22）：停用的 plugin，其所有規則等同不存在
  "plugins": [
    {
      "plugin": "er-diagram-renderer",   // 對應 .notecraft/plugins/<id>/
      "files": [
        "planning/schema.json",
        "specs/**/*.er.json"
      ],
      "exclude": ["**/draft-*.json"],    // 可選
      "options": {                        // 可選，原封不動傳給 renderer
        "defaultRows": 8
      }
    }
  ]
}
```

**`disabled`（v1.0.0 追加，Workbench 規格 §8.6.1）**：頂層字串陣列，一顆開關對應一個 plugin id，規則本身原封不動。
停用 plugin 的所有規則在比對前就略過、等同不存在 —— 命中的資料檔不產頁、不進 Sidebar／`/plugins`／Palette，也**不參與「是否已安裝」的檢查**
（壞掉的 plugin 先停用，站還是 build 得出來）。一檔同時被停用與啟用的規則命中時啟用的那條勝、不印多重命中 warn；
`disabled` 裡的 id 既沒安裝也沒被引用則 warn；不是字串陣列則 build fail。停用**不是**解除安裝，renderer 仍會被 `PluginHost` 的 eager glob 打包。
dev 下由 `PUT /api/plugins/:id` 寫入，只動這個鍵、保留作者排版。舊版 app 讀到 `disabled` 會忽略它。

資料檔本身**不做自我宣告**（Q3）：不寫 `"plugin": "..."`。一份 `plugins.json` 就能看完專案裡哪些檔會被渲染，不必 grep 全專案，也沒有「檔案說 A、設定說 B」的優先序規則要記。需要「新增檔案不用改設定」時，把 `files` 寫成 `**/*.er.json` 這種 glob 即可。

### 5.2 `files` 的語意

| 決策點 | 定案 |
| :-- | :-- |
| 相對於誰 | **notesDir**（Q20）。`npx notecraftapp view ./docs` 時，`planning/schema.json` 解為 `docs/planning/schema.json` |
| **重要限制** | **資料檔必須放在筆記資料夾內**。放在 notesDir 外面的檔案掃不到，要用就得搬進去 |
| 萬用字元 | picomatch 語意：`*`、`**`、`?`、`{a,b}` |
| 大小寫 | 區分 |
| 點開頭資料夾 | 不比對（`.notecraft/`、`.git/` 等自動排除） |
| md/mdx | 一律不允許被 plugin 接管——那是 notes collection 的地盤 |

### 5.3 比對與衝突

- 依 `plugins` 陣列**由上而下，第一條命中的規則勝**（Q8），並在 build 期印 warn 指出該檔同時被哪幾條命中、最後交給了誰
  - 「大範圍 + 特例」是最常見的寫法，硬擋會讓萬用 glob 不能用；warn 負責讓作者知道發生了
  - 要精準控制就把具體規則寫在前面，或用 `exclude`
- 命中 0 個 plugin 的檔案：完全忽略，不產頁、不報錯
- glob 命中 0 個檔案：印 warn（可能只是還沒建檔）
- 其餘失敗一律 **build fail**（Q9），見 §7.6

---

## 6. Plugin 套件規格

### 6.1 manifest：`notecraft-plugin.json`

```jsonc
{
  "id": "er-diagram-renderer",
  "title": "ER Diagram",
  "description": "把資料庫 schema JSON 渲染成可聚焦、可搜尋的實體關聯圖",
  "version": "1.0.0",
  "author": "建宇",
  "homepage": "https://github.com/SteveLin100132/notecraft/tree/main/plugins/er-diagram-renderer",
  "dataSchema": "schema.json",
  "example": "example/schema.json",
  "engines": { "notecraftapp": ">=0.6.0" }
}
```

manifest 刻意**瘦身**（Q2a），只留「`plugins.json` 給不了的資訊」：

- **沒有 `entry`** — 入口固定約定為 `renderer.tsx`。讓 plugin 自由命名入口沒有換到任何價值
- **沒有 `accepts` / 副檔名宣告** — 吃哪些檔完全由 `plugins.json` 的 `files` 決定。首版只支援 JSON（Q21），「我讀不讀得懂這個副檔名」這件事沒有第二種答案
- `id` 必須與資料夾名一致，否則安裝時報錯
- `engines` 在安裝時檢查，不合就擋下並提示升級 `notecraftapp`（Q12 決定一律從 GitHub 抓最新，這道檢查是必要的配套）

### 6.2 renderer 契約

```tsx
// .notecraft/plugins/er-diagram-renderer/renderer.tsx
import type { PluginRendererProps } from "@notes/plugins/_types";

export interface ErDiagramData { /* plugin 自己定義 */ }

export default function ErDiagramRenderer(
  { data, file, options, mode }: PluginRendererProps<ErDiagramData>
) { /* ... */ }
```

| prop | 型別 | 說明 |
| :-- | :-- | :-- |
| `data` | `T` | 已 parse + 驗證的資料檔內容（build 期 inline，不是 Promise） |
| `file` | `{ path, name, updatedAt }` | `path` 為相對 notesDir 的路徑 |
| `options` | `Record<string, unknown>` | 來自 `plugins.json`，renderer 自行合併預設值 |
| `mode` | `"page" \| "embed"` | 獨立頁 vs MDX 內嵌，影響是否自己畫標題與全寬按鈕 |

硬規則（沿用生成元件既有規範）：

- 一律 `.tsx`，禁用 `any`（除非註解說明理由）
- 樣式遵循 `trendlink-design` token，不硬編碼色碼
- 動畫 200–400ms ease-out，尊重 `useReducedMotion()`
- 禁止 `dangerouslySetInnerHTML`（安裝時 lint 擋掉）
- `PluginRendererProps` 型別由 app 在安裝時寫進 `.notecraft/plugins/_types.d.ts`，plugin 不必相依 app 原始碼

### 6.3 資料驗證：JSON Schema + ajv

plugin 隨包附一份標準 `schema.json`（Q7b）。選它而非 zod 的理由是**資料檔是人與 AI 要直接編輯的**：同一份 schema 能寫在資料檔的 `$schema` 上，讓 VS Code 在手改 8 萬字元的資料時給欄位補全與即時報錯；對 AI 來說它也直接就是規格書。

- build 期用 ajv 驗證每個命中的資料檔，失敗 → **build fail**，訊息指出檔案路徑與第一個違規欄位
- `JSON.parse` 失敗同樣 build fail
- ajv 是新增的 runtime dependency（build 期用，需進 `package.json` 的 `dependencies`）

### 6.4 import 白名單

plugin renderer 與 `@ai-visualize` 生成元件走**同一份白名單**（`src/lib/generated-component-whitelist.ts`）：`react`、`react-dom`、`motion`、`recharts`、`d3`、`lucide-react`、`clsx`、`tailwind-merge` + 相對路徑 + `@notes/*`。

不開放擴充（Q11）。理由是技術現實而非潔癖：外部 tsx 靠 `vite.resolve.dedupe` 從 app 的 `node_modules` 解析，不在清單裡的套件一律 rollup build fail；開放等於每裝一個 plugin 就要動 `~/.notecraft/app-<v>/` 的 `node_modules`。這七個套件已足以畫出 ER 圖這種複雜度。

白名單外的 import **在安裝時就擋**（§9.6），不拖到 build。

---

## 7. Build 期解析與路由

### 7.1 發現 plugin

沿用 deck 已驗證的做法（`src/lib/decks.ts:258`）：

```ts
const renderers = {
  ...import.meta.glob<{ default?: PluginRenderer }>("/plugins/*/renderer.tsx", { eager: true }),       // 主專案官方 store（Q17）
  ...import.meta.glob<{ default?: PluginRenderer }>("@notes/plugins/*/renderer.tsx", { eager: true }), // 使用者專案
};
```

manifest 用 `import.meta.glob("@notes/plugins/*/notecraft-plugin.json", { eager: true })` 一併吃進來。

### 7.2 比對資料檔

`src/lib/plugins.ts`（build / dev 期執行）：

1. 讀 `.notecraft/plugins.json`；不存在 → plugin 功能整個停用，零成本
2. 走訪 notesDir（自己寫，複用 CLI `walkMdx` 的形狀），用 **picomatch** 比對 `files` / `exclude`（Q7a）
   - 走訪時順手收 mtime 與檔案數，直接餵給快取失效判斷（§11），不必再 stat 一輪
3. 每個命中檔案 → `{ pluginId, absPath, relPath, data, options }`
4. ajv 驗證 → 失敗即 throw

### 7.3 渲染出口

**A. 獨立路由頁（P3 做）**

`/view/<相對路徑去副檔名>`（Q4）。`docs/planning/schema.json` → `/view/planning/schema`。

選它而非共用 `/notes/` 的理由：與 `/notes/<slug>` 對稱、不洩漏是哪個 plugin 畫的（日後換 plugin 網址不變）、不與 notes collection 的 `getStaticPaths` 撞路徑（`planning/schema.md` 與 `planning/schema.json` 不會搶同一個網址）。

外框用 `BaseLayout`，**不包 `GeneratedFrame`**（Q22）——獨立頁本來就是全寬，再套一層放大檢視是重複。

**B. MDX 內嵌（P8 做）**

```mdx
<PluginView src="planning/schema.json" />
```

由 app 提供的 `.astro` 元件解析 `src` → 找 plugin → **包進 `GeneratedFrame`**，與現有 AI 生成元件行為一致。`data-nc-viz-body` 那層必須保留，放大檢視靠它搬移。

### 7.4 資料怎麼進到瀏覽器

**build 期 inline 成 island props**（Q10）。Astro 把資料序列化進 HTML：零額外請求、首屏就有內容、實作最單純。TrendMile 那份轉成長鍵後約 81 KB 文字。實測序列化進 HTML 後整頁 245 KB（Astro 的 island props 編碼約放大 3 倍），gzip 後仍在可接受範圍。

- 單檔超過 **256 KB** 時 build 期印警告（不擋 build），作為「該考慮拆檔或改 fetch 模式」的訊號

### 7.5 導覽整合（Q6）

| 出現在哪 | 定案 | 備註 |
| :-- | :-- | :-- |
| 側邊欄 | **獨立一區** | 與「筆記」「系列」「標籤」並列，列出所有被渲染的資料檔 |
| pagefind 搜尋 | **只索引標題與描述** | 頁面只標題區塊進索引；上千個欄位名全掃進去會稀釋筆記的搜尋結果 |
| `/notes` 筆記列表 | ~~**進**~~ → **移出**（2026-09-21 Workbench Q14 修訂） | `/notes` 在任何情況下只列筆記；資料檔的入口改為 Rail 的 Plugin、Sidebar「Plugin 資料檔」區段、`/plugins`、系列相關頁面與 Palette。**系列這條線仍完整混合顯示**（詳情頁章節列表、Dashboard 系列進度、`SeriesNav`、Drawer 的同系列章節）並計入進度 |
| series 系列 | **進**（Q6 修訂，見 §7.6） | 可寫進 `series.json` 的 `slugs`，並參與閱讀進度 |
| Dashboard 統計 | **不進** | 「我寫了幾篇」是內容產出量，資料檔不算在內 |

~~進 `/notes` 列表衍生兩件實作事項（§15）：卡片要與筆記卡片有可辨識的區別、排序用的時間欄位取檔案 mtime。~~（v1.0.0 已移出，見上表）

### 7.6 系列與閱讀進度（Q6 修訂）

Q6 原本定案「不進 series」，理由是閱讀進度的語意只該算筆記。**該理由建立在一個錯誤前提上**——
當時以為進度是靠捲動比例計算，資料檔頁沒有捲動長度可言所以算不了。實際讀過
`src/lib/reading-progress.ts` 後確認並非如此：

- `markReading()` 在 `ReadingControl` 掛載時觸發，把 `not-started` → `reading`（開頁即閱讀中）
- `done` 由使用者手動按（`ReadingControl` 三段控制列或 `DonePrompt`）
- 全程純 localStorage、以 slug 為 key、三態，**沒有任何捲動偵測**

進度機制不在意那一頁是什麼內容，因此「開頁即閱讀中、看完手動按完成」套在資料檔頁上完全成立。

**修訂後定案**：資料檔可被寫進 `series.json` 的 `slugs`，在系列導覽中與筆記並列，並參與閱讀進度。

**章節識別碼採 `view:` 前綴**：`slugs` 陣列混放兩種字串——筆記維持既有的 slug（如 `oauth-101`），
資料檔寫成 `view:<路徑去副檔名>`（如 `view:planning/schema`，對應路由 `/view/planning/schema`）。

選它而非「靠副檔名判別」的理由：

- **明確勝過推斷**。看到 `view:` 就知道那是資料檔，不必先知道「`.json` 結尾代表什麼」這條隱含規則
- 未來若有第三種頁面型別，前綴可以擴充，副檔名判別會撞牆
- 與路由同形，`view:` 後面那段直接就是 `/view/` 後面那段，不需要二次換算

代價是作者寫的不是真實檔名（少了 `.json`），這在 `plugins.json` 的 `files` 寫的是完整檔名時
會有一次心智轉換。可接受。

排除反而代價更高：`seriesProgress()` 的分母是 `slugs.length`，要排除就得先過濾陣列，於是變成
「系列列了 8 個項目、進度條分母是 6」——使用者看到 100% 完成但畫面上有兩項從沒碰過，需要額外解釋。
而資料檔在系列裡通常正是該看的東西（ER 圖就是那篇欄位盤點的正文延伸），排除等於宣告它不算數。

**與 Dashboard 統計的區別是刻意的**：系列進度是**閱讀動線**，資料檔該算；Dashboard 的篇數是
**內容產出量**，資料檔不算。兩者分母不同不是不一致。

#### 7.6.1 要改的地方

| 位置 | 改什麼 |
| :-- | :-- |
| `SeriesDetail.tsx:40`、`:193`；`SeriesNav.tsx:91`、`:139`、`:149` | 硬編碼的 `` `/notes/${slug}` `` **共 5 處**，改為依項目種類決定前綴（`/notes/` 或 `/view/`） |
| `DetailChapter` 型別（`SeriesDetail.tsx:6`） | 綁了 `markersTotal` / `markersGenerated`（`@ai-visualize` 標記數），資料檔沒有 → 改為 optional |
| `series.ts` 的 `normalizeSlug()` | 目前只剝 `.md` / `.mdx`（`series.ts:34`），要先辨識 `view:` 前綴、前綴後的部分不做剝除 |
| `series.ts` 的比對邏輯 | 目前拿 slug 去對 notes collection 的 entry id；帶 `view:` 前綴者改對資料檔清單的 `routePath` |
| 閱讀進度的 localStorage key | 一律用**未經轉換的 `ref` 原字串**（含 `view:` 前綴），避免筆記與資料檔撞 key |

**完全不用動**：`seriesProgress()`、`ProgressBar`、`ProgStat`、`ReadingBadge`、`ReadingControl`、
`DonePrompt`——它們只吃 slug 字串與狀態，不管背後是什麼。

#### 7.6.2 既有 warn 要擴充語意

`series.json` 裡寫一個對不到筆記的 slug **已經會警示**（`series.ts:124`：
`系列 "X" 的章節 slug "Y" 找不到對應筆記，已跳過。`），PRD 也早有這條卡控。

加進資料檔之後這句話會變得誤導——`ref` 可能帶 `view:` 前綴、根本不該去對筆記。
訊息要能區分三種情況，否則作者會照著錯誤的提示去修一個沒壞的東西：

| 情況 | 訊息要說什麼 |
| :-- | :-- |
| 無前綴、對不到筆記 | 找不到該筆記（沿用現行訊息） |
| 帶 `view:` 前綴、對不到資料檔 | 找不到該資料檔，並提示檢查 `plugins.json` 的 `files` 是否涵蓋它 |
| 帶 `view:` 前綴、資料檔存在但未被任何 plugin 認領 | 指出該檔存在但沒有映射，給出要補的設定片段 |

### 7.7 失敗模式一覽

| 情況 | 行為 |
| :-- | :-- |
| `plugins.json` 不存在 | 功能停用，無任何影響 |
| `plugins.json` JSON 壞掉 | build fail |
| 指名的 plugin 未安裝 | **build fail**，提示 `npx notecraftapp install-plugin <id>` |
| plugin 缺 `renderer.tsx` 或 default export | build fail |
| 資料檔 parse / schema 驗證失敗 | **build fail**，指出檔案與欄位 |
| glob 命中 0 個檔案 | warn |
| 一檔被多條規則命中 | warn，第一條勝 |
| renderer 在瀏覽器 throw | React error boundary → 錯誤卡片，不影響整頁其他內容 |

一律 build fail（Q9）是刻意的：靜默降級會讓「東西不見了」變成沉默 bug。`serve` 模式本來就保留舊 dist + SSE 提示、修好自動 reload，不會白畫面。

---

## 8. 以 ER Diagram 為例：資料與渲染器怎麼拆

### 8.1 現況盤點

| 目前在 tsx 裡 | 分類 | 去向 |
| :-- | :-- | :-- |
| `TABLES`（表 / 欄位 / 型別 / 必填性 / 外鍵 / 索引 / 說明） | 資料 | → `tables` |
| `LAYOUT`（五欄、每欄放哪些 group） | 版面設定 | → `layout.columns` |
| `GROUP_LABEL`（從 TABLES 反推） | 資料（目前重複） | → 正規化成 `groups`，表只留 `group` key |
| `REQ_TITLE`（必填 / 可為空 / 條件 / 系統） | 語彙 | → `requirement`，連圖例文案一起 |
| PK / FK / UQ / IX / GEN / TRG / ENC 徽章 | 語彙 | → `flags` / `derivations` |
| `DEFAULT_ROWS = 6` | 顯示設定 | → `options.defaultRows` |
| `option_item` 特例（工具列「顯示 option_item 的 N 條連線」） | 資料相依的寫死 | → `options.hubTables` |
| hint 文案、搜尋 placeholder | 語彙 | → `options` |
| `EDGES`（由 `cols[].fk` 推導） | **衍生** | 不入 JSON，renderer 算 |
| `CSS`、量測、路徑計算、聚焦 / 搜尋 / 展開 / tooltip / 全寬覆蓋層 | 渲染邏輯 | 留在 renderer |
| `p`（PII 旗標） | 資料裡有、渲染器沒用到 | 保留為選填 `pii`，未來要加標示不用改 schema |

### 8.2 `schema.json` 草案

```jsonc
{
  "$schema": "../.notecraft/plugins/er-diagram-renderer/schema.json",
  "meta": {
    "title": "TrendMile 系統 Schema 全表關聯圖",
    "description": "36 張表的欄位盤點與外鍵關聯",
    "source": "80-field-inventory.mdx §2（2026-08-12）",
    "backTo": "/notes/80-field-inventory"
  },
  "options": {
    "defaultRows": 6,
    "hubTables": ["option_item"],
    "sectionPrefix": "§",
    "hint": "點一張表可聚焦它的關聯，其餘變淡；再點一次、點空白處或按 Esc 取消。",
    "searchPlaceholder": "搜尋表名或欄位名（例：quotation、case_id）"
  },
  "requirement": [
    { "key": "required",  "label": "必填", "marker": "solid" },
    { "key": "condition", "label": "條件", "marker": "half",   "title": "條件必填，條件見說明" },
    { "key": "nullable",  "label": "可空", "marker": "hollow" },
    { "key": "system",    "label": "系統", "marker": "muted",  "title": "系統維護，應用層不可寫入" }
  ],
  "flags": [
    { "key": "pk",     "badge": "PK", "tone": "danger",  "label": "主鍵" },
    { "key": "fk",     "badge": "FK", "tone": "info",    "label": "外鍵" },
    { "key": "unique", "badge": "UQ", "tone": "success", "label": "唯一" },
    { "key": "index",  "badge": "IX", "tone": "neutral", "label": "索引" }
  ],
  "derivations": [
    { "key": "generated", "badge": "GEN", "label": "資料庫計算欄" },
    { "key": "trigger",   "badge": "TRG", "label": "由 trigger 維護" },
    { "key": "encrypted", "badge": "ENC", "label": "加密儲存" }
  ],
  "groups": [
    { "key": "customer", "label": "客戶" },
    { "key": "contract", "label": "合約" },
    { "key": "case",     "label": "案件與派案" }
  ],
  "layout": {
    "columns": [
      { "key": "c1", "groups": ["customer"] },
      { "key": "c2", "groups": ["contract", "finance"] },
      { "key": "c3", "groups": ["case"] },
      { "key": "c4", "groups": ["intake", "consultation", "quotation", "execution"] },
      { "key": "c5", "groups": ["core", "notify", "channel"] }
    ]
  },
  "tables": [
    {
      "name": "customer",
      "label": "客戶主檔",
      "section": "2.1",
      "group": "customer",
      "columns": [
        { "name": "id", "type": "bigint", "required": "system", "default": "identity", "pk": true, "note": "代理主鍵" },
        { "name": "name", "type": "varchar(120)", "required": "required", "index": true, "note": "公司名稱；§4 #1 從合約拆出" },
        { "name": "company_city_id", "type": "bigint", "required": "nullable", "fk": "option_item", "note": "縣市，type_code＝地區…" }
      ]
    }
  ]
}
```

`meta.title` / `meta.description` / `meta.backTo` 是 **app 層約定的三個欄位**（Q5；`backTo` 於 2026-09-21 Workbench Q21 升格）：
前兩者用於 `<title>`、側邊欄、pagefind，缺了就用檔名；`backTo` 是「回到來源筆記」按鈕的站內路徑，**只接受單一 `/` 開頭**（排除 `//host`、`http(s):`、`javascript:`），
不符者忽略、不顯示按鈕並在 build 期 warn。檢查在 `src/lib/plugins.ts` 解析時做，`ResolvedDataFile.backTo` 是已驗證的值。其餘欄位由 plugin 自行解讀，app 不碰。

### 8.3 欄位鍵名：短鍵 → 長鍵

現行 tsx 用 `n/t/r/d/pk/fk/u/i/g/p/s` 是為了壓縮單行字面量；資料檔要給人讀、給 AI 產、給 git diff，**一律改長鍵**，boolean 為 false 時省略：

| 現行 | 新 | 說明 |
| :-- | :-- | :-- |
| `n` | `name` | |
| `t` | `type` | |
| `r`（`y`/`n`/`c`/`s`） | `required`（`required`/`nullable`/`condition`/`system`） | 值也改成可讀字串，對應 `requirement[].key` |
| `d` | `default` | |
| `pk` / `u` / `i` | `pk` / `unique` / `index` | boolean，false 時省略 |
| `fk` | `fk` | 字串（父表名），無則省略 |
| `g`（`g`/`t`/`e`） | `derivation`（`generated`/`trigger`/`encrypted`） | 對應 `derivations[].key` |
| `p` | `pii` | 保留選填 |
| `s` | `note` | tooltip 內文 |

檔案會從 48 KB 長到約 81 KB，這是為可讀性付的錢；壓縮過的短鍵 JSON 人改不動，等於白做。

### 8.4 遷移步驟

1. 寫一支一次性腳本，把現行 `TABLES` 轉成新 `schema.json`（短鍵→長鍵、`groupLabel` 正規化成 `groups`）
2. 把 tsx 的常數段全部刪掉，改吃 `props.data`
3. `LAYOUT` / `REQ_TITLE` / `DEFAULT_ROWS` / `option_item` 改讀 `data.layout` / `data.requirement` / `options`
4. `mode === "page"` 時隱藏自帶的「展開全寬」按鈕（獨立頁已是全寬，Q22）
5. TrendMile 端：裝 plugin、寫 `plugins.json`、把 `schema.json` 放進 notesDir 內、刪掉舊元件與筆記裡的 import
6. 逐項比對新舊畫面（聚焦、搜尋命中數、展開、tooltip、全寬）

---

## 9. `notecraftapp install-plugin` CLI

### 9.1 指令表面（Q15）

```
notecraftapp install-plugin [<source>] [--list] [--remove <id>] [--apply "<glob>"]
                            [--dir <path>] [--ref <tag>] [--as <id>] [--force] [--yes]
```

只加**一個**子命令，列表與移除收在 flag 底下；升級就是重跑 `install-plugin --force`，與既有 `init-skill --force` 的升級語意一致。

| Flag | 預設 | 說明 |
| :-- | :-- | :-- |
| `<source>` | 無 → 互動選單 | 見 §9.3 |
| `--list` | false | 只列官方 store，不安裝 |
| `--remove <id>` | — | 刪除 `.notecraft/plugins/<id>/`，並檢查 `plugins.json` 是否還指著它（會殘留就警告，因為 Q9 定案沒裝就 build fail） |
| `--apply "<glob>"` | — | 安裝後把映射寫進 `plugins.json`（§9.4） |
| `--dir <path>` | cwd | 安裝目標專案根，與 `init-skill` 一致 |
| `--ref <tag>` | 預設分支 | 指定 tag / branch / commit |
| `--as <id>` | manifest 的 `id` | 改裝成別的目錄名 |
| `--force` | false | 目標已存在時覆寫，不 prompt |
| `--yes` | false | 略過安裝確認（CI 用） |

沿用 `init-skill` 既有的 `collectCopyPlan` 模式：分類 new/same/conflict、逐檔 prompt、非 TTY 且未帶 `--force` 就 abort exit 1。

### 9.2 無參數：列官方 store

清單**一律即時從 GitHub 抓**（Q12）——讀主 repo 的 `plugins/registry.json`。好處是永遠拿到最新的 plugin，修個 bug 不必等 npm 發版；代價是沒網路就裝不了，且可能抓到需要更新版 app 的 plugin，所以 `engines` 檢查是必要配套（§6.1）。

```
$ npx notecraftapp install-plugin

[notecraftapp] 官方 plugin store（github.com/SteveLin100132/notecraft@main）

  1) er-diagram-renderer   ER Diagram
     把資料庫 schema JSON 渲染成可聚焦、可搜尋的實體關聯圖    v1.0.0

  2) api-catalog-renderer  API 目錄
     把 OpenAPI 摘要 JSON 渲染成可篩選的端點清單               v0.2.0

選擇要安裝的 plugin（輸入編號 / q 離開）:
```

這個決定讓官方 store 與第三方來源變成**同一條程式路徑**——官方只是預設的 `owner/repo` 而已。

### 9.3 指定來源

| 形式 | 例 |
| :-- | :-- |
| 官方 id | `install-plugin er-diagram-renderer` |
| GitHub repo 根 | `install-plugin owner/repo` |
| GitHub 子目錄 | `install-plugin owner/repo/plugins/foo` |
| 指定版本 | `install-plugin owner/repo#v1.2.0` |
| 完整網址 | `install-plugin https://github.com/owner/repo/tree/main/plugins/foo` |
| 本地路徑（開發用） | `install-plugin ./my-plugin` |

一個 repo 可以放好幾個 plugin（Q23），靠 `owner/repo/path` 指定子目錄；repo 根有 `registry.json` 時可列出全部讓使用者選。

### 9.4 抓取方式（Q13）

**主路徑：逐檔 fetch。** 用 GitHub API 列目錄 + `raw.githubusercontent.com` 逐檔下載。一個 plugin 典型只有五六個小檔，這條路零新依賴、不必解壓縮、不要求環境有 git。

**退路：`git clone --depth 1`。** 非 GitHub 來源，或 GitHub API 限流（未認證 60 次/小時）時改走這條。

抓完寫一份 `.installed.json` 記錄來源網址與實際 commit，供日後追溯與升級比對。

### 9.5 安裝後

安裝只複製檔案，**預設不動使用者的設定檔**（Q14）——映射要寫哪些路徑只有作者知道，CLI 猜不出來。裝完印出可直接貼上的片段：

```
✓ 已安裝 er-diagram-renderer v1.0.0 → .notecraft/plugins/er-diagram-renderer/

  下一步：在 .notecraft/plugins.json 加上映射

  {
    "plugins": [
      { "plugin": "er-diagram-renderer", "files": ["**/*.er.json"] }
    ]
  }

  範例資料：.notecraft/plugins/er-diagram-renderer/example/schema.json
  （想一步到位：install-plugin er-diagram-renderer --apply "**/*.er.json"）
```

### 9.6 安裝時的把關（Q16）

安裝任何 plugin 前**一律要確認**，`--yes` 才略過。Q12 決定了一律從網路抓，這道確認是唯一有人能介入的點。

確認畫面顯示：來源網址、`id` / `version`、要寫入的檔案清單。確認前先跑靜態檢查，任一項不過就拒裝：

- 掃所有 `.tsx` / `.ts` 的 import，白名單外的套件 → 列出違規行並拒裝（§6.4）
- 禁止 `dangerouslySetInnerHTML`
- 只收 `.tsx` / `.ts` / `.json` / `.md` / `.css` / `.svg` / `.png`；拒絕 `package.json`、`node_modules/`、`*.sh`、`*.mjs` 等可執行內容
- 路徑安全：拒絕 `../` 逃脫與 symlink（沿用 viewer v1 §7.3）
- `engines.notecraftapp` 不合 → 擋下並提示升級
- **不執行任何安裝腳本**

---

## 10. 官方 plugin store

### 10.1 `plugins/registry.json`

```jsonc
{
  "version": 1,
  "plugins": [
    {
      "id": "er-diagram-renderer",
      "title": "ER Diagram",
      "description": "把資料庫 schema JSON 渲染成可聚焦、可搜尋的實體關聯圖",
      "version": "1.0.0",
      "dir": "plugins/er-diagram-renderer",
      "files": ["notecraft-plugin.json", "renderer.tsx", "schema.json", "README.md", "example/schema.json"],
      "tags": ["database", "diagram"],
      "screenshot": "plugins/er-diagram-renderer/screenshot.png"
    }
  ]
}
```

`files` 欄位讓 §9.4 的逐檔 fetch 不必先打 GitHub 目錄列表 API，省一次請求也避開限流。

### 10.2 發佈流程

- plugin 原始碼跟主 repo 一起版控、一起 review，push 到預設分支即生效（Q12 一律即時抓）
- 加一支 `scripts/check-plugins.mjs`，`prepublishOnly` 與 CI 都跑：
  - 每個 plugin 的 manifest 必填欄位齊全、`id` 與資料夾名一致
  - `registry.json` 與實際目錄無漂移（含 `files` 清單）
  - `example/` 的資料能通過自己的 `dataSchema`
  - 每個 plugin 配 example 資料跑一次 `astro build`（主專案自己就能 build plugin，Q17）

沒有這道把關，store 裡可能放著一個裝下去就 build fail 的 plugin，體驗比沒有還糟。

---

## 11. dev / watch / 快取整合

viewer v2 §7.1 的快取失效條件擴充：

| 新條件 | 說明 |
| :-- | :-- |
| `.notecraft/plugins.json` mtime | 現行已掃 `.notecraft/*.json` 頂層，這條剛好涵蓋 |
| `.notecraft/plugins/**/*.{tsx,ts,json}` mtime / 檔案數 | **新增**，現行掃描不進子目錄 |
| 命中 glob 的資料檔 mtime / 檔案數 | **新增**，現行只掃 md/mdx；§7.2 走訪時順手收齊 |

`serve` 的 chokidar 清單同步加入上述三項。

`view`（astro dev）模式的 HMR 是 **P7 的主要風險**（Q19）：資料檔是用 fs 讀進來的、不在 Vite 模組圖裡，改它很可能不觸發更新。**先實測**；確認不觸發就在 `view` 掛一個只監看資料檔的 watcher，變動時主動要求 Vite 失效對應模組。不改現有的讀檔方式。

---

## 12. 安全性

信任模型與 viewer v2 §8 一致，但 plugin **從 GitHub 裝別人的程式碼**，風險比 AI 在本地生成的元件高一級：

| 風險 | 對策 |
| :-- | :-- |
| 惡意 renderer 在瀏覽器竊取內容 / 外連 | 安裝前一律確認（§9.6）；只收純前端檔案；不做 runtime sandbox（明說） |
| 供應鏈：白名單外的套件 | 安裝時 lint import + build 期 dedupe 雙重把關 |
| 安裝腳本 | 完全不執行 |
| 路徑逃脫 / symlink | 抓檔時檢查，沿用 v1 §7.3 |
| 資料檔造成 XSS | renderer 一律走 React 文字節點；禁止 `dangerouslySetInnerHTML`，安裝時 lint 擋掉 |
| 版本漂移 | `--ref` 可 pin tag/commit；`.installed.json` 記錄實際 commit |
| 抓到不相容版本 | `engines.notecraftapp` 安裝時檢查 |

---

## 13. 實作階段

| Phase | 目標 | 前置 | 交付 |
| :-- | :-- | :-- | :-- |
| **P1** | 契約落地：`plugins.json` 與 manifest 的 JSON Schema、`PluginRendererProps` 型別 | — | 型別檔 + 兩份 schema |
| **P2** | build 期解析：picomatch 比對、走訪、plugin 發現、ajv 驗證 | P1 | `src/lib/plugins.ts` |
| **P3** | 路由與版面：`/view/[...path].astro` + 側邊欄一區 + `/notes` 列表整合 + pagefind 標記 | P2 | 範例 JSON 能顯示 |
| **P3.5** | 系列整合：5 處 `/notes/` 前綴改寫、`DetailChapter` 型別鬆綁、`normalizeSlug` 認 `.json`、對不到 slug 補 warn（§7.6） | P3 | 資料檔能排進 `series.json` 並計入進度 |
| **P4** | ER plugin 抽離：轉檔腳本 + renderer 改吃 props | P1 | `plugins/er-diagram-renderer/` 完整可用 |
| **P5** | `install-plugin`：registry 抓取、逐檔 fetch、確認與 lint、衝突處理、`--list` / `--remove` / `--apply` | P4 | 官方 store 可裝 |
| **P6** | 第三方來源：`owner/repo/path`、`--ref`、git clone 退路、`.installed.json` | P5 | 第三方 repo 可裝 |
| **P7** | watch / 快取整合（含 dev HMR 實測） | P2 | 改 JSON → 自動更新 |
| **P8** | MDX 內嵌 `<PluginView />` + `GeneratedFrame` 整合 | P3 | ER 圖能長回筆記裡 |
| **P9** | 端對端：TrendMile 實際遷移、新舊畫面逐項比對 | 全部 | 遷移完成 |

**風險最高**：P7 的 dev HMR（Q19）。P2 的 inline 資料量已於 Task 51 實測：81 KB JSON → 245 KB HTML。

---

## 14. 定案紀錄（2026-09-18 逐題確認）

| # | 議題 | 決議 |
| :-- | :-- | :-- |
| Q1 | 設定資料夾 | 沿用 `.notecraft/` |
| Q2a | manifest 範圍 | 瘦身：只留 `id` / `title` / `description` / `version` / `dataSchema` / `example` / `engines`；砍掉 `entry`（固定 `renderer.tsx`）與 `accepts` |
| Q2b | 兩份 JSON 命名 | 映射表 `plugins.json`、身分證 `notecraft-plugin.json` |
| Q3 | 資料檔自我宣告 | 不做，只靠 `plugins.json` 映射 |
| Q4 | 獨立頁路由 | `/view/<相對路徑去副檔名>` |
| Q5 | 標題／描述來源 | 資料檔的 `meta.title` / `meta.description`，缺就用檔名 |
| Q6 | 導覽整合 | 側邊欄獨立一區 ✓、pagefind（只索引標題描述）✓、`/notes` 列表 ✓；Dashboard 統計 ✗ |
| Q6′ | 系列與閱讀進度（**Q6 翻案**） | **進 series，並參與閱讀進度**。原決議基於「進度靠捲動計算」的錯誤前提，實際為開頁即 reading + 手動標記 done，資料檔完全適用。見 §7.6 |
| Q7a | glob 實作 | picomatch + 自寫走訪 |
| Q7b | 資料驗證 | JSON Schema + ajv |
| Q8 | 多條規則命中 | 第一條勝，build 印 warn |
| Q9 | 失敗模式 | 一律 build fail |
| Q10 | 資料注入 | inline 成 island props，>256 KB 印警告 |
| Q11 | plugin 依賴 | 只吃既有白名單，不可擴充 |
| Q12 | store 來源 | 一律即時抓 GitHub |
| Q13 | 抓取方式 | 逐檔 fetch（GitHub API + raw），失敗退回 `git clone --depth 1` |
| Q14 | 自動寫設定 | 預設只印建議片段，`--apply` 才寫 |
| Q15 | CLI 表面 | 只加 `install-plugin`，列表與移除收在 `--list` / `--remove` |
| Q16 | 安裝確認 | 一律確認，`--yes` 可略過 |
| Q17 | 主專案支援 | 要，多一條 `/plugins/*/renderer.tsx` glob 分支 |
| Q18 | AI 產資料檔 | 架構預留，首版不做 |
| Q19 | dev HMR | 先實測，不觸發就在 `view` 掛資料檔 watcher |
| Q20 | `files` 基準 | notesDir（資料檔必須放在筆記資料夾內） |
| Q21 | 檔案格式 | 首版只支援 JSON |
| Q22 | 放大檢視 | 只有 MDX 內嵌模式包 `GeneratedFrame` |
| Q23 | 多 plugin repo | 能，靠 `owner/repo/path` 指定 |

---

## 15. 實作後回填

Task 46–58 已全部實作（2026-09-18，隨 notecraftapp v0.6.0）。原本列為「實作時仍需判斷」
的項目，實際採用的做法：

| 原本的待判斷項 | 實際做法 |
| :-- | :-- |
| `/notes` 列表的資料檔卡片怎麼區分 | 橘系 `Database` icon 方塊、右上「資料檔」膠囊、底部原本放標籤的那一列改成 sunken 底的 mono 路徑列。mono 是筆記卡片沒有的質地，掃視時最快 |
| 混排的排序時間 | 用檔案 mtime，與筆記的 `updatedAt` 同軸；套用標籤篩選或「只看收藏」時資料檔退出列表（那些維度對它們不存在） |
| `/notes` 副標 | 有資料檔時改成「N 篇筆記、M 個資料檔」 |
| pagefind 索引範圍 | **已實作**（Task 48 就標在頁首 `<header>` 上；本表先前寫「未實作」是過時的）。v1.0.0 換殼後標記搬到頁首 `h1` 與 Toolbar 說明文字，實測標題與描述搜得到、欄位名搜不到 |
| registry 抓取的快取 | 未做。每次 `install-plugin` 都打網路；`--list` 與安裝各一次請求 |
| GitHub API 限流 | `registry.json` 的 `files` 清單讓官方 plugin 完全不打目錄列表 API；第三方來源限流時自動退回 `git clone --depth 1` 並印出切換原因 |
| `--remove` 的殘留檢查 | 只警告不自動清 —— 動使用者的設定檔要有明確意圖，而 Q9 已定案殘留會讓 build fail，警告就足以讓人知道 |
| ER renderer 的全寬按鈕 | 由 renderer 自己依 `mode` 判斷（`mode === "embed"` 才渲染），app 不傳額外 flag |

### 實作中新增的決定

| 項目 | 決定 | 為什麼 |
| :-- | :-- | :-- |
| **`PluginHost` 派發島** | 渲染器的 glob 放在 client island 裡，`.astro` 只傳 `pluginId` 字串 | Astro 的 hydration 指令要在編譯期知道元件來自哪個模組；從 Map 取出的元件會讓 build 以 `NoMatchingImport` 失敗。既有簡報頁是同一個形狀 |
| **renderer 自帶 props 型別** | 官方 plugin 的 `renderer.tsx` 自己宣告 `PluginRendererProps`，不 import `@notes/plugins/_types` | 官方 plugin 要能同時在主 repo（CI）與使用者專案 build，而 `@notes` 在兩處指向不同的根。TypeScript 是結構型別，自帶一份不影響相容性 |
| **`BaseLayout` 加 `bleed` prop** | 滿版時不套 `.nc-page-wrap` | `/view` 是第一條需要跳脫 1120 版心的路由 |
| **系列識別碼寬容化** | `view:a/b.json` 與 `view:a/b` 都接受 | 作者會照著真實檔名寫 |
| **watcher 的資料檔判定用副檔名粗篩** | 只看 `.json`，不在 CLI 重算一次 glob | 重算等於有兩份真相；這裡只決定「要不要重 build」，真正命中哪些檔是 `src/lib/plugins.ts` 的事 |

### 仍未做的

- ~~**pagefind 索引範圍**~~ 早已實作（見上表）
- **`view`（astro dev）模式的 HMR**（Q19）：v1.0.0 實測 —— `plugins.ts` 的模組層快取在 dev 期間持續存活，改 `plugins.json` **不會**自動反映。
  已在 dev integration 監看 `plugins.json` 與 notesDir 底下的 `.json` 資料檔，變動時清快取並送 `full-reload`（資料檔的 `meta.*` 同樣是解析時讀進快取，實測改了不監看也不會反映）
- **官方 store 的 screenshot**：`registry.json` 未帶 `screenshot` 欄位
- plugin 的 i18n、`dataSchema` 改版的相容性、同一份資料被兩個 plugin 用不同視角渲染
