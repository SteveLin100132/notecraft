# Task 77 — ER plugin 拆檔（純搬移、零行為變更）

> 規格 [notecraft-er-docs.md](../notecraft-er-docs.md) §4.1、§4.2；Q1 定案。
> 依賴 [Task 76](task-76-er-schema-v12-examples.md)。

## 為什麼先做、而且只搬不改

Diagram 的縮放、fit、量測是 v1.1 花最多時間調的部分。先把 1102 行的 `renderer.tsx` 拆開、**行為一個 bit 都不變**，
之後 Task 80–84 的每個 diff 都能對著「已拆好的 v1.1」看，Diagram 一旦回歸，很容易定位是哪個 Task 造成的。
若本 Task 順手改了任何行為，這個好處就沒了。

## 範圍

從 `plugins/er-diagram-renderer/renderer.tsx` 切出：

| 新檔 | 內容 |
| --- | --- |
| `types.ts` | `PluginRendererProps<T>`（仍自帶一份，不從 `@notes` import，註解照搬）、`ErColumn`、`ErTable`、`ErOptions`、`ErDiagramData`、`ErSchema`、`Edge`、`ViewState`、`TipState` |
| `styles.ts` | `export const CSS = \`…\``（原 `CSS` 常數原封搬移） |
| `diagram.tsx` | 畫布元件本體：目前 `ErDiagramRenderer` 裡除了「全寬 hold 卡 + 覆蓋層」外殼以外的全部（state、fit、量測、縮放平移、聚焦、搜尋、hub、tooltip、Esc）。先以 `export function ErDiagram(props)` 匯出，props 形狀與現在的 renderer 相同 |
| `renderer.tsx` | `export default`：合併 options、`<style>{CSS}</style>`、全寬 hold 卡與覆蓋層，裡面放 `<ErDiagram …/>` |

規則：

- 相對 import 不寫副檔名（`./types`），與 codebase 其他 TS 一致
- **純型別的 import 一律 `import type`**（Task 78 的 `scripts/checks` 以 Node strip-types 載入 `.ts` 檔，只有型別 import 會被整行抹除）
- 不改任何 class 名、CSS、常數值、註解（註解跟著程式搬）
- `wide` 與 Esc 的關係：v1.1 的 Esc 監聽同時處理「取消聚焦」與「關閉全寬」。拆開後 `wide` 在 `renderer.tsx`、聚焦在 `diagram.tsx`，以 `onRequestCloseWide` callback 串起來，**行為維持逐層退**
- `plugins/registry.json` 的 `files` 補 `types.ts`、`styles.ts`、`diagram.tsx`

## 要改的既有檔案

`plugins/er-diagram-renderer/renderer.tsx`；新增 `types.ts`、`styles.ts`、`diagram.tsx`；`plugins/registry.json`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 型別與 build | — | `npx tsc --noEmit && npx astro build` | 通過 |
| store 護欄 | — | `npm run check-plugins` | 通過（含 registry files 集合比對、install lint 掃新檔） |
| **並排比對** | 改動前先截 `/view/schema-demo.er` 與「資料檔內嵌測試」筆記的圖 | 改動後同位置再截 | 像素相同 |
| 縮放平移 | `/view/schema-demo.er` | ⌘/Ctrl＋滾輪、拖曳、雙擊空白、右下還原鈕、畫布上按 `+ - 0` | 與 v1.1 相同 |
| 聚焦與搜尋 | — | 點表頭、搜尋 `customer`、開關 hub 連線、展開欄位、hover 欄位圖示 | 與 v1.1 相同 |
| Esc 逐層退 | 內嵌 → 展開全寬 → 聚焦一張表 | 按 Esc 兩次 | 第一次取消聚焦、第二次回到本文 |
| 單純滾輪不被吃 | 內嵌 | 游標在畫布上滾輪 | 頁面照常捲動 |
| install lint | — | `node bin/install-plugin.mjs ./plugins/er-diagram-renderer`（到一個暫存專案） | 通過，四個檔都被複製 |

## 依賴

Task 76。

## 實作記錄（2026-09-27）

- 拆出 `types.ts`／`styles.ts`／`diagram.tsx`；全寬改為「只換外層容器的 class、`<ErDiagram>` 在樹上的位置不變」—— 拆成獨立元件後若照 v1.1 在兩處渲染，React 會重掛、狀態歸零
- 實測：聚焦後展開全寬，聚焦保留；Esc 兩次依序取消聚焦、回到本文。順手修掉 `note` 可能為 undefined 的 4 個既有型別錯誤
