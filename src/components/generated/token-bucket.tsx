import { useEffect, useRef, useState, type CSSProperties } from "react";

const C = {
  blue: "#1b4f9c",
  blue50: "#eef4fb",
  orange: "#ed9b26",
  orange500: "#e37b24",
  green: "#2e9e6b",
  green50: "#e7f6ee",
  slate: "#3a4456",
  muted: "#6c798e",
  n300: "#cbd3df",
};

function btn(bg: string, fg: string, border?: string): CSSProperties {
  return {
    height: 38,
    padding: "0 16px",
    borderRadius: 999,
    border: border ? `1.5px solid ${border}` : "none",
    background: bg,
    color: fg,
    fontFamily: "var(--font-sans)",
    fontWeight: 700,
    fontSize: 13.5,
    cursor: "pointer",
    transition: "transform 120ms, filter 140ms",
  };
}

export default function TokenBucket() {
  const CAP = 10;
  const REFILL_MS = 700;
  const [tokens, setTokens] = useState(7);
  const [log, setLog] = useState<{ ok: boolean; id: number }[]>([]);
  const [running, setRunning] = useState(true);
  const tRef = useRef(tokens);
  tRef.current = tokens;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTokens((t) => Math.min(CAP, t + 1)), REFILL_MS);
    return () => clearInterval(id);
  }, [running]);

  const sendRequest = () => {
    const ok = tRef.current > 0;
    if (ok) setTokens((t) => t - 1);
    setLog((l) => [{ ok, id: Date.now() + Math.random() }, ...l].slice(0, 6));
  };

  const pct = tokens / CAP;
  return (
    <div className="not-prose" style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 28, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div
            style={{
              position: "relative",
              width: 120,
              height: 150,
              borderRadius: "5px 5px 10px 10px",
              border: `3px solid ${C.blue}`,
              borderTop: "none",
              overflow: "hidden",
              background: C.blue50,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: `${pct * 100}%`,
                background: `linear-gradient(180deg, ${C.orange} 0%, ${C.orange500} 100%)`,
                transition: "height 360ms cubic-bezier(0.16,1,0.3,1)",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 40,
                fontWeight: 900,
                color: pct > 0.45 ? "#fff" : C.blue,
                fontVariantNumeric: "tabular-nums",
                transition: "color 200ms",
              }}
            >
              {tokens}
            </div>
          </div>
          <div style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>容量 {CAP} · 補充 +1 / 0.7s</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={sendRequest} style={btn(C.orange, "#fff")}>
              送出請求 −1
            </button>
            <button
              onClick={() => {
                for (let i = 0; i < 5; i++) setTimeout(sendRequest, i * 70);
              }}
              style={btn("#fff", C.blue, C.blue)}
            >
              突發 ×5
            </button>
            <button onClick={() => setRunning((r) => !r)} style={btn("#fff", C.slate, C.n300)}>
              {running ? "暫停補充" : "恢復補充"}
            </button>
          </div>
          <div style={{ display: "flex", gap: 7, minHeight: 34, flexWrap: "wrap" }}>
            {log.length === 0 && (
              <span style={{ fontSize: 13, color: C.n300, alignSelf: "center" }}>點「送出請求」試試 →</span>
            )}
            {log.map((e) => (
              <span
                key={e.id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "5px 11px",
                  borderRadius: 999,
                  fontSize: 12.5,
                  fontWeight: 700,
                  background: e.ok ? C.green50 : "#fbeaea",
                  color: e.ok ? C.green : "#d64545",
                  animation: "ncPop 280ms cubic-bezier(0.16,1,0.3,1)",
                }}
              >
                {e.ok ? "200 OK" : "429 拒絕"}
              </span>
            ))}
          </div>
        </div>
      </div>
  );
}
