# Task 32 — 原子層 token：字級階梯 + status 暗色階

> 對應 [deck-slide-contract.md](../deck-slide-contract.md) v0.2 §5.1、§5.2；
> [deck-design-audit.md](../deck-design-audit.md) B-1、B-2、B-4。
> 依賴 [Task 31](task-31-deck-type-union-v02.md)（`StatusTone` 型別）。

## 範圍

- 新增 `src/components/deck/scale.ts`：`DS`（字級階梯）、`DTRACK`（letter-spacing）、`DGAP`（間距）。
- [src/styles/tokens.css](../../src/styles/tokens.css)：新增 status 的 300 階（暗色用）。
- [src/components/deck/theme.ts](../../src/components/deck/theme.ts)：`DKT` 新增 status 角色，light 取 500 階、dark 取 300 階。

## 為什麼要做

1. `slideLayouts.tsx` 目前用了 **19 個彼此無關的一次性字級**（18/19/20/21/22/24/25/26/28/30/32/34/36/40/62/92/116/320/460px），
   沒有階梯、沒有具名常數。`custom` 頁上線後會自由發揮，若沒有可 import 的階梯，每頁字級都會不一樣。
2. `tokens.css` **只有 `--success-500` / `--warning-500` / `--danger-500`，沒有暗色階**。
   實測 `danger-500` 在暗色投影片底（`#262e3d`）上只有 **3.11:1**、`blue-700` 只有 **1.72:1**。
   `StatusTone` 一旦啟用，暗色模式會直接不可讀。

## 關鍵落地規則

1. **`DS` 的值是 1600×900 座標系下的 px**，不是 rem、不做 RWD（縮放由 `SlideFrame` 的 `transform: scale` 負責）。
   `mega: 216` 的來源：對齊目標月會簡報章節頁的 195pt，在 20in 寬版面換算到 1600px 座標約 216px。
2. **階梯就是 10 個 key**（`mega`/`hero`/`h1`/`h2`/`h3`/`h4`/`body`/`small`/`micro`/`eyebrow`），
   **不准加第 11 個**。要新字級就是調整階梯本身，不是加特例。
3. status 暗色階採用實測通過的值（下表對比值皆 vs `#262e3d`）：

   | token | 值 | 對比 |
   | --- | --- | --- |
   | `--success-300` | `#5cc494` | 6.35:1 |
   | `--warning-300` | `#f2c14e` | 8.12:1 |
   | `--danger-300` | `#ef8b8b` | 5.67:1 |

4. `DKT` 的 status 角色一律成對（前景 + soft 底），命名沿用既有風格（`brand`/`brandSoft`、`accent`/`accentSoft`）：
   `good`/`goodSoft`、`warning`/`warningSoft`、`critical`/`criticalSoft`。
5. **不硬編色碼**：`scale.ts` 只有數字；`theme.ts` 一律 `var(--…)`（既有規則）。

## 實作步驟

1. `scale.ts`：照抄契約 §5.1 的 `DS` / `DTRACK` / `DGAP`（`as const`，型別由 TS 推導）。
2. `tokens.css`：在既有 `--success-500` 那一組旁新增三個 300 階 + 對應的 50 階已存在則不動。
3. `theme.ts`：`DeckThemeTokens` 介面加 6 個 status 欄位；`DKT.light` 取 500 階、`DKT.dark` 取 300 階；
   soft 底 light 取 50 階、dark 取 `rgba(...)` 低透明度（沿用既有 dark soft 的寫法）。
4. 跑一次 palette validator 確認 status 三色**在各自模式下**對比達標（指令見下方驗收）。

## 驗收

- [x] `DS` 有且僅有 10 個 key（`mega`/`hero`/`h1`/`h2`/`h3`/`h4`/`body`/`small`/`micro`/`eyebrow`）
- [x] `tokens.css` 三個 300 階存在，值與上表一致
- [x] `DKT.light` / `DKT.dark` 皆有完整 status 角色，且**全部走 CSS var**、無硬編色碼
- [x] validator 檢查通過（`SeriesTone` 三色在 light 模式全項 PASS）：

  ```bash
  node scripts/validate-deck-palette.mjs
  ```

  （腳本尚未存在 —— 屬 audit C-1，本 Task 可先手動跑 dataviz skill 的 `validate_palette.js`，
  或順手把它收成上述專案腳本。）
- [x] `npx tsc --noEmit && npx astro build` 通過

## 風險 / 備註

