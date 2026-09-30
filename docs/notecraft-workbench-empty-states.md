---
Project Name: NoteCraft Workbench — 空狀態插圖（更新日誌／AI 佇列）
文件類型: Design Document
文件版本: v0.2.0
開發模式: Waterfall
技術選型: 確定（沿用既有技術棧，不新增套件；插圖為 inline SVG）
文件狀態: 已實作（notecraftapp v1.5.1，Task 96–97，2026-09-30）—— §13 的 4 題已於 2026-09-30 逐題確認（紀錄見 §14）；實作後回填見 §15
文件作者: 建宇
建立日期: 2026-09-30
更新日期: 2026-09-30
依賴文件: docs/notecraft-workbench.md（§8.1 Dashboard 三 Tab）、docs/notecraft-workbench-dashboard.md（§5 SSR 佔位、§6.5 更新日誌、§7.2 `--wb-dv-*` token）、docs/prototype/design_handoff_empty_states/README.md
分支: feat/dashboard-empty-states
---

# NoteCraft Workbench — 空狀態插圖設計文件

把工作台首頁兩處「沒有資料」的單行灰字換成 handoff 的**插圖式空狀態**（插圖＋標題＋說明＋選用按鈕）：

1. 總覽「更新日誌」卡片：所選週（或所選日期）沒有更新的筆記時
2. 「AI 佇列」分頁：沒有任何待生成的 `@ai-visualize` 標記時

兩處共用一個新元件 `EmptyState`（對應 prototype 的 `PtEmpty`／`PtEmptyArt`）。

> 視覺的**像素級規格**以 [design_handoff_empty_states/README.md](prototype/design_handoff_empty_states/README.md) 與 `source/pt-dash.jsx` 的 `PtEmptyArt` 為準，本文不重抄 path。
> 本文處理 handoff 沒回答的事：prototype 的顏色有字面值 fallback、SVG 用 presentation attribute 上 CSS 變數（codebase 已知在部分瀏覽器不解析）；「前往筆記」在 prototype 是 `onRoute`，codebase 是多頁站；更新日誌「選了某天、但那週其實有更新」時 handoff 的文案會說錯話（§13 Q1）；卡片在最矮高度下塞不塞得下插圖（§13 Q3）。
> **與設計稿不同之處一律以本文為準**，全部列在 §1.3。

---

## 1. 這份文件要解決什麼

### 1.1 起點

| 位置 | 現況 | 檔案 |
| :-- | :-- | :-- |
| 更新日誌 | `list.length === 0` 時在清單內輸出 `<div class="dv-empty">這段期間沒有更新的筆記</div>` | `src/components/wb/dashboard/UpdateLog.tsx:101` |
| AI 佇列 | `stats.pendingRows.length === 0` 時輸出 `<div class="wb-empty">沒有待生成的標記</div>` | `src/components/wb/DashboardWorkbench.tsx:122` |

兩者都能用，但在一張 380px 高的卡片、或整片 Body 中央只有一行 12.5px 灰字，看起來像「壞掉」而不是「正常地沒有東西」。handoff 為這兩處各畫了一張 132×104 的插圖。

### 1.2 目標

1. 新增共用元件 `EmptyState`（插圖 `kind: "log" | "ai"`、標題、說明、選用動作），兩處改用它（§3）
2. 插圖顏色全走既有 `--wb-*` token，**不新增任何 token**、TSX 與 CSS 都零色碼字面值（§5）
3. 更新日誌空狀態**不出現捲軸**、在卡片剩餘高度內垂直置中，卡片高度不因空狀態改變（§4.1）
4. 空狀態完全由既有資料推導，**不新增 state**；SSR／hydration 行為與現在相同（§6）

### 1.3 非目標與刻意的偏離

