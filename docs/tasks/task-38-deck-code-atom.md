# Task 38 — `<Code>` 原子 + tokenizer 共用模組 + `atoms.deck.tsx` 骨架

> 對應 [deck-atoms-inventory.md](../deck-atoms-inventory.md) §2 A1–A3/A6、§4.1、§5 決議 2 與 3。
> 依賴 [Task 32](task-32-deck-scale-status-tokens.md)（`DS`/`DGAP`）、
> [Task 34](task-34-deck-block-components.md)（`blocks/shell.tsx` 的 `BlockBaseProps`/`warnOverLimit`）、
> [Task 35](task-35-custom-slide-frame.md)（`custom` 頁與 `area`）。
> **本 Task 為 39～45 的基礎，先做** —— 它同時建立 `atoms.deck.tsx` 驗證基準 deck 的骨架。

## 為什麼是它排第一

盤點的 94 頁裡 **36 頁是程式碼呈現**（`inventory` §1.2），是最大單一缺口，
而目前 `blocks/` 完全沒有對應能力。

---

## ⚠️ 開工前要確認的一個偏離（重要）

寫這份 Task 時發現：專案**已經有一套自寫的 build-time tokenizer** ——
[src/lib/remark-notecraft-codeblock.ts](../../src/lib/remark-notecraft-codeblock.ts)（259 行），
供 MDX 筆記內文使用，功能包含：

| 已有 | 說明 |
| --- | --- |
| 語法上色 | 自寫 `CODE_RE` + `classifyIdent` + `tokenizeLine`，9 個 token 類別，**不依賴 shiki** |
| 檔名標題 | fence meta `title="src/lib/auth.ts"` |
| 語言標籤 + 複製鈕 | `.nc-cb__lang` / `.nc-cb__copy` |
| 固定行號欄 | `.nc-cb__gutter` |
| 整行高亮 | fence meta `{1,3-5}` |
| annotation 標記 | 程式碼中 `(n)!` sentinel → `.nc-anno-marker`，與 `:::annotate` 容器配對 |

> **注意**：`docs/tasks/task-17~20` 原本規劃用 `astro-expressive-code`，但**實際沒有採用** ——
> `package.json` 無此依賴、`astro.config.mjs` 無此 integration。上述自寫 remark plugin 才是現況。
> （`global.css:410` 還留著一句「標記由 EC 外掛把 `(n)!` 轉為…」的過時註解。）

**這件事影響 §5 決議 2。** 當時的決議是「v1 不引 shiki、不上色」，理由是不想為了上色引新套件。
但既然上色能力**已經存在且不需要任何套件**，「不上色」就變成沒必要的犧牲 ——
而且筆記內文有色、簡報無色，同一份內容在兩個介面長得不一樣。

**本 Task 的建議做法（需作者確認）**：

> 把 tokenizer 抽成共用模組，deck 端復用 → **免費得到語法上色，且與筆記內文視覺一致**。
> 這不違反決議 2（仍然不引 shiki），只是讓「不上色」這個代價消失。

若作者不同意抽共用模組，退回原決議（不上色）即可 —— 本 Task 其餘部分不變，
只是少做「實作步驟 1」。**開工前定案，不要做一半再改。**

---

## 範圍

### 1. 抽出共用 tokenizer（若採納上述建議）

現況的 `tokenizeLine()` 直接產出 **hast 節點**（`h()` helper），React 端不能用。
重構為「先出中性資料、再由各端映射」：

```ts
// src/lib/code-tokenize.ts（新增，零依賴、無 DOM）
export type CodeTokenCat =
  | "comment" | "string" | "number" | "keyword"
  | "func" | "type" | "attr" | "punct" | "plain";

export type CodePart =
  | { kind: "tok"; text: string; cat: CodeTokenCat }
  | { kind: "marker"; n: string };      // `(n)!` sentinel

export function tokenizeLine(line: string): CodePart[];
```

- `remark-notecraft-codeblock.ts` 改為 import 它，再把 `CodePart[]` 映射成 hast。
  **筆記端輸出的 HTML 必須逐字不變** —— 這是純重構，不是行為變更（見驗收）。
- `<Code>` 元件 import 同一支，映射成 JSX `<span>`。

### 2. `<Code>` 元件（`src/components/deck/blocks/Code.tsx`）