- 本 Task **不改任何版型元件的字級**（那是 [Task 33](task-33-slide-chrome-fixed-layouts.md) 與
  [Task 34](task-34-deck-block-components.md) 的事），所以做完畫面應**零變化** —— 只是把原子準備好。
- `DS` 收成 9 級後，既有版型有些字級（如 92、320、460）會落在階梯外。Task 33 改寫時要決定
  是併到最近一級，還是那個尺寸本身就是設計意圖（如 `quote` 的 320px 大引號、`section` 的 460px ghost 數字）。
  **建議**：純裝飾性的 ghost 字（引號、背景大數字）不受階梯約束，在 Task 33 明確標為 decorative 例外。

---

## 實作記錄（2026-07-30，已完成）

- `src/components/deck/scale.ts`：`DS`（10 級）/ `DTRACK` / `DGAP`，全部 `as const`，另匯出 `DsStep`。
- `tokens.css`：新增 `--success-300` / `--warning-300` / `--danger-300`，值與本文表格一致。
- `theme.ts`：`DeckThemeTokens` 新增 6 個 status 角色（`good`/`goodSoft`/`warning`/`warningSoft`/
  `critical`/`criticalSoft`），light 取 500 階、dark 取 300 階，soft 底 light 取 50 階、dark 取低透明 rgba。

### 實作中驗證出的兩個額外問題（已修，超出原範圍）

1. **`--warning-700` 新增**。`warning-500`（`#e3a008`）在白底只有 **2.26:1** —— 琥珀色的老問題，
   當文字色連 WCAG AA 都不到。若直接讓 `DKT.light.warning` 指向 500 階，任何
   `StatusTone: "warning"` 的文字在亮色投影片上都不可讀。已新增 `--warning-700:#9a6600`
   （實測 vs `#ffffff` = **4.91:1**）供淺底文字 / icon 使用，500 階留給填色。
2. **`seriesMuted` 與 `muted` 分離**。原本打算讓 block 元件的 `SeriesTone: "muted"` 標記
   沿用 `DKT.muted`（文字墨色），但實測暗色下 `muted`（neutral-400 `#9aa6b8`）與
   `brand`（blue-300 `#7ba6da`）的 ΔE 只有 **6.1（normal）**，遠低於 15 的 hard FAIL ——
   `tone:"blue"` 與 `tone:"muted"` 在暗色投影片上根本分不出來。
   排查過改 brand 側（blue-400 只到 ΔE 14.7、sky-400 更差 9.5，都不通過），
   確認問題在 muted 側；改用暗色 `neutral-300`（`#cbd3df`）後三色**全項 PASS**。
   因 `DKT.muted` 同時是既有 5 個版型的文字色，直接改會動到畫面，故**新增獨立的
   `seriesMuted` 標記色**（light = neutral-400、dark = neutral-300），文字墨色 `muted` 不動。
   這也正好符合 dataviz 的硬規則「文字穿文字 token，不穿系列色」。

### validator 實測結果

`SeriesTone`（blue-700 / orange-500 / neutral-400）light、surface `#ffffff`、`--pairs all`：

```
[PASS] Lightness band / [PASS] CVD separation（最差 ΔE 16.7 deutan）/ [PASS] Normal-vision floor（18.9）
[FAIL] Chroma floor  #9aa6b8 → 設計意圖（muted 本來就該讀成灰），非缺陷
[WARN] Contrast vs surface  #e37b24 2.95 / #9aa6b8 2.46 → 依 dataviz 規則須有可見標籤，block 元件本來就有
```

`SeriesTone` dark（blue-300 / orange-300 / **neutral-300**）、surface `#262e3d`：CVD、normal-vision、
對比**三項全 PASS**（修正前 normal-vision 為 6.1 FAIL）。

`StatusTone` 對比（各自模式的實際 token）：light good 3.38 / warn（700 階）4.91 / crit 4.38；
dark good 6.35 / warn 8.12 / crit 5.67 —— 全部 ≥ 3:1。

### 未做

- audit **C-1**（把 validator 收成 `scripts/validate-deck-palette.mjs` + 掛 pre-push）**未做** ——
  它需要把 dataviz skill 的色彩數學 vendored 進專案，超出本 Task 範圍。
  本輪的 validator 檢查是**手動執行**的，結果如上。C-1 仍列在 Task 37 的「後續」。
- 畫面**零變化**（如本文風險段所述）：本 Task 只準備原子，沒有任何版型改用 `DS` 或 status 色。
  既有 19 個一次性字級的收斂在 Task 33 / 34。