| 項目 | 決定 | 為什麼 |
| :-- | :-- | :-- |
| 元件名稱 | `EmptyState`（`src/components/wb/EmptyState.tsx`），不叫 `PtEmpty` | codebase 元件不帶 `Pt` 前綴（`Calendar` 不是 `PtCalendar`） |
| class 名稱 | **照 prototype**：`.pt-empty`、`.pt-empty-t`、`.pt-empty-s`、`.pt-empty-btn`、`.dv-log-list.is-empty` | `workbench.css` 檔頭第 4 條：class 與 prototype 一致，方便對照 |
| 「前往筆記」按鈕 | `<a class="pt-empty-btn" href="/notes">`，不是 `<button onClick>` | prototype 是 SPA 的 `onRoute("notes")`；codebase 是多頁站，導覽就該是連結（⌘點擊、中鍵可用） |
| SVG 上色方式 | 顏色用 `style={{ stroke: "var(--wb-…)" }}`／`style={{ fill: … }}`，**不用** `stroke="var(…)"` | `patterns.tsx:3` 已記錄 presentation attribute 在部分瀏覽器不解析 CSS 變數 |
| 字面值 fallback | 拿掉 `var(--wb-blue-l,#2c6ebb)` 這類 fallback、勾勾的 `#fff`、hover 的 `#9dbde6` | `workbench.css` 規則零色碼；三者都有既有 token 對應（§5） |
| 深色模式 | **不做**。handoff §Design Tokens 的 Dark 欄不採用 | Dashboard §1.3、Calendar §1.3 同一決定；`workbench.css` 檔頭第 3 條 |
| 其他 `wb-empty` 處（筆記篩選無結果、標籤、系列、資料檔） | **不動**（Q2 已定案） | handoff 只畫了這兩處；篩選無結果是「條件造成的空」，語意不同 |
| 總覽時間軸「尚無筆記」、系列卡／標籤卡的 `dv-sl-empty` | **不動** | 同上；且只在整站 0 篇時出現 |
| 更新日誌「選了日期」時的文案 | 另給一組：「這一天沒有更新的筆記」／「點選有圓點的日期，或再點一次回到整週。」（Q1 已定案） | handoff 只依週位移 `off` 分兩種文案，選了沒更新的日期時會與「本週共更新 N 篇」矛盾 |
| 「AI 待生成」KPI、頁首「N 待生成」pill 的 0 值 | **不動** | README 說「所有讀取 `ptPending()` 的地方都會顯示 0」—— codebase 已是如此（pill 在 0 時本來就不顯示、KPI 吃 build 期 `pending`） |
| prototype 的 Tweaks「AI 佇列清空」開關 | **不移植** | README 明說僅供展示；正式版由真實資料決定 |

---

## 2. 現況盤點：哪些留、哪些改、哪些走

| 檔案 | 處置 |
| :-- | :-- |
| `src/components/wb/EmptyState.tsx` | **新增**：`EmptyArt({ kind })` 與 `EmptyState({ kind, title, sub, action })`（§3） |
| `src/components/wb/dashboard/UpdateLog.tsx` | **改**：清單容器在 `list.length === 0` 時加 `is-empty`；`dv-empty` 那行換成 `<EmptyState kind="log" …/>`（§4.1） |
| `src/components/wb/DashboardWorkbench.tsx` | **改**：AI 佇列的 `wb-empty` 那行換成 `<EmptyState kind="ai" … action={<a …>前往筆記</a>}/>`（§4.2） |
| `src/styles/workbench.css` | **改**：追加 `.pt-empty*` 與 `.dv-log-list.is-empty` 規則（§5）。**不動 `:root`** |
| `.dv-empty` 規則 | **保留**：`Timeline.tsx:23` 仍在用 |
| `.wb-empty` 規則 | **保留**：其他 6 處仍在用 |
| `src/lib/*`、`src/pages/index.astro`、`/wb-index.json` | **不動**：資料不變 |

---

## 3. 元件 `EmptyState`

### 3.1 介面

```tsx
// src/components/wb/EmptyState.tsx
type EmptyKind = "log" | "ai";

export function EmptyArt({ kind = "log" }: { kind?: EmptyKind }): JSX.Element;

export default function EmptyState({
  kind = "log",
  title = "",
  sub,
  action,
}: {
  kind?: EmptyKind;
  title?: string;
  sub?: string;
  action?: ReactNode;
}): JSX.Element;
```

- 全部 props 有預設值（CLAUDE.md：元件不可有 required props）
- 純展示、無 state、無 effect；不需要 `client:` 指令 —— 它只會在已是 island 的 `DashboardWorkbench` 內渲染

### 3.2 DOM

