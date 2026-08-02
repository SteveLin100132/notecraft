// <Annotate> — 通用標註層（Task 39）。
//
// `children` 放任何東西（截圖 <img>、自畫 SVG、<Code>、任意 JSX），在其上疊加
// 編號熱點（pins）與引線標籤（leaders）。一次涵蓋三種在盤點裡各自獨立、實作卻同源的圖例：
//   E1 標註截圖        dataint p25–p28、bullmq p12、nifi p5、tus p13/p14
//   B2 巢狀架構圖熱點  dataint p15、nifi p4
//   A2 引線標註碼塊    mfe p12/p13
//
// 版面策略：**標籤住在保留出來的側欄，不覆蓋 children**（對齊 bullmq p12 —— 截圖置中、
// 標籤在左右留白處）。只有實際用到的那一側才會保留側欄。
//
// 座標一律用百分比（相對**內容區**）—— 寫死 px 會在換 area 或改內容時錯位。
//
// ⚠️ 內容區 = 扣掉側欄後的那格，**不是** children 的視覺範圍。兩者在 children 填滿時一致；
// children 比內容區矮（例如把一個自然高度的 <Code> 放進被拉伸的頁面）時，
// 百分比會算到下方的空白上。解法是讓 <Annotate> 本身不要被拉伸：
//   <Annotate dark={dark} style={{ flex: "none" }}>…</Annotate>
// 這樣內容區就會收合到 children 的高度，座標與眼睛看到的一致。
//
// 刻意不做的事：
//   - **沒有 hover / 點擊**：投影片沒有滑鼠互動，標註必須在靜態畫面上就讀得完
//     （筆記內文的 `:::annotate` 才是可互動的那一套）。
//   - **沒有自動佈局**：不算最短路徑、不避開 children 的內容 —— 那會滑向 mermaid。
//     唯一的自動化是「同一側標籤的縱向避讓」（見 distribute）。

import type { ReactNode } from "react";
import type { SeriesTone } from "@/lib/decks";
import { DS } from "../scale";
import { toneColor } from "../SlideChrome";
import type { BlockBaseProps } from "./shell";
import { BlockShell, dkt, warnOverLimit } from "./shell";

export type AnnSide = "left" | "right" | "top" | "bottom";

export interface AnnPin {
  /** 徽章文字（"1" / "A"）。**必填** —— 元件不會自動編號（audit A-3：編號要編碼真實序列） */
  n: string;
  /** 百分比座標（0–100），相對 children 的顯示框 */
  x: number;
  y: number;
  tone?: SeriesTone;
}

export interface AnnLeader {
  text: string;
  /** 標籤停靠哪一側 */
  side: AnnSide;
  /** 引線指向的點（百分比，相對 children） */
  at: { x: number; y: number };
  /** 標籤沿停靠邊的位置（百分比）。不給就依 `at` 自動分配並避讓 */
  offset?: number;
  tone?: SeriesTone;
}

export interface AnnotateProps extends BlockBaseProps {
  children: ReactNode;
  pins?: AnnPin[];
  leaders?: AnnLeader[];
  /** 左右側欄寬（px @1600 座標系）。預設 200 */
  gutter?: number;
  /** 上下側欄高（px @1600 座標系）。預設 64 */
  gutterV?: number;
  /** 同一側標籤的最小間距（百分比）。預設 11 */
  minGap?: number;
}

/** 建議上限 —— 實測值，見 Task 39 實作記錄 */
const LIMIT_PINS = 8;
const LIMIT_PER_SIDE = 4;

/** 標籤在側欄裡的可用範圍（留邊，避免貼齊角落） */
const RAIL_MIN = 6;
const RAIL_MAX = 94;

/**
 * 同一側標籤的縱向（或橫向）避讓。
 *
 * 先以各自的目標點為期望位置，再做一次「向後推 → 向前推」的最小間距鬆弛 ——
 * 比平均分配好，因為標籤會盡量待在它指的東西旁邊；又比真正的力導向簡單且**結果穩定**
 * （同樣的輸入永遠得到同樣的版面，截圖迴歸才有意義）。
 */
