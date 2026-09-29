# Task 89 — Dashboard：最近更新（時間軸）與更新日誌

> 規格 [notecraft-workbench-dashboard.md](../notecraft-workbench-dashboard.md) §6.2、§6.5、§6.6、§8、§10；Q1、Q2、Q6 定案；
> 列的 DOM 規則見 [notecraft-workbench.md](../notecraft-workbench.md) §8.2.1（Q27）。
> 設計交付 README §4、§7；原始碼 `source/pt-dash2.jsx` 的 `DvTimeline`、`DvLog`。
> 依賴 [Task 87](task-87-dashboard-foundation.md)。可與 Task 88、90 並行。

## 範圍

### 1. 兩處列的共同 DOM（規格 §1.3 刻意偏離 prototype）

prototype 的節點與事件卡各是一顆大 `<button>`。正式版照 §8.2.1：**容器內並排主區按鈕與常駐開啟連結，不巢狀**。

```
<div class="dv-tl-node [sel]">                                  ← 容器（時間軸）／ <div class="dv-ev [sel]">（日誌）
  <button type="button" class="wb-row-main" data-wb-rowfocus aria-pressed={sel} {...rowHandlers(slug, onSelect)}> … </button>
  <a class="wb-row-open" href="/notes/<slug>" aria-label="開啟筆記：<標題>" onClick={stopPropagation}>→</a>
</div>
```

- `rowHandlers` 來自 `NoteRow.tsx`（單擊 Drawer、雙擊開啟、Enter 開啟、`⌘/Ctrl`＋點擊與中鍵開新分頁、↑↓ 在 `[data-wb-rowfocus]` 之間移動）
- hover 底色、圓角、padding 從 prototype 的 button 搬到容器（Task 87 的 CSS 已處理 `.wb-row-main` 的多行覆寫）
- 選取態：`sel === slug` 時容器加 `.sel`（底色 `--wb-a-blue-08`，與 `.wb-row.sel` 同）

### 2. `Timeline.tsx`（最近更新）

- `rows.slice(0, 7)`；副標「最新 N 篇」；右上 `<a className="dv-link" href="/notes">查看全部</a>`
- 節點四行：標題（13px/600 單行省略）→ 路徑 `r.path`（mono）＋日期 `mdShort(r.updatedAt)` → 描述（有才顯示，1 行 clamp）→ meta
- meta：前 2 個 `.dv-tag`、`+N`、最右 `.dv-ai`「AI 已生成/總數」（`markerCounts`；有待生成 → 加 `.warn`，顏色 `--wb-warn-ink`）；沒有標記不出
- 圓點 `.dv-tl-dot`：不帶 inline `--c`（Q1）
- 全部是 build 期值，SSR 完整畫；沒有筆記 → 「尚無筆記」
- `description` 只有前 7 筆有（Task 87 的 props）

### 3. `UpdateLog.tsx`（更新日誌）

- state：`off`（週位移，0 = 本週）、`pick`（`YYYY-MM-DD` 或 `null`）；`go(d)` 時 `setPick(null)`
- 窗：`weekWindow(off, now)`；`inWeek = rows.filter(r => days.includes(r.updatedAt.slice(0,10)))`；`list = pick ? inWeek.filter(r => r.updatedAt.startsWith(pick)) : inWeek`
- 副標：`${off ? "該週" : "本週"}共更新 ${inWeek.length} 篇筆記`
- 週導覽 `.dv-week-nav`：`<button aria-label="上一週">`、「**7 天**・M/D – M/D」、`<button aria-label="下一週" disabled={!off}>`；圖示 `lucide-react` 的 `ChevronLeft`／`ChevronRight` 15px
- 日期列 `.dv-days`：7 顆 `<button aria-pressed={pick === s}>`，`<b>` 兩位數日期、`<span>` 星期（日一二三四五六）；有更新加 `.has`
- 清單 `.dv-log-list`：事件卡 `.dv-ev`（DOM 見 §1）；第一行 7px 圓點＋標題；第二行 `mdShort`｜系列名（`BookOpen` 11px，藍色純文字，有才顯示、可省略）｜`Tag` 11px＋標籤數｜`Sparkles` 11px＋`AI x/y`
- 空清單：「這段期間沒有更新的筆記」
- 底部 `<a className="dv-full" href="/notes">查看全部筆記</a>`
- **SSR／`now=null`**：副標「共 — 篇」、週導覽文字「—」、7 顆日期格 `<b>` 空、**清單與空文案都不輸出**

### 4. `Overview.tsx`

Row 2 左欄放 `<Timeline …/>`、右欄放 `<UpdateLog …/>`；`sel`／`onSelect` 由 `DashboardWorkbench` 傳入。

## 要改的既有檔案

`src/components/wb/dashboard/Overview.tsx`。新增 `Timeline.tsx`、`UpdateLog.tsx`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| Drawer | — | 單擊時間軸節點主區 | Drawer 開啟；Network 出現一次 `wb-index.json`；再點同一列關閉 |
| 開啟 | — | 雙擊／Enter／點 `→` | 進 `/notes/<slug>`；`⌘`＋點擊、中鍵開新分頁 |
| 鍵盤 | focus 在第 1 個節點 | ↓ | 到第 2 個；越過末端進日誌卡片的列 |
| HTML 合法 | — | 檢查 DOM | `<a>` 不在 `<button>` 內；每列恰有一個 `wb-row-open` |
| 前 7 筆 | 有 10 篇以上 | — | 時間軸恰 7 個節點、依 `updatedAt` 遞減、第 7 個之後不出現 |
| 描述 | 第 3 篇有 description | — | 顯示 1 行、超出省略 |
| 週窗 | 系統日期固定 | 開 `/` | 日期列最後一格是今天；「下一週」停用 |
| 切週 | 點「上一週」 | — | 7 格往前一週、`pick` 清空、副標改「該週」；「下一週」可用 |
| 日篩選 | 點某個 `.has` 的日 | — | 清單只剩該日；再點一次取消；副標數字不變 |
| 空週 | 切到沒有更新的週 | — | 「這段期間沒有更新的筆記」；日期格無金點 |
| 佔位 | view-source | — | 日誌無清單、無空文案；週導覽「—」 |
| 卡內捲動 | 視窗高 800、當週 12 篇 | — | 日誌清單在卡內捲動，整頁不捲；hover 卡片才出現捲動列 |
| 系列名 | 該筆記在系列裡 | — | 第二行顯示藍色系列名＋書本圖示；不在系列則整段不出 |

## 依賴

Task 87。

## 實作記錄（2026-09-29）

- `Timeline.tsx`／`UpdateLog.tsx`；兩處列沿用 `NoteRow.tsx` 的 `rowHandlers` 與 `OpenLink`，容器加 `.sel`；`document.querySelectorAll('button a, a a, a button')` 為 0
- 日誌卡標題多包一層 `<span>` 才會出省略號（prototype 是直接裁掉）
- SSR：日誌不輸出清單與空文案、週導覽「—」、日期格空 `<b>`（CSS 補 `min-height:1.2em` 免跳動）；正式 build 的 HTML 確認無 `class="dv-ev`
- 實測：上一週 → 9/16–9/22、副標「該週共更新 2 篇」、22 日有金點、「下一週」啟用；點日期只剩該日；點時間軸節點開 Drawer 且 Network 只有一次 `wb-index.json`
