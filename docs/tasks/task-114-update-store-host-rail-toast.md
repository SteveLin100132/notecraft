# Task 114 — 檢查流程：store、UpdateHost、Rail 圓點預繪、發現新版 toast

> 規格 [notecraft-workbench-update-check.md](../notecraft-workbench-update-check.md) §3、§4.2、§4.5、§5、§6.1、§6.5、§7、§9；Q3、Q4 定案（§16）。
> 設計交付 README「檢查規則」「State Management」§1（Rail 圓點）、§5（toast）、「動畫」；視覺定稿 `pt-update.css` 的 `.upd-rail-dot`、`.upd-toast*`，行為對照 `pt-update-data.jsx` 的 `updCheck()`／`updBoot()`、`pt-update.jsx` 的 `PtUpdToast`。
> 依賴 [Task 113](task-113-update-pure-functions-changelog.md)。

## 為什麼要有這一步

所有接觸點都讀同一份狀態；先把「什麼時候查、查到什麼、存在哪、怎麼通知其他 island」做對，Task 115 的 UI 只是訂閱者。Rail 圓點與 toast 是**每一頁**都會出現的兩個接觸點，跟著 host 一起做，才能驗「30 分鐘內換頁不發請求」「換頁圓點不閃」「失敗零痕跡」這三件最容易出錯的事。

## 範圍

### 1. `src/lib/update-store.ts`（新增，client only）

模組單例（同一頁所有 island 共用，與 `wb-tabs-store.ts` 同一招）。狀態欄位照 handoff「State Management」：`status`、`res`、`checkedAt`、`err`、`drawer`、`toast`、`skipped`；另加 `cl`（CHANGELOG 載入狀態，Task 115 用）。

| API | 規則 |
| --- | --- |
| `initUpdate({ cur, userNode, repoBlobBase })` | 只有第一次呼叫生效；由 `UpdateHost` 在 render 前呼叫（`SettingsView`、`Palette` 拿到的是同一份） |
| `getUpd()`／`subscribeUpd(cb)` | 給 `useSyncExternalStore`；狀態不變時回傳同一個物件 |
| `boot()` | 規格 §5：讀 `nc-update-v1`（`readCache`）→ 有就先放進 `res`／`checkedAt`／`skipped`；`isFresh` → 結束；否則 `check(false)`。`navigator.onLine === false` → 略過；`document.hidden` → 等 `visibilitychange` 一次 |
| `check(manual)` | 規格 §5 狀態轉移；進行中重複呼叫回傳同一個 Promise。`fetch(NPM_PACKUMENT_URL, { signal })`，`AbortController` 8 秒；**不帶自訂 header**。成功 → `deriveResult` → 寫回 localStorage（寫入前先重讀，保留 `toasted`／`skipped`）→ `shouldToast` 時設 `toast` 並寫 `toasted`。失敗一律 `catch`，手動才寫 `err` |
| `skip(v)`／`unskip()` | 寫 `skipped`、關 toast |
| `openDrawer()`／`closeDrawer()` | `drawer` 開關；開時清 `toast` |
| `dismissToast()` | 清 `toast`（`toasted` 已寫，同版不再出現） |
| `requestCheckOnSettings()` | 規格 §3.2：不在 `/settings` → `sessionStorage["nc-update-next"] = "check"` 後導到 `/settings?tab=about`；已在 → 發 `focusAbout` 給訂閱者並 `check(true)` |
| `storage` 事件 | `e.key === "nc-update-v1"` → 重讀快取（`cur` 相符才採用）並通知 |
| localStorage 不可用 | 讀寫 throw → 改用模組變數（規格 §4.5） |

- React 端的 `useUpd()` hook 放在 `src/components/wb/update/useUpd.ts`（`useSyncExternalStore`），不在 store 裡 import React

### 2. `src/components/wb/update/UpdateHost.tsx`（新增 island）

- props：`cur`、`userNode`、`repoBlobBase`（皆 build 期字串）
- 掛載：`initUpdate(props)` → 讀 `sessionStorage["nc-update-next"]`（讀到就刪、`check(true)`）→ 否則 `boot()`
- 訂閱 store，同步 **Rail DOM**（`#wb-rail-settings` 的 `aria-label`、`title`，`.wb-upd-dot` 的 `hidden`、`data-tone`）；狀態從無到有、或 tone 改變時加 `.pop` 播一次 `ncPop`，`animationend` 移除
- 渲染 `UpdateToast`（portal → `.wb-app`）；Drawer 的 portal 在 Task 115 加
- 不輸出任何 SSR DOM（`client:idle`，SSR 回傳 `null`）

### 3. `WorkbenchLayout.astro` 與 `Rail.astro`

- `Rail.astro`：「設定與關於」`<a>` 加 `id="wb-rail-settings"`，內含 `<span class="wb-upd-dot" hidden aria-hidden="true"></span>`
- layout frontmatter：`cur = index.appVersion`、`userNode = process.versions.node`、`repoBlobBase` 由 `package.json` 的 `repository.url` 推出（`git+https://github.com/x/y.git` → `https://github.com/x/y/blob/main/`）；`railHintSrc = railHint.toString()`
- `<Rail>` 之後、`<Sidebar>` 之前加預繪 inline script（`define:vars={{ cur, railHintSrc }}`）：`new Function` 重建 → 讀 `localStorage["nc-update-v1"]` → 有值就設 `hidden=false`、`data-tone`、`aria-label`、`title`。整段包 `try/catch`
- body 尾端（`ToastHost` 之後）掛 `<UpdateHost client:idle cur={…} userNode={…} repoBlobBase={…} />`
- `PresentLayout` **不動**（簡報頁不檢查）

### 4. `src/components/wb/update/UpdateToast.tsx`（新增）

