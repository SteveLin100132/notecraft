# Task 40 — `<Chart>` 原子

> 對應 [deck-atoms-inventory.md](../deck-atoms-inventory.md) §2 D1–D3、§4.1、§5 決議 1。
> 依賴 [Task 38](task-38-deck-code-atom.md)（`atoms.deck.tsx` 骨架）。
> 設計依據：`dataviz` skill、[deck-design-audit.md](../deck-design-audit.md) §3.2。

## 前提：規格不從盤點素材推導

盤點的 94 頁裡**有軸的量化圖表是 0 張**（inventory §1.1）——
技術分享型簡報天生沒有量化資料。因此本 Task 的規格來源是
`dataviz` skill 與 audit §3.2 的色彩結論，**不是那 5 份簡報**。

實證頁只覆蓋到兩個非典型變體：

| 變體 | 實證頁 |
| --- | --- |
| 比例分解（5% / 80% / 15% + 說明） | bullmq p3 |
| 進度條列（多條 bar + 百分比 + 狀態圓點） | tus p4、bullmq p8 |

後者併入 `variant="bars"`，**不另開元件**。

## 範圍

`src/components/deck/blocks/Chart.tsx`，以 `recharts`（已在 CLAUDE.md 白名單）實作：

| variant | 用途 |
| --- | --- |
| `bar` | 分類比較（含堆疊） |
| `line` / `area` | 趨勢 |
| `donut` | 比例（單一維度，**≤ 3 片** —— 實作時依 §5 決議 1 收斂，見實作記錄） |
| `bars` | 進度條列（tus p4 / bullmq p8 的橫向條 + 百分比） |

## 關鍵落地規則

### 1. 系列數上限 3（§5 決議 1 — 硬規則）

- 沿用既有 `SeriesTone`（`blue` / `orange` / `muted`），**不擴充色票**。
- `series.length > 3` 時：dev `console.warn` + **只渲染前 3 筆**。
  讓它明確失敗，而不是靜靜畫出一張讀不懂的圖。
- **型別擋不住陣列長度**，所以 SKILL 端也要有規則（[Task 45](task-45-present-skill-agents-atoms.md)）：
  `present-planner` 遇到超過 3 系列的資料，規劃書要直接寫成
  「拆成 N 張 small multiples」或「改用 `<Table>` 標值」。

### 2. 尺寸：**不要用 `ResponsiveContainer`**

縮覽側欄的頁在 `display: none` 狀態下量到 0 寬，圖會整個消失。
固定 `width` / `height`，由呼叫端從 `CustomSlideProps.area` 算好傳入。

### 3. 動畫綁 `live`

`isAnimationActive={live}` —— 否則側欄十幾頁 chart 同時動會拖垮整頁
（沿用 `full-visual` 既有的 `live` 機制，契約 §6）。
另依專案規則用 `useReducedMotion()` 尊重 `prefers-reduced-motion`。

### 4. 沒有 hover，就不能靠 tooltip

**禁用 recharts 的 `<Tooltip>`。** 投影片是靜態畫面（播放模式也不會有人去 hover），
數值一律用 `<LabelList>` 直接標在圖元上。讀不出來的圖就是錯的圖。

### 5. 其餘

- 軸線 / 格線用 `dkt(dark).borderSoft`，軸標籤用 `.muted`，**不硬編色碼**。
- 數字加 `tabular-nums`（audit B-3）。
- 字級一律取 `DS`（軸標籤建議 `DS.micro`、圖內標值 `DS.small`，實測後定）。
- **不做 3D、不做漸層填充、不做圓角柱**（dataviz 反樣式）。
- 標題不由元件畫 —— 那是 `SlideChrome` 或 `BlockHeading` 的事。

## 實作步驟

1. `bar`（含堆疊）先做完整，把上限、`live`、標值、token 取色四件事一次做對。
2. `line` / `area` 沿用同一套軸與色彩設定。
3. `donut`：注意 ≤ 3 片、每片直接標籤 + 值，不用圖例。
4. `bars`：這個不走 recharts，純 flex + 寬度百分比即可（tus p4 的樣子），
   但 props 與色彩規則與其他 variant 一致。
