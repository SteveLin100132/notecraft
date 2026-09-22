import type { AstroIntegration } from "astro";
import path from "node:path";
import { resolveNotecraftDir, resolveNotesRoot, tryHandleDevRequest } from "./handlers.mjs";

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

        // plugins.json 變動（含 PUT /api/plugins/:id 寫入）：src/lib/plugins.ts 以模組層變數快取解析結果，
        // dev 下不會自己失效。這裡監看該檔，變動時清快取並讓瀏覽器整頁重載。
        // 資料檔（notesDir 底下的 .json）改了也一樣：meta.title／description／backTo 都是解析時讀進快取的。
        const cfgPath = path.join(resolveNotecraftDir(cwd), "plugins.json");
        const notesPrefix = notesRoot.endsWith(path.sep) ? notesRoot : notesRoot + path.sep;
        server.watcher.add(cfgPath);
        const onChange = async (file: string) => {
          const abs = path.resolve(file);
          const isDataFile = abs.startsWith(notesPrefix) && abs.toLowerCase().endsWith(".json");
          if (abs !== cfgPath && !isDataFile) return;
          try {
            const mod = await server.ssrLoadModule("/src/lib/plugins.ts");
            (mod as { invalidatePluginCaches?: () => void }).invalidatePluginCaches?.();
          } catch {
            /* 模組尚未載入過就不必清 */
          }
          // 讓所有依賴它的 SSR 模組重新執行（workbench.ts 的快取只在正式 build 生效，dev 每次請求重算）
          const m = server.moduleGraph.getModuleById(path.join(cwd, "src/lib/plugins.ts"));
          if (m) server.moduleGraph.invalidateModule(m);
          server.ws.send({ type: "full-reload" });
        };
        server.watcher.on("change", onChange);
        server.watcher.on("add", onChange);
        server.watcher.on("unlink", onChange);
      },
    },
  };
}
