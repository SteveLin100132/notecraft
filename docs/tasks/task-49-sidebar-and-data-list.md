# Task 49 — 側邊欄第六項與資料檔清單頁

> 設計交付 [design_handoff_plugin_system](../prototype/design_handoff_plugin_system/) §2、§3；
> 規格 [§7.5](../notecraft-plugin-system.md)（Q6 定案：側邊欄獨立一區）。
> 依賴 [Task 47](task-47-plugin-build-resolution.md)。

## 範圍

### 1. 側邊欄第六項

在既有五項（總覽 / 筆記 / 系列 / 標籤 / 關於）之後加 **`資料 / Data`**，lucide `Database`，
href `/view`。項目結構與既有完全相同（icon + 中文 `flex:1` + 英文 11px/600/`.05em`/opacity .55）。

**命名理由**（設計交付的提案，已定案）：使用者點進去看到的是內容（一份 schema、一份路線圖），
不是外掛管理介面。「Plugins」講的是機制，未來真要做 plugin 安裝管理時那個名字才該留給它。
`Database` 與既有 `FileText`（筆記）在 20px 下輪廓差異夠大，且不與 `layers`（系列）混淆。

收合狀態：寬度 72px、隱藏 `.nc-sb-label`、按鈕 `justify-content:center`、`title` 帶「中文 英文」；
頂部收合／展開鈕用 lucide `PanelLeft`。寬度轉場 `--duration-normal --ease-out`，同步更新 `--nc-sb`。

> 既有側邊欄已有收合機制（Task 07），本 Task **只加一項、不重做收合**。
> 若既有收合鈕不是 `PanelLeft`，以既有為準、不要為了對齊原型而改動。

### 2. 資料檔清單頁 `/view`

`PageHead`：eyebrow `DATA`、標題「所有資料檔」、
副標「N 個資料檔 · 由 M 個 plugin 渲染 · 依檔案 mtime 倒序」。

**plugin 篩選**：`plugins.length > 1` 才渲染整條 filter row（膠囊按鈕，選中 `--blue-50` 底
+ `--blue-500` 邊，帶筆數）。**只裝一個 plugin 時不要渲染任何佔位** —— 空的篩選列比沒有更糟。

每列用既有 list 卡片樣式（`padding:16px 20px`）：
icon 方塊 → 標題 16.5/700 + 單行截斷描述 → 右側 mono 路徑、plugin 膠囊、`Clock` + 相對時間、`ChevronRight`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 單一 plugin 不出現篩選 | 只裝 1 個 plugin | 開 `/view` | 整條 filter row 不存在（非 disabled、非隱藏佔位） |
| 多 plugin 可篩 | 裝 3 個 plugin | 點某個膠囊 | 只留該 plugin 的資料檔，筆數正確 |
| 收合態可辨識 | 側邊欄收合 | hover 第六項 | `title` 顯示「資料 Data」 |
| 無資料檔 | 專案無 `plugins.json` | 側邊欄 | 第六項不出現（或導向空狀態，二擇一並記錄理由） |

## 依賴

Task 47。

## 待決

專案完全沒有資料檔時，側邊欄第六項要**不顯示**還是**顯示並導向空狀態**？
設計交付未涵蓋。建議不顯示（與既有「沒有系列就不顯示系列導覽」的慣例一致），實作時確認。

## 實作記錄（2026-09-18）

`Sidebar.astro` 第六項「資料 Data」（lucide `Database`，放在標籤之後、關於之前）、
`src/pages/view/index.astro`、`src/components/islands/DataFilesList.tsx`。
`Icon.astro` 新增 `database` / `fileJson` / `plug` / `alert` 四個圖示。

- 篩選列只在 `plugins.length > 1` 時渲染，一個 plugin 時整條不存在
- 待決項（沒有資料檔時第六項要不要顯示）**採「顯示並導向空狀態」**：
  空狀態頁把「資料檔是什麼、怎麼開始」講清楚並附安裝指令，比讓入口憑空消失好解釋
