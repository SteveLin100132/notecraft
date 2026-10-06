# Task 123 — `/plugins` 空狀態：Header、Sidebar、Toolbar、兩個頁籤、提示區塊、Drawer

> 規格 [notecraft-workbench-plugin-empty-states.md](../notecraft-workbench-plugin-empty-states.md) §4–§10；Q3、Q6 定案（§14）。
> 像素級規格：[design_handoff_plugin_empty_states/README.md](../prototype/design_handoff_plugin_empty_states/README.md)（與規格文件衝突時以規格文件為準：§3.2、§7.4、§8.1 是刻意偏離）。
> 前置：Task 121、122。

## 為什麼要有這一步

Task 121 之後「0 個外掛」才真的會出現，而現行畫面在這些情況下只會畫一排 0 的統計列與空群組，或在「已安裝外掛」頁籤顯示「還沒有資料檔」。這一步把 7 種情境 × dev／正式的畫面補齊。

## 範圍

### 1. 插圖 `src/components/wb/plugins/PluginEmptyArt.tsx`（新增）

- 6 種 `kind`：`plug`／`data`／`map`／`nohit`／`off`／`quiet`；132×104、`fill="none"`、圓角端點、地面橢圓
- path 座標照 handoff `source/wb/pt-plempty.jsx` 的 `PlArt`
- **顏色一律寫在 `style`**（`--wb-blue-l`／`--wb-gold`／`--wb-line`／`--wb-panel`／`--wb-ink-3`），不用 presentation attribute；`aria-hidden`、`focusable="false"`
- 不併進 `EmptyState.tsx`（避免 Dashboard chunk 一起變大，規格 §7.1）

### 2. 複製 `src/components/wb/useCopyState.ts`（新增）

- 從 `wb/update/UpdateParts.tsx` 的 `UpdateCmd` 抽出狀態邏輯：`writeClipboard`、`"" | "done" | "fail"`、1600ms 還原、失敗時選取指定節點的文字、unmount 清 timer
- 參數多一個 `onDone`，成功時呼叫（給 toast 用）
- `UpdateCmd` 改用這個 hook，**DOM、class、文案不變**

### 3. 空狀態元件 `src/components/wb/plugins/PluginEmpty.tsx`（新增）

| 元件 | 用途 |
| --- | --- |
| `PlCmd({ cmd, primary? })` | `$` 提示字元（`user-select:none`）＋`<code>`＋複製鈕（`.wb-upd-copy` 樣式）；成功 `toast("已複製指令", "check")`；失敗顯示「無法複製」並選取 `<code>`、不 toast（Q3） |
| `PlSnippet({ name, text })` | 小標頭（檔名＋複製鈕）＋`.wb-pre`；成功 toast「已複製 .notecraft/plugins.json 範例」 |
| `PlInstallEmpty({ reason, isDev })` | 「已安裝外掛」頁籤 3／4；dev：`plug` 插圖、標題、說明、`PlCmd primary`（`INSTALL_BASE_CMD`）、註記、（僅 `fresh`）`.pl-fresh`、「官方外掛」清單（`OFFICIAL_PLUGINS`＋`installCmd`）；正式：`quiet` 版、無動作 |
| `PlDataEmpty({ reason, isDev, pluginCount, activeRules, onGoInstalled })` | 「資料檔」頁籤 3–7；文案照 handoff §5.3 表；按鈕呼叫 `onGoInstalled`；正式 `quiet` 版 |
| `PlHint({ env, plugins, workspaceLabel })` | dev-only，5／6／7；`nomap` 附 `PlSnippet`（`mappingSnippet(啟用中外掛 id)`）；`nohit` 三列點＋`activeGlobs` chip，第二列點帶 `workspaceLabel`；`disabled` 一句說明 |

- 標題／說明／按鈕沿用 `.pt-empty-t`／`.pt-empty-s`／`.pt-empty-btn`；外層 `.pl-es`
- 所有文案照 handoff 原句；N 以實際數字帶入

### 4. `src/components/wb/PluginsWorkbench.tsx`

- 以 `derivePluginEnv` 計算 `env`；`plugins` 先套 `override`（樂觀更新）再算
- 新 prop `workspaceLabel`（`pages/plugins/index.astro` 從 `index.workspaceLabel` 傳入）
- **Header pills**（規格 §4）：依 `env.reason` × `isDev` 三種組合
- **資料檔頁籤**：`files.length === 0` → 不渲染搜尋框與計數、說明文字換掉、Body 放 `PlDataEmpty`（`onGoInstalled={() => goTab("installed")}`）；有檔但搜尋無結果 → 維持單行 `.wb-empty`
- **已安裝外掛頁籤**：
  - `plugins.length === 0` → Toolbar 說明依 `fresh`／`noplugins`／正式三種、不渲染計數；Body 只放 `PlInstallEmpty`
  - 否則照現況，Toolbar 說明改「.notecraft/plugins.json ・ 展開可看映射規則、設定覆寫與外掛檔案」；`isDev && env.reason` 時在 `StatStrip` 與 `GroupHeader` 之間插 `PlHint`
  - 列 pill 槽：`pluginRowState` 為 `unmapped` →「未映射」warn、`nohit` →「無命中」warn
  - 「N 檔」欄：`off` →「—」＋`title="停用中，不處理任何檔案"`；其餘 `matched.length`（Q6，不再加 `inactiveMatches`）
  - 「安裝新外掛」說明框改 `isDev &&`
- 刪除 `PluginEmptyState`（確認沒有其他 import 後）

### 5. `src/components/wb/PluginDrawer.tsx`

