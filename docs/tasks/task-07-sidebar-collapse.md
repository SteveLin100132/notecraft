# Task 07 — 側邊欄收合（Sidebar collapse）

> 對應 PRD v1.4.0 §7.1「側邊欄收合（Sidebar collapse）」、核心目標 #15。
> 桌面「完整 / icon 細條」可切換並記憶；平板 / 手機（≤ 1024px）預設 off-canvas 抽屜。

## 範圍

改 [Sidebar.astro](../../src/components/Sidebar.astro) 與 [BaseLayout.astro](../../src/layouts/BaseLayout.astro)。**vanilla JS + CSS，不引入 React island**。樣式遵循 trendlink-design。

## 斷點與行為

- **桌面 > 1024px**：Sidebar 常駐，可切換
  - 完整（預設）：248px
  - icon 細條：~56px，僅 icon；hover 顯示 tooltip；底部「待生成」卡縮為單一 icon
  - 偏好存 `localStorage`（`nc:sidebar` = `expanded` | `collapsed`）
- **≤ 1024px（平板 / 手機）**：預設收合為 off-canvas 抽屜
  - 內容區頂部顯示漢堡鈕；點擊滑出抽屜（完整樣式）+ 半透明遮罩
  - 點遮罩 / 點導覽項 / `Esc` → 關閉；開啟時鎖背景捲動
  - 抽屜開關為暫時狀態，不持久化

## 實作步驟

### 1. 結構與 class

- 在 `#nc-app`（BaseLayout）或 `<aside>`（Sidebar）掛狀態 class，例如 `data-sidebar="expanded|collapsed"`（桌面）與 `data-drawer="open|closed"`（行動）。
- Sidebar 內：
  - 頂部加「收合切換鈕」（桌面用，`aria-label`、`aria-expanded`）。
  - 每個導覽項：icon 永遠在、文字標籤在細條時隱藏（CSS）；細條時 hover 顯示 tooltip（可用 `title` 或自製 tooltip）。
- BaseLayout：
  - 內容區頂部加「漢堡鈕」（僅 ≤1024px 顯示，`aria-label`、`aria-expanded`）。
  - 加一層遮罩 `<div data-scrim>`（行動抽屜開啟時顯示）。

### 2. CSS（響應式 + 過渡）

- 桌面：`[data-sidebar="collapsed"] aside { width:56px } ... .nav-label{display:none}`，width 過渡 200–400ms ease-out。
- ≤1024px：`aside` 改為 `position:fixed;left:0;transform:translateX(-100%)`；`[data-drawer="open"] aside{ transform:none }`；遮罩 fade。
- `@media (prefers-reduced-motion: reduce)` 關閉 transition。
- 漢堡鈕：`@media (max-width:1024px){ display:inline-flex }` 否則隱藏；收合切換鈕反之（僅桌面顯示）。

### 3. FOUC 防閃動 inline script（`<head>`）

在 BaseLayout `<head>` 內加一段 `is:inline` script，於首次繪製前套上初始狀態，避免重整時版面跳動：

```html
<script is:inline>
  (function () {
    try {
      var collapsed = localStorage.getItem("nc:sidebar") === "collapsed";
      var mobile = window.matchMedia("(max-width: 1024px)").matches;
      var root = document.documentElement;
      // 行動裝置一律以抽屜收起呈現；桌面套用記憶偏好
      root.setAttribute("data-sidebar", collapsed ? "collapsed" : "expanded");
      root.setAttribute("data-drawer", "closed");
      if (mobile) root.setAttribute("data-mobile", "1");
    } catch (e) {}
  })();
</script>
```

（class / attribute 掛在 `documentElement` 或 `#nc-app`，CSS 選擇器對應即可。）

### 4. 行為 script（Sidebar 既有 `<script>` 擴充）

- 桌面切換鈕：toggle `data-sidebar`、寫入 `localStorage`、更新 `aria-expanded`。
- 漢堡鈕：toggle `data-drawer`；開啟時 `document.body.style.overflow="hidden"`，關閉時還原。
- 遮罩 / 導覽項點擊 / `Esc`：關閉抽屜。
- `matchMedia("(max-width:1024px)")` change：跨越斷點時重置（例如從手機轉桌面時關抽屜、套用桌面偏好）。

## 驗收（對應 PRD 驗收表）

- [ ] 桌面點切換鈕 → icon 細條、內容變寬、偏好寫入 localStorage
- [ ] 重整後維持 icon 細條且無明顯閃動（FOUC script 生效）
- [ ] ≤1024px 預設收合為抽屜、內容佔滿整寬、顯示漢堡鈕
- [ ] 漢堡開抽屜 + 遮罩；點遮罩 / 導覽項 / Esc 關閉；開啟時背景不捲動
- [ ] icon 細條時導覽 icon 可點、tooltip 正常，無導覽項無法存取
- [ ] `npx astro build` 通過

## 風險 / 備註

- FOUC：初始狀態務必在 `<head>` inline script 套用，勿等到 island hydration。
- a11y：切換鈕 / 漢堡鈕需 `aria-label` 與 `aria-expanded`；抽屜可鍵盤關閉。
- 跨斷點 resize 要重置狀態，避免桌面殘留抽屜開啟狀態。
