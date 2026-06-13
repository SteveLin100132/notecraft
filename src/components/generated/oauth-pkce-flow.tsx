const C = {
  blue: "#1b4f9c",
  blue500: "#2c6ebb",
  blue50: "#eef4fb",
  sky: "#348bc9",
  orange500: "#e37b24",
  orange50: "#fdf4e6",
  slate: "#3a4456",
  muted: "#6c798e",
  n200: "#e1e6ee",
};

export default function OAuthPkceFlow() {
  const lanes = [
    { x: 90, label: "使用者 / 瀏覽器", sub: "Client", tone: C.blue },
    { x: 360, label: "授權伺服器", sub: "Auth Server", tone: C.orange500 },
    { x: 630, label: "資源伺服器", sub: "Resource", tone: C.sky },
  ];
  const steps = [
    { y: 120, from: 0, to: 1, label: "1 · 帶 code_challenge 請求授權", pkce: true, dashed: false },
    { y: 168, from: 1, to: 0, label: "2 · 回傳 authorization code", pkce: false, dashed: true },
    { y: 216, from: 0, to: 1, label: "3 · code + code_verifier 換 token", pkce: true, dashed: false },
    { y: 264, from: 1, to: 0, label: "4 · 驗證 verifier，發 access_token", pkce: false, dashed: true },
    { y: 312, from: 0, to: 2, label: "5 · 以 access_token 取資源", pkce: false, dashed: false },
  ];
  return (
    <svg viewBox="0 0 720 360" width="100%" className="not-prose" style={{ fontFamily: "var(--font-sans)" }}>
        {lanes.map((l, i) => (
          <g key={i}>
            <rect
              x={l.x - 72}
              y={24}
              width={144}
              height={48}
              rx={12}
              fill={l.tone === C.orange500 ? C.orange50 : C.blue50}
              stroke={l.tone}
              strokeWidth={1.5}
            />
            <text x={l.x} y={46} textAnchor="middle" fontSize={14} fontWeight={700} fill={l.tone}>
              {l.label}
            </text>
            <text x={l.x} y={62} textAnchor="middle" fontSize={11} fill={C.muted} letterSpacing=".05em">
              {l.sub}
            </text>
            <line x1={l.x} y1={72} x2={l.x} y2={344} stroke={C.n200} strokeWidth={2} strokeDasharray="2 5" />
          </g>
        ))}
        {steps.map((s, i) => {
          const x1 = lanes[s.from].x;
          const x2 = lanes[s.to].x;
          const dir = x2 > x1 ? 1 : -1;
          const col = s.pkce ? C.orange500 : C.blue500;
          return (
            <g key={i}>
              <line
                x1={x1}
                y1={s.y}
                x2={x2 - dir * 7}
                y2={s.y}
                stroke={col}
                strokeWidth={2.2}
                strokeDasharray={s.dashed ? "6 4" : undefined}
                markerEnd={`url(#ah-${s.pkce ? "o" : "b"})`}
              />
              <text
                x={(x1 + x2) / 2}
                y={s.y - 9}
                textAnchor="middle"
                fontSize={12.5}
                fontWeight={s.pkce ? 700 : 500}
                fill={s.pkce ? C.orange500 : C.slate}
              >
                {s.label}
              </text>
              {s.pkce && <circle cx={x1} cy={s.y} r={4} fill={C.orange500} />}
            </g>
          );
        })}
        <defs>
          <marker id="ah-b" markerWidth={9} markerHeight={9} refX={7} refY={4.5} orient="auto">
            <path d="M0 0 L9 4.5 L0 9 Z" fill={C.blue500} />
          </marker>
          <marker id="ah-o" markerWidth={9} markerHeight={9} refX={7} refY={4.5} orient="auto">
            <path d="M0 0 L9 4.5 L0 9 Z" fill={C.orange500} />
          </marker>
        </defs>
    </svg>
  );
}
