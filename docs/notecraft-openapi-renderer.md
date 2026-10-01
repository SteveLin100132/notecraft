---
Project Name: NoteCraft — OpenAPI Renderer v1.0（官方 plugin `openapi-renderer`）
文件類型: Design Document
文件版本: v1.0.0
開發模式: Waterfall
技術選型: 確定（沿用 plugin 既有技術棧：React + TypeScript + lucide-react，不新增 runtime 套件；不引入 Swagger UI／Redoc／Markdown 函式庫）
文件狀態: 已實作（plugin v1.0.0／notecraftapp v1.6.0，Task 98–104，2026-10-01）—— §15 的 9 題已於 2026-10-01 確認（紀錄見 §16）；實作後回填見 §17
文件作者: 建宇
建立日期: 2026-10-01
更新日期: 2026-10-01
依賴文件: docs/notecraft-plugin-system.md、docs/notecraft-er-docs.md、docs/notecraft-workbench.md、docs/prototype/design_handoff_openapi_renderer/README.md
分支: feat/openapi-renderer
---

# OpenAPI Renderer v1.0 — 設計文件

新增第二個官方 plugin `openapi-renderer`：把筆記資料夾裡的 OpenAPI 文件（JSON，OAS 3.0／3.1）渲染成 NoteCraft 風格的 API 文件，取代讀者原本要另開 Swagger UI 才能看的那一頁。

- **page 模式**：`/view/<路徑>`，導覽（tag → operation、schemas）+ 四種頁面（總覽／Tag／Operation／Schema）
- **embed 模式**：`<PluginView>` 內嵌在筆記裡，單一 operation 卡或總覽縮影
- 讀者是「一年後回來查參數的作者本人」——這裡是**讀文件**的地方，不做試打 API

> 視覺與互動的**像素級規格**以 [design_handoff_openapi_renderer/README.md](prototype/design_handoff_openapi_renderer/README.md) 與 `prototype/oa/oa.css` 為準，本文不重抄。
> 本文負責 handoff 沒有回答的事：prototype 是瀏覽器端 Babel 的單頁 demo，實作要跑在 Astro SSR + hydration、plugin 安裝與打包規則、工作台殼裡，兩者之間的落差要怎麼接；app 端要配合改哪些地方；以及動工前要先問清楚的問題（§15）。
> **與設計稿不同之處一律以本文為準**。

---

## 1. 這份文件要解決什麼

### 1.1 起點

Handoff 是站在「plugin 內部」寫的，而且預設了幾個 app 目前**沒有**的能力。對照 codebase 後的落差：

| 落差 | Handoff 的假設 | 現況（codebase） |
| :-- | :-- | :-- |
| **頁面標題與描述** | 工作台頁首 title = `info.title` | app 只認資料檔的 `meta.title`／`meta.description`／`meta.backTo`（`src/lib/plugins.ts` `readMeta`）。OpenAPI 沒有 `meta`，title 會退回檔名 `orders.openapi.json`、描述為空、pagefind 只索引到檔名。而 OAS 頂層只允許 `x-` 擴充欄位，叫作者加 `meta` 會讓 spec 本身不合法 |
| **路由** | `api/orders.openapi.json` → `/view/api/orders` | `routePath = relPath.replace(/\.json$/i, "")` → `/view/api/orders.openapi`。**Q2 定案維持現況**，以 app 的規則為準 |
| **embed 的 options** | `<PluginView file="…" options={{ operation }} />` | `PluginView` 的 prop 叫 **`src`**，**沒有** `options`；renderer 的 options 只來自 `plugins.json` 的規則，同一份檔在不同筆記無法指定不同 operation |
| **embed 外框** | plugin 自畫 figcaption（「資料檔 · API 文件」、`· operationId`、「在文件頁開啟 → `#op/<id>`」） | `PluginView` 一律包 `GeneratedFrame`，它已經有「資料檔 · {plugin title}」膠囊、檔案路徑、「開啟完整檢視頁」連結（不帶 hash）。plugin 再畫一次會雙層外框 |
| **與 ER 共用模組** | 「與 ER 共用的元件請抽到共用模組，不要複製兩份」 | plugin 各自獨立安裝（`registry.json` 的 `files` 只列自己目錄），使用者可能只裝其中一個；跨 plugin 的相對 import 在使用者專案會解析失敗（Q6 定案：各自一份） |
| **範例資料** | 四份 example，極大案例為 `countsalary-platform.openapi.json` | 官方 store 推上預設分支即公開。Q9 定案：store 的範例以官方 Petstore 為主，**不放**極大案例檔（handoff 內那份也已刪除）；規模測試改由 check 腳本程式產生（§12.1） |
| **Swagger 2.0** | 不渲染，顯示錯誤卡 | 規則是「資料不符 dataSchema → build fail」。dataSchema 寫多嚴，決定 2.0 是錯誤卡還是 build fail（Q5 定案：錯誤卡） |
| **CSS** | `oa.css` 用了 `>` 子選擇器、`@media (max-width:1180px)` | plugin 以 `<style>{CSS}</style>` 注入，**CSS 字串不可含 `< > & " '`**（React SSR 會跳脫，選擇器壞掉、hydration 失敗）；斷點以視窗寬度判斷，在 760px 內嵌與工作台側欄抽屜下都會判錯 |
| **資料量** | 未提 | 資料一律 inline 成 island props（HTML 約 JSON 的 3 倍）。一份 130 KB 的大 spec → `/view` 頁約 390 KB；**同一份 spec 在一篇筆記內嵌 N 次就重複 N 份**（Q4 定案 v1 接受） |

### 1.2 目標

1. 官方 plugin `openapi-renderer` v1.0.0：page 與 embed 共用同一棵元件樹，外觀與互動照 handoff
2. 支援 OAS **3.0.x／3.1.x**；3.2.x 以 3.1 規則盡力渲染並警示；2.0 給明確的轉檔指引
3. **app 端最小配合**：資料檔頁的標題／描述能取自 `info.*`；內嵌能逐處指定 operation（§11）
4. 推導（`$ref`、usage index、範例、cURL）全是純函式，由 `scripts/checks/` 直接載入斷言
5. 三份範例（Petstore、orders、health）都在 `check-plugins` 裡驗 schema、實際 build 一次；極大規模以程式產生的 spec 斷言

