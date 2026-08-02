// Deck 資料模型（Task 31 — 契約 v0.2）。
//
// 一篇筆記至多對應一份 deck，產物為 `.tsx` 模組（default export 一個 Deck）：
//   - 主專案模式：src/components/generated/<slug>.deck.tsx
//   - viewer 模式：<userCwd>/.notecraft/components/<slug>.deck.tsx（@notes alias）
//
// v0.2 的核心改變：內容頁不再由系統版型枚舉，改為 `custom` 自由頁（deck 檔內定義
// 一個頁面元件、以 `render` 傳入）。只保留 5 個「結構固定、不需要創意」的版型。
// 完整理由與護欄見 docs/deck-slide-contract.md。

import type { ComponentType } from "react";

// ── 共用型別（契約 §3）──────────────────────────────────────

/**
 * 識別色：只表示「這是 A 還是 B」，無好壞意涵。
 * 只有這三個值 —— dataviz validator 實測 blue↔orange 在 light 模式全項 PASS
 * （ΔE 38.1 normal / 29.7 protan）。見 docs/deck-design-audit.md §3.2-C。
 */
export type SeriesTone = "blue" | "orange" | "muted";

/**
 * 狀態色：只表示 好 / 注意 / 壞。**渲染端必須同時輸出 icon + 文字標籤**，
 * 不可讓色彩單獨承載語意。
 *
 * 與 SeriesTone 分開是硬規則：契約 v0.1 曾把兩者混成一個 5 色 union，實測
 * 紅↔綠 ΔE 5.4（deutan）、紅↔橘 ΔE 12.8（normal，低於 15 的 hard FAIL）。
 * 見 docs/deck-design-audit.md §3.2-A。
 */
export type StatusTone = "good" | "warning" | "critical";

/**
 * 允許的 icon 名。系統查表對映 lucide-react，deck 只給字串。
 *
 * **治理範圍限於 SlideChromeFields 的欄位與 block 元件的 props。**
 * `custom` 頁自己畫時可直接 `import { … } from "lucide-react"`，不受本表限制 ——
 * 白名單原本的目的是「deck 是純資料、不准 import 元件」，這個前提在 `custom` 頁
 * 已不成立，硬套只會維護兩套規則卻擋不住任何事。見契約 §5.4。
 */
export type IconName =
  | "alert" | "check" | "x" | "info" | "lightbulb" | "target"
  | "clock" | "user" | "users" | "database" | "lock" | "gauge"
  | "layers" | "file" | "folder" | "link" | "cloud" | "plug"
  | "git-branch" | "settings" | "trend-up";

// ── 內容頁共用外框（契約 §4）─────────────────────────────────

export interface Pill {
  text: string;
  tone?: SeriesTone;
}

export interface LegendItem {
  label: string;
  tone?: SeriesTone | StatusTone;
  icon?: IconName;
}

export interface Footnote {
  n: string;
  text: string;
}

export interface CalloutItem {
  label?: string;
  text: string;
  tone?: SeriesTone | StatusTone;
}

export interface Callout {
  icon?: IconName;
  /** 單句形態 */
  text?: string;
  /** 多段形態（如 MUST / MUST NOT 雙色塊） */
  items?: CalloutItem[];
  /** 右側 chip */
  chip?: string;
  tone?: SeriesTone | StatusTone;
}

/**
 * 內容頁（custom / full-visual / closing）共用外框。cover / section / quote 不套用。
 *
 * `custom` 頁**不准自己畫**這些元素 —— 一律由系統的 SlideChrome 提供。
 * 這是 v0.2 視覺一致性的主要來源。
 */
export interface SlideChromeFields {
  /** 縮覽與大綱面板的短標題（每頁必填） */
  nav: string;
  /** 左上編號徽章，如 "01"。只在內容真的是序列時才給（不當裝飾） */
  num?: string;
  /** 徽章後的 kicker，如 "PART 01 · 一鍵發薪進度匯報" */
  eyebrow?: string;
  title?: string;
  /** 主標同行的淡色註解 */
  titleNote?: string;
  pill?: Pill;
  legend?: LegendItem[];
  callout?: Callout;
  footnotes?: Footnote[];
}

// ── 6 種版型（契約 §6）──────────────────────────────────────

export type SlideLayout =
  | "cover"
  | "section"
  | "custom"
  | "full-visual"
  | "quote"
  | "closing";

export interface AgendaItem {
  n: string;
  title: string;
  sub?: string;
}

/** 封面。對齊目標的兩份簡報都是「左標題 + 右 agenda」一頁，故 agenda 是 cover 的 slot */
export interface CoverSlide {
  layout: "cover";
  nav: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  meta?: string[];
  agenda?: AgendaItem[];
}

/**
 * 章節分隔頁。維持固定版型（結構就 40–60 字，自由排版用不上；且它是密度對比的
 * 節奏支點，每頁長不一樣反而削弱節奏）。真正屬於設計選擇的部分開成參數。
 */
export interface SectionSlide {
  layout: "section";
  nav: string;
  num: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** 大編號字級。預設 "mega" */
  numScale?: "mega" | "hero";
  /** 版面對齊。預設 "left" */
  align?: "left" | "center";
  /**
   * 底色。**預設 "dark"（深藍底）** —— 參考簡報的章節頁就是深底，且既有 deck
   * 不帶此參數時不該改變外觀。給 "light" 為淺藍底變體。
   */
  tone?: "light" | "dark";
}

