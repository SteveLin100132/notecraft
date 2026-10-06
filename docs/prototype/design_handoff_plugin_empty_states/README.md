# Handoff：Plugin 頁（/plugins）空狀態與邊界情境

## Overview

NoteCraft 的 Plugin 是「把結構化 JSON 資料檔畫成頁面的渲染器」。使用者要先執行 `npx notecraftapp install-plugin <id>`，把外掛裝進 `.notecraft/plugins/<id>/`，再到 `.notecraft/plugins.json` 寫映射規則（例：`{ "plugin": "er-diagram-renderer", "files": ["**/*.er.json"] }`），命中的 JSON 檔才會變成「資料檔」頁面。

外掛和映射是兩個獨立步驟，所以會出現「裝了沒映射」「有映射沒命中」「全部停用」等中間狀態。現行產品在這些情況下會畫出一排 0 的統計列和空群組，或在「已安裝外掛」頁籤顯示標題為「還沒有資料檔」的文案，和頁籤對不上。

這份交付定義 7 種情境 × dev／正式環境 × 電腦／平板／手機時，以下各區塊要顯示什麼：Header 徽章、Sidebar「Plugin 資料檔」區段、兩個頁籤（「資料檔」「已安裝外掛」）的 Toolbar 與 Body。

前置交付：`design_handoff_workbench/`（工作台外殼、§5.7 Plugin 頁）、`design_handoff_plugin_system/`（plugins.json 與 manifest 資料模型）。本包只描述**差異**，其餘沿用上述兩份。

## About the Design Files

`prototype/` 和 `source/` 是用 **HTML ＋ 瀏覽器端 React（Babel inline）做的設計參考**，用來定稿視覺、文案與行為，**不是要直接搬進正式專案的程式碼**。請在既有 NoteCraft codebase 裡，用它現有的元件、樣式與資料流程重做這些畫面。`source/` 裡的 JSX 只拿來對照結構、條件判斷和文案。

## Fidelity

**High-fidelity。** 文案、間距、字級、顏色、插圖都已定稿，請照著重現。顏色一律用工作台既有的 `--wb-*` token，不要新增色碼。

## 怎麼看 Prototype

開 `prototype/NoteCraft-Workbench-standalone.html`（自含單檔，可離線開啟）→ 右下角 Tweaks：
- **環境 → Plugin 情境**：切換 7 種情境；下方「前往 Plugin 頁」直接跳到 `/plugins`
- **環境 → Dev 模式**：開＝作者本機（dev），關＝部署給讀者看的靜態站（正式）
- **工作台 → 介面尺寸**：電腦／平板／手機

---

## 1. 情境模型

一個純函式決定所有畫面（prototype：`ptPlEnv(scen, off)`，在 `source/wb/pt-plempty.jsx`）。正式實作時，輸入改成實際掃描結果：

```ts
type PluginEnv = {
  plugins: InstalledPlugin[];   // .notecraft/plugins/*/notecraft-plugin.json
  hasConfig: boolean;           // .notecraft/plugins.json 是否存在
  files: DataFile[];            // 啟用中外掛的 glob 命中的 JSON 檔
  rules: number;                // 所有外掛映射規則（glob）總數
  reason: null | "fresh" | "noplugins" | "nomap" | "nohit" | "disabled";
};
```

**reason 判定（依序判斷，第一個成立的就是）**

| # | 情境 | 條件 | `reason` |
|---|---|---|---|
| 1 | 正常 | `files.length > 0` | `null` |
| 2 | 只裝 1 個 | `files.length > 0` | `null` |
| 3 | 全新工作區 | `plugins.length === 0 && !hasConfig` | `fresh` |
| 4 | 有 plugins.json、0 個外掛 | `plugins.length === 0 && hasConfig` | `noplugins` |
| 5 | 已裝、無映射規則 | `files.length === 0 && rules === 0` | `nomap` |
| 6 | 有規則、沒有命中 | `files.length === 0 && rules > 0` 且至少一個外掛啟用 | `nohit` |
| 7 | 全部停用 | `files.length === 0 && rules > 0` 且所有外掛停用 | `disabled` |

