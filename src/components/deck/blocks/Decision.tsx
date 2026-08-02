// <Decision> — 決策記錄（Task 45）。
//
// **theme07 沒有對應** —— 融資報告只給結論，不記錄「當時考慮過什麼、為什麼沒選」。
// 但技術筆記的核心產物往往就是這個（ADR：背景 / 選項 / 決定 / 後果），
// 而既有原子最接近的 <Compare> 只能放兩個方案、也沒有「決定」與「後果」的位置。
//
// 四段是釘死的。**沒被選的選項一定要留在畫面上** —— 決策記錄的價值有一半在
// 「我們知道還有別條路，而且知道為什麼不走」，只寫結論的那份文件半年後沒人敢改。

import { Check } from "lucide-react";
import type { SeriesTone } from "@/lib/decks";
import { DGAP, DS, DTRACK } from "../scale";
import { toneColor } from "../SlideChrome";
import type { BlockBaseProps, DeckThemeTokens } from "./shell";
import { BlockShell, dkt, warnOverLimit } from "./shell";

export interface DecisionOption {
  label: string;
  /** 沒選的理由 / 選了的理由 */
  note?: string;
  chosen?: boolean;
}

export interface DecisionProps extends BlockBaseProps {
  /** 為什麼需要做這個決定 */
  context: string;
  /** 考慮過的選項，2–4 個。**至少要有一個沒被選的** */
  options: DecisionOption[];
  /** 決定本身，一句話講完 */
  decision: string;
  /** 這個決定帶來什麼（好的壞的都寫） */
  consequences?: string[];
  /** 狀態標籤，如「採用」「試行」「已撤回」 */
  status?: string;
  tone?: SeriesTone;
}

const OPTION_LIMIT = 4;
const CONSEQ_LIMIT = 4;

function Section({ label, c, children }: { label: string; c: DeckThemeTokens; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
      <span style={{ fontSize: DS.micro, fontWeight: 800, letterSpacing: DTRACK.label, color: c.muted }}>{label}</span>
      {children}
    </div>
  );
}

export function Decision({
  dark,
  heading,
  style,
  context,
  options,
  decision,
  consequences,
  status,
  tone = "blue",
}: DecisionProps) {
  const c = dkt(dark);
  const t = toneColor(tone, c);
  warnOverLimit("Decision(選項)", options.length, OPTION_LIMIT);
  warnOverLimit("Decision(後果)", consequences?.length ?? 0, CONSEQ_LIMIT);

  if (import.meta.env.DEV && options.every((o) => o.chosen)) {
    console.warn("[deck/Decision] 每個選項都標了 chosen —— 決策記錄需要留下沒被選的那些");
  }

  return (
    <BlockShell heading={heading} c={c} style={style}>
      <div style={{ flex: 1, display: "flex", gap: DGAP.xl, minHeight: 0 }}>
        {/* 左：背景 + 選項 */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: DGAP.md, minWidth: 0 }}>
          <Section label="背景" c={c}>
            <p style={{ margin: 0, fontSize: DS.body, lineHeight: 1.6, color: c.body }}>{context}</p>
          </Section>

          <Section label="考慮過的選項" c={c}>
            <div style={{ display: "flex", flexDirection: "column", gap: DGAP.xs }}>
              {options.slice(0, OPTION_LIMIT).map((o) => (
                <div
                  key={o.label}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: DGAP.xs,
                    padding: `${DGAP.xs}px ${DGAP.sm}px`,
                    borderRadius: "var(--radius-md)",
                    background: o.chosen ? t.soft : dark ? c.sunken : "var(--neutral-50)",
                    border: `1px solid ${o.chosen ? t.fg : c.borderSoft}`,
                    // 沒選的整體淡出，但**不移除** —— 讀者要看得到它曾被考慮
                    opacity: o.chosen ? 1 : 0.72,
                  }}
                >
                  <span style={{ flex: "none", display: "inline-flex", color: o.chosen ? t.fg : c.muted, marginTop: 2 }}>
                    {o.chosen ? <Check size={18} /> : <span style={{ width: 18, textAlign: "center", fontWeight: 900 }}>–</span>}
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                    <span style={{ fontSize: DS.small, fontWeight: 800, color: c.ink, lineHeight: 1.35 }}>
                      {o.label}
                      {o.chosen && <span style={{ marginLeft: 8, fontSize: DS.micro, fontWeight: 800, color: t.fg }}>採用</span>}
                    </span>
                    {o.note && <span style={{ fontSize: DS.micro, lineHeight: 1.45, color: c.muted }}>{o.note}</span>}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* 右：決定 + 後果 */}
        <div style={{ flex: "none", width: "44%", display: "flex", flexDirection: "column", gap: DGAP.md, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: DGAP.xs,
              padding: DGAP.md,
              borderRadius: "var(--radius-lg)",
              background: t.soft,
              border: `2px solid ${t.fg}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: DGAP.xs }}>
              <span style={{ fontSize: DS.micro, fontWeight: 800, letterSpacing: DTRACK.label, color: t.fg }}>決定</span>
              {status && (
                <span
                  style={{
                    marginLeft: "auto",
                    padding: "2px 10px",
                    borderRadius: 999,
                    background: c.slide,
                    border: `1px solid ${c.border}`,
                    fontSize: DS.micro,
                    fontWeight: 800,
                    color: c.body,
                  }}
                >
                  {status}
                </span>
              )}
            </div>
            <span style={{ fontSize: DS.h3, fontWeight: 800, lineHeight: 1.35, color: c.ink, textWrap: "balance" }}>
              {decision}
            </span>
          </div>

          {consequences?.length ? (
            <Section label="後果" c={c}>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {consequences.slice(0, CONSEQ_LIMIT).map((x) => (
                  <span key={x} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: DS.small, lineHeight: 1.5, color: c.body }}>
                    <span style={{ flex: "none", width: 5, height: 5, borderRadius: 999, background: c.muted, marginTop: 8 }} />
                    {x}
                  </span>
                ))}
              </div>
            </Section>
          ) : null}
        </div>
      </div>
    </BlockShell>
  );
}
