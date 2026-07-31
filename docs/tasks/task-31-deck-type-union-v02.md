# Task 31 — Deck 型別重構：6 版型 discriminated union + Tone 拆分

> 對應 [deck-slide-contract.md](../deck-slide-contract.md) v0.2 §3、§4、§6、§11.1。
> **本 Task 為 32～37 的基礎，先做。**
> 上游決策：契約 §12 已決議 5 項（layout 命名 `custom`、block 砍到 6 個、單檔、IconName 維持 21 個、`section` 加參數）。

## 範圍

- 改寫 [src/lib/decks.ts](../../src/lib/decks.ts)：`Slide` 從「單一 interface + 20 個 optional 欄位」改為 **discriminated union（6 種 layout）**。
- 新增 `SeriesTone` / `StatusTone`（取代舊 `tone: "blue"|"orange"|"muted"` 的單一概念）。
- 新增 `SlideChromeFields`、`Pill`、`LegendItem`、`Footnote`、`Callout`、`CalloutItem`、`AgendaItem`、`IconName`、`CustomSlideProps`。
- **不動** `import.meta.glob` 兩模式合併與 NFC 正規化邏輯（Task 23 成果，維持原樣）。
- 既有 3 份 deck 檔做**最小可編譯處理**（見下方步驟 5），完整內容於 [Task 37](task-37-regenerate-existing-decks.md) 重新生成。

## 關鍵落地規則

1. **layout 收成 6 種**：`cover` / `section` / `custom` / `full-visual` / `quote` / `closing`。
   移除 `bullets`、`media`、`compare`、（v0.1 草案的）`stack`、`freestyle`。
2. **`Tone` 必須拆兩個型別**，不可合併成一個 union —— 這是硬規則，理由是實測數據：
   五色混用時紅↔綠 ΔE 5.4（deutan）、紅↔橘 ΔE 12.8（normal，低於 15 的 hard FAIL）。
   見 [deck-design-audit.md](../deck-design-audit.md) §3.2。
   - `SeriesTone = "blue" | "orange" | "muted"` —— 識別色，只表示「這是 A 還是 B」
   - `StatusTone = "good" | "warning" | "critical"` —— 狀態色，**渲染端必須同時輸出 icon + 文字標籤**
3. **`IconName` 維持 21 個**，並在 TSDoc 寫明治理範圍：只管 `SlideChromeFields` 的欄位與 block props；
   `custom` 頁自己畫時可直接 import lucide-react（契約 §5.4）。
4. **`CustomSlideProps` 三個欄位都要有**：`dark`（取 token 用）、`live`（動畫只在 true 時啟動）、
   `area: {w,h}`（SlideChrome 佔用後剩下的可用區，px @1600×900 座標系）。
5. `Deck` 介面本身不變（`slug`/`title`/`eyebrow`/`generatedAt`/`source`/`slides`）。
6. 全型別標註、無 `any`。

## 型別定義

以契約 §3、§4、§6 的程式碼區塊為**逐字權威**，照抄實作（含 TSDoc 註解與理由）。

## 實作步驟

1. `decks.ts`：新增 §3 共用型別（`SeriesTone` / `StatusTone` / `IconName`）。
2. 新增 §4 chrome 型別（`Pill` / `LegendItem` / `Footnote` / `CalloutItem` / `Callout` / `SlideChromeFields`）。
3. 新增 §6 六個 slide 介面 + `CustomSlideProps` + `AgendaItem` / `RecapItem`，`export type Slide = …` 聯集。
4. 刪除舊 `BulletItem`、舊 `CompareSide`、舊扁平 `Slide`。
5. **既有 3 份 deck 檔降級為可編譯**：把使用退役版型（`bullets` / `media` / `compare`）的頁**暫時移除**
   （deck 頁數變少、`cover`/`section`/`full-visual`/`quote`/`closing` 的頁原樣保留）。
   不要在本 Task 手工改寫成 `custom` —— `custom` 的渲染要到 [Task 35](task-35-custom-slide-frame.md) 才存在。
