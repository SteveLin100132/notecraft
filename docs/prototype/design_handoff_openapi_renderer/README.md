# Handoff：OpenAPI Renderer（`openapi-renderer`）v1.0

## Overview
NoteCraft 官方 plugin，把筆記資料夾內的 OpenAPI 文件（JSON，OAS 3.0 / 3.1）渲染成 API 文件。

- **page 模式**：build 產出 `/view/<路徑>` 頁，plugin 只負責工作台主區 **Body**（約 1148px 寬）。Rail、Sidebar、頁首由 app 提供，不在本次範圍。
- **embed 模式**：MDX 內 `<PluginView file="api/orders.openapi.json" options={{ operation: "createOrder" }} />`，筆記版心 760px。
- 純靜態部署（Netlify），**沒有任何執行時 API**，也**不做試打 API**（理由見〈不做的事〉）。
- 主要讀者：一年後回來查參數的作者本人。這裡是「讀文件」的地方。

視覺與骨架是 **ER Diagram plugin（`er-diagram-renderer` v1.2）的同一家族**：導覽樹、Wiki 頁首、區段標題、欄位表格、Markdown、參照關係直接共用同一組元件／樣式；OpenAPI 只新增 method 標記、status、欄位樹、程式碼區。

## About the Design Files
`prototype/` 內是 **HTML + React（瀏覽器端 Babel）做的設計參考**，用來呈現外觀與互動，**不是**要直接搬進 repo 的程式碼。請在 plugin 既有環境重做：比照 `plugins/er-diagram-renderer/renderer.tsx` 的慣例（React + TypeScript + `lucide-react`，樣式以 root class 前綴的 CSS 字串注入，吃 NoteCraft／TrendLink CSS 變數）。

- props 型別自帶（`PluginRendererProps<OpenApiDoc>`），不從 `@notes/...` import
- class 前綴：prototype 用 `oa-*`（OpenAPI 專屬）與 `erx-*`（借用 ER 的）。實作時建議 root `.oar-root`，專屬 class 用 `oar-`；**與 ER 共用的元件請抽到共用模組**（見〈與 ER Diagram 共用〉），不要複製兩份
- 圖示一律 `lucide-react`。prototype 的 `OaIcon` 是手寫 Lucide 路徑，對照表見〈Assets〉
- 不可依賴 Swagger UI、Redoc、任何 Markdown 函式庫。Markdown 用 plugin 自帶迷你 parser（prototype 借用 ER 的 `ErMarkdown` / `ErInline`，可直接共用）
- 不做深色模式

### 開啟方式
`prototype/OpenAPI Renderer Prototype.html`（需經本機 http server 開啟）。右下 Tweaks：
- 模式：文件頁 / MDX 內嵌
- 資料：Petstore（使用者附件，OAS 3.2.0）/ 訂單服務（3.1 邊界案例）/ 極小（2 支、無 tag）/ 極大（20 tag、252 支）
- 導覽 summary：hover 顯示 / 第二行

也可用網址：`?ds=orders#op/createOrder`、`?mode=embed&ds=large`。

`prototype/OpenAPI Renderer Spec.html` 是設計提案的完整說明（四個提案問題的答案、token 理由、深連結、狀態表）。本 README 已涵蓋其全部內容。

## Fidelity
**High-fidelity。** 顏色、字級、間距、圓角、互動皆為定稿。色彩一律用 TrendLink DS 變數與工作台 `--wb-*`；新增的 method 色集中為 `--wb-oa-*`（見〈Design Tokens〉）。工作台把 DS 圓角縮小一級（`--radius-sm:3px; --radius-md:5px; --radius-lg:8px`），prototype 已套用。

---

## Plugin 整合

```jsonc
// .notecraft/plugins.json
{ "plugin": "openapi-renderer", "files": ["**/*.openapi.json"], "options": {} }
```

- manifest `notecraft-plugin.json`：`id: "openapi-renderer"`, `version: "1.0.0"`, `engines: ">=0.6.0"`
- 路由：`api/orders.openapi.json` → `/view/api/orders`（去掉 `.openapi.json`）
- 工作台頁首（app 提供）：crumbs `NoteCraft / Plugin / <檔案路徑>`，title = `info.title`，pill `openapi-renderer`，`N 天前更新`，若有來源筆記則「回到來源筆記」
- embed props：`options.operation?: string`（對應 `operationId`）。未給 → 總覽縮影；給了但找不到 → 錯誤卡
- 只接受 `openapi: 3.0.x / 3.1.x`。`3.2.x` 以 3.1 規則盡力渲染並警示；`swagger: "2.0"` 不渲染，顯示錯誤卡（見〈資料狀態〉）

