# Task 99 — Plugin 骨架：manifest、dataSchema、推導、範例產生、斷言

> 規格 [notecraft-openapi-renderer.md](../notecraft-openapi-renderer.md) §4.1、§4.3、§4.4、§5、§12.1；Q1、Q5、Q6、Q9 定案（§16）。
> 設計交付 [design_handoff_openapi_renderer](../prototype/design_handoff_openapi_renderer/) README〈資料推導〉〈範例產生〉〈cURL / fetch〉；對照 `prototype/oa/oa-core.jsx` 的 `oaDerive`／`oaPtr`／`oaDeref`／`oaExample*`／`oaCurl`／`oaFetch`。
> 依賴 [Task 98](task-98-app-manifest-meta-pluginview-options.md)（manifest `meta`、app 1.6.0）。Task 100–103 都建立在這裡的純函式上。

## 為什麼先做這一步

畫面上每個數字（tag 數、命中數、被使用數）與每段程式碼（範例 JSON、cURL）都來自推導。先把推導寫成純函式並以斷言鎖住，之後的 UI Task 只負責呈現；邊界案例（循環 `$ref`、多 tag、`security: []`）一次在這裡處理完。

## 範圍

### 1. 套件檔

`plugins/openapi-renderer/`：

- `notecraft-plugin.json`：`id: "openapi-renderer"`、`title: "API 文件"`（`GeneratedFrame` 膠囊會顯示「資料檔 · API 文件」，§8.5）、`version: "1.0.0"`、`dataSchema: "schema.json"`、`example: "example/petstore.openapi.json"`、`meta: { title: "/info/title", description: "/info/description", backTo: "/x-notecraft-back-to" }`、`engines: { notecraftapp: ">=1.6.0" }`
- `schema.json`：照規格 §5.1（`oneOf` 要求 `openapi` 或 `swagger`；`openapi` pattern `^3\.`；不設 `additionalProperties`）
- `renderer.tsx`：本 Task 先放最小可 build 的版本——`swagger` → 轉檔指引卡（handoff〈資料狀態〉10 文案），其餘顯示 `info.title` 與 op 數；SSR 時 2.0 `console.warn` 一次
- `example/`：從 handoff 複製 `petstore.openapi.json`、`orders.openapi.json`、`health.openapi.json`（**沒有** countsalary，Q9）
- `README.md`：用途、`plugins.json` 範例（`"files": ["**/*.openapi.json"]`）、`<PluginView src options anchor>` 範例（prop 是 `src`，不是 handoff 的 `file`）、路由規則（`/view/api/orders.openapi`，Q2）、支援版本、外部 `$ref` 不解析、大 spec 內嵌會重複 inline（Q4）、Petstore 出處（Swagger 官方範例，Apache-2.0）
- `plugins/registry.json`：新增一筆，`files` 列出本 Task 結束時實際存在的所有檔（之後每個 Task 新增檔案都要回來補，`check-plugins` 會擋漂移）

### 2. `types.ts`

OpenAPI 子集型別（`OpenApiDoc`、`Operation`、`Parameter`、`RequestBody`、`Response`、`MediaType`、`Schema`、`SecurityScheme`、`Server`、`Tag`）與推導結果型別（`Derived`、`OpEntry`、`TagEntry`、`UsageEntry`）、`OarOptions`。3.0 與 3.1 的差異（`nullable`／`type` 陣列、`example`／`examples`）都要容得下；未知欄位 `unknown`，**不用 `any`**。

### 3. `derive.ts`（只 `import type`、無 JSX）

照 handoff〈資料推導〉1–5 與規格 §5.3 的補充：

- `ptr(doc, ref)`：JSON Pointer（`~1`／`~0`）；只解 `#/`；`deref(doc, x, max = 10)`
- `derive(doc): Derived`：ops（method 順序、path／op 參數合併、`$ref` 參數／body／response 先解開、security 繼承含 `[]`、op key、**重複 operationId 改用 `method/path` 並記入 `warnings`**）、tags（宣告順序 → 未宣告 → `__none`；多 tag）、`deps`、`refBy`、usage（直接位置字串／間接「經由」，BFS + visited）、`version: { raw, supported, kind: '3.0'|'3.1'|'3.x'|'swagger' }`、`tiny`（≤ 4 op 且無 tag）
- 長 path 截斷（規格 §8.2）與 tag 內共同前綴也在這裡算好，導覽只負責顯示
- `warnings: string[]`：renderer 在 dev `console.warn`，不 throw

