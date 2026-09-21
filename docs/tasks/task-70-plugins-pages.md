# Task 70 — Plugin 頁：資料檔列表、資料檔夾、已安裝外掛與 Plugin Drawer

> 規格 [notecraft-workbench.md](../notecraft-workbench.md) §8.6、§6；Q19、Q23、Q24 定案。
> 設計交付 README §5.7、§5.8；原始碼 `prototype/wb/pt-plugins.jsx`、`pt-views2.jsx` 的 `PtDataAll`、`pt-views.jsx` 的 `PtDataList`。
> 依賴 [Task 61](task-61-workbench-shell.md)。對應實作階段 **P10** 的第一部分。
> 啟用／停用 Switch 在 [Task 71](task-71-plugin-enable-disable.md)，資料檔渲染頁的頁首在 [Task 72](task-72-view-page-header.md)。

## 範圍

### 1. 索引補上外掛資料

在 Task 60 的 `WbIndex.plugins` 填入（全是 build 期已知）：

| 欄位 | 來源 |
| --- | --- |
| `id`／`title`／`version`／`author`／`description`／`homepage`／`engines`／`dataSchema`／`example` | `getPlugins()` 的 manifest |
| `source` | 讀 `<plugin dir>/.installed.json`（來源網址 + commit）。主 repo 的官方 store（`/plugins/*`）沒有這個檔 → 「內建」 |
| `mappings` | `.notecraft/plugins.json` 裡**所有**指向該 plugin 的規則（`files`／`exclude`／`options`），可能不只一條 |
| `matched` | `getDataFiles()` 依 `pluginId` 過濾。**不在 client 重算 glob**（prototype 的 `ptGlobMatch` 不要搬） |
| `assets` | build 期 `fs.readdirSync` 該 plugin 資料夾（遞迴、略過 `.` 開頭），附每個檔的角色標籤：manifest／renderer／data schema／範例資料／說明 |
| `enabled` | 本 Task 一律 `true`；Task 71 接上 `disabled` |

另加 `WbIndex.appVersion` = `package.json` 的 `version`。

### 2. `/plugins`（新增 `src/pages/plugins/index.astro` + `src/components/wb/PluginsWorkbench.tsx`）

`<WorkbenchLayout noHeader flush rail="plugins">`。頁首：標題「Plugin 資料檔」、pill「N 個資料檔」muted +「已裝 N 個外掛」；
**Tabs：資料檔／已安裝外掛**，寫進 `?tab=installed`。

**資料檔 Tab**：Toolbar 說明「所有 plugin 資料檔，依所在資料夾分組」+ 搜尋（標題、路徑、plugin id）+ 計數。
Body flush，依資料夾分組：金色 group header（`--gc: var(--wb-gold)`，右側「N 個 plugin ・ 最後更新 m/d」），「根目錄」排最前。
每列：金色 doc icon + 標題 + 路徑 + 等寬字 plugin id chip（168px 欄）+ 日期。**整列是 `<a href="/view/<路徑>">`，單擊直接進渲染頁，沒有 Drawer。**

**已安裝外掛 Tab**：

- **Stat strip 四格**：已安裝／啟用中（綠）／映射資料檔／`notecraftapp` 版本。設計稿的第五格「不相容（黃）」**不做**（Q24）
- group header「已安裝外掛」，右側「點一列看設定、映射與檔案」
- 每外掛一列：plug icon（啟用金色、停用灰）+ 名稱 + id + `vX.Y.Z` chip +「N 檔」+ 啟用／停用 pill 44px。Switch 留給 Task 71
- 列上**不顯示**「渲染錯誤」（Q23）與「不相容」（Q24）pill —— 兩者都定案不做
- 底部 callout（藍底 7%、圓角 8）：「安裝新外掛：執行 `npx notecraftapp install-plugin <id>` …」，文案照 prototype
- 單擊列開 Plugin Drawer

沒有 `plugins.json`（plugin 功能停用）時：兩個 Tab 都顯示空狀態，說明資料檔是什麼、怎麼開始，附安裝指令。
沿用現有 `/view` 空狀態頁的文案（Task 49 的定案：顯示並導向空狀態，不讓入口消失）。

### 3. Plugin Drawer（`src/components/wb/PluginDrawer.tsx`）

外框與行為同 `NoteDrawer`（建議抽出共用的 `DrawerShell`：scrim、滑入、focus 管理、`Escape`）。內容由上到下：

