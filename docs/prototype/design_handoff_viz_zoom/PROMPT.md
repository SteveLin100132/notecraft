# 給 Claude Code 的實作提示詞

> 用法：把整個 `design_handoff_viz_zoom/` 資料夾放進專案（或指向它的路徑），先開 `prototype.html` 跑一遍手感，然後把下面〈提示詞〉整段貼給 Claude Code。
>
> **前置條件：** 本功能建立在 `CanvasViewport` 之上。若專案還沒有它，請先完成 `design_handoff_canvas_viewport/`。

---

## 主要提示詞

```
請在本 codebase（Astro 5 + MDX + React island + TailwindCSS）為筆記內文的 AI 生成
視覺化元件加上「放大檢視」功能。

先讀這幾份參考，以 README 為規格唯一來源：
- design_handoff_viz_zoom/README.md            ← 完整規格與重建檢查清單
- design_handoff_viz_zoom/prototype.html       ← 可開啟的互動原型（先跑一遍確認手感）
- design_handoff_viz_zoom/VizZoomOverlay.jsx   ← prototype 實作，僅供參考
- design_handoff_viz_zoom/Figure-integration.jsx ← 接進既有圖框包裝的位置

背景問題：`@ai-visualize` 生成的互動元件是為內文欄寬（約 720px）設計的，但有些元件
內容量大（並排雙欄結構圖、RACI 矩陣、寬表格），在內文寬度下被擠壓、橫向溢出，讀起來
很吃力。解法是給每個元件一個放大入口，把它放進既有的 CanvasViewport（可拖曳平移、
可縮放的藍圖畫布），在全螢幕下閱讀。

實作要求（細節一律照 README，以下是不可妥協的重點）：
1. 一次只檢視一個元件。不要做上下切換、不要做縮覽列、不要做暗色舞台切換。
2. 觸發點在生成元件圖框（Figure）標題列的最右側，常駐一顆膠囊按鈕（26px 高、
   expand icon + 「放大檢視」）。注意標題列本身有 uppercase + letter-spacing，
   按鈕文字必須自行覆蓋 text-transform: none / letter-spacing: 0。
3. 覆蓋層是 full-bleed 的（position: fixed; inset: 0; z-index: 900，底色 --neutral-0，
   portal 掛到 document.body）—— 不是 modal，四周不留背景。垂直三段：
   64px 標題列 / flex:1 畫布舞台（padding 24、底 --neutral-50）/ 說明列（caption）。
4. 畫布直接用既有 CanvasViewport，props：content=元件、natural=880、mode="play"、
   w=innerWidth-48、h=innerHeight-64-說明列實際高度-48。說明列高度要用 ref 量
   offsetHeight 回填，不要寫死；resize 時重算 w/h。outerScale 保持 1。
   **不要修改 CanvasViewport 的任何行為**，本功能只是新增一個呼叫端。
5. 元件互動必須完整保留：RACI 的格子與 legend 可點、模擬可播放。指標在元件內容上時
   事件交給元件（CanvasViewport 已有這個規則，別破壞它）。
6. Esc 關閉，用 capture 階段 listener + stopPropagation，避免被背後的簡報／modal
   Esc handler 搶走。開啟時鎖 body 捲動，關閉時還原「原本的」overflow 值。
7. 匯出 PNG：來源不是畫布上那份（有 transform，會連縮放與裁切一起截），而是一份離屏
   乾淨副本（left:-99999px、opacity:0、aria-hidden、width=natural、padding 24、白底），
   用 html-to-image 的 toPng({ pixelRatio: 2, backgroundColor: "#ffffff" })，
   檔名 <元件 id>.png。html-to-image 必須是動態 import（首次點擊才載入，不進 initial
   bundle）。匯出中 disabled + 文字改「匯出中…」，成功／失敗都走專案既有的 toast。
8. 只能用既有 token；不要新增任何色碼、字級或間距值。icon 一律 lucide-react
   （Maximize2 / X / Image / Hand / MousePointer / Loader2 / Sparkles），禁用 emoji。
9. 動畫：覆蓋層淡入 180ms、按鈕狀態 140ms，皆 ease-out，且尊重 prefers-reduced-motion。

狀態全部是 Figure 的 local state（zoom / area / footH / busy），不要引入 global store。

完成後請用 README 底部的〈重建檢查清單〉逐條自我驗收，並回報哪幾條需要我確認。
不要順手改動 CanvasViewport、簡報版型，或筆記內文的其他渲染。
```

---

## 一句話版（若你只想丟一段）

```
依 design_handoff_viz_zoom/README.md 為筆記的 AI 生成視覺化元件實作「放大檢視」：
圖框標題列右側常駐按鈕 → full-bleed 覆蓋層（64px 標題列 / CanvasViewport 畫布 / caption 說明列），
畫布沿用既有 CanvasViewport（mode="play"、natural=880、尺寸由視窗推算）。
硬約束：一次只看一個（無切換、無縮覽列）、元件互動完整保留、Esc 用 capture listener 關閉、
body 捲動鎖定後要還原原值、PNG 從離屏 100% 乾淨副本輸出（html-to-image 動態 import）、
只用既有 token、icon 走 lucide-react、尊重 prefers-reduced-motion、不得修改 CanvasViewport。
先開 prototype.html 跑一遍，完成後照 README 檢查清單驗收。
```

---

## 驗收時值得親手試的幾件事

1. 放大 RACI 矩陣 → 點某個 R/A/C/I 膠囊與某一列，確認篩選仍作用（互動沒被平移吃掉）。
2. 放大「專案 vs 產品」→ 按「開始模擬」，確認動畫在畫布裡照跑。
3. 縮到 200% 後把紙張拖到角落，再按 `0` 或雙擊空白處，確認 fit 還原。
4. 在 200%、已平移的狀態下按「匯出 PNG」，確認輸出仍是完整、置中、100% 的乾淨圖。
5. 開啟覆蓋層後按 Esc，確認只關掉覆蓋層、沒有連帶觸發背後任何東西。
6. 系統開啟「減少動態效果」後重跑一遍，確認沒有動畫但一切可讀。
