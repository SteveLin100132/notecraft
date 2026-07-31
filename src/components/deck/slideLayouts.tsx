// Deck 系統化版型（Task 33 — 契約 v0.2 §6）。
//
// 5 個保留版型：cover / section / quote / closing / full-visual。
// 內容頁的 `custom` 版型於 Task 35 加入。
//
// 全部在 1600×900 內部座標系排版（position:absolute; inset:0），縮放由 SlideFrame 負責。
// 規則：
//   - 顏色一律走 CSS 變數 token（src/styles/tokens.css）與 dkt()，不硬編色碼
//   - 字級一律取自 scale.ts 的 DS；純裝飾性 ghost 字（引號、背景大數字）標為 decorative 例外
//   - icon 用 lucide-react（經 icons.tsx 查表），禁 emoji
//   - 內容頁（full-visual / closing）的外框由 SlideChrome 提供，不各自畫 footer

import type { ComponentType, ReactNode } from "react";
import { Sparkles, Zap } from "lucide-react";
import type {
  ClosingSlide,
  CoverSlide,
  CustomSlide,
  Deck,
  FullVisualSlide,
  QuoteSlide,
  SectionSlide,
  Slide,
  SlideLayout,
} from "@/lib/decks";
import { dkt } from "./theme";
import { DGAP, DS, DTRACK } from "./scale";
import { CHROME, chromeMetrics, FULL_AREA, SlideChrome } from "./SlideChrome";
import { OverflowBadge, useOverflowProbe } from "./overflowProbe";

const PAD = CHROME.padX;

export interface LayoutProps<S extends Slide = Slide> {
  s: S;
  dark: boolean;
  deck: Deck;
  index: number;
  total: number;
  /** full-visual / custom：true 時掛載真元件與動畫、false（縮覽）不掛 */
  live?: boolean;
}

/** 各 layout 的元件簽章 —— 只看得到自己那個 slide 型別的欄位 */
export type LayoutComponent<K extends SlideLayout> = (
  p: LayoutProps<Extract<Slide, { layout: K }>>,
) => ReactNode;

// ── 共用零件 ─────────────────────────────────────────────────

function Eyebrow({ text, dark, onBrand }: { text?: string; dark: boolean; onBrand?: boolean }) {
  if (!text) return null;
  return (
    <div
      style={{
        fontSize: DS.eyebrow,
        fontWeight: 700,
        letterSpacing: DTRACK.label,
        color: onBrand ? "var(--orange-300)" : dkt(dark).accent,
        marginBottom: DGAP.md,
      }}
    >
      {text}
    </div>
  );
}

function AccentRule({ width = 120, height = 7, margin }: { width?: number; height?: number; margin?: string }) {
  return <div style={{ width, height, borderRadius: 999, background: "var(--gradient-accent)", margin }} />;
}

// ── cover ───────────────────────────────────────────────────

