import type { Fig } from "./types";

// 第 6 章 參考
export const REFERENCE: Record<string, Fig> = {
  "reference/cli": {
    caption: "CLI 分解圖：一行 npx notecraftapp，五個子命令各自落在不同地方。",
    layers: [
      { id: "files", kind: "tree", ref: 10, name: "init-skill", to: "init-skill", side: "l", box: [10, 110, 160, 214], p: { items: [".claude/", "  skills/", "  agents/"], on: 0 } },
      { id: "cache", kind: "folder", ref: 12, name: "build 產物", to: "build", side: "l", box: [14, 10, 150, 110], p: { text: "cache/<hash>/dist" } },
      { id: "server", kind: "server", ref: 14, name: "serve :4321", to: "serve", box: [170, 10, 310, 100], p: { text: ":4321" } },
      { id: "pkg", kind: "package", ref: 16, name: "install-plugin", to: "install-plugin", box: [170, 110, 310, 210], p: { text: "plugins/<id>" } },
      { id: "term", kind: "terminal", ref: 18, name: "view ./notes", to: "view", box: [40, 50, 290, 150], p: { items: ["npx notecraftapp view ./notes", "  --port 4321 --host 127.0.0.1"] } },
    ],
  },
  "reference/frontmatter": {
    caption: "Frontmatter 分解圖：五個欄位都可省，沒寫的從標題、內文與檔案時間補。",
    layers: [
      { id: "note", kind: "file", ref: 10, name: "筆記檔與範例", to: "範例", box: [30, 10, 290, 210], p: { text: "flow.mdx", variant: "h" } },
      { id: "table", kind: "table", ref: 12, name: "五個欄位", to: "欄位", box: [50, 20, 300, 130], p: { items: ["欄位", "型別", "沒寫時"], on: 0 } },
      { id: "headings", kind: "headings", ref: 14, name: "從內文補值", to: "補值的細節", box: [60, 110, 260, 200], p: { items: ["H1", "H2", "H2"], on: 0 } },
    ],
  },
  "reference/markers": {
    caption: "@ai-visualize 標記分解圖：欄位、type 與 status 的值，以及合併後的元件。",
    layers: [
      { id: "note", kind: "file", ref: 10, name: "標記放的位置", to: "寫法規則", box: [20, 10, 300, 210], p: { text: "flow.mdx", variant: "h marker" } },
      { id: "marker", kind: "marker", ref: 12, name: "完整語法", to: "完整語法", box: [50, 40, 270, 170], p: { items: ["id", "type", "prompt", "caption", "status"], on: 0 } },
      { id: "table", kind: "table", ref: 14, name: "欄位規格", to: "欄位", box: [160, 20, 310, 120], p: { items: ["欄位", "必填", "值"], on: 2 } },
      { id: "types", kind: "chips", ref: 16, name: "type 的值", to: "type-的值", side: "l", box: [10, 20, 160, 70], p: { items: ["diagram", "chart", "timeline", "motion", "free"], on: 0 } },
      { id: "flow", kind: "flow", ref: 18, name: "status 的值", to: "status-的值", box: [20, 130, 300, 210], p: { items: ["pending", "generated", "locked", "failed"], on: 1, dashed: true } },
      { id: "component", kind: "component", ref: 20, name: "合併的元件", to: "合併的標記", hl: true, box: [110, 60, 290, 160], p: { variant: "flow", text: "hook-lifecycle" } },
    ],
  },
  "reference/series-json": {
    caption: "series.json 分解圖：兩處讀取位置，每個系列七個欄位與 slugs 章節。",
    layers: [
      { id: "files", kind: "tree", ref: 10, name: "兩處讀取位置", to: "讀取位置", side: "l", box: [10, 20, 170, 200], p: { items: ["notes/", "  .notecraft/", "    series.json", ".notecraft/", "  series.json"], on: 2 } },
      { id: "json", kind: "json", ref: 12, name: "頂層 series", to: "頂層", box: [150, 20, 310, 120], p: { text: "series.json", items: ["$schema", "series"], on: 1 } },
      { id: "table", kind: "table", ref: 14, name: "每個系列", to: "每個系列", box: [100, 60, 310, 170], p: { items: ["id", "accent", "icon", "slugs"], on: 3 } },
      { id: "slugs", kind: "list", ref: 16, name: "slugs 章節", to: "slugs-的寫法", box: [130, 110, 300, 210], p: { n: 4, on: 1 } },
      { id: "scan", kind: "scan", ref: 18, name: "對不到就跳過", to: "對不到時", box: [40, 40, 220, 140], p: { n: 4, on: -1 } },
    ],
  },
  "reference/plugin-json": {
    caption: "Plugin 設定檔分解圖：專案的 plugins.json 與 plugin 自帶的 manifest。",
    layers: [
      { id: "files", kind: "tree", ref: 10, name: "plugin 資料夾", to: "plugin-資料夾", side: "l", box: [10, 20, 180, 210], p: { items: [".notecraft/", "  plugins.json", "  plugins/", "    _types.d.ts", "    <id>/", "      renderer.tsx"], on: 4 } },
      { id: "json", kind: "json", ref: 12, name: "plugins.json", to: "頂層欄位", also: ["pluginsjson"], box: [150, 10, 310, 110], p: { text: "plugins.json", items: ["$schema", "plugins", "disabled"], on: 1 } },
      { id: "table", kind: "table", ref: 14, name: "每一條規則", to: "每一條規則", box: [160, 100, 310, 200], p: { items: ["plugin", "files", "options"], on: 0 } },
      { id: "manifest", kind: "json", ref: 16, name: "manifest 欄位", to: "欄位", also: ["notecraft-pluginjson"], box: [40, 50, 210, 170], p: { text: "notecraft-plugin.json", items: ["id", "title", "version", "engines", "meta"], on: 3 } },
      { id: "flow", kind: "flow", ref: 18, name: "安裝時／build 時", to: "什麼時候檢查", box: [20, 150, 300, 214], p: { items: ["安裝", "build"], on: 1 } },
      { id: "engines", kind: "note", ref: 20, name: "engines", to: "engines", box: [200, 20, 310, 90], p: { text: ">=1.6.0" } },
    ],
  },
  "reference/shortcuts": {
    caption: "快捷鍵分解圖：工作台各層浮層各有一組按鍵，Esc 一次只關一層。",
    layers: [
      { id: "app", kind: "window", ref: 10, name: "全域快捷鍵", to: "全域", also: ["放大檢視","官方-plugin-頁"], slab: 12, p: { variant: "rail sidebar tabs", text: "NoteCraftApp", on: 1 } },
      { id: "tabs", kind: "tabs", ref: 12, name: "筆記頁籤列", to: "筆記頁籤列", box: [91, 12, 320, 34], p: { n: 5, on: 1, variant: "pin" } },
      { id: "drawer", kind: "drawer", ref: 14, name: "Drawer", to: "列表儀表板與-drawer", box: [214, 34, 320, 220] },
      { id: "deck", kind: "slides", ref: 16, name: "簡報", to: "簡報", side: "l", box: [10, 140, 170, 214], p: { n: 3, variant: "play" } },
      { id: "palette", kind: "palette", ref: 18, name: "指令面板", to: "指令面板", box: [100, 40, 260, 150], p: { text: "oauth", n: 4, on: 0 } },
      { id: "keys", kind: "keys", ref: 20, name: "Esc 的順序", to: "esc-的順序", box: [60, 80, 280, 140], p: { items: ["⌘", "K", "⌥", "W", "Esc"], on: 4 } },
    ],
  },
  "reference/url-params": {
    caption: "網址參數分解圖：篩選在 query、分頁在 ?tab=、位置在 hash。",
    layers: [
      { id: "app", kind: "browser", ref: 10, name: "/notes 的參數", to: "筆記列表-notes", slab: 12, p: { text: "/notes?tag=React" } },
      { id: "chips", kind: "chips", ref: 12, name: "值怎麼寫", to: "值怎麼寫", box: [20, 24, 220, 70], p: { items: ["folder", "series", "tag", "view"], on: 2 } },
      { id: "tabs", kind: "tabs", ref: 14, name: "?tab= 分頁", to: "分頁參數-tab", box: [60, 70, 320, 94], p: { n: 3, on: 1 } },
      { id: "state", kind: "note", ref: 16, name: "不進網址的狀態", to: "不放進網址的狀態", side: "l", box: [10, 120, 140, 214], p: { text: "只在當頁" } },
      { id: "headings", kind: "headings", ref: 18, name: "#標題錨點", to: "hash", box: [150, 100, 310, 200], p: { items: ["H1", "H2", "H3"], on: 1 } },
      { id: "plugin", kind: "api", ref: 20, name: "OpenAPI 的 hash", to: "openapi-頁", box: [120, 40, 300, 140], p: { items: ["GET", "POST", "GET", "DELETE"], on: 1 } },
    ],
  },
};
