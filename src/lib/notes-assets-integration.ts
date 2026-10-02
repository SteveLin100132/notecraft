import type { AstroIntegration } from "astro";
import { copyNotesAssetsAfterBuild } from "../dev-api/handlers.mjs";

/**
 * viewer 模式 build 完，把產物引用到的 `/notes-assets/*` 從筆記資料夾複製進 `<outDir>/notes-assets/`，
 * 讓 dist 部署到任何靜態主機都看得到圖片（view／serve 期間另有即時送出，見 handlers.mjs 的 tryHandleAssetsRequest）。
 *
 * - 主專案模式（沒有 NOTECRAFT_NOTES_DIR）→ no-op：主專案圖片在 public/ 或 src/assets/
 * - outDir 就是 astro build 的輸出（serve 背景 rebuild 時是 dist.next，之後整包 rename，複本跟著走）
 * - 掃描、路徑防護、NOTECRAFT_BASE 的處理都在 handlers.mjs 的 copyNotesAssetsAfterBuild
 */
export default function notesAssets(): AstroIntegration {
  return {
    name: "notecraft-notes-assets",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        await copyNotesAssetsAfterBuild(dir, logger);
      },
    },
  };
}
