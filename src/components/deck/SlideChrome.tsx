// 內容頁共用外框（Task 33 — 契約 v0.2 §4）。
//
// 套用於 custom / full-visual / closing；cover / section / quote 不套用。
//
// 為什麼要獨立成元件：`custom` 頁**不准自己畫**編號徽章、標題、底線、pill、legend、
// callout、footnotes、頁碼、footer —— 一律由本檔提供。這是 v0.2 三道護欄的第一道，
// 也是「8 頁自由發揮」不會變成「8 份不同簡報」的主要原因。
//
// ⚠️ chromeMetrics() 與實際渲染必須永遠一致。做法：兩者共用同一組 CHROME 常數與
// headerH() / footerH()，渲染端每個區塊給**顯式高度**（不用 auto），高度總和
// 在建構上就等於 900。改任何一個常數，兩邊同時生效。

import type { ReactNode } from "react";
import type {
  Callout,
  Deck,
  LegendItem,
  Pill,
  SeriesTone,
  SlideChromeFields,
  StatusTone,
} from "@/lib/decks";
import type { DeckThemeTokens } from "./theme";
import { dkt } from "./theme";
import { DGAP, DS, DTRACK } from "./scale";
import { DeckIcon, STATUS_ICON } from "./icons";

/** 1600×900 座標系下的外框尺寸常數。渲染與 chromeMetrics 共用。 */
export const CHROME = {
  w: 1600,
  h: 900,
  padX: 104,
  padTop: 58,
  padBottom: 46,
  /** num 徽章 / eyebrow 一行（含下方 gap） */
  kickerH: 38,
  /** 主標一行（含下方 gap） */
  titleH: 58,
  /** 橘色底線（含下方 gap） */
  ruleH: 26,
  /** legend 一行（含下方 gap） */
  legendH: 44,
  /** 內容區與下方區塊之間 */
  contentGap: 20,
  /** footnote 每列高度 / 每列欄數 */
  footnoteRowH: 26,
  footnoteCols: 3,
  /** callout 單句形態 / 多段形態 */
  calloutH: 82,
  calloutItemsH: 112,
  /** 最下面那行 footer */
  footerH: 34,
} as const;

type ChromeInput = Pick<
  SlideChromeFields,
  "num" | "eyebrow" | "title" | "titleNote" | "legend" | "callout" | "footnotes"
>;

function headerH(s: ChromeInput): number {
  let h = 0;
  if (s.num || s.eyebrow) h += CHROME.kickerH;
  if (s.title) h += CHROME.titleH + CHROME.ruleH;
  if (s.legend?.length) h += CHROME.legendH;
  return h;
}

function footerH(s: ChromeInput): number {
  let h = CHROME.footerH;
  if (s.footnotes?.length) {
    h += Math.ceil(s.footnotes.length / CHROME.footnoteCols) * CHROME.footnoteRowH;
  }
  if (s.callout) h += s.callout.items?.length ? CHROME.calloutItemsH : CHROME.calloutH;
  return h;
}

/**
 * SlideChrome 佔用後剩下的可用內容區（1600×900 座標系內的 px）。
 *
 * `custom` 頁靠這個值自我約束 —— 1600×900 是固定座標系、SlideFrame 是 overflow:hidden，
 * 溢出**不報錯、只會被靜靜裁掉**。
 */
export function chromeMetrics(s: ChromeInput): { w: number; h: number } {
  return {
    w: CHROME.w - CHROME.padX * 2,
    h:
      CHROME.h -
      CHROME.padTop -
      headerH(s) -
      CHROME.contentGap -
      footerH(s) -
      CHROME.padBottom,
  };
}

/** 整頁滿版（chrome: false）時的可用區 */
export const FULL_AREA = { w: CHROME.w, h: CHROME.h } as const;

// ── 色彩解析 ────────────────────────────────────────────────

type AnyTone = SeriesTone | StatusTone;

const STATUS_TONES: readonly AnyTone[] = ["good", "warning", "critical"];

export function isStatusTone(tone: AnyTone | undefined): tone is StatusTone {
  return tone !== undefined && STATUS_TONES.includes(tone);
}

/** tone → { fg, soft }。識別色走 brand/accent/seriesMuted，狀態色走 good/warning/critical。 */
export function toneColor(tone: AnyTone | undefined, c: DeckThemeTokens): { fg: string; soft: string } {
  switch (tone) {
    case "orange":
      return { fg: c.accent, soft: c.accentSoft };
    case "muted":
      return { fg: c.seriesMuted, soft: c.sunken };
    case "good":
      return { fg: c.good, soft: c.goodSoft };
    case "warning":
      return { fg: c.warning, soft: c.warningSoft };
    case "critical":
      return { fg: c.critical, soft: c.criticalSoft };
    case "blue":
    default:
      return { fg: c.brand, soft: c.brandSoft };
  }
}

