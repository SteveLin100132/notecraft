# Handoff：NoteCraft 工作台 — 空狀態插圖（更新日誌／AI 佇列）

## Overview
為兩處沒有資料的畫面加入插圖式空狀態，取代原本單行文字：
1. 總覽儀表板「更新日誌」卡片：所選週（或所選日期）沒有更新的筆記時。
2. 「AI 佇列」分頁：沒有任何待生成的 `@ai-visualize` 標記時。

兩者共用同一個元件 `PtEmpty`（插圖 + 標題 + 說明 + 選用按鈕）。

## About the Design Files
本資料夾內的檔案是**以 HTML 製作的設計參考**，展示預期外觀與行為，**不是要直接上線的程式碼**。請在目標 codebase 既有的環境（React 等）中，依既有元件、樣式與資料層慣例重新實作。

## Fidelity
**High-fidelity。** 插圖、顏色、字級、間距皆為最終版本，請精確還原。

---

## 共用元件 `PtEmpty`
Props：`kind: "log" | "ai"`、`title: string`、`sub?: string`、`action?: ReactNode`

結構（`.pt-empty`）：`display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; gap:6px`
- 插圖 SVG 132×104，下方 margin 8px
- 標題 `.pt-empty-t`：14px / 700，`--wb-ink`
- 說明 `.pt-empty-s`：12.5px，line-height 1.7，`--wb-ink-3`，`max-width:280px`，`text-wrap:pretty`
- 按鈕 `.pt-empty-btn`（選用）：margin-top 10px、高 32px、padding 0 16px、**全圓角 pill**、1px `--wb-line` 邊框、背景 `--wb-panel`、12.5px / 700、文字 `--wb-blue-l` #2c6ebb；hover 背景 `--wb-bg`、邊框 #9dbde6

Padding 依情境：
- 預設 `28px 16px`
- 放在分頁內容區 `.wb-body` 裡：`72px 16px`
- 放在更新日誌清單裡：`8px 16px`（見下方）

### 插圖（inline SVG，viewBox 0 0 132 104，stroke 圓頭圓角）
共用色：藍 `--wb-blue-l` #2c6ebb、橘 #ed9b26、線色 `--wb-line`、底 `--wb-panel`。兩張插圖底部都有地面陰影 `ellipse cx66 cy94 rx42 ry5`，填 `--wb-line`，opacity .7。

**`kind="log"`：日曆 + 時鐘**
- 日曆本體 `rect x30 y20 w66 h66 rx8`：底 panel、2px 藍框；表頭分隔線 y=36；兩個掛環 `M44 14v12`、`M82 14v12`（2.4px）
- 格子 4 欄 × 3 列，每格 7×6、rx1.5，填線色；原點 (40,45)，欄距 12.5、列距 12
- 右下時鐘 `circle cx96 cy74 r14`：底 panel、2.2px 橘框；指針 `M96 67v7l5 3`
- 裝飾：右上四角星（橘，實心）；左側小圓點 r2.2（藍，opacity .5）

**`kind="ai"`：文件堆疊 + 完成勾勾**
- 後層文件 `rect x30 y22 w60 h66 rx7`，2px 線色框，旋轉 -6°（中心 60,55）
- 前層文件 `rect x40 y16 w60 h68 rx7`，2px 藍框；三條文字線 `M50 32h26 / M50 42h40 / M50 52h32`（3px 線色）
- 勾勾徽章 `circle cx90 cy72 r15` 實心藍；白色勾 `M83.5 72.5l4.5 4.5 8.5-9`（2.6px）
- 裝飾：兩個橘色十字星（右上、左側）、一個橘色小圓點

完整 path 請見 `source/pt-dash.jsx` 的 `PtEmptyArt`。插圖是設計階段自繪的示意；如有品牌正式插畫可替換，但請維持 132×104 尺寸與藍 / 橘配色。

---

