# Task 45 — Skill + 兩個 agent 更新、密度上限回填（收尾）

> 對應 [deck-atoms-inventory.md](../deck-atoms-inventory.md) §5 決議 1/4、§6。
> 依賴 **38–44 全部完成**（要回填的數字來自它們的實測）。
> **本 Task 必須最後做。**

## 為什麼要有這一步

新原子寫完了，但 `present-planner` 與 `slide-generator` **不知道它們存在** ——
Skill 與 agent 檔沒更新，AI 就會繼續用舊的 6 個 block 硬拼，或自己寫硬編色碼的 JSX。

契約 §1.2 說得很直白：v0.2 有一部分品質保護是靠 SKILL 的文字，
而**規則不會自己執行**。這個 Task 就是把規則寫進去。

## 範圍

### 1. `content-present/SKILL.md`

| 加什麼 | 內容 |
| --- | --- |
| 原子詞彙表 | 新增的原子逐個列出：用途、典型場景、建議上限。與既有 6 個 block 併成一張表 |
| Chart 的 3 系列硬規則 | §5 決議 1：超過 3 系列**一律**拆 small multiples 或改 `<Table>` 標值；**禁用 tooltip**，數值直接標在圖元上 |
| 重複場景規則（inventory §4.4） | 「多頁在講同一個系統的不同狀態時，優先重用同一個視覺元件並改變其 props，不要每頁畫一張新圖」—— 對應 bullmq p6–p11 的敘事手法 |
| `<TagCloud>` 的使用門檻 | 「只在真的有一組並列、無先後關係的短詞時使用」—— 防止被拿來塞同義詞充版面 |
| 架構圖的處理方式 | 依 [Task 43](task-43-deck-diagram-primitives.md) 的最終決定二選一：用基元組，或一律 `custom` 頁自畫 SVG |

### 2. `present-planner.md`

- 規劃書的「`custom` 頁版面構想」欄要能**指名新原子**。
- **超過 3 系列的量化資料，在規劃階段就要寫成拆頁方案** ——
  不要留給 `slide-generator` 去撞 `<Chart>` 的上限（型別擋不住，只有 dev warn）。
- 判斷「這頁該用 `<Code>` 還是截圖」的準則。

### 3. `slide-generator.md`

- 新原子的 import 路徑與典型用法。
- 密度上限表（見下）。
- **注意檔內有 `<!-- BEGIN:validation-sg -->` 同步標記**，viewer 模式的驗證段由
  `scripts/sync-skill-template.mjs` 替換，**兩套都要改**（契約 §11.2 已踩過一次）。

### 4. 密度上限回填（§5 決議 4）

38–44 各自實測出來的數字，統一填進 SKILL 的密度基準表
（比照契約 §7.1 的 rows ≤ 6 / cards ≤ 6 / stages ≤ 5 / kpi ≤ 5 / table ≤ 6×6）：

| 原子 | 要填的上限 | 來源 Task |
| --- | --- | --- |
| `<Code>` | 最大行數（含註解欄 / 不含，分開填） | 38 |
| `<Annotate>` | 同圖 pin 數、同邊 leader 數 | 39 |
| `<Chart>` | 系列數（已定 3）、單系列資料點數 | 40 |
| `<Terminal>` | 最大行數 | 41 |
| `<TagCloud>` | 標籤數 | 42 |
| `<Stages rail/cycle>` | 節點數 | 42 |
| `<Node>`/`<Connector>` | 單頁節點數、連線數 | 43（若做） |
| `progress.steps` | 步數 | 44 |

**這些數字必須是實測值**，不是估計 —— 決議 4 的理由就是「只有實際渲染在 900px 高度裡才知道」。
各 Task 完成時就該記在自己的實作記錄裡，本 Task 只是彙整。

### 5. `skill-template/` 同步

跑 `scripts/sync-skill-template.mjs` 重新產生。

## 關鍵落地規則

1. **只寫規則，不寫程式碼。** 本 Task 不碰 `src/`。
2. 原子詞彙表要**與既有 6 個 block 併成一張表**，不要分「舊的」「新的」兩張 ——
   對 AI 而言它們地位相同，分兩張只會讓它偏好其中一邊。
