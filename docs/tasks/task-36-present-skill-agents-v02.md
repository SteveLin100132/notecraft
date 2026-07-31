# Task 36 — content-present Skill + 兩個 agent 改寫（含截圖驗證）

> 對應 [deck-slide-contract.md](../deck-slide-contract.md) v0.2 §7.1、§7.2、§8、§11.2；
> [deck-design-audit.md](../deck-design-audit.md) A-1～A-9。
> 依賴 [Task 33](task-33-slide-chrome-fixed-layouts.md)、[Task 34](task-34-deck-block-components.md)、
> [Task 35](task-35-custom-slide-frame.md)（API 需先穩定）。

## 範圍

| 檔案 | 改動幅度 |
| --- | --- |
| [.claude/skills/content-present/SKILL.md](../../.claude/skills/content-present/SKILL.md) | 大改（版型詞彙、核心契約句、密度、圖表選型） |
| [.claude/agents/present-planner.md](../../.claude/agents/present-planner.md) | 中改（規劃書格式 + 文案與編號規則） |
| [.claude/agents/slide-generator.md](../../.claude/agents/slide-generator.md) | **最大** —— 從「只寫資料」變成「寫元件」 |
| `skill-template/` | 由 `scripts/sync-skill-template.mjs` 重新產生 |

**`note-scanner` / `visualize-planner` / `component-generator` / `mdx-writer` 零改動。**

## SKILL.md 的改動

### 1. 核心契約句必須改（最重要）

現況第 24 行寫的是「**deck 檔不寫任何顏色 / className / style / Tailwind**」。
v0.2 起這句只對 5 個固定版型的頁成立。改為：

> 5 個固定版型（`cover`/`section`/`quote`/`closing`/`full-visual`）的頁是**純資料**；
> `custom` 頁是**元件**，可以寫樣式，但必須用原子層（`DS`/`DGAP`/`dkt()`/6 個 block），
> **不可硬編色碼、不可自己畫 chrome**。

### 2. 版型詞彙表改寫

6 種 layout（契約 §6）+ 6 個 block 元件（§5.3）+ import 白名單（§5.4）+ `custom` 與
`full-visual` 的分界（§6.1）。

### 3. 敘事密度改寫（audit A-1）

現況第 3 條寫「**一頁一重點**；每頁只講一件事」—— 這條把 deck 鎖在對齊目標的下限，改為：

| 頁型 | 字數 | 主要區塊 |
| --- | --- | --- |
| `custom` 內容頁 | 200–800 字 | 2–3 個 |
| `section` 章節頁 | 40–60 字 | —（刻意留白） |

並寫明「**一頁一個完整論證**」與「節奏來自密度的極端對比」（對齊目標的實測數據見 audit §1.1）。

### 4. 新增「圖表選型」節（audit A-5、A-6、A-7）

- 單一數字 → `<Kpi>`，**不要**做成單柱長條圖或 2 片圓餅
- >7 個帶意義的色類別 → `<Table>`
- 一個系列是重點、其餘是背景 → emphasis（一色 + 灰），不要八色類別
- 量級（熱度 / 支援程度矩陣）→ **單色階 light→dark**，不要綠黃紅混色
- **禁雙軸**（兩個 y 軸）
- 狀態色 ≠ 識別色，狀態色必附 icon + 文字標籤
- **投影片上的圖必須直接標註或有 legend；tooltip 不得是取得數值的唯一途徑**
  （簡報播放時沒有滑鼠可懸停 —— 這是 dataviz 預設規則在簡報語境的**升級**，見契約 §3.3 對應段落）

### 5. 新增「AI 味檢查表」（audit A-4）+ 編號規則（audit A-3）

- 不要每個區塊都 rounded card + accent rail、不要全部居中、不要 01/02/03 裝飾編號
- **編號只在內容真的是序列時才給**（流程、時序、排名）；平行清單不編號
- 禁 emoji（既有規則，保留）

## present-planner 的改動

1. 規劃書每個 `custom` 頁要多一欄：**版面構想** —— 用哪些 block、哪些部分自己畫、為什麼。
2. 加 audit A-2（treatment calibration）：先判定這篇是「內部備忘」還是「對外提案」，
   決定密度、章節頁數量、要不要 `chrome: false` 的滿版頁。
