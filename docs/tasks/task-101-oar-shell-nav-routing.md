# Task 101 — 外殼、bar、導覽、hash 路由、鍵盤、捲動同步

> 規格 [notecraft-openapi-renderer.md](../notecraft-openapi-renderer.md) §2.2、§6、§8.1–§8.2、§10。
> 設計交付 README〈0. 版面〉〈1. Plugin bar〉〈2. 導覽〉〈Interactions & Behavior〉〈State Management〉；對照 `prototype/oa/oa-app.jsx` 的 `OaDocsInner`、`oa-pages.jsx` 的 `OaNav`。
> 前例：[Task 80](task-80-er-shell-nav-routing.md)（ER 的 sticky 外殼、量捲動祖先、Esc 共存）。
> 依賴 [Task 100](task-100-oar-atoms-schema-tree-styles.md)。Task 102 的頁面掛在這裡的 `<Main>` 底下。

## 為什麼這一步要單獨做

page 模式的殼要和工作台的捲動容器（`#nc-scroll`）、Esc 堆疊、hydration 規則三方和平共處——這三件事 ER 都踩過，照抄做法、一次驗完，頁面 Task 才不會反覆動殼。

## 範圍

### 1. `renderer.tsx`：外殼與 state

- `mode === 'page'` → `<DocsShell>`；`'embed'` 先放佔位（Task 103）
- state 照 handoff〈State Management〉；`route` 型別 `{ kind: 'overview' } | { kind: 'tag'; key } | { kind: 'op'; key; tag?; sub? } | { kind: 'schema'; key }`
- 外殼外層容器 `container: oar / inline-size`；外殼不畫外框與圓角；page 模式 `min-height` 撐滿捲動祖先的可視高度（同 ER §17）
- 極小模式（`derived.tiny`）：不渲染導覽、內容置中 `max-width: 880px`、bar 左側換成「← 總覽」

### 2. Hash 路由（規格 §6.2）

- `routeToHash`／`hashToRoute` 放 `derive.ts` 或獨立的純函式檔（只 `import type`），並在 `oar-derive.mjs` 補斷言：`#tag/x`、`#op/createOrder`、`#op/get/pet/{petId}`、`#op/x/responses/409`、`#schema/Order`、中文與 `{}` 的編解碼、無效 hash → overview
- **SSR 與首次 render 一律 overview**；`useEffect` 掛載後讀 `location.hash` 並 `setRoute`；監聽 `hashchange`
- route 變動 → `history.replaceState(null, "", pathname + search + hash)`；篩選不進 hash
- embed 模式不讀不寫 hash

### 3. bar

位置字串、Esc toast（`role="status"`，1.4s）、右側 OAS 版本或 3.2 警示膠囊。bar `position: sticky; top: 0`。

### 4. `nav.tsx`

照 handoff §2：篩選框（`/` 鍵帽、命中數）、method chips（只列出現的 method）、總覽、OPERATIONS（tag → op 列、共同前綴、截斷 path、deprecated、選中 op 的區段錨點）、SCHEMAS、無結果文案、底部提示。

- 收合規則：tag ≤ 6 全開；> 6 只開目前 tag；篩選中命中 tag 強制展開、caret disabled、未命中隱藏
- **未展開的 tag 不 render 子列**（252 op 的首次 render 成本）
- summary：`options.navSummary`（預設 `'hover'`）；`(hover: none)` 時強制 `'line'`；hover 卡 `position: fixed`，捲動／resize 時關閉
- 選中項捲入：只捲導覽自己的捲動區（`navScroll.scrollTo`），不用 `scrollIntoView`
- sticky：`top: 44px`；`max-height: calc(var(--oar-scroll-h) - 44px)`，`--oar-scroll-h` 由 ResizeObserver 量最近的 `overflow-y: auto|scroll` 祖先寫入（不以 id 查 `#nc-scroll`）
- a11y：`<nav aria-label="API 導覽">`、caret `aria-expanded`、`aria-current="page"`

### 5. 鍵盤（規格 §10）

- 只在 page 模式掛 `keydown`
- `/`：焦點不在 input／textarea／select／`[contenteditable]` → 開導覽並聚焦篩選框、`preventDefault`
- Esc：`defaultPrevented` 就跳過；照 handoff 四層，**實際有東西可退時才 `preventDefault`**；第三層遞增 `collapseSig`

### 6. 捲動同步（規格 §6.4）

- 監聽捲動祖先的 `scroll`（`requestAnimationFrame` 節流），基準是 bar 底緣；捲到底取最後一個區段
- 點錨點 → `scrollIntoView({ block: 'start' })`，區段 `scroll-margin-top: 56px`
- 換頁：外殼頂端已捲出視野才 `shell.scrollIntoView({ block: 'start' })`

## 不做

- 頁面內容（Task 102 先用標題佔位）；embed（Task 103）；覆蓋式導覽與窄版（Task 104）

## 驗收

- [ ] 三份 example 與產生器輸出的極大 spec（本機、不進版控）：導覽收合規則、篩選命中數、method 複選、無結果文案
- [ ] 開 `/view/…/orders.openapi#op/createOrder` reload：一幀後切到該 op、導覽展開並捲入；dev console 零 hydration warning
- [ ] 點導覽 → 網址 hash 更新但「上一頁」不會逐頁倒退（`replaceState`）
- [ ] ⌘K 開 Palette 時按 Esc 只關 Palette，plugin 的篩選不被清掉
- [ ] 長頁捲動時 bar 與導覽 sticky、導覽自己捲、區段高亮跟著走
- [ ] health（極小）不顯示導覽、bar 有「← 總覽」
- [ ] `npm run check:oar`、`npm run check-plugins` 通過；`npx tsc --noEmit && npx astro build` 通過，tsc 錯誤數不增加

## 實作記錄（2026-10-01）

- Esc 改為 `setTimeout(0)` 後看 `defaultPrevented` 再處理（規格 §17）：工作台 `wb-escape` 也掛在 window，晚一拍才能確定 Palette／Drawer 是否已處理；在 plugin 外的輸入框打字時的 Esc 不處理
- `/` 只在非 tiny 文件、焦點不在輸入元件時處理
- hash 寫回以 `ready` 旗標擋住首次 render（先讀完 hash 才寫，免得把網址上的 hash 清掉）
- 導覽 path 截斷改為有前綴 19／無前綴 21 字元（handoff 24／26 在實際字型下仍會被 ellipsis 切）
- 實測：hash 冷載入一幀後切頁、零 hydration 警告；⌘K 開著按 Esc 只關 Palette；四層 Esc 依序生效；極大 spec 只 render 目前 tag 的 11 列
