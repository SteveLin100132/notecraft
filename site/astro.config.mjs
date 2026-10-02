import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import mdx from "@astrojs/mdx";
import { syncNcProse } from "./scripts/sync-nc-prose.mjs";

// 文件頁「實際渲染」示範用的筆記樣式，從 app 的 src/styles 抽出（見腳本開頭說明）
syncNcProse();

// 程式碼高亮只用說明書的兩種墨：墨黑與深藍，註解與標點退到次要墨。不引入第三種色相。
const paperTheme = {
  name: "notecraft-paper",
  type: "light",
  colors: { "editor.background": "#ffffff", "editor.foreground": "#111418" },
  tokenColors: [
    { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: "#5a5f68", fontStyle: "italic" } },
    {
      scope: [
        "keyword",
        "storage",
        "entity.name.tag",
        "entity.name.function",
        "entity.other.attribute-name",
        "support.type.property-name",
        "meta.object-literal.key",
        "support.function",
      ],
      settings: { foreground: "#1b4f9c" },
    },
    { scope: ["punctuation", "meta.brace"], settings: { foreground: "#5a5f68" } },
  ],
};

const LANG_LABEL = { bash: "終端機", sh: "終端機", shell: "終端機", json: "JSON", jsonc: "JSON", mdx: "MDX", md: "Markdown", ts: "TypeScript", tsx: "TSX" };

const el = (tagName, className, children, extra = {}) => ({
  type: "element",
  tagName,
  properties: { className: [className], ...extra },
  children,
});

/** 程式碼框：上方一列檔名（```json title="series.json"）或語言名稱，右側複製鈕。 */
const codeFrame = {
  name: "nc-code-frame",
  root(root) {
    const raw = this.options.meta?.__raw ?? "";
    const title = raw.match(/title="([^"]+)"/)?.[1];
    const lang = this.options.lang;
    const label = title ?? LANG_LABEL[lang] ?? lang;
    const head = el("div", "code-head", [
      el("span", title ? "code-name is-file" : "code-name", [{ type: "text", value: label }]),
      el("button", "code-copy", [{ type: "text", value: "複製" }], { type: "button" }),
    ]);
    root.children = [el("figure", "code", [head, ...root.children])];
  },
};

// GitHub Pages 的專案站：https://stevelin100132.github.io/notecraft/
// 站內連結一律經 import.meta.env.BASE_URL 組出，不寫死 /notecraft。
export default defineConfig({
  site: "https://stevelin100132.github.io",
  base: "/notecraft",
  trailingSlash: "ignore",
  output: "static",
  integrations: [react(), mdx()],
  // 示範元件直接 import app 的 remark 外掛（../src/lib），dev server 要能讀到 repo 根
  // 渲染器是讀者第一次改原文才動態載入，相依先列進 optimizeDeps，dev 時才不會半途重新最佳化、整頁重載
  vite: {
    server: { fs: { allow: [".."] } },
    optimizeDeps: {
      include: ["unified", "remark-parse", "remark-gfm", "remark-smartypants", "remark-directive", "remark-rehype", "rehype-stringify", "github-slugger", "@mdx-js/mdx", "react-dom/server"],
    },
  },
  markdown: {
    shikiConfig: { theme: paperTheme, transformers: [codeFrame] },
  },
});
