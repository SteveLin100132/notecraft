// Graph 的畫布：SVG 的邊、節點、標題（handoff §4；規格 docs/notecraft-workbench-notes-graph.md §7）。
//
// 幾條效能規則（300 節點時要能順暢 hover 與縮放）：
// - 平移縮放只改 .gr-world 的 transform 與 --k；標題字級、熱區寬度在 CSS 以 calc(… / var(--k)) 換算，節點不重繪
// - 淡出由根元素的 .is-dimming 加上元素的 .hot 決定：hover 時只有高亮集合的元素換 class（每個元素都是 memo）
// - 標題的顯示門檻由根元素的 data-labels／data-near／.dense 決定，縮放跨過門檻時不逐一改節點
// - 模式切換的移動動畫不經過 React：以 data-* 找到元素直接改屬性，結束時 DOM 就是 React 畫的最終位置
// - 選取環、focus 環只在該狀態時才渲染；顏色用 class 或 style 的 CSS 變數，不用 presentation attribute
import { memo, useLayoutEffect, useRef } from "react";
import type { CSSProperties, FocusEvent, KeyboardEvent, MouseEvent, PointerEvent as ReactPointerEvent, RefObject } from "react";
import { GR_MOVE_MS, GR_ZOOM } from "@/lib/wb-graph";
import type { GraphEdge, GraphMode, GraphNode, Highlight, TagLine } from "@/lib/wb-graph";
import { edgeGeom } from "@/lib/wb-graph-layout";
import type { Cluster, Hub, Pt, ViewBox } from "@/lib/wb-graph-layout";
import { rowHandlers } from "../NoteRow";

const ease = (t: number): number => 1 - Math.pow(1 - t, 3);
const tr = (x: number, y: number): string => `translate(${Math.round(x * 100) / 100},${Math.round(y * 100) / 100})`;

/** 線寬：基本線寬 +（次數 − 1）× 步進，上限 --wb-gr-w-max（handoff §4.2） */
const edgeWidth = (e: GraphEdge): string =>
  `min(calc(var(--wb-gr-w-${e.kind}) + ${Math.max(0, e.n - 1)} * var(--wb-gr-w-step)), var(--wb-gr-w-max))`;

type EdgeProps = { e: GraphEdge; a: Pt; b: Pt; ra: number; rb: number; hot: boolean };
const GrEdge = memo(function GrEdge({ e, a, b, ra, rb, hot }: EdgeProps) {
  const g = edgeGeom(a, b, ra, rb);
  return (
    <g className={"gr-edge" + (hot ? " hot" : "")} data-e={e.id} data-s={e.s} data-t={e.t} data-ra={ra} data-rb={rb} visibility={g ? undefined : "hidden"}>
      <line className={"gr-e " + e.kind} x1={g?.x1} y1={g?.y1} x2={g?.x2} y2={g?.y2} style={{ strokeWidth: edgeWidth(e) }} />
      <path className={"gr-arr gr-arr-" + e.kind} d={g?.arrow} />
      <line className="gr-ehit" x1={g?.x1} y1={g?.y1} x2={g?.tx} y2={g?.ty} />
    </g>
  );
});

type NodeProps = { n: GraphNode; p: Pt; r: number; fill: string; hot: boolean; hov: boolean; sel: boolean; focus: boolean };
const GrNode = memo(function GrNode({ n, p, r, fill, hot, hov, sel, focus }: NodeProps) {
  const cls = "gr-n" + (n.data ? " data" : "") + (hot ? " hot" : "") + (sel ? " sel" : "") + (hov ? " hov" : "");
  const shape = (pad: number, className: string, style?: CSSProperties) =>
    n.data ? (
      <rect className={className} x={-r - pad} y={-r - pad} width={(r + pad) * 2} height={(r + pad) * 2} rx={(r + pad) * (pad ? 0.4 : 0.38)} style={style} />
    ) : (
      <circle className={className} r={r + pad} style={style} />
    );
  const body = (
    <>
      {sel ? shape(8, "gr-halo") : null}
      {focus ? shape(4.5, "gr-fring") : null}
      {sel ? shape(3.5, "gr-ring") : null}
      {shape(0, "gr-shape", { fill })}
    </>
  );
  const label = `${n.data ? "資料檔" : "筆記"} ${n.title}，連入 ${n.inDeg}、連出 ${n.outDeg}`;
  // 資料檔單擊即導覽 → 真的連結；筆記單擊開 Drawer → 按鈕語意（格狀小目標，沒有常駐的開啟連結，由 Drawer 提供）
  // （JSX 的 <a> 是 HTML 的型別、沒有 transform：位置放在裡面那層 <g>，動畫也是改它）
  return n.data ? (
    <a className={cls} href={n.href} aria-label={label}>
      <g data-n={n.id} transform={tr(p.x, p.y)}>
        {body}
      </g>
    </a>
  ) : (
    <g className={cls} data-n={n.id} transform={tr(p.x, p.y)} tabIndex={0} role="button" aria-pressed={sel} aria-label={label}>
      {body}
    </g>
  );
});

