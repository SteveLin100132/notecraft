// ── 系列 build 端彙總（執行於 astro build / dev）──
// P4：SERIES 不再是模組頂層常數，改由 loadSeries() 依 env 決定資料來源。
// - 有 NOTECRAFT_NOTES_DIR → 讀 <notesDir>/.notecraft/series.json（外部 viewer）
// - 沒有 env → dynamic import ./data/series.registry 拿回硬編碼陣列（主專案 / 開發）
// - 兩者都沒 → 空陣列，/series 頁顯示引導文案

import fs from "node:fs";
import path from "node:path";
import { z } from "astro:content";
import type { SeriesDef } from "@/data/series";
import { parseMarkers, type Note } from "@/lib/notes";
import type { ResolvedDataFile } from "@/lib/plugin-types";

export type { SeriesDef };

// ── 外部 series.json 的 schema ──
const SeriesEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  eyebrow: z.string(),
  description: z.string(),
  accent: z.enum(["blue", "orange", "navy"]),
  icon: z.enum(["target", "code", "layers", "bookOpen", "bolt"]),
  slugs: z.array(z.string()),
});

const SeriesFileSchema = z.object({
  $schema: z.string().optional(),
  series: z.array(SeriesEntrySchema),
});

/** 章節識別碼的前綴：資料檔頁一律寫成 `view:<路徑去副檔名>`。 */
export const DATA_REF_PREFIX = "view:";

/** 某個識別碼指的是資料檔頁還是筆記。用前綴判別而非副檔名 —— 明確勝過推斷。 */
export function isDataRef(ref: string): boolean {
  return ref.startsWith(DATA_REF_PREFIX);
}

/** 資料檔的路由段 → 章節識別碼。 */
export function dataRef(routePath: string): string {
  return DATA_REF_PREFIX + routePath;
}

