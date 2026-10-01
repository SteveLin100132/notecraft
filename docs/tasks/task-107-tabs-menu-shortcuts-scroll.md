# Task 107 — 右鍵選單、全部頁籤下拉、快捷鍵、捲動還原、Palette、刪除筆記

> 規格 [notecraft-workbench-note-tabs.md](../notecraft-workbench-note-tabs.md) §6.3、§6.5、§7、§8、§12.2；Q3、Q4 定案（§16）。
> 設計交付 README §2、§3、「關閉」「捲動還原」「⌘K Palette」「鍵盤快捷鍵」；行為對照 `pt-tabs.jsx` 的 `PtTabMenu`／`PtTabAll` 與 `pt-app.jsx` 的整合段落。
> 依賴 [Task 106](task-106-tabs-desktop-strip.md)。

## 為什麼要有這一步

Task 106 讓頁籤能開能關；這一步補齊「管理很多頁籤」與「切回來還在原位」兩件事。捲動還原是這個功能真正省時間的地方，也是最容易和既有行為打架的地方：標題錨點與 OpenAPI 的 hash、瀏覽器的 bfcache、還沒撐開的生成元件，規格 §7 的條件表要逐條做到。

## 範圍

### 1. `src/components/wb/tabs/TabMenu.tsx`（新增，右鍵選單）

照 README §3。觸發：頁籤容器的 `contextmenu`、`<a>` 上的 `Shift+F10`／`ContextMenu` 鍵（鍵盤觸發時定位在頁籤左下）。

| 項目 | 行為 |
| --- | --- |
| 關閉 `⌥W` | 固定頁籤 disabled |
| 關閉其他 | 在非 active 上執行時導覽到該頁籤（規格 §6.5） |
| 關閉右側／全部關閉 | 關到 active 時同「關閉 active」 |
| 固定頁籤／取消固定 | `togglePin` |
| 複製連結 | `navigator.clipboard.writeText(location.origin + hrefOf(t))` → toast「已複製連結」；失敗 toast「無法複製連結」 |
| 在新視窗開啟 | `window.open(href, "_blank", "noopener")` |

- `role="menu"`／`menuitem`；開啟時焦點落在第一個可用項；`↑/↓` 移動（跳過 disabled）、`Enter` 執行、關閉後焦點回到觸發的頁籤
- `pushEscape(close)`（不自己掛 Escape）；點外部、外部右鍵用 scrim 關閉
- 位置夾在視窗內 8px；z-index `--wb-z-overlay`
- 開 Palette（`nc-open-palette` 事件、⌘K）時先關選單

### 2. `src/components/wb/tabs/TabAll.tsx`（新增，全部頁籤下拉）

照 README §2，`.nt-all` 從 Task 106 的靜態 pill 改為按鈕（`aria-haspopup="menu"`、`aria-expanded`）。

- 篩選輸入 autofocus，比對標題＋路徑；`Enter` 開第一筆；`↑/↓` 在結果間移動
- 分區「已固定」「頁籤」；列點擊導覽、✕ 關閉（關到 active 時照 §6.5 導覽）
- 底部「重開剛關閉的 ⌥⇧T」（`closed` 中沒有可重開的 → disabled）、「全部關閉」（mini danger）
- `pushEscape`；z-index 與選單相同

### 3. 全域快捷鍵（`TabBar.tsx`）

`window` 的 `keydown`，條件：`e.altKey && !e.metaKey && !e.ctrlKey && !e.defaultPrevented`，且焦點**不在** `input`／`textarea`／`select`／`[contenteditable]`。比對 `e.code`：

| `code` | shift | 動作 |
| --- | --- | --- |
| `Period` | 否 | `cycle(+1)` → 導覽 |
| `Comma` | 否 | `cycle(-1)` → 導覽 |
| `KeyW` | 否 | 關閉目前（非頁籤頁或固定 → 無作用） |
| `KeyT` | 是 | `popClosed` → 導覽到重開的頁籤 |

命中時 `preventDefault`。不加 `⌥1–9`（Q3）。

### 4. 捲動記錄與還原（`TabBar.tsx`，規格 §7）

只在 `self` 存在時啟用。容器 `document.getElementById("nc-scroll")`。

- **記錄**：`scroll` 事件 debounce 220ms → `store.update(s => setScroll(s, key, el.scrollTop))`；`pagehide` 補寫一次（不 debounce）
- **還原條件**：
  - `location.hash` 非空 → 不還原
  - `pageshow` 且 `e.persisted` → 不還原，但 `store` 重讀並重畫（bfcache 回來時頁籤列要是最新的）
  - 其他情況（含 `reload`、從列表開已開的頁籤，Q4）→ 還原到 entry 的 `scroll`
- **還原時機**：掛載後設一次 → 下一個 `requestAnimationFrame` 再設一次 → 若當時 `scrollHeight - clientHeight < 目標`，在 `window` 的 `load` 事件後再設一次（若已 load 則略過）
- **使用者優先**：在還原完成前偵測到 `wheel`／`touchstart`／`keydown`（PageUp／PageDown／Space／方向鍵／Home／End）→ 取消後續補設
- 新頁籤 `scroll` 是 0，不做任何事

### 5. ⌘K Palette（`src/components/wb/Palette.tsx`，規格 §8.1）

