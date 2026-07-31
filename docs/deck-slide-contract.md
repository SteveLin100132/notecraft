# Deck Slide 型別契約 v0.2（未實作）

> **狀態：草案，尚未寫任何實作程式碼。**
> **v0.2 的變更**：內容頁不再由系統版型枚舉，改為 **`custom` 自由頁**；只保留 5 個
> 「結構固定、不需要創意」的版型。詳見 §1。
> **驗證素材**：`2026-07-01 內部客戶與業務流程整合系統提案`（6 頁）、
> `2026-06 月會R&D團隊報告`（11 頁）。兩份皆為 trendlink-design 語言，是本專案 deck 的對齊目標。
> `2025 年度成果報告`（14 頁）為傳統 PPT 語言，只取結構原子、不取視覺。
> **姊妹文件**：[deck-design-audit.md](deck-design-audit.md)（設計工藝與資料視覺化層的原則對照）。
> **2026-07-30**：原 §12 的 5 個待確認項已全部決議，見 §12。

---

## 1. v0.1 → v0.2：改了什麼、為什麼

### 1.1 決策

作者決定：**內容頁要能像 Claude Design 一樣自由發揮，不受版型枚舉限制。**

| | v0.1 | v0.2 |
| --- | --- | --- |
| layout | 7 種（含主力 `stack` + 逃生門 `freestyle`） | **6 種**（5 固定 + `custom`） |
| 內容頁的產生方式 | 選 `stack` → 填 1–3 個 block（純資料） | 寫一個 React 頁面元件（自由排版） |
| block | 9 種，**強制**：內容頁只能由 block 組成 | **6 個，降級為可選的元件庫**，`custom` 頁想用就 import，不想用就自己寫（砍掉的 3 個見 §5.3.1） |
| `freestyle` | 逃生門，配額 ≤ 2 頁 | 更名為 `custom`、**成為主幹道、無配額** |
| 誰寫內容頁 | `slide-generator` 只寫資料；freestyle 走 `component-generator` | **`slide-generator` 全包**，並需讀 `trendlink-design` |

**退役**：`stack`（被 `custom` 取代）、`bullets`、`media`、`compare`（v0.1 已判退役 / 降級為 block）。
**保留**：`cover`、`section`、`quote`、`closing`、`full-visual` —— 這 5 種頁的結構本來就固定，
自由發揮沒有價值，交給系統渲染反而保證一致。

### 1.2 這個決定的代價（必須正面處理）

v0.1 的架構把設計品質**編譯進系統元件**：字級階梯、`tabular-nums`、暗色 token、
`prefers-reduced-motion`、密度上限，全部由 `slideLayouts.tsx` 寫死一次即永久生效，
deck 檔只是資料，**AI 不可能寫壞樣式**。

`custom` 頁把這層保護拿掉了。若不補措施，[deck-design-audit.md](deck-design-audit.md) 裡
歸類為「(b) 系統寫死」的每一項都會退化成「(a) AI 每次都要記得」—— 而規則不會自己執行。

### 1.3 v0.2 的關鍵手法：把 (b) 從「版型層」下移到「原子層」

**不是**讓 `custom` 頁從零開始寫 CSS，而是把原本鎖在版型元件裡的設計決策，
拆成 `custom` 頁**可以直接 import 的原子**：

```
v0.1:  [ 版型元件 ] ← 設計決策全在這裡，deck 只能填資料
v0.2:  [ 原子層：字級階梯 / 間距 / token / 6 個 block 元件 / SlideChrome ]
         ↑ custom 頁自由組合這些原子，也可以自己寫 JSX
```

於是 (b) 並未消失，只是**下移一層**。`custom` 頁的自由度是「怎麼組合、要不要自己畫」，
而不是「要不要遵守字級階梯」。詳見 §5。

---

## 2. 架構總覽

```
┌─ Deck（<slug>.deck.tsx，一份 deck 一個檔）────────────────────────┐
│                                                                   │
│  slides: [                                                        │
│    { layout: "cover",       … }  ← 系統渲染，純資料               │
│    { layout: "section",     … }  ← 系統渲染，純資料               │
│    { layout: "custom",  render: P2 }  ← 自由頁，元件在同檔內定義  │
│    { layout: "full-visual", viz: RrRaci }  ← 沿用筆記既有元件     │
│    { layout: "quote",       … }  ← 系統渲染，純資料               │
│    { layout: "closing",     … }  ← 系統渲染，純資料               │
│  ]                                                                │
│                                                                   │
│  function P2({ dark, area }) { … 自由排版，可 import 原子層 … }   │
└───────────────────────────────────────────────────────────────────┘
                            ↓ 全部經過
┌─ SlideFrame（1600×900 固定座標系 + transform: scale）─────────────┐
│  ┌─ SlideChrome（內容頁強制外框，系統畫，custom 不准自己畫）────┐ │
│  │  [01] PART 01 · …                     (pill) …             │ │
│  │  標題 + titleNote                                           │ │
│  │  ▬▬▬                                                        │ │
│  │  ┌─ area: 可用內容區（custom 的 render 畫在這裡）─────────┐ │ │
│  │  └─────────────────────────────────────────────────────────┘ │ │
│  │  ① 註腳…      ┌ callout ┐                                   │ │
│  │  Trendlink · 提案 2026/06                    01 / 05        │ │
│  └───────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────┘
```

