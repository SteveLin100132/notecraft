// <Layers> — 分層堆疊（Task 45）。
//
// **這一個 theme07 沒有對應** —— 它是融資報告，沒有「系統分成幾層」這種東西。
// 但本專案的筆記反覆出現分層（L1–L3 檢索、應用／服務／資料三層、SDLC 階梯），
// 而既有原子沒有一個吃得下：<Stages> 是**水平的先後**，Layers 是**垂直的上下**，
// 上層依賴下層、但沒有時間順序。用 Stages 表達分層會讓讀者誤讀成流程。
//
// 與 <Rows> 的分界：Rows 的列可以任意重排，Layers 不行 —— 疊放順序就是依賴方向。

import type { SeriesTone } from "@/lib/decks";
import { DGAP, DS, DTRACK } from "../scale";
import { toneColor } from "../SlideChrome";
import type { BlockBaseProps, DeckThemeTokens } from "./shell";
import { BlockShell, dkt, warnOverLimit } from "./shell";

export interface LayerItem {
  /** 層代號，如 "L3"。不給就不畫徽章 */
  n?: string;
  label: string;
  desc?: string;
  /** 這一層裡有什麼（短詞） */
  items?: string[];
  /** 重點層 */
  emphasis?: boolean;
}

export interface LayersProps extends BlockBaseProps {
  /** **由上而下**書寫 —— 陣列第一個畫在最上層 */
  layers: LayerItem[];
  /**
   * 左側方向標，寫成 [下, 上]，如 ["基礎", "應用"]。
   * 給了才畫那條帶箭頭的軸 —— 分層的方向是資訊，不是裝飾。
   */
  axis?: [string, string];
  lead?: string;
  tone?: SeriesTone;
}

const LAYER_LIMIT = 5;
const ITEM_LIMIT = 5;

function Band({
  layer,
  c,
  t,
  dark,
}: {
  layer: LayerItem;
  c: DeckThemeTokens;
  t: { fg: string; soft: string };
  dark: boolean;
}) {
  const on = layer.emphasis === true;
  warnOverLimit("Layers(層內項)", layer.items?.length ?? 0, ITEM_LIMIT);
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        alignItems: "center",
        gap: DGAP.md,
        boxSizing: "border-box",
        padding: `${DGAP.xs}px ${DGAP.md}px`,
        borderRadius: "var(--radius-lg)",
        background: on ? t.soft : dark ? c.sunken : "var(--neutral-50)",
        border: on ? `2px solid ${t.fg}` : `1px solid ${c.borderSoft}`,
      }}
    >
      {layer.n && (
        <span
          style={{
            flex: "none",
            width: 56,
            fontSize: DS.h3,
            fontWeight: 900,
            letterSpacing: DTRACK.tight,
            color: on ? t.fg : c.muted,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {layer.n}
        </span>
      )}

      <span style={{ flex: "none", width: "26%", display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
        <span style={{ fontSize: DS.h4, fontWeight: 800, lineHeight: 1.3, color: c.ink }}>{layer.label}</span>
        {layer.desc && <span style={{ fontSize: DS.micro, lineHeight: 1.4, color: c.muted }}>{layer.desc}</span>}
      </span>

      {layer.items?.length ? (
        <span style={{ flex: 1, display: "flex", flexWrap: "wrap", gap: 6, minWidth: 0 }}>
          {layer.items.slice(0, ITEM_LIMIT).map((it) => (
            <span
              key={it}
              style={{
                padding: "3px 10px",
                borderRadius: 999,
                fontSize: DS.small,
                fontWeight: 700,
                color: on ? t.fg : c.body,
                background: c.slide,
                border: `1px solid ${c.borderSoft}`,
              }}
            >
              {it}
            </span>
          ))}
        </span>
      ) : null}
    </div>
  );
}

export function Layers({ dark, heading, style, layers, axis, lead, tone = "blue" }: LayersProps) {
  const c = dkt(dark);
  const t = toneColor(tone, c);
  warnOverLimit("Layers", layers.length, LAYER_LIMIT);

  return (
    <BlockShell heading={heading} c={c} style={style}>
      {lead && (
        <p style={{ margin: `0 0 ${DGAP.sm}px`, flex: "none", fontSize: DS.body, lineHeight: 1.6, color: c.body }}>{lead}</p>
      )}

      <div style={{ flex: 1, display: "flex", gap: DGAP.sm, minHeight: 0 }}>
        {axis && (
          <div
            style={{
              flex: "none",
              width: 26,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "space-between",
              paddingBlock: 2,
            }}
          >
            <span style={{ fontSize: DS.micro, fontWeight: 800, letterSpacing: DTRACK.label, color: c.muted, writingMode: "vertical-rl", transform: "rotate(180deg)", whiteSpace: "nowrap" }}>
              {axis[1]}
            </span>
            <span style={{ flex: 1, width: 2, background: c.border, marginBlock: 6 }} />
            <span style={{ fontSize: DS.micro, fontWeight: 800, letterSpacing: DTRACK.label, color: c.muted, writingMode: "vertical-rl", transform: "rotate(180deg)", whiteSpace: "nowrap" }}>
              {axis[0]}
            </span>
          </div>
        )}

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: DGAP.xs, minWidth: 0, minHeight: 0 }}>
          {layers.map((l) => (
            <Band key={l.label} layer={l} c={c} t={t} dark={dark} />
          ))}
        </div>
      </div>
    </BlockShell>
  );
}