5. `atoms.deck.tsx` 補一頁：四個 variant 各一，外加一組**刻意 5 系列**的資料
   驗證「只畫前 3 + warn」的行為。
6. `/present/atoms` 逐頁截圖，亮暗兩色。

## 驗收

- [x] 五個 variant（bar / 堆疊 bar / line / donut / bars）皆可渲染，亮暗兩色皆可讀
- [x] 傳 5 系列時只畫前 3 筆（DOM 實測 `.recharts-bar` = 3）並在 dev console 警告
- [x] **無 `ResponsiveContainer`**（DOM 實測 `.recharts-responsive-container` = 0）
- [x] `live === false` 時無動畫；`prefers-reduced-motion` 生效
- [x] **無 `<Tooltip>`**（DOM 實測 `.recharts-tooltip-wrapper` = 0），數值直接標在圖元上
- [x] 數字有 `tabular-nums`
- [x] 無硬編色碼、無字面字級、無 `any`、無 emoji
- [x] `/present/atoms` 亮暗各 10 頁皆無溢出（dev 偵測回報 `ok`）
- [x] `npx tsc --noEmit`（18 = 既有基準線）`&& npx astro build` 通過

## 風險 / 備註

- **recharts 在 `transform: scale` 座標系下的行為是本 Task 最大未知數。**
  `SlideFrame` 用 `transform: scale` 把 1600×900 縮到視窗；recharts 內部若有任何
  `getBoundingClientRect` 依賴，量到的是**縮放後**的值。固定 `width`/`height` 可以繞開大部分問題，
  但實作時要特別檢查標籤定位與 `donut` 的半徑計算。
  **若繞不開，退路是改用手寫 SVG 畫 bar / line**（軸有限、資料點少，成本可接受），
  而不是硬扛 recharts。這個判斷在步驟 1 就會有答案，不要拖到步驟 4。
- recharts 已在白名單，但**它會進 deck 的 client bundle**。
  若量測發現體積或首屏影響明顯，同上退回手寫 SVG。

---

## 實作記錄（2026-07-31，已完成）

### 產出

| 檔案 | 內容 |
| --- | --- |
| `src/components/deck/blocks/Chart.tsx` | **新增**（346 行）—— 五個 variant |
| `src/components/deck/blocks/index.ts` | barrel 補匯出 |
| `src/components/generated/atoms.deck.tsx` | 補三頁（有軸圖表 / 比例與進度 / 邊界），deck 由 7 頁增為 10 頁 |

### 本 Task 最大的未知數：recharts 在 `transform: scale` 下**沒有問題**

文件把這列為「步驟 1 就要有答案，繞不開就改手寫 SVG」的頭號風險。實測結論：
**固定 `width`/`height` 之後完全正常**，座標、標籤定位、donut 半徑都對。
理由也很清楚 —— 所有幾何都在 SVG user unit 裡算完，CSS 的 `transform: scale` 只縮最終畫面；
會出事的是讀 `getBoundingClientRect` 的那些元件（`ResponsiveContainer`、`Tooltip`、`Brush`），
而規則 2 / 3 本來就把它們全排除了。**不需要退回手寫 SVG。**

### 排查掉一個假警報：Vite dep 快取

中途整個 `/present/atoms` 變白畫面，React 堆疊指向 recharts 的 `<Text>`。
用 error boundary 抓到真實訊息是 `Cannot read properties of null (reading 'useContext')`
—— 典型的 **React 實例重複 / dispatcher 為 null**，不是我的 props 有問題。

成因：recharts 是這一輪才第一次被 import，Vite 在 dev session 中途做了 on-the-fly 依賴預打包，
產出的 chunk 與既有的 react chunk 對不起來。`rm -rf node_modules/.vite` + 重啟 dev server 後一切正常。

**教訓寫在這裡供後續 Task 參考**：deck 原子首次引入新的第三方套件時，
若出現「元件內部莫名 hook 錯誤」，先重啟 dev server 再懷疑自己的程式碼。
（中途我還一度懷疑 `LabelList` 的 `formatter` / `style`，把它們拆到只剩兩個 prop 仍然壞 ——
那時就該想到問題不在 props。）

### 過程中修掉的三個問題