| prop | 型別 | 用途 | 對應圖例 |
| --- | --- | --- | --- |
| `lines` | `CodeLine[]` | 每行的文字 + 選配行尾註解 | A1 |
| `highlight` | `number[] \| [number, number][]` | 要框起來的行（其餘淡化） | A3 |
| `startLine` | `number` | 行號起算值（預設 1） | A3 |
| `fileName` | `string` | 檔名標頭 | A6 |
| `lang` | `string` | 語言標籤 | A6 |
| `labels` | `CodeLabel[]` | 左側彩色標籤 + 引到哪個行區間 | A2 |
| `dark` | `boolean` | 沿用 `BlockBaseProps` | — |

```ts
export interface CodeLine { text: string; note?: string }   // note = 行尾註解欄
export interface CodeLabel { text: string; lines: [number, number]; tone?: SeriesTone }
```

**`startLine` 的必要性**：tus p7–p10 是同一支檔案切成四頁講，行號分別從 1 / 28 / 60 續接。
沒有這個參數就沒辦法表達「這是同一份檔案的下半段」。

### 3. 色彩：新增 `codeTone(dark)`

`DeckThemeTokens` 目前**沒有**程式碼 token 色。新增
`src/components/deck/blocks/codeTokens.ts`，輸出 9 個類別 → CSS 變數的對照：

- **亮色一律對齊 `global.css` 的 `.nc-cb__t--*`**（`comment`→`--neutral-400` 斜體、
  `string`→`--success-500`、`number`→`--orange-700`、`keyword`→`--blue-700` 600 字重、
  `func`→`--blue-500`、`type`→`--orange-600`、`attr`→`--sky-600`、`punct`→`--neutral-400`、
  `plain`→`--neutral-800`）。筆記與簡報**看起來必須是同一套色**。
- **暗色需新配一組**（筆記端只有亮色）。挑選後要確認在 `dkt(true).slide` 底上可讀，
  比照 audit §3.2-D 的做法記錄對比值。

### 4. `atoms.deck.tsx` 骨架（§5 決議 3）

新增 `src/components/generated/atoms.deck.tsx`：

- `slug: "atoms"`、`title: "Deck 原子層驗證基準"`。
- 一頁 `cover` + **`<Code>` 的驗證頁**（本 Task 只需這一頁，後續 Task 各自補頁）。
- 驗證頁要同時放**典型用法**與**邊界狀態**：空 `lines`、超長單行（觸發橫捲）、
  達建議上限的行數、`highlight` 跨越可視區、`labels` 密集時的引線重疊。
- **手寫維護，不由 `slide-generator` 生成** —— 它是驗證基準而非產物。

## 關鍵落地規則

1. 字級一律取 `DS`（程式碼建議 `DS.small`(17) 或 `DS.micro`(14)，實測後定），**不寫字面數字**。
2. 顏色一律經 `dkt(dark)` / `codeTone(dark)`，**不硬編色碼**（既有專案硬規則）。
3. 等寬字型走 `var(--font-mono)`；行號欄加 `tabular-nums`。
4. **`<Code>` 不做複製鈕** —— 投影片沒有「複製」這個使用情境，那是筆記內文的功能。
5. **不做橫向捲軸的互動**：投影片是 `overflow: hidden` 的靜態畫布，
   內容放不下就是要切頁或縮字級，不能靠捲動掩蓋（契約 §7）。
6. 超過建議行數時 `warnOverLimit("Code", n, limit)`（dev-only，不阻斷渲染）。
7. 全型別標註、無 `any`、無 emoji。

## 實作步驟

1. 抽 `src/lib/code-tokenize.ts`，改寫 `remark-notecraft-codeblock.ts` 引用它。
   **先跑一次 build 並 diff 產出的筆記 HTML**，確認逐字不變，再往下做。
2. `codeTokens.ts`：亮色照抄 `.nc-cb__t--*`、暗色新配並記錄對比值。
3. `Code.tsx`：先做 `lines` + `startLine` + `fileName` + `lang` + 行號，跑通再加
   `highlight`（含未聚焦淡化）、`note` 註解欄、`labels` 引線。
4. 建 `atoms.deck.tsx` 骨架 + `<Code>` 驗證頁。
5. `preview_start` → `/present/atoms` → 逐頁截圖，亮暗兩色各一輪。

## 驗收

