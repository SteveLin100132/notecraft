import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { PARTS } from "./parts";
import type { Fig, Layer } from "../../lib/figs/types";
import { PLANE_D, PLANE_W } from "../../lib/figs/types";

/*
 * 文件頁的爆炸圖。一個 island 跨頁保留（transition:persist），換節時 props 換成下一節的組裝稿：
 *   收攏（各層疊回一落）→ 重組（共用 id 的零件改外框與內容，其餘飛出／飛入）→ 展開（逐層拉開、引線畫出）。
 * 換頁一開始（astro:before-preparation）就先收攏，載入期間停在收攏狀態，新組裝稿到了再重組、展開。
 * screen 零件展開後：鉛筆線稿 → 上墨 → 實機截圖由左向右鋪上；「實機畫面」把它從等角攤平成正視大圖。
 * prefers-reduced-motion：永遠直接是終態。
 */

const VB_W = 640;
const VB_H = 600;
const OX = 262;
const C = 0.866;
const TOP = 30;
const BOT = 572;
const NUM_R = 590; // 右側編號的 x
const NUM_L = 44; // 左側編號的 x（靠右對齊）
const LABEL_GAP = 34;

// 時間軸（毫秒）
const T_C = 280; // 收攏
const T_R = 340; // 重組
const T_E = 540; // 每層展開
const STAGGER = 55;
const T_LEAD = 380; // 引線畫出
const T_INK = 320; // 鉛筆 → 墨線
const T_WIPE = 680; // 截圖鋪上
const T_FLAT = 620; // 攤平

type Box = [number, number, number, number];
type Pt = [number, number];

/* cubic-bezier(0.16, 1, 0.3, 1)：全站唯一的緩動 */
function bezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 6; i++) {
      const err = sx(t) - x;
      const dv = dx(t);
      if (Math.abs(err) < 1e-4 || Math.abs(dv) < 1e-6) break;
      t -= err / dv;
    }
    return sy(Math.min(1, Math.max(0, t)));
  };
}
const ease = bezier(0.16, 1, 0.3, 1);
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpBox = (a: Box, b: Box, t: number): Box => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t), lerp(a[3], b[3], t)];
const iso = (u: number, v: number, oy: number): Pt => [OX + C * (u - v), oy + 0.5 * (u + v)];
const f1 = (n: number) => n.toFixed(1);
const ptsStr = (list: Pt[]) => list.map(([x, y]) => `${f1(x)},${f1(y)}`).join(" ");
const boxOf = (l: Layer): Box => l.box ?? [0, 0, PLANE_W, PLANE_D];

/* ── 版面：由下而上疊，間距自動縮放到放得進畫面，垂直置中 ── */

type Placed = { layer: Layer; idx: number; box: Box; oy: number };
type LabelPos = { id: string; ref: number; side: "l" | "r"; anchor: Pt; y: number };
type Plan = { placed: Placed[]; collapsed: Map<string, number>; labels: Map<string, LabelPos> };

function offsets(layers: Layer[], g: number) {
  const off = [0];
  for (let i = 1; i < layers.length; i++) off.push(off[i - 1] + g * (layers[i - 1].gap ?? 1));
  return off;
}
function span(layers: Layer[], off: number[]) {
  let lo = Infinity;
  let hi = -Infinity;
  layers.forEach((l, i) => {
    const [u0, v0, u1, v1] = boxOf(l);
    lo = Math.min(lo, -off[i] + 0.5 * (u0 + v0));
    hi = Math.max(hi, -off[i] + 0.5 * (u1 + v1) + (l.slab ?? 0));
  });
  return { lo, hi };
}
function place(layers: Layer[], g: number): number[] {
  const off = offsets(layers, g);
  const { lo, hi } = span(layers, off);
  const oyB = (TOP + BOT) / 2 - (lo + hi) / 2;
  return off.map((o) => oyB - o);
}