3. 加 A-3（編號規則）、A-6（狀態色）、A-8（文案：主動語態、用讀者認得的詞、具體勝過聰明、標題 ≤ 1 行）。
4. `chrome: false` 必須在規劃書寫明理由。

## slide-generator 的改動（本 Task 的重點）

### 職責變更

契約 §8.1 廢除 v0.1「freestyle 元件不由 slide-generator 寫、走 component-generator」那條。
理由：一份 8 頁 deck 要來回委派 5–6 次；且 `component-generator` 的產物契約是
「嵌入筆記內文的元件」，尺寸 / chrome / 暗色假設都不同。

### 必要改動

1. **加讀 `trendlink-design`**（現況不讀，因為原本只寫純資料）。
2. **允許寫樣式，但限用原子層**：`DS` / `DTRACK` / `DGAP` / `dkt(dark)` / 6 個 block。
   刪掉現況第 37 行「deck 檔內不寫任何顏色 / style / className / Tailwind / SVG」這條硬禁令，
   改為「不硬編色碼、不自己畫 chrome、不 import 白名單外套件」。
3. **import 白名單放寬**到契約 §5.4（`react`/`motion`/`recharts`/`d3`/`clsx`/`tailwind-merge`/
   `lucide-react` + `@/components/deck/*` + `@/components/generated/<id>` + `@/lib/decks`）。
4. **動畫規則**：`custom` 頁的動畫只在 `live === true` 時啟動；200–400ms ease-out；`useReducedMotion()`。
5. **驗證新增截圖檢查**（audit A-9，契約 §7.2）—— 見下節。
6. 輸出格式的 `Slides:` 欄改為報 6 種 layout 的分布 + 用了哪些 block + 截圖檢查結果。

### 截圖驗證（強制）

現況只跑 `npx tsc --noEmit` + `npx astro build`。這兩者**永遠不會**發現被裁掉的內容
（`SlideFrame` 是 `overflow: hidden` 的固定座標系）。新增：

1. `preview_start` 起 dev server
2. 導到 `/present/<slug>`
3. **逐頁截圖**，檢查裁切、標籤碰撞、疊字、空白過多
4. 一併看 console（Task 35 的 dev 溢出偵測會 `console.warn` 帶頁碼）
5. 有問題 → 修 → 重新截圖。通過前不算完成

**注意兩套驗證**：檔內有 `<!-- BEGIN:validation-sg -->` / `<!-- END:validation-sg -->` 標記，
viewer 模式的驗證段由 `scripts/sync-skill-template.mjs` 替換。viewer 模式下 cwd 只是 md/mdx 資料夾、
**不能**跑 `tsc` / `astro build`，改為觀察 `npx notecraftapp serve` 的背景 rebuild ——
**截圖驗證在 viewer 模式同樣要有**（serve 起來的站台也有 `/present/<slug>`），兩套都要寫。

## 實作步驟

1. 改 SKILL.md（5 個小節，見上）。
2. 改 present-planner.md（規劃書格式 + 4 條規則）。
3. 改 slide-generator.md（6 項 + 兩套截圖驗證段）。
4. 更新 few-shot 指引 —— 現況指向 `role-responsibility-rr.deck.tsx`，
   但它要到 [Task 37](task-37-regenerate-existing-decks.md) 才會是 v0.2 形態。
   **本 Task 先在文字上說明新結構，Task 37 完成後再把 few-shot 指標指回去。**
5. 跑 `node scripts/sync-skill-template.mjs` 重新產生 viewer 版並檢查 diff。

## 驗收

- [x] SKILL.md 的核心契約句已改（不再說「deck 檔不寫任何樣式」）
- [x] 版型詞彙表為 6 種 layout + 6 個 block + import 白名單 + `custom`/`full-visual` 分界
- [x] 密度規則為「一頁一個完整論證」+ 字數基準表（不再是「一頁一重點」）
- [x] 新增「圖表選型」節，含禁雙軸 / 禁單柱長條圖 / 狀態色附 icon / 圖必須直接標註
- [x] 新增 AI 味檢查表與編號規則
- [x] slide-generator 有讀 `trendlink-design`、import 白名單已放寬、動畫規則已寫入
- [x] slide-generator **兩套**（主專案 / viewer）驗證段都含截圖檢查
- [x] `scripts/sync-skill-template.mjs` 跑過，viewer 版 diff 合理
- [x] 舊 deck 檔需重新生成的提醒已寫入（給既有 viewer 使用者）

