---
version: 1
slug: "site-src-pages-index-astro"
primary_target: "site/src/pages/index.astro"
related_targets: []
---

# NoteCraft 官網 Landing

Scope: `site/` 的首頁（Landing），GitHub Pages `/notecraft/`；/demo 是 NoteCraft 本身 build 的工作台，另行處理。
Visitor mode: Persuade.

Audience / job: 寫技術筆記的開發者（複製 npx 去試）；評估導入的團隊／技術主管（找部署形態、plugin、持續維護證據，進 /demo）。
Proof: 自製示範元件（可操作）、產品截圖當圖版、CHANGELOG 版本歷程。無見證、無使用量數據。
Constraints: 繁中先行、預留 en；不得偽造專利（無專利號、無官方機關標誌、不寫「已獲專利」）；反目標：AI SaaS 臉、開源文件站首頁、太安靜。
Memorable moment: 點參照編號 → 線稿部件打亮並「活過來」成為可操作元件。

## Direction contract

THESIS: 官網是一份「NoteCraft 說明書」：專利說明書的形式（FIG. 圖號、引線與參照編號、段落編號 [0012]、符號說明、請求項）。文字與圖是同一份規格，如同 @ai-visualize。拒絕「置中大標＋終端機＋三欄功能卡」的開發者工具官網排法。

OWN-WORLD: 兩種紙交替：FIG. 圖頁是 NoteCraft 深藍滿版、白色細線稿；說明頁是白底黑字、段落編號掛在左欄。參照編號一律橙色（logo 星芒色），是全站唯一的訊號色。部件被選中時線稿轉為實體、填色浮起。無漸層、無玻璃、無陰影卡片；分隔用規格書的細線與圖框。

STORY: 首頁摘要＋FIG. 1 代表圖（工作台爆炸圖）→ 先前技術（筆記只能放文字和靜態圖）→ FIG. 2 標記→元件（以 NoteCraft 自身為題材，type 切換 diagram／timeline／table，未選者幽影並列）→ FIG. 3 文件即 codebase（repo 樹線稿）→ FIG. 4 同一元件走過筆記／畫布／簡報 → FIG. 5 起產品截圖圖版 → 實施方式（部署、plugin、系列）→ 請求項（法律句型＋白話）→ 版本歷程（固定位數大數字）→ 收尾 npx。訪客相信「AI 產的是我 repo 裡可審查的元件」，然後複製 npx 或進 Demo。

FIRST VIEWPORT: 深藍圖頁滿版。左欄（約 5/12）：書目欄小字（名稱、版本 1.7.0、MIT）、主張巨字、摘要一段、npx 指令列（複製鈕）為主行動、「進入 Demo」次行動。右欄（約 7/12）：FIG. 1 工作台爆炸線稿（Rail／Sidebar／主區／頁籤列／元件層分離），橙色引線編號 10–18，點擊或對應符號說明時部件打亮。底緣是 FIG. 1 圖說與參照編號說明列。

FORM: 專利圖說（patent specification drawing），grounded list 第 1 名（IMPECCABLE’S PICK），第二手重抽後由作者選定。seed key e9bacc3f。

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Open decisions

- 字體：中英混排實際試排後決定（說明頁需耐讀的黑體；書目／編號需工程感的等寬或窄體）。
- 英文版時程。
