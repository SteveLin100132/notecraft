// 元件預覽畫布 Viewport —— `full-visual` 版型的視覺化容器。
//
// 規格來源：docs/prototype/design_handoff_canvas_viewport/README.md（hifi handoff）。
//
// 為什麼需要：筆記裡的 @ai-visualize 元件是為**網頁內文**設計的（寬度吃滿版心、
// 高度隨內容長、頁面可捲），但投影片是固定 1600×900、`overflow: hidden` 的座標系。
// 舊的「2px 虛線框 + 垂直置中」會把高元件的下緣、寬元件的左右靜靜裁掉。
//
// 做法：元件躺在一張「紙」上、紙躺在點陣藍圖上，可縮放、可平移，超出的部分被裁切
// 並靠平移看見，並提供「還原置中」這個單一出口。
//
// 硬約束（皆為既有實作事實，非偏好）：
//   - 所有尺寸為 1600×900 座標系下的絕對 px；整頁縮放由 SlideFrame 的 transform 負責。
//     指標位移一律除以 `outerScale` 換算回座標系，否則拖曳不跟手。
//   - 顏色只取 dkt() 語意 token（網格點色以 color-mix 從 muted 取百分比），
//     字級只取 DS 階梯、間距只取 DGAP、圓角只走 --radius-* 變數。
//   - 簡報已綁 ← → ↑ ↓ Space（翻頁）、Esc（退出）、O（大綱）—— 本元件完全不註冊這些鍵。
//   - 只有**確實發生縮放或平移**的那一刻才 preventDefault + stopPropagation，
//     其餘（含已達 25% / 300% 上下限）一律放行冒泡給外層頁面捲動。

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, MutableRefObject, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { Crosshair, Frame, Hand, Minus, Mouse, Plus, RotateCcw, Scan } from "lucide-react";
import type { DeckThemeTokens } from "./theme";
import { dkt } from "./theme";
import { DGAP, DS } from "./scale";

export type CanvasMode = "view" | "play" | "thumb";

/** 縮放範圍與級距（README〈縮放參數〉）。 */
const MIN_Z = 0.25;
const MAX_Z = 3;
const BTN_STEP = 1.2;
/** 紙張四周的呼吸，同時是紙張自身的 padding。 */
const INSET = DGAP.md;
/** 橡皮筋：紙張可再被拖離畫布的比例（超過後阻力遞增、鬆手回彈）。 */
const RUBBER = 0.25;

const ZOOM_MS = 260;
const FADE_MS = 200;
const IDLE_MS = 3000;
const BADGE_MS = 240;
const BTN_MS = 140;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** SSR 安全、且會跟著使用者設定變動的 prefers-reduced-motion。 */
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}

interface Transform {
  z: number;
  x: number;
  y: number;
}

export interface CanvasViewportProps {
  /** 要放上紙張的元件節點。undefined 且非 thumb → 走空狀態 */
  content?: ReactNode;
  /** 紙張內容寬度（元件原設計版心） */
  natural?: number;
  w: number;
  h: number;
  mode?: CanvasMode;
  dark: boolean;
  /** 並排雙畫布：40px 控制列、隱藏百分比文字 */
  compact?: boolean;
  /** 外層 transform: scale 的倍率；指標位移需除以它才跟手 */
  outerScale?: number;
  /** 空狀態顯示的標記 id */
  emptyId?: string;
  /** 空狀態的說明句；不給用預設 */
  emptyHint?: string;
  /** 外部觸發「只還原這一塊畫布」（雙畫布同步用） */
  fitRef?: MutableRefObject<(() => void) | null>;
  /** 給定時，畫布上的 fit 操作改為呼叫它（由版型同時還原兩側）；不遞迴呼叫自己 */
  onFitRequest?: () => void;
}

