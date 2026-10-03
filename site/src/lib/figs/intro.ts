import type { Fig } from "./types";

// 第 1 章 介紹
export const INTRO: Record<string, Fig> = {
  "intro/what-is": {
    caption: "NoteCraftApp 分解圖：你的資料夾在最下層，工作台與 AI 元件疊在上面。",
    layers: [
      { id: "base", kind: "slab", ref: 10, name: "你的筆記資料夾", to: "不需要改寫既有筆記", slab: 14, p: { text: "./docs" } },
      { id: "files", kind: "tree", ref: 12, name: "md／mdx 原始檔", to: "不需要改寫既有筆記", box: [24, 24, 200, 196], p: { items: ["docs/", "  guides/", "    oauth.mdx", "  hello.md", "  series.json"] } },
      { id: "screen", kind: "screen", ref: 14, name: "三欄工作台", to: "它做什麼", box: [0, 0, 320, 200], shot: "dashboard" },
      { id: "component", kind: "component", ref: 16, name: "AI 生成的互動元件", to: "為什麼要它", box: [130, 46, 300, 150], hl: true, p: { variant: "flow", text: "oauth-flow.tsx" } },
      { id: "palette", kind: "palette", ref: 18, name: "⌘K 跳轉", to: "它做什麼", box: [150, 20, 290, 120], p: { n: 4, text: "oauth" } },
    ],
  },
  "intro/three-layers": {
    caption: "三層體驗分解圖：Node 撐起靜態層，標記與元件、簡報依序疊上。",
    layers: [
      { id: "base", kind: "slab", ref: 10, name: "Node.js ≥ 22", to: "靜態層", slab: 14, p: { text: "node >= 22" } },
      { id: "screen", kind: "screen", ref: 12, name: "靜態層：工作台", to: "靜態層", box: [0, 0, 320, 200], shot: "dashboard" },
      { id: "marker", kind: "marker", ref: 14, name: "AI 標記", to: "ai-生成層", side: "l", box: [20, 40, 160, 160], p: { on: 2 } },
      { id: "component", kind: "component", ref: 16, name: "AI 生成層：元件", to: "ai-生成層", box: [130, 46, 300, 150], hl: true, p: { variant: "flow", text: "oauth-flow.tsx" } },
      { id: "deck", kind: "slides", ref: 18, name: "簡報層：deck", to: "簡報層", gap: 1.3, box: [60, 30, 300, 170], p: { n: 3, variant: "play" } },
    ],
  },
  "intro/concepts": {
    caption: "核心概念分解圖：五個名詞各是專案裡的一份檔案，由資料夾往上牽動。",
    layers: [
      { id: "base", kind: "slab", ref: 10, name: "專案根目錄", to: "筆記資料夾", slab: 14, p: { text: "my-project/" } },
      { id: "files", kind: "tree", ref: 12, name: "筆記資料夾", to: "筆記資料夾", side: "l", box: [16, 20, 176, 200], p: { items: ["docs/", "  guides/", "    oauth.mdx", "  api/", "    orders.er.json"], on: 0 } },
      { id: "marker", kind: "marker", ref: 14, name: "AI 標記", to: "ai-visualize-標記", side: "l", box: [30, 40, 170, 150], p: { on: 0 } },
      { id: "component", kind: "component", ref: 16, name: "生成元件", to: "生成元件", box: [140, 46, 304, 150], hl: true, p: { variant: "flow", text: "oauth-flow.tsx" } },
      { id: "plugin", kind: "er", ref: 18, name: "Plugin 與資料檔", to: "plugin-與資料檔", box: [170, 120, 312, 212] },
      { id: "json", kind: "json", ref: 20, name: "series.json", to: "系列", box: [180, 14, 312, 112], p: { text: "series.json", items: ["id", "title", "slugs"], on: 2 } },
    ],
  },
  "intro/architecture": {
    caption: "系統架構分解圖：你的專案在最下層，CLI、建置管線、元件與輸出依序疊上，最上層是瀏覽器裡的工作台。",
    layers: [
      { id: "base", kind: "slab", ref: 10, name: "你的專案", to: "由下而上的六層", also: ["狀態存在哪裡"], slab: 14, p: { text: "my-project/" } },
      { id: "terminal", kind: "terminal", ref: 12, name: "CLI", to: "三種執行方式", box: [30, 30, 290, 190], p: { text: "notecraftapp view" } },
      { id: "component", kind: "component", ref: 14, name: "生成元件", to: "ai-不在執行路徑上", box: [130, 46, 300, 150], hl: true, p: { variant: "flow", text: "oauth-flow.tsx" } },
      { id: "screen", kind: "screen", ref: 16, name: "瀏覽器裡的工作台", to: "由下而上的六層", box: [0, 0, 320, 200], shot: "dashboard" },
    ],
  },
  "intro/comparison": {
    caption: "工具比較分解圖：三者讀同一個 Markdown 資料夾，各自長出不同用途。",
    layers: [
      { id: "base", kind: "slab", ref: 10, name: "同一個 md 資料夾", to: "並用", slab: 14, p: { text: "vault/ · docs/" } },
      { id: "cols", kind: "columns", ref: 12, name: "比較表", to: "比較表", box: [16, 16, 304, 204], p: { items: ["NoteCraft", "Obsidian", "Docusaurus"], on: 0 } },
      { id: "obsidian", kind: "note", ref: 14, name: "Obsidian", to: "適合-obsidian-的情況", side: "l", box: [10, 24, 110, 124], p: { text: "Obsidian" } },
      { id: "docusaurus", kind: "note", ref: 16, name: "Docusaurus", to: "適合-docusaurus-的情況", box: [110, 60, 210, 160], p: { text: "Docusaurus" } },
      { id: "notecraft", kind: "note", ref: 18, name: "NoteCraftApp", to: "適合-notecraftapp-的情況", box: [200, 96, 310, 206], hl: true, p: { text: "NoteCraftApp" } },
    ],
  },
};
