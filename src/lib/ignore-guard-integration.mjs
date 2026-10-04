import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getNotesIgnore } from "./notes-ignore-state.mjs";

/**
 * 護欄：被 .notecraft/ignore.json 排除的檔不得出現在產物（docs/notecraft-ignore-config.md §6）。
 *
 * 筆記、資料檔、附件三條路在各自的接點都已擋下；這裡從產物端兜底，防的是日後新增的接點忘了套 ignore。
 * 只看兩件事，違反就讓 build 失敗：
 *   1. <outDir>/notes-assets/ 底下沒有被排除的路徑
 *   2. <outDir>/wb-index.json 的筆記與資料檔 path 沒有被排除的
 * 排在 notesAssets 之後（附件要先複製完才看得到）。訊息只用 notesDir 相對路徑。
 */
/** @returns {import("astro").AstroIntegration} */
export default function ignoreGuard() {
  return {
    name: "notecraft-ignore-guard",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const ig = getNotesIgnore();
        const outDir = fileURLToPath(dir);
        /** @type {string[]} */
        const hits = [];
        /** @param {string} rel */
        const ignored = (rel) => {
          try {
            return ig.ignores(rel);
          } catch {
            return false;
          }
        };

        const assetsRoot = path.join(outDir, "notes-assets");
        /** @param {string} d @param {string} prefix */
        const walk = (d, prefix) => {
          let ents;
          try {
            ents = fs.readdirSync(d, { withFileTypes: true });
          } catch {
            return;
          }
          for (const e of ents) {
            const rel = `${prefix}${e.name}`;
            if (e.isDirectory()) walk(path.join(d, e.name), `${rel}/`);
            else if (e.isFile() && ignored(rel)) hits.push(`notes-assets/${rel}`);
          }
        };
        walk(assetsRoot, "");

        const indexPath = path.join(outDir, "wb-index.json");
        if (fs.existsSync(indexPath)) {
          const index = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
          // notes[].path 與 dataFiles[].relPath 都是相對 notesDir 的真實路徑（WbNoteRow.path）
          const rows = [
            ...(index.notes ?? []).map((/** @type {{ path?: string }} */ r) => r.path),
            ...(index.dataFiles ?? []).map((/** @type {{ relPath?: string }} */ r) => r.relPath),
          ];
          for (const p of rows) {
            if (typeof p === "string" && p && ignored(p)) hits.push(`wb-index.json：${p}`);
          }
        }

        if (hits.length) {
          throw new Error(
            `[ignore] ${hits.length} 個被 .notecraft/ignore.json 排除的檔出現在產物（排除的檔不得輸出，見 docs/notecraft-ignore-config.md §6）：\n` +
              hits.slice(0, 20).map((h) => `  ${h}`).join("\n") +
              (hits.length > 20 ? `\n  …另有 ${hits.length - 20} 個` : ""),
          );
        }
        if (ig.source) logger.info("產物中沒有被 ignore.json 排除的檔");
      },
    },
  };
}
