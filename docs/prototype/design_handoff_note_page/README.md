# Handoff：NoteCraft 筆記頁改版

## 概要

這次改版重做 NoteCraft 的**筆記閱讀頁**，範圍包括：

- 新的「品牌」主題（提案中的方案 D），並保留「經典」主題（改版前的樣式），由使用者在設定中切換。
- 支援全部 Markdown 基本語法、NoteCraft MDX 擴充語法（定義與引用、提示框、分頁、步驟、數學、程式碼註解等）。
- AI 生成的互動元件（`@ai-visualize`）的外框，以及 renderer plugin 資料檔嵌入（`<PluginView>`）的外框。
- 右側目錄：收合、標題統計、目前位置。
- 響應式：電腦、平板與手機。
- 亮色與暗色模式。

**範例內容：** 交付 Prototype 只收 4 篇範例筆記，涵蓋所有語法與元件。正式專案已有許多筆記，請用這 4 篇作為**樣式驗收的對照**，不需要把內容搬進 repo。

| slug | 標題 | 用途 |
|---|---|---|
| `md-basics` | Markdown 基本語法 | 標題 H2–H6、行內樣式、清單、待辦、引言、表格、程式碼、diff、圖片、分隔線、定義清單、註腳 |
| `md-advanced` | 進階語法 | `:tip`、`:::define`／`:ref`／`::include`、四種提示框與可收合提示框、內容分頁與程式碼分頁、三種步驟、數學公式、程式碼註解、摺疊問答 |
| `md-viz` | 視覺化互動元件 | 三種已生成的 AI 元件、待生成標記、**Renderer Plugin**（plugins.json 對應、`<PluginView>` 嵌入 ER 圖） |
| `annual-leave-spec` | 特休假規格與計算 | 綜合範例：一篇真實規格文件混用以上所有語法，也是 4 個定義的來源 |

## 關於設計檔

`prototype/` 裡的檔案是**以 HTML 製作的設計參考**，用來呈現預期的外觀與行為，**不是要直接搬進專案的正式程式碼**。請依 NoteCraft 現有的技術棧（Astro 5、MDX、React islands、TailwindCSS）與既有慣例重新實作：

- MDX 擴充語法對應到專案現有的 remark／rehype plugin 與 MDX components。
- 樣式請落到專案的 Tailwind 設定或 CSS，token 對應見下方〈Design Tokens〉。
- 下列項目已在專案中，只需換上新外框：
  - 互動元件（`src/components/generated/*`）
  - 定義與引用的 build 期索引
  - 被引用 Drawer
  - renderer plugin 的 renderer 本身

開啟方式：直接用瀏覽器打開 `prototype/NoteCraft 筆記頁 Prototype.html`。頁首右上可切換「品牌／經典」與暗色模式。Tweaks 面板另外可以調整：

- 字級
- 開啟哪一篇範例
- 介面尺寸（電腦、平板、手機）

## 精細度

**高精細度（hi-fi）。** 顏色、字級、行高、間距、圓角與互動狀態都是最終值，請依 `prototype/note/np.css` 精確還原。Prototype 中的 App Shell（Rail、側欄、頁首）沿用工作台現況，**不在此次改版範圍**。

---

## 頁面結構

```
.wb-main
└─ .wb-body.flush.np-scroll.np-d | .np-o     ← 捲動容器；.np-d = 品牌、.np-o = 經典
   └─ .np-page                                ← grid：minmax(0,1fr) 220px，gap 48px
      ├─ article.md-art                       ← 內容欄（滿版，無 max-width）
      │  ├─ header.md-head                    ← 標籤 → H1 → 描述 → 資訊列
      │  ├─ .md-flow                          ← MDX 內文
      │  ├─ section.md-fns                    ← 註腳（有才顯示）
      │  ├─ nav.md-series                     ← 系列上一章／下一章（有系列才顯示）
      │  └─ .md-foot                          ← 建立日期 + 原始檔路徑
      └─ nav.np-toc                           ← 右側目錄（sticky）
```

- `.np-page`：`padding: 28px 40px 140px`，品牌主題 `padding-top: 24px`；兩種主題都**不限寬度**（內容滿版）。
- 內容欄 `--md-measure: none`；表格、程式碼、圖表都撐滿內容欄。