3. 每個原子的描述要寫**什麼時候用**，不只是「這是什麼」。
   Task 34 的風險段已經驗證過：API 好不好用決定 AI 會不會繞過它。
4. 密度上限一律標明是**建議值**（v0.2 已無型別層強制），超過時優先切頁。

## 實作步驟

1. 從 38–44 各自的實作記錄蒐集實測上限。
2. 改 `SKILL.md` → `present-planner.md` → `slide-generator.md`（含兩處驗證段）。
3. 跑 `scripts/sync-skill-template.mjs`。
4. **端到端驗證**：挑一篇程式碼密集的技術筆記，跑完整 pipeline 生成簡報，
   看 AI 是否真的用上新原子、上限是否合理。這是本批唯一的真實檢驗。

## 驗收

- [x] SKILL 的原子詞彙表涵蓋全部原子（新舊併為**一張 14 列的表**），每項有「什麼時候用」
- [x] Chart 的 3 系列規則、禁 tooltip 規則已寫入 SKILL（兩處）與 planner
- [x] 重複場景規則（§4.4）已寫入 SKILL 敘事切分原則第 6 條
- [x] 密度上限表已填**實測值**，且標明哪些是硬規則、哪些是建議值
- [x] `slide-generator.md` 的自我把關清單與新增的「新原子最容易寫錯的地方」都已更新
- [x] `scripts/sync-skill-template.mjs` 已跑，`skill-template/` 三個檔同步（含 viewer 版路徑替換與 validation 段替換）
- [x] **端到端生成一份技術筆記的簡報** —— 14 頁一次過，AI 確實用上新原子（見下方端到端驗證記錄）
- [x] `npx tsc --noEmit`（18 = 既有基準線）`&& npx astro build` 通過

## 風險 / 備註

- **本批最大風險與 Task 31–37 那批相同**：原子做得再好，AI 不知道就等於沒有。
  端到端驗證（步驟 4）若發現 AI 還是在自己寫 JSX，
  **要修的是這裡的文字或原子的 API，不是回頭加型別限制**（那等於退回 v0.1）。
- `sync-skill-template.mjs` 的同步標記是既有踩坑點（契約 §11.2 明列）。
  改完務必 diff `skill-template/` 確認兩套一致。
- PRD §8.1 的 Phase 條目與文件版本仍待補（Task 31–37 那批就已欠著），可用 `/bump-prd` 一併處理。

---

## 實作記錄（2026-07-31，已完成）

### 產出

| 檔案 | 改動 |
| --- | --- |
| `.claude/skills/content-present/SKILL.md` | 原子表 6 → **14 個**（新舊併一張，每項有「什麼時候用」）、`<Stages>` 三 variant 子表、`<Chart>` 硬規則段、`<TagCloud>` 使用門檻段、架構圖處理段、敘事原則加「重複場景」第 6 條、圖表選型表加 4 列、密度上限表 |
| `.claude/agents/present-planner.md` | 版面構想可指名 14 個 block、超過 3 系列在規劃階段解決、程式碼 vs 截圖的判準、重複場景、TagCloud 門檻、架構圖自畫；輸出範例加一頁 `<Code>` |
| `.claude/agents/slide-generator.md` | block 清單擴為 14 個（分三類）、新增「新原子最容易寫錯的地方」6 條、自我把關清單補全部上限與 Chart 硬規則 |
| `skill-template/`（3 檔） | `scripts/sync-skill-template.mjs` 重新產生 |

### 六個「最容易寫錯」的點（寫進 slide-generator）

實作 38–42 時**每一個都真的踩過**，所以直接寫成清單而不是散在說明裡：

1. `<Chart>` 的 `height` 是 block 總高（含 heading 與圖例），不要自己先減標題高度 —— 會少算兩次。
2. `<Code>` 的 `highlight` 用**顯示行號**（含 `startLine` 偏移）；同檔分段講解用同一份 `lines` 換 `highlight`。
3. `<Annotate>` 的百分比座標相對**內容區**而非 children 視覺範圍；children 較矮時要 `style={{ flex: "none" }}`。
4. `<Stages variant="rail" alternate>` 的 `size` 要 ≥ 280。
5. `<Mark>` 是**行內元素**，不要當 block 用。
6. 架構圖沒有元件 —— 自己寫 SVG，但**編號與引線要用 `<Annotate>`**，不要自己畫。

