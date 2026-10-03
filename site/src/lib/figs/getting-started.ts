import type { Fig } from "./types";

// 第 2 章 快速開始
export const GETTING_STARTED: Record<string, Fig> = {
  "getting-started/requirements": {
    caption: "系統需求分解圖：作業系統上裝 Node 22，Claude Code 只有 AI 才需要。",
    layers: [
      { id: "base", kind: "slab", ref: 10, name: "作業系統", to: "作業系統", slab: 14, p: { text: "macOS · Linux · Win" } },
      { id: "pkg", kind: "package", ref: 12, name: "Node.js 22+", to: "nodejs", box: [40, 40, 280, 170], p: { text: "node >= 22" } },
      { id: "cmds", kind: "flow", ref: 14, name: "已驗證的子命令", to: "作業系統", box: [16, 70, 304, 150], p: { items: ["view", "build", "serve", "skill", "plugin"] } },
      { id: "term", kind: "terminal", ref: 16, name: "node -v", to: "nodejs", box: [30, 30, 230, 120], p: { items: ["node -v", "v22.12.0"] } },
      { id: "claude", kind: "note", ref: 18, name: "Claude Code", to: "ai-生成與簡報", gap: 1.3, box: [190, 110, 310, 210], p: { text: "Claude Code" } },
    ],
  },
  "getting-started/install": {
    caption: "npx 與全域安裝分解圖：一行指令，套件裝進 ~/.notecraft，讀你的筆記資料夾。",
    layers: [
      { id: "base", kind: "slab", ref: 10, name: "專案目錄", to: "筆記資料夾參數", slab: 14, p: { text: "~/my-project" } },
      { id: "files", kind: "tree", ref: 12, name: "筆記資料夾參數", to: "筆記資料夾參數", box: [20, 30, 180, 200], p: { items: ["./docs/", "  guides/", "  hello.md"], on: 0 } },
      { id: "cache", kind: "folder", ref: 14, name: "~/.notecraft", to: "第一次執行", box: [150, 40, 310, 200], p: { text: "app-<version>/" } },
      { id: "pkg", kind: "package", ref: 16, name: "npm 套件", to: "全域安裝", box: [40, 50, 280, 170], p: { text: "notecraftapp" } },
      { id: "cmds", kind: "flow", ref: 18, name: "三個子命令", to: "三個子命令怎麼選", box: [30, 70, 300, 150], p: { items: ["view", "serve", "build"], on: 0 } },
      { id: "term", kind: "terminal", ref: 20, name: "npx 指令", to: "用-npx-執行", box: [30, 40, 300, 150], p: { items: ["npx notecraftapp view ./docs"] } },
    ],
  },
  "getting-started/first-run": {
    caption: "第一次啟動分解圖：終端機印出路徑與 port，瀏覽器打開三欄工作台。",
    layers: [
      { id: "base", kind: "slab", ref: 10, name: "筆記資料夾", to: "沒有筆記沒有-frontmatter", slab: 14, p: { text: "./docs" } },
      { id: "screen", kind: "screen", ref: 12, name: "工作台各區", to: "畫面上的各區", box: [0, 0, 320, 200], shot: "dashboard" },
      { id: "app", kind: "browser", ref: 14, name: "瀏覽器網址", to: "打開瀏覽器", box: [70, 0, 320, 70], p: { text: "127.0.0.1:4321" } },
      { id: "term", kind: "terminal", ref: 16, name: "啟動訊息", to: "終端機會看到什麼", side: "l", box: [16, 60, 236, 190], p: { items: ["npx notecraftapp view ./docs", "notes dir : docs", "user cwd  : my-project", "port      : 4321"] } },
      { id: "keys", kind: "keys", ref: 18, name: "Ctrl+C 停止", to: "停止", box: [200, 140, 312, 200], p: { items: ["Ctrl", "C"], on: 1 } },
    ],
  },
  "getting-started/tutorial": {
    caption: "五分鐘教學分解圖：由下而上七步，從一篇 hello 到生成的元件與簡報。",
    layers: [
      { id: "base", kind: "slab", ref: 10, name: "1 建立筆記", to: "1-建立第一篇筆記", slab: 14, p: { text: "my-notes/docs/hello.md" } },
      { id: "screen", kind: "screen", ref: 12, name: "2 用 view 打開", to: "2-用-view-打開", box: [0, 0, 320, 200], shot: "tutorial-dashboard" },
      { id: "marker", kind: "marker", ref: 14, name: "3 加一個標記", to: "3-改成-mdx加一個標記", side: "l", box: [16, 40, 150, 150], p: { on: 3 } },
      { id: "term", kind: "terminal", ref: 16, name: "4 init-skill", to: "4-安裝-skill", box: [150, 20, 310, 110], p: { items: ["npx notecraftapp init-skill"] } },
      { id: "flow", kind: "flow", ref: 18, name: "5 serve＋生成", to: "5-開-serve請-claude-code-生成", box: [16, 80, 304, 150], p: { items: ["scan", "plan", "write", "mdx"], on: 2 } },
      { id: "component", kind: "component", ref: 20, name: "6 看到元件", to: "6-看到元件", box: [130, 46, 300, 150], hl: true, p: { variant: "flow", text: "request-flow.tsx" } },
      { id: "deck", kind: "slides", ref: 22, name: "7 轉成簡報", to: "7-選讀轉成簡報", box: [40, 110, 230, 210], p: { n: 3 } },
    ],
  },
  "getting-started/project-structure": {
    caption: "專案結構分解圖：專案裡只有筆記、.notecraft/ 與 .claude/，各有主人。",
    layers: [
      { id: "base", kind: "slab", ref: 10, name: "專案根（cwd）", to: "notecraft-在哪裡", slab: 14, p: { text: "my-project/" } },
      { id: "files", kind: "tree", ref: 12, name: "目錄樹", to: "目錄樹", side: "l", box: [12, 12, 180, 212], p: { items: ["my-project/", "  docs/", "  .notecraft/", "    components/", "    plugins/", "    series.json", "  .claude/"], on: 2 } },
      { id: "who", kind: "table", ref: 14, name: "誰建立", to: "誰建立這些檔案", box: [170, 16, 312, 116], p: { items: ["路徑", "由誰"] } },
      { id: "commit", kind: "toggles", ref: 16, name: "要不要提交", to: "哪些要提交", box: [176, 116, 312, 212], p: { items: ["docs/", ".notecraft/", ".claude/", "~/.notecraft"] } },
    ],
  },
  "getting-started/frontmatter": {
    caption: "Frontmatter 分解圖：沒寫的欄位從 H1、第一段與檔案時間補上。",
    layers: [
      { id: "note", kind: "file", ref: 10, name: "純 md 筆記", to: "純-markdown-也可以", box: [16, 10, 304, 210], p: { text: "my-note.md", variant: "h" } },
      { id: "heads", kind: "headings", ref: 12, name: "H1 補 title", to: "缺欄位時怎麼補", side: "l", box: [24, 24, 180, 104], p: { items: ["H1", "H2", "H3"], on: 0 } },
      { id: "para", kind: "code", ref: 14, name: "第一段補摘要", to: "description-抓的是哪一段", side: "l", box: [24, 110, 190, 200], p: { n: 5, on: 1 } },
      { id: "json", kind: "json", ref: 16, name: "完整寫法", to: "完整寫法", box: [170, 20, 312, 200], p: { text: "frontmatter", items: ["title", "description", "tags", "createdAt", "updatedAt"], on: 4 } },
    ],
  },
  "getting-started/series": {
    caption: "系列設定分解圖：一份 series.json 決定章節順序，工作台畫成進度。",
    layers: [
      { id: "base", kind: "slab", ref: 10, name: "專案根目錄", to: "檔案放哪裡", slab: 14, p: { text: "my-project/" } },
      { id: "files", kind: "tree", ref: 12, name: "兩個讀取位置", to: "檔案放哪裡", side: "l", box: [12, 20, 170, 200], p: { items: ["docs/", "  .notecraft/", "    series.json", ".notecraft/", "  series.json"], on: 2 } },
      { id: "json", kind: "json", ref: 14, name: "欄位", to: "欄位", box: [150, 16, 312, 200], p: { text: "series.json", items: ["id", "title", "eyebrow", "accent", "icon", "slugs"], on: 5 } },
      { id: "flow", kind: "flow", ref: 16, name: "slugs 章節順序", to: "slugs-怎麼寫", box: [16, 90, 304, 150], p: { items: ["basic", "session", "jwt", "oauth"], on: 2 } },
      { id: "progress", kind: "progress", ref: 18, name: "系列卡進度", to: "範例", box: [130, 120, 310, 210], p: { n: 3, on: 0 } },
    ],
  },
  "getting-started/skills": {
    caption: "內建 Skill 分解圖：init-skill 把 Skill 與 Subagent 逐檔裝進 .claude/。",
    layers: [
      { id: "base", kind: "slab", ref: 10, name: "專案根目錄", to: "安裝", slab: 14, p: { text: "my-project/" } },
      { id: "files", kind: "tree", ref: 12, name: "Skill 與 Agent", to: "裝了什麼", side: "l", box: [12, 16, 180, 212], p: { items: [".claude/", "  skills/", "    content-visualize/", "    content-present/", "    trendlink-design/", "  agents/"], on: 1 } },
      { id: "term", kind: "terminal", ref: 14, name: "init-skill", to: "安裝", box: [150, 20, 312, 100], p: { items: ["npx notecraftapp init-skill"] } },
      { id: "check", kind: "terminal", ref: 16, name: "--check 比對", to: "檢查版本", box: [150, 100, 312, 170], p: { text: "init-skill --check" } },
      { id: "diff", kind: "diff", ref: 18, name: "逐檔比對衝突", to: "衝突處理", box: [40, 100, 200, 210], p: { items: [" ", "+", "+", "-", "+", " "] } },
      { id: "flags", kind: "toggles", ref: 20, name: "旗標", to: "旗標", box: [200, 150, 312, 212], p: { items: ["--check", "--force", "--dir"], on: 1 } },
    ],
  },
  "getting-started/plugins": {
    caption: "內建 Plugin 分解圖：裝好渲染器、寫映射規則，資料檔就成了頁面。",
    layers: [
      { id: "screen", kind: "screen", ref: 10, name: "Plugin 管理頁", to: "在工作台確認", box: [0, 0, 320, 200], shot: "plugins" },
      { id: "json", kind: "json", ref: 12, name: "plugins.json", to: "寫映射規則", side: "l", box: [16, 40, 160, 190], p: { text: "plugins.json", items: ["plugin", "files"], on: 1 } },
      { id: "pkg", kind: "package", ref: 14, name: "官方 Plugin", to: "安裝官方-plugin", box: [150, 50, 310, 150], p: { text: "er-diagram" } },
      { id: "term", kind: "terminal", ref: 16, name: "--list 清單", to: "看有哪些-plugin", box: [40, 16, 300, 96], p: { items: ["install-plugin --list"] } },
      { id: "rm", kind: "terminal", ref: 18, name: "移除 Plugin", to: "移除", box: [150, 140, 312, 210], p: { text: "--remove <id>" } },
    ],
  },
};
