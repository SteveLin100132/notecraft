---
Project Name: NoteCraft Workbench — 筆記頁籤（多筆記同時開啟）
文件類型: Design Document
文件版本: v1.0.0
開發模式: Waterfall
技術選型: 確定（沿用既有技術棧，不新增套件；icon 用既有 lucide-react）
文件狀態: 已實作（notecraftapp v1.7.0，Task 105–108，2026-10-01）—— §15 的 5 題已於 2026-10-01 逐題確認（紀錄見 §16）；實作後回填見 §17
文件作者: 建宇
建立日期: 2026-10-01
更新日期: 2026-10-01
依賴文件: docs/notecraft-workbench.md（§4 殼、§4.5 z-index／Escape、§5.3 wb-index 延遲載入、§8.2.1 列的 DOM 規則、§8.3 筆記頁）、docs/notecraft-npx-viewer-v2.md、docs/prototype/design_handoff_note_tabs/README.md
分支: feat/note-tabs
---

# NoteCraft Workbench — 筆記頁籤設計文件

在工作台主區最上方、Header 之上加一條 34px 的**頁籤列**，類似 VS Code 的編輯器頁籤。讀者可以同時「開著」多篇筆記（`/notes/<slug>`）與資料檔渲染頁（`/view/<routePath>`），在頁籤之間切換，不必回列表或 Sidebar 重找；切回某個頁籤時還原上次的捲動位置。

> 視覺與互動的**像素級規格**以 [design_handoff_note_tabs/README.md](prototype/design_handoff_note_tabs/README.md) 與 `prototype/wb/pt-tabs.jsx`、`pt-tabs.css`、`pt-app.jsx`（整合部分）為準，本文不重抄。
> 本文負責 handoff 沒有回答的事：頁籤的標題要從哪裡來（筆記索引是延遲載入的，頁籤列卻每頁都要畫，§4.3）；頁籤 island 比 ToastHost 早掛載，提示會被吞掉（§6.6）；npx viewer 換工作區時 localStorage 共用，會把另一個工作區的頁籤當成失效清掉（§11）；以及頁籤元素的 DOM 要符合「列的 DOM 規則」（§6.2）。
> **與設計稿不同之處一律以本文為準**，全部列在 §1.3。

---

## 1. 這份文件要解決什麼

### 1.1 起點

Handoff 是 v1.0.0 工作台 prototype 的延伸，頁籤相關原始碼只有三處：`pt-tabs.jsx`（store、列、選單、下拉、手機抽屜）、`pt-tabs.css`（`.nt-*`）、`pt-app.jsx`（`activeKey` 推導、`ensure`、捲動記錄、快捷鍵、⌘K 分區）。殼的其他檔案未修改。讀過 codebase 之後，README 有這幾類落差沒處理：

| 落差 | 說明 |
| :-- | :-- |
| **標題來源** | README 規定標題、路徑**不存 localStorage**，渲染時從「build 產生的索引」解析。prototype 的索引是全域同步變數（`window.noteBySlug`），codebase 的索引是 **77 KB 的 `/wb-index.json`，延遲載入**（workbench §5.3：不 inline 進每一頁）。照字面做，每一頁的頁籤列都要等 fetch 回來才有字 |
| **目前頁面的身分** | prototype 用 `useState(route)` 知道目前是哪篇；codebase 是 MPA，從網址反推要處理 CJK slug 的百分比編碼與尾斜線。layout 其實在 SSR 時就知道 |
| **頁籤的 DOM** | prototype 是 `<div role="tab">` 內含 `<button class="nt-x">`：按鈕包在 tab 裡（tab 的子元素在無障礙樹上是 presentational，✕ 對螢幕閱讀器消失），且整個頁籤不是連結，少了 ⌘／Ctrl＋點擊開新分頁、複製連結這些網頁原生行為。workbench §8.2.1 定過同一類問題 |
| **Toast 時序** | 頁籤 island 必須 `client:load`（SSR 佔位、hydrate 後零位移），`ToastHost` 是 `client:idle`。「已達 20 個上限」「筆記已不存在」都發生在頁面剛載入時，發出 `nc-toast` 事件時沒人在聽 |
| **捲動還原 vs. hash** | 筆記頁的標題錨點（`#heading`）、OpenAPI plugin page 模式的 `#op/…`／`#schema/…` 都靠 hash 決定位置。README 只說「hydrate 後設 `scrollTop`」，會蓋掉 hash 的定位 |
| **bfcache** | 瀏覽器上一頁／下一頁從 bfcache 還原時 island 不會重跑，頁籤列停在離開時的樣子，期間新開的頁籤看不到 |
| **npx viewer** | 不同工作區用同一個 origin 時共用 localStorage。工作區 B 解析不到工作區 A 的筆記 → 依 README 的失效規則，A 的頁籤會被整批關掉並跳 toast |
| **既有規則** | `workbench.css` 規則零色碼（handoff 的 hover `rgba(27,79,156,.04)` 沒有對應 token）；localStorage key 命名慣例是 `nc-…-v1`（handoff 是 `nc.tabs.v1`）；浮層 Escape 走 `wb-escape` 堆疊；`id="nc-scroll"` 不可拿掉 |

