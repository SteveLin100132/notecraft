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
export type { StageItem, StagesProps, StagesVariant } from "./Stages";

export { Kpi } from "./Kpi";
export type { KpiItem, KpiProps } from "./Kpi";

export { Table } from "./Table";
export type { TableCell, TableProps } from "./Table";

export { Compare } from "./Compare";
export type { CompareProps, CompareSide } from "./Compare";

// Task 38 —— 程式碼呈現。與筆記內文共用 @/lib/code-tokenize 的 tokenizer。
export { Code } from "./Code";
export type { CodeLabel, CodeLine, CodeProps } from "./Code";
export { codeTone } from "./codeTokens";
export type { CodeTokenStyle } from "./codeTokens";

// Task 39 —— 通用標註層（截圖熱點 / 引線標籤 / 架構圖編號）。
export { Annotate } from "./Annotate";
export type { AnnLeader, AnnotateProps, AnnPin, AnnSide } from "./Annotate";

// Task 40 —— 量化圖表。系列數硬上限 3、禁 tooltip、不用 ResponsiveContainer。
export { Chart } from "./Chart";
export type { ChartProps, ChartRow, ChartSeries, ChartVariant } from "./Chart";

// Task 41 —— 三個小原子：終端機 / 擬真框 / 行內螢光筆。
export { Terminal } from "./Terminal";
export type { TerminalProps, TermKind, TermLine } from "./Terminal";
export { Frame } from "./Frame";
export type { FrameKind, FrameProps } from "./Frame";
export { Mark } from "./Mark";
export type { MarkProps } from "./Mark";

export type { BlockBaseProps } from "./shell";

// Task 42 —— 文字雲與 logo 組合（Stages 的 rail/cycle、Cards 的 recommended、
// Rows 的 chip variant 都是擴充既有元件，不另開匯出）。
export { TagCloud } from "./TagCloud";
export type { TagCloudProps, TagItem } from "./TagCloud";
export { LogoRow } from "./LogoRow";
export type { LogoItem, LogoRowProps } from "./LogoRow";
