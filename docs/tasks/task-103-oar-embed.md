# Task 103 — embed：單一 operation 卡、總覽縮影、錯誤

> 規格 [notecraft-openapi-renderer.md](../notecraft-openapi-renderer.md) §4.3、§6.2（embed 不碰 hash）、§8.5、§10；Q3、Q4、Q8 定案（§16）。
> 設計交付 README〈8. embed 模式〉；對照 `prototype/oa/oa-app.jsx` 的 `OaEmbed`／`OaOpCard`／`OaMiniOverview`。
> 依賴 [Task 98](task-98-app-manifest-meta-pluginview-options.md)（`<PluginView options anchor>`）與 [Task 100](task-100-oar-atoms-schema-tree-styles.md)；與 Task 101／102 無依賴，可並行。

## 為什麼這一步要單獨做

embed 的外框不是 plugin 畫的：`<PluginView>` 一律包 `GeneratedFrame`，handoff 的 figcaption 要拆成「app 既有的部分」與「plugin 卡片內的部分」（規格 §8.5 表）。這件事與 page 模式完全無關，單獨驗。

## 範圍

### 1. `embed.tsx`

- **不畫 figcaption 與外框**（`GeneratedFrame` 提供）；卡片 padding `16px 18px 6px`
- `OpCard`（`options.operation` 有給且找得到）：`[Method lg] path`（可換行）→ summary + 已棄用 + 驗證 chip → **meta 列顯示 `operationId`**（取代 handoff figcaption 的 `· operationId`）→ 參數合併清單（`名稱 | in | 型別 | 必填 | 說明單行省略`）→ Request Body（`SchemaTree flat maxDepth={1}`、「另有 N 種格式」）→ 主要回應（第一個 2xx）+「其他回應」status chips
- `MiniOverview`（沒給 `operation`）：標題 + 版本 + OAS 版本 → meta → tag 清單（> 8 個 tag 只列前 6 + 一句說明）；tag 列連結 `/view/<routePath>#tag/<name>`，`routePath` 由 `file.path` 去掉 `.json` 推得（Q2：`api/orders.openapi.json` → `/view/api/orders.openapi`）
- 找不到 operation：卡內錯誤（handoff 文案），不 throw
- Swagger 2.0：同 page 的轉檔指引卡
- 高度隨內容（Q8），不設固定高、不自己捲
- 不掛 `keydown`、不讀寫 hash（規格 §6.2、§10）

### 2. 測試筆記

`src/content/notes/testing/資料檔內嵌測試.mdx` 已有 ER 的內嵌；另加一段（或新開一篇測試筆記，二擇一）放：

```mdx
<PluginView src="<orders 的路徑>" options={{ operation: "createOrder" }} anchor="op/createOrder" />
<PluginView src="<orders 的路徑>" options={{ operation: "listOrders" }} anchor="op/listOrders" />
<PluginView src="<petstore 的路徑>" />
<PluginView src="<orders 的路徑>" options={{ operation: "nope" }} />
```

測試用的 spec 放在筆記資料夾內、`.notecraft/plugins.json` 加對應規則（主專案現有的 plugins.json 怎麼放 ER 測試資料就照做）。

### 3. README

補 embed 用法、`anchor` 要自己寫（app 不會從 `options.operation` 推導）、大 spec 少量內嵌（Q4）。

## 不做

- 由 `options.operation` 自動推導 `anchor`（app 不解讀 plugin options，Q3）
- 內嵌資料瘦身（Q4）

## 驗收

- [ ] 測試筆記四種內嵌：單卡兩張、縮影、找不到；外框只有一層（`GeneratedFrame`），膠囊為「資料檔 · API 文件」
- [ ] 「開啟完整檢視頁」連到 `/view/…orders.openapi#op/createOrder`，到達後直接是該 op
- [ ] 縮影的 tag 列連到 `#tag/<name>`
- [ ] 放大檢視（`VizZoom`）中卡片正常、container 變寬後版面展開；關閉後回原位
- [ ] 同頁多張卡：按 Esc、點 hash 錨點（筆記 TOC）互不干擾；網址 hash 不被 plugin 改寫
- [ ] 筆記的 pagefind 索引不含卡片文字（`PluginView` 外層 `data-pagefind-ignore` 照舊）
- [ ] dev console 零 hydration warning；`npx tsc --noEmit && npx astro build` 通過，tsc 錯誤數不增加

## 實作記錄（2026-10-01）

- 測試筆記另開一篇 `src/content/notes/testing/openapi-內嵌測試.mdx`（不混進 ER 那篇）；`.notecraft/plugins.json` 已在 Task 99 加 `**/*.openapi.json` 規則
- `GeneratedFrame` 的資料檔膠囊加 `white-space: nowrap; flex: none`：「資料檔 · API 文件」在版心內原本斷成三行
- 實測：四種內嵌（兩張卡、縮影、找不到）外框各只有一層；開啟連結分別帶 `#op/createOrder`、`#op/listOrders`；放大檢視中卡片寬 1296、Esc 關閉後回原位；零 hydration 警告
