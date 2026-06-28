import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import remarkDirective from "remark-directive";
import remarkNotecraftDirectives from "./src/lib/remark-notecraft-directives.ts";
import remarkNotecraftCodeblock from "./src/lib/remark-notecraft-codeblock.ts";
import devApi from "./src/dev-api/integration.ts";

export default defineConfig({
  output: "static",
  integrations: [
    mdx(),
    react(),
    tailwind({ applyBaseStyles: false }),
    devApi(),
  ],
  vite: {
    server: { host: "127.0.0.1" },
    // 生成元件常用的 client 相依預先打包，避免 dev 期間被「按需發現」後觸發
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
    remarkPlugins: [remarkDirective, remarkNotecraftDirectives, remarkNotecraftCodeblock],
  },
});
