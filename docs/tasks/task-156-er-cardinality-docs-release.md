# Task 156 — README、版號 1.3.0、官網指南、瀏覽器驗收與回填

> 規格 [notecraft-er-cardinality.md](../notecraft-er-cardinality.md) §7.1、§9、§11.2、§15。
> 依賴 Task 149–155 全部完成。

## 範圍

### 1. 版號

- `plugins/er-diagram-renderer/notecraft-plugin.json`：`version: "1.3.0"`（`engines.notecraftapp` 維持 `>=0.6.0`）
- `plugins/registry.json`：版號 1.3.0；`files` 再核對一次（`markers.tsx`、`example/schema.v1.2.json`、README 附圖）

### 2. README（§9）

- 「它畫出什麼」補多重性、圖例、收合中間表、診斷
- **v1.2 → v1.3 差異表**（同規格 §3.1）
- **推導規則表**：nullable 優先序、父端／子端推導、明確覆寫、中間表判斷條件
- **父端／子端對照圖**與**圖例**：文字表格＋一張小 SVG（`.svg` 在 install 允許的副檔名內；不放 PNG 截圖）
- 資料範例（jsonc）補 `nullable`、`foreignKeys`、`indexes`、`junction`、`fk: "表.欄位"`
- **在筆記裡內嵌**：`<PluginView src="erd/sales.er.json" />`；`src` 的基準是 **notesDir**（與 `plugins.json` 的 `files` 相同，不是筆記檔所在資料夾）；`options` 只影響這一處內嵌（例 `options={{ collapseJunctions: true, canvasHeight: 640 }}`）
- 診斷代碼一覽（10 種）與「不會讓 build 失敗」
- v1.1 範例 `contract.sign_item_id` 自動變成 1:1 的說明
- 範例清單改為三份（v1.3、v1.2、v1.1）
- 全文不出現任何 ORM、框架、資料庫產品名詞

### 3. 其他文件

- `site/src/content/docs/guides/plugin-er.mdx`：格式說明與 README 同步（必要時其他引用 ER 格式的官網頁面一併檢查）
- `CHANGELOG.md`：照 v1.1／v1.2 的慣例記一筆（plugin 版本；app 不升版，放在下一個 app 版本的段落或「官方 plugin」段落，依現有慣例）
- `CLAUDE.md` Plugin System 段落加一行：ER v1.3 的推導只在 `derive.ts`、畫面不讀 `c.fk`、多重性與中間表規則見規格
- `docs/tasks/README.md`：本批標為已完成
- 規格 §15 回填：待驗證項的結論（opacity 與 marker、VizZoom 下的位置）、實作中新增的決定、仍未做的

### 4. 瀏覽器驗收（§11.2）

建 fixture 筆記資料夾（**不 commit**，放 `tmp/` 或以 `scripts/fixtures/` 產生器建立）：v1.3 範例放 `erd/sales.er.json`、一篇筆記以 `<PluginView src="erd/sales.er.json" />` 內嵌、另一篇內嵌兩次。用 notecraftapp build 後在瀏覽器看（Browser pane 要可見，否則 `client:visible` 不會 hydrate）：

- [ ] page 模式：四種 marker、聚焦、hover、搜尋、hub、自我參照、複合 FK 標籤、圖例、收合／展開
- [ ] embed 模式：同上，加上展開全寬、VizZoom 放大檢視
- [ ] Wiki：`customer_profile`、`contract`、`delivery`、`option_item`、`case_member`、`biz_case`、`employee`、總覽
- [ ] local diagram：寬版與窄版
- [ ] v1.2 範例並排對照：除兩端 marker 外無差異
- [ ] 同頁兩個內嵌：marker 不互相干擾
- [ ] reload 無 hydration 警告；build log 只有預期中的診斷

截圖存 `docs/screenshots/`（依現有慣例命名），描述寫進本檔實作記錄。

### 5. 最終檢查

`npx tsc --noEmit && npx astro build && npm run check-plugins`，全部通過後開 PR 併回 main。**推上預設分支就等於發佈**。

## 要改的既有檔案

`plugins/er-diagram-renderer/notecraft-plugin.json`、`README.md`（＋附圖 SVG）；`plugins/registry.json`；`site/src/content/docs/guides/plugin-er.mdx`；`CHANGELOG.md`；`CLAUDE.md`；`docs/tasks/README.md`；`docs/notecraft-er-cardinality.md`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 版號 | — | `npm run check-plugins` | registry 與 manifest 都是 1.3.0、`files` 無漂移 |
| README 範例 | — | 把 README 裡的 jsonc 範例去掉註解後以 `schema.json` 驗證 | 通過 |
| 無 ORM 用語 | — | 在 README、schema.json、官網指南搜尋常見 ORM 名詞 | 沒有 |
| 瀏覽器 | — | §4 清單 | 全部勾完、附截圖 |
| 全面 | — | `npx tsc --noEmit && npx astro build && npm run check-plugins` | 通過 |

## 依賴

Task 149–155。
