import type { ReactNode } from "react";
import type { PartKind, PartProps } from "../../lib/figs/types";

/*
 * 爆炸圖的零件庫。每個零件只畫自己那一塊平面上的線稿：座標是平面座標 (0..w, 0..d)，
 * 外面那層 <g> 套等角矩陣（DocFig.tsx）。外框與紙色面由引擎畫，這裡只畫內容。
 * 線一律 vector-effect: non-scaling-stroke（樣式在 doc-fig.css），所以不管零件多大，線寬都一樣。
 *
 * class 語彙：
 *   k  墨線        k2 細線（次要墨）  kd 虛線
 *   km 星芒橙描邊  kf 星芒橙淡填      ki 墨色淡填   ks 選中（深藍實心）
 *   t  斜印小字（等寬）  tm 小字（橙）
 */

type ArtProps = { w: number; d: number; p: PartProps };
type Art = (a: ArtProps) => ReactNode;

const r1 = (n: number) => Math.round(n * 10) / 10;

/** 一組橫線：x0..x1，從 y0 起每 gap 一條；widths 給比例讓線長有變化 */
function rows(x0: number, x1: number, y0: number, n: number, gap: number, cls = "k", widths = [1, 0.72, 0.86, 0.6, 0.94, 0.68]) {
  const out: ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const y = r1(y0 + i * gap);
    out.push(<line key={`r${i}`} x1={x0} y1={y} x2={r1(x0 + (x1 - x0) * widths[i % widths.length])} y2={y} className={cls} />);
  }
  return out;
}

function Text({ x, y, children, cls = "t", size }: { x: number; y: number; children: ReactNode; cls?: string; size?: number }) {
  return (
    <text x={x} y={y} className={cls} style={size ? { fontSize: size } : undefined}>
      {children}
    </text>
  );
}

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const count = (p: PartProps, dflt: number, max = 12) => clamp(Math.round(p.n ?? dflt), 1, max);

/* ── 視窗類 ── */

/** 應用程式視窗：標題列＋可選的 Rail／Sidebar／頁籤列。variant 以空白分隔：rail sidebar tabs */
const windowArt: Art = ({ w, d, p }) => {
  const v = p.variant ?? "rail sidebar";
  const bar = 12;
  const rail = v.includes("rail") ? 14 : 0;
  const side = v.includes("sidebar") ? Math.max(40, w * 0.24) : 0;
  const tabs = v.includes("tabs") ? 10 : 0;
  const mx = rail + side;
  return (
    <>
      <line x1={0} y1={bar} x2={w} y2={bar} className="k" />
      {[6, 12, 18].map((x) => (
        <circle key={x} cx={x} cy={6} r={1.8} className="k" />
      ))}
      {p.text && <Text x={28} y={8.5}>{p.text}</Text>}
      {rail > 0 && (
        <>
          <line x1={rail} y1={bar} x2={rail} y2={d} className="k" />
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={3.5} y={bar + 8 + i * 14} width={7} height={7} className={i === (p.on ?? -1) ? "ks" : "k"} />
          ))}
        </>
      )}
      {side > 0 && (
        <>
          <line x1={mx} y1={bar} x2={mx} y2={d} className="k" />
          {rows(rail + 8, mx - 6, bar + 12, Math.min(8, Math.floor((d - bar - 16) / 13)), 13, "k2")}
        </>
      )}
      {tabs > 0 && (
        <>
          <line x1={mx} y1={bar + tabs} x2={w} y2={bar + tabs} className="k" />
          {[0, 1, 2].map((i) => (
            <rect key={i} x={r1(mx + 4 + i * 40)} y={bar + 2} width={36} height={tabs - 4} className={i === 0 ? "ks" : "k2"} />
          ))}
        </>
      )}
      <rect x={r1(mx + 10)} y={bar + tabs + 10} width={r1(w - mx - 20)} height={r1(d - bar - tabs - 20)} className="k2 kd" />
    </>
  );
};

/** 瀏覽器：網址列＋內容。text 是網址 */
const browserArt: Art = ({ w, d, p }) => (
  <>
    <line x1={0} y1={14} x2={w} y2={14} className="k" />
    {[6, 12, 18].map((x) => (
      <circle key={x} cx={x} cy={7} r={1.8} className="k" />
    ))}
    <rect x={28} y={3.5} width={r1(Math.min(w - 36, 150))} height={7} className="k2" />
    {p.text && <Text x={32} y={9.2} size={6}>{p.text}</Text>}
    {rows(14, w - 14, 30, Math.min(6, Math.floor((d - 40) / 16)), 16, "k2")}
  </>
);

/** 實機畫面的線稿（截圖鋪上前的輪廓）：Rail、Sidebar、頁首與幾張卡 */
const screenArt: Art = ({ w, d }) => {
  const rail = w * 0.045;
  const side = w * 0.2;
  const mx = rail + side;
  const head = d * 0.14;
  return (
    <>
      <line x1={rail} y1={0} x2={rail} y2={d} className="k" />
      <line x1={mx} y1={0} x2={mx} y2={d} className="k" />
      <line x1={mx} y1={head} x2={w} y2={head} className="k" />
      {rows(rail + 6, mx - 6, 14, Math.floor((d - 20) / 14), 14, "k2")}
      {[0, 1, 2].map((i) => (
        <rect key={i} x={r1(mx + 10 + i * ((w - mx - 20) / 3))} y={r1(head + 10)} width={r1((w - mx - 20) / 3 - 8)} height={r1(d * 0.24)} className="k2" />
      ))}
      <rect x={r1(mx + 10)} y={r1(head + d * 0.24 + 20)} width={r1(w - mx - 20)} height={r1(d - head - d * 0.24 - 30)} className="k2" />
    </>
  );
};

const railArt: Art = ({ d, p }) => (
  <>
    {[0, 1, 2, 3, 4].map((i) => (
      <rect key={i} x={3} y={10 + i * Math.min(18, (d - 20) / 5)} width={8} height={8} className={i === (p.on ?? 0) ? "ks" : "k"} />
    ))}
  </>
);

