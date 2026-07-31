# 給 Claude Code 的實作提示詞

> 用法：把整個 `design_handoff_canvas_viewport/` 資料夾放進專案（或指向它的路徑），然後把下面〈提示詞〉整段貼給 Claude Code。先跑 A（畫布元件），驗收後再跑 B（接進版型）。

---

## A. 建立畫布元件

```
請在本 codebase（Astro 5 + MDX + React island + TailwindCSS）實作一個新的 React 元件
`CanvasViewport` —— 簡報 `full-visual` 版型用的「元件預覽畫布」。

先讀這三份參考，以 README 為規格唯一來源：
- design_handoff_canvas_viewport/README.md      ← 完整規格與驗收清單
- design_handoff_canvas_viewport/prototype.html ← 可開啟的互動原型（先跑一遍確認手感）
- design_handoff_canvas_viewport/CanvasViewport.jsx ← prototype 實作，僅供參考

背景問題：`full-visual` 頁把筆記裡既有的 AI 生成互動元件整頁嵌入簡報。那些元件是為
網頁內文設計的（寬度吃滿版心、高度隨內容長），但簡報頁是固定 1600×900、overflow:hidden，
所以高元件下緣被裁掉、寬元件左右被切。本元件把容器改成一塊可縮放、可平移的藍圖畫布。

實作要求（細節一律照 README，以下是不可妥協的重點）：
1. 座標系：所有尺寸為 1600×900 座標系下的絕對 px。不要用 rem、不要做 RWD、不要用 vw/vh。
   外層已用 transform: scale 等比縮放整頁；元件透過 `outerScale` prop 知道該倍率，
   所有指標位移（平移量、滾輪錨點換算）都要除以它，否則拖曳不跟手。
2. 只能用既有語意 token 組合（stage/chrome/slide/border/borderSoft/ink/body/muted/
   brand/brandInk/brandSoft/accent/accentSoft/sunken/hover/shadow/shadowLg），
   字級只能取自 h3 30/h4 24/body 20/small 17/micro 14/eyebrow 13，
   間距只能取自 xs 8/sm 16/md 24/lg 40/xl 64，圓角走 --radius-* 變數。
   **不要新增任何色碼、字級或間距值。** 網格點色用 color-mix 從 muted 取百分比。
3. icon 一律用 lucide-react，禁用 emoji。
4. 三種模式由 prop 決定：mode="view" | "play" | "thumb"。thumb 為純靜態（不掛真元件、
   不渲染控制列與遮罩、網格改固定 6px 點距、圓角降級），詳見 README〈三種呈現情境〉。
5. 互動不得佔用簡報鍵位（← → ↑ ↓ Space Esc O）。滾輪規則：
   檢視模式需 ⌘/Ctrl，播放模式純滾輪；**只有確實發生縮放或平移時才 preventDefault +
   stopPropagation，其餘一律放行冒泡**（含已達 25%/300% 上下限時）。
   ⚠ React 的 onWheel 是 passive listener，preventDefault 無效 ——
   必須用 ref + addEventListener('wheel', handler, { passive: false }) 原生掛載。
6. 平移：左鍵拖畫布空白處；指標在元件內容上時讓元件自己處理事件（RACI 的格子與 legend
   在任何倍率下都必須仍可點），按住 Alt/⌥ 才能從元件上起手平移。雙擊空白處＝fit 還原。
   指標位於畫布上時 + / - / 0 生效（這三鍵未被簡報佔用）。
7. 動畫 200–400ms ease-out，且必須尊重 prefers-reduced-motion（全部降為 0ms）。
   連續輸入（滾輪、拖曳）不可有 transition，否則手感黏滯。
8. prototype 尚未實作、請一併補上：平移橡皮筋阻尼 —— 紙張任一邊被拖離畫布超過 25% 時
   阻力遞增，鬆手回彈 260ms，避免元件被拖到完全看不見。

API（可依 codebase 慣例調整命名，但語意要一致）：
  content / natural(紙張內容寬度，預設 860) / w / h / mode / dark / compact /
  outerScale / empty / emptyId / fitRef

完成後請用 README 底部的〈重建檢查清單〉逐條自我驗收，並回報哪幾條需要我確認。
不要順手改動 full-visual 以外的版型或既有元件。
```

---

## B. 接進 `full-visual` 版型

```
把 CanvasViewport 接進簡報的 full-visual 版型（範例頁：筆記 role-and-responsibility
的 P6，元件 rr-raci）。參考 design_handoff_canvas_viewport/README.md 的〈整合位置〉。

1. full-visual 版型：移除原本的 2px 虛線圓角框容器，改渲染 CanvasViewport，
   畫布固定 1392×658（上距標題 24、下距頁碼列 74，維持既有 104px 版心）。
   標題列（eyebrow + title + @ai-visualize 膠囊）與頁碼列不動。
2. 模式判斷一律由版型算好再傳進畫布：
   - 縮覽圖（不掛載真元件）→ mode="thumb"，content 傳骨架（白紙 + 3 條骨架線，首行 blue-200）
   - 單頁檢視 → mode="view"
   - 全螢幕播放 → mode="play"
   若該頁的 @ai-visualize 元件尚未生成 → empty，走空狀態（虛線紙張輪廓 + 元件 id +
   disabled 控制列）。
3. 外層縮放倍率要一路傳到畫布當 outerScale（拖曳／滾輪錨點都靠它換算）。
4. 並排雙畫布情境：兩個 684×658、間距 24、compact 控制列（40px、隱藏百分比文字），
   兩者縮放各自獨立，但 fit 動作同時還原兩側。
5. 驗收：
   - 檢視模式在畫布上純滾輪 → 頁面照常捲動；⌘/Ctrl+滾輪才縮放（斷言 defaultPrevented）
   - 播放模式純滾輪縮放，翻頁鍵、Esc、O 行為完全不受影響
   - 210px 縮覽圖不出現任何 chrome，且不掛載真元件（不可有效能負擔）
   - RACI 的 legend 與列在縮放後仍可點選
   - prefers-reduced-motion 下內容完整可讀

不要改動其他版型、不要動筆記內文渲染、不要引入新的色彩／字級／間距值。
```

---

## 一句話版（若你只想丟一段）

```
依 design_handoff_canvas_viewport/README.md 實作 CanvasViewport 並接進簡報 full-visual
版型（範例：role-and-responsibility P6 / rr-raci），先開 prototype.html 跑一遍手感。
硬約束：1600×900 絕對 px、只用既有 token、lucide icon、不佔用 ← → ↑ ↓ Space Esc O、
滾輪只在確實縮放時 preventDefault（且必須用原生 non-passive listener）、
mode="view|play|thumb" 三情境分別處理、尊重 prefers-reduced-motion。
完成後照 README 的重建檢查清單逐條驗收。
```
