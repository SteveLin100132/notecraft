---
version: 1
slug: "site-src-pages-docs-index-astro"
primary_target: "site/src/pages/docs/index.astro"
related_targets: ["site/src/layouts/DocsLayout.astro"]
---

# NoteCraft 官網 Docs

Scope: `site/` 的使用文件 `/notecraft/docs/…`（首頁＋7 章、58 節；這一輪寫入 README 能搬的 30 節，其餘 28 節在書脊上灰字「撰寫中」、不可點）。Visitor mode: Read。
Audience / job: 從 README／官網／搜尋跳進來查一個設定的開發者（主）；照「介紹」「快速開始」順讀的新手與評估者。兩次點擊內找到答案。
Content: MDX（site 加 @astrojs/mdx）Content Collection；章節結構由單一 outline 定義，有檔案的節才可點。README 同步瘦身為簡介＋一張截圖＋Quick Start＋文件連結。
Constraints: 沿用 site/DESIGN.md 全部 token 與規則，不新增顏色；連結一律走 BASE_URL；繁中先行、URL 預留 /en/docs；這輪不做站內搜尋（書脊頂端留位）。
Memorable moment: 深藍書脊——說明書的裝訂邊，窄體章號一路往下，所在那一節亮起橙色引線端點。

## Direction contract

THESIS: 文件是 NoteCraftApp 說明書的「附冊」：左邊一條深藍書脊裝訂著全部 7 章，右邊是安靜的白紙。拒絕灰白側欄＋藍色連結的 Docusaurus 預設長相，也拒絕把專利語彙塞進閱讀欄。

OWN-WORLD: 書脊是 `sheet` 滿高、白字；章號 Archivo 窄體 700、`on-sheet-2`；所在節以 `mark` 實心端點＋白色粗體標出；撰寫中的節 `on-sheet-2` 降不透明度並附小字。白紙側：頁眉（文件名｜第 n 章）、Archivo 800 頁標題、Noto Sans TC 17px 內文 68ch。程式碼框沿用 Diff（1.5px ink、檔名頭、複製）；表格沿用 DataTable（2px ink 表頭線）；提示框以【注意】【提示】方括號節名＋1px rule 上下線，不用色塊、不用粗左線。直角、無陰影、無漸層。

STORY: 讀者看到書脊就知道自己在第幾章第幾節、還有哪些章；讀完內文由頁尾的上一節／下一節（窄體節號＋節名的外框欄）往下走；右側「本頁目錄」隨捲動標出所在小節。結論是「這份文件跟官網是同一本說明書」，然後回去跑 npx。

FIRST VIEWPORT: 左 280px 深藍書脊（logo、「使用文件」、版本號、7 章樹，目前章展開）。右側白紙：頂端頁眉 1px 底線；頁標題約 clamp(30px,3vw,44px) 兩行內；一段 lead（18px、ink-2）；接著內文欄（最寬 68ch），右側 200px「本頁目錄」以 2px 章節線起頭。<1200 收起右欄進文首；<960 書脊縮成深藍頂列＋抽屜。

FORM: 深藍書脊（裝訂成冊的技術手冊書脊），surface grounded list 第 1 名，seed key 01e5e15c 發牌第 3 張，由作者選定；code-led。

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Open decisions

- 站內搜尋（pagefind）待新寫章節補齊後再加。
- 英文版時程。