```html
<div class="pt-empty">
  <svg width="132" height="104" viewBox="0 0 132 104" aria-hidden="true" focusable="false">…</svg>
  <div class="pt-empty-t">這段期間沒有更新的筆記</div>
  <div class="pt-empty-s">本週還沒有動靜，寫下第一篇吧。</div>   ← 有 sub 才輸出
  <a class="pt-empty-btn" href="/notes">前往筆記</a>              ← 有 action 才輸出（由呼叫端傳入整個元素）
</div>
```

- 插圖純裝飾：`aria-hidden="true"`、`focusable="false"`；語意全在標題與說明文字
- 不加 `role="status"`：空狀態是首次渲染就存在的內容，不是動態通知。更新日誌切週時文字替換，已由上方 `dv-card-h` 的「本週共更新 0 篇筆記」同步表達

### 3.3 插圖

照 `PtEmptyArt` 逐 path 移植，只改上色方式：

| prototype 常數 | codebase | 用在 |
| :-- | :-- | :-- |
| `B = var(--wb-blue-l,#2c6ebb)` | `var(--wb-blue-l)` | 日曆框與掛環、前層文件框、勾勾徽章底 |
| `O = #ed9b26` | `var(--wb-gold)`（= DS `--orange-400` = `#ed9b26`） | 時鐘、四角星、十字星、小圓點 |
| `S = var(--wb-line,#dfe5ee)` | `var(--wb-line)`（`#e1e6ee`，與 fallback 差一階，以 token 為準） | 地面陰影、日曆格、後層文件框、文字線 |
| `P = var(--wb-panel,#fff)` | `var(--wb-panel)` | 日曆、時鐘、文件的底 |
| 勾勾 `#fff` | `var(--wb-on)`（= DS `--text-on-brand` = `#ffffff`） | `kind="ai"` 的白勾 |

- 寫法：`<rect … style={{ fill: P, stroke: B }} />`；`strokeWidth`、`opacity`、`transform`、`strokeLinecap`／`strokeLinejoin` 等非顏色屬性仍用 JSX attribute
- 日曆格的 `[0,1,2,3].map(c => [0,1,2].map(r => …))` 攤平成一個 12 元素的陣列 map，key 用 `` `${c}-${r}` ``
- 插圖寫死在元件內，不抽成 `.svg` 檔：需要吃 CSS 變數，外部 `<img>` 吃不到

---

## 4. 兩處接入

### 4.1 更新日誌（`UpdateLog.tsx`）

條件與 handoff 相同：`win` 存在（已 hydrate）且篩選後 `list.length === 0`。

```tsx
{win ? (
  <div className={"dv-log-list" + (list.length ? "" : " is-empty")}>
    {list.map(…)}
    {list.length === 0 ? <EmptyState kind="log" title={…} sub={…} /> : null}
  </div>
) : (
  <div className="dv-log-list" aria-hidden="true" />   ← SSR／未 hydrate：維持現狀，不輸出空狀態
)}
```

文案：

| 情境 | 標題 | 說明 |
| :-- | :-- | :-- |
| 本週（`off === 0`）、未選日期、整週 0 篇 | 這段期間沒有更新的筆記 | 本週還沒有動靜，寫下第一篇吧。 |
| 過去週（`off > 0`）、未選日期、整週 0 篇 | 這段期間沒有更新的筆記 | 切換到其他週看看，或回到本週。 |
| **選了日期**、該日 0 篇、且整週 > 0 篇（整週 0 篇時照上兩列，否則「點選有圓點的日期」會指向不存在的圓點） | 這一天沒有更新的筆記 | 點選有圓點的日期，或再點一次回到整週。 |

- 無按鈕：卡片底部已有「查看全部筆記」
- 「寫下第一篇吧」在正式環境沒有對應按鈕（「＋ 新增筆記」是 dev-only），文案本身不暗示有按鈕，照用
- 「回到本週」是文字、不是連結：回到本週的操作是右箭頭，handoff 沒畫快捷按鈕，不加

### 4.2 AI 佇列（`DashboardWorkbench.tsx`）

```tsx
<div id="nc-scroll" className="wb-body flush" data-wb-rows>
  {stats.pendingRows.length === 0 ? (
    <EmptyState
      kind="ai"
      title="AI 佇列已清空"
      sub="所有 @ai-visualize 標記都已生成完成。新增標記後會出現在這裡。"
      action={<a className="pt-empty-btn" href="/notes">前往筆記</a>}
    />
  ) : ( …既有列表… )}
</div>
```