/** 資料夾樹／系列／標籤：縮排的列；on 為所在列 */
const sidebarArt: Art = ({ w, d, p }) => {
  const n = count(p, Math.floor((d - 12) / 14), 14);
  const ind = [0, 8, 8, 16, 0, 8, 0, 8, 16, 8, 0, 8, 8, 0];
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const y = 10 + i * ((d - 14) / n);
        const x = 8 + ind[i % ind.length];
        const on = i === p.on;
        return (
          <g key={i}>
            <rect x={x} y={r1(y - 3)} width={5} height={5} className={on ? "ks" : "k2"} />
            <line x1={x + 9} y1={r1(y - 0.5)} x2={r1(Math.min(w - 8, x + 9 + (w - x - 20) * [0.8, 0.6, 0.7, 0.5][i % 4]))} y2={r1(y - 0.5)} className={on ? "k" : "k2"} />
          </g>
        );
      })}
    </>
  );
};

/** 筆記列表：每列標題線＋右側 chip；on 為選中列（填深藍底） */
const listArt: Art = ({ w, d, p }) => {
  const n = count(p, 6, 14);
  const h = (d - 8) / n;
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const y = 4 + i * h;
        const on = i === p.on;
        return (
          <g key={i}>
            {on && <rect x={2} y={r1(y)} width={w - 4} height={r1(h - 2)} className="kt" />}
            <line x1={10} y1={r1(y + h / 2)} x2={r1(w * [0.55, 0.42, 0.5, 0.36][i % 4])} y2={r1(y + h / 2)} className={on ? "k" : "k"} />
            <rect x={r1(w - 54)} y={r1(y + h / 2 - 3)} width={18} height={6} className="k2" />
            <rect x={r1(w - 30)} y={r1(y + h / 2 - 3)} width={20} height={6} className={i % 3 === 0 ? "kf" : "k2"} />
            {i < n - 1 && <line x1={4} y1={r1(y + h - 1)} x2={w - 4} y2={r1(y + h - 1)} className="k2" />}
          </g>
        );
      })}
    </>
  );
};

/** Board：三欄卡片（未開始／閱讀中／已完成） */
const boardArt: Art = ({ w, d, p }) => {
  const cols = clamp(p.n ?? 3, 2, 4);
  const cw = (w - 8) / cols;
  const per = [3, 2, 4, 1];
  return (
    <>
      {Array.from({ length: cols }, (_, c) => (
        <g key={c}>
          <line x1={r1(4 + c * cw + 4)} y1={10} x2={r1(4 + c * cw + cw * 0.5)} y2={10} className="k" />
          {Array.from({ length: per[c % 4] }, (_, i) => (
            <rect key={i} x={r1(4 + c * cw + 4)} y={r1(18 + i * ((d - 24) / 4))} width={r1(cw - 8)} height={r1((d - 24) / 4 - 6)} className={c === p.on && i === 0 ? "ks" : "k"} />
          ))}
        </g>
      ))}
    </>
  );
};

/** 表格：表頭粗線＋格線 */
const tableArt: Art = ({ w, d, p }) => {
  const cols = clamp(p.items?.length ?? p.n ?? 4, 2, 6);
  const nrows = Math.max(3, Math.floor((d - 16) / 16));
  return (
    <>
      <line x1={0} y1={16} x2={w} y2={16} className="k kb" />
      {p.items?.map((t, i) => (
        <Text key={t} x={r1(6 + (i * w) / cols)} y={11} size={7}>
          {t}
        </Text>
      ))}
      {Array.from({ length: nrows - 1 }, (_, i) => (
        <line key={i} x1={0} y1={r1(16 + (i + 1) * ((d - 16) / nrows))} x2={w} y2={r1(16 + (i + 1) * ((d - 16) / nrows))} className="k2" />
      ))}
      {Array.from({ length: cols - 1 }, (_, i) => (
        <line key={`c${i}`} x1={r1(((i + 1) * w) / cols)} y1={16} x2={r1(((i + 1) * w) / cols)} y2={d} className="k2" />
      ))}
      {(p.on ?? -1) >= 0 && <rect x={0} y={r1(16 + (p.on ?? 0) * ((d - 16) / nrows))} width={w} height={r1((d - 16) / nrows)} className="ks" />}
    </>
  );
};

/** Timeline：橫軸＋事件點；on 為選中點 */
const timelineArt: Art = ({ w, d, p }) => {
  const n = count(p, 5, 10);
  const y = d * 0.55;
  return (
    <>
      <line x1={8} y1={y} x2={w - 8} y2={y} className="k" />
      {Array.from({ length: n }, (_, i) => {
        const x = 16 + (i * (w - 32)) / Math.max(1, n - 1);
        const up = i % 2 === 0;
        return (
          <g key={i}>
            <circle cx={r1(x)} cy={y} r={3.2} className={i === p.on ? "ks" : "k"} />
            <line x1={r1(x)} y1={up ? y - 6 : y + 6} x2={r1(x)} y2={up ? y - 18 : y + 18} className="k2" />
            <line x1={r1(x - 10)} y1={up ? y - 22 : y + 22} x2={r1(x + 14)} y2={up ? y - 22 : y + 22} className="k2" />
          </g>
        );
      })}
    </>
  );
};

/** 儀表板：上排 KPI 卡（環形圖）＋下排兩張卡 */
const kpiArt: Art = ({ w, d }) => {
  const cw = (w - 16) / 3;
  const h1 = d * 0.36;
  return (
    <>
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={r1(4 + i * (cw + 4))} y={4} width={r1(cw)} height={r1(h1)} className="k" />
          {i === 0 ? (
            <circle cx={r1(4 + cw * 0.3)} cy={r1(4 + h1 / 2)} r={r1(Math.min(cw, h1) * 0.26)} className="km" />
          ) : (
            <line x1={r1(10 + i * (cw + 4))} y1={r1(4 + h1 * 0.4)} x2={r1(4 + i * (cw + 4) + cw * 0.55)} y2={r1(4 + h1 * 0.4)} className="k" />
          )}
          <line x1={r1(4 + i * (cw + 4) + cw * 0.56)} y1={r1(4 + h1 * 0.66)} x2={r1(4 + i * (cw + 4) + cw - 8)} y2={r1(4 + h1 * 0.66)} className="k2" />
        </g>
      ))}
      <rect x={4} y={r1(h1 + 10)} width={r1(w * 0.56)} height={r1(d - h1 - 14)} className="k" />
      {rows(12, w * 0.56 - 4, h1 + 22, Math.floor((d - h1 - 24) / 12), 12, "k2")}
      <rect x={r1(w * 0.56 + 8)} y={r1(h1 + 10)} width={r1(w * 0.44 - 12)} height={r1(d - h1 - 14)} className="k" />
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const bh = [0.5, 0.8, 0.35, 0.9, 0.6, 0.7][i] * (d - h1 - 30);
        return <rect key={i} x={r1(w * 0.56 + 16 + i * ((w * 0.44 - 28) / 6))} y={r1(d - 8 - bh)} width={r1((w * 0.44 - 28) / 6 - 3)} height={r1(bh)} className={i === 3 ? "kf" : "k2"} />;
      })}
    </>
  );
};