function CoverAgenda({ items }: { items: NonNullable<CoverSlide["agenda"]> }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: DGAP.md, minWidth: 480 }}>
      <div style={{ fontSize: DS.eyebrow, fontWeight: 700, letterSpacing: DTRACK.label, color: "var(--orange-300)" }}>
        AGENDA
      </div>
      {items.map((it) => (
        <div key={it.n} style={{ display: "flex", alignItems: "flex-start", gap: DGAP.sm }}>
          <span
            style={{
              flex: "none",
              fontFamily: "var(--font-mono)",
              fontSize: DS.h4,
              fontWeight: 900,
              lineHeight: 1.2,
              color: "rgba(255,255,255,0.42)",
            }}
          >
            {it.n}
          </span>
          <div>
            <div style={{ fontSize: DS.h3, fontWeight: 800, lineHeight: 1.3, color: "var(--neutral-0)" }}>{it.title}</div>
            {it.sub && (
              <div style={{ fontSize: DS.small, lineHeight: 1.5, color: "rgba(255,255,255,0.66)", marginTop: 4 }}>
                {it.sub}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function LayoutCover({ s, dark }: LayoutProps<CoverSlide>) {
  const hasAgenda = Boolean(s.agenda?.length);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "var(--gradient-header)",
        color: "var(--neutral-0)",
        display: "flex",
        alignItems: "center",
        gap: DGAP.xl,
        padding: `0 ${PAD}px`,
      }}
    >
      <div style={{ position: "absolute", right: -120, top: -140, width: 560, height: 560, borderRadius: 999, background: "rgba(255,255,255,0.06)" }} />
      <div style={{ position: "absolute", right: 150, bottom: -230, width: 420, height: 420, borderRadius: 999, background: "rgba(237,155,38,0.16)" }} />

      <div style={{ position: "relative", flex: 1, maxWidth: hasAgenda ? 820 : 1080 }}>
        <Eyebrow text={s.eyebrow} dark={dark} onBrand />
        <h1
          style={{
            margin: 0,
            fontSize: hasAgenda ? DS.h1 : DS.hero,
            lineHeight: 1.1,
            fontWeight: 900,
            letterSpacing: DTRACK.tight,
            color: "var(--neutral-0)",
            textWrap: "balance",
          }}
        >
          {s.title}
        </h1>
        <AccentRule margin={`${DGAP.md}px 0 ${DGAP.md}px`} />
        <p style={{ margin: 0, fontSize: DS.h3, lineHeight: 1.6, color: "rgba(255,255,255,0.86)", maxWidth: 900 }}>
          {s.subtitle}
        </p>
      </div>

      {s.agenda?.length ? <div style={{ position: "relative" }}><CoverAgenda items={s.agenda} /></div> : null}

      <div
        style={{
          position: "absolute",
          left: PAD,
          bottom: CHROME.padBottom,
          display: "flex",
          gap: DGAP.md,
          fontSize: DS.micro,
          color: "rgba(255,255,255,0.66)",
          fontFamily: "var(--font-mono)",
        }}
      >
        {(s.meta ?? []).map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
    </div>
  );
}

// ── section ─────────────────────────────────────────────────

function LayoutSection({ s }: LayoutProps<SectionSlide>) {
  const onDark = (s.tone ?? "dark") === "dark";
  const centered = s.align === "center";
  const numSize = s.numScale === "hero" ? DS.hero : DS.mega;
  const ink = onDark ? "var(--neutral-0)" : "var(--blue-900)";
  const subInk = onDark ? "rgba(255,255,255,0.78)" : "var(--neutral-600)";

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: onDark ? "var(--blue-900)" : "var(--blue-50)",
        color: ink,
        display: "flex",
        alignItems: "center",
        justifyContent: centered ? "center" : "flex-start",
        gap: DGAP.xl,
        padding: `0 ${PAD}px`,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          flex: "none",
          fontSize: numSize,
          fontWeight: 900,
          lineHeight: 0.86,
          letterSpacing: DTRACK.tight,
          fontFamily: "var(--font-mono)",
          color: onDark ? "rgba(255,255,255,0.16)" : "var(--blue-200)",
        }}
      >
        {s.num}
      </div>
      <div style={{ textAlign: centered ? "center" : "left" }}>
        <Eyebrow text={s.eyebrow} dark={onDark} onBrand={onDark} />
        <h2
          style={{
            margin: 0,
            fontSize: DS.h1,
            fontWeight: 900,
            letterSpacing: DTRACK.tight,
            lineHeight: 1.15,
            color: ink,
            textWrap: "balance",
          }}
        >
          {s.title}
        </h2>
        {s.subtitle && (
          <p style={{ margin: `${DGAP.sm}px 0 0`, fontSize: DS.h3, color: subInk, lineHeight: 1.6 }}>{s.subtitle}</p>
        )}
      </div>
    </div>
  );
}

// ── full-visual ─────────────────────────────────────────────

function VizPanel({ Comp, dark, hint }: { Comp?: ComponentType; dark: boolean; hint?: string }) {
  const c = dkt(dark);
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        borderRadius: "var(--radius-xl)",
        border: `2px dashed ${c.border}`,
        background: dark ? c.sunken : "var(--neutral-0)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {Comp ? (
        <div style={{ flex: 1, overflow: "hidden", padding: dark ? "18px 34px" : "8px 40px", display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: "100%",
              background: dark ? "var(--neutral-0)" : "transparent",
              borderRadius: dark ? "var(--radius-lg)" : 0,
              padding: dark ? "6px 26px" : 0,
            }}
          >
            <Comp />
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: DGAP.sm }}>
          <span style={{ display: "inline-flex", color: c.brand }}>
            <Zap size={64} />
          </span>
          <div style={{ fontSize: DS.h4, fontWeight: 800, color: c.brandInk }}>嵌入的互動元件</div>
          {hint && (
            <div style={{ fontSize: DS.small, color: c.muted, maxWidth: 720, textAlign: "center", lineHeight: 1.7 }}>{hint}</div>
          )}
        </div>
      )}
    </div>
  );
}

