Project Name: NoteCraft Workbench — 筆記閱讀頁改版（品牌／經典主題、語法補齊、目錄與外框）
文件類型: Design Document
文件版本: v1.0.0
開發模式: Waterfall
技術選型: 沿用既有技術棧；數學公式新增 remark-math + rehype-katex（作者已同意，§14 Q4）
文件狀態: 已定案（§13 的 12 題已於 2026-10-31 確認，紀錄見 §14；Q2、Q7、Q9 與建議不同）
文件作者: 建宇
建立日期: 2026-10-31
更新日期: 2026-10-31
依賴文件: docs/notecraft-workbench.md（殼、`#nc-scroll`）、docs/notecraft-workbench-define-ref.md（定義索引、RefLayer）、docs/notecraft-workbench-loading-transitions.md（預繪、骨架）、docs/notecraft-plugin-system.md（`<PluginView>`）、docs/prototype/design_handoff_note_page/README.md
分支: feat/note-page-redesign
目標版本: notecraftapp 1.14.0（暫定）
---

# NoteCraft Workbench — 筆記閱讀頁改版設計文件

重做 `/notes/<slug>` 的閱讀體驗。視覺與互動以 handoff `design_handoff_note_page/` 為準（以下簡稱 **handoff**，章節記為 H§「標題」）。handoff 的像素規格（字級、間距、圓角、色值、狀態）本文件不重抄，實作時直接對照 `prototype/note/np.css`。本文件只寫三件事：

1. 現況與 handoff 的**差距盤點**（§2）
2. 放進這個 codebase 的**架構與落點**：DOM、樣式位置、remark 輸出、偏好、SSR／預繪（§3–§10）
3. handoff 與 codebase 現況**不一致**之處，以及需要作者拍板的問題（§11–§13）

---

## 1. 這份文件要解決什麼

### 1.1 起點

筆記頁從 v0.x 起陸續加功能（提示框、分頁、步驟、定義與引用、程式碼註解），樣式散在 `global.css` 的 prose 區段、`[...slug].astro` 的頁內 `<style is:global>` 與大量 inline style。結果是：

- 字級全部是絕對值，沒有 `--md-fs`，無法整體縮放
- 標題只寫到 H3；kbd、mark、圖片、註腳、待辦清單沒有樣式
- 主要強調色是橘色（引言、分頁、語言標籤、強調行），和品牌藍不一致
- H1 在殼的 Header 裡（20px、兩行截斷），不是內文的一部分

### 1.2 目標

- 新增「品牌」主題（handoff 方案 D），保留「經典」主題，使用者在設定頁切換，預設品牌
- 補齊 handoff 列出的 Markdown 基本語法與 NoteCraft 擴充語法的樣式（§5）
- 筆記頁版面改為 handoff 的 `.np-page`：內容滿版＋右側 220px 目錄、文內 H1／描述／資訊列
- 目錄改為 H2–H4、標頭下方「全部收合」、收合後顯示子項數、手機 42px 單列按鈕
- 程式碼區塊、AI 視覺化外框、`<PluginView>` 外框、系列導覽換上新外觀
- 使用者字級倍率（0.9–1.25）
- 響應式三段（> 1100／861–1100／≤ 860）

### 1.3 非目標

- App Shell（Rail、Sidebar、Header、頁籤列）不改（handoff 明訂）——但 Header 的標題顯示要配合調整，見 §3.2、Q3
- 不改定義索引、反向連結、RefLayer 的資料邏輯，只換外觀
- 不改 renderer plugin 本身
- 不把 handoff 的 4 篇範例筆記搬進 repo（只作為驗收對照，§12）
- 暗色模式是否在範圍內待定（Q1）

---

## 2. 現況盤點與差距

> ✅ 已有、只需換樣式　🟡 已有、行為或語法與 handoff 不同　❌ 沒有

### 2.1 頁面結構

