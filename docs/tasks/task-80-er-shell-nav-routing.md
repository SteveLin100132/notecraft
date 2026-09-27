# Task 80 — 外殼、導覽樹、路由與同步、localStorage 持久化

> 規格 [notecraft-er-docs.md](../notecraft-er-docs.md) §4.2、§5.3（導覽樹部分）、§6、§8.1、§8.2、§11.2；Q2、Q3、Q4、Q7 定案。
> 設計交付 README〈外殼〉〈Interactions & Behavior〉〈State Management〉；prototype `er/er-docs.jsx › ErDocs／ErNav`、`er/er.css`。
> 依賴 [Task 78](task-78-er-derive-compat-checks.md)。

## 範圍

本 Task 完成後：外殼、導覽、分頁都在，**Wiki 分頁先放佔位**（顯示目前 route 的文字，如「總覽」「schema · crm」「crm · customer」），Diagram 分頁放現有的 `ErDiagram`（尚無 scope）。Wiki 內容是 Task 81。

### 1. 外殼（`renderer.tsx`）

```
Shell（.erd-root.erd-shell）
├── Bar 44px：導覽開關｜Tabs（Wiki／Diagram）｜Crumb 或（Task 83 的範圍 pill）｜[embed] 展開全寬
├── Nav（navOpen 時）
└── Main
```

- class 一律 `erd-` 前綴、規則以 `.erd-root` 起頭；prototype 的 `erx-` 全數改名
- **高度**（Q3、Q4）：

  | mode | 外殼 | 捲動 |
  | --- | --- | --- |
  | `embed` | **580px**，**不畫外框與圓角**（`GeneratedFrame` 已有）；容器寬 ≤ 520px 改 `min(580px, 75vh)` | main 自己捲 |
  | `page` | **不設高度**，隨內容長高 | 由工作台 `#nc-scroll` 整頁捲；bar 與 nav `position: sticky` |
  | 全寬覆蓋層 | 佔滿視窗 | nav、main 各自捲 |

- page 模式的 sticky：bar `top: 0`；nav `top: 44px; align-self: flex-start; max-height: calc(100dvh - var(--erd-page-offset)); overflow: auto`。`--erd-page-offset` 實測工作台頁首 + Toolbar + stage 上方 padding 後定值（約 110px），寫在 CSS 字串開頭；**算錯只會讓導覽底部多留白或略短**
- bar **不顯示** `meta.title`（`GeneratedFrame` 標題列已有；page 模式工作台頁首已有）
- 全寬：把本來在 `renderer.tsx` 的 hold 卡 + 覆蓋層改成包住**整個外殼**；「展開全寬」按鈕搬到 bar 最右（gold pill，開啟後變 ghost「回到本文」）。畫布內原本的那顆拿掉。hold 卡文案照 v1.1
- `app` 端（`/view` 頁、`.nc-dv-stage`）**不動**

### 2. 導覽（`nav.tsx`）

- 篩選框：pill 30px；比對用 `matchTable()`（Q7）；有輸入時顯示 `命中/總數`，藍＝有、`--danger-500`＝0
- **只因欄位命中**的表：表列 label 位置改顯示命中欄名（mono、`--blue-700`），多於一欄為「`customer_id` …」，`title` 列全部
- 篩選時自動展開所有節點、隱藏無命中的 schema／分群
- 「總覽」項（home icon）
- **有 `schemas`**：`SCHEMAS  N` → schema 列（caret + db icon + `key` + label + 表數）→ 分群（左側 1px 垂直線、分群名）→ 表列
- **隱含模式**（§5.3）：區段標題改 `分群  N`，**直接從分群開始**，分群名改為可收合的列（caret + 分群名 + 表數）
- 收合狀態不持久化：page 全展開；embed 只展開 route 所在的 schema（隱含模式：route 所在的分群）
- `ungroupedTables`（Task 78）出現在「未分群」
- 目前 route 的節點在載入與換頁時 `scrollIntoView({ block: 'nearest' })`
- 選中樣式：底 `color-mix(in srgb, var(--blue-700) 10%, transparent)`、字 `--blue-700` 700；表列另加左側 2px `--orange-400` inset 陰影

### 3. 路由與同步（§6.2）

State：`route`、`tab`、`scope`、`focus`、`navOpen`（page 預設開、embed 預設關）、`wide`。
（`dgQuery`、`showHubEdges` 提升是 Task 83。）