### 1.3 非目標（本次明確不做）

| 項目 | 原因 |
| :-- | :-- |
| 試打 API（Try it out） | Handoff〈不做的事〉：純靜態站、CORS、公開頁輸入 token。範例區只保留複製 cURL／fetch |
| YAML 格式的 spec | app 的資料檔目前只吃 `.json`（plugin system Q21）。作者先轉成 JSON |
| 外部 `$ref`（非 `#/` 開頭） | 不解析，型別 chip 顯示 ref 原字串；README 註明 |
| Swagger 2.0 解析 | 只給轉檔指引卡（Q5） |
| operation／schema 進 pagefind 索引 | 與 ER 一致：資料檔頁只索引標題與描述，上百個欄位名不進索引 |
| 深色模式 | 工作台本版不啟用 |
| ER plugin 跟著改用新的型別 chip | Handoff〈與 ER Diagram 共用〉建議 ER 也換；屬 ER 的改版，另開 task |
| 把 Esc 接進工作台的 `wb-escape` 堆疊 | plugin 不 import app 模組，沿用 ER 的 `defaultPrevented` 共存法（§10） |

---

## 2. 現況盤點：會碰到的地方

### 2.1 Plugin 系統的接點

| 接點 | 檔案 | 這次的影響 |
| :-- | :-- | :-- |
| 資料檔解析、`meta` 讀取、routePath | `src/lib/plugins.ts` | 加「manifest 宣告 meta 來源」（§11.1，視 Q1） |
| manifest 型別與 JSON Schema | `src/lib/plugin-types.ts`、`plugins/notecraft-plugin.schema.json`（`additionalProperties: false`） | 新欄位要兩邊一起加 |
| 內嵌 | `src/components/PluginView.astro`、`GeneratedFrame.astro` | 加 `options`、`anchor` prop（§11.2，視 Q3） |
| 資料檔頁 | `src/pages/view/[...path].astro` | 不改（`.nc-dv-stage` 已滿版、無 padding） |
| 安裝檢查 | `bin/install-plugin.mjs` `inspectFiles` | 不改；新 plugin 必須通過白名單與 `dangerouslySetInnerHTML` 檢查 |
| store 把關 | `scripts/check-plugins.mjs`、`plugins/registry.json` | 新增一筆 registry；`example/` 下四份 `.json` 自動被驗與 build |
| 純函式斷言 | `scripts/checks/*.mjs` | 新增 `oar-derive.mjs`、`oar-examples.mjs`、`oar-styles.mjs` |

### 2.2 從 ER plugin 沿用的既有做法

ER v1.2 已經解過的問題，這次直接照抄，不重新討論（出處 `docs/notecraft-er-docs.md`）：

| 問題 | 做法 | ER 文件 |
| :-- | :-- | :-- |
| page 模式高度 | 外殼隨內容長高、由最近的捲動祖先捲；bar 與 nav `sticky`；nav 高度上限以 ResizeObserver 量捲動祖先的 `clientHeight` 寫進 CSS 變數，不以 id 查 `#nc-scroll` | §6.4、§11.2、§17 |
| 斷點 | 用 container query 判斷外殼自己的寬度，不用 `@media` | §9 |
| 靠 localStorage 的狀態 | SSR 與首次 render 用預設值，`useEffect` 後才讀；讀到的值要驗證 | §6.3 |
| Esc 與工作台共存 | `defaultPrevented` 就不處理；焦點不在 plugin 內就不處理 | §10 |
| 樣式注入 | class 前綴 + root 起頭的 CSS 字串，DS 沒有的字面值集中成 root 上的 custom property | §7 |
| 迷你 Markdown | 輸出 React 元素、連結 `safeHref` 白名單 | §8.5 |
| embed 外框 | 外殼不畫外框與圓角，外框由 `GeneratedFrame` 提供 | §8.1 |

---

## 3. 名詞

| 名詞 | 意思 |
| :-- | :-- |
| spec | 資料檔本身，一份 OpenAPI 文件 |
| op key | operation 的識別：`operationId ?? method + "/" + path`（例：`get/pet/{petId}`） |
| route | plugin 內的頁面位置：`overview`／`tag`／`op`／`schema`，與網址 hash 雙向同步（page 模式） |
| 極小模式 | ≤ 4 支 operation 且沒有任何 tag：不顯示導覽、內容置中 |
| usage index | 每個 schema「被哪些 operation 使用」的反查表（直接／間接） |
| `oar-` | 本 plugin 的 class 與 CSS 變數前綴（root `.oar-root`）。prototype 的 `oa-*` 與借用 ER 的 `erx-*` 全部改成 `oar-` |

---

## 4. 架構

### 4.1 檔案

照 handoff 的拆分，另把共用骨架與型別獨立出來：

```
plugins/openapi-renderer/
├── notecraft-plugin.json
├── schema.json            dataSchema（§5.1）
├── README.md
├── renderer.tsx           外殼、route／hash、鍵盤、page／embed 分流（入口，檔名固定）
├── types.ts               OpenAPI 子集的型別、OarOptions
├── derive.ts              ops／tags／deps／usage index、$ref 解析            ← 純函式，只 import type
├── examples.ts            由 schema 產生範例、cURL／fetch                    ← 純函式，只 import type
├── markdown-text.ts       迷你 Markdown parser（自 ER 複製，§4.4）           ← 純函式，只 import type
├── markdown.tsx           Markdown → React
├── atoms.tsx              Method、Status、Path、Copy、Code、Json、Seg、TypeChip
├── schema-tree.tsx        欄位樹（深入、循環、oneOf／anyOf／allOf）
├── nav.tsx                導覽
├── pages.tsx              總覽、Tag、Operation、Schema
├── embed.tsx              單一 operation 卡、總覽縮影
├── styles.ts              CSS 字串（含 --oar-* token）
└── example/
    ├── petstore.openapi.json   manifest.example —— 官方 Swagger Petstore（OAS 3.2.0，走「3.2 盡力渲染＋警示」路徑）
    ├── orders.openapi.json     3.1 邊界案例（循環 $ref、oneOf／anyOf／allOf、多 content-type、長 path、深巢狀），功能測試的主力
    └── health.openapi.json     極小（Swagger 截圖那份）
```

