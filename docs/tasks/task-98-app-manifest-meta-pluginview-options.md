# Task 98 — App 端：manifest `meta` pointer、`<PluginView>` 的 `options`／`anchor`

> 規格 [notecraft-openapi-renderer.md](../notecraft-openapi-renderer.md) §11；Q1、Q3 定案（§16）。
> 相關：[notecraft-plugin-system.md](../notecraft-plugin-system.md) §6.1（manifest）、§7.3（渲染出口）；[Task 85](task-85-app-meta-description-markdown.md)（`readMeta` 的 Markdown 處理）。
> 無前置依賴，**本批第一個做**；Task 99 的 manifest 與 Task 103 的 embed 靠它。**這是本批唯一動到 app 的 Task**，跨所有 plugin 生效。

## 為什麼是 app 的事

1. **標題**：`src/lib/plugins.ts` 的 `readMeta` 只讀 `data.meta.*`。OpenAPI 沒有 `meta`，資料檔頁的頁首、`<title>`、⌘K、Dashboard Drawer、pagefind 都會變成檔名 `orders.openapi.json`。OAS 頂層只允許 `x-` 擴充欄位，不能叫作者加 `meta`
2. **內嵌**：`<PluginView>` 只有 `src`、`caption`。renderer 的 options 只來自 `plugins.json` 的規則，同一份 spec 在不同筆記無法各自指定 operation；`GeneratedFrame` 的「開啟完整檢視頁」連結也不能帶 hash

## 範圍

### 1. manifest 新欄位 `meta`

```jsonc
"meta": {
  "title": "/info/title",              // JSON Pointer（RFC 6901），指向資料檔內的字串
  "description": "/info/description",
  "backTo": "/x-notecraft-back-to"
}
```

- `src/lib/plugin-types.ts`：`PluginManifest` 加 `meta?: { title?: string; description?: string; backTo?: string }`，註解說明「資料格式不是自己定的 plugin（OpenAPI 等）用來告訴 app 去哪裡取標題」。檔頭「刻意沒有的兩個欄位」那段不動
- `plugins/notecraft-plugin.schema.json`：`properties` 加 `meta`（三個鍵皆 `type: string`、`pattern: "^(/|$)"`，自身 `additionalProperties: false`）。頂層 `additionalProperties: false`，不加就裝不起來
- `PLUGIN_TYPES_DTS` **不動**（它只描述 renderer props，不含 manifest）

### 2. `src/lib/plugins.ts`

- 新增 `resolvePointer(data, pointer): unknown`：`""` 回整份；逐段 split `/`，`~1`→`/`、`~0`→`~`；陣列以數字索引；中途不存在回 `undefined`
- `readMeta(data, fallbackTitle, relPath, metaMap?)`：有 `metaMap` 時三個值改以 pointer 取，**沒宣告的鍵**仍退回 `data.meta.<鍵>`；之後的流程（title 空字串退回檔名、`stripMarkdownFirst`／`All`、`backTo` 的 `SITE_PATH_RE` 驗證與 warn 文案）完全共用
  - warn 文案中的欄位名改成實際來源（`x-notecraft-back-to` 而非 `meta.backTo`）
- 呼叫端（約 `:401`）傳入 `getPlugins().get(pluginId)?.manifest.meta`
- 取到非字串（例如 `info.description` 是 object）→ 當作沒有，不 throw

### 3. `<PluginView>` 的 `options` 與 `anchor`

`src/components/PluginView.astro`：

```ts
export interface Props {
  src: string;
  caption?: string;
  /** 淺合併在 plugins.json 規則的 options 之上，只影響這一處內嵌 */
  options?: Record<string, unknown>;
  /** 附加在「開啟完整檢視頁」連結後的 hash（不含 #）。app 不解讀內容 */
  anchor?: string;
}
```

- 傳給 `PluginHost` 的 `options={{ ...file.options, ...(options ?? {}) }}`
- `anchor` 經 `GeneratedFrame` 的 `dataFile` 多帶一個 `anchor?: string`，`GeneratedFrame.astro:56` 的 href 改為 `` `/view/${routePath}${anchor ? "#" + anchor : ""}` ``。`anchor` 開頭若帶 `#` 先去掉
- 同一份檔在同一篇筆記內嵌兩次：確認 `GeneratedFrame` 以 `id={file.routePath}` 產生的 DOM id 是否重複；若重複且影響 `VizZoom`，把 `options.operation`／`anchor` 併進 id（實測後在實作記錄寫結論）

