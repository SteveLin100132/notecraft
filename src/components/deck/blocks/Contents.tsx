// <Contents> — 章節導覽格（Task 44）。
//
// 構圖參考 dashi-ppt theme07「目錄」頁：導言壓頂、下方 4×2 的等高卡片格。
//
// 與 cover 版型的 `agenda` 的分界：agenda 長在封面上、只列一次；Contents 是**中途頁**，
// 用在長筆記講完一段後回頭定位「我們走到哪了」——所以它有 `current`，agenda 沒有。
// 與 <Cards> 的分界：Cards 的每欄是獨立內容；Contents 的每格是**同一條閱讀路徑上的站點**，
// 編號必然連續，不可跳號、不可重排。

import type { SeriesTone } from "@/lib/decks";
import { DGAP, DS, DTRACK } from "../scale";
import { toneColor } from "../SlideChrome";
import type { BlockBaseProps, DeckThemeTokens } from "./shell";
import { BlockShell, dkt, warnOverLimit } from "./shell";

export interface ContentsItem {
  title: string;
  sub?: string;
}

export interface ContentsProps extends BlockBaseProps {
  /** 編號由元件依順序產生（01、02…）—— 這裡的序號是真實資訊，不讓呼叫端自己編 */
  items: ContentsItem[];
  /** 目前所在章節（1-based）。給了就標出來 */
  current?: number;
  lead?: string;
  /** 每列幾格，預設 4 */
  columns?: number;
  tone?: SeriesTone;
}

const ITEM_LIMIT = 8;

function Card({
  item,
  n,
  on,
  past,
  c,
  t,
  dark,
}: {
  item: ContentsItem;
  n: number;
  on: boolean;
  past: boolean;
  c: DeckThemeTokens;
  t: { fg: string; soft: string };
  dark: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        minWidth: 0,
        minHeight: 0,
        boxSizing: "border-box",
        padding: DGAP.sm,
        borderRadius: "var(--radius-lg)",
        background: on ? t.soft : dark ? c.sunken : "var(--neutral-50)",
        border: on ? `2px solid ${t.fg}` : `1px solid ${c.borderSoft}`,
        // 走過的章節整體淡出 —— 讀者的注意力該落在「現在」與「還沒去的地方」
        opacity: past ? 0.55 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span
          style={{
            fontSize: DS.h3,
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: DTRACK.tight,
            color: on ? t.fg : c.muted,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {String(n).padStart(2, "0")}
        </span>
        {on && (
          <span style={{ fontSize: DS.micro, fontWeight: 800, letterSpacing: DTRACK.label, color: t.fg }}>現在</span>
        )}
      </div>
      <span style={{ fontSize: DS.h4, fontWeight: 800, lineHeight: 1.3, color: c.ink, textWrap: "balance" }}>
        {item.title}
      </span>
      {item.sub && <span style={{ fontSize: DS.small, lineHeight: 1.5, color: c.body }}>{item.sub}</span>}
    </div>
  );
}

export function Contents({ dark, heading, style, items, current, lead, columns = 4, tone = "blue" }: ContentsProps) {
  const c = dkt(dark);
  const t = toneColor(tone, c);
  warnOverLimit("Contents", items.length, ITEM_LIMIT);

  return (
    <BlockShell heading={heading} c={c} style={style}>
      {lead && (
        <p style={{ margin: `0 0 ${DGAP.md}px`, flex: "none", fontSize: DS.body, lineHeight: 1.6, color: c.body }}>{lead}</p>
      )}

      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gridAutoRows: "1fr",
          gap: DGAP.sm,
          minHeight: 0,
        }}
      >
        {items.map((item, i) => (
          <Card
            key={item.title}
            item={item}
            n={i + 1}
            on={current === i + 1}
            past={current !== undefined && i + 1 < current}
            c={c}
            t={t}
            dark={dark}
          />
        ))}
      </div>
    </BlockShell>
  );
}
