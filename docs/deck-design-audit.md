# Deck 設計原則對照：artifact-design × dataviz → content-present

> **狀態**：分析文件，未改任何程式碼。
> **目的**：把 Anthropic 兩顆設計 skill（`artifact-design`、`dataviz`）逐條對照 NoteCraft 現況，
> 判斷哪些該回填進 `content-present`。
> **前置**：結構層（版型／區塊／密度）已由 [deck-slide-contract.md](deck-slide-contract.md) v0.1 盤點完畢，
> 本文**不重複**那一層，只處理它沒覆蓋的設計工藝與資料視覺化。
> **驗證素材**：`2026-07-01 內部客戶與業務流程整合系統提案`（6 頁）、
> `2026-06 月會R&D團隊報告`（11 頁）、`2025 年度成果報告`（14 頁，僅取結構原子）。

---

## 0. 一句話結論

兩顆 skill 共 30 餘條原則中，**只有 11 條該進 `content-present`**；其餘 13 條的正確落點是
`src/components/deck/` 或 `tokens.css`，4 條不適用。把它們全塞進 SKILL.md 會讓 AI 每次生成
都要重新處理應該由系統一次性決定的事 —— 這正好違反現有「deck 檔是純資料」的契約。

**落點分流（本文的核心）**

| 代號 | 落點 | 性質 |
| --- | --- | --- |
| **(a)** | `.claude/skills/content-present/SKILL.md`、`present-planner.md`、`slide-generator.md` | AI **每次**生成都要重新判斷的規則 |
| **(b)** | `src/components/deck/`（`slideLayouts.tsx` / `theme.ts` / `SlideFrame.tsx`） | **一次性**實作，寫死即永久生效 |
| **(c)** | `src/styles/tokens.css`、`trendlink-design` | 設計系統本身缺的 token |

---

## 1. 先量化：三份簡報的「設計感 + 內容豐富」到底是什麼

要對齊的目標若只說「有設計感」無法執行。以下是從 pptx 逐 shape 解出來的數字。

### 1.1 密度

| | 頁數 | 內容頁 shape 數 | 內容頁字數 | 內容頁 icon/圖 |
| --- | --- | --- | --- | --- |
| 提案 | 6 | 87–173 | 218–691 | 15–28 |
| 月會 | 11 | 79–133 | 248–779 | 0–29 |
| 月會**章節頁** | 3 | **5** | **41–54** | 0 |

**關鍵**：這不是「一頁一重點」，而是**一頁一個完整論證**。提案 P2 一頁同時放
「Excel→Notion→自建三段演進」＋「Notion 五大痛點（各含標題／影響／細描述）」＋「底部收斂結論」＋「右上 pill」，
單頁 87 個 shape。

而章節頁只有 3 個文字（一個 195pt 的「01」）。**節奏來自密度的極端對比**，不是每頁都塞滿。

> 現況 `content-present/SKILL.md` 第 3 條敘事原則寫的是「**一頁一重點**；每頁只講一件事」
> —— 這條規則直接把 deck 鎖在對照目標的下限。這是**最該回填的一條**（見 §4 A-1）。

### 1.2 字級：靠字級建立層級，不靠顏色

- 提案字級階梯：`51 / 45 / 38 / 30 / 28 / 27 / 26 / 23 / 22 / 19 / 18 / 17 / 16 / 15 / 14 / 13 / 12`
- 月會字級階梯：`195 / 69 / 57 / 54 / 48 / 44 / 38 / 35 / 32 / 30 / 28 / 24 / 22 / 21 / 20 / 18`
- 字級跨度達 **16 倍**（12pt → 195pt）
- 字族只有 **1 個**（Arial，`微軟正黑體` 僅 1–2 次 fallback）

對照現況：`slideLayouts.tsx` 用了 **19 個彼此無關係的一次性字級**
（18/19/20/21/22/24/25/26/28/30/32/34/36/40/62/92/116/320/460px），沒有階梯、沒有具名常數。
`artifact-design` 的「set a type scale and stay on it」在此**明確未達成**。

### 1.3 色彩配比：六成是墨色

提案全簡報字色出現次數（前 14 色）換算：

