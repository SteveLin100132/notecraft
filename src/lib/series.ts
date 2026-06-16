// ── 系列 build 端彙總（執行於 astro build / dev，依賴 astro:content）──
// registry 的 slugs 為章節順序唯一權威；本檔把 slug 對應回筆記、產出靜態章節資料，
// 並提供 seriesOf()（取代舊 lib/notes.ts 的 seriesNav，由 registry 推導上一章/下一章）。

import { SERIES, type SeriesDef } from "@/data/series";
import { parseMarkers, type Note } from "@/lib/notes";

export { SERIES };
export type { SeriesDef };

export type SeriesChapter = {
  slug: string;
  title: string;
  description: string;
  markersTotal: number;
  markersGenerated: number;
};

function noteBySlug(notes: Note[], slug: string): Note | undefined {
  return notes.find((n) => n.slug === slug);
}

// 重複 slug 偵測：同一 slug 出現在多個系列 → 警示、以首見為準（build log，不中斷）。
const _seen = new Map<string, string>();
for (const s of SERIES) {
  for (const slug of s.slugs) {
    const prev = _seen.get(slug);
    if (prev && prev !== s.id) {
      console.warn(
        `[series] slug "${slug}" 同時出現在系列 "${prev}" 與 "${s.id}"，違反單系列歸屬；以首見（${prev}）為準。`,
      );
    } else if (!prev) {
      _seen.set(slug, s.id);
    }
  }
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
      slug: note.slug,
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

/** 取得某筆記所屬系列的導覽資訊；不在任何系列則回傳 null（取代 seriesNav）。 */
export function seriesOf(notes: Note[], slug: string): SeriesOf | null {
  for (const series of SERIES) {
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
