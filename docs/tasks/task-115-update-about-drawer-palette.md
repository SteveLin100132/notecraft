# Task 115 — 介面：版本與更新區塊、頁籤徽章、更新詳情 Drawer、Palette 指令

> 規格 [notecraft-workbench-update-check.md](../notecraft-workbench-update-check.md) §4.3、§6.2–§6.4、§6.6、§8、§10；Q1–Q4 定案（§16）。
> 設計交付 README §2（頁籤徽章）、§3（版本與更新區塊）、§4（Drawer、UpdChangelog）、§6（Palette）、「Interactions & Behavior」；視覺定稿 `pt-update.css`，元件對照 `pt-update.jsx` 的 `PtUpdBlock`、`UpdLevelPills`、`UpdNotes`、`UpdCmd(s)`、`UpdChangelog`、`UpdDrawerPanel`，整合點 `pt-shell.jsx`（`tabBadges`）、`pt-views2.jsx`、`pt-app.jsx`（`PT_CMDS`、`onCmd`）。
> 依賴 [Task 114](task-114-update-store-host-rail-toast.md)。

## 範圍

### 1. 共用小元件（`src/components/wb/update/`）

| 檔案 | 對應 | 備註 |
| --- | --- | --- |
| `UpdatePills.tsx` | `UpdLevelPills` | handoff Pill 規則表；`ahead`（Q4）→ `muted`「尚未發佈的版本」＋ `muted`「npm 最新 v{latest}」 |
| `UpdateNotes.tsx` | `UpdNotes` | 三則提示框；Node 那則用規格 §8 的**通用文案**；major 那則的項數來自 `countByCategory`，CHANGELOG 未載入時先不顯示數字（「升級前請先看更新內容」） |
| `UpdateCmds.tsx` | `UpdCmd(s)` | 兩列：`npx notecraftapp@latest view`、`npm i -g notecraftapp@latest`；複製走 `src/lib/clipboard.ts`，失敗改「無法複製」並選取文字（規格 §10）；隱藏 `aria-live` 讀「已複製到剪貼簿」 |
| `UpdateChangelog.tsx` | `UpdChangelog` | 見 §4 |

### 2. `WbHeader.tsx`：`tabBadges`

- 新 prop `tabBadges?: Partial<Record<T, { n: number; tone: UpdTone; label: string }>>`（規格 §6.2）
- 有徽章的 tab：文字後接 `<span class="wb-upd-tab-badge" data-tone>`（`aria-hidden`），按鈕 `aria-label` 改成 label；`ncPop` 只在出現時播
- 其他使用 `WbHeader` 的頁面不傳，行為不變

### 3. `SettingsView.tsx`：版本與更新區塊

- 「關於」分頁 `#nc-scroll` 的第一個子元素插入 `UpdateBlock`（`StatStrip` 之上）；`meta` 陣列拿掉 `["版本", …]` 列（規格 §6.3）
- `WbHeader` 傳 `tabBadges={{ about: railHintOf(res, skipped) }}`（`null` 時不傳該鍵）
- 訂閱 store 的 `focusAbout`：切到「關於」（沿用既有 `goTab`，寫 `?tab=about`）
- **`UpdateBlock.tsx`**（新增）照 handoff §3 a–e，扣掉 `.upd-deploy` 段落（Q3 = D）：
  - 群組標頭（既有 `GroupHeader`，icon `RefreshCw`）
  - hero：版本列（`ahead` 時為「目前 v1.9.0」＋「npm 最新 v1.8.5」、不畫 → 箭頭、目前版本不套 `.old`，Q4）、pills、按鈕列、狀態行
  - 「查看更新內容」只要 `res` 非 `null` 就顯示；「檢查更新」檢查中用 `aria-disabled`、不用 `disabled`（規格 §10）
  - 狀態行 `agoLabel` 每 30 秒重算，只在「關於」可見時跑 interval
  - 設定列（既有 `SetRow`）：升級指令（規格 §8 通用說明）、Node 需求（pill「目前 20.11.1」）、套件、已略過時的「恢復提醒」
- SSR：照規格 §6.3（目前版本＋「尚未檢查新版」＋只有「檢查更新」）

### 4. 更新詳情 Drawer

