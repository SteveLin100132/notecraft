# Task 53 — MDX 內嵌 `<PluginView />` 與外框標示

> 對應 [notecraft-plugin-system.md](../notecraft-plugin-system.md) §7.3-B、Q22（實作階段 P8）；
> 設計交付 [design_handoff_plugin_system](../prototype/design_handoff_plugin_system/) §5。
> 依賴 [Task 47](task-47-plugin-build-resolution.md)、[Task 48](task-48-data-file-view-route.md)（共用錯誤卡）。

## 為什麼要有這一步

同一份資料除了獨立頁，也該能長在筆記內文裡 —— ER 圖原本就是那樣用的。
差別在於獨立頁是全寬、內嵌是 760px 版心，後者**需要**放大檢視。

## 範圍

### 1. `<PluginView src="planning/schema.json" />`

app 提供的 `.astro` 元件：解析 `src` → 找到對應 plugin 與資料 → 以 `mode="embed"` 渲染。
`src` 基準與 `plugins.json` 的 `files` 一致（notesDir）。

找不到對應資料檔或該檔未被任何 plugin 認領 → **build fail**（與規格 §7.7 一致）。

### 2. 沿用 `GeneratedFrame`，只換標示

外框結構、間距、圓角、陰影、放大檢視**全部不動**（同一個 `figure`）。改三處：

| 位置 | 原本（AI 生成元件） | 資料檔 |
| --- | --- | --- |
| 膠囊 | `--blue-50` / `--blue-700` + `sparkle` +「視覺化 · <type>」 | `--orange-50` / `--orange-600` + `Database` +「資料檔 · <plugin 顯示名>」 |
| 右側 mono | `generated/<id>.tsx` | 真實資料檔路徑 |
| dev-only 按鈕 | 「複製提示詞」 | 「以 VS Code 編輯」+ 新增一顆「開啟完整檢視頁」連到 `/view/<path>` |

「重新生成」對資料檔不成立（它不是 AI 生成的），所以那顆按鈕必須換掉而非沿用。

### 3. 放大檢視保留

內嵌在 760px 版心裡的 ER 圖**仍然需要**放大檢視（Q22：只有內嵌包 `GeneratedFrame`）。
`VizZoom` 的標題列需支援自訂 mono 標籤與 icon（目前寫死 `generated/<id>.tsx` 的形狀）。

> ⚠ `data-nc-viz-body` 那層是放大檢視的搬移目標，**不可拿掉**（CLAUDE.md 既有規則）。

### 4. 錯誤狀態

共用 Task 48 的 `PluginErrorCard`，以 error boundary 只替換 figure 內容，筆記其他部分照常。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 內嵌可渲染 | 筆記內寫 `<PluginView src="..." />` | 開該筆記 | 外框卡片內出現圖，標示為橘色「資料檔」 |
| 放大檢視可用 | 同上 | 點放大 | 全螢幕畫布正常，標題列顯示資料檔路徑而非 `.tsx` |
| 連到完整頁 | dev 模式 | 點「開啟完整檢視頁」 | 導向 `/view/<path>` |
| 來源不存在擋 build | `src` 指向不存在的檔 | build | 非零退出，訊息指出該筆記與 `src` |
| AI 元件零回歸 | 既有 `@ai-visualize` 生成元件 | 開筆記 | 外框與放大檢視行為完全不變 |

## 依賴

Task 47、48。

## 風險

中。`GeneratedFrame` 與 `VizZoom` 是既有全站元件，**所有既有筆記的生成元件都吃它們**。
改成支援兩種標示時，預設值必須維持現行行為，否則會是全站回歸。

## 實作記錄（2026-09-18）

`src/components/PluginView.astro`；`GeneratedFrame` 加 `dataFile` prop、`VizZoom` 加
`codeLabel` 與 `icon`。兩者的預設行為與既有 AI 生成元件**完全相同**（全站回歸的風險點）。

- 膠囊改橘色 `Database` +「資料檔 · <plugin title>」、mono 改真實資料檔路徑、
  新增「開啟完整檢視頁」、dev 模式再加「以 VS Code 編輯」
- 「複製提示詞」在資料檔模式不渲染 —— 重新生成對資料檔不成立
- **pagefind**：`PluginView` 外層包 `data-pagefind-ignore`。它長在 `.nc-prose`
  （筆記的 pagefind body）裡面，不排除的話整張圖的文字會灌進該篇筆記的索引 ——
  實測一篇 38 字的筆記會變成 6648 字，把真正的內文淹掉
- MDX 端以 `import PluginView from '@/components/PluginView.astro'` 取用，端對端已驗證
