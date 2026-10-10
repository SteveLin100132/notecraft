// /notes 的 Graph 檢視（規格 docs/notecraft-workbench-notes-graph.md；像素規格 docs/prototype/design_handoff_notes_graph/）。
// 由 NotesWorkbench 以 React.lazy 載入：用不到 Graph 的人不下載這包。SSR 永遠畫 List，這裡只在 hydration 之後出現。
//
// 這個元件只管 state 與接線：
//   邊與節點的衍生欄位、著色分組、標籤樞紐、高亮集合 → lib/wb-graph.ts（純函式，UI 不自己數）
//   座標 → lib/wb-graph-layout.ts（純函式；節點多時丟給 Web Worker）
//   SVG → GraphCanvas；Toolbar → GraphToolbar；浮層 → GrOverlays
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { WbGraphDataNode, WbGraphEdge, WbNoteRow } from "@/lib/wb-types";
import {
  GR_ALL,
  GR_DENSE,
  GR_OTHER_TAGS,
  GR_R,
  GR_UNTAGGED,
  colorScheme,
  deriveGraph,
  highlightOf,
  matchNodes,
  pickTagHubs,
  tagLines,
  tagSlots,
} from "@/lib/wb-graph";
import type { GraphNode } from "@/lib/wb-graph";
import { fitView, runLayout } from "@/lib/wb-graph-layout";
import type { LayoutRequest, LayoutResult } from "@/lib/wb-graph-layout";
import { DEFAULT_GRAPH_PREFS, readGraphPrefs, writeGraphPrefs } from "@/lib/wb-graph-prefs";
import type { GraphPrefs } from "@/lib/wb-graph-prefs";
import { EMPTY_QUERY, toSearch } from "@/lib/wb-filter";
import type { WbQuery } from "@/lib/wb-filter";
import { withBase } from "@/lib/base";
import { GraphSkeleton } from "../GraphStatic";
import GraphCanvas from "./GraphCanvas";
import GraphToolbar from "./GraphToolbar";
import { GrLegend, GrStats, GrTipEdge, GrTipHub, GrTipNode, GrZoom } from "./GrOverlays";
import type { LegendGroup } from "./GrOverlays";
import { GrEmptyFilter, GrEmptyLinks } from "./GrStates";
import { prefersReducedMotion, useGraphViewport } from "./useGraphViewport";

// 佈局結果的記憶體快取：同一個 key（可見節點、模式、著色、孤島）切回去不重算。不寫 localStorage。
const layoutCache = new Map<string, LayoutResult>();
const CACHE_MAX = 16;
function remember(key: string, result: LayoutResult): void {
  layoutCache.set(key, result);
  if (layoutCache.size > CACHE_MAX) layoutCache.delete(layoutCache.keys().next().value as string);
}

let worker: Worker | null | undefined;
/** 佈局用的 Worker（第一次用到才建立）；環境不支援時回 null，改在主執行緒算 */
function layoutWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = new Worker(new URL("../../../lib/wb-graph-worker.ts", import.meta.url), { type: "module" });
  } catch {
    worker = null;
  }
  return worker;
}

/**
 * 佈局：節點 ≤ GR_DENSE 在 render 內同步算；超過的交給 Worker，算完之前回 null（畫骨架）。
 * 斥力是 O(n²)，300 節點約 0.2 秒、1,000 節點約 1.4 秒，不能放在主執行緒（規格 §5.2）。
 */
function useLayout(req: LayoutRequest | null, big: boolean): LayoutResult | null {
  const [, bump] = useState(0);
  const key = req?.key ?? "";
  const reqRef = useRef(req);
  reqRef.current = req;
  let result = key ? (layoutCache.get(key) ?? null) : null;
  if (req && !result && !big) {
    result = runLayout(req);
    remember(key, result);
  }
  const pending = !!req && !result;
  useEffect(() => {
    if (!pending) return;
    const r = reqRef.current;
    if (!r) return;
    let alive = true;
    const done = (res: LayoutResult) => {
      remember(r.key, res);
      if (alive) bump((n) => n + 1);
    };
    const w = layoutWorker();
    if (!w) {
      const t = window.setTimeout(() => done(runLayout(r)), 30); // 先讓骨架畫出來
      return () => {
        alive = false;
        window.clearTimeout(t);
      };
    }
    const onMsg = (e: MessageEvent<{ key: string; result: LayoutResult }>) => {
      if (e.data.key === r.key) done(e.data.result);
    };
    const onErr = () => done(runLayout(r));
    w.addEventListener("message", onMsg);
    w.addEventListener("error", onErr);
    w.postMessage(r);
    return () => {
      alive = false;
      w.removeEventListener("message", onMsg);
      w.removeEventListener("error", onErr);
    };
  }, [key, pending]);
  return result;
}

