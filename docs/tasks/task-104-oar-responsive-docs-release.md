# Task 104 — 響應式、無障礙收尾、文件回填、發版（notecraftapp v1.6.0／plugin v1.0.0）

> 規格 [notecraft-openapi-renderer.md](../notecraft-openapi-renderer.md) §9、§10、§12.2、§14；實作後回填新增 §17。
> 依賴 Task 98–103 全部完成。**本批最後一個**，完成後開 PR 併回 main。

## 範圍

### 1. 響應式（規格 §9，全部 container query）

- 外殼 ≤ 1100：`MediaSplit` 上下排列、範例框 `position: static`
- ≤ 760：導覽改覆蓋式（absolute、`--shadow-lg`、點選後自動收起、預設收合）；導覽開啟時 Esc 先關導覽（插在 handoff 四層之前）；頁面 padding `20px 18px`
- ≤ 520：bar 只留導覽開關與版本；參數表改每列兩行；embed 卡同樣套用
- 工作台 ≤ 1100（側欄抽屜）與 ≤ 860（手機、底部 Tab bar）實測

### 2. 無障礙收尾

規格 §10 逐條核對：tablist 方向鍵、`aria-expanded`／`aria-current`、method `aria-label`、複製 `aria-live`、toast `role="status"`、覆蓋式導覽的焦點（開啟時進篩選框、關閉時回開關）。

### 3. 手動驗證（規格 §12.2）

逐條勾選並截圖：hydration、捲動同步、sticky、1100／860／375 三種寬度、embed 多卡、⌘K 與 Drawer 顯示 `info.title`、pagefind 以 `info.title`／`info.description` 搜得到。

> 驗畫面前確認 Browser pane **可見**（隱藏時 island 不 hydrate，`client:visible` 全部停擺）。

### 4. 文件

- 規格新增 §17「實作後回填」：偏離、實測數字（極大 spec 推導耗時、首次 render）、仍未做的
- `CLAUDE.md`：
  - Plugin System 段：manifest 的 `meta` pointer、`<PluginView options anchor>`
  - 新增一段「OpenAPI Renderer」：只吃 3.0／3.1（3.2 盡力、2.0 轉檔卡）、路由保留 `.openapi`、embed 不碰 hash、`--oar-*` 不是 app token、與 ER 各自持有 Markdown parser（`oar-markdown.mjs` 對照）
  - 目錄結構與指令（`check:oar`）
- `docs/notecraft-plugin-system.md`：若 Task 98 未補齊則補齊
- `docs/tasks/README.md`：本批標記完成、補「偏離原計畫的幾處」
- PRD：用 `bump-prd` skill
- `CHANGELOG.md`：notecraftapp 1.6.0（manifest `meta`、`PluginView` 的 `options`／`anchor`、新官方 plugin `openapi-renderer` 1.0.0）

### 5. 發版

- `package.json` 已在 Task 98 升為 1.6.0；確認 `plugins/registry.json` 的 `openapi-renderer` 條目 `version`、`files` 與實際一致
- `npm run check-plugins`（含 build）通過
- commit `chore(release): notecraftapp 1.6.0——OpenAPI Renderer`，開 PR

## 驗收

- [ ] 三種寬度截圖：導覽覆蓋式、split 上下、bar 精簡、參數表兩行
- [ ] 規格 §12.2 全部勾完並附截圖或量測
- [ ] `npx tsc --noEmit && npx astro build` 通過，tsc 錯誤數不增加；`npm run check-plugins`、`check:oar`、`check:er`、`check:wb` 全過
- [ ] CLAUDE.md、規格 §17、tasks README、PRD、CHANGELOG 更新
- [ ] PR 已開

## 實作記錄（2026-10-01）

- 響應式以瀏覽器模擬驗證：1440（外殼 1138，並排）、1024（962，上下排）、375（365，覆蓋式導覽、預設收合、參數表兩行、無水平捲動）
- 覆蓋式導覽：開啟時焦點進篩選框；Esc 先關導覽、焦點還給開關；選了 op 自動收起
- pagefind（`npm run build` 後以 preview 查詢）：`Petstore`、`訂單服務`、`design first approach`（`info.description` 第二段以後）都命中資料檔頁；operation 內容不進索引
- 文件：規格 §17、CLAUDE.md（Plugin System 規則與 OpenAPI Renderer 段）、plugin system 文件 §6.1／§7.3（Task 98）、CHANGELOG 1.6.0、tasks README、PRD
- 未做：實機手機測試（規格 §17「仍未做的」）
