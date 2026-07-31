// Block 元件庫 barrel（Task 34 — 契約 v0.2 §5.3）。
//
// 6 個元件，`custom` 頁 import 就有一致的長相；不 import、自己寫 JSX 也完全合法。
// 取捨標準是「有沒有承載設計決策」，不是出現次數 —— v0.1 的 `text` / `columns` / `viz`
// 是純版面（columns ≈ display:flex），做成元件只多一層轉譯，故不做（§5.3.1）。

export { Rows } from "./Rows";
export type { RowItem, RowsProps } from "./Rows";

export { Cards } from "./Cards";
export type { CardGroup, CardItem, CardsProps } from "./Cards";

export { Stages } from "./Stages";
export type { StageItem, StagesProps } from "./Stages";

export { Kpi } from "./Kpi";
export type { KpiItem, KpiProps } from "./Kpi";

export { Table } from "./Table";
export type { TableCell, TableProps } from "./Table";

export { Compare } from "./Compare";
export type { CompareProps, CompareSide } from "./Compare";

export type { BlockBaseProps } from "./shell";