### 標頭 `.md-head`

| 元素 | 規格 |
|---|---|
| 標籤 `.md-tag` | 22px 高、pill、`1px solid --wb-line`、白底、11.5px、間距 6px；可點擊，點了前往標籤篩選，hover 時框線與文字變 `--wb-blue-l` |
| H1 `.md-h1` | 品牌 32px／經典 30px（手機 24px）、weight 900、line-height 1.25、letter-spacing −.01em；**品牌主題為 `--wb-blue`** |
| 描述 `.md-desc` | 15px（`--md-fs − 1px`）、line-height 1.75、`--wb-ink-3` |
| 資訊列 `.md-meta` | 12px `--wb-ink-3`，gap 6px 16px，下方 `1px --wb-line` 分隔、`padding-bottom: 16px`、`margin-bottom: 26px`；依序為：資料夾（資料夾色 icon）、更新日期、閱讀時間（字數 ÷ 450，四捨五入）、系列「名稱 · n/N」（可點擊） |

### 內文 `.md-flow`

基礎：`font-size: var(--md-fs)`（16px）、`line-height: 1.85`、`color: --wb-ink-2`、段落 `margin: 0 0 1em`、`text-wrap: pretty`。

| 語法 | 品牌（`.np-d`） | 經典（`.np-o`） |
|---|---|---|
| H2 | 1.42em、800、`--wb-blue`、`margin-top 2.4em`、下方 `1px --wb-line` + `padding-bottom .45em`，**左下 40×3px 金色短線**（`::after`，`--wb-gold`，radius 2px） | 1.75em、`--wb-blue`、下方 `1px --wb-line` + `padding-bottom 10px`，無金線 |
| H3 | 1.18em、800、`--wb-ink` | 1.4em、`--wb-ink` |
| H4／H5／H6 | 1.04／.94／.84em；H6 為 `--wb-ink-3`、letter-spacing .04em | 同左（H4 1.16em） |
| 標題錨點 | hover 時在左側顯示 `#`（`.md-anc`），手機隱藏 | 同左 |
| 引言 | `border-left: 3px --wb-line`、`padding-left 1.1em`；巢狀引言字級 .95em；`cite` .8em `--wb-ink-3` | **4px 金色左框 + 金色 9% 底**、`radius 0 8px 8px 0`、`padding 14px 20px`、weight 500 |
| 表格 | 外框 `1px --wb-line` radius 8px；th 背景 `--wb-bg`、700；td 下框 `--wb-line-2`；`.r` 靠右等寬數字、`.c` 置中；表說明 `.md-tcap` .78em | 外框 radius 12px、白底 |
| 程式碼 | 見下方「程式碼區塊」 | 見下方「程式碼區塊」 |
| 提示框 | **C 樣式**：白底、`1px` 類型色 40% 框、radius 8px；標題列為類型色 10% 底、`.74em`、letter-spacing .1em、下框類型色 22% | 類型色 7% 底、類型色 26% 框、radius 12px，標題直接接內容 |
| 分隔線 | `1px --wb-line`、`margin 2.4em 0` | `margin 2.8em 0` |
| 行內程式碼 | `.86em` 等寬、`--wb-bg` 底、`1px --wb-line`、radius 4px | 白底 |
| 螢光標記 | `--wb-gold` 30% | 同左 |
| 徽章 | pill、.76em、700；預設金色 16% 底，`.blue` 為藍色 12% 底 | 同左 |
| kbd | 等寬 .76em、`1px --wb-line`、下框 2px、radius 5px | 同左 |

**經典主題的頁面背景為 `--wb-bg`（`#f6f8fb`，和側欄同色）**。為了在灰底上保持分層，程式碼區塊、行內程式碼、表格、數學式、分頁、摺疊問答都改為白底 `--wb-panel`。

### 程式碼區塊 `.md-code`

