import { useId, useState, type CSSProperties, type ReactNode } from "react";

/*
 * FIG. 1 — 工作台的等角爆炸圖。
 * 平面座標 (u, v) 經等角投影成畫面座標；每一層是同一個平面的子區域，
 * 由下而上分開排列，上層以圖紙底色填滿、遮住下層（隱藏線消除），像真的機構爆炸圖。
 */

const W = 320; // 平面寬（u）
const D = 220; // 平面深（v）
const OX = 250;
const C = 0.866;

type Pt = [number, number];
const P = (u: number, v: number, oy: number): Pt => [OX + C * (u - v), oy + 0.5 * (u + v)];
const pts = (list: Pt[]) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
const MATRIX = (oy: number) => `matrix(${C} 0.5 ${-C} 0.5 ${OX} ${oy})`;

export type Part = {
  ref: number;
  name: string;
  desc: string;
};

export const PARTS: Part[] = [
  { ref: 10, name: "你的 git repo", desc: "md／mdx 筆記、生成元件、資料檔都在同一個 repo 裡，可以 diff、review、回溯。" },
  { ref: 12, name: "三欄工作台", desc: "Rail、真實資料夾樹的 Sidebar 與主區。一行 npx 就開起來，不搬資料夾。" },
  { ref: 14, name: "筆記", desc: "MDX 原文照常渲染；@ai-visualize 標記留在原處，等你處理。" },
  { ref: 16, name: "生成元件", desc: "Claude Code 依標記生成的 React 元件，寫回筆記，可以點、可以拖。" },
  { ref: 18, name: "筆記頁籤", desc: "開過的筆記留在頁籤列，切回來停在上次讀到的地方。" },
  { ref: 20, name: "⌘K 指令面板", desc: "跨頁跳轉，含 pagefind 全文搜尋。" },
];

// 每層在爆炸圖中的 oy（畫面上的垂直位置），以及引線的起點（平面座標）與標號的 y
const LAYER: Record<number, { oy: number; anchor: [number, number]; labelY: number }> = {
  20: { oy: 18, anchor: [262, 64], labelY: 112 },
  18: { oy: 104, anchor: [300, 6], labelY: 214 },
  16: { oy: 196, anchor: [286, 112], labelY: 352 },
  14: { oy: 280, anchor: [318, 190], labelY: 470 },
  12: { oy: 368, anchor: [318, 120], labelY: 566 },
  10: { oy: 452, anchor: [318, 40], labelY: 650 },
};
const BASE_OY = LAYER[10].oy;
const LABEL_X = 650;

type LayerProps = {
  refNo: number;
  active: boolean;
  dim: boolean;
  index: number;
  children: ReactNode;
  outline: Pt[];
  extra?: ReactNode;
};

function Layer({ refNo, active, dim, index, children, outline, extra }: LayerProps) {
  const oy = LAYER[refNo].oy;
  // 進場：各層從疊合的位置往上拉開成爆炸圖（CSS 動畫，prefers-reduced-motion 時直接是終態）
  const style = { "--dy": `${(BASE_OY - oy) * 0.86}px`, "--i": index } as CSSProperties;
  return (
    <g className={`f1-layer${active ? " is-active" : ""}${dim ? " is-dim" : ""}`} data-ref={refNo} style={style}>
      {/* --k：離圖中央的層數；捲動時 --spread 由 0 漸增，各層依 --k 上下拉開 */}
      <g className="f1-spread" style={{ ["--k" as string]: index - 2.5 }}>
      <g className="f1-lift">
      {extra}
      <polygon points={pts(outline)} className="f1-face" />
      <polygon points={pts(outline)} className="f1-glow" />
      <g transform={MATRIX(oy)} className="f1-plane">
        {children}
      </g>
      <polygon points={pts(outline)} className="f1-edge" />
      </g>
      </g>
    </g>
  );
}

const rect = (u0: number, v0: number, u1: number, v1: number, oy: number): Pt[] => [
  P(u0, v0, oy),
  P(u1, v0, oy),
  P(u1, v1, oy),
  P(u0, v1, oy),
];

type Props = {
  initial?: number;
};

