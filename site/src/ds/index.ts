// NoteCraftApp 官網的元件庫（site/DESIGN.md 的實作）。
// 樣式全部來自 src/styles/site.css、figs.css 與 ds.css；元件只輸出既有的 class。
export { ToneContext, useTone, DOC_NAME, type Tone } from "./tone";

export { Page, type PageProps } from "./layout/Page";
export { RunningHead, type RunningHeadProps } from "./layout/RunningHead";
export { Logo, type LogoProps } from "./layout/Logo";
export { TopNav, type TopNavProps, type NavLink } from "./layout/TopNav";

export { PageTitle, type PageTitleProps } from "./type/PageTitle";
export { Lead, type LeadProps } from "./type/Lead";
export { Ref, type RefProps } from "./type/Ref";

export { Button, type ButtonProps } from "./actions/Button";
export { CommandBar, type CommandBarProps } from "./actions/CommandBar";

export { Spec, SpecHeading, SpecParagraph, type SpecProps, type SpecHeadingProps, type SpecParagraphProps } from "./document/Spec";
export { Legend, type LegendProps, type LegendItem } from "./document/Legend";
export { Claims, CLAIMS_NOTE, type ClaimsProps, type ClaimItem } from "./document/Claims";
export { Biblio, type BiblioProps, type BiblioField } from "./document/Biblio";

export { Figure, type FigureProps } from "./figures/Figure";
export { Diff, type DiffProps, type DiffLine } from "./figures/Diff";
export { FolderTree, type FolderTreeProps, type TreeNode } from "./figures/FolderTree";
export { FlowSteps, DiagramNode, type FlowStepsProps, type DiagramNodeProps, type FlowStep, type StepState } from "./figures/FlowSteps";

export { DataTable, type DataTableProps, type DataTableRow } from "./data/DataTable";
export { CommandTable, type CommandTableProps, type CommandRow } from "./data/CommandTable";
export { VersionNumeral, type VersionNumeralProps } from "./data/VersionNumeral";
export { ReleaseGrid, type ReleaseGridProps, type Release } from "./data/ReleaseGrid";
