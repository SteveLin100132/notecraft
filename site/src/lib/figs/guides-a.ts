import type { Fig } from "./types";

// 第 4 章 使用指南（工作台、系列、AI 視覺化）
// 實機截圖 1600 × 1000 縮成 320 × 200：Rail 0–12、Sidebar 12–65、主區 65–320；頁首分頁 v≈22–31、Toolbar v≈32–39。
export const GUIDES_A: Record<string, Fig> = {
  "guides/notes-list": {
    caption: "筆記列表分解圖：檢視分頁、篩選 chip、分組列表、Board 與右側 Drawer。",
    layers: [
      { id: "screen", kind: "screen", ref: 10, name: "/notes 實機", to: "四種檢視", box: [0, 0, 320, 200], shot: "notes-list" },
      { id: "main", kind: "list", ref: 12, name: "分組的 List", to: "分組", box: [65, 40, 320, 200], p: { n: 9, on: 1 } },
      { id: "views", kind: "tabs", ref: 14, name: "四種檢視", to: "四種檢視", box: [66, 20, 196, 32], p: { n: 4, on: 0 } },
      { id: "filters", kind: "chips", ref: 16, name: "篩選 chip", to: "篩選與搜尋", box: [116, 30, 250, 44], p: { items: ["含AI", "待生成", "收藏"], on: 1 } },
      { id: "board", kind: "board", ref: 18, name: "Board 三欄", to: "在-board-改閱讀狀態", box: [80, 70, 220, 170], gap: 1.2, p: { n: 3, on: 1 } },
      { id: "drawer", kind: "drawer", ref: 20, name: "Drawer 預覽", to: "單擊預覽雙擊進入", box: [214, 0, 320, 200] },
    ],
  },
  "guides/dashboard": {
    caption: "儀表板分解圖：總覽各卡在下，更新月曆與 AI 佇列兩個分頁疊在上面。",
    layers: [
      { id: "screen", kind: "screen", ref: 10, name: "儀表板實機", to: "總覽各卡看什麼", box: [0, 0, 320, 200], shot: "dashboard" },
      { id: "main", kind: "kpi", ref: 12, name: "總覽各卡", to: "總覽各卡看什麼", box: [68, 34, 318, 196] },
      { id: "week", kind: "timeline", ref: 14, name: "更新日誌（7 天）", to: "兩種本週", box: [236, 96, 316, 150], p: { n: 7, on: 6 } },
      { id: "calendar", kind: "calendar", ref: 16, name: "更新月曆", to: "更新月曆", box: [80, 40, 300, 190], gap: 1.2, p: { on: 25 } },
      { id: "queue", kind: "list", ref: 18, name: "AI 佇列", to: "ai-佇列", box: [110, 70, 280, 170], p: { n: 5, on: 0 } },
    ],
  },
  "guides/palette": {
    caption: "指令面板分解圖：⌘K 面板浮在工作台上，內文分區靠 build 產生的 pagefind 索引。",
    layers: [
      { id: "screen", kind: "screen", ref: 10, name: "面板實機", to: "開啟與關閉", box: [0, 0, 320, 200], shot: "palette" },
      { id: "modes", kind: "toggles", ref: 12, name: "哪些模式有內文", to: "哪些模式有", side: "l", box: [16, 140, 140, 200], p: { items: ["build", "serve", "view"] } },
      { id: "index", kind: "folder", ref: 14, name: "pagefind 索引", to: "全文搜尋", box: [180, 130, 310, 200], p: { text: "pagefind/" } },
      { id: "palette", kind: "palette", ref: 16, name: "分區結果", to: "搜得到什麼", box: [100, 20, 260, 140], p: { n: 6, on: 1, text: "oauth" } },
      { id: "keys", kind: "keys", ref: 18, name: "鍵盤操作", to: "鍵盤操作", side: "l", box: [30, 60, 170, 110], p: { items: ["↑", "↓", "↵", "Esc"], on: 2 } },
    ],
  },
  "guides/series": {
    caption: "系列分解圖：系列詳情頁、進度條與下一篇、三種狀態的單鍵推進。",
    layers: [
      { id: "screen", kind: "screen", ref: 10, name: "系列詳情頁", to: "系列頁與進度條", box: [0, 0, 320, 200], shot: "series" },
      { id: "progress", kind: "progress", ref: 12, name: "進度與下一篇", to: "繼續閱讀", box: [70, 28, 316, 84], p: { n: 3, on: 0 } },
      { id: "states", kind: "chips", ref: 14, name: "三種閱讀狀態", to: "三種閱讀狀態", box: [80, 92, 250, 116], p: { items: ["未開始", "閱讀中", "已完成"], on: 1 } },
      { id: "flow", kind: "flow", ref: 16, name: "單鍵推進", to: "單鍵推進", box: [140, 110, 316, 170], p: { items: ["未開始", "閱讀中", "已完成"], on: 1 } },
      { id: "json", kind: "json", ref: 18, name: "view: 章節", to: "資料檔當一章", side: "l", box: [16, 120, 150, 204], p: { text: "series.json", items: ["id", "title", "slugs"], on: 2 } },
    ],
  },
  "guides/ai-markers": {
    caption: "標記語法分解圖：筆記裡的註解、四個欄位，與寫回後出現的元件。",
    layers: [
      { id: "note", kind: "file", ref: 10, name: "flow.mdx", to: "寫法", box: [20, 10, 300, 210], p: { text: "oauth/flow.mdx", variant: "h marker" } },
      { id: "scan", kind: "scan", ref: 12, name: "重複的 id", to: "同一篇裡-id-重複", side: "l", box: [16, 150, 150, 210], p: { n: 3, on: 1 } },
      { id: "marker", kind: "marker", ref: 14, name: "標記的欄位", to: "欄位", box: [40, 50, 280, 170], p: { on: 0 } },
      { id: "types", kind: "chips", ref: 16, name: "type 只是提示", to: "type-只是提示", box: [60, 20, 300, 64], p: { items: ["diagram", "chart", "timeline", "table", "motion", "free"], on: 0 } },
      { id: "status", kind: "chips", ref: 18, name: "status 四個值", to: "status-的四個值", box: [150, 150, 310, 194], p: { items: ["pending", "generated", "locked", "failed"], on: 1 } },
      { id: "component", kind: "component", ref: 20, name: "生成後的元件", to: "生成後的樣子", box: [110, 60, 300, 170], hl: true, p: { variant: "flow", text: "oauth-flow.tsx" } },
    ],
  },
  "guides/ai-pipeline": {
    caption: "生成流程分解圖：筆記標記經四個 subagent 變成元件，serve 即時重 build。",
    layers: [
      { id: "files", kind: "tree", ref: 10, name: ".claude 與元件夾", to: "事前準備", side: "l", box: [10, 10, 160, 210], p: { items: [".claude/", "  agents/", "  skills/", ".notecraft/", "  components/", "notes/", "  flow.mdx"], on: 0 } },
      { id: "note", kind: "file", ref: 12, name: "待處理的筆記", to: "觸發", box: [170, 20, 310, 120], p: { text: "flow.mdx", variant: "marker" } },
      { id: "flow", kind: "flow", ref: 14, name: "四個 subagent", to: "四個-subagent", box: [10, 70, 310, 150], p: { items: ["scanner", "planner", "generator", "writer"], on: 2 } },
      { id: "shield", kind: "shield", ref: 16, name: "驗證關卡", to: "驗證與失敗", box: [200, 40, 290, 120] },
      { id: "component", kind: "component", ref: 18, name: "元件檔位置", to: "元件放在哪裡", box: [140, 60, 310, 170], hl: true, p: { variant: "flow", text: "oauth-flow.tsx" } },
      { id: "term", kind: "terminal", ref: 20, name: "serve 即時看", to: "搭配-serve-即時看", side: "l", box: [20, 120, 210, 210], p: { items: ["npx notecraftapp serve", "rebuild ok"] } },
    ],
  },
  "guides/ai-status": {
    caption: "標記狀態分解圖：筆記頁的待生成卡、status 四個值與重新生成的指令。",
    layers: [
      { id: "screen", kind: "screen", ref: 10, name: "待生成卡片", to: "在工作台上看", box: [0, 0, 320, 200], shot: "tutorial-pending" },
      { id: "marker", kind: "marker", ref: 12, name: "status 欄位", to: "四種狀態", box: [97, 104, 306, 160], p: { on: 3 } },
      { id: "status", kind: "chips", ref: 14, name: "locked 鎖定", to: "什麼時候用-locked", box: [150, 60, 310, 100], p: { items: ["pending", "generated", "locked", "failed"], on: 2 } },
      { id: "term", kind: "terminal", ref: 16, name: "指名重新生成", to: "重新生成", side: "l", box: [20, 40, 200, 120], p: { items: ["重新生成 oauth-flow"] } },
      { id: "scan", kind: "scan", ref: 18, name: "重複的 id", to: "id-重複", side: "l", box: [16, 140, 150, 200], p: { n: 3, on: 1 } },
    ],
  },
  "guides/ai-prompts": {
    caption: "prompt 分解圖：五個要素寫進標記，選型決策樹決定做法，產出互動元件。",
    layers: [
      { id: "marker", kind: "marker", ref: 10, name: "好 prompt 的要素", to: "好-prompt-的要素", box: [20, 20, 300, 200], p: { items: ["洞察", "張力", "互動", "資料", "比較"], on: 0 } },
      { id: "flow", kind: "flow", ref: 12, name: "選型決策樹", to: "type-只是提示", box: [20, 80, 300, 140], p: { items: ["motion", "SVG", "recharts", "table"], on: 0 } },
      { id: "diff", kind: "diff", ref: 14, name: "改寫前後", to: "常見問題寫法", side: "l", box: [20, 40, 170, 160], p: { items: ["-", "-", "+", "+", "+", " "] } },
      { id: "table", kind: "table", ref: 16, name: "不如預期時", to: "不如預期時", box: [160, 120, 310, 210], p: { items: ["症狀", "改法"], on: 1 } },
      { id: "component", kind: "component", ref: 18, name: "實例：slider", to: "給公式範圍與預設值", also: ["實例對照"], box: [140, 30, 310, 130], hl: true, p: { variant: "slider", text: "reliability.tsx" } },
    ],
  },
  "guides/zoom": {
    caption: "放大檢視分解圖：元件從外框搬上全螢幕畫布，紙張變寬，可匯出 PNG。",
    layers: [
      { id: "screen", kind: "screen", ref: 10, name: "元件外框", to: "操作", box: [0, 0, 320, 200], shot: "tutorial-generated" },
      { id: "canvas", kind: "canvas", ref: 12, name: "全螢幕畫布", to: "紙張會變寬", box: [10, 10, 310, 210], gap: 1.3 },
      { id: "component", kind: "component", ref: 14, name: "可互動的元件", to: "互動照常可用", box: [80, 50, 240, 150], hl: true, p: { variant: "flow", text: "request-flow.tsx" } },
      { id: "keys", kind: "keys", ref: 16, name: "縮放鍵", to: "操作", side: "l", box: [20, 150, 170, 200], p: { items: ["+", "-", "0", "Esc"], on: 0 } },
      { id: "png", kind: "image", ref: 18, name: "<id>.png", to: "匯出-png", box: [200, 130, 310, 205], p: { text: "request-flow.png" } },
    ],
  },
  "guides/ai-orphans": {
    caption: "孤兒元件分解圖：標記沒了元件還在，掃描找出、經你同意才刪。",
    layers: [
      { id: "files", kind: "tree", ref: 10, name: "留下的元件檔", to: "怎麼產生", side: "l", box: [10, 10, 160, 210], p: { items: [".notecraft/", "  components/", "    oauth-flow.tsx", "    old-flow.tsx", "notes/", "  flow.mdx"], on: 3 } },
      { id: "scan", kind: "scan", ref: 12, name: "Orphans 掃描", to: "找出孤兒", box: [40, 60, 300, 170], p: { n: 4, on: 2 } },
      { id: "shield", kind: "shield", ref: 14, name: "作者同意", to: "為什麼要你同意", box: [200, 20, 300, 110] },
      { id: "term", kind: "terminal", ref: 16, name: "grep 後再刪", to: "手動清理", side: "l", box: [20, 110, 210, 200], p: { items: ["grep -rn old-flow", "$ rm old-flow.tsx"] } },
      { id: "modal", kind: "modal", ref: 18, name: "刪除確認對話框", to: "刪除筆記時", box: [150, 60, 310, 190], p: { n: 2 } },
    ],
  },
};