- `files` 只算**啟用中**外掛命中的檔案。在情境 7 用 Switch 重新啟用任一外掛，`files` 立即有值，提示和空狀態跟著消失。
- 每個外掛的命中數 `matched(p)` = 符合 `p.files` 任一 glob 的資料檔數（glob 比對見 `ptGlobMatch`，`**/` 可比對 0 層以上目錄）。
- 情境 1、2 是既有畫面，行為不變；本包的改動都只在 `files.length === 0` 時生效。只有兩點例外，見 §7。

---

## 2. Header 徽章（`PtHeader badges`）

| 條件 | 正式 | dev |
|---|---|---|
| `files > 0` | 「N 個資料檔」muted ＋「已裝 N 個外掛」 | 同左 |
| `files = 0`、`plugins = 0`（3／4） | 不顯示徽章 | 「未安裝外掛」muted |
| `files = 0`、`plugins > 0`（5／6／7） | 不顯示徽章 | 「已裝 N 個外掛」＋ warn pill：5「未設定映射」、6「映射無命中」、7「外掛全部停用」 |

不顯示「0 個資料檔」：數字 0 不提供資訊，原因 pill 才告訴作者發生了什麼事。

## 3. Sidebar「Plugin 資料檔」區段（`PtSidebar`）

| 條件 | 呈現 |
|---|---|
| `files > 0` | 照舊：區段標題＋「全部資料檔 N」＋各資料夾 |
| `files = 0`、dev | 保留區段標題和**一個入口**：icon 換成 `plug`、文字「尚無資料檔」（`--wb-ink-3`）、不顯示數字、沒有資料夾項目。點擊進 `/plugins`，那裡有下一步引導 |
| `files = 0`、正式 | **整段隱藏**（標題和入口都不渲染）：讀者在那裡沒有東西可看 |

Rail 的 Plugin 入口不變。

## 4. Toolbar（`.wb-tb`）

**資料檔頁籤**
- `files > 0`：照舊（說明「所有 plugin 資料檔，依所在資料夾分組」＋搜尋框＋「N 個」）。
- `files = 0`：**隱藏搜尋框和計數**。說明文字改成 dev「沒有資料檔 ・ 由外掛渲染的 JSON 檔會列在這裡」，正式「這個站沒有使用資料檔」。

**已安裝外掛頁籤**
- `plugins > 0`：照舊（「.notecraft/plugins.json ・ 展開可看映射規則、設定覆寫與外掛檔案」＋「N 個外掛」）。
- `plugins = 0`：隱藏「N 個外掛」。說明文字：
  - dev、情境 3：「尚未建立 .notecraft/plugins.json ・ 沒有已安裝的外掛」
  - dev、情境 4：「.notecraft/plugins.json ・ 沒有已安裝的外掛」
  - 正式：「這個站沒有使用外掛」

---

## 5. Body

### 5.1 共用：空狀態版型 `.pl-es`

置中單欄，從上到下：插圖 → 標題 → 說明 → （可選）一個主要動作 → （可選）左對齊的指令／清單區。

| 部位 | 規格 |
|---|---|
| 容器 `.pl-es` | `display:flex; flex-direction:column; align-items:center; text-align:center; gap:6px; padding:56px 20px 64px`；≤860px 或手機：`padding:36px 14px 48px` |
| 插圖 | 132×104，`margin-bottom:8px`（見 §5.5） |
| 標題 `.pt-empty-t` | 14px / 700 / `--wb-ink` |
| 說明 `.pt-empty-s` | 12.5px / 行高 1.7 / `--wb-ink-3` / `max-width:430px` / `text-wrap:pretty` |
| 主要按鈕 `.pt-empty-btn` | 高 32、padding 0 16、全圓角、1px `--wb-line`、底 `--wb-panel`、12.5px/700、字色 `--wb-blue-l`；hover 底 `--wb-bg`、邊 `#9dbde6`；`margin-top:12px` |
| 指令／清單區 `.pl-es-main` | `width:100%; max-width:560px; margin-top:18px; flex column; gap:8px; text-align:left` |

