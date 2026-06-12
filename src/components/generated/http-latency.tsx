import Figure from "./Figure";

const C = {
  blue500: "#2c6ebb",
  orange: "#ed9b26",
  slate: "#3a4456",
  muted: "#6c798e",
  n100: "#eef1f6",
  n300: "#cbd3df",
};

export default function HttpLatency() {
  const data = [
    { label: "HTTP/1.1", value: 100, note: "隊頭阻塞", tone: C.n300 },
    { label: "HTTP/2", value: 62, note: "多工 + 標頭壓縮", tone: C.blue500 },
    { label: "HTTP/3", value: 41, note: "QUIC over UDP", tone: C.orange },
  ];
  const max = 100;
  const W = 640;
  const H = 260;
  const padL = 64;
  const padB = 48;
  const padT = 16;
  const chartW = W - padL - 24;
  const chartH = H - padB - padT;
  const bw = 92;
  const gap = (chartW - bw * data.length) / (data.length + 1);
  return (
    <Figure
      id="http-latency"
      kind="圖表 · SVG Bar"
      caption="相對頁面載入時間（HTTP/1.1 = 100 為基準，數值越低越快）。HTTP/3 以 QUIC 避免 TCP 隊頭阻塞，在高遺失率網路上的改善最明顯。"
    >
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ fontFamily: "var(--font-sans)" }}>
        {[0, 25, 50, 75, 100].map((g) => {
          const y = padT + chartH - (g / max) * chartH;
          return (
            <g key={g}>
              <line x1={padL} y1={y} x2={W - 24} y2={y} stroke={C.n100} strokeWidth={1} />
              <text x={padL - 12} y={y + 4} textAnchor="end" fontSize={11} fill={C.muted}>
                {g}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const x = padL + gap + i * (bw + gap);
          const bh = (d.value / max) * chartH;
          const y = padT + chartH - bh;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={bw}
                height={bh}
                rx={8}
                fill={d.tone}
                style={{
                  animation: `ncGrow 700ms ${i * 110}ms cubic-bezier(0.16,1,0.3,1) both`,
                  transformOrigin: `${x + bw / 2}px ${padT + chartH}px`,
                }}
              />
              <text
                x={x + bw / 2}
                y={y - 10}
                textAnchor="middle"
                fontSize={17}
                fontWeight={900}
                fill={d.tone === C.n300 ? C.slate : d.tone}
              >
                {d.value}
              </text>
              <text x={x + bw / 2} y={padT + chartH + 22} textAnchor="middle" fontSize={13.5} fontWeight={700} fill={C.slate}>
                {d.label}
              </text>
              <text x={x + bw / 2} y={padT + chartH + 39} textAnchor="middle" fontSize={11} fill={C.muted}>
                {d.note}
              </text>
            </g>
          );
        })}
      </svg>
    </Figure>
  );
}
