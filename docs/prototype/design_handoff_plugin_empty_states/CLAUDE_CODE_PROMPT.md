# 給 Claude Code 的起手 prompt

> `design_handoff_plugin_empty_states/` 是 NoteCraft 工作台 `/plugins` 頁的空狀態與邊界情境設計定稿。請先完整讀 `README.md`，再開 `prototype/NoteCraft-Workbench-standalone.html`，用右下角 Tweaks 的「Plugin 情境」「Dev 模式」「介面尺寸」對照每一種組合。`source/wb/` 是 prototype 的原始碼，只用來對照條件與文案，不要直接搬進專案。
>
> 實作順序：
> 1. 依 README §1 建立 `PluginEnv` 推導（plugins、hasConfig、files、rules、reason），資料來源用現有掃描 `.notecraft/plugins/` 與 `.notecraft/plugins.json` 的邏輯；寫單元測試涵蓋 7 種 reason。
> 2. 依 §2–§4 改 Header 徽章、Sidebar「Plugin 資料檔」區段、兩個頁籤的 Toolbar。
> 3. 依 §5 實作兩個頁籤的空狀態、`PtPlHint` 提示區塊、列狀態 pill 與 Drawer 空文案；插圖做成 SVG 元件，顏色用 `style` 帶 `--wb-*` 變數。
> 4. 依 §6 沿用既有複製互動與 Toast；依 §7 區分 dev／正式（正式環境不能出現 `npx`）。
> 5. 依 §8 驗證手機版不會橫向捲動；最後跑 §13 驗收清單。
>
> 官方外掛清單固定兩個，抽成單一常數（§9），這次不做 Plugin Store。§7 列出兩項會影響既有畫面的改動，動手前先確認。`--apply` 會不會建立 plugins.json，以 CLI 實際行為為準，行為不同時調整情境 3 的文案。
