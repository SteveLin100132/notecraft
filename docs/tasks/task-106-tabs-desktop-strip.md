# Task 106 — 桌面頁籤列：layout 佔位、TabBar、頁籤 DOM、溢出、拖曳、樣式

> 規格 [notecraft-workbench-note-tabs.md](../notecraft-workbench-note-tabs.md) §3、§4.3、§5、§6.1、§6.2、§6.4、§10、§12.1；Q1、Q2 定案（§16）。
> 設計交付 README §1、§4、§5、「無障礙」；視覺定稿以 `prototype/wb/pt-tabs.css` 為準，行為對照 `pt-tabs.jsx` 的 `PtTabStrip`。
> 依賴 [Task 105](task-105-tabs-store-pure-functions.md)。

## 為什麼要有這一步

先讓頁籤「出現並能用」：開筆記會留下頁籤、點頁籤會換頁、✕ 能關、太多時能捲、能拖曳排序。右鍵選單、全部頁籤下拉、快捷鍵、捲動還原留給 Task 107；手機留給 Task 108。這一步的重點是**零位移**與**頁籤 DOM**：SSR 佔位要和 hydrate 後同高，頁籤是 `<a role="tab">` 並排 ✕ 按鈕（Q2）。

## 範圍

### 1. `WorkbenchLayout.astro`

- 新 prop：`tab?: TabSelf`（`import type` 自 `@/lib/wb-tabs`）
- `.wb-main` 的**第一個子元素**（在 `.wb-mburger` 之前）：

  ```astro
  <TabBar client:load self={tab ?? null} workspace={index.workspaceLabel} />
  ```

  TabBar 自己輸出 `<div class="nt-bar" data-pagefind-ignore>`；SSR 時只有空列（無頁籤、無空狀態文字、無 `.nt-all`）——hydrate 後才決定是頁籤還是空狀態提示，兩者同高 34px
- `bare`／非 `bare` 都輸出（規格 §3.1）
- 確認既有規則 `.wb-main>astro-island{display:contents}` 讓 `.nt-bar` 成為 flex 子項（`flex:0 0 34px` 生效）

### 2. 兩個頁面傳 `self`

| 頁面 | `tab` |
| --- | --- |
| `src/pages/notes/[...slug].astro` | `{ kind: "note", id: note.id, title: note.data.title, path: relPath, pending: pendingMarkers.length }` |
| `src/pages/view/[...path].astro` | `{ kind: "view", id: file.routePath, title: file.title, path: file.relPath, pending: 0 }` |

`path` 都是相對 notesDir 的真實路徑；`assertNoAbsolutePath` 不受影響（實作後 grep `dist/` 的 `$HOME` 確認）。

### 3. `src/components/wb/tabs/TabBar.tsx`（新增，island 入口）

- `useTabStore(workspace)`（`useSyncExternalStore` 包 Task 105 的 store；**SSR snapshot 回傳 `null`**，表示「還不知道」→ 只畫空列）
- 掛載後：
  1. `self` 存在 → `store.update(s => ensure(s, self, Date.now()))`；有 `evicted` → `toast(\`已達 20 個頁籤上限，關閉最久未用的「${title}」\`)`
  2. `store.setActive(self ? tabKey(self.kind, self.id) : null)`
  3. idle 校正（規格 §4.3）：`requestIdleCallback`（無則 `setTimeout(…, 300)`）→ `loadWbIndex()` → `refreshSnapshot` + `prune`。`exists`：`note` 查 `index.notes` 的 slug、`view` 查 `index.dataFiles` 的 `routePath`；`removed` 非空 → toast（一筆「筆記已不存在，對應頁籤已關閉」、多筆「{n} 篇筆記已不存在，對應頁籤已關閉」）。**載入失敗不 prune**
- 渲染 `<TabStrip>`；空清單渲染空狀態 `.nt-empty`（文案照 README §5）

### 4. `src/components/wb/tabs/TabStrip.tsx`（新增）

照 `PtTabStrip`，差異依規格 §6.2：