---

## 3. 共用型別

```ts
import type { ComponentType } from "react";

/**
 * 識別色：只表示「這是 A 還是 B」，無好壞意涵。
 * 只有這三個值 —— dataviz validator 實測：blue↔orange 在 light 模式全項 PASS
 * （ΔE 38.1 normal / 29.7 protan）。詳見 deck-design-audit.md §3.2-C。
 */
export type SeriesTone = "blue" | "orange" | "muted";

/**
 * 狀態色：只表示 好 / 注意 / 壞。**必須同時附 icon + 文字標籤**，不可色彩單獨承載語意。
 * 與 SeriesTone 分開是硬規則：v0.1 把兩者混成一個 5 色 union，實測
 * 紅↔綠 ΔE 5.4（deutan）、紅↔橘 ΔE 12.8（normal，低於 15 的 hard FAIL）。
 * 詳見 deck-design-audit.md §3.2-A。
 */
export type StatusTone = "good" | "warning" | "critical";

/**
 * 允許的 icon 名。系統查表對映 lucide-react，deck 只給字串。
 *
 * **治理範圍限於 §4 SlideChrome 的欄位與 §5.3 block 元件的 props。**
 * `custom` 頁自己畫時可直接 `import { … } from "lucide-react"`（§5.4 白名單內），
 * 不受本表限制 —— 白名單原本的目的是「deck 是純資料、不准 import 元件」，
 * 這個前提在 `custom` 頁已不成立，硬套只會維護兩套規則卻擋不住任何事。
 */
export type IconName =
  | "alert" | "check" | "x" | "info" | "lightbulb" | "target"
  | "clock" | "user" | "users" | "database" | "lock" | "gauge"
  | "layers" | "file" | "folder" | "link" | "cloud" | "plug"
  | "git-branch" | "settings" | "trend-up";
```

---

## 4. SlideChrome：內容頁的強制外框（護欄 1）

**這是視覺一致性的主要來源。** `custom` 頁**不准自己畫**編號徽章、標題、底線、頁碼、footer ——
一律由系統的 `SlideChrome` 提供。否則 8 頁自由發揮就會變成 8 份不同的簡報。

欄位沿用 v0.1 §3，未變動：

```ts
export interface Pill { text: string; tone?: SeriesTone }
export interface LegendItem { label: string; tone?: SeriesTone | StatusTone; icon?: IconName }
export interface Footnote { n: string; text: string }

export interface CalloutItem { label?: string; text: string; tone?: SeriesTone | StatusTone }
export interface Callout {
  icon?: IconName;
  text?: string;                 // 單句形態
  items?: CalloutItem[];         // 多段形態（月會 P4 的 MUST / MUST NOT 雙色塊）
  chip?: string;                 // 右側 chip
  tone?: SeriesTone | StatusTone;
}

/** 內容頁（custom / full-visual / closing）共用外框。cover / section / quote 不套用 */
export interface SlideChromeFields {
  nav: string;                   // 縮覽與大綱面板的短標題（每頁必填）
  num?: string;                  // 左上編號徽章，如 "01"
  eyebrow?: string;              // 徽章後的 kicker，如 "PART 01 · 一鍵發薪進度匯報"
  title?: string;
  titleNote?: string;            // 主標同行的淡色註解
  pill?: Pill;
  legend?: LegendItem[];
  callout?: Callout;
  footnotes?: Footnote[];
}
```

**唯一例外**：`chrome: false` —— 留給真正的滿版視覺頁（整頁就是一張圖）。
`present-planner` 用它時必須在規劃書寫明理由。

---

## 5. 原子層：custom 頁可以 import 的東西（護欄 2）

`custom` 頁的自由是「怎麼組合」，不是「要不要遵守設計系統」。以下三組原子由系統提供，
全部住在 `src/components/deck/`，隨 package 走。

### 5.1 排版 token（`src/components/deck/scale.ts`，新增）