### 1.2 目標

1. 桌面版頁籤列、溢出、右鍵選單、全部頁籤下拉、拖曳排序、平板、手機計數鈕與底部抽屜，照 handoff 還原（§6、§9）
2. 頁籤的狀態運算（新增、聚焦、關閉、固定、移動、LRU 淘汰、關閉後的鄰居、重開）抽成 **純函式** `src/lib/wb-tabs.ts`，用 `scripts/checks/wb-tabs.mjs` 斷言鎖住（§4.2）
3. SSR 輸出 34px 空列佔位，hydrate 前後**零位移**；頁籤列在第一個 frame 就畫出標題，不等 `/wb-index.json`（§4.3、§5）
4. 捲動還原不和 hash 定位、bfcache、多個瀏覽器分頁打架（§7）
5. ⌘K Palette 加「已開啟的頁籤」分區；刪除筆記時一併關閉頁籤（§8）
6. 殼（Rail／Sidebar／Header／Toolbar／Body）的既有規則與各頁 island **不動**；Present 頁（`PresentLayout`）不顯示頁籤列

### 1.3 非目標與刻意的偏離

| 項目 | 決定 | 為什麼 |
| :-- | :-- | :-- |
| 標題存不存 localStorage | **存一份顯示用快照**（`title`／`path`／`pending`），每次解析到新值就覆寫；`/wb-index.json` 在 idle 時載入，用來校正與清除失效頁籤（Q1） | README「不存標題」是為了防改名後顯示舊名；快照會被目前頁面的 SSR 值與 idle 載入的索引覆寫，舊名最多停留一次換頁。不存的話每頁頁籤列都要空白一段時間 |
| 目前頁面的身分 | **由頁面傳給 layout**（新 prop `tab`），不從網址反推 | layout 在 SSR 已知 slug／routePath、標題與路徑；省掉百分比編碼、尾斜線的解析 |
| 頁籤 DOM | 容器 `.nt-tab`（無 role）內並排 **`<a class="nt-tab-main" role="tab" href>`** 與 `<button class="nt-x">`（Q2） | workbench §8.2.1：連結不包在按鈕裡、按鈕不包在 tab 裡；`<a>` 保住 ⌘／Ctrl＋點擊、複製連結 |
| 中鍵 | 照 handoff **關閉頁籤**（`mousedown` button 1 先 `preventDefault` 擋自動捲動，`auxclick` 關閉） | VS Code 慣例；要開新分頁請用 ⌘／Ctrl＋點擊或右鍵選單「在新視窗開啟」 |
| localStorage key | `nc-tabs-v1`（不是 `nc.tabs.v1`），**依工作區分開**（Q5） | 與 `nc-workbench-prefs-v1`、`nc-reading-progress-v1` 同一命名；分工作區見 §11 |
| 資料檔的識別碼 | `view:<routePath>` | 與系列章節的識別碼相同（CLAUDE.md「系列」），一眼看得出是同一個東西 |
| 「上一個 active 頁籤」 | **`at` 最大者**，不另存欄位 | README 說 active 由網址推導、不存；新頁面載入時，`at` 最大的就是剛離開的頁籤 |
| hover 底色 | 新增 token `--wb-a-blue-04` | 規則零色碼 |
| 預覽頁籤（斜體暫時頁籤） | 照 handoff **不做** | 單擊列已經是 Drawer 預覽 |
| 頁籤狀態小點 | 照 handoff 預設 **不做**（Q3 一併確認）；資訊放 `title` tooltip | Tweaks 的 `ai`／`read` 兩種模式不移植，`.nt-dot` 規則不移植 |
| 深色模式 | **不做** | 與 Dashboard §1.3、Calendar §1.3 同一決定 |
| Prototype 的 `?tabsDemo=` 與 Tweaks | **不移植** | 示範用 |

---

## 2. 現況盤點：哪些留、哪些改、哪些新增

| 檔案 | 處置 |
| :-- | :-- |
| `src/lib/wb-tabs.ts` | **新增**：純函式與型別（§4.2）；只能 `import type`、無 JSX、不碰 `window`／`localStorage` |
| `scripts/checks/wb-tabs.mjs` | **新增**：斷言；`package.json` 的 `check:wb` 串上它 |
| `src/lib/wb-tabs-store.ts` | **新增**：localStorage 讀寫、`storage` 事件、跨 island 的訂閱（client only）。`DeleteNoteButton`、`Palette` 也從這裡讀寫 |
| `src/components/wb/tabs/TabBar.tsx` | **新增**：island 入口（`client:load`）。桌面渲染列，手機渲染計數鈕；掛快捷鍵、捲動記錄／還原、idle 校正 |
| `src/components/wb/tabs/TabStrip.tsx`、`TabMenu.tsx`、`TabAll.tsx`、`TabSheet.tsx` | **新增**：對應 prototype 的 `PtTabStrip`／`PtTabMenu`／`PtTabAll`／`PtTabSheet`（`PtTabCount` 併入 `TabBar`） |
| `src/layouts/WorkbenchLayout.astro` | **改**：新 prop `tab?: TabSelf`；`.wb-main` 第一個子元素輸出 `.nt-bar` 佔位與 `<TabBar client:load self={tab} workspace={…} />`；`.wb-mburger` 旁加手機計數鈕佔位（§5） |
| `src/pages/notes/[...slug].astro`、`src/pages/view/[...path].astro` | **改**：傳 `tab={{ kind, id, title, path, pending }}` 給 layout |
| `src/components/wb/Palette.tsx` | **改**：最上方加「已開啟的頁籤」分區（§8.1） |
| `src/components/islands/DeleteNoteButton.tsx` | **改**：`location.replace` 前同步關閉 `note:<slug>` 頁籤（§8.2） |
| `src/components/islands/ToastHost.tsx` | **改**：掛載前收到的提示不遺失（§6.6） |
| `src/styles/workbench.css` | **改**：`:root` 加 `--wb-a-blue-04`；追加 `.nt-*` 規則；平板 `.wb-mburger` 改 `top:43px`；手機 `.wb-hd-top` 加右側讓位（§9、§10） |
| 其他頁面與 island | **不動**。Dashboard、`/notes`、系列、標籤、Plugin、設定只是「頁籤列一律顯示、無 active」，不需要改它們 |
| `src/layouts/PresentLayout.astro` | **不動**：簡報頁本來就不用 WorkbenchLayout，自然沒有頁籤列 |

