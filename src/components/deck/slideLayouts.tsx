// Deck 8 種系統化版型（Task 24）。忠實移植設計交接 deck.jsx，全部在 1600×900 內部
// 座標系排版（position:absolute; inset:0），縮放由 SlideFrame（Task 25）負責。
// 顏色一律走 CSS 變數 token（src/styles/tokens.css），不硬編色碼；icon 用 lucide-react。

import type { ReactNode } from "react";
import { BookOpen, LayoutGrid, Sparkles, Zap } from "lucide-react";
import type { BulletItem, CompareSide, Deck, RecapItem, Slide, SlideLayout } from "@/lib/decks";
import { dkt } from "./theme";

const PAD = 104;

export interface LayoutProps {
  s: Slide;
  dark: boolean;
  deck: Deck;
  index: number;
  total: number;
  /** full-visual：true 時掛載真元件、false（縮覽）顯示占位 */
  live?: boolean;
}

// ── 共用零件 ─────────────────────────────────────────────────
function Eyebrow({ text, dark, onBrand }: { text?: string; dark: boolean; onBrand?: boolean }) {
  return (
    <div style={{ fontSize: 21, fontWeight: 700, letterSpacing: ".3em", color: onBrand ? "var(--orange-300)" : dkt(dark).accent, marginBottom: 26 }}>
      {text}
    </div>
  );
}

function SlideTitle({ children, dark, size }: { children: ReactNode; dark: boolean; size?: number }) {
  return (
    <h2 style={{ margin: 0, fontSize: size ?? 62, lineHeight: 1.2, fontWeight: 900, letterSpacing: "-0.01em", color: dkt(dark).ink }}>
      {children}
    </h2>
  );
}

function SlideChrome({ slide, deck, index, total, dark }: { slide: Slide; deck: Deck; index: number; total: number; dark: boolean }) {
  const c = dkt(dark);
  return (
    <div style={{ position: "absolute", left: PAD, right: PAD, bottom: 46, display: "flex", alignItems: "center", gap: 14, fontSize: 19, color: c.muted }}>
      <span style={{ fontWeight: 700, color: c.brandInk }}>{deck.title}</span>
      <span style={{ opacity: 0.5 }}>／</span>
      <span>{slide.eyebrow || "NOTECRAFT"}</span>
      <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
        {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </span>
    </div>
  );
}

// ── 8 種版型 ─────────────────────────────────────────────────
function LayoutCover({ s, dark }: LayoutProps) {
  return (
    <div style={{ position: "absolute", inset: 0, background: "var(--gradient-header)", color: "#fff", display: "flex", flexDirection: "column", justifyContent: "center", padding: `0 ${PAD}px` }}>
      <div style={{ position: "absolute", right: -120, top: -140, width: 560, height: 560, borderRadius: 999, background: "rgba(255,255,255,0.06)" }} />
      <div style={{ position: "absolute", right: 150, bottom: -230, width: 420, height: 420, borderRadius: 999, background: "rgba(237,155,38,0.16)" }} />
      <div style={{ position: "relative", maxWidth: 1080 }}>
        <Eyebrow text={s.eyebrow} dark={dark} onBrand />
        <h1 style={{ margin: 0, fontSize: 116, lineHeight: 1.1, fontWeight: 900, letterSpacing: "-0.02em", color: "#fff" }}>{s.title}</h1>
        <div style={{ width: 120, height: 7, borderRadius: 999, background: "var(--gradient-accent)", margin: "38px 0 34px" }} />
        <p style={{ margin: 0, fontSize: 36, lineHeight: 1.65, color: "rgba(255,255,255,0.86)", maxWidth: 980 }}>{s.subtitle}</p>
      </div>
      <div style={{ position: "absolute", left: PAD, bottom: 62, display: "flex", gap: 30, fontSize: 19, color: "rgba(255,255,255,0.66)", fontFamily: "var(--font-mono)" }}>
        {(s.meta ?? []).map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
    </div>
  );
}

function LayoutSection({ s }: LayoutProps) {
  return (
    <div style={{ position: "absolute", inset: 0, background: "var(--blue-900)", color: "#fff", display: "flex", alignItems: "center", padding: `0 ${PAD}px`, overflow: "hidden" }}>
      <div style={{ position: "absolute", right: 60, top: "50%", transform: "translateY(-50%)", fontSize: 460, fontWeight: 900, lineHeight: 1, color: "rgba(255,255,255,0.06)", fontFamily: "var(--font-mono)" }}>{s.num}</div>
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 28 }}>
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 74, height: 74, padding: "0 20px", borderRadius: "var(--radius-md)", background: "var(--gradient-accent)", color: "#fff", fontSize: 34, fontWeight: 900, fontFamily: "var(--font-mono)" }}>{s.num}</span>
          <span style={{ fontSize: 21, fontWeight: 700, letterSpacing: ".3em", color: "var(--orange-300)" }}>{s.eyebrow}</span>
        </div>
        <h2 style={{ margin: 0, fontSize: 92, fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1.15, color: "#fff" }}>{s.title}</h2>
        <p style={{ margin: "26px 0 0", fontSize: 32, color: "rgba(255,255,255,0.78)", lineHeight: 1.6 }}>{s.subtitle}</p>
      </div>
    </div>
  );
}

