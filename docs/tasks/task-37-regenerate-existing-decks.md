# Task 37 — 重新生成 3 份既有 deck（端到端驗證）

> 對應 [deck-slide-contract.md](../deck-slide-contract.md) v0.2 §11.3。
> 依賴 **31～36 全部完成**。本 Task 是整批的收尾與唯一的端到端驗證。

## 範圍

用新流程（`content-present` → `present-planner` → `slide-generator`）**重新生成**下列 deck，
而**不是**手工改寫：

| 檔案 | 原頁數 | Task 31 降級後 |
| --- | --- | --- |
| [role-responsibility-rr.deck.tsx](../../src/components/generated/role-responsibility-rr.deck.tsx) | 8 | 移除了 `bullets`/`media`/`compare` 3 頁 |
| [專案-vs-產品.deck.tsx](../../src/components/generated/專案-vs-產品.deck.tsx) | 5 | 移除了 `compare` 1 頁 |
| `trendlink-內部客戶與業務流程整合系統提案草稿.deck.tsx` | — | 未 commit，直接整份重生成 |

## 為什麼要「重新生成」而不是「手工改寫」

手工改寫只會產出 3 個檔案；重新生成會**驗證整條 pipeline**：

1. SKILL 的規則 AI 讀得懂、照得動嗎（Task 36 的文字品質）
2. 6 個 block 的 props 好不好填、AI 會不會繞過它們自己畫（Task 34 的 API 品質）
3. `chromeMetrics()` 給的 `area` 準不準（Task 33 的最大風險）
4. 截圖驗證真的抓得到溢出嗎（Task 35 + Task 36）
5. 密度規則寫進去後，產出的頁是「一頁一個完整論證」還是又退回「一頁一重點」

**這是 v0.2 唯一的真實檢驗。** 前 6 個 Task 全綠燈也不代表產出的簡報好看。

## 驗收

### 每份 deck 都要過

- [x] 全部頁面 layout 落在 6 種之內，`custom` 頁佔內容頁多數
- [x] `custom` 頁**有 import 至少一個 block 元件** —— 若 AI 全部自己畫，代表 Task 34 的 API 不好用，回頭檢討
- [x] 內容頁字數落在 200–800、章節頁 40–60（audit A-1 的密度基準）— 一頁偏薄，見實作記錄
- [x] 無硬編色碼（grep 檢查 `#[0-9a-fA-F]{3,6}`）
- [x] 無 emoji
- [x] 無白名單外的 import
- [x] 編號（`num` / `RowItem.n` / `CardItem.n`）只出現在真的是序列的地方，沒有裝飾性 01/02/03
- [x] 亮 / 暗兩個主題**逐頁**確認可讀（特別是 status 色）
- [x] **逐頁截圖**：無裁切、無標籤碰撞、無疊字
- [x] dev console 無溢出警告
- [x] 縮覽側欄不卡（`custom` 頁的動畫確實只在 `live === true` 啟動）
- [x] `full-visual` 的既有 `@ai-visualize` 元件播放時仍可互動

### 整批

- [x] `npx tsc --noEmit && npx astro build` 通過
- [x] Dashboard 的「已生成簡報」統計仍正確（Task 30 成果未被破壞）
- [x] 筆記頁功能列的「簡報」入口 / 「生成簡報」鈕行為不變（Task 29 成果未被破壞）
- [x] viewer 模式（`npx notecraftapp`）至少驗一份 deck 可正常生成與播放
- [x] Task 36 的 few-shot 指標改回指向 `role-responsibility-rr.deck.tsx`（v0.2 形態）

## 後續（不在本 Task）

- audit **C-1**：把 palette validator 收成 `scripts/validate-deck-palette.mjs` 並掛 pre-push
- audit **C-2**：`decklib` 版型庫頁加「反樣式對照」欄
- PRD §8.1 補 Phase 4.13 條目 + 文件版本 bump（可用 `/bump-prd`）

## 風險 / 備註

- 若產出品質不如預期，**修的是 [Task 36](task-36-present-skill-agents-v02.md) 的 SKILL 文字或
  [Task 34](task-34-deck-block-components.md) 的 block API，不是回去加型別限制** ——
  那等於退回 v0.1，把這整批的目的抵銷掉。
- 3 份 deck 的原始筆記若內容偏薄（例如 `專案-vs-產品`），可能撐不起 200–800 字的內容頁密度。
  這種情況是**筆記的問題不是 deck 的問題**，可接受該份頁數少、密度低，在回報中說明即可。

---

## 實作記錄（2026-07-31，已完成）

### 執行方式：真的走了 pipeline

依作者裁定，**委派 subagent** 而非我自己寫：3 次 `present-planner`（並行）→ 3 次 `slide-generator`（序列，
避免並行 `astro build` 撞 `dist/`）。subagent 只讀 SKILL、沒有本輪改制的對話上下文 ——
這才是 [Task 36](task-36-present-skill-agents-v02.md) 文字是否自足的真實檢驗。