### 建議檔案拆分
| 模組 | 內容 | prototype 對應 |
|---|---|---|
| `renderer.tsx` | 外殼、路由、hash、鍵盤、page / embed 分流 | `oa/oa-app.jsx` 的 `OaDocs`、`OaEmbed` |
| `derive.ts` | 推導 ops / tags / usage index、`$ref` 解析 | `oa/oa-core.jsx` `oaDerive` `oaPtr` `oaDeref` |
| `examples.ts` | 由 schema 產生範例、cURL / fetch | `oaExample` `oaExampleResp` `oaMediaExample` `oaCurl` `oaFetch` |
| `nav.tsx` | 導覽 | `oa/oa-pages.jsx` `OaNav` |
| `pages.tsx` | 總覽、Tag、Operation、Schema 頁 | `OaOverview` `OaTagPage` `OaOpPage` `OaSchemaPage` |
| `schema-tree.tsx` | 欄位樹 | `oa/oa-tree.jsx` |
| `atoms.tsx` | Method、Status、Path、Copy、Code、Json、Seg | `oa/oa-core.jsx` 下半 |
| `embed.tsx` | 單一 operation 卡、總覽縮影 | `OaOpCard` `OaMiniOverview` |
| `styles.ts` | CSS 字串 | `oa/oa.css` |

---

## 資料推導（`derive.ts`）

1. **operations**：走訪 `paths[path][method]`，method 順序 `get post put patch delete query head options trace`。
   - 參數 = path-level `parameters` 與 op-level 合併；同 `name + in` 時 op-level 覆蓋
   - `parameters` / `requestBody` / `responses[*]` 可能是 `$ref`（`#/components/parameters|requestBodies|responses/...`），先解開（最多 10 層）
   - `security`：op 有寫（含空陣列 `[]`）用 op 的；否則用頂層 `security`
   - key = `operationId ?? method + path`（例如 `get/pet/{petId}`）
2. **tags**：先依頂層 `tags[]` 順序，再補 op 中出現但未宣告的 tag，最後是「未分類」（沒有 `tags` 的 op，內部 key `__none`）。一支 op 有多個 tag 時出現在每個 tag 下（符合 spec）。只保留有 op 的 tag。
3. **schema 參照**：`deps[Name]` = 該 schema 內直接出現的 `#/components/schemas/*`（不追 ref、略過 `example(s)`）。
4. **usage index（Schema 頁「被哪些 operation 使用」）**：
   - 直接：op 的參數 schema、requestBody content、responses content 中直接出現 → 記錄位置字串：`參數 <name>` / `Request body` / `回應 <code>`
   - 間接：op 直接參照的某 schema 的遞移閉包含此 schema → 記「經由 `<那個 schema>`」
   - `refBy[Name]` = deps 含 Name 的其他 schema
5. **版本**：`supported = /^3\.(0|1)\./.test(openapi)`

### 範例產生（`examples.ts`）
優先序：media `examples` 第一個（可下拉切換）> media `example` > 由 schema 產生（標題標「範例（由 schema 產生）」）。
schema 產生規則：`$ref`（遇到已在鏈上的 ref 回 `{}`）→ `example` → `examples[0]` → `const` → `default` → `enum[0]` → `allOf` 合併 → `oneOf/anyOf` 取第一個非 null → object（略過 `deprecated`；request 略過 `readOnly`，response 保留）→ array 一個元素 → integer/number 取 `minimum ?? 0` → boolean `true` → string 依 format：`date-time 2026-10-01T09:00:00Z`、`date 2026-10-01`、`email user@example.com`、`uuid 3f2c8a10-…`、`uri https://example.com`、`binary <binary>`，其餘 `"string"`。深度上限 8。

### cURL / fetch
- URL = 選定 server（預設 `servers[0]`）+ path。`{param}` 有 example 用 example，否則 `<param>` 佔位
- query：必填、或有 example / enum / default 的參數；deprecated 參數不帶
- headers：驗證（取 `security[0]`）→ apiKey header `<API_KEY>`；http basic `Basic <BASE64_CREDENTIALS>`；bearer / oauth2 `Bearer <ACCESS_TOKEN>`。再加必填或有 example 的 header 參數。有 body 時加 `Content-Type`
- cookie：必填的 cookie 參數 → `--cookie`
- body 依 content-type：JSON → `-d '<pretty JSON>'`；form-urlencoded → 每個純值欄位 `--data-urlencode`；multipart → `-F`（binary 欄位 `@./file.pdf`）；其他 → `--data-binary '@./file.bin'`
- 每行以 ` \` 接續、兩格縮排。fetch 版為 `await fetch(url, { method, headers, body })`
- 程式碼中的 `<…>` 佔位以 `--wb-oa-param-*` 上色

---

## Screens / Views

### 0. 版面（page 模式，1440 寬）
```
Rail 52 | Sidebar 240 | Body 1148
                        ├ plugin bar 44px（全寬）
                        └ 導覽 248 | 內容 flex:1（≈900）
