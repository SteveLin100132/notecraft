// /notes 的「網址 → 篩選 → 分組」純函式（client-safe）。
// `output: 'static'` 下 query string 在 build 期不可見，全部由 client 讀 location.search（規格 §6）。
import { markerCounts, ROOT_GROUP, type WbNoteRow } from "@/lib/wb-types";
import { isView, type WbGroupBy, type WbView } from "@/lib/wb-prefs";

export interface WbQuery {
  /** 資料夾真實路徑；前綴比對、含所有子孫 */
  folder: string;
  series: string;
  tag: string;
  pending: boolean;
  hasAi: boolean;
  nofm: boolean;
  fav: boolean;
  /** 未帶或值無效 → null，由呼叫端套用設定頁的預設 view */
  view: WbView | null;
}

export const EMPTY_QUERY: WbQuery = {
  folder: "",
  series: "",
  tag: "",
  pending: false,
  hasAi: false,
  nofm: false,
  fav: false,
  view: null,
};

const flag = (v: string | null): boolean => v === "1" || v === "true";

export function parseQuery(search: string): WbQuery {
  const p = new URLSearchParams(search);
  const view = (p.get("view") ?? "").toLowerCase();
  return {
    folder: (p.get("folder") ?? "").replace(/^\/+|\/+$/g, ""),
    series: p.get("series") ?? "",
    tag: p.get("tag") ?? "",
    pending: flag(p.get("pending")),
    hasAi: flag(p.get("hasAi")),
    nofm: flag(p.get("nofm")),
    fav: flag(p.get("fav")),
    view: isView(view) ? view : null,
  };
}

/** 寫回網址用。順序固定，方便比對；空值不輸出。 */
export function toSearch(q: WbQuery): string {
  const p = new URLSearchParams();
  if (q.folder) p.set("folder", q.folder);
  if (q.series) p.set("series", q.series);
  if (q.tag) p.set("tag", q.tag);
  if (q.pending) p.set("pending", "1");
  if (q.hasAi) p.set("hasAi", "1");
  if (q.nofm) p.set("nofm", "1");
  if (q.fav) p.set("fav", "1");
  if (q.view) p.set("view", q.view);
  const s = p.toString();
  return s ? "?" + s : "";
}

/** `a/b` 命中 `a/b` 與 `a/b/c`，**不可**誤中 `a/bc`。 */
export function inFolder(row: WbNoteRow, folder: string): boolean {
  if (!folder) return true;
  const own = row.folder.join("/");
  return own === folder || own.startsWith(folder + "/");
}

export function applyFilters(
  rows: WbNoteRow[],
  q: WbQuery,
  opts: { favorites?: ReadonlySet<string>; text?: string } = {},
): WbNoteRow[] {
  const text = (opts.text ?? "").trim().toLowerCase();
  const favs = opts.favorites;
  return rows.filter((r) => {
    if (q.folder && !inFolder(r, q.folder)) return false;
    if (q.series && r.series?.id !== q.series) return false;
    if (q.tag && !r.tags.includes(q.tag)) return false;
    if (q.pending && markerCounts(r.markers).pending === 0) return false;
    if (q.hasAi && r.markers.length === 0) return false;
    if (q.nofm && r.hasFrontmatter) return false;
    if (q.fav && !(favs?.has(r.slug) ?? false)) return false;
    if (text && !(r.title + " " + r.path + " " + r.tags.join(" ")).toLowerCase().includes(text)) return false;
    return true;
  });
}

export interface WbGroup {
  key: string;
  label: string;
  /** workbench.css 裡的色彩 class（決定 --gc） */
  gc: string;
  rows: WbNoteRow[];
  done: number;
  pending: number;
  /** 組內最新的 updatedAt */
  latest: string;
}

export const NO_SERIES = "未歸入系列";
export const NO_TAG = "未加標籤";

/** "2026-09-18" → "2026 / 09" */
export function monthKey(s: string): string {
  return s.length >= 7 ? `${s.slice(0, 4)} / ${s.slice(5, 7)}` : "未知月份";
}

/**
 * 分組。`scope` 是目前的資料夾篩選：以資料夾分組時，key 取「scope 往下一層」——
 * 沒有篩選時就是頂層資料夾名；篩在 `a` 時，`a/b/c.md` 歸 `a/b`，直接放在 `a` 的歸 `a`。
 * 這樣不限層數的樹在任何一層都分得出組，而不是整頁只有一組。
 */
export function groupRows(rows: WbNoteRow[], by: WbGroupBy, scope = ""): WbGroup[] {
  const depth = scope ? scope.split("/").length : 0;
  const out: WbGroup[] = [];
  const byKey = new Map<string, WbGroup>();
  for (const r of rows) {
    let key: string;
    let gc = "wb-gc-ink3";
    if (by === "folder") {
      key = r.folder.slice(0, depth + 1).join("/") || ROOT_GROUP;
      gc = key === ROOT_GROUP ? "root" : "wb-gc-blue-l";
    } else if (by === "series") {
      key = r.series?.title ?? NO_SERIES;
      gc = r.series ? `wb-acc-${r.series.accent}` : "wb-gc-ink3";
    } else if (by === "tag") {
      key = r.tags[0] ?? NO_TAG; // 以第一個標籤為 key：一篇只出現在一組
    } else {
      key = monthKey(r.updatedAt);
    }
    let g = byKey.get(key);
    if (!g) {
      g = { key, label: key, gc, rows: [], done: 0, pending: 0, latest: "" };
      byKey.set(key, g);
      out.push(g);
    }
    const c = markerCounts(r.markers);
    g.rows.push(r);
    g.done += c.done;
    g.pending += c.pending;
    if (r.updatedAt > g.latest) g.latest = r.updatedAt;
  }
  for (const g of out) g.rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  // 其餘維持出現順序（rows 已依更新日倒序 → 最近有動靜的組在前）；根目錄置頂、「未歸入」置底。
  const rank = (g: WbGroup) => (g.key === ROOT_GROUP ? -1 : g.key === NO_SERIES || g.key === NO_TAG ? 1 : 0);
  return out
    .map((g, i) => ({ g, i }))
    .sort((a, b) => rank(a.g) - rank(b.g) || a.i - b.i)
    .map((x) => x.g);
}
