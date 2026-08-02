// <Risk> — 風險研判清單（Task 44）。
//
// 構圖參考 dashi-ppt theme07「風險」頁：導言壓頂、風險逐條列開、每條自帶等級。
// 這裡把它收斂成固定三段結構 —— **風險是什麼 / 會怎樣 / 打算怎麼辦**。
//
// 與 <Rows> 的分界：Rows 是通用的「標題 + 說明」清單；Risk 的三段是釘死的，
// 因為「只寫風險不寫緩解」是技術筆記最常見的失敗模式，型別上就不留這個空間。
//
// StatusTone 在這裡是**名副其實**的好／注意／壞，是少數該用狀態色的場合；
// 依 audit A-6 一律 icon + 文字標籤並行，不讓顏色單獨承載等級。

import type { StatusTone } from "@/lib/decks";
import { DeckIcon, STATUS_ICON } from "../icons";
import { DGAP, DS, DTRACK } from "../scale";
import { toneColor } from "../SlideChrome";
import type { BlockBaseProps, DeckThemeTokens } from "./shell";
import { BlockShell, dkt, warnOverLimit } from "./shell";

export interface RiskItem {
  /** 風險本身，一句話 */
  risk: string;
  /** 會造成什麼後果 */
  impact?: string;
  /** 打算怎麼處理。**留空會在 dev 提醒** —— 沒有緩解的風險清單只是抱怨 */
  mitigation?: string;
  level: StatusTone;
  /** 等級的文字標籤，預設依 level 取「高 / 中 / 低」 */
  levelLabel?: string;
}

export interface RiskProps extends BlockBaseProps {
  items: RiskItem[];
  lead?: string;
  takeaway?: string;
}

const ITEM_LIMIT = 5;
const DEFAULT_LABEL: Record<StatusTone, string> = { critical: "高", warning: "中", good: "低" };

function Item({ item, c }: { item: RiskItem; c: DeckThemeTokens }) {
  const t = toneColor(item.level, c);
  const label = item.levelLabel ?? DEFAULT_LABEL[item.level];

  if (import.meta.env.DEV && !item.mitigation) {
    console.warn(`[deck/Risk] 「${item.risk}」沒有 mitigation —— 沒有緩解的風險清單只是抱怨`);
  }

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "grid",
        gridTemplateColumns: "84px minmax(0, 1.15fr) minmax(0, 1fr)",
        alignItems: "start",
        gap: DGAP.md,
        padding: `${DGAP.sm}px 0`,
        borderTop: `1px solid ${c.borderSoft}`,
      }}
    >
      {/* 等級：色 + icon + 文字三個通道 */}
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "3px 10px",
          borderRadius: 999,
          background: t.soft,
          color: t.fg,
          fontSize: DS.micro,
          fontWeight: 800,
          letterSpacing: DTRACK.label,
          justifySelf: "start",
        }}
      >
        <DeckIcon name={STATUS_ICON[item.level]} size={14} />
        {label}
      </span>

      <span style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
        <span style={{ fontSize: DS.h4, fontWeight: 800, lineHeight: 1.3, color: c.ink, textWrap: "balance" }}>
          {item.risk}
        </span>
        {item.impact && <span style={{ fontSize: DS.small, lineHeight: 1.5, color: c.body }}>{item.impact}</span>}
      </span>

      {item.mitigation && (
        <span style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
          <span style={{ fontSize: DS.micro, fontWeight: 800, letterSpacing: DTRACK.label, color: c.muted }}>緩解</span>
          <span style={{ fontSize: DS.small, lineHeight: 1.5, color: c.body }}>{item.mitigation}</span>
        </span>
      )}
    </div>
  );
}

export function Risk({ dark, heading, style, items, lead, takeaway }: RiskProps) {
  const c = dkt(dark);
  warnOverLimit("Risk", items.length, ITEM_LIMIT);

  return (
    <BlockShell heading={heading} c={c} style={style}>
      {lead && (
        <p style={{ margin: `0 0 ${DGAP.xs}px`, flex: "none", fontSize: DS.body, lineHeight: 1.6, color: c.body }}>{lead}</p>
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {items.map((item) => (
          <Item key={item.risk} item={item} c={c} />
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