/** 長條圖 */
const chartArt: Art = ({ w, d, p }) => {
  const n = count(p, 8, 16);
  const hs = [0.42, 0.7, 0.3, 0.86, 0.55, 0.64, 0.38, 0.78, 0.5, 0.9, 0.34, 0.6];
  const bw = (w - 20) / n;
  return (
    <>
      <line x1={8} y1={d - 8} x2={w - 6} y2={d - 8} className="k" />
      <line x1={8} y1={8} x2={8} y2={d - 8} className="k" />
      {Array.from({ length: n }, (_, i) => {
        const h = hs[i % hs.length] * (d - 22);
        return <rect key={i} x={r1(12 + i * bw)} y={r1(d - 8 - h)} width={r1(bw - 3)} height={r1(h)} className={i === (p.on ?? -1) ? "kf" : "k2"} />;
      })}
    </>
  );
};

/** 月曆：7 欄 × 5 列，格子裡有小色塊；on 為選中格 */
const calendarArt: Art = ({ w, d, p }) => {
  const cw = (w - 8) / 7;
  const ch = (d - 18) / 5;
  const dots = [1, 0, 2, 0, 1, 3, 0, 0, 2, 1, 0, 1, 0, 2, 1, 0, 0, 3, 1, 0, 2, 1, 0, 0, 1, 2, 0, 1, 1, 0, 2, 0, 1, 0, 1];
  return (
    <>
      {rows(6, w * 0.4, 8, 1, 0, "k")}
      {Array.from({ length: 35 }, (_, i) => {
        const x = 4 + (i % 7) * cw;
        const y = 14 + Math.floor(i / 7) * ch;
        return (
          <g key={i}>
            <rect x={r1(x)} y={r1(y)} width={r1(cw)} height={r1(ch)} className={i === p.on ? "kt" : "k2"} />
            {Array.from({ length: dots[i] }, (_, k) => (
              <rect key={k} x={r1(x + 3 + k * 5)} y={r1(y + ch - 7)} width={3.5} height={3.5} className={k === 0 && i % 4 === 0 ? "ks" : "kf"} />
            ))}
          </g>
        );
      })}
    </>
  );
};

/** 頁籤列：n 個頁籤，on 為作用中；variant "pin" 時第一個帶圖釘 */
const tabsArt: Art = ({ w, d, p }) => {
  const n = count(p, 4, 8);
  const tw = Math.min(64, (w - 24) / n);
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <g key={i}>
          <rect x={r1(4 + i * tw)} y={2} width={r1(tw - 3)} height={r1(d - 4)} className={i === (p.on ?? 0) ? "ks" : "k"} />
          {p.variant === "pin" && i === 0 && <circle cx={r1(10 + i * tw)} cy={r1(d / 2)} r={1.8} className="km" />}
          <line x1={r1(4 + i * tw + tw - 10)} y1={r1(d / 2 - 2)} x2={r1(4 + i * tw + tw - 7)} y2={r1(d / 2 + 1)} className="k2" />
        </g>
      ))}
      <rect x={r1(w - 16)} y={2} width={12} height={r1(d - 4)} className="k2" />
    </>
  );
};

/** ⌘K 指令面板：搜尋框＋結果列；text 是輸入的字 */
const paletteArt: Art = ({ w, d, p }) => {
  const n = count(p, 5, 8);
  return (
    <>
      <rect x={6} y={6} width={w - 12} height={16} className="k" />
      <circle cx={14} cy={14} r={3} className="k" />
      {p.text && <Text x={22} y={16.5}>{p.text}</Text>}
      {Array.from({ length: n }, (_, i) => {
        const y = 32 + i * ((d - 38) / n);
        return (
          <g key={i}>
            {i === (p.on ?? 0) && <rect x={6} y={r1(y - 5)} width={w - 12} height={r1((d - 38) / n - 2)} className="kt" />}
            <rect x={10} y={r1(y - 2)} width={5} height={5} className="k2" />
            <line x1={20} y1={r1(y + 0.5)} x2={r1(w * [0.62, 0.5, 0.7, 0.44][i % 4])} y2={r1(y + 0.5)} className="k" />
          </g>
        );
      })}
    </>
  );
};

/** 右側 Drawer：標題、摘要、metadata 列與按鈕 */
const drawerArt: Art = ({ w, d }) => (
  <>
    <line x1={8} y1={12} x2={w * 0.7} y2={12} className="k" />
    <rect x={8} y={20} width={30} height={8} className="ks" />
    <rect x={42} y={20} width={30} height={8} className="k" />
    {rows(8, w - 8, 40, 3, 9, "k2")}
    <line x1={6} y1={72} x2={w - 6} y2={72} className="k2" />
    {Array.from({ length: Math.max(2, Math.floor((d - 84) / 13)) }, (_, i) => (
      <g key={i}>
        <line x1={8} y1={84 + i * 13} x2={30} y2={84 + i * 13} className="k2" />
        <line x1={40} y1={84 + i * 13} x2={r1(w * [0.8, 0.6, 0.7][i % 3])} y2={84 + i * 13} className="k" />
      </g>
    ))}
  </>
);

/** 對話框：標題、欄位、主按鈕（橙） */
const modalArt: Art = ({ w, d, p }) => {
  const n = count(p, 3, 6);
  return (
    <>
      <line x1={10} y1={14} x2={w * 0.45} y2={14} className="k" />
      <line x1={w - 16} y1={9} x2={w - 10} y2={15} className="k" />
      <line x1={w - 10} y1={9} x2={w - 16} y2={15} className="k" />
      {Array.from({ length: n }, (_, i) => {
        const y = 28 + i * ((d - 56) / n);
        return (
          <g key={i}>
            <line x1={10} y1={r1(y)} x2={40} y2={r1(y)} className="k2" />
            <rect x={10} y={r1(y + 4)} width={w - 20} height={10} className="k" />
          </g>
        );
      })}
      <rect x={r1(w - 58)} y={r1(d - 20)} width={48} height={12} className="kf" />
      <rect x={r1(w - 100)} y={r1(d - 20)} width={36} height={12} className="k2" />
    </>
  );
};