- **不放極大案例檔**（Q9）：規模（20 tag、250+ op）由 `scripts/checks/oar-derive.mjs` 以程式產生（比照 prototype `oa-data.jsx` 的 `makeLarge()`）並斷言；手動驗證時用同一個產生器輸出到本機、不進版控的筆記資料夾
- `petstore.openapi.json` 來自 Swagger 官方範例（Apache-2.0），README 註明出處

- `registry.json` 的 `files` 必須列出以上所有檔（`check-plugins` 會擋漂移）
- 三個純函式 `.ts` 只能有 `import type`、不能有 JSX，`scripts/checks/` 才能以 strip-types 直接載入

### 4.2 元件樹

```
OpenApiRenderer (renderer.tsx)            props: PluginRendererProps<OpenApiDoc>
├─ 版本檢查：swagger 2.0 → <UnsupportedCard>（Q5）
├─ derive(data) —— useMemo，以 data 為 key
├─ mode === 'embed'
│   └─ <EmbedRoot>    options.operation ? <OpCard> : <MiniOverview>；找不到 → 卡內錯誤
└─ mode === 'page'
    └─ <DocsShell>    container: oar / inline-size
        ├─ <Bar>       sticky；導覽開關／← 總覽、位置字串、Esc toast、OAS 版本或警示膠囊
        ├─ <Nav>       sticky、自己捲；篩選、method chips、tags → ops（區段錨點）、schemas
        └─ <Main>
            ├─ <OverviewPage> | <TagPage> | <OpPage> | <SchemaPage>
            └─ 共用：<OpList> <ParamTable> <MediaSplit>（<SchemaTree> + <ExampleBox>）<CodeBox>
```

### 4.3 Options

合併順序：內建預設 < `plugins.json` 規則的 `options` < `<PluginView options>`（Q3）。

| key | 型別 | 預設 | 作用 |
| :-- | :-- | :-- | :-- |
| `operation` | string | — | embed 限定。op key（通常是 operationId）。未給 → 總覽縮影；找不到 → 卡內錯誤 |
| `navSummary` | `'hover'｜'line'` | `'hover'` | 導覽 summary 呈現（handoff 的 Tweak「導覽 summary」） |
| `server` | number | `0` | 範例請求預設用第幾個 server |

未知的 key 忽略；型別不對 → 用預設並在 dev `console.warn` 一次。

### 4.4 與 ER plugin 的共用（handoff 要求「抽共用模組」的修正）

Handoff 希望共用元件抽到共用模組。但兩個 plugin **各自獨立安裝**：使用者可能只裝 `openapi-renderer`，此時 `../er-diagram-renderer/…` 不存在，build 失敗。可行的做法有兩種，**Q6 定案 A**：

- **A. 各自持有一份，靠檢查防漂移**（採用）：OA 複製 ER 的 `markdown-text.ts` 中與 ER 無關的部分（`parseInline`、`parseMarkdown`、`safeHref`；不含 `resolveCodeLink` 這種認表名的邏輯）；骨架 CSS（導覽、Wiki 頁首、h2、`colt` 表、`rel` 兩欄）以 `oar-` 前綴重寫一份。`scripts/checks/oar-markdown.mjs` 拿 ER 的同一組 Markdown 測試案例跑 OA 的 parser，行為一致即可，不要求程式碼逐字相同
- ~~B. 抽成 app 提供的共用模組（例如 `@notes/plugins/_shared/`，安裝時寫入）~~：違反「plugin 不相依 app」的現有原則，且要擴充安裝流程

視覺上「一模一樣」靠**相同的數值**達成，不靠共用 class。Handoff〈與 ER Diagram 共用〉表中標「一模一樣」的元件，實作時逐項對照 ER 的 `styles.ts` 數值。

---

## 5. 資料層

### 5.1 dataSchema（`schema.json`）

**只驗外形，不驗 OpenAPI 規格本身**。完整 OAS 驗證（官方 JSON Schema 數千行、3.0／3.1 各一套）不是這個 plugin 的責任，而且太嚴會讓「能看的文件」因為一個小錯就 build fail。

```jsonc
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["info"],
  "properties": {
    "openapi": { "type": "string", "pattern": "^3\\." },
    "swagger": { "type": "string" },          // Q5：允許，renderer 顯示轉檔指引卡
    "info": {
      "type": "object",
      "required": ["title", "version"],
      "properties": { "title": { "type": "string" }, "version": { "type": "string" } }
    },
    "paths": { "type": "object" },
    "components": { "type": "object" }
  },
  "oneOf": [{ "required": ["openapi"] }, { "required": ["swagger"] }]
}
```

- `additionalProperties` 不設（OAS 允許 `x-*` 擴充與 `webhooks`、`jsonSchemaDialect` 等）
- `openapi: "4.x"` 之類的未來版本 → build fail，訊息是 ajv 的 pattern 錯誤。可接受：那是真的不支援
- 其餘結構錯誤（`paths` 某個 op 不是 object、`$ref` 指向不存在）**不** build fail，由 renderer 容錯：略過該項 + dev `console.warn`。SSR 在 build 期執行，warn 會出現在 build log

### 5.2 型別（`types.ts`）

只描述 renderer 讀到的子集，未知欄位一律 `unknown`。`Schema` 同時容納 3.0（`nullable`、單一 `type`）與 3.1（`type` 陣列、`const`、`examples` 陣列）。不用 `any`。

### 5.3 推導（`derive.ts`）

照 handoff〈資料推導〉1–5 條實作，另補：

