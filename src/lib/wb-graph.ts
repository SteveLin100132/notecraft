// Graph 檢視的純函式（規格 docs/notecraft-workbench-notes-graph.md §4、§6）。
// **只能 `import type`、不能有 JSX、不碰 window／node:***：scripts/checks/wb-graph.mjs 以 Node --experimental-strip-types 直接載入做斷言。
//
// 三段：
// 1. buildGraphEdges —— build 期：全站資料 → 邊（workbench.ts 呼叫，結果進 WbIndex.graph）
// 2. deriveGraph      —— 瀏覽器：通過篩選的筆記 ＋ 邊 → 可見節點、連入連出、級距、孤島
// 3. 著色分組、標籤樞紐、高亮集合 —— 元件只做 JSX，不自己數
//
// 佈局在 lib/wb-graph-layout.ts。

import type { WbEdgeKind, WbGraphDataNode, WbGraphEdge, WbRefKind } from "@/lib/wb-types";

// ── 常數（JS 端要用的數值；workbench.css 的 --wb-gr-* 由 check:wb 對照，改一邊要改另一邊）──

/** 主要種類的同數順序 */
export const GR_KINDS: readonly WbEdgeKind[] = ["ref", "inc", "link", "seq"];
export const GR_KIND_LABEL: Record<WbEdgeKind, { name: string; short: string; desc: string }> = {
  ref: { name: "定義引用", short: "引用", desc: "行內引用某篇筆記的定義" },
  inc: { name: "定義嵌入", short: "嵌入", desc: "把某篇筆記的定義整段嵌入" },
  link: { name: "站內連結", short: "連結", desc: "一般連到另一篇筆記的連結" },
  seq: { name: "系列順序", short: "系列", desc: "同一系列的上一章 → 下一章" },
};
/** 被連入數的級距：0–1、2–3、4–7、8 以上 */
export const GR_TIERS: readonly (readonly [number, number])[] = [
  [0, 1],
  [2, 3],
  [4, 7],
  [8, Infinity],
];
/** 各級節點半徑（--wb-gr-r1～r4） */
export const GR_R: readonly number[] = [5, 8, 12, 17];
/** 標籤樞紐最小半徑（--wb-gr-r-hub） */
export const GR_HUB_R = 15;
export const GR_DIM = { node: 0.16, edge: 0.06, rest: 0.55, hot: 0.95 } as const;
export const GR_ZOOM = { min: 0.25, max: 3, label: 1.5, dense: 2.4, near: 0.8 } as const;
export const GR_MOVE_MS = 600;
/** 超過這個節點數：較緊的佈局參數、半徑 ×0.85、只有第 4 級顯示標題、不做移動動畫、先畫骨架 */
export const GR_DENSE = 150;
/** 色盤階數（--wb-gr-c1～c8）與標籤樞紐上限 */
export const GR_PALETTE = 8;

export const GR_ROOT = "根目錄";
export const GR_NO_SERIES = "未歸入系列";
export const GR_UNTAGGED = "未加標籤";
export const GR_OTHER_TAGS = "其他標籤";
export const GR_OTHER = "其他";
export const GR_ALL = "全部";
export const GR_DATA = "資料檔";
export const DATA_PREFIX = "view:";

export type GraphMode = "doc" | "tag";
export type GraphColorBy = "folder" | "series" | "tag" | "none";
export const GR_COLOR_BY: readonly { value: GraphColorBy; label: string; desc: string }[] = [
  { value: "folder", label: "資料夾", desc: "依筆記所在資料夾" },
  { value: "series", label: "系列", desc: "依所屬系列，未歸入者為灰" },
  { value: "tag", label: "標籤", desc: "依第一個標籤，未加標籤者為灰" },
  { value: "none", label: "不著色", desc: "全部同色，只看結構" },
];

// ── 1. build 期：邊 ─────────────────────────────────────────────────────────

export interface GraphEdgeInput {
  notes: {
    slug: string;
    /** notesDir 相對路徑（真實檔案路徑，含副檔名） */
    rel: string;
    /** 本篇引用的定義：每個 id 一筆，slug 是定義所在的筆記 */
    references: { slug: string; kinds: WbRefKind[] }[];
    links: { url: string; via?: "link" | "pluginview" }[];
  }[];
  /** 每個系列的章節識別碼（筆記是 slug，資料檔是 view:<routePath>） */
  series: string[][];
  dataFiles: { routePath: string; relPath: string; backTo?: string }[];
  /** 逐段 slug 化（github-slugger）。由呼叫端注入，本檔不 import 套件 */
  slugify?: (segment: string) => string;
}