/* ── 檔案與原始碼 ── */

/** 一份筆記檔：折角、檔名、內文線；variant "marker" 時中間有一塊 @ai-visualize 虛線框，"h" 時有標題層級 */
const fileArt: Art = ({ w, d, p }) => {
  const fold = Math.min(18, w * 0.16);
  const v = p.variant ?? "";
  const lines = Math.max(2, Math.floor((d - 30) / 11));
  return (
    <>
      <path d={`M${w - fold} 0 V${fold} H${w}`} className="k" />
      {p.text && <Text x={8} y={11}>{p.text}</Text>}
      {v.includes("h") && <line x1={8} y1={20} x2={r1(w * 0.55)} y2={20} className="k kb" />}
      {v.includes("marker") ? (
        <>
          {rows(8, w - 10, 30, 2, 10, "k2")}
          <rect x={8} y={r1(d * 0.42)} width={r1(w - 18)} height={r1(d * 0.3)} className="km kd" />
          <Text x={12} y={r1(d * 0.42 + 10)} cls="tm">@ai-visualize</Text>
          {rows(8, w - 10, d * 0.82, 2, 9, "k2")}
        </>
      ) : (
        rows(8, w - 10, v.includes("h") ? 32 : 24, lines, 11, "k2")
      )}
    </>
  );
};

/** 資料夾：前片＋標籤；text 是資料夾名 */
const folderArt: Art = ({ w, d, p }) => (
  <>
    <path d={`M0 10 H${r1(w * 0.36)} L${r1(w * 0.42)} 4 H${w}`} className="k" />
    <line x1={0} y1={18} x2={w} y2={18} className="k" />
    {p.text && <Text x={8} y={r1(Math.min(d - 6, 32))}>{p.text}</Text>}
    {Array.from({ length: Math.max(0, Math.min(4, Math.floor((d - 40) / 14))) }, (_, i) => (
      <rect key={i} x={r1(10 + i * 6)} y={r1(40 + i * 10)} width={r1(w - 30)} height={10} className="k2" />
    ))}
  </>
);

/** 檔案樹：items 是每一列的名稱，以前導空白表示縮排；on 為選中列 */
const treeArt: Art = ({ w, d, p }) => {
  const items = p.items ?? ["docs/", "  guides/", "    flow.mdx", "  hello.md", "series.json"];
  const h = Math.min(16, (d - 8) / items.length);
  return (
    <>
      {items.map((raw, i) => {
        const depth = (raw.length - raw.trimStart().length) / 2;
        const name = raw.trim();
        const x = 8 + depth * 12;
        const y = 8 + i * h + h / 2;
        const dir = name.endsWith("/");
        return (
          <g key={`${raw}${i}`}>
            {depth > 0 && <path d={`M${x - 8} ${r1(y - h)} V${r1(y)} H${x - 2}`} className="k2" />}
            {dir ? <path d={`M${x} ${r1(y + 3)} V${r1(y - 3)} H${x + 3} L${x + 4.5} ${r1(y - 1.5)} H${x + 8} V${r1(y + 3)} Z`} className={i === p.on ? "ks" : "k"} /> : <rect x={x} y={r1(y - 3.5)} width={6} height={7} className={i === p.on ? "ks" : "k2"} />}
            <Text x={x + 11} y={r1(y + 2.5)} cls={i === p.on ? "t tb" : "t"}>
              {name}
            </Text>
          </g>
        );
      })}
    </>
  );
};

/** 終端機：提示符＋指令列；items 是每一列（第一列前面自動加 $），text 是單一指令 */
const terminalArt: Art = ({ w, d, p }) => {
  const lines = p.items ?? (p.text ? [p.text] : ["npx notecraftapp view"]);
  return (
    <>
      <line x1={0} y1={12} x2={w} y2={12} className="k" />
      {[6, 12, 18].map((x) => (
        <circle key={x} cx={x} cy={6} r={1.8} className="k" />
      ))}
      {lines.slice(0, Math.floor((d - 18) / 12)).map((t, i) => (
        <g key={`${t}${i}`}>
          {i === 0 || t.startsWith("$") ? <Text x={8} y={26 + i * 12} cls="tm">$</Text> : null}
          <Text x={16} y={26 + i * 12}>{t.replace(/^\$\s*/, "")}</Text>
        </g>
      ))}
      <rect x={16} y={r1(Math.min(d - 10, 20 + lines.length * 12))} width={5} height={7} className="kf" />
    </>
  );
};

/** JSON 卡：大括號＋鍵值列；text 是檔名，items 是鍵名 */
const jsonArt: Art = ({ w, d, p }) => {
  const keys = p.items ?? [];
  const n = keys.length || count(p, 4, 8);
  const h = Math.min(13, (d - 30) / n);
  return (
    <>
      {p.text && <Text x={8} y={11}>{p.text}</Text>}
      <Text x={8} y={26} size={10}>{"{"}</Text>
      {Array.from({ length: n }, (_, i) => {
        const y = 34 + i * h;
        return (
          <g key={i}>
            {keys[i] ? (
              <Text x={18} y={r1(y + 2)} cls={i === p.on ? "tm" : "t"}>
                {`"${keys[i]}"`}
              </Text>
            ) : (
              <line x1={18} y1={r1(y)} x2={50} y2={r1(y)} className="k" />
            )}
            <line x1={r1(Math.min(w * 0.55, 24 + (keys[i]?.length ?? 4) * 5.2))} y1={r1(y)} x2={r1(w * [0.8, 0.66, 0.74, 0.6][i % 4])} y2={r1(y)} className="k2" />
          </g>
        );
      })}
      <Text x={8} y={r1(Math.min(d - 4, 40 + n * h))} size={10}>{"}"}</Text>
    </>
  );
};

/** 程式碼：縮排的程式碼列；on 為高亮列 */
const codeArt: Art = ({ w, d, p }) => {
  const n = count(p, Math.floor((d - 16) / 10), 14);
  const ind = [0, 1, 2, 2, 1, 2, 3, 2, 1, 0, 1, 1, 0, 0];
  return (
    <>
      {p.text && <Text x={8} y={11}>{p.text}</Text>}
      {Array.from({ length: n }, (_, i) => {
        const y = (p.text ? 22 : 10) + i * ((d - (p.text ? 26 : 14)) / n);
        const x = 16 + ind[i % ind.length] * 8;
        return (
          <g key={i}>
            {i === p.on && <rect x={4} y={r1(y - 4)} width={w - 8} height={8} className="kt" />}
            <line x1={6} y1={r1(y)} x2={9} y2={r1(y)} className="k2" />
            <line x1={x} y1={r1(y)} x2={r1(Math.min(w - 8, x + (w - x) * [0.5, 0.7, 0.35, 0.6, 0.45][i % 5]))} y2={r1(y)} className={i % 3 === 0 ? "kb k" : "k"} />
          </g>
        );
      })}
    </>
  );
};