export default function GraphView({
  rows = [],
  allRows = [],
  edges = [],
  dataNodes = [],
  tagStats = [],
  query = EMPTY_QUERY,
  scopeLabel = "",
  sel = null,
  onSelect = () => {},
  onClearExtra = () => {},
}: {
  /** 已套用網址上的篩選、**不套用搜尋字串**的筆記（Graph 的搜尋只高亮、不過濾） */
  rows?: WbNoteRow[];
  /** 全站筆記：著色分組的配色順序以它為準，不隨篩選變動 */
  allRows?: WbNoteRow[];
  edges?: WbGraphEdge[];
  dataNodes?: WbGraphDataNode[];
  tagStats?: { name: string; count: number }[];
  query?: WbQuery;
  /** 目前篩選的名稱（空狀態 A 的文案） */
  scopeLabel?: string;
  sel?: string | null;
  onSelect?: (slug: string) => void;
  /** 清掉 pending／hasAi／nofm／fav */
  onClearExtra?: () => void;
}) {
  // 首次 render 用預設值，hydrate 之後才讀偏好
  const [prefs, setPrefs] = useState<GraphPrefs>(DEFAULT_GRAPH_PREFS);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setPrefs(readGraphPrefs());
    setReady(true);
  }, []);
  const update = useCallback((patch: Partial<GraphPrefs>) => setPrefs(writeGraphPrefs(patch)), []);
  const { mode, colorBy, kinds, showOrphans, legendOpen } = prefs;

  const [gq, setGq] = useState("");
  const [hover, setHover] = useState<string | null>(null);
  const [hoverEdge, setHoverEdge] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const wrap = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const vp = useGraphViewport(svgRef, size);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, []);

  // ── 資料 ──
  const graph = useMemo(() => deriveGraph(rows, edges, dataNodes), [rows, edges, dataNodes]);
  const hubTags = useMemo(() => pickTagHubs(tagStats, query.tag), [tagStats, query.tag]);
  const scheme = useMemo(() => colorScheme(colorBy, allRows, query.folder, hubTags), [colorBy, allRows, query.folder, hubTags]);
  const tagScheme = useMemo(() => colorScheme("tag", allRows, "", hubTags), [allRows, hubTags]);
  const nodes = useMemo(() => (showOrphans ? graph.nodes : graph.nodes.filter((n) => !n.orphan)), [graph, showOrphans]);
  const byId = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph]);
  const dense = nodes.length > GR_DENSE;
  const radiusOf = useCallback((n: GraphNode) => GR_R[n.tier - 1] * (dense ? 0.85 : 1), [dense]);
  const colorOf = useCallback((n: GraphNode) => scheme.colorOf(scheme.keyOf(n)), [scheme]);
  const notes = useMemo(() => nodes.filter((n) => !n.data), [nodes]);

  // ── 佈局 ──
  const nodeKey = useMemo(() => nodes.map((n) => n.id).join("\n"), [nodes]);
  const request = useMemo<LayoutRequest | null>(() => {
    if (!ready || nodes.length === 0) return null;
    if (mode === "tag") {
      return {
        key: ["tag", hubTags.join(","), dense, nodeKey].join("|"),
        mode: "tag",
        nodes: nodes.map((n) => ({ id: n.id, r: radiusOf(n), data: n.data, slots: tagSlots(n, hubTags) })),
        slots: [...hubTags, GR_OTHER_TAGS, GR_UNTAGGED],
      };
    }
    return {
      key: ["doc", colorBy, query.folder, hubTags.join(","), dense, graph.edges.length, nodeKey].join("|"),
      mode: "doc",
      nodes: nodes.map((n) => ({ id: n.id, r: radiusOf(n), orphan: n.orphan, group: scheme.keyOf(n) })),
      edges: graph.edges.map((e) => ({ s: e.s, t: e.t })),
      groups: scheme.order,
    };
  }, [ready, mode, nodes, nodeKey, hubTags, dense, colorBy, query.folder, graph.edges, scheme, radiusOf]);
  const computed = useLayout(request, dense);
  // 節點沒變、只是換模式或著色時，新的佈局算好之前先留著舊的畫面，不閃骨架
  const last = useRef<{ nodeKey: string; key: string; layout: LayoutResult } | null>(null);
  if (computed && request) last.current = { nodeKey, key: request.key, layout: computed };
  const held = computed ? null : last.current && last.current.nodeKey === nodeKey ? last.current : null;
  const layout = computed ?? held?.layout ?? null;
  const layoutKey = computed && request ? request.key : (held?.key ?? "");
  const stale = !computed && !!held;

  const drawnEdges = useMemo(
    () => (mode === "doc" && !stale ? graph.edges.filter((e) => kinds[e.kind] && (showOrphans || (!byId.get(e.s)?.orphan && !byId.get(e.t)?.orphan))) : []),
    [mode, stale, graph.edges, kinds, showOrphans, byId],
  );
  const lines = useMemo(() => (mode === "tag" && !stale ? tagLines(nodes, hubTags) : []), [mode, stale, nodes, hubTags]);
  const hubs = mode === "tag" && layout ? layout.hubs : [];
  const plainHub = (tag: string): boolean => tag === GR_OTHER_TAGS || tag === GR_UNTAGGED;

  // ── 符合視窗 ──
  const doFit = useCallback(
    (animate: boolean) => {
      if (!layout) return;
      const v = fitView(Object.values(layout.pos), size.w, size.h);
      if (v) vp.moveTo(v, animate);
    },
    // vp.moveTo 是穩定的 callback
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layout, size.w, size.h],
  );
  const fitted = useRef<string | null>(null);
  useEffect(() => {
    if (!layoutKey || !size.w || !size.h || fitted.current === layoutKey) return;
    const first = fitted.current === null;
    fitted.current = layoutKey;
    doFit(!first);
  }, [layoutKey, size.w, size.h, doFit]);

  // 模式切換的移動動畫：只在「同一批節點換了佈局」時做；大圖與 reduced-motion 直接換位（規格 §5.3）
  const prevLayout = useRef({ key: "", nodeKey: "" });
  const animate = !!layoutKey && prevLayout.current.key !== layoutKey && prevLayout.current.nodeKey === nodeKey && !dense && !prefersReducedMotion();
  useEffect(() => {
    prevLayout.current = { key: layoutKey, nodeKey };
  }, [layoutKey, nodeKey]);

  // ── 選取／focus：節點被 Drawer 蓋住或在可視範圍外時，把圖平移過去（不縮放，handoff §5.4）──
  const reveal = useCallback(
    (id: string, drawerWidth: number) => {
      const p = layout?.pos[id];
      if (!p || !size.w) return;
      const v = vp.viewRef.current;
      const sx = p.x * v.k + v.x;
      const sy = p.y * v.k + v.y;
      const free = size.w - drawerWidth;
      const offX = sx > free - 40 || sx < 40;
      const offY = sy < 40 || sy > size.h - 40;
      if (!offX && !offY) return;
      vp.moveTo({ k: v.k, x: offX ? Math.max(free / 2, Math.min(free - 40, 280)) - p.x * v.k : v.x, y: offY ? size.h / 2 - p.y * v.k : v.y }, true);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layout, size.w, size.h],
  );
  useEffect(() => {
    if (!sel) return;
    // Drawer 的寬度從 DOM 量：861–1100px 是 420，不是 handoff 寫的 480
    const dw = document.querySelector<HTMLElement>(".wb-main .wb-drawer")?.offsetWidth ?? Math.min(480, size.w);
    reveal(sel, Math.min(dw, size.w));
    // 只在選取改變時平移，不跟著 layout 或尺寸重跑
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel]);
  useEffect(() => {
    if (focusId && !focusId.startsWith("tag:")) reveal(focusId, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);

  // ── 高亮 ──
  const matches = useMemo(() => matchNodes(nodes, gq), [nodes, gq]);
  const hl = useMemo(
    () => highlightOf({ mode, hover, hoverEdge, matches, nodes, edges: drawnEdges, lines, hubs: [...hubTags, GR_OTHER_TAGS, GR_UNTAGGED] }),
    [mode, hover, hoverEdge, matches, nodes, drawnEdges, lines, hubTags],
  );

  // ── 圖例 ──
  const legend = useMemo<LegendGroup[]>(() => {
    const count = new Map<string, number>();
    for (const n of nodes) {
      const k = scheme.keyOf(n);
      count.set(k, (count.get(k) ?? 0) + 1);
    }
    return scheme.order.filter((k) => count.has(k)).map((k) => ({ key: k, label: scheme.labelOf(k), color: scheme.colorOf(k), n: count.get(k) ?? 0 }));
  }, [nodes, scheme]);

  const isEmptyA = rows.length === 0;
  const isEmptyB = !isEmptyA && mode === "doc" && graph.edges.length === 0;
  const loading = !isEmptyA && !isEmptyB && !layout;

  // ── 提示框 ──
  const k = vp.view.k;
  let tip: { x: number; y: number; off: number; body: ReactNode } | null = null;
  if (layout && size.w && !stale) {
    const scr = (p: { x: number; y: number }) => ({ x: p.x * k + vp.view.x, y: p.y * k + vp.view.y });
    const edge = hoverEdge ? drawnEdges.find((e) => e.id === hoverEdge) : undefined;
    if (edge && layout.pos[edge.s] && layout.pos[edge.t]) {
      const a = scr(layout.pos[edge.s]);
      const b = scr(layout.pos[edge.t]);
      tip = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, off: 10, body: <GrTipEdge e={edge} from={byId.get(edge.s)?.title} to={byId.get(edge.t)?.title} /> };
    } else if (hover?.startsWith("tag:")) {
      const h = hubs.find((x) => x.id === hover);
      if (h) tip = { ...scr(h), off: h.r * k + 10, body: <GrTipHub tag={h.tag} n={h.n} plain={plainHub(h.tag)} /> };
    } else if (hover) {
      const n = byId.get(hover);
      const p = layout.pos[hover];
      if (n && p) {
        tip = {
          ...scr(p),
          off: radiusOf(n) * k + 10,
          body: <GrTipNode n={n} mode={mode} folderLabel={n.folder.join("/") || "根目錄"} hubTags={hubTags.filter((t) => n.tags.includes(t))} />,
        };
      }
    }
  }
  const tipStyle: CSSProperties | undefined = tip
    ? tip.x > size.w - 300
      ? { right: size.w - tip.x + tip.off, top: Math.max(8, tip.y - 20) }
      : { left: tip.x + tip.off, top: Math.max(8, tip.y - 20) }
    : undefined;

  const extraFilters = [query.pending, query.hasAi, query.nofm, query.fav].filter(Boolean).length;
  const clearMode = () => {
    setHover(null);
    setHoverEdge(null);
  };
  const onFocusNode = useCallback((id: string | null, keyboard: boolean) => setFocusId(id && keyboard ? id : null), []);

  return (
    <>
      <GraphToolbar
        mode={mode}
        colorBy={colorBy}
        kinds={kinds}
        showOrphans={showOrphans}
        query={gq}
        count={notes.length}
        extraFilters={extraFilters}
        onMode={(m) => {
          clearMode();
          update({ mode: m });
        }}
        onColorBy={(c) => update({ colorBy: c })}
        onKinds={(kd) => update({ kinds: kd })}
        onShowOrphans={(v) => update({ showOrphans: v })}
        onQuery={setGq}
        onClearExtra={onClearExtra}
      />
      <div id="nc-scroll" className="wb-body flush gr-body" ref={wrap} data-wb-rows>
        {isEmptyA ? (
          <GrEmptyFilter label={scopeLabel} clearHref={withBase("/notes" + toSearch({ ...EMPTY_QUERY, view: "graph" }))} />
        ) : isEmptyB ? (
          <GrEmptyLinks n={notes.length} onTagMode={() => update({ mode: "tag" })} />
        ) : loading || !layout ? (
          <GraphSkeleton />
        ) : (
          <>
            <GrStats
              mode={mode}
              notes={notes.length}
              edges={drawnEdges.length}
              orphans={graph.nodes.filter((n) => n.orphan && !n.data).length}
              tags={hubs.filter((h) => !plainHub(h.tag)).length}
              untagged={notes.filter((n) => n.tags.length === 0).length}
              match={matches ? matches.size : null}
            />
            <GrZoom k={k} onIn={() => vp.zoomAt(1.25, undefined, undefined, true)} onOut={() => vp.zoomAt(0.8, undefined, undefined, true)} onFit={() => doFit(true)} />
            <GrLegend open={legendOpen} onToggle={() => update({ legendOpen: !legendOpen })} mode={mode} colorBy={colorBy} groups={legend} kinds={kinds} />
            <GraphCanvas
              svgRef={svgRef}
              mode={mode}
              nodes={nodes}
              edges={drawnEdges}
              lines={lines}
              hubs={hubs}
              clusters={layout.clusters}
              pos={layout.pos}
              layoutKey={layoutKey}
              animate={animate}
              dense={dense}
              radiusOf={radiusOf}
              colorOf={colorOf}
              hubColor={(tag) => (plainHub(tag) ? null : tagScheme.colorOf(tag))}
              hubHref={(tag) => withBase("/notes" + toSearch({ ...EMPTY_QUERY, tag, view: "graph" }))}
              clusterLabel={(key) => (key === GR_ALL ? "孤島" : "孤島・" + scheme.labelOf(key))}
              hl={hl}
              hover={hover}
              matches={matches}
              sel={sel}
              focusId={focusId}
              showOrphanLabels={showOrphans && !stale}
              view={vp.view}
              glide={vp.glide}
              panning={vp.panning}
              noteCount={notes.length}
              viewportHandlers={vp.handlers}
              onHover={setHover}
              onHoverEdge={setHoverEdge}
              onFocusNode={onFocusNode}
              onSelect={onSelect}
            />
            {tip ? (
              <div className="gr-tip" style={tipStyle} role="tooltip">
                {tip.body}
              </div>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}