這套沿用既有 AI 佇列、更新日誌空狀態（`PtEmpty`）的字級和插圖尺度，只把說明文字寬度放寬到 430px。

**規則**：每個空狀態最多一個主要動作。指令一律用等寬字（`.pl-cmd`／`.wb-code`／`.wb-pre`）。

### 5.2 「已安裝外掛」頁籤

#### 情境 3、4：0 個外掛（`PtPlInstallEmpty`）

不畫統計列和群組標題，整個 Body（`.wb-body.flush`）只放這個空狀態。既有的「安裝新外掛」說明框（`.wb-callout`）**不出現**。

**dev**
1. 插圖 `plug`
2. 標題：還沒有安裝外掛
3. 說明：外掛負責把結構化的 JSON 資料檔畫成頁面，例如把資料庫 schema 畫成關聯圖。先安裝外掛，再指定它要處理哪些檔案。
4. **主要動作**：可複製指令（`.pl-cmd.primary`）`npx notecraftapp install-plugin`
5. 註記 `.pl-note`（12px、`--wb-ink-3`、置中）：不帶 id 會列出官方外掛清單讓你選。
6. **只在情境 3**：提示框 `.pl-fresh`（左側 `doc` icon，金色）：
   > 這個工作區還沒有 `.notecraft/plugins.json`。用下方帶 `--apply` 的指令安裝，會一併建立這個檔案並寫入映射規則；只裝外掛的話，之後要自己建立。

   ⚠ `--apply` 會不會建立 plugins.json，請以 CLI 實際行為為準；行為不同時改寫這句。
7. 區段標題 `.pl-sec`：官方外掛
8. 官方外掛清單 `.pl-off`，每列 `.pl-off-row`：
   - 第一行：`plug` icon（金）＋標題（13px/700）＋ id（等寬 11.5px、`--wb-ink-3`）
   - 第二行：說明（12px、行高 1.7、`--wb-ink-2`）
   - 第三行：可複製指令（`.pl-cmd`，非 primary）

   | 標題 | id | 說明 | 指令 |
   |---|---|---|---|
   | ER Diagram | `er-diagram-renderer` | 資料庫 schema JSON → 可導覽的 Wiki 與實體關聯圖 | `npx notecraftapp install-plugin er-diagram-renderer --apply "**/*.er.json"` |
   | API 文件 | `openapi-renderer` | OpenAPI 3.0／3.1 JSON → tag 與 operation 導覽、欄位樹、範例與 cURL | `npx notecraftapp install-plugin openapi-renderer --apply "**/*.openapi.json"` |

   **目前固定只列這兩個**，寫死成常數（prototype：`PL_OFFICIAL`）。之後會另做 Plugin Store，屆時清單改成動態來源；這次不用實作，見 §9。

**正式**
1. 插圖 `quiet`
2. 標題：這個站沒有使用外掛
3. 說明：外掛用來把 JSON 資料畫成頁面，這個站目前沒有用到。
4. 無動作

#### 情境 5、6、7：已裝外掛，但沒在用

清單照常顯示（統計列 → 群組標題「已安裝外掛」→ 各列 →「安裝新外掛」說明框）。**dev** 在統計列和群組標題之間插入提示區塊 `PtPlHint`，正式環境不顯示。

**提示區塊 `.pl-hint` 規格**：滿版（`margin:0; border-radius:0; border:0`）、`padding:12px 16px`（手機 `12px 14px`）、底色 `color-mix(in srgb, var(--wb-gold) 8%, var(--wb-panel))`；左側 `plug` icon 15px 金色、`gap:10px`；標題 `.pl-hint-t` 12.5px/700；內文 `.pl-hint-b` 12px、行高 1.85、`--wb-ink-2`。**沒有框線**，用底色和上下區塊分開。

