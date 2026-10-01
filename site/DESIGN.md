---
name: NoteCraftApp 官網
description: 以專利說明書形式寫成的 NoteCraftApp 官方網站；深藍圖頁與白色說明頁交替，參照編號是唯一的訊號色。
colors:
  sheet: "#1b4f9c"
  line: "#ffffff"
  line-soft: "rgb(255 255 255 / 0.34)"
  line-faint: "rgb(255 255 255 / 0.14)"
  on-sheet-2: "#c9d8ee"
  mark: "#f7bd63"
  mark-strong: "#ed9b26"
  mark-paper: "#9a5400"
  paper: "#ffffff"
  ink: "#111418"
  ink-2: "#5a5f68"
  rule: "#d5d9df"
  rule-strong: "#111418"
  tint: "#e9f0fa"
  del-bg: "#f8ece8"
  del-ink: "#8a2a12"
typography:
  display:
    fontFamily: "Archivo Variable, Noto Sans TC Variable, system-ui, sans-serif"
    fontSize: "clamp(34px, 4.4vw, 68px)"
    fontWeight: 800
    lineHeight: 1.14
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Archivo Variable, Noto Sans TC Variable, system-ui, sans-serif"
    fontSize: "clamp(32px, 4vw, 56px)"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.015em"
  version-numeral:
    fontFamily: "Archivo Variable, Noto Sans TC Variable, system-ui, sans-serif"
    fontSize: "clamp(96px, 16vw, 232px)"
    fontWeight: 700
    lineHeight: 0.82
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 66"
  claim-number:
    fontFamily: "Archivo Variable, Noto Sans TC Variable, system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 700
    lineHeight: 1
    fontVariation: "'wdth' 72"
  fig-number:
    fontFamily: "Archivo Variable, Noto Sans TC Variable, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.01em"
    fontVariation: "'wdth' 72"
  reference-numeral:
    fontFamily: "Archivo Variable, Noto Sans TC Variable, system-ui, sans-serif"
    fontWeight: 700
    fontVariation: "'wdth' 78"
    fontFeature: "'tnum' 1"
  lead:
    fontFamily: "Noto Sans TC Variable, Archivo Variable, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.8
  body:
    fontFamily: "Noto Sans TC Variable, Archivo Variable, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.75
    fontFeature: "'tnum' 1"
  claim-legal:
    fontFamily: "Noto Sans TC Variable, Archivo Variable, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 500
    lineHeight: 1.7
  section-label:
    fontFamily: "Noto Sans TC Variable, Archivo Variable, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    letterSpacing: "0.08em"
  label:
    fontFamily: "Archivo Variable, Noto Sans TC Variable, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    letterSpacing: "0.02em"
  mono:
    fontFamily: "JetBrains Mono Variable, ui-monospace, monospace"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.9
rounded:
  none: "0px"
spacing:
  gutter: "clamp(16px, 4vw, 56px)"
  section-head: "clamp(40px, 6vw, 72px)"
  section-end: "clamp(56px, 7vw, 96px)"
  column-gap: "clamp(24px, 4vw, 64px)"
  pn-gap: "20px"
  caption-gap: "12px"
components:
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.line}"
    rounded: "{rounded.none}"
    padding: "0 18px"
    height: "44px"
    typography: "{typography.section-label}"
  button-outline-hover-sheet:
    backgroundColor: "{colors.line}"
    textColor: "{colors.sheet}"
  button-outline-hover-paper:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  command-bar:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.line}"
    rounded: "{rounded.none}"
    padding: "0 18px"
    height: "52px"
    typography: "{typography.mono}"
  command-copy:
    backgroundColor: "{colors.line}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.none}"
    padding: "0 16px"
    width: "108px"
  command-copy-hover:
    backgroundColor: "{colors.mark}"
    textColor: "{colors.sheet}"
  reference-numeral-sheet:
    textColor: "{colors.mark}"
    typography: "{typography.reference-numeral}"
  reference-numeral-paper:
    textColor: "{colors.mark-paper}"
    typography: "{typography.reference-numeral}"
  claim:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    padding: "22px 0"
    typography: "{typography.claim-legal}"
  plate-frame:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.none}"
  diagram-node:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "10px 14px"
    height: "48px"
  diagram-node-active:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.line}"
  diagram-node-done:
    backgroundColor: "{colors.tint}"
    textColor: "{colors.ink}"
---