| 類別 | 占比 | 色值 |
| --- | --- | --- |
| 中性墨色 4 階 | **~60%** | `#161c28` `#3a4456` `#6c798e` `#9aa6b8` |
| 反白 | ~12% | `#ffffff` |
| 品牌藍 | ~11% | `#1b4f9c` |
| 橘系 | ~10% | `#a04f15` `#c7641a` `#ed9b26` |
| 語意色（綠／紅／金） | **~9%** | `#2e9e6b` `#d64545` `#a08a4a` |

這正好是 `artifact-design` 的「**spend your boldness in one place, keep everything around it quiet**」。
兩份 2026 簡報用的色值與 `tokens.css` 幾乎逐位相同 —— 色票層已經對齊，不需要動。

---

## 2. artifact-design 對照表

| # | 原則 | NoteCraft 現況 | 判定 | 落點 |
| --- | --- | --- | --- | --- |
| 1 | **Treatment calibration**：先讀需求，決定該給「實用」還是「編輯級」處理 | 無此概念，8 版型一體適用 | ✅ 回填 | (a) |
| 2 | **Honor what's already there**：precedence = 使用者的話 > 專案系統 > 自己的選擇 | 已實質符合（樣式全歸系統元件） | ✅ 明寫 | (a) |
| 3 | **Ground it in the subject**：不用 lorem，用真實內容 | 已符合（來源是真筆記） | ⏭ 已達成 | — |
| 4 | **Set a type scale and stay on it** | 19 個一次性字級，無階梯 | ✅ 修 | **(b)** |
| 5 | **`text-wrap: balance` on headings** | 0 處使用 | ✅ 修 | **(b)** |
| 6 | **Uppercase label 加 letter-spacing** | 已做，但用了 `.3em`/`.26em`/`.1em` 三種不一致值 | ✅ 收斂 | **(b)** |
| 7 | **Choose neutrals, don't default**：中性色帶一點主色偏 | `#3a4456` `#6c798e` 已帶藍偏 | ⏭ 已達成 | — |
| 8 | **Design both themes at token level** | `DKT` 已做 light/dark token 對照 | ⚠️ 半達成 | **(c)** — status 色缺暗色階，見 §3.2 |
| 9 | **Layout via flex/grid + gap，不用逐元素 margin** | 1600×900 絕對定位座標系 | ❌ 不適用 | — |
| 10 | **`tabular-nums` 只在數字需要縱向對齊處** | 0 處使用；`table`/`kpi` block 需要 | ✅ 修 | **(b)** |
| 11 | **Structure is information**：編號／eyebrow／分隔線必須編碼真實資訊，不當裝飾 | `section.num`、`RecapItem.n`、`CardItem.n` 目前是純裝飾編號 | ✅ **強烈回填** | (a) |
| 12 | **避免 AI 味**：rounded card + accent rail + 01/02/03 + 全部居中 | 現有 8 版型幾乎全中 | ✅ 回填為檢查表 | (a) + (b) |
| 13 | **Copy 是設計材料**：主動語態、用讀者認得的詞、具體勝過聰明 | `present-planner` 只規定「精簡」「不用 emoji」 | ✅ 回填 | (a) |
| 14 | **`prefers-reduced-motion` + 可見 focus 狀態** | deck 元件 0 處處理 | ✅ 修 | **(b)** |
| 15 | **UI 不是文件**：摘要先於細節、狀態編碼進形狀（pill／chip／severity stripe） | contract 已規劃 `pill`/`badge`/`tone` | ⏭ 結構層已覆蓋 | — |
| 16 | **@font-face inline data URI**（Artifact CSP 限制） | 本專案是 Astro 站台，自有字型策略 | ❌ 不適用 | — |
| 17 | **Editorial：取一個真實的美學風險** | deck 有既定設計語言，不該每篇即興 | ❌ 不適用 | — |

---

## 3. dataviz 對照表

### 3.1 逐條