```
- 內容頁 padding `28px 36px 64px`（同 ER `.erx-page`）
- 極小文件（≤ 4 支且沒有任何 tag）：**不顯示導覽**，內容置中 `max-width: 880px`

### 1. Plugin bar（同 ER `.erx-bar`）
高 44、`padding: 0 14px`、底線 `1px var(--border-subtle)`、gap 12。
- 左：導覽開關（30×30 icon button，`PanelLeft`，開啟時藍字）。極小模式改成「← 總覽」pill（不在總覽時）
- 位置字串 11.5px muted：`總覽` / `tag · <code>pet</code>` / `<tag> · <code>operationId</code>` / `schema · <code>Pet</code>`
- Esc 回饋 toast（見互動）
- 右：`OAS 3.1.0`（mono 11px muted）。不支援的版本改為警示膠囊：高 22、`--warning-50` 底、`#8a6412` 字、`AlertTriangle` 12px

### 2. 導覽（`.erx-nav` 骨架，寬 248、`--surface-page` 底、右框線）
由上而下：
1. **篩選框**（同 ER）：高 30、pill、margin `10px 10px 4px`。placeholder `篩選 path、summary`。右側：未篩選時顯示 `/` 鍵帽；篩選中顯示 `命中/總數`（11px bold，`ok` 藍 / `none` 紅）
2. **method chip 列**：padding `4px 10px 6px`、gap 4、wrap。每顆 = 小 method 標記（16px 高、9.5px 字）+ 數量。可複選；選中 = 白底 + `--blue-400` 框 + 藍字 bold。只列文件中出現的 method
3. **捲動區**：
   - `總覽`（`Home` 圖示）
   - 區段標題 `OPERATIONS` + 數量（篩選中 `命中/總數`）
   - 每個 tag：caret + `Tag` 圖示 + 名稱 + 數量（篩選中 `命中/總數`）。「未分類」字色 muted。tag 下方群組 `margin-left:16px`、左框線
     - **共同前綴**：tag 內 ≥ 2 支、共同前綴 ≥ 2 段時，在群組頂端顯示一次（mono 10.5px muted），列上只顯示剩餘部分
     - **operation 列**：min-height 30、radius 5、gap 7、padding `0 6px`。`[method 44px] [path mono 11.5px]`。path 超長時保留第一段 + 盡量多的尾段，中間 `/…/`（上限：有前綴 24 字元、無前綴 26 字元）
     - hover：`rgba(27,79,156,.06)` 底。選中：`rgba(27,79,156,.1)` 底 + `inset 2px 0 0 --orange-400` + path 藍色 bold
     - summary：預設 **hover 卡**（fixed，導覽列右側 8px，`--blue-950` 底白字，max-width 340，內含 method + 完整 path（`--orange-300`）+ summary）；設定可改為第二行（列高 40，11px muted 單行省略）
     - deprecated：path `--neutral-400` + 刪除線、method opacity .55、右側 10px「棄用」。不用警示色
     - 選中的 operation 下方展開區段錨點：`參數 / Request Body / Responses / 範例請求`（只列存在的），`margin-left:26px` + 左框線，24px 高 11.5px；捲動同步高亮（藍字 bold + 淡藍底）
   - 區段標題 `SCHEMAS` + 數量；每個 schema 一列（`Braces` 圖示 + mono 名稱 + 被使用數）。文字篩選同樣套用
   - 篩選無結果：`沒有符合的 operation。按 Esc 清除篩選。`
4. **底部提示**：`/ 篩選　Esc 逐層退出`（11px，上框線）

收合規則：tag 數 ≤ 6 全部展開；> 6 只展開目前所在 tag。進入某 op / tag 時自動展開其 tag。篩選中所有命中 tag 強制展開（caret disabled），沒有命中的 tag 隱藏。選中項若不在可視範圍，捲到導覽高度 1/3 處。

### 3. 總覽頁（預設進入點）
1. 不支援版本時頂端警示框（`--warning-50` 底、警示色 34% 框、radius 5、12.5px）：
   > 這份文件宣告 `openapi: 3.2.0`，plugin 只保證 3.0 / 3.1。目前以 3.1 規則渲染：3.2 新增的 `query` method 以中性色標記，其他 3.2 專屬欄位會略過。
2. eyebrow `OPENAPI 3.1.0`（11px bold 橘 `--orange-500`、wide tracking）
3. h1 `info.title`（24px/700）+ 版本膠囊 `v2.4.0`（mono 12px、`--neutral-100` 底）
4. meta 列（同 ER）：`21 支 operation · 3 個 tag · 9 個 schema · N 支已棄用`，右側 `來源：<code>檔案路徑</code>`
5. `info.description` Markdown；缺 → 空狀態（`info.description`）
6. **API 結構**（h2 + tag 數 + 右側全文件 method 分布）
   - **規模長條**：高 40、radius 5、gap 2。每個 tag 一段，`flex-grow = op 數`，min-width 28；底色 `--blue-50` / `--blue-100` 交替，hover `--blue-200`；段內兩行：tag 名（mono 11px `--blue-800`）、數量。點 → Tag 頁
   - **tag 表**（`erx-tlist` 樣式）：欄 `Tag (minmax 110,.8fr) | 說明 (1.6fr) | 數量 110 | Method 分布 (minmax 180,1.3fr)`；列高 ≥ 42。數量欄 = 數字 + 長條（5px、`--blue-400`、相對最大 tag、上限 70px）。method 分布 = 小 method 標記 + 數字（文字表示，色盲可讀）