function posixNormalize(p: string): string {
  const out: string[] = [];
  for (const seg of p.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") out.pop();
    else out.push(seg);
  }
  return out.join("/");
}
const dirOf = (p: string): string => (p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : "");
function decodeSafe(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/**
 * 全站資料 → 邊（規格 §4.2、§4.4）。同一對（有序）節點的所有關聯合成一條，輸出依 s、t 排序。
 * 目標不存在的連結直接略過；自己連自己不算。
 */
export function buildGraphEdges(input: GraphEdgeInput): WbGraphEdge[] {
  const slugify = input.slugify ?? ((s: string) => s);
  const slugs = new Set(input.notes.map((n) => n.slug));
  const slugByRel = new Map(input.notes.map((n) => [n.rel, n.slug]));
  const routes = new Set(input.dataFiles.map((f) => f.routePath));
  const routeByRel = new Map(input.dataFiles.map((f) => [f.relPath, f.routePath]));
  const nodeExists = (id: string): boolean => (id.startsWith(DATA_PREFIX) ? routes.has(id.slice(DATA_PREFIX.length)) : slugs.has(id));

  const merged = new Map<string, WbGraphEdge>();
  const add = (s: string, t: string, kind: WbEdgeKind): void => {
    if (s === t || !nodeExists(s) || !nodeExists(t)) return;
    const key = `${s}\n${t}`;
    let e = merged.get(key);
    if (!e) merged.set(key, (e = { s, t, kinds: {} }));
    e.kinds[kind] = (e.kinds[kind] ?? 0) + 1;
  };

  /** 站內絕對路徑（已去 query／hash）→ 節點 id */
  const resolveAbs = (pathname: string): string | null => {
    const p = decodeSafe(pathname).replace(/\/+$/, "");
    if (p.startsWith("/notes/")) {
      const x = p.slice("/notes/".length);
      if (slugs.has(x)) return x;
      const s = x.split("/").map(slugify).join("/");
      return slugs.has(s) ? s : null;
    }
    if (p.startsWith("/view/")) {
      const x = p.slice("/view/".length);
      return routes.has(x) ? DATA_PREFIX + x : null;
    }
    return null;
  };

  const resolve = (url: string, via: string | undefined, from: { slug: string; rel: string }): string | null => {
    if (via === "pluginview") {
      const rel = url.trim().replace(/^\.\//, "").replace(/^\/+/, "");
      const route = routeByRel.get(rel);
      return route === undefined ? null : DATA_PREFIX + route;
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith("//") || url.startsWith("#")) return null;
    const pathname = url.split(/[?#]/)[0];
    if (!pathname) return null;
    if (pathname.startsWith("/")) return resolveAbs(pathname);
    if (/\.mdx?$/i.test(pathname)) {
      // 相對的 .md／.mdx：以來源檔的位置解析成 notesDir 相對路徑，再查 rel → slug（slug 不等於路徑）
      const rel = posixNormalize(`${dirOf(from.rel)}/${decodeSafe(pathname)}`);
      return slugByRel.get(rel) ?? null;
    }
    // 其他相對路徑：照瀏覽器的規則，以來源筆記的網址 /notes/<slug> 為基準
    return resolveAbs("/" + posixNormalize(`notes/${dirOf(from.slug)}/${pathname}`));
  };

  for (const n of input.notes) {
    for (const r of n.references) for (const k of r.kinds) add(n.slug, r.slug, k);
    for (const l of n.links) {
      const t = resolve(l.url, l.via, n);
      if (t) add(n.slug, t, "link");
    }
  }
  for (const f of input.dataFiles) {
    if (!f.backTo) continue;
    const t = resolveAbs(f.backTo.split(/[?#]/)[0]);
    if (t) add(DATA_PREFIX + f.routePath, t, "link");
  }
  for (const chapters of input.series) {
    for (let i = 1; i < chapters.length; i++) add(chapters[i - 1], chapters[i], "seq");
  }
  return [...merged.values()].sort((a, b) => (a.s < b.s ? -1 : a.s > b.s ? 1 : a.t < b.t ? -1 : a.t > b.t ? 1 : 0));
}

// ── 2. 瀏覽器：可見節點與衍生欄位 ───────────────────────────────────────────

/** deriveGraph 需要的筆記欄位（WbNoteRow 的子集） */
export interface GraphRow {
  slug: string;
  title: string;
  folder: string[];
  tags: string[];
  series: { title: string } | null;
}

export interface GraphNode {
  /** 筆記 slug；資料檔為 view:<routePath> */
  id: string;
  title: string;
  /** 真實資料夾分段；資料檔為 [] */
  folder: string[];
  series: string | null;
  tags: string[];
  data: boolean;
  pluginId?: string;
  /** 資料檔的 /view/… 連結（已含 base） */
  href?: string;
  /** 不同來源的數量 */
  inDeg: number;
  /** 不同目標的數量 */
  outDeg: number;
  tier: 1 | 2 | 3 | 4;
  /** 在可見的邊裡沒有任何一條（以資料為準，與邊的開關無關） */
  orphan: boolean;
}

export interface GraphEdge extends WbGraphEdge {
  /** `${s}>${t}` */
  id: string;
  /** 次數最多的種類，同數依 GR_KINDS */
  kind: WbEdgeKind;
  /** 總次數 */
  n: number;
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function tierOf(inDeg: number): 1 | 2 | 3 | 4 {
  for (let i = 0; i < GR_TIERS.length; i++) if (inDeg >= GR_TIERS[i][0] && inDeg <= GR_TIERS[i][1]) return (i + 1) as 1 | 2 | 3 | 4;
  return 4;
}

export function mainKind(kinds: Partial<Record<WbEdgeKind, number>>): WbEdgeKind {
  let best: WbEdgeKind = "ref";
  let max = -1;
  for (const k of GR_KINDS) {
    const v = kinds[k] ?? 0;
    if (v > max) {
      max = v;
      best = k;
    }
  }
  return best;
}

/** 通過篩選的筆記 ＋ 全部的邊 → 可見的圖（規格 §4.6）。資料檔只在與可見筆記相連時出現。 */
export function deriveGraph(rows: readonly GraphRow[], edges: readonly WbGraphEdge[], dataNodes: readonly WbGraphDataNode[]): Graph {
  const noteIds = new Set(rows.map((r) => r.slug));
  const dataById = new Map(dataNodes.map((d) => [d.id, d]));
  const isData = (id: string): boolean => id.startsWith(DATA_PREFIX);
  const dataIds = new Set<string>();
  for (const e of edges) {
    if (isData(e.t) && noteIds.has(e.s) && dataById.has(e.t)) dataIds.add(e.t);
    if (isData(e.s) && noteIds.has(e.t) && dataById.has(e.s)) dataIds.add(e.s);
  }
  const has = (id: string): boolean => noteIds.has(id) || dataIds.has(id);

  const outEdges: GraphEdge[] = [];
  const inSet = new Map<string, Set<string>>();
  const outSet = new Map<string, Set<string>>();
  const touch = (m: Map<string, Set<string>>, k: string, v: string): void => {
    let s = m.get(k);
    if (!s) m.set(k, (s = new Set()));
    s.add(v);
  };
  for (const e of edges) {
    if (!has(e.s) || !has(e.t)) continue;
    let n = 0;
    for (const k of GR_KINDS) n += e.kinds[k] ?? 0;
    outEdges.push({ ...e, id: `${e.s}>${e.t}`, kind: mainKind(e.kinds), n });
    touch(inSet, e.t, e.s);
    touch(outSet, e.s, e.t);
  }

  const finish = (base: Omit<GraphNode, "inDeg" | "outDeg" | "tier" | "orphan">): GraphNode => {
    const inDeg = inSet.get(base.id)?.size ?? 0;
    const outDeg = outSet.get(base.id)?.size ?? 0;
    return { ...base, inDeg, outDeg, tier: tierOf(inDeg), orphan: inDeg + outDeg === 0 };
  };
  const nodes: GraphNode[] = rows.map((r) =>
    finish({ id: r.slug, title: r.title, folder: r.folder, series: r.series?.title ?? null, tags: r.tags, data: false }),
  );
  for (const id of [...dataIds].sort()) {
    const d = dataById.get(id)!;
    nodes.push(finish({ id, title: d.title, folder: [], series: null, tags: [], data: true, pluginId: d.pluginId, href: d.href }));
  }
  return { nodes, edges: outEdges };
}

// ── 3. 標籤樞紐、著色分組、高亮 ─────────────────────────────────────────────

const byCountThenName = (a: { name: string; count: number }, b: { name: string; count: number }): number =>
  b.count - a.count || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);

/**
 * 標籤樞紐（規格 §6.2，Q3）：全站筆記數最多的 8 個（同數依名稱）；篩選中的標籤不在其中時也加入。
 * 回傳順序即圓上的排列順序。
 */
export function pickTagHubs(tags: readonly { name: string; count: number }[], activeTag = "", max: number = GR_PALETTE): string[] {
  const hubs = [...tags].sort(byCountThenName).slice(0, max).map((t) => t.name);
  if (activeTag && !hubs.includes(activeTag) && tags.some((t) => t.name === activeTag)) hubs.push(activeTag);
  return hubs;
}

/** 節點在標籤模式所屬的團：樞紐標籤（可多個）；沒有時是「其他標籤」或「未加標籤」。 */
export function tagSlots(node: Pick<GraphNode, "tags" | "data">, hubs: readonly string[]): string[] {
  if (node.data || node.tags.length === 0) return [GR_UNTAGGED];
  const own = hubs.filter((h) => node.tags.includes(h));
  return own.length ? own : [GR_OTHER_TAGS];
}

export interface ColorScheme {
  by: GraphColorBy;
  /** 節點 → 分組 key（超過色盤的組已合併成「其他」） */
  keyOf: (n: Pick<GraphNode, "folder" | "series" | "tags" | "data">) => string;
  /** 分組順序：有配色的在前（節點數多到少），中性組在後。佈局的初始角度與孤島排序用這個 */
  order: string[];
  /** 分組 key → CSS 顏色（`var(--wb-gr-c*)`） */
  colorOf: (key: string) => string;
  /** 顯示用名稱（資料夾只顯示最後一段） */
  labelOf: (key: string) => string;
}

const NEUTRAL = new Set([GR_NO_SERIES, GR_UNTAGGED, GR_OTHER_TAGS, GR_OTHER, GR_ALL]);

/**
 * 著色分組（規格 §6.1，Q4）。`rows` 是**全站**的筆記：配色順序不隨篩選變動，同一組在篩選前後同色。
 * 資料夾的層級與 List 的「依資料夾分組」相同：`scope`（目前的資料夾篩選）往下一層。
 */
export function colorScheme(by: GraphColorBy, rows: readonly GraphRow[], scope = "", hubs: readonly string[] = []): ColorScheme {
  const depth = scope ? scope.split("/").length : 0;
  const rawKey = (n: Pick<GraphNode, "folder" | "series" | "tags" | "data">): string => {
    if (by === "none") return GR_ALL;
    if (n.data) return GR_DATA;
    if (by === "series") return n.series ?? GR_NO_SERIES;
    if (by === "tag") {
      const own = hubs.find((h) => n.tags.includes(h));
      return own ?? (n.tags.length ? GR_OTHER_TAGS : GR_UNTAGGED);
    }
    return n.folder.slice(0, depth + 1).join("/") || GR_ROOT;
  };
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (by === "folder" && scope) {
      const own = r.folder.join("/");
      if (own !== scope && !own.startsWith(scope + "/")) continue;
    }
    const k = rawKey({ folder: r.folder, series: r.series?.title ?? null, tags: r.tags, data: false });
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const colored = [...counts]
    .filter(([k]) => !NEUTRAL.has(k))
    .map(([name, count]) => ({ name, count }))
    .sort(byCountThenName);
  // 標籤著色時配色順序跟著樞紐的順序，樞紐的描邊色才會與圖例一致
  if (by === "tag") colored.sort((a, b) => hubs.indexOf(a.name) - hubs.indexOf(b.name));
  const top = colored.slice(0, GR_PALETTE).map((c) => c.name);
  const index = new Map(top.map((k, i) => [k, i]));
  const overflow = colored.length > GR_PALETTE;
  const keyOf: ColorScheme["keyOf"] = (n) => {
    const k = rawKey(n);
    return k === GR_DATA || NEUTRAL.has(k) || index.has(k) ? k : GR_OTHER;
  };
  const neutralOrder = [GR_OTHER, GR_OTHER_TAGS, GR_NO_SERIES, GR_UNTAGGED, GR_ALL].filter((k) => (k === GR_OTHER ? overflow : counts.has(k) || k === GR_ALL));
  return {
    by,
    keyOf,
    order: [...top, ...neutralOrder.filter((k) => by === "none" || k !== GR_ALL), GR_DATA],
    colorOf: (key) => {
      if (key === GR_DATA) return "var(--wb-gr-c-data)";
      const i = index.get(key);
      return i === undefined ? "var(--wb-gr-c0)" : `var(--wb-gr-c${i + 1})`;
    },
    labelOf: (key) => (by === "folder" && key.includes("/") ? key.slice(key.lastIndexOf("/") + 1) : key),
  };
}

/** 搜尋：比對「標題 + 資料夾 + 全部標籤」，不分大小寫。空字串回 null（＝沒有在搜尋）。 */
export function matchNodes(nodes: readonly GraphNode[], query: string): Set<string> | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const out = new Set<string>();
  for (const n of nodes) {
    if ((n.title + " " + n.folder.join("/") + " " + n.tags.join(" ")).toLowerCase().includes(q)) out.add(n.id);
  }
  return out;
}

export interface TagLine {
  /** `tl:${s}>${t}` */
  id: string;
  /** 筆記節點 id */
  s: string;
  /** 樞紐 id：`tag:<名稱>` */
  t: string;
}

export const hubId = (tag: string): string => "tag:" + tag;

/** 標籤模式的細線：筆記 → 它所屬的每個樞紐標籤（「其他標籤」「未加標籤」兩團不畫線）。 */
export function tagLines(nodes: readonly GraphNode[], hubs: readonly string[]): TagLine[] {
  const out: TagLine[] = [];
  for (const n of nodes) {
    if (n.data) continue;
    for (const h of hubs) if (n.tags.includes(h)) out.push({ id: `tl:${n.id}>${h}`, s: n.id, t: hubId(h) });
  }
  return out;
}

export interface Highlight {
  nodes: Set<string>;
  edges: Set<string>;
}

/**
 * 高亮集合（handoff §5.2）。優先序：hover 邊 → hover 節點／樞紐 → 搜尋；都沒有回 null（＝不淡出）。
 * `edges` 是目前**畫出來**的邊（已套用種類開關）；`lines` 是標籤模式的細線。
 */
export function highlightOf(opts: {
  mode: GraphMode;
  hover: string | null;
  hoverEdge: string | null;
  matches: Set<string> | null;
  nodes: readonly GraphNode[];
  edges: readonly GraphEdge[];
  lines: readonly TagLine[];
  hubs: readonly string[];
}): Highlight | null {
  const { mode, hover, hoverEdge, matches, nodes, edges, lines, hubs } = opts;
  if (hoverEdge) {
    const e = edges.find((x) => x.id === hoverEdge);
    if (e) return { nodes: new Set([e.s, e.t]), edges: new Set([e.id]) };
  }
  if (hover) {
    const hn = new Set([hover]);
    const he = new Set<string>();
    if (mode === "doc") {
      for (const e of edges) {
        if (e.s === hover || e.t === hover) {
          hn.add(e.s);
          hn.add(e.t);
          he.add(e.id);
        }
      }
    } else if (hover.startsWith("tag:")) {
      const tag = hover.slice(4);
      for (const n of nodes) if (tagSlots(n, hubs).includes(tag)) hn.add(n.id);
      for (const l of lines) if (l.t === hover) he.add(l.id);
    } else {
      for (const l of lines) {
        if (l.s === hover) {
          hn.add(l.t);
          he.add(l.id);
        }
      }
    }
    return { nodes: hn, edges: he };
  }
  if (matches) {
    const he = new Set<string>();
    for (const e of edges) if (matches.has(e.s) && matches.has(e.t)) he.add(e.id);
    for (const l of lines) if (matches.has(l.s)) he.add(l.id);
    return { nodes: matches, edges: he };
  }
  return null;
}