- **結構：** 標頭（檔名、語言標籤、複製鍵）＋ 內文 grid（`auto minmax(0,1fr)`：行號欄 + 程式碼）。
- **外框：** `1px --cd-line`，radius 8px（經典 12px，加淡藍陰影）。
- **標頭：** 高 34px（經典 40px），等寬 11.5px；檔名 `--cd-fg2` 600；語言標籤大寫、letter-spacing .06em。經典主題的語言標籤放在最前面，金色 700、letter-spacing .12em。
- **複製鍵：** 24px 高，點擊後 1.6 秒內顯示「已複製」與勾勾。經典主題為 pill 外框按鈕。
- **內文：** 字級為內文的 0.8 倍（經典 13.5px），line-height 1.75（經典 1.85）。
- **強調行（`{5}`）：** 金色 13% 底，行號欄加 2px 金色內陰影（經典 3px、行號 700）。
- **diff：** 行號欄改顯示 `+`、`−` 或空白；新增行為 ok 色 13% 底，刪除行為 danger 色 11% 底。**每列高度固定 `min-height: 1.75em`**，空白列不能塌陷。
- **語法色（亮色）：**
  - keyword `#1b4f9c` 600
  - string `#2a7a4f`
  - comment `#7d8aa0` 斜體
  - number `#b25a0c`
  - function `#7a4cb5`
  - JSON key `#1b4f9c`
- **語法色（暗色）：** keyword `#7ba6da`、string `#8fd3a8`、number `#f0b45a`、function `#c9a8f0`。

**程式碼註解（code annotation）：**

- **行尾標記：**
  - 行尾補上 `// `（原本已以 `//` 結尾就不重複），後面接編號圓圈。
  - 圓圈 1.75em，數字 .68em、800、與圓圈置中，以 `inline-grid; place-items:center` 實作。
  - 預設金色底白字，hover 時 scale(1.12)。
  - **展開時圓圈改為品牌藍 `--wb-blue`**（暗色為 `--wb-blue-l`）。
- **點擊後的彈窗 `.md-ann-pop`：**
  - 400px 寬、白底、`1px --wb-line`、radius 8px、陰影 `0 10px 30px rgba(22,28,40,.1)`，沒有箭頭。
  - 位置在圓圈下方 14px，水平往左偏移 280px，並限制在區塊寬度內。
  - 內容以藍色編號圓圈開頭，後接註解文字；字級為內文的 0.94 倍，line-height 1.9。
  - 點外面或按 Esc 關閉。
  - **不會**高亮對應的程式碼行，也**不在**區塊下方列出註解清單。

### 擴充語法元件

| 元件 | 規格與行為 |
|---|---|
| `:tip` | 文字下方 1px 點線，`cursor: help`；hover 或 focus 時在上方顯示深色提示（`--wb-rail` 底、12px、最寬 240px） |
| `:ref` | 藍色 9% 底 + 1.5px 藍色 55% 下框；hover 或 focus 顯示 300px 預覽卡（標籤、id、摘要、來源筆記）；**點擊或 Enter 前往來源筆記的定義**（見〈互動〉） |
| `:::define` | `id="def-<id>"`；左側 −18px 處有 6px 寬的括號線（hover 時變藍），上方 meta 列為「# id ｜ 被 N 篇引用」11.5px；從其他筆記跳過來時閃爍金色 1.6 秒 |
| `::include` | 左側 2px 藍色 34% 框、`padding-left 16px`；上方來源列「↳ 定義名稱 · 來源筆記標題」與「前往來源 ↗」 |
| 提示框 `:::note/tip/warn/danger` | 類型色依序為 `--wb-blue-l`、`--wb-ok`、`--wb-warn`、`--wb-danger`；可收合版本（`fold="open"`／`"closed"`）使用 `<details>`，標題右側箭頭旋轉 90°，hover 時標題加底線 |
| 內容分頁 `:::tabs` | 外框 radius 8px；分頁列淡底，按鈕 .84em；**選中分頁為品牌藍 700，下方 2px 品牌藍底線**（`box-shadow: inset 0 -2px 0 --wb-blue`）；左右方向鍵可切換；內容區 `padding 1em 1.1em` |
| 程式碼分頁 `:::code-group` | 同上，內層程式碼區塊去掉外框與圓角，貼齊分頁 |
| 步驟 `:::steps` | 標記 1.8em 圓、1.5px `--wb-blue-l` 框，垂直排列時以 2px 線連接；五種狀態見下表；`dir="h"` 改為水平排列（每步至少 92px，可橫向捲動） |
| 數學 | 獨立公式置中、`--wb-bg` 底、radius 8px（品牌主題右側不顯示編號）；行內公式直接嵌在段落中 |
| 摺疊問答 `:::details` | 每題一個 8px 圓角白卡，間距 8px；summary 700、.94em，箭頭旋轉 90° |
| 待辦清單 | 1.05em 方框、radius 4px；勾選後為 `--wb-blue-l` 底白勾，文字變灰並加刪除線（只影響閱讀畫面） |
| 圖片 | 圓角 8px + 1px 框；`figcaption` .8em 灰；`:::figures` 為兩欄、gap 16px，手機改單欄 |
| 註腳 | 上標 `[n]` 700 藍；文末區塊 `margin-top 3em`、上框、字級為內文的 .84 倍；`↩` 回到內文 |

