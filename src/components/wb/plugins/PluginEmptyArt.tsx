// /plugins 空狀態插圖（handoff design_handoff_plugin_empty_states/source/wb/pt-plempty.jsx 的 PlArt）。
// 規格 docs/notecraft-workbench-plugin-empty-states.md §7.1。與 EmptyState.tsx 的 EmptyArt 同尺度（132×104、地面橢圓、金色點綴），
// 但不併進那支：那是 Dashboard 用的兩張，混進 6 張外掛插圖會讓 Dashboard 的 chunk 一起變大。
// 顏色用 style 寫 CSS 變數 —— fill="var(…)" 這種 presentation attribute 在部分瀏覽器不解析。
import type { CSSProperties, ReactNode } from "react";

export type PluginArtKind = "plug" | "data" | "map" | "nohit" | "off" | "quiet";

const B = "var(--wb-blue-l)";
const O = "var(--wb-gold)";
const S = "var(--wb-line)";
const P = "var(--wb-panel)";
const M = "var(--wb-ink-3)";

const st = (fill: string | null, stroke: string | null = null, sw = 0, extra?: CSSProperties): CSSProperties => ({
  fill: fill ?? "none",
  stroke: stroke ?? "none",
  strokeWidth: sw,
  ...extra,
});
const DASH = { strokeDasharray: "4 4" };

function Plug({ x, y, c }: { x: number; y: number; c: string }) {
  return (
    <g>
      <path d={`M${x - 6} ${y - 10}v8M${x + 6} ${y - 10}v8`} style={st(null, c, 2.4)} />
      <rect x={x - 12} y={y - 2} width="24" height="18" rx="4" style={st(P, c, 2)} />
      <path d={`M${x} ${y + 16}v6`} style={st(null, c, 2)} />
    </g>
  );
}

function Json({ x, y, c, dash = false }: { x: number; y: number; c: string; dash?: boolean }) {
  const d = dash ? DASH : undefined;
  return (
    <g>
      <path d={`M${x} ${y + 7}a7 7 0 0 1 7-7h26l12 12v47a7 7 0 0 1-7 7H${x + 7}a7 7 0 0 1-7-7z`} style={st(P, c, 2, d)} />
      <path d={`M${x + 33} ${y}v12h12`} style={st(null, c, 2, d)} />
      <path
        d={`M${x + 16} ${y + 26}c-4 0-4 3-4 6s-2 4-4 4c2 0 4 1 4 4s0 6 4 6M${x + 29} ${y + 26}c4 0 4 3 4 6s2 4 4 4c-2 0-4 1-4 4s0 6-4 6`}
        style={st(null, dash ? S : O, 2.2)}
      />
    </g>
  );
}

const Spark = () => <path d="M108 20c3 0 5-2 5-5 0 3 2 5 5 5-3 0-5 2-5 5 0-3-2-5-5-5z" style={st(O)} />;

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg width="132" height="104" viewBox="0 0 132 104" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <ellipse cx="66" cy="94" rx="42" ry="5" style={st(S, null, 0, { opacity: 0.7 })} />
      {children}
    </svg>
  );
}

export default function PluginEmptyArt({ kind }: { kind: PluginArtKind }) {
  if (kind === "plug")
    return (
      <Svg>
        <rect x="28" y="22" width="76" height="62" rx="9" style={st(P, B, 2, { strokeDasharray: "5 5" })} />
        <Plug x={66} y={46} c={B} />
        <Spark />
        <path d="M20 48v6M17 51h6" style={st(null, O, 2)} />
        <circle cx="112" cy="58" r="2.2" style={st(O)} />
      </Svg>
    );
  if (kind === "data")
    return (
      <Svg>
        <Json x={26} y={16} c={B} />
        <path d="M78 52h10" style={st(null, S, 2.2, { strokeDasharray: "3 4" })} />
        <circle cx="100" cy="52" r="13" style={st(P, O, 2, DASH)} />
        <path d="M100 47v10M95 52h10" style={st(null, O, 2.2)} />
        <Spark />
      </Svg>
    );
  if (kind === "map")
    return (
      <Svg>
        <Json x={16} y={18} c={B} />
        <path d="M68 52h8M88 52h6" style={st(null, M, 2.2, { strokeDasharray: "3 4" })} />
        <circle cx="82" cy="52" r="2.6" style={st(O)} />
        <Plug x={108} y={44} c={B} />
      </Svg>
    );
  if (kind === "nohit")
    return (
      <Svg>
        <Json x={22} y={16} c={S} dash />
        <circle cx="80" cy="56" r="17" style={st(P, B, 2.2)} />
        <path d="M92 68l12 12" style={st(null, B, 3)} />
        <path d="M74 56h12" style={st(null, O, 2.4)} />
        <Spark />
      </Svg>
    );
  if (kind === "off")
    return (
      <Svg>
        <Plug x={52} y={34} c={M} />
        <rect x="70" y="56" width="40" height="22" rx="11" style={st(S)} />
        <circle cx="81" cy="67" r="7.5" style={st(P, M, 1.6)} />
        <path d="M36 74h20" style={st(null, S, 3)} />
        <path d="M22 44v6M19 47h6" style={st(null, O, 2)} />
      </Svg>
    );
  return (
    <Svg>
      <rect x="34" y="24" width="56" height="62" rx="7" transform="rotate(-6 62 55)" style={st(P, S, 2)} />
      <rect x="42" y="18" width="56" height="64" rx="7" style={st(P, B, 2)} />
      <path d="M52 34h24M52 44h36M52 54h30M52 64h20" style={st(null, S, 3)} />
      <circle cx="108" cy="30" r="2.4" style={st(O)} />
    </Svg>
  );
}