export function CanvasViewport({
  content,
  natural = 860,
  w,
  h,
  mode = "view",
  dark,
  compact,
  outerScale = 1,
  emptyId,
  emptyHint,
  fitRef,
  onFitRequest,
}: CanvasViewportProps) {
  const c = dkt(dark);
  const reduced = useReducedMotion();
  const thumb = mode === "thumb";
  const empty = !thumb && content == null;
  const interactive = !thumb && !empty;

  const box = useRef<HTMLDivElement | null>(null);
  const paperIn = useRef<HTMLDivElement | null>(null);

  const [fitZ, setFitZ] = useState(1);
  const [t, setT] = useState<Transform>({ z: 1, x: 0, y: 0 });
  const [anim, setAnim] = useState(false);
  const [hover, setHover] = useState(false);
  const [drag, setDrag] = useState(false);
  const [active, setActive] = useState(false);
  const [hintOn, setHintOn] = useState(false);
  const [over, setOver] = useState({ t: 0, b: 0, l: 0, r: 0 });

  // 視角的真值放在 ref、state 只負責觸發重繪。
  //
  // 不是為了少一次 render —— 滾輪一幀內可能連來好幾個事件，若從 state 讀「當下值」，
  // 同一批事件會全部算在同一個舊 z 上：縮放少走、而且到達 25%／300% 上下限時還會繼續
  // preventDefault（該放行卻沒放行）。所以每次變動都同步寫進 ref、再 setT 觸發畫面。
  const tRef = useRef(t);
  const commit = useCallback((next: Transform) => {
    tRef.current = next;
    setT(next);
  }, []);
  const fitRef_ = useRef(fitZ);
  fitRef_.current = fitZ;
  /** 使用者動過之後就不再自動跟隨 fit（否則字體載入完會把人拉回原點） */
  const touched = useRef(false);
  const idleTimer = useRef<number | undefined>(undefined);
  const animTimer = useRef<number | undefined>(undefined);
  const hintTimer = useRef<number | undefined>(undefined);

  /** 紙張未縮放前的外框尺寸（含 padding）。 */
  const paperBox = useCallback(() => {
    const el = paperIn.current;
    if (!el) return { pw: 0, ph: 0 };
    return { pw: el.offsetWidth + INSET * 2, ph: el.offsetHeight + INSET * 2 };
  }, []);

  /** fit 比例：四周留 24px 呼吸，且不放大超過 100%。 */
  const measure = useCallback(() => {
    const { pw, ph } = paperBox();
    if (!pw || !ph) return 1;
    const z = Math.min(1, (w - INSET * 2) / pw, (h - INSET * 2) / ph);
    setFitZ(z);
    return z;
  }, [paperBox, w, h]);

  // 初次量測 + 內容 / 尺寸變動時重新 fit（使用者已操作過就只更新 fitZ、不動視角）
  useEffect(() => {
    if (!interactive) return;
    touched.current = false;
    const apply = () => {
      const z = measure();
      if (!touched.current) commit({ z, x: 0, y: 0 });
    };
    apply();
    const raf = requestAnimationFrame(apply);
    const el = paperIn.current;
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(apply) : null;
    if (el) ro?.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, [interactive, measure, content]);

  useEffect(
    () => () => {
      window.clearTimeout(idleTimer.current);
      window.clearTimeout(animTimer.current);
      window.clearTimeout(hintTimer.current);
    },
    [],
  );

  // 邊界溢出偵測：哪一側超出 → 該側浮出遮罩（四側獨立判定）
  useEffect(() => {
    if (!interactive) {
      setOver({ t: 0, b: 0, l: 0, r: 0 });
      return;
    }
    const { pw, ph } = paperBox();
    const sw = pw * t.z;
    const sh = ph * t.z;
    const left = w / 2 + t.x - sw / 2;
    const top = h / 2 + t.y - sh / 2;
    setOver({
      l: left < -1 ? 1 : 0,
      r: left + sw > w + 1 ? 1 : 0,
      t: top < -1 ? 1 : 0,
      b: top + sh > h + 1 ? 1 : 0,
    });
  }, [interactive, paperBox, t, w, h, fitZ]);

  /** 平移上限：紙張蓋滿畫布所需的位移，再加 25% 畫布尺寸的自由額度。 */
  const limitFor = useCallback(
    (z: number) => {
      const { pw, ph } = paperBox();
      return {
        x: Math.max(0, (pw * z - w) / 2) + w * RUBBER,
        y: Math.max(0, (ph * z - h) / 2) + h * RUBBER,
      };
    },
    [paperBox, w, h],
  );

  /** 橡皮筋阻尼：超出 lim 之後位移遞減，最多再多 slack，永遠拖不到完全看不見。 */
  const damp = (v: number, lim: number, slack: number) => {
    const o = Math.abs(v) - lim;
    if (o <= 0) return v;
    return Math.sign(v) * (lim + (slack * o) / (o + slack));
  };

  /** 控制列淡入，3s 無操作後回落。 */
  const bump = useCallback(() => {
    setActive(true);
    window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => setActive(false), IDLE_MS);
  }, []);

  /** 按鈕 / 雙擊 / 鍵盤觸發的位移才有轉場；滾輪與拖曳必須 0ms 跟手。 */
  const animate = useCallback(
    (fn: () => void) => {
      touched.current = true;
      if (!reduced) {
        setAnim(true);
        window.clearTimeout(animTimer.current);
        animTimer.current = window.setTimeout(() => setAnim(false), ZOOM_MS + 20);
      }
      fn();
      bump();
    },
    [bump, reduced],
  );

  /** 只還原這一塊畫布（外部 fitRef 觸發的入口，不會回頭呼叫 onFitRequest）。 */
  const applyFit = useCallback(() => {
    animate(() => {
      touched.current = false;
      commit({ z: fitRef_.current, x: 0, y: 0 });
    });
  }, [animate]);

  /** 畫布上的 fit 操作：雙畫布時交給版型同時還原兩側。 */
  const requestFit = useCallback(() => {
    if (onFitRequest) onFitRequest();
    else applyFit();
  }, [applyFit, onFitRequest]);

  useEffect(() => {
    if (!fitRef) return;
    fitRef.current = applyFit;
    return () => {
      fitRef.current = null;
    };
  }, [fitRef, applyFit]);

  /** 以畫布中心為錨點的縮放（cx / cy 為相對畫布中心的座標系 px）。 */
  const zoomAt = useCallback(
    (nz: number, cx: number, cy: number) => {
      const p = tRef.current;
      const z2 = clamp(nz, MIN_Z, MAX_Z);
      const ux = (cx - p.x) / p.z;
      const uy = (cy - p.y) / p.z;
      const lim = limitFor(z2);
      touched.current = true;
      commit({ z: z2, x: clamp(cx - ux * z2, -lim.x, lim.x), y: clamp(cy - uy * z2, -lim.y, lim.y) });
    },
    [limitFor],
  );

  const step = useCallback(
    (dir: 1 | -1) => animate(() => zoomAt(tRef.current.z * (dir > 0 ? BTN_STEP : 1 / BTN_STEP), 0, 0)),
    [animate, zoomAt],
  );
  const goHundred = useCallback(() => animate(() => zoomAt(1, 0, 0)), [animate, zoomAt]);

  // ── 滾輪 ─────────────────────────────────────────────────
  // React 的 onWheel 是 passive listener、preventDefault 無效 —— 必須原生 non-passive 掛載。
  const onWheel = (e: WheelEvent) => {
    if (!interactive) return;
    const pinch = e.ctrlKey; // 觸控板捏合，瀏覽器一律送 ctrl+wheel
    const mod = e.metaKey || e.ctrlKey;
    const zoomable = mode === "play" ? true : mod; // 檢視模式需 ⌘/Ctrl；播放模式純滾輪即縮放
    const cur = tRef.current;

    if (e.shiftKey && !pinch) {
      // Shift + 滾輪 = 水平平移
      const lim = limitFor(cur.z);
      const nx = clamp(cur.x - e.deltaY / outerScale, -lim.x, lim.x);
      if (Math.abs(nx - cur.x) < 0.5) return; // 沒真的移動 → 放行
      e.preventDefault();
      e.stopPropagation();
      touched.current = true;
      commit({ ...cur, x: nx });
      bump();
      return;
    }

    if (!zoomable) return; // 未消化 → 原封不動冒泡給頁面捲動
    const next = clamp(cur.z * Math.pow(1.0015, -e.deltaY), MIN_Z, MAX_Z);
    if (Math.abs(next - cur.z) < 0.0005) return; // 已達 25% / 300% 上下限 → 放行
    const el = box.current;
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    const r = el.getBoundingClientRect();
    zoomAt(next, (e.clientX - r.left) / outerScale - w / 2, (e.clientY - r.top) / outerScale - h / 2);
    bump();
  };

  const wheelRef = useRef(onWheel);
  wheelRef.current = onWheel;
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const handler = (e: WheelEvent) => wheelRef.current(e);
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  // ── 拖曳平移 ──────────────────────────────────────────────
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!interactive || e.button !== 0) return;
    const onContent = paperIn.current?.contains(e.target as Node) ?? false;
    if (onContent && !e.altKey) return; // 元件互動優先；⌥ 才能從元件上起手平移
    e.preventDefault();
    const sx = e.clientX;
    const sy = e.clientY;
    const start = tRef.current;
    const lim = limitFor(start.z);
    setDrag(true);
    touched.current = true;
    bump();

    const move = (ev: PointerEvent) => {
      const nx = start.x + (ev.clientX - sx) / outerScale;
      const ny = start.y + (ev.clientY - sy) / outerScale;
      commit({ z: start.z, x: damp(nx, lim.x, w * RUBBER), y: damp(ny, lim.y, h * RUBBER) });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setDrag(false);
      bump();
      // 橡皮筋回彈
      const cur = tRef.current;
      const cx = clamp(cur.x, -lim.x, lim.x);
      const cy = clamp(cur.y, -lim.y, lim.y);
      if (Math.abs(cx - cur.x) > 0.5 || Math.abs(cy - cur.y) > 0.5) {
        animate(() => commit({ z: cur.z, x: cx, y: cy }));
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // ── 鍵盤 + − 0：僅在指標位於畫布上時生效（三鍵皆未被簡報佔用）─────
  useEffect(() => {
    if (!hover || !interactive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        step(1);
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        step(-1);
      } else if (e.key === "0") {
        e.preventDefault();
        requestFit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hover, interactive, step, requestFit]);

  // ── 衍生狀態 ──────────────────────────────────────────────
  const offset = interactive && (Math.abs(t.z - fitZ) > 0.005 || Math.abs(t.x) > 1 || Math.abs(t.y) > 1);
  const chromeOp = thumb ? 0 : hover || active || drag ? 1 : mode === "play" ? 0.32 : 0.5;
  const barH = compact ? 40 : 48;
  const iconSize = compact ? 18 : 20;
  const canvasBg = dark ? c.stage : c.sunken;
  const tr = (spec: string) => (reduced ? "none" : spec);

  // 點陣藍圖：跟著縮放（不跟著會像「圖片變大」而非「鏡頭推近」），並在極端倍率降級
  const dot = (a: number) => `color-mix(in srgb, ${c.muted} ${a}%, transparent)`;
  const fine = { size: 24 * t.z, r: 1.1, a: dark ? 30 : 34 };
  const major = { size: 96 * t.z, r: 1.7, a: dark ? 55 : 60 };
  const grid = thumb
    ? [{ ...major, size: 6 }] // 縮覽圖固定 6px 點距，不乘 z
    : t.z < 0.5
      ? [major] // 太密 → 只畫 96 主點
      : t.z > 2
        ? [fine] // 太疏 → 只畫 24 細點
        : [fine, major];

  return (
    <div
      ref={box}
      onPointerDown={onPointerDown}
      onDoubleClick={(e) => {
        if (interactive && !paperIn.current?.contains(e.target as Node)) requestFit();
      }}
      onMouseEnter={() => {
        setHover(true);
        if (interactive && !hintOn) {
          setHintOn(true);
          window.clearTimeout(hintTimer.current);
          hintTimer.current = window.setTimeout(() => setHintOn(false), IDLE_MS);
        }
      }}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        width: w,
        height: h,
        flex: "none",
        overflow: "hidden",
        borderRadius: thumb ? "var(--radius-xs)" : "var(--radius-xl)",
        border: `1px solid ${c.border}`,
        background: canvasBg,
        cursor: !interactive ? "default" : drag ? "grabbing" : "grab",
        boxShadow: dark ? "inset 0 1px 0 rgba(255,255,255,0.04)" : "inset 0 1px 3px rgba(17,47,93,0.07)",
      }}
    >
      {/* z1 — 點陣藍圖 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          backgroundImage: grid
            .map((g) => `radial-gradient(circle, ${dot(g.a)} ${g.r}px, transparent ${g.r + 0.2}px)`)
            .join(","),
          backgroundSize: grid.map((g) => `${g.size}px ${g.size}px`).join(","),
          backgroundPosition: "center center",
          transition: tr(`background-size ${anim ? ZOOM_MS : 0}ms var(--ease-out)`),
        }}
      />

      {/* z2 — 紙張 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {empty ? (
          <EmptyPaper c={c} dark={dark} id={emptyId} hint={emptyHint} />
        ) : (
          <div
            style={{
              background: "var(--neutral-0)",
              border: `1px solid ${c.borderSoft}`,
              borderRadius: "var(--radius-lg)",
              padding: INSET,
              // 白紙已是畫面最亮的物件，層次靠陰影而非亮色描邊
              boxShadow: dark ? c.shadowLg : c.shadow,
              transform: `translate(${t.x}px, ${t.y}px) scale(${t.z})`,
              transformOrigin: "center center",
              transition: anim && !reduced ? `transform ${ZOOM_MS}ms var(--ease-out)` : "none",
            }}
          >
            <div ref={paperIn} style={{ width: natural }}>
              {thumb ? <ThumbSkeleton h={Math.min(360, h - INSET * 2)} /> : content}
            </div>
          </div>
        )}
      </div>

      {/* z3 — 方向性邊緣遮罩（四側獨立判定）*/}
      {(["t", "b", "l", "r"] as const).map((k) => (
        <div
          key={k}
          style={{
            position: "absolute",
            zIndex: 3,
            pointerEvents: "none",
            opacity: thumb ? 0 : over[k],
            transition: tr(`opacity ${FADE_MS}ms var(--ease-out)`),
            background: `linear-gradient(to ${SCRIM_DIR[k]}, ${canvasBg}, transparent)`,
            ...SCRIM_BOX[k],
          }}
        />
      ))}

      {/* z4 — chrome */}
      {offset && (
        <div
          style={{
            position: "absolute",
            left: DGAP.sm,
            top: DGAP.sm,
            zIndex: 4,
            display: "inline-flex",
            alignItems: "center",
            gap: DGAP.xs,
            height: 40,
            padding: `0 ${DGAP.xs}px 0 ${DGAP.sm}px`,
            borderRadius: "var(--radius-pill)",
            background: c.chrome,
            border: `1px solid ${c.border}`,
            boxShadow: c.shadow,
            fontSize: DS.small,
            color: c.body,
            animation: reduced ? "none" : `ncBadgeIn ${BADGE_MS}ms var(--ease-out)`,
          }}
        >
          <Crosshair size={18} />
          <span>已偏移 · {Math.round(t.z * 100)}%</span>
          <button
            onClick={requestFit}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: 28,
              padding: "0 12px",
              border: "none",
              borderRadius: "var(--radius-pill)",
              background: c.accentSoft,
              color: dark ? "var(--orange-300)" : "var(--orange-600)",
              fontFamily: "var(--font-sans)",
              fontSize: DS.micro,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            <RotateCcw size={14} />
            還原
          </button>
        </div>
      )}

      {hintOn && interactive && (
        <div
          style={{
            position: "absolute",
            left: DGAP.sm,
            bottom: DGAP.sm,
            zIndex: 4,
            display: "inline-flex",
            alignItems: "center",
            gap: DGAP.xs,
            height: 36,
            padding: `0 ${DGAP.sm}px`,
            borderRadius: "var(--radius-pill)",
            background: c.chrome,
            border: `1px solid ${c.borderSoft}`,
            color: c.muted,
            fontSize: DS.micro,
            pointerEvents: "none",
            animation: reduced ? "none" : `ncBadgeIn ${BADGE_MS}ms var(--ease-out)`,
          }}
        >
          <Hand size={16} />
          拖曳平移
          <span style={{ opacity: 0.5 }}>·</span>
          <Mouse size={16} />
          {mode === "play" ? "滾輪縮放" : "⌘ + 滾輪縮放"}
        </div>
      )}

      {!thumb && (
        <div
          style={{
            position: "absolute",
            right: DGAP.sm,
            bottom: DGAP.sm,
            zIndex: 4,
            display: "flex",
            alignItems: "center",
            gap: DGAP.xs,
            height: barH,
            padding: `0 ${DGAP.xs}px`,
            borderRadius: "var(--radius-pill)",
            background: c.chrome,
            border: `1px solid ${c.border}`,
            boxShadow: c.shadow,
            // 毛玻璃僅此一處
            backdropFilter: "blur(10px) saturate(1.1)",
            WebkitBackdropFilter: "blur(10px) saturate(1.1)",
            opacity: empty ? chromeOp * 0.35 : chromeOp,
            pointerEvents: empty ? "none" : "auto",
            transition: tr(`opacity ${FADE_MS}ms var(--ease-out)`),
          }}
        >
          <IconBtn c={c} label="縮小" disabled={t.z <= MIN_Z + 0.001} onClick={() => step(-1)}>
            <Minus size={iconSize} />
          </IconBtn>
          {!compact && (
            <button
              onClick={goHundred}
              title="回到 100%"
              style={{
                minWidth: 78,
                height: 30,
                border: "none",
                background: "none",
                cursor: "pointer",
                textAlign: "center",
                fontFamily: "var(--font-mono)",
                fontSize: DS.small,
                fontWeight: 700,
                color: c.ink,
              }}
            >
              {Math.round(t.z * 100)}%
            </button>
          )}
          <IconBtn c={c} label="放大" disabled={t.z >= MAX_Z - 0.001} onClick={() => step(1)}>
            <Plus size={iconSize} />
          </IconBtn>
          <span style={{ width: 1, height: 24, background: c.border }} />
          <IconBtn c={c} label="還原置中（fit）" highlight={offset} onClick={requestFit}>
            <Scan size={iconSize} />
          </IconBtn>
        </div>
      )}
    </div>
  );
}