| 項目 | 補充 |
| :-- | :-- |
| `$ref` 解析 | JSON Pointer，處理 `~1`／`~0` 跳脫；只解 `#/` 開頭；最多 10 層，超過視為無法解析（chip 顯示原字串、dev warn） |
| 3.1 的 `$ref` 兄弟欄位 | 3.1 允許 `$ref` 旁邊有 `description`。顯示時兄弟欄位的 `description` 優先於目標 schema 的 |
| op key 重複 | 兩個 op 用了同一個 `operationId`（spec 不允許但常見）→ 第二個起改用 `method/path` 當 key，dev warn |
| path-level 參數 | 照 handoff 合併；path-level 本身也可能是 `$ref` |
| tags | 一支 op 多個 tag 時出現在每個 tag 下；route 記住「從哪個 tag 進來」，導覽只高亮該處 |
| 極小模式 | `ops.length <= 4 && 沒有任何 op 帶 tags` |
| usage index | 遞移閉包以 `deps` 做 BFS，帶 visited set（循環參照不會無窮迴圈） |
| memo | `useMemo(() => derive(data), [data])`；data 是 island props，參照不變 |

### 5.4 範例與 cURL（`examples.ts`）

照 handoff〈範例產生〉〈cURL／fetch〉。補充：

- 範例產生器的「固定值」（`2026-10-01T09:00:00Z`、`3f2c8a10-…`）**寫死**，不取今天 —— SSR 與 client 必須產生同一份字串，否則 hydration mismatch
- 深度上限 8、遇到鏈上 ref 回 `{}`，兩條都由 `oar-examples.mjs` 斷言
- cURL 的單引號 JSON 內若含 `'`，以 `'\''` 跳脫

### 5.5 版本判斷

| `openapi`／`swagger` | 行為 |
| :-- | :-- |
| `3.0.x`、`3.1.x` | 正常 |
| `3.2.x` 及其他 `3.x` | 以 3.1 規則渲染；bar 警示膠囊 + 總覽警示框；`query` method 用中性色 |
| `swagger: "2.0"` | 不渲染文件，整個外殼換成轉檔指引卡（handoff〈資料狀態〉10 的文案）；SSR 時 `console.warn` 一次（build log 可見） |

---

## 6. 路由、狀態與同步

### 6.1 State

照 handoff〈State Management〉表。`tip`（hover 卡）、`activeSec`、`collapseSig` 不持久化。

### 6.2 Hash（page 模式限定）

照 handoff〈深連結〉表，另定：

- **embed 模式完全不讀、不寫 hash**：一篇筆記可能內嵌多份 spec，筆記頁的 TOC 也用 hash 錨點；embed 沒有 route，只有單卡與縮影
- hash 段落的 path 以 `encodeURIComponent` 逐段編碼（`{`、`}`、中文 path），解析時 decode；無效 hash 落回總覽
- `replaceState` 只改 hash，保留 `pathname + search`
- **SSR 與首次 render 一律是總覽**，`useEffect` 掛載後才解析 hash 並切頁（同 ER 的 localStorage 做法）。`/view` 是 `client:load`，閃爍約一幀；可接受（同 ER Q2）
- 指定回應（`#op/x/responses/409`）：切頁後選中該 status，並把 Responses 區段捲入視野

### 6.3 localStorage

| key | 值 | 說明 |
| :-- | :-- | :-- |
| `oar:v1:lang` | `'curl'｜'fetch'` | 範例語言。handoff 用 `oa-lang`，改成有命名空間與版本的 key。全站共用（不分檔案） |

讀寫一律 `try/catch`；SSR 與首次 render 用 `curl`。

### 6.4 捲動

| 情境 | 誰捲動 | 換頁時 |
| :-- | :-- | :-- |
| page | 外殼隨內容長高，最近的捲動祖先（工作台的 `#nc-scroll`）捲；bar、nav sticky | 外殼頂端已捲出視野 → `shell.scrollIntoView({ block: 'start' })`；否則不動 |
| embed | 卡片隨內容長高（**不**像 ER 固定 580px：單卡沒有畫布，固定高會出現捲動陷阱） | 無換頁 |

- 捲動同步（`activeSec`）：監聽**捲動祖先**的 scroll（不是 window），以 `requestAnimationFrame` 節流；判斷基準是「區段頂端相對 bar 底緣 ≤ 96px」，不是相對捲動容器頂端（bar 是 sticky 的 44px）
- 範例框 `position: sticky; top` 要讓出 bar：`top: calc(44px + 12px)`
- 點導覽錨點 → `el.scrollIntoView({ block: 'start' })` + `scroll-margin-top: 56px`（bar 44 + 12）

---

## 7. 樣式與 token

- 所有規則以 `.oar-root` 起頭，class 前綴 `oar-`。CSS 以字串注入 `<style>`，不新增 `.css` 檔
- **CSS 字串不可含 `< > & " '`**：prototype 的四條 `>` 子選擇器改寫為具名 class（例：`.oa-main>div` → `.oar-main-col`）；`scripts/checks/oar-styles.mjs` 比照 `er-styles.mjs` 把關
- Handoff 的 `--wb-oa-*` **改名為 `--oar-*`**，定義在 `.oar-root` 上：`--wb-*` 是 app 的命名空間（`workbench.css` 規則「DS 沒有的值集中在開頭」），plugin 自帶的值不該假裝是 app token，也避免日後與 app 撞名
- prototype 裡的字面色值處理：

  | 字面值 | 處理 |
  | :-- | :-- |
  | `rgba(27,79,156,.06)`／`.1`（導覽 hover／選中） | `color-mix(in srgb, var(--blue-700) 6%／10%, transparent)`（同 ER） |
  | `#1f7350`、`#8a6412`、`#c0392f`（POST／PUT／DELETE 字、status 字） | 集中成 `--oar-ok-ink`、`--oar-warn-ink`、`--oar-danger-ink`，method 與 status 規則只引用變數 |
  | `oklch(.47 .08 195)`／`oklch(.96 .022 195)`（PATCH） | 照用。工作台支援的瀏覽器都支援 `oklch()` |
  | `.oa-tip` 的 `#fff` | `var(--text-on-brand)` |
- 斷點全部改 container query（`container: oar / inline-size`，掛在外殼的**外層**容器上，同 ER §17 的教訓：元素不能查詢自己）
- 動態：`--duration-fast`、`--ease-out`；`prefers-reduced-motion: reduce` 時關閉 caret 旋轉、閃橘底、按下縮放

