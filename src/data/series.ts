// ── 系列登錄（Series registry）──
// 集中式系列定義：把相關筆記串成「有順序的閱讀路徑」。
// `slugs` 的順序即章節順序（章節順序的唯一權威，見 PRD §7.1〈系列資料模型〉Q1）。
//
// 本檔為「純資料」，不 import astro:content，可同時被 build 端（src/lib/series.ts）
// 與 client island 安全引用。

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

export const SERIES: SeriesDef[] = [
  {
    id: "pm-basics",
    title: "專案管理筆記",
    eyebrow: "PROJECT MANAGEMENT",
    description:
      "從「在管什麼」到「怎麼做、誰來做、如何落地」—— 一條從核心觀念到團隊權責與落地工具的專案管理入門路徑。",
    accent: "navy",
    icon: "target",
    slugs: [
      "專案管理系列",
      "專案-vs-產品",
      "waterfall-vs-agile",
      "role-responsibility-rr",
      "waterfall-sdlc",
      "project-mgmt-tool-專案管理工具",
      "專案管理系列第六章-需求分析",
      "專案管理系列第七章-規格撰寫",
    ],
  },
  {
    id: "ai-consultant-notes",
    title: "AI 顧問陪跑筆記",
    eyebrow: "AI CONSULTANT NOTES",
    description:
      "AI 顧問陪跑筆記：紀錄與 AI 顧問 Danny 進行 Workshop 期間的 AI 技術交流與專案討論，包含對 AI 技術的理解、實驗過程、專案規劃與管理等面向的內容，作為未來 AI 專案參考與學習的資源。",
    accent: "navy",
    icon: "code",
    slugs: ["建立-bump-prd-hook-的認知調整歷程"],
  },
  {
    id: "ai-consultant-workshop",
    title: "AI 顧問陪跑 Workshop 會議紀錄",
    eyebrow: "AI CONSULTANT WORKSHOP",
    description:
      "AI 顧問陪跑 Workshop 會議紀錄：紀錄與 AI 顧問 Danny Workshop 會議中的 AI 技術交流與專案討論，包含對 AI 技術的理解、實驗過程、專案規劃與管理等面向的內容，作為未來 AI 專案參考與學習的資源。",
    accent: "navy",
    icon: "bolt",
    slugs: ["ai-顧問陪跑-workshop-20260611"],
  },
];

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

export function seriesById(id: string): SeriesDef | null {
  return SERIES.find((s) => s.id === id) ?? null;
}