/** Diff：新增列（淡藍）、刪除列（斜線）、上下文 */
const diffArt: Art = ({ w, d, p }) => {
  const pat = p.items ?? [" ", " ", "-", "+", "+", " ", "+", " "];
  const h = (d - 8) / pat.length;
  return (
    <>
      {pat.map((s, i) => {
        const y = 4 + i * h;
        return (
          <g key={i}>
            {s === "+" && <rect x={2} y={r1(y)} width={w - 4} height={r1(h - 1)} className="kt" />}
            {s === "-" && <rect x={2} y={r1(y)} width={w - 4} height={r1(h - 1)} className="k2 kd" />}
            <Text x={6} y={r1(y + h / 2 + 2.5)} cls={s === "+" ? "t tb" : "t"}>
              {s === " " ? "" : s}
            </Text>
            <line x1={16} y1={r1(y + h / 2)} x2={r1(w * [0.7, 0.5, 0.62, 0.8, 0.44][i % 5])} y2={r1(y + h / 2)} className={s === " " ? "k2" : "k"} />
          </g>
        );
      })}
    </>
  );
};

/* ── 流程與 AI ── */

/** 流程節點：n 個節點橫排、箭頭相連；on 為作用中（深藍），之前的已完成（淡藍）；dashed 讓最後一個是虛線；items 是節點名 */
const flowArt: Art = ({ w, d, p }) => {
  const n = p.items?.length ?? count(p, 4, 6);
  const nw = Math.min(64, (w - 16 - (n - 1) * 12) / n);
  const gapX = n > 1 ? (w - 16 - n * nw) / (n - 1) : 0;
  const nh = Math.min(30, d * 0.42);
  const y = (d - nh) / 2;
  const on = p.on ?? -1;
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const x = 8 + i * (nw + gapX);
        const cls = i === on ? "ks" : i < on ? "kt" : p.dashed && i === n - 1 ? "km kd" : "k";
        return (
          <g key={i}>
            <rect x={r1(x)} y={r1(y)} width={r1(nw)} height={r1(nh)} className={cls} />
            {p.items?.[i] ? (
              <Text x={r1(x + 4)} y={r1(y + nh / 2 + 2.5)} cls={i === on ? "t tw" : "t"}>
                {p.items[i]}
              </Text>
            ) : (
              <line x1={r1(x + 6)} y1={r1(y + nh / 2)} x2={r1(x + nw - 8)} y2={r1(y + nh / 2)} className={i === on ? "kw" : "k2"} />
            )}
            {i < n - 1 && (
              <>
                <line x1={r1(x + nw + 2)} y1={r1(d / 2)} x2={r1(x + nw + gapX - 3)} y2={r1(d / 2)} className="k" />
                <path d={`M${r1(x + nw + gapX - 6)} ${r1(d / 2 - 2.5)} L${r1(x + nw + gapX - 2.5)} ${r1(d / 2)} L${r1(x + nw + gapX - 6)} ${r1(d / 2 + 2.5)}`} className="k" />
              </>
            )}
          </g>
        );
      })}
    </>
  );
};

/** AI 生成出來的互動元件（星芒橙）：variant "flow" | "chart" | "slider" | "table" */
const componentArt: Art = ({ w, d, p }) => {
  const v = p.variant ?? "flow";
  return (
    <>
      <line x1={0} y1={12} x2={w} y2={12} className="km" />
      {p.text && <Text x={8} y={9} cls="tm">{p.text}</Text>}
      <rect x={r1(w - 14)} y={3} width={8} height={6} className="km" />
      {v === "chart" &&
        [0.5, 0.8, 0.4, 0.9, 0.6].map((h, i) => (
          <rect key={i} x={r1(12 + i * ((w - 24) / 5))} y={r1(d - 8 - h * (d - 30))} width={r1((w - 24) / 5 - 6)} height={r1(h * (d - 30))} className={i === 3 ? "kf" : "km"} />
        ))}
      {v === "slider" && (
        <>
          <line x1={12} y1={r1(d * 0.62)} x2={w - 12} y2={r1(d * 0.62)} className="km" />
          <circle cx={r1(w * 0.6)} cy={r1(d * 0.62)} r={4.5} className="kf" />
          {rows(12, w - 12, 22, 2, 9, "k2")}
        </>
      )}
      {v === "table" && (
        <>
          <line x1={6} y1={26} x2={w - 6} y2={26} className="km" />
          {rows(6, w - 6, 38, Math.floor((d - 42) / 10), 10, "k2", [1])}
          <rect x={6} y={44} width={w - 12} height={9} className="kf" />
        </>
      )}
      {v === "flow" &&
        [0, 1, 2].map((i) => {
          const nw = (w - 40) / 3;
          const x = 10 + i * (nw + 10);
          return (
            <g key={i}>
              <rect x={r1(x)} y={r1(d * 0.4)} width={r1(nw)} height={r1(d * 0.3)} className={i === 1 ? "kf" : "km"} />
              {i < 2 && <line x1={r1(x + nw)} y1={r1(d * 0.55)} x2={r1(x + nw + 10)} y2={r1(d * 0.55)} className="km" />}
            </g>
          );
        })}
    </>
  );
};

/** @ai-visualize 標記原文：id／type／prompt／status 四列；on 為強調的欄位 */
const markerArt: Art = ({ w, d, p }) => {
  const keys = p.items ?? ["id", "type", "prompt", "status"];
  const h = Math.min(14, (d - 20) / keys.length);
  return (
    <>
      <Text x={8} y={11} cls="tm">{"{/* @ai-visualize"}</Text>
      {keys.map((k, i) => (
        <g key={k}>
          {i === p.on && <rect x={4} y={r1(16 + i * h)} width={w - 8} height={r1(h - 1)} className="kt" />}
          <Text x={12} y={r1(16 + i * h + h / 2 + 2.5)} cls={i === p.on ? "t tb" : "t"}>{`${k}:`}</Text>
          <line x1={r1(18 + k.length * 5)} y1={r1(16 + i * h + h / 2)} x2={r1(w * [0.7, 0.5, 0.86, 0.6][i % 4])} y2={r1(16 + i * h + h / 2)} className="k2" />
        </g>
      ))}
      <Text x={8} y={r1(Math.min(d - 3, 26 + keys.length * h))} cls="tm">{"*/}"}</Text>
    </>
  );
};

