// <TagCloud> — 文字雲（Task 42）。
//
// 出處：bullmq p4「自行開發面臨的痛點」、tus p3「避免上述狀況需克服以下問題」
// （docs/deck-atoms-inventory.md §2 F1）。兩份都用它把「一堆並列的痛點」
// 聚合成一頁的視覺重量 —— 重點不是每個詞，是「有這麼多」。
//
// **純 flex + 字級權重，不做碰撞佈局、不引 d3-cloud**（inventory §4.2 已決）。
// 效果與 bullmq p4 差距很小，成本是十分之一；而且結果是決定性的，截圖迴歸才比得出差異。

import type { SeriesTone } from "@/lib/decks";
import { DGAP, DS } from "../scale";
import { toneColor } from "../SlideChrome";
import type { BlockBaseProps } from "./shell";
import { BlockShell, dkt, warnOverLimit } from "./shell";

export interface TagItem {
  text: string;
  /**
   * 視覺權重 1–4。**不給就是 2** ——
   * 元件**不會**依字數或順序自動推算權重，那會編碼假資訊（同 audit A-3 精神）。
   */
  weight?: 1 | 2 | 3 | 4;
  tone?: SeriesTone;
}

export interface TagCloudProps extends BlockBaseProps {
  items: TagItem[];
}

/** 建議標籤數上限 —— 實測值，見 Task 42 實作記錄（bullmq p4 約 20 個、tus p3 約 22 個） */
const LIMIT = 22;

/** weight → DS 階梯。四級的跨度要夠大，否則看不出權重差異 */
const SIZE: Record<1 | 2 | 3 | 4, number> = {
  1: DS.small,
  2: DS.h4,
  3: DS.h3,
  4: DS.h2,
};

const WEIGHT: Record<1 | 2 | 3 | 4, number> = { 1: 500, 2: 700, 3: 800, 4: 900 };

export function TagCloud({ dark, heading, style, items }: TagCloudProps) {
  const c = dkt(dark);
  warnOverLimit("TagCloud", items.length, LIMIT);
  if (!items.length) return null;

  return (
    <BlockShell heading={heading} c={c} style={style}>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "center",
          alignContent: "center",
          gap: `${DGAP.xs}px ${DGAP.md}px`,
        }}
      >
        {items.map((it) => {
          const w = it.weight ?? 2;
          // 權重低的用 muted 墨色而不是縮小色彩飽和度 —— 讓「重要的先跳出來」
          const color = it.tone ? toneColor(it.tone, c).fg : w >= 3 ? c.ink : w === 2 ? c.body : c.muted;
          return (
            <span
              key={it.text}
              style={{
                fontSize: SIZE[w],
                fontWeight: WEIGHT[w],
                lineHeight: 1.25,
                color,
                whiteSpace: "nowrap",
              }}
            >
              {it.text}
            </span>
          );
        })}
      </div>
    </BlockShell>
  );
}