function plan(fig: Fig): Plan {
  const layers = fig.layers;
  let a = 26;
  let b = 112;
  for (let k = 0; k < 18; k++) {
    const m = (a + b) / 2;
    const { lo, hi } = span(layers, offsets(layers, m));
    if (hi - lo <= BOT - TOP) a = m;
    else b = m;
  }
  const oys = place(layers, a);
  const placed = layers.map((layer, idx) => ({ layer, idx, box: boxOf(layer), oy: oys[idx] }));
  // 收攏：疊成一落，每層只差 4
  const coys = place(layers.map((l) => ({ ...l, gap: 1 })), 4);
  const collapsed = new Map(layers.map((l, i) => [l.id, coys[i]] as const));

  // 引線：錨點在零件右前緣（或左前緣），編號依錨點高度排、互不重疊
  const labels = new Map<string, LabelPos>();
  for (const side of ["r", "l"] as const) {
    const list = placed
      .filter((p) => (p.layer.side ?? "r") === side)
      .map((p) => {
        const [u0, v0, u1, v1] = p.box;
        const anchor = side === "r" ? iso(u1, v0 + 0.42 * (v1 - v0), p.oy) : iso(u0 + 0.42 * (u1 - u0), v1, p.oy);
        return { id: p.layer.id, ref: p.layer.ref, side, anchor, y: anchor[1] };
      })
      .sort((x, y) => x.anchor[1] - y.anchor[1]);
    for (let i = 1; i < list.length; i++) list[i].y = Math.max(list[i].y, list[i - 1].y + LABEL_GAP);
    const over = list.length ? list[list.length - 1].y - (BOT - 8) : 0;
    if (over > 0) {
      list[list.length - 1].y -= over;
      for (let i = list.length - 2; i >= 0; i--) list[i].y = Math.min(list[i].y, list[i + 1].y - LABEL_GAP);
    }
    for (const l of list) labels.set(l.id, l);
  }
  return { placed, collapsed, labels };
}

/* ── 一格畫面裡的零件狀態 ── */

type Geo = {
  layer: Layer;
  box: Box;
  oy: number;
  alpha: number;
  dx: number;
  dy: number;
  /** 變形時被換掉的舊內容與它的不透明度 */
  prev?: { layer: Layer; alpha: number };
  /** screen：0 鉛筆、1 墨線；wipe：截圖鋪上的比例 */
  ink: number;
  wipe: number;
};
type Lead = { id: string; ref: number; side: "l" | "r"; from: Pt; y: number; draw: number; alpha: number };
type Frame = { geos: Geo[]; leads: Lead[]; settled: boolean };

type Tl = {
  t0: number;
  /** 收攏前的畫面 */
  snap: Frame;
  /** null：還在等下一節的組裝稿（停在收攏） */
  target: Plan | null;
  intro: boolean;
};

const sameLayer = (a: Layer, b: Layer) => a.kind === b.kind && JSON.stringify(a.p ?? {}) === JSON.stringify(b.p ?? {}) && a.shot === b.shot && !!a.hl === !!b.hl;

function settledFrame(pl: Plan, shotReady: boolean): Frame {
  return {
    settled: true,
    geos: pl.placed.map((p) => ({ layer: p.layer, box: p.box, oy: p.oy, alpha: 1, dx: 0, dy: 0, ink: 1, wipe: p.layer.shot && shotReady ? 1 : 0 })),
    leads: pl.placed.map((p) => {
      const l = pl.labels.get(p.layer.id)!;
      return { id: l.id, ref: l.ref, side: l.side, from: l.anchor, y: l.y, draw: 1, alpha: 1 };
    }),
  };
}

function anchorOf(box: Box, oy: number, side: "l" | "r"): Pt {
  const [u0, v0, u1, v1] = box;
  return side === "r" ? iso(u1, v0 + 0.42 * (v1 - v0), oy) : iso(u0 + 0.42 * (u1 - u0), v1, oy);
}

