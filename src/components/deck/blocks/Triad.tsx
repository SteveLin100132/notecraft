// <Triad> — 主張 + 三要素（Task 43）。
//
// 構圖參考 dashi-ppt theme07「三角」頁：置中大主張壓陣、下方三等分欄各自 icon + 標籤 + 描述。
// 它承載的是**修辭**，不是資料 —— 用在「這件事由三個東西撐起來」的收斂頁。
//
// 與 <Cards> 的分界：Cards 是可增減的並列清單（2–6 欄）；Triad 固定三欄，
// 因為「三」本身就是論點的一部分（鐵三角、CAP、人／流程／工具）。要四個就改用 <Cards>。
// 與 quote 版型的分界：quote 是純引言頁；Triad 的主張下面還要接三個支撐點。

import type { IconName, SeriesTone } from "@/lib/decks";
import { DeckIcon } from "../icons";
import { DGAP, DS, DTRACK } from "../scale";
import { toneColor } from "../SlideChrome";
import type { BlockBaseProps, DeckThemeTokens } from "./shell";
import { BlockShell, dkt } from "./shell";

export interface TriadItem {
  /** 要素名，如「人才」 */
  label: string;
  /** 一句話說明 */
  desc?: string;
  icon?: IconName;
}

export interface TriadProps extends BlockBaseProps {
  /** 置中主張。整句寫完，關鍵片段用 `emphasis` 指出 */
  statement: string;
  /**
   * `statement` 裡要強調的片段（必須是它的子字串）。
   * 以識別色 + 底線兩個通道標示，不讓顏色單獨承載重點。
   */
  emphasis?: string;
  /** 主張上方的膠囊標籤 */
  chip?: string;
  /** **就是三個** —— 型別上釘死，不留「其實可以四個」的空間 */
  items: [TriadItem, TriadItem, TriadItem];
  /** 底部註記 / 出處 */
  meta?: string;
  /** 強調色，預設 "orange" */
  tone?: SeriesTone;
}

function Statement({
  statement,
  emphasis,
  c,
  t,
}: {
  statement: string;
  emphasis?: string;
  c: DeckThemeTokens;
  t: { fg: string; soft: string };
}) {
  const base = {
    margin: 0,
    fontSize: DS.h1,
    fontWeight: 900,
    lineHeight: 1.28,
    letterSpacing: DTRACK.tight,
    color: c.ink,
    textAlign: "center" as const,
    textWrap: "balance" as const,
  };

  const at = emphasis ? statement.indexOf(emphasis) : -1;
  if (at < 0) return <h3 style={base}>{statement}</h3>;

  return (
    <h3 style={base}>
      {statement.slice(0, at)}
      <span style={{ color: t.fg, borderBottom: `5px solid ${t.soft}`, paddingBottom: 2 }}>{emphasis}</span>
      {statement.slice(at + emphasis!.length)}
    </h3>
  );
}

export function Triad({ dark, heading, style, statement, emphasis, chip, items, meta, tone = "orange" }: TriadProps) {
  const c = dkt(dark);
  const t = toneColor(tone, c);

  return (
    <BlockShell heading={heading} c={c} style={style}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: DGAP.md, minHeight: 0 }}>
        {/* 主張區：置中、佔掉上半，靠留白與字級製造壓迫感 */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: DGAP.sm,
          }}
        >
          {chip && (
            <span
              style={{
                padding: "5px 16px",
                borderRadius: 999,
                background: t.soft,
                color: t.fg,
                fontSize: DS.micro,
                fontWeight: 800,
                letterSpacing: DTRACK.label,
              }}
            >
              {chip}
            </span>
          )}

          <Statement statement={statement} emphasis={emphasis} c={c} t={t} />

          {/* 主張與三欄之間的短分隔線 —— 不是裝飾，是把「論點」與「支撐」分開的閱讀停頓 */}
          <span style={{ width: 88, height: 4, borderRadius: 999, background: c.ink, marginTop: DGAP.xs }} />
        </div>

        {/* 三要素 */}
        <div style={{ flex: "none", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: DGAP.lg }}>
          {items.map((it) => (
            <div key={it.label} style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
              {it.icon && (
                <span style={{ display: "inline-flex", color: t.fg }}>
                  <DeckIcon name={it.icon} size={26} />
                </span>
              )}
              <span style={{ fontSize: DS.h4, fontWeight: 800, lineHeight: 1.3, color: c.ink }}>{it.label}</span>
              {it.desc && <span style={{ fontSize: DS.small, lineHeight: 1.5, color: c.body }}>{it.desc}</span>}
            </div>
          ))}
        </div>

        {meta && <div style={{ flex: "none", fontSize: DS.micro, color: c.muted }}>{meta}</div>}
      </div>
    </BlockShell>
  );
}