function distribute(desired: number[], minGap: number): number[] {
  const order = desired.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const pos = order.map((o) => Math.min(RAIL_MAX, Math.max(RAIL_MIN, o.v)));

  for (let k = 1; k < pos.length; k++) {
    if (pos[k] - pos[k - 1] < minGap) pos[k] = pos[k - 1] + minGap;
  }
  // 尾端超界就整組往回推，再確保頭端不越界
  const overflow = pos.length ? pos[pos.length - 1] - RAIL_MAX : 0;
  if (overflow > 0) for (let k = 0; k < pos.length; k++) pos[k] -= overflow;
  for (let k = pos.length - 2; k >= 0; k--) {
    if (pos[k + 1] - pos[k] < minGap) pos[k] = pos[k + 1] - minGap;
  }

  const out = new Array<number>(desired.length);
  order.forEach((o, k) => {
    out[o.i] = Math.max(RAIL_MIN, Math.min(RAIL_MAX, pos[k]));
  });
  return out;
}

/** 側欄裡「標籤 → children 邊界」的那一小段直線連接（水平或垂直，不需要 SVG） */
function railConnector(side: AnnSide, color: string) {
  const horizontal = side === "left" || side === "right";
  return {
    flex: 1,
    ...(horizontal
      ? { height: 1, borderTop: `1px dashed ${color}` }
      : { width: 1, borderLeft: `1px dashed ${color}` }),
    opacity: 0.75,
  } as const;
}