<!-- 適用範圍：本檔只規範 site/（NoteCraftApp 官方網站，GitHub Pages /notecraft/）。repo 根目錄的主程式（src/ 工作台、--wb-* token、trendlink-design）有自己的視覺系統，本檔對它沒有任何權限；/demo 是工作台本身的 build，也不歸本檔管。 -->

# Design System: NoteCraftApp 官網

> **適用範圍：只限 `site/` 官方網站。** 主程式（`src/` 工作台、`--wb-*` token、`trendlink-design` Skill）與 `/demo` 不受本檔約束，也不得從本檔借用 token。

## Overview

**Creative North Star: "NoteCraftApp 說明書"**

整個官網是一份專利說明書形式的產品規格：FIG. 圖號、引線與參照編號、【0001】段落編號、符號說明、請求項。文字與圖是同一份文件，彼此用參照編號互相指認，就像 `@ai-visualize` 讓筆記與元件共用同一份原始碼。版面不是「行銷頁加插圖」，而是「說明頁與圖頁輪流裝訂」。

物質感只有兩種紙：深藍滿版的圖頁（白色細線稿）與白底黑字的說明頁。深度不靠陰影，而是畫在圖裡：等角爆炸圖的側面、選中部件浮起 12px。分隔一律是規格書的細線與圖框，角全部是直角。密度偏高、行文偏長，以耐讀的黑體撐住長段落，以窄體數字撐住編號系統。

版面借用專利說明書的形式，但絕不冒充專利：頁面上沒有專利號、沒有官方機關標誌，請求項之後明寫「並未申請專利」。

**Key Characteristics:**
- 圖頁（深藍）與說明頁（白）交替，每頁頂端是頁眉：左側文件名「NoteCraftApp 說明書」，右側「圖頁 n／4」或「第 n 頁」。
- 參照編號（橙）是全站唯一的訊號色；所有被指認的東西都經由編號回到符號說明。
- 編號類文字（FIG.、參照編號、請求項序號、版本號）一律 Archivo 窄寬度粗體。
- 無圓角、無陰影、無漸層、無玻璃；分隔用 1px 細線、1.5px 圖框、2px 章節線。
- 圖可以操作：點參照編號，線稿部件轉為實體並浮起。

## Colors

一個深藍、一組白，加上一族只在「被指認」時出現的橙。

### Primary
- **說明書深藍 Sheet Blue**（`sheet`）：圖頁滿版底色；白紙上被選中的狀態（流程節點、表格列、type 切換鈕）也用它填滿；白紙上的 focus outline。來源是 logo 底色，`theme-color` 同值。

### Secondary
- **橙色參照編號（藍底）Mark**（`mark`）：深藍圖頁上的參照編號、作用中的引線與端點、圖頁內的 focus outline、選中符號說明項的底線、複製鈕 hover、文字選取底色。對深藍 4.7:1。
- **星芒橙 Mark Strong**（`mark-strong`）：logo 星芒色。只用於填色、粗線與大字：線稿中「生成元件」那一塊的描邊與 25–30% 填色、時間軸選中點的填色。不用於內文尺寸的字。
- **橙色參照編號（白底）Mark Paper**（`mark-paper`）：白色說明頁上的參照編號、請求項序號、圖版引線編號、時間軸選中版本號、阻擋狀態（虛線框、gate 關閉字）。對白 5.8:1。

### Neutral
- **線稿白 Line**（`line`）：圖頁上的文字、線稿、圖框、主要按鈕外框。
- **半透白 Line Soft**（`line-soft`）：圖頁上的細線：頁眉底線、圖說上緣線、樹狀圖枝線、版本格線、行內 code 外框。是線，不是字色。
- **淡透白 Line Faint**（`line-faint`）：圖頁上最弱的線：爆炸圖裝配虛線、FIG. 4 畫布格線、符號說明項分隔線。
- **藍底次要字 On-sheet 2**（`on-sheet-2`）：圖頁上的次要文字：頁眉、書目欄名、導覽連結、圖說、lead；選中部件的側面填色。
- **說明頁白 Paper**（`paper`）：說明頁底色，也是圖頁內嵌白框（FIG. 2 元件框）的底。
- **墨黑 Ink**（`ink`）：說明頁文字、圖版外框、流程節點外框、表頭粗線。
- **次要墨 Ink 2**（`ink-2`）：段落編號、圖說、表格內容、「白話」句。
- **細規線 Rule**（`rule`）：說明頁的 1px 分隔線（頁眉、表格列、請求項之間）。
- **章節線 Rule Strong**（`rule-strong`）：說明頁 2px 章節線（符號說明、請求項清單、實施例區塊的上緣）。
- **淡藍底 Tint**（`tint`）：白紙上的「已完成／新增」：diff 新增行、流程中已完成的節點、節點 hover。
- **刪除底／刪除字 Del**（`del-bg`、`del-ink`）：只用在 diff 的刪除行。

