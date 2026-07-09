import type { AstroIntegration } from "astro";
import { resolveNotesRoot, tryHandleDevRequest } from "./handlers.mjs";

// P6：整套 handler 邏輯搬到 handlers.mjs（純 JS ESM），讓 CLI 的 Node HTTP server 也能重用。
// 本檔僅提供 astro dev 期間掛載 middleware 的 wrapper。
export default function devApi(): AstroIntegration {
  return {
    name: "notecraft-dev-api",
    hooks: {
      "astro:server:setup": ({ server }) => {
        const cwd = process.cwd();
        const notesRoot = resolveNotesRoot(cwd);
        server.middlewares.use(async (req, res, next) => {
          const handled = await tryHandleDevRequest(cwd, notesRoot, req, res);
          if (!handled) return next();
        });
      },
    },
  };
}
