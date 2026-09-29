// Dashboard 總覽共用：閱讀狀態三段的常數與 SVG <pattern> defs（規格 §6.1、§7.3）。
// 三態而非 prototype 的四態（PRD：不做「未發佈」）。CSS 底色走 .dv-rs-* class；SVG 走 url(#dvp-*)。
// <pattern> 內的顏色用 style 寫 CSS 變數 —— fill="var(…)" 這種 presentation attribute 在部分瀏覽器不解析。
import type { ReadingKey } from "@/lib/wb-dashboard";

export type ReadingSeg = {
  k: ReadingKey;
  /** 圖例文字 */
  l: string;
  /** CSS 底色的 class（圖例色塊、堆疊長條、進度條） */
  cls: string;
  /** SVG stroke／fill 的值（環形圖） */
  svg: string;
};

export const DV_RS: readonly ReadingSeg[] = [
  { k: "done", l: "已完成", cls: "dv-rs-done", svg: "var(--wb-blue)" },
  { k: "reading", l: "閱讀中", cls: "dv-rs-reading", svg: "url(#dvp-reading)" },
  { k: "not-started", l: "待開始", cls: "dv-rs-ns", svg: "url(#dvp-ns)" },
];

function Hatch({ id, fg, bg }: { id: string; fg: string; bg: string }) {
  return (
    <pattern id={id} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="5" height="5" style={{ fill: bg }} />
      <rect width="1.6" height="5" style={{ fill: fg }} />
    </pattern>
  );
}

/** 一頁只輸出一次（總覽 Body 內）。 */
export function DvPatterns() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        <Hatch id="dvp-reading" fg="var(--wb-gold)" bg="var(--wb-dv-gold-soft)" />
        <Hatch id="dvp-ns" fg="var(--wb-dv-blue-soft-fg)" bg="var(--wb-dv-blue-soft)" />
      </defs>
    </svg>
  );
}