### Named Rules
**兩種紙規則（The Two Papers Rule）。** 區塊底色只有 `sheet` 與 `paper` 兩種，依頁序交替。`tint`、`del-bg` 只出現在行或節點的狀態上，不能當區塊底。

**被指認才是橙規則（The Pointed-At Rule）。** 橙色只表示「這個東西被編號指認了／這就是生成出來的那一塊」：參照編號、請求項序號、圖中的生成元件，以及互動回饋（作用中的引線、圖頁上的 focus、複製鈕 hover、文字選取）。橙色不做裝飾底、不做內文字色、不做區塊背景。

**橙色分紙規則（The Mark-per-Paper Rule）。** 藍底用 `mark`，白底用 `mark-paper`，`mark-strong` 只給填色、粗線與大字。換了紙就換橙，不能混用。

## Typography

**Display Font:** Archivo Variable（啟用 `wdth` 軸；備援 Noto Sans TC Variable、system-ui）
**Body Font:** Noto Sans TC Variable（備援 Archivo Variable、system-ui）
**Label/Mono Font:** JetBrains Mono Variable（指令、檔名、標記原文、diff、資料夾樹）

**Character:** 寬體 Archivo 的超粗大字做主張，同一家族壓窄做編號，像工程圖上的字；繁中內文交給 Noto Sans TC 撐長段落。全站 `tabular-nums`，所有數字等寬對齊。

### Hierarchy
- **Display**（800，`clamp(34px, 4.4vw, 68px)`，1.14）：首頁主張，兩行，每行一個 `<span>`，480px 以上不換行。
- **Headline**（800，`clamp(32px, 4vw, 56px)`，1.15）：每張圖頁／說明頁的頁標題，同樣分兩行；收尾標題同級（`clamp(32px, 4.4vw, 64px)`）。
- **Version numeral**（700，`wdth` 66，`clamp(96px, 16vw, 232px)`，0.82）：版本歷程的目前版本，每個數字下有 3px 底線，像填寫欄。
- **Claim number**（700，`wdth` 72，40px；560px 以下 30px）：請求項序號，`mark-paper`。
- **FIG. number**（700，`wdth` 72，20–22px）：圖說開頭的「FIG. n」，以圖紙的主字色。
- **Reference numeral**（700，`wdth` 76–78）：行內跟隨字級；圖中依圖尺度放大（FIG. 1 30px、FIG. 4 24px、圖版 60px 於 1600 寬 viewBox、符號說明 14–18px）。
- **Lead**（400，18px，1.8，最寬 34em）：首頁摘要；圖頁的 lead 17px、`on-sheet-2`、最寬 40em。
- **Body**（400，17px，1.75）：說明頁內文，欄寬上限 68ch。
- **Claim legal**（500，18px，1.7，最寬 46em）：請求項的法律句型；下接 16px `ink-2` 的白話句。
- **Section label**（700，15px，字距 0.08em）：【技術領域】這類以全形方括號包住的節名，以及「符號說明」「指令一覽」。
- **Label**（Archivo 400／600，13px，字距 0.02em）：頁眉、書目欄、段落編號。
- **Mono**（JetBrains Mono，13–16px）：指令列 16px、標記原文 15px／1.9、diff 14px／1.85、檔名 13px。

### Named Rules
**窄體編號規則（The Narrow Numeral Rule）。** 會被引用的數字（FIG.、參照編號、請求項序號、版本號）一律 Archivo 700、`wdth` 66–78；內文裡的普通數字不套。

**方括號規則（The Bracket Rule）。** 說明頁的節名寫成【節名】，段落編號寫成【0001】四位數，掛在 5.5em 寬的左欄、靠右、13px、`ink-2`。編號連續、跨頁不重來。

## Layout

內容容器最寬 1360px，左右 gutter `clamp(16px, 4vw, 56px)`。每個區塊頂端是頁眉（上 18px、下 10px、1px 底線），之後頁標題上方留 `clamp(40px, 6vw, 72px)`，區塊底留 `clamp(56px, 7vw, 96px)`。

常用的兩欄比例是 5fr／7fr（圖頁標題與 lead、FIG. 2 標記與元件框、FIG. 3／4、版本標題與大數字）；首頁 hero 實際是 6fr／6fr（方向合約原寫 5／12：7／12，以 build 為準）。說明頁是「內文 + 260px 符號說明側欄」；diff 頁是「內文 + 最寬 520px 圖」；實施方式是兩欄圖版加「內文 + 最寬 420px 指令表」。