```tsx
<div className="nt-bar" data-pagefind-ignore>
  <div className={cx("nt-scrollwrap", fadeL && "fl", fadeR && "fr")}>
    <div className="nt-scroll" role="tablist" aria-label="已開啟的頁籤" ref={scrollRef}>
      {tabs.map(t => (
        <div className={cx("nt-tab", on && "on", t.pinned && "pinned", …)} data-key={t.key}
             draggable={fine} onDragStart… onDragOver… onDrop… onDragEnd…
             onMouseDown={e => e.button === 1 && e.preventDefault()}
             onAuxClick={e => e.button === 1 && (e.preventDefault(), close(t.key))}>
          <a className="nt-tab-main" role="tab" href={hrefOf(t)} draggable={false}
             aria-selected={on} tabIndex={focusKey === t.key ? 0 : -1}
             title={tooltip(t)} onClick={e => on && !modified(e) && e.preventDefault()}
             onKeyDown={roving}>
            <FileText size={13} … /> <span className="nt-t">{t.title}</span>
          </a>
          {t.pinned
            ? <span className="nt-pin" aria-hidden><Pin size={12} /></span>
            : <button className="nt-x" tabIndex={-1} aria-label={`關閉 ${t.title}`} onClick={() => close(t.key)}><X size={12} strokeWidth={2} /></button>}
        </div>
      ))}
    </div>
  </div>
  {/* .nt-all 留給 Task 107；本 Task 先輸出靜態的計數 pill（無下拉） */}
</div>
```

- 固定與一般之間插 `.nt-sep`
- `tooltip`：`{title}\n{path}` ＋ `pending > 0` 時 `\n待生成 AI 標記 {n}`
- 固定頁籤的 `<a>` 加 `aria-label="{title}（已固定）"`
- **關閉**（本 Task 只做 ✕ 與中鍵）：`neighborAfterClose` → `store.update(close)` →  若關的是 active：`location.assign(hrefOf(鄰居) ?? "/notes")`
- **roving tabindex**：`focusKey` 預設 active，否則第一個；`←/→` 循環、`Home/End`、`Space` 觸發 `<a>.click()`、`Delete/Backspace` 關閉（固定頁籤無作用）
- **溢出**：`.nt-scroll` 的 `scroll` 事件 + `ResizeObserver` 計算 `fadeL`（`scrollLeft > 2`）、`fadeR`（`scrollLeft + clientWidth < scrollWidth - 2`）；`wheel` 的 `deltaY` 轉水平，**只在有溢出時** `preventDefault`（掛 `{ passive: false }` 的原生 listener，React 的 onWheel 是 passive）
- **active 捲進可視區**：掛載與 active 改變時，以 `offsetLeft`／`offsetWidth` 計算、左右留 24px，直接設 `scrollLeft`；**不用 `scrollIntoView`**
- **拖曳**：`matchMedia("(pointer:fine)").matches` 才 `draggable`；`dragstart` 時 `dataTransfer.setData("text/plain", key)`、`effectAllowed = "move"`；來源加 `.dragging`、目標加 `.over`；`drop` → `store.update(s => move(s, from, to))`；跨區由 `move` 自己擋

### 5. `src/styles/workbench.css`

- `:root` 半透明色那段加 `--wb-a-blue-04: rgba(27,79,156,.04);  /* 頁籤 hover 底（規格 docs/notecraft-workbench-note-tabs.md §10） */`
- 移植 `pt-tabs.css` 中**桌面列**的規則（`.nt-bar`、`.nt-scrollwrap`、`.nt-scroll`、`.nt-tab` 各態、`.nt-x`、`.nt-pin`、`.nt-sep`、`.nt-empty`、`.nt-all` 的外觀）：
  - 位置：既有工作台規則之後、**第一個 `@media(max-width:860px)` 殼響應式區塊之前**（`grep -n "^@media(max-width:860px)" workbench.css` 取第一個行號）；區塊註解「筆記頁籤（規格 docs/notecraft-workbench-note-tabs.md）」
  - **零色碼**：全部改 token（對照表見規格 §10）；`#fff` → `--wb-panel`
  - 新增 `.nt-tab-main{display:flex;align-items:center;gap:6px;flex:1;min-width:0;height:100%;color:inherit;text-decoration:none;outline:none}`
  - README 的 `.nt-tab:focus-visible` 改為 `.nt-tab:has(.nt-tab-main:focus-visible)`
  - ✕ 的顯示條件加 `.nt-tab:has(.nt-tab-main:focus-visible) .nt-x`；`@media (pointer:coarse){.nt-x{opacity:1}}`
  - **不移植**：`.nt-dot` 系列（Q3：不顯示狀態小點）、prototype 的 demo 用規則
  - 選單、下拉、手機的規則留給 Task 107／108