三份 deck 全部 **Attempts: 1**（一次過 tsc + build，無重試）。

| deck | 頁數 | 版型分布 | 用到的 block |
| --- | --- | --- | --- |
| `role-responsibility-rr` | 11 | cover 1 / section 3 / custom 2 / full-visual 3 / quote 1 / closing 1 | Compare, Rows, Kpi |
| `專案-vs-產品` | 12 | cover 1 / section 3 / custom 3 / full-visual 3 / quote 1 / closing 1 | Compare ×2, Cards, Table |
| `trendlink-…提案草稿` | 13 | cover 1 / section 4 / custom 3（含 1 個 `chrome:false`）/ full-visual 3 / quote 1 / closing 1 | Cards, Kpi, Compare |

### SKILL 通過的證據（不是我幫忙補的）

planner 與 generator 在**沒有被特別提醒**的情況下做對了這些：

- **treatment 判定**：三份都先判內部備忘 vs 對外提案再定密度。
- **編號規則**：`num` 只給真實章節序列（同一部分的多頁共用同一個 `num`），block 內部平行清單一律不編號；
  `專案-vs-產品` 的第 10 頁小結表刻意不給 `num`（「不是第四個章節」）。
- **狀態色**：提案 deck 的 `<Kpi>` 2/5/1 三格用 `good`/`warning`/`critical`，並在規劃書寫明
  「這是從筆記『Vital CRM 問題釐清』8 題 Q&A **逐題數出來的**，不是湊的裝飾數字」。
- **識別色不濫用**：提案 deck 的 5 張模組卡**刻意不給 tone**，理由寫得很準：
  「五個模組是平行清單，不是好壞或排名，避免顏色暗示不存在的語意」。
- **抓到我沒注意的型別限制**：planner 自己發現 **`FullVisualSlide` 沒有 `chrome` 欄位**，
  所以「沿用既有元件的滿版頁」只能走 `custom` + `chrome: false`，並在規劃書寫明理由。
- generator 自行修正規劃書的一個型別錯誤（`Pill.tone` 只接受 `SeriesTone`，規劃書寫了 `"good"`）。

### 截圖驗證抓到的問題（這一層 subagent 做不到）

`slide-generator` 的 `tools:` 沒有瀏覽器工具 → **截圖那層由主 Agent 執行**。
這是 Task 36 寫進 agent 檔時沒考慮到的落差，已在本輪以「主 Agent 補做」處理（後續處置見下）。

| # | 問題 | 處置 |
| --- | --- | --- |
| 1 | 提案 deck 第 9 頁（`chrome:false` 滿版架構圖）**溢出 378px**，底部被裁 | 新增原子 **`<FitToArea>`**（契約 §5.3.2），等比縮到可用區內 |
| 2 | 同頁在縮覽側欄掛載真元件，產生 **`<button>` 嵌 `<button>`** 的無效 HTML | 該頁改為 `live === false` 時回占位；規則已寫進 SKILL 與 slide-generator |
| 3 | `<Compare>` 的 k-v 標籤欄 108px 太窄，「派案／諮詢／報價」斷在詞中間 | 加寬到 128px（容得下 8 個 CJK 字） |
| 4 | `role-responsibility-rr` 第 3 頁只有 3 列的 `<Compare>` 撐滿整頁，下半空白偏多 | **未改內容**（筆記本身就只有 3 個角色）；改為在 SKILL 加規則：單一 block 撐滿整頁時項數要接近上限，否則加第二個 block 或改用 `full-visual` |

問題 1 是最有價值的發現：**既有筆記元件本來就比投影片高**是結構性問題，不是這一份 deck 的個案。

### 逐項驗收

- 版型全在 6 種內；`custom` 頁佔內容頁多數 ✓
- 每個 `custom` 頁都 import 了 block（沒有一頁是全自己畫）✓ —— 表示 [Task 34](task-34-deck-block-components.md) 的 API 堪用
- 密度：多數頁在 200–800 字；例外是上表第 4 項那一頁 ✓（已記錄）
- 三份 deck 的 import **全在白名單內**（`@/lib/decks`、`@/components/deck/*`、`@/components/generated/<id>`），
  `grep` 無硬編色碼、無 `rgba(`、無字面字級、無 emoji ✓
- 編號無裝飾性 01/02/03 ✓
- 亮 / 暗兩主題逐頁確認 ✓
- **溢出**：載入一次即涵蓋全部頁（縮覽側欄會渲染每一頁、偵測器都跑過）——
  修正後三份 deck **零 `OVERFLOW` 角標、零 console 溢出警告**；
  所有 `SlideChrome` 的 `padTop + Σ區塊高 + padBottom` 皆**剛好 900** ✓
- `full-visual` 的既有元件播放時仍可互動 ✓
- `npx tsc --noEmit` = 18（既有基準線）；`npx astro build` 通過（40 頁）✓
- Dashboard「已生成簡報」= **3 / 26**，正確 ✓
- 三份筆記頁的功能列都有 `/present/<slug>` 入口（以 `dist/` 產物驗，非 dev server）✓