說明頁內文用段落編號格線：`5.5em | minmax(0, 68ch)`，欄距 20px；640px 以下收成單欄，編號改在段落上方、靠左。

斷點：1000px（hero 收單欄）、960px（說明頁側欄、FIG. 2、FIG. 3／4 收單欄，符號說明改 3 欄）、860px（圖頁標題、圖版、實施例、版本標題收單欄）、760px（頂部導覽只留 Demo 與 GitHub）、640px（段落編號、diff 換行）、560px（FIG. 1 符號說明 2 欄、請求項序號縮小）、520px（符號說明 2 欄）、480px（指令列滿寬、複製鈕只剩圖示）。FIG. 2 元件框內用 container query（520px）而不是視窗斷點。

**圖說在下規則（The Caption-Below Rule）。** 每張圖下方是圖說：上緣一條細線、12px 間距、「FIG. n」在前、說明在後，同一行基線對齊。圖說以外不另設圖標題。

**編號在框外規則（The Callouts-Outside Rule）。** 產品截圖圖版的參照編號放在圖框上緣之外（圖框上方留寬度 6.9% 的空間），只有引線與端點伸進畫面，不壓在截圖內容上。

## Elevation & Depth

全站沒有 `box-shadow`、沒有漸層、沒有半透明玻璃。層次只靠兩種紙的明暗交替與線的粗細（1px 細線、1.5px 圖框、2px 章節線、3px 版本底線）。真正的立體只存在於線稿裡：FIG. 1 是等角爆炸圖，各層有側面與面，選中時才變成實體並浮起。

### Named Rules
**深度畫在圖裡規則（The Drawn Depth Rule）。** 需要立體感時畫出來（等角側面、位移），不要用陰影。卡片、按鈕、圖框一律是平的。

**線稿轉實體規則（The Solidify-on-Select Rule）。** 部件被選中時：平面填成白色、墨線改成深藍、側面填 `on-sheet-2`、外框加粗到 2.5px、整層上移 12px（320ms）；其他層降到 62% 不透明度。對應的引線與端點轉橙、編號轉白並加底線。

## Shapes

直角。全站元件 radius 為 0（`rounded.none`）；唯一的圓角是 logo 本身（48 單位的 rx 9），屬於品牌資產，不外推到元件。框線語彙：主要按鈕與指令列 1.5px `currentColor`／`line`；圖版、diff 外框 1.5px `ink`；流程節點 1.25px；說明頁分隔 1px `rule`；章節起點 2px `rule-strong`。虛線只有兩種意思：「尚未發生／被擋下」（阻擋節點、最後一步）與「裝配關係／其他畫法」（爆炸圖裝配線、幽影選項分隔）。

## Components

### Buttons
說明書上的欄框：外框、直角、hover 時反白填滿。
- **Shape:** 直角（0px），1.5px `currentColor` 外框，最低 44px 高，左右 18px，15px／600。
- **Hover:** 圖頁上填 `line`、字變 `sheet`；說明頁上填 `ink`、字變 `paper`；180ms。
- **Focus:** 2px outline、offset 3px；說明頁 `sheet`，圖頁 `mark`。
- 只有一種按鈕，沒有實心主按鈕；主行動是指令列。

### 指令列（Command Bar，主行動）
- `$` 提示符（`on-sheet-2`）＋ JetBrains Mono 16px 指令，最低 52px 高，1.5px `line` 外框。
- 右側複製鈕實心 `line` 底、`sheet` 字，最少 108px 寬；hover 轉 `mark`。複製成功顯示「已複製」兩秒，失敗顯示「請手動選取」。
- 480px 以下滿寬，複製鈕只剩圖示（文字留給螢幕閱讀器）。

### 頁眉（Running Head）
- 左：**NoteCraftApp 說明書**（粗體）；右：「圖頁 n／4」或「第 n 頁」。Archivo 13px、字距 0.02em、1px 底線。
- 只承載文件名與頁序，不放標語或區塊說明。

### 書目欄（Bibliographic Field）
- 只在首頁：名稱、版本、授權、套件四欄，欄名 `on-sheet-2`、值 600。版本取自 package，不寫死。