7. **伺服器**（`erx-kv`）：url（mono 12.5）、description、複製按鈕。缺 → 空狀態「沒有列出伺服器，範例請求會用相對路徑」
8. **驗證方式**：名稱 | type chip（`http · bearer`）| 細節（apiKey：`放在 header 的 api_key`；http：`HTTP bearer（JWT）`；oauth2：`OAuth2 implicit · scopes <code>…</code>`）+ description muted

極小模式改為：Operations 清單（說明：「這份文件沒有分 tag，operation 不多，直接全部列在這裡；點一列看參數與回應。」）+ Schemas chip（34px 高，名稱 + 欄位數）。不顯示 tag 數與規模長條。

### 4. Tag 頁
eyebrow `TAG` → h1 `<code>pet</code>` → meta `N 支 operation` + method 分布 → description（缺 → 空狀態 `tags[name="pet"].description`；未分類 → 「這些 operation 沒有設定 `tags`，統一歸在這裡。」）→ Operations 清單。

**Operations 清單**（共用元件）：外框 radius 8；列 grid `44px | 1.2fr path | 1fr summary | auto`，min-height 38，hover `--blue-50`。summary 缺 → 淡色「沒有 summary」。deprecated → path 刪除線 + 「已棄用」。

### 5. Operation 頁（主角）
1. crumbs：`<tag>` › `operation`（11.5px）
2. **頁首**：`[method lg] [h1 path]`，gap 10。method lg：min-width 52、高 24、12px、radius 5。path h1：mono 19px/700、line-height 1.4，**每個 `/` 後可換行（`<wbr>`），不截斷**。`{param}`：`--wb-oa-param-fg` 字 + `--wb-oa-param-bg` 底 + radius 3；可點 → 捲到參數表 `#param-path-<name>` 該列並閃一下橘底（1.2s）
3. summary：15px/600 `--neutral-800`；缺 → 「沒有 summary」muted。deprecated → 右側灰框標籤「已棄用」
4. meta 列：`operationId <code>`（未設定 → 「未設定，連結改用 method + path」）· 驗證 chips · 右側 `複製 path`、`複製連結`（pill 26px）
   - 驗證 chip：22px pill、`--blue-50` 底、mono 11px：`🔒 petstore_auth write:pets read:pets`。多個 requirement 之間以「或」分隔；`security: []` → 灰底「不需驗證」（`Unlock`）
5. deprecated 說明列（`--neutral-100` 底、12.5px）：「這支 operation 已標記為 `deprecated`，新的串接請不要再使用。」
6. description Markdown；缺 → 空狀態，欄位路徑寫成 `paths["/pet"].post.description`
7. **參數**（h2 + 數量）：依 `in` 分組，順序 `Path 參數 / Query 參數 / Header / Cookie`（組標題 12px bold + 數量膠囊）。每組一張 `erx-colt` 表（`table-layout:fixed`），欄寬 `22% | 17% | 64px | auto | 18%`：
   - 名稱：mono 12.5/600；deprecated → 灰 + 刪除線 + 「已棄用」
   - 型別：type chip（可點的 `$ref` 改藍）+ format（mono 10.5 muted）
   - 必填：藍點 + 「必填」；否則淡色「選填」
   - 說明：Markdown inline；下方 enum chips、限制（`≥ 0`、`≤ 100`、`長度 0–500`、`1–50 項`、`pattern …`、`預設 "available"`）、style（`form, 逗號分隔`）
   - 範例：mono chip；陣列以逗號連接；無 → `—`
8. **Request Body**（h2，右側必填 / 選填）：description（13px muted）→ `content-type` + 分段切換（mono 11px）→ **並排**：左 欄位樹（`1.15fr`）｜右 範例 JSON（`1fr`，`position:sticky; top:12px`），gap 14。視窗 < 1180px 改上下排列
   - 範例框：標題列 36px（`Braces` + 「範例」或「範例（由 schema 產生）」，多個 examples 時下拉，複製按鈕）；JSON 區 max-height 360 可捲；XML / form 時框底註明「XML 依 schema 序列化，這裡以 JSON 呈現結構。」/「以表單欄位送出，這裡以 JSON 呈現結構。」；binary → 「二進位內容，沒有文字範例。」
9. **Responses**（h2 + 數量）：status 分頁列（gap 6、wrap），預設選第一個 2xx；下方回應框（radius 8、padding `12px 14px 14px`）：
   - 標頭：status chip + description；多個 content-type 時右側「N 種格式」+ 分段切換
   - `headers` 時：回應標頭小表（名稱 | 型別 | 說明）
   - 有 content：同 Request Body 的並排；無 → 「這個回應沒有 body。」