/** 簡報：一疊 16:9 頁；on 為目前頁；variant "play" 時加播放列 */
const slidesArt: Art = ({ w, d, p }) => {
  const n = count(p, 3, 5);
  const sw = w - (n - 1) * 10 - 8;
  const sh = Math.min(d - (n - 1) * 8 - 8, sw * 0.5625);
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const k = n - 1 - i;
        const x = 4 + k * 10;
        const y = 4 + k * 8;
        return (
          <g key={i}>
            <rect x={r1(x)} y={r1(y)} width={r1(sw)} height={r1(sh)} className={k === 0 ? "k kp" : "k2 kp"} />
            {k === 0 && (
              <>
                <line x1={r1(x + 10)} y1={r1(y + 12)} x2={r1(x + sw * 0.5)} y2={r1(y + 12)} className="k" />
                <rect x={r1(x + 10)} y={r1(y + 20)} width={r1(sw * 0.4)} height={r1(sh - 30)} className="k2" />
                <rect x={r1(x + sw * 0.5)} y={r1(y + 20)} width={r1(sw * 0.44)} height={r1(sh - 30)} className={p.variant === "play" ? "km" : "k2"} />
              </>
            )}
          </g>
        );
      })}
      {p.variant === "play" && <path d={`M${r1(w / 2 - 4)} ${r1(sh / 2)} l8 5 l-8 5 z`} className="kf" />}
    </>
  );
};

/** 標籤 chip：items 是標籤字；on 為選中 */
const chipsArt: Art = ({ w, d, p }) => {
  const items = p.items ?? ["oauth", "http", "cache", "ai", "plugin"];
  let x = 6;
  let y = 6;
  return (
    <>
      {items.map((t, i) => {
        const cw = 10 + t.length * 5.4;
        if (x + cw > w - 6) {
          x = 6;
          y += 16;
        }
        const el = (
          <g key={t}>
            <rect x={r1(x)} y={r1(y)} width={r1(cw)} height={11} className={i === p.on ? "ks" : "k"} />
            <Text x={r1(x + 5)} y={r1(y + 8)} cls={i === p.on ? "t tw" : "t"}>
              {t}
            </Text>
          </g>
        );
        x += cw + 5;
        return y + 11 <= d ? el : null;
      })}
    </>
  );
};

/** 盾牌：安全／權限 */
const shieldArt: Art = ({ w, d }) => {
  const cx = w / 2;
  const s = Math.min(w, d) * 0.4;
  return (
    <>
      <path d={`M${r1(cx)} ${r1(d / 2 - s)} L${r1(cx + s * 0.8)} ${r1(d / 2 - s * 0.6)} V${r1(d / 2)} Q${r1(cx + s * 0.8)} ${r1(d / 2 + s * 0.7)} ${r1(cx)} ${r1(d / 2 + s)} Q${r1(cx - s * 0.8)} ${r1(d / 2 + s * 0.7)} ${r1(cx - s * 0.8)} ${r1(d / 2)} V${r1(d / 2 - s * 0.6)} Z`} className="k" />
      <path d={`M${r1(cx - s * 0.32)} ${r1(d / 2)} l${r1(s * 0.24)} ${r1(s * 0.26)} l${r1(s * 0.44)} ${r1(-s * 0.5)}`} className="km" />
    </>
  );
};

/** ER 圖：三張資料表與關聯線 */
const erArt: Art = ({ w, d }) => {
  const tw = w * 0.28;
  const t = (x: number, y: number, h: number, hl = false) => (
    <g>
      <rect x={r1(x)} y={r1(y)} width={r1(tw)} height={r1(h)} className={hl ? "km" : "k"} />
      <line x1={r1(x)} y1={r1(y + 10)} x2={r1(x + tw)} y2={r1(y + 10)} className={hl ? "km" : "k"} />
      {rows(x + 5, x + tw - 5, y + 18, Math.floor((h - 16) / 8), 8, "k2")}
    </g>
  );
  return (
    <>
      {t(6, 8, d * 0.5)}
      {t(w / 2 - tw / 2, d * 0.38, d * 0.52, true)}
      {t(w - tw - 6, 10, d * 0.44)}
      <path d={`M${r1(6 + tw)} ${r1(d * 0.25)} H${r1(w / 2 - tw / 4)} V${r1(d * 0.38)}`} className="k" />
      <path d={`M${r1(w - tw - 6)} ${r1(d * 0.3)} H${r1(w / 2 + tw / 4)} V${r1(d * 0.38)}`} className="k" />
    </>
  );
};

/** OpenAPI：端點列，前面是 method 色塊；items 是 method */
const apiArt: Art = ({ w, d, p }) => {
  const methods = p.items ?? ["GET", "POST", "GET", "PUT", "DELETE"];
  const h = Math.min(18, (d - 8) / methods.length);
  return (
    <>
      {methods.map((m, i) => (
        <g key={i}>
          <rect x={6} y={r1(6 + i * h)} width={28} height={r1(h - 5)} className={i === (p.on ?? -1) ? "ks" : m === "POST" ? "kf" : "k"} />
          <Text x={9} y={r1(6 + i * h + (h - 5) / 2 + 2.5)} cls={i === (p.on ?? -1) ? "t tw" : "t"}>
            {m}
          </Text>
          <line x1={40} y1={r1(6 + i * h + (h - 5) / 2)} x2={r1(w * [0.7, 0.55, 0.8, 0.6, 0.66][i % 5])} y2={r1(6 + i * h + (h - 5) / 2)} className="k" />
        </g>
      ))}
    </>
  );
};

