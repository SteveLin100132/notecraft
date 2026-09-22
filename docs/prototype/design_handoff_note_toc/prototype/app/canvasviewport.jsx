// NoteCraft — 元件預覽畫布 Viewport（藍圖畫布）
// 規格見「Canvas Viewport Spec.html」。所有尺寸為 1600×900 座標系下的絕對 px。
// props: id / content(node) / natural(width) / w / h / mode("view"|"play"|"thumb") / dark / compact / outerScale / onFitInfo
const CV_ICONS = {
  minus: "M5 12h14",
  plus: "M5 12h14M12 5v14",
  scan: "M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3",
  rotate: "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5",
  hand: "M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2a8 8 0 0 1-8-8v-1",
  crosshair: "M12 3v4M12 17v4M3 12h4M17 12h4",
  frame: "M3 10h18M9 4v16",
  mouse: "M4 4l7 16 2.5-6.5L20 11z",
};
function CvIcon({ n, s = 20, sw = 2 }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }}>
      {n === "crosshair" && <circle cx="12" cy="12" r="9" />}
      {n === "frame" && <rect x="3" y="4" width="18" height="16" rx="2" />}
      <path d={CV_ICONS[n]} />
    </svg>
  );
}

const CV_MIN = 0.25, CV_MAX = 3, CV_STEP = 1.2, CV_INSET = 24;
const cvReduced = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function CanvasViewport({ content, natural = 860, w = 1392, h = 658, mode = "view", dark, compact, outerScale = 1, empty, emptyId, fitRef }) {
  const { useState, useRef, useEffect, useCallback } = React;
  const c = window.dkt(dark);
  const box = useRef(null), paperIn = useRef(null);
  const [fitZ, setFitZ] = useState(1);
  const [t, setT] = useState({ z: 1, x: 0, y: 0 });
  const [anim, setAnim] = useState(false);
  const [hover, setHover] = useState(false);
  const [drag, setDrag] = useState(false);
  const [active, setActive] = useState(false);
  const [hintOn, setHintOn] = useState(false);
  const [over, setOver] = useState({ t: 0, b: 0, l: 0, r: 0 });
  const idle = useRef(0);
  const thumb = mode === "thumb";

  // fit 比例：四周留 24px 呼吸，不放大超過 100%
  const measure = useCallback(() => {
    const el = paperIn.current; if (!el) return 1;
    const cw = el.offsetWidth + 48, ch = el.offsetHeight + 48;
    const z = Math.min(1, (w - CV_INSET * 2) / cw, (h - CV_INSET * 2) / ch);
    setFitZ(z); return z;
  }, [w, h]);

  useEffect(() => {
    if (empty) return;
    const z = measure();
    setT({ z, x: 0, y: 0 });
    const ro = new ResizeObserver(() => measure());
    if (paperIn.current) ro.observe(paperIn.current);
    return () => ro.disconnect();
  }, [empty, measure, content]);

  // 邊界溢出偵測（哪一側超出 → 該側浮出遮罩）
  useEffect(() => {
    const el = paperIn.current, bx = box.current;
    if (!el || !bx || empty) { setOver({ t: 0, b: 0, l: 0, r: 0 }); return; }
    const pw = (el.offsetWidth + 48) * t.z, ph = (el.offsetHeight + 48) * t.z;
    const left = w / 2 + t.x - pw / 2, top = h / 2 + t.y - ph / 2;
    setOver({ l: left < -1 ? 1 : 0, r: left + pw > w + 1 ? 1 : 0, t: top < -1 ? 1 : 0, b: top + ph > h + 1 ? 1 : 0 });
  }, [t, w, h, empty, fitZ]);

  const bump = () => {
    setActive(true);
    clearTimeout(idle.current);
    idle.current = setTimeout(() => setActive(false), 3000);
  };
  const animate = (fn) => { if (!cvReduced()) { setAnim(true); setTimeout(() => setAnim(false), 280); } fn(); bump(); };
  const goFit = () => animate(() => setT({ z: fitZ, x: 0, y: 0 }));
  const goHundred = () => animate(() => setT((p) => ({ ...p, z: 1 })));
  const step = (dir) => animate(() => setT((p) => ({ ...p, z: Math.min(CV_MAX, Math.max(CV_MIN, p.z * (dir > 0 ? CV_STEP : 1 / CV_STEP))) })));
  if (fitRef) fitRef.current = goFit;

  // 指標錨點縮放
  const zoomAt = (nz, cx, cy) => setT((p) => {
    const z2 = Math.min(CV_MAX, Math.max(CV_MIN, nz));
    const ux = (cx - p.x) / p.z, uy = (cy - p.y) / p.z;
    return { z: z2, x: cx - ux * z2, y: cy - uy * z2 };
  });

  const wheelRef = useRef(null);
  const onWheel = (e) => {
    if (thumb || empty) return;
    const pinch = e.ctrlKey, mod = e.metaKey || e.ctrlKey;
    const zoomable = mode === "play" ? true : mod;      // 檢視模式需 ⌘/Ctrl；播放模式純滾輪即縮放
    if (e.shiftKey && !pinch) {                          // Shift+滾輪 = 水平平移
      e.preventDefault(); e.stopPropagation(); bump();
      setT((p) => ({ ...p, x: p.x - e.deltaY / outerScale }));
      return;
    }
    if (!zoomable) return;                               // 未消化 → 原封不動冒泡給頁面捲動
    const next = t.z * Math.pow(1.0015, -e.deltaY);
    const clamped = Math.min(CV_MAX, Math.max(CV_MIN, next));
    if (Math.abs(clamped - t.z) < 0.0005) return;        // 已達上下限 → 放行
    e.preventDefault(); e.stopPropagation();
    const r = box.current.getBoundingClientRect();
    zoomAt(next, (e.clientX - r.left) / outerScale - w / 2, (e.clientY - r.top) / outerScale - h / 2);
    bump();
  };

  const onPointerDown = (e) => {
    if (thumb || empty || e.button !== 0) return;
    const onContent = paperIn.current && paperIn.current.contains(e.target);
    if (onContent && !e.altKey) return;                  // 元件互動優先（RACI 格子仍可點）
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY, o = { ...t };
    setDrag(true); bump();
    const move = (ev) => setT({ z: o.z, x: o.x + (ev.clientX - sx) / outerScale, y: o.y + (ev.clientY - sy) / outerScale });
    const up = () => { setDrag(false); bump(); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };

  // wheel 必須以原生 non-passive listener 掛載，否則 preventDefault 無效（React 的 onWheel 是 passive）
  wheelRef.current = onWheel;
  useEffect(() => {
    const el = box.current; if (!el) return;
    const h = (e) => wheelRef.current && wheelRef.current(e);
    el.addEventListener("wheel", h, { passive: false });
    return () => el.removeEventListener("wheel", h);
  }, []);

  // 鍵盤 + － 0：僅在指標位於畫布上時生效（三鍵皆未被簡報佔用）
  useEffect(() => {
    if (!hover || thumb || empty) return;
    const k = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "+" || e.key === "=") { e.preventDefault(); step(1); }
      else if (e.key === "-" || e.key === "_") { e.preventDefault(); step(-1); }
      else if (e.key === "0") { e.preventDefault(); goFit(); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [hover, thumb, empty, fitZ, t.z]);

  const offset = !empty && (Math.abs(t.z - fitZ) > 0.005 || Math.abs(t.x) > 1 || Math.abs(t.y) > 1);
  const chromeOp = thumb ? 0 : (hover || active || drag) ? 1 : mode === "play" ? 0.32 : 0.5;
  const barH = compact ? 40 : 48;
  const dot = (a) => `color-mix(in srgb, ${dark ? "var(--neutral-400)" : "var(--neutral-500)"} ${a}%, transparent)`;
  const gz = thumb ? 1 : t.z;
  const layers = [];
  if (!thumb ? gz >= 0.5 : true) layers.push(`radial-gradient(circle, ${dot(dark ? 30 : 34)} 1.1px, transparent 1.3px)`);
  if (thumb || gz <= 2) layers.push(`radial-gradient(circle, ${dot(dark ? 55 : 60)} 1.7px, transparent 1.9px)`);
  const sizes = thumb ? ["6px 6px"] : layers.map((_, i) => (layers.length === 2 ? (i === 0 ? `${24 * gz}px ${24 * gz}px` : `${96 * gz}px ${96 * gz}px`) : gz < 0.5 ? `${96 * gz}px ${96 * gz}px` : `${24 * gz}px ${24 * gz}px`));

  const bar = (
    <div style={{
      position: "absolute", right: 16, bottom: 16, display: "flex", alignItems: "center", gap: 8, height: barH, padding: "0 8px",
      borderRadius: 999, background: c.chrome, border: `1px solid ${c.border}`, boxShadow: c.shadow, backdropFilter: "blur(10px) saturate(1.1)",
      opacity: empty ? chromeOp * 0.35 : chromeOp, pointerEvents: empty ? "none" : "auto",
      transition: cvReduced() ? "none" : "opacity 200ms var(--ease-out)", zIndex: 4,
    }}>
      <CvBtn c={c} dis={t.z <= CV_MIN + 0.001} onClick={() => step(-1)} n="minus" s={barH > 44 ? 20 : 18} title="縮小" />
      {!compact && (
        <button onClick={goHundred} title="回到 100%" style={{ minWidth: 78, height: 30, border: "none", background: "none", cursor: "pointer", textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 17, fontWeight: 700, color: c.ink }}>
          {Math.round(t.z * 100)}%
        </button>
      )}
      <CvBtn c={c} dis={t.z >= CV_MAX - 0.001} onClick={() => step(1)} n="plus" s={barH > 44 ? 20 : 18} title="放大" />
      <span style={{ width: 1, height: 24, background: c.border }} />
      <CvBtn c={c} onClick={goFit} n="scan" s={barH > 44 ? 20 : 18} title="還原置中（fit）" hi={offset} />
    </div>
  );

  const scrim = (k, st) => (
    <div key={k} style={{
      position: "absolute", pointerEvents: "none", zIndex: 3, opacity: thumb ? 0 : over[k],
      transition: cvReduced() ? "none" : "opacity 200ms var(--ease-out)",
      background: `linear-gradient(to ${{ t: "bottom", b: "top", l: "right", r: "left" }[k]}, ${dark ? c.stage : c.sunken}, transparent)`, ...st,
    }} />
  );

  return (
    <div ref={box} onPointerDown={onPointerDown}
      onDoubleClick={(e) => { if (!paperIn.current || !paperIn.current.contains(e.target)) goFit(); }}
      onMouseEnter={() => { setHover(true); if (!empty && !thumb && !hintOn) { setHintOn(true); setTimeout(() => setHintOn(false), 3000); } }}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative", width: w, height: h, overflow: "hidden", flex: "none",
        borderRadius: thumb ? "var(--radius-xs)" : "var(--radius-xl)", border: `1px solid ${c.border}`,
        background: dark ? c.stage : c.sunken, cursor: thumb || empty ? "default" : drag ? "grabbing" : "grab",
        boxShadow: dark ? "inset 0 1px 0 rgba(255,255,255,0.04)" : "inset 0 1px 3px rgba(17,47,93,0.07)",
      }}>
      <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", backgroundImage: layers.join(","), backgroundSize: sizes.join(","), backgroundPosition: "center center" }} />
      <div style={{ position: "absolute", inset: 0, zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {empty ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, width: 760, maxWidth: "84%", height: 340, border: `1px dashed ${c.border}`, borderRadius: "var(--radius-lg)", background: dark ? c.sunken : "transparent", color: c.muted }}>
            <span style={{ color: c.brand }}><CvIcon n="frame" s={56} sw={1.6} /></span>
            <div style={{ fontSize: 24, fontWeight: 800, color: c.ink }}>尚未綁定視覺化元件</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 14 }}>@ai-visualize · {emptyId || "rr-structure"}</div>
            <div style={{ fontSize: 17, maxWidth: 520, textAlign: "center", lineHeight: 1.7 }}>在筆記中生成此標記對應的互動元件後，它會自動置中於這塊畫布。</div>
          </div>
        ) : (
          <div style={{
            background: "var(--neutral-0)", border: `1px solid ${c.borderSoft}`, borderRadius: "var(--radius-lg)", padding: 24,
            boxShadow: dark ? c.shadowLg : c.shadow, transform: `translate(${t.x}px, ${t.y}px) scale(${t.z})`, transformOrigin: "center center",
            transition: anim && !cvReduced() ? "transform 260ms var(--ease-out)" : "none",
          }}>
            <div ref={paperIn} style={{ width: natural }}>{content}</div>
          </div>
        )}
      </div>
      {["t", "b", "l", "r"].map((k) => scrim(k, k === "t" ? { top: 0, left: 0, right: 0, height: 40 } : k === "b" ? { bottom: 0, left: 0, right: 0, height: 40 } : k === "l" ? { top: 0, bottom: 0, left: 0, width: 40 } : { top: 0, bottom: 0, right: 0, width: 40 }))}
      {offset && !thumb && (
        <div style={{
          position: "absolute", left: 16, top: 16, zIndex: 4, display: "inline-flex", alignItems: "center", gap: 8, height: 40, padding: "0 8px 0 16px",
          borderRadius: 999, background: c.chrome, border: `1px solid ${c.border}`, boxShadow: c.shadow, fontSize: 17, color: c.body,
          animation: cvReduced() ? "none" : "cvBadgeIn 240ms var(--ease-out)",
        }}>
          <CvIcon n="crosshair" s={18} />
          <span>已偏移 · {Math.round(t.z * 100)}%</span>
          <button onClick={goFit} style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 28, padding: "0 12px", border: "none", borderRadius: 999, background: c.accentSoft, color: dark ? "var(--orange-300)" : "var(--orange-600)", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
            <CvIcon n="rotate" s={14} sw={2.2} />還原
          </button>
        </div>
      )}
      {hintOn && !thumb && !empty && (
        <div style={{ position: "absolute", left: 16, bottom: 16, zIndex: 4, display: "inline-flex", alignItems: "center", gap: 8, height: 36, padding: "0 16px", borderRadius: 999, background: c.chrome, border: `1px solid ${c.borderSoft}`, color: c.muted, fontSize: 14, animation: cvReduced() ? "none" : "cvBadgeIn 240ms var(--ease-out)" }}>
          <CvIcon n="hand" s={16} />拖曳平移　·　<CvIcon n="mouse" s={16} />{mode === "play" ? "滾輪縮放" : "⌘ + 滾輪縮放"}
        </div>
      )}
      {!thumb && bar}
    </div>
  );
}

function CvBtn({ c, n, s, onClick, title, dis, hi }) {
  const [h, setH] = React.useState(false), [p, setP] = React.useState(false);
  return (
    <button title={title} onClick={dis ? undefined : onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => { setH(false); setP(false); }}
      onPointerDown={() => setP(true)} onPointerUp={() => setP(false)}
      style={{
        width: 36, height: 36, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 999, border: "none",
        background: h && !dis ? c.hover : hi ? c.brandSoft : "transparent", color: dis ? c.muted : h || hi ? c.brandInk : c.body,
        opacity: dis ? 0.35 : 1, cursor: dis ? "default" : "pointer", transform: p ? "scale(0.97)" : "none",
        transition: cvReduced() ? "none" : "background 140ms var(--ease-out), color 140ms var(--ease-out), transform 140ms var(--ease-out)",
      }}>
      <CvIcon n={n} s={s} />
    </button>
  );
}
Object.assign(window, { CanvasViewport, CvIcon, CvBtn });
