import type { ScanUse } from "./defs-scan.d.mts";

export type RefKind = "inc" | "ref";

export interface DefEntry {
  id: string;
  label: string;
  /** 來源筆記：notesDir 相對路徑（真實檔案路徑） */
  rel: string;
  /** 來源筆記的 entry.id */
  slug: string;
  /** 來源筆記標題 */
  title: string;
  /** 來源筆記所在資料夾（真實路徑）；根目錄為 "" */
  folder: string;
  line: number;
  /** define 內容的原始碼 */
  source: string;
  /** 需要 import 的區塊元件數（§2.5） */
  components: number;
  /** define 內 include 的 id */
  includes: string[];
  /** 反向連結，已排序（§4.2） */
  refs: { slug: string; kinds: RefKind[] }[];
}

export interface DefNote {
  slug: string;
  rel: string;
  title: string;
  folder: string;
  /** 本篇 define 的 id（文件順序） */
  defines: string[];
  includes: ScanUse[];
  refs: ScanUse[];
  /** 本篇引用的定義（不含自己的；同 id 合併 kinds） */
  references: { id: string; kinds: RefKind[] }[];
}

export interface DefIndex {
  defs: Map<string, DefEntry>;
  /** slug → 筆記 */
  notes: Map<string, DefNote>;
  /** 「相對路徑:行 訊息」 */
  errors: string[];
  warnings: string[];
}

export const MAX_INCLUDE_DEPTH: number;
export function slugOfNotePath(rel: string, fmSlug?: unknown): string;
export function buildDefIndex(
  files: { rel: string; source: string }[],
  opts?: { frontmatter?: (source: string) => Record<string, unknown> },
): DefIndex;
export function getDefIndex(): DefIndex;
export function assertDefIndex(index?: DefIndex): void;
export function resetDefIndex(): void;
export function setDefIndexDev(on: boolean): void;
export function relOfNoteAbs(abs: string): string | null;
export function siteBase(): string;
export function relOfNoteFile(filePath: string): string | null;
export function rebaseRelativeUrl(url: string, srcRel: string, curRel: string): string;