export function Annotate({
  dark,
  heading,
  style,
  children,
  pins,
  leaders,
  gutter = 200,
  gutterV = 64,
  minGap = 11,
}: AnnotateProps) {
  const c = dkt(dark);

  const bySide = (s: AnnSide) => (leaders ?? []).filter((l) => l.side === s);
  const sides: AnnSide[] = ["left", "right", "top", "bottom"];
  const used = Object.fromEntries(sides.map((s) => [s, bySide(s).length > 0])) as Record<AnnSide, boolean>;

  warnOverLimit("Annotate/pins", pins?.length ?? 0, LIMIT_PINS);
  for (const s of sides) warnOverLimit(`Annotate/leaders:${s}`, bySide(s).length, LIMIT_PER_SIDE);

  // 每側各自算一組位置：明確給了 offset 就用它，其餘依 at 自動避讓
  const placed = new Map<AnnLeader, number>();
  for (const s of sides) {
    const group = bySide(s);
    if (!group.length) continue;
    const axis = s === "left" || s === "right" ? "y" : "x";
    const auto = distribute(
      group.map((l) => l.offset ?? l.at[axis]),
      minGap,
    );
    group.forEach((l, i) => placed.set(l, l.offset ?? auto[i]));
  }

  /** children 座標系內的引線折線（純軸向線段，故 preserveAspectRatio="none" 不會扭曲角度） */
  const points = (l: AnnLeader): string => {
    const p = placed.get(l) ?? 50;
    const { x, y } = l.at;
    const clamp = (v: number) => Math.max(2, Math.min(98, v));
    if (l.side === "left" || l.side === "right") {
      const edge = l.side === "left" ? 0 : 100;
      const elbow = clamp(l.side === "left" ? x - 8 : x + 8);
      return `${edge},${p} ${elbow},${p} ${elbow},${y} ${x},${y}`;
    }
    const edge = l.side === "top" ? 0 : 100;
    const elbow = clamp(l.side === "top" ? y - 8 : y + 8);
    return `${p},${edge} ${p},${elbow} ${x},${elbow} ${x},${y}`;
  };

  const railStyle = (s: AnnSide) =>
    ({
      position: "relative",
      gridArea: s === "left" ? "2 / 1" : s === "right" ? "2 / 3" : s === "top" ? "1 / 2" : "3 / 2",
    }) as const;

  return (
    <BlockShell heading={heading} c={c} style={style}>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: `${used.left ? gutter : 0}px minmax(0, 1fr) ${used.right ? gutter : 0}px`,
          gridTemplateRows: `${used.top ? gutterV : 0}px minmax(0, 1fr) ${used.bottom ? gutterV : 0}px`,
        }}
      >
        {sides.map((s) => {
          const group = bySide(s);
          if (!group.length) return null;
          const horizontal = s === "left" || s === "right";
          return (
            <div key={s} style={railStyle(s)}>
              {group.map((l, i) => {
                const t = toneColor(l.tone ?? "blue", c);
                const p = placed.get(l) ?? 50;
                return (
                  <div
                    key={`${l.text}-${i}`}
                    style={{
                      position: "absolute",
                      display: "flex",
                      alignItems: "center",
                      ...(horizontal
                        ? { top: `${p}%`, left: 0, right: 0, transform: "translateY(-50%)" }
                        : {
                            left: `${p}%`,
                            top: 0,
                            bottom: 0,
                            transform: "translateX(-50%)",
                            flexDirection: "column",
                            width: gutter,
                          }),
                      // right 側：標籤在外、連接線朝內
                      ...(s === "right" ? { flexDirection: "row-reverse" as const } : null),
                      ...(s === "bottom" ? { flexDirection: "column-reverse" as const } : null),
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        flex: "none",
                        maxWidth: horizontal ? gutter - 40 : gutter,
                        padding: "3px 9px",
                        borderRadius: "var(--radius-sm)",
                        background: t.soft,
                        color: t.fg,
                        border: `1px solid ${t.fg}`,
                        fontSize: DS.micro,
                        fontWeight: 800,
                        lineHeight: 1.4,
                        textAlign: "center",
                      }}
                    >
                      {l.text}
                    </span>
                    <span style={railConnector(s, t.fg)} />
                  </div>
                );
              })}
            </div>
          );
        })}

        <div style={{ gridArea: "2 / 2", position: "relative", minWidth: 0, minHeight: 0 }}>
          {children}

          {/* 引線層：軸向折線 + non-scaling-stroke，故 viewBox 的非等比縮放不影響線寬與角度 */}
          {leaders?.length ? (
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
            >
              {leaders.map((l, i) => (
                <polyline
                  key={`${l.text}-${i}`}
                  points={points(l)}
                  fill="none"
                  stroke={toneColor(l.tone ?? "blue", c).fg}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  opacity={0.85}
                />
              ))}
            </svg>
          ) : null}

          {/* 端點小圓：用 HTML 畫，避免 SVG 非等比縮放把圓拉成橢圓 */}
          {leaders?.map((l, i) => {
            const t = toneColor(l.tone ?? "blue", c);
            return (
              <span
                key={`dot-${l.text}-${i}`}
                style={{
                  position: "absolute",
                  left: `${l.at.x}%`,
                  top: `${l.at.y}%`,
                  transform: "translate(-50%, -50%)",
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: t.fg,
                  border: `2px solid ${c.slide}`,
                  pointerEvents: "none",
                }}
              />
            );
          })}

          {pins?.map((p, i) => {
            const t = toneColor(p.tone ?? "orange", c);
            return (
              <span
                key={`pin-${p.n}-${i}`}
                style={{
                  position: "absolute",
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  transform: "translate(-50%, -50%)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 30,
                  height: 30,
                  padding: "0 6px",
                  borderRadius: 15,
                  background: t.fg,
                  color: "var(--neutral-0)",
                  border: `2px solid ${c.slide}`,
                  fontSize: DS.micro,
                  fontWeight: 900,
                  fontVariantNumeric: "tabular-nums",
                  boxShadow: c.shadow,
                  pointerEvents: "none",
                }}
              >
                {p.n}
              </span>
            );
          })}
        </div>
      </div>
    </BlockShell>
  );
}
