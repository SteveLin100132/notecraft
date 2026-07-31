// 簡報互動層 island（Task 26）：檢視模式 / 縮覽清單 / 播放模式（全螢幕）/ 大綱跳頁 / 主題切換。
// 移植設計交接 present.jsx；以 client:only="react" 掛載。顏色走 CSS 變數 token，icon 用 lucide。

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { ChevronLeft, ChevronRight, Circle, Lightbulb, List, Play, X } from "lucide-react";
import { deckOf } from "@/lib/decks";
import type { Deck } from "@/lib/decks";
import { SlideFrame, useMeasure } from "@/components/deck/SlideFrame";
import { dkt } from "@/components/deck/theme";
import type { DeckTheme } from "@/components/deck/theme";

const THEME_KEY = "nc-deck-theme";

function usePreferredTheme(): [DeckTheme, (dark: boolean) => void] {
  const [theme, setTheme] = useState<DeckTheme>("light");
  useEffect(() => {
    let next: DeckTheme | null = null;
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored === "light" || stored === "dark") next = stored;
    } catch {
      /* localStorage 不可用時忽略 */
    }
    if (!next && typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches) {
      next = "dark";
    }
    if (next) setTheme(next);
  }, []);
  const onTheme = useCallback((dark: boolean) => {
    const t: DeckTheme = dark ? "dark" : "light";
    setTheme(t);
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {
      /* ignore */
    }
  }, []);
  return [theme, onTheme];
}

// ── 小元件 ──────────────────────────────────────────────────
function ThemeToggle({ dark, onChange }: { dark: boolean; onChange: (dark: boolean) => void }) {
  const c = dkt(dark);
  const opts: Array<[boolean, string, ReactNode]> = [
    [false, "亮色", <Lightbulb size={14} key="l" />],
    [true, "暗色", <Circle size={14} key="d" />],
  ];
  return (
    <div style={{ display: "inline-flex", gap: 3, padding: 3, borderRadius: 999, background: c.sunken, border: `1px solid ${c.border}` }}>
      {opts.map(([isDark, label, ic]) => {
        const on = isDark === dark;
        return (
          <button
            key={label}
            onClick={() => onChange(isDark)}
            title={label}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 30, padding: "0 12px", border: "none", borderRadius: 999, cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 12.5, fontWeight: on ? 700 : 600, background: on ? (dark ? "rgba(255,255,255,0.14)" : "var(--neutral-0)") : "transparent", color: on ? c.brandInk : c.muted, boxShadow: on && !dark ? "var(--shadow-xs)" : "none", transition: "all 160ms var(--ease-out)" }}
          >
            {ic}
            {label}
          </button>
        );
      })}
    </div>
  );
}

function GhostBtn({ dark, icon, children, onClick, active }: { dark: boolean; icon: ReactNode; children?: ReactNode; onClick?: () => void; active?: boolean }) {
  const c = dkt(dark);
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 38, padding: children ? "0 16px" : "0 11px", borderRadius: 999, cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 13.5, fontWeight: 700, border: `1px solid ${active ? c.brand : c.border}`, background: active ? c.brandSoft : h ? c.hover : "transparent", color: active ? c.brandInk : c.body, transition: "background 160ms var(--ease-out), border-color 160ms" }}
    >
      {icon}
      {children}
    </button>
  );
}

function PlayBtn({ onClick, label }: { onClick: () => void; label: string }) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 38, padding: "0 18px", border: "none", borderRadius: 999, cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 13.5, fontWeight: 800, color: "#fff", background: "var(--gradient-accent)", boxShadow: h ? "var(--shadow-accent, 0 6px 18px rgba(237,155,38,0.4))" : "none", transform: h ? "translateY(-1px)" : "none", transition: "all 160ms var(--ease-out)" }}
    >
      <Play size={16} />
      {label}
    </button>
  );
}

