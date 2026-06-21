# Task 20 — Code annotations（互動式編號標記）

> 對應 PRD v1.7.0 §7.1「程式碼區塊增強」第 5 項。
> 依賴 [Task 17](task-17-expressive-code-foundation.md)（EC 底座）**與** [Task 14](task-14-markdown-directive-admonitions.md)（`remark-directive` 底座）。

## 範圍

類 Material for MkDocs 的可展開程式碼註解：程式碼中的 `(n)` 編號標記 → 可點按鈕，點擊展開後續編號清單對應項的說明。

- 以 **`:::annotate` 容器**（重用 Task 14 的 `remark-directive` 底座）顯式配對「程式碼區塊 + 緊接的編號清單」。
- 自訂 transform / rehype：將 EC 輸出中的 `(n)` 標記轉為可聚焦按鈕，與清單第 n 項配對為彈出說明。
- 互動以**框架無關 vanilla JS**（同 [Content tabs](task-15-content-tabs.md) / 側邊欄收合）+ ARIA + 漸進增強。

## 語法

````mdx
:::annotate
```py
def handler(req):  # (1)
    return ok(req)  # (2)
```

1. 進入點，校驗請求格式。
2. 回傳標準成功包裝。
:::
````

## 實作步驟

### 1. 配對（remark transform）

- 走訪 `containerDirective` 且 `node.name === "annotate"`：取容器內的 `code` 節點與緊接的 `list`（有序）節點配對；標記容器 class（如 `nc-annotate`）。
- 邊界處理：容器內缺程式碼或缺清單 → build log 警示、回退為一般渲染，**不中斷 build**。

### 2. 標記轉換（rehype，於 EC 渲染之後）

- 在配對容器內的已渲染程式碼 HTML 中尋找 `(1)`、`(2)`… 標記文字，替換為可聚焦按鈕（`<button class="nc-anno-marker" aria-expanded="false" aria-controls="…">n</button>`）。
- 清單第 n 項 → 對應彈出說明節點（`id` 與按鈕 `aria-controls` 對應）。
- **標記數與清單項數不一致** → build log 警示；多餘標記不可點（或回退純文字），缺對應標記的清單項照常顯示（PRD 卡控機制）。

### 3. 互動（vanilla JS，框架無關）

- 點擊 / Enter / Space 開啟對應說明，Esc 關閉；切換 `aria-expanded`；可考慮原生 `popover` / `popovertarget`。
- **漸進增強**：JS 未載入時，標記與編號清單仍依序可讀，內容不遺失。
- 動效 200–400ms ease-out，尊重 `prefers-reduced-motion`。

### 4. 樣式（遵循 trendlink-design）

- 標記圓鈕與彈出泡泡色票 / 圓角 / 陰影取 token，**不硬編色碼**；圓鈕優先 `--radius-pill`。

## 驗收（對應 PRD 驗收表）

- [x] `:::annotate` 內 `(1)` 標記 → 點擊 / focus 展開第 1 項說明；`aria-expanded` 正確；Esc 可關
- [x] 停用 JS → 標記與編號清單仍依序可讀，內容不遺失（漸進增強）
- [x] 標記數與清單項數不一致 → build log 警示，build 不中斷
- [x] 鍵盤可操作（Enter/Space 開、Esc 關），具適當 ARIA
- [x] 正式環境渲染一致，無執行時 API
- [x] `npx tsc --noEmit && npx astro build` 通過

## 風險 / 備註

- **時序關鍵**：標記替換需在 EC 完成程式碼 → HTML 之後執行（rehype 階段或 EC plugin 的 postprocess hook）；確認 `(n)` 不被語法高亮拆散成多個 token 而難以比對（必要時放在註解中、以容錯的文字 / regex 比對）。
- 與一般有序清單區分：僅 `:::annotate` 容器內的清單才視為註解來源，避免誤配（PRD §待釐清 Q3 已收斂為顯式容器）。
- 與 [AI 標記區塊](../../docs/notecraft-prd.md) 正交：不進 `generated/`、不經 Subagent。
