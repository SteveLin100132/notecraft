// notes-ignore.mjs 的型別（docs/notecraft-ignore-config.md §4）。
import type { Dirent } from "node:fs";

export const IGNORE_FILE: "ignore.json";
export const BUILTIN_IGNORES: readonly string[];

export interface NotesIgnore {
  /** relPath：相對 notesDir、以 / 分隔；資料夾要帶結尾 /。含 \、以 / 開頭、含 . 或 .. 片段 → throw。 */
  ignores(relPath: string): boolean;
  /** 只看使用者規則（不含內建）。 */
  ignoresByUser(relPath: string): boolean;
  /** 規則數（不含內建、註解、空白）。 */
  readonly ruleCount: number;
  readonly rules: readonly string[];
  /** 實際讀到的檔案路徑；沒有檔為 null。 */
  readonly source: string | null;
  /** 想用 ! 解除內建排除、因此不會生效的規則（Q5）。 */
  readonly builtinNegations: readonly string[];
}

export interface LoadedNotesIgnore extends NotesIgnore {
  /** $schema、ignore 以外的頂層鍵。 */
  readonly unknownKeys: readonly string[];
}

export interface WalkResult {
  /** 被排除而沒有進入的資料夾（帶結尾 /）。 */
  prunedDirs: string[];
  /** 被排除的檔案（不含被剪枝資料夾內的）。 */
  ignoredFiles: string[];
}

export interface WalkFile {
  rel: string;
  abs: string;
  dirent: Dirent;
}

export interface WalkDir {
  rel: string;
  abs: string;
}

export function createNotesIgnore(patterns: readonly string[], opts?: { source?: string | null }): NotesIgnore;
export function parseIgnoreJson(text: string, sourceLabel: string): { patterns: string[]; unknownKeys: string[] };
export function resolveNotesDir(env: Record<string, string | undefined>, cwd: string): string;
export function resolveNotecraftDir(env: Record<string, string | undefined>, cwd: string): string;
export function loadNotesIgnore(notecraftDir: string, sourceLabel?: string): LoadedNotesIgnore;
export function findShadowedIgnoreFiles(notesDir: string, notecraftDir: string): string[];
export function toNotesRel(notesDir: string, abs: string): string | null;
export function walkNotes(
  notesDir: string,
  ig: NotesIgnore,
  onFile?: (e: WalkFile) => void,
  onDir?: (e: WalkDir) => void,
): WalkResult;
export function walkNotesAsync(
  notesDir: string,
  ig: NotesIgnore,
  onFile?: (e: WalkFile) => void | Promise<void>,
  onDir?: (e: WalkDir) => void | Promise<void>,
): Promise<WalkResult>;
export function deadNegations(ig: { rules: readonly string[] }, prunedDirs: readonly string[]): string[];
