import fs from "node:fs";
import path from "node:path";
import { getCollection, type CollectionEntry } from "astro:content";
import { acceptsMarkers, excerpt, firstH1, parseMarkers, type AiMarker } from "@/lib/note-text";

export { excerpt, parseMarkers, type AiMarker };

// RawNote：直接從 astro:content 讀出來的 entry，data 的 title/createdAt/updatedAt 可能 undefined。
export type RawNote = CollectionEntry<"notes">;

// EnrichedNote：經 enrichNote() 補足預設值後的形式，data 的關鍵欄位保證有值。
// 下游只讀 .data.xxx 與 .body / .id / .filePath，因此以 Omit 覆蓋 data 即可。
export type EnrichedNote = Omit<RawNote, "data"> & {
  data: {
    title: string;
    description: string;
    tags: string[];
    category?: string;
    createdAt: string;
    updatedAt: string;
  };
};

// 對外的 Note 型別指向 EnrichedNote，讓下游程式碼繼續讀 n.data.title 等而不需要 null check。
export type Note = EnrichedNote;

// Content Layer (glob loader) 沒有 entry.slug，改用 entry.id；為降低散彈式改動，統一封裝成 noteSlug(n)。
export function noteSlug(note: RawNote | EnrichedNote): string {
  return note.id;
}

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fallbackTitle(id: string, body: string | undefined | null): string {
  const h1 = firstH1(body);
  if (h1) return h1;
  return id.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// P3：把 optional 欄位補齊。原則：
// - title 依「H1 → 檔名 Title Case」順序 fallback
// - description 缺就從內文段落抓 excerpt
// - createdAt / updatedAt 缺就讀檔案的 birthtime / mtime（Node fs 只在 build/dev 時可用，正好符合 Astro 執行時機）
export function enrichNote(entry: RawNote): EnrichedNote {
  const d = entry.data;
  let birthISO: string | undefined;
  let mtimeISO: string | undefined;
  if ((!d.createdAt || !d.updatedAt) && entry.filePath) {
    try {
      const abs = path.resolve(process.cwd(), entry.filePath);
      const st = fs.statSync(abs);
      birthISO = fmtDate(st.birthtime);
      mtimeISO = fmtDate(st.mtime);
    } catch {
      // 檔案不存在（不該發生）或權限問題 → 走最終 fallback
    }
  }
  const finalMtime = d.updatedAt ?? mtimeISO ?? birthISO ?? "2000-01-01";
  const finalCreated = d.createdAt ?? birthISO ?? mtimeISO ?? finalMtime;
  return {
    ...entry,
    data: {
      title: d.title ?? fallbackTitle(entry.id, entry.body),
      description: d.description || excerpt(entry.body, ""),
      tags: d.tags ?? [],
      category: d.category,
      createdAt: finalCreated,
      updatedAt: finalMtime,
    },
  };
}

// 標記解析本體在 note-text.ts（純函式、有斷言）；這裡只加上「哪些檔案的標記算數」。
const warnedMdMarkers = new Set<string>();

/**
 * 筆記的 @ai-visualize 標記。只有 .mdx 會被 AI 流程處理；.md 裡的標記回傳空陣列
 * （不進待生成卡片、AI 佇列、Dashboard 計數），並在 build／dev log 對每個檔案 warn 一次。
 */
export function noteMarkers(note: Pick<RawNote, "body" | "filePath">): AiMarker[] {
  if (acceptsMarkers(note.filePath)) return parseMarkers(note.body);
  if (note.filePath && !warnedMdMarkers.has(note.filePath) && parseMarkers(note.body).length > 0) {
    warnedMdMarkers.add(note.filePath);
    console.warn(
      `[notecraft] ${path.basename(note.filePath)} 含 @ai-visualize 標記，但 .md 不會被 AI 流程處理；要生成視覺化請把副檔名改成 .mdx。`,
    );
  }
  return [];
}

export async function getAllNotes(): Promise<EnrichedNote[]> {
  const notes = await getCollection("notes");
  const enriched = notes.map(enrichNote);
  return enriched.sort((a, b) => b.data.updatedAt.localeCompare(a.data.updatedAt));
}

// 系列章節順序權威已移至集中式 registry（src/data/series.ts）；
// 上一章 / 下一章導覽改由 src/lib/series.ts 的 seriesOf() 推導。
// 既有 frontmatter series / order 仍保留供筆記列表「系列」排序使用。

export type TagStat = { name: string; count: number; lastUsed: string };

export function tagStats(notes: Note[]): TagStat[] {
  const m = new Map<string, TagStat>();
  for (const n of notes) {
    for (const t of n.data.tags) {
      const cur = m.get(t) ?? { name: t, count: 0, lastUsed: "0000-00-00" };
      cur.count += 1;
      if (n.data.updatedAt > cur.lastUsed) cur.lastUsed = n.data.updatedAt;
      m.set(t, cur);
    }
  }
  return Array.from(m.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