| 項目 | 現況 | handoff | 差距 |
|---|---|---|---|
| 捲動容器 | `#nc-scroll.wb-body`（一般 padding、`--wb-bg` 底） | `.wb-body.flush.np-scroll.np-d/.np-o` | 🟡 需 `flush`、主題 class、`--md-fs` |
| 版面 grid | `.wb-host.nc-content > .nc-note-grid`，container query 900px 切單欄 | `.np-page` grid `1fr 220px` gap 48，三段 media query | 🟡 |
| H1 | 殼 Header `h1.wb-hd-title` 20px | 文內 `.md-h1` 32／30px，品牌為藍 | 🟡 Q3 |
| 標籤 | `TagEditor` island（dev 可編輯） | `.md-tag` pill，點擊前往篩選 | ✅ 換樣式 |
| 描述 | inline style `<p>` | `.md-desc` | ✅ |
| 資訊列 | 更新於、`ReadingControl` pill、「被 N 篇引用」 | 資料夾、更新日期、閱讀時間、系列 n/N | 🟡 Q8 |
| 待生成標記 | 文首集中列出 `AiMarkerCard` | 在標記原位渲染 `.md-aim` | 🟡 Q6 |
| 註腳區 | GFM 會產生，無樣式 | `.md-fns` | ❌ 樣式 |
| 系列導覽 | `SeriesNav`（在頁尾之後） | `.md-series`（在頁尾之前） | 🟡 順序與外觀 |
| 頁尾 | 建立於＋原始檔路徑 | 同 | ✅ |
| DonePrompt | 文末「標記完成」 | handoff 沒畫 | 保留（§11） |

### 2.2 內文語法

| 語法 | 現況語法 | handoff 寫法 | 差距 |
|---|---|---|---|
| H4–H6、標題錨點 `#` | 無 | 有 | ❌ |
| 引言、表格、hr、行內 code | 有（經典味） | 兩主題各一套 | ✅ 換樣式 |
| kbd、mark（螢光）、del、圖片、figcaption | 無樣式 | 有 | ❌ 樣式（mark 語法見 Q5） |
| 待辦清單 | GFM 解析、無樣式 | 可勾選（只存前端） | ❌ |
| 定義清單 | 無 | 有 | ❌ Q5 |
| 註腳 | GFM 解析、無樣式 | `[n]` 上標、文末區塊 | ❌ 樣式 |
| `:tip` | `:tip[文字]{content="…"}`、虛線底 | 點線底、深色泡泡 | ✅ 換樣式 |
| 提示框 | `:::note/tip/info/warning/danger/success`、`{collapsible open}` | `note/tip/warn/danger`、`fold="open\|closed"` | 🟡 Q2 |
| 內容分頁 | `:::tabs` > `:::tab{label}`，橘色上緣 | 藍色底線 | ✅ 換樣式 |
| 程式碼分頁 `:::code-group` | 無 | 有 | ❌ |
| 步驟 | `::::steps{layout}` > `:::step{title status}`；狀態 done／current／todo | 五種狀態＋狀態 pill；`dir="h"` | 🟡 補 err／skip、pill |
| 數學 | 無 | 獨立／行內公式 | ❌ Q4 |
| 程式碼註解 | `:::annotate` + `(n)!` + 下方有序清單；無 JS 時清單照顯示 | 行尾 `// (1)` 圓圈、400px 彈窗、不列清單 | 🟡 換樣式；清單的處理見 §5.4 |
| diff 區塊 | 無 | 行號欄 `+ − ␠`、底色 | ❌ |
| 摺疊問答 `:::details` | 無 | 有 | ❌ |
| 並排圖片 `:::figures` | 無 | 兩欄 | ❌ |
| `:badge` | 有（多變體） | pill 金／藍 | ✅ 換樣式 |
| define／include／ref | 有，外觀已大致對齊 handoff | 同 | ✅ 微調 |

### 2.3 元件與互動

