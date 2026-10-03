import type { Fig } from "./types";

// 第 7 章 資源
export const RESOURCES: Record<string, Fig> = {
  "resources/faq": {
    caption: "常見問題分解圖：從啟動、撰寫、AI、Plugin 到部署，一層一類。",
    layers: [
      { id: "term", kind: "terminal", ref: 10, name: "安裝與啟動", to: "安裝與啟動", box: [20, 120, 220, 210], p: { items: ["node -v", "$ npx notecraftapp view ./docs"] } },
      { id: "note", kind: "file", ref: 12, name: "撰寫與顯示", to: "撰寫與顯示", side: "l", box: [10, 10, 140, 130], p: { text: "note.mdx", variant: "h" } },
      { id: "marker", kind: "marker", ref: 14, name: "AI 生成", to: "ai-生成", box: [130, 20, 300, 130], p: { on: 3 } },
      { id: "json", kind: "json", ref: 16, name: "Plugin", to: "plugin", box: [190, 110, 310, 214], p: { text: "plugins.json", items: ["plugins", "disabled"], on: 1 } },
      { id: "server", kind: "server", ref: 18, name: "部署與搜尋", to: "部署與搜尋", box: [60, 50, 260, 130], p: { text: "dist/" } },
    ],
  },
  "resources/upgrade": {
    caption: "升級分解圖：新版裝進自己的 app 目錄，Skill 與 plugin 要自己更新。",
    layers: [
      { id: "base", kind: "slab", ref: 10, name: "快取自動重建", to: "升級後自動處理的事", slab: 14, p: { text: "~/.notecraft/" } },
      { id: "cache", kind: "folder", ref: 12, name: "新版的 app 目錄", to: "第一次執行新版", side: "l", box: [14, 20, 160, 130], p: { text: "app-<新版本>/" } },
      { id: "pkg", kind: "package", ref: 14, name: "@latest", to: "升級", box: [150, 20, 310, 120], p: { text: "notecraftapp@latest" } },
      { id: "timeline", kind: "timeline", ref: 16, name: "各版注意事項", to: "各版的注意事項", box: [20, 120, 300, 214], p: { n: 6, on: 5 } },
      { id: "diff", kind: "diff", ref: 18, name: "自己更新的事", to: "升級後要自己做的事", box: [170, 60, 310, 180], p: { items: [" ", "-", "+", " ", "+"] } },
      { id: "term", kind: "terminal", ref: 20, name: "看版本／指定版本", to: "看目前的版本", also: ["指定版本或退回舊版"], box: [30, 30, 270, 110], p: { items: ["notecraftapp --version", "$ npx notecraftapp@1.7.0 serve"] } },
    ],
  },
  "resources/changelog": {
    caption: "版本歷程分解圖：repo 的 CHANGELOG.md 與 npm 上的每一個里程碑。",
    layers: [
      { id: "base", kind: "slab", ref: 10, name: "notecraft repo", to: "主要里程碑", slab: 14, p: { text: "notecraft/" } },
      { id: "note", kind: "file", ref: 12, name: "CHANGELOG.md", to: "主要里程碑", side: "l", box: [14, 20, 150, 200], p: { text: "CHANGELOG.md", variant: "h" } },
      { id: "pkg", kind: "package", ref: 14, name: "npm 發佈", to: "主要里程碑", box: [170, 20, 310, 120], p: { text: "notecraftapp" } },
      { id: "timeline", kind: "timeline", ref: 16, name: "主要里程碑", to: "主要里程碑", box: [20, 70, 310, 180], p: { n: 9, on: 8 } },
    ],
  },
  "resources/contributing": {
    caption: "參與開發分解圖：clone repo 用 Node 22 跑起來，提交前自己跑檢查。",
    layers: [
      { id: "base", kind: "slab", ref: 10, name: "Node 22 環境", to: "環境", slab: 14, p: { text: ".nvmrc → 22" } },
      { id: "files", kind: "tree", ref: 12, name: "notecraft repo", to: "跑起來", side: "l", box: [14, 20, 170, 200], p: { items: ["notecraft/", "  .nvmrc", "  plugins/", "  src/", "  CLAUDE.md"], on: 0 } },
      { id: "diff", kind: "diff", ref: 14, name: "你的改動", to: "提交前的檢查", box: [170, 30, 310, 160], p: { items: [" ", "+", "+", "-", " ", "+"] } },
      { id: "term", kind: "terminal", ref: 16, name: "提交前的檢查", to: "提交前的檢查", box: [40, 50, 300, 140], p: { items: ["npx tsc --noEmit", "$ npx astro build", "$ npm run check-plugins"] } },
    ],
  },
};