10. **範例請求**（h2）：程式碼框，標題列為 `cURL | fetch` 分段（選擇存 localStorage `oa-lang`），多個 server 時下拉選 server，複製。框底：「`<…>` 為佔位，換成實際值再執行。這是純靜態文件，不會替你送出請求。」程式碼 `white-space: pre-wrap; word-break: break-all`

### 6. Schema 頁
crumbs `components.schemas` → h1 `<code>Pet</code>` + `title`，右側 `複製 schema JSON`、`複製連結` → meta：type chip、`N 個欄位`、`N 個必填`、`被 N 支 operation 使用`、自我參照時 `↻ 自我參照` → description（缺 → 空狀態 `components.schemas.Pet.description`）→ **欄位**（並排：樹｜範例）→ **被哪些 operation 使用**（Operations 清單，第三欄寫位置：`Request body、回應 200`；之後子標題「間接使用（經由其他 schema）」，第三欄 `經由 <code>Pet</code>`；無 → 「沒有 operation 參照這個 schema。可能是預留或已不再使用。」）→ **參照關係**（`erx-rel` 兩欄：參照（本 → 其他）/ 被參照（其他 → 本），自我參照 / 互相參照加標）。

### 7. 欄位樹（`schema-tree.tsx`）
外框 radius 8、padding `6px 0`。embed 卡內使用 `flat`（無框）。
- **根列**：根是 `$ref` 或陣列時顯示 `型別 <Pet ↗>` / `陣列，每個元素為 <Pet ↗>`，右側 `N 個欄位`
- **欄位列**：min-height 28，gap `4px 6px` 可換行：`[caret 18×20] [名稱 mono 12.5/600] [型別 chip] [format] [● 必填] [nullable] [readOnly] [writeOnly] [已棄用] [來自 X]`
  - 型別 chip：`--neutral-100` 底、mono 11px、高 18、radius 3。`$ref` → `--blue-50` 底藍字 + `ArrowUpRight` 10px，點了到 Schema 頁（不展開）。陣列 `string[]` / `Pet[]`；`map<string, integer>`；`oneOf` / `anyOf` / `allOf` 藍底
  - 說明列：padding-left 24、12px：Markdown inline + enum chips（`--orange-50` 底 `--orange-700` 字，超過 8 個顯示 `+N`）+ 限制 chips（mono 10.5）
  - 子層：`margin-left:14px; padding-left:4px; border-left:1px var(--border-subtle)`
- **預設展開**：第 0 層的「內嵌 object」展開；`$ref` 欄位一律收合（避免無限展開，點 caret 才看）
- **超過 3 層**：最多內縮 3 層（depth 0/1/2）。depth 2 的欄位若還有子項，不顯示 caret，改為「深入 N 個欄位 / 選項」按鈕（20px 高、虛線 `--blue-300` 框、`--blue-50` 底、`CornerDownRight` 圖示）→ 以該欄位為新的根，頂端麵包屑 `[←] body › items[].options.gift`（mono 11.5，可點任一層回去）
- **循環 `$ref`**：每個節點帶祖先 ref 鏈；欄位的 ref 已在鏈上 → 不可展開，標 `↻ 循環參照 · 同上層 Category`（`--orange-50` 底 `--orange-700` 字），tooltip「Category 已在上層展開過，為避免無限展開停在這裡」
- **`oneOf` / `anyOf`**：`--blue-100` 框區塊（margin-left 24）：標頭 `--blue-50` 底：`⑂ oneOf 擇一，依 method 判斷`（anyOf → 「一個或多個」）+ 右側選項分段（`HomeDelivery · 宅配`，ref 名 + title）；框內為選中選項的欄位。`type: null` 選項 → 「值為 null」
- **`allOf`**：攤平合併所有子 schema 的 properties 與 required；頂端註明 `⑂ allOf 合併自 CustomerRef + 內嵌欄位`，每個欄位小字 `來自 CustomerRef`
- `additionalProperties` → 一列 `{key}`；無 properties 的 object → 「任意 object，spec 沒有列出欄位」
- nullable 判斷：`nullable: true`（3.0）或 `type` 陣列含 `"null"`（3.1）

### 8. embed 模式（筆記版心 760）
外框沿用工作台既有資料檔內嵌框：`margin: 22px 0 26px`、1px `--neutral-200`、radius 8、`--shadow-xs`。figcaption：padding `9px 16px`、`--neutral-50` 底、下框線 `--neutral-100`；左 橘膠囊「`FileJson` 資料檔 · API 文件」（`--orange-50` 底、`--orange-600` 字、11.5px bold）；中 mono 11.5 檔名（＋` · operationId` 藍字）；右「`ArrowUpRight` 在文件頁開啟」（11.5 bold `--blue-600`）→ 開 `/view/<路徑>#op/<id>`。筆記內文 15px，卡內 12–13px，加上框線與上下間距即為與前後段落的區隔。