// ── 零件 ─────────────────────────────────────────────────────

const SCRIM_DIR = { t: "bottom", b: "top", l: "right", r: "left" } as const;
const SCRIM_BOX: Record<"t" | "b" | "l" | "r", CSSProperties> = {
  t: { top: 0, left: 0, right: 0, height: 40 },
  b: { bottom: 0, left: 0, right: 0, height: 40 },
  l: { top: 0, bottom: 0, left: 0, width: 40 },
  r: { top: 0, bottom: 0, right: 0, width: 40 },
};

function IconBtn({
  c,
  label,
  onClick,
  disabled,
  highlight,
  children,
}: {
  c: DeckThemeTokens;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  highlight?: boolean;
  children: ReactNode;
}) {
  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);
  const lit = hover && !disabled;
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setPress(false);
      }}
      onPointerDown={() => setPress(true)}
      onPointerUp={() => setPress(false)}
      style={{
        width: 36,
        height: 36,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        border: "none",
        borderRadius: "var(--radius-pill)",
        background: lit ? c.hover : highlight ? c.brandSoft : "transparent",
        color: disabled ? c.muted : lit || highlight ? c.brandInk : c.body,
        opacity: disabled ? 0.35 : 1,
        cursor: disabled ? "default" : "pointer",
        transform: press && !disabled ? "scale(0.97)" : "none",
        transition: `background ${BTN_MS}ms var(--ease-out), color ${BTN_MS}ms var(--ease-out), transform ${BTN_MS}ms var(--ease-out)`,
      }}
    >
      {children}
    </button>
  );
}