// ── 縮覽清單 ────────────────────────────────────────────────
function ThumbRail({ deck, cur, onSelect, dark, width }: { deck: Deck; cur: number; onSelect: (i: number) => void; dark: boolean; width: number }) {
  const c = dkt(dark);
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
            <button key={i} onClick={() => onSelect(i)} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: 0, border: "none", background: "none", cursor: "pointer", textAlign: "left", fontFamily: "var(--font-sans)" }}>
              <span style={{ flex: "none", width: 20, paddingTop: 4, fontFamily: "var(--font-mono)", fontSize: 11.5, fontWeight: 800, color: on ? c.accent : c.muted }}>{String(i + 1).padStart(2, "0")}</span>
              <span style={{ flex: 1, minWidth: 0, display: "block" }}>
                <SlideFrame slide={s} deck={deck} index={i} total={deck.slides.length} dark={dark} width={width - 62} radius="var(--radius-sm)" border={`2px solid ${on ? "var(--orange-400)" : c.border}`} shadow={on ? c.shadow : "none"} />
                <span style={{ display: "block", marginTop: 6, fontSize: 11.5, fontWeight: on ? 700 : 500, color: on ? c.brandInk : c.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.nav}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── 播放模式（全螢幕）───────────────────────────────────────
function PlayMode({ deck, start, dark, onExit }: { deck: Deck; start: number; dark: boolean; onExit: (i: number) => void }) {
  const [cur, setCur] = useState(start || 0);
  const [outline, setOutline] = useState(false);
  const [hint, setHint] = useState(true);
  const [vp, setVp] = useState({ w: typeof window !== "undefined" ? window.innerWidth : 1280, h: typeof window !== "undefined" ? window.innerHeight : 720 });
  const total = deck.slides.length;
  const c = dkt(dark);

  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    const t = window.setTimeout(() => setHint(false), 3200);
    return () => {
      window.removeEventListener("resize", onResize);
      window.clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (outline) setOutline(false);
        else onExit(cur);
        return;
      }
      if (e.key === "ArrowRight" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setCur((i) => Math.min(total - 1, i + 1));
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") setCur((i) => Math.max(0, i - 1));
      if (e.key.toLowerCase() === "o") setOutline((o) => !o);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cur, total, outline, onExit]);

  const w = Math.min(vp.w - 24, ((vp.h - 24) * 16) / 9);
  const bg = dark ? "var(--neutral-900)" : "var(--blue-950)";
  const arrow = (dir: -1 | 1) => {
    const atEdge = dir < 0 ? cur === 0 : cur === total - 1;
    const sidePos: CSSProperties = dir < 0 ? { left: 18 } : { right: 18 };
    return (
      <button
        onClick={() => setCur((i) => Math.min(total - 1, Math.max(0, i + dir)))}
        style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", ...sidePos, width: 52, height: 52, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 999, border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.08)", color: "#fff", cursor: "pointer", opacity: atEdge ? 0.25 : 0.85, transition: "opacity 200ms var(--ease-out), background 200ms" }}
      >
        {dir < 0 ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
      </button>
    );
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 800, background: bg, display: "flex", alignItems: "center", justifyContent: "center", animation: "ncFade 240ms var(--ease-out)" }}>
      <SlideFrame key={cur} slide={deck.slides[cur]} deck={deck} index={cur} total={total} dark={dark} live width={w} radius="var(--radius-md)" shadow="0 30px 80px rgba(0,0,0,0.5)" style={{ animation: "ncSlideIn 280ms var(--ease-out)" }} />

      {arrow(-1)}
      {arrow(1)}

      {/* 進度列 */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 4, background: "rgba(255,255,255,0.12)" }}>
        <div style={{ height: "100%", width: `${((cur + 1) / total) * 100}%`, background: "var(--gradient-accent)", transition: "width 280ms var(--ease-out)" }} />
      </div>

      {/* 底部控制列 */}
      <div style={{ position: "absolute", left: "50%", bottom: 22, transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 10, padding: "8px 10px 8px 18px", borderRadius: 999, background: "rgba(11,31,62,0.62)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.14)" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 13.5, fontWeight: 800, color: "#fff" }}>{String(cur + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", maxWidth: 260, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{deck.slides[cur].nav}</span>
        <button onClick={() => setOutline((o) => !o)} style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 34, padding: "0 15px", borderRadius: 999, border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 700, background: outline ? "var(--gradient-accent)" : "rgba(255,255,255,0.14)", color: "#fff", transition: "background 200ms var(--ease-out)" }}>
          <List size={15} />大綱 / 跳頁
        </button>
        <button onClick={() => onExit(cur)} style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 34, padding: "0 14px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "rgba(255,255,255,0.85)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 700 }}>
          <X size={15} />結束播放
        </button>
      </div>

      {/* 首次提示 */}
      <div style={{ position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 16, padding: "9px 18px", borderRadius: 999, background: "rgba(11,31,62,0.55)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)", fontSize: 12.5, fontWeight: 600, opacity: hint ? 1 : 0, transition: "opacity 360ms var(--ease-out)", pointerEvents: "none" }}>
        <span>← → 翻頁</span>
        <span>O 開啟大綱</span>
        <span>Esc 退出播放</span>
      </div>

      {/* 大綱 / 跳頁浮層 */}
      {outline && (
        <div onClick={() => setOutline(false)} style={{ position: "absolute", inset: 0, background: "rgba(11,31,62,0.55)", display: "flex", alignItems: "flex-end", animation: "ncFade 200ms var(--ease-out)" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxHeight: "62%", overflowY: "auto", background: c.chrome, borderTop: `1px solid ${c.border}`, padding: "20px 26px 26px", animation: "ncRiseUp 280ms var(--ease-out)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".16em", color: c.muted }}>大綱 · 點選跳頁</span>
              <span style={{ marginLeft: "auto" }}>
                <GhostBtn dark={dark} icon={<X size={15} />} onClick={() => setOutline(false)}>關閉</GhostBtn>
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 16 }}>
              {deck.slides.map((s, i) => (
                <button key={i} onClick={() => { setCur(i); setOutline(false); }} style={{ border: "none", background: "none", padding: 0, cursor: "pointer", textAlign: "left", fontFamily: "var(--font-sans)" }}>
                  <SlideFrame slide={s} deck={deck} index={i} total={total} dark={dark} width={210} radius="var(--radius-sm)" border={`2px solid ${i === cur ? "var(--orange-400)" : c.border}`} shadow={i === cur ? c.shadow : "none"} />
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

// ── 主 island：檢視模式 ─────────────────────────────────────
export default function PresentApp({ slug }: { slug: string }) {
  const deck = deckOf(slug);
  const [cur, setCur] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [theme, onTheme] = usePreferredTheme();
  const [stageRef, stage] = useMeasure();
  const dark = theme === "dark";
  const c = dkt(dark);
  const total = deck ? deck.slides.length : 0;

  // URL hash 記頁：初次讀 #<n>，之後同步（重整 / 深連結不掉頁）
  useEffect(() => {
    const n = parseInt((location.hash || "").replace("#", ""), 10);
    if (Number.isFinite(n) && n >= 1 && n <= total) setCur(n - 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);
  useEffect(() => {
    if (total > 0) history.replaceState(null, "", `#${cur + 1}`);
  }, [cur, total]);

  const go = useCallback((d: number) => setCur((i) => Math.min(total - 1, Math.max(0, i + d))), [total]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (playing) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") go(1);
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") go(-1);
      if (e.key === "Enter") enterPlay();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [go, playing]);

  // 播放時退出全螢幕（使用者按瀏覽器 Esc）→ 同步結束播放
  useEffect(() => {
    if (!playing) return;
    const onFsChange = () => {
      if (!document.fullscreenElement) setPlaying(false);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, [playing]);

  const enterPlay = () => {
    setPlaying(true);
    document.documentElement.requestFullscreen?.().catch(() => {
      /* 不支援 / 拒絕 → 降級為視窗內全覆蓋，不報錯 */
    });
  };
  const exitPlay = (i: number) => {
    setCur(i);
    setPlaying(false);
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  };

  if (!deck) return null;
  const pad = 40;
  const w = Math.max(320, Math.min(stage.w - pad * 2, ((stage.h - pad * 2) * 16) / 9));

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", background: c.stage, fontFamily: "var(--font-sans)" }}>
      <header style={{ flex: "none", height: 64, display: "flex", alignItems: "center", gap: 14, padding: "0 20px", background: c.chrome, borderBottom: `1px solid ${c.border}` }}>
        <GhostBtn dark={dark} icon={<ChevronLeft size={16} />} onClick={() => { location.href = `/notes/${slug}`; }}>
          返回筆記
        </GhostBtn>
        <div style={{ width: 1, height: 26, background: c.border }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".2em", color: c.accent }}>{deck.eyebrow}</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: c.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{deck.title}</div>
        </div>
        <span style={{ marginLeft: 6, padding: "4px 10px", borderRadius: 999, background: c.sunken, color: c.muted, fontSize: 11.5, fontWeight: 700, fontFamily: "var(--font-mono)" }}>16:9</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: c.muted, fontFamily: "var(--font-mono)" }}>{cur + 1} / {total}</span>
          <ThemeToggle dark={dark} onChange={onTheme} />
          <PlayBtn onClick={enterPlay} label="播放（全螢幕）" />
        </div>
      </header>

      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <ThumbRail deck={deck} cur={cur} onSelect={setCur} dark={dark} width={252} />
        <div ref={stageRef} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: pad, position: "relative" }}>
          {stage.w > 0 && (
            <SlideFrame key={cur} slide={deck.slides[cur]} deck={deck} index={cur} total={total} dark={dark} live width={w} radius="var(--radius-lg)" border={`1px solid ${c.border}`} shadow={c.shadowLg} style={{ animation: "ncFade 220ms var(--ease-out)" }} />
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 22 }}>
            <GhostBtn dark={dark} icon={<ChevronLeft size={16} />} onClick={() => go(-1)} />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: c.muted, minWidth: 130, textAlign: "center" }}>{deck.slides[cur].nav}</span>
            <GhostBtn dark={dark} icon={<ChevronRight size={16} />} onClick={() => go(1)} />
          </div>
          <div style={{ position: "absolute", left: 20, bottom: 16, fontSize: 11.5, color: c.muted, fontFamily: "var(--font-mono)" }}>{deck.source}</div>
        </div>
      </div>

      {playing && <PlayMode deck={deck} start={cur} dark={dark} onExit={exitPlay} />}
    </div>
  );
}