步驟狀態：

| 狀態 | 標記 | 狀態 pill |
|---|---|---|
| done 已完成 | 藍底白勾；連接線變藍 | 藍 10% 底 |
| cur 進行中 | 金框 + 0.3em 金色 22% 光暈 | 金 16% 底 |
| todo 未開始 | 灰框灰字，標題 500 | 灰 |
| err 需處理 | 紅框、紅 10% 底、`!` | 紅 10% 底，說明文字轉紅 |
| skip 已略過 | 虛線框、`–`，標題加刪除線；連接線改虛線 | 灰 |

### AI 視覺化元件外框 `.md-viz`

- 外框 `1px --wb-line`、radius 10px、白底。
- **標頭（36px）：**
  - 金色 sparkle icon
  - 類型名稱，`--wb-blue-l` 700、11px、letter-spacing .08em
  - 右側元件路徑 `generated/<id>.tsx`（等寬）
  - 放大鈕
- **放大：** 改為 `position: fixed; inset: 24px` 的對話框，背景加 50% 深色遮罩；按 Esc 或點遮罩關閉；內文字級放大到 15px。
- **待生成標記 `.md-aim`：**
  - 外框：1px 金色 60% 虛線框、金色 5% 底、radius 8px。
  - 標頭：`@ai-visualize · <id>`、類型、狀態 pill（待生成為金色、已生成為綠色）。
  - 內文：`PROMPT` 小標、prompt 文字，以及「尚未生成……」提示。

### Renderer Plugin 嵌入 `<PluginView>`（**必須保留**）

範例：`md-viz` 的「Renderer Plugin」一節，原始碼在 `note/notes/md-viz.jsx` 的 `PluginEmbed`。

- 外框與 `.md-viz` 相同，以標頭內容區分：
  - icon 換成 layers
  - 類型改為「資料檔 · {pluginLabel}」
  - 右側顯示資料檔路徑（不是 generated 路徑）
  - 多一個「開啟檢視頁 ↗」按鈕（`--wb-blue-l` 700、11.5px），前往 `/view/<path>`
  - 放大鈕
- 內文直接掛 renderer 的 **embed 模式**。ER 圖為 `ErDocs`，參數 `mode="embed" bare`，options 取自 `plugins.json` 的 `defaultRows`／`hubTables`。
- 沒有對應 renderer 或資料時，顯示虛線佔位框（`.md-ph`）。
- 嵌入與檢視頁讀同一份資料檔，不複製內容。
- 範例中的 MDX 寫法：
  ```mdx
  <PluginView file="planning/81-schema-er-diagram.er.json" />
  <PluginView file="..." options={{ focus: "attendance_record" }} />
  ```

### 系列章節導覽 `.md-series`

- 位置：文末 `margin-top 40px`。
- 外框：`1px --wb-line`、radius 8px。
- 上列（淡底、12px）：系列名稱（可點擊）＋ 右側「第 n / N 章」。
- 下列：兩欄，左為上一章、右為下一章（靠右，左側分隔線）。每格是「上一章／下一章」11.5px 灰字，加上標題 14px 粗體，hover 時標題變藍。
- 章節可能是資料檔，點擊時前往檢視頁。
- 560px 以下改為單欄。

### 右側目錄 `.np-toc`

