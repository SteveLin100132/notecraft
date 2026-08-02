// <LogoRow> — 技術選型的 logo 組合（Task 42）。
//
// 出處（docs/deck-atoms-inventory.md §2 F5）：
//   nifi p3「NiFi + Registry」、tus p5「tus + Uppy」、bullmq p5「BullMQ × Node.js」
// 三份簡報都用「A ＋ B」這個構圖來宣告「這一頁的解法是這兩個東西合起來」。
//
// **不內建任何 logo 資產** —— 元件只負責排列與間隔符號，圖檔由呼叫端給。
// 驗證基準若要用，請用 data-URI 或專案內的相對路徑，不要依賴外部網址。

import { DGAP, DS } from "../scale";
import type { BlockBaseProps } from "./shell";
import { BlockShell, dkt, warnOverLimit } from "./shell";

export interface LogoItem {
  /** 圖檔來源。不給就只顯示 label（有些技術沒有可用的 logo） */
  src?: string;
  /** 圖檔的替代文字，同時是無圖時的顯示文字 */
  label: string;
  /** 圖檔高度（px @1600 座標系）。預設 72 */
  height?: number;
}

export interface LogoRowProps extends BlockBaseProps {
  items: LogoItem[];
  /** 項目之間的符號。預設 "+" */
  separator?: string;
  /** 直排（nifi p3 是上下疊）。預設 false = 橫排 */
  vertical?: boolean;
}

/** 建議上限 —— 超過 3 個就不再是「這兩個東西合起來」，而是一張技術清單，該改用 <Cards> */
const LIMIT = 3;

export function LogoRow({ dark, heading, style, items, separator = "+", vertical = false }: LogoRowProps) {
  const c = dkt(dark);
  warnOverLimit("LogoRow", items.length, LIMIT);
  if (!items.length) return null;

  return (
    <BlockShell heading={heading} c={c} style={style}>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: vertical ? "column" : "row",
          alignItems: "center",
          justifyContent: "center",
          gap: DGAP.md,
        }}
      >
        {items.map((it, i) => (
          <div key={it.label} style={{ display: "contents" }}>
            {i > 0 && (
              <span style={{ flex: "none", fontSize: DS.h2, fontWeight: 300, color: c.muted, lineHeight: 1 }}>
                {separator}
              </span>
            )}
            <div
              style={{
                flex: "none",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: DGAP.xs,
              }}
            >
              {it.src && (
                <img
                  src={it.src}
                  alt={it.label}
                  style={{ display: "block", height: it.height ?? 72, width: "auto" }}
                />
              )}
              <span style={{ fontSize: DS.small, fontWeight: 700, color: it.src ? c.body : c.ink }}>{it.label}</span>
            </div>
          </div>
        ))}
      </div>
    </BlockShell>
  );
}