- 條件沿用既有 `stats.pendingRows`（`markerCounts(r.markers).pending > 0`，即 `status !== "generated"`），與 handoff 的 `ptPending()` 語意相同
- `id="nc-scroll"`、`data-wb-rows` 保留；空狀態沒有可移焦的列，↑↓ 不作用，正常
- 「前往筆記」`href="/notes"`，不帶 `?pending=1`：佇列空就代表沒有待生成的筆記，帶了只會看到另一個空列表

---

## 5. 樣式

### 5.1 規則（追加到 `workbench.css`）

照 `pt-dash.jsx` 注入的 CSS 與 `pt-dash2.css:127` 移植，差異只在顏色：

```css
/* 空狀態插圖（docs/notecraft-workbench-empty-states.md §5） */
.pt-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:6px;padding:28px 16px;margin:auto 0}
.wb-body .pt-empty{padding:72px 16px}
.pt-empty svg{margin-bottom:8px}
.pt-empty-t{font-size:14px;font-weight:700;color:var(--wb-ink)}
.pt-empty-s{font-size:12.5px;line-height:1.7;color:var(--wb-ink-3);max-width:280px;text-wrap:pretty}
.pt-empty-btn{display:inline-flex;align-items:center;margin-top:10px;height:32px;padding:0 16px;border-radius:999px;border:1px solid var(--wb-line);background:var(--wb-panel);font:inherit;font-size:12.5px;font-weight:700;color:var(--wb-blue-l);cursor:pointer;text-decoration:none}
.pt-empty-btn:hover{background:var(--wb-bg);border-color:var(--wb-dv-hover-line)}
.dv-log-list.is-empty{overflow:hidden;justify-content:center}
.dv-log-list.is-empty .pt-empty{padding:8px 16px;margin:0;min-height:0}
.dv-log-list.is-empty .pt-empty svg{flex:none}
```

- `.pt-empty-btn` 因為改成 `<a>`，多了 `display:inline-flex;align-items:center;text-decoration:none`，外觀與 prototype 的 `<button>` 相同
- hover 邊框 `#9dbde6` 就是既有的 `--wb-dv-hover-line`（`.dv-btn`／`.dv-ev`／`.dv-full` 同色），直接沿用；它的註解補一句「空狀態按鈕」
- 總覽 Body 是 `.wb-body.dv-body`，所以 `.wb-body .pt-empty`（0,2,0）也會命中更新日誌裡的空狀態；由 `.dv-log-list.is-empty .pt-empty`（0,3,0）蓋回 `8px 16px`，與 prototype 相同
- 放置位置：`.pt-empty*` 接在 `.wb-empty` 之後；`.dv-log-list.is-empty` 接在 `.dv-empty` 之後。兩者都不涉及 860px 媒體規則的先後問題

### 5.2 `:focus-visible`

`.pt-empty-btn` 用瀏覽器預設的 `:focus-visible` 外框，不另寫（與 `.dv-btn`、`.dv-full` 相同；`workbench.css` 只對列內元素調 `outline-offset`）。

### 5.3 不新增 token

§3.3 與 §5.1 用到的 `--wb-blue-l`、`--wb-gold`、`--wb-line`、`--wb-panel`、`--wb-on`、`--wb-ink`、`--wb-ink-3`、`--wb-bg`、`--wb-dv-hover-line` 全部已存在。

### 5.4 對比

- 標題 `--wb-ink` 對白底：遠高於 4.5:1
- 說明 `--wb-ink-3`（`#6c798e`）對白底（`--wb-panel`）約 4.4:1，12.5px 未達 AA 4.5:1 —— 與 Calendar Q5 同一類問題，但這裡的底是白色，且總覽既有的 `.dv-card-h p`、`.dv-empty` 都是同一組合；**照 handoff、不改**。若作者希望一併拉到 `--wb-muted-ink`，另外提出
- 按鈕文字 `--wb-blue-l` 對白底約 5.2:1，通過

---

## 6. SSR 與 hydration

