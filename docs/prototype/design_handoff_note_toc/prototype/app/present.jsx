// NoteCraft — 簡報模式：檢視（編輯器版面）/ 播放（全螢幕）/ 版型庫
const { useState, useEffect, useRef, useCallback } = React;

function useMeasure() {
  const ref = useRef(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    if (!ref.current || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, box];
}

function ThemeToggle({ dark, onChange }) {
  const c = window.dkt(dark);
  const opts = [["light", "亮色", "lightbulb"], ["dark", "暗色", "circle"]];
  return (
    <div style={{ display: "inline-flex", gap: 3, padding: 3, borderRadius: 999, background: c.sunken, border: `1px solid ${c.border}` }}>
      {opts.map(([k, label, ic]) => {
        const on = (k === "dark") === !!dark;
        return (
          <button key={k} onClick={() => onChange(k === "dark")} title={label}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 30, padding: "0 12px", border: "none", borderRadius: 999, cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 12.5, fontWeight: on ? 700 : 600, background: on ? (dark ? "rgba(255,255,255,0.14)" : "var(--neutral-0)") : "transparent", color: on ? c.brandInk : c.muted, boxShadow: on && !dark ? "var(--shadow-xs)" : "none", transition: "all 160ms var(--ease-out)" }}>
            {window.Icons[ic]({ s: 14 })}{label}
          </button>
        );
      })}
    </div>
  );
}
window.ThemeToggle = ThemeToggle;

function GhostBtn({ dark, icon, children, onClick, active }) {
  const c = window.dkt(dark);
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 38, padding: children ? "0 16px" : "0 11px", borderRadius: 999, cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 13.5, fontWeight: 700, border: `1px solid ${active ? c.brand : c.border}`, background: active ? c.brandSoft : h ? c.hover : "transparent", color: active ? c.brandInk : c.body, transition: "background 160ms var(--ease-out), border-color 160ms" }}>
      {icon}{children}
    </button>
  );
}

function PlayBtn({ onClick, label, size }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ display: "inline-flex", alignItems: "center", gap: 8, height: size === "lg" ? 46 : 38, padding: size === "lg" ? "0 26px" : "0 18px", border: "none", borderRadius: 999, cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: size === "lg" ? 15 : 13.5, fontWeight: 800, color: "#fff", background: "var(--gradient-accent)", boxShadow: h ? "var(--shadow-accent, 0 6px 18px rgba(237,155,38,0.4))" : "none", transform: h ? "translateY(-1px)" : "none", transition: "all 160ms var(--ease-out)" }}>
      {window.Icons.play({ s: size === "lg" ? 18 : 16 })}{label}
    </button>
  );
}

