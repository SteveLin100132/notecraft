// NoteCraft — 視覺化元件「放大檢視」：全螢幕覆蓋層 + 拖拉縮放畫布（沿用 CanvasViewport）
// 用法：<VizZoomButton onClick /> 放在 Figure 標題列；<VizZoomOverlay open ...>{content}</VizZoomOverlay>
const VZ_ICONS = {
  expand: "M15 3h6v6M3 15v6h6M21 3l-7.5 7.5M3 21l7.5-7.5",
  close: "M6 6l12 12M18 6L6 18",
  image: "M4 5h16v14H4zM4 16l4.5-4.5 3.5 3.5 3-3L20 17",
  hand: "M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2a8 8 0 0 1-8-8v-1",
  mouse: "M4 4l7 16 2.5-6.5L20 11z",
  spinner: "M12 3a9 9 0 1 0 9 9",
};
function VzIcon({ n, s = 18, sw = 2 }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }}>
      <path d={VZ_ICONS[n]} />
    </svg>
  );
}

// 圖框標題列的常駐觸發按鈕
function VizZoomButton({ onClick }) {
  const [h, setH] = React.useState(false);
  return (
    <button onClick={onClick} title="放大檢視（可拖拉、可縮放）" aria-label="放大檢視"
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, height: 26, padding: "0 10px 0 8px", marginLeft: 12,
        border: `1px solid ${h ? "var(--blue-300)" : "var(--neutral-200)"}`, borderRadius: 999,
        background: h ? "var(--blue-50)" : "var(--neutral-0)", color: h ? "var(--blue-700)" : "var(--neutral-600)",
        fontFamily: "var(--font-sans)", fontSize: 11.5, fontWeight: 700, letterSpacing: 0, textTransform: "none",
        cursor: "pointer", transition: "background 140ms var(--ease-out), color 140ms var(--ease-out), border-color 140ms var(--ease-out)",
      }}>
      <VzIcon n="expand" s={13} sw={2.1} />放大檢視
    </button>
  );
}

const vzLoadH2I = () => new Promise((res, rej) => {
  if (window.htmlToImage) return res(window.htmlToImage);
  const s = document.createElement("script");
  s.src = "https://unpkg.com/html-to-image@1.11.11/dist/html-to-image.js";
  s.crossOrigin = "anonymous";
  s.onload = () => (window.htmlToImage ? res(window.htmlToImage) : rej());
  s.onerror = rej;
  document.head.appendChild(s);
});
const vzToast = (msg, icon) => window.dispatchEvent(new CustomEvent("nc-toast", { detail: { msg, icon: icon || "check" } }));

function VizZoomOverlay({ open, onClose, id, kind, caption, natural = 880, children }) {
  const { useState, useEffect, useRef } = React;
  const c = window.dkt(false);
  const HEAD = 64;
  const [area, setArea] = useState({ w: 1200, h: 620 });
  const [footH, setFootH] = useState(caption ? 78 : 0);
  const foot = useRef(null), shot = useRef(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const key = (e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", key, true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", key, true); document.body.style.overflow = prev; };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const fh = foot.current ? foot.current.offsetHeight : (caption ? 78 : 0);
    setFootH(fh);
    const m = () => setArea({
      w: Math.max(320, window.innerWidth - 48),
      h: Math.max(260, window.innerHeight - HEAD - fh - 48),
    });
    m();
    window.addEventListener("resize", m);
    return () => window.removeEventListener("resize", m);
  }, [open, caption, footH]);

  const exportPng = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const h2i = await vzLoadH2I();
      const url = await h2i.toPng(shot.current, { pixelRatio: 2, backgroundColor: "#ffffff" });
      const a = document.createElement("a");
      a.href = url; a.download = `${id}.png`; a.click();
      vzToast("已匯出 PNG", "check");
    } catch (e) {
      vzToast("PNG 匯出失敗，請稍後再試", "alert");
    }
    setBusy(false);
  };

  if (!open) return null;

  const chip = (label) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 28, padding: "0 12px", borderRadius: 999, background: "var(--neutral-100)", color: c.muted, fontSize: 12.5, fontWeight: 600 }}>{label}</span>
  );

  return ReactDOM.createPortal(
    <div role="dialog" aria-modal="true" aria-label={`${kind} 放大檢視`}
      style={{
        position: "fixed", inset: 0, zIndex: 900, display: "flex", flexDirection: "column",
        background: "var(--neutral-0)", animation: "ncFade 180ms var(--ease-out)", fontFamily: "var(--font-sans)",
      }}>
      {/* 標題列 */}
      <div style={{ flex: "none", height: HEAD, display: "flex", alignItems: "center", gap: 12, padding: "0 20px 0 24px", borderBottom: `1px solid ${c.border}`, background: "var(--neutral-0)" }}>
        <span style={{ display: "flex", color: "var(--orange-500)" }}>{window.Icons.sparkle({ s: 18 })}</span>
        <span style={{ fontSize: 16, fontWeight: 800, color: "var(--blue-700)" }}>{kind}</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: c.muted }}>generated/{id}.tsx</span>
        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 28, padding: "0 12px", borderRadius: 999, background: "var(--neutral-100)", color: c.muted, fontSize: 12.5, fontWeight: 600 }}>
            <VzIcon n="hand" s={14} />拖曳平移<span style={{ opacity: 0.5 }}>·</span><VzIcon n="mouse" s={14} />滾輪縮放
          </span>
          <button onClick={exportPng} disabled={busy}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 36, padding: "0 15px", borderRadius: 999, border: `1px solid ${c.border}`, background: "var(--neutral-0)", color: busy ? c.muted : "var(--blue-700)", fontFamily: "var(--font-sans)", fontSize: 13.5, fontWeight: 700, cursor: busy ? "default" : "pointer" }}>
            <VzIcon n={busy ? "spinner" : "image"} s={16} />{busy ? "匯出中…" : "匯出 PNG"}
          </button>
          <button onClick={onClose} title="關閉（Esc）" aria-label="關閉"
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 999, border: "none", background: "var(--neutral-100)", color: c.body, cursor: "pointer" }}>
            <VzIcon n="close" s={18} />
          </button>
        </span>
      </div>

      {/* 畫布舞台 */}
      <div style={{ flex: "1 1 auto", minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--neutral-50)" }}>
        <window.CanvasViewport content={children} natural={natural} w={area.w} h={area.h} mode="play" />
      </div>

      {/* 說明文字 */}
      {caption && (
        <div ref={foot} style={{ flex: "none", padding: "16px 28px 20px", borderTop: `1px solid ${c.border}`, background: "var(--neutral-0)" }}>
          <p style={{ margin: "0 auto", maxWidth: 980, fontSize: 14.5, lineHeight: 1.8, color: c.body, textWrap: "pretty" }}>{caption}</p>
        </div>
      )}

      {/* 離屏乾淨副本：PNG 以 100% 原尺寸輸出，不受目前縮放影響 */}
      <div aria-hidden="true" style={{ position: "fixed", left: -99999, top: 0, pointerEvents: "none", opacity: 0 }}>
        <div ref={shot} style={{ width: natural, padding: 24, background: "#fff" }}>{children}</div>
      </div>
    </div>,
    document.body
  );
}

Object.assign(window, { VizZoomButton, VizZoomOverlay, VzIcon });
