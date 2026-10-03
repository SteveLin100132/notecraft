import type { Fig } from "./types";

// 第 5 章 進階
export const ADVANCED: Record<string, Fig> = {
  "advanced/plugin-dev": {
    caption: "Plugin 開發分解圖：三個檔案組成 plugin，安裝後把資料檔畫成表格。",
    layers: [
      { id: "base", kind: "slab", ref: 10, name: "plugin 原始資料夾", to: "資料夾結構", slab: 14, p: { text: "../list-table" } },
      { id: "files", kind: "tree", ref: 12, name: "三個檔案", to: "資料夾結構", side: "l", box: [16, 20, 176, 120], p: { items: ["list-table/", "  notecraft-plugin.json", "  schema.json", "  renderer.tsx"], on: 0 } },
      { id: "manifest", kind: "json", ref: 14, name: "manifest", to: "manifest-與-schema", box: [170, 16, 310, 130], p: { text: "notecraft-plugin.json", items: ["id", "title", "version", "dataSchema", "engines"], on: 3 } },
      { id: "code", kind: "code", ref: 16, name: "renderer.tsx", to: "renderertsx", also: ["常見錯誤"], box: [30, 90, 230, 210], p: { text: "renderer.tsx", n: 9, on: 3 } },
      { id: "term", kind: "terminal", ref: 18, name: "本地路徑安裝", to: "安裝與試跑", also: ["修改後更新"], box: [40, 30, 300, 100], p: { items: ["install-plugin ../list-table", "  --apply \"**/*.list.json\""] } },
      { id: "plugin", kind: "table", ref: 20, name: "嵌進筆記的表格", to: "嵌進筆記", hl: true, box: [120, 110, 310, 210], p: { items: ["書名", "作者", "狀態"], on: 1 } },
    ],
  },
  "advanced/skills": {
    caption: "內建 Skill 分解圖：.claude/ 逐檔比對升級，調整結果寫在 prompt 裡。",
    layers: [
      { id: "base", kind: "slab", ref: 10, name: "專案的 .claude/", to: "裝了哪些檔", slab: 14, p: { text: ".claude/" } },
      { id: "files", kind: "tree", ref: 12, name: "Skill 檔案", to: "裝了哪些檔", side: "l", box: [16, 20, 186, 200], p: { items: [".claude/", "  skills/", "    content-visualize/", "    content-present/", "    trendlink-design/", "  agents/"], on: 2 } },
      { id: "diff", kind: "diff", ref: 14, name: "逐檔比對的衝突", to: "為什麼不建議改", box: [170, 30, 310, 150], p: { items: [" ", "-", "+", " ", "+", " "] } },
      { id: "design", kind: "note", ref: 16, name: "設計風格的例外", to: "設計風格", box: [190, 130, 310, 210], p: { text: "trendlink" } },
      { id: "marker", kind: "marker", ref: 18, name: "改寫 prompt", to: "寫在-prompt-或對話裡", also: ["想調整結果時"], hl: true, box: [60, 50, 250, 170], p: { on: 2 } },
      { id: "term", kind: "terminal", ref: 20, name: "init-skill 升級", to: "已經改了怎麼升級", box: [40, 20, 290, 100], p: { items: ["init-skill --check", "$ init-skill", "o / s / overwrite-all"] } },
    ],
  },
  "advanced/internals": {
    caption: "運作原理分解圖：家目錄裡的套件與快取，比對 mtime 決定要不要重 build。",
    layers: [
      { id: "base", kind: "slab", ref: 10, name: "~/.notecraft/", to: "家目錄裡的兩個位置", slab: 14, p: { text: "~/.notecraft/" } },
      { id: "cache", kind: "folder", ref: 12, name: "套件執行位置", to: "套件執行位置", side: "l", box: [14, 20, 150, 120], p: { text: "app-<version>/" } },
      { id: "files", kind: "tree", ref: 14, name: "快取目錄", to: "清掉快取", box: [150, 20, 310, 200], p: { items: ["cache/", "  <hash>/", "    dist/", "      pagefind/", "    meta.json", "    dist.next/"], on: 1 } },
      { id: "json", kind: "json", ref: 16, name: "meta.json", to: "build-快取", box: [30, 100, 190, 210], p: { text: "meta.json", items: ["builtAt", "counts", "version", "base", "cwd"], on: 2 } },
      { id: "flow", kind: "flow", ref: 18, name: "比對後重新 build", to: "什麼時候會重新-build", box: [20, 70, 300, 150], p: { items: ["mtime", "astro build", "pagefind"], on: 1 } },
      { id: "term", kind: "terminal", ref: 20, name: "--rebuild", to: "強制重新-build", box: [50, 20, 290, 90], p: { items: ["build ./notes --rebuild"] } },
    ],
  },
  "advanced/security": {
    caption: "安全模型分解圖：寫入 API 只接受本機，plugin 安裝前先過靜態檢查。",
    layers: [
      { id: "base", kind: "slab", ref: 10, name: "筆記資料夾邊界", to: "只能動筆記資料夾內的檔案", slab: 14, p: { text: "./notes" } },
      { id: "server", kind: "server", ref: 12, name: "--host 0.0.0.0", to: "開放到區網", side: "l", box: [10, 120, 150, 210], p: { text: "0.0.0.0" } },
      { id: "shield", kind: "shield", ref: 14, name: "只接受 127.0.0.1", to: "寫入-api-只接受本機", hl: true, box: [110, 30, 260, 170] },
      { id: "flow", kind: "flow", ref: 16, name: "安裝前的檢查", to: "安裝-plugin-前的檢查", box: [20, 60, 300, 140], p: { items: ["路徑", "類型", "import", "engines"], on: 3 } },
    ],
  },
};
