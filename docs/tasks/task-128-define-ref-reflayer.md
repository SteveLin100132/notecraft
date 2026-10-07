# Task 128 — 閱讀端互動：`RefLayer`（預覽卡、sheet、define popover、flash、id 複製）

> 規格 [notecraft-workbench-define-ref.md](../notecraft-workbench-define-ref.md) §7、§10、§11；Q1、Q3 定案（§17）。
> 像素級規格：[design_handoff_workbench_define_ref/README.md](../prototype/design_handoff_workbench_define_ref/README.md) §1（popover、導覽落點）、§3、§5、§6、§8、§9。
> 前置：Task 127。

## 為什麼要有這一步

Task 127 之後 ref 只是連結，讀者一點就離開本篇。這一步加上預覽卡，讓讀者不離開本篇就看得懂一個詞；並讓來源端的「被 N 篇引用」與前往來源後的落點提示動起來。

## 範圍

### 1. 抽出 tabs 與 tip 的初始化

預覽卡的內容是從 template 複製來的，裡面的 tabs、`:tip` 也要能動。

- 把 `[...slug].astro` inline script 的 `initTabs`、`positionTip` 等抽成 `src/lib/nc-tabs.ts`、`src/lib/nc-tip.ts`，各提供 `init(root: ParentNode)`
- 筆記頁 inline script 改為呼叫這兩個 `init(document)`，**行為與 DOM 不變**
- 複製進卡片時，tabs 的 `id`／`aria-controls` 換上卡片專用前綴（規格 §6）

### 2. `src/components/islands/RefLayer.tsx`（新增）

`[...slug].astro` 在本篇有 `.nc-ref`、`.nc-def` 或 `.nc-inc` 時掛 `<RefLayer client:idle isDev={isDev} />`。以事件委派監聽，不改 MDX 輸出的 DOM 結構，只切換 `aria-expanded`、`.on`、`.flash`。卡片以 portal 掛在 `#nc-main`。

| 功能 | 規格 |
| --- | --- |
| 預覽卡 | handoff §3.2 的觸發表（hover 300ms、focus 150ms、寬限 150ms、點擊／Enter 固定、修飾鍵走原生、已固定時 hover 別的 ref 不換卡、點外面關閉、捲動時重新定位、未固定且 ref 捲出視窗時關閉） |
| 卡片內容 | §3.3：標頭（label、id、固定時才有 ✕）、內容（template 的 clone，13.5px）、超過 320px 截斷＋56px 漸層＋「看完整內容」→ `min(60vh,520px)` 內捲、頁尾（來源標題・資料夾、「開啟來源 ↗」） |
| 定位 | §3.3 的 6 條規則（下方 8px、翻轉、夾邊、斷行時取最後／第一段 rect、ResizeObserver） |
| 手機 sheet | §3.4：≤860px 或 `(hover: none)`；不截斷、15px、「開啟來源」實心 pill 40px |
| define popover | §1：「被 N 篇引用」360px popover；資料從 `/wb-index.json` 取（沿用 `useWbIndex` 的延遲載入與快取）；≥10 篇加篩選框、清單 `max-height:280px`；無結果文案；手機改 sheet、列高 48px |
| dev 動作 | popover 底部「複製 include 語法」「複製 ref 語法」，只在 `isDev` |
| id 複製 | `.nc-def-id` 點擊複製 `data-nc-copy` 的網址（轉成絕對網址），`lib/clipboard.ts`＋`lib/toast.ts` |
| 落點 flash | §1「導覽落點」：網址 hash 是 `#def-…` 時，排在捲動還原的 inline script 之後，捲到 define 上留 32px、`focus({preventScroll:true})`、`.flash`；用 `getElementById`（id 含 `.`，不能直接當 CSS 選擇器） |

卡片的 `role`、`aria-*`、焦點規則照 handoff §8、§6（Esc／✕ 關閉還焦點給 ref、程式化 focus 不再觸發預覽、Tab 出界關閉、非 modal 不鎖焦點）。

### 3. Esc

卡片、popover、sheet 開啟時以 `pushEscape` 登記、關閉時取消登記。**沿用 `lib/wb-escape.ts` 的 LIFO**（Q3），不改它的介面。

### 4. 樣式

- `.nc-pop`、`.nc-pv-*`、`.nc-sheet`、`.nc-bl-pop`、`.nc-bl-pi`、`.flash` 放 `global.css`
- token：`--wb-pop-shadow`、`--wb-pop-w`、`--wb-pop-maxh`、`--wb-pop-maxh-x`、`--wb-dur-pop`、`--wb-dur-sheet`、`--wb-dur-flash`、`--wb-delay-hover`、`--wb-delay-focus`、`--wb-grace`；只寫亮色（Q1）
- 動畫照 handoff §5，每一條都有 reduced-motion 對應（flash 改 2px 外框 1.6s）

## 要改的既有檔案

`src/pages/notes/[...slug].astro`、`src/styles/global.css`。新增 `src/lib/nc-tabs.ts`、`src/lib/nc-tip.ts`、`src/components/islands/RefLayer.tsx`。

## 驗收

規格 §15 的第 1–8、10、14 項（ref 樣式、hover／focus／固定、Esc、翻轉、看完整內容、sheet、前往來源 flash、0 篇與 ≥10 篇 popover、Esc 順序），另加：

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| tabs／tip 不退步 | 任一既有含 tabs 與 `:tip` 的筆記 | 開頁 | 行為與改動前相同 |
| 卡片內互動 | 「假單狀態」預覽卡 | 切 tabs、hover `:tip` | 都正常；卡片內的 ref 不開第二層卡 |
| 沒有 JS | 停用 JavaScript | 點 ref | 前往來源 |
| ≥10 篇 | `scripts/fixtures/define-ref-scale.mjs` 的工作區（Task 130 提供；先手動建也可） | 開 popover | 篩選框、內捲正常 |
| build | — | `npx tsc --noEmit && npx astro build` | 通過；tsc 錯誤數不增加 |

## 依賴

Task 127。