取代 `slideLayouts.tsx` 現有的 19 個一次性字級（audit B-1）。
階梯對齊 §10.2 兩份 pptx 實測的字級分布：

```ts
/** 1600×900 座標系下的字級階梯。custom 頁只准用這些值。 */
export const DS = {
  mega: 216,   // 章節頁的超大編號（月會 195pt ≈ 216px @1600 座標系）
  hero: 116,   // 單一 hero 數字、較收斂的章節頁編號
  h1: 62,      // 封面主標
  h2: 40,      // 內容頁主標
  h3: 30,      // 區塊標題
  h4: 24,      // 卡片標題
  body: 20,    // 主述
  small: 17,   // 細描述
  micro: 14,   // 註腳 / footer / legend
  eyebrow: 13, // uppercase kicker
} as const;

export const DTRACK = { tight: "-0.02em", label: ".26em" } as const;  // audit B-2
export const DGAP = { xs: 8, sm: 16, md: 24, lg: 40, xl: 64 } as const;
```

### 5.2 主題 token

沿用既有 `theme.ts` 的 `dkt(dark)`。`custom` 頁**一律透過它取色，禁止硬編色碼**
（既有專案規則，v0.2 起是關鍵防線）。需補 status 暗色階（audit B-4）：

```ts
// tokens.css 新增（實測對比值見 deck-design-audit.md §3.2-D）
--success-300:#5cc494;  // on #262e3d → 6.35:1
--warning-300:#f2c14e;  // on #262e3d → 8.12:1
--danger-300:#ef8b8b;   // on #262e3d → 5.67:1
```

### 5.3 Block 元件庫（`src/components/deck/blocks/`，6 個）

v0.1 的 9 種 block 性質從「強制版型組件」變成「可選元件」，同時**砍到 6 個**。
`custom` 頁 import 就有一致的長相；不 import 也完全合法。

**取捨標準是「這個 block 有沒有承載設計決策」，不是出現次數。**

| 元件 | 用途 | 出處（實證頁） |
| --- | --- | --- |
| `<Rows>` | N 列清單（每列可帶右欄註記），建議上限 6 | 提案 P2 五大痛點、月會 P3 Issue 類型 |
| `<Cards>` | N 欄卡片（可分組帶色帶），建議上限 6 | 月會 P6/P8/P9、提案 P4 |
| `<Stages>` | 水平流程段（tag / active / dashed 變體），建議上限 5 | 提案 P2 PAST→NOW→FUTURE |
| `<Kpi>` | 數字帶（含 emphasis 大數字卡），建議上限 5 | 月會 P3、提案 P6 |
| `<Table>` | 表格 / 對照矩陣（cell icon / tone / emphasis / highlightCol），建議上限 6×6 | 提案 P3、月會 P10 |
| `<Compare>` | 左右對比（VS 軸 / 建議徽章 / pros-cons） | 提案 P4/P5 |

欄位定義**沿用 v0.1 §4** 對應段落，唯一改動：移除 `kind` 判別欄位（各自是獨立元件），
`tone` 依語意改用 `SeriesTone` 或 `StatusTone`。

**這些元件內部負責** audit 的 B-1/B-2/B-3（字級階梯、`text-wrap: balance`、
`<Table>`/`<Kpi>` 的 `tabular-nums`，且 hero 大數字**不加** `tabular-nums`）。
`custom` 頁用它們就自動達成；自己寫 JSX 時就得自己守 §5.1 與 §5.2。

### 5.3.1 砍掉的 3 個（v0.1 的 `text` / `columns` / `viz`）

這三個在 v0.1 是必要的，因為 `stack` 只能吃 block；在 `custom` 頁裡它們**退化成一層多餘的轉譯**：

| v0.1 block | 為何不做成元件 | `custom` 頁怎麼做 |
| --- | --- | --- |
| `columns` | 等於 `display: flex` + `gap`。包成元件後 AI 還要多學 `ratio` 參數，比直接寫 flex 更繞 | `<div style={{display:"flex", gap:DGAP.lg}}>` |
| `text` | 一個 `<p>` 加字級 token，沒有設計決策可封裝 | 直接寫 JSX，字級取 `DS.body` / `DS.small` |
| `viz` | 只是「放一個元件進來」 | 直接 `import` 該元件並放進 JSX |

> v0.1 §4.7 曾把 `columns` 標為「紙上驗證抓到的最大缺口」—— 那是**在 `stack` 架構下**成立的。
> `custom` 頁本身就能自由分欄，這個缺口自動消失。

### 5.3.2 `<FitToArea>`（`src/components/deck/FitToArea.tsx`）

