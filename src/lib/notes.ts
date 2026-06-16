import { getCollection, type CollectionEntry } from "astro:content";

export type Note = CollectionEntry<"notes">;

export type AiMarker = {
  id: string;
  type: string;
  status: "pending" | "generated" | "locked" | "failed";
  prompt: string;
  caption?: string;
};

const MARKER_RE = /\{\/\*\s*@ai-visualize\s+([\s\S]*?)\*\/\}/g;

export function parseMarkers(body: string): AiMarker[] {
  const out: AiMarker[] = [];
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

export async function getAllNotes(): Promise<Note[]> {
  const notes = await getCollection("notes");
  return notes.sort((a, b) => b.data.updatedAt.localeCompare(a.data.updatedAt));
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
      slug: n.slug,
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

export function excerpt(body: string, fallback: string): string {
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