### 密度上限（全部來自 38–42 的實測，非估計）

| 原子 | 上限 | 性質 |
| --- | --- | --- |
| `<Rows>` / `<Cards>` | 6 | 建議（Task 34 既有） |
| `<Stages>` linear / rail / cycle | 5 / 6 / 6 | 建議 |
| `<Kpi>` | 5 | 建議（Task 34 既有） |
| `<Table>` | 6×6 | 建議（Task 34 既有） |
| `<Code>` | 16 行（`xs` 19） | 建議 |
| `<Terminal>` | 18 行 | 建議 |
| `<Annotate>` | pins 8、單側 leaders 4 | 建議 |
| `<Chart>` | **系列 3、donut 3 片** | **硬規則**（元件強制） |
| `<Chart variant="bars">` | 8 列 | 建議 |
| `<TagCloud>` | 22 | 建議 |
| `<LogoRow>` | 3 | 建議 |
| `<Mark>` | 一頁 3–4 處 | 規則（無程式強制） |

### 架構圖的處置：明確寫成「自己畫 SVG」

[Task 43](task-43-deck-diagram-primitives.md)（`<Node>`/`<Connector>`/`<GroupBox>` 基元）依作者
2026-07-31 的決定**延後**，所以 SKILL 與兩個 agent 一律寫明：
**系統沒有架構圖元件，需要時在 `custom` 頁自己寫 SVG；要標編號或引線就用 `<Annotate>` 包起來。**

這句話同時是 Task 43 的觀察窗 —— 端到端跑過幾份技術筆記後，若「自己畫 SVG」的痛感明顯，
再回頭做 43；不明顯就把這句話留著當永久規則。

### 待執行：端到端驗證

驗收最後一項尚未做。挑定的素材是
`src/content/notes/ssr-專案dutymate-ai-憲章與-workflow-設計.mdx`
（535 行、16 個程式碼區塊、3 個既有 @ai-visualize 元件）——
它同時具備「程式碼密集」與「有既有互動元件可沿用」，是這批原子最完整的一次檢驗。

**未執行的原因**：跑完整 pipeline 需要委派 `present-planner` 與 `slide-generator` 兩個 Subagent，
而本 session 的既有指示是「未經作者要求不主動呼叫 Agent 工具」。已向作者說明並待其同意。

執行後要看的三件事（也是這批 Task 的真正驗收）：

1. AI 是否**真的用上**新原子，還是繼續用舊的 6 個 block 硬拼 / 自己寫 JSX。
2. 密度上限訂得對不對（有沒有頻繁觸發 `warnOverLimit` 或反過來留一大片空白）。
3. 「自己畫 SVG」的架構圖痛感有多明顯 —— 這是 [Task 43](task-43-deck-diagram-primitives.md) 的決策依據。

若發現 AI 還是繞過新原子，**要修的是 SKILL / agent 的文字或原子的 API，不是回頭加型別限制**
（那等於退回 v0.1）。

---

## 端到端驗證記錄（2026-07-31，已完成）

素材：`ssr-專案dutymate-ai-憲章與-workflow-設計.mdx`（535 行、16 個程式碼區塊、3 個既有 @ai-visualize 元件）。
流程：`present-planner` → `slide-generator` → 主 Agent 的溢出偵測 + 逐頁截圖。

**結果：14 頁一次過，`tsc` 18（基準線）、`astro build` 通過、溢出偵測 14 頁全 `ok`、`slide-generator` 只重試 1 次。**

### 1. AI 有沒有真的用上新原子？有，而且**會拒絕**

`present-planner` 在規劃書裡主動列出「新原子取捨」一段，逐一說明**不用**哪些、為什麼：

