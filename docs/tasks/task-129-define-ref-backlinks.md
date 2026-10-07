# Task 129 — 反向連結：`/wb-index.json`、筆記頁入口與 Drawer、NoteDrawer 三段、Palette 定義群組

> 規格 [notecraft-workbench-define-ref.md](../notecraft-workbench-define-ref.md) §8、§9。
> 像素級規格：[design_handoff_workbench_define_ref/README.md](../prototype/design_handoff_workbench_define_ref/README.md) §4。
> 前置：Task 126（索引）。可與 Task 127、128 平行，但依序 commit。

## 為什麼要有這一步

define 旁的「被 N 篇引用」只回答單一定義的影響範圍。作者要改一篇來源筆記前，需要整篇的總覽；在工作台列表與 Palette 也要能直接查到定義在哪裡、被誰用。

## 範圍

### 1. 型別與索引

- `src/lib/wb-types.ts`：新增 `WbRefKind`、`WbDef`；`WbNoteRow` 加 `defines`、`references`；`WbIndex` 加 `defs`（規格 §9）
- `src/lib/workbench.ts`：由 `getDefIndex()` 填入；**不含原始碼、渲染內容、檔案路徑**
- 既有使用 `WbNoteRow` 的地方，缺欄位一律視為 `[]`
- `assertNoAbsolutePath` 照常把關序列化結果

### 2. 筆記頁入口與 Drawer

- `src/components/wb/RefBacklinks.tsx`（新增）：放進 `[...slug].astro` 的 `actions` slot（`client:idle`），只在本篇任一 define 被引用時掛載
  - 按鈕「被引用 **N**」（`.wb-btn-ghost`＋corner icon，`aria-haspopup="dialog"`、`aria-expanded`、開啟時 `.on`）
  - Drawer 用 `DrawerShell`：crumb、標題「被 N 篇筆記引用」、「K 個定義被引用」pill、說明、篩選 chips（≥2 個被引用的定義才有，`aria-pressed`）、清單 `.nc-bl-list`（Drawer 內一律單欄）、圖例
  - 監聽 `nc-backlinks-open` 事件；網址帶 `?backlinks=1` 時自動開啟並以 `replaceState` 移除參數
  - 點列：關閉 Drawer、前往該筆記；Esc／✕ 關閉後焦點還給觸發按鈕
- meta 列（`[...slug].astro`，更新日期與閱讀進度之後）：SSR 輸出 `button.rf-bl-meta[data-nc-bl-open]`「被 **N** 篇筆記引用」，點擊時 dispatch `nc-backlinks-open`
- 數字在 build 期決定，SSR 不需要佔位；清單資料由 build 期 props 帶入（只帶本篇用到的部分，不必讀 `/wb-index.json`）
- 正文底部、TOC **都不放**反向連結

### 3. `src/components/wb/NoteDrawer.tsx`

在「摘要」之後加三段（handoff §4.2），三段都沒資料時 Drawer 與現在相同：

1. **被引用 N**：前 3 筆（`.wb-marker.link`）、每筆最多 2 個 id chip＋「+N」；超過 3 篇時「開啟筆記看全部 N 篇 ↗」→ `/notes/<slug>?backlinks=1`
2. **本篇定義 N**：label＋id、右側「被 N 篇引用」或「尚未被引用」；點擊前往 `#def-<id>`
3. **引用的定義 N**：kind icon、label＋id、右側來源筆記標題；點擊前往來源 define

### 4. `src/components/wb/Palette.tsx`

- 有輸入時最上方加「定義」群組（最多 6 筆），比對 id 的任一段或 label（不分大小寫）
- 列：hash icon、id（mono 12.5px）、「label · 來源筆記」、muted pill「被 N 篇引用」或「未被引用」
- Enter：有定義命中時優先前往第一個定義，否則沿用既有順序
- 空查詢時底部加提示文案（handoff §4.3）
- 資料來自既有的 `/wb-index.json` 延遲載入，不新增請求

### 5. 樣式（`workbench.css`）

`.rf-bl-*`、`.nc-bl*`、Drawer 三段、Palette 定義群組。只引用 `--wb-*` token、不寫色碼。860px 規則放在既有媒體規則之前。

## 要改的既有檔案

`src/lib/wb-types.ts`、`src/lib/workbench.ts`、`src/pages/notes/[...slug].astro`、`src/components/wb/NoteDrawer.tsx`、`src/components/wb/Palette.tsx`、`src/styles/workbench.css`。新增 `src/components/wb/RefBacklinks.tsx`。

## 驗收

規格 §15 的第 11–13 項，另加：

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 入口 | 系統 Overview（有被引用） | 開頁 | 頁首與 meta 列都有入口，數字一致 |
| 無入口 | 請假功能規格（沒有 define） | 開頁 | 沒有任何反向連結入口 |
| chips | Overview 的 Drawer | 點 `hr.role-manager` chip | 只列引用它的筆記；「全部」恢復 |
| 列表 Drawer | `/notes` 點 Overview 列 | 開 Drawer | 三段摘要正確 |
| 帶參數 | NoteDrawer「開啟筆記看全部」（規模 fixture） | 點擊 | 開筆記並打開 Drawer，網址參數已移除 |
| Palette | — | 輸入 `hr.` | 定義群組最多 6 筆；Enter 前往並 flash（需 Task 128） |
| 路徑 | — | `astro build` | `/wb-index.json` 不含本機路徑與 define 原始碼 |
| build | — | `npx tsc --noEmit && npx astro build` | 通過；tsc 錯誤數不增加 |

## 依賴

Task 126。Palette 的 flash 需要 Task 128。

## 實作記錄（2026-10-07）

- `WbNoteRow` 加 `defines`、`references`，`WbIndex` 加 `defs`（`id`／`label`／`slug`／`refs`）；`/wb-index.json` 不含原始碼與路徑（build 後檢查 `source` 字串不存在）
- 筆記頁：`RefBacklinks`（頁首按鈕＋Drawer，portal 到 `#nc-main`）；meta 列的 SSR 按鈕以 `nc-backlinks-open` 事件交給它，兩顆按鈕的 `aria-expanded` 同步。清單由 `[...slug].astro` 以 build 期資料帶入，不讀 `/wb-index.json`
- `Icon.astro` 新增 `cornerDownRight`（meta 列的 icon）
- `NoteDrawer` 三段：只在該列有 `defines` 或 `references` 時才 `useWbIndex(true)`（與 Palette 共用同一次請求）；沒資料時 Drawer 與原本相同
- Palette：「定義」分區排在最上方（含「已開啟的頁籤」之前），所以 Enter 預設就是第一個定義；空查詢時底部顯示提示。既有 Palette 已有 ↑↓ 選取（handoff §4.3 的「後續建議」已存在）
- 瀏覽器實測（dev）：Overview 的頁首與 meta 列入口皆開 Drawer、7 個 chips、篩選正確、關閉後 `aria-expanded` 還原；請假功能規格沒有入口；`?backlinks=1` 自動開 Drawer 並移除參數；`/notes` 列表 Drawer 出現「被引用 2」「本篇定義 7」；Palette 輸入 `hr.` 出現 6 筆定義、第一筆選取中
- tsc 錯誤數 40 不變