Task 37 第一批重新生成時補上的原子。筆記的 @ai-visualize 元件是為**網頁內文**設計的
（高度隨內容長、頁面可滾），投影片是 900px 固定高度 —— 實測 `solution-architecture-comparison`
自然高度 1278px，直接放進滿版頁會被裁掉 378px。

```tsx
<FitToArea area={area}><SolutionArchitectureComparison /></FitToArea>
```

量子元素自然高度後等比縮（上限 1，不放大）。**禁止在 deck 檔自己寫 `transform: scale()` 硬編比例** ——
元件內容一改，寫死的比例就錯。

搭配規則：元件含互動（按鈕 / 拖曳）時，`live === false` 要回占位、不要掛載 ——
縮覽項本身是 `<button>`，掛進去會產生 button 嵌 button 的無效 HTML，且十幾頁一起掛會拖慢整頁。

### 5.4 `custom` 頁的 import 白名單

v0.1 的 deck 檔**禁止 import 任何外部套件**（它是純資料）。`custom` 頁是元件，
故放寬為專案既有的元件白名單（見 CLAUDE.md）：

- `react`、`motion`、`recharts`、`d3`、`clsx`、`tailwind-merge`、`lucide-react`
- `@/components/deck/*`（原子層：`scale` / `theme` / `blocks`）
- `@/components/generated/<id>`（筆記既有的 `@ai-visualize` 元件）
- `@/lib/decks`（型別）

白名單外的套件仍須**先在對話中徵詢作者**。動畫一律遵守專案規則：
200–400ms ease-out，並用 `useReducedMotion()`。

> 巢狀限制取消（v0.1 限制深度 1 是因為要用 discriminated union 表達；現在是 React 元件，
> 由 `custom` 頁自行組合）。但 §7 的密度基準仍然適用。

---

## 6. layout：6 種

```ts
export type SlideLayout =
  | "cover" | "section" | "custom" | "full-visual" | "quote" | "closing";

export interface AgendaItem { n: string; title: string; sub?: string }

/** 封面。A/B 兩份都是「左標題 + 右 agenda」一頁，故 agenda 是 cover 的 slot */
export interface CoverSlide {
  layout: "cover"; nav: string;
  eyebrow?: string; title: string; subtitle?: string;
  meta?: string[];
  agenda?: AgendaItem[];
}

/**
 * 章節分隔頁。維持固定版型（結構就 40–60 字，自由排版用不上；且它是密度對比的
 * 節奏支點，每頁長不一樣反而削弱節奏）。但把真正屬於設計選擇的部分開成參數。
 */
export interface SectionSlide {
  layout: "section"; nav: string;
  num: string; eyebrow?: string; title: string; subtitle?: string;
  /** 大編號字級。預設 "mega"（DS.mega，對齊月會的 195pt 處理） */
  numScale?: "mega" | "hero";
  /** 版面對齊。預設 "left" */
  align?: "left" | "center";
  /**
   * 底色。**預設 "dark"（深藍底）** —— 參考簡報的章節頁就是深底，且既有 deck
   * 不帶此參數時不該改變外觀。"light" 為淺藍底變體。
   * （v0.2 初稿誤寫為預設 light，Task 33 實作時修正。）
   */
  tone?: "light" | "dark";
}

/** 自由頁 —— v0.2 的主力。取代 v0.1 的 stack 與 freestyle。 */
export interface CustomSlide extends SlideChromeFields {
  layout: "custom";
  render: ComponentType<CustomSlideProps>;
  /** 預設 true。false = 整頁滿版視覺，需在規劃書寫明理由 */
  chrome?: boolean;
}

export interface CustomSlideProps {
  /** 暗色模式；render 內一律用它取 token，不可硬編色碼 */
  dark: boolean;
  /**
   * 是否為「真正在看」的畫面（主畫布 / 播放中）。縮覽圖為 false。
   * **動畫與計時器一律只在 `live === true` 時啟動** —— 否則縮覽側欄同時掛
   * 十幾頁 motion / recharts 會拖垮整頁。沿用 `full-visual` 既有的 live 機制。
   */
  live: boolean;
  /**
   * SlideChrome 佔用後剩下的可用內容區（1600×900 座標系內的 px）。
   * 溢出不會報錯、只會被裁掉 —— 這個值是 custom 頁自我約束的依據。
   */
  area: { w: number; h: number };
}

/** 滿版視覺：沿用筆記既有的 @ai-visualize 元件（與 custom 的分界見 §6.1） */
export interface FullVisualSlide extends SlideChromeFields {
  layout: "full-visual";
  title: string;
  viz: ComponentType;
  viz2?: ComponentType;          // 兩個並排（提案 P5 兩方案架構對照）
  vizLabel?: string; vizHint?: string;
}

export interface QuoteSlide {
  layout: "quote"; nav: string;
  eyebrow?: string; quote: string; by?: string; byMeta?: string;
}

export interface RecapItem { n: string; k: string; v: string }
export interface ClosingSlide extends SlideChromeFields {
  layout: "closing";
  title: string; items: RecapItem[];
  cta?: string; ctaMeta?: string;
  tone?: "light" | "dark";       // 月會 P11 是深藍底玻璃卡
}

export type Slide =
  | CoverSlide | SectionSlide | CustomSlide
  | FullVisualSlide | QuoteSlide | ClosingSlide;
```