---

## 3. 架構

### 3.1 殼

```
.wb-main
├── .nt-bar（34px，SSR 空佔位；≤860 隱藏）     ← 新增，第一個子元素
│     └── <astro-island>（display:contents）TabBar
├── .wb-mburger（≤1100 顯示；平板 top 9 → 43）
├── .nt-count（≤860 顯示；absolute top 9 right 12） ← 新增，由 TabBar 用 portal 填入
├── Header / Toolbar / #nc-scroll.wb-body（不動；bare 頁由 island 輸出）
```

- 頁籤列在 layout 層輸出，**不管 `bare` 與否都在**。`bare` 頁的 island 從 Header 開始畫，不需要知道頁籤列存在
- `.wb-main` 已是 `flex-direction:column`，`#nc-scroll` 是 `flex:1; min-height:0`，多一條 `flex:0 0 34px` 的列不影響「整頁不捲動」
- 簡報頁走 `PresentLayout`，不受影響

### 3.2 一個 island 管全部

頁籤列、全部下拉、右鍵選單、手機計數鈕與抽屜，共用同一份 store state，因此是**同一個 island**（與 workbench §4.3「同一份 state 的頁面由同一個 island 渲染」同理）。手機計數鈕位置在 Header 區，用 `createPortal` 渲染進 layout 預留的 `.nt-count` 佔位元素，不另開 island。

Palette 與 `DeleteNoteButton` 是別的 island，透過 `wb-tabs-store.ts` 讀寫同一份 localStorage，並以模組內的 `subscribe()` 通知 TabBar 重畫（同一頁的 ES module 是單例，與 `wb-escape.ts` 同一招）。

---

## 4. 資料層

### 4.1 型別

```ts
// src/lib/wb-tabs.ts
export type TabKind = "note" | "view";

export interface TabEntry {
  kind: TabKind;
  /** note：slug（entry.id）；view：routePath（不含 view: 前綴） */
  id: string;
  /** `${kind}:${id}` —— view 的 key 剛好等於系列章節識別碼 */
  key: string;
  pinned: boolean;
  /** 上次 #nc-scroll 的 scrollTop */
  scroll: number;
  /** 最後聚焦時間（ms）；LRU 與「上一個 active」都用它 */
  at: number;
  /** 顯示用快照（§4.3）。可能過期；解析到新值就覆寫 */
  title: string;
  path: string;
  /** 待生成 AI 標記數；資料檔恆為 0 */
  pending: number;
}

export interface TabStore {
  v: 1;
  tabs: TabEntry[];
  /** 最近關閉，新的在前，最多 10 */
  closed: TabEntry[];
}

/** 頁面透過 layout 傳給 TabBar 的「目前頁面」 */
export interface TabSelf {
  kind: TabKind;
  id: string;
  title: string;
  path: string;
  pending: number;
}
```

### 4.2 純函式與斷言

全部回傳新的 `TabStore`（不改傳入值），`now` 由呼叫端傳入：

| 函式 | 行為 |
| :-- | :-- |
| `ensure(store, self, now)` | 已有同 key → 更新 `at` 與快照；否則插在 `at` 最大者右側（沒有則最後），再 `normalize`；未固定頁籤超過 20 → 淘汰 `at` 最舊的未固定、非本次新增者，推入 `closed`。回傳 `{ store, evicted: TabEntry | null }` |
| `close(store, keys)` | 移除非固定者並推入 `closed`（新的在前、截 10、同 key 去重）。固定頁籤略過 |
| `closeOthers` ／ `closeRight` ／ `closeAll` | 包裝 `close`，固定頁籤不計 |
| `togglePin(store, key)` | 切換後 `normalize` |
| `move(store, from, to)` | 只在同區（固定／一般）內移動；跨區回傳原值 |
| `normalize(store)` | 固定區排最前，各區內相對順序不變 |
| `neighborAfterClose(store, key)` | 右鄰，否則左鄰，否則 `null`（呼叫端導向 `/notes`） |
| `popClosed(store, exists)` | 取出第一筆 `exists(key)` 為真、且目前不在 `tabs` 的項目 |
| `prune(store, exists)` | 移除解析不到的頁籤，回傳 `{ store, removed: TabEntry[] }` |
| `cycle(store, activeKey, dir)` | 下一個／上一個（循環）；`activeKey` 為 `null` 時回傳 `at` 最大者 |
| `parseStore(raw)` | 容錯：JSON 壞、版本不符、欄位缺 → 回傳空 store，不 throw |
| `hrefOf(entry)` | `note` → `/notes/<slug>`、`view` → `/view/<routePath>`（`wb-routes.ts` 目前只有資料夾連結，沒有單篇的 href 函式，所以寫在這裡） |