// ── 縮覽清單 ────────────────────────────────────────────────
function ThumbRail({ deck, cur, onSelect, dark, width }) {
  const c = window.dkt(dark);
  return (
    <div style={{ width, flex: "none", background: c.rail, borderRight: `1px solid ${c.border}`, display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 18px 12px", fontSize: 11.5, fontWeight: 700, letterSpacing: ".14em", color: c.muted }}>
        投影片
        <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", letterSpacing: 0, fontSize: 12 }}>{deck.slides.length}</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 14px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
        {deck.slides.map((s, i) => {
          const on = i === cur;
          return (
            <button key={i} onClick={() => onSelect(i)}
              style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: 0, border: "none", background: "none", cursor: "pointer", textAlign: "left", fontFamily: "var(--font-sans)" }}>
              <span style={{ flex: "none", width: 20, paddingTop: 4, fontFamily: "var(--font-mono)", fontSize: 11.5, fontWeight: 800, color: on ? c.accent : c.muted }}>{String(i + 1).padStart(2, "0")}</span>
              <span style={{ flex: 1, minWidth: 0, display: "block" }}>
                <window.SlideFrame slide={s} deck={deck} index={i} total={deck.slides.length} dark={dark} width={width - 62}
                  radius="var(--radius-sm)" border={`2px solid ${on ? "var(--orange-400)" : c.border}`} shadow={on ? c.shadow : "none"} />
                <span style={{ display: "block", marginTop: 6, fontSize: 11.5, fontWeight: on ? 700 : 500, color: on ? c.brandInk : c.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.nav}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── 檢視模式（預設，非全螢幕）────────────────────────────────
function PresentView({ slug, dark, onTheme, onBack, onLibrary }) {
  const deck = window.deckOf(slug);
  const [cur, setCur] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [stageRef, stage] = useMeasure();
  const c = window.dkt(dark);
  const total = deck ? deck.slides.length : 0;

  const go = useCallback((d) => setCur((i) => Math.min(total - 1, Math.max(0, i + d))), [total]);
  useEffect(() => {
    const onKey = (e) => {
      if (playing) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") go(1);
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") go(-1);
      if (e.key === "Enter") setPlaying(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, playing]);

  if (!deck) return null;
  const pad = 40;
  const w = Math.max(320, Math.min(stage.w - pad * 2, ((stage.h - pad * 2) * 16) / 9));

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", background: c.stage, fontFamily: "var(--font-sans)" }}>
      {/* top bar */}
      <header style={{ flex: "none", height: 64, display: "flex", alignItems: "center", gap: 14, padding: "0 20px", background: c.chrome, borderBottom: `1px solid ${c.border}` }}>
        <GhostBtn dark={dark} icon={window.Icons.chevronLeft({ s: 16 })} onClick={onBack}>返回筆記</GhostBtn>
        <div style={{ width: 1, height: 26, background: c.border }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".2em", color: c.accent }}>{deck.eyebrow}</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: c.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{deck.title}</div>
        </div>
        <span style={{ marginLeft: 6, padding: "4px 10px", borderRadius: 999, background: c.sunken, color: c.muted, fontSize: 11.5, fontWeight: 700, fontFamily: "var(--font-mono)" }}>16:9</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: c.muted, fontFamily: "var(--font-mono)" }}>{cur + 1} / {total}</span>
          <ThemeToggle dark={dark} onChange={onTheme} />
          <GhostBtn dark={dark} icon={window.Icons.grid({ s: 15 })} onClick={onLibrary}>版型庫</GhostBtn>
          <PlayBtn onClick={() => setPlaying(true)} label="播放（全螢幕）" />
        </div>
      </header>

      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <ThumbRail deck={deck} cur={cur} onSelect={setCur} dark={dark} width={252} />
        {/* stage */}
        <div ref={stageRef} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: pad, position: "relative" }}>
          {stage.w > 0 && (
            <window.SlideFrame key={cur} slide={deck.slides[cur]} deck={deck} index={cur} total={total} dark={dark} live width={w}
              radius="var(--radius-lg)" border={`1px solid ${c.border}`} shadow={c.shadowLg}
              style={{ animation: "ncFade 220ms var(--ease-out)" }} />
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 22 }}>
            <GhostBtn dark={dark} icon={window.Icons.chevronLeft({ s: 16 })} onClick={() => go(-1)} />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: c.muted, minWidth: 130, textAlign: "center" }}>{deck.slides[cur].nav}</span>
            <GhostBtn dark={dark} icon={window.Icons.chevronRight({ s: 16 })} onClick={() => go(1)} />
          </div>
          <div style={{ position: "absolute", left: 20, bottom: 16, fontSize: 11.5, color: c.muted, fontFamily: "var(--font-mono)" }}>{deck.source}</div>
        </div>
      </div>
      {playing && <PlayMode deck={deck} start={cur} dark={dark} onExit={(i) => { setCur(i); setPlaying(false); }} />}
    </div>
  );
}
window.PresentView = PresentView;

// ── 播放模式（全螢幕）───────────────────────────────────────
function PlayMode({ deck, start, dark, onExit }) {
  const [cur, setCur] = useState(start || 0);
  const [outline, setOutline] = useState(false);
  const [hint, setHint] = useState(true);
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  const total = deck.slides.length;
  const c = window.dkt(dark);

  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    const t = setTimeout(() => setHint(false), 3200);
    return () => { window.removeEventListener("resize", onResize); clearTimeout(t); };
  }, []);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { outline ? setOutline(false) : onExit(cur); return; }
      if (e.key === "ArrowRight" || e.key === " " || e.key === "ArrowDown") { e.preventDefault(); setCur((i) => Math.min(total - 1, i + 1)); }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") setCur((i) => Math.max(0, i - 1));
      if (e.key.toLowerCase() === "o") setOutline((o) => !o);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cur, total, outline, onExit]);

  const w = Math.min(vp.w - 24, ((vp.h - 24) * 16) / 9);
  const bg = dark ? "var(--neutral-900)" : "var(--blue-950)";
  const arrow = (dir) => (
    <button onClick={() => setCur((i) => Math.min(total - 1, Math.max(0, i + dir)))}
      style={{ position: "absolute", top: "50%", [dir < 0 ? "left" : "right"]: 18, transform: "translateY(-50%)", width: 52, height: 52, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 999, border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.08)", color: "#fff", cursor: "pointer", opacity: (dir < 0 ? cur === 0 : cur === total - 1) ? 0.25 : 0.85, transition: "opacity 200ms var(--ease-out), background 200ms" }}>
      {dir < 0 ? window.Icons.chevronLeft({ s: 24 }) : window.Icons.chevronRight({ s: 24 })}
    </button>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 800, background: bg, display: "flex", alignItems: "center", justifyContent: "center", animation: "ncFade 240ms var(--ease-out)" }}>
      <window.SlideFrame key={cur} slide={deck.slides[cur]} deck={deck} index={cur} total={total} dark={dark} live play width={w}
        radius="var(--radius-md)" shadow="0 30px 80px rgba(0,0,0,0.5)" style={{ animation: "ncSlideIn 280ms var(--ease-out)" }} />

      {arrow(-1)}{arrow(1)}

      {/* 進度列 */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 4, background: "rgba(255,255,255,0.12)" }}>
        <div style={{ height: "100%", width: `${((cur + 1) / total) * 100}%`, background: "var(--gradient-accent)", transition: "width 280ms var(--ease-out)" }} />
      </div>

      {/* 底部控制列 */}
      <div style={{ position: "absolute", left: "50%", bottom: 22, transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 10, padding: "8px 10px 8px 18px", borderRadius: 999, background: "rgba(11,31,62,0.62)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.14)" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 13.5, fontWeight: 800, color: "#fff" }}>{String(cur + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", maxWidth: 260, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{deck.slides[cur].nav}</span>
        <button onClick={() => setOutline((o) => !o)}
          style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 34, padding: "0 15px", borderRadius: 999, border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 700, background: outline ? "var(--gradient-accent)" : "rgba(255,255,255,0.14)", color: "#fff", transition: "background 200ms var(--ease-out)" }}>
          {window.Icons.list({ s: 15 })}大綱 / 跳頁
        </button>
        <button onClick={() => onExit(cur)}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 34, padding: "0 14px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "rgba(255,255,255,0.85)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 700 }}>
          {window.Icons.x({ s: 15 })}結束播放
        </button>
      </div>

      {/* 首次提示 */}
      <div style={{ position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 16, padding: "9px 18px", borderRadius: 999, background: "rgba(11,31,62,0.55)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)", fontSize: 12.5, fontWeight: 600, opacity: hint ? 1 : 0, transition: "opacity 360ms var(--ease-out)", pointerEvents: "none" }}>
        <span>← → 翻頁</span><span>O 開啟大綱</span><span>Esc 退出播放</span>
      </div>

      {/* 大綱 / 跳頁浮層 */}
      {outline && (
        <div onClick={() => setOutline(false)} style={{ position: "absolute", inset: 0, background: "rgba(11,31,62,0.55)", display: "flex", alignItems: "flex-end", animation: "ncFade 200ms var(--ease-out)" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxHeight: "62%", overflowY: "auto", background: c.chrome, borderTop: `1px solid ${c.border}`, padding: "20px 26px 26px", animation: "ncRiseUp 280ms var(--ease-out)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".16em", color: c.muted }}>大綱 · 點選跳頁</span>
              <span style={{ marginLeft: "auto" }}>
                <GhostBtn dark={dark} icon={window.Icons.x({ s: 15 })} onClick={() => setOutline(false)}>關閉</GhostBtn>
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 16 }}>
              {deck.slides.map((s, i) => (
                <button key={i} onClick={() => { setCur(i); setOutline(false); }}
                  style={{ border: "none", background: "none", padding: 0, cursor: "pointer", textAlign: "left", fontFamily: "var(--font-sans)" }}>
                  <window.SlideFrame slide={s} deck={deck} index={i} total={total} dark={dark} width={210}
                    radius="var(--radius-sm)" border={`2px solid ${i === cur ? "var(--orange-400)" : c.border}`} shadow={i === cur ? c.shadow : "none"} />
                  <div style={{ display: "flex", gap: 7, marginTop: 7, alignItems: "baseline" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800, color: i === cur ? c.accent : c.muted }}>{String(i + 1).padStart(2, "0")}</span>
                    <span style={{ fontSize: 12.5, fontWeight: i === cur ? 700 : 500, color: i === cur ? c.brandInk : c.body, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.nav}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
window.PlayMode = PlayMode;