| 區塊 | 內容 |
| --- | --- |
| 頂列 | `.notecraft/plugins/<id>/`（官方 store 顯示 `plugins/<id>/`）、關閉鈕 |
| 標題、pill | 名稱；啟用／停用 pill、`vX.Y.Z` |
| 描述 | manifest 的 `description` |
| 動作 | 「homepage ↗」ghost（`target="_blank" rel="noreferrer"`）。「停用／啟用此外掛」按鈕留給 Task 71 |
| Manifest 表 | id／版本／作者／來源／引擎需求／data schema／範例資料。**「引擎需求」照列原字串**，app 不做相容性判斷 |
| 映射規則 | 每條規則的 glob 以 `.wb-code` 等寬藍字膠囊顯示；多條規則分行；有 `exclude` 的另起一行標「排除」 |
| 命中的資料檔 | 可點清單 → `/view/<路徑>` |
| 設定覆寫 | 該 plugin 各規則的 `options`，`<pre>` 顯示 JSON；全部為空則整段不顯示 |
| 外掛檔案 | `assets` 清單：檔名 + 角色 |

**不做**：設計稿的黃色「不相容」警告框與「渲染已跳過」pill（Q24）、紅色「渲染錯誤」pill（Q23）。

### 4. `/plugins/folder/<dir>`（新增 `src/pages/plugins/folder/[...dir].astro`）

`<dir>` 可含 `/`，用 rest 參數；`getStaticPaths()` 由 `dataFiles` 的 `dir` 去重產生。根目錄的資料檔用保留字 `_root`。

頁首：返回鍵（→ `/plugins`）、麵包屑 `NoteCraft / Plugin / <dir>`、標題 = dir、pill「N 個資料檔」muted +「N 個 plugin」。
Toolbar：說明「plugin 渲染的資料檔，點列直接進入渲染頁」+ 搜尋。Body flush、平列不分組，列同上。

這頁的搜尋是唯一的互動，做成小 island 或乾脆用 `<input>` + 幾行 inline script 過濾 DOM 皆可；不必為它拉一個大 island。

### 5. 導覽接回來

- Rail 的 Plugin 鈕：Task 61 暫時連 `/view`，改回 `/plugins`
- Sidebar「Plugin 資料檔」區段：「全部資料檔」→ `/plugins`；各資料檔夾 → `/plugins/folder/<dir>`
- `SidebarLive` 的 active 判斷補上這兩種路徑
- Rail 高亮：`/plugins*` 與 `/view/*` 都亮 Plugin

刪除 `src/pages/view/index.astro` 與 `src/components/islands/DataFilesList.tsx`（舊列表頁；轉址在 [Task 73](task-73-settings-about-redirects.md)）。

## 要改的既有檔案

`src/lib/workbench.ts`、`Rail.astro`、`Sidebar.astro`、`SidebarLive.tsx`。刪除 `view/index.astro`、`DataFilesList.tsx`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 分組 | 資料檔分散在根目錄與 `planning/` | 開 `/plugins` | 「根目錄」在前；各組計數正確 |
| 單擊即進頁 | — | 點資料檔列 | 直接進 `/view/<路徑>`，沒有 Drawer |
| 多條規則 | 某 plugin 在 `plugins.json` 有兩條規則 | 開它的 Drawer | 兩條規則都列出、`options` 各自顯示 |
| 來源 | 官方 store 的 plugin | 看 Manifest 表 | 來源為「內建」 |
| 不做的狀態 | — | 找「不相容」「渲染錯誤」字樣 | 都沒有；Stat strip 是四格 |
| 引擎需求 | manifest 有 `engines` | 看 Manifest 表 | 照列原字串 |
| 資料檔夾 | Sidebar 點 `planning` | — | 進 `/plugins/folder/planning`；Sidebar 該項 active、Rail 的 Plugin 亮 |
| 巢狀資料夾 | 資料檔在 `a/b/x.json` | `astro build` | 產生 `/plugins/folder/a/b` |
| 無 plugin | 專案沒有 `plugins.json` | 開 `/plugins` | 空狀態頁，不報錯；Sidebar 沒有「Plugin 資料檔」區段 |
| 官方 store 仍可 build | — | `npm run check-plugins` | 通過 |

## 依賴

Task 61。