### 4. `examples.ts`（只 `import type`、無 JSX）

- `exampleFromSchema(doc, schema, { mode: 'request'|'response' })`：照 handoff 優先序與 format 固定值；**固定值寫死**（`2026-10-01T09:00:00Z` 等），不取今天（hydration）；深度 8；鏈上 ref 回 `{}`
- `mediaExample(doc, media)`：`examples` 第一個 > `example` > 由 schema 產生，回傳 `{ value, generated: boolean, names: string[] }`
- `curl(doc, op, { server })`、`fetchSnippet(...)`：照 handoff〈cURL / fetch〉；單引號跳脫 `'\''`；回傳字串與佔位的 range（給 UI 上色）

### 5. `markdown-text.ts`（只 `import type`、無 JSX）

自 `plugins/er-diagram-renderer/markdown-text.ts` 複製 `parseInline`、`parseMarkdown`、`safeHref` 與其型別；**不複製** `resolveCodeLink`、`stripMarkdown`（ER 專用）。檔頭註明「與 ER 各自一份，行為以 `scripts/checks/oar-markdown.mjs` 對照」（Q6）。

### 6. 斷言（`scripts/checks/`）

- `oar-derive.mjs`：規格 §12.1 的全部項目；**極大 spec 以程式產生**（20 tag、250+ op，比照 prototype `oa-data.jsx` 的 `makeLarge()`，產生器放在 check 檔內），斷言 tag 數、op 數、usage 結果，並設推導耗時上限（例如 200ms，實測後定）
- `oar-examples.mjs`：規格 §12.1
- `oar-markdown.mjs`：載入 ER 與 OA 的 `markdown-text.ts`，對 `er-markdown.mjs` 的同一組輸入斷言 `parseMarkdown` 輸出相同
- `package.json` 新增 `"check:oar"`，串這三支（Task 100 再加 `oar-styles.mjs`）

## 不做

- 任何畫面（Task 100–103）；`styles.ts`（Task 100）

## 驗收

- [ ] `npm run check:oar` 通過，涵蓋 orders 的循環 `$ref`（`Category.parent`、`Member ↔ OrgUnit`）、`Shipping` oneOf、`payment` anyOf、`customer` allOf、`createOrder` 400 雙 content-type、`listOrders` 200 json + csv
- [ ] `npm run check-plugins` 通過：三份 example 通過 dataSchema、一起 build 成功；registry 無漂移
- [ ] 本機放一份 `swagger: "2.0"` 的檔：build 成功、頁面顯示轉檔指引卡、build log 有一行 warn
- [ ] `derive.ts`／`examples.ts`／`markdown-text.ts` 內 `grep -n "^import [^t]"` 0 筆（只有 `import type`）
- [ ] `npx tsc --noEmit && npx astro build` 通過，tsc 錯誤數不增加

## 實作記錄（2026-10-01）

- `example/petstore.openapi.json` 改用作者提供的官方完整版（含 `externalDocs`，handoff 那份被刪減過）
- `examples.ts` 以 `./derive.ts`（帶副檔名）import 純函式：Node strip-types 需要副檔名，tsconfig 已開 `allowImportingTsExtensions`、Vite 也吃
- 極大 spec 產生器放在 `scripts/fixtures/oar-large-spec.mjs`（**不放** `scripts/checks/`：`check-plugins` 會執行那裡的每一支 `.mjs`）；同一支兼 CLI，寫出本機手動驗證用的檔
  - 280 支 operation、20 個 tag；`derive` 實測遠低於 300ms 上限
- tag 共同前綴依 handoff 規則「每支 path 在前綴之後都還有東西」：orders 的前綴是 `/v1/organizations/{orgId}`（不是 `…/orders`，因為 `…/orders` 本身就是其中一支 path）
- `deref` 保留 3.1 的 `$ref` 兄弟 `description`（規格 §5.3）
- 測試資料：`src/content/notes/testing/openapi/` 放三份範例 + 一份 Swagger 2.0；`.notecraft/plugins.json` 加 `**/*.openapi.json` 規則。極大 spec 寫到 `src/content/notes/private/`（gitignored）
- 驗收結果：`check:oar`、`check-plugins`（3 份 example 一起 build）通過；`/view/testing/openapi/*` 的 `<title>` 都是 `info.title`（Task 98 的 pointer 實測）；Swagger 2.0 build 成功且 build log 有一行 warn；`/wb-index.json` 的 description 已去除 Markdown；tsc 無新增錯誤