6. [src/components/deck/SlideFrame.tsx](../../src/components/deck/SlideFrame.tsx) 的
   `LAYOUTS[slide.layout] ?? LAYOUTS.bullets` fallback 改為 `?? LAYOUTS.quote`（`bullets` 已不存在，
   否則 tsc 直接紅燈）。SlideFrame 其餘改動留給 Task 35。
7. [src/components/deck/slideLayouts.tsx](../../src/components/deck/slideLayouts.tsx) 的
   `LAYOUTS` map 移除退役 key，讓 tsc 綠燈即可 —— 版型改寫留給 [Task 33](task-33-slide-chrome-fixed-layouts.md)。

## 驗收

- [x] `SlideLayout` 為 6 種，`Slide` 為 discriminated union，各 layout 只看得到自己該有的欄位
- [x] `SeriesTone` 與 `StatusTone` 為兩個獨立型別，無法互相賦值（型別層擋住混用）
- [x] `CustomSlideProps` 含 `dark` / `live` / `area`
- [x] `deckOf` / `hasDeck` / `allDeckSlugs` 行為與 NFC 正規化不變
- [x] 3 份既有 deck 檔可編譯（頁數暫時變少，Task 37 補回）
- [x] `npx tsc --noEmit && npx astro build` 通過
- [x] `/present/<slug>` 三份 deck 仍可開啟、不白屏（頁數少但不壞）

## 風險 / 備註

- 本 Task 結束時簡報**內容是不完整的**（退役版型的頁被暫時移除），這是預期狀態；
  完整性由 Task 37 收尾。若不接受中間態，可把 31→37 視為一個不可分割的批次一次做完。
- viewer 模式（`npx notecraftapp`）的 `.notecraft/components/*.deck.tsx` 若使用者手上已有舊 deck 檔，
  升級後會編譯失敗。需在 Task 36 的 SKILL / 說明中標註「舊 deck 檔需重新生成」。

---

## 實作記錄（2026-07-30，已完成）

- `Slide` 已改為 discriminated union；版型元件簽章改為泛型 `LayoutProps<S extends Slide>`，
  各元件只看得到自己那個 slide 型別的欄位。新增 `LayoutComponent<K>` 表達這個關係。
- `LAYOUTS` 刻意宣告為 **Partial**（`{ [K in SlideLayout]?: LayoutComponent<K> }`）——
  `custom` 尚未實作。新增 `FALLBACK_LAYOUT`（暫為 `LayoutQuote`），Task 35 改為 `LayoutCustom`。
  `SlideFrame` 的分派點是**全檔唯一的型別 cast**，已加註解說明理由。
- 退役版型**函式本體一併刪除**（不只移除 map key）—— `LayoutCompare` 等依賴已不存在的
  `CompareSide` / `BulletItem`，留著必然編譯失敗。
- 頁數：`role-responsibility-rr` 12→9、`trendlink-…提案草稿` 11→10、`專案-vs-產品` 5→4。
- **額外修正（超出原範圍）**：三份 deck 封面 `meta` 的「N 頁 · 16:9」是硬寫的字串，
  移除頁面後與實際頁數不符且**顯示在畫面上**，已同步為正確頁數。
- **驗證環境注意**：本專案需 Node ^22。預設 shell 的 `node` 是 v16，直接跑 `astro build` 會被拒。
  驗證時需 `export PATH="$HOME/.nvm/versions/node/v22.16.0/bin:$PATH"`。
- **tsc 基準線**：`npx tsc --noEmit` 有 18 個**既有**錯誤（`series.ts` 4、`ToastHost.tsx` 4、
  `notes.ts` 3、`remark-notecraft-notes-assets.ts` 3、`content/config.ts` 3、`dev-api/integration.ts` 1）。
  已用 `git stash` 前後比對確認**與本次改動無關、數量與分佈完全一致**；
  本次改到的 `lib/decks.ts`、`components/deck/`、`components/generated/*.deck.tsx` 為零錯誤。
  `npx astro build` 通過（40 頁）。
- 瀏覽器驗證：三份 deck 的 `/present/<slug>` 皆 200、頁數計數器正確（9 / 4 / 10）、
  無 console 錯誤、亮暗兩主題正常、`full-visual` 的既有 @ai-visualize 元件仍正常掛載。
