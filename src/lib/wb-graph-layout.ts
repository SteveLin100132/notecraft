// Graph 檢視的佈局（規格 docs/notecraft-workbench-notes-graph.md §5；參數照 handoff §5.6，不要改數值）。
// **只能 `import type`、不能有 JSX、不碰 window**：scripts/checks/wb-graph.mjs 直接載入，斷言的是性質（確定性、不重疊…），不是座標快照。
//
// 算完即靜止：同樣的輸入每次結果相同（固定亂數種子），畫面上不持續晃動。
// 斥力是 O(n²)：節點上千時要留意耗時（實測數字見規格 §21）。

export interface Pt {
  x: number;
  y: number;
}

export interface LayoutNode {
  id: string;
  /** 半徑（world 單位） */
  r: number;
}

export interface DocLayoutNode extends LayoutNode {
  /** 沒有任何邊：不進力導向，依分組排在主圖外圍 */
  orphan: boolean;
  /** 著色分組 key：決定初始角度與孤島的團 */
  group: string;
}

/** 孤島的群標位置（團的下緣） */
export interface Cluster {
  key: string;
  x: number;
  y: number;
  n: number;
}

export interface DocLayout {
  pos: Record<string, Pt>;
  clusters: Cluster[];
}

export interface TagLayoutNode extends LayoutNode {
  /** 所屬的團（樞紐標籤，或「其他標籤」「未加標籤」）；多個時落在幾團之間 */
  slots: string[];
  /** 資料檔不計入樞紐上的筆記數 */
  data: boolean;
}

export interface Hub {
  /** `tag:<名稱>` */
  id: string;
  tag: string;
  /** 筆記數（不含資料檔） */
  n: number;
  x: number;
  y: number;
  r: number;
}

export interface TagLayout {
  pos: Record<string, Pt>;
  hubs: Hub[];
}

/** 節點超過這個數量時用較緊的參數（與 wb-graph.ts 的 GR_DENSE 同值，check:wb 對照） */
export const LAYOUT_DENSE = 150;
/** 樞紐最小半徑（與 wb-graph.ts 的 GR_HUB_R 同值，check:wb 對照） */
export const LAYOUT_HUB_R = 15;
/** 黃金角 */
const GA = 2.39996;

/** 固定種子的亂數（mulberry32）：同一個種子每次產生同一串數字。 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Body = { x: number; y: number; r: number; fixed?: boolean };

/** 兩兩推開到最小距離 rA + rB + pad；fixed 的不動。 */
function collide(arr: Body[], pad: number): void {
  const N = arr.length;
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const a = arr[i];
      const b = arr[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const m = a.r + b.r + pad;
      if (d >= m) continue;
      const k = (m - d) / d / 2;
      if (a.fixed && b.fixed) continue;
      if (a.fixed) {
        b.x += dx * k * 2;
        b.y += dy * k * 2;
      } else if (b.fixed) {
        a.x -= dx * k * 2;
        a.y -= dy * k * 2;
      } else {
        a.x -= dx * k;
        a.y -= dy * k;
        b.x += dx * k;
        b.y += dy * k;
      }
    }
  }
}

/**
 * 文件模式：有邊的節點做力導向；孤島依分組成團，沿主圖外圍一圈放。
 * `groups` 是分組順序（著色分組的 order）。
 */