| 位置 | SSR 輸出 | hydrate 後 |
| :-- | :-- | :-- |
| 更新日誌 | **不變**：`now === null` → 清單是空的 `aria-hidden` 容器，不輸出空狀態 | `list` 為空才輸出 `EmptyState` |
| AI 佇列 | `pendingRows` 來自 build 期的 `rows` props → SSR 與 client **同一份**，空狀態直接在 HTML 內 | 不變 |

- 更新日誌的空狀態只在 client 出現，不會造成 mismatch（與既有 `dv-empty` 相同路徑）
- AI 佇列的插圖會進 SSR HTML（約 1.5 KB），可接受

---

## 7. 響應式

| 寬度 | 更新日誌 | AI 佇列 |
| :-- | :-- | :-- |
| > 980px | 三欄 Row 2，卡片高度由 `.dv-row2{flex:1 1 0;min-height:380px}` 決定；空狀態在清單剩餘高度內置中 | Body 置中，`padding:72px 16px` |
| ≤ 980px | 更新日誌佔滿一列、`.dv-log-list{flex:none;max-height:320px}` → `is-empty` 時高度＝內容高度（約 190px），不捲 | 同上 |
| ≤ 680px | 單欄；同上 | 同上；插圖 132px 寬，在 375px 手機寬度內沒有問題 |

**最矮卡片的高度預算**（> 980px、`min-height:380px`）：

```
380  卡片
−28  上下 padding
−~36 標題＋副標（dv-card-h）
−~26 週導覽
−~46 日期列
−~30 查看全部筆記
−40  4 個 gap × 10px
≈174 清單可用高度
```

空狀態內容：`8 + 104 + 8（svg margin）+ 6 + 20（標題）+ 6 + 21（說明一行）+ 8 ≈ 181`。**差不到 10px，極可能被 `overflow:hidden` 裁掉說明文字的下緣**。處置（Q3 已定案）：Task 96 先照 handoff 實作並量測；若真的裁切，加一條 `@media (max-height:…)`，在 `.dv-log-list.is-empty` 內把插圖縮成 0.75（99×78，`width`／`height` 由 CSS 覆寫、`viewBox` 不變）；Task 97 在 1280×800 與把視窗壓到 Row 2 觸底的高度下各截一張圖確認。

---

## 8. 無障礙與鍵盤

- 插圖 `aria-hidden`；標題與說明是一般文字，讀屏依序讀出
- 「前往筆記」是真實連結，Tab 可達、Enter 導覽
- 更新日誌空狀態時，清單內沒有可聚焦元素；Tab 從日期列直接跳到「查看全部筆記」，正常
- 不使用動畫，不涉及 `prefers-reduced-motion`

---

## 9. dev／正式環境差異

無。兩處空狀態在 dev 與正式環境相同。

---

## 10. npx viewer 相容性

- 新檔 `src/components/wb/EmptyState.tsx` 在 `package.json` `files` 既有的 `src/components/wb/` 之下，**不用改 `files`**
- viewer 專案常見「整站沒有 `@ai-visualize` 標記」與「筆記很久沒動」：AI 佇列空狀態與更新日誌空狀態在 viewer 反而是**最常見的畫面**，Task 97 在 `tmp/notecraft-test` 實測兩者

---

## 11. 實作階段

| Task | 目標 | 前置 | 驗收 |
| :-- | :-- | :-- | :-- |
| **96** 元件與接入 | `EmptyState.tsx`（兩張插圖）；`workbench.css` 追加 §5.1 規則；`UpdateLog` 與 `DashboardWorkbench` 接入；§14 Q1 的文案、Q3 的量測（必要時加矮視窗規則） | §13 定案 | 與 prototype 並排比對兩張插圖（含 hover）；`grep -nE '#[0-9a-fA-F]{3,6}' src/components/wb/EmptyState.tsx` 0 筆；更新日誌切到空週時卡片高度不變、無捲軸；AI 佇列在清空標記的本機分支上顯示空狀態、「前往筆記」導到 `/notes`；dev console 零 hydration warning |
| **97** 收尾 | 最矮卡片高度與 ≤980／≤680 實測截圖；viewer 實測；文件回填（本文 §14／§15、Dashboard 文件 §6.5 加一行指向本文、CLAUDE.md 一行、PRD `/bump-prd`、CHANGELOG）；`npm version patch` → notecraftapp 1.5.1（Q4） | 96 | `npx tsc --noEmit && npx astro build && npm run check-plugins` 綠；tsc 錯誤數不增加；`grep -r "$HOME" dist/` 0 筆 |