- [x] `src/lib/code-tokenize.ts` 零依賴、不碰 DOM，remark 與 React 兩端共用
- [x] 重構後**筆記內文的程式碼 HTML 逐字不變**（build 前後 18 個含碼塊頁面 `cmp` 全等）
- [x] `<Code>` 的 `lines` / `startLine` / `fileName` / `lang` / 行號皆正確
- [x] `highlight` 生效且未聚焦行明顯淡化；跨頁續接（`startLine`）可表達 tus p7–p10 的情境
- [x] 行尾 `note` 註解欄可對齊（dataint p6–p11 的樣子）
- [x] `labels` 引線指向正確行區間（DOM 實測中心點誤差 0.0px，見下方記錄）
- [x] 亮色與筆記內文 `.nc-cb__t--*` 同色（8 類逐項比對 computed color）；暗色對比全數 ≥ 5.63:1
- [x] 無硬編色碼、無字面字級、無 `any`、無 emoji
- [x] `/present/atoms` 亮暗各 5 頁皆無溢出（dev 偵測回報 `ok`）
- [x] `npx tsc --noEmit`（18 = 既有基準線，未增加）`&& npx astro build` 通過

## 風險 / 備註

- **重構既有 remark plugin 有回歸風險。** 那支 plugin 正在服務所有筆記（60 個程式碼圍欄），
  改壞了整站程式碼區塊都會爛。實作步驟 1 的「build 前後 diff」是必要關卡，不可跳過。
- **`atoms.deck.tsx` 會讓 Dashboard「已生成簡報」統計 +1**（`allDeckSlugs()` 不分產物與基準）。
  可接受；若在意，在 Dashboard 統計處排除 `slug === "atoms"` 即可。
  **打包無風險**：`package.json` 的 `files` 白名單不含 `src/components/generated/`，不會流出。
- `labels` 的引線能力與 [Task 39](task-39-deck-annotate-atom.md) 的 `<Annotate>` 重疊。
  本 Task 先各自實作；Task 39 完成後若 `<Annotate>` 的引線夠通用，
  再把 `<Code>` 的 `labels` 改為內部委派（屆時是純內部重構，API 不變）。

---

## 實作記錄（2026-07-31，已完成）

### 產出

| 檔案 | 內容 |
| --- | --- |
| `src/lib/code-tokenize.ts` | **新增** —— 中性 tokenizer，吐 `CodePart[]`（`tok` / `space` / `marker`），零依賴不碰 DOM。另含 `parseHighlights`（fence meta）與 `expandLineRanges`（deck props） |
| `src/lib/remark-notecraft-codeblock.ts` | 改為 import 上者，只留 `CodePart[]` → hast 的映射（少 60 行） |
| `src/components/deck/blocks/Code.tsx` | **新增** —— `<Code>` 原子 |
| `src/components/deck/blocks/codeTokens.ts` | **新增** —— 9 個語法類別的明暗色對照 |
| `src/components/deck/theme.ts` | 新增 `codeSurface` / `codeHeader` 兩個 token（理由見下） |
| `src/components/deck/blocks/index.ts` | barrel 補匯出 |
| `src/components/generated/atoms.deck.tsx` | **新增** —— 驗證基準 deck，5 頁 |

作者 2026-07-31 同意抽共用模組（README v1.11.0 段落的「開工前待確認」項），
因此 **v1 有語法上色**，仍未引入 shiki —— 決議 2 的「不引套件」成立，
原本要付的「不上色」代價因而消失。

### 重構的回歸驗證（本 Task 的關鍵關卡）

`dist/` 前後快照逐檔 `cmp`：**18 個含程式碼區塊的筆記頁全部逐位元組相同**。
變動的 4 個檔案都與 tokenizer 無關：

| 檔案 | 差異 | 判定 |
| --- | --- | --- |
| `present/{3 份既有 deck}/index.html` | 只有 `PresentApp.<hash>.js` 的 bundle hash | 預期（deck glob 多了 `atoms.deck.tsx`） |
| `index.html` | Dashboard「已生成簡報」`3` → `4` | 預期，見下方「已知副作用」 |

### 過程中修掉的三個問題

1. **暗色卡片底把 `attr` 壓到 4.20:1。** 原本沿用 `c.sunken`（5% 白），卡片被提亮到
   `#313847`，九個語法色裡 `attr`（sky-400）在其上只有 4.20:1、低於 4.5。
   排查後判斷**問題在卡片底不在字色** —— 硬要調亮 attr 會與 keyword（blue-300）撞色，
   因為 sky 與 blue 在暗色下都得往亮處走。
   改成**比投影片更深的內嵌卡**（22% 黑）後最低的一項是 5.63:1，全數過關，
   而且內嵌感才是 dark UI 對程式碼卡的慣例。為此在 `theme.ts` 新增
   `codeSurface` / `codeHeader`，避免在元件裡硬編 `rgba()`。
