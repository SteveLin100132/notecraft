import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * 護欄：Astro content layer 的內部檔不得出現在產物根目錄。
 *
 * data-store.json 含每篇筆記的完整原文與本機絕對路徑，部署出去等於公開原始檔。1.10.0 以前 CLI 的產物都夾帶它：
 * outDir 不在 process.cwd() 底下時，Astro 5 的 static build 把 SSR 中間產物寫到 <cwd>/.astro/ 再整包 cp 進 outDir，
 * 而 <cwd>/.astro/ 也是 content layer 的 dotAstroDir（見 bin/notecraftapp.mjs 的 runAstroBuild）。
 * 這些名稱不可能是正當產物（筆記頁都在 /notes/、/view/ 底下），出現就 build fail。
 * 排在 noLocalPath 之前：同一個成因下，這裡的訊息才講得出要修哪裡。
 */
export const CONTENT_LAYER_FILES = ["data-store.json", "content-assets.mjs", "content-modules.mjs", "collections", "settings.json"];

/** @returns {import("astro").AstroIntegration} */
export default function contentLayerGuard() {
  return {
    name: "notecraft-content-layer-guard",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const outDir = fileURLToPath(dir);
        const hits = CONTENT_LAYER_FILES.filter((name) => fs.existsSync(path.join(outDir, name)));
        if (hits.length) {
          throw new Error(
            `[content-layer-guard] 產物根目錄含 Astro content layer 的內部檔：${hits.join("、")}。\n` +
              `  data-store.json 含筆記原文與本機路徑，不得部署。常見成因：--outDir 不在 astro 的 cwd 底下，` +
              `Astro 會經 <cwd>/.astro/ 中轉而把它們一起複製進來（CLI 應 build 到 app 根底下的 staging 目錄）。`,
          );
        }
        logger.info("產物未含 content layer 內部檔");
      },
    },
  };
}