- **`DrawerShell.tsx`** 加可選 prop：`className`（加在 `<aside>`）、`footer`（`.wb-dw-body` 之後、不捲動）、`closeLabel`（預設「關閉」）。`NoteDrawer`／`PluginDrawer` 不傳，行為不變
- **`UpdateDrawer.tsx`**（新增）：`UpdateHost` 在 `drawer === true` 時以 `createPortal` 渲染進 `#nc-main`。內容照 handoff §4 的 1–6；crumb「notecraftapp ・ 更新內容」、`closeLabel="關閉（Esc）"`、`className="wb-upd-dw"`
  - 區段標題「你錯過的更新 **N** 個版本」，N = `behind`（Q1 = B）；已是最新或 `ahead` →「目前版本的更新內容」
  - 底列：GitHub 連結（`repoBlobBase` 推出的 `…/blob/main/CHANGELOG.md`）；有新版且未棄用 →「略過這一版」／已略過 →「恢復這一版的提醒」
- **CHANGELOG 抓取**（store 內，規格 §4.3）：`loadChangelog()` 依序 jsDelivr `@<latest>`（已是最新用 `@<cur>`）→ GitHub raw `main`；`ahead` 直接用 raw。同一頁以 `latest` 為 key 快取 Promise。觸發：Drawer 開啟、或「關於」顯示 major 結果
- **`UpdateChangelog.tsx`**：
  - 資料 = `sliceChangelog(parseChangelog(md), missed, cur)`
  - 類別 chip 列（單選篩選、安全 chip）、全部展開／收合、清除篩選
  - 版本列 `<button aria-expanded aria-controls>`；預設只展開第一版；第一版標「最新」（已是最新為 `ok`「目前」）；跳主版本的那版加 `warn`「major」；含安全項目加 `.wb-upd-secpill`
  - 展開內容：`lead`（若有）→ 各類別；`empty` 佔位顯示「這一版沒有 CHANGELOG 紀錄」；只剩內部項目的版本顯示「這一版只有內部調整」（Q2）
  - 行內以 `inlineTokens` 組 React 節點（不用 `dangerouslySetInnerHTML`）；巢狀項目畫成內層 `<ul>`
  - `missed.length > 5` 且未篩選 → 只顯示最新 4 版＋「顯示較早的 N 個版本（vA – vB）」列
  - 載入中骨架（用 `--wb-sk`／`--wb-sk-hi`，規格 §9）、失敗狀態（不用紅色）
- 與 `NoteDrawer` 同時開：不互斥，後開的在上（規格 §6.4）

### 5. Palette「指令」分組（規格 §6.6）

- `Item` 改為 `{ key: string; href?: string; run?: () => void; node: ReactNode }`；Enter／點擊：`run` → `close()` 後呼叫；否則照舊導覽。`run` 項目忽略 ⌘／Ctrl
- `allGroups` 最後加 `{ label: "指令", items }`：
  - 「檢查更新」（`RefreshCw`）→ `requestCheckOnSettings()`；關鍵字 `檢查更新 版本 check update npm 升級`
  - 「查看更新內容」（`FileText`）＋ `Pill`「v{latest}」→ `openDrawer()`；`res` 非 `null` 時才列；關鍵字 `更新內容 changelog 版本 升級 update`
- 「指令」不依賴 `/wb-index.json`：`index` 為 `null` 時也要列出；「索引載入失敗」只在 `flat.length === 0` 時顯示

### 6. 樣式（`workbench.css`）

- 其餘 `.wb-upd-*` 規則（`tab-badge`、`hero`、`ver`、`pills`、`notes`、`cmds`、`dw`、`dw-f`、`sum`、`vlist`、`vh`、`vb`、`cat`、`code`、`more`、`skel`、`clerr`）照 handoff 數值，名稱由 `.upd-*` 改 `.wb-upd-*`
- `cal-` 規則之後、860px 媒體規則之前；手機規則併進 860px 區塊；`.wb-upd-dw{width:520px}` 與平板規則
- 規則只引用 `--wb-*`；`color-mix()` 兩端皆 `--wb-*`

## 要改的既有檔案

`src/components/wb/WbHeader.tsx`、`SettingsView.tsx`、`DrawerShell.tsx`、`Palette.tsx`、`src/components/wb/update/UpdateHost.tsx`、`src/lib/update-store.ts`、`src/styles/workbench.css`。新增 `src/components/wb/update/UpdateBlock.tsx`、`UpdateDrawer.tsx`、`UpdateChangelog.tsx`、`UpdatePills.tsx`、`UpdateNotes.tsx`、`UpdateCmds.tsx`。

## 驗收