// ── 子區塊 ──────────────────────────────────────────────────

function Kicker({ num, eyebrow, c, onDark }: { num?: string; eyebrow?: string; c: DeckThemeTokens; onDark: boolean }) {
  return (
    <div style={{ height: CHROME.kickerH, display: "flex", alignItems: "center", gap: DGAP.sm }}>
      {num && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 34,
            height: 30,
            padding: "0 10px",
            borderRadius: "var(--radius-sm)",
            background: "var(--gradient-accent)",
            color: "var(--neutral-0)",
            fontSize: DS.micro,
            fontWeight: 900,
            fontFamily: "var(--font-mono)",
          }}
        >
          {num}
        </span>
      )}
      {eyebrow && (
        <span
          style={{
            fontSize: DS.eyebrow,
            fontWeight: 700,
            letterSpacing: DTRACK.label,
            color: onDark ? "var(--orange-300)" : c.accent,
          }}
        >
          {eyebrow}
        </span>
      )}
    </div>
  );
}

function PillBadge({ pill, c }: { pill: Pill; c: DeckThemeTokens }) {
  const { fg, soft } = toneColor(pill.tone, c);
  return (
    <span
      style={{
        position: "absolute",
        top: CHROME.padTop,
        right: CHROME.padX,
        display: "inline-flex",
        alignItems: "center",
        gap: DGAP.xs,
        padding: "8px 16px",
        borderRadius: 999,
        background: soft,
        color: fg,
        fontSize: DS.micro,
        fontWeight: 700,
        fontFamily: "var(--font-mono)",
        whiteSpace: "nowrap",
      }}
    >
      {pill.text}
    </span>
  );
}

function Legend({ items, c }: { items: LegendItem[]; c: DeckThemeTokens }) {
  return (
    <div style={{ height: CHROME.legendH, display: "flex", alignItems: "center", gap: DGAP.lg, flexWrap: "nowrap" }}>
      {items.map((it) => {
        const { fg } = toneColor(it.tone, c);
        // 狀態色一律 icon + 文字並行；沒給 icon 就用預設表補（audit A-6）
        const icon = it.icon ?? (isStatusTone(it.tone) ? STATUS_ICON[it.tone] : undefined);
        return (
          <span key={it.label} style={{ display: "inline-flex", alignItems: "center", gap: DGAP.xs, fontSize: DS.micro, color: c.body }}>
            {icon ? (
              <span style={{ display: "inline-flex", color: fg }}>
                <DeckIcon name={icon} size={18} />
              </span>
            ) : (
              <span style={{ width: 14, height: 14, borderRadius: 4, background: fg, flex: "none" }} />
            )}
            {it.label}
          </span>
        );
      })}
    </div>
  );
}

function Footnotes({ items, c }: { items: SlideChromeFields["footnotes"]; c: DeckThemeTokens }) {
  if (!items?.length) return null;
  const rows = Math.ceil(items.length / CHROME.footnoteCols);
  return (
    <div
      style={{
        height: rows * CHROME.footnoteRowH,
        display: "grid",
        gridTemplateColumns: `repeat(${CHROME.footnoteCols}, 1fr)`,
        columnGap: DGAP.lg,
        alignContent: "center",
        fontSize: DS.micro,
        color: c.muted,
      }}
    >
      {items.map((f) => (
        <span key={f.n} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: c.brandInk, marginRight: 6 }}>{f.n}</span>
          {f.text}
        </span>
      ))}
    </div>
  );
}

