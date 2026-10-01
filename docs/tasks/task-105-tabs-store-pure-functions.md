# Task 105 — 筆記頁籤地基：純函式、store、斷言、Toast 佇列

> 規格 [notecraft-workbench-note-tabs.md](../notecraft-workbench-note-tabs.md) §4、§6.6、§11；Q1、Q3、Q5 定案（§16）。
> 設計交付 [design_handoff_note_tabs](../prototype/design_handoff_note_tabs/) README「State Management」「Interactions & Behavior」；行為對照 `prototype/wb/pt-tabs.jsx` 的 `usePtTabs`。
> 無前置依賴，**本批第一個做**；Task 106、107、108 都靠它。

## 為什麼要有這一步

頁籤的每一個動作（開、關、固定、拖曳、LRU 淘汰、關閉後導覽到誰、重開）都是對同一份清單的運算，而且結果決定使用者被帶去哪一頁。這些錯了 build 照樣全綠，只有斷言抓得到。先把運算抽成純函式鎖住，Task 106／107 的元件只負責把事件接到函式上。

另外兩件 UI 之前就要定的事：localStorage 的格式與 key（依工作區分開，Q5），以及頁面剛載入時發的 toast 不能被吞掉（`ToastHost` 是 `client:idle`，頁籤 island 是 `client:load`）。

## 範圍

### 1. `src/lib/wb-tabs.ts`（新增，純函式）

型別照規格 §4.1（`TabKind`、`TabEntry`、`TabStore`、`TabSelf`）。常數：

```ts
export const TAB_MAX = 20;          // 未固定頁籤上限（Q3）
export const TAB_CLOSED_MAX = 10;   // 最近關閉堆疊
export const tabKey = (kind: TabKind, id: string) => `${kind}:${id}`;
export const tabStorageKey = (workspace: string) => `nc-tabs-v1:${workspace}`;  // Q5
```

函式（全部回傳新物件、不改傳入值；需要時間的由呼叫端傳 `now`）：

| 函式 | 規則 |
| --- | --- |
| `emptyStore()` | `{ v: 1, tabs: [], closed: [] }` |
| `parseStore(raw: string \| null)` | JSON 壞、`v !== 1`、`tabs` 非陣列 → `emptyStore()`；逐筆過濾欄位型別不對的項目（不 throw） |
| `normalize(store)` | 固定頁籤排最前，兩區各自保持相對順序（stable） |
| `ensure(store, self, now)` | 已有同 key → 更新 `at`、`title`、`path`、`pending`，位置不動。否則新建（`pinned:false`、`scroll:0`），插在 **`at` 最大者**右側（清單空則放最後）→ `normalize` → 未固定數 > `TAB_MAX` 時淘汰 `at` 最小的未固定、且不是本次新增的頁籤，推入 `closed`。回傳 `{ store, evicted: TabEntry \| null }` |
| `close(store, keys)` | 移除其中**未固定**的，依關閉順序推入 `closed` 前端；`closed` 以 key 去重、截到 `TAB_CLOSED_MAX` |
| `closeOthers(store, key)`／`closeRight(store, key)`／`closeAll(store)` | 包 `close`；「右側」以目前清單順序為準；固定頁籤一律不關 |
| `togglePin(store, key)` | 切換 → `normalize` |
| `move(store, fromKey, toKey)` | 把 from 移到 to 的位置；兩者 `pinned` 不同 → 回傳原 store |
| `neighborAfterClose(store, key)` | 在**關閉前**的清單上找右鄰，否則左鄰；跳過也會被關掉的（呼叫端傳 `closing: Set<string>`）；都沒有 → `null` |
| `popClosed(store, exists)` | 從 `closed` 前端找第一筆 `exists(key)` 為真且不在 `tabs` 的，移出 `closed`、加回 `tabs`（插入規則同 `ensure`、**保留原 `scroll`、`pinned` 歸 false**）→ 回傳 `{ store, entry }`；找不到 `entry: null` |
| `prune(store, exists)` | 移除 `exists(key)` 為假的頁籤；`closed` 也一併清掉不存在的。回傳 `{ store, removed }` |
| `cycle(store, activeKey, dir: 1 \| -1)` | 回傳要去的 entry：`activeKey` 在清單內 → 循環前後；`null` 或不在清單 → `at` 最大者；清單空 → `null` |
| `setScroll(store, key, y)` | 更新該頁籤 `scroll`（四捨五入、負數歸 0）；key 不存在回傳原 store |
| `refreshSnapshot(store, resolve)` | `resolve(entry)` 回傳 `{ title, path, pending } \| null`；非 null 就覆寫快照（Q1 的第三來源） |
| `hrefOf(entry)` | `note` → `/notes/${slug}`、`view` → `/view/${routePath}`；**不做 encode**，與 codebase 其他連結的寫法一致（grep `href={\`/notes/` 對照） |

- **只能 `import type`、不能有 JSX、不碰 `window`／`localStorage`／`Date.now()`**（CLAUDE.md：被 `scripts/checks` 載入的 `.ts` 的限制）
- `view` 的 `id` 是 `routePath`，不含 `view:` 前綴；`key` 是 `view:<routePath>`，與系列章節識別碼同形（規格 §1.3）

### 2. `scripts/checks/wb-tabs.mjs`（新增）

比照 `wb-calendar.mjs` 的骨架（`assert/strict`、`check(name, fn)`、`✓／✗`、失敗 `process.exit(1)`）。`package.json` 的 `check:wb` 在最後串上 `&& node --experimental-strip-types --disable-warning=ExperimentalWarning scripts/checks/wb-tabs.mjs`；`check-plugins` 會自動跑到。