- `groups` 最前面插入「已開啟的頁籤」分區，資料來自 `getTabStore(workspace).get().tabs`（快照，不等 wb-index）。Palette 需要 `workspace`：由 layout 傳 prop（`<Palette client:idle workspace={index.workspaceLabel} />`）
- 無查詢：前 6 筆（清單順序）；有查詢：比對 `title + path`，最多 4 筆
- 列：`FileText`（資料檔 `--wb-gold`）＋標題＋路徑；`store.getActive() === key` → pill「目前」；固定 → muted pill「已固定」
- `Item.key` 用 `t:` 前綴，避免與「筆記」分區的 `n:` 撞 key；**不去重**（規格 §8.1）
- `Enter` 的既有邏輯（`flat[active]`）自然會先選到頁籤分區的第一筆

### 6. 刪除筆記（`src/components/islands/DeleteNoteButton.tsx`，規格 §8.2）

`useDeleteNote()` 在 `location.replace("/notes")` 之前同步呼叫 `getTabStore(workspace).update(s => close(s, ["note:" + slug]))`。筆記頁的刪除入口是 `MoreMenu`（`useDeleteNote({ slug, title, componentIds, path })`），`workspace` 加進這組參數：`[...slug].astro` 呼叫 `getWorkbenchIndex()` 取 `workspaceLabel` → `MoreMenu` prop → `useDeleteNote`。**不**走「導覽到鄰居」。

## 要改的既有檔案

`src/components/wb/tabs/TabBar.tsx`、`TabStrip.tsx`、`src/components/wb/Palette.tsx`、`src/layouts/WorkbenchLayout.astro`（Palette prop）、`src/components/wb/MoreMenu.tsx`、`src/components/islands/DeleteNoteButton.tsx`、`src/pages/notes/[...slug].astro`、`src/styles/workbench.css`（`.nt-menu`、`.nt-pop*`、`.nt-kbd`、下拉的規則；同樣零色碼）。新增 `TabMenu.tsx`、`TabAll.tsx`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 右鍵選單 | 5 個頁籤、第 2 個固定 | 對第 4 個右鍵 | 選單 7 項；「關閉右側」只關第 5 個；固定的永遠不被關 |
| 鍵盤開選單 | 焦點在頁籤 | `Shift+F10` | 選單開、焦點在第一項；`Esc` 關閉、焦點回頁籤 |
| Escape 堆疊 | 選單開著、Drawer 也開著 | `Esc` | 只關選單；再按一次才關 Drawer |
| 複製連結 | — | 「複製連結」 | 剪貼簿是完整網址；toast 出現 |
| 下拉 | 15 個頁籤 | 點 `.nt-all`、輸入關鍵字、`Enter` | 開第一筆相符的 |
| 重開 | 關掉 3 個 | `⌥⇧T` 三次 | 依關閉的反序回來、各自回到關閉前的捲動位置 |
| 切換 | 3 個頁籤 | `⌥.`／`⌥,` | 循環切換；在 `/notes` 按 `⌥.` 回到最後看的頁籤 |
| 輸入框內 | 焦點在 Palette 輸入框或標籤編輯 | `⌥W` | 不關頁籤（macOS 輸入「∑」） |
| 捲動還原 | 筆記 A 捲到中段 | 切到 B 再點回 A | A 停在原位置（誤差 < 1 屏） |
| 從列表開 | 同上 | 從 `/notes` 雙擊 A | 同樣還原（Q4） |
| hash 優先 | A 有已記錄的捲動 | 開 `/notes/A#某標題` | 停在該標題，不被還原蓋掉 |
| OpenAPI | 已開一個 OpenAPI 資料檔並捲動 | 從導覽點某 operation（網址出現 `#op/…`）→ 換頁 → 點回頁籤 | 由 plugin 依 hash 定位；不出現兩次跳動 |
| bfcache | A → B（B 新開頁籤）→ 瀏覽器上一頁 | — | A 的頁籤列含 B；捲動位置是瀏覽器保留的 |
| 慢元件 | 一篇有多個 `client:visible` 生成元件的長筆記，捲到底部附近 | 切走再切回 | 最終停在原位置附近；還原過程中自己捲動不會被拉回 |
| Palette | 有 3 個頁籤 | ⌘K | 最上方「已開啟的頁籤」3 筆、目前那篇有「目前」pill；輸入關鍵字只留相符的（≤4） |
| 刪除筆記 | dev，刪除一篇已開的筆記 | — | 回 `/notes`、toast「已刪除筆記」；頁籤列沒有那篇；**不**出現「筆記已不存在」 |
| build | — | `npx tsc --noEmit && npx astro build && npm run check:wb` | 通過；tsc 錯誤數不增加 |

## 依賴

Task 106。

## 實作記錄（2026-10-01）

- 選單與下拉共用 `TabPop`：改為 `position:fixed`、overlay 層（prototype 是 `.wb-app` 內 absolute），開 Palette 時先關
- 下拉的列改成容器內並排 `<a role="menuitem">` 與關閉鈕（prototype 是按鈕包在列裡）
- `closeAndNavigate` 加 `prefer`：「關閉其他／右側」在非 active 頁籤執行且關到目前頁面時，導覽到被點的頁籤
- 捲動還原多一個「還原期間不記錄」的保護；store 加 `refresh()` 給 bfcache 用
- Palette 頁籤分區 key 前綴用 `o:`（`t:` 是標籤分區）
- 實測：右鍵選單 7 項、Esc 關閉、固定、關閉右側導覽、`⌥⇧T`＋`⌥,` 後捲動回到 1500、hash 讓位、輸入框內 `⌥W` 不觸發、Palette 分區、刪除測試筆記後無失效提示。bfcache 在 dev 無法驗（HMR WebSocket）