1. **`height` 的語意改了。** 第一版 `height` 指圖表畫布高，呼叫端得自己扣掉 heading 與圖例
   —— 實測第一次就溢出 22px。改為 **`height` = 這個 block 的總高**，heading / 圖例由元件自己扣
   （`HEADING_H` / `LEGEND_H`）。讓呼叫端記「標題 55px、圖例 28px」只會每次都算錯。
   另外 `HEADING_H` 加了 `+4` 的實測安全邊 —— 純算式（30 × 1.3 + 16）比瀏覽器實際行盒少 2px。
2. **donut 標籤被畫布邊界裁掉**（「需自行開發 15%」只剩「…行開發 1」）。
   原本 `r = min(width, height) / 2 - 8` 把圓畫到滿版，外側標籤沒有空間。
   改為 `r = max(60, min(width × 0.3, canvasH / 2 − 24))`，左右各留約 30% 給標籤。
3. **donut 標籤試過兩種自訂樣式的寫法，兩種都退回。** 實測 recharts 2.15：
   - `label` 回傳 React element（想自訂 fill / 字級）→ **標籤完全不渲染**
   - 在 `<Pie>` 上加 `fill` / `fontSize` 想讓它帶到標籤 → **連 sector 都不畫了**

   最後用字串形態。**意外的好結果**：字串標籤會繼承該切片 `<Cell>` 的顏色
   （實測 `blue-300` / `orange-300` / `neutral-300`），仍然走 design token，
   而且顏色與切片一一對應，等於免了圖例。

### 規格決定：donut 切片上限 3，與系列上限同源

`SeriesTone` 只有 blue / orange / muted 三色（§5 決議 1 不擴充色票），
所以 donut 也只能 3 片，第 4 類請併成「其他」（muted 天然就讀成「其他」）或改用 `<Table>`。
實證頁 bullmq p3 剛好就是 3 片（5% / 80% / 15%），這個上限不是妥協。

### `bars` 不走 recharts

一排橫條用 flex + 寬度百分比就夠（tus p4 / bullmq p8 的樣子），
為了它去背 recharts 的座標系與動畫反而更重。props 與色彩規則與其他 variant 一致。

### 驗證（DOM 實測，非目視）

| 項目 | 結果 |
| --- | --- |
| 5 系列 → 只畫 3 | `.recharts-bar` = 3、`.recharts-rectangle` = 9（3 系列 × 3 類別）；dev 警告字串已擷取確認 |
| 堆疊柱 | 2 系列 × 4 季 = 8 個 rect、8 個標籤 |
| tooltip | `.recharts-tooltip-wrapper` = **0** |
| ResponsiveContainer | `.recharts-responsive-container` = **0** |
| donut | 3 個 sector，標籤 `Airflow 可解 5%` / `NiFi 可解 80%` / `需自行開發 15%` 完整不截斷 |
| 溢出 | 亮暗各 10 頁全數 `ok` |

### 建議上限（回填給 [Task 45](task-45-present-skill-agents-atoms.md)）

| 項目 | 上限 | 性質 |
| --- | --- | --- |
| 系列數 | **3** | **硬規則**（超過只畫前 3 + 警告） |
| donut 切片 | **3** | 硬規則（同上） |
| `bars` 列數 | **8** | 建議值（`warnOverLimit`） |
| bar 類別數 | 4–6 | 未硬性設限；`atoms.deck.tsx` 以 4 季驗證 |

### 關於 build 產物比對（重要）

本輪比對時發現 `dist` 由 40 頁變成 **43 頁**、且幾乎每一頁都有差異。
排查後確認**與本 Task 無關**：工作目錄在這段期間多了三篇筆記
（`勞動法遵決策支援系統-poc-*` 兩篇、`簡報畫布-full-visual-元件預覽viewport`），
它們改變了全站的標籤計數與「N 個 @ai-visualize 標記等待處理」等共用數字，所以每頁都變。

為了仍能驗證 Task 38 的 tokenizer 重構沒有回歸，改用**只比對碼塊本體**的方式
（`<code class="nc-cb__code">…</code>`）：
**26 個筆記頁、共 32 個程式碼區塊，全部逐位元組相同。**
（先前一版比對腳本回報 8 頁有差異，是正則多吃了碼塊後面的頁面內容所致，非真差異。）