`scripts/checks/wb-tabs.mjs` 至少鎖住：插入位置、固定區不可跨移、第 21 個淘汰的是誰（不淘汰固定、不淘汰剛新增）、`closed` 上限與去重、關閉 active 的鄰居、`popClosed` 跳過已開與不存在、`parseStore` 對壞資料回空。

### 4.3 標題從哪裡來（Q1）

三個來源，**後到的覆寫先到的**：

1. **localStorage 快照**：hydrate 當下就有，頁籤列第一個 frame 就畫得出標題
2. **目前頁面的 SSR 值**（`TabSelf`）：`ensure` 時寫回快照，目前這篇永遠是最新的
3. **`/wb-index.json`**：TabBar 在 `requestIdleCallback`（無則 `setTimeout 300`）呼叫既有的 `loadWbIndex()`（與 Palette 共用同一個模組層 Promise，同一頁只抓一次）。拿到後：用索引的 `title`／`path`／`markerCounts().pending` 覆寫每個頁籤的快照，並 `prune` 掉解析不到的

索引載入失敗（離線、404）時**不 prune**，只用快照，避免網路問題把頁籤全關掉。

> 為什麼不照 README 完全不存：每次換頁頁籤列都會空白一段時間（fetch + parse 77 KB），然後一次跳出所有標題，等於每頁都閃一次。快照的代價是改名後的舊標題最多停留到下一次 idle 校正。

### 4.4 store 的讀寫（`wb-tabs-store.ts`）

- 每個操作都是**讀最新 localStorage → 純函式 → 寫回**，不拿 React state 當來源。兩個瀏覽器分頁同時操作時，誤差只在「同一毫秒內各自寫入」，不會整份覆蓋掉對方較早的變更
- 監聽 `storage` 事件，其他分頁寫入後重畫（README 寫明 prototype 未實作）
- `localStorage` 不可用（隱私模式、配額滿）時，一律退回記憶體內的空 store；頁籤列顯示空狀態，不 throw
- 寫入配額錯誤時靜默略過（快照 + 20 個頁籤，量級是數 KB）

---

## 5. SSR 與 hydration

| 區塊 | SSR | hydrate 後 |
| :-- | :-- | :-- |
| `.nt-bar` | 空的 34px 列（底色、底線照規格），`data-pagefind-ignore` | TabBar 讀 store、`ensure(self)`、畫頁籤 |
| 手機 `.nt-count` | 32×32 空鈕（外框照規格、無數字） | portal 填入數字 |
| 目前頁面的 active 樣式 | 無 | 由 `self.key` 決定 |

- TabBar 是 `client:load`。layout 的 `<astro-island>` 已有 `.wb-main>astro-island{display:contents}` 規則，佔位的 `.nt-bar` 由 island 自己輸出、SSR 時就是空列，高度一致
- 空狀態（沒有任何頁籤）也是 34px，與佔位同高（README §5 的理由）
- `self` 經 island props inline：只有一篇的標題與路徑，量可忽略；**`path` 是相對 notesDir 的真實路徑**，不含本機絕對路徑（`assertNoAbsolutePath` 不受影響）

---

## 6. 各區塊：handoff 沒講、或與 codebase 有出入的部分

### 6.1 頁籤列 `.nt-bar`

照 README §1。差異：

- 把 active 捲進可視區時照 README **不用 `scrollIntoView`**（會連帶捲動 `.wb-main` 的祖先）
- 滾輪 `deltaY` 轉水平：只在列有溢出時 `preventDefault`，否則讓事件照常冒泡

### 6.2 單一頁籤（Q2）

```html
<div class="nt-tab on" data-key="note:a/b">        <!-- 容器：樣式、拖曳、右鍵 -->
  <a class="nt-tab-main" role="tab" aria-selected="true" tabindex="0"
     href="/notes/a/b" title="標題&#10;a/b.mdx&#10;待生成 AI 標記 2">
    <svg …/> <span class="nt-t">標題</span>
  </a>
  <button class="nt-x" tabindex="-1" aria-label="關閉 標題">…</button>
</div>
```