- **位置與尺寸：** `position: sticky; top: 24px`，最大高度 `100vh − 170px`，內容過長時捲動。
- **標頭：** 「目錄」11px 700、letter-spacing .1em，**品牌主題為 `--wb-blue`**；右側為標題統計，例如「H2×8 · H3×10 · H4×4」。
- **全部收合／展開：** 按鈕放在標頭下方。
- **列表：** 左側 2px `--wb-line` 軌道。
  - H2 12.5px。
  - H3 12px、縮排 24px。
  - H4 縮排 36px。
- **收合：** 有子項的列右側有收合鈕，收合後顯示子項數量。
- **目前位置（scrollspy）：**
  - 以捲動容器頂端往下 120px 為判定線。
  - 目前項目為 700 藍字 + 2px 金色左框；品牌主題另加藍色 9% 底與右側圓角。
  - 目前項目的上層標題以 600 藍字顯示路徑。
  - 目前項目即使所在段落被收合，仍然顯示。
- **點擊：** 平滑捲動到標題，位置 −24px；使用者設定減少動態效果時改為直接跳轉。

---

## 互動

1. **`:ref` 點擊／`::include`「前往來源」**：開啟定義所在筆記 → 90ms 後捲到 `#def-<id>`（−32px）→ 定義區塊加 `.flash`（金色底與外光暈 1.6 秒淡出）並取得 focus。
2. **程式碼複製**：寫入剪貼簿，按鈕 1.6 秒內顯示「已複製」。
3. **程式碼註解**：同一時間只展開一則；點同一個編號、點外面或按 Esc 關閉。
4. **分頁**：`role="tablist"`；左右方向鍵切換；只有選中的分頁 `tabIndex=0`。
5. **視覺化與資料檔放大**：Esc 關閉；遮罩可點擊關閉。
6. **標籤**：點擊前往筆記列表的標籤篩選。
7. **閱讀進度**：開啟筆記時，若狀態為「待開始」，自動改為「閱讀中」（沿用既有邏輯）。
8. **主題切換**：設定頁的「筆記頁 › 頁面主題」提供「品牌（新）」與「經典（舊）」兩個選項；切換後捲動容器的 class 在 `np-d` 與 `np-o` 之間交換。設定存在使用者偏好中，預設為品牌。
9. **字級**：使用者字級設定以 `--md-fs: 16px × 倍率` 寫在捲動容器上，內文的 em 尺寸會跟著縮放。

**動態：** 浮層（tip、ref、註解）以 160–180ms 淡入並上移 3px；箭頭旋轉 160ms，曲線 `cubic-bezier(.22,.7,.3,1)`。使用者設定減少動態效果時，全部關閉。

## 響應式

| 寬度 | 行為 |
|---|---|
| > 1100px | 內容 + 220px 目錄，gap 48px |
| 861–1100px | 目錄欄縮為 184px，gap 28px，`.np-page` 左右 padding 改為 28px／24px |
| ≤ 860px | 單欄。目錄移到內文上方，收合成一列「目錄 + 目前章節」的 42px 按鈕，點開後展開列表；H1 24px；隱藏標題錨點；並排圖片與定義清單改單欄；`.np-page` padding 改為 `20px 20px 150px` |

## 暗色模式

在 `<html>` 加上 `.wb-dark`，切換 `--wb-*` token（見下方）。品牌主題的 H1、H2 改用 `color-mix(in srgb, #2c6ebb 45%, --wb-ink)`。選中分頁與註解圓圈改用 `--wb-blue-l`。

## 狀態

- `noteTheme: "brand" | "classic"`：使用者偏好，持久化。
- `fontScale: 0.9–1.25`：使用者偏好。
- 目錄：`items`（從 DOM 的 `.md-flow > h2/h3/h4` 擷取）、`act`（目前項目）、`shut`（收合中的 id 集合）、`open`（手機上目錄是否展開）。
- 程式碼區塊：`copied`、`act`（目前展開的註解編號）、`pos`（彈窗位置）。
- 分頁：選中的分頁索引。待辦：勾選陣列（只存在前端）。
- 定義索引（build 期產生）：
  - `RF_DEFS[id] = { label, src, desc }`
  - 每篇筆記的 `defines` 與 `references`
  - `rfDefRefs(id)`：被引用篇數
  - `rfBacklinks(slug)`：頁首「被引用 N」

## Design Tokens

**工作台 token（`shell/pt.css`）**

