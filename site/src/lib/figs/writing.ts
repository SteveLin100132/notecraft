import type { Fig } from "./types";

// 第 3 章 撰寫筆記（多半是「原文 → 渲染結果」：底下是原始檔，上面是渲染出來的東西）
export const WRITING: Record<string, Fig> = {
  "writing/md-vs-mdx": {
    caption: "Markdown 與 MDX 分解圖：可混放，MDX 多了元件也多了陷阱字元。",
    layers: [
      { id: "base", kind: "slab", ref: 10, name: "你的筆記資料夾", to: "差在哪裡", slab: 14, p: { text: "./docs" } },
      { id: "files", kind: "tree", ref: 12, name: ".md 與 .mdx 混放", to: "改副檔名對網址的影響", side: "l", box: [16, 20, 150, 200], p: { items: ["guides/", "  cache.md", "  flow.mdx"], on: 2 } },
      { id: "cols", kind: "columns", ref: 14, name: ".md 與 .mdx 比較", to: "差在哪裡", box: [150, 20, 310, 200], p: { items: [".mdx", ".md"], on: 0 } },
      { id: "note", kind: "file", ref: 16, name: "改成 .mdx 的筆記", to: "什麼時候改成-mdx", box: [60, 40, 260, 190], p: { text: "flow.mdx", variant: "h marker" } },
      { id: "keys", kind: "keys", ref: 18, name: "MDX 陷阱字元", to: "mdx-常見陷阱", box: [80, 80, 270, 140], p: { items: ["{", "<", "<!--"], on: 0 } },
    ],
  },
  "writing/headings": {
    caption: "標題與錨點分解圖：原文的 # 標題長出目錄與錨點 id，連結靠 id 跳過去。",
    layers: [
      { id: "note", kind: "file", ref: 10, name: "原文", to: "h1-與-frontmatter-的-title", slab: 12, box: [10, 10, 310, 210], p: { text: "guides/setup.md", variant: "h" } },
      { id: "headings", kind: "headings", ref: 12, name: "標題與錨點 id", to: "錨點-id-怎麼產生", side: "l", box: [20, 30, 200, 200], p: { items: ["H1", "H2", "H3", "H3", "H2", "H3"], on: 2 } },
      { id: "toc", kind: "sidebar", ref: 14, name: "目錄 H1–H3", to: "目錄收哪些標題", box: [214, 24, 304, 190], p: { n: 6, on: 2 } },
      { id: "diff", kind: "diff", ref: 16, name: "改標題就改錨點", to: "改標題就會改錨點", side: "l", box: [30, 120, 190, 190], p: { items: [" ", "-", "+"] } },
      { id: "app", kind: "browser", ref: 18, name: "#錨點連結", to: "連到某個標題", box: [60, 50, 300, 130], p: { text: "/notes/…/flow#pkce" } },
    ],
  },
  "writing/code-blocks": {
    caption: "程式碼塊分解圖：圍欄原文渲染成帶標題列、行號與高亮列的程式碼塊。",
    layers: [
      { id: "note", kind: "file", ref: 10, name: "圍欄原文", to: "基本寫法", slab: 12, box: [10, 10, 310, 210], p: { text: "setup.md" } },
      { id: "code", kind: "code", ref: 12, name: "行號與整行高亮", to: "檔名與整行高亮", also: ["行內-code","程式碼註解"], box: [30, 40, 290, 190], p: { text: "src/lib/auth.ts", n: 8, on: 2 } },
      { id: "chips", kind: "chips", ref: 14, name: "標題列與複製鈕", to: "複製鈕", box: [30, 12, 290, 36], p: { items: ["TS", "auth.ts", "copy"], on: 2 } },
      { id: "rules", kind: "table", ref: 16, name: "內建上色規則", to: "上色規則", box: [170, 90, 310, 200], p: { items: ["類別", "寫法"], on: 1 } },
      { id: "callout", kind: "note", ref: 18, name: "提示框與分頁", to: "提示框與分頁", side: "l", box: [20, 120, 150, 210], p: { text: ":::tip" } },
    ],
  },
  "writing/images": {
    caption: "圖片分解圖：相對路徑的圖片被改寫成 /notes-assets/ 網址送出。",
    layers: [
      { id: "base", kind: "slab", ref: 10, name: "筆記資料夾邊界", to: "不會被改寫的", slab: 14, p: { text: "./docs" } },
      { id: "files", kind: "tree", ref: 12, name: "相對路徑引用", to: "寫法", side: "l", box: [16, 16, 160, 204], p: { items: ["docs/", "  guides/", "    flow.md", "    cover.png", "  specs/", "    v2.pdf"], on: 3 } },
      { id: "app", kind: "browser", ref: 14, name: "改寫後的網址", to: "會被改寫成什麼", box: [130, 24, 310, 190], p: { text: "/notes-assets/…" } },
      { id: "image", kind: "image", ref: 16, name: "圖片格式", to: "支援的格式", box: [150, 50, 290, 160], p: { text: "cover.png" } },
      { id: "pdf", kind: "file", ref: 18, name: "PDF 附件", to: "連到-pdf-附件", box: [40, 120, 150, 200], side: "l", p: { text: "v2.pdf" } },
    ],
  },
  "writing/folders": {
    caption: "巢狀資料夾分解圖：檔案路徑去掉副檔名就是網址，相對連結照路徑改寫。",
    layers: [
      { id: "base", kind: "slab", ref: 10, name: "你的筆記資料夾", to: "路徑與網址對照", slab: 14, p: { text: "./docs" } },
      { id: "files", kind: "tree", ref: 12, name: "真實檔名", to: "檔名會被正規化", side: "l", box: [16, 16, 170, 204], p: { items: ["docs/", "  hello.mdx", "  Guides/", "    my note.mdx", "    oauth/", "      flow.mdx"], on: 5 } },
      { id: "note", kind: "file", ref: 14, name: "相對連結", to: "筆記之間互相連結", box: [160, 30, 300, 170], p: { text: "setup.md", variant: "h" } },
      { id: "app", kind: "browser", ref: 16, name: "/notes/ 網址", to: "路徑與網址對照", box: [110, 60, 310, 180], p: { text: "/notes/…/oauth/flow" } },
      { id: "ignore", kind: "json", ref: 18, name: "不想變成筆記的", to: "不想變成筆記的檔案", box: [180, 150, 312, 212], p: { text: "ignore.json", items: ["drafts/", "CHANGELOG.md"], on: 0 } },
    ],
  },
  "writing/embed": {
    caption: "嵌元件分解圖：標記下方的外框包住生成元件，PluginView 內嵌資料檔。",
    layers: [
      { id: "note", kind: "file", ref: 10, name: "flow.mdx 原文", to: "生成元件長什麼樣", slab: 12, box: [10, 10, 310, 210], p: { text: "oauth/flow.mdx", variant: "h" } },
      { id: "marker", kind: "marker", ref: 12, name: "status: locked", to: "手動調整時注意", side: "l", box: [20, 20, 160, 100], p: { on: 3 } },
      { id: "frame", kind: "window", ref: 14, name: "GeneratedFrame", to: "外框提供什麼", box: [30, 90, 300, 205], p: { variant: "", text: "GeneratedFrame" } },
      { id: "component", kind: "component", ref: 16, name: "生成元件", to: "clientvisible-什麼時候加", hl: true, box: [50, 110, 280, 195], p: { variant: "flow", text: "oauth-flow.tsx" } },
      { id: "plugin", kind: "er", ref: 18, name: "PluginView 資料檔", to: "內嵌資料檔-pluginview", box: [170, 14, 310, 100] },
      { id: "props", kind: "chips", ref: 20, name: "PluginView 屬性", to: "options-與-anchor", box: [170, 100, 310, 130], p: { items: ["src", "options", "anchor"], on: 0 } },
    ],
  },
  "writing/tags": {
    caption: "標籤分解圖：tags 經正規化，成為 chip、?tag= 篩選與 /tags 頁。",
    layers: [
      { id: "note", kind: "file", ref: 10, name: "tags 原文", to: "frontmatter-寫法", slab: 12, box: [10, 10, 310, 210], p: { text: "http-cache.mdx", variant: "h" } },
      { id: "flow", kind: "flow", ref: 12, name: "正規化三步", to: "正規化規則", box: [30, 150, 300, 205], p: { items: ["trim", "去空", "去重"], on: 2 } },
      { id: "chips", kind: "chips", ref: 14, name: "標籤 chip", to: "單篇筆記", also: ["在工作台哪裡看到"], box: [20, 20, 200, 60], p: { items: ["React", "Hooks", "http", "cache"], on: 0 } },
      { id: "app", kind: "browser", ref: 16, name: "?tag= 篩選", to: "tag-篩選", box: [40, 50, 290, 170], p: { text: "/notes?tag=React" } },
      { id: "tagspage", kind: "table", ref: 18, name: "/tags 頁", to: "tags-頁", box: [170, 60, 310, 200], p: { items: ["標籤", "篇數"], on: 0 } },
      { id: "modal", kind: "modal", ref: 20, name: "重新命名與刪除", to: "全站重新命名與刪除", also: ["在介面上編輯"], box: [190, 110, 310, 200], p: { n: 1 } },
    ],
  },
};
