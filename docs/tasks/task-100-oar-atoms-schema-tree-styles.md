# Task 100 — 原子元件、欄位樹、`styles.ts`

> 規格 [notecraft-openapi-renderer.md](../notecraft-openapi-renderer.md) §7、§8.3（範例上色、複製）、§8.4；Q6、Q7 定案（§16）。
> 設計交付 README〈Design Tokens〉〈Method 標記〉〈Status〉〈7. 欄位樹〉〈與 ER Diagram 共用〉；對照 `prototype/oa/oa-core.jsx` 下半、`oa-tree.jsx`、`oa.css`。
> 依賴 [Task 99](task-99-oar-scaffold-derive-examples.md)。Task 101–103 都用這裡的元件。

## 為什麼先做這一步

頁面是原子的組合：method 標記、status、型別 chip、程式碼框、欄位樹在 Operation 頁、Schema 頁、embed 卡都會出現。樣式字串的規則（前綴、零 `< > & " '`、token 集中）也要在第一批 CSS 進來時就鎖住。

## 範圍

### 1. `styles.ts`

- 自 `prototype/oa/oa.css` 移植，`oa-`／`erx-` 一律改 `oar-`，**所有規則以 `.oar-root` 起頭**
- `.oar-root` 上定義 `--oar-*`（Q7）：handoff 的 `--wb-oa-*` 全部改名；另加 `--oar-ok-ink`、`--oar-warn-ink`、`--oar-danger-ink` 收 `#1f7350`／`#8a6412`／`#c0392f`（規格 §7 表）。規則中只引用變數
- `rgba(27,79,156,.06／.1)` → `color-mix(in srgb, var(--blue-700) N%, transparent)`；`.oa-tip` 的 `#fff` → `var(--text-on-brand)`
- prototype 的四條 `>` 子選擇器改為具名 class（`.oa-main>div`、`.oa-media-bar>span:first-child`、`.oa-f.dep>.oa-f-l .oa-f-n`、`.oa-f.dep>.oa-f-d`）
- `@media (max-width:1180px)` 改 container query（規格 §9 表；外殼容器 `container: oar / inline-size`，掛在外殼外層）
- 借自 ER 的骨架（`erx-nav*`、`erx-page`、`erx-h`、`erx-colt`、`erx-rel`、`erx-kv`、`erx-tlist`、`erx-empty`…）以 `oar-` 重寫，**數值逐項對照 `plugins/er-diagram-renderer/styles.ts`**（Q6：相同數值、不共用 class）
- `prefers-reduced-motion: reduce` 關閉 caret 旋轉、閃橘底、按下縮放
- `scripts/checks/oar-styles.mjs`（比照 `er-styles.mjs`）：字串不含 `< > & " '`；每條規則以 `.oar-root` 起頭；`--wb-oa-` 0 筆；加進 `check:oar`

### 2. `atoms.tsx`

照 handoff 規格：

- `Method`（`size: 'sm'|'md'|'lg'`；唯讀方法外框、改資料方法填色；導覽 `DELETE` → `DEL` 但 `aria-label` 完整）
- `Status`（2xx／3xx 實心圓、4xx 菱形、5xx 方形、default 空心圓；選中態）
- `PathText`（`{param}` 上色；`interactive` 時 param 是 `<button>`；`<wbr>` 於每個 `/` 後）
- `TypeChip`（`$ref` 藍底＋`ArrowUpRight`，`onRef` 回呼；陣列 `Pet[]`、`map<string, integer>`、`oneOf`／`anyOf`／`allOf` 藍底；外部 ref 顯示原字串、不可點）
- `CopyButton`（clipboard → `execCommand` 退回；「已複製」1.6s；`aria-live="polite"`）
- `CodeBox`（標題列、複製、`<…>` 佔位上色、`pre-wrap`）、`JsonView`（自寫 tokenizer 四色，輸出 React 元素，**不用 `dangerouslySetInnerHTML`**）、`Seg`（分段切換，`role="tablist"`，左右方向鍵）
- `markdown.tsx`：`MdBlock`／`MdInline`，吃 Task 99 的 `markdown-text.ts`；連結走 `safeHref`
- 圖示一律 `lucide-react`（handoff〈Assets〉對照表）

### 3. `schema-tree.tsx`

照 handoff §7 與規格 §8.4：根列、欄位列（各種標記）、說明列（enum 超過 8 個 `+N`、限制 chips）、預設展開規則、深度 3 的「深入」與麵包屑、循環參照標示與 tooltip、`oneOf`／`anyOf` 選項分段、`allOf` 攤平與「來自 X」、`additionalProperties`、無 properties 的 object、nullable（3.0／3.1 兩種寫法）。

- props：`doc`、`schema`、`mode: 'request'|'response'`（兩種模式都顯示 `readOnly`／`writeOnly` 欄位並加標記；只有**範例產生**在 request 略過 `readOnly`，見 Task 99）、`flat?`、`maxDepth?`、`onRef`、`resetSig`
- state 以欄位路徑字串為 key；`resetSig` 變動或 `schema` 參照改變時重設

## 不做

- 頁面組裝（Task 102）、導覽（Task 101）

## 驗收

- [ ] 暫時在 renderer 內放一個「元件展示」區（或用 orders 的 `createOrder` body 直接渲染欄位樹），逐項對照 prototype：method 五色＋other、status 五種記號、`items[].options.gift.card` 出現「深入」、`Category.parent` 停在循環、`Shipping` oneOf 可切換、`customer` allOf 有「來自 CustomerRef」；完成後移除展示區
- [ ] `npm run check:oar`（含 `oar-styles.mjs`）通過
- [ ] dev console 零 hydration warning（範例 JSON、cURL 在 SSR 與 client 一致）
- [ ] `grep -n "dangerouslySetInnerHTML" plugins/openapi-renderer` 0 筆；`npm run check-plugins` 通過（registry 補上新檔）
- [ ] `npx tsc --noEmit && npx astro build` 通過，tsc 錯誤數不增加

## 實作記錄（2026-10-01）

- 選擇器寫法比照 ER：外層 `.oar-root`、內部 `.oar-root .oar-x`；狀態 class 一律帶前綴（`oar-on`／`oar-open`／`oar-dep`／`oar-done`…），不用 prototype 的裸 `on`／`open`，免得撞到 app 的 CSS
- prototype 的四條 `>` 子選擇器：`.oa-main>div` → `.oar-main-col`；`.oa-media-bar>span:first-child` → `.oar-media-l`；`.oa-f.dep>…` 兩條 → 欄位自己的名稱與說明加 `oar-f-own`（刪除線只套在本欄位、不往子層傳）
- 欄位樹的 caret 改名 `oar-fcaret`，避免與導覽的 `oar-caret` 同名不同尺寸
- `oar-styles.mjs` 改為小型括號解析器逐一檢查選擇器（ER 的逐行檢查擋不了多行的 token 區塊），另檢查 `--wb-oa-` 殘留與規則內的色碼字面值（只允許在 `.oar-root` 的 `--oar-*` 定義）
- `LinkCtx`：型別 chip 等連結在 page 模式攔下點擊走元件內路由，embed 沒有 `go`、讓瀏覽器直接導到文件頁 —— 同一組元件兩種模式共用
- 未做「元件展示區」：Task 101–103 直接以完整頁面對照 prototype 驗收（見 Task 104 的手動驗證）
- `check:oar`（含 styles）、`check-plugins --skip-build` 通過；`dangerouslySetInnerHTML` 0 筆；plugin 無 tsc 錯誤