- **情境 5（nomap）**
  - 標題：外掛已安裝，但還沒有映射規則
  - 內文：在 `.notecraft/plugins.json` 指定每個外掛處理哪些 JSON 檔，命中的檔案才會變成資料檔頁。路徑相對於筆記資料夾。
  - 可複製範例 `PlSnippet`：小標頭 `.notecraft/plugins.json`＋右側「複製」，內容依**已安裝外掛**產生，每個外掛一行，glob 取該外掛 manifest 的預設值：
    ```json
    {
      "plugins": [
        { "plugin": "er-diagram-renderer", "files": ["**/*.er.json"] },
        { "plugin": "timeline-renderer", "files": ["planning/roadmap.json"] },
        { "plugin": "metrics-table-renderer", "files": ["metrics/**/*.json"] }
      ]
    }
    ```
- **情境 6（nohit）**
  - 標題：有 N 條映射規則，但沒有命中任何檔案
  - 列點（`.pl-hint-ul`，12px、行高 1.85）：
    1. 檢查 glob 寫法：`**/*.er.json` 會比對所有子資料夾，`*.er.json` 只比對最上層。
    2. 資料檔必須放在筆記資料夾 `src/content/notes/` 內，規則裡的路徑相對於這個資料夾。
    3. 檔案可能被 `.notecraft/ignore.json` 排除。
  - 下方列出目前**所有** glob，各為一個 `.wb-code` chip（`gap:6px; margin-top:8px`）。筆記資料夾路徑請帶入實際設定值。
- **情境 7（disabled）**
  - 標題：N 個外掛都停用了
  - 內文：停用中的外掛不處理任何檔案。用列尾的開關重新啟用，命中的資料檔會出現在「資料檔」頁籤。

**列上的狀態**（`.wb-row`，情境 3–7 適用）
- pill 槽（版本 chip 右側），優先序：渲染錯誤（danger）＞ 不相容（warn）＞ **未映射**（warn，`p.files` 為空）／**無命中**（warn，有規則、啟用中、命中 0）
- 「N 檔」欄：停用中的外掛顯示「—」，tooltip「停用中，不處理任何檔案」；其他照實際命中數
- 啟用／停用 pill：照舊

**Drawer（點列開啟）**
- 「映射規則」區：沒有規則時顯示「plugins.json 沒有指定這個外掛要處理的檔案。」
- 「命中的資料檔」區為空時，依原因顯示：
  - 停用中：「停用中，不處理任何檔案。」
  - 有規則但沒命中：「沒有檔案符合這條映射。」
  - 沒有規則：「沒有映射規則，所以沒有命中的檔案。」

### 5.3 「資料檔」頁籤（`PtPlDataEmpty`）

`files = 0` 時，Body 只放這個空狀態。每種狀態只有一個按鈕，按下都切到「已安裝外掛」頁籤（不換路由，只換 tab）。

| 情境 | 插圖 | 標題 | 說明 | 按鈕 |
|---|---|---|---|---|
| 3、4 | `data` | 還沒有外掛，所以沒有資料檔 | 資料檔是交給外掛渲染的 JSON 檔。這個工作區還沒有安裝任何外掛，JSON 檔會維持原樣，不會出現在這裡。 | 查看官方外掛 → |
| 5 | `map` | 外掛還沒有分配到檔案 | 已安裝 N 個外掛，但 .notecraft/plugins.json 沒有任何映射規則，沒有 JSON 檔交給外掛處理。 | 設定映射規則 → |
| 6 | `nohit` | 映射規則沒有命中任何檔案 | plugins.json 有 N 條規則，但筆記資料夾裡沒有符合的 JSON 檔。可能是 glob 寫錯、檔案放在筆記資料夾外，或被 ignore.json 排除。 | 檢查映射規則 → |
| 7 | `off` | 外掛都停用了 | 已安裝的 N 個外掛都在停用中。停用的外掛不處理任何檔案，所以這裡沒有資料檔。 | 重新啟用外掛 → |
| 3–7 正式 | `quiet` | 這個站沒有使用資料檔 | 這裡的內容都是筆記。資料檔是由外掛畫成的資料頁面，例如資料表關聯圖，這個站沒有發佈。 | 無 |

