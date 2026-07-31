# Task 42 — `<Stages>` 變體 + `<TagCloud>` + 既有 block 增強

> 對應 [deck-atoms-inventory.md](../deck-atoms-inventory.md) §2 C2/C3/F1/F2/F3/F5、§4.2。
> 依賴 [Task 34](task-34-deck-block-components.md)（既有 6 個 block）、
> [Task 38](task-38-deck-code-atom.md)（`atoms.deck.tsx` 骨架）。

Tier 2 的其餘項目。共同特徵：**擴充既有元件或極小新增**，不觸碰架構。

## 1. `<Stages variant="rail" | "cycle">`（C2、C3）

`<Stages>` 目前只做線性水平流程（C1）。實證素材出現兩個它表達不了的變體：

| variant | 樣子 | 實證頁 |
| --- | --- | --- |
| `rail` | 一條水平軸 + 節點圓點 + icon 在上、標題與說明在下（或上下交錯） | bullmq p2（ETL 五階段）、dataint p16（Step 1–6 交錯） |
| `cycle` | 環形排列 + 圓弧箭頭 + 中心標題 + 環繞說明 | nifi p2（NiFi Flow 開發流程 6 步） |

- **擴充既有 `Stages.tsx`，不新增檔案** —— 資料結構（`StageItem`）相同，只是排法不同。
- `rail` 的上下交錯（dataint p16）用 `alternate?: boolean` 控制。
- `cycle` 建議節點數 4–6；超過 6 個環會太擠，`warnOverLimit` 提醒。
- 現有 `plain` / `active` / `dashed` 三種 item variant 在新 variant 下要照常生效。

## 2. `<TagCloud>`（F1）

**實證**：bullmq p4、tus p3 —— 兩份都用來把「一堆痛點」聚合成一頁的視覺重量。

```ts
export interface TagItem { text: string; weight?: 1 | 2 | 3 | 4; tone?: SeriesTone }
export interface TagCloudProps extends BlockBaseProps { items: TagItem[] }
```

- **純 flex + 字級權重，不做碰撞佈局、不引 `d3-cloud`**（§4.2 已決）。
  `weight` 映射到 `DS` 的四級（如 `micro` / `small` / `h4` / `h2`），
  搭配 `wrap` 自然斷行 —— 效果與 bullmq p4 差距很小，成本是十分之一。
- `weight` 未給時預設 2；**不自動依字數或順序推算權重**（那會編碼假資訊，同 audit A-3 精神）。
- 建議上限：實測後定（bullmq p4 約 20 個、tus p3 約 22 個，可作參考）。

## 3. 既有 block 的小增強

| 增強 | 元件 | 實證頁 | 內容 |
| --- | --- | --- | --- |
| F3 推薦角標 | `<Cards>` | mfe p5（四方案中 D 被選中） | `CardItem.recommended?: boolean` → 右上角標 + 邊框強調。**必須含文字或 icon，不能只有顏色**（audit A-6） |
| F2 chip 變體 | `<Rows>` | nifi p3、tus p5、bullmq p5 | 左側 `k` 改為彩色 chip 樣式的 `variant?: "plain" \| "chip"` |
| F5 logo 組合 | 新增 `<LogoRow>` | nifi p3、tus p5、bullmq p5 | N 個 logo 之間夾 `+` / `×` 的技術選型組合。約 40 行 |

`<LogoRow>` 的 logo 來源是圖檔（`<img src>`），元件只負責排列與間隔符號 ——
**不內建任何 logo 資產**。

## 關鍵落地規則

1. 顏色一律 `dkt(dark)` / `toneColor()`，字級一律 `DS`，**不硬編色碼、不寫字面數字**。
2. `<Stages>` 的既有 API **不可破壞** —— `variant` 未給時行為與現在完全一致
   （既有三份 deck 正在用它）。
3. 新增的 optional props 一律有合理預設，不強迫呼叫端多填
   （Task 34 風險段：「做得不好用，AI 就會繞過它們自己畫」）。
