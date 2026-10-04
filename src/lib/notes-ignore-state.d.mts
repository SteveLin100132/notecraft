// notes-ignore-state.mjs 的型別。
import type { LoadedNotesIgnore } from "./notes-ignore.mjs";

export function getNotesDir(): string;
export function getNotecraftDir(): string;
export function getNotesIgnore(): LoadedNotesIgnore;
export function resetNotesIgnore(): void;
export function isIgnoredAbs(abs: string, isDir?: boolean): boolean;
export function notesBaseUrl(notesDir: string): URL;
export function entryRelToNotes(rootUrl: URL, filePath: string, notesDir: string): string | null;