// 對 series.json 裡的識別碼做寬容化：剝開頭的 ./、多餘的 /，以及副檔名。
// 筆記可寫成 "foo"、"foo.md"、"./foo.mdx"；資料檔可寫成 "view:a/b" 或 "view:a/b.json"。
function normalizeSlug(raw: string): string {
  const trimmed = raw.trim();
  const isData = trimmed.startsWith(DATA_REF_PREFIX);
  let s = isData ? trimmed.slice(DATA_REF_PREFIX.length) : trimmed;
  s = s.replace(/^\.\//, "").replace(/\/+/g, "/").replace(/^\/+|\/+$/g, "");
  s = s.replace(isData ? /\.(json|JSON)$/ : /\.(mdx?|MDX?)$/, "");
  return isData ? DATA_REF_PREFIX + s : s;
}

async function loadFromExternalJson(notesDir: string): Promise<SeriesDef[]> {
  // 依序嘗試兩個位置：
  // 1) <notesDir>/.notecraft/series.json（近的：緊鄰筆記）
  // 2) <userCwd>/.notecraft/series.json（遠的：使用者專案根，例：對 ./docs 呼叫時的專案 root）
  // 近的贏遠的，符合大部分工具的 config discovery 直覺。
  const candidates = [path.resolve(notesDir, ".notecraft/series.json")];
  const userCwd = process.env.NOTECRAFT_USER_CWD;
  if (userCwd && path.resolve(userCwd) !== path.resolve(notesDir)) {
    candidates.push(path.resolve(userCwd, ".notecraft/series.json"));
  }
  for (const abs of candidates) {
    if (!fs.existsSync(abs)) continue;
    try {
      const raw = fs.readFileSync(abs, "utf-8");
      const parsed = SeriesFileSchema.parse(JSON.parse(raw));
      return parsed.series.map((s) => ({ ...s, slugs: s.slugs.map(normalizeSlug) }));
    } catch (e) {
      console.warn(`[series] 讀 ${abs} 失敗：${(e as Error).message}`);
    }
  }
  return [];
}

async function loadFromRegistry(): Promise<SeriesDef[]> {
  // series.registry.ts 是主專案本地檔、被 .npmignore 排除。
  // 直接 `await import("@/data/series.registry")` 會讓 rollup 在 build 期靜態
  // resolve 失敗（tarball 沒有此檔）；改用 import.meta.glob——找不到檔就返回空 map、不 error。
  const registryModules = import.meta.glob<{ SERIES: SeriesDef[] }>(
    "../data/series.registry.ts",
  );
  const key = Object.keys(registryModules)[0];
  if (!key) return [];
  try {
    const mod = await registryModules[key]();
    return mod.SERIES;
  } catch {
    return [];
  }
}

// 重複 slug 偵測：同一 slug 出現在多個系列 → 警示、以首見為準（build log，不中斷）。
function dedupeSlugsAcrossSeries(series: SeriesDef[]): void {
  const seen = new Map<string, string>();
  for (const s of series) {
    for (const slug of s.slugs) {
      const prev = seen.get(slug);
      if (prev && prev !== s.id) {
        console.warn(
          `[series] slug "${slug}" 同時出現在系列 "${prev}" 與 "${s.id}"，違反單系列歸屬；以首見（${prev}）為準。`,
        );
      } else if (!prev) {
        seen.set(slug, s.id);
      }
    }
  }
}

/** 統一入口：依 env 決定資料來源，載入完成才做 dedupe 檢查。 */
export async function loadSeries(): Promise<SeriesDef[]> {
  const envDir = process.env.NOTECRAFT_NOTES_DIR;
  const series = envDir
    ? await loadFromExternalJson(envDir)
    : await loadFromRegistry();
  dedupeSlugsAcrossSeries(series);
  return series;
}

/**
 * 系列的一章。可以是筆記，也可以是由 plugin 渲染的資料檔頁 —— 兩者一視同仁：
 * 都有序號、都計入進度分母、都可被標記為已完成（見 docs/notecraft-plugin-system.md §7.6）。
 *
 * `ref` 是識別碼原字串，**也是閱讀進度的 localStorage key**。不要剝掉 `view:` 前綴 ——
 * 剝掉的話筆記 `a/b` 與資料檔 `view:a/b` 會撞同一格。
 */
export type SeriesChapter = {
  kind: "note" | "data";
  ref: string;
  /** 點下去要去哪 */
  href: string;
  title: string;
  description: string;
  /** 資料檔恆為 0（它沒有 @ai-visualize 標記） */
  markersTotal: number;
  markersGenerated: number;
  /** 只有資料檔有：原始檔路徑與渲染它的 plugin */
  relPath?: string;
  pluginId?: string;
};

function noteBySlug(notes: Note[], slug: string): Note | undefined {
  return notes.find((n) => n.id === slug);
}

/** 依 registry 順序解析章節；對不到的識別碼會警示並跳過（三種情況分開講，見 §7.6.2）。 */
export function getSeriesChapters(
  notes: Note[],
  series: SeriesDef,
  dataFiles: ResolvedDataFile[] = [],
): SeriesChapter[] {
  const chapters: SeriesChapter[] = [];
  for (const ref of series.slugs) {
    if (isDataRef(ref)) {
      const routePath = ref.slice(DATA_REF_PREFIX.length);
      const file = dataFiles.find((f) => f.routePath === routePath);
      if (!file) {
        console.warn(
          `[series] 系列 "${series.id}" 的章節 "${ref}" 找不到對應的資料檔。` +
            `請確認 .notecraft/plugins.json 的 files 有涵蓋 ${routePath}.json，且該檔已被 plugin 認領。`,
        );
        continue;
      }
      chapters.push({
        kind: "data",
        ref,
        href: `/view/${file.routePath}`,
        title: file.title,
        description: file.description,
        markersTotal: 0,
        markersGenerated: 0,
        relPath: file.relPath,
        pluginId: file.pluginId,
      });
      continue;
    }
    const note = noteBySlug(notes, ref);
    if (!note) {
      console.warn(`[series] 系列 "${series.id}" 的章節 slug "${ref}" 找不到對應筆記，已跳過。`);
      continue;
    }
    const ms = parseMarkers(note.body);
    chapters.push({
      kind: "note",
      ref: note.id,
      href: `/notes/${note.id}`,
      title: note.data.title,
      description: note.data.description,
      markersTotal: ms.length,
      markersGenerated: ms.filter((m) => m.status === "generated").length,
    });
  }
  return chapters;
}

export type SeriesLink = { ref: string; href: string; title: string; kind: "note" | "data"; relPath?: string };

export type SeriesOf = {
  series: SeriesDef;
  /** 0-based 章節索引。 */
  index: number;
  total: number;
  chapters: SeriesChapter[];
  prev: SeriesLink | null;
  next: SeriesLink | null;
};

/**
 * 取得某筆記所屬系列的導覽資訊；不在任何系列則回傳 null（取代 seriesNav）。
 * P4：多一個 seriesList 參數，避免每次呼叫都重複載入外部 JSON。呼叫端一次 await loadSeries() 後把結果傳進來。
 */
export function seriesOf(
  notes: Note[],
  ref: string,
  seriesList: SeriesDef[],
  dataFiles: ResolvedDataFile[] = [],
): SeriesOf | null {
  for (const series of seriesList) {
    const i = series.slugs.indexOf(ref);
    if (i === -1) continue;
    const chapters = getSeriesChapters(notes, series, dataFiles);
    const ci = chapters.findIndex((c) => c.ref === ref);
    if (ci === -1) continue; // 識別碼在 registry 但對應項目不存在（已警示）
    const toLink = (c?: SeriesChapter): SeriesLink | null =>
      c ? { ref: c.ref, href: c.href, title: c.title, kind: c.kind, relPath: c.relPath } : null;
    return {
      series,
      index: ci,
      total: chapters.length,
      chapters,
      prev: toLink(chapters[ci - 1]),
      next: toLink(chapters[ci + 1]),
    };
  }
  return null;
}