| 項目 | 現況 | handoff | 差距 |
|---|---|---|---|
| 程式碼區塊 | `remark-notecraft-codeblock.ts` build 期輸出，13.5px 固定、橘色語言標籤、token 色 | 0.8em、語法色 hex、diff | 🟡 |
| 複製鍵 | 頁內 vanilla script，1.6s「已複製」、失敗 fallback | 同 | ✅ 換樣式 |
| AI 視覺化外框 | `GeneratedFrame.astro`（inline style、藍 pill、複製提示詞、VizZoom） | `.md-viz` 36px 標頭 | 🟡 |
| 放大 | `VizZoom`：全螢幕、可平移縮放、匯出 PNG | `inset:24px` 對話框＋遮罩 | 🟡 Q9 |
| `<PluginView>` | `src` 屬性、找不到資料檔 build fail | `file` 屬性、虛線佔位 | 🟡 §11 |
| 目錄 | H1–H3、標頭右側全收合、無子項數、判定線 140px、<900 容器寬折疊面板 | H2–H4、標頭下方、子項數、120px、42px 單列 | 🟡 Q7 |
| ref 預覽卡、define flash | 已有，延遲與跳轉與 handoff 一致 | 同 | ✅ |
| 字級倍率 | 無 | `--md-fs` × 0.9–1.25 | ❌ Q10 |
| 主題切換 | 無 | 設定頁「筆記頁 › 頁面主題」 | ❌ |
| 暗色模式 | 全 app 沒有（刻意未搬 `.wb-dark`） | 有 | ❌ Q1 |

---

## 3. 版面與 DOM

### 3.1 結構

```
#nc-scroll.wb-body.flush.np-scroll.np-d|np-o   ← layout 的 bareBody? 否：沿用 layout 輸出，加 class 與 style
└─ .np-page                                     ← 取代 .wb-host.nc-content > .nc-note-grid
   ├─ article.md-art
   │  ├─ header.md-head   標籤（TagEditor）→ h1.md-h1 → p.md-desc → .md-meta
   │  ├─ .md-flow.nc-prose[data-pagefind-body]   <Content/>
   │  ├─ section.md-fns   （remark 把 GFM footnotes 搬到這裡，§5.6）
   │  ├─ DonePrompt
   │  ├─ nav.md-series     （SeriesNav 改外觀，移到頁尾之前）
   │  └─ .md-foot
   └─ nav.np-toc          （Toc island）
```

- `id="nc-scroll"` 保留；`Toc`、捲動還原、RefLayer 都依賴它
- `.wb-host` 目前有兩個用途：padding 與 `Toc.tsx` 用 ResizeObserver 量寬度。改版後版面改用 `.np-page`，`Toc` 改看 `.np-page` 或直接用 media query（Q7）。**骨架外層不用 `.wb-host` 的限制**（loading-transitions）同時要回頭檢查
- `NoteSkeleton` 要跟著換成新版面的骨架，`@view-transition` 與 `#nc-pane-start` 不動

### 3.2 H1 與 Header

handoff 的 H1 在文內；殼的 Header 也會顯示標題（handoff 原型的 shell 有麵包屑但不重複標題）。選項見 Q3。

### 3.3 斷點

handoff 用 viewport media query（1100／860）；現況筆記 grid 用 `@container wbhost`（900，量的是扣掉 Sidebar 後的內容寬）。Sidebar 可收合、平板殼會變窄，以容器寬判斷比較正確。**建議**：保留 container query，門檻換算成內容寬——內容寬 ≥ 約 860 為三欄完整（220 目錄）、640–860 為 184 目錄、< 640 單欄。實際值在實作時以 handoff 三種介面尺寸截圖對齊（Q7）。

---

## 4. 主題、字級與偏好

### 4.1 class 與變數

- 捲動容器上帶 `np-d`（品牌）或 `np-o`（經典），樣式規則以 `.np-d …`／`.np-o …` 區分，共用規則不加前綴
- `--md-fs`（16px × 倍率）寫在捲動容器的 `style`；內文尺寸一律 em
- 新變數命名：`--md-*`（內文）、`--cd-*`（程式碼語法色）。CLAUDE.md 規定 workbench 規則只引用 `--wb-*`、不出現色碼字面值 → 語法色 hex 集中定義在 token 區（`:root` 的 `--wb-cd-*`），規則只引用變數

### 4.2 偏好存放

延伸 `lib/wb-prefs.ts`（`nc-workbench-prefs-v1`）加兩個鍵：`noteTheme: "brand" | "classic"`（預設 brand）、`noteFontScale: number`（預設 1，夾在 0.9–1.25）。沿用 `nc-prefs-changed` 事件，筆記頁開著時在設定頁切換能即時生效（同分頁不會發生，但跨分頁靠 `storage` 事件）。

### 4.3 SSR 與預繪

偏好在 localStorage，SSR 一律輸出品牌、倍率 1。為避免經典使用者看到閃爍：

