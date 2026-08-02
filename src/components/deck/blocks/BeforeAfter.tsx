// <BeforeAfter> — 量化前後對比（Task 44）。
//
// 構圖參考 dashi-ppt theme07「峰谷」頁的下半：同一組指標並列，讓落差自己說話。
//
// 與 <Compare> 的分界：Compare 比的是**兩個方案**（質性的 pros/cons，選一個）；
// BeforeAfter 比的是**同一個東西的兩個時點**（量化的差額，沒得選）。
// 與 <Kpi> 的分界：Kpi 是幾個並列的頭條數字，沒有「從什麼變成什麼」的敘事。
//
// `better` 決定要不要上狀態色。**預設不上** —— 「數字變大」在不同指標裡可能是好是壞
// （吞吐量 vs 延遲），由呼叫端明講，元件不猜。上色時一律同時給文字標籤。

import { ArrowRight } from "lucide-react";
import { DGAP, DS, DTRACK } from "../scale";
import type { BlockBaseProps, DeckThemeTokens } from "./shell";
import { BlockShell, dkt, warnOverLimit } from "./shell";

export interface BeforeAfterRow {
  label: string;
  before: string;
  after: string;
  /** 變化幅度，如「−62%」。純文字，元件不計算 —— 單位與精度由呼叫端決定 */
  delta?: string;
  /**
   * 哪一側比較好。`"after"` / `"before"` 會替該側上狀態色並加文字標籤；
   * 不給就兩側都用中性墨色（預設）。
   */
  better?: "before" | "after";
}

export interface BeforeAfterProps extends BlockBaseProps {
  rows: BeforeAfterRow[];
  /** 預設「改善前」 */
  beforeLabel?: string;
  /** 預設「改善後」 */
  afterLabel?: string;
  lead?: string;
  takeaway?: string;
}

const ROW_LIMIT = 6;
const GRID = "minmax(0, 1.2fr) minmax(0, 1fr) 40px minmax(0, 1fr) 110px";

function Value({ text, good, c }: { text: string; good: boolean; c: DeckThemeTokens }) {
  return (
    <span style={{ display: "flex", alignItems: "baseline", gap: 6, minWidth: 0 }}>
      <span
        style={{
          fontSize: DS.h3,
          fontWeight: 800,
          lineHeight: 1.15,
          letterSpacing: DTRACK.tight,
          color: good ? c.good : c.ink,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {text}
      </span>
      {/* 好的那一側同時給文字標籤，不讓顏色單獨承載「這邊比較好」 */}
      {good && <span style={{ fontSize: DS.micro, fontWeight: 800, color: c.good }}>較佳</span>}
    </span>
  );
}

export function BeforeAfter({
  dark,
  heading,
  style,
  rows,
  beforeLabel = "改善前",
  afterLabel = "改善後",
  lead,
  takeaway,
}: BeforeAfterProps) {
  const c = dkt(dark);
  warnOverLimit("BeforeAfter", rows.length, ROW_LIMIT);

  const head = (text: string) => (
    <span style={{ fontSize: DS.micro, fontWeight: 800, letterSpacing: DTRACK.label, color: c.muted }}>{text}</span>
  );

  return (
    <BlockShell heading={heading} c={c} style={style}>
      {lead && (
        <p style={{ margin: `0 0 ${DGAP.sm}px`, flex: "none", fontSize: DS.body, lineHeight: 1.6, color: c.body }}>{lead}</p>
      )}

      <div style={{ flex: "none", display: "grid", gridTemplateColumns: GRID, gap: DGAP.sm, paddingBottom: DGAP.xs }}>
        <span />
        {head(beforeLabel)}
        <span />
        {head(afterLabel)}
        <span style={{ textAlign: "right" }}>{head("變化")}</span>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {rows.map((r) => (
          <div
            key={r.label}
            style={{
              flex: 1,
              minHeight: 0,
              display: "grid",
              gridTemplateColumns: GRID,
              alignItems: "center",
              gap: DGAP.sm,
              borderTop: `1px solid ${c.borderSoft}`,
            }}
          >
            <span style={{ fontSize: DS.body, fontWeight: 700, color: c.ink, lineHeight: 1.35, minWidth: 0 }}>{r.label}</span>
            <Value text={r.before} good={r.better === "before"} c={c} />
            <span style={{ display: "inline-flex", color: c.muted }}>
              <ArrowRight size={22} />
            </span>
            <Value text={r.after} good={r.better === "after"} c={c} />
            <span
              style={{
                textAlign: "right",
                fontSize: DS.small,
                fontWeight: 800,
                color: c.body,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {r.delta ?? ""}
            </span>
          </div>
        ))}
      </div>

      {takeaway && (
        <div
          style={{
            flex: "none",
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: DGAP.xs,
            fontSize: DS.small,
            fontWeight: 700,
            color: c.ink,
          }}
        >
          <span style={{ flex: "none", width: 9, height: 9, borderRadius: 999, background: c.accent }} />
          {takeaway}
        </div>
      )}
    </BlockShell>
  );
}
