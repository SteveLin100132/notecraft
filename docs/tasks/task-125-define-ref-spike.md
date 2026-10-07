# Task 125 — spike：define 片段解析、嵌入標題 id、dev 跨檔失效、slug 規則

> 規格 [notecraft-workbench-define-ref.md](../notecraft-workbench-define-ref.md) §4.3、§4.4、§6、§4.2（slug）；Q2 定案（§17）。
> 前置：無。Task 126–127 的做法依本 Task 的結論決定。

## 為什麼要有這一步

規格裡有四個假設還沒在這個 codebase 驗證過，其中任何一個不成立，§4 的架構就要調整：

1. remark plugin 裡能用 `this.parse()` 解析**另一篇**筆記的 define 原始碼片段，結果與 Astro 的 MDX 管線一致（gfm 表格、directive、mdx）
2. 嵌入的標題預先指定 `id`（`inc-<defId>-<slug>`）後，Astro 保留這個 id，`render()` 回傳的 `headings` 也是同一個值
3. dev 期間改了來源 define，能讓嵌入它的筆記重新渲染
4. 用來源筆記的檔案路徑算出的 slug，和 Content Layer 的 `entry.id` 一致

先用最小的程式碼確認，不寫正式功能。

## 範圍

在 `spike/define-ref` 暫存目錄或分支上的拋棄式程式碼，**不 commit 進 `feat/define-ref`**（只 commit 結論）。

### 1. `this.parse()`

- 寫一個暫時的 remark plugin，掛在 `remarkDirective` 之後
- 讀另一篇筆記的一段原始碼（含 GFM 表格、`:::note`、`:tip`、`:::tabs`、一個 `<GeneratedFrame>`），以 `this.parse(text)` 解析，把子樹接到目前的 tree
- 確認：表格解析成 `table` 節點、directive 節點存在、JSX 是 `mdxJsxFlowElement`；接上去後後續的 `remarkNotecraftDirectives` 能正常處理
- 不通過時改用 `unified().use(remarkParse).use(remarkGfm).use(remarkMdx).use(remarkDirective)`，記錄需要寫進 `package.json` 的套件與版本（對齊 `@astrojs/mdx` 鎖定的版本）

### 2. 標題 id

- 在 mdast 的 heading 節點設 `data.hProperties.id = "inc-hr.role-manager-主管職責"`
- 確認輸出的 HTML id 與 `headings[].slug` 都是這個值、沒有被重新 slug
- 不通過時記錄替代方案（例：rehype 階段改寫、或在 `[...slug].astro` 依標題順序對應）

### 3. dev 跨檔失效

- 筆記 A 嵌入筆記 B 的片段；`astro dev` 啟動後改 B 的片段
- 依序試：
  1. 在 `astro:server:setup` 裡對 A 的模組 `server.moduleGraph.invalidateModule()`＋`server.ws.send({ type: "full-reload" })`
  2. 對 A 的檔案 `fs.utimes()`（touch）
- 記錄哪一種讓 A 重新渲染、需要的 module id 形狀，以及 Content Layer 的 digest 有沒有擋住重新渲染
- 都不通過時，結論是「dev 期間要重新整理才看得到其他篇的更新」，規格 §4.4 照這個寫

### 4. slug

- 對現有全部筆記，比對「檔案相對路徑 → 自寫 slug 函式」與 `getWorkbenchIndex().notes[].slug`
- 包含中文檔名、空白、大寫、巢狀資料夾、`.md` 與 `.mdx`
- 找出 Astro 預設 `generateId` 的實作位置，決定共用函式放哪裡

## 產出

- 規格 §18「實作後回填」寫一段「Task 125 spike 結論」：四項各自通過或不通過、採用的做法、限制
- 有需要時修改規格 §4.3、§4.4、§6 的內文，並在 §17 註明
- 若 Q2 退回直接依賴套件，**先在對話中徵詢作者**再寫進 `package.json`

## 要改的既有檔案

只有 `docs/notecraft-workbench-define-ref.md`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 解析 | 含表格、directive、JSX 的片段 | 以 `this.parse()` 解析並接到另一篇 | 節點型別正確；渲染結果與來源頁相同 |
| 標題 id | 預先指定 id 的 heading | `astro build` | HTML id 與 `headings` 皆為指定值 |
| dev 失效 | A 嵌入 B | 改 B | A 自動更新，或已記錄「需重新整理」 |
| slug | 現有全部筆記 | 比對 | 全部一致，或已記錄差異與修正 |
| 零變化 | — | `git diff` | `feat/define-ref` 上只有規格文件的變更 |

## 依賴

無。