- 在 `#nc-scroll` 開頭放 inline script（與頁籤預繪同樣做法：`toString()` 內嵌的自足函式，放 `lib/note-theme-prepaint.ts`，`check:wb` 斷言），第一次繪製前換 class、寫 `--md-fs`
- `#nc-scroll` 是 layout 輸出、不是 island，直接改它的 class 不會造成 hydration mismatch
- 捲動還原在主區結尾，字級預繪必須在它之前，否則還原位置會錯

### 4.4 設定頁

`SettingsView` 的「筆記」區塊增加：

- 「頁面主題」：品牌（新）／經典（舊）
- 「字級」：0.9–1.25（滑桿或 5 段，Q10）

---

## 5. 語法與 remark 輸出

原則：**既有語法不改、不破壞既有筆記**；handoff 的新寫法不加別名（§14 Q2）。輸出的 class 換成 handoff 的 `md-*` 名稱，或保留 `nc-*` 只改樣式——建議**保留現有 `nc-*` class**，只改樣式，理由：

- 官網 `sync-nc-prose.mjs` 以 `.nc-prose` 為根改寫、官網示範與 RefLayer 都依賴 `nc-*` class
- 改 class 名稱會讓 remark 輸出、RefLayer、預覽卡、頁內 script 全部跟著改，風險大但沒有使用者可見的好處

handoff 的 `md-*` 名稱只作為對照表（附錄 A）。

### 5.1 樣式落點

- 內文相關樣式全部放在 `global.css` 的 prose 區段（`prose styles for MDX note bodies` 與 `unstyled button reset` 之間），官網才抽得到
- 目錄、`.np-page` grid、`.md-head`、`.md-series` 這些「頁面殼」樣式從 `[...slug].astro` 的頁內 `<style is:global>` 搬到 `workbench.css`（或新檔 `note-page.css`），頁內不再有大段 style
- 主題差異以 `.np-d`／`.np-o` 前綴寫；**官網只需要品牌主題**（建議，Q11）→ 官網的 `.ncp` 根加上 `np-d` 即可

### 5.2 新增語法

| 語法 | 建議寫法 | 實作 |
|---|---|---|
| 程式碼分頁 | `:::code-group` 內放多個帶 `title` 的圍欄程式碼，分頁名取 `title`，沒有則取語言 | remark-notecraft-directives，重用 tabs 的 DOM 與 `nc-tabs.ts` |
| 摺疊問答 | `:::details{q="問題" open}` 或 `:::details[問題]`；連續多個自動包成群組 | `<details class="nc-det">` |
| 並排圖片 | `:::figures` 內放圖片（各自的 title 當 caption） | `<div class="nc-figs">` |
| 步驟狀態 | `status=err\|skip`，並接受 `cur` 作為 `current` 別名 | 補 class 與狀態 pill |
| diff | ```` ```diff ```` 或 `lang` + `diff` meta | codeblock 渲染器：行號欄改 `+ − ␠`、行加 `is-add`／`is-del` |
| 數學 | `$…$`、`$$…$$` | Q4 |
| 定義清單 | Q5 | Q5 |
| 螢光 `==文字==` | Q5 | Q5 |

### 5.3 程式碼區塊

- 結構維持 `nc-cb`，標頭順序：品牌為「檔名 → 語言 → 複製」，經典為「語言（金色）→ 檔名 → 複製」（CSS `order` 處理，不輸出兩份）
- 字級改 `0.8em`（經典固定 13.5px 改為 `.84em` 以便跟著倍率縮放，Q10 確認）
- 語法色改為 handoff 的 hex（以 `--wb-cd-*` 變數）；`code-tokenize.ts` 的分類（type、attr、punct）handoff 沒有對應色 → type 用 function 色、attr 用 key 色、punct 用 comment 色但不斜體
- 簡報的 `<Code>` 與筆記共用 tokenizer，**不共用顏色**，簡報不受影響

### 5.4 程式碼註解

保留 `:::annotate` + `(n)!` 語法。外觀改為 handoff：行尾補 `// `、金色圓圈、展開時藍色；彈窗 400px、圓圈下方 14px、左偏 280px 並夾在區塊內。

