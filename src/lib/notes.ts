import fs from "node:fs";
import path from "node:path";
import { getCollection, type CollectionEntry } from "astro:content";

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
  if (body) {
    const m = body.match(/^#\s+(.+?)\s*$/m);
    if (m) return m[1].trim();
  }
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

export type AiMarker = {
  id: string;
  type: string;
  status: "pending" | "generated" | "locked" | "failed";
  prompt: string;
  caption?: string;
};

const MARKER_RE = /\{\/\*\s*@ai-visualize\s+([\s\S]*?)\*\/\}/g;

export function parseMarkers(body: string | undefined | null): AiMarker[] {
  const out: AiMarker[] = [];
  if (!body) return out;
  for (const m of body.matchAll(MARKER_RE)) {
    const raw = m[1];
    const obj: Record<string, string> = {};
    let key: string | null = null;
    let multi: string[] | null = null;
    for (const line of raw.split("\n")) {
      const trimmed = line.replace(/\s+$/, "");
      if (multi) {
        if (/^\s*\S/.test(trimmed) && !/^\s{2,}/.test(trimmed) && trimmed.includes(":")) {
          obj[key!] = multi.join("\n").trim();
          multi = null;
          key = null;
        } else {
          multi.push(trimmed.replace(/^\s{2}/, ""));
          continue;
        }
      }
      const mk = trimmed.match(/^\s*([a-zA-Z_]\w*)\s*:\s*(.*)$/);
      if (!mk) continue;
      const k = mk[1];
      const v = mk[2];
      if (v === "|") {
        key = k;
        multi = [];
      } else {
        obj[k] = v.trim();
      }
    }
    if (multi && key) obj[key] = multi.join("\n").trim();
    if (obj.id) {
      out.push({
        id: obj.id,
        type: obj.type || "free",
        status: (obj.status as AiMarker["status"]) || "pending",
        prompt: obj.prompt || "",
        ...(obj.caption ? { caption: obj.caption } : {}),
      });
    }
  }
  return out;
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

export type DashboardStats = {
  total: number;
  weekNew: number;
  monthNew: number;
  markersTotal: number;
  markersGenerated: number;
  recent: { slug: string; title: string; updatedAt: string; tags: string[]; markersTotal: number; markersGenerated: number }[];
  tags: { name: string; count: number }[];
  notesWithMarkers: number;
};

export function buildDashboardStats(notes: Note[], today: string): DashboardStats {
  const tNow = new Date(today + "T00:00:00").getTime();
  let weekNew = 0;
  let monthNew = 0;
  let markersTotal = 0;
  let markersGenerated = 0;
  let notesWithMarkers = 0;
  for (const n of notes) {
    const created = new Date(n.data.createdAt + "T00:00:00").getTime();
    if (tNow - created < 7 * 86400000) weekNew++;
    if (tNow - created < 30 * 86400000) monthNew++;
    const ms = parseMarkers(n.body);
    if (ms.length) notesWithMarkers++;
    markersTotal += ms.length;
    markersGenerated += ms.filter((m) => m.status === "generated").length;
  }
  const recent = notes.slice(0, 6).map((n) => {
    const ms = parseMarkers(n.body);
    return {
      slug: n.id,
      title: n.data.title,
      updatedAt: n.data.updatedAt,
      tags: n.data.tags,
      markersTotal: ms.length,
      markersGenerated: ms.filter((m) => m.status === "generated").length,
    };
  });
  const tags = tagStats(notes)
    .slice(0, 6)
    .map((t) => ({ name: t.name, count: t.count }));
  return {
    total: notes.length,
    weekNew,
    monthNew,
    markersTotal,
    markersGenerated,
    recent,
    tags,
    notesWithMarkers,
  };
}

export function excerpt(body: string | undefined | null, fallback: string): string {
  if (!body) return fallback.replace(/\s+/g, " ").slice(0, 220);
  const stripped = body
    .replace(/^---[\s\S]*?---/, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/^import[^\n]*$/gm, "")
    .replace(/<[A-Z][^>]*\/?>/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^#+\s.*$/gm, "")
    .replace(/^\s*[-*]\s.*$/gm, "")
    .replace(/^>\s.*$/gm, "")
    .trim();
  const para = stripped.split(/\n{2,}/).find((p) => p.trim().length > 0);
  return (para || fallback).replace(/\s+/g, " ").slice(0, 220);
}