## 要改的既有檔案

`src/layouts/WorkbenchLayout.astro`、`src/pages/notes/[...slug].astro`、`src/pages/view/[...path].astro`、`src/styles/workbench.css`。新增 `src/components/wb/tabs/TabBar.tsx`、`TabStrip.tsx`、`useTabStore.ts`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 開啟留頁籤 | 清空 `nc-tabs-v1:*` | 依序開 3 篇筆記、1 個資料檔 | 4 個頁籤；資料檔 icon 金色；最後開的是 active（頂端藍線、白底、✕ 常駐） |
| 插入位置 | 4 個頁籤、目前在第 2 個 | 從 Sidebar 開第 5 篇 | 新頁籤在第 2 個右邊 |
| 聚焦既有 | 同上 | 從列表雙擊已開的第 1 篇 | 不新增，第 1 個變 active |
| 點頁籤 | — | 點非 active 頁籤 | 整頁導覽到該篇；點 active 頁籤不重載 |
| ⌘／Ctrl＋點擊 | — | ⌘＋點頁籤 | 瀏覽器開新分頁，原頁不動 |
| 中鍵 | — | 中鍵點非 active 頁籤 | 該頁籤關閉；不開新分頁、不出現自動捲動游標 |
| 關 active | A B C、active B | 點 B 的 ✕ | 導覽到 C；再關 C → 到 A；再關 A → `/notes` |
| 非筆記頁 | 有頁籤時開 `/`、`/notes`、`/series`、`/plugins`、`/settings` | — | 頁籤列在、無 active、所有頁籤 `aria-selected="false"`；頁面本身未新增頁籤 |
| 空狀態 | 清空 store，開 `/notes` | — | 34px 提示列，無 `.nt-all` |
| 零位移 | 有 5 個頁籤，開任一筆記 | 錄 Performance 或比較 hydrate 前後 `#nc-scroll` 的 `getBoundingClientRect().top` | 相同（CLS 0） |
| SSR | `astro build` 後看 `dist/notes/<任一>/index.html` | — | `.nt-bar` 存在、內部無 `.nt-tab`、帶 `data-pagefind-ignore` |
| 溢出 | 開 15 個 | — | 頁籤縮到 120px 後水平捲動；左右漸層隨捲動出現；滾輪可水平捲；active 在可視區 |
| 上限 | 開到第 21 個未固定 | — | 最久未用的被關、toast 出現（Toast 佇列生效） |
| 拖曳 | 桌面 | 拖第 1 個到第 3 個 | 順序改變並持久化；重新整理後維持 |
| 失效 | dev 手動刪一篇已開的筆記 MDX（不透過刪除按鈕） | 換到任一頁 | idle 後該頁籤消失、toast「筆記已不存在…」 |
| 鍵盤 | Tab 進頁籤列 | `←/→`、`Home/End`、`Space`、`Delete` | 照 §4 的行為；只有一個頁籤 `tabindex=0` |
| 零色碼 | — | `awk` 排除 `:root` 後 grep hex／rgba 於 `workbench.css` | 0 筆 |
| build | — | `npx tsc --noEmit && npx astro build` | 通過；tsc 錯誤數不增加；`grep -r "$HOME" dist/` 0 筆 |

## 依賴

Task 105。

## 實作記錄（2026-10-01）

- 頁籤 DOM 照 Q2；溢出、遮罩、滾輪橫捲、roving tabindex、`pointer:fine` 拖曳都照範圍
- `.nt-bar` 由 island 自己輸出，SSR 是空元素；1280 寬實測 hydrate 前後 `#nc-scroll` top 都是 103px、CLS 0
- 一開始把每個頁籤包在多一層 div 裡，會讓頁籤的 flex 縮放失效，改成 keyed Fragment
- 建置時發現與本功能無關的既有問題：`PluginView.astro` 把 renderer 的本機絕對路徑 inline 進內嵌資料檔的筆記頁。另開工作處理