- 一般單擊：`<a>` 的原生導覽（不攔截）。點目前頁面的頁籤：`preventDefault`，不重載
- ⌘／Ctrl＋單擊、右鍵選單「在新視窗開啟」：原生行為 ／ `window.open(href, "_blank", "noopener")`
- 中鍵：`mousedown` button 1 `preventDefault`（擋自動捲動與原生開新分頁）、`auxclick` 關閉
- 拖曳的 `draggable` 掛在容器上；`<a>` 設 `draggable={false}`，避免瀏覽器把連結當 URL 拖走
- `.nt-tab-main` 吃滿容器剩餘寬度（`flex:1; min-width:0`），樣式數值全照 README 寫在 `.nt-tab` 上；README 的 `focus-visible` 樣式改掛 `.nt-tab:has(.nt-tab-main:focus-visible)`
- 固定頁籤：✕ 換成圖釘 `<span aria-hidden>`；`<a>` 的 `aria-label` 補「（已固定）」

### 6.3 全部頁籤下拉、右鍵選單

照 README §2、§3。差異：

- 開啟時 `pushEscape(close)`，**不**自己掛 Escape；README「點外部、外部右鍵皆關閉」用 prototype 的 scrim 做法
- 選單的 `role="menu"`／`menuitem`、上下鍵移動、開啟時焦點落在第一個可用項、關閉後焦點回到觸發的頁籤
- 右鍵選單的「複製連結」用 `navigator.clipboard.writeText`；失敗時 toast「無法複製連結」
- z-index：選單與下拉用 `--wb-z-overlay`（1000），與 Palette 同層；兩者不會同時開（開 Palette 時先關選單）

### 6.4 非筆記頁

頁籤列照常顯示，沒有 active，所有頁籤 `aria-selected="false"`；roving tabindex 落在第一個頁籤。這些頁面不呼叫 `ensure`（layout 沒收到 `tab`）。

### 6.5 關閉與導覽

| 情境 | 行為 |
| :-- | :-- |
| 關閉非 active | 只改 store，不導覽 |
| 關閉 active | `neighborAfterClose` → `location.assign(href)`；沒有鄰居 → `/notes` |
| 「關閉其他」 | 在 active 上執行：不導覽；在非 active 上執行：導覽到該頁籤 |
| 「關閉右側」「全部關閉」關到 active | 同「關閉 active」 |
| `⌥⇧T` | `popClosed` → 加回（保留原 `scroll`）→ 導覽 |

導覽用 `assign`（會產生歷史紀錄）——切頁籤是使用者明確的換頁，上一頁應該回得去。

### 6.6 Toast 時序

`ToastHost` 改成：模組層提供 `toast(msg, icon)`；host 掛載前呼叫的先排進佇列，host 掛載後一次送出。既有的 `nc-toast` 事件與 `nc-toast-next`（sessionStorage）都保留不動。TabBar 的「已達 20 個頁籤上限…」「筆記已不存在…」走新的 `toast()`。

> 也可以把 ToastHost 改 `client:load`，但那會讓每一頁多一個提前 hydrate 的 island，只為了頁籤這兩個情境，不划算。

---

## 7. 捲動記錄與還原

### 7.1 記錄

- 目標容器：`#nc-scroll`（筆記頁、資料檔頁都由 layout 輸出，hydrate 時一定存在）
- `scroll` 事件 debounce 220ms → `setScroll(self.key, y)`；`pagehide` 時補寫一次
- 只在目前頁面是頁籤時記錄（非筆記頁沒有 `self`）

### 7.2 還原的條件

| 條件 | 是否還原 |
| :-- | :-- |
| 網址有 hash（標題錨點、OpenAPI `#op/…`） | **不還原**，hash 優先 |
| `pageshow` 的 `persisted` 為真（bfcache） | **不還原**（瀏覽器已保留原狀），但**重讀 store 重畫頁籤列** |
| `performance.getEntriesByType("navigation")[0].type === "reload"` | 還原（瀏覽器對內層容器不會自己還原） |
| 其他（點頁籤、從列表開已存在的頁籤、上一頁但非 bfcache） | 還原（Q4） |
| 新開的頁籤 | `scroll` 是 0，等於不動 |

### 7.3 還原的時機

照 README：hydrate 後設一次、下一個 `requestAnimationFrame` 再設一次。另外：

- 若當時 `scrollHeight` 不夠（`client:visible` 的生成元件、圖片還沒撐開），在 `load` 事件後再設一次，之後不再追
- 使用者在還原完成前已經自己捲動（`wheel`／`touchstart`／`keydown`），取消後續的補設，不搶回位置

---

## 8. 與既有功能的銜接

### 8.1 ⌘K Palette

- 最上方新增分區「已開啟的頁籤」：讀 store 快照（不等 wb-index），規則照 README（無查詢 6 筆、有查詢 4 筆比對標題＋路徑；「目前」pill、「已固定」muted pill、資料檔金色 icon）
- 其後的分區照舊（筆記／系列／標籤／資料檔／內文）；**頁籤結果與「筆記」分區重複的不去重**——兩者語意不同（一個是「切回去」、一個是「找」），去重會讓筆記分區少一筆、看起來像漏了
- 「目前」的判斷：Palette 不知道目前頁面，由 TabBar 把 `self.key` 寫進 `wb-tabs-store.ts` 的模組變數

### 8.2 刪除筆記（dev-only）

`DeleteNoteButton` 在 `location.replace("/notes")` **之前**同步呼叫 store 的 `close(["note:" + slug])`。不走 §6.5 的「導覽到鄰居」——刪除後回列表是既有行為，toast「已刪除筆記」照舊。這樣下一頁的 idle 校正不會再對同一篇跳「筆記已不存在」。