### 6.1 `custom` 與 `full-visual` 的分界

| | 用哪個 |
| --- | --- |
| 沿用筆記中**既有**的 `@ai-visualize` 元件（播放時可互動） | `full-visual` |
| 這一頁的視覺是**為簡報現生**的 | `custom` |
| 既有元件 + 額外的簡報用排版（標題、KPI、註解） | `custom`，內部 import 該元件 |

---

## 7. 密度與溢出（護欄 3）

v0.1 靠 block 型別的上限（rows ≤ 6、cards ≤ 6、`stack.blocks` ≤ 3）擋溢出。
`custom` 頁**擋不到了** —— `SlideFrame` 是 `overflow: hidden` 的固定座標系，
**內容溢出不報錯、只會被靜靜裁掉**，而 `tsc` 與 `astro build` 永遠不會發現。

因此改為三層防護：

### 7.1 密度基準（規則，寫進 SKILL）

從兩份對齊目標實測（deck-design-audit.md §1.1）：

| 頁型 | 字數 | 主要區塊數 |
| --- | --- | --- |
| `custom` 內容頁 | **200–800 字** | 2–3 個 |
| `section` 章節頁 | **40–60 字** | —（刻意留白） |

**節奏來自密度的極端對比**，不是每頁都塞滿。內容頁是「一頁一個完整論證」
（提案 P2 一頁 = 三段演進 + 五大痛點 + 收斂結論），章節頁只有一個大編號。

§5.3 各 block 的上限（rows ≤ 6、cards ≤ 6、stages ≤ 5、kpi ≤ 5、table ≤ 6×6、
footnotes ≤ 6）**降級為建議值**，超過時優先切頁。

### 7.2 截圖驗證（強制，audit A-9）

**這是 v0.2 唯一真正的溢出安全網。** `slide-generator` 驗證流程新增：
`preview_start` → 導到 `/present/<slug>` → **逐頁截圖**，檢查裁切、標籤碰撞、疊字。
通過前不算完成。

> 對應 dataviz 第 7 步「Render it and look at it —— validator 只檢查顏色，不檢查版面」。

### 7.3 dev-only 溢出偵測（建議實作）

`SlideFrame` 在 `import.meta.env.DEV` 下量測內層 `scrollWidth/scrollHeight`，
超過 1600×900 就畫紅框並 `console.warn` 頁碼。把「靠眼睛看」變成「自動報警」，
是 §7.2 的補強而非替代。

---

## 8. 產出分工

### 8.1 變更：`slide-generator` 全包，並需讀 `trendlink-design`

v0.1 規定 freestyle 元件不由 `slide-generator` 寫、走 `visualize-planner` →
`component-generator`。**v0.2 廢除這條**，理由：

1. 內容頁全是 `custom`，一份 8 頁 deck 要來回委派 5–6 次。
2. `component-generator` 的產物契約是「**嵌入筆記內文**的元件」，不是「1600×900 投影片」——
   兩者的尺寸假設、chrome 假設、暗色機制都不同。
3. `slide-generator` 反正要寫這個檔，拆兩個 agent 寫同一個檔會產生協調成本。

**代價**：`slide-generator` 不再是「只寫資料」的單純角色，必須讀 `trendlink-design`
並遵守 §5/§6 的護欄。它的 agent 檔要相應改寫（見 §11）。

### 8.2 流程

| 階段 | 由誰 | 產出 |
| --- | --- | --- |
| 1 | 主 Agent | 讀筆記、盤點既有 `@ai-visualize` 元件 |
| 2 | `present-planner` | deck 大綱：頁數、每頁 layout、`custom` 頁的版面構想（用哪些 block / 為何自己畫）、要沿用哪些 viz |
| 3 | `slide-generator` | 寫 `<slug>.deck.tsx`（資料 + `custom` 頁元件）、tsc + build + **截圖驗證**，失敗自動修最多 3 次 |
| 4 | 主 Agent | 回報頁數、版型分布、嵌入的互動元件、截圖檢查結果 |

