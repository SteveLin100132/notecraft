import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import remarkDirective from "remark-directive";
import remarkNotecraftDirectives from "./src/lib/remark-notecraft-directives.ts";
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
  },
  markdown: {
    // remark-directive 必須排在自訂 transform 之前（先解析出指令節點再轉換）。
    // 同時套用於 .md 與 .mdx（@astrojs/mdx 預設 extendMarkdownConfig）。
    remarkPlugins: [remarkDirective, remarkNotecraftDirectives],
    shikiConfig: {
      theme: "github-light",
      wrap: true,
    },
  },
});