### 8.3 開啟入口

所有入口（列表雙擊、列上「開啟」、Drawer「開啟筆記」、Sidebar、Palette、Dashboard、資料檔列、筆記內連結、⌘／Ctrl＋點擊開的新分頁）**都不用改**：目標頁面載入後由 TabBar `ensure(self)`。

### 8.4 閱讀進度

不互動。開啟筆記自動轉「閱讀中」是 `ReadingControl` 的既有行為；頁籤不顯示閱讀狀態（§1.3 狀態小點）。

---

## 9. 響應式

照 README §6、§7。補充：

- `.nt-bar` 在 `≤860` `display:none`；`.nt-count` 只在 `≤860` 顯示
- 平板 `.wb-mburger{top:43px}` 寫在既有 `@media(min-width:861px) and (max-width:1100px)` 區塊
- 手機 `.wb-hd-top{padding-right:54px}` 寫在既有 `@media(max-width:860px)` 區塊。`bare` 頁由 island 渲染的 `WbHeader` 用同一個 class，一起生效
- 手機抽屜 z-index：README 要求蓋過底部 Tab bar（650），用 `--wb-z-drawer-scrim`／`--wb-z-drawer` 會被 Tab bar 蓋住 → 用 `--wb-z-overlay`（1000）。開啟時 `pushEscape`
- 拖曳：`matchMedia("(pointer:fine)")` 才 `draggable`，與 Board 規則一致；手機抽屜不提供排序
- `.nt-x` 在 `@media (pointer:coarse)` 常駐（README）

---

## 10. 樣式與 token

- class 沿用 handoff 的 `nt-` 前綴（實作會拿 prototype 對照，不改名）；新增的只有 `.nt-tab-main`（§6.2）
- 規則追加在 `workbench.css` 的 Calendar 區塊之後、860px 媒體規則之前
- 新增 token：`--wb-a-blue-04: rgba(27,79,156,.04)`（頁籤 hover 底），放在既有半透明色那段
- 其餘顏色全部對得到既有 token（`--wb-blue`／`--wb-blue-l`／`--wb-gold`／`--wb-bg`／`--wb-panel`／`--wb-line`／`--wb-line-2`／`--wb-ink`／`--wb-ink-2`／`--wb-ink-3`／`--wb-a-blue-06`／`-07`／`-08`／`-10`／`--wb-a-ink-08`／`-18`／`--wb-a-shade-18`／`--wb-a-scrim-44`）
- 漸層遮罩 `linear-gradient(90deg, var(--wb-bg), transparent)`
- 鍵帽 `font-family: var(--font-mono)`
- `prefers-reduced-motion`：選單 fade、遮罩 transition、抽屜進場全部關閉，接在既有的 reduced-motion 規則
- icon 用 lucide-react：`FileText`（與 Palette、列一致，不用 prototype 自畫的 doc）、`X`、`Pin`、`ChevronDown`、`Link`、`ExternalLink`、`Undo2`、`Search`

---

## 11. npx viewer 相容性（Q5）

viewer 在不同工作區可能用同一個 origin（相同埠），localStorage 共用：

- 收藏、閱讀進度這些既有 key 也共用，但它們「多出來的鍵」無害
- 頁籤不同：工作區 B 的 idle 校正會把 A 的頁籤全部 `prune` 掉，切回 A 時頁籤已經沒了

決定：key 帶工作區 → `nc-tabs-v1:<workspaceLabel>`。`workspaceLabel` 已在 layout 的 `getWorkbenchIndex()` 裡（不含本機絕對路徑），由 layout 傳給 TabBar。兩個工作區同名時仍會共用，接受（與其他 key 的現況一樣）。

Netlify 正式站只有一個工作區，等於固定一個 key。

---

## 12. 無障礙與鍵盤

### 12.1 頁籤列

照 README「無障礙」節：`role="tablist"`、`aria-label="已開啟的頁籤"`、roving tabindex、`←/→`（循環）、`Home/End`、`Enter`（原生 `<a>`）、`Space`（補）、`Delete/Backspace` 關閉、`⇧F10`／ContextMenu 開選單。差異：

- `role="tab"` 在 `<a>` 上（§6.2）
- 主區不加 `role="tabpanel"`：MPA 下 Body 是整頁內容，且非筆記頁沒有任何頁籤被選取，硬套 tabpanel 反而誤導。`aria-controls` 不設

### 12.2 全域快捷鍵

照 README：`⌥.` 下一個、`⌥,` 上一個、`⌥W` 關閉目前、`⌥⇧T` 重開。

- 比對 `event.code`，要求 `altKey && !metaKey && !ctrlKey`
- 焦點在 `input`／`textarea`／`select`／`[contenteditable]` 內時不攔截（README 要求 production 補上）
- `e.defaultPrevented` 為真時不處理（plugin renderer 或生成元件自己用了同一組鍵就讓給它）
- 掛在 `window` 的 `keydown`；與 Palette 的 ⌘K、`wb-escape` 不重疊

---

## 13. dev／正式環境差異