export function layoutDoc(nodes: readonly DocLayoutNode[], edges: readonly { s: string; t: string }[], groups: readonly string[]): DocLayout {
  const rnd = mulberry32(11);
  const P: Record<string, Body> = {};
  const conn = nodes.filter((n) => !n.orphan);
  const orph = nodes.filter((n) => n.orphan);
  const gi = (key: string): number => Math.max(0, groups.indexOf(key));

  for (const n of conn) {
    const a = (gi(n.group) / Math.max(1, groups.length)) * Math.PI * 2 + rnd() * 0.9;
    const rr = 60 + rnd() * 180;
    P[n.id] = { x: Math.cos(a) * rr, y: Math.sin(a) * rr, r: n.r };
  }
  const arr = conn.map((n) => P[n.id]);
  const N = arr.length;
  const dense = N > LAYOUT_DENSE;
  const it = dense ? 260 : 380;
  const rep = dense ? 1300 : 3200;
  const rest = dense ? 40 : 58;
  const idx: Record<string, number> = {};
  conn.forEach((n, i) => (idx[n.id] = i));
  const L: [number, number][] = [];
  for (const e of edges) {
    const i = idx[e.s];
    const j = idx[e.t];
    if (i !== undefined && j !== undefined && i !== j) L.push([i, j]);
  }
  const vx = new Float64Array(N);
  const vy = new Float64Array(N);
  const fx = new Float64Array(N);
  const fy = new Float64Array(N);
  for (let s = 0; s < it; s++) {
    const al = Math.max(0.03, 1 - s / it);
    fx.fill(0);
    fy.fill(0);
    for (let i = 0; i < N; i++) {
      const a = arr[i];
      for (let j = i + 1; j < N; j++) {
        const b = arr[j];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 1) {
          dx = rnd() - 0.5;
          dy = rnd() - 0.5;
          d2 = 1;
        }
        if (d2 > 160000) continue;
        const d = Math.sqrt(d2);
        const f = rep / d2;
        const ux = (dx / d) * f;
        const uy = (dy / d) * f;
        fx[i] += ux;
        fy[i] += uy;
        fx[j] -= ux;
        fy[j] -= uy;
      }
    }
    for (const [i, j] of L) {
      const a = arr[i];
      const b = arr[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = (d - (rest + a.r + b.r)) * 0.05;
      fx[i] += (dx / d) * f;
      fy[i] += (dy / d) * f;
      fx[j] -= (dx / d) * f;
      fy[j] -= (dy / d) * f;
    }
    for (let i = 0; i < N; i++) {
      fx[i] -= arr[i].x * 0.014;
      fy[i] -= arr[i].y * 0.014;
      vx[i] = (vx[i] + fx[i]) * 0.55;
      vy[i] = (vy[i] + fy[i]) * 0.55;
      arr[i].x += Math.max(-24, Math.min(24, vx[i] * al));
      arr[i].y += Math.max(-24, Math.min(24, vy[i] * al));
    }
    if (s > it * 0.5) collide(arr, 7);
  }

  // 孤島：依分組成團，沿主圖外圍一圈；每團分到的角度 ∝ √團數 + 1.2，自 −90° 起順時針
  let Rm = 0;
  for (const p of arr) Rm = Math.max(Rm, Math.hypot(p.x, p.y) + p.r);
  const og: { key: string; items: DocLayoutNode[] }[] = [];
  for (const n of orph) {
    let g = og.find((x) => x.key === n.group);
    if (!g) og.push((g = { key: n.group, items: [] }));
    g.items.push(n);
  }
  og.sort((a, b) => gi(a.key) - gi(b.key));
  const clusters: Cluster[] = [];
  const W = og.reduce((a, g) => a + Math.sqrt(g.items.length) + 1.2, 0);
  const ring = N ? Rm + 46 : 0;
  let acc = 0;
  for (const g of og) {
    const w = Math.sqrt(g.items.length) + 1.2;
    const a = -Math.PI / 2 + ((acc + w / 2) / W) * Math.PI * 2;
    acc += w;
    const cr = 9 * Math.sqrt(g.items.length) + 8;
    const rr = N ? ring + cr : og.length > 1 ? 90 + og.length * 18 : 0;
    const cx = Math.cos(a) * rr;
    const cy = Math.sin(a) * rr;
    g.items.forEach((n, i) => {
      const q = 10.5 * Math.sqrt(i + 0.5);
      const t = i * GA;
      P[n.id] = { x: cx + Math.cos(t) * q, y: cy + Math.sin(t) * q, r: n.r };
    });
    clusters.push({ key: g.key, x: cx, y: cy + cr + 14, n: g.items.length });
  }
  const pos: Record<string, Pt> = {};
  for (const id of Object.keys(P)) pos[id] = { x: P[id].x, y: P[id].y };
  return { pos, clusters };
}

/**
 * 標籤模式：樞紐等距排在圓上（自 −90° 起，依 `slotOrder`）；單一歸屬的節點以黃金角螺旋圍著樞紐，
 * 多重歸屬的落在各樞紐座標的平均；再做 120 次鬆弛。只放有節點的樞紐。
 */
