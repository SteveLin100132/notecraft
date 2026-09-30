// 插圖式空狀態（pt-dash.jsx 的 PtEmpty／PtEmptyArt）：更新日誌卡片與 AI 佇列分頁共用。
// 規格 docs/notecraft-workbench-empty-states.md §3。class 沿用 prototype 的 pt-empty*。
// 顏色用 style 寫 CSS 變數 —— fill="var(…)" 這種 presentation attribute 在部分瀏覽器不解析（同 dashboard/patterns.tsx）。
import type { ReactNode } from "react";

type EmptyKind = "log" | "ai";

const B = "var(--wb-blue-l)";
const O = "var(--wb-gold)";
const S = "var(--wb-line)";
const P = "var(--wb-panel)";
const W = "var(--wb-on)";

const GRID = [0, 1, 2, 3].flatMap((c) => [0, 1, 2].map((r) => ({ c, r })));

export function EmptyArt({ kind = "log" }: { kind?: EmptyKind }) {
  if (kind === "ai")
    return (
      <svg width="132" height="104" viewBox="0 0 132 104" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        <ellipse cx="66" cy="94" rx="42" ry="5" opacity=".7" style={{ fill: S }} />
        <rect x="30" y="22" width="60" height="66" rx="7" strokeWidth="2" transform="rotate(-6 60 55)" style={{ fill: P, stroke: S }} />
        <rect x="40" y="16" width="60" height="68" rx="7" strokeWidth="2" style={{ fill: P, stroke: B }} />
        <path d="M50 32h26M50 42h40M50 52h32" strokeWidth="3" style={{ stroke: S }} />
        <circle cx="90" cy="72" r="15" style={{ fill: B }} />
        <path d="M83.5 72.5l4.5 4.5 8.5-9" strokeWidth="2.6" style={{ stroke: W }} />
        <path d="M112 24v10M107 29h10" strokeWidth="2.2" style={{ stroke: O }} />
        <path d="M22 50v6M19 53h6" strokeWidth="2" style={{ stroke: O }} />
        <circle cx="110" cy="52" r="2.2" style={{ fill: O }} />
      </svg>
    );
  return (
    <svg width="132" height="104" viewBox="0 0 132 104" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <ellipse cx="66" cy="94" rx="42" ry="5" opacity=".7" style={{ fill: S }} />
      <rect x="30" y="20" width="66" height="66" rx="8" strokeWidth="2" style={{ fill: P, stroke: B }} />
      <path d="M30 36h66" strokeWidth="2" style={{ stroke: B }} />
      <path d="M44 14v12M82 14v12" strokeWidth="2.4" style={{ stroke: B }} />
      {GRID.map(({ c, r }) => (
        <rect key={`${c}-${r}`} x={40 + c * 12.5} y={45 + r * 12} width="7" height="6" rx="1.5" style={{ fill: S }} />
      ))}
      <circle cx="96" cy="74" r="14" strokeWidth="2.2" style={{ fill: P, stroke: O }} />
      <path d="M96 67v7l5 3" strokeWidth="2.2" style={{ stroke: O }} />
      <path d="M108 20c3 0 5-2 5-5 0 3 2 5 5 5-3 0-5 2-5 5 0-3-2-5-5-5z" style={{ fill: O }} />
      <circle cx="20" cy="46" r="2.2" opacity=".5" style={{ fill: B }} />
    </svg>
  );
}

export default function EmptyState({
  kind = "log",
  title = "",
  sub,
  action,
}: {
  kind?: EmptyKind;
  title?: string;
  sub?: string;
  /** 呼叫端傳入整個元素（例如 <a className="pt-empty-btn">） */
  action?: ReactNode;
}) {
  return (
    <div className="pt-empty">
      <EmptyArt kind={kind} />
      <div className="pt-empty-t">{title}</div>
      {sub ? <div className="pt-empty-s">{sub}</div> : null}
      {action ?? null}
    </div>
  );
}