| # | 原則 | NoteCraft 現況 | 判定 | 落點 |
| --- | --- | --- | --- | --- |
| 1 | **先選形式，顏色最後**（六步程序） | `present-planner` 對 viz 完全無選型指引 | ✅ 回填 | (a) |
| 2 | **有時答案不是圖表**：單一數字→stat tile，禁單柱長條圖／2 片圓餅 | contract 的 `kpi` block 正是 stat tile，但無使用規則 | ✅ 回填 | (a) |
| 3 | **狀態色是保留色，絕不當第 4 個系列色；且必附 icon + label** | contract §2 把 `Tone` 定為 `blue\|orange\|green\|red\|muted`，識別色與狀態色混成同一 union | ✅ **最高優先**，見 §3.2 | (a) + (c) |
| 4 | **絕不雙軸**（兩個 y 軸） | 無規則 | ✅ 回填 | (a) |
| 5 | **sequential = 單色 light→dark；diverging = 兩色 + 灰中點；不用彩虹** | `table` block 的支援程度矩陣（提案 P3）正是 sequential 用途 | ✅ 回填 | (a) |
| 6 | **≥2 系列必有 legend；≤4 系列同時直接標註** | contract 已有 `legend` slot | ⏭ 結構層已覆蓋，補規則 | (a) |
| 7 | **文字穿文字 token，不穿系列色** | `theme.ts` 有 `ink`/`body`/`muted` | ⏭ 已達成，明寫 | (a) |
| 8 | **Tooltip 是加分，不能是唯一途徑** | 無規則 | ✅ **升級版**回填，見 §3.3 | (a) |
| 9 | **>7 個帶意義的色類別 → 改用表格** | contract §7 密度上限已同向 | ⏭ 已達成 | — |
| 10 | **類別色固定順序、不循環；第 9 系列不生成新色** | 無規則（deck 只有 2 個識別色，天然不會到 9） | ⏭ 不會發生 | — |
| 11 | **最後一步：render it and look at it** | `slide-generator` 只跑 `tsc` + `astro build`，**從未看過畫面** | ✅ **強烈回填**，見 §3.4 | (a) |
| 12 | **跑 validator，不要用眼睛判斷色盲安全** | 從未跑過 | ✅ 回填為 CI／腳本 | (a) + (c) |
| 13 | filters row / skeleton / table-view twin | 簡報不是 dashboard | ❌ 不適用（a11y 精神以 `footnotes` 替代） | — |
| 14 | 換用 dataviz 預設色票 | skill 自己說「swap values for your brand's」 | ❌ 不適用，用 trendlink 色票 | — |

### 3.2 已驗證的問題：`Tone` 五色混用（實測數據）

用 dataviz 的 validator 跑 contract §2 提議的 5 色 `Tone`。指令（`<dataviz>` = skill base dir，
腳本需在 `type: module` 環境下執行）：

```bash
node validate_palette.js "#1b4f9c,#e37b24,#2e9e6b,#d64545,#9aa6b8" --mode light --surface "#ffffff" --pairs all
```

**A. 五色當識別色用（light，投影片底 `#ffffff`）**

```
[PASS] Lightness band         all 5 inside L 0.43–0.77
[FAIL] Chroma floor           below floor (reads gray): #9aa6b8 (0.03)
[FAIL] CVD separation         worst #d64545↔#2e9e6b ΔE 5.4 (deutan) · tritan 10.3
[FAIL] Normal-vision floor    worst #d64545↔#e37b24 ΔE 12.8 — below 15
[WARN] Contrast vs surface    #e37b24 2.95 · #9aa6b8 2.46 （< 3:1）
→ FAILED
```

- `#9aa6b8` 的 chroma FAIL 是**設計意圖**（`muted` 本來就該讀成灰），可忽略。
- **紅↔綠 ΔE 5.4（deutan）**：紅綠色盲讀者分不出來 —— 教科書級失誤。
- **紅↔橘 ΔE 12.8（正常視覺）< 15**：這是 hard FAIL，**全彩視覺的人也分不出來**，
  加註標籤也不能豁免。

**B. 同一組色搬到暗色投影片（dark，投影片底 `#262e3d`）**

```
[FAIL] Lightness band     outside band: #7ba6da(0.714) #f2b955(0.819) #9aa6b8(0.722)
[FAIL] Chroma floor       #7ba6da(0.09) #9aa6b8(0.03)
[FAIL] CVD separation     worst #9aa6b8↔#7ba6da ΔE 5.3 (protan)
[FAIL] Normal-vision floor worst #9aa6b8↔#7ba6da ΔE 6.1 — below 15
[PASS] Contrast vs surface all 5 >= 3:1
```

