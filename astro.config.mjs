import path from "node:path";
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import remarkDirective from "remark-directive";
import remarkNotecraftDirectives from "./src/lib/remark-notecraft-directives.ts";
import remarkNotecraftCodeblock from "./src/lib/remark-notecraft-codeblock.ts";
import remarkNotecraftNotesAssets from "./src/lib/remark-notecraft-notes-assets.ts";
import { GENERATED_COMPONENT_PACKAGE_WHITELIST } from "./src/lib/generated-component-whitelist.ts";
import devApi from "./src/dev-api/integration.ts";

// v2 Q3 + Bug fix: `.notecraft/` 資料夾**放在 userCwd**（使用者專案根、與 .claude/ 同層），
// 不放在 notesDir——因為 subagent 從 project root 跑並寫到 cwd 下的 .notecraft/，
// 若 alias 指向 notesDir/.notecraft 會找不到（例如 serve ./notes 時 notesDir=project/notes/）。
//
// 讀取優先序：NOTECRAFT_USER_CWD > NOTECRAFT_NOTES_DIR。CLI 兩者都會設；
// 舊版 CLI 或 npm run astro build 直接跑時可能只有 notesDir，退回舊行為保相容。
const notesDir = process.env.NOTECRAFT_NOTES_DIR
  ? path.resolve(process.env.NOTECRAFT_NOTES_DIR)
  : null;
const userCwd = process.env.NOTECRAFT_USER_CWD
  ? path.resolve(process.env.NOTECRAFT_USER_CWD)
  : null;
const notecraftDir = userCwd
  ? path.join(userCwd, ".notecraft")
  : notesDir
    ? path.join(notesDir, ".notecraft")
    : null;

export default defineConfig({
  output: "static",
  integrations: [
    mdx(),
    react(),
    tailwind({ applyBaseStyles: false }),
    devApi(),
  ],
  vite: {
    server: {
      host: "127.0.0.1",
      // fs.allow：notesDir、userCwd 都要允許（dev server 才能讀專案根外的 tsx / mdx）
      ...(notesDir && { fs: { allow: [process.cwd(), notesDir, ...(userCwd ? [userCwd] : [])] } }),
    },
    resolve: {
      alias: notecraftDir ? { "@notes": notecraftDir } : {},
      // 外部 mdx 引用的 tsx 位在 .notecraft/components/ 底下、無自帶 node_modules；
      // rollup 若從 tsx 位置向上找不到白名單套件會 build fail。
      // dedupe 強制這些套件一律從 viewer app 的 project root 解析。
      // 白名單集中在 src/lib/generated-component-whitelist.ts（見 v2 doc §6.6）。
      dedupe: notesDir ? [...GENERATED_COMPONENT_PACKAGE_WHITELIST] : [],
    },
    // 生成元件常用的 client 相依預先打包,避免 dev 期間被「按需發現」後觸發
    // 重新最佳化、換掉 ?v= hash，導致進行中的 dynamic import 取到舊 hash 而 404
    //（症狀：Failed to fetch dynamically imported module）。
    optimizeDeps: {
      include: ["react", "react-dom", "motion/react", "lucide-react", "clsx", "recharts", "d3"],
    },
  },
  markdown: {
    // 關閉 Astro 內建 Shiki：圍欄程式碼改由 remarkNotecraftCodeblock 以自寫 build-time
    // tokenizer 渲染成設計定稿的白底程式碼塊（見 src/lib/remark-notecraft-codeblock.ts）。
    syntaxHighlight: false,
    // 順序固定：remark-directive 先解析指令；directives 處理 admonition/tabs/tooltip/annotate；
    // codeblock 最後改寫 code 節點（buildAnnotate 需在 code 仍為原始節點時讀值）。
    // notes-assets 只在 viewer 模式（有 NOTECRAFT_NOTES_DIR）下作用，重寫相對圖片路徑為 /notes-assets/*。
    remarkPlugins: [remarkDirective, remarkNotecraftDirectives, remarkNotecraftCodeblock, remarkNotecraftNotesAssets],
  },
});