以 `astro preview` 為準；registry 與 CHANGELOG 回應用 Network overrides 或暫時包 `fetch`。

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 六種情境 | handoff Tweaks 的已是最新／patch／minor／major／已棄用／需要 Node 22 | 開 `/settings?tab=about` | pills、提示框、設定列逐一對照 `NoteCraft 檢查更新 Spec.html`（扣掉部署站段落） |
| 尚未發佈 | override `latest` 比目前版本舊 | 同上 | pill「尚未發佈的版本」；無 toast、無圓點、無徽章 |
| CHANGELOG 三態 | 正常／throttle 慢速／jsDelivr 與 raw 都 404 | 開 Drawer | 內容／骨架／失敗＋GitHub 連結 |
| 備援 | 只讓 jsDelivr 404 | 開 Drawer | 從 raw 取得、內容正常 |
| 真實格式 | 用 repo 的 `CHANGELOG.md`，`missed = ["1.0.0"]` | 展開 | 導言段落出現；粗體、行內 code、巢狀清單正確；無 `<!--` |
| 切片 | cur 1.8.0、latest 1.8.5 | 開 Drawer | 只有 1.8.5 一段；標題「1 個版本」 |
| 摺疊 | `missed` 12 版 | 開 Drawer | 4 版＋「顯示較早的 8 個版本」；點開後全部列出 |
| 篩選 | 點「安全」chip | — | 只剩含安全項目的版本、全部展開、無摺疊；「清除篩選」回復 |
| 徽章 | 有新版 | 開 `/settings` | 「關於」旁徽章數字 = `behind`，色調與 Rail 圓點一致；略過後兩者同時消失 |
| 手動檢查 | 「關於」分頁 | 按「檢查更新」 | 焦點留在按鈕；`aria-busy`；完成後狀態行「剛剛檢查」；離線時一行字、保留上次資訊、無 toast |
| Palette | 在 `/notes` | ⌘K →「檢查更新」 | 導到 `/settings?tab=about` 並立即檢查 |
| Palette | 任一頁 | ⌘K →「查看更新內容」 | 不換頁、Drawer 開啟 |
| Palette | `/wb-index.json` 擋掉 | ⌘K 輸入「更新」 | 指令照樣列出 |
| 複製 | 指令列 | 按「複製」 | 剪貼簿正確；按鈕 1.6 秒「已複製」 |
| Esc | Drawer 開＋toast 顯示 | `Esc` | 只關 Drawer；再按才關 toast |
| 既有 Drawer | `/notes` 預覽筆記 | `Esc` 與焦點 | `NoteDrawer` 行為不變 |
| build | — | `npx tsc --noEmit && npx astro build && npm run check:upd && npm run check:wb` | 通過；tsc 錯誤數不增加 |

## 依賴

Task 114。

## 實作記錄（2026-10-03）

- 小元件（pills、提示框、升級指令、行內 Markdown）合併成一個 `UpdateParts.tsx`，不拆四檔；`SetRow` 從 `SettingsView` 移到 `ui.tsx` 共用
- build 期環境（版號、Node、GitHub blob 網址）抽成 `src/lib/update-env.ts`，layout 與 `settings.astro` 共用；專案沒有 `@types/node`，`process.versions` 經 `globalThis` 取，tsc 錯誤數維持 51
- 三個 island（`UpdateHost`、`SettingsView`、`Palette`）共用同一個 `useUpd` chunk（store 單例），build 產物已確認
- `DrawerShell` 加 `className`、`footer`、`closeLabel`、`ariaLabel`；`UpdateChangelog` 以 `cl.key + status` 為 key 重掛，CHANGELOG 載入後第一版才會預設展開
- Q4（目前版本較新）：版本列「目前 vX ・ npm 最新 vY」、pill 只留「尚未發佈的版本」（npm 版本不重複出現）
- 續行在畫面上照原換行顯示（`white-space:pre-line`），沒有照規格 §4.3 視為空白：CHANGELOG 的續行多是新的一句，分行比較好讀
- 全域樣式清掉了 `ul` 的項目符號，`.wb-upd-cat ul` 補 `list-style:disc`、巢狀 `circle`
- 實測（`astro preview` 1280×800，iframe 攔截 `fetch`）：major（7 版、假 CHANGELOG 含導言／安全／內部／巢狀／相對連結）、已是最新、目前版本較新、已棄用＋需要 Node 24、CHANGELOG 404、手動檢查失敗；Drawer 焦點在「關閉（Esc）」、Esc 只關 Drawer；略過／恢復與 Rail、徽章同步；Palette「指令」兩項、在 `/notes` 選「檢查更新」→ 導到 `/settings?tab=about` 並立即檢查；真實網路下 jsDelivr `@1.8.5` 404 → GitHub raw 200