function LayoutFullVisual({ s, dark, deck, index, total, live }: LayoutProps<FullVisualSlide>) {
  const c = dkt(dark);
  // vizLabel 沿用 chrome 的 pill slot（沒另給 pill 時）
  const chromeFields = s.pill || !s.vizLabel ? s : { ...s, pill: { text: s.vizLabel, tone: "orange" as const } };
  return (
    <SlideChrome
      s={chromeFields}
      deck={deck}
      index={index}
      total={total}
      dark={dark}
      background={dark ? c.slide : "var(--neutral-50)"}
    >
      <div style={{ height: "100%", display: "flex", gap: DGAP.md }}>
        <VizPanel Comp={live ? s.viz : undefined} dark={dark} hint={s.vizHint} />
        {s.viz2 && <VizPanel Comp={live ? s.viz2 : undefined} dark={dark} hint={s.vizHint} />}
      </div>
    </SlideChrome>
  );
}

// ── quote ───────────────────────────────────────────────────

function LayoutQuote({ s, dark }: LayoutProps<QuoteSlide>) {
  const c = dkt(dark);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: dark ? c.slide : "var(--blue-50)",
        padding: `0 ${PAD + 60}px`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      {/* decorative — 純裝飾 ghost 引號，不套 DS 階梯 */}
      <div
        style={{
          position: "absolute",
          left: PAD - 8,
          top: 150,
          fontSize: 320,
          lineHeight: 0.8,
          fontWeight: 900,
          color: dark ? "rgba(237,155,38,0.16)" : "var(--orange-200)",
        }}
      >
        “
      </div>
      <div style={{ position: "relative" }}>
        <Eyebrow text={s.eyebrow} dark={dark} />
        <blockquote
          style={{
            margin: 0,
            fontSize: DS.h1,
            lineHeight: 1.5,
            fontWeight: 800,
            color: dark ? c.ink : "var(--blue-900)",
            letterSpacing: DTRACK.tight,
            textWrap: "balance",
          }}
        >
          {s.quote}
        </blockquote>
        <div style={{ display: "flex", alignItems: "center", gap: DGAP.sm, marginTop: DGAP.lg }}>
          <AccentRule width={64} height={5} />
          <span style={{ fontSize: DS.h4, fontWeight: 800, color: c.brandInk }}>{s.by}</span>
          <span style={{ fontSize: DS.body, color: c.muted }}>{s.byMeta}</span>
        </div>
      </div>
    </div>
  );
}

// ── closing ─────────────────────────────────────────────────

function LayoutClosing({ s, dark, deck, index, total }: LayoutProps<ClosingSlide>) {
  const c = dkt(dark);
  const onDark = s.tone === "dark";
  const cardBg = onDark ? "rgba(255,255,255,0.07)" : dark ? c.sunken : "var(--neutral-50)";
  const cardBorder = onDark ? "rgba(255,255,255,0.14)" : c.borderSoft;
  const titleInk = onDark ? "var(--neutral-0)" : c.ink;
  const bodyInk = onDark ? "rgba(255,255,255,0.78)" : c.body;

  return (
    <SlideChrome s={s} deck={deck} index={index} total={total} dark={dark} tone={s.tone}>
      <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: DGAP.md }}>
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: DGAP.md }}>
          {s.items.map((it) => (
            <div
              key={it.n}
              style={{
                boxSizing: "border-box",
                padding: `${DGAP.md}px`,
                borderRadius: "var(--radius-lg)",
                background: cardBg,
                border: `1px solid ${cardBorder}`,
              }}
            >
              <div style={{ fontFamily: "var(--font-mono)", fontSize: DS.h3, fontWeight: 900, color: c.accent, marginBottom: DGAP.sm }}>
                {it.n}
              </div>
              <div style={{ fontSize: DS.h4, fontWeight: 800, color: titleInk, marginBottom: DGAP.xs, lineHeight: 1.35, textWrap: "balance" }}>
                {it.k}
              </div>
              <div style={{ fontSize: DS.body, color: bodyInk, lineHeight: 1.7 }}>{it.v}</div>
            </div>
          ))}
        </div>
        {s.cta && (
          <div
            style={{
              flex: "none",
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              gap: DGAP.sm,
              padding: `${DGAP.sm}px ${DGAP.md}px`,
              borderRadius: "var(--radius-lg)",
              background: "var(--gradient-header)",
              color: "var(--neutral-0)",
            }}
          >
            <span style={{ display: "inline-flex", color: "var(--orange-300)" }}>
              <Sparkles size={26} />
            </span>
            <span style={{ fontSize: DS.h4, fontWeight: 800 }}>{s.cta}</span>
            <span style={{ marginLeft: "auto", fontSize: DS.small, fontFamily: "var(--font-mono)", color: "rgba(255,255,255,0.72)" }}>
              {s.ctaMeta}
            </span>
          </div>
        )}
      </div>
    </SlideChrome>
  );
}