2. **空 `lines` 會畫出一個只有標頭的空框。** 已改為 `items.length === 0` 直接
   `return null` —— 空框會讓「資料忘了填」看起來像「本來就長這樣」。
3. **過長行硬切看不出是被裁的。** 投影片不能有捲軸（契約 §7），但硬切會讀成
   「這行就這麼長」。加了右緣 `maskImage` 淡出：短行碰不到淡出區、等於沒作用，
   長行則讀得出「後面還有」。搭配 dev console 的字元數警告。

### 密度上限實測（回填給 [Task 45](task-45-present-skill-agents-atoms.md)）

量法：`/present/atoms` 第 5 頁「行數上限量測」—— 無 caption、無 callout 的乾淨情境，
兩欄各一個帶檔名標頭的 `<Code>`，以 `SlideFrame` 的 dev 溢出偵測判定。

| size | 字級 | 行高 | **建議上限** |
| --- | --- | --- | --- |
| `sm`（預設） | `DS.small` 17 | 30px | **16 行** |
| `xs` | `DS.micro` 14 | 25px | **19 行** |

推導：`custom` 頁（含標題 + callout）的 `area` 實測 **1392×538**，
扣檔名標頭 34 + 上下內距 16 → 488px；488 / 30 = 16.3、488 / 25 = 19.5。
實測第 5 頁在這兩個數字下**剛好不溢出**，再加一行就會被裁。
沒有 callout / 註腳的頁 `area.h` 較大，還能多約 5–6 行 —— 這裡取較嚴的一組當建議值。

單行字元數沒有固定上限（取決於是否有 `labels` / `note` 欄），改為由元件依
假設寬 1392 推估後在 dev 警告，超過就會被裁 + 右緣淡出。

### 色彩驗證（DOM computed 值實測，非目視）

**亮色 vs 筆記內文**：在 `/notes/markdown-擴充語法` 與 `/present/atoms` 各取
computed `color` / `fontStyle` / `fontWeight` 比對，8 個可觀測類別**完全一致**
（keyword `rgb(27,79,156)` w600、func `rgb(44,110,187)`、type `rgb(199,100,26)`、
attr `rgb(42,118,173)`、string `rgb(46,158,107)`、punct `rgb(154,166,184)`、
plain `rgb(38,46,61)`、comment `rgb(154,166,184)` italic）。
`number` 該筆記頁沒有此類 token，deck 側實測 `rgb(160,79,21)` = `--orange-700`，與 CSS 規則相符。

**暗色**（on `codeSurface` ≈ `#1d232e`）：plain 12.58、number 10.51、func 9.16、type 8.89、
string 7.34、comment/punct 6.40、keyword 6.24、attr 5.63 —— 全數 ≥ 4.5:1。

### 左側標籤對齊（DOM 實測）

標籤欄以 `top = (from - startLine) * lh`、`height = 跨行數 * lh` 定位，與行號共用同一個
行高常數。實測兩個標籤的中心點與其目標行區間中心點**誤差 0.0px**
（`[1,2]` → 360.9 vs 360.9；`[5,11]` → 505.6 vs 505.65）。

### 已知副作用

**Dashboard「已生成簡報」統計 +1**（3 → 4）—— `allDeckSlugs()` 不區分產物與驗證基準。
Task 文件已預告此事、判定可接受，故**未處理**；若要排除，在 Dashboard 統計處
過濾 `slug === "atoms"` 即可。
**打包無影響**：`package.json` 的 `files` 白名單不含 `src/components/generated/`。

### 其他

- `labels` 的引線目前是 `<Code>` 自己畫（虛線 + `[` 括號）。與 [Task 39](task-39-deck-annotate-atom.md)
  `<Annotate>` 的引線能力重疊，待 Task 39 完成後再評估是否內部委派 —— 是選配重構，非驗收項。
- `FADE_MASK` 裡的 `#000` 是遮罩 alpha 通道不是顏色，已在程式碼註明，避免日後 grep 誤判為硬編色碼。
- 開發環境 Node 需 ≥ 18.20.8（專案規範 ^22.x）；本機預設 shell 是 v16.14.0，
  跑 `astro` 前要先切 nvm，否則會直接被擋。
