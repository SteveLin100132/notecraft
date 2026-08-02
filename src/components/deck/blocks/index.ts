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

// Task 43 —— 三個「整頁級」原子：定位矩陣 / 累計拆解 / 主張＋三要素。
// 與前 14 個的差別是**它們預期獨佔 custom 頁的內容區**，不與其他 block 並排。
export { Quadrant } from "./Quadrant";
export type { QuadrantCell, QuadrantProps } from "./Quadrant";
export { Waterfall } from "./Waterfall";
export type { WaterfallProps, WaterfallStep } from "./Waterfall";
export { Triad } from "./Triad";
export type { TriadItem, TriadProps } from "./Triad";

// Task 44 —— 第二批整頁級原子：強度矩陣 / 排序榜 / 風險研判 / 章節導覽 / 量化前後對比。
export { Heatmap } from "./Heatmap";
export type { HeatCell, HeatmapProps, HeatRow } from "./Heatmap";
export { Ranking } from "./Ranking";
export type { RankingProps, RankItem } from "./Ranking";
export { Risk } from "./Risk";
export type { RiskItem, RiskProps } from "./Risk";
export { Contents } from "./Contents";
export type { ContentsItem, ContentsProps } from "./Contents";
export { BeforeAfter } from "./BeforeAfter";
export type { BeforeAfterProps, BeforeAfterRow } from "./BeforeAfter";

// Task 45 —— 第三批。前三個對應 theme07（摘要 / 方法 / 集中度），
// 後四個是 theme07 結構上沒有、但技術筆記需要的缺口（分層 / 決策記錄 / 取捨光譜 / 角色關係）。
export { Summary } from "./Summary";
export type { SummaryPoint, SummaryProps, SummaryStat } from "./Summary";
export { Cross } from "./Cross";
export type { CrossNote, CrossProps } from "./Cross";
export { Share } from "./Share";
export type { ShareProps, ShareSegment } from "./Share";
export { Layers } from "./Layers";
export type { LayerItem, LayersProps } from "./Layers";
export { Decision } from "./Decision";
export type { DecisionOption, DecisionProps } from "./Decision";
export { Spectrum } from "./Spectrum";
export type { SpectrumMark, SpectrumProps } from "./Spectrum";
export { Roster } from "./Roster";
export type { RosterActor, RosterProps } from "./Roster";
