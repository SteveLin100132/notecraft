# Task 131 — spike：佈局耗時、`React.lazy` 分塊、tween 幀率

> 規格 [notecraft-workbench-notes-graph.md](../notecraft-workbench-notes-graph.md) §5.2、§5.3、§10；Q8 定案（§20）。
> 前置：無。Task 133、135 的做法依本 Task 的結論決定。

## 為什麼要有這一步

規格裡有三個假設還沒在這個 codebase 驗證過，任何一個不成立，§5 或 §10 就要調整：

1. handoff 的力導向演算法（O(n²) 斥力）在主執行緒同步跑，300 節點時不會讓畫面凍住；1,000 節點時在可接受範圍內
2. `React.lazy` 在 Astro island（`client:load`）與 npx viewer 的 build 下會正常分出獨立 chunk，List 使用者不下載 Graph 的程式
3. 模式切換的 600ms tween 以 ref 直接改 SVG 屬性，在 150 節點時維持流暢

先用最小的程式碼確認，不寫正式功能。

## 範圍

拋棄式程式碼，**不 commit 進 `feat/notes-graph`**（只 commit 結論）。

### 1. 佈局耗時

- 把 handoff `source/wb/pt-graph-data.jsx` 的 `grLayoutDoc`、`grLayoutTag`、`grCollide`、`grRng` 原樣搬成一支獨立的 `.mjs`（先不整理成正式的 `wb-graph-layout.ts`）
- 以亂數產生的圖測 65／150／300／600／1,000 節點，邊數約為節點數的 1.2 倍、孤島約 20%
- 在 Node 與瀏覽器（Chrome，一般筆電）各量 5 次取中位數，文件模式與標籤模式都量
- 記錄：各規模的耗時、同一輸入連跑兩次的結果是否逐位元相同

判定（Q8）：

| 結果 | 做法 |
| --- | --- |
| 300 節點 ≤ 150ms 且 1,000 節點 ≤ 500ms | 維持規格：主執行緒同步，> 150 節點先畫骨架 |
| 300 節點 ≤ 150ms 但 1,000 節點 > 500ms | 改 Web Worker；記錄 Worker 在 Astro 與 viewer 打包的做法 |
| 300 節點 > 150ms | 先試降低迭代次數或以格狀分區加速斥力；仍不行再改 Worker |

### 2. `React.lazy` 分塊

- 在 `NotesWorkbench.tsx` 暫時加一個 `React.lazy(() => import("./graph/_Spike"))`，只在 state 切換後才渲染，外層包 `Suspense`
- `npx astro build` 後確認：`dist/_astro/` 有獨立的 chunk；`/notes` 的 HTML 與初始載入的 JS 不含 spike 元件的字串
- 以 `npm pack` 出的套件、`NOTECRAFTAPP_DEV=1` 跑 viewer 的 `build` 與 `view`，確認同樣分塊、dev 下切換後能載入
- 確認 hydration 沒有 mismatch 警告（SSR 畫的是 List，Graph 只在 effect 之後出現）
- `NOTECRAFT_BASE=/x` build 後 chunk 的網址帶前綴

不通過時的結論是「改成靜態 import」，並記錄 `/notes` 的 JS 增加多少。

### 3. tween 幀率

- 以 150 個 `<g>`（圓＋文字）加約 180 條 `<path>` 做一個靜態頁，兩組座標之間以 `requestAnimationFrame` 補間 600ms
- 兩種寫法各量一次：每幀 `setState` 讓 React 重繪、以 ref 直接 `setAttribute`
- 用 Chrome Performance 面板記錄掉幀數與每幀的 scripting 時間
- 另量 300 節點，確認規格「> 150 節點不做移動動畫」的門檻合不合理

## 產出

- 規格 §21「實作後回填」寫一段「Task 131 spike 結論」：三項各自的數字、採用的做法、限制
- 有需要時修改規格 §5.2、§5.3、§10 的內文，並在 §20 註明
- 若結論是改用 Web Worker，**先在對話中告知作者**再調整 Task 133 的範圍

## 要改的既有檔案

只有 `docs/notecraft-workbench-notes-graph.md`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 耗時 | 五種規模的亂數圖 | 在 Node 與 Chrome 各跑 5 次 | 有中位數表；已依判定表決定做法 |
| 確定性 | 同一輸入 | 連跑兩次 | 座標逐位元相同 |
| 分塊 | 暫時的 lazy 元件 | 主專案與 viewer 各 build 一次 | 有獨立 chunk，或已記錄「改靜態 import」 |
| hydration | `/notes` | 載入並切換 | console 沒有 mismatch 警告 |
| tween | 150 與 300 節點 | 兩種寫法各跑一次 | 有掉幀數對照；門檻已確認或調整 |
| 零變化 | — | `git diff` | `feat/notes-graph` 上只有規格文件的變更 |

## 依賴

無。