function frameAt(tl: Tl, now: number, shotReady: (l: Layer) => boolean): Frame {
  const t = now - tl.t0;
  const snap = tl.snap;
  // 收攏中的舊畫面：舊零件疊回一落（以舊零件自己的順序）
  const snapIds = snap.geos.map((g) => g.layer.id);
  const snapCol = place(
    snap.geos.map((g) => ({ ...g.layer, box: g.box, gap: 1 })),
    4,
  );
  const tc = ease(clamp01(t / T_C));

  if (!tl.target || t < T_C) {
    return {
      settled: false,
      geos: snap.geos.map((g, i) => ({ ...g, oy: lerp(g.oy, snapCol[i], tc), dx: g.dx * (1 - tc), dy: g.dy * (1 - tc), prev: undefined })),
      leads: snap.leads.map((l) => {
        const g = snap.geos.find((x) => x.layer.id === l.id);
        const i = snapIds.indexOf(l.id);
        const from = g ? anchorOf(g.box, lerp(g.oy, snapCol[i], tc), l.side) : l.from;
        return { ...l, from, alpha: l.alpha * (1 - clamp01(t / (T_C * 0.6))) };
      }),
    };
  }

  const pl = tl.target;
  const tr = ease(clamp01((t - T_C) / T_R));
  const e0 = T_C + T_R;
  const geos: Geo[] = [];

  // 只在舊圖的零件：往右上拆下、淡出
  snap.geos.forEach((g, i) => {
    if (pl.placed.some((p) => p.layer.id === g.layer.id)) return;
    const a = 1 - tr;
    if (a <= 0.01) return;
    geos.push({ ...g, oy: snapCol[i], dx: 46 * tr, dy: -56 * tr, alpha: g.alpha * a, prev: undefined });
  });

  const leads: Lead[] = [];
  pl.placed.forEach((p, i) => {
    const old = snap.geos.find((g) => g.layer.id === p.layer.id);
    const colOy = pl.collapsed.get(p.layer.id)!;
    const te = ease(clamp01((t - e0 - i * STAGGER) / T_E));
    const shared = !!old;
    const oldCol = old ? snapCol[snapIds.indexOf(p.layer.id)] : colOy;
    const box = old ? lerpBox(old.box, p.box, tr) : p.box;
    const oy = t < e0 ? lerp(oldCol, colOy, tr) : lerp(colOy, p.oy, te);
    // 新零件：從左上方落下就位
    const dx = shared ? 0 : -40 * (1 - tr);
    const dy = shared ? 0 : -56 * (1 - tr);
    const alpha = shared ? 1 : tl.intro ? tr : tr;
    const prev = old && !sameLayer(old.layer, p.layer) && tr < 1 ? { layer: old.layer, alpha: 1 - tr } : undefined;
    const settleAt = e0 + i * STAGGER + T_E;
    const ts = t - settleAt;
    const isShot = !!p.layer.shot;
    const carried = old && old.layer.shot === p.layer.shot ? old : undefined;
    const ink = isShot ? (carried ? Math.max(carried.ink, clamp01(ts / T_INK)) : clamp01(ts / T_INK)) : 1;
    let wipe = 0;
    if (isShot) {
      if (carried && carried.wipe > 0) wipe = carried.wipe;
      else if (shotReady(p.layer)) wipe = ease(clamp01((ts - T_INK) / T_WIPE));
    }
    geos.push({ layer: p.layer, box, oy, alpha, dx, dy, prev, ink, wipe });

    const lab = pl.labels.get(p.layer.id)!;
    const draw = clamp01((t - e0 - i * STAGGER - T_E * 0.45) / T_LEAD);
    leads.push({ id: lab.id, ref: lab.ref, side: lab.side, from: anchorOf(box, oy, lab.side), y: lab.y, draw, alpha: draw > 0 ? 1 : 0 });
  });

  const last = e0 + (pl.placed.length - 1) * STAGGER + T_E;
  const shots = pl.placed.filter((p) => p.layer.shot);
  const end = last + (shots.length ? T_INK + T_WIPE + 40 : T_LEAD);
  const waitingShot = shots.some((p) => !shotReady(p.layer));
  return { geos, leads, settled: t >= end && !waitingShot };
}

