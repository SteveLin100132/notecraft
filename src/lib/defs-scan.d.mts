export interface ScanDefine {
  id: string;
  /** 顯示名稱：label 屬性 → 內容第一個粗體 → id（§2.3） */
  label: string;
  /** define 開頭那一行（1 起算） */
  line: number;
  /** define 內容在原始碼的 offset（不含 fence 行）；source.slice(start, end) === source */
  start: number;
  end: number;
  /** 需要 import 的區塊元件數，連續的算一個（嵌入時成為 placeholder，§2.5） */
  components: number;
  /** define 內容的原始碼（給 remark plugin 解析） */
  source: string;
}

export interface ScanUse {
  id: string;
  line: number;
  /** 寫在哪個 define 裡；不在 define 裡為 null */
  inDefine: string | null;
}

export interface ScanError {
  line: number;
  message: string;
}

export interface ScanResult {
  defines: ScanDefine[];
  includes: ScanUse[];
  refs: ScanUse[];
  errors: ScanError[];
  /** 第一個最上層 H1 的文字（同 note-text.ts 的 firstH1；給沒有 frontmatter title 的筆記當標題） */
  h1: string;
}

export function isValidDefId(id: string): boolean;
export function parseAttrs(raw: string): Record<string, string>;
export function maskNonProse(src: string): string;
export function scanDefs(source: string): ScanResult;
export function suggestIds(id: string, all: readonly string[]): string[];