`note-scanner` / `visualize-planner` / `component-generator` / `mdx-writer` **零改動**。

---

## 9. 檔案落點

```
src/components/generated/<slug>.deck.tsx      主專案模式
<userCwd>/.notecraft/components/<slug>.deck.tsx   viewer 模式（@notes alias）
```

**一份 deck 一個檔**：`custom` 頁的元件定義在**同一個檔案內**，緊接資料物件之前。
理由：好 review、好整份覆寫、viewer 模式的 watcher 規則不用動。

```tsx
import type { Deck, CustomSlideProps } from "@/lib/decks";
import { DS, DGAP } from "@/components/deck/scale";
import { dkt } from "@/components/deck/theme";
import { Rows, Stages } from "@/components/deck/blocks";
import RrRaci from "@/components/generated/rr-raci";

function P2({ dark, area }: CustomSlideProps) {
  const t = dkt(dark);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: DGAP.lg }}>
      <Stages dark={dark} items={[/* … */]} />
      <Rows dark={dark} items={[/* … */]} />
    </div>
  );
}

const deck: Deck = {
  slug: "…", title: "…", eyebrow: "…", generatedAt: "…",
  source: "src/content/notes/….mdx",
  slides: [
    { layout: "cover", nav: "封面", title: "…", agenda: [/* … */] },
    { layout: "custom", nav: "背景與痛點", num: "01", eyebrow: "PART 01 · …",
      title: "為什麼要做這套系統？", render: P2,
      callout: { icon: "lightbulb", text: "…" }, pill: { text: "…" } },
    { layout: "full-visual", nav: "RACI 互動矩陣", title: "…", viz: RrRaci,
      vizLabel: "@ai-visualize · rr-raci" },
  ],
};
export default deck;
```

**一律單檔，不設行數上限。** 8 頁 deck 可能到 600–900 行，這是可接受的 —— 這個檔案
機器生成、機器整份覆寫，人不會逐行讀它（review 看的是 §7.2 的截圖）。拆目錄要處理
兩種模式的路徑別名與 viewer watcher 的深度規則、重新生成時還要清理殘留的舊頁檔，
為了行數而增加架構風險不值得。

---

## 10. 17 頁驗證（v0.1 證據，依 v0.2 重新映射）

### 10.1 逐頁

| 來源 | 頁 | 內容 | v0.1 映射 | v0.2 映射 |
| --- | --- | --- | --- | --- |
| 提案 | P1 | 封面 + 5 項 agenda | `cover`+`agenda` | 同 ✅ |
| 提案 | P2 | 演進三段 + 五大痛點 + 結論 | `stack`:[stages, rows] | `custom`（`<Stages>`+`<Rows>`）✅ |
| 提案 | P3 | 6×6 矩陣 + legend + 6 註腳 + 3 卡 | `stack`（⚠️ 卡在密度上限） | `custom`（`<Table>`+`<Cards>`）✅ **密度上限解除** |
| 提案 | P4 | 共同基礎 3 卡 + 左右方案對比 | `stack`:[cards, compare] | `custom`（`<Cards>`+`<Compare>`）✅ |
| 提案 | P5 | 兩方案三層巢狀架構盒 | 🟡 需 freestyle（配額內） | `custom`（自己畫 SVG）✅ **不再是例外** |
| 提案 | P6 | 費用堆疊條 + 總覽條 + 3 格成本 | `stack`:[viz, viz, kpi] | `custom`（`<Kpi>`+自畫條）✅ |
| 月會 | P1 | 封面 + 3 項 agenda | `cover` | 同 ✅ |
| 月會 | P2/P5/P7 | 章節頁（195pt 大編號） | `section` | 同 ✅ |
| 月會 | P3 | KPI 帶 + 左數字/大卡 + 右 6 列 | `stack`:[kpi, columns] | `custom`（`<Kpi>`+`<Rows>`，分欄直接寫 flex）✅ |
| 月會 | P4 | LTS 說明 + 2 方案卡 + 決策流程圖 | `stack`:[text, columns] | `custom` ✅ |
| 月會 | P6 | 4 張 workstream 卡 + Gantt | `stack`:[cards, viz] | `custom` ✅ |
| 月會 | P8 | 左現況 + 右 5 步驟 + 底部三段 | `stack`:[columns, stages] | `custom` ✅ |
| 月會 | P9 | **8 欄**會議卡（3 群色帶） | ⚠️ 超過 6 欄上限 | `custom`（自己排 8 欄）✅ **上限解除** |
| 月會 | P10 | 交付物×時程矩陣（整欄 highlight） | `stack`:[table] | `custom`（`<Table>`）✅ |
| 月會 | P11 | 深藍底 3 卡 next steps | `closing`(dark) | 同 ✅ |