/* ── 畫一個零件 ── */

function Part({ g, lit, flat, uid, base, onEnter, onLeave, onPick }: { g: Geo; lit: boolean; flat: number; uid: string; base: string; onEnter: () => void; onLeave: () => void; onPick: () => void }) {
  const [u0, v0, u1, v1] = g.box;
  const w = Math.max(1, u1 - u0);
  const d = Math.max(1, v1 - v0);
  const slab = g.layer.slab ?? 0;
  const outline: Pt[] = [iso(u0, v0, g.oy), iso(u1, v0, g.oy), iso(u1, v1, g.oy), iso(u0, v1, g.oy)];
  // 等角矩陣；攤平時內插到正視大圖
  let m = [C, 0.5, -C, 0.5, OX + C * (u0 - v0), g.oy + 0.5 * (u0 + v0)];
  if (flat > 0 && g.layer.shot) {
    const s = (VB_W - 40) / w;
    const fm = [s, 0, 0, s, 20, (VB_H - d * s) / 2];
    m = m.map((x, i) => lerp(x, fm[i], flat));
  }
  const matrix = `matrix(${m.map((x) => x.toFixed(4)).join(" ")})`;
  const Art = PARTS[g.layer.kind];
  const PrevArt = g.prev ? PARTS[g.prev.layer.kind] : null;
  const shotHref = g.layer.shot ? `${base}plates/${g.layer.shot}.webp` : "";
  const clip = `${uid}-clip-${g.layer.id}`;
  const cls = ["fg-part", lit ? "is-lit" : "", g.layer.hl ? "is-hl" : "", g.layer.to ? "has-link" : ""].filter(Boolean).join(" ");

  return (
    <g className={cls} style={{ opacity: g.alpha } as CSSProperties} transform={g.dx || g.dy ? `translate(${f1(g.dx)} ${f1(g.dy)})` : undefined} onMouseEnter={onEnter} onMouseLeave={onLeave} onClick={onPick}>
      <g className="fg-lift">
        {slab > 0 && flat === 0 && (
          <>
            <polygon className="fg-face fg-side" points={ptsStr([iso(u0, v1, g.oy), iso(u1, v1, g.oy), [iso(u1, v1, g.oy)[0], iso(u1, v1, g.oy)[1] + slab], [iso(u0, v1, g.oy)[0], iso(u0, v1, g.oy)[1] + slab]])} />
            <polygon className="fg-face fg-side" points={ptsStr([iso(u1, v0, g.oy), iso(u1, v1, g.oy), [iso(u1, v1, g.oy)[0], iso(u1, v1, g.oy)[1] + slab], [iso(u1, v0, g.oy)[0], iso(u1, v0, g.oy)[1] + slab]])} />
          </>
        )}
        <g transform={matrix}>
          <rect className="fg-face" x={0} y={0} width={w} height={d} />
          {g.prev && PrevArt && (
            <g className="fg-art" style={{ opacity: g.prev.alpha }}>
              <PrevArt w={w} d={d} p={g.prev.layer.p ?? {}} />
            </g>
          )}
          {g.layer.shot && g.ink < 1 && (
            <g className="fg-art fg-pencil" filter={`url(#${uid}-pencil)`} style={{ opacity: (1 - g.ink) * (g.prev ? 1 - g.prev.alpha : 1) }}>
              <Art w={w} d={d} p={g.layer.p ?? {}} />
            </g>
          )}
          <g className="fg-art" style={{ opacity: (g.layer.shot ? g.ink : 1) * (g.prev ? 1 - g.prev.alpha : 1) * (g.wipe >= 1 ? 0.0 : 1) }}>
            <Art w={w} d={d} p={g.layer.p ?? {}} />
          </g>
          {g.layer.shot && g.wipe > 0 && (
            <>
              <clipPath id={clip}>
                <rect x={0} y={0} width={w * g.wipe} height={d} />
              </clipPath>
              <image href={shotHref} x={0} y={0} width={w} height={d} preserveAspectRatio="xMinYMin slice" clipPath={`url(#${clip})`} />
              {g.wipe < 1 && <line x1={w * g.wipe} y1={0} x2={w * g.wipe} y2={d} className="k km" />}
            </>
          )}
          <rect className="fg-edge" x={0} y={0} width={w} height={d} />
        </g>
        {flat === 0 && <polygon points={ptsStr(outline)} className="fg-hit" />}
      </g>
    </g>
  );
}