**交付節奏**：全程在 `feat/dashboard-empty-states` 單一分支，依 Task 逐步 commit，97 完成後開 PR 併回 `main`。每個 commit 都要能通過 `npx tsc --noEmit && npx astro build`。§13 已定案，Task 文件可直接展開為 `docs/tasks/task-96…97-*.md`，並在 `tasks/README.md` 加一節。

**測資**：本機站目前有待生成標記、本週也有更新，兩個空狀態都看不到。驗證方式：
- 更新日誌：用左箭頭切到沒有更新的過去週、或點選沒有金色圓點的日期
- AI 佇列：在 viewer 的 `tmp/notecraft-test`（無標記）驗；主站不為了測試改筆記 status

---

## 12. 風險

| 風險 | 說明 | 對策 |
| :-- | :-- | :-- |
| **最矮卡片裁切** | §7 的高度預算顯示空狀態比清單可用高度多約 7px | Q3 已定案：矮視窗縮插圖；Task 97 截圖驗收 |
| **SVG 顏色不生效** | 若誤用 `stroke="var(…)"`，部分瀏覽器畫成黑色 | §3.3 規定用 `style`；Task 96 在 Safari 與 Chrome 各看一次 |
| **`.wb-body .pt-empty` 汙染其他地方** | 日後若在其他 `.wb-body` 內的卡片放 `EmptyState`，會吃到 72px padding | 可接受；屆時比照 `.dv-log-list.is-empty` 加一條情境規則 |
| **文案說錯話** | 選了沒更新的日期時，handoff 文案會說「本週還沒有動靜」但其實本週有更新 | Q1 已定案：另給一組文案 |

---

## 13. 待釐清問題

4 題已於 2026-09-30 逐題確認（全部採建議選項 A），結論見 §14；本文即實作依據。

**Q1 🔴 更新日誌「選了某天、該天 0 篇、但整週有更新」的文案** —— ✅ 已定案：A（2026-09-30）
- **A（建議）另給一組文案**：標題「這一天沒有更新的筆記」、說明「點選有圓點的日期，或再點一次回到整週。」理由：handoff 只依 `off` 判斷，這個情境下會顯示「本週還沒有動靜」，與上方「本週共更新 N 篇」直接矛盾；日期按鈕沒有 disabled，這個情境很容易點到
- B 照 handoff，只依 `off` 分兩種。忠於設計稿，但會出現自相矛盾的畫面
- C 把沒有更新的日期按鈕設為 `disabled`，讓這個情境不可能發生。文案不用改，但改變了既有互動（v1.4.0 刻意讓每天都可點）

**Q2 🟡 範圍：其他單行空狀態要不要一起換** —— ✅ 已定案：A（2026-09-30）
- **A（建議）只做 handoff 的兩處**。理由：其他 `wb-empty`（筆記、標籤、系列、資料檔篩選無結果）是「條件造成的空」，該給的是「清掉篩選」的提示而不是插圖；設計稿沒畫，自己發明會偏離設計系統
- B 順便把 `/notes` 篩選無結果也換成 `EmptyState`（沿用 `kind="log"`）。一致性較好，但插圖語意不合（日曆＋時鐘 ≠ 篩選）

**Q3 🟡 最矮卡片高度下空狀態被裁切的退路（§7）** —— ✅ 已定案：A（2026-09-30）
- **A（建議）Task 96 先照 handoff 實作並量測；若真的裁切，加一條 `@media (max-height:…)` 把插圖縮成 0.75（99×78）**。理由：保住插圖與完整文字，只在矮視窗生效，一般筆電高度不受影響
- B 裁切時隱藏說明文字、只留插圖與標題。最省事，但說明是這次改版的一半價值
- C 讓 `is-empty` 時仍可捲動（拿掉 `overflow:hidden`）。違反 handoff「不可出現捲軸」