### 4. 版本

- `package.json` `version` → **1.6.0**：`check-plugins` 以 `inspectFiles` 檢查 `engines`，Task 99 的 `openapi-renderer` 宣告 `>=1.6.0`，app 版本不先升就過不了。CHANGELOG 與發佈留到 Task 104

### 5. 文件

- `docs/notecraft-plugin-system.md` §6.1：manifest 範例下補 `meta` 的說明與 OpenAPI 例子；§7.3 補 `<PluginView>` 的 `options`／`anchor`
- `plugins/er-diagram-renderer` 不動（沒宣告 `meta` → 行為與現在相同）

### 6. 斷言

`scripts/checks/app-plugin-meta.mjs`（新增）：`resolvePointer` 與 meta 取值抽成可單獨載入的純函式（例如放在 `src/lib/plugin-meta.ts`，只 `import type`，`plugins.ts` 再 import 它）。斷言：

- `""`、`/info/title`、`/a~1b`、`/a~0b`、`/arr/0`、不存在的路徑
- 無 `metaMap` → 讀 `data.meta.*`（ER 回歸）
- 有 `metaMap` 只宣告 title → description 仍讀 `data.meta.description`
- 取到非字串 → 退回檔名／空字串

並加進 `package.json` 的 `check:er`（或另開 `check:plugins-app`，二擇一，實作時決定並寫進實作記錄）。

## 不做

- `routeSuffix`（Q2 定案維持 `/view/api/orders.openapi`）
- build 期依 options 瘦身內嵌資料（Q4）
- 讓 `GeneratedFrame` 的膠囊顯示 operationId（Q3 定案：operationId 由 plugin 在卡片內顯示）

## 驗收

- [ ] ER 的兩份 example：頁首標題、描述、`backTo` 與改動前完全相同（`/view/...` 截圖比對或 DOM 對字串）
- [ ] 暫時在本機加一份帶 `meta` 宣告的假 plugin（或等 Task 99 完成後回頭驗），`/view` 頁首、`<title>`、⌘K、Drawer 都顯示 `info.title`；pagefind 能用 `info.description` 的字搜到
- [ ] `<PluginView src="…" options={{ operation: "x" }} anchor="op/x" />`：renderer 收到合併後的 options；「開啟完整檢視頁」連到 `/view/…#op/x`；不帶這兩個 prop 的既有內嵌不變
- [ ] `plugins/notecraft-plugin.schema.json` 接受帶 `meta` 的 manifest、拒絕 `meta.foo`
- [ ] 新斷言通過；`npm run check-plugins` 通過
- [ ] `npx tsc --noEmit && npx astro build` 通過，tsc 錯誤數不增加

## 實作記錄（2026-10-01）

- 取值抽成 `src/lib/plugin-meta.ts`（`resolvePointer`、`pickMeta`，只 `import type`），`plugins.ts` 的 `readMeta` 改呼叫它；原本 `plugins.ts` 內的 `isPlainObject` 因此不再使用，已移除
- `pickMeta` 另回傳 `raw` 與 `source`：backTo 的 warn 文案顯示實際來源（`x-notecraft-back-to` 或 `meta.backTo`）
- `scripts/checks/app-plugin-meta.mjs` 串進 `check:er`（不另開 script）
- **DOM id**：`GeneratedFrame` 的 `id` 只傳給 `VizZoom` 當 PNG 檔名（`VizZoom.tsx:178`），不產生 DOM id——同一份檔內嵌兩次不會撞，不需要把 operation 併進 id
- `package.json`／`package-lock.json` 升 1.6.0（比照 1.5.1 的發版 commit 一起改 lockfile 的兩處版號）
- ER 回歸：`dist/view/testing/er-v12.er/index.html` 的 `<title>` 與改動前相同；tsc 錯誤數 52 → 51（未新增）
- 本機 shell 預設 Node 16，`scripts/checks` 需要 22.6+：一律以 `~/.nvm/versions/node/v22.16.0/bin` 執行（專案 `.nvmrc` 為 22）
- 帶 `meta` 的 manifest、`<PluginView options anchor>` 的實際效果在 Task 99／103 以 `openapi-renderer` 驗證