情境 3、4 在這個頁籤**不放安裝指令**，只引導到「已安裝外掛」頁籤，避免兩個頁籤講一樣的話。

### 5.4 搜尋無結果

`files > 0` 但搜尋字沒有命中時，維持既有單行 `.wb-empty`：「沒有符合條件的資料檔。」（`padding:56px 16px`、13px、`--wb-ink-3`、置中）。沒有插圖、沒有粗體標題，和 §5.3 的空狀態分屬不同視覺層級：前者是「篩選結果是空的」，後者是「工作區本身是空的」。

### 5.5 插圖

全部 132×104 viewBox、`fill="none"`、`stroke-linecap/linejoin: round`，底部一個地面橢圓（`cx 66 cy 94 rx 42 ry 5`，`--wb-line`、opacity .7）。**顏色一律寫在 `style`（`fill`／`stroke`）並使用 CSS 變數，不用 presentation attribute**，方便日後換主題：

| 變數 | 用途 |
|---|---|
| `--wb-blue-l` | 主線稿（stroke 2–2.4） |
| `--wb-gold` | 點綴：四芒星、加號、圓點、JSON 大括號 |
| `--wb-line` | 次要線條、虛線、灰塊 |
| `--wb-panel` | 紙面填色 |
| `--wb-ink-3` | 停用／未連結狀態的線稿 |

| kind | 構圖 | 用在 |
|---|---|---|
| `plug` | 虛線圓角框（空插槽）＋中央插頭＋金色四芒星 | 已安裝外掛 3／4 dev |
| `data` | JSON 文件（金色 `{ }`）→ 虛線 → 金色虛線圓（缺少的渲染器，內有 ＋） | 資料檔 3／4 dev |
| `map` | JSON 文件 ⋯ 金點 ⋯ 插頭（中間斷開的虛線） | 資料檔 5 |
| `nohit` | 虛線灰色 JSON 文件＋藍色放大鏡（內有金色減號） | 資料檔 6 |
| `off` | 灰色插頭＋關閉狀態的開關 | 資料檔 7 |
| `quiet` | 兩張疊放的文件（後張旋轉 −6°）＋一個金點 | 兩個頁籤的正式版 |

精確的 path 座標見 `source/wb/pt-plempty.jsx` 的 `PlArt`，正式版請另存成 SVG 元件。

---

## 6. 互動

### 6.1 可複製指令 `PlCmd` ／ 範例 `PlSnippet`

**沿用既有「檢查更新」的複製互動**（`.upd-copy`，見 `design_handoff_update_check/`）：
- 按下 →寫入剪貼簿 →按鈕文字「複製」＋copy icon 換成「已複製」＋check icon（字色 `--wb-ok`），1600ms 後還原
- 同時送出全域 Toast：指令「已複製指令」；範例「已複製 .notecraft/plugins.json 範例」
- `aria-label`：「複製指令 {cmd}」／「複製 {檔名} 範例」
- 剪貼簿 API 失敗時不報錯，照樣顯示已複製狀態（和既有行為一致）

**`.pl-cmd` 規格**
- `display:flex; align-items:center; gap:8px; min-height:36px; padding:3px 3px 3px 12px; border:1px solid var(--wb-line); border-radius:6px; background:var(--wb-bg)`
- 開頭 `$` 提示字元（等寬 12px、`--wb-ink-3`、`user-select:none`，複製時不包含）
- 指令 `<code>`：等寬 12px、行高 1.6、`--wb-ink`、`white-space:pre-wrap; overflow-wrap:anywhere`
- `.primary`：`min-height:42px`（手機 46）、邊框 `color-mix(--wb-blue-l 38%, --wb-line)`、底 `color-mix(--wb-blue-l 6%, --wb-panel)`、指令 12.5px/600
- 複製鈕高 26（≤860px／手機 36）

