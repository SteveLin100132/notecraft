---
version: 1
slug: "src-pages-docs-index-astro"
primary_target: "src/pages/docs/index.astro"
related_targets: ["src/layouts/DocsLayout.astro","src/pages/docs/[...slug].astro"]
---

# NoteCraft 官網 Docs

Scope: `site/` 的使用文件 `/notecraft/docs/…`（7 章、58 節，全部已有內容）。Visitor mode: Read。
Audience / job: 從 README／官網／搜尋跳進來查一個設定的開發者（主）；照「介紹」「快速開始」順讀的新手與評估者。兩次點擊內找到答案。
Content: MDX Content Collection；章節結構由 `src/lib/docs.ts` 單一 outline 定義。
Constraints: 承襲 site/DESIGN.md 的說明書世界（深藍、白、橙參照編號、Archivo 窄體編號、直角無陰影）；連結一律走 BASE_URL；繁中先行；內文必須是 SSR 的完整 HTML；截圖只用真實畫面（附 .json 出處），不捏造。
Memorable moment: 深藍書脊裝訂的橫線筆記紙：內文一行一格寫在線上，章節線、表格列線都壓在橫線上。

## Direction contract

THESIS: 文件是 NoteCraftApp 說明書的「附冊」，寫在橫線筆記紙上：左邊深藍書脊裝訂全部 7 章，右邊是安靜的橫線紙。拒絕 Docusaurus 灰側欄＋藍連結。導覽只靠書脊與右側本頁目錄，不做終端機（作者 2026-10-03 決定）；每節的爆炸圖試過當目錄後撤下，檔案保留（components/fig、lib/figs）。

OWN-WORLD: 書脊 `sheet` 滿高、窄體章號、所在節橙色端點。右側橫線筆記紙：白底、`tint` 1px 橫線畫在每 32px 一格的上緣、左側一條 `on-sheet-2` 邊界線；內文每行一格、基線坐在線上方約 6px；章節線、表格列線、頁眉線、頁首下緣線都壓在橫線上（docs.ts snapGrid）。頁首是 `mark-paper` 窄體節號＋Archivo 800 標題、18px／32px 導言；右側 240px sticky 本頁目錄（紙色底，讀到的那組才展開）。程式碼框沿用 Diff、表格 32px 列、提示框方括號節名。直角、無陰影、無漸層色塊。

STORY: 讀者看書脊就知道在第幾章第幾節；讀內文時右側目錄標出所在小節；讀完由上一節／下一節往下走。

FIRST VIEWPORT: 左 280px 深藍書脊。右側筆記紙：頁眉；頁標題（節號＋標題）兩行內、導言；內文欄吃滿紙寬，≥1200 右側 240px 本頁目錄。<1200 目錄收進文首的 `<details>`，<960 書脊縮成頂列抽屜。

FORM: 延伸既有說明書世界的「深藍書脊」形式（surface 原 FORM，seed key 01e5e15c），加上作者指定的橫線筆記紙；code-led。

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## 1.1「它做什麼」

功能清單＋實機截圖切換（components/FeatureTour.tsx）：左 200px 清單（tablist，窄體編號，選中填 `sheet`），右側 16:10 實機截圖（1.5px 墨框）與說明、連結；窄於 680px 時清單成兩欄按鈕、截圖在下。文字沿用 FeatureExplode 的 FEATURES。原本的互動爆炸圖 FeatureExplode 保留未用。

## Open decisions

- 每節爆炸圖之後要不要以「圖版＋內文參照編號」的方式接回。
- 站內搜尋（pagefind）之後再加；英文版時程。