function LayoutBullets({ s, dark, deck, index, total }: LayoutProps) {
  const c = dkt(dark);
  const items = (s.items ?? []) as BulletItem[];
  const toneOf = (t?: string) => (t === "orange" ? c.accent : t === "muted" ? c.muted : c.brand);
  return (
    <div style={{ position: "absolute", inset: 0, background: c.slide, padding: `86px ${PAD}px 0` }}>
      <Eyebrow text={s.eyebrow} dark={dark} />
      <SlideTitle dark={dark}>{s.title}</SlideTitle>
      <p style={{ margin: "22px 0 0", fontSize: 28, color: c.muted, lineHeight: 1.7, maxWidth: 1080 }}>{s.lead}</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "26px 44px", marginTop: 52 }}>
        {items.map((it, i) => (
          <div key={it.k} style={{ display: "flex", gap: 22, alignItems: "flex-start", padding: "26px 30px", borderRadius: "var(--radius-lg)", background: dark ? c.sunken : "var(--neutral-50)", borderTop: `4px solid ${toneOf(it.tone)}` }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 26, fontWeight: 900, color: toneOf(it.tone), flex: "none", lineHeight: 1.5 }}>{String(i + 1).padStart(2, "0")}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 34, fontWeight: 800, color: c.ink, marginBottom: 8 }}>{it.k}</div>
              <div style={{ fontSize: 25, color: c.body, lineHeight: 1.6 }}>{it.v}</div>
            </div>
          </div>
        ))}
      </div>
      <SlideChrome slide={s} deck={deck} index={index} total={total} dark={dark} />
    </div>
  );
}