**`PlSnippet`**：1px `--wb-line` 框、圓角 6；頂部 32px 標頭（等寬 11px、`--wb-ink-3`，下 1px `--wb-line-2`），右側複製鈕；內容 `.wb-pre`（等寬 11.5px、行高 1.7、`--wb-bg` 底、`overflow-wrap:anywhere`）。

### 6.2 頁籤跳轉

資料檔頁籤的空狀態按鈕 → `setTab("已安裝外掛")`，不換路由。

### 6.3 重新啟用（情境 7）

dev 環境下，列尾 Switch 或 Drawer 的「啟用此外掛」→ 寫回 plugins.json 的 enabled →重新計算 `PluginEnv`。至少一個外掛啟用且有命中時，`reason` 變成 `null`：提示消失、Header 改成正常徽章、Sidebar 出現資料夾、資料檔頁籤出現清單。

---

## 7. dev × 正式環境

正式環境的讀者不能安裝或設定外掛，所以**正式環境不出現任何 `npx` 指令、plugins.json 範例或設定提示**。

| 元素 | dev | 正式 |
|---|---|---|
| 0 個外掛／0 個資料檔的空狀態 | 原因＋下一步（指令、按鈕） | `quiet` 安靜版，無動作 |
| `PtPlHint`（5／6／7） | 顯示 | 不顯示 |
| 列尾 Switch | 顯示 | **不顯示**（所有情境都一樣，**包含 1、2**） |
| Drawer「停用／啟用此外掛」 | 顯示 | **不顯示**（所有情境都一樣） |
| 「安裝新外掛」說明框 | 有外掛時顯示 | **不顯示**（所有情境都一樣） |
| Sidebar 0 檔入口 | 「尚無資料檔」 | 整段隱藏 |
| Header 0 檔徽章 | 原因 pill | 不顯示 |

⚠ **影響既有畫面的改動**：
1. 上表三列粗體「不顯示」也作用在情境 1、2，正式環境現有的 Switch、Drawer 按鈕和說明框會消失。
2. 情境 2「只裝 1 個」的資料檔清單和 Sidebar，改成只列該外掛命中的檔案（原本誤列全部 4 個）。

## 8. 響應式

沿用工作台斷點（≤860px 或 `body.pt-mobile` 為手機）：
- `.pl-es` padding 縮成 `36px 14px 48px`；`.pl-hint` padding `12px 14px`
- 指令一律 `pre-wrap` 加 `overflow-wrap:anywhere` 自動換行，**頁面不能出現橫向捲動**（在 375px 寬下驗證最長的 openapi 指令）
- 複製鈕高 36，`.pl-cmd.primary` 最小高 46（觸控目標）
- 已安裝外掛列沿用既有手機版 `.wb-row` 換行規則
- 平板沿用電腦版版面

## 9. 暫不實作：Plugin Store

之後會在 UI 做 Plugin Store（瀏覽、搜尋、安裝官方與社群外掛）。官方外掛目前只有兩個，**這次不實作**，空狀態的「官方外掛」清單維持固定兩個常數。為了日後好接，請：
- 把清單抽成單一常數或模組（例：`OFFICIAL_PLUGINS`，欄位 `id / title / description / defaultGlob`），空狀態只從這裡讀，不要把文案散寫在元件裡
- 安裝指令由 `id` 和 `defaultGlob` 組出來（`npx notecraftapp install-plugin ${id} --apply "${defaultGlob}"`），不要逐條寫死

之後 Store 上線時，只要把常數換成 Store 的資料來源，或在清單下方加一個「瀏覽全部外掛」入口即可，空狀態版面不用改。

## 10. Design Tokens

全部使用 `wb/pt.css` 既有 token，**沒有新增色碼**：