function CalloutBar({ callout, c }: { callout: Callout; c: DeckThemeTokens }) {
  const { fg, soft } = toneColor(callout.tone, c);
  const multi = Boolean(callout.items?.length);
  const icon = callout.icon ?? (isStatusTone(callout.tone) ? STATUS_ICON[callout.tone] : undefined);
  return (
    <div
      style={{
        height: multi ? CHROME.calloutItemsH : CHROME.calloutH,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        gap: DGAP.md,
        padding: `0 ${DGAP.md}px`,
        borderRadius: "var(--radius-lg)",
        background: soft,
        border: `1px solid ${c.borderSoft}`,
      }}
    >
      {icon && (
        <span style={{ display: "inline-flex", color: fg, flex: "none" }}>
          <DeckIcon name={icon} size={28} />
        </span>
      )}
      {multi ? (
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: `repeat(${callout.items!.length}, 1fr)`, gap: DGAP.md }}>
          {callout.items!.map((it) => {
            const t = toneColor(it.tone ?? callout.tone, c);
            const itIcon = isStatusTone(it.tone) ? STATUS_ICON[it.tone] : undefined;
            return (
              <div key={it.text} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {it.label && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: DGAP.xs, fontSize: DS.eyebrow, fontWeight: 800, letterSpacing: DTRACK.label, color: t.fg }}>
                    {itIcon && <DeckIcon name={itIcon} size={16} />}
                    {it.label}
                  </span>
                )}
                <span style={{ fontSize: DS.small, color: c.body, lineHeight: 1.5 }}>{it.text}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <span style={{ flex: 1, fontSize: DS.small, color: c.body, lineHeight: 1.6 }}>{callout.text}</span>
      )}
      {callout.chip && (
        <span
          style={{
            flex: "none",
            padding: "6px 14px",
            borderRadius: 999,
            background: c.slide,
            border: `1px solid ${c.border}`,
            fontSize: DS.micro,
            fontWeight: 700,
            color: fg,
            whiteSpace: "nowrap",
          }}
        >
          {callout.chip}
        </span>
      )}
    </div>
  );
}

function FooterBar({
  deck,
  eyebrow,
  index,
  total,
  c,
  onDark,
}: {
  deck: Deck;
  eyebrow?: string;
  index: number;
  total: number;
  c: DeckThemeTokens;
  onDark: boolean;
}) {
  const ink = onDark ? "rgba(255,255,255,0.66)" : c.muted;
  return (
    <div style={{ height: CHROME.footerH, display: "flex", alignItems: "center", gap: DGAP.sm, fontSize: DS.micro, color: ink }}>
      <span style={{ fontWeight: 700, color: onDark ? "var(--neutral-0)" : c.brandInk }}>{deck.title}</span>
      <span style={{ opacity: 0.5 }}>／</span>
      <span>{eyebrow || "NOTECRAFT"}</span>
      <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
        {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </span>
    </div>
  );
}

// ── 主元件 ──────────────────────────────────────────────────

export interface SlideChromeProps {
  s: SlideChromeFields;
  deck: Deck;
  index: number;
  total: number;
  dark: boolean;
  /** 深底變體（closing tone: "dark"）。預設 light */
  tone?: "light" | "dark";
  /** 內容區背景；預設投影片底色 */
  background?: string;
  children?: ReactNode;
}

export function SlideChrome({ s, deck, index, total, dark, tone, background, children }: SlideChromeProps) {
  const c = dkt(dark);
  const onDark = tone === "dark";
  const area = chromeMetrics(s);
  const hasKicker = Boolean(s.num || s.eyebrow);
  const ink = onDark ? "var(--neutral-0)" : c.ink;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: background ?? (onDark ? "var(--blue-900)" : c.slide),
        padding: `${CHROME.padTop}px ${CHROME.padX}px ${CHROME.padBottom}px`,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {s.pill && <PillBadge pill={s.pill} c={c} />}

      {hasKicker && <Kicker num={s.num} eyebrow={s.eyebrow} c={c} onDark={onDark} />}

      {s.title && (
        <>
          <div style={{ height: CHROME.titleH, display: "flex", alignItems: "baseline", gap: DGAP.sm }}>
            <h2
              style={{
                margin: 0,
                fontSize: DS.h2,
                lineHeight: 1.2,
                fontWeight: 900,
                letterSpacing: DTRACK.tight,
                color: ink,
                textWrap: "balance",
              }}
            >
              {s.title}
            </h2>
            {s.titleNote && (
              <span style={{ fontSize: DS.small, color: onDark ? "rgba(255,255,255,0.7)" : c.muted, whiteSpace: "nowrap" }}>
                {s.titleNote}
              </span>
            )}
          </div>
          <div style={{ height: CHROME.ruleH, display: "flex", alignItems: "flex-start" }}>
            <span style={{ width: 84, height: 5, borderRadius: 999, background: "var(--gradient-accent)" }} />
          </div>
        </>
      )}

      {s.legend?.length ? <Legend items={s.legend} c={c} /> : null}

      {/* 內容區：高度由 chromeMetrics 決定，custom 頁拿到的 area 就是這一塊 */}
      <div style={{ height: area.h, flex: "none", overflow: "hidden" }}>{children}</div>

      <div style={{ height: CHROME.contentGap, flex: "none" }} />

      <Footnotes items={s.footnotes} c={c} />
      {s.callout && <CalloutBar callout={s.callout} c={c} />}
      <FooterBar deck={deck} eyebrow={s.eyebrow} index={index} total={total} c={c} onDark={onDark} />
    </div>
  );
}
