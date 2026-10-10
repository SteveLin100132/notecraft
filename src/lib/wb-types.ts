// 工作台索引的型別（client-safe：純型別，無 Node 依賴）。
// 產生它的程式在 src/lib/workbench.ts（build 期、用 node:fs，不可進 client bundle）。
// 規格：docs/notecraft-workbench.md §5.1
import type { SeriesAccent, SeriesIconName } from "@/data/series";

export type WbMarkerStatus = "pending" | "generated" | "locked" | "failed";

export interface WbMarker {
  id: string;
  type: string;
  status: WbMarkerStatus;
  prompt: string;
}

export interface WbNoteSeriesRef {
  id: string;
  title: string;
  accent: SeriesAccent;
  /** 該筆記在系列 slugs 裡的序，1 起算（含資料檔章節在內的序）。 */
  index: number;
  total: number;
}

export interface WbNoteRow {
  /** entry.id。**只用於 /notes/<slug> 網址與 localStorage key**，不要拿來反推路徑。 */
  slug: string;
  title: string;
  description: string;
  /** 真實檔案相對 notesDir 的路徑，含副檔名、正斜線。不是 slug。 */
  path: string;
  /** path 的資料夾分段（真實名稱）；根目錄為 []。 */
  folder: string[];
  tags: string[];
  markers: WbMarker[];
  createdAt: string;
  updatedAt: string;
  series: WbNoteSeriesRef | null;
  hasFrontmatter: boolean;
  hasDeck: boolean;
  /** 給 Claude Code 對話範本用、相對專案根的檔案路徑。**僅 dev 輸出**，正式 build 不帶這個鍵。 */
  promptPath?: string;
  /** 本篇 define 的 id（文件順序）；沒有就是 []（docs/notecraft-workbench-define-ref.md §9） */
  defines: string[];
  /** 本篇引用的定義（不含自己的；同 id 合併 kinds） */
  references: { id: string; kinds: WbRefKind[] }[];
}

/** 定義與引用：嵌入（::include）或行內引用（:ref） */
export type WbRefKind = "inc" | "ref";

/** 一個 define 的摘要。反向連結只存在這裡，筆記列上不另存（避免雙向資料不同步）。 */
export interface WbDef {
  id: string;
  label: string;
  /** 來源筆記的 slug */
  slug: string;
  /** 引用它的筆記，已排序（引用該來源的 id 數多到少，同數依資料夾樹） */
  refs: { slug: string; kinds: WbRefKind[] }[];
}

/** Graph 檢視的邊種類：定義引用、定義嵌入、站內連結、系列順序（docs/notecraft-workbench-notes-graph.md §4.2） */
export type WbEdgeKind = "ref" | "inc" | "link" | "seq";

/**
 * Graph 檢視的一條邊：同一對（有序）節點的所有關聯合成一條。方向是「來源 → 被參照的一方」。
 * 節點 id：筆記是 slug，資料檔是 `view:<routePath>`。只由 lib/wb-graph.ts 的 buildGraphEdges 產生。
 */
export interface WbGraphEdge {
  s: string;
  t: string;
  /** 各種類的次數 */
  kinds: Partial<Record<WbEdgeKind, number>>;
}

/** Graph 檢視的資料檔節點（只列出現在任何一條邊裡的資料檔） */
export interface WbGraphDataNode {
  /** `view:<routePath>` */
  id: string;
  title: string;
  pluginId: string;
  /** /view/<routePath>，已含 base */
  href: string;
}

/** 資料夾樹的節點。不帶 color（Q6：資料夾不分色）。 */
export interface WbFolderNode {
  name: string;
  /** 由根到此的完整路徑，正斜線；同時是 ?folder= 的值。 */
  path: string;
  /** 含子孫的筆記數。 */
  count: number;
  children: WbFolderNode[];
}

export interface WbChapter {
  kind: "note" | "data";
  /** 識別碼原字串（資料檔含 view: 前綴），也是閱讀進度的 localStorage key。 */
  ref: string;
  href: string;
  title: string;
  /** 顯示用路徑：筆記是 WbNoteRow.path，資料檔是相對 notesDir 的路徑。 */
  path: string;
  pluginId?: string;
}

export interface WbSeries {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  accent: SeriesAccent;
  icon: SeriesIconName;
  /** 已解析的章節（對不到的識別碼已被跳過）。進度分母以這個為準。 */
  chapters: WbChapter[];
}

export interface WbDataFile {
  routePath: string;
  /** 相對 notesDir 的路徑，含副檔名。 */
  relPath: string;
  /** 所在資料夾；根目錄為 ""。 */
  dir: string;
  title: string;
  description: string;
  pluginId: string;
  /** YYYY-MM-DD */
  updatedAt: string;
}

export interface WbPluginMapping {
  files: string[];
  exclude?: string[];
  options?: Record<string, unknown>;
}

export type WbPluginAssetRole = "manifest" | "renderer" | "data schema" | "範例資料" | "說明" | "";

export interface WbPlugin {
  id: string;
  title: string;
  version: string;
  author: string;
  description: string;
  homepage: string;
  /** 原字串，app 不做相容性判斷（Q24） */
  engines: string;
  dataSchema: string;
  example: string;
  /** 顯示用來源：內建（官方 store）／已安裝（含來源網址與 commit） */
  source: { kind: "builtin" | "installed"; origin?: string; commit?: string };
  /** 顯示用的資料夾路徑（相對專案根），不含本機絕對路徑 */
  dir: string;
  mappings: WbPluginMapping[];
  /** 命中的資料檔（routePath） */
  matched: string[];
  /** 已停用時「若啟用會命中」的檔（Task 71）；啟用中恆為 [] */
  inactiveMatches: string[];
  assets: { path: string; role: WbPluginAssetRole }[];
  enabled: boolean;
}

export interface WbTagStat {
  name: string;
  count: number;
  lastUsed: string;
}

export interface WbIndex {
  notes: WbNoteRow[];
  folders: WbFolderNode[];
  /** 根目錄（不在任何資料夾）的筆記數。「根目錄」不是樹的節點，由 UI 在分組時放最前。 */
  rootCount: number;
  series: WbSeries[];
  tags: WbTagStat[];
  dataFiles: WbDataFile[];
  plugins: WbPlugin[];
  /** 沒有 plugins.json 時 false：/plugins 顯示空狀態 */
  pluginSystem: boolean;
  /** package.json 的 version */
  appVersion: string;
  pending: { markers: number; notes: number };
  /** 顯示用的工作區名稱；不含本機絕對路徑、不含 ../。 */
  workspaceLabel: string;
  /** 全站的定義（不含原始碼與渲染內容；預覽內容在各筆記頁上） */
  defs: WbDef[];
  /** Graph 檢視的邊（全站）。節點由 notes 與 dataFiles 推導，不另存 */
  graph: { edges: WbGraphEdge[] };
}

/** AI 狀態：`status !== "generated"` 即算待生成（與舊 BaseLayout 的算法一致）。 */
export function markerCounts(markers: WbMarker[]): { done: number; pending: number } {
  let done = 0;
  for (const m of markers) if (m.status === "generated") done++;
  return { done, pending: markers.length - done };
}

export const ROOT_GROUP = "根目錄";