function LayoutMedia({ s, dark, deck, index, total }: LayoutProps) {
  const c = dkt(dark);
  return (
    <div style={{ position: "absolute", inset: 0, background: c.slide, padding: `86px ${PAD}px 0`, display: "grid", gridTemplateColumns: "1fr 700px", gap: 72, alignItems: "center" }}>
      <div style={{ paddingBottom: 60 }}>
        <Eyebrow text={s.eyebrow} dark={dark} />
        <SlideTitle dark={dark} size={58}>{s.title}</SlideTitle>
        <p style={{ margin: "26px 0 0", fontSize: 28, color: c.body, lineHeight: 1.8 }}>{s.body}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 34 }}>
          {(s.points ?? []).map((p) => (
            <div key={p} style={{ display: "flex", gap: 14, alignItems: "flex-start", fontSize: 25, color: c.body, lineHeight: 1.6 }}>
              <span style={{ flex: "none", width: 11, height: 11, borderRadius: 999, background: c.accent, marginTop: 12 }} />
              {p}
            </div>
          ))}
        </div>
      </div>
      <div style={{ height: 620, borderRadius: "var(--radius-xl)", background: dark ? c.sunken : "var(--blue-50)", border: `2px dashed ${dark ? c.border : "var(--blue-200)"}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}>
        <span style={{ display: "inline-flex", color: c.brand }}><LayoutGrid size={76} /></span>
        <div style={{ fontSize: 28, fontWeight: 800, color: c.brandInk }}>{s.mediaLabel}</div>
        <div style={{ fontSize: 20, color: c.muted, fontFamily: "var(--font-mono)" }}>{s.mediaHint}</div>
      </div>
      <SlideChrome slide={s} deck={deck} index={index} total={total} dark={dark} />
    </div>
  );
}

function LayoutCompare({ s, dark, deck, index, total }: LayoutProps) {
  const c = dkt(dark);
  const left = s.left;
  const right = s.right;
  if (!left || !right) return null;
  const col = (side: CompareSide, tone: "blue" | "orange") => {
    const accent = tone === "orange" ? c.accent : c.brand;
    const tint = tone === "orange" ? c.accentSoft : c.brandSoft;
    return (
      <div style={{ borderRadius: "var(--radius-lg)", border: `1px solid ${c.border}`, overflow: "hidden", background: dark ? c.sunken : "var(--neutral-0)", boxShadow: dark ? "none" : "var(--shadow-sm)" }}>
        <div style={{ padding: "26px 34px", background: tint, borderTop: `5px solid ${accent}` }}>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: ".26em", color: accent }}>{side.tag}</div>
          <div style={{ fontSize: 40, fontWeight: 900, color: c.ink, marginTop: 8 }}>{side.name}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {side.rows.map(([k, v], i) => (
            <div key={k} style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: 22, padding: "22px 34px", borderTop: i ? `1px solid ${c.borderSoft}` : "none" }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: c.muted }}>{k}</span>
              <span style={{ fontSize: 25, color: c.body, lineHeight: 1.55 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };
  return (
    <div style={{ position: "absolute", inset: 0, background: c.slide, padding: `82px ${PAD}px 0` }}>
      <Eyebrow text={s.eyebrow} dark={dark} />
      <SlideTitle dark={dark} size={58}>{s.title}</SlideTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 76px 1fr", alignItems: "center", gap: 0, marginTop: 46 }}>
        {col(left, left.tone)}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, color: c.muted }}>
          <div style={{ width: 1, height: 90, background: c.border }} />
          <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: ".1em" }}>VS</span>
          <div style={{ width: 1, height: 90, background: c.border }} />
        </div>
        {col(right, right.tone)}
      </div>
      <SlideChrome slide={s} deck={deck} index={index} total={total} dark={dark} />
    </div>
  );
}

function LayoutFullVisual({ s, dark, deck, index, total, live }: LayoutProps) {
  const c = dkt(dark);
  const Comp = live ? s.viz : undefined;
  return (
    <div style={{ position: "absolute", inset: 0, background: dark ? c.slide : "var(--neutral-50)", padding: `58px ${PAD}px 0`, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 20, marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: ".3em", color: c.accent, marginBottom: 12 }}>{s.eyebrow}</div>
          <SlideTitle dark={dark} size={46}>{s.title}</SlideTitle>
        </div>
        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 9, padding: "10px 20px", borderRadius: 999, background: c.accentSoft, color: dark ? "var(--orange-300)" : "var(--orange-600)", fontSize: 20, fontWeight: 700, fontFamily: "var(--font-mono)" }}>
          <Sparkles size={22} />{s.vizLabel}
        </span>
      </div>
      <div style={{ flex: 1, marginBottom: 74, borderRadius: "var(--radius-xl)", border: `2px dashed ${c.border}`, background: dark ? c.sunken : "var(--neutral-0)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {Comp ? (
          <div style={{ flex: 1, overflow: "hidden", padding: dark ? "18px 34px" : "8px 40px", display: "flex", alignItems: "center" }}>
            <div style={{ width: "100%", background: dark ? "var(--neutral-0)" : "transparent", borderRadius: dark ? "var(--radius-lg)" : 0, padding: dark ? "6px 26px" : 0 }}>
              <Comp />
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <span style={{ display: "inline-flex", color: c.brand }}><Zap size={72} /></span>
            <div style={{ fontSize: 28, fontWeight: 800, color: c.brandInk }}>嵌入的互動元件</div>
            <div style={{ fontSize: 21, color: c.muted, maxWidth: 760, textAlign: "center", lineHeight: 1.7 }}>{s.vizHint}</div>
          </div>
        )}
      </div>
      <SlideChrome slide={s} deck={deck} index={index} total={total} dark={dark} />
    </div>
  );
}

function LayoutQuote({ s, dark, deck, index, total }: LayoutProps) {
  const c = dkt(dark);
  return (
    <div style={{ position: "absolute", inset: 0, background: dark ? c.slide : "var(--blue-50)", padding: `0 ${PAD + 60}px`, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div style={{ position: "absolute", left: PAD - 8, top: 150, fontSize: 320, lineHeight: 0.8, fontWeight: 900, color: dark ? "rgba(237,155,38,0.16)" : "var(--orange-200)" }}>“</div>
      <div style={{ position: "relative" }}>
        <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: ".3em", color: c.accent, marginBottom: 34 }}>{s.eyebrow}</div>
        <blockquote style={{ margin: 0, fontSize: 62, lineHeight: 1.5, fontWeight: 800, color: dark ? c.ink : "var(--blue-900)", letterSpacing: "-0.01em" }}>{s.quote}</blockquote>
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 52 }}>
          <span style={{ width: 64, height: 5, borderRadius: 999, background: "var(--gradient-accent)" }} />
          <span style={{ fontSize: 26, fontWeight: 800, color: c.brandInk }}>{s.by}</span>
          <span style={{ fontSize: 22, color: c.muted }}>{s.byMeta}</span>
        </div>
      </div>
      <SlideChrome slide={s} deck={deck} index={index} total={total} dark={dark} />
    </div>
  );
}

function LayoutClosing({ s, dark, deck, index, total }: LayoutProps) {
  const c = dkt(dark);
  const items = (s.items ?? []) as RecapItem[];
  return (
    <div style={{ position: "absolute", inset: 0, background: c.slide, padding: `86px ${PAD}px 0` }}>
      <Eyebrow text={s.eyebrow} dark={dark} />
      <SlideTitle dark={dark}>{s.title}</SlideTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32, marginTop: 56 }}>
        {items.map((it) => (
          <div key={it.n} style={{ padding: "34px 32px", borderRadius: "var(--radius-lg)", background: dark ? c.sunken : "var(--neutral-50)", border: `1px solid ${c.borderSoft}` }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 30, fontWeight: 900, color: c.accent, marginBottom: 18 }}>{it.n}</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: c.ink, marginBottom: 12, lineHeight: 1.35 }}>{it.k}</div>
            <div style={{ fontSize: 24, color: c.body, lineHeight: 1.7 }}>{it.v}</div>
          </div>
        ))}
      </div>
      {s.cta && (
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 54, padding: "28px 38px", borderRadius: "var(--radius-lg)", background: "var(--gradient-header)", color: "#fff" }}>
          <span style={{ display: "inline-flex", color: "var(--orange-300)" }}><BookOpen size={34} /></span>
          <span style={{ fontSize: 30, fontWeight: 800 }}>{s.cta}</span>
          <span style={{ marginLeft: "auto", fontSize: 22, fontFamily: "var(--font-mono)", color: "rgba(255,255,255,0.72)" }}>{s.ctaMeta}</span>
        </div>
      )}
      <SlideChrome slide={s} deck={deck} index={index} total={total} dark={dark} />
    </div>
  );
}

export const LAYOUTS: Record<SlideLayout, (p: LayoutProps) => ReactNode> = {
  cover: LayoutCover,
  section: LayoutSection,
  bullets: LayoutBullets,
  media: LayoutMedia,
  compare: LayoutCompare,
  "full-visual": LayoutFullVisual,
  quote: LayoutQuote,
  closing: LayoutClosing,
};

/** 版型庫（decklib，v1 延後）用：layout key / 中文名 / 用途 */
export const LAYOUT_SPEC: Array<[SlideLayout, string, string]> = [
  ["cover", "封面", "大標題 + eyebrow overline + 副標，navy 漸層底"],
  ["section", "章節分隔", "章節序號 + 標題，深藍底、巨型 ghost 數字"],
  ["bullets", "重點條列", "2×2 條列卡，頂端 4px 色條標示語意"],
  ["media", "圖文並排", "左文右圖，圖為筆記素材占位框"],
  ["compare", "左右對比", "雙欄對照表，藍 / 橘分色，中央 VS 軸"],
  ["full-visual", "全幅視覺", "嵌入筆記既有互動元件，播放時可操作"],
  ["quote", "引言", "大字引言 + 引號襯底 + 出處"],
  ["closing", "結語回顧", "三欄重點 + 回到筆記 CTA"],
];