---

## 8. 各畫面

像素值見 handoff〈Screens / Views〉。以下只記**偏離與補充**。

### 8.1 外殼與 bar

- page 模式外殼不畫外框與圓角（`/view` 的 `.nc-dv-stage` 已是滿版卡片色）
- Esc toast 放在 bar 內，`role="status"`

### 8.2 導覽

- hover 卡（`position: fixed`）：座標由列的 `getBoundingClientRect()` 算；捲動或 resize 時關閉，不追蹤
- 觸控裝置（`(hover: none)`）沒有 hover：`navSummary` 強制當 `'line'`
- 長 path 截斷（「第一段 + `/…/` + 尾段」）在 `derive` 階段算好字串；完整 path 放 `title` 屬性與 hover 卡
- 選中項捲入導覽高度 1/3：只捲導覽自己的捲動區（`navScroll.scrollTo`），不用 `scrollIntoView`（會連外層 `#nc-scroll` 一起捲）

### 8.3 Operation 頁

- path h1 的 `<wbr>`：每個 `/` 之後插入；`{param}` 是 `<button>`，點了捲到參數表該列並閃橘底
- 參數表沿用 ER `colt` 的 `table-layout: fixed`；外層 `overflow-x: auto` 防止窄寬度爆版
- 範例 JSON 以自寫的 tokenizer 上色（key／字串／數字／字面值四色），輸出 React 元素，**不**用 `dangerouslySetInnerHTML`（安裝檢查會擋）
- 複製：`navigator.clipboard.writeText`，失敗退回 `execCommand('copy')`。按鈕狀態 `aria-live="polite"`

### 8.4 欄位樹

照 handoff §7。展開狀態以「欄位路徑字串」為 key，換 schema 或 `collapseSig` 變動時重設。`oneOf` 選項選擇同樣以路徑為 key。

### 8.5 embed

**外框由 app 的 `GeneratedFrame` 提供，plugin 不畫 figcaption**（避免雙層外框）。因此 handoff §8 的 figcaption 要分成兩部分處理：

| Handoff 的 figcaption 內容 | 落在哪裡 |
| :-- | :-- |
| 橘膠囊「資料檔 · API 文件」 | `GeneratedFrame` 既有的「資料檔 · {manifest.title}」。manifest `title` 設為「API 文件」即得到相同文字（圖示是 app 的 `database`，不是 `FileJson`，接受） |
| 檔名 + `· operationId` | 檔名已由 `GeneratedFrame` 顯示；`operationId` 改由 plugin 在卡片頁首顯示（`[method] path` 下方 meta 列） |
| 「在文件頁開啟 → `/view/<路徑>#op/<id>`」 | `GeneratedFrame` 既有的「開啟完整檢視頁」連結，加上 `PluginView` 的 `anchor` prop 帶 hash（§11.2） |

- 卡片內 padding 照 handoff（`16px 18px 6px`）
- `GeneratedFrame` 的「放大檢視」（`data-nc-viz-body` 搬移）照常可用；放大後 container 變寬，卡片版面自然展開
- 總覽縮影的 tag 列連結 → `/view/<routePath>#tag/<name>`（`routePath` 由 `file.path` 推得，規則同 app：只去掉 `.json`，Q2 定案；例：`api/orders.openapi.json` → `/view/api/orders.openapi#tag/orders`）

---

## 9. 響應式

全部以外殼的 container 寬度判斷：

| 外殼寬 | 版面 |
| :-- | :-- |
| > 1100 | 導覽 248 + 內容；Media split（樹｜範例）並排 |
| ≤ 1100 | Media split 改上下排列（handoff 的「視窗 < 1180」改為 container 寬度；扣掉導覽 248 後內容約 850，與原意相同） |
| ≤ 760 | 導覽改覆蓋式（absolute、`--shadow-lg`，點選後自動收起），預設收合；頁面 padding `20px 18px` |
| ≤ 520 | bar 精簡（只留導覽開關與版本）；參數表改每列兩行（名稱＋型別／說明） |

- 工作台 ≤ 860 的手機版：`/view` 照常可用（外殼寬 ≤ 760，自動走覆蓋式導覽）。Handoff 沒畫手機，以上即為手機規格
- embed 卡只用 ≤ 520 那一條

---

## 10. 無障礙與鍵盤

- 導覽 `<nav aria-label="API 導覽">`；caret `aria-expanded`；目前項 `aria-current="page"`
- status 分頁、content-type 切換、cURL／fetch：`role="tablist"`／`role="tab"`／`aria-selected`，左右方向鍵切換
- method 與 status 的辨識不只靠顏色（handoff 已設計：形狀 + 文字）；method 標記加 `aria-label`（例：「DELETE」，即使畫面上縮寫為 `DEL`）
- **`/`**：只在 page 模式、焦點不在 input／textarea／select／`[contenteditable]` 時才處理。工作台目前只有 ⌘K（Palette），沒有其他 `/` 快捷鍵
- **Esc**：照 handoff 的四層，前面加兩條（同 ER §10）：
  1. 事件已 `defaultPrevented` → 不處理（Palette／Drawer 先處理掉的 Esc）
  2. page 模式才有逐層退；embed 不掛 keydown（卡片沒有可退的東西，避免同頁多張卡互相干擾）
  - 每一層實際有東西可退時才 `preventDefault`，讓工作台後面的處理器知道已被吃掉

---

## 11. App 端配合

### 11.1 資料檔頁的標題與描述從哪來（Q1 定案）

**manifest 新增 `meta` 欄位，以 JSON Pointer 宣告標題、描述、backTo 的來源。**

```jsonc
// plugins/openapi-renderer/notecraft-plugin.json
{
  "id": "openapi-renderer",
  "title": "API 文件",
  "meta": {
    "title": "/info/title",
    "description": "/info/description",
    "backTo": "/x-notecraft-back-to"
  },
  "engines": { "notecraftapp": ">=1.6.0" }
}
```