handoff 說「不在區塊下方列出註解清單」。現況的清單同時是**無 JS 的退路**與 pagefind 可搜尋的文字。建議：清單照樣輸出，script 初始化成功後加 `.is-enhanced` 以 CSS 隱藏；無 JS 或初始化失敗時仍可讀。不用 `hidden` 屬性，是為了讓 pagefind 照常索引註解文字。

### 5.5 待生成標記原位渲染（Q6）

若選原位渲染：remark 階段把 `mdxFlowExpression` 中 `@ai-visualize` 且 status 非 `generated`／`locked` 的註解，轉成 `<div class="nc-aim">` 的 hast（純 HTML、不需要元件）。`mdx-writer` 寫回時仍是在註解下方插入 JSX，生成後註解的 status 變 `generated`，原位卡片自動消失。

### 5.6 註腳

GFM 輸出 `section.footnotes`；改由 remark 加 class（`nc-fns`）與「註腳」標題，搬到 `.md-flow` 之後由 CSS 處理即可（GFM 已把它放在文末）。返回鍵 `↩`、上標 `[n]` 的格式以 remark 調整 `footnoteLabel` 與 back-reference 內容。

### 5.7 待辦清單

GFM 輸出 `<input type="checkbox" disabled>`。handoff 要求可勾選但只存前端：頁內 script 移除 `disabled`、勾選只改 class、**不持久化**（重整後回到原檔狀態）。

---

## 6. 目錄（`Toc.tsx`）

- 收錄範圍**維持 H1–H3**（含 `::include` 嵌入的標題，保留 icon）；H4–H6 不收錄（§14 Q7）
- 標頭統計維持 H1／H2／H3
- 「全部收合／展開」移到標頭下方；收合時顯示子項數
- 判定線 140 → 120px
- 目前項目在收合段落內時仍顯示（現況是標記最近的可見祖先 `.proxy`，handoff 是直接顯示該項）
- 窄畫面：42px「目錄 ＋ 目前章節」單列按鈕，點開展開
- `tocDefault` 偏好（全部展開／收合）沿用

---

## 7. 外框：AI 視覺化與 PluginView

- `GeneratedFrame.astro` 改為 `.md-viz` 外觀（36px 標頭：金色 sparkle、類型、`generated/<id>.tsx`、放大鈕）；inline style 改為 class
- 「複製提示詞」（現況在標頭）handoff 沒畫 → 建議保留為 dev-only（正式環境本來就不該出現生成提示），Q9
- `data-nc-viz-body` 不可拿掉（VizZoom 搬移目標）
- 資料檔模式：layers icon、「資料檔 · {pluginLabel}」、資料檔路徑、「開啟檢視頁 ↗」、放大鈕；dev 的「以 VS Code 編輯」保留
- 放大行為見 Q9

---

## 8. 互動對照

| handoff 互動 | 現況 | 處理 |
|---|---|---|
| ref 點擊 → 90ms 後捲到 `#def-<id>` −32px、flash 1.6s、focus | 已有（延後一拍） | 不動 |
| 複製 1.6s | 已有 | 不動 |
| 註解單一展開、外點／Esc 關閉 | 已有 | Esc 改走 `lib/wb-escape.ts` 共用堆疊（若現況是自掛 keydown） |
| 分頁方向鍵、roving tabindex | 已有（另有 Home／End） | 不動 |
| 放大 Esc／遮罩關閉 | VizZoom 有 Esc | Q9 |
| 標籤點擊前往篩選 | 已有 | 不動 |
| 開啟即「待開始 → 閱讀中」 | `ReadingControl` 掛載時 | 若移除 ReadingControl（Q8），`markReading()` 要換地方呼叫 |
| 浮層 160–180ms 淡入上移 3px、reduced-motion 關閉 | 部分 | 全部補 reduced-motion |

---

## 9. 暗色模式（視 Q1）

若納入：需要全 app 的 `.wb-dark` token 切換（`--wb-*` 暗色值，handoff 已給 9 個）、設定頁開關、預繪 script（`<html>` class）、`prefers-color-scheme` 預設。Dashboard、Graph、plugin（`--oar-*`、ER）、空狀態插圖都只寫了亮色，**只做筆記頁會在換頁時明暗跳動**。建議拆成獨立版本處理（見 Q1）。

---

## 10. dev／正式、官網、pagefind

