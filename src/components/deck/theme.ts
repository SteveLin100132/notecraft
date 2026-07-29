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
    sunken: "rgba(255,255,255,0.05)",
    hover: "rgba(255,255,255,0.07)",
    shadow: "0 2px 10px rgba(0,0,0,0.45)",
    shadowLg: "0 18px 44px rgba(0,0,0,0.55)",
  },
};

export const dkt = (dark: boolean): DeckThemeTokens => (dark ? DKT.dark : DKT.light);

export type DeckTheme = "light" | "dark";