| Token | 值 | 用途 |
|---|---|---|
| `--wb-blue-l` | `#2c6ebb` | 插圖主線、primary 指令框色、按鈕字 |
| `--wb-gold` | `#ed9b26` | 外掛相關 icon、插圖點綴、提示底色（8%）、`.pl-fresh` 虛線（55%）與底色（6%） |
| `--wb-bg` | `#f6f8fb` | 指令框底、`.wb-pre` 底 |
| `--wb-panel` | `#fff` | 卡片／插圖紙面 |
| `--wb-line` | `#e1e6ee` | 框線、插圖次要線 |
| `--wb-line-2` | `#eef1f6` | 清單列分隔、Snippet 標頭底線 |
| `--wb-ink` | `#161c28` | 標題、指令文字 |
| `--wb-ink-2` | `#2b3546` | 內文 |
| `--wb-ink-3` | `#6c798e` | 說明、註記、`$`、Sidebar 0 檔文字 |
| `--wb-ok` | `#2e9e6b` | 「已複製」字色 |

- 字型：內文沿用工作台（Noto Sans TC）；指令 `var(--font-mono)`
- 字級：14／13／12.5／12／11.5／11／10.5px（全部是 pt.css 既有級距）
- 圓角：6（指令、Snippet）、8（`.pl-off` 清單、`.pl-fresh`）、全圓角（按鈕、pill）；`.pl-hint` 為 0
- 無陰影、無漸層

## 11. Assets

- Icon：沿用工作台 line icon（`plug`、`doc`、`copy`、`check`、`layers`），正式版對應 lucide-react `Plug`／`FileText`／`Copy`／`Check`／`Layers`
- 插圖：6 張 inline SVG（§5.5），無外部圖片

## 12. Files

```
design_handoff_plugin_empty_states/
├─ README.md                          ← 本文件
├─ CLAUDE_CODE_PROMPT.md              ← 起手 prompt
├─ prototype/
│  └─ NoteCraft-Workbench-standalone.html   自含單檔；Tweaks 切情境／dev／尺寸
└─ source/wb/                         ← 參考原始碼（只讀，不要直接搬）
   ├─ pt-plempty.jsx    ★ 新增：ptPlEnv 情境模型、PlArt 插圖、PlCmd／PlSnippet、
   │                      PtPlInstallEmpty、PtPlDataEmpty、PtPlHint、PL_OFFICIAL
   ├─ pt-plempty.css    ★ 新增：.pl-* 樣式與手機規則
   ├─ pt-plugins.jsx    改：PtInstalledPlugins 接 env、列狀態、dev-only Switch／說明框、Drawer 空文案
   ├─ pt-app.jsx        改：plScen tweak、plEnv 計算、/plugins 的 Header 徽章與兩個 Toolbar
   ├─ pt-shell.jsx      改：PtSidebar 接 dataFiles／devMode，0 檔處理
   └─ pt-data.jsx       改：ptDataFolders(list) 接受檔案清單
```

在 `pt-app.jsx` 搜尋 `plEnv`、`plBadges`、`insLbl`，可以找到 `/plugins` 路由的所有改動。

## 13. 驗收清單

- [ ] 7 情境 × dev／正式 × 電腦／平板／手機，共 42 種組合都和 prototype 一致
- [ ] 情境 3–7 的「已安裝外掛」頁籤不會出現「還沒有資料檔」之類對不上頁籤的文案
- [ ] 0 個外掛時，不出現統計列、空的群組標題和「安裝新外掛」說明框
- [ ] 正式環境的頁面上找不到 `npx` 字串
- [ ] 手機 375px 寬下，所有指令自動換行，頁面沒有橫向捲動
- [ ] 複製後按鈕顯示「已複製」1.6 秒，並跳出 Toast
- [ ] 情境 7 重新啟用一個外掛後，Header、Sidebar、兩個頁籤同步更新
- [ ] 搜尋無結果仍是單行文字，沒有插圖