**單一 operation 卡**（padding `16px 18px 6px`）：
1. `[method lg] path`（15px/700，可換行）
2. summary 13.5/600 + 已棄用 + 右側驗證 chip
3. 參數（上框線區塊，標題 12px bold + 數量）：合併成單一清單，grid `名稱 | in(mono 10.5) | 型別 | 必填 | 說明(單行省略)`
4. Request Body：`content-type`、「另有 N 種格式」+ 欄位樹 `flat`、maxDepth 1（頂層欄位，可深入）
5. 主要回應：第一個 2xx（無則第一個）：status + description + content-type + 欄位樹；下方「其他回應」status chips（20px）

**總覽縮影**（沒有 `operation`）：標題 15px + 版本膠囊 + OAS 版本 → meta（op / tag / schema 數 + method 分布）→ tag 清單（grid `名稱 | 說明 | 長條 90px | 數量`，34px 列，點 → 文件頁該 tag）。tag > 8 個時只列 op 數最多的 6 個，並加一句「另有 N 個 tag，共 M 支 operation，請在文件頁查看。」

**錯誤**：找不到 operationId → 卡內「找不到 `operationId: "xxx"`。檢查 `options.operation` 是否和 spec 一致。」

---

## Interactions & Behavior

### 深連結（hash）
| 目標 | hash |
|---|---|
| 總覽 | 無 hash |
| Tag | `#tag/orders` |
| Operation | `#op/createOrder` |
| 無 operationId | `#op/get/pet/{petId}`（method + 原始 path） |
| 指定回應 | `#op/createOrder/responses/409`（開頁直接選中該 status） |
| Schema | `#schema/Order`（欄位層級預留 `#schema/Order/items[].unitPrice`） |

- 路由變動 → `history.replaceState` 寫 hash（不堆疊歷史）；監聽 `hashchange`
- 載入時解析 hash；無效 hash 落回總覽
- 篩選條件**不進** hash
- 「複製連結」複製完整網址 `<origin>/view/<路徑><hash>`

### 鍵盤（page 模式）
- `/`：焦點不在 input / textarea / select 時，開啟導覽並聚焦篩選框（preventDefault）
- `Esc` 一層一層退：① 有文字 → 清文字（toast「已清除文字篩選」）② 有 method → 清 method（「已清除 method 篩選」）③ 焦點不在輸入框 → 收起所有欄位樹展開與「深入」狀態（「已收起所有展開項」）④ 焦點在輸入框且無可清 → blur
- toast：bar 內 24px 深色 pill（`--neutral-900` 底白字、`Check` 12px），1.4s 後消失

### 捲動同步
- 內容區捲動時，找最後一個 `top - 內容頂 ≤ 96px` 的區段（`data-sec`），捲到底時取最後一個，高亮導覽中對應錨點
- 點導覽錨點 → 捲到該區段（頂端留 12px）
- 換頁時內容捲回頂端

### 複製回饋
所有複製（path、連結、server URL、範例 JSON、schema JSON、cURL）：按鈕本身變為 `Check` +「已複製」、綠框 `--success-500` / 綠底 `--success-50` / 字 `#1f7350`，1.6s 後恢復；`aria-live="polite"`。不另跳 toast。Clipboard API 失敗時退回 `execCommand('copy')`。

### Hover / transition
- 列 hover：導覽 `rgba(27,79,156,.06)`；清單 / 表格 `--blue-50`
- caret 旋轉 90°：`var(--duration-fast)`（140ms）
- pill 按下 `scale(.97)`（同 ER）
- `prefers-reduced-motion` 時關閉動畫

---

## State Management
| state | 範圍 | 說明 |
|---|---|---|
| `route` | `{ kind: 'overview'｜'tag'｜'op'｜'schema', key?, sub? }` | 與 hash 雙向同步 |
| `q` | string | 導覽文字篩選 |
| `methods` | `Set<method>` | 導覽 method 篩選 |
| `openTags` | `Set<tag>` | 導覽收合狀態 |
| `navOpen` | boolean | 導覽開關 |
| `activeSec` | string｜null | 捲動同步的區段 |
| `collapseSig` | number | Esc 第三層遞增 → 所有欄位樹重設 |
| `tip` | `{ op, x, y }`｜null | 導覽 hover 卡 |
| 欄位樹內 | `opened` / `closed` Set（以欄位路徑字串為 key）、`focus` 堆疊（深入）、`variant`（oneOf 選項） | 換 schema 或 collapseSig 變動時重設 |
| Operation 頁 | `ct`（request content-type）、`code`（選中 status）、response `ct`、範例選擇 | 換 op 時重設 |
| localStorage | `oa-lang` | 範例語言 cURL / fetch |

推導結果（`derive`）以 spec 為 key memo；無任何 fetch。

---

## Design Tokens