type Props = {
  fig: Fig;
  /** 節號，例如 2.1.2 */
  no: string;
  base?: string;
};

export default function DocFig({ fig, no, base = "/" }: Props) {
  const uid = "fg";
  const target = useMemo(() => plan(fig), [fig]);
  const reduced = useRef(false);
  const [now, setNow] = useState(0);
  const tl = useRef<Tl | null>(null);
  const last = useRef<Frame | null>(null);
  const raf = useRef(0);
  const shown = useRef<string>("");
  const [live, setLive] = useState(false);
  const [lit, setLit] = useState<string | null>(null);
  // 內文讀到的那一段由哪個零件指著（docs.ts 的 nc:fig-active）；滑鼠停在零件上時以滑鼠為準
  const [act, setAct] = useState<string | null>(null);
  const shine = lit ?? act;
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const loadedRef = useRef(loaded);
  loadedRef.current = loaded;
  const [flatOn, setFlatOn] = useState(false);
  const flatAnim = useRef<{ from: number; to: number; t0: number } | null>(null);
  const [flat, setFlat] = useState(0);
  const shotReady = useCallback((l: Layer) => !!(l.shot && loadedRef.current[l.shot]), []);

  const tick = useCallback(() => {
    raf.current = 0;
    const t = performance.now();
    setNow(t);
    const fa = flatAnim.current;
    if (fa) {
      const k = ease(clamp01((t - fa.t0) / T_FLAT));
      setFlat(lerp(fa.from, fa.to, k));
      if (k >= 1) flatAnim.current = null;
    }
    if (tl.current || flatAnim.current) raf.current = requestAnimationFrame(tick);
  }, []);
  const kick = useCallback(() => {
    if (!raf.current) raf.current = requestAnimationFrame(tick);
  }, [tick]);

  // 預載截圖
  useEffect(() => {
    for (const l of fig.layers) {
      if (!l.shot || loadedRef.current[l.shot]) continue;
      const img = new Image();
      const name = l.shot;
      // 載入失敗也算「好了」：轉場不能一直等一張截圖（失敗時那一層停在墨線稿）
      img.onload = img.onerror = () => {
        setLoaded((s) => ({ ...s, [name]: true }));
        kick();
      };
      img.src = `${base}plates/${name}.webp`;
    }
  }, [fig, base, kick]);

  // 第一次掛上：進場（疊成一落淡入、展開）。分頁在背景時瀏覽器會暫停 requestAnimationFrame，直接給完成圖
  useLayoutEffect(() => {
    reduced.current = matchMedia("(prefers-reduced-motion: reduce)").matches;
    setLive(true);
    shown.current = no;
    if (reduced.current || document.visibilityState === "hidden") return;
    tl.current = { t0: performance.now() - T_C, snap: { geos: [], leads: [], settled: false }, target, intro: true };
    kick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 轉場進行中切到背景：動畫會停住，直接收尾成完成圖
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== "hidden" || !tl.current?.target) return;
      tl.current = null;
      setNow(performance.now());
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // 換頁開始：先收攏
  useEffect(() => {
    const onPrep = () => {
      if (reduced.current) return;
      setFlatOn(false);
      setFlat(0);
      flatAnim.current = null;
      const cur = last.current;
      if (!cur) return;
      tl.current = { t0: performance.now(), snap: cur, target: null, intro: false };
      kick();
    };
    document.addEventListener("astro:before-preparation", onPrep);
    return () => document.removeEventListener("astro:before-preparation", onPrep);
  }, [kick]);

  // 新的組裝稿到了
  useEffect(() => {
    if (shown.current === no) return;
    shown.current = no;
    setLit(null);
    if (reduced.current) {
      tl.current = null;
      return;
    }
    const t = performance.now();
    const cur = tl.current;
    if (cur && !cur.target) {
      // 已經收攏完、在等：從現在開始重組
      tl.current = { ...cur, target, t0: Math.max(cur.t0, t - T_C) };
    } else {
      tl.current = { t0: t, snap: last.current ?? settledFrame(target, true), target, intro: false };
    }
    kick();
  }, [no, target, kick]);

  // 符號說明（內文欄的 HTML）與圖上零件互相亮起
  useEffect(() => {
    const items = Array.from(document.querySelectorAll<HTMLElement>("[data-fig-part]"));
    const offs: (() => void)[] = [];
    for (const el of items) {
      const id = el.dataset.figPart!;
      const on = () => setLit(id);
      const off = () => setLit((s) => (s === id ? null : s));
      el.addEventListener("mouseenter", on);
      el.addEventListener("mouseleave", off);
      el.addEventListener("focus", on);
      el.addEventListener("blur", off);
      offs.push(() => {
        el.removeEventListener("mouseenter", on);
        el.removeEventListener("mouseleave", off);
        el.removeEventListener("focus", on);
        el.removeEventListener("blur", off);
      });
    }
    return () => offs.forEach((f) => f());
  }, [no]);

  useEffect(() => {
    for (const el of document.querySelectorAll<HTMLElement>("[data-fig-part]")) el.classList.toggle("is-lit", !!lit && el.dataset.figPart === lit);
  }, [lit, no]);

  useEffect(() => {
    const onAct = (e: Event) => setAct((e as CustomEvent<{ id: string | null }>).detail.id);
    document.addEventListener("nc:fig-active", onAct);
    return () => document.removeEventListener("nc:fig-active", onAct);
  }, []);

  // 「實機畫面」：攤平／收回
  const toggleFlat = useCallback(
    (on?: boolean) => {
      const next = on ?? !flatOn;
      setFlatOn(next);
      if (reduced.current) {
        setFlat(next ? 1 : 0);
        return;
      }
      flatAnim.current = { from: flat, to: next ? 1 : 0, t0: performance.now() };
      kick();
    },
    [flatOn, flat, kick],
  );
  useEffect(() => {
    if (!flatOn) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") toggleFlat(false);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [flatOn, toggleFlat]);
  // 終端機的 real 指令
  useEffect(() => {
    const onReal = () => toggleFlat();
    document.addEventListener("nc:fig-real", onReal);
    return () => document.removeEventListener("nc:fig-real", onReal);
  }, [toggleFlat]);

  // 算這一格
  let frame: Frame;
  if (tl.current && live) {
    frame = frameAt(tl.current, now || performance.now(), shotReady);
    if (frame.settled && tl.current.target) tl.current = null;
  } else {
    frame = settledFrame(target, !live || Object.keys(loaded).length > 0 ? true : false);
    if (live) frame.geos.forEach((g) => (g.wipe = g.layer.shot && loaded[g.layer.shot] ? 1 : g.layer.shot ? 0 : g.wipe));
  }
  last.current = frame;

  const shotLayer = fig.layers.find((l) => l.shot);
  const pick = (l: Layer) => {
    if (!l.to) return;
    const el = document.getElementById(l.to);
    if (!el) return;
    el.scrollIntoView({ behavior: reduced.current ? "auto" : "smooth", block: "start" });
    history.replaceState(history.state, "", `#${l.to}`);
  };
  const busy = !frame.settled;
  const names = fig.layers.map((l) => `${l.ref} ${l.name}`).join("、");

  // 攤平時截圖那層畫在最上面
  const order = flat > 0 ? [...frame.geos].sort((a, b) => Number(!!a.layer.shot) - Number(!!b.layer.shot)) : frame.geos;

  return (
    <div className={`fg${shotLayer ? " has-real" : ""}${busy ? " is-busy" : ""}${flatOn ? " is-flat" : ""}`}>
      {shotLayer && (
        <button type="button" className="fg-real" aria-pressed={flatOn} onClick={() => toggleFlat()} disabled={busy && !flatOn}>
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4">
            {flatOn ? <path d="M2 9l5-4 5 4M7 5v8" /> : <path d="M1.5 3.5h11v7h-11zM4.5 12.5h5" />}
          </svg>
          {flatOn ? "回到分解圖" : "實機畫面"}
        </button>
      )}
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className={`fg-svg${live ? " is-live" : ""}`} role="img" aria-label={`FIG. ${no} ${fig.caption}：${names}`}>
        <defs>
          <filter id={`${uid}-pencil`} x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
        <g className="fg-stage">
          {/* 組裝虛線：每一層的左右角往下連到下一層 */}
          <g className="fg-assembly" aria-hidden="true" style={{ opacity: 1 - flat }}>
            {frame.geos.map((g, i) => {
              const below = frame.geos[i - 1];
              if (!below || g.alpha < 0.5 || below.alpha < 0.5) return null;
              const [u0, v0, u1, v1] = g.box;
              return [iso(u0, v1, g.oy), iso(u1, v0, g.oy)].map(([x, y], k) => {
                const dy = below.oy - g.oy;
                return dy > 6 ? <line key={`${g.layer.id}-${k}`} x1={f1(x)} y1={f1(y)} x2={f1(x)} y2={f1(y + dy)} /> : null;
              });
            })}
          </g>
          <g aria-hidden="true">
            {order.map((g) => {
              const isFlatShot = flat > 0 && !!g.layer.shot;
              const dim = flat > 0 && !isFlatShot ? 1 - flat * 0.88 : 1;
              return (
                <Part
                  key={g.layer.id}
                  g={{ ...g, alpha: g.alpha * dim }}
                  lit={shine === g.layer.id && !busy}
                  flat={isFlatShot ? flat : 0}
                  uid={uid}
                  base={base}
                  onEnter={() => !busy && setLit(g.layer.id)}
                  onLeave={() => setLit((s) => (s === g.layer.id ? null : s))}
                  onPick={() => (flat > 0 ? toggleFlat(false) : pick(g.layer))}
                />
              );
            })}
          </g>
          <g className="fg-leads" aria-hidden="true" style={{ opacity: 1 - flat }}>
            {frame.leads.map((l) => {
              if (l.alpha <= 0) return null;
              const [ax, ay] = l.from;
              const right = l.side === "r";
              const ex = right ? NUM_R - 18 : NUM_L + 16;
              const nx = right ? NUM_R - 5 : NUM_L + 4;
              const d = Math.abs(ay - l.y) < 0.5 ? `M${f1(ax)} ${f1(ay)} H${nx}` : `M${f1(ax)} ${f1(ay)} H${ex} V${f1(l.y)} H${nx}`;
              const on = shine === l.id && !busy;
              return (
                <g key={l.id} className={`fg-lead${on ? " is-lit" : ""}`} style={{ opacity: l.alpha }}>
                  <path d={d} pathLength={1} className="fg-lead-line" style={{ strokeDasharray: 1, strokeDashoffset: 1 - l.draw }} />
                  <circle cx={f1(ax)} cy={f1(ay)} r={3.2} className="fg-dot" style={{ opacity: Math.min(1, l.draw * 3) }} />
                  <text x={right ? NUM_R : NUM_L} y={f1(l.y + 7)} textAnchor={right ? "start" : "end"} className="fg-num" style={{ opacity: clamp01(l.draw * 2 - 1) }}>
                    {l.ref}
                  </text>
                </g>
              );
            })}
          </g>
        </g>
      </svg>
      {flatOn && <p className="fg-flat-note">NoteCraftApp 實機截圖。按 Esc 或再點一次回到分解圖。</p>}
    </div>
  );
}
