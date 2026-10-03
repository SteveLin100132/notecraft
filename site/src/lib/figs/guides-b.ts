import type { Fig } from "./types";

// 第 4 章 使用指南（簡報、Plugin、編輯、預覽、部署）
export const GUIDES_B: Record<string, Fig> = {
  "guides/deck": {
    caption: "筆記轉簡報分解圖：筆記經兩個 subagent 變成一疊投影片，互動元件原樣嵌入。",
    layers: [
      { id: "note", kind: "file", ref: 10, name: "來源筆記", to: "觸發", side: "l", box: [10, 20, 150, 200], p: { text: "flow.mdx", variant: "h marker" } },
      { id: "flow", kind: "flow", ref: 12, name: "兩個 subagent", to: "兩個-subagent", box: [30, 70, 310, 150], p: { items: ["planner", "generator", "build"], on: 1 } },
      { id: "deck", kind: "slides", ref: 14, name: "簡報 /present", to: "檢視與播放", box: [110, 40, 310, 180], p: { n: 3 } },
      { id: "component", kind: "component", ref: 16, name: "既有互動元件", to: "既有互動元件原樣嵌入", hl: true, box: [200, 70, 300, 150], p: { variant: "slider" } },
    ],
  },
  "guides/deck-atoms": {
    caption: "版型與原子分解圖：外框版型之上，依序試整頁級、組合級原子，最後才自寫。",
    layers: [
      { id: "deck", kind: "slides", ref: 10, name: "6 種外框版型", to: "6-種外框版型", box: [10, 10, 310, 200], p: { n: 4 } },
      { id: "atoms", kind: "chips", ref: 12, name: "整頁級原子 15", to: "整頁級", also: ["29-個原子"], side: "l", box: [20, 30, 180, 100], p: { items: ["Summary", "Triad", "Decision", "Layers", "Risk"], on: 0 } },
      { id: "combo", kind: "chips", ref: 14, name: "組合級原子 14", to: "組合級", box: [150, 120, 310, 200], p: { items: ["Rows", "Cards", "Kpi", "Table", "Code"], on: 2 } },
      { id: "flow", kind: "flow", ref: 16, name: "選型順序", to: "選型規則", box: [20, 70, 300, 140], p: { items: ["整頁級", "組合級", "自寫"], on: 0, dashed: true } },
      { id: "chart", kind: "chart", ref: 18, name: "圖表 ≤ 3 系列", to: "圖表的限制", box: [190, 20, 310, 100], p: { n: 3, on: 1 } },
    ],
  },
  "guides/deck-play": {
    caption: "簡報播放分解圖：檢視頁之上是全螢幕播放、翻頁按鍵與可縮放的元件畫布。",
    layers: [
      { id: "screen", kind: "screen", ref: 10, name: "簡報檢視頁", to: "兩種模式", also: ["沒有簡報時"], box: [0, 0, 320, 200], shot: "deck-play" },
      { id: "deck", kind: "slides", ref: 12, name: "全螢幕播放", to: "進出全螢幕", also: ["手機與觸控"], box: [40, 20, 300, 170], p: { n: 3, variant: "play" } },
      { id: "keys", kind: "keys", ref: 14, name: "翻頁與大綱鍵", to: "播放模式", also: ["快捷鍵"], box: [40, 150, 290, 205], p: { items: ["←", "→", "O", "Esc"], on: 1 } },
      { id: "canvas", kind: "canvas", ref: 16, name: "元件畫布", to: "互動元件怎麼操作", box: [170, 40, 310, 130] },
    ],
  },
  "guides/plugin-install": {
    caption: "安裝 plugin 分解圖：從來源取得、靜態檢查、確認後寫進 .notecraft/plugins/。",
    layers: [
      { id: "files", kind: "tree", ref: 10, name: "安裝目錄", to: "裝完之後", side: "l", box: [0, 10, 170, 210], p: { items: [".notecraft/", "  plugins/", "    er-diagram/", "      renderer.tsx", "      .installed.json"], on: 2 } },
      { id: "pkg", kind: "package", ref: 12, name: "三種來源", to: "三種來源", box: [140, 20, 310, 110], p: { text: "store／GitHub／./" } },
      { id: "shield", kind: "shield", ref: 14, name: "靜態檢查", to: "安裝前的檢查與確認", box: [160, 100, 300, 200] },
      { id: "term", kind: "terminal", ref: 16, name: "--yes／--remove", to: "ci-與移除", box: [30, 60, 300, 160], p: { items: ["install-plugin <id>", "確定安裝？[y/N] y", "$ install-plugin --remove"] } },
    ],
  },
  "guides/plugin-mapping": {
    caption: "映射規則分解圖：plugins.json 把資料檔交給 plugin，變成頁面、章節與內嵌。",
    layers: [
      { id: "files", kind: "tree", ref: 10, name: "筆記資料夾", to: "files-怎麼寫", side: "l", box: [0, 10, 160, 210], p: { items: ["docs/", "  planning/", "    schema.json", "  api/", "    orders.openapi.json"], on: 2 } },
      { id: "json", kind: "json", ref: 12, name: "plugins.json", to: "pluginsjson", box: [110, 20, 290, 170], p: { text: "plugins.json", items: ["plugin", "files", "exclude", "options"], on: 1 } },
      { id: "flow", kind: "flow", ref: 14, name: "第一條命中勝", to: "多條命中時", box: [40, 40, 300, 100], p: { items: ["rule 1", "rule 2", "rule 3"], on: 0, dashed: true } },
      { id: "plugin", kind: "er", ref: 16, name: "/view/ 頁面", to: "對應的頁面", box: [160, 60, 310, 180] },
      { id: "series", kind: "progress", ref: 18, name: "view: 章節", to: "排進系列", side: "l", box: [10, 140, 160, 210], p: { n: 3, on: 1 } },
      { id: "note", kind: "file", ref: 20, name: "PluginView 內嵌", to: "嵌進筆記", box: [190, 140, 310, 215], p: { text: "overview.mdx", variant: "h" } },
    ],
  },
  "guides/plugin-toggle": {
    caption: "啟用與停用分解圖：disabled 陣列與 /plugins 開關，規則不刪、照樣 build。",
    layers: [
      { id: "screen", kind: "screen", ref: 10, name: "Plugin 管理頁", to: "停用後會怎樣", box: [0, 0, 320, 200], shot: "plugins" },
      { id: "why", kind: "note", ref: 12, name: "build 失敗時", to: "什麼時候停用", side: "l", box: [10, 140, 130, 210], p: { text: "build 失敗" } },
      { id: "json", kind: "json", ref: 14, name: "disabled 陣列", to: "手改-pluginsjson", side: "l", box: [20, 20, 180, 140], p: { text: "plugins.json", items: ["disabled", "plugins"], on: 0 } },
      { id: "toggles", kind: "toggles", ref: 16, name: "啟用／停用開關", to: "在-plugins-頁切換", box: [190, 30, 315, 110], p: { items: ["er-diagram", "openapi"], on: 0 } },
      { id: "columns", kind: "columns", ref: 18, name: "停用 vs 移除", to: "停用與移除的差別", box: [150, 120, 310, 210], p: { items: ["停用", "移除"], on: 0 } },
    ],
  },
  "guides/plugin-er": {
    caption: "ER Diagram Renderer 分解圖：schema JSON 變成導覽樹、Wiki 與關聯圖。",
    layers: [
      { id: "screen", kind: "screen", ref: 10, name: "ER 資料庫頁", to: "頁面上能做什麼", box: [0, 0, 320, 200], shot: "plugin-er" },
      { id: "term", kind: "terminal", ref: 12, name: "安裝與映射", to: "安裝與映射", box: [20, 130, 260, 210], p: { items: ["install-plugin er-diagram", "  --apply \"**/*.er.json\""] } },
      { id: "json", kind: "json", ref: 14, name: "orders.er.json", to: "資料檔格式", also: ["meta標題描述與回到筆記"], box: [180, 20, 310, 180], p: { text: "orders.er.json", items: ["meta", "tables", "columns", "fk"], on: 3 } },
      { id: "nav", kind: "sidebar", ref: 16, name: "導覽樹", to: "導覽樹", side: "l", box: [14, 0, 80, 200], p: { n: 9, on: 3 } },
      { id: "plugin", kind: "er", ref: 18, name: "Diagram 分頁", to: "diagram-分頁", also: ["選項","嵌進筆記"], hl: true, box: [80, 30, 300, 190] },
    ],
  },
  "guides/plugin-openapi": {
    caption: "OpenAPI Renderer 分解圖：OAS 文件變成導覽、端點頁、cURL 與可分享的 hash。",
    layers: [
      { id: "screen", kind: "screen", ref: 10, name: "API 文件頁", to: "頁面上能做什麼", box: [0, 0, 320, 200], shot: "plugin-openapi" },
      { id: "json", kind: "json", ref: 12, name: "OpenAPI 文件", to: "資料檔", also: ["支援的版本","安裝與映射","標題描述與回到筆記"], box: [180, 20, 310, 180], p: { text: "*.openapi.json", items: ["openapi", "info", "paths", "tags"], on: 0 } },
      { id: "nav", kind: "sidebar", ref: 14, name: "篩選與導覽", to: "導覽", side: "l", box: [14, 0, 80, 200], p: { n: 10, on: 4 } },
      { id: "plugin", kind: "api", ref: 16, name: "operation 頁", to: "四種頁面", also: ["嵌進筆記","選項"], hl: true, box: [80, 40, 260, 200], p: { items: ["GET", "POST", "GET", "PUT", "DELETE"], on: 0 } },
      { id: "term", kind: "terminal", ref: 18, name: "範例請求 cURL", to: "範例請求", box: [170, 120, 315, 210], p: { items: ["curl -X GET \\", "  …/orders/{id}"] } },
      { id: "app", kind: "browser", ref: 20, name: "位置 hash", to: "連結到特定位置", box: [90, 0, 310, 40], p: { text: "#op/getOrder" } },
    ],
  },
  "guides/editing": {
    caption: "介面編輯分解圖：view 模式的新增表單、標籤列與 ⋯ 選單，寫回 MDX。",
    layers: [
      { id: "screen", kind: "screen", ref: 10, name: "新增筆記實機", to: "哪些地方能寫", box: [0, 0, 320, 200], shot: "new-note" },
      { id: "note", kind: "file", ref: 12, name: "frontmatter", to: "寫入後會改到什麼", side: "l", box: [10, 30, 150, 200], p: { text: "hello.mdx", variant: "h" } },
      { id: "modal", kind: "modal", ref: 14, name: "新增筆記表單", to: "新增筆記", box: [90, 30, 290, 170], p: { n: 2 } },
      { id: "chips", kind: "chips", ref: 16, name: "標籤列", to: "編輯標籤", box: [100, 150, 300, 200], p: { items: ["React", "Hooks", "oauth", "+"], on: 0 } },
      { id: "menu", kind: "list", ref: 18, name: "⋯ 選單", to: "刪除筆記", also: ["以-vs-code-開啟"], box: [230, 10, 315, 80], p: { n: 3, on: 2 } },
    ],
  },
  "guides/live-preview": {
    caption: "自動重新載入分解圖：監看檔案、背景 rebuild、SSE 通知瀏覽器重整。",
    layers: [
      { id: "files", kind: "tree", ref: 10, name: "監看的檔案", to: "監看哪些檔案", side: "l", box: [0, 0, 150, 220], p: { items: ["notes/", "  hello.mdx", ".notecraft/", "  components/", "  plugins/", "  series.json"], on: 3 } },
      { id: "term", kind: "terminal", ref: 12, name: "serve＋claude", to: "搭配-claude-code", box: [140, 20, 315, 110], p: { items: ["serve ./notes", "[rebuild] 1.2s", "$ claude"] } },
      { id: "flow", kind: "flow", ref: 14, name: "一次 rebuild", to: "一次-rebuild-怎麼跑", also: ["build-失敗時"], box: [20, 70, 310, 140], p: { items: ["300ms", "build", "swap", "SSE"], on: 3 } },
      { id: "app", kind: "browser", ref: 16, name: "自動重新載入", to: "關掉自動重新載入", box: [130, 110, 315, 215], p: { text: "localhost:4321" } },
    ],
  },
  "guides/deploy": {
    caption: "部署分解圖：build 出 dist，複製出來放上靜態主機，子路徑與搜尋索引一起帶走。",
    layers: [
      { id: "term", kind: "terminal", ref: 10, name: "build 指令", to: "產生產物", box: [10, 130, 250, 215], p: { items: ["notecraftapp build ./notes", "dist: ~/.notecraft/cache/…"] } },
      { id: "files", kind: "tree", ref: 12, name: "dist/ 產物", to: "筆記裡的圖片", side: "l", box: [10, 10, 170, 200], p: { items: ["dist/", "  notes/", "  notes-assets/", "    cover.png", "  pagefind/", "  wb-index.json"], on: 2 } },
      { id: "app", kind: "browser", ref: 14, name: "NOTECRAFT_BASE", to: "部署到子路徑", box: [150, 10, 310, 100], p: { text: "/my-notes/" } },
      { id: "server", kind: "server", ref: 16, name: "靜態主機", to: "放上靜態主機", also: ["部署後少了什麼"], box: [150, 100, 310, 200], p: { text: "Pages／Netlify" } },
      { id: "palette", kind: "palette", ref: 18, name: "pagefind 搜尋", to: "全文搜尋", box: [180, 30, 300, 120], p: { text: "內文", n: 3 } },
    ],
  },
};