## 風險 / 備註

- **這是整批風險最高的一個 Task**：v0.1 靠型別與元件保證設計品質，v0.2 有一部分改由
  「SKILL 裡的文字」保證。規則寫得含糊，`custom` 頁就會走鐘。
  寫的時候寧可具體到「用 `DS.h2` 當內容頁主標」，不要只寫「注意字級一致」。
- Task 37 是這些規則的**第一次真實檢驗**。若重新生成的 3 份 deck 品質不如預期，
  回頭改的是本 Task 的文字，不是再加型別限制 —— 那會退回 v0.1。

---

## 實作記錄（2026-07-30，已完成）

### 改動的檔案

| 檔案 | 行數變化 |
| --- | --- |
| `.claude/skills/content-present/SKILL.md` | +231 / −? （近乎重寫） |
| `.claude/agents/present-planner.md` | +56 |
| `.claude/agents/slide-generator.md` | +106 |
| `scripts/sync-skill-template.mjs` | +16 |
| `skill-template/` 三份對應檔 | 由 `npm run sync-skill` 產生 |

### SKILL.md 的關鍵改動

1. **核心契約句改成表格**，不再是一句「deck 檔不寫任何樣式」：
   5 個固定版型的頁 = 純資料；`custom` 頁 = 元件，可寫版面但只能組合原子層。
   並明寫「`custom` 的自由度是『怎麼組合、要不要自己畫』，**不是**『要不要遵守設計系統』」。
2. **新增「原子層」整節** —— `DS`/`DGAP`/`DTRACK`、`dkt(dark)` 的 token 清單、6 個 block 的用途與建議上限、
   **沒做成元件的三件事**（分欄／段落／嵌元件）直接寫 JSX、`CustomSlideProps` 三個欄位的意義。
3. **密度改寫**：「一頁一重點」→「**一頁一個完整論證**」+ 字數表（內容頁 200–800 字／2–3 區塊、章節頁 40–60 字）
   + 「節奏來自密度的極端對比」。
4. **新增「圖表選型」節**：選型對照表 + 六條硬規則（禁雙軸、狀態色是保留色且必附 icon + 文字、
   識別色只有三個、投影片上的圖必須直接標註、≥2 系列必有 legend、文字穿文字 token）。
5. **新增「版面自檢」節**（AI 味檢查表）+ 編號必須編碼真實資訊 + 禁 emoji。
6. **新增「文案」節**：主動語態、讀者認得的詞、具體勝過聰明、標題 ≤ 1 行（約 20 個中文字）。
7. **驗證改為三層**：tsc/build → dev 溢出偵測 → 逐頁截圖，並寫明「`tsc` 與 `astro build` 永遠測不到被裁掉的內容」。

### slide-generator 的關鍵改動

- **加讀 `trendlink-design` SKILL.md**（v0.1 不讀，因為原本只寫純資料）。
- 刪掉「deck 檔內不寫任何顏色 / style / className / Tailwind / SVG」這條硬禁令，
  改為「`custom` 頁可以寫樣式，但只能來自原子層；任何色碼字面值都是錯的」。
- **新增「自我把關」步驟**（跑驗證前必做）：逐項檢查無色碼字面值、無字面字級、
  沒自己畫 chrome、無 emoji、block 未超上限。
- import 白名單改用 `<!-- BEGIN:whitelist -->` 標記（見下）。
- 動畫規則：200–400ms ease-out、`useReducedMotion()`、**`live === false` 時不啟動**。
- 輸出格式改為回報版型分布、用了哪些 block、截圖結果與 console 是否有溢出警告。

### 兩處超出原計畫的改動（都有理由）

1. **白名單改由單一來源注入。** 原計畫沒提，但 `custom` 頁現在會 import 套件，
   而套件白名單的單一來源是 `src/lib/generated-component-whitelist.ts`（8 個套件）。
   已把 `content-present/SKILL.md` 與 `slide-generator.md` 加進 `sync-skill-template.mjs` 的
   `WHITELIST_HOSTS`，跟 content-visualize 用同一份常數 —— 以後加套件只要改常數 + 跑 `npm run sync-skill`。
