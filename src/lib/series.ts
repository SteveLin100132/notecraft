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

// 對 series.json 裡的 slug 做寬容化：剝副檔名、開頭的 ./、多餘的 /。
// 讓 slugs 可以寫成 "foo"、"foo.md"、"./foo.mdx"、"specs/foo.md" 都對到同一個 entry.id。
function normalizeSlug(raw: string): string {
  let s = raw.trim().replace(/^\.\//, "").replace(/\/+/g, "/").replace(/^\/+|\/+$/g, "");
  s = s.replace(/\.(mdx?|MDX?)$/, "");
  return s;
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
  try {
    const mod = await import("@/data/series.registry");
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

export type SeriesChapter = {
  slug: string;
  title: string;
  description: string;
  markersTotal: number;
  markersGenerated: number;
};

function noteBySlug(notes: Note[], slug: string): Note | undefined {
  return notes.find((n) => n.id === slug);
}

/** 依 registry 順序，把某系列的 slug 解析為章節靜態資料；找不到的 slug 會警示並跳過。 */
export function getSeriesChapters(notes: Note[], series: SeriesDef): SeriesChapter[] {
  const chapters: SeriesChapter[] = [];
  for (const slug of series.slugs) {
    const note = noteBySlug(notes, slug);
    if (!note) {
      console.warn(`[series] 系列 "${series.id}" 的章節 slug "${slug}" 找不到對應筆記，已跳過。`);
      continue;
    }
    const ms = parseMarkers(note.body);
    chapters.push({
      slug: note.id,
      title: note.data.title,
      description: note.data.description,
      markersTotal: ms.length,
      markersGenerated: ms.filter((m) => m.status === "generated").length,
    });
  }
  return chapters;
}

export type SeriesLink = { slug: string; title: string };

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
export function seriesOf(notes: Note[], slug: string, seriesList: SeriesDef[]): SeriesOf | null {
  for (const series of seriesList) {
    const i = series.slugs.indexOf(slug);
    if (i === -1) continue;
    const chapters = getSeriesChapters(notes, series);
    const ci = chapters.findIndex((c) => c.slug === slug);
    if (ci === -1) continue; // slug 在 registry 但筆記不存在（已警示）
    const toLink = (c?: SeriesChapter): SeriesLink | null => (c ? { slug: c.slug, title: c.title } : null);
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
