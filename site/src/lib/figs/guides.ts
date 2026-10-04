import type { Fig } from "./types";

// 第 4 章 使用指南
export const GUIDES: Record<string, Fig> = {
  "guides/workbench": {
    caption: "工作台分解圖：Rail、Sidebar、主區與 Drawer 四層。",
    layers: [
      { id: "screen", kind: "screen", ref: 10, name: "工作台實機", to: "有哪些頁面", also: ["窄螢幕"], box: [0, 0, 320, 200], shot: "dashboard" },
      { id: "rail", kind: "rail", ref: 12, name: "Rail", to: "rail", also: ["檢查更新"], side: "l", box: [0, 0, 18, 200] },
      { id: "sidebar", kind: "sidebar", ref: 14, name: "Sidebar", to: "sidebar", side: "l", box: [18, 0, 82, 200], p: { n: 11, on: 2 } },
      { id: "main", kind: "kpi", ref: 16, name: "主區", to: "主區", box: [82, 20, 320, 200] },
      { id: "drawer", kind: "drawer", ref: 18, name: "Drawer", to: "drawer", box: [214, 0, 320, 200] },
    ],
  },
  "guides/tabs": {
    caption: "筆記頁籤分解圖：頁籤列浮在主區之上，⌥ 快捷鍵與「全部頁籤」清單。",
    layers: [
      { id: "screen", kind: "screen", ref: 10, name: "頁籤列實機", to: "開啟與切換", also: ["手機與其他"], box: [0, 0, 320, 200], shot: "note-tabs" },
      { id: "tabs", kind: "tabs", ref: 12, name: "頁籤列", to: "滑鼠操作", box: [60, 0, 320, 24], p: { n: 5, on: 1, variant: "pin" } },
      { id: "alltabs", kind: "list", ref: 14, name: "全部頁籤", to: "全部頁籤", box: [196, 24, 320, 190], p: { n: 7, on: 2 } },
      { id: "keys", kind: "keys", ref: 16, name: "⌥ 快捷鍵", to: "鍵盤快捷鍵", box: [70, 80, 260, 140], p: { items: ["⌥", ".", "⌥", "W"], on: 0 } },
    ],
  },
};