- dev-only 項目不變（⋯選單、標籤編輯、複製提示詞等）
- 官網 `sync-nc-prose.mjs`：起訖註解字串不可動；新增的 `--wb-cd-*`、`--md-*` 若放在 `workbench.css` 的第一個 `:root` 會一併帶到官網
- pagefind：新增的 `.nc-aim`（若原位渲染）加 `data-pagefind-ignore`，避免 prompt 被索引成內文；目錄、資訊列本來就不在 `data-pagefind-body` 內

---

## 11. 與 handoff 的差異（建議直接採用，除非作者反對）

1. **語法沿用現況**：`warning`（非 `warn`）、`{collapsible open}`、`id="…"`（非 `{#a.b}`，CLAUDE.md 已記 `.` 會變 class）、`::::steps` + `:::step`、`:::annotate` + `(n)!`、`<PluginView src>`（非 `file`）。別名見 Q2
2. **`<PluginView>` 找不到資料檔仍 build fail**（plugin system「失敗一律 build fail」），不做 `.md-ph` 虛線佔位；佔位只用在 renderer 在瀏覽器 throw 的錯誤卡片
3. **保留 DonePrompt、「被 N 篇引用」**：handoff 沒畫，但屬既有功能
4. **保留 `nc-*` class 名稱**（§5）
5. **斷點用 container query**（§3.3）
6. **handoff 範例的「`status: empty`／`coming-soon`」等文案**只是範例筆記內容，不是新功能

---

## 12. 實作階段（Task 137–144，見 docs/tasks/README.md 的 Phase 4.29）

1. **基礎**：`.np-page` 版面、`--md-fs`、主題 class、偏好與預繪、設定頁、頁面殼樣式搬出 `[...slug].astro`
2. **內文樣式**：H1–H6、錨點、引言、表格、hr、行內元素、圖片、註腳、待辦——兩主題
3. **既有擴充語法換外觀**：tip、提示框、分頁、步驟（含 err／skip）、define／include／ref、badge
4. **程式碼區塊**：新外觀、語法色、diff、註解彈窗
5. **新語法**：code-group、details、figures、數學、定義清單、螢光（依 Q4／Q5）
6. **外框**：GeneratedFrame、PluginView、待生成標記、放大
7. **目錄**與響應式
8. **驗收、官網同步、release**

### 12.1 驗收

- 以 handoff 4 篇範例為對照：在 `scripts/fixtures/` 寫一支產生器，把 4 篇內容轉成本專案語法的 MDX 輸出到暫存 notesDir（不進 `src/content/notes/`），build 後逐項截圖比對兩主題 × 三種寬度
- `check:wb` 加：預繪函式自足、偏好夾值
- 既有筆記全站 build 無錯、既有語法渲染不退化

---

## 13. 待釐清問題

| # | 問題 | 建議 |
|---|---|---|
| Q1 | 暗色模式要不要做？做的話範圍是只有筆記頁還是全 app？ | 本版**不做**，token 先依 handoff 結構備好；全 app 暗色另開版本 |
| Q2 | handoff 的新寫法（`warn`、`fold="open\|closed"`、`:::steps` 內放有序清單）要不要加為別名？ | 只加 `warn`→`warning`、`fold` → `collapsible`(+`open`) 兩個便宜的別名；steps 不加 |
| Q3 | H1 移到文內後，殼 Header 的標題怎麼辦？ | Header 保留標題但只在捲過文內 H1 後顯示（或縮成麵包屑），避免同畫面兩個標題 |
| Q4 | 數學公式要用哪種實作？（白名單外套件需同意） | `remark-math` + `rehype-katex`（build 期輸出，需 KaTeX CSS 與字型）；或輸出 MathML 的 `temml`（較輕、無字型），二選一 |
| Q5 | 定義清單與 `==螢光==` 要支援嗎？語法？ | 螢光：支援 `==文字==`（小型自寫 remark）；定義清單：用 `:::dl` directive 而非引入套件 |
| Q6 | 待生成 `@ai-visualize` 標記改為在原位渲染，還是維持文首集中列出？ | 原位渲染（handoff），文首不再列 |
| Q7 | 目錄改為 H2–H4（現況 H1–H3）。內文用了 `#` H1 的既有筆記怎麼辦？斷點是否接受 container query 換算？ | 內文 H1 視覺降為 H2 樣式並列入目錄第一層；斷點用 container query |
| Q8 | 資訊列改為 handoff 四欄後，`ReadingControl`（三段 pill）放哪？ | 保留在資訊列最後一項（handoff 沒有但屬既有功能），「被 N 篇引用」也保留 |
| Q9 | 放大檢視：沿用 VizZoom（全螢幕、平移縮放、匯出 PNG），還是改為 handoff 的 inset 24px 對話框？「複製提示詞」鍵？ | 沿用 VizZoom 行為、外觀加 24px inset 與遮罩；複製提示詞改 dev-only |
| Q10 | 字級倍率的設定 UI 是滑桿還是固定段數？經典主題程式碼要跟著縮放嗎？ | 5 段（0.9／1／1.1／1.2／1.25）；程式碼跟著縮放 |
| Q11 | 官網示範只用品牌主題？ | 是 |
| Q12 | 版號：這次是 1.14.0 的 minor？ | 是 |