無。頁籤功能兩邊都有。dev-only 的只有 §8.2「刪除筆記時關閉頁籤」，因為刪除本身是 dev-only。

---

## 14. 實作階段

| Task | 內容 | 驗收 |
| :-- | :-- | :-- |
| **105** | `wb-tabs.ts` 純函式、`wb-tabs-store.ts`、`scripts/checks/wb-tabs.mjs`、`check:wb` 串接；ToastHost 佇列 | `npm run check:wb` 通過 |
| **106** | TabBar／TabStrip（桌面列、溢出、遮罩、roving tabindex、拖曳）、layout 佔位與 `tab` prop、筆記頁與資料檔頁傳 `self`；`.nt-*` 樣式與 token | 開 3–5 篇、15 篇溢出、非筆記頁無 active；hydrate 前後零位移（截圖比對） |
| **107** | TabMenu、TabAll、快捷鍵、關閉後導覽、`⌥⇧T`、捲動記錄／還原（含 hash、bfcache、reload）、idle 校正與 prune、Palette 分區、DeleteNoteButton | 右鍵選單全部項目、快捷鍵在 input 內不觸發、hash 網址不被還原蓋掉、刪除筆記後不跳失效 toast |
| **108** | 平板、手機計數鈕與 TabSheet、reduced-motion；CLAUDE.md、`notecraft-workbench.md` 交叉引用；回填本文 §17；release notecraftapp **1.7.0** | 375／768／1280 三種寬度截圖；`npx tsc --noEmit`（不新增錯誤）＋ `npx astro build` ＋ `npm run check-plugins` |

---

## 15. 待釐清問題

### Q1. 頁籤標題的來源（已定案：A）

- **A（建議）**：localStorage 存顯示用快照，目前頁面的 SSR 值與 idle 載入的 `/wb-index.json` 依序覆寫（§4.3）。頁籤列第一個 frame 就有字；改名後的舊標題最多停留到 idle 校正
- B：照 README 不存，每頁 eager fetch `/wb-index.json` 後才畫。每次換頁頁籤列都會空白一下再跳出來
- C：把全站筆記的標題／路徑精簡表 inline 進每一頁。違反 workbench §5.3（N 篇就 N 倍重複）

### Q2. 頁籤的 DOM（已定案：A）

- **A（建議）**：容器內並排 `<a role="tab">` 與 `<button class="nt-x">`（§6.2）。保住 ⌘／Ctrl＋點擊、複製連結、狀態列顯示網址；✕ 對螢幕閱讀器可見
- B：照 prototype，`<div role="tab">` 內含按鈕、單擊用 JS 導覽

### Q3. Handoff 的六題待決，是否全部照設計稿的建議（已定案：A）

設計稿建議：狀態小點不顯示（放 tooltip）／未固定上限 20、自動關最舊／`⌥,` `⌥.`、不加 `⌥1–9`／新頁籤插在 active 右側／系列詳情頁不開頁籤／Present 不顯示頁籤列。

- **A（建議）**：全部照建議
- B：逐題重新討論

### Q4. 從列表（或 Sidebar、Palette）開啟一篇已經開著的筆記時，要不要還原捲動位置（已定案：A）

- **A（建議）**：還原（VS Code 的行為：聚焦既有編輯器、停在原位置）。想回頂端用 `Home` 或目錄
- B：只有點頁籤列時才還原，其他入口一律從頂端開始

### Q5. npx viewer 多工作區的 localStorage（已定案：A）

- **A（建議）**：key 帶工作區名稱 `nc-tabs-v1:<workspaceLabel>`（§11）
- B：全站一個 key，換工作區時把對方的頁籤當失效清掉
- C：全站一個 key，但解析不到的頁籤不刪、只是不顯示

### 優先順序一覽

Q1、Q2 影響 Task 105–106 的資料結構與 DOM，要先定；Q3–Q5 在 Task 107 前定即可。

---

## 16. 定案紀錄

2026-10-01 以問答逐題確認，五題皆採建議選項：

| 題 | 定案 | 影響 |
| :-- | :-- | :-- |
| Q1 標題來源 | **A**：localStorage 存顯示用快照，目前頁面 SSR 值與 idle 載入的 `/wb-index.json` 依序覆寫 | §1.3、§4.1 的 `title`／`path`／`pending` 欄位、§4.3 |
| Q2 頁籤 DOM | **A**：容器內並排 `<a role="tab">` 與 `<button class="nt-x">`；中鍵照設計稿關閉 | §6.2、§12.1 |
| Q3 設計稿待決六題 | **A**：全部照設計稿建議（不顯示狀態小點、未固定上限 20 自動關最舊、`⌥,`／`⌥.` 不加 `⌥1–9`、新頁籤插在 active 右側、系列詳情頁不開頁籤、Present 不顯示頁籤列） | §1.3、§4.2、§12.2 |
| Q4 已開啟筆記的捲動 | **A**：任何入口開啟都還原；網址有 hash 時以 hash 為準 | §7.2 |
| Q5 多工作區 | **A**：key 為 `nc-tabs-v1:<workspaceLabel>` | §1.3、§11 |

---

## 17. 實作後回填

### 實測（2026-10-01，`astro dev`，主專案 31 篇筆記）