- `src/lib/plugins.ts` 的 `readMeta` 改成：manifest 有 `meta` 就依 pointer 取值，否則維持現行 `data.meta.*`（ER 與使用者自製 plugin 零影響）
- `description` 照舊經 `stripMarkdownFirst`／`stripMarkdownAll`（`info.description` 常是 Markdown）
- `backTo` 同樣驗證「單一 `/` 開頭」；OAS 只允許頂層 `x-` 擴充欄位，所以用 `x-notecraft-back-to`
- 同步修改：`PluginManifest` 型別、`plugins/notecraft-plugin.schema.json`（`additionalProperties: false`，必須加進 `properties`）、plugin system 文件 §6.1
- 這是 **manifest 的新契約**：`openapi-renderer` 的 `engines` 必須是 `>=1.6.0`（handoff 寫 `>=0.6.0` 不成立），app 以 1.6.0 發佈

### 11.2 `<PluginView>` 逐處指定 options 與開啟位置（Q3 定案）

```mdx
<PluginView src="api/orders.openapi.json" options={{ operation: "createOrder" }} anchor="op/createOrder" />
```

- `options?: Record<string, unknown>`：淺合併在 `plugins.json` 規則的 options 之上，傳給 renderer
- `anchor?: string`：附加在 `GeneratedFrame`「開啟完整檢視頁」連結的 hash。app 不解讀內容
- handoff 寫的 prop 名 `file` 一律改為既有的 `src`（plugin README 的範例要寫對）
- 兩者都是 plugin 無關的通用能力，ER 也能用（例如日後指定內嵌時聚焦某張表）

### 11.3 版本

- app：1.5.1 → **1.6.0**（manifest 新欄位、`PluginView` 新 prop，皆為新增）。`package.json` 在 **Task 98 就升版**：`check-plugins` 以安裝期的 `engines` 檢查比對 `package.json` 版本，不先升，Task 99 的 plugin 過不了檢查；CHANGELOG 與發佈留到 Task 104
- plugin：`openapi-renderer` 1.0.0，`engines: ">=1.6.0"`
- ER 不動

---

## 12. 驗證與測試

### 12.1 自動化

| 檢查 | 內容 |
| :-- | :-- |
| `scripts/checks/oar-derive.mjs` | 程式產生的極大 spec（20 tag、250+ op）推導結果；ops 順序與 key；path／op 參數合併與覆蓋；`$ref`（components 各類、`~1` 跳脫、10 層上限）；security 覆蓋（含 `[]`）；tags 順序、未宣告 tag、未分類、多 tag；極小判定；usage index 直接／間接與循環；版本判斷 |
| `scripts/checks/oar-examples.mjs` | 範例優先序；各 format 固定值；`readOnly`／`deprecated` 略過；循環回 `{}`；深度 8；cURL 的 query／header／cookie／body 四種 content-type、佔位、`'` 跳脫；fetch 版 |
| `scripts/checks/oar-markdown.mjs` | 拿 ER 的 Markdown 案例跑 OA 的 parser，行為一致（§4.4） |
| `scripts/checks/oar-styles.mjs` | CSS 字串不含 `< > & " '`；所有規則以 `.oar-root` 起頭 |
| `npm run check-plugins` | manifest、registry、白名單、三份 example 通過 dataSchema 並一起 build |
| `tsc --noEmit` | 不新增錯誤 |

### 12.2 手動（瀏覽器）

以三份 example 與產生器輸出的極大 spec，逐條走 handoff〈資料狀態〉1–12，另加：

- hydration：開 `/view/...#op/createOrder` reload，console 無 hydration 警告，一幀後切到該 op
- 捲動同步在 `#nc-scroll` 內正確；sticky 範例框不被 bar 蓋住
- 工作台寬 1100／860／375：導覽覆蓋式、split 上下
- embed：同一篇筆記放兩張卡 + 一個縮影，Esc、hash 都不互相干擾；「開啟完整檢視頁」帶到正確的 op；放大檢視正常
- Palette（⌘K）、Dashboard Drawer 顯示的是 `info.title`，不是檔名
- 搜尋（pagefind）能以 `info.title`、`info.description` 找到資料檔頁

---

## 13. 實作階段

Task 編號接續 97，已展開於 `docs/tasks/`（索引見 [tasks/README.md](tasks/README.md)「v1.17.0」段）。順序：98 → 99 → 100；101、103 可並行；102 接 101；104 收尾。

| Task | 內容 | 對應章節 | 主要檔案 |
| :-- | :-- | :-- | :-- |
| [98](tasks/task-98-app-manifest-meta-pluginview-options.md) | App 端：manifest `meta` pointer、`PluginView` 的 `options`／`anchor`、型別與 schema、plugin system 文件 | §11 | `src/lib/plugins.ts`、`plugin-types.ts`、`PluginView.astro`、`GeneratedFrame.astro`、`plugins/notecraft-plugin.schema.json` |
| [99](tasks/task-99-oar-scaffold-derive-examples.md) | Plugin 骨架：manifest、dataSchema、types、`derive.ts`、`examples.ts`、`markdown-text.ts` + 三支 checks、registry、三份 example（極大 spec 由 check 產生） | §4、§5、§12.1 | `plugins/openapi-renderer/*`、`scripts/checks/oar-*.mjs` |
| [100](tasks/task-100-oar-atoms-schema-tree-styles.md) | 原子元件、欄位樹、`styles.ts` + `oar-styles.mjs` | §7、§8.4 | `atoms.tsx`、`schema-tree.tsx`、`styles.ts` |
| [101](tasks/task-101-oar-shell-nav-routing.md) | 外殼、bar、導覽、hash 路由、鍵盤、捲動同步 | §6、§8.1–8.2、§10 | `renderer.tsx`、`nav.tsx` |
| [102](tasks/task-102-oar-pages.md) | 四種頁面 | §8.3 | `pages.tsx` |
| [103](tasks/task-103-oar-embed.md) | embed（單卡、縮影、錯誤）與 app 外框整合 | §8.5 | `embed.tsx` |
| [104](tasks/task-104-oar-responsive-docs-release.md) | 響應式、README、手動驗證、發佈（app 1.6.0） | §9、§12.2 | — |

---

## 14. 風險