照 handoff §5 的版面與文案表，**只用 patch／minor、major、已棄用三種**（Q3 = D：不做部署站標題）。

- `role="status"`；10 秒自動收起；`pointerenter`／`focusin` 暫停、`pointerleave`／`focusout` 重新計 10 秒（規格 §6.5）
- 顯示時 `pushEscape(dismissToast)`，收起時取消登記
- 「查看更新內容」→ `openDrawer()`（Task 115 之前先只關 toast）；「略過這一版」→ `skip(latest)`（已棄用不顯示）；✕ → `dismissToast()`
- 不搶焦點

### 5. 樣式（`workbench.css`）

- `:root` 加規格 §9 的 token：`--wb-upd-info`、`--wb-upd-major`、`--wb-upd-danger`、`--wb-upd-security`、`--wb-upd-toast-bg`、`--wb-z-upd-toast: 700`；alpha 區加 `--wb-a-white-08`、`-60`、`-72`、`-78`
- 本 Task 只加 `.wb-upd-dot`、`.wb-upd-toast*` 與 `@keyframes ncPop`（若不存在）；`.wb-upd-dot` 與既有 `.wb-rail-dot` 分開
- 手機（≤860）的 toast 位置規則放進既有 860px 區塊；reduced-motion 規則加進既有列表

## 要改的既有檔案

`src/layouts/WorkbenchLayout.astro`、`src/components/wb/Rail.astro`、`src/styles/workbench.css`。新增 `src/lib/update-store.ts`、`src/components/wb/update/UpdateHost.tsx`、`UpdateToast.tsx`、`useUpd.ts`。

## 驗收

驗收以 `astro preview`（`npx astro build && npx astro preview`）為準。測試 registry 回應用 DevTools 的 Network overrides，或在 console 暫時包一層 `window.fetch`（驗完移除）。

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 首次 | 清掉 `nc-update-v1` | 開任一頁 | idle 後 Network 出現一次 `registry.npmjs.org/notecraftapp`；`nc-update-v1` 寫入 |
| 節流 | 剛查過 | 換 5 頁 | 不再發請求 |
| 過期 | 把 `at` 改成 31 分鐘前 | 換頁 | 發一次請求 |
| 版本變更 | 把快取的 `cur` 改成 `0.0.1` | 換頁 | 快取作廢、重新查詢、`toasted`／`skipped` 清空 |
| 離線 | DevTools Offline、清快取 | 開頁 | 沒有任何 UI 變化、console 無應用程式錯誤、不寫 `at` |
| 逾時 | 請求 throttle 到 >8 秒 | 開頁 | 8 秒後放棄、無 UI |
| 新版 toast | override `dist-tags.latest` 為 `9.0.0` | 開頁 | 右下 toast（major 文案）；Rail 圓點黃色並 `ncPop` |
| 只一次 | 承上 | 換頁 | toast 不再出現；圓點**預繪**出現、不閃、不播 `ncPop` |
| 略過 | toast 按「略過這一版」 | 換頁 | 圓點消失 |
| 已棄用 | override 目前版本 `deprecated` | 清 `toasted` 後開頁 | 紅色 toast、無「略過」；圓點紅色 |
| Esc | toast 顯示中 | `Esc` | toast 關閉；再開 Palette 後 `Esc` 只關 Palette |
| 計時 | toast 顯示中 | 滑鼠停在 toast 上 15 秒 | 不收起；移開 10 秒後收起 |
| 多分頁 | 兩個分頁 | 分頁 A 查到新版 | 分頁 B 的 Rail 圓點同步出現 |
| 手機 | 375 寬 | 觸發 toast | 左右 12px、在底部列上方 |
| 簡報頁 | — | 開 Present 頁 | 沒有請求 |
| build | — | `npx tsc --noEmit && npx astro build && npm run check:upd` | 通過；tsc 錯誤數不增加 |

## 依賴

Task 113。

## 實作記錄（2026-10-03）

- `update-store.ts`：`initUpdate` 由第一個帶 env 的元件呼叫（`useUpd(env)`），render 前就把快取放進狀態；`useSyncExternalStore` 的 server snapshot 一律是「尚未檢查」，hydration 不 mismatch。CHANGELOG 的抓取（`loadChangelog`、`changelogLinks`）一併放在 store，Task 115 直接用
- `UpdateHost` 同步 Rail 時讀 `getUpd()` 而不是 hook 的值：hydration 那一輪拿到的是 SSR 快照，會先藏掉預繪的圓點再跳出來
- toast 掛在 body 層、`position:fixed`（不 portal 進 `.wb-app`）；`.wb-app` 沒有 position，效果相同
- 樣式：`.wb-upd-*` 全部一次加在 `workbench.css` 結尾（含 Task 115 的部分），手機與 reduced-motion 規則放在同段自己的 `@media` 區塊，不併進既有 860px 區塊；新增 `--wb-upd-shadow`、`--wb-upd-radius` 兩個別名，讓規則只引用 `--wb-*`
- 實測（`astro preview`，1280×800）：真實 registry 查一次、寫入 `nc-update-v1`（npm 最新即 1.8.5，無圓點）；以同源 iframe 攔截 `fetch` 模擬 2.0.0 → major toast＋黃色圓點＋`aria-label`「設定與關於 ・ 有新版 v2.0.0，落後 2 個版本」；換頁不發請求、不再跳 toast、圓點由預繪畫出且無 `.pop`；`fetch` 失敗 → 無 UI、無錯誤、不寫快取
- iframe 內 `client:idle` 的 island 在這個瀏覽器窗格不會 hydrate（`requestIdleCallback` 不觸發），測試時以 `setTimeout` 代替；正式頁面不受影響
