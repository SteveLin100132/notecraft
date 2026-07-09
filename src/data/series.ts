// ── 系列型別與視覺 token（client-safe）──
// P4：SERIES 常數已搬到 series.registry.ts；載入邏輯移到 src/lib/series.ts 的 loadSeries()。
// 本檔僅含型別與 accent tokens，可被 client island 與 build 端共同 import，無 Node 依賴。

export type SeriesAccent = "blue" | "orange" | "navy";

/** icon 名稱：對應 src/components/islands/seriesShared.tsx 的 SERIES_ICONS 對照表。 */
export type SeriesIconName = "target" | "code" | "layers" | "bookOpen" | "bolt";

export type SeriesDef = {
  /** 唯一 id，路由用（/series/[id]）。 */
  id: string;
  title: string;
  /** 英文 overline（大寫、寬字距）。 */
  eyebrow: string;
  description: string;
  /** 封面漸層色系。 */
  accent: SeriesAccent;
  icon: SeriesIconName;
  /** 章節 slug 陣列，順序 = 章節順序。 */
  slugs: string[];
};

// ── accent → 視覺 token（CSS 變數字串，astro 與 island 共用）──
export type AccentTokens = {
  /** 封面 125° 漸層。 */
  gradient: string;
  /** 進度條 reading 段底色（會再套 0.45 透明度）。 */
  solid: string;
  /** 章節序號徽章底。 */
  soft: string;
  /** 序號徽章字 / 百分比字。 */
  deep: string;
};

export const ACCENT: Record<SeriesAccent, AccentTokens> = {
  blue: {
    gradient:
      "linear-gradient(125deg, var(--blue-700) 0%, var(--blue-500) 100%)",
    solid: "var(--blue-500)",
    soft: "var(--blue-50)",
    deep: "var(--blue-700)",
  },
  orange: {
    gradient:
      "linear-gradient(125deg, var(--orange-500) 0%, var(--orange-300) 100%)",
    solid: "var(--orange-400)",
    soft: "var(--orange-50)",
    deep: "var(--orange-600)",
  },
  navy: {
    gradient:
      "linear-gradient(125deg, var(--blue-900) 0%, var(--blue-600) 100%)",
    solid: "var(--blue-700)",
    soft: "var(--blue-50)",
    deep: "var(--blue-900)",
  },
};
