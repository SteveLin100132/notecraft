// Graph 畫布的平移與縮放（handoff §5.1）。
// 拖曳空白處平移、滾輪以游標為中心縮放（25%–300%）；按鈕與「符合視窗」有 360ms 滑動，滾輪與拖曳沒有。
// 狀態只有一個 view（world → 螢幕：screen = world × k + (x, y)），畫布只把它套在 .gr-world 的 transform 與 --k 上。
import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { GR_ZOOM } from "@/lib/wb-graph";
import type { ViewBox } from "@/lib/wb-graph-layout";

export const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const clampK = (k: number): number => Math.max(GR_ZOOM.min, Math.min(GR_ZOOM.max, k));

export function useGraphViewport(svgRef: RefObject<SVGSVGElement>, size: { w: number; h: number }) {
  const [view, setView] = useState<ViewBox>({ x: 0, y: 0, k: 1 });
  const [glide, setGlide] = useState(false);
  const [panning, setPanning] = useState(false);
  const viewRef = useRef(view);
  viewRef.current = view;
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const glideTimer = useRef(0);
  const drag = useRef<{ x: number; y: number; v: ViewBox } | null>(null);

  /** 下一次 view 變動用 CSS transition 滑過去（reduced-motion 時直接到位） */
  const glideOnce = useCallback(() => {
    if (prefersReducedMotion()) return;
    setGlide(true);
    window.clearTimeout(glideTimer.current);
    glideTimer.current = window.setTimeout(() => setGlide(false), 380);
  }, []);
  useEffect(() => () => window.clearTimeout(glideTimer.current), []);

  const moveTo = useCallback(
    (v: ViewBox, animate: boolean) => {
      if (animate) glideOnce();
      setView({ ...v, k: clampK(v.k) });
    },
    [glideOnce],
  );

  /** 以 (cx, cy) 為中心縮放 f 倍；沒給中心時用畫布中心 */
  const zoomAt = useCallback(
    (f: number, cx?: number, cy?: number, animate = false) => {
      const v = viewRef.current;
      const k = clampK(v.k * f);
      const x = cx ?? sizeRef.current.w / 2;
      const y = cy ?? sizeRef.current.h / 2;
      if (animate) glideOnce();
      setView({ k, x: x - (x - v.x) * (k / v.k), y: y - (y - v.y) * (k / v.k) });
    },
    [glideOnce],
  );

  // wheel 要 passive:false 才能 preventDefault，所以不用 React 的 onWheel
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * 0.0016), e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  });

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.target !== e.currentTarget || e.button !== 0) return; // 只有空白處才平移
    drag.current = { x: e.clientX, y: e.clientY, v: viewRef.current };
    setPanning(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d) return;
    setView({ ...d.v, x: d.v.x + (e.clientX - d.x), y: d.v.y + (e.clientY - d.y) });
  };
  const onPointerUp = () => {
    drag.current = null;
    setPanning(false);
  };

  return { view, viewRef, glide, panning, moveTo, zoomAt, handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp } };
}
