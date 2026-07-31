// Deck 亮 / 暗主題 token 對照（Task 24）。照抄設計交接 deck.jsx 的 DKT，語意不變。
// 值一律取自專案 src/styles/tokens.css 的 CSS 變數，不硬編色碼。

export interface DeckThemeTokens {
  stage: string; // 舞台（投影片外的底）
  chrome: string; // 工具列 / 面板
  rail: string; // 縮覽側欄
  slide: string; // 投影片底
  border: string;
  borderSoft: string;
  ink: string;
  body: string;
  muted: string;
  brand: string;
  brandInk: string;
  brandSoft: string;
  accent: string;
  accentSoft: string;
  /**
   * SeriesTone 的 "muted" **標記色**（非文字色）。
   *
   * 刻意與下面的 `muted`（文字墨色）分開：dataviz 的硬規則是「文字穿文字 token、
   * 不穿系列色」，兩者職責不同。實測理由 —— 若讓標記直接沿用文字用的 `muted`
   * （暗色 = neutral-400），它與暗色 `brand`（blue-300）的 ΔE 只有 6.1（normal），
   * 低於 15 的 hard FAIL，`tone:"blue"` 與 `tone:"muted"` 在暗色投影片上分不出來。
   * 改用暗色 neutral-300 後三色全項 PASS。
   */
  seriesMuted: string;
  /**
   * 狀態色（StatusTone）。與 brand / accent（識別色）分開是硬規則 ——
   * 詳見 src/lib/decks.ts 的 StatusTone 註解與 docs/deck-design-audit.md §3.2。
   * 使用時**必須**同時輸出 icon + 文字標籤，不可讓色彩單獨承載語意。
   *
   * `*Soft` 是底色、無 Soft 的是前景（文字 / icon / 描邊）。
   */
  good: string;
  goodSoft: string;
  warning: string;
  warningSoft: string;
  critical: string;
  criticalSoft: string;
  sunken: string;
  hover: string;
  shadow: string;
  shadowLg: string;
}

export const DKT: { light: DeckThemeTokens; dark: DeckThemeTokens } = {
  light: {
    stage: "var(--neutral-100)",
    chrome: "var(--neutral-0)",
    rail: "var(--neutral-50)",
    slide: "var(--neutral-0)",
    border: "var(--neutral-200)",
    borderSoft: "var(--neutral-100)",
    ink: "var(--neutral-900)",
    body: "var(--neutral-700)",
    muted: "var(--neutral-500)",
    brand: "var(--blue-700)",
    brandInk: "var(--blue-700)",
    brandSoft: "var(--blue-50)",
    accent: "var(--orange-500)",
    accentSoft: "var(--orange-50)",
    seriesMuted: "var(--neutral-400)",
    good: "var(--success-500)",
    goodSoft: "var(--success-50)",
    // 白底用 700 階：warning-500 在 #ffffff 上僅 2.26:1，當文字色不可讀
    warning: "var(--warning-700)",
    warningSoft: "var(--warning-50)",
    critical: "var(--danger-500)",
    criticalSoft: "var(--danger-50)",
    sunken: "var(--neutral-100)",
    hover: "var(--neutral-50)",
    shadow: "var(--shadow-sm)",
    shadowLg: "var(--shadow-lg)",
  },
  dark: {
    stage: "var(--neutral-900)",
    chrome: "var(--neutral-800)",
    rail: "var(--neutral-900)",
    slide: "var(--neutral-800)",
    border: "rgba(255,255,255,0.14)",
    borderSoft: "rgba(255,255,255,0.08)",
    ink: "var(--neutral-0)",
    body: "var(--neutral-200)",
    muted: "var(--neutral-400)",
    brand: "var(--blue-300)",
    brandInk: "var(--blue-200)",
    brandSoft: "rgba(44,110,187,0.20)",
    accent: "var(--orange-300)",
    accentSoft: "rgba(237,155,38,0.14)",
    // 深底的系列 muted 標記取 neutral-300（不是文字用的 neutral-400，見型別註解）
    seriesMuted: "var(--neutral-300)",
    // 深底一律取 300 階（500 階在 #262e3d 上不可讀，見 tokens.css 註解）
    good: "var(--success-300)",
    goodSoft: "rgba(92,196,148,0.16)",
    warning: "var(--warning-300)",
    warningSoft: "rgba(242,193,78,0.16)",
    critical: "var(--danger-300)",
    criticalSoft: "rgba(239,139,139,0.16)",
    sunken: "rgba(255,255,255,0.05)",
    hover: "rgba(255,255,255,0.07)",
    shadow: "0 2px 10px rgba(0,0,0,0.45)",
    shadowLg: "0 18px 44px rgba(0,0,0,0.55)",
  },
};

export const dkt = (dark: boolean): DeckThemeTokens => (dark ? DKT.dark : DKT.light);

export type DeckTheme = "light" | "dark";