export function layoutTag(nodes: readonly TagLayoutNode[], slotOrder: readonly string[]): TagLayout {
  const rnd = mulberry32(5);
  const cnt: Record<string, number> = {};
  const place: Record<string, number> = {};
  for (const n of nodes) {
    for (const t of n.slots) {
      place[t] = (place[t] ?? 0) + 1;
      if (!n.data) cnt[t] = (cnt[t] ?? 0) + 1;
    }
  }
  const slots = slotOrder.filter((t) => place[t]);
  const S = slots.length;
  const RR = S <= 1 ? 0 : Math.max(140, S * 26 + Math.sqrt(nodes.length) * 10);
  const hubs: Hub[] = slots.map((t, i) => {
    const a = -Math.PI / 2 + (i / S) * Math.PI * 2;
    return { id: "tag:" + t, tag: t, n: cnt[t] ?? 0, x: Math.cos(a) * RR, y: Math.sin(a) * RR, r: LAYOUT_HUB_R + Math.sqrt(place[t]) * 2.6 };
  });
  const H: Record<string, Hub> = {};
  for (const h of hubs) H[h.tag] = h;
  const k: Record<string, number> = {};
  const arr = nodes
    .filter((n) => n.slots.some((t) => H[t]))
    .map((n) => {
      const tg = n.slots.filter((t) => H[t]);
      let tx: number;
      let ty: number;
      if (tg.length === 1) {
        const h = H[tg[0]];
        const i = (k[tg[0]] = (k[tg[0]] ?? 0) + 1) - 1;
        const q = h.r + 12 + 10.5 * Math.sqrt(i + 0.5);
        const t = i * GA;
        tx = h.x + Math.cos(t) * q;
        ty = h.y + Math.sin(t) * q;
      } else {
        tx = tg.reduce((a, t) => a + H[t].x, 0) / tg.length + (rnd() - 0.5) * 14;
        ty = tg.reduce((a, t) => a + H[t].y, 0) / tg.length + (rnd() - 0.5) * 14;
      }
      return { id: n.id, x: tx, y: ty, tx, ty, r: n.r };
    });
  const all: Body[] = [...arr, ...hubs.map((h) => ({ x: h.x, y: h.y, r: h.r, fixed: true }))];
  for (let s = 0; s < 120; s++) {
    for (const p of arr) {
      p.x += (p.tx - p.x) * 0.06;
      p.y += (p.ty - p.y) * 0.06;
    }
    collide(all, 3.5);
  }
  const pos: Record<string, Pt> = {};
  for (const p of arr) pos[p.id] = { x: p.x, y: p.y };
  for (const h of hubs) pos[h.id] = { x: h.x, y: h.y };
  return { pos, hubs };
}

/** 一次佈局的輸入：主執行緒與 Web Worker（lib/wb-graph-worker.ts）共用同一個入口 */
export type LayoutRequest =
  | { key: string; mode: "doc"; nodes: DocLayoutNode[]; edges: { s: string; t: string }[]; groups: string[] }
  | { key: string; mode: "tag"; nodes: TagLayoutNode[]; slots: string[] };

export interface LayoutResult {
  pos: Record<string, Pt>;
  hubs: Hub[];
  clusters: Cluster[];
}

export function runLayout(req: LayoutRequest): LayoutResult {
  if (req.mode === "tag") {
    const r = layoutTag(req.nodes, req.slots);
    return { pos: r.pos, hubs: r.hubs, clusters: [] };
  }
  const r = layoutDoc(req.nodes, req.edges, req.groups);
  return { pos: r.pos, hubs: [], clusters: r.clusters };
}

export interface ViewBox {
  /** world → 螢幕：screen = world × k + (x, y) */
  x: number;
  y: number;
  k: number;
}

/**
 * 符合視窗（handoff §5.1）：每點外擴 26、下方多 14 留給標題；k = min((W−80)/bw, (H−72)/bh)，
 * 上限 160%、下限 `minK`；置中後 y 再 +10。沒有點或視窗還沒有尺寸時回 null。
 */
export function fitView(points: readonly Pt[], width: number, height: number, minK = 0.25): ViewBox | null {
  if (!points.length || width <= 0 || height <= 0) return null;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of points) {
    x0 = Math.min(x0, p.x - 26);
    y0 = Math.min(y0, p.y - 26);
    x1 = Math.max(x1, p.x + 26);
    y1 = Math.max(y1, p.y + 26 + 14);
  }
  const k = Math.max(minK, Math.min(1.6, Math.min((width - 80) / (x1 - x0), (height - 72) / (y1 - y0))));
  return { k, x: width / 2 - ((x0 + x1) / 2) * k, y: height / 2 - ((y0 + y1) / 2) * k + 10 };
}

export interface EdgeGeom {
  /** 線段：從來源節點邊緣外 1.5px 到箭頭底部 */
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** 熱區的終點（箭頭尖端） */
  tx: number;
  ty: number;
  /** 箭頭三角形的 path（長 7、底寬 6.6，尖端在目標節點邊緣外 2px） */
  arrow: string;
}

/** 一條有方向的邊的幾何（handoff §4.2）。兩端太近（距離 < 兩半徑 + 7.5）時回 null：不畫。 */
export function edgeGeom(a: Pt, b: Pt, ra: number, rb: number): EdgeGeom | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy) || 1;
  const pa = ra + 1.5;
  const pb = rb + 2;
  if (d < pa + pb + 4) return null;
  const ux = dx / d;
  const uy = dy / d;
  const tx = b.x - ux * pb;
  const ty = b.y - uy * pb;
  const bx = tx - ux * 7;
  const by = ty - uy * 7;
  const hw = 3.3;
  const f = (v: number): string => (Math.round(v * 100) / 100).toString();
  return {
    x1: a.x + ux * pa,
    y1: a.y + uy * pa,
    x2: bx + ux * 1.5,
    y2: by + uy * 1.5,
    tx,
    ty,
    arrow: `M${f(tx)} ${f(ty)}L${f(bx - uy * hw)} ${f(by + ux * hw)}L${f(bx + uy * hw)} ${f(by - ux * hw)}z`,
  };
}