| token | 亮色 | 暗色 |
|---|---|---|
| `--wb-blue` | `#1b4f9c` | — |
| `--wb-blue-d` | `#163f7d` | — |
| `--wb-blue-l` | `#2c6ebb` | — |
| `--wb-gold` | `#ed9b26` | — |
| `--wb-bg` | `#f6f8fb` | `#12161f` |
| `--wb-panel` | `#ffffff` | `#1a202b` |
| `--wb-line` | `#e1e6ee` | `#2a323f` |
| `--wb-line-2` | `#eef1f6` | `#232a36` |
| `--wb-ink` | `#161c28` | `#eef2f7` |
| `--wb-ink-2` | `#2b3546` | `#c3ccd8` |
| `--wb-ink-3` | `#6c798e` | `#8b98ab` |
| `--wb-rail` | `#161c28` | `#0d1117` |
| `--wb-ok` | `#2e9e6b` | — |
| `--wb-warn` | `#e3a008` | — |
| `--wb-danger` | `#d64545` | — |

**筆記頁變數**

| 變數 | 品牌 | 經典 |
|---|---|---|
| `--md-fs` | 16px | 16px |
| `--md-lh` | 1.85 | 1.85 |
| `--md-h1` | 32px | 30px |
| `--md-hc`（H1、H2 色） | `--wb-blue` | 預設 ink；H2 另設 `--wb-blue` |
| `--md-measure` | none | none |
| 頁面背景 | `--wb-panel` | `--wb-bg` |

- **字型：** Noto Sans TC + Noto Sans（Latin）；等寬字型用 `var(--font-mono)`。
- **圓角：**
  - 4px：行內程式碼
  - 5px：kbd
  - 8px：品牌主題的所有區塊元件
  - 10px：視覺化外框
  - 12px：經典主題的程式碼、表格、提示框
  - 999px：pill
- **陰影：**
  - 預覽卡：`0 12px 32px rgba(22,28,40,.16), 0 1px 3px rgba(22,28,40,.08)`
  - 註解彈窗：`0 10px 30px rgba(22,28,40,.1), 0 1px 2px rgba(22,28,40,.05)`
  - 經典主題的程式碼區塊：`0 1px 3px rgba(27,79,156,.08), 0 4px 14px rgba(27,79,156,.06)`

## 資源

- `assets/banner-dashboard.png`、`assets/er-diagram.png`：範例筆記中的示意圖。正式專案請改用各筆記自己的圖片。
- icon 為內嵌的 Lucide 風格線條 SVG（2px stroke），路徑定義在 `note/np-md.jsx` 的 `NP_PATHS`。專案已有 icon 元件時，請沿用。
- 設計系統：TrendLink（`tokens/`）。

## 檔案

```
prototype/
├─ NoteCraft 筆記頁 Prototype.html   開啟這個檔案
├─ app.jsx                           交付用的最小 App Shell（只有筆記頁）+ Tweaks
├─ note/
│  ├─ np.css                          ★ 筆記頁全部樣式（.np-d 品牌、.np-o 經典、共用元件、目錄、響應式）
│  ├─ np-md.jsx                       ★ MDX 元件：H、Code（含註解與 diff）、Adm、Tabs、Steps、Task、Tip、Ref、Def、Inc、Det、Viz、AiMark、Fns
│  ├─ np-toc.jsx                      ★ 右側目錄
│  ├─ note-view.jsx                   ★ 筆記頁版面：標頭、資訊列、系列導覽、頁尾、主題 class
│  ├─ np-viz.jsx                      範例 AI 元件（計算器、流程模擬、圖表）
│  └─ notes/                          4 篇範例筆記（JSX 形式，等同 build 後的 MDX）
├─ data/
│  ├─ notes.jsx                       筆記 frontmatter、AI 標記、系列
│  ├─ defines.jsx                     定義索引（RF_DEFS、引用、被引用）
│  └─ datafiles.jsx                   資料檔與 renderer plugin 設定
├─ plugin-er/                         er-diagram-renderer（嵌入模式示範用）
├─ shell/                             工作台 Rail、側欄、頁首（不在改版範圍）
└─ tokens/                            TrendLink 設計系統 token
```

標 ★ 的檔案是這次改版的主要依據。
