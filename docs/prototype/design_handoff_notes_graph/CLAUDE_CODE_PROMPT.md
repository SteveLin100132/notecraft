# 給 Claude Code 的開場提示

請在 NoteCraft 工作台的筆記頁（`/notes`）新增第五個檢視 **Graph**，依照 `design_handoff_notes_graph/README.md` 實作。

- 先讀 README 全文；`source/` 與 `prototype/` 是 HTML 設計參考，不要直接搬程式碼。用專案既有的工作台元件（Header 頁籤、`.wb-tb` Toolbar、`.wb-setseg`、`.wb-search`、`.wb-switch`、NoteDrawer、Esc 堆疊、`useNarrow`）與 `--wb-*` token 重做。
- 新 token 全部放進一處，命名 `--wb-gr-*`，值見 README §7.1；class 前綴 `gr-`。
- 資料：在 build 期產生 `GraphNode[]`／`GraphEdge[]`（README §8.1），`ref`／`inc` 邊來自既有 define／include／:ref 索引，`link` 來自 MDX 站內連結，`seq` 來自系列順序。
- 佈局：照 README §5.6 的力導向與群聚參數，固定亂數種子；算完即靜止，建議放在 Web Worker 或 build 期並快取。
- 效能：淡出用 `fill-opacity`／`stroke-opacity`，不要對節點群組設 `opacity`；選取環、focus 環只在該狀態渲染；箭頭用 `<path>` 三角形不用 `<marker>`。以 300 節點驗證 hover 與搜尋不卡頓。
- 無障礙：節點是可聚焦按鈕（Enter／Space 開 Drawer）、著色下拉為 listbox 鍵盤操作、`prefers-reduced-motion` 時模式切換直接換位。
- 完成後逐一對照 README §3 的 14 個狀態畫面（prototype 右下 Tweaks →「Graph 狀態」可切換）。

請先列出你要改的檔案與步驟給我確認，再開始實作。