/** npm 套件盒：立方體標誌＋名稱；text 是套件名 */
const packageArt: Art = ({ w, d, p }) => {
  const s = Math.min(w, d) * 0.3;
  const cx = w * 0.3;
  const cy = d / 2;
  return (
    <>
      <path d={`M${r1(cx)} ${r1(cy - s)} L${r1(cx + s)} ${r1(cy - s / 2)} V${r1(cy + s / 2)} L${r1(cx)} ${r1(cy + s)} L${r1(cx - s)} ${r1(cy + s / 2)} V${r1(cy - s / 2)} Z`} className="k" />
      <path d={`M${r1(cx - s)} ${r1(cy - s / 2)} L${r1(cx)} ${r1(cy)} L${r1(cx + s)} ${r1(cy - s / 2)} M${r1(cx)} ${r1(cy)} V${r1(cy + s)}`} className="k" />
      {p.text && <Text x={r1(w * 0.56)} y={r1(cy + 2)}>{p.text}</Text>}
      {rows(w * 0.56, w - 8, cy + 12, 2, 9, "k2")}
    </>
  );
};

/** 伺服器／靜態主機：機櫃三格＋地球；variant "static" 時旁邊是 dist/ 檔案 */
const serverArt: Art = ({ w, d, p }) => {
  const bw = w * 0.36;
  return (
    <>
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={8} y={r1(8 + i * ((d - 16) / 3))} width={r1(bw)} height={r1((d - 16) / 3 - 4)} className="k" />
          <circle cx={16} cy={r1(8 + i * ((d - 16) / 3) + ((d - 16) / 3 - 4) / 2)} r={2} className={i === 0 ? "kf" : "k2"} />
          <line x1={24} y1={r1(8 + i * ((d - 16) / 3) + ((d - 16) / 3 - 4) / 2)} x2={r1(bw - 2)} y2={r1(8 + i * ((d - 16) / 3) + ((d - 16) / 3 - 4) / 2)} className="k2" />
        </g>
      ))}
      <circle cx={r1(w * 0.72)} cy={r1(d / 2)} r={r1(Math.min(w * 0.18, d * 0.36))} className="k" />
      <ellipse cx={r1(w * 0.72)} cy={r1(d / 2)} rx={r1(Math.min(w * 0.18, d * 0.36) * 0.45)} ry={r1(Math.min(w * 0.18, d * 0.36))} className="k2" />
      <line x1={r1(w * 0.72 - Math.min(w * 0.18, d * 0.36))} y1={r1(d / 2)} x2={r1(w * 0.72 + Math.min(w * 0.18, d * 0.36))} y2={r1(d / 2)} className="k2" />
      {p.text && <Text x={r1(w * 0.5)} y={r1(d - 4)}>{p.text}</Text>}
    </>
  );
};

/** 鍵帽：items 是每顆鍵上的字；on 為按下的那顆 */
const keysArt: Art = ({ w, d, p }) => {
  const keys = p.items ?? ["⌘", "K"];
  const kw = Math.min(30, (w - 8) / keys.length - 4);
  return (
    <>
      {keys.map((k, i) => {
        const x = 6 + i * (kw + 5);
        const cw = Math.max(kw, 8 + k.length * 6);
        return (
          <g key={`${k}${i}`}>
            <rect x={r1(x)} y={r1(d / 2 - 12)} width={r1(cw)} height={22} className={i === p.on ? "ks" : "k"} />
            <rect x={r1(x + 2.5)} y={r1(d / 2 - 9.5)} width={r1(cw - 5)} height={15} className="k2" />
            <Text x={r1(x + 6)} y={r1(d / 2 + 2)} cls={i === p.on ? "t tw" : "t"} size={9}>
              {k}
            </Text>
          </g>
        );
      })}
    </>
  );
};

/** 系列進度條：每列一條進度＋下一章；on 為「閱讀中」那一列 */
const progressArt: Art = ({ w, d, p }) => {
  const n = count(p, 3, 6);
  const fills = [0.62, 0.3, 1, 0.12, 0.8, 0.45];
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const y = 10 + i * ((d - 14) / n);
        return (
          <g key={i}>
            <line x1={8} y1={r1(y)} x2={r1(w * [0.5, 0.4, 0.56][i % 3])} y2={r1(y)} className="k" />
            <rect x={8} y={r1(y + 5)} width={r1(w - 50)} height={5} className="k2" />
            <rect x={8} y={r1(y + 5)} width={r1((w - 50) * fills[i % fills.length])} height={5} className={i === (p.on ?? 0) ? "kf" : "ki"} />
            <Text x={r1(w - 36)} y={r1(y + 10)}>{`${Math.round(fills[i % fills.length] * 8)}/8`}</Text>
          </g>
        );
      })}
    </>
  );
};

/** 標題層級：H1／H2／H3 縮排＋錨點 #；on 為選中層級 */
const headingsArt: Art = ({ w, d, p }) => {
  const lv = p.items ?? ["H1", "H2", "H3", "H3", "H2", "H3"];
  const h = (d - 8) / lv.length;
  return (
    <>
      {lv.map((l, i) => {
        const depth = Number(l.slice(1)) - 1;
        const y = 4 + i * h + h / 2;
        return (
          <g key={i}>
            <Text x={r1(6 + depth * 10)} y={r1(y + 2.5)} cls={i === p.on ? "tm" : "t"}>
              {l}
            </Text>
            <line x1={r1(24 + depth * 10)} y1={r1(y)} x2={r1(w * (0.82 - depth * 0.12))} y2={r1(y)} className={depth === 0 ? "k kb" : depth === 1 ? "k" : "k2"} />
            {i === p.on && <Text x={r1(w * (0.82 - depth * 0.12) + 4)} y={r1(y + 2.5)} cls="tm">#</Text>}
          </g>
        );
      })}
    </>
  );
};

/** 圖片：山與太陽的佔位圖示；text 是檔名 */
const imageArt: Art = ({ w, d, p }) => (
  <>
    <rect x={8} y={8} width={w - 16} height={d - (p.text ? 26 : 16)} className="k" />
    <circle cx={r1(w * 0.7)} cy={r1(d * 0.3)} r={r1(Math.min(w, d) * 0.08)} className="kf" />
    <path d={`M8 ${r1(d - (p.text ? 26 : 16) + 8)} L${r1(w * 0.36)} ${r1(d * 0.4)} L${r1(w * 0.56)} ${r1(d * 0.62)} L${r1(w * 0.7)} ${r1(d * 0.5)} L${w - 8} ${r1(d - (p.text ? 26 : 16) + 8)}`} className="k" />
    {p.text && <Text x={8} y={r1(d - 6)}>{p.text}</Text>}
  </>
);

/** 放大檢視的畫布：格線＋可見範圍框＋縮放鈕 */
const canvasArt: Art = ({ w, d }) => (
  <>
    {Array.from({ length: Math.floor(w / 20) }, (_, i) => (
      <line key={`x${i}`} x1={(i + 1) * 20} y1={0} x2={(i + 1) * 20} y2={d} className="k2 kg" />
    ))}
    {Array.from({ length: Math.floor(d / 20) }, (_, i) => (
      <line key={`y${i}`} x1={0} y1={(i + 1) * 20} x2={w} y2={(i + 1) * 20} className="k2 kg" />
    ))}
    <rect x={r1(w * 0.22)} y={r1(d * 0.2)} width={r1(w * 0.5)} height={r1(d * 0.5)} className="km" />
    <rect x={r1(w - 22)} y={8} width={14} height={30} className="k" />
    <line x1={r1(w - 19)} y1={16} x2={r1(w - 11)} y2={16} className="k" />
    <line x1={r1(w - 15)} y1={12} x2={r1(w - 15)} y2={20} className="k" />
    <line x1={r1(w - 19)} y1={30} x2={r1(w - 11)} y2={30} className="k" />
  </>
);

/** 掃描：一排檔案上方一支放大鏡；on 為被找到（孤兒）的那份 */
const scanArt: Art = ({ w, d, p }) => {
  const n = count(p, 4, 6);
  const fw = (w - 16) / n;
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <g key={i}>
          <rect x={r1(8 + i * fw)} y={r1(d * 0.3)} width={r1(fw - 6)} height={r1(d * 0.5)} className={i === p.on ? "km kd" : "k"} />
          {rows(8 + i * fw + 4, 8 + i * fw + fw - 10, d * 0.3 + 8, 3, 7, "k2")}
        </g>
      ))}
      <circle cx={r1(w * 0.62)} cy={r1(d * 0.36)} r={r1(Math.min(w, d) * 0.14)} className="k" />
      <line x1={r1(w * 0.62 + Math.min(w, d) * 0.1)} y1={r1(d * 0.36 + Math.min(w, d) * 0.1)} x2={r1(w * 0.62 + Math.min(w, d) * 0.22)} y2={r1(d * 0.36 + Math.min(w, d) * 0.22)} className="k" />
    </>
  );
};