暗色模式下 **`tone:"blue"` 與 `tone:"muted"` 幾乎無法區分（ΔE 6.1）** —— 而這兩者在
`bullets`/`rows` 是真實存在的語意差異。

**C. 對照：只用現有 blue + orange 二色**

```
light  → ALL CHECKS PASS   （ΔE 38.1 normal / 29.7 protan）
dark   → CVD 與對比 PASS，僅 lightness band 與 chroma floor FAIL（可調階解決）
```

**D. status 色的暗色階根本不存在**

`tokens.css` 只有 `--success-500` / `--warning-500` / `--danger-500`，無 300 階。
實測在 `#262e3d`（暗色投影片底）上的對比：

| token | 值 | on light | on dark `#262e3d` |
| --- | --- | --- | --- |
| `success-500` | `#2e9e6b` | 3.38 | 4.04 |
| `warning-500` | `#e3a008` | 2.26 | 6.04 |
| `danger-500` | `#d64545` | 4.38 | **3.11** ⚠️ |
| `blue-700` | `#1b4f9c` | 7.94 | **1.72** ❌ |

候選暗色階（實測通過）：`#5cc494`（6.35）、`#f2c14e`（8.12）、`#ef8b8b`（5.67）。

**結論與處置**

1. `Tone` **拆成兩個型別**，讓型別系統擋住混用：
   ```ts
   /** 識別色：只表示「這是 A 還是 B」，validator PASS */
   export type SeriesTone = "blue" | "orange" | "muted";
   /** 狀態色：只表示 好／注意／壞，必須同時附 icon + 文字標籤 */
   export type StatusTone = "good" | "warning" | "critical";
   ```
2. 熱度／支援程度矩陣（提案 P3）用 **blue 單色階 light→dark**，不用綠／黃／紅三色。
3. `tokens.css` 補 `--success-300` / `--warning-300` / `--danger-300`（落點 (c)）。

### 3.3 簡報語境對 dataviz 的一處覆寫（重要）

dataviz 第 5 步是「**預設就加 hover 層**（crosshair + tooltip）」。
**簡報播放時沒有滑鼠可懸停** —— 投影中的圖必須靠直接標註讀懂。

所以規則要**升級**而非照抄：

> `viz` / `full-visual` 頁上的圖表，**每個要讀的值都必須直接標註或有 legend**；
> tooltip 只是檢視模式的加分項，**不能是取得數值的唯一途徑**。

這與 dataviz 的反樣式「tooltip as the only way to read a value」同向，但在簡報語境是**硬要求**。

### 3.4 `slide-generator` 缺最後一步：實際看一眼

- dataviz 第 7 步：「**Render it and look at it** —— validator 只檢查顏色，不檢查版面。
  開啟或截圖，用眼睛檢查標籤碰撞、幾何、溢出。」
- contract §7 自己承認：「1600×900 是**固定座標系**，內容溢出**不會報錯、只會被裁掉**。」
- 現況 `slide-generator` 的驗證只有 `tsc --noEmit` + `astro build` —— 這兩者**永遠不會**發現被裁掉的內容。

**回填**：在 `slide-generator` 驗證步驟加一輪視覺檢查 —— `preview_start` 開 dev server、
導到 `/present/<slug>`、逐頁截圖檢查溢出與碰撞。這也順帶檢驗 §2-#12 的「AI 味」檢查表。

---

## 4. 建議回填清單

### P0 — 只改 SKILL / agent，零實作成本