| 項目 | 結果 |
| :-- | :-- |
| 零位移 | 1280 寬筆記頁：`.nt-bar` 34px、`#nc-scroll` top 103px，hydrate 前後相同；`layout-shift` 累計 0。SSR HTML 的 `.nt-bar` 是空元素 |
| 非筆記頁 | `/notes`（bare 頁）：Header 從 34px 開始；20 個頁籤皆非 active、`aria-selected` 全為 false、只有一個 `tabindex=0` |
| 溢出 | 21 個頁籤縮到 120px 後橫捲；active 捲進可視區、左側漸層出現 |
| 上限 | 預先塞 20 個未固定再開第 21 篇：淘汰 `at` 最小者並推入 `closed`；toast 在 ToastHost 掛載前發出，由 `lib/toast.ts` 佇列在掛載後送出 |
| 失效清除 | 塞兩個不存在的 key：idle 後移除並 toast「2 篇筆記已不存在…」；快照被索引覆寫（測試用的舊標題全數更新） |
| 關閉 active | ✕ → 右鄰；「關閉右側」在非 active 頁籤上執行且關到 active → 導覽到被點的頁籤 |
| 重開與捲動 | 筆記捲到 1500 → `⌥⇧T` 重開另一篇 → `⌥,` 回來：`scrollTop` 1500（無誤差） |
| hash | 帶 `#標題` 重新載入：已記錄的 1500 未套用，位置由 hash 決定 |
| 輸入框 | 焦點在 input 內按 `⌥W`：不關頁籤 |
| Palette | 最上方「已開啟的頁籤」4 筆；目前那篇「目前」pill、固定的「已固定」pill |
| 刪除筆記 | 以 dev API 建一篇測試筆記 → 開成頁籤 → ⋯ 刪除：回 `/notes`、頁籤已移除、沒有「已不存在」提示 |
| 平板 900 | 漢堡鈕在 `top:43px`，落在 Header 區 |
| 手機 375 | 頁籤列隱藏；計數鈕與漢堡鈕左右對稱；SSR 時是空框、hydrate 後填數字；抽屜蓋過底部 Tab bar、焦點落在關閉鈕、`Esc` 關閉後焦點回計數鈕；無整頁橫捲 |
| viewer 雙工作區 | 同一埠 4330 先後跑 `tmp/notecraft-test` 與臨時工作區：localStorage 兩個 key（`nc-tabs-v1:tmp/notecraft-test`、`nc-tabs-v1:tmp/tabs-ws-b`），切換後各自的頁籤都在、沒有失效提示 |
| build | `npx tsc --noEmit` 錯誤數未增加；`astro build` 63 頁；`check:wb` 三支全綠；`.nt-*` 規則零色碼 |

### 實作中新增的決定

- **浮層用 `position:fixed`、overlay 層（1000）**：prototype 是 `.wb-app` 內的 absolute（z 70／80）。改 fixed 才不受 `.wb-app{overflow:hidden}` 與各頁 stacking context 影響；開 Palette 時先關頁籤浮層
- **下拉與手機抽屜的列也照 Q2**：容器內並排 `<a>` 與關閉鈕（prototype 是 `div role=menuitem` 內含按鈕）
- **「關閉其他／關閉右側」在非 active 頁籤上執行、且關到目前頁面時，導覽到被點的那個頁籤**（`closeAndNavigate` 的 `prefer` 參數），而不是鄰居 —— 鄰居可能是固定頁籤，與使用者意圖不符
- **取消固定時留在一般區最前面**（原位置），不跳回固定前的索引；斷言已鎖
- **還原期間不記錄捲動**：內容未撐開時 `scrollTop` 會被夾住，若照常 debounce 記錄，會把真正的位置蓋成較小值
- **store 加 `refresh()`**：bfcache 還原時重讀 localStorage（期間其他頁的寫入收不到 `storage` 事件）
- **Palette 頁籤分區的 key 前綴用 `o:`**：`t:` 已被標籤分區使用
- **手機計數鈕的 SSR 空框是 layout 的 `.nt-count-slot` 本身**（外框、底色在它上面），按鈕以 portal 填入、透明無框，避免雙框線
- **`DeleteNoteButton` 的 `workspace` 由筆記頁經 `MoreMenu` 傳入**；未傳時不動頁籤（相容其他呼叫端）

### 與設計稿的最終偏離

§1.3 全部照做，另加上一節的前三點（fixed 浮層、下拉／抽屜列的 DOM、「關閉其他／右側」的導覽目標）。

### 仍未做的

- **bfcache 實測**：`astro dev` 的 HMR WebSocket 讓頁面不進 bfcache，dev 下無法驗；正式 build 尚未手動驗證
- **axe 與 VoiceOver**：沒跑；只以 DOM 檢查 role／aria／tabindex
- **README 截圖**：未補多頁籤截圖
- 寬度只量了 1280／900／375；1400、1100、861 未逐一量
- 建置時發現既有問題（與本功能無關）：`PluginView.astro` 在正式 build 把 renderer 的本機絕對路徑 inline 進內嵌資料檔的筆記頁（`/view` 頁有 `isDev` 判斷、內嵌沒有）。已另開工作處理，不在本分支修