| 風險 | 影響 | 對策 |
| :-- | :-- | :-- |
| 同一份 spec 內嵌多次重複 inline | 一篇筆記內嵌 3 張大 spec 的卡 → HTML 多 1 MB 以上 | v1 接受（Q4 定案）；README 建議大 spec 只內嵌少數幾處。現有 256 KB 警告照常；build 期瘦身留待實際遇到 |
| 大 spec 的 hydration 成本 | 252 支 op 的 derive + 導覽首次 render | derive 為線性；導覽未展開的 tag 不 render 子列（> 6 個 tag 時只展開目前 tag，handoff 已如此） |
| 真實世界的 spec 不規矩 | `$ref` 斷掉、`operationId` 重複、`type` 缺漏 | dataSchema 寬鬆、renderer 逐項容錯 + dev warn（§5.1、§5.3），不白屏 |
| hover 卡 `position: fixed` 在放大檢視內 | `VizZoom` 若有 `transform` 祖先，fixed 會相對它定位而錯位 | 放大檢視只在 embed 發生，而 embed 沒有導覽（沒有 hover 卡）。page 模式不受影響 |
| ER 與 OA 的骨架樣式漂移 | 兩個 plugin 漸漸不像同一家族 | §4.4 的對照；ER 改版時在其文件中提醒同步 OA |

---

## 15. 待釐清問題

### Q1. 資料檔頁的標題／描述從哪來？ ✅ 已定案（§16）
- 現況只讀 `data.meta.*`，OpenAPI 沒有 `meta`，頁首與 Palette 會顯示檔名
- A：manifest 新增 `meta` JSON Pointer 對應（§11.1）
- B：要求作者在 spec 頂層加 `x-notecraft-meta: { title, description }`，app 認這個鍵（不動 manifest，但每份 spec 都要手動加、從外部拿到的 spec 也要改）
- C：app 對 `openapi-renderer` 特判（寫死）
- **建議：A**。通用、不碰資料檔，日後其他「現成格式」的 plugin（如 JSON Schema、Postman collection）都能用

### Q2. 路由要不要去掉 `.openapi.json`？ ✅ 已定案（§16）
- 現況：`api/orders.openapi.json` → `/view/api/orders.openapi`；handoff 想要 `/view/api/orders`
- A：維持現況，不改 app（系列識別碼寫 `view:api/orders.openapi`）
- B：manifest 宣告 `routeSuffix: ".openapi.json"`，app 去掉它（同目錄的 `orders.json` 與 `orders.openapi.json` 會撞路由，build fail）
- C：app 一律去掉最後兩段副檔名（會把既有的 `schema.v1.1.json` 變成 `schema.v1`，破壞現有網址）
- **建議：A**。網址多 `.openapi` 不影響閱讀，換來零 app 改動、零撞路由風險

### Q3. 內嵌時逐處指定 operation 與開啟位置？ ✅ 已定案（§16）
- 現況 `PluginView` 只有 `src`、`caption`，options 只能來自 `plugins.json`
- A：`PluginView` 加 `options`（淺合併）與 `anchor`（開啟連結的 hash），§11.2
- B：只加 `options`，開啟連結不帶 hash（點了到總覽，讀者自己找）
- C：不改 app，embed 只做總覽縮影
- **建議：A**。單卡是 embed 的主角，「開啟」帶到該 op 是 handoff 的核心互動

### Q4. 同一份 spec 內嵌多次的資料重複，v1 要處理嗎？ ✅ 已定案（§16）
- 每個 `<PluginView>` 都把整份 spec inline 成 island props
- A：v1 接受，README 提醒
- B：在 manifest 加選用的 build 期「瘦身函式」（plugin 提供純函式，依 options 只留該 op 需要的 paths／components），app 在 inline 前呼叫 —— 又一個新契約，`$ref` 閉包要算對
- **建議：A**。先看實際用量；B 等真的遇到才做

### Q5. Swagger 2.0 是錯誤卡還是 build fail？ ✅ 已定案（§16）
- Handoff 要錯誤卡；plugin system 的原則是「資料不符 → build fail」
- A：dataSchema 允許 `swagger`，renderer 顯示轉檔指引卡，SSR 時 `console.warn`（build log 看得到）
- B：dataSchema 要求 `openapi: 3.x`，2.0 直接 build fail（ajv 訊息是「must have required property 'openapi'」，不夠直白）
- **建議：A**。錯誤卡有完整的轉檔指引，不是靜默降級；build fail 的 ajv 訊息反而讓作者摸不著頭緒

### Q6. 與 ER 的「共用模組」怎麼落地？ ✅ 已定案（§16）
- 兩個 plugin 各自安裝，跨 plugin import 在使用者專案會失敗（§4.4）
- A：各自持有一份，Markdown 以共用測試案例防漂移，樣式以相同數值對齊
- B：app 安裝時寫入共用模組 `@notes/plugins/_shared/`
- **建議：A**

### Q7. CSS 變數叫 `--wb-oa-*` 還是 `--oar-*`？ ✅ 已定案（§16）
- Handoff 用 `--wb-oa-*`；`--wb-*` 是 app 工作台的命名空間
- **建議：`--oar-*`**，定義在 `.oar-root`（§7）。ER 已是 `--erd-*` 的先例

### Q8. embed 卡要不要固定高度？ ✅ 已定案（§16）
- ER 的 embed 固定 580px（因為有畫布）
- **建議：不固定，隨內容長高**。單卡內容有限（參數清單 + 頂層欄位樹），固定高反而在筆記中多一個捲動區

### Q9. 範例資料能否放進公開的官方 store？ ✅ 已定案（§16）
- 推上預設分支即發佈到 GitHub。`countsalary-platform.openapi.json`（一鍵發薪 Platform API，server `api.countsalary.tw`）若是真實產品的 spec，會一起公開
- A：確認可公開，照放
- B：保留結構、把名稱與網址換成虛構的（例：`acme-payroll`），再放進 store
- C：不放進 store，只當本機測試資料
- **建議：B**（若確定是可公開的對外文件則 A）。極大案例的價值在規模（20 tag、146 path），不在內容

---

## 16. 定案紀錄