/** 空狀態：全元件唯一使用虛線之處 —— 讓「這是一塊畫布」在沒有元件時就先被理解。 */
function EmptyPaper({ c, dark, id, hint }: { c: DeckThemeTokens; dark: boolean; id?: string; hint?: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: DGAP.sm,
        width: 760,
        maxWidth: "84%",
        height: 340,
        border: `1px dashed ${c.border}`,
        borderRadius: "var(--radius-lg)",
        background: dark ? c.sunken : "transparent",
        color: c.muted,
      }}
    >
      <span style={{ color: c.brand, display: "inline-flex" }}>
        <Frame size={56} strokeWidth={1.6} />
      </span>
      <div style={{ fontSize: DS.h4, fontWeight: 800, color: c.ink }}>尚未綁定視覺化元件</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: DS.micro }}>@ai-visualize · {id ?? "—"}</div>
      <div style={{ fontSize: DS.small, maxWidth: 520, textAlign: "center", lineHeight: 1.7 }}>
        {hint ?? "在筆記中生成此標記對應的互動元件後，它會自動置中於這塊畫布。"}
      </div>
    </div>
  );
}

/**
 * 縮覽圖降級：不掛載真元件，只留白紙與 3 條骨架線（首行 blue-200）。
 * 紙張兩主題皆白，故骨架線一律取亮色階，不跟著 dkt 切換。
 */
function ThumbSkeleton({ h }: { h: number }) {
  const line = (width: string, bg: string) => (
    <div style={{ width, height: 14, borderRadius: "var(--radius-sm)", background: bg }} />
  );
  return (
    <div style={{ height: h, display: "flex", flexDirection: "column", gap: DGAP.sm }}>
      {line("46%", "var(--blue-200)")}
      {line("82%", "var(--neutral-200)")}
      {line("64%", "var(--neutral-100)")}
    </div>
  );
}

export default CanvasViewport;