### 10.2 統計對照

| | v0.1 | v0.2 |
| --- | --- | --- |
| ✅ 完全可表達 | 14 / 82.4% | **17 / 100%** |
| ⚠️ 超過密度上限 | 2 / 11.8% | 0 |
| 🟡 需逃生門 | 1 / 5.9% | 0（`custom` 就是主幹道） |

v0.1 的三個問題頁（提案 P3 密度、提案 P5 巢狀架構、月會 P9 八欄）**全部解除**。
這是 v0.2 換來的實質收益 —— 代價是 §1.2 的品質保護，靠 §4/§5/§7 三道護欄補回。

---

## 11. 遷移影響

### 11.1 程式碼

| 檔案 | 改動 |
| --- | --- |
| `src/lib/decks.ts` | `Slide` 改 discriminated union（6 種）；`Tone` 拆成 `SeriesTone`/`StatusTone`；新增 `CustomSlideProps` |
| `src/components/deck/slideLayouts.tsx` | 保留 5 個版型；**`SlideChrome` 抽成獨立元件**（`custom` 頁也要套）；字級改引 `scale.ts`；移除 `bullets`/`media`/`compare`/`stack` |
| `src/components/deck/scale.ts` | **新增** —— `DS` / `DTRACK` / `DGAP`（audit B-1/B-2） |
| `src/components/deck/blocks/` | **新增 6 個元件**（Rows / Cards / Stages / Kpi / Table / Compare）—— 由 v0.1 §4 的型別轉為元件，內含 B-1/B-2/B-3 規則。v0.1 的 `text` / `columns` / `viz` 不做（§5.3.1） |
| `src/components/deck/SlideFrame.tsx` | `LAYOUTS[slide.layout] ?? LAYOUTS.bullets` 的 fallback 要換（`bullets` 已退役）；加 §7.3 dev 溢出偵測；`prefers-reduced-motion` + focus（audit B-5） |
| `src/components/deck/theme.ts` | 接入 status 暗色階（audit B-4） |
| `src/styles/tokens.css` | 新增 `--success-300` / `--warning-300` / `--danger-300` |

### 11.2 Skill 與 Agent

| 檔案 | 改動 |
| --- | --- |
| `.claude/skills/content-present/SKILL.md` | 版型詞彙表改寫為 6 種；**核心契約句要改** —— 從「deck 是純資料、不碰樣式」改為「5 個固定版型的頁是純資料；`custom` 頁是元件，須遵守 §5 原子層與 §4 chrome 規則」；加密度基準（§7.1）；加 audit A-1~A-8 |
| `.claude/agents/present-planner.md` | 規劃書格式加「`custom` 頁的版面構想」欄；加 A-2/A-3/A-6/A-8 |
| `.claude/agents/slide-generator.md` | **改動最大** —— 加讀 `trendlink-design`；允許寫樣式但限用原子層；加截圖驗證（注意檔內有 `<!-- BEGIN:validation-sg -->` 同步標記，viewer 模式的驗證段由 `sync-skill-template.mjs` 替換，兩套都要改） |
| `skill-template/` | 由 `scripts/sync-skill-template.mjs` 重新產生 |

### 11.3 既有 deck 檔（3 份，全部要動）

| 檔案 | 頁數 | 改動 |
| --- | --- | --- |
| `role-responsibility-rr.deck.tsx` | 8 | `bullets`/`media`/`compare` 3 頁改寫為 `custom` |
| `專案-vs-產品.deck.tsx` | 5 | `compare` 頁改寫為 `custom` |
| `trendlink-內部客戶與業務流程整合系統提案草稿.deck.tsx` | ? | 同上（未 commit，可直接重生成） |

`cover` / `section` / `full-visual` / `quote` / `closing` 的頁**欄位不變、不用動**。

**建議做法**：改完系統層後，直接用新流程**重新生成**這 3 份，而不是手改 —— 順便驗證
整條 pipeline（含截圖驗證）真的能跑通。

### 11.4 封裝相容性

無風險。新版型、`blocks/`、`scale.ts` 都在 `src/components/deck/`，隨 package 走，
不經過 `sync-skill-template` 的路徑改寫。`custom` 頁的元件在 deck 檔內，
watcher 現有規則已支援。

---

## 12. 已決議事項（2026-07-30，作者裁定）