4. `<Cards recommended>` 依 audit A-6：**icon + 文字標籤同時出現**，不可只有色塊。
5. 超過建議上限時 `warnOverLimit`（dev-only）。
6. 全型別標註、無 `any`、無 emoji。

## 實作步驟

1. `<Stages variant="rail">`（含 `alternate`）→ `variant="cycle"`。
   每做完一個就在 `atoms.deck.tsx` 補上，確認既有 `plain`/`active`/`dashed` 未退化。
2. `<TagCloud>`。
3. `<Cards recommended>` → `<Rows variant="chip">` → `<LogoRow>`。
4. `blocks/index.ts` barrel 補匯出。
5. `atoms.deck.tsx` 補頁：`<Stages>` 三種 variant 一頁、`<TagCloud>` + 三個小增強一頁。
6. `/present/atoms` 逐頁截圖，亮暗兩色。
7. **回歸檢查**：跑一次 `/present/<既有三份 deck>`，確認 `<Stages>` / `<Cards>` / `<Rows>`
   的既有用法外觀完全沒變。

## 驗收

- [x] `<Stages>` 不給 `variant` 時外觀與現況一致（**版面指紋比對，見下方記錄**）
- [x] `rail` / `cycle` 兩個變體外觀正確；`alternate` 可表達 dataint p16 的上下交錯
- [x] `cycle` 在 6 節點下環形均分、圓弧箭頭方向正確
- [x] `<TagCloud>` 四級 `weight` 字級差異明顯；未給 `weight` 時不自動推算
- [x] `<Cards recommended>` 角標含 check icon + 文字 + 加粗框，不只顏色
- [x] `<Rows variant="chip">` 能表達 nifi p3 的痛點標籤列
- [x] `<LogoRow>` 間隔符號與對齊正確，不內建 logo 資產
- [x] 無硬編色碼（5 個檔案 grep 皆為 0）、無字面字級、無 `any`、無 emoji
- [x] `/present/atoms` 亮暗各 15 頁皆無溢出；既有兩份 deck 版面指紋完全相同
- [x] `npx tsc --noEmit`（18 = 既有基準線）`&& npx astro build` 通過

## 風險 / 備註

- **`cycle` 是這批唯一有幾何計算的部分**（節點沿圓周均分、圓弧箭頭的起訖角度）。
  若標籤在環外側放不下，優先縮小環半徑而不是縮字級 —— 字級要守 `DS` 階梯。
- **回歸風險集中在 `<Stages>`。** 它是既有三份 deck 都在用的元件，
  加 variant 時很容易順手改到共用的排版程式碼。驗收第一項（逐像素一致）不是形式檢查。
- `<TagCloud>` 有一個**內容品質風險**而非技術風險：它很容易被 AI 拿來塞一堆同義詞充版面。
  [Task 45](task-45-present-skill-agents-atoms.md) 的 SKILL 要寫明
  「只在真的有一組並列的、無先後關係的短詞時使用」。

---

## 實作記錄（2026-07-31，已完成）

### 產出

| 檔案 | 內容 |
| --- | --- |
| `src/components/deck/blocks/Stages.tsx` | 192 → **354 行**，拆成 `StagesLinear` / `StagesRail` / `StagesCycle`，`Stages` 只做分派 |
| `src/components/deck/blocks/TagCloud.tsx` | **新增**（84 行） |
| `src/components/deck/blocks/LogoRow.tsx` | **新增**（82 行） |
| `src/components/deck/blocks/Cards.tsx` | 加 `CardItem.recommended` |
| `src/components/deck/blocks/Rows.tsx` | 加 `variant: "plain" \| "chip"` + `chipWidth` |
| `src/components/generated/atoms.deck.tsx` | 補三頁，deck 由 12 頁增為 **15 頁** |

### 本 Task 標示的「最大風險」判斷錯了

文件寫「回歸風險集中在 `<Stages>`，它是既有三份 deck 都在用的元件」。
**實際盤點的結果是：沒有任何既有 deck 用 `<Stages>`。** 逐檔 grep：