**Q4 🟡 版號** —— ✅ 已定案：A（2026-09-30）
- **A（建議）notecraftapp 1.5.1（patch）**。理由：沒有新功能、沒有新資料、沒有新路由，只換兩處空狀態的呈現
- B 1.6.0（minor）。理由是使用者看得見的新視覺；但照 1.4.0／1.5.0 的慣例，minor 都對應新區塊或新 Tab

---

## 14. 定案紀錄

| 題號 | 決定 | 日期 |
| :-- | :-- | :-- |
| Q1 | A：選了 0 篇的日期時，標題「這一天沒有更新的筆記」、說明「點選有圓點的日期，或再點一次回到整週。」；未選日期時照 handoff 依 `off` 分兩種 | 2026-09-30 |
| Q2 | A：只做更新日誌與 AI 佇列兩處，其他 `wb-empty`／`dv-empty`／`dv-sl-empty` 不動 | 2026-09-30 |
| Q3 | A：先照 handoff 實作並量測；裁切時以 `max-height` 媒體查詢把插圖縮成 0.75（99×78） | 2026-09-30 |
| Q4 | A：notecraftapp 1.5.1（patch） | 2026-09-30 |

---

## 15. 實作後回填

### Task 96（2026-09-30）

**最矮卡片量測**（本機站、1280 寬、更新日誌本週 0 篇）：

| 視窗高 | 卡片高 | 清單可用高 | 空狀態內容高 | 結果 |
| :-- | :-- | :-- | :-- | :-- |
| 825 | — | 213 | 184 | 放得下 |
| 800 | — | 188 | 184 | 放得下（餘 4px） |
| 600（Row 2 觸底 380） | 380 | **143** | 184 → **140**（縮圖後） | 未加規則時裁切 41px；加規則後放得下 |

- §7 的預算低估了卡片頭與日期列：實測清單可用高是 143px，不是 174px。清單可用高 ≈ 視窗高 − 612
- **Q3 落實時加了一項**：只把插圖縮成 0.75（−26px）還差約 15px，所以矮視窗規則同時把 `.pt-empty` 上下 padding 從 8px 改成 0、svg `margin-bottom` 從 8px 改成 6px，合計 −44px
- 規則：`@media(min-width:981px) and (max-height:820px)`。820 比理論分界（≈796）多留 24px；≤980px 時清單高度＝內容，不需要
- ≤980（900×700）、375 手機：清單 184＝內容 184，不裁、不橫捲

**實作中新增的決定**

- **Q1 文案的條件改成 `pick && inWeek.length > 0`**：整週 0 篇時點日期，「點選有圓點的日期」會指向不存在的圓點，這時照週文案（「本週還沒有動靜…」／「切換到其他週看看…」）
- **`.pt-empty-btn:hover` 要明寫 `color:var(--wb-blue-l)`**：改成 `<a>` 後，全站 `a:hover` 會把字色蓋成 `--wb-blue`（#1b4f9c）。`.dv-btn:hover` 也是同樣寫法
- SVG 顏色實測（Chrome）：藍框 `rgb(44,110,187)`、底 `rgb(255,255,255)`、白勾 `rgb(255,255,255)`，token 都有吃到
- AI 佇列空狀態在「無標記」的暫時筆記夾驗證：頁首「待生成」pill 自動消失、「前往筆記」→ `/notes`、console 零錯誤

### Task 97（2026-09-30）

- npx viewer（`tmp/notecraft-test`，1280×760）：更新日誌本週 0 篇 → 空狀態、套用矮視窗規則（清單 148、內容 140），不裁切；AI 佇列有 1 個待生成標記，列表照常
- `grep -r "$HOME" dist/` 有 1 筆：`dist/notes/testing/資料檔內嵌測試/index.html` 內嵌 ER plugin 的 `rendererPath`。**main 上既有、與本次無關**（已用 stash 比對），另開任務處理
- `npx tsc --noEmit` 48 個既有錯誤、未增加；`npx astro build`、`npm run check-plugins` 通過

### 與設計稿的最終偏離

- 「前往筆記」是 `<a href="/notes">`；矮視窗縮圖＋拿掉 padding；選日期文案（Q1）；深色模式不做

### 仍未做的

- Safari 實機檢查 SVG 上色：這次的驗證環境只有 Chromium。寫法與 `patterns.tsx` 相同（`style` 內的 CSS 變數是標準 CSS，各瀏覽器都支援），風險低