// ── custom（v0.2 的內容頁主力）─────────────────────────────

function LayoutCustom({ s, dark, deck, index, total, live }: LayoutProps<CustomSlide>) {
  const c = dkt(dark);
  const Render = s.render;
  const chromeless = s.chrome === false;
  const area = chromeless ? FULL_AREA : chromeMetrics(s);
  const [probeRef, over] = useOverflowProbe(area, `${deck.slug} · ${String(index + 1).padStart(2, "0")} ${s.nav}`);

  // 外層固定為「高度確定的 flex 欄」：blocks 的預設 flex 才有東西可分，
  // 頁面元件也不必自己處理高度。要自訂版面就在 render 內包一層自己的 div。
  const content = (
    <div
      ref={probeRef}
      style={{
        position: "relative",
        height: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        gap: DGAP.md,
      }}
    >
      <Render dark={dark} live={Boolean(live)} area={area} />
      <OverflowBadge over={over} />
    </div>
  );

  if (chromeless) {
    return (
      <div style={{ position: "absolute", inset: 0, background: c.slide, overflow: "hidden" }}>{content}</div>
    );
  }

  return (
    <SlideChrome s={s} deck={deck} index={index} total={total} dark={dark}>
      {content}
    </SlideChrome>
  );
}

// ── 匯出 ────────────────────────────────────────────────────

/**
 * layout key → 版型元件。6 種全備（Task 35 補上 custom）。
 *
 * 型別仍是 Partial：分派端（SlideFrame）以 FALLBACK_LAYOUT 兜底，
 * 未來新增 layout 時不會因為漏填而編譯失敗、而是走兜底並在畫面上看得出來。
 */
export const LAYOUTS: { [K in SlideLayout]?: LayoutComponent<K> } = {
  cover: LayoutCover,
  section: LayoutSection,
  custom: LayoutCustom,
  "full-visual": LayoutFullVisual,
  quote: LayoutQuote,
  closing: LayoutClosing,
};

/**
 * 未知 layout 的兜底。用 `custom` —— 它是主幹道，且會套 SlideChrome，
 * 頁碼與 nav 都在，一眼看得出是哪一頁出問題。
 */
export const FALLBACK_LAYOUT = LayoutCustom as (p: LayoutProps) => ReactNode;

/** 版型庫（decklib，v1 延後）用：layout key / 中文名 / 用途 */
export const LAYOUT_SPEC: Array<[SlideLayout, string, string]> = [
  ["cover", "封面", "大標題 + eyebrow overline + 副標，navy 漸層底；可帶右側 agenda"],
  ["section", "章節分隔", "超大章節編號 + 標題；numScale / align / tone 三個參數"],
  ["custom", "自由頁", "內容頁主力：deck 檔自行定義頁面元件，套 SlideChrome（Task 35 實作）"],
  ["full-visual", "全幅視覺", "嵌入筆記既有互動元件，播放時可操作；viz2 可兩幅並排"],
  ["quote", "引言", "大字引言 + 引號襯底 + 出處"],
  ["closing", "結語回顧", "三欄重點 + 回到筆記 CTA；tone: dark 為深底變體"],
];