type LabelProps = { n: GraphNode; p: Pt; r: number; hot: boolean; show: boolean };
const GrLabel = memo(function GrLabel({ n, p, r, hot, show }: LabelProps) {
  return (
    <text className={`gr-lbl t${n.tier}` + (hot ? " hot" : "") + (show ? " show strong" : "")} data-l={n.id} data-r={r} transform={tr(p.x, p.y + r)} dy="1.25em">
      {n.title}
    </text>
  );
});

export interface GraphCanvasProps {
  svgRef: RefObject<SVGSVGElement>;
  mode: GraphMode;
  nodes: GraphNode[];
  /** 目前畫出來的邊（文件模式、已套用種類開關） */
  edges: GraphEdge[];
  /** 標籤模式的細線 */
  lines: TagLine[];
  hubs: Hub[];
  clusters: Cluster[];
  /** 佈局的最終位置（節點與樞紐）；沒有位置的節點不畫 */
  pos: Record<string, Pt>;
  /** pos 換了一份時遞增：決定要不要做移動動畫 */
  layoutKey: string;
  animate: boolean;
  dense: boolean;
  radiusOf: (n: GraphNode) => number;
  colorOf: (n: GraphNode) => string;
  /** 樞紐的描邊色；「其他標籤」「未加標籤」回 null（虛線圓、不可點） */
  hubColor: (tag: string) => string | null;
  hubHref: (tag: string) => string;
  clusterLabel: (key: string) => string;
  hl: Highlight | null;
  /** 目前 hover／focus 的節點或樞紐 id */
  hover: string | null;
  /** 搜尋符合的節點 */
  matches: Set<string> | null;
  sel: string | null;
  /** 鍵盤 focus（:focus-visible）的節點 */
  focusId: string | null;
  showOrphanLabels: boolean;
  view: ViewBox;
  glide: boolean;
  panning: boolean;
  noteCount: number;
  viewportHandlers: {
    onPointerDown: (e: ReactPointerEvent<SVGSVGElement>) => void;
    onPointerMove: (e: ReactPointerEvent<SVGSVGElement>) => void;
    onPointerUp: () => void;
    onPointerCancel: () => void;
  };
  onHover: (id: string | null) => void;
  onHoverEdge: (id: string | null) => void;
  onFocusNode: (id: string | null, keyboard: boolean) => void;
  onSelect: (slug: string) => void;
}

