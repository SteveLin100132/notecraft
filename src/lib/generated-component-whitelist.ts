// AI 生成元件允許 import 的 npm 套件白名單。
//
// 三處消費同一份清單（見 docs/notecraft-npx-viewer-v2.md §6.6）：
//
// 1. astro.config.mjs 的 vite.resolve.dedupe —— 讓外部 tsx 從 viewer app root 解析
// 2. .claude/agents/component-generator.md 的 lint 規則 —— AI 產出前把關
// 3. .claude/skills/content-visualize/SKILL.md 的白名單段落 —— 給 planner 決策用
//
// scripts/sync-skill-template.mjs 把此常數注入到 (2)(3) 的占位標記
// `<!-- BEGIN:whitelist --> ... <!-- END:whitelist -->` 之間。加套件的流程：
//   a. 改本檔常數
//   b. 到 package.json dependencies 加對應套件
//   c. 跑 `npm run sync-skill`，兩個 markdown 檔會自動刷新
export const GENERATED_COMPONENT_PACKAGE_WHITELIST = [
  "react",
  "react-dom",
  "motion",
  "recharts",
  "d3",
  "lucide-react",
  "clsx",
  "tailwind-merge",
] as const;

export type GeneratedComponentPackage =
  (typeof GENERATED_COMPONENT_PACKAGE_WHITELIST)[number];