export interface CustomSlideProps {
  /** 暗色模式；render 內一律用它取 token，不可硬編色碼 */
  dark: boolean;
  /**
   * 是否為「真正在看」的畫面（主畫布 / 播放中）。縮覽圖為 false。
   * **動畫與計時器一律只在 live === true 時啟動** —— 否則縮覽側欄同時掛
   * 十幾頁 motion / recharts 會拖垮整頁。
   */
  live: boolean;
  /**
   * SlideChrome 佔用後剩下的可用內容區（1600×900 座標系內的 px）。
   * 溢出不會報錯、只會被裁掉 —— 這個值是 custom 頁自我約束的依據。
   */
  area: { w: number; h: number };
  /**
   * 全螢幕播放中。與 full-visual 同樣的用途：頁內若放 `<CanvasViewport>`，
   * 播放模式下畫布改為「純滾輪即縮放」並收斂控制列。
   */
  play: boolean;
  /**
   * 外層 SlideFrame 的 `transform: scale` 倍率。頁內放 `<CanvasViewport>` 時
   * **必須往下傳** —— 畫布靠它把指標位移換算回 1600×900 座標系，否則拖曳不跟手。
   */
  outerScale: number;
}

/** 自由頁 —— v0.2 的主力。取代 v0.1 的 bullets / media / compare。 */
export interface CustomSlide extends SlideChromeFields {
  layout: "custom";
  render: ComponentType<CustomSlideProps>;
  /** 預設 true。false = 整頁滿版視覺，需在規劃書寫明理由 */
  chrome?: boolean;
}

/** 滿版視覺：沿用筆記既有的 @ai-visualize 元件（與 custom 的分界見契約 §6.1） */
export interface FullVisualSlide extends SlideChromeFields {
  layout: "full-visual";
  title: string;
  /**
   * 嵌入的互動元件。**可省略** —— 標記尚未生成元件時留空，畫布會顯示空狀態
   * （虛線紙張輪廓 + 標記 id + disabled 控制列），而不是一塊沒有解釋的空白。
   */
  viz?: ComponentType;
  /** 兩個並排（如兩方案架構對照） */
  viz2?: ComponentType;
  vizLabel?: string;
  /**
   * 元件原設計的版心寬度（畫布上那張「紙」的內容寬）。預設 860 ——
   * 與筆記內文的版心一致，元件在簡報裡的換行位置才會跟筆記裡看到的一樣。
   */
  vizWidth?: number;
  /** 空狀態（`viz` 未給）時取代預設說明的一句話。元件已生成時不顯示。 */
  vizHint?: string;
}

export interface QuoteSlide {
  layout: "quote";
  nav: string;
  eyebrow?: string;
  quote: string;
  by?: string;
  byMeta?: string;
}

/** closing 版型的回顧項 */
export interface RecapItem {
  n: string;
  k: string;
  v: string;
}

export interface ClosingSlide extends SlideChromeFields {
  layout: "closing";
  title: string;
  items: RecapItem[];
  cta?: string;
  ctaMeta?: string;
  /** 深底變體 */
  tone?: "light" | "dark";
}

export type Slide =
  | CoverSlide
  | SectionSlide
  | CustomSlide
  | FullVisualSlide
  | QuoteSlide
  | ClosingSlide;

export interface Deck {
  /** = 筆記 slug，決定 /present/<slug> */
  slug: string;
  title: string;
  eyebrow: string;
  generatedAt: string;
  /** 來源 MDX 路徑，顯示於檢視模式左下 */
  source: string;
  slides: Slide[];
}

// ── 兩模式列舉解析（Task 23 成果，v0.2 不動）──────────────────

// 兩模式合併 glob（compile-time 靜態字串；各模式各自命中一邊、另一邊回空）：
//   - 主專案：/src/components/generated/*.deck.tsx（root-relative，恆有效）
//   - viewer：@notes/components/*.deck.tsx（@notes alias 由 astro.config 恆定義）
const modules: Record<string, { default?: Deck }> = {
  ...import.meta.glob<{ default?: Deck }>("/src/components/generated/*.deck.tsx", {
    eager: true,
  }),
  ...import.meta.glob<{ default?: Deck }>("@notes/components/*.deck.tsx", {
    eager: true,
  }),
};

// slug 一律正規化為 NFC 再比對：中文檔名在 macOS 檔系存為 NFD（分解式）、
// 字面量與 URL 多為 NFC（組合式），兩者「看起來相同、位元組不同」會讓純字串
// 比對判錯 —— 導致工具列該顯示「簡報」卻顯示「生成簡報」、或 /present/<slug> 404。
const nfc = (s: string): string => s.normalize("NFC");

const bySlug = new Map<string, Deck>();
for (const mod of Object.values(modules)) {
  const deck = mod?.default;
  if (deck?.slug) bySlug.set(nfc(deck.slug), deck);
}

/** 所有已生成簡報的筆記 slug（NFC；供 getStaticPaths、Dashboard 統計） */
export function allDeckSlugs(): string[] {
  return [...bySlug.keys()];
}

/** 取某 slug 的 deck；不存在回 null（比對前正規化為 NFC） */
export function deckOf(slug: string): Deck | null {
  return bySlug.get(nfc(slug)) ?? null;
}

/** 該筆記是否已生成簡報（驅動功能列入口 / 路由 / 統計；比對前正規化為 NFC） */
export function hasDeck(slug: string): boolean {
  return bySlug.has(nfc(slug));
}
