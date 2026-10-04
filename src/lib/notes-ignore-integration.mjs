import path from "node:path";
import { resetHandlersIgnore } from "../dev-api/handlers.mjs";
import { IGNORE_FILE } from "./notes-ignore.mjs";
import { getNotecraftDir, resetNotesIgnore } from "./notes-ignore-state.mjs";

/**
 * dev（astro dev／notecraftapp view）期間 `.notecraft/ignore.json` 變動 → 重新啟動 dev server
 * （docs/notecraft-ignore-config.md §5.4）。
 *
 * 比對器在 Content Layer、plugins.ts、dev-api 各有快照，熱替換要逐一失效、還要讓 glob loader 重跑；
 * 整個重啟最單純：config 重新載入、Content Layer 重新同步（被排除的 entry 因沒被碰到而移除）。
 * 檔案不存在也要先 watch，才收得到 add。build 不受影響（只掛 astro:server:setup）。
 */
/** @returns {import("astro").AstroIntegration} */
export default function notesIgnoreWatch() {
  return {
    name: "notecraft-ignore-watch",
    hooks: {
      "astro:server:setup": ({ server, logger }) => {
        const file = path.join(getNotecraftDir(), IGNORE_FILE);
        server.watcher.add(file);
        /** @type {ReturnType<typeof setTimeout> | null} */
        let timer = null;
        /** @param {string} p */
        const onEvent = (p) => {
          if (path.resolve(p) !== file) return;
          // 編輯器常以「刪除再寫入」存檔，連發兩個事件；合成一次重啟
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => {
            timer = null;
            logger.info("ignore.json 已變更，重新啟動 dev server");
            resetNotesIgnore();
            resetHandlersIgnore();
            server.restart();
          }, 300);
        };
        server.watcher.on("add", onEvent);
        server.watcher.on("change", onEvent);
        server.watcher.on("unlink", onEvent);
      },
    },
  };
}