| 決定 | 理由（planner 自己寫的） |
| --- | --- |
| 用 `<Code>` + `<Terminal>` + `<Mark>` | 提示詞範例是全篇最容易踩雷的一步，值得單獨一頁 |
| **不用** `<Chart>` | 「全篇沒有量化趨勢/比例資料，硬做圖表只是重複」 |
| **不用** `<TagCloud>` | 「角色清單有分層結構，改用 `<Cards>` 才不失真」 |
| **不用** `<Frame>`/`<Annotate>` | 「筆記裡沒有 UI 截圖可標註」 |
| **不用** `<LogoRow>` | 「沒有技術選型組合的場景」 |
| **不用** `<Stages rail/cycle>` | 「流向已被 `sdd-workflow-map` 互動面板涵蓋，不重複做靜態版」 |

這是本次驗證最有價值的訊號 —— SKILL 的「什麼時候用」欄位有效，AI 沒有為了用新原子而用。
最終 block 分布：`Cards ×2`、`Kpi ×1`、`Stages ×1`(linear)、`Rows ×1`、`Code ×1`、`Terminal ×1`、`Mark ×2`(行內)。

### 2. 抓到一個真的規格漏洞：`full-visual` 沒有 `chrome`

planner 規劃了兩頁「`full-visual` + `chrome: false`」做滿版互動元件。
`slide-generator` 實作時發現 **`FullVisualSlide` 型別根本沒有 `chrome` 欄位**（只有 `CustomSlide` 有），
於是退回標準 chrome 並在回報中明確標出這個偏離。

**這是 SKILL 的文字問題，不是 agent 的錯** —— 原文只寫「`chrome: false`（整頁滿版視覺）需在規劃書寫明理由」，
放在〈`custom` 與 `full-visual` 的分界〉一節下，讀起來像兩種頁型都有。已修正為：

> **`chrome: false` 只有 `custom` 頁有。** `full-visual` 的型別沒有這個欄位 ——
> 要讓既有互動元件滿版，做法是 **`custom` 頁 + `chrome: false`**，在頁內自己 import 那個元件。

`present-planner.md` 也補了同一條，並寫明「不要規劃成『`full-visual` 加 `chrome: false`』——
那個組合不存在，slide-generator 只能退回標準 chrome」。

> 這條也可以反過來解 —— 擴充 `FullVisualSlide` 型別與 `LayoutFullVisual` 實作，讓它支援滿版。
> 本次選擇改文字而非改型別：`custom` + 頁內 import 已經能表達滿版互動元件（SKILL §6.1 本來就這樣分界），
> 多開一個等價路徑只會讓兩種頁型的界線更模糊。

### 3. 密度觀察：`<Cards>` 內容短時會拉出大片空白

第 3 頁（5 欄 Cards + 2 格 Kpi）與第 8 頁（一段 prose + 2 欄 Cards）都出現同一個現象：
**卡片數量沒超標，但每張卡的內容只有 3–5 行，卡片被拉伸填滿可用高度後下半部是空的。**

SKILL 現有的規則是「單一 block 撐滿整頁時，**項數**要接近上限」——
這次的情況是**項數夠但每項內容淺**，現有規則擋不到。已知但**本次不改規則**：
一份 deck 的兩頁還不足以判斷這是通例還是這篇筆記的特性，等再跑 1–2 份技術筆記再決定要不要補。

### 4. 對 Task 43 / 44 的意義

- **Task 43（架構圖基元）**：這篇筆記**完全沒有要自己畫 SVG 的場合** ——
  三個既有互動元件已經承擔了所有流程與拓撲的表達。「自己畫 SVG 的痛感」在這一份上是零。
  單一樣本不足以定案，但**至少沒有支持立刻做 43 的證據**。
- **Task 44（SlideChrome `progress`）**：這份 deck 有 3 個章節、每章 2–4 頁，
  正是 `progress` 想解的場景。但實際看下來，`num` + `eyebrow`（"PART 03 · 審查邊界與落地"）
  已經足夠讓人知道在哪 —— **`ring` 的必要性偏低，`dots` 也只是錦上添花**。優先度可以再降。

### 遺留

`docs/tasks/README.md` 的順序註記已更新為
「38 → 39 → 40 → 41／42 → 45 → 端到端 → 再定 43 / 44」。
PRD §8.1 的 Phase 條目與文件版本仍待補（Task 31–37 那批就已欠著），可用 `/bump-prd` 一併處理。