### 新增（集中於樣式開頭，不要散落）
```css
--wb-oa-get-fg:var(--blue-600);      --wb-oa-get-bg:var(--blue-50);        /* #1f5aa6 / #eef4fb */
--wb-oa-post-fg:#1f7350;             --wb-oa-post-bg:var(--success-50);    /* = .wb-pill.ok 字色 / #e7f6ee */
--wb-oa-put-fg:#8a6412;              --wb-oa-put-bg:var(--warning-50);     /* = .wb-pill.warn 字色 / #fcf3da */
--wb-oa-patch-fg:oklch(.47 .08 195); --wb-oa-patch-bg:oklch(.96 .022 195); /* 唯一新色相：低彩度青綠 */
--wb-oa-delete-fg:#c0392f;           --wb-oa-delete-bg:var(--danger-50);   /* = .wb-pill.danger 字色 / #fbeaea */
--wb-oa-other-fg:var(--neutral-600); --wb-oa-other-bg:var(--neutral-100);  /* HEAD OPTIONS TRACE QUERY */
--wb-oa-param-fg:var(--orange-700);  --wb-oa-param-bg:var(--orange-50);    /* {param} 與 <佔位> */
--wb-oa-json-key:var(--blue-800); --wb-oa-json-str:#1f7350; --wb-oa-json-num:var(--orange-700); --wb-oa-json-lit:var(--neutral-500);
```
理由：POST / PUT / DELETE 字色沿用工作台 pill 已有的深色版，因為 `--success-500` 等在淡底上對比不足 4.5:1。DS 只有藍、橘、綠、黃、紅五組色相，PATCH 若用橘會和 PUT 的琥珀太近，所以加一個低彩度青綠，亮度與其他字色對齊。

### Method 標記
44×18px、radius 4、mono 10px/700、letter-spacing .02em。**唯讀方法**（get head options query trace）：白底 + `inset 0 0 0 1px` 字色 45%；**會改資料的方法**：填色底。文字永遠是 method 名（導覽中 DELETE 縮寫為 `DEL`，頁首完整寫出）。只看形狀 + 文字即可分辨。

### Status
22px pill、1px `--border-subtle`、mono 12px/700、字色：2xx `#1f7350`、3xx `--blue-600`、4xx `#8a6412`、5xx `#c0392f`、default `--neutral-600`。前置 7px 記號：2xx 實心圓、3xx 實心圓、4xx 菱形、5xx 方形、default 空心圓。選中：字色 9% 底 + 字色框。

### 既有 token（沿用）
- 字體：`--font-sans` = "Noto Sans TC", "Noto Sans", …；`--font-mono` = "SFMono-Regular", ui-monospace, Menlo, Consolas, monospace
- 文字：`--text-strong #161c28`、`--text-body #3a4456`、`--text-muted #6c798e`
- 面：`--surface-card #fff`、`--surface-page #f6f8fb`；框線 `--border-subtle #e1e6ee`、`--border-default #cbd3df`
- 品牌：`--blue-700 #1b4f9c`（h2、連結 code）、`--orange-400 #ed9b26`（選中左線）、`--orange-500 #e37b24`（eyebrow）
- 圓角（工作台縮一級）：`--radius-sm 3px`、`--radius-md 5px`、`--radius-lg 8px`、`--radius-pill 999px`
- 陰影：`--shadow-xs 0 1px 2px rgba(17,47,93,.06)`、`--shadow-lg 0 14px 34px rgba(17,47,93,.12)`
- 動態：`--duration-fast 140ms`、`--ease-out cubic-bezier(.16,1,.3,1)`
- 密度：介面基準 13px、列高 38（清單）/ 30（導覽）/ 28（欄位樹）

### 字級表
| 用途 | 規格 |
|---|---|
| Operation path h1 | mono 19/700，lh 1.4 |
| 頁 h1（總覽 / Tag / Schema） | 24/700，lh 1.3（同 ER） |
| summary | 15/600 |
| h2 | 16/700 `--blue-700`，下框線（同 ER） |
| 內文 Markdown | 14，lh 1.8 |
| 表格 / 欄位樹 | 12.5（名稱 mono 600）、說明 12 |
| meta / crumbs | 12 / 11.5 |
| chip / 標記 | 10–11 |

---

## 與 ER Diagram 共用
| 元件 | 做法 |
|---|---|
| 導覽容器、篩選框、命中數、區段標題、caret、選中態 | **一模一樣**（ER `.erx-nav*`）。OpenAPI 多一排 method chip |
| Wiki 頁首：eyebrow → h1 → meta → Markdown | **一模一樣** |
| 區段標題 h2 + 數量膠囊 | **一模一樣** |
| 參數表 | **一模一樣**（`erx-colt`），多「範例」欄 |
| 型別 chip | **一模一樣**；建議 ER 改用此 chip（ER 目前是純灰 mono 字） |
| 必填標示 | 同形：藍色實心點 + 「必填」 |
| 參照關係兩欄 | **一模一樣**（`erx-rel`） |
| 空狀態文案格式 | 同格式：缺什麼 + spec 欄位路徑 |
| Markdown parser | 共用（段落、粗體、行內 code、連結、清單、標題、引言） |
| method、status、欄位樹、程式碼區 | OpenAPI 專屬 |