| | 內容 | 檔案 |
| --- | --- | --- |
| **A-1** | 「一頁一重點」→ 改為「**一頁一個完整論證**」。附 §1.1 的密度基準（內容頁 200–800 字、2–3 個 block）與「章節頁刻意留白」的節奏規則 | `SKILL.md` §敘事切分 |
| **A-2** | **Treatment calibration**：先判定這篇是「內部備忘」還是「對外提案」，決定密度、freestyle 配額、章節頁數量 | `SKILL.md`、`present-planner.md` |
| **A-3** | **編號必須編碼真實資訊**：`num` / `RecapItem.n` / `CardItem.n` 只在內容真的是序列（流程、時序、排名）時才給；平行清單不編號 | `SKILL.md`、`present-planner.md` |
| **A-4** | **AI 味檢查表**：不要每個 block 都 rounded card + accent rail、不要全部居中、不要 01/02/03 裝飾、不要 emoji（後者已有） | `SKILL.md` |
| **A-5** | **viz 選型表**（濃縮 dataviz）：單一數字→`kpi`；>7 類→`table`；一個系列是重點→emphasis（一色 + 灰）；量級→單色階；禁雙軸、禁單柱長條圖、禁 2 片圓餅 | `SKILL.md` 新增「圖表選型」節 |
| **A-6** | **狀態色 ≠ 識別色**：`green`/`red` 只在語意是好／壞時使用，且必附 icon + 文字標籤；矩陣熱度用 blue 單色階（附 §3.2 實測數據當理由） | `SKILL.md`、`present-planner.md` |
| **A-7** | **投影片上的圖必須直接標註**，tooltip 不得為唯一途徑（§3.3） | `SKILL.md` |
| **A-8** | **文案規則**：主動語態、用讀者認得的詞、具體勝過聰明、標題 ≤ 1 行 | `present-planner.md` |
| **A-9** | **驗證加視覺檢查**：截圖 `/present/<slug>` 逐頁檢查溢出／碰撞（§3.4） | `slide-generator.md` |

### P1 — 需動 `src/components/deck/` 或 `tokens.css`

| | 內容 | 檔案 |
| --- | --- | --- |
| **B-1** | 收斂字級為具名階梯（建議 9 級，對齊 §1.2 的 pptx 階梯），取代 19 個一次性值 | `slideLayouts.tsx` |
| **B-2** | 標題加 `text-wrap: balance`；`letter-spacing` 三種值收斂為 2 個 token | `slideLayouts.tsx` |
| **B-3** | `table` / `kpi` 的縱向對齊數字加 `font-variant-numeric: tabular-nums`；**hero 大數字不要加**（dataviz 反樣式：等寬數字讓 `121` 在顯示級字號下顯得鬆散） | `slideLayouts.tsx` |
| **B-4** | 補 `--success-300` / `--warning-300` / `--danger-300`，接進 `DKT.dark`（§3.2-D 已給實測通過的候選值） | `tokens.css`、`theme.ts` |
| **B-5** | `prefers-reduced-motion` + 可見 focus 狀態 | `SlideFrame.tsx`、播放頁 |
| **B-6** | `Tone` 拆為 `SeriesTone` / `StatusTone`（與 contract 的 discriminated union 重構同批做） | `decks.ts` |

### P2 — 可選

| | 內容 |
| --- | --- |
| **C-1** | 把 validator 收進 `scripts/validate-deck-palette.mjs`，pre-push 一起跑 |
| **C-2** | `decklib` 版型庫頁加上「反樣式對照」欄 —— 每個版型旁列它最容易被誤用的方式 |

### 明確不回填（附理由）

| 項目 | 理由 |
| --- | --- |
| `@font-face` inline data URI | 那是 Artifact CSP 的限制，本專案是 Astro 站台 |
| Editorial「取一個美學風險」/ hero as thesis | deck 有既定設計語言，逐篇即興會破壞一致性 |
| dataviz 預設色票 | skill 自己說 swap for your brand's；trendlink 色票已驗證通過（§3.2-C） |
| filters row / skeleton / table-view twin | 簡報不是 dashboard；a11y 需求以 `footnotes` + 直接標註滿足 |
| flex/grid `gap` 取代 margin | 1600×900 絕對定位座標系不適用 |

---

## 5. 與 deck-slide-contract.md 的關係

| 層 | 由誰處理 |
| --- | --- |
| 結構（版型／區塊／slot／密度上限） | `deck-slide-contract.md` v0.1 —— 已完成 |
| 設計工藝（字級階梯、tabular-nums、reduced-motion、AI 味） | 本文 §2 → P1 (b) |
| 資料視覺化（選型、識別色 vs 狀態色、直接標註） | 本文 §3 → P0 (a) |
| 敘事密度（一頁一論證 vs 一頁一重點） | 本文 §1.1 → P0 A-1，**與 contract 的 block 上限互補** |

兩份文件的 P1 項目（B-6 `Tone` 拆分）建議與 contract §9 的 discriminated union 重構**同批進行**，
避免 `decks.ts` 改兩次。
