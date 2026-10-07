export type { DefEntry, DefIndex, DefNote, RefKind } from "./defs-state.d.mts";
import type { DefIndex } from "./defs-state.d.mts";

export const MAX_INCLUDE_DEPTH: number;
export function slugOfNotePath(rel: string, fmSlug?: unknown): string;
export function readFrontmatterLite(source: string): Record<string, unknown>;
export function buildDefIndex(
  files: { rel: string; source: string }[],
  opts?: { frontmatter?: (source: string) => Record<string, unknown> },
): DefIndex;
export function rebaseRelativeUrl(url: string, srcRel: string, curRel: string): string;
