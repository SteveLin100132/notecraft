# Task 21 — Markdown 擴充語法：Badge

> 對應 PRD v1.8.0 §7.1「Markdown 擴充語法：Badge」。
> 重用 [Task 14](task-14-markdown-directive-admonitions.md) 已引入的 `remark-directive` 底座，**Task 14 必須先做完**。
> 四項〈待釐清〉已於 2026-06-22 由作者拍板收斂（詳見 PRD §Badge）：① variant 採語意色 + **與 Admonitions 共用 token**；② 預設 solid；③ **v1 即支援 `icon`**；④ **v1 即支援 `href`**。

## 範圍

- 擴充 [src/lib/remark-notecraft-directives.ts](../../src/lib/remark-notecraft-directives.ts)：處理 `textDirective` 節點 `name === "badge"`。
- 新增 badge 全域 CSS（或 Tailwind `@layer components`），套用於筆記檢視頁 prose 容器。
- 不需新增依賴；不需新增 Astro 設定（沿用 Task 14 已掛載的 `remark-directive`）。

樣式遵循 trendlink-design token，**不硬編色碼**；純 CSS、零 JS，dev 與正式環境一致。

## 語法

```mdx
這是新功能 :badge[新]{variant="success" icon="sparkle"}。
:badge[Beta]{variant="warning" outline}
:badge[必填]{variant="danger" size="sm"}
:badge[v1.8.0]   <!-- 預設 variant=neutral, solid, size=md -->
:badge[查看文件]{variant="info" href="/notes/getting-started"}
:badge[原始碼]{variant="neutral" href="https://github.com/..."}   <!-- 自動加 target/rel -->
```

- `variant`：`note` / `info` / `tip` / `success` / `warning` / `danger` / `neutral`（預設 `neutral`），**色票共用 Admonitions 同一套 token**（同步擴充）
- `outline`：boolean 旗標；不加為 solid（淡色底）
- `size`：`sm` / `md`（預設 `md`）
- `icon`：選用，對應 lucide-react / inline SVG 的 icon map；未知 icon 名稱回退「不顯示 icon」+ `console.warn`
- `href`：選用，有值時渲染為 `<a class="nc-badge ...">`；判斷為外部連結（含 `://` 且非站內 host）時自動加 `target="_blank" rel="noopener"`

## 實作步驟

### 1. remark transform（badge 部分）

- 走訪 `textDirective`（`mdast-util-directive` 的行內 directive 節點），`node.name === "badge"` 時：
  - 取 `node.attributes`：
    - `variant`：未在列舉內 → `neutral` + `console.warn`
    - `outline`：任何 truthy 值即 outline
    - `size`：`sm` / `md`，預設 `md`
    - `icon`：對照 icon map（與 [Task 14](task-14-markdown-directive-admonitions.md) 共用同一套 lucide / inline SVG 集合）；未知 icon → 不顯示 + warn
    - `href`：有值時切換 `hName` 為 `"a"`，並設 `hProperties.href`；判定為外部連結（`/^[a-z]+:\/\//i.test(href)` 且 host 非站內）→ 自動加 `target="_blank" rel="noopener"`
  - 取 `node.children` 作為標籤文字（保留行內 Markdown）。
  - 內容為空 → `console.warn` 並把節點移除（不產出空 span）。
  - 設 className：`["nc-badge", "nc-badge--" + variant, outline ? "nc-badge--outline" : "nc-badge--solid", "nc-badge--" + size]`。
  - 若有 `icon`：在 children 前插入 `<span class="nc-badge__icon" aria-hidden="true">…</span>`。
- 共用既有的 directive 名稱分派（與 admonition / tabs / tip / annotate 同一個 visitor）。
- **與 Admonitions 共用 token**：variant 對應的色票 class（如 `--nc-tone-success-bg` / `--nc-tone-success-fg`）由 Task 14 已建立的全域 CSS 變數提供；本 task 僅引用、不新增色票來源。新增 variant 時，須同時擴充 Admonitions 與 Badge 兩處 className mapping，避免分歧。

### 2. 樣式（遵循 trendlink-design）

- 連結 trendlink-design `styles.css`；**不硬編色碼**，外觀對齊其 `components/Badge`（或最接近的 primitive）。
- 全域 CSS 定義：
  - `.nc-badge`：`display: inline-flex; align-items: center; vertical-align: baseline; border-radius: var(--radius-pill); font-weight: 500; letter-spacing: 0.02em; line-height: 1;`
  - `.nc-badge--md`：`padding: 2px 8px; font-size: 0.75rem;`
  - `.nc-badge--sm`：`padding: 1px 6px; font-size: 0.6875rem;`
  - 每個 variant 的 solid / outline 一組 color tokens（取 `--blue-*` / `--orange-*` / 品牌綠 / 品牌紅 / neutral 灰）。
  - 不撐高行高：`line-height: 1` + `vertical-align: baseline`，於段落中需與文字對齊（必要時微調 `translateY`）。

### 3. 驗證

- 在範例筆記新增 badge 試點（如 `src/content/notes/_demo-badge.mdx`），覆蓋所有 variant × solid/outline × size。
- `npx tsc --noEmit && npx astro build` 通過。
- 視覺檢查桌面 / 行動裝置：行高不被撐高、文字垂直置中。

## 驗收（對應 PRD 驗收表）

- [ ] solid / outline 兩種樣式正確
- [ ] 預設 variant 為 `neutral`、未指定 size 時為 `md`
- [ ] 未知 variant 回退 `neutral` 並 build log 警示，build 不中斷
- [ ] 表格內 `size="sm"` 不撐高列高
- [ ] 內容為空時略過、不產出空 span
- [ ] `icon` 屬性：已知 icon 名稱於文字前正確顯示；未知 icon 不顯示 + warn
- [ ] `href` 屬性：渲染為 `<a>`；外部連結自動帶 `target="_blank" rel="noopener"`
- [ ] variant 色票與 Admonitions 同步（同一 variant 的底色 / 字色一致）
- [ ] 正式環境（`astro build`）渲染一致，無執行時 API
- [ ] `npx tsc --noEmit && npx astro build` 通過

## 風險 / 備註

- 行內 directive 與一般冒號表達式（如 `https://`）的衝突由 `remark-directive` 處理；測試時留意 `:` 結尾的純文字段落是否被誤判。
- 與 [AI 標記區塊](../../docs/notecraft-prd.md) 正交：不進 `generated/`、不經 Subagent。