2. **SKILL 補上 `IconName` 21 個名單，並讓 `DeckIcon` 對未知名稱回 `null`。**
   沒有名單，AI 只能猜；雖然 `IconName` 是聯集、tsc 會擋，但那要浪費一輪修復。
   同時 `DeckIcon` 原本 `const C = MAP[name]; return <C/>` 對 undefined 會讓 React 直接拋錯、整頁掛掉，
   已改為回 `null` + dev warn（型別外的資料路徑的保險）。

### few-shot 指標的誠實處理

原計畫寫「本 Task 先在文字上說明新結構，Task 37 完成後再把 few-shot 指標指回去」。
實際做法更保險：**不寫死檔名**，改為「用 Glob 找 `*.deck.tsx`，挑**含有 `layout: "custom"` 的那份**」，
並明說「並非每份既有 deck 都已是 v0.2 形態；只有固定版型的舊 deck 不要照抄它的頁面組成」。
理由：`role-responsibility-rr.deck.tsx` 現在還是 [Task 31](task-31-deck-type-union-v02.md) 的降級狀態
（9 頁、**零個 custom 頁**），叫它「v0.2 範例」是錯的。
這樣寫在 Task 37 之前之後都成立，也順帶處理 viewer 場景「一份 deck 都沒有」的情況。

### viewer 版（`skill-template/`）

- `sync-skill-template.mjs` 的 `VALIDATION_SG_VIEWER` 已改為**兩層**：(a) 觀察 `serve` 的背景 rebuild、
  (b) **逐頁截圖**（serve 起來的站台同樣有 `/present/<slug>`）+ 看 console 的溢出警告。
- 路徑替換確認正確：`src/components/generated/` → `.notecraft/components/`、
  `@/components/generated/` → `@notes/components/`；而 **`@/components/deck/*` 刻意不替換**
  （原子層隨 package 走，見契約 §11.4）。
- ⚠️ **待 Task 37 驗證的風險**：viewer 模式下，位於 `.notecraft/components/` 的 deck 檔能否 import
  `@/components/deck/blocks`（`@/` 指向 viewer app 的 src）。契約 §11.4 判定無風險，但**尚未實測**。
  Task 37 的「viewer 模式至少驗一份 deck」要專門確認這條。

### 一致性自檢（機器檢查，非人工目視）

- **SKILL 提到的每個匯出都真的存在**：`CustomSlideProps`/`Deck`/`IconName`/`SeriesTone`/`StatusTone`/
  `SlideChromeFields`（`@/lib/decks`）、`DS`/`DGAP`/`DTRACK`（`scale`）、`dkt`（`theme`）、
  6 個 block（`blocks/index.ts`）、`toneColor`/`chromeMetrics`/`FULL_AREA`/`isStatusTone`（`SlideChrome`）——
  以正則逐一比對原始碼，**零缺失**。
- **`IconName` 名單與程式一致**：程式 21 個、SKILL 21 個，缺 0 多 0。
- **無 v0.1 殘留詞彙**：`grep` 三份檔案，`bullets`/`media`/`compare` 版型、`freestyle`、`8 種版型`、
  `deck 是純資料` 皆已不存在；「一頁一重點」只剩兩處**刻意的否定句**。
- 頁數建議（8–14 頁）與密度基準（200–800 / 40–60 字）在 SKILL 與 present-planner 之間一致。
- `npx tsc --noEmit` = 18（既有基準線）；`npx astro build` 通過（40 頁）；
  `DeckIcon` 的 dev warn 未進 prod（`grep dist/` 為空）。

### 這個 Task 的真正檢驗在 Task 37

本文風險段講的事沒有變：v0.1 靠型別與元件保證品質，v0.2 有一部分改由這些文字保證。
上面的檢查只能證明**文件與程式一致、沒有事實錯誤**，不能證明 AI 讀了以後產出的簡報好看。
[Task 37](task-37-regenerate-existing-decks.md) 重新生成 3 份 deck 才是第一次真實檢驗；
產出不如預期時，修的是這裡的文字或 [Task 34](task-34-deck-block-components.md) 的 block API，
**不是回頭加型別限制**。