---

## 資料狀態（請逐條實作並寫測試）
1. **極小**（≤ 4 支且無 tag）：省略導覽；總覽列出全部 op 與 schema；bar 顯示「← 總覽」。用 `example/health.openapi.json`
2. **極大**（`example/countsalary-platform.openapi.json`，20 tag、252 支）：tag > 6 預設只展開目前 tag；篩選顯示 `命中/總數`；選中項自動捲入可視區；總覽規模長條
3. **description 全缺**：每個空狀態都寫出 spec 欄位路徑（`info.description`、`paths["/x"].get.description`、`tags[name="x"].description`、`components.schemas.X.description`）。欄位 / 參數缺說明則不顯示或顯示 `—`
4. **deprecated**：operation（導覽淡化 + 刪除線 + 「棄用」，頁首灰標 + 說明列）；參數與欄位（名稱刪除線 + 「已棄用」，範例與 cURL 略過）
5. **循環 `$ref`**：`orders` 的 `Category.parent → Category`（自我）、`Member.unit → OrgUnit.manager → Member`（互相）。樹停止並標示，範例產生回 `{}`，Schema 頁標「自我參照 / 互相參照」
6. **`oneOf` / `anyOf` / `allOf`**：`Shipping`（oneOf + discriminator）、`CreateOrderInput.payment`（anyOf）、`customer` 與 `ValidationProblem`（allOf）
7. **同 status 多 content-type**：`createOrder` 400（json + problem+json）、`listOrders` 200（json + text/csv）
8. **長 path**：`/v1/organizations/{orgId}/members/{memberId}/roles`
9. **巢狀 > 3 層**：`createOrder` body `items[].options.gift.card.*`
10. **OAS 3.2**：`example/petstore.openapi.json`（使用者附件）→ bar 警示 + 總覽警示框，`query` method 用中性色。**2.0**：不渲染，錯誤卡「這份文件是 Swagger 2.0，plugin 只支援 OpenAPI 3.0 / 3.1。請先轉檔（例如 `swagger2openapi`）再放進筆記資料夾。」
11. **embed 找不到 operationId**：卡內錯誤，不 throw
12. 外部 `$ref`（非 `#/` 開頭）：不解析，型別 chip 顯示 ref 字串（v1 範圍外，請在 README 註明）

## 不做的事
- **試打 API**（首版不做，範例區只保留複製 cURL / fetch）：站台是 Netlify 純靜態，請求從讀者瀏覽器直接發出，大多數 API 不會對 `*.netlify.app` 開 CORS；要能打就得在公開頁面輸入 token；主要讀者要的是查參數，送請求用終端機更可靠。若日後要做：前提是 server 明確允許跨域，並以 plugin option `tryIt: true` 由作者開啟
- 深色模式、Swagger / Redoc、Markdown 函式庫、OAS 2.0 解析

## Assets
無圖片。圖示（prototype 名稱 → `lucide-react`）：
`search→Search`、`x→X`、`right→ChevronRight`、`copy→Copy`、`check→Check`、`link→Link`、`lock→Lock`、`unlock→LockOpen`、`home→House`、`braces→Braces`、`tag→Tag`、`alert→TriangleAlert`、`dive→CornerDownRight`、`cycle→Repeat`、`out→ArrowUpRight`、`back→ArrowLeft`、`panel→PanelLeft`、`info→Info`、`merge→GitMerge`、`file→FileJson`。

## Files
```
design_handoff_openapi_renderer/
├ README.md                                  ← 本文件
├ example/
│  ├ petstore.openapi.json                   使用者附件（OAS 3.2.0）
│  ├ orders.openapi.json                     3.1 邊界案例（請作為主要測試資料）
│  ├ health.openapi.json                     極小（Swagger 截圖那份）
│  └ countsalary-platform.openapi.json       極大（20 tag、252 支）
└ prototype/
   ├ OpenAPI Renderer Prototype.html         入口（工作台殼 + plugin）
   ├ OpenAPI Renderer Spec.html              設計提案說明
   ├ oa/oa-core.jsx                          推導、$ref、範例、cURL、原子元件
   ├ oa/oa-tree.jsx                          欄位樹
   ├ oa/oa-pages.jsx                         導覽與四種頁面
   ├ oa/oa-app.jsx                           外殼、embed、demo
   ├ oa/oa-data.jsx                          四份範例資料（JS 形式）
   ├ oa/oa.css                               OpenAPI 專屬樣式與 --wb-oa-* token
   ├ er/er.css, er/er-core.jsx               共用骨架與 Markdown parser（ER plugin）
   ├ wb/pt.css, wb/pt-shell.jsx, …           工作台殼（僅 demo 用，非本次範圍）
   └ app/*, tweaks-panel.jsx, _ds/           demo 依賴與 TrendLink DS token
```