### viewer 模式：Task 36 標的風險已解除

Task 36 留了一條「**尚未實測**」：viewer 模式下位於 `.notecraft/components/` 的 deck 檔，
能否 import 隨 package 出貨的 `@/components/deck/blocks`。

已實測：把 `tmp/notecraft-test/.notecraft/components/test001.deck.tsx`（原本還是 v0.1 形態、
用了已退役的 `bullets`）改寫為 v0.2，**專門讓它 import `blocks` / `scale` / `theme`**，
以 `viewer-poc`（`NOTECRAFT_NOTES_DIR=tmp/notecraft-test`，port 4330）啟動並開 `/present/test001`：

**通過** —— `<Rows>` 4 列、`<Kpi>` 2 格、chrome 全部正常渲染，console 無溢出警告。
契約 §11.4 的判定正確，原子層確實隨 package 走。

### 一個環境觀察（非程式問題）

主專案的 dev server（`deck-dev`）在本輪出現「`/present/<真實 slug>` 為 200，但
`/notes/<真實 slug>` 為 404、`/notes/hello-world` 反而 200」的現象 ——
該 server process 的 `NOTECRAFT_NOTES_DIR` 指向了 viewer fixture（我的 shell 內該變數是空的，
推測是 server 啟動時繼承到別處的環境）。
**deck 本身不受影響**（deck glob 走 root-relative 路徑，抓到的是主專案的三份）。
筆記頁與 Dashboard 的驗收因此改用 `dist/` 產物驗證，而非 dev server。

### 後續（不在本 Task）

- ~~**`slide-generator` 拿不到瀏覽器工具**~~ —— **2026-07-31 已處理**：採後者方案，把截圖層改寫進
  SKILL 的工作流程。詳見下方〈截圖層歸屬修正〉。
- audit **C-1**：把 palette validator 收成 `scripts/validate-deck-palette.mjs` 並掛 pre-push
- audit **C-2**：`decklib` 版型庫頁加「反樣式對照」欄
- PRD §8.1 補 Phase 4.13 條目 + 文件版本 bump（可用 `/bump-prd`）

---

## 截圖層歸屬修正（2026-07-31）

Task 37 執行時發現：`slide-generator` 的 `tools:` 只有 Read / Write / Edit / Bash / Glob / Grep，
**沒有瀏覽器 / preview 工具**，所以 [Task 36](task-36-present-skill-agents-v02.md) 寫進它 agent 檔的
「逐頁截圖」它根本做不到 —— 那一輪是主 Agent 補做的。

已改為「**截圖層歸主 Agent**」，理由：preview 是 session 級資源，本來就該由主 Agent 持有；
把瀏覽器工具塞進每個 subagent 只會讓資源競爭與工具清單失控。

### 改了什麼

| 檔案 | 改動 |
| --- | --- |
| `content-present/SKILL.md`〈工作流程〉 | 拆成 5 步：step 3 委派 generator 只跑第 1 層；**step 4 主 Agent 自己做第 2、3 層**；step 5 回報。並要求委派時告知 Node ^22 的 PATH 與 tsc 基準線數字（Task 37 實測這兩件事不講，subagent 會卡住） |
| `content-present/SKILL.md`〈驗證〉 | 改為**分工表**（哪一層誰做）+〈主 Agent 的第 2、3 層怎麼做〉操作步驟 |
| `slide-generator.md` 驗證段 | 「三層」→「**你只做第 1 層**」；明寫「不要嘗試截圖，你沒有那些工具」；改成**回報中標出需要重點看的頁**（最密的頁、block 最多的頁、嵌入既有元件的頁） |
| `slide-generator.md` 輸出格式 | 成功樣板的「逐頁截圖 11/11」→「建議主 Agent 重點看的頁」；失敗樣板移除「截圖」層 |
| `sync-skill-template.mjs` 的 `VALIDATION_SG_VIEWER` | viewer 版同步改為「只做 rebuild 這一層」 |

### 寫進 SKILL 的兩個操作訣竅（Task 37 實測得出）

1. **一次載入就涵蓋所有頁** —— 縮覽側欄會渲染每一張 slide（`live: false`），溢出偵測器對每一頁都跑過，
   所以看一次 console 就能收集全部警告，不必逐頁點過去。
2. **`scrollHeight` 不要再除以 scale** —— 它是 1600×900 座標系內的未縮放 px（縮放是 `transform`，
   不影響 layout 度量）。Task 37 執行中我自己踩過這個坑，得到過一次假的「溢出 141px」。

另附一個可選的機器檢查：量每個 `SlideChrome` 的 `padTop + Σ 非絕對定位子區塊高 + padBottom`，
**應該剛好等於 900** —— 比目視可靠。

### 驗證

`npm run sync-skill` 已跑，主專案版與 viewer 版都更新。
機器檢查：`slide-generator`（兩版）**已無任何要它自己截圖的句子**；
`content-present/SKILL.md`（兩版）都含分工表與主 Agent 操作步驟。