- 映射規則為空：「plugins.json 沒有指定這個外掛要處理的檔案。」
- 命中的資料檔為空（`matched` 與 `inactiveMatches` 皆空）：依 `pluginRowState` → `off`「停用中，不處理任何檔案。」、`nohit`「沒有檔案符合這條映射。」、`unmapped`「沒有映射規則，所以沒有命中的檔案。」
- 停用中但 `inactiveMatches` 有值：照現況列灰色「已停用」列

### 6. `src/components/wb/Sidebar.astro`

- `dataFiles.length === 0 && import.meta.env.DEV`：渲染區段標題「Plugin 資料檔」＋單一入口（`plug` icon、「尚無資料檔」`--wb-ink-3`、無數字），`href` 與 `data-wb-path` 都是 `ROUTES.plugins`
- 正式且 0 檔：整段不渲染（＝現況）
- icon 用 `@/components/Icon.astro` 既有的 `plug`

### 7. 樣式 `src/styles/workbench.css`

- `.pl-es`、`.pl-cmd`（含 `.primary`、`.pl-cmd-p`）、`.pl-note`、`.pl-fresh`、`.pl-sec`、`.pl-off`／`.pl-off-row`、`.pl-hint`（`-t`／`-b`／`-ul`）、`.pl-snip`，數值照 handoff §5–§6
- 只引用既有 `--wb-*`，**規則裡零色碼**；`color-mix()` 也只混既有 token
- 860px 斷點：`.pl-es` padding `36px 14px 48px`、`.pl-hint` padding `12px 14px`、複製鈕高 36、`.pl-cmd.primary` 最小高 46；**放在既有 860px 媒體規則之前**
- 指令與 `.wb-pre` 一律 `white-space:pre-wrap; overflow-wrap:anywhere`
- `:focus-visible` 沿用 `.pt-empty-btn` 與 `.wb-upd-copy` 的既有規則

## 要改的既有檔案

`src/components/wb/PluginsWorkbench.tsx`、`src/components/wb/PluginDrawer.tsx`、`src/components/wb/Sidebar.astro`、`src/components/wb/update/UpdateParts.tsx`、`src/pages/plugins/index.astro`、`src/styles/workbench.css`。新增 `src/components/wb/plugins/PluginEmptyArt.tsx`、`src/components/wb/plugins/PluginEmpty.tsx`、`src/components/wb/useCopyState.ts`。

## 驗收

先以 Task 124 的 fixture（或手動在 scratch 建 5 個工作區）準備情境 3–7，用本機 `node bin/notecraftapp.mjs view <dir>`（dev）與 `serve <dir>`（正式）開啟。

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 情境 3 dev | 無 `plugins.json`、無外掛 | 開 `/plugins?tab=installed` | `PlInstallEmpty` 含 `.pl-fresh`、兩個官方外掛與各自指令；無統計列、無群組標題、無說明框；Header「未安裝外掛」；Sidebar「尚無資料檔」 |
| 情境 4 dev | `plugins.json` 為 `{ "plugins": [] }`、無外掛 | 同上 | 同情境 3 但無 `.pl-fresh`；Toolbar「.notecraft/plugins.json ・ 沒有已安裝的外掛」 |
| 情境 5 dev | 裝 ER、無規則 | 開兩個頁籤 | 資料檔頁籤 `map` 空狀態；已安裝頁籤有 `PlHint`＋可複製範例（`**/*.er.json`）；列 pill「未映射」；Header warn「未設定映射」 |
| 情境 6 dev | 裝 ER、規則 `none/*.er.json` | 同上 | `nohit` 空狀態與提示；列點帶 `workspaceLabel`；glob chip；列 pill「無命中」 |
| 情境 7 dev | 裝 ER、列在 `disabled` | 同上 | `off` 空狀態；提示「1 個外掛都停用了」；「N 檔」顯示「—」；按列尾 Switch → 重載後恢復正常畫面 |
| 混合 | A 停用有規則、B 啟用無規則 | 開 `/plugins` | 顯示 `nomap`，不顯示「有 N 條映射規則」 |
| 正式 | 情境 3–7 各以 `serve` 開 | 開兩個頁籤 | 一律 `quiet` 版、無 Header 徽章、無 Sidebar 區段、無 Switch、無說明框；頁面原始碼搜尋不到 `npx` |
| 情境 1 不變 | 主 repo | dev 與 build | 與改動前相同，唯一差異是正式環境不再有「安裝新外掛」說明框 |
| 頁籤跳轉 | 情境 5 資料檔頁籤 | 按「設定映射規則 →」 | 切到已安裝外掛頁籤、網址變 `?tab=installed`、不換頁 |
| 複製 | 任一指令 | 按「複製」 | 「已複製」1.6 秒＋Toast；`$` 不在剪貼簿內容中 |
| 複製失敗 | DevTools 暫時讓 `navigator.clipboard.writeText` reject | 按「複製」 | 「無法複製」、文字被選取、無 Toast |
| 檢查更新不變 | `/settings` | 複製更新指令 | 行為與改動前相同 |
| 手機 | 375px | 情境 3 dev | 最長的 openapi 指令自動換行、`document.documentElement.scrollWidth === innerWidth` |
| 搜尋無結果 | 主 repo 資料檔頁籤 | 搜尋 `zzz` | 單行「沒有符合條件的資料檔。」，無插圖 |
| hydration | 各情境 | console | 無 hydration mismatch |
| 全套 | — | `npx tsc --noEmit && npx astro build && npm run check:wb` | 通過；tsc 錯誤數不增加 |

## 依賴

Task 121（才看得到 0 個外掛）、Task 122（`derivePluginEnv`、`OFFICIAL_PLUGINS`）。
