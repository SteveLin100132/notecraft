# Task 43 — 架構圖基元：`<Node>` / `<Connector>` / `<GroupBox>`

> 對應 [deck-atoms-inventory.md](../deck-atoms-inventory.md) §2 B1/B3/B4/B6、§4.3。
> 依賴 [Task 38](task-38-deck-code-atom.md)（`atoms.deck.tsx` 骨架）。
>
> **⚠️ 本 Task 的範圍需作者確認，建議排在 38–42 之後再決定要不要做。**

## 為什麼是「基元」而不是「架構圖元件」

架構拓撲是盤點的**第二大缺口**（18 / 94 頁，inventory §1.2），但 §4.3 明確判定
**不要做成通用架構圖元件**：

> 18 頁架構圖每張結構都不同，包成通用元件等於自造迷你 mermaid，維護成本高、
> AI 還是會想跳脫。

所以本 Task 只提供三個**低階基元**，位置由 `custom` 頁自己排 ——
符合契約 §1.3「把設計決策下移一層」的精神：原子承載長相，版面決策留給呼叫端。

| 基元 | 職責 | 實證頁 |
| --- | --- | --- |
| `<Node>` | 一個節點盒：icon / logo + 標題 + 副標 + 可選 tone | mfe p4、bullmq p13、tus p15/p16、dataint p33 |
| `<Connector>` | 一條連線：正交或曲線 + 箭頭 + 線上標籤 + 實線/虛線 | 同上 + nifi p4 的 Commit/Deploy 粗箭頭 |
| `<GroupBox>` | 一個分組框：虛線邊 + 左上標題 + 可巢狀 | bullmq p13（ETL JOB / Metrics / Alert 分組）、dataint p15、nifi p4 |

B3（矩陣網格，mfe p2）與 B6（扇出／扇入，tus p4 / mfe p6）用這三個基元組得出來，
**不另開元件**。

## API 草案

```ts
export interface NodeProps extends BlockBaseProps {
  title: string; sub?: string;
  icon?: IconName; img?: string;          // img = logo 圖檔路徑
  tone?: SeriesTone | StatusTone;
  w?: number; h?: number;                 // 1600×900 座標系的 px
}

export interface GroupBoxProps extends BlockBaseProps {
  title?: string; tone?: SeriesTone;
  dashed?: boolean;                       // 預設 true
  children: ReactNode;
}

/** 連線畫在一張覆蓋整個圖區的 <svg> 上，座標為百分比（同 <Annotate>） */
export interface ConnectorProps {
  dark: boolean;
  from: { x: number; y: number };
  to: { x: number; y: number };
  routing?: "orthogonal" | "curve" | "straight";   // 預設 orthogonal
  label?: string;
  dashed?: boolean;
  weight?: "normal" | "heavy";            // heavy = nifi p4 的 Commit/Deploy 粗箭頭
  tone?: SeriesTone;
}
```

## 關鍵落地規則

1. **`<Connector>` 一律畫在單一 `<svg>` 覆蓋層上**（`position: absolute` + `pointer-events: none`），
   與 [Task 39](task-39-deck-annotate-atom.md) 的 `<Annotate>` 引線同一套做法 ——
   **兩者的 SVG 折線與箭頭 marker 應抽共用**，不要寫兩份。
2. 座標用**百分比**不用 px（同 `<Annotate>` 的理由：換 `area` 或改內容會錯位）。
3. `<Node>` 不做絕對定位 —— 它就是一個盒子，位置由 `custom` 頁的 flex / grid 決定。
   要精確座標時由呼叫端自己包 `position: absolute`。
4. 顏色一律 `dkt(dark)` / `toneColor()`，字級一律 `DS`，**不硬編色碼、不寫字面數字**。
5. `StatusTone` 依 audit A-6：**icon + 文字同時出現**。
6. **不做自動佈局**（不算最短路徑、不做碰撞避讓、不排節點）。
   一旦開始做這些就是在寫 mermaid，正是 §4.3 判定要避開的方向。
7. 全型別標註、無 `any`、無 emoji。

## 實作步驟

1. `<GroupBox>`（最簡單，先建立視覺語言：虛線粗細、標題位置、巢狀時的內縮）。
2. `<Node>`。
3. `<Connector>`：先抽 Task 39 的 SVG 折線/箭頭為共用，再實作三種 routing 與 `weight`。
4. `blocks/index.ts` barrel 補匯出。
5. `atoms.deck.tsx` 補一頁，並**用這三個基元重畫 bullmq p13 的整合架構圖**當實證
   —— 組不出來就表示 API 有缺，比逐項驗收更能暴露問題。
6. `/present/atoms` 逐頁截圖，亮暗兩色。

## 驗收

- [ ] 三個基元皆可獨立渲染，亮暗兩色可讀
- [ ] `<Connector>` 三種 routing 正確；`heavy` 能表達 nifi p4 的粗箭頭；線上標籤不被線壓住
- [ ] `<GroupBox>` 可巢狀（dataint p15 是三層）
- [ ] **用三個基元重畫出 bullmq p13**，結構與原圖對得上
- [ ] SVG 折線 / 箭頭 marker 與 `<Annotate>` **共用同一份實作**，無重複程式碼
- [ ] 無自動佈局邏輯（`grep` 確認無最短路徑 / 碰撞避讓 / 節點排序程式碼）
- [ ] 無硬編色碼、無字面字級、無 `any`、無 emoji
- [ ] `npx tsc --noEmit && npx astro build` 通過

## 風險 / 備註

- **這個 Task 最容易失控。** 每加一個「順手也做一下」的能力（自動佈線、節點對齊輔助、
  路徑避讓）都會往 mermaid 滑一步。規則 6 是硬界線，實作時若發現「不做自動佈局就很難用」，
  **那是應該回頭重新評估要不要做這個 Task 的訊號**，不是放寬規則的理由。
- 判斷要不要做的依據，建議等 38–42 完成、實際生成過 2–3 份技術筆記的簡報之後再定：
  若 `custom` 頁自己寫 SVG 的痛感不明顯，這個 Task 可以直接不做。
- 若決定不做，`inventory` §4.3 的判定要改為「架構圖一律由 `custom` 頁自畫 SVG」，
  並在 [Task 45](task-45-present-skill-agents-atoms.md) 的 SKILL 寫明。