## 1. 更新日誌空狀態（`DvLog`，`source/pt-dash2.jsx`）
- 條件：`list.length === 0`（依週位移 `off` 與選中日期 `pick` 篩選後）
- 文案：
  - 標題：「這段期間沒有更新的筆記」
  - 說明：本週（`off === 0`）→「本週還沒有動靜，寫下第一篇吧。」；過去週 →「切換到其他週看看，或回到本週。」
  - 無按鈕（卡片底部已有「查看全部筆記」）
- **不可出現捲軸**：空狀態時清單容器加上 `is-empty` class
  - `.dv-log-list.is-empty{overflow:hidden; justify-content:center}`
  - 內部 `.pt-empty{padding:8px 16px; margin:0; min-height:0}`、SVG `flex:none`
  - 清單仍是 `flex:1 1 0`，所以空狀態會在卡片剩餘高度中垂直置中，高度與卡片一致，不另外撐高

## 2. AI 佇列空狀態（`PtAiQueue`／AI 佇列分頁，`source/pt-dash.jsx`）
- 條件：`ptPending().rows.length === 0`
- 位置：分頁內容區 `.wb-body.flush` 內，取代列表
- 文案：
  - 標題：「AI 佇列已清空」
  - 說明：「所有 @ai-visualize 標記都已生成完成。新增標記後會出現在這裡。」
  - 按鈕：「前往筆記」→ `onRoute("notes")`
- 連動：佇列為空時，頂部「待生成」徽章、總覽的「AI 待生成」KPI 等所有讀取 `ptPending()` 的地方都會顯示 0

## Prototype 檢視方式
- 開啟 `prototype/NoteCraft-Workbench.html`
- **更新日誌空狀態**：總覽 → 更新日誌 → 用左箭頭切到沒有更新的週，或點選沒有金色圓點的日期
- **AI 佇列空狀態**：打開 Tweaks 面板 →「環境」區塊 → 開啟「AI 佇列清空（空狀態）」，再切到「AI 佇列」分頁
  - 這個開關只是 prototype 的展示用（`window.__ptAiEmpty` 讓 `ptPending()` 回傳空陣列），正式實作不需要，由真實資料決定即可

## State Management
不需要新增 state。空狀態完全由現有資料推導：
- 更新日誌：`off`、`pick` → 篩選後 `list`
- AI 佇列：所有 marker 中 `status !== "generated"` 的筆記清單

## Design Tokens
| Token | Light | Dark |
|---|---|---|
| `--wb-blue-l` | #2c6ebb | — |
| `--wb-gold`（插圖橘） | #ed9b26 | — |
| `--wb-panel` | #ffffff | #1a202b |
| `--wb-bg` | #f6f8fb | #12161f |
| `--wb-line` | #e1e6ee | #2a323f |
| `--wb-ink` | #161c28 | #eef2f7 |
| `--wb-ink-3` | #6c798e | #8b98ab |
| hover 邊框 | #9dbde6 | — |

插圖使用 CSS 變數上色，因此深色模式會自動套用（底色 panel、線色 line）。字型 Noto Sans TC（TrendLink 聯和趨動 Design System）；codebase 若已有品牌 token 請對應使用。

## Assets
- 兩張插圖為 inline SVG，無點陣圖
- 無新增圖示

## Files
- `prototype/NoteCraft-Workbench.html`：完整工作台 prototype（單一檔案，可離線開啟，含 Tweaks 切換）
- `source/pt-dash.jsx`：`PtEmptyArt`、`PtEmpty`、空狀態樣式注入、AI 佇列分頁
- `source/pt-dash2.jsx`：`DvLog`（更新日誌空狀態）
- `source/pt-dash2.css`：`.dv-log-list.is-empty` 規則
- `source/pt-data.jsx`：`ptPending()` 資料來源
- 儀表板其他部分的完整規格請見既有的 `design_handoff_workbench_dashboard/README.md`
