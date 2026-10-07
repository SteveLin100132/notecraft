# Task 127 — MDX 輸出：`remark-notecraft-defs.ts`、元件 placeholder、預覽 template、TOC、dev 失效

> 規格 [notecraft-workbench-define-ref.md](../notecraft-workbench-define-ref.md) §2.5、§4.3、§4.4、§5、§6、§10、§11；Q5、Q9 定案（§17）。
> 像素級規格：[design_handoff_workbench_define_ref/README.md](../prototype/design_handoff_workbench_define_ref/README.md) §1、§2（與規格文件衝突時以規格文件為準，見規格 §12）。
> 前置：Task 125、126。Task 128 靠它。

## 為什麼要有這一步

這一步讓三個指令在 build 後變成真正的 HTML：來源頁的 define、引用處的 include 與 ref，以及預覽卡要用的 template。互動（預覽卡、popover、flash）留給 Task 128，這一步結束時 ref 是可點的一般連結、include 已經是完整內容。

## 範圍

### 1. `src/lib/remark-notecraft-defs.ts`（新增）

`astro.config.mjs` 的 `remarkPlugins` 改為：

```js
[remarkDirective, remarkNotecraftDefs, remarkNotecraftDirectives, remarkNotecraftCodeblock, remarkNotecraftNotesAssets, remarkNotecraftBase]
```

開頭呼叫 `getDefIndex()`＋`assertDefIndex()`，有錯誤就 throw（dev 顯示在 error overlay）。接著依序處理：

| 節點 | 輸出 |
| --- | --- |
| `define` | `section.nc-def#def-<id>`（`tabindex="-1"`、`aria-label`、`data-def`）＞`.nc-def-meta`（`.nc-def-id` 按鈕帶 `data-nc-copy`、`.nc-def-sep`、`.nc-def-cnt` 按鈕或 `.zero` 文字）＋`.nc-def-body`。引用數來自索引 |
| `include` | 以 Task 125 定案的方式解析 `DefEntry.source`，**每處深複製**，包成 `.nc-inc`（`role="group"`、`aria-label`、`data-pagefind-ignore`）＞`.nc-inc-src`＋`.nc-inc-body` |
| `ref` | mdast `link`（`url` 為 `/notes/<slug>#def-<id>`），`hProperties`：`className: ["nc-ref"]`、`data-def`、`aria-haspopup="dialog"`、`aria-expanded="false"`；沒有 `[文字]` 時以 label 當內容 |
| 文末 | 本篇（含嵌入進來的內容）用到的每個 ref id，各一個 `<template data-nc-def …>`，外層 `div[hidden][data-pagefind-ignore][data-nc-def-templates]` |

嵌入子樹與 template 子樹都要做：

- **元件 placeholder**（§2.5、Q5）：`mdxJsxFlowElement` → `div.nc-inc-ph`（連續多個合併成一個）；`mdxJsxTextElement`、`mdxFlowExpression`、`mdxTextExpression` → `span.nc-inc-ph-i`「〔元件〕」；MDX 註解直接移除。來源頁的 define **不做**這一步
- **相對路徑改寫**：`image`、`link`、`definition` 的相對 URL 以來源檔解析後，改成相對於目前檔的路徑
- **標題層級相對化**：最高的標題 → 嵌入處前一個標題的下一級，上限 h4
- **標題 id**：include 內為 `inc-<defId>-<slug>`，同頁第 2 次起加 `-2`、`-3`；template 內的標題改 `hName: "div"`、class `nc-pv-h`
- template 內的 ref 加 `is-static` class

`withBase`：「前往來源」、`data-nc-copy`、template 的 `data-href` 用與 `remarkNotecraftBase` 相同的前綴邏輯（`link` 節點則交給 `remarkNotecraftBase`）。

### 2. dev 失效 `src/lib/defs-integration.mjs`（新增）

依 Task 125 的結論實作規格 §4.4：notesDir 變動 → `resetDefIndex()` → 比對 `source` 找出變動的 id → 讓引用它們的筆記失效並 full-reload。若結論是做不到，只做 reset，並在 dev 啟動時印一行說明。在 `astro.config.mjs` 的 `integrations` 掛上。

### 3. TOC

- `[...slug].astro`：`toc` 的每項依 `id.startsWith("inc-")` 加 `inc: true`
- `Toc.tsx`：`Heading` 型別加 `inc?: boolean`；`inc` 時在標籤前加 corner icon（lucide `CornerDownRight` 11px、`--wb-ink-3`、`title="嵌入的內容"`）

### 4. 樣式（`src/styles/global.css`）