| # | 題目 | 定案 | 日期 |
| :-- | :-- | :-- | :-- |
| Q1 | 標題／描述來源 | **A：manifest 新增 `meta`（JSON Pointer）**。`readMeta` 有宣告就依 pointer 取值，否則維持 `data.meta.*`；`backTo` 用 `/x-notecraft-back-to`。manifest 型別與 JSON Schema 同步加欄位；app 升 1.6.0、plugin `engines: ">=1.6.0"`（§11.1） | 2026-10-01 |
| Q2 | 路由 | **A：維持現況**，`api/orders.openapi.json` → `/view/api/orders.openapi`。handoff 的 `/view/api/orders` 不採用；README 範例與 embed 內的連結一律照 app 規則推導 | 2026-10-01 |
| Q3 | 內嵌指定 operation | **A：`PluginView` 新增 `options`（淺合併於規則 options 之上）與 `anchor`（開啟完整檢視頁的 hash）**。prop 名沿用既有的 `src`，不是 handoff 的 `file`（§11.2） | 2026-10-01 |
| Q4 | 內嵌資料重複 | **A：v1 接受**，README 提醒大 spec 少量內嵌；build 期瘦身等實際遇到再做 | 2026-10-01 |
| Q5 | Swagger 2.0 | **A：轉檔指引卡**。dataSchema 允許 `swagger`（`oneOf` 要求 `openapi` 或 `swagger` 其一），renderer 顯示 handoff 文案，SSR 時 `console.warn` | 2026-10-01 |
| Q6 | 與 ER 共用 | **A：各自一份**。OA 複製 ER Markdown parser 的通用部分，`oar-markdown.mjs` 以 ER 的案例斷言行為一致；骨架樣式以相同數值對齊，不共用 class | 2026-10-01 |
| Q7 | CSS 變數命名 | **`--oar-*`**，定義在 `.oar-root`（依建議定案，未逐題詢問；如有異議再改） | 2026-10-01 |
| Q8 | embed 卡高度 | **不固定、隨內容長高**（依建議定案，未逐題詢問；如有異議再改） | 2026-10-01 |
| Q9 | 範例資料公開 | **官方 store 以 Swagger Petstore 為範例**（`manifest.example`），另放 orders（邊界案例）與 health（極小）。`countsalary-platform.openapi.json` 不進 store，**handoff 資料夾內那份也已刪除**、不進版控；極大規模改由 check 腳本程式產生。handoff README 與 prototype 仍保留這個檔名的字樣（prototype 的 large 資料是 `makeLarge()` 程式產生的假資料），不影響實作 | 2026-10-01 |

---

## 17. 實作後回填

### 待驗證項的結論

| 項目 | 結論 |
| :-- | :-- |
| manifest `meta` pointer（Q1） | `/view` 頁首、`<title>`、⌘K、`/wb-index.json` 都顯示 `info.title`；pagefind 以 `info.title` 與 `info.description` 全文（`descriptionIndex`）都搜得到資料檔頁，operation 內容不進索引（同 ER） |
| hydration | `/view/…#op/createOrder/responses/409` 冷載入：一幀後切到該 op、選中 409，dev console 零 hydration 警告；內嵌四張卡同樣零警告 |
| 極大 spec（產生器 280 支、20 tag） | `derive` 遠低於 300ms 上限；導覽只展開目前 tag（首次只 render 11 列 op）；選中項捲入導覽可視區 |
| Esc 與工作台共存 | 篩選中開 ⌘K 按 Esc：只關 Palette，plugin 的篩選字串保留 |
| 寬度 | 1440（外殼 1138）並排；1024（外殼 962）樹與範例上下排；375（外殼 365）導覽覆蓋式、預設收合、參數表兩行、無水平捲動 |
| 內嵌 | 外框只有 `GeneratedFrame` 一層；「開啟完整檢視頁」帶 `anchor`；放大檢視（VizZoom）中卡片寬 1296、關閉後回原位 |

### 實作中新增的決定

| 項目 | 決定 | 理由 |
| :-- | :-- | :-- |
| Esc 的處理時機 | 不在 keydown 當下判斷，`setTimeout(0)` 後看 `defaultPrevented` 再逐層退 | `wb-escape` 也掛在 window 的 bubble 階段，誰先註冊誰先跑；晚一拍才能確定 Palette／Drawer 有沒有處理過，順序怎樣都不搶 |
| 導覽 path 截斷長度 | 有前綴 19、無前綴 21 字元（handoff 是 24／26） | handoff 的數字是以它的等寬字量的；實際字型下 24／26 會再被 CSS ellipsis 切一次（`/v2/…/{payrollId}/…`），調整後 280 支 op 的導覽零裁切（唯一例外是帶「棄用」標的列，prototype 亦同） |
| 覆蓋式導覽的焦點 | 開啟時焦點進篩選框；Esc 先關覆蓋導覽，焦點還給開關 | §10 要求；handoff 未畫 |
| 深連結到回應 | 捲的是 Responses 的標題（帶 `scroll-margin-top`），不是整個 section | 捲 section 會讓標題躲在 sticky bar 下 |
| 「被哪些 operation 使用」 | 直接與間接放在同一個清單，中間以「間接使用」分隔列 | 照 prototype；無直接使用時分隔列不畫上框線 |
| `GeneratedFrame` 的資料檔膠囊 | 加 `white-space: nowrap`、`flex: none` | 「資料檔 · API 文件」在筆記版心內會斷成三行；ER 的膠囊同樣受惠 |
| 範例檔 | `petstore.openapi.json` 改用作者提供的官方完整版（含 `externalDocs`） | handoff 那份被刪減過 |
| 主 repo 測試資料 | `src/content/notes/testing/openapi/`（三份範例 + Swagger 2.0）、`testing/openapi-內嵌測試.mdx`；orders 加 `x-notecraft-back-to` 驗證回到來源筆記 | 比照 ER 的 `testing/er-v12.er.json` |

### 仍未做的

- 試打 API、YAML、外部 `$ref`（§1.3 非目標）
- 內嵌資料瘦身（Q4）
- 實機（非模擬）手機測試：僅以瀏覽器 375×812 模擬驗證