| # | 議題 | 決議 | 理由 | 落在 |
| --- | --- | --- | --- | --- |
| 1 | 內容頁 layout 命名 | **`custom`**（不用 `freestyle`） | v0.1 的 `freestyle` 語意是「例外／逃生門」，還附帶「配額 ≤ 2 頁」「須寫明為何其他版型都不適用」的包袱。v0.2 它是主幹道，名字若讀起來像例外，AI 會傾向少用、回頭去拼版型。`page` / `content` 在本專案已分別指 `src/pages/` 與 `src/content/`，易混淆 | §6 |
| 2 | block 元件庫做幾個 | **6 個**：`<Rows>` `<Cards>` `<Stages>` `<Kpi>` `<Table>` `<Compare>` | 取捨標準是「有沒有承載設計決策」，不是出現次數。v0.1 的 `text`/`columns`/`viz` 是純版面，在 `custom` 頁裡退化成多餘的一層轉譯（`columns` ≈ `display:flex`）。`<Stages>` 與 `<Compare>` 雖然出現次數不算最高，但都是對齊目標裡的招牌頁型、設計細節多，自己畫容易走鐘 | §5.3、§5.3.1 |
| 3 | `custom` 頁元件的檔案落點 | **一律單檔，不設行數上限** | 檔案機器生成、機器整份覆寫，人不逐行讀（review 看截圖）。拆目錄要處理兩種模式的路徑別名、viewer watcher 深度規則、重新生成時的舊頁殘留 —— 為行數而增架構風險不值得 | §9 |
| 4 | `IconName` 白名單 | **維持 21 個，治理範圍限於 SlideChrome 欄位與 block props** | 白名單原本的目的是「deck 是純資料、不准 import 元件」，這個前提在 `custom` 頁已不成立。`custom` 頁自己畫時直接 `import` lucide-react（§5.4）。硬要求它也只用白名單，等於維護兩套規則卻擋不住任何事。狀態色需要的 `check`/`alert`/`x`/`info` 白名單本來就有 | §3、§5.4 |
| 5 | `section` 是否開放自由發揮 | **維持固定版型，但開 3 個參數**（`numScale` / `align` / `tone`） | 章節頁只有 40–60 字，自由排版的空間用不上；而它是密度對比的節奏支點，全篇重複 3–5 次，一旦自由，每頁做不同設計是最容易讓 deck 看起來像拼貼的地方。把真正屬於設計選擇的部分（大編號字級、對齊、深底）開成欄位，拿到選擇權又不失一致性 | §6 |

### 12.1 實作時再定（次要）

1. **§7.3 dev-only 溢出偵測要不要做**：`SlideFrame` 在 DEV 下量 `scrollHeight` 超標就畫紅框 +
   `console.warn`。是 §7.2 截圖驗證的補強而非替代，可延後。
2. **6 個 block 元件的 props 命名**：沿用 v0.1 §4 的欄位名（`k`/`v`/`n`/`desc`/`noteLabel`…）
   還是趁重寫改成更好讀的名字？沿用的好處是 v0.1 的欄位設計已通過 17 頁驗證。

---

## 附錄：與 deck-design-audit.md 的落點對照（v0.2 修訂）

audit 的 (a)/(b) 分流在 v0.2 有變動 —— 但因 §1.3 把 (b) 下移到原子層，**並未全數變成 (a)**：

| audit 項目 | v0.1 落點 | v0.2 落點 |
| --- | --- | --- |
| B-1 字級階梯 | (b) 版型元件 | **(b) `scale.ts`** + (a) `custom` 頁只准用 `DS` |
| B-2 `text-wrap`/letter-spacing | (b) 版型元件 | **(b) block 元件** + (a) 自畫時要守 |
| B-3 `tabular-nums` | (b) 版型元件 | **(b) `<Table>`/`<Kpi>`** + (a) 自畫時要守 |
| B-4 status 暗色階 | (c) tokens | **(c) tokens**（不變） |
| B-5 reduced-motion / focus | (b) 版型元件 | **(b) `SlideFrame`**（不變，全頁共用） |
| B-6 `Tone` 拆分 | (b) 型別 | **(b) 型別**（不變，見 §3） |
| A-1 密度 | (a) 規則 | (a) 規則 + **§7.2 截圖驗證強制執行** |
| A-3 編號編碼真實資訊 | (a) 規則 | (a) 規則（`custom` 頁自由度上升，這條更重要） |
| A-4 AI 味檢查表 | (a) 規則 | (a) 規則（同上） |
| A-9 截圖驗證 | (a) 建議 | **(a) 強制** —— v0.2 唯一的溢出安全網 |

其餘 audit 項目（A-2、A-5、A-6、A-7、A-8、C-1、C-2）落點不變。