---

## 14. 定案紀錄

2026-10-31 與作者確認：

| # | 決定 |
|---|---|
| Q1 | 本版**不做暗色模式**；token 依 handoff 結構備好，全 app 暗色另開版本 |
| Q3 | Header 標題平常隱藏，**捲過文內 H1 後才淡入**（以 IntersectionObserver 觀察 `.md-h1`；reduced-motion 直接切換；SSR 時隱藏，無 JS 時以 `<noscript>` 樣式顯示） |
| Q4 | 數學公式用 **`remark-math` + `rehype-katex`**（作者同意引入）；KaTeX CSS 只在筆記頁載入，字型隨 build 輸出 |
| Q6 | 待生成標記**在原位渲染**（§5.5），文首不再集中列出 `AiMarkerCard` |
| Q2 | **不加別名**，只認現有語法；handoff 範例對照時一律轉成現有寫法 |
| Q8 | 資訊列**照目前的順序排列**，閱讀進度 pill 與「被 N 篇引用」**都保留**；handoff 的資料夾、閱讀時間、系列 n/N 為新增項目（放在既有項目之後的位置待實作時以截圖確認） |
| Q5 | 兩者都**自寫、不引入套件**：`==文字==` → `<mark>`（小型 remark）；定義清單用 `:::dl` directive（內放「**名詞** ＋ 說明」的清單，轉成 `<dl>`），語法細節於實作 task 定稿 |
| Q7 | 目錄**維持 H1–H3**（與 handoff 的 H2–H4 不同）；標頭統計顯示 H1／H2／H3；內文 H1 維持比 H2 大一階的樣式並依主題調色。§6 第一點以此為準 |
| Q9 | 放大檢視**維持現有 VizZoom**（全螢幕、平移縮放、匯出 PNG），外觀與行為都不照 handoff 改；「複製提示詞」鈕**保持現況**（兩種環境都顯示）。§7 對應兩點以此為準 |
| Q10 | 字級倍率用 **5 段切換**（0.9／1／1.1／1.2／1.25），放在設定頁「筆記」區塊；程式碼區塊（含經典主題）一併以 em 縮放 |
| Q11 | 官網示範**只用品牌主題** |
| Q12 | 版號 **notecraftapp 1.14.0**（minor） |

§13 的 12 題已全部確認（Q2、Q7、Q9 與建議不同）。

---

## 附錄 A：handoff class 與本專案對照

| handoff | 本專案 |
|---|---|
| `.md-flow` | `.nc-prose` |
| `.md-code` | `.nc-cb` |
| `.md-adm` | `.nc-adm` |
| `.md-tabs` | `.nc-tabs`（以實作為準） |
| `.md-steps` | `.nc-steps`（以實作為準） |
| `.md-def`／`.md-inc`／`.md-ref` | `.nc-def`／`.nc-inc`／`.nc-ref` |
| `.md-tip` | `.nc-tip` |
| `.md-ann`／`.md-ann-pop` | `.nc-anno-marker`／（彈窗） |
| `.md-viz` | `GeneratedFrame` |
| `.md-aim` | `AiMarkerCard` → `.nc-aim` |
| `.md-series` | `SeriesNav` |
| `.np-toc` | `Toc` |
