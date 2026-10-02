import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findLocalPath, localPathNeedles } from "./local-path.ts";

/**
 * 護欄：build 完掃 outDir 的 .html／.json，含本機絕對路徑就讓 build 失敗。
 *
 * `/wb-index.json` 早就有 assertNoAbsolutePath，但 island props（例：PluginHost 的 rendererPath）
 * 與其他頁面不經過它，曾經悄悄把 plugin 目錄寫進正式頁面。這裡從產物端兜底，不管是哪個欄位帶進來的。
 *
 * 找的是 app 根（cwd）、使用者專案根（NOTECRAFT_USER_CWD）與 notesDir —— 與 assertNoAbsolutePath 同一組。
 * dev 不跑（astro:build:done 只在 build 觸發）；dev-only 的 vscode:// 連結由 findLocalPath 放行。
 */
/** @returns {import("astro").AstroIntegration} */
export default function noLocalPath() {
  return {
    name: "notecraft-no-local-path",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const roots = [process.cwd()];
        if (process.env.NOTECRAFT_USER_CWD) roots.push(path.resolve(process.env.NOTECRAFT_USER_CWD));
        roots.push(
          process.env.NOTECRAFT_NOTES_DIR
            ? path.resolve(process.env.NOTECRAFT_NOTES_DIR)
            : path.resolve(process.cwd(), "src/content/notes"),
        );
        const needles = localPathNeedles(roots);
        const outDir = fileURLToPath(dir);
        /** @type {string[]} */
        const hits = [];
        let scanned = 0;
        /** @param {string} d */
        const walk = async (d) => {
          for (const e of await fs.readdir(d, { withFileTypes: true })) {
            const abs = path.join(d, e.name);
            if (e.isDirectory()) await walk(abs);
            else if (e.isFile() && /\.(html|json)$/i.test(e.name)) {
              scanned++;
              const hit = findLocalPath(await fs.readFile(abs, "utf-8"), needles);
              if (hit) hits.push(`  ${path.relative(outDir, abs).split(path.sep).join("/")}：…${hit.excerpt.replace(/\s+/g, " ")}…`);
            }
          }
        };
        await walk(outDir);
        if (hits.length) {
          throw new Error(
            `[no-local-path] ${hits.length} 個輸出檔含本機絕對路徑（正式產物不得出現，見 CLAUDE.md）：\n` +
              hits.slice(0, 20).join("\n") +
              (hits.length > 20 ? `\n  …另有 ${hits.length - 20} 個` : ""),
          );
        }
        logger.info(`已掃描 ${scanned} 個 .html／.json，未含本機絕對路徑`);
      },
    },
  };
}