export default function GraphCanvas(props: GraphCanvasProps) {
  const { svgRef, mode, nodes, edges, lines, hubs, clusters, pos, layoutKey, animate, dense, radiusOf, colorOf, hl, hover, matches, sel, focusId, view } = props;
  const shown = useRef<Record<string, Pt> | null>(null);
  const raf = useRef(0);

  // 模式切換的移動動畫（handoff §5.5）：節點從目前位置以 600ms、1−(1−t)³ 移到新位置，邊每一幀重畫
  useLayoutEffect(() => {
    const svg = svgRef.current;
    const from = shown.current;
    cancelAnimationFrame(raf.current);
    if (!svg || !from || !animate) {
      shown.current = pos;
      return;
    }
    const nodeEls = [...svg.querySelectorAll<SVGElement>("[data-n]")];
    const labelEls = [...svg.querySelectorAll<SVGElement>("[data-l]")];
    const edgeEls = [...svg.querySelectorAll<SVGElement>("[data-e]")];
    const lineEls = [...svg.querySelectorAll<SVGElement>("[data-tl]")];
    const apply = (P: Record<string, Pt>) => {
      for (const el of nodeEls) {
        const p = P[el.dataset.n!];
        if (p) el.setAttribute("transform", tr(p.x, p.y));
      }
      for (const el of labelEls) {
        const p = P[el.dataset.l!];
        if (p) el.setAttribute("transform", tr(p.x, p.y + Number(el.dataset.r)));
      }
      for (const el of edgeEls) {
        const a = P[el.dataset.s!];
        const b = P[el.dataset.t!];
        const g = a && b ? edgeGeom(a, b, Number(el.dataset.ra), Number(el.dataset.rb)) : null;
        if (!g) {
          el.setAttribute("visibility", "hidden");
          continue;
        }
        el.removeAttribute("visibility");
        const [line, arrow, hit] = el.children;
        line.setAttribute("x1", String(g.x1));
        line.setAttribute("y1", String(g.y1));
        line.setAttribute("x2", String(g.x2));
        line.setAttribute("y2", String(g.y2));
        arrow.setAttribute("d", g.arrow);
        hit.setAttribute("x1", String(g.x1));
        hit.setAttribute("y1", String(g.y1));
        hit.setAttribute("x2", String(g.tx));
        hit.setAttribute("y2", String(g.ty));
      }
      for (const el of lineEls) {
        const p = P[el.dataset.s!];
        if (p) {
          el.setAttribute("x1", String(p.x));
          el.setAttribute("y1", String(p.y));
        }
      }
    };
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / GR_MOVE_MS);
      const e = ease(t);
      const cur: Record<string, Pt> = {};
      for (const id of Object.keys(pos)) {
        const a = from[id] ?? pos[id];
        const b = pos[id];
        cur[id] = { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e };
      }
      shown.current = cur;
      apply(t >= 1 ? pos : cur);
      if (t < 1) raf.current = requestAnimationFrame(step);
    };
    step(t0); // 先套回起點，避免第一幀閃到終點
    raf.current = requestAnimationFrame(step);
    // 保底：分頁在背景時 rAF 不會觸發，節點會停在起點。時間到就直接套用終點
    const done = window.setTimeout(() => {
      cancelAnimationFrame(raf.current);
      shown.current = pos;
      apply(pos);
    }, GR_MOVE_MS + 80);
    return () => {
      cancelAnimationFrame(raf.current);
      window.clearTimeout(done);
    };
    // pos 與 layoutKey 一起換；animate 只在換的當下讀
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutKey]);

  // 事件都掛在 .gr-world 上一份（委派），以 data-* 找回是哪個節點／樞紐／邊
  const itemOf = (target: EventTarget | null): Element | null => (target instanceof Element ? target.closest("[data-n],[data-hub],[data-e]") : null);
  const idOf = (el: Element | null): string | null => (el ? (el.getAttribute("data-n") ?? el.getAttribute("data-hub")) : null);
  /** 筆記節點（不含資料檔：資料檔的 [data-n] 包在 <a> 裡，原生導覽） */
  const noteOf = (target: EventTarget): string | null => {
    const el = target instanceof Element ? target.closest("[data-n]") : null;
    return el && !el.closest("a") ? el.getAttribute("data-n") : null;
  };
  const onOver = (e: ReactPointerEvent<SVGGElement>) => {
    const el = itemOf(e.target);
    if (!el || el === itemOf(e.relatedTarget)) return; // 在同一個元素的子節點之間移動不算
    const edge = el.getAttribute("data-e");
    if (edge) props.onHoverEdge(edge);
    else props.onHover(idOf(el));
  };
  const onOut = (e: ReactPointerEvent<SVGGElement>) => {
    const el = itemOf(e.target);
    if (!el || el === itemOf(e.relatedTarget)) return;
    if (el.hasAttribute("data-e")) props.onHoverEdge(null);
    else props.onHover(null);
  };
  const onFocus = (e: FocusEvent<SVGGElement>) => {
    const target = e.target as Element;
    const id = idOf(target.matches("[data-n],[data-hub]") ? target : target.querySelector("[data-n],[data-hub]"));
    if (!id) return;
    props.onHover(id);
    props.onFocusNode(id, target.matches(":focus-visible"));
  };
  const onBlur = () => {
    props.onHover(null);
    props.onFocusNode(null, false);
  };
  // 筆記節點：單擊／⌘單擊／中鍵／雙擊沿用列的語意（NoteRow 的 rowHandlers）；鍵盤的 Enter／Space 等同單擊（handoff §5.2）
  const onClick = (e: MouseEvent<SVGGElement>) => {
    const slug = noteOf(e.target);
    if (slug) rowHandlers(slug, props.onSelect).onClick(e);
  };
  const onAuxClick = (e: MouseEvent<SVGGElement>) => {
    const slug = noteOf(e.target);
    if (slug) rowHandlers(slug, props.onSelect).onAuxClick(e);
  };
  const onDoubleClick = (e: MouseEvent<SVGGElement>) => {
    const slug = noteOf(e.target);
    if (slug) rowHandlers(slug, props.onSelect).onDoubleClick();
  };
  const onKeyDown = (e: KeyboardEvent<SVGGElement>) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const slug = noteOf(e.target);
    if (!slug) return;
    e.preventDefault();
    props.onSelect(slug);
  };

  const k = view.k;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const hot = (id: string): boolean => !!hl && hl.nodes.has(id);
  const hotEdge = (id: string): boolean => !!hl && hl.edges.has(id);
  const rootCls = "gr-svg gr-root" + (props.panning ? " panning" : "") + (hl ? " is-dimming" : "") + (hover ? " is-hover" : "") + (dense ? " dense" : "");

  return (
    <svg
      ref={svgRef}
      className={rootCls}
      data-labels={k >= (dense ? GR_ZOOM.dense : GR_ZOOM.label) ? "all" : undefined}
      data-near={k >= GR_ZOOM.near ? "" : undefined}
      role="group"
      aria-label={`筆記 Graph，${props.noteCount} 篇筆記`}
      {...props.viewportHandlers}
    >
      <g
        className={"gr-world" + (props.glide ? " glide" : "")}
        style={{ transform: `translate(${view.x}px,${view.y}px) scale(${k})`, "--k": k } as CSSProperties}
        onPointerOver={onOver}
        onPointerOut={onOut}
        onFocus={onFocus}
        onBlur={onBlur}
        onClick={onClick}
        onAuxClick={onAuxClick}
        onDoubleClick={onDoubleClick}
        onKeyDown={onKeyDown}
      >
        {lines.map((l) => {
          const a = pos[l.s];
          const b = pos[l.t];
          if (!a || !b) return null;
          return <line key={l.id} className={"gr-e tagl" + (hotEdge(l.id) ? " hot" : "")} data-tl={l.id} data-s={l.s} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
        })}
        {edges.map((e) => {
          const a = pos[e.s];
          const b = pos[e.t];
          const na = byId.get(e.s);
          const nb = byId.get(e.t);
          if (!a || !b || !na || !nb) return null;
          return <GrEdge key={e.id} e={e} a={a} b={b} ra={radiusOf(na)} rb={radiusOf(nb)} hot={hotEdge(e.id)} />;
        })}
        {mode === "doc" && props.showOrphanLabels
          ? clusters.map((c) => (
              <text key={c.key} className="gr-cl" x={c.x} y={c.y}>
                {props.clusterLabel(c.key)}
              </text>
            ))
          : null}
        {hubs.map((h) => {
          const color = props.hubColor(h.tag);
          const inside = h.r * k >= 11;
          const body = (
            <>
              {focusId === h.id ? <circle className="gr-fring" r={h.r + 4} /> : null}
              <circle className="gr-hc" r={h.r} style={color ? { stroke: color } : undefined} />
              {inside ? <text className="gr-hn">{h.n}</text> : null}
            </>
          );
          const cls = "gr-hub" + (color ? "" : " plain") + (hot(h.id) ? " hot" : "");
          // 樞紐單擊即導覽（換頁到 ?tag=…&view=graph）→ 真的連結；「其他標籤」「未加標籤」不可點、不可聚焦
          return color ? (
            <a key={h.id} className={cls} href={props.hubHref(h.tag)} aria-label={`標籤 ${h.tag}，${h.n} 篇筆記`}>
              <g data-hub={h.id} transform={tr(h.x, h.y)}>
                {body}
              </g>
            </a>
          ) : (
            <g key={h.id} className={cls} data-hub={h.id} transform={tr(h.x, h.y)} role="img" aria-label={`${h.tag}，${h.n} 篇筆記`}>
              {body}
            </g>
          );
        })}
        {nodes.map((n) => {
          const p = pos[n.id];
          if (!p) return null;
          return <GrNode key={n.id} n={n} p={p} r={radiusOf(n)} fill={colorOf(n)} hot={hot(n.id)} hov={hover === n.id} sel={sel === n.id} focus={focusId === n.id} />;
        })}
        {nodes.map((n) => {
          const p = pos[n.id];
          if (!p) return null;
          const show = n.id === hover || n.id === sel || n.id === focusId || (!!matches && matches.has(n.id));
          return <GrLabel key={n.id} n={n} p={p} r={radiusOf(n)} hot={hot(n.id)} show={show} />;
        })}
        {hubs.map((h) => (
          <text key={h.id} className={"gr-lbl hubl strong" + (hot(h.id) ? " hot" : "")} transform={tr(h.x, h.y + h.r)} dy="1.3em">
            {h.tag}
            {h.r * k >= 11 ? "" : ` ${h.n}`}
          </text>
        ))}
      </g>
    </svg>
  );
}
