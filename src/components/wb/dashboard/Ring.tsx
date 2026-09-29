// KPI 卡的環形圖（pt-dash2.jsx 的 DvRing）：84×84、半徑 = 84/2 − 8、stroke 12、從 12 點鐘開始，各段之間留 2px。
// parts 為空（SSR／未 hydrate）時只畫底環。aria-hidden：資訊由旁邊的圖例提供。
import type { ReadingSeg } from "./patterns";

export type RingPart = ReadingSeg & { v: number };

export default function Ring({ parts, size = 84 }: { parts: RingPart[]; size?: number }) {
  const S = size;
  const R = S / 2 - 8;
  const C = 2 * Math.PI * R;
  const live = parts.filter((p) => p.v > 0);
  const tot = live.reduce((a, p) => a + p.v, 0);
  const gap = live.length > 1 ? 2 : 0;
  let off = 0;
  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="dv-ring" aria-hidden="true">
      <circle cx={S / 2} cy={S / 2} r={R} fill="none" stroke="var(--wb-line-2)" strokeWidth="12" />
      {tot > 0
        ? live.map((p) => {
            const len = (p.v / tot) * C;
            const el = (
              <circle
                key={p.k}
                cx={S / 2}
                cy={S / 2}
                r={R}
                fill="none"
                stroke={p.svg}
                strokeWidth="12"
                strokeDasharray={`${Math.max(len - gap, 0)} ${C}`}
                strokeDashoffset={-off}
                transform={`rotate(-90 ${S / 2} ${S / 2})`}
              />
            );
            off += len;
            return el;
          })
        : null}
    </svg>
  );
}