export default function Fig1({ initial = 16 }: Props) {
  const [active, setActive] = useState<number>(initial);
  const titleId = useId();
  const activePart = PARTS.find((p) => p.ref === active) ?? PARTS[3];

  const o10 = LAYER[10].oy;
  const o12 = LAYER[12].oy;
  const o14 = LAYER[14].oy;
  const o16 = LAYER[16].oy;
  const o18 = LAYER[18].oy;
  const o20 = LAYER[20].oy;
  const T = 16; // repo 底板厚度

  // 組裝線：從最上層的外框角點垂直落到底板
  const corners: [number, number][] = [
    [0, 0],
    [W, 0],
    [W, D],
    [0, D],
  ];

  const layerOrder = [10, 12, 14, 16, 18, 20];

  return (
    <figure className="f1" aria-labelledby={titleId}>
      <div className="f1-drawing">
        <svg viewBox="0 0 760 740" role="group" aria-label="FIG. 1：NoteCraftApp 工作台的爆炸圖" className="f1-svg">
          {/* 組裝線 */}
          <g className="f1-assembly" aria-hidden="true">
            {corners.map(([u, v]) => {
              const [x, yTop] = P(u, v, o12);
              const [, yBot] = P(u, v, o10);
              return <line key={`${u}-${v}`} x1={x} y1={yTop} x2={x} y2={yBot} />;
            })}
            {[[300, 6] as const, [286, 112] as const].map(([u, v], i) => {
              const [x, y1] = P(u, v, i === 0 ? o18 : o16);
              const [, y2] = P(u, v, o14);
              return <line key={i} x1={x} y1={y1} x2={x} y2={y2} />;
            })}
          </g>

          {/* 10 repo 底板（有厚度） */}
          <Layer
            refNo={10}
            index={0}
           
            active={active === 10}
            dim={active !== 10}
            outline={rect(0, 0, W, D, o10)}
            extra={
              <>
                <polygon
                  className="f1-face f1-side"
                  points={pts([P(0, D, o10), P(W, D, o10), [P(W, D, o10)[0], P(W, D, o10)[1] + T], [P(0, D, o10)[0], P(0, D, o10)[1] + T]])}
                />
                <polygon
                  className="f1-face f1-side"
                  points={pts([P(W, 0, o10), P(W, D, o10), [P(W, D, o10)[0], P(W, D, o10)[1] + T], [P(W, 0, o10)[0], P(W, 0, o10)[1] + T]])}
                />
              </>
            }
          >
            {Array.from({ length: 8 }, (_, i) => {
              const v = 26 + i * 23;
              const tsx = i === 5 || i === 6;
              return (
                <g key={i}>
                  <rect x={22} y={v - 6} width={10} height={12} className={tsx ? "f1-ink-mark" : "f1-ink"} />
                  <line x1={42} y1={v} x2={42 + [150, 120, 180, 96, 140, 110, 128, 88][i]} y2={v} className="f1-ink" />
                </g>
              );
            })}
            <circle cx={270} cy={40} r={6} className="f1-ink" />
            <circle cx={270} cy={90} r={6} className="f1-ink" />
            <circle cx={270} cy={140} r={6} className="f1-ink-mark" />
            <line x1={270} y1={46} x2={270} y2={84} className="f1-ink" />
            <line x1={270} y1={96} x2={270} y2={134} className="f1-ink" />
          </Layer>

          {/* 12 工作台殼 */}
          <Layer refNo={12} index={1} active={active === 12} dim={active !== 12} outline={rect(0, 0, W, D, o12)}>
            <rect x={0} y={0} width={22} height={D} className="f1-ink" />
            <rect x={22} y={0} width={70} height={D} className="f1-ink" />
            <line x1={92} y1={26} x2={W} y2={26} className="f1-ink" />
            {Array.from({ length: 6 }, (_, i) => (
              <line key={i} x1={32 + (i % 3 === 0 ? 0 : 10)} y1={44 + i * 22} x2={80} y2={44 + i * 22} className="f1-ink" />
            ))}
            {[30, 58, 86].map((v) => (
              <rect key={v} x={6} y={v - 5} width={10} height={10} className="f1-ink" />
            ))}
          </Layer>

          {/* 14 筆記 */}
          <Layer refNo={14} index={2} active={active === 14} dim={active !== 14} outline={rect(92, 26, W, D, o14)}>
            {[44, 56, 68].map((v, i) => (
              <line key={v} x1={112} y1={v} x2={[290, 300, 240][i]} y2={v} className="f1-ink" />
            ))}
            <rect x={120} y={86} width={170} height={84} className="f1-ink f1-dash" />
            {[186, 198].map((v, i) => (
              <line key={v} x1={112} y1={v} x2={[296, 262][i]} y2={v} className="f1-ink" />
            ))}
          </Layer>

          {/* 16 生成元件 */}
          <Layer refNo={16} index={3} active={active === 16} dim={active !== 16} outline={rect(120, 86, 290, 170, o16)}>
            <rect x={134} y={108} width={30} height={20} className="f1-ink" />
            <rect x={190} y={108} width={30} height={20} className="f1-ink-mark f1-fill-mark" />
            <rect x={246} y={108} width={30} height={20} className="f1-ink" />
            <line x1={164} y1={118} x2={190} y2={118} className="f1-ink" />
            <line x1={220} y1={118} x2={246} y2={118} className="f1-ink" />
            <path d="M205 128 V150 H149 V128" className="f1-ink f1-dash" />
          </Layer>

          {/* 18 頁籤列 */}
          <Layer refNo={18} index={4} active={active === 18} dim={active !== 18} outline={rect(92, 0, W, 16, o18)}>
            {[92, 142, 192].map((u, i) => (
              <rect key={u} x={u + 4} y={3} width={44} height={10} className={i === 1 ? "f1-ink-mark" : "f1-ink"} />
            ))}
          </Layer>

          {/* 20 ⌘K 指令面板 */}
          <Layer refNo={20} index={5} active={active === 20} dim={active !== 20} outline={rect(130, 30, 274, 120, o20)}>
            <line x1={142} y1={46} x2={262} y2={46} className="f1-ink" />
            {[64, 80, 96, 110].map((v, i) => (
              <line key={v} x1={142} y1={v} x2={[230, 250, 210, 238][i]} y2={v} className={i === 0 ? "f1-ink-mark" : "f1-ink"} />
            ))}
          </Layer>

          {/* 引線與參照編號 */}
          <g className="f1-leaders">
            {layerOrder.map((r) => {
              const { oy, anchor, labelY } = LAYER[r];
              const [ax, ay] = P(anchor[0], anchor[1], oy);
              const x2 = LABEL_X - 12;
              const midX = ax + (x2 - ax) * 0.55;
              return (
                <g
                  key={r}
                  className={`f1-leader f1-spread${active === r ? " is-active" : ""}`}
                  style={{ ["--k" as string]: layerOrder.indexOf(r) - 2.5 }}
                  role="button"
                  tabIndex={0}
                  aria-pressed={active === r}
                  aria-label={`${r}：${PARTS.find((p) => p.ref === r)?.name ?? ""}`}
                  onClick={() => setActive(r)}
                  onMouseEnter={() => setActive(r)}
                  onFocus={() => setActive(r)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setActive(r);
                    }
                  }}
                >
                  <path d={`M${ax} ${ay} Q ${midX} ${ay} ${x2} ${labelY}`} className="f1-leader-line" pathLength={1} />
                  <circle cx={ax} cy={ay} r={3.2} className="f1-leader-dot" />
                  <rect x={LABEL_X - 8} y={labelY - 22} width={64} height={40} className="f1-hit" />
                  <text x={LABEL_X} y={labelY + 9} className="f1-num">
                    {r}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      <figcaption id={titleId} className="f1-caption">
        <span className="fig-no f1-figno">FIG. 1</span>
        <span className="f1-captext">工作台的爆炸圖：由下而上是 repo、殼、筆記、元件、頁籤與指令面板。</span>
      </figcaption>

      <div className="f1-legend" role="group" aria-label="符號說明">
        <ol className="f1-list">
          {PARTS.map((p) => (
            <li key={p.ref}>
              <button
                type="button"
                className={`f1-item${active === p.ref ? " is-active" : ""}`}
                aria-pressed={active === p.ref}
                onClick={() => setActive(p.ref)}
                onMouseEnter={() => setActive(p.ref)}
                onFocus={() => setActive(p.ref)}
              >
                <span className="ref">{p.ref}</span>
                <span className="f1-item-name">{p.name}</span>
              </button>
            </li>
          ))}
        </ol>
        <p className="f1-desc" aria-live="polite">
          <span className="ref">{activePart.ref}</span>
          <span>
            {activePart.desc}
            {activePart.ref === 16 && (
              <>
                {" "}
                <a className="f1-handoff" href="#figures">
                  到 FIG. 2 實際操作它
                </a>
              </>
            )}
          </span>
        </p>
      </div>
    </figure>
  );
}