### 參照編號與符號說明（Reference Numerals & Legend）
- 編號為偶數（10、12、14…），依圖分段：FIG. 1 是 10–20、FIG. 2 是 30–40、FIG. 3 是 50–58、FIG. 4 是 60–64、圖版從 70 起。
- 行內寫法：文字後接一個空白再接編號（「工作台 12」）。
- 「符號說明」是說明頁的側欄清單：2px 章節線起頭、兩欄、編號最少 1.6em 寬；每一個出現在頁面的編號都必須在這裡有一項。

### 請求項（Claims）
- 每條一列：左欄窄體大序號（`mark-paper`），右欄法律句型（18px／500），下一行「白話：」接一句平常話（16px `ink-2`）。
- 列之間 1px `rule`，清單上緣 2px `rule-strong`。清單後必有「並未申請專利」的聲明。

### 圖版（Plates）
- 產品截圖 16:10、1.5px `ink` 外框、白底、`object-position: top left`。
- 參照編號在框外上緣（60px／`mark-paper`），2.5px `ink` 引線曲線下降到 r8 黑點（3px 白描邊）。圖說後列出本圖的「編號＋名稱」。
- 每張 `.webp` 旁有同名 `.json` 記錄出處（真實截圖、尺寸、日期，「Not generated」）。

### 可操作的圖（FIG. 2 元件框）
- 圖頁上嵌一個白色框：框頭（參照編號、等寬檔名、「官網示範元件，非現場生成」）、框身、下緣虛線分隔的幽影列（另外兩種 type 的縮圖，70% 不透明，hover 全顯）。
- 標記原文中的 type 選項：選中者反白（白底藍字、粗體）；未選者刪除線。切換是瞬切（框身以 key 重掛），不做轉場。
- 框內元件：流程節點（直角、1.25px 墨框；作用中填 `sheet`、已完成填 `tint`、被擋下是 `mark-paper` 虛線框）；時間軸（空心點、里程碑實心、選中橙）；表格（表頭 2px 墨線、選中列整列 `sheet`）。

### FIG. 1 爆炸圖（Signature）
- 等角的工作台分層：repo、工作台殼、筆記、生成元件、頁籤列、指令面板，各層一個參照編號。
- 進場一次：各層從疊合位置往上拉開（950ms，延遲 150ms + 每層 70ms），引線 700ms 後淡入（500ms）；之後不再自動動。
- 點引線編號或下方符號說明項 → 套用「線稿轉實體規則」。
- `prefers-reduced-motion: reduce`：直接是終態，浮起不做過渡；整頁平滑捲動也關掉。

### Diff 圖
- 1.5px 墨框、等寬字；頭部檔名＋「示意」，新增行 `tint` 底 `sheet` 字、刪除行 `del-bg` 底 `del-ink` 字、上下文 `ink-2`；圖說列出新檔路徑與其參照編號。

### 版本歷程
- 右側巨大目前版本號（見 Version numeral）；下方自動填滿的版本格（最小 104px），1px `line-soft` 格線；里程碑版本白色 800，其他 `on-sheet-2` 400，日期 13px。

## Do's and Don'ts

### Do:
- **Do** 讓每個區塊以頁眉開頭，並依序在 `sheet` 與 `paper` 之間交替（兩種紙規則）。
- **Do** 每加一個被指認的部件，就給它一個偶數參照編號，並加進符號說明。
- **Do** 藍底用 `mark`、白底用 `mark-paper`；`mark-strong` 只給填色、粗線與大字。
- **Do** 圖下方放「FIG. n」圖說，上緣一條細線。
- **Do** 新的可操作元件沿用「線稿轉實體」與「選中即填 `sheet`」兩種狀態語彙。
- **Do** 動畫只用 `cubic-bezier(0.16, 1, 0.3, 1)`；hover 160–180ms、狀態 260–320ms；進場只演一次，並尊重 `prefers-reduced-motion`。
- **Do** 每張出貨的點陣圖附同名 `.json` 出處紀錄。

### Don't:
- **Don't** 使用 `box-shadow`、漸層、毛玻璃或圓角卡片；深度畫在線稿裡。
- **Don't** 把橙色用在參照編號、序號、生成元件與互動回饋以外的地方。
- **Don't** 在頁面放專利號、官方機關標誌或「已獲專利」字樣；請求項之後保留「並未申請專利」聲明。
- **Don't** 把參照編號壓在截圖內容上；編號放框外，只有引線進畫面。
- **Don't** 在頁眉放標語或區塊說明；它只承載文件名與頁序。
- **Don't** 把 `line-soft`、`line-faint` 當字色；它們是線。
- **Don't** 引用 `--wb-*` token 或 trendlink-design 的值；那是主程式的系統，不是本站的。