| 斷言 | 內容 |
| --- | --- |
| 插入位置 | 清單 A(at=1) B(at=3) C(at=2)；`ensure(D)` → A B D C |
| 已存在 | `ensure(B)` 不改順序、只更新 `at` 與快照 |
| 空清單 | `ensure(A)` → [A] |
| 固定排前 | A B(pinned) C → `normalize` → B A C；`togglePin(C)` → B C A |
| 跨區移動 | `move(固定, 一般)` 回傳原 store（同一參照或深相等） |
| 同區移動 | A B C D 皆未固定，`move(A, C)` → B C A D（與 prototype `move()` 的「先移除、再插到 to 原本的索引」相同）；`move(D, B)` → A D B C |
| LRU 淘汰 | 20 個未固定 + 1 個固定，`ensure(新)` → 淘汰 `at` 最小的未固定；固定不被淘汰；新開的不被淘汰；`evicted` 正確且進 `closed` |
| `closed` | 連關 12 個 → 長度 10、最新在前；同一個 key 關兩次只留一筆 |
| 固定不可關 | `close([固定])`、`closeAll`、`closeOthers`、`closeRight` 都不動固定頁籤 |
| 鄰居 | A B C 關 B → C；關 C → B；只剩 A 關 A → `null`；`closeRight(A)` 時 active 在 C → 鄰居跳過被關的、得 A |
| 重開 | `closed` = [X(不存在), Y(已開), Z] → `popClosed` 得 Z、保留 Z 原 `scroll` |
| prune | 兩個不存在 → `removed.length === 2`；`closed` 內不存在的也清 |
| cycle | A B C、active B、+1 → C；active C、+1 → A；active `null` → `at` 最大者 |
| parseStore | `null`、`"{"`、`'{"v":2}'`、`'{"v":1,"tabs":"x"}'` 都回空 store；一筆缺 `key` 的項目被濾掉、其他保留 |
| hrefOf | `note:a/b` → `/notes/a/b`；`view:api/orders.openapi` → `/view/api/orders.openapi`；CJK slug 原樣 |

### 3. `src/lib/wb-tabs-store.ts`（新增，client only）

- `createTabStore(workspace: string)`：回傳 `{ get(), update(fn), subscribe(cb), setActive(key), getActive() }`
  - `get()`：讀 localStorage → `parseStore`；讀不到（例外、隱私模式）→ 記憶體內的 store
  - `update(fn)`：**每次都重讀最新 localStorage** → `fn(store)` → 寫回 → 通知訂閱者。寫入例外（配額）靜默略過但仍更新記憶體與通知
  - 監聽 `window` 的 `storage` 事件（`e.key === tabStorageKey(workspace)`）→ 通知訂閱者
  - `setActive`／`getActive`：目前頁面的 key（模組變數，給 Palette 標「目前」用；規格 §8.1）
- 模組層單例：同一頁所有 island 拿到同一個實例（`getTabStore(workspace)` 以 workspace 快取）
- 不在這裡 import React；提供一個小 hook 放在 Task 106 的 `TabBar.tsx` 旁（`useTabStore`），用 `useSyncExternalStore`

### 4. Toast 佇列（規格 §6.6）

- 新增 `src/lib/toast.ts`：`toast(msg: string, icon?: string)`。host 未登記時推進模組內佇列；已登記就直接交給 host
- `ToastHost.tsx`：掛載的 effect 內呼叫 `registerToastHost(push)`，登記時一次送出佇列；卸載時取消登記
- 既有的 `nc-toast` 事件與 `nc-toast-next`（sessionStorage）**不動**，`toast()` 是額外的入口

> 注意：佇列在模組層，**只在同一個 bundle chunk 共用模組時成立**。Astro 會把 `src/lib/toast.ts` 抽成共享 chunk（`wb-escape.ts` 已是先例），實作後在 build 產物確認兩個 island 引用的是同一個 chunk。

## 要改的既有檔案

`package.json`（`check:wb`）、`src/components/islands/ToastHost.tsx`。新增 `src/lib/wb-tabs.ts`、`src/lib/wb-tabs-store.ts`、`src/lib/toast.ts`、`scripts/checks/wb-tabs.mjs`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 斷言 | — | `npm run check:wb` | 三支（dashboard、calendar、tabs）都綠 |
| 純度 | — | `grep -n "^import" src/lib/wb-tabs.ts` | 只有 `import type`（或無） |
| 無副作用 | — | `grep -nE "window|localStorage|Date\.now" src/lib/wb-tabs.ts` | 0 筆 |
| Toast 佇列 | dev，任一頁 | 在 `client:load` island 的 effect 內呼叫 `toast("x")`（臨時測試碼，驗完移除） | ToastHost hydrate 後看到「x」 |
| 既有 Toast | dev 刪除一篇筆記 | — | 「已刪除筆記」照舊出現（sessionStorage 路徑不受影響） |
| build | — | `npx tsc --noEmit && npx astro build` | 通過；tsc 錯誤數不增加 |

## 依賴

無。

## 實作記錄（2026-10-01）

- `wb-tabs.ts` 照範圍實作，另加 `closable`、`mostRecent`、`tabTooltip`；`popClosed` 多一個 `now` 參數（重開的頁籤要更新 `at`）
- 斷言 21 組全綠。原本假設「取消固定後回到原索引」是錯的：`normalize` 是穩定排序，取消固定的頁籤留在一般區最前面（也就是原位置），斷言改成這個行為
- `wb-tabs-store.ts`：`update` 每次重讀 localStorage；相同原字串沿用同一個物件（`useSyncExternalStore` 需要穩定參照）
- `lib/toast.ts` 佇列在 Task 106 實測：上限淘汰的提示在 ToastHost 掛載前發出，掛載後正常顯示