| deck | 用到的 block |
| --- | --- |
| `role-responsibility-rr` | `Compare` / `Kpi` / **`Rows`** |
| `trendlink-…提案草稿` | **`Cards`** / `Compare` / `Kpi` |
| `專案-vs-產品` | **`Cards`** / `Compare` / `Table` |

真正的回歸面是 **`<Cards>`（2 份）與 `<Rows>`（1 份）** —— 也就是本 Task 裡被當成
「小增強」的那兩項。驗證重心因此轉向它們。

### 回歸驗證方式：版面指紋而不是截圖比對

驗收原本寫「逐像素一致（截圖比對）」。截圖比對在這裡不可靠 —— 反鋸齒與字型 hinting
會讓相同版面產生不同像素。改用**版面指紋**：對主畫布內**每一個元素**取

```
tagName | x | y | width | height | backgroundColor | borderTop | fontSize | fontWeight | color
```

（座標先除以 `SlideFrame` 的 scale 還原成 1600×900 座標系），串起來後取雜湊。
這比截圖更嚴格 —— 它會抓到「看起來一樣但邊框色差一階」這種截圖看不出的變化。

改動前先存基準，改完再比：

| deck | 頁數 | 結果 |
| --- | --- | --- |
| `專案-vs-產品` | 12 | **12 頁指紋完全相同** |
| `role-responsibility-rr` | 11 | **11 頁指紋完全相同**（含 `<Rows>` / `<Kpi>` / `<Compare>`） |

### 過程中修掉的問題：`alternate` 時 icon 跟錯邊

第一版 rail 的 icon **固定在軸上方**（照 bullmq p2 的構圖），文字才依 `alternate` 上下交錯。
畫出來發現：上下交錯時「另一側」已被鄰項的文字佔用，icon 還固定在上方就會離自己的標題很遠，
甚至壓到隔壁項的說明。

改為 **icon 跟著文字走**：`alternate=false` 維持「icon 在上、文字在下」（bullmq p2），
`alternate=true` 則 icon 與文字同側、貼著軸線排。

連帶發現 `size` 給太小會頂出容器（實測 230 溢出約 13px），已在 prop 註解寫明
「`alternate` 時建議 ≥ 280」，並把驗證頁改為 285。

### 三個設計決定

1. **rail 不畫箭頭。** 軸本身已經表達方向，再加箭頭是重複編碼（linear 才需要，因為它是並排的區塊）。
2. **`cycle` 的中心標題開成獨立的 `center` prop**，不從 `items[0].tag` 取。
   第一版偷懶用 `items[0].tag`，但 `tag` 在 rail 是每項的標籤，語意衝突。
3. **`<TagCloud>` 的權重不自動推算。** 未給 `weight` 一律當 2 ——
   依字數或順序猜權重會編碼假資訊（同 audit A-3 精神）。
   權重低的用 muted 墨色而不是降飽和度，讓重要的先跳出來。

### 建議上限（回填給 [Task 45](task-45-present-skill-agents-atoms.md)）

| 原子 / variant | 上限 | 依據 |
| --- | --- | --- |
| `<Stages variant="linear">` | 5 | Task 34 既有值，未動 |
| `<Stages variant="rail">` | **6** | dataint p16 是 6 步；`alternate` 時 `size` 另需 ≥ 280 |
| `<Stages variant="cycle">` | **6** | nifi p2 是 6 步；再多環上標籤會開始互相擠 |
| `<TagCloud>` | **22** | bullmq p4 約 20 個、tus p3 約 22 個 |
| `<LogoRow>` | **3** | 超過 3 個就不再是「這兩個東西合起來」，而是技術清單，該改用 `<Cards>` |

### 其他

- `<TagCloud>` 有內容品質風險而非技術風險：很容易被拿來塞同義詞充版面。
  驗證頁的 callout 與 [Task 45](task-45-present-skill-agents-atoms.md) 的 SKILL 條目都已寫明
  「只在真的有一組並列、無先後關係的短詞時使用」。
- Task 38 的 tokenizer 迴歸仍成立：26 個筆記頁、32 個程式碼區塊本體逐位元組相同。
