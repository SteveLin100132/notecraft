# Task 24 — Deck 主題 token 對照 + 8 種版型元件

> 對應 PRD v1.9.0 §7.1「筆記轉簡報」§版型詞彙。依賴 [Task 23](task-23-deck-data-model-resolution.md)（`Slide` 型別）。
> 權威來源：`~/Downloads/design_handoff_note_to_deck/source_reference/deck.jsx`（`DKT`、8 版型、`Eyebrow`/`SlideTitle`/`AccentRule`/`SlideChrome`）；尺寸與 token 對照見 handoff `README.md`〈Design Tokens〉〈8 種版型規格〉。

## 範圍

- 新增 [src/components/deck/theme.ts](../../src/components/deck/theme.ts)：亮 / 暗兩套 `DKT` token 對照（照抄 deck.jsx，語意不變）。
- 新增 [src/components/deck/slideLayouts.tsx](../../src/components/deck/slideLayouts.tsx)：8 種版型 React 元件 + 共用零件 + `LAYOUTS` map + `LAYOUT_SPEC`。
- **像素級還原** deck.jsx，全部走 1600×900 內部座標系（`position: absolute; inset: 0`），`PAD = 104`。

## 關鍵落地規則

1. **Token 直用**：deck.jsx 用的所有 CSS var（`--blue/orange/neutral-*`、`--gradient-header/accent`、`--radius-*`、`--font-sans/mono`、`--shadow-*`）本專案 [src/styles/tokens.css](../../src/styles/tokens.css) **全都有定義**，直接沿用 style 內的 `var(--…)`，**不硬編色碼**。`DKT` 亦照抄（含 dark 的 `rgba(...)` 值）。
2. **Icon 換 lucide-react**：deck.jsx 的 `window.Icons.*` 改用 `lucide-react`（專案既有依賴）。對照：`play→Play`、`grid→LayoutGrid`、`sparkle→Sparkles`、`bolt→Zap`、`bookOpen→BookOpen`、`check→Check`。icon 以 `size` 控制、`color` 用 `currentColor` 繼承。
3. **`full-visual` 收 component 參照**：`LayoutFullVisual` 的 `live` 分支改為讀 `s.viz`（`React.ComponentType`，來自 Task 23），有值即 `<Viz />`；無值顯示占位（`Zap` icon + 「嵌入的互動元件」+ `vizHint`）。暗色主題時把元件包在白底 `--radius-lg` 面板上維持可讀（照 deck.jsx）。
4. **禁 emoji**：一律 lucide icon（沿用 content-visualize 規範）。
5. 全型別標註、無 `any`、無 required-less 破壞（元件由 `Slide` 資料驅動）。

## 元件清單（對照 deck.jsx）

- 共用：`Eyebrow`、`SlideTitle`、`AccentRule`、`SlideChrome`（頁尾「標題 ／ eyebrow ／ NN / NN」）。
- 8 版型：`LayoutCover` / `LayoutSection` / `LayoutBullets` / `LayoutMedia` / `LayoutCompare` / `LayoutFullVisual` / `LayoutQuote` / `LayoutClosing`。
- 匯出 `LAYOUTS`（layout key → 元件）與 `LAYOUT_SPEC`（供未來 decklib，見 README 中文名 / 用途）。
- 主題以 prop `dark: boolean` 傳入，內部 `const c = dkt(dark)`（`dkt` 來自 theme.ts）。

## 實作步驟

1. `theme.ts`：`export const DKT = { light: {...}, dark: {...} }` + `export const dkt = (dark: boolean) => dark ? DKT.dark : DKT.light`。型別化 token 角色（`stage/chrome/rail/slide/border/…/shadowLg`）。
2. `slideLayouts.tsx`：逐一移植 8 版型（保留所有尺寸：cover 116px 大標、section 460px ghost 數字、bullets 2×2 頂 4px 色條、media `1fr/700px`、compare `1fr/76px/1fr` + VS 軸、quote 320px 引號、closing 3 欄 + navy CTA 條）。
3. `full-visual` 接 `s.viz`。
4. 匯出 `LAYOUTS` / `LAYOUT_SPEC`。

## 驗收

- [ ] 8 種版型元件皆可獨立以一筆 `Slide` 資料渲染，外觀對齊 deck.jsx（像素級）
- [ ] 亮 / 暗主題透過 `dark` prop 正確切換（token 對照與 deck.jsx 一致）
- [ ] `full-visual` 有 `viz` 時渲染真元件、無時顯示占位
- [ ] 全程 CSS var、無硬編色碼、無 emoji（icon 用 lucide）
- [ ] `npx tsc --noEmit && npx astro build` 通過

## 風險 / 備註

- 版型元件本身**不含**縮放邏輯（縮放在 [Task 25](task-25-slide-frame-scaling.md) 的 `SlideFrame`）；本 Task 的元件一律以 1600×900 絕對座標排版。
- lucide icon 名稱與 deck.jsx `window.Icons` 的對照需逐一確認（缺的 icon 選最接近者）。
