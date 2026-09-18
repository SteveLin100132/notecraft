# Task 48 — `/view/<path>` 資料檔檢視頁（滿版版型 + sticky 頁首 + 錯誤卡）

> 對應 [notecraft-plugin-system.md](../notecraft-plugin-system.md) §7.3-A、§7.7；
> 設計交付 [design_handoff_plugin_system](../prototype/design_handoff_plugin_system/) §1、§6。
> 依賴 [Task 47](task-47-plugin-build-resolution.md)。

## 為什麼要有這一步

這頁是整個功能存在的理由。ER 圖是五欄橫向佈局，760px 的筆記版心會把它擠爛，
連 1120px 都塞不下 —— 所以這條路由必須有自己的版心規則。

## 範圍

### 1. 路由

`src/pages/view/[...path].astro`，`getStaticPaths()` 取自 Task 47 的解析結果。

### 2. 滿版版型（設計交付的定案）

沿用 `BaseLayout`（側邊欄不變），但**這條路由的內容區不套 `.nc-page-wrap`、不套 `34px 40px 80px` padding**。
渲染器從側邊欄邊緣一路鋪到視窗右緣。

### 3. sticky 頁首列

`position:sticky; top:0; z-index:5`、`--surface-card` 底、`border-bottom:1px --neutral-200`、
`padding:13px clamp(16px,2.5vw,34px) 14px`。兩列：

| 列 | 內容 |
| --- | --- |
| 第一列（flex, gap 16） | 返回鈕（`ChevronLeft` +「資料檔」）→ 1px 垂直分隔 → 34×34 icon 方塊（`--orange-50` 底 / `--orange-600` 色 / radius 5px / `Database` 18）→ 標題（`--text-md`/700）+ `DATA FILE`（11.5px/700/`.05em`/`--orange-600`），標題下方單行截斷描述（13px/`--text-muted`）→ 右端 `meta.backTo` 的「回到來源筆記」與 dev-only「以 VS Code 編輯」 |
| 第二列（`padding-left:66px`、gap 18） | mono 原始檔路徑 + `FileJson`、plugin 膠囊（`--blue-50`/`--blue-700`、mono、`Plug`）、`Clock` + 相對時間 · 絕對日期；dev 模式右端 mono 顯示路由 |

標題與描述取自 JSON `meta`，缺值退回檔名。

### 4. 渲染區

`min-height: calc(100vh - 118px)`、`--surface-page` 底、`padding:18px clamp(12px,3vw,40px) 48px`。
渲染器輸出直接放進去：**不要外框卡片、不要 `GeneratedFrame`、不要 max-width**（Q22 定案）。
ER 渲染器自帶工具列、橫向捲動與「展開全寬」，外層再包一次是重複功能。

> ⚠ 屬於系列時 `min-height` 要收掉，否則圖與頁尾導覽之間出現一整屏空白 —— 見 [Task 52](task-52-series-entry-integration.md)。

### 5. 渲染錯誤卡（`PluginErrorCard`）

React error boundary 只替換該區塊，頁面其他部分照常。此元件**同時被 MDX 內嵌使用**（Task 53），
獨立成檔。

- `1px --danger-300` 邊 / `--radius-lg` / 白底
- 38×38 `--danger-50` 底 `--danger-500` 色的 `AlertTriangle`
- 標題「這份資料沒有畫出來」
- 正文明說筆記與資料檔都沒有壞、壞的是渲染程式
- 下方 `--surface-sunken` 區以 label/value 列出 plugin id、資料檔路徑、錯誤訊息（mono、訊息用 `--danger-500`）
- dev 模式加「以 VS Code 開啟渲染器」「重新載入此區塊」兩顆

**build 期錯誤（plugin 未裝、JSON 壞、schema 不符）不做網頁畫面** —— 那些一律 build fail（規格 §7.7）。

### 5.5 渲染器要透過 `PluginHost` 掛載（Task 51 已建好）

**不要**從 `getPlugins()` 取出元件直接掛 `client:load` —— build 會以 `NoMatchingImport` 失敗。
Astro 的 hydration 指令要在編譯期就知道元件來自哪個模組，從 Map 取出的元件它無從產生 client 進入點。

改用 `src/components/islands/PluginHost.tsx`（Task 51 已建立，形狀比照既有的 `PresentApp`）：

```astro
<PluginHost client:load pluginId={f.pluginId} data={f.data} file={...} options={f.options} mode="page" />
```

渲染器的 glob 在島裡、`src/lib/plugins.ts` 只做 build 期解析（它用 `node:fs`，不能進 client）。

### 6. 資料注入

build 期 inline 成 island props（Q10）。單檔超過 **256 KB** 時 build 期印警告，不擋 build。

## 硬約束

只用既有 token、icon 一律 lucide-react、繁體中文、桌機單一寬度、
動畫 200–400ms `--ease-out` 並尊重 `prefers-reduced-motion`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 寬元件不被擠壓 | 五欄 ER 圖 | 開 `/view/planning/schema` | 圖從側邊欄邊緣鋪到視窗右緣，無 1120 置中留白 |
| 頁首常駐 | 長圖 | 向下捲 | 頁首列留在頂端，仍看得到檔名與 plugin |
| meta 缺值 | JSON 無 `meta` | 開該頁 | 標題退回檔名，頁面不破版 |
| dev-only 隱藏 | 正式 build | 檢視 HTML | 「以 VS Code 編輯」與路由標示完全不輸出 |
| 錯誤不擴散 | renderer throw | 開該頁 | 只有渲染區變成錯誤卡，側邊欄與頁首正常 |
| 超大資料警告 | 資料檔 300 KB | build | 印警告但 build 成功 |

## 依賴

Task 47。

## 風險

中。滿版版型是**第一條不套 `.nc-page-wrap` 的路由**，要確認 `BaseLayout` 的既有 padding
不是寫死在 layout 而是在 page 層 —— 若寫死，本 Task 需要先把它參數化，範圍會擴大。

## 實作記錄（2026-09-18）

`src/pages/view/[...path].astro`、`src/components/islands/PluginErrorCard.tsx`，
並在 `BaseLayout` 加 `bleed` prop（這是第一條需要跳脫 1120 版心的路由）。

- sticky 頁首兩列照設計交付實作；`meta.backTo` 有值才出現「回到來源筆記」
- 渲染區不包外框卡片、不包放大檢視（Q22）
- 錯誤卡片獨立成檔，`PluginHost` 用 class error boundary 包住渲染器 ——
  React 沒有對應的 hook，且邊界只包渲染器本身，一個 plugin 炸掉不影響頁面其他區塊
- 「重新載入此區塊」靠改 `key` 強制重建子樹
- **pagefind**：頁首標 `data-pagefind-body`。專案已在筆記頁用了這個屬性，pagefind 因此處於
  「只索引標記過的區塊」模式 —— 不標的話這頁根本不會進索引。實測 191 字（標題 + 描述 + 系列），
  渲染出來的欄位名全部排除