- `.nc-def*`、`.nc-inc*`、`a.nc-ref`、`.nc-inc-ph*` 照 handoff §1、§2、§3.1 與規格 §2.5 的數值
- 新 token 放在 `global.css` 開頭，命名 `--wb-*`（規格 §11）：`--wb-ref-bg`、`--wb-ref-bg-on`、`--wb-ref-line`、`--wb-a-line`、`--wb-def-rule`、`--wb-def-rule-on`、`--wb-def-flash`、`--wb-inc-rule`；只寫亮色值
- 860px 以下的調整（括號 `left:-12px`、include `padding-left:12px`、隱藏 id）
- `.nc-inc-id` 預設隱藏，dev 才顯示：layout 在 dev 時於根元素加 `data-nc-dev`（若已有同等旗標就沿用）
- transition 都要有 reduced-motion 對應

### 5. 產物斷言

`scripts/fixtures/define-ref-html.mjs`（放 `fixtures/`）：build 後檢查範例筆記的 HTML

- 頁面上沒有重複的 `id`
- include 與 template 都帶 `data-pagefind-ignore`
- template 內沒有 `h1`–`h6`、沒有 `id="def-…"`
- 嵌入處沒有元件的 island、placeholder 存在；來源頁的元件 island 存在
- `NOTECRAFT_BASE=/x` 時 ref 的 `href` 帶前綴

## 要改的既有檔案

`astro.config.mjs`、`src/pages/notes/[...slug].astro`、`src/components/islands/Toc.tsx`、`src/styles/global.css`、`src/layouts/WorkbenchLayout.astro`（dev 旗標，若需要）。新增 `src/lib/remark-notecraft-defs.ts`、`src/lib/defs-integration.mjs`、`scripts/fixtures/define-ref-html.mjs`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 來源 | 系統 Overview | 開頁 | 每個 define 有括號與 meta 列；引用數正確；0 篇顯示「尚未被引用」 |
| 嵌入 | 請假功能規格 | 開頁 | include 內容與來源一致（表格、note、steps、tabs、`:tip` 都正常）；連續 include 間距 1.25em |
| 標題 | 請假功能規格 | 看 TOC | 「主管職責」在 TOC 並帶 icon；層級相對化正確 |
| 元件 | `hr.leave-chart` | 開來源頁與嵌入頁 | 來源頁元件正常；嵌入頁是 placeholder，「前往原文」連到 `#def-hr.leave-chart` |
| ref | 帳號權限規格 | 點 ref | 前往來源（本 Task 尚無預覽卡）；無 `[文字]` 的 ref 顯示 label |
| 錯誤 | 暫時改錯一個 id | `astro build` | build 失敗，訊息含相對路徑、行號與建議 id |
| dev | 改 Overview 的 define | `astro dev` | 嵌入頁自動更新，或依 Task 125 結論需重新整理 |
| 產物 | — | `node scripts/fixtures/define-ref-html.mjs` | 全部斷言通過 |
| build | — | `npx tsc --noEmit && npx astro build` | 通過；tsc 錯誤數不增加 |

## 依賴

Task 125、126。

## 實作記錄（2026-10-07）

- `remarkNotecraftDefs` 掛在 `remarkDirective` 之後；include 每處以 `this.parse()` 重新解析一次（天然是深複製），嵌入的 tabs、tip 的 id 由後面的 directives 計數器產生，整頁不重複
- 依賴 `node:path`／`process` 的部分（base 前綴、相對路徑改寫、file.path 轉相對路徑）放進 `defs-state.mjs` 匯出，`.ts` 不直接用：專案沒有 `@types/node`，否則 tsc 會多出錯誤（40 → 42）
- placeholder 判定「需要 import 的元件」：大寫開頭或含 `.` 的 JSX、只含這類元件的段落、`{…}` 運算式；MDX 註解與 ESM 直接移除。小寫 HTML 元素照常渲染
- dev 旗標：`WorkbenchLayout` 的 `<html>` 在 dev 帶 `data-nc-dev`，CSS 以它顯示 include 來源列的 id（860px 以下仍隱藏）
- dev 跨檔失效實測兩個方向：改來源 define → 嵌入頁更新；別篇新增 `:ref` → 來源頁「被 N 篇引用」更新（`尚未被引用` 消失、還原後再出現）
- 錯誤 build：`testing/_bad.mdx:4 :ref 找不到定義「hr.role-admn」（是不是「hr.role-admin」？）`，exit 1
- `scripts/fixtures/define-ref-html.mjs` 10 項通過；`NOTECRAFT_BASE=/x` build 後以 `--base /x` 再跑一次也通過
- reduced-motion：`global.css` 本來就有全域 `animation/transition: none`，flash 另外改成外框
- tsc 錯誤數 40 不變；66 頁
