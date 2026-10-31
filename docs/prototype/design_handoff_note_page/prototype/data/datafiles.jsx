// 交付 Prototype — 資料檔與 renderer plugin 的最小資料（只保留筆記頁嵌入 ER 圖所需）
window.DATAFILES = [
  { id: "trendmile-schema", path: "planning/81-schema-er-diagram.er.json", route: "/view/planning/schema", title: "TrendMile 系統 Schema 全表關聯圖",
    description: "3 個 schema、15 張表的欄位盤點與外鍵關聯。", dataKey: "ER_SAMPLE", plugin: "er-diagram-renderer", pluginLabel: "ER 關聯圖", updatedAt: "2026-06-09" },
  { id: "roadmap-2026h2", path: "planning/roadmap.json", route: "/view/planning/roadmap", title: "2026 H2 產品路線圖",
    description: "三條產品線的季度里程碑與相依關係。", plugin: "timeline-renderer", pluginLabel: "時間軸", updatedAt: "2026-06-02" },
];
window.PT_PLUGINS = [
  { id: "er-diagram-renderer", title: "ER Diagram", enabled: true, files: ["**/*.er.json"],
    description: "把資料庫 schema JSON 渲染成 Schema／Table 導覽、Wiki 與可聚焦、可搜尋的實體關聯圖",
    options: { defaultRows: 6, hubTables: ["option_item"] } },
  { id: "timeline-renderer", title: "Timeline", enabled: true, files: ["planning/roadmap.json"],
    description: "把里程碑 JSON 渲染成帶相依關係的季度時間軸", options: {} },
  { id: "metrics-table-renderer", title: "Metrics Table", enabled: false, files: ["metrics/**/*.json"],
    description: "把指標定義 JSON 渲染成可排序、可展開計算式的指標表", options: {} },
];
