# Claude Code 起手

請先完整讀 `design_handoff_workbench_define_ref/README.md`，再開 `prototype/NoteCraft-工作台-定義與引用-standalone.html`（自含單檔，可離線），用右下 Tweaks →「定義與引用」走過每個狀態；「工作台」區可切換亮／暗與電腦／平板／手機。

任務：在 NoteCraft 既有 codebase 實作 define／include／:ref 的**閱讀端**呈現與反向連結，整合進既有工作台與筆記頁。語法解析與 build 期錯誤檢查已另案處理，本任務從「build 期已產生 DefIndex」開始（README §0）。

順序建議：
1. 資料：build 期 `DefIndex`（label、src、已渲染內容、refs）與每篇筆記的 `defines`／`references`（§0）
2. 筆記頁沿用既有 NoteView，只加 define／include 區塊渲染與 TOC 來源（「筆記頁：沿用既有 NoteView」一節）
3. `.nc-def`（§1）與 `#def-<id>` 落點 flash
4. `.nc-inc`（§2）：相對標題層級、TOC 計入（帶嵌入 icon）、id 前綴（§10）
5. `a.nc-ref` 與預覽卡（§3）：時序、定位翻轉、截斷＋「看完整內容」、手機 sheet
6. 反向連結：筆記頁頂端入口（頁首按鈕＋meta 列）→ 右側 Drawer（§4.1）；**正文底部與 TOC 都不放**；列表 Drawer 摘要（§4.2）；Palette 以 id 搜尋（§4.3）
7. Esc 改為共用堆疊（§6），a11y（§8），reduced-motion（§5），響應式（§9）
8. 跑 §12 驗收清單

限制：
- 顏色只用 `--wb-*`／設計系統 token 與 README §7 列出的新 token，不寫死色碼
- `source/` 是設計參考，請用專案現有元件與樣式重做，不要直接搬 JSX
- 預覽卡與 include 內不可產生和來源頁重複的元素 id（§10）
- 既有筆記與既有畫面行為不變；只新增