/** 開關列：每列一個 Switch；on 為「開」的列（可用 items 給名稱） */
const togglesArt: Art = ({ w, d, p }) => {
  const n = p.items?.length ?? count(p, 3, 6);
  const h = (d - 8) / n;
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const y = 4 + i * h + h / 2;
        const isOn = p.on === undefined ? i !== n - 1 : i === p.on;
        return (
          <g key={i}>
            {p.items?.[i] ? <Text x={8} y={r1(y + 2.5)}>{p.items[i]}</Text> : <line x1={8} y1={r1(y)} x2={r1(w * 0.5)} y2={r1(y)} className="k" />}
            <rect x={r1(w - 32)} y={r1(y - 5)} width={22} height={10} className={isOn ? "ks" : "k"} />
            <circle cx={r1(isOn ? w - 15 : w - 27)} cy={r1(y)} r={3.2} className={isOn ? "kw" : "k"} />
          </g>
        );
      })}
    </>
  );
};

/** 比較欄：items 是欄名，第一欄（on）是 NoteCraftApp */
const columnsArt: Art = ({ w, d, p }) => {
  const cols = p.items ?? ["NoteCraft", "Wiki", "SSG"];
  const cw = (w - 8) / cols.length;
  const nrows = Math.max(3, Math.floor((d - 24) / 14));
  return (
    <>
      {cols.map((c, i) => (
        <g key={c}>
          <rect x={r1(4 + i * cw)} y={4} width={r1(cw - 4)} height={r1(d - 8)} className={i === (p.on ?? 0) ? "k kb" : "k2"} />
          <Text x={r1(8 + i * cw)} y={14} cls={i === (p.on ?? 0) ? "t tb" : "t"}>
            {c}
          </Text>
          {Array.from({ length: nrows }, (_, k) => {
            const y = 26 + k * ((d - 30) / nrows);
            const yes = i === (p.on ?? 0) ? k !== nrows - 1 : (k + i) % 3 === 0;
            return yes ? <path key={k} d={`M${r1(10 + i * cw)} ${r1(y)} l3 3 l6 -6`} className={i === (p.on ?? 0) ? "km" : "k"} /> : <line key={k} x1={r1(10 + i * cw)} y1={r1(y)} x2={r1(18 + i * cw)} y2={r1(y)} className="k2" />;
          })}
        </g>
      ))}
    </>
  );
};

/** 便條：一張帶標題的筆記紙（概念、名詞） */
const noteArt: Art = ({ w, d, p }) => (
  <>
    {p.text && <Text x={8} y={12} cls="t tb">{p.text}</Text>}
    {Array.from({ length: Math.max(2, Math.floor((d - 22) / 10)) }, (_, i) => (
      <line key={i} x1={0} y1={22 + i * 10} x2={w} y2={22 + i * 10} className="k2 kg" />
    ))}
    {rows(10, w - 10, 20, Math.max(2, Math.floor((d - 26) / 10)), 10, "k")}
  </>
);

/** 底板：只有外框與板厚，text 是刻在板上的字 */
const slabArt: Art = ({ w, d, p }) => (
  <>
    {p.text && <Text x={10} y={r1(d - 10)} size={9}>{p.text}</Text>}
    <rect x={8} y={8} width={w - 16} height={d - 16} className="k2 kd" />
  </>
);

export const PARTS: Record<PartKind, Art> = {
  slab: slabArt,
  window: windowArt,
  browser: browserArt,
  screen: screenArt,
  rail: railArt,
  sidebar: sidebarArt,
  list: listArt,
  board: boardArt,
  table: tableArt,
  timeline: timelineArt,
  kpi: kpiArt,
  chart: chartArt,
  calendar: calendarArt,
  tabs: tabsArt,
  palette: paletteArt,
  drawer: drawerArt,
  modal: modalArt,
  file: fileArt,
  folder: folderArt,
  tree: treeArt,
  terminal: terminalArt,
  json: jsonArt,
  code: codeArt,
  diff: diffArt,
  flow: flowArt,
  component: componentArt,
  marker: markerArt,
  slides: slidesArt,
  chips: chipsArt,
  shield: shieldArt,
  er: erArt,
  api: apiArt,
  package: packageArt,
  server: serverArt,
  keys: keysArt,
  progress: progressArt,
  headings: headingsArt,
  image: imageArt,
  canvas: canvasArt,
  scan: scanArt,
  toggles: togglesArt,
  columns: columnsArt,
  note: noteArt,
};