| 動作 | 結果 |
| --- | --- |
| 導覽點總覽／Schema／Table（Wiki） | 換 route；捲動見下 |
| 導覽點總覽（Diagram） | route=overview、scope=null、清 focus |
| 導覽點 Schema（Diagram） | route=schema、scope=該 schema、清 focus |
| 導覽點 Table（Diagram） | route=table、focus=該表；scope 非 null 且不含它 → 切到它的 schema；scope 為 null → 不動 |
| 點 Diagram 分頁 | 依 route 投影：overview→null；schema→該 schema；table→該表的 schema + focus |
| Diagram 點卡片標頭聚焦 | focus + route=該表 |
| Diagram 取消聚焦（再點、點空白、Esc） | **只清 focus**，route 不動 |
| embed 且非全寬時點導覽項 | 換頁後收起導覽 |

原則：**Wiki route 是唯一真相**，scope／focus 由它投影；只有「取消聚焦」例外。

### 4. 捲動（§6.4）

| mode | Wiki 換頁時 |
| --- | --- |
| page | 外殼頂端已捲出視野 → `shell.scrollIntoView({ block: 'start' })`；否則不動 |
| embed、全寬 | main `scrollTop = 0` |

**不以 id 查 `#nc-scroll`**，交給瀏覽器找最近的捲動祖先。

### 5. 持久化（§6.3、Q2）

- key `erd:v1:<file.path>:<mode>`；存 `{ route, tab, scope }`
- **SSR 與首次 client render 一律預設值**（overview／wiki／null），`useEffect` 掛載後才讀、驗證、套用
- 驗證：route 指向不存在的 schema／table、隱含模式下的 schema route、tab 非兩者之一、scope 不存在 → 各自回退預設，不白屏
- 讀寫都包 `try/catch`

## 要改的既有檔案

`plugins/er-diagram-renderer/{renderer.tsx, diagram.tsx, styles.ts}`；新增 `nav.tsx`；`plugins/registry.json`（`files`）。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| v1.1 無 Schema 層 | `/view/schema-demo.er` | 看導覽 | 從分群開始，無「全部」節點；區段標題「分群 11」 |
| v1.2 三層 | 以 v1.2 範例另建一份測試資料檔（`src/content/notes/testing/er-v12.er.json`） | 看導覽 | `SCHEMAS 3` → crm／sales／core |
| 篩選命中數 | 同上 | 輸入 `customer` | 顯示 `n/14`（藍）；輸入 `zzz` → `0/14`（紅） |
| 欄位命中 | 同上 | 輸入某個只出現在欄位的名稱 | 表列顯示命中欄名 |
| page sticky | `/view/…`，長 Wiki 佔位頁（暫時灌長內容測） | 捲 `#nc-scroll` | bar 與導覽貼在頂端，導覽可獨立捲 |
| embed 高度 | 「資料檔內嵌測試」筆記 | 量外殼 | 580px、無雙框；導覽預設收 |
| 手機 embed | 375 寬 | 量外殼 | ≤ 75vh |
| 全寬 | embed | 點「展開全寬」 | 整個外殼進覆蓋層；原位 hold 卡；「回到本文」返回 |
| 同步 | Diagram 分頁 | 導覽點某表 | 聚焦該表；切回 Wiki 佔位顯示該表 |
| 持久化 | 在某表頁 reload | — | 閃一下總覽後回到該表；console 無 hydration 警告 |
| 殘留無效 route | localStorage 手改 route 為不存在的表 | reload | 總覽，不白屏 |
| Diagram 無回歸 | — | Task 77 驗收表的縮放、聚焦、搜尋、Esc | 全部相同 |
| 護欄 | — | `npx tsc --noEmit && npx astro build && npm run check-plugins` | 通過 |

## 依賴

Task 78。

## 實作記錄（2026-09-27）

- page 模式導覽的高度上限不寫死 offset：往上找最近的捲動祖先、量它的高度寫進 `--erd-scroll-h`
- 聚焦狀態與 Esc 監聽提升到外殼，畫布只透過 `escapeRef` 回報有無東西可退
- **踩到 hydration 失敗**：React SSR 會把 `<style>` 文字裡的 `>`、`"` 跳脫成實體，選擇器壞掉、island 退回 client render。改寫 CSS 並新增 `scripts/checks/er-styles.mjs` 把關
- 衍生欄徽章原用 `var(--warning-700)`，DS 沒有這個 token，改為 `--erd-warn-ink`
