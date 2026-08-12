// NoteCraft — AI-generated visualization components.
// These simulate what `content-visualize-skill` produces into src/components/generated/.
// Each is self-contained, uses TrendLink design tokens, and registers into GENERATED.

const C = {
  blue: "#1b4f9c", blue500: "#2c6ebb", blue300: "#7ba6da", blue50: "#eef4fb",
  sky: "#348bc9", orange: "#ed9b26", orange500: "#e37b24", orange50: "#fdf4e6",
  green: "#2e9e6b", green50: "#e7f6ee", slate: "#3a4456", muted: "#6c798e",
  n200: "#e1e6ee", n100: "#eef1f6", n300: "#cbd3df",
};

// ── figure wrapper: gives every generated viz a consistent "designed" frame ──
function Figure({ id, kind, children, caption }) {
  const [zoom, setZoom] = React.useState(false);
  return React.createElement("figure", {
    style: {
      margin: "26px 0", padding: 0, border: `1px solid ${C.n200}`,
      borderRadius: "var(--radius-lg)", background: "#fff", overflow: "hidden",
      boxShadow: "0 2px 6px rgba(17,47,93,0.08)",
    },
  },
    React.createElement("figcaption", {
      style: {
        display: "flex", alignItems: "center", gap: 8, padding: "10px 16px",
        borderBottom: `1px solid ${C.n100}`, background: "#fbfcfe",
        fontSize: 12, fontWeight: 700, letterSpacing: ".06em", color: C.muted, textTransform: "uppercase",
      },
    },
      window.Icons.sparkle({ s: 14, style: { color: C.orange500 } }),
      React.createElement("span", { style: { color: C.blue } }, kind),
      React.createElement("span", { style: { marginLeft: "auto", fontWeight: 600, letterSpacing: 0, textTransform: "none", fontSize: 11, color: C.n300 } }, `generated/${id}.tsx`),
      React.createElement(window.VizZoomButton, { onClick: () => setZoom(true) })
    ),
    React.createElement("div", { style: { padding: "22px 24px" } }, children),
    caption && React.createElement("div", {
      style: { padding: "0 24px 18px", fontSize: 13, color: C.muted, lineHeight: 1.7 },
    }, caption),
    React.createElement(window.VizZoomOverlay, { open: zoom, onClose: () => setZoom(false), id, kind, caption }, children)
  );
}

// ════════════════════════════════════════════════════════════════════
// 1. OAuth 2.0 Authorization Code + PKCE — hand-drawn SVG sequence diagram
// ════════════════════════════════════════════════════════════════════
function OAuthFlow() {
  const lanes = [
    { x: 90, label: "使用者 / 瀏覽器", sub: "Client", tone: C.blue },
    { x: 360, label: "授權伺服器", sub: "Auth Server", tone: C.orange500 },
    { x: 630, label: "資源伺服器", sub: "Resource", tone: C.sky },
  ];
  const steps = [
    { y: 120, from: 0, to: 1, label: "1 · 帶 code_challenge 請求授權", pkce: true },
    { y: 168, from: 1, to: 0, label: "2 · 回傳 authorization code", pkce: false, dashed: true },
    { y: 216, from: 0, to: 1, label: "3 · code + code_verifier 換 token", pkce: true },
    { y: 264, from: 1, to: 0, label: "4 · 驗證 verifier，發 access_token", pkce: false, dashed: true },
    { y: 312, from: 0, to: 2, label: "5 · 以 access_token 取資源", pkce: false },
  ];
  return React.createElement(Figure, {
    id: "oauth-pkce-flow", kind: "手寫 SVG 時序圖",
    caption: "PKCE（步驟 1、3，金色強調）以 code_verifier / code_challenge 取代 client_secret，避免授權碼在公開用戶端被攔截後遭濫用。",
  },
    React.createElement("svg", { viewBox: "0 0 720 360", width: "100%", style: { fontFamily: "var(--font-sans)" } },
      // lifelines
      lanes.map((l, i) => React.createElement("g", { key: i },
        React.createElement("rect", { x: l.x - 72, y: 24, width: 144, height: 48, rx: 12, fill: l.tone === C.orange500 ? C.orange50 : C.blue50, stroke: l.tone, strokeWidth: 1.5 }),
        React.createElement("text", { x: l.x, y: 46, textAnchor: "middle", fontSize: 14, fontWeight: 700, fill: l.tone }, l.label),
        React.createElement("text", { x: l.x, y: 62, textAnchor: "middle", fontSize: 11, fill: C.muted, letterSpacing: ".05em" }, l.sub),
        React.createElement("line", { x1: l.x, y1: 72, x2: l.x, y2: 344, stroke: C.n200, strokeWidth: 2, strokeDasharray: "2 5" })
      )),
      // arrows
      steps.map((s, i) => {
        const x1 = lanes[s.from].x, x2 = lanes[s.to].x;
        const dir = x2 > x1 ? 1 : -1;
        const col = s.pkce ? C.orange500 : C.blue500;
        return React.createElement("g", { key: i },
          React.createElement("line", { x1, y1: s.y, x2: x2 - dir * 7, y2: s.y, stroke: col, strokeWidth: 2.2, strokeDasharray: s.dashed ? "6 4" : "none", markerEnd: `url(#ah-${s.pkce ? "o" : "b"})` }),
          React.createElement("text", { x: (x1 + x2) / 2, y: s.y - 9, textAnchor: "middle", fontSize: 12.5, fontWeight: s.pkce ? 700 : 500, fill: s.pkce ? C.orange500 : C.slate }, s.label),
          s.pkce && React.createElement("circle", { cx: x1, cy: s.y, r: 4, fill: C.orange500 })
        );
      }),
      React.createElement("defs", null,
        ["b", "o"].map((k) => React.createElement("marker", { key: k, id: `ah-${k}`, markerWidth: 9, markerHeight: 9, refX: 7, refY: 4.5, orient: "auto" },
          React.createElement("path", { d: "M0 0 L9 4.5 L0 9 Z", fill: k === "o" ? C.orange500 : C.blue500 })
        ))
      )
    )
  );
}

// ════════════════════════════════════════════════════════════════════
// 2. Token Bucket rate limiter — interactive motion demo
// ════════════════════════════════════════════════════════════════════
function TokenBucket() {
  const CAP = 10, REFILL_MS = 700;
  const [tokens, setTokens] = React.useState(7);
  const [log, setLog] = React.useState([]);
  const [running, setRunning] = React.useState(true);
  const tRef = React.useRef(tokens);
  tRef.current = tokens;

  React.useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setTokens((t) => Math.min(CAP, t + 1));
    }, REFILL_MS);
    return () => clearInterval(id);
  }, [running]);

  const sendRequest = () => {
    if (tRef.current > 0) {
      setTokens((t) => t - 1);
      setLog((l) => [{ ok: true, id: Date.now() }, ...l].slice(0, 6));
    } else {
      setLog((l) => [{ ok: false, id: Date.now() }, ...l].slice(0, 6));
    }
  };

  const pct = tokens / CAP;
  return React.createElement(Figure, {
    id: "token-bucket", kind: "互動動畫 · Motion",
    caption: "桶子以固定速率補充 token（每 0.7 秒 +1，上限 10）。每個請求消耗 1 個 token；桶空時請求被拒。突發流量由桶容量吸收，平均速率由補充速率決定。",
  },
    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "180px 1fr", gap: 28, alignItems: "center" } },
      // bucket
      React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 12 } },
        React.createElement("div", {
          style: {
            position: "relative", width: 120, height: 150, borderRadius: "5px 5px 10px 10px",
            border: `3px solid ${C.blue}`, borderTop: "none", overflow: "hidden", background: C.blue50,
          },
        },
          React.createElement("div", {
            style: {
              position: "absolute", left: 0, right: 0, bottom: 0,
              height: `${pct * 100}%`,
              background: `linear-gradient(180deg, ${C.orange} 0%, ${C.orange500} 100%)`,
              transition: "height 360ms cubic-bezier(0.16,1,0.3,1)",
            },
          }),
          React.createElement("div", {
            style: {
              position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 40, fontWeight: 900, color: pct > 0.45 ? "#fff" : C.blue,
              fontVariantNumeric: "tabular-nums", transition: "color 200ms",
            },
          }, tokens)
        ),
        React.createElement("div", { style: { fontSize: 12, color: C.muted, fontWeight: 600 } }, `容量 ${CAP} · 補充 +1 / 0.7s`)
      ),
      // controls + log
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 14 } },
        React.createElement("div", { style: { display: "flex", gap: 10, flexWrap: "wrap" } },
          React.createElement("button", { onClick: sendRequest, style: btn(C.orange, "#fff") }, "送出請求 −1"),
          React.createElement("button", { onClick: () => { for (let i = 0; i < 5; i++) setTimeout(sendRequest, i * 70); }, style: btn("#fff", C.blue, C.blue) }, "突發 ×5"),
          React.createElement("button", { onClick: () => setRunning((r) => !r), style: btn("#fff", C.slate, C.n300) }, running ? "暫停補充" : "恢復補充")
        ),
        React.createElement("div", { style: { display: "flex", gap: 7, minHeight: 34, flexWrap: "wrap" } },
          log.length === 0 && React.createElement("span", { style: { fontSize: 13, color: C.n300, alignSelf: "center" } }, "點「送出請求」試試 →"),
          log.map((e) => React.createElement("span", {
            key: e.id,
            style: {
              display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 999,
              fontSize: 12.5, fontWeight: 700,
              background: e.ok ? C.green50 : "#fbeaea", color: e.ok ? C.green : "#d64545",
              animation: "ncPop 280ms cubic-bezier(0.16,1,0.3,1)",
            },
          }, e.ok ? "200 OK" : "429 拒絕"))
        )
      )
    )
  );
}
function btn(bg, fg, border) {
  return {
    height: 38, padding: "0 16px", borderRadius: 999, border: border ? `1.5px solid ${border}` : "none",
    background: bg, color: fg, fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 13.5,
    cursor: "pointer", transition: "transform 120ms, filter 140ms",
  };
}

// ════════════════════════════════════════════════════════════════════
// 3. HTTP version latency — hand-drawn SVG bar chart
// ════════════════════════════════════════════════════════════════════
function HttpLatencyChart() {
  const data = [
    { label: "HTTP/1.1", value: 100, note: "隊頭阻塞", tone: C.n300 },
    { label: "HTTP/2", value: 62, note: "多工 + 標頭壓縮", tone: C.blue500 },
    { label: "HTTP/3", value: 41, note: "QUIC over UDP", tone: C.orange },
  ];
  const max = 100, W = 640, H = 260, padL = 64, padB = 48, padT = 16;
  const chartW = W - padL - 24, chartH = H - padB - padT;
  const bw = 92, gap = (chartW - bw * data.length) / (data.length + 1);
  return React.createElement(Figure, {
    id: "http-latency", kind: "圖表 · SVG Bar",
    caption: "相對頁面載入時間（HTTP/1.1 = 100 為基準，數值越低越快）。HTTP/3 以 QUIC 避免 TCP 隊頭阻塞，在高遺失率網路上的改善最明顯。",
  },
    React.createElement("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", style: { fontFamily: "var(--font-sans)" } },
      [0, 25, 50, 75, 100].map((g) => {
        const y = padT + chartH - (g / max) * chartH;
        return React.createElement("g", { key: g },
          React.createElement("line", { x1: padL, y1: y, x2: W - 24, y2: y, stroke: C.n100, strokeWidth: 1 }),
          React.createElement("text", { x: padL - 12, y: y + 4, textAnchor: "end", fontSize: 11, fill: C.muted }, g)
        );
      }),
      data.map((d, i) => {
        const x = padL + gap + i * (bw + gap);
        const bh = (d.value / max) * chartH;
        const y = padT + chartH - bh;
        return React.createElement("g", { key: i },
          React.createElement("rect", { x, y, width: bw, height: bh, rx: 8, fill: d.tone, style: { animation: `ncGrow 700ms ${i * 110}ms cubic-bezier(0.16,1,0.3,1) both`, transformOrigin: `${x + bw / 2}px ${padT + chartH}px` } }),
          React.createElement("text", { x: x + bw / 2, y: y - 10, textAnchor: "middle", fontSize: 17, fontWeight: 900, fill: d.tone === C.n300 ? C.slate : d.tone }, d.value),
          React.createElement("text", { x: x + bw / 2, y: padT + chartH + 22, textAnchor: "middle", fontSize: 13.5, fontWeight: 700, fill: C.slate }, d.label),
          React.createElement("text", { x: x + bw / 2, y: padT + chartH + 39, textAnchor: "middle", fontSize: 11, fill: C.muted }, d.note)
        );
      })
    )
  );
}

// ════════════════════════════════════════════════════════════════════
// 4. 專案 vs 產品 — dual-column concept diagram (finite arc vs loop)
// ════════════════════════════════════════════════════════════════════
function ProjectVsProductConcept() {
  const { useState, useEffect, useRef } = React;
  const PROJECT_SECS = 5.2, PROD_DEG = 72; // product loop ≈ 5s per lap
  const MS = [
    { p: 0, l: "啟動" }, { p: 0.36, l: "執行" }, { p: 0.72, l: "交付物", key: true }, { p: 1, l: "結案" },
  ];
  const PHASES = [
    { a: -90, l: "探索" }, { a: 0, l: "打造" }, { a: 90, l: "發布" }, { a: 180, l: "學習" },
  ];

  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [proj, setProj] = useState(0);
  const [ang, setAng] = useState(-90);
  const lastRef = useRef(0);

  useEffect(() => {
    if (!playing) return;
    lastRef.current = performance.now();
    let raf;
    const tick = (now) => {
      const dt = Math.min(0.05, (now - lastRef.current) / 1000);
      lastRef.current = now;
      setProj((p) => Math.min(1, p + dt / PROJECT_SECS));
      setAng((a) => a + dt * PROD_DEG);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const toggle = () => { setStarted(true); setPlaying((p) => !p); };
  const reset = () => { setPlaying(false); setStarted(false); setProj(0); setAng(-90); };

  const projPct = Math.round(proj * 100);
  const projDone = proj >= 1;
  const spun = ang + 90;
  const laps = Math.floor(spun / 360);
  const value = Math.round(spun / 3.6);
  const phaseIdx = ((Math.floor((spun % 360) / 90)) % 4 + 4) % 4;

  // ring geometry
  const cx = 122, cy = 100, R = 64;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const tokX = cx + R * Math.cos(toRad(ang));
  const tokY = cy + R * Math.sin(toRad(ang));

  const meter = (pct, fill, track) => React.createElement("div", {
    style: { height: 8, borderRadius: 999, background: track || C.n100, overflow: "hidden" },
  }, React.createElement("div", {
    style: { height: "100%", width: `${Math.max(0, Math.min(100, pct))}%`, background: fill, borderRadius: 999, transition: playing ? "none" : "width 280ms ease" },
  }));

  const colHead = (en, zh, sub, tone) => React.createElement("div", null,
    React.createElement("div", { style: { fontSize: 11, fontWeight: 800, letterSpacing: ".14em", color: tone, textTransform: "uppercase", marginBottom: 3 } }, en),
    React.createElement("div", { style: { display: "flex", alignItems: "baseline", gap: 9, flexWrap: "wrap" } },
      React.createElement("span", { style: { fontSize: 19, fontWeight: 900, color: C.slate } }, zh),
      React.createElement("span", { style: { fontSize: 12.5, color: C.muted } }, sub)
    )
  );

  // ── LEFT: linear project track ──
  const projectCol = React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 16 } },
    colHead("PROJECT", "專案", "單一路徑 · 有終點", C.blue),
    React.createElement("div", { style: { height: 156, display: "flex", alignItems: "center" } },
     React.createElement("div", { style: { position: "relative", width: "100%", height: 64, padding: "0 4px" } },
      React.createElement("div", { style: { position: "absolute", left: 4, right: 4, top: 26, height: 4, borderRadius: 999, background: C.n200 } }),
      React.createElement("div", { style: { position: "absolute", left: 4, top: 26, height: 4, borderRadius: 999, background: C.blue500, width: `calc(${proj} * (100% - 8px))`, transition: playing ? "none" : "width 200ms" } }),
      MS.map((m, i) => {
        const reached = proj >= m.p - 0.001;
        const isEnd = m.p === 1;
        const c = m.key ? C.orange500 : C.blue;
        return React.createElement("div", {
          key: i,
          style: { position: "absolute", top: 0, left: `calc(4px + ${m.p} * (100% - 8px))`, transform: "translateX(-50%)", textAlign: "center", width: 56 },
        },
          React.createElement("div", {
            style: {
              width: m.key ? 22 : 17, height: m.key ? 22 : 17, borderRadius: 999, margin: `${m.key ? 17 : 19}px auto 0`,
              background: reached ? (m.key ? C.orange500 : C.blue) : "#fff",
              border: `2.5px solid ${reached ? (m.key ? C.orange500 : C.blue) : C.n300}`,
              display: "flex", alignItems: "center", justifyContent: "center", transition: "background 200ms, border-color 200ms",
            },
          }, isEnd && projDone ? React.createElement("span", { style: { color: "#fff", fontSize: 11, fontWeight: 900, lineHeight: 1 } }, "\u2713") : null),
          React.createElement("div", { style: { fontSize: 11.5, fontWeight: 700, color: reached ? c : C.muted, marginTop: 6, whiteSpace: "nowrap" } }, m.l)
        );
      }),
      React.createElement("div", {
        style: {
          position: "absolute", top: 26, left: `calc(4px + ${proj} * (100% - 8px))`, transform: "translate(-50%,-50%)",
          width: 14, height: 14, borderRadius: 999, background: "#fff", border: `3px solid ${C.blue}`,
          boxShadow: "0 1px 5px rgba(27,79,156,.45)", zIndex: 2, transition: playing ? "none" : "left 200ms",
        },
      })
    )),
    React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } },
      React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 700 } },
        React.createElement("span", { style: { color: C.muted } }, "進度"),
        React.createElement("span", { style: { color: C.blue, fontVariantNumeric: "tabular-nums" } }, `${projPct}%`)
      ),
      meter(projPct, C.blue500),
      React.createElement("div", { style: { fontSize: 12.5, fontWeight: 700, minHeight: 26, display: "flex", alignItems: "center" } },
        projDone
          ? React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 11px", borderRadius: 999, background: C.blue50, color: C.blue } }, "\u2713 已結案 · 生命週期結束")
          : React.createElement("span", { style: { color: C.muted } }, "抵達「結案」後，專案即告結束")
      )
    )
  );

  // ── RIGHT: product loop ──
  const productCol = React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 16 } },
    colHead("PRODUCT", "產品", "循環迭代 · 無終點", C.orange500),
    React.createElement("div", { style: { display: "flex", justifyContent: "center", alignItems: "center", height: 156 } },
      React.createElement("svg", { viewBox: "0 0 244 200", width: 184, height: 151, style: { fontFamily: "var(--font-sans)", overflow: "visible" } },
        React.createElement("circle", { cx, cy, r: R, fill: "none", stroke: C.n200, strokeWidth: 2, strokeDasharray: "3 7" }),
        PHASES.map((ph, i) => {
          const x = cx + R * Math.cos(toRad(ph.a)), y = cy + R * Math.sin(toRad(ph.a));
          const active = started && i === phaseIdx;
          return React.createElement("g", { key: i },
            React.createElement("circle", { cx: x, cy: y, r: 21, fill: active ? C.orange500 : "#fff", stroke: active ? C.orange500 : C.n300, strokeWidth: 2, style: { transition: "fill 180ms, stroke 180ms" } }),
            React.createElement("text", { x, y: y + 5, textAnchor: "middle", fontSize: 13.5, fontWeight: 800, fill: active ? "#fff" : C.slate, style: { transition: "fill 180ms" } }, ph.l)
          );
        }),
        React.createElement("text", { x: cx, y: cy - 3, textAnchor: "middle", fontSize: 26, fontWeight: 900, fill: C.orange500 }, "\u221e"),
        React.createElement("text", { x: cx, y: cy + 17, textAnchor: "middle", fontSize: 12.5, fontWeight: 800, fill: C.slate, style: { fontVariantNumeric: "tabular-nums" } }, `第 ${laps} 次迭代`),
        React.createElement("circle", { cx: tokX, cy: tokY, r: 7, fill: C.orange, stroke: "#fff", strokeWidth: 2 })
      )
    ),
    React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } },
      React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 700 } },
        React.createElement("span", { style: { color: C.muted } }, "累積價值"),
        React.createElement("span", { style: { color: C.orange500, fontVariantNumeric: "tabular-nums" } }, `+${value}`)
      ),
      meter(value % 100, `linear-gradient(90deg, ${C.orange} 0%, ${C.orange500} 100%)`, C.orange50),
      React.createElement("div", { style: { fontSize: 12.5, fontWeight: 700, minHeight: 26, display: "flex", alignItems: "center", color: C.muted } },
        "每一圈都釋出價值，然後繼續下一輪")
    )
  );

  const controls = React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 22 } },
    React.createElement("button", {
      onClick: toggle,
      style: { display: "inline-flex", alignItems: "center", gap: 7, height: 40, padding: "0 20px", borderRadius: 999, border: "none", background: C.orange, color: "#fff", fontFamily: "var(--font-sans)", fontWeight: 800, fontSize: 14, cursor: "pointer", whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(227,123,36,.35)" },
    }, playing ? "\u2759\u2759 暫停" : (started ? "\u25b6 繼續" : "\u25b6 開始模擬")),
    React.createElement("button", {
      onClick: reset,
      style: { display: "inline-flex", alignItems: "center", gap: 6, height: 40, padding: "0 16px", borderRadius: 999, border: `1.5px solid ${C.n300}`, background: "#fff", color: C.slate, fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 13.5, cursor: "pointer" },
    }, "\u21ba 重置")
  );

  let insight;
  if (!started && proj === 0) insight = "按下「開始模擬」，看同一個時鐘下，專案與產品如何走向完全不同的終局。";
  else if (!projDone) insight = "專案沿單一路徑前進，逐步逼近交付物；產品繞著「探索 → 打造 → 發布 → 學習」循環，邊跑邊累積價值。";
  else insight = `專案已結案、生命週期結束；產品仍在第 ${laps} 圈持續迭代，價值不斷累積 —— 這正是兩者最根本的差異。`;

  return React.createElement(Figure, {
    id: "pm-project-vs-product-concept", kind: "互動模擬 · Interactive",
    caption: "同一個時鐘並排模擬：專案是一趟有終點的旅程（抵達交付物後結案、停止），產品是一個永不停止的循環（每一圈持續累積價值）。",
  },
    controls,
    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(252px, 1fr))", gap: 0, alignItems: "start" } },
      React.createElement("div", { style: { padding: "0 24px 0 0", borderRight: `2px dashed ${C.n200}` } }, projectCol),
      React.createElement("div", { style: { padding: "0 0 0 24px" } }, productCol)
    ),
    React.createElement("div", {
      style: { marginTop: 18, padding: "12px 16px", borderRadius: "var(--radius-md)", background: C.blue50, borderLeft: `3px solid ${C.blue500}`, fontSize: 13, lineHeight: 1.7, color: C.slate },
    }, insight)
  );
}

// ════════════════════════════════════════════════════════════════════
// 5. 專案 vs 產品 — color-coded comparison table
// ════════════════════════════════════════════════════════════════════
function ProjectVsProductTable() {
  const rows = [
    { icon: "clock", k: "生命週期", proj: "有明確結束", prod: "持續迭代，沒有結束" },
    { icon: "target", k: "衡量標準", proj: "範疇、時程、品質、預算", prod: "用戶價值、商業價值、留存" },
    { icon: "gitBranch", k: "需求變動", proj: "盡量凍結，變更需走 CR", prod: "預期會變，擁抱變化" },
    { icon: "lightbulb", k: "思考方式", proj: "以終為始，規劃導向", prod: "假設驗證，持續學習" },
  ];
  const th = (label, bg, accent) => React.createElement("th", {
    style: {
      padding: "13px 18px", textAlign: "left", fontSize: 14, fontWeight: 800, whiteSpace: "nowrap",
      background: bg, color: accent ? "#fff" : C.slate,
      borderBottom: accent ? "none" : `1px solid ${C.n200}`,
    },
  }, label);

  return React.createElement(Figure, {
    id: "pm-project-vs-product-table", kind: "強化比較表 · Table",
    caption: "同一個 PM 角色，在專案與產品兩種情境下的四個關鍵思考差異。",
  },
    React.createElement("div", { style: { overflowX: "auto", borderRadius: "var(--radius-md)", border: `1px solid ${C.n200}`, boxShadow: "0 2px 6px rgba(17,47,93,0.06)" } },
      React.createElement("table", { style: { width: "100%", minWidth: 540, borderCollapse: "collapse", fontFamily: "var(--font-sans)" } },
        React.createElement("thead", null,
          React.createElement("tr", null,
            th("比較項目", "#fbfcfe", false),
            th("專案", C.blue, true),
            th("產品", C.orange, true)
          )
        ),
        React.createElement("tbody", null,
          rows.map((r, i) => React.createElement("tr", { key: r.k, style: { background: i % 2 === 1 ? "#fafbfd" : "#fff" } },
            React.createElement("td", { style: { padding: "13px 18px", borderTop: `1px solid ${C.n100}`, whiteSpace: "nowrap" } },
              React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 9, fontSize: 14, fontWeight: 700, color: C.slate } },
                window.Icons[r.icon]({ s: 16, style: { color: C.muted, flexShrink: 0 } }),
                r.k
              )
            ),
            React.createElement("td", { style: { padding: "13px 18px", borderTop: `1px solid ${C.n100}`, borderLeft: `3px solid ${C.blue50}`, fontSize: 14, color: C.slate, lineHeight: 1.6 } }, r.proj),
            React.createElement("td", { style: { padding: "13px 18px", borderTop: `1px solid ${C.n100}`, borderLeft: `3px solid ${C.orange50}`, fontSize: 14, color: C.slate, lineHeight: 1.6 } }, r.prod)
          ))
        )
      )
    )
  );
}

// ════════════════════════════════════════════════════════════════════
// 6. R&R — Waterfall 指揮鏈 vs Agile 自組織圈（互動結構對照）  [JSX]
// ════════════════════════════════════════════════════════════════════
function RRStructure() {
  const { useState } = React;
  const Icons = window.Icons;
  const ROLES = {
    pm:   { side: "wf", abbr: "PM",     name: "Project Manager",  zh: "專案經理",
            d: "負責專案整體規劃、執行與監控,確保專案如期、如質完成;管理團隊與資源,與利益相關者溝通協調,並處理風險與問題。站在指揮鏈頂端,由上而下指派工作。" },
    sa:   { side: "wf", abbr: "架構師", name: "System Architect", zh: "系統架構師",
            d: "設計系統整體架構與技術方案,確保系統的可擴展性、可靠性與效能,並指導開發團隊進行技術實現。" },
    devw: { side: "wf", abbr: "開發團隊", name: "Development",     zh: "開發團隊",
            d: "實際開發產品的成員,通常包含軟體工程師、設計師、測試人員等,依需求規格進行開發。" },
    qa:   { side: "wf", abbr: "測試團隊", name: "QA Team",         zh: "品保團隊",
            d: "負責品質保證,包括測試計劃設計、測試案例撰寫、測試執行與缺陷管理等,確保產品品質符合標準。" },
    po:   { side: "ag", abbr: "PO",     name: "Product Owner",    zh: "產品負責人",
            d: "定義產品願景、制定 Roadmap、規劃 MVP、管理 Product Backlog,並與團隊及利益相關者溝通,確保開發方向符合用戶需求與商業目標。" },
    sm:   { side: "ag", abbr: "SM",     name: "Scrum Master",     zh: "敏捷教練",
            d: "促進 Scrum 團隊的運作,協助團隊遵循 Scrum 流程,排除障礙,促進團隊協作,確保 Sprint 目標能順利達成。" },
    deva: { side: "ag", abbr: "開發團隊", name: "Dev Team",        zh: "開發團隊",
            d: "自組織、跨功能的開發成員,共同對 Sprint 目標負責。沒有人由上而下指派工作,團隊一起決定如何達成目標。" },
  };
  const [sel, setSel] = useState(null);
  const [flow, setFlow] = useState(true);
  const cur = sel ? ROLES[sel] : null;
  const fc = flow ? "rr-flow" : "";
  const pick = (id) => setSel((s) => (s === id ? null : id));

  // waterfall box node
  const wfNode = (id, x, y, w, h) => {
    const on = sel === id;
    return React.createElement("g", { className: "rr-node", onClick: () => pick(id), style: { cursor: "pointer" } },
      React.createElement("rect", { x, y, width: w, height: h, rx: 9, fill: on ? C.orange50 : C.blue50, stroke: on ? C.orange500 : C.blue, strokeWidth: on ? 2.4 : 1.6 }),
      React.createElement("text", { x: x + w / 2, y: y + h / 2 - 3, textAnchor: "middle", fontSize: 14.5, fontWeight: 800, fill: on ? C.orange500 : C.blue, style: { pointerEvents: "none" } }, ROLES[id].abbr),
      React.createElement("text", { x: x + w / 2, y: y + h / 2 + 13, textAnchor: "middle", fontSize: 10, fill: C.muted, style: { pointerEvents: "none" } }, ROLES[id].name)
    );
  };
  // agile circular node
  const agNode = (id, cx, cy, r, big) => {
    const on = sel === id;
    const tone = id === "deva" ? C.blue : C.orange500;
    const fill = on ? (id === "deva" ? C.blue50 : C.orange50) : (id === "deva" ? C.blue50 : "#fff");
    return React.createElement("g", { className: "rr-node", onClick: () => pick(id), style: { cursor: "pointer" } },
      React.createElement("circle", { cx, cy, r, fill, stroke: on ? C.orange500 : tone, strokeWidth: on ? 2.8 : 2 }),
      React.createElement("text", { x: cx, y: cy + (big ? -4 : -2), textAnchor: "middle", fontSize: big ? 16 : 14, fontWeight: 800, fill: on && id !== "deva" ? C.orange500 : tone, style: { pointerEvents: "none" } }, ROLES[id].abbr),
      React.createElement("text", { x: cx, y: cy + (big ? 15 : 12), textAnchor: "middle", fontSize: big ? 10.5 : 8.5, fill: C.muted, style: { pointerEvents: "none" } }, big ? "自組織 · 跨功能" : ROLES[id].name)
    );
  };

  const colHead = (en, zh, tone) =>
    React.createElement("div", { style: { marginBottom: 8 } },
      React.createElement("div", { style: { fontSize: 11, fontWeight: 800, letterSpacing: ".16em", color: tone, marginBottom: 2 } }, en),
      React.createElement("div", { style: { fontSize: 14.5, fontWeight: 800, color: C.slate } }, zh)
    );
  const foot = (txt) => React.createElement("div", { style: { fontSize: 12, color: C.muted, lineHeight: 1.6, marginTop: 6, textAlign: "center" } }, txt);

  return React.createElement(Figure, {
    id: "rr-structure", kind: "互動結構對照 · Interactive",
    caption: "同樣是「帶團隊的人」,Waterfall 的 PM 由上而下指派、站在指揮鏈頂端;Agile 的 PO / SM 卻是由外圍服務一個自組織的中央團隊 —— 這是兩種方法論最深的權責分野。",
  },
    React.createElement("style", null, `@keyframes rrDash { to { stroke-dashoffset: -24; } } .rr-flow { animation: rrDash .8s linear infinite; }`),
    // controls
    React.createElement("div", { style: { display: "flex", gap: 10, justifyContent: "center", marginBottom: 18, flexWrap: "wrap" } },
      React.createElement("button", { onClick: () => setFlow((f) => !f), style: btn(flow ? C.blue : "#fff", flow ? "#fff" : C.blue, C.blue) }, flow ? "❚❚ 暫停權責流向" : "▶ 顯示權責流向"),
      sel && React.createElement("button", { onClick: () => setSel(null), style: btn("#fff", C.slate, C.n300) }, "清除選取")
    ),
    // two columns
    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 0, alignItems: "start" } },
      // ── LEFT: waterfall ──
      React.createElement("div", { style: { paddingRight: 22, borderRight: `2px dashed ${C.n200}` } },
        colHead("WATERFALL", "指揮鏈 · 由上而下指派", C.blue),
        React.createElement("svg", { viewBox: "0 0 300 290", width: "100%", style: { fontFamily: "var(--font-sans)" } },
          React.createElement("defs", null,
            React.createElement("marker", { id: "rrAhB", markerWidth: 9, markerHeight: 9, refX: 7, refY: 4.5, orient: "auto" },
              React.createElement("path", { d: "M0 0 L9 4.5 L0 9 Z", fill: C.blue500 }))
          ),
          // connectors
          React.createElement("line", { className: fc, x1: 150, y1: 62, x2: 150, y2: 90, stroke: C.blue500, strokeWidth: 2, strokeDasharray: "5 5", markerEnd: "url(#rrAhB)" }),
          React.createElement("line", { x1: 150, y1: 140, x2: 150, y2: 168, stroke: C.blue500, strokeWidth: 2 }),
          React.createElement("line", { x1: 80, y1: 168, x2: 220, y2: 168, stroke: C.blue500, strokeWidth: 2 }),
          React.createElement("line", { className: fc, x1: 80, y1: 168, x2: 80, y2: 196, stroke: C.blue500, strokeWidth: 2, strokeDasharray: "5 5", markerEnd: "url(#rrAhB)" }),
          React.createElement("line", { className: fc, x1: 220, y1: 168, x2: 220, y2: 196, stroke: C.blue500, strokeWidth: 2, strokeDasharray: "5 5", markerEnd: "url(#rrAhB)" }),
          // nodes
          wfNode("pm", 70, 16, 160, 46),
          wfNode("sa", 58, 96, 184, 44),
          wfNode("devw", 18, 200, 124, 52),
          wfNode("qa", 158, 200, 124, 52)
        ),
        foot("PM 在頂端拍板,指令逐層往下傳遞。")
      ),
      // ── RIGHT: agile ──
      React.createElement("div", { style: { paddingLeft: 22 } },
        colHead("AGILE", "自組織圈 · 由外圍服務", C.orange500),
        React.createElement("svg", { viewBox: "0 0 300 290", width: "100%", style: { fontFamily: "var(--font-sans)" } },
          React.createElement("defs", null,
            React.createElement("marker", { id: "rrAhO", markerWidth: 9, markerHeight: 9, refX: 7, refY: 4.5, orient: "auto" },
              React.createElement("path", { d: "M0 0 L9 4.5 L0 9 Z", fill: C.orange500 }))
          ),
          React.createElement("circle", { cx: 150, cy: 165, r: 96, fill: "none", stroke: C.n200, strokeWidth: 2, strokeDasharray: "3 7" }),
          // serving arrows pointing inward
          React.createElement("path", { className: fc, d: "M92 110 Q120 132 126 145", fill: "none", stroke: C.orange500, strokeWidth: 2, strokeDasharray: "5 5", markerEnd: "url(#rrAhO)" }),
          React.createElement("path", { className: fc, d: "M208 110 Q180 132 174 145", fill: "none", stroke: C.orange500, strokeWidth: 2, strokeDasharray: "5 5", markerEnd: "url(#rrAhO)" }),
          React.createElement("text", { x: 70, y: 138, textAnchor: "middle", fontSize: 9.5, fill: C.orange500, fontWeight: 700 }, "餵養 Backlog"),
          React.createElement("text", { x: 232, y: 138, textAnchor: "middle", fontSize: 9.5, fill: C.orange500, fontWeight: 700 }, "排除障礙"),
          // center team + satellites
          agNode("deva", 150, 165, 58, true),
          agNode("po", 68, 82, 38),
          agNode("sm", 232, 82, 38)
        ),
        foot("團隊在中央自組織;PO 餵養方向、SM 移除障礙,都是「服務」。")
      )
    ),
    // detail panel
    React.createElement("div", { style: { marginTop: 18, padding: "14px 18px", borderRadius: "var(--radius-md)", border: `1px solid ${C.n200}`, background: "#fbfcfe", minHeight: 80 } },
      cur
        ? React.createElement("div", null,
            React.createElement("div", { style: { display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6, flexWrap: "wrap" } },
              React.createElement("span", { style: { fontSize: 10.5, fontWeight: 800, letterSpacing: ".1em", padding: "3px 9px", borderRadius: 999, background: cur.side === "wf" ? C.blue50 : C.orange50, color: cur.side === "wf" ? C.blue : C.orange500 } }, cur.side === "wf" ? "WATERFALL" : "AGILE"),
              React.createElement("span", { style: { fontSize: 17, fontWeight: 900, color: C.slate } }, cur.zh),
              React.createElement("span", { style: { fontSize: 13, color: C.muted } }, cur.name)
            ),
            React.createElement("p", { style: { margin: 0, fontSize: 13.5, color: C.slate, lineHeight: 1.8 } }, cur.d)
          )
        : React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 9, color: C.muted, fontSize: 13.5, lineHeight: 1.7 } },
            window.Icons.sparkle({ s: 17, style: { color: C.orange500, flexShrink: 0 } }),
            "點選任一角色查看完整職責 —— 注意左欄箭頭一路向下(指派),右欄箭頭向內(服務)。")
    )
  );
}

// ════════════════════════════════════════════════════════════════════
// 7. R&R — 衍生角色互動卡
// ════════════════════════════════════════════════════════════════════
function RRDerivedRoles() {
  const { useState } = React;
  const tint = { blue: C.blue50, orange: C.orange50, green: C.green50, sky: "#e9f3fb" };
  const hex = { blue: C.blue, orange: C.orange500, green: C.green, sky: "#2f88c4" };
  const roles = [
    { id: "stakeholder", icon: "target",    zh: "Stakeholder",     name: "利益相關者",   scope: "外部", tone: "orange",
      d: "對產品或專案有直接或間接利益的人,包含用戶、客戶、管理層、投資者等。" },
    { id: "techlead",    icon: "code",      zh: "Tech Lead",       name: "技術主管",     scope: "技術", tone: "blue",
      d: "負責技術決策與指導,協助團隊解決技術問題,並與 PO、SM 協作,確保技術方向與產品需求一致。" },
    { id: "uiux",        icon: "edit",      zh: "UI/UX Designer",  name: "介面體驗設計", scope: "設計", tone: "sky",
      d: "設計產品的介面與使用者體驗,確保產品在易用性與美觀性上符合用戶需求。" },
    { id: "domain",      icon: "lightbulb", zh: "Domain Expert",   name: "領域專家",     scope: "領域", tone: "orange",
      d: "在特定領域具備專業知識,協助團隊理解用戶需求與市場脈絡。" },
    { id: "qae",         icon: "check",     zh: "QA Engineer",     name: "品質保證工程師", scope: "品質", tone: "green",
      d: "負責測試規劃與執行,協助團隊識別與解決品質問題。" },
    { id: "data",        icon: "layers",    zh: "Data Engineer",   name: "數據工程師",   scope: "數據", tone: "blue",
      d: "負責資料基礎設施的設計、建置與維護,協助團隊以數據驅動決策。" },
  ];
  const [open, setOpen] = useState("stakeholder");

  return React.createElement(Figure, {
    id: "rr-derived-roles", kind: "互動角色卡 · Interactive",
    caption: "不一定每個團隊都有,但中大型專案常會看到這些角色。點開卡片即展開該角色的職責。",
  },
    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(224px, 1fr))", gap: 12 } },
      roles.map((r) => {
        const on = open === r.id;
        const th = hex[r.tone], tb = tint[r.tone];
        return React.createElement("button", {
          key: r.id, onClick: () => setOpen((o) => (o === r.id ? null : r.id)),
          style: {
            textAlign: "left", cursor: "pointer", fontFamily: "var(--font-sans)", display: "block", width: "100%",
            border: `1px solid ${on ? th : C.n200}`, borderTop: `3px solid ${th}`, borderRadius: "var(--radius-md)",
            background: on ? "#fff" : "#fcfdfe", padding: "14px 15px",
            boxShadow: on ? "0 5px 16px rgba(17,47,93,.11)" : "0 1px 3px rgba(17,47,93,.05)",
            transition: "box-shadow 180ms, border-color 180ms",
          },
        },
          React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 11 } },
            React.createElement("span", { style: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, background: tb, color: th, flexShrink: 0 } }, window.Icons[r.icon]({ s: 19 })),
            React.createElement("span", { style: { flex: 1, minWidth: 0 } },
              React.createElement("span", { style: { display: "block", fontSize: 14.5, fontWeight: 800, color: C.slate, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, r.zh),
              React.createElement("span", { style: { display: "block", fontSize: 11.5, color: C.muted } }, r.name)
            ),
            React.createElement("span", { style: { fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: tb, color: th, flexShrink: 0 } }, r.scope)
          ),
          React.createElement("div", { style: { maxHeight: on ? 160 : 0, opacity: on ? 1 : 0, overflow: "hidden", transition: "max-height 280ms ease, opacity 220ms ease, margin-top 220ms ease", marginTop: on ? 11 : 0 } },
            React.createElement("p", { style: { margin: 0, fontSize: 13, color: C.slate, lineHeight: 1.78 } }, r.d)
          )
        );
      })
    )
  );
}

// ════════════════════════════════════════════════════════════════════
// 8. R&R — 互動 RACI Matrix
// ════════════════════════════════════════════════════════════════════
function RRRaci() {
  const { useState } = React;
  const COLS = ["PM", "PO", "Tech Lead", "QA"];
  const ROWS = [
    { t: "PRD 撰寫",  cells: ["R", "A", "C", "I"] },
    { t: "架構設計",  cells: ["I", "I", "A/R", "C"] },
    { t: "UAT 驗收",  cells: ["C", "A", "I", "R"] },
    { t: "上線核准",  cells: ["C", "A", "R", "I"] },
  ];
  const META = {
    R: { en: "Responsible", zh: "執行者",     color: C.blue500, bg: C.blue50, desc: "實際動手把事情做出來的人。" },
    A: { en: "Accountable", zh: "最終負責人", color: C.orange500, bg: C.orange50, desc: "對成敗負最終責任 —— 每件事只能有一位。" },
    C: { en: "Consulted",   zh: "被諮詢者",   color: "#2f88c4", bg: "#e9f3fb", desc: "提供意見、雙向溝通的專家。" },
    I: { en: "Informed",    zh: "需被通知者", color: C.muted, bg: C.n100, desc: "只需單向被告知結果的人。" },
  };
  const [spot, setSpot] = useState(null);
  const [row, setRow] = useState(null);

  const has = (cell, L) => cell.split("/").indexOf(L) >= 0;
  const countLetter = (L) => ROWS.reduce((n, r) => n + r.cells.filter((c) => has(c, L)).length, 0);

  const chip = (L) => {
    const m = META[L], on = spot === L;
    return React.createElement("button", {
      key: L, onClick: () => { setSpot((s) => (s === L ? null : L)); setRow(null); },
      style: {
        display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 13px 6px 8px", borderRadius: 999,
        border: `1.5px solid ${on ? m.color : C.n200}`, background: on ? m.bg : "#fff", cursor: "pointer",
        fontFamily: "var(--font-sans)", transition: "all 140ms",
      },
    },
      React.createElement("span", { style: { width: 22, height: 22, borderRadius: 6, background: m.color, color: "#fff", fontSize: 12.5, fontWeight: 900, display: "inline-flex", alignItems: "center", justifyContent: "center" } }, L),
      React.createElement("span", { style: { fontSize: 12.5, fontWeight: 700, color: C.slate } }, m.zh)
    );
  };

  const letterCell = (cell, rIdx) => {
    const parts = cell.split("/");
    const dim = (spot && !has(cell, spot)) || (row !== null && row !== rIdx);
    return React.createElement("td", { style: { padding: 7, textAlign: "center", borderTop: `1px solid ${C.n100}` } },
      React.createElement("span", { style: { display: "inline-flex", gap: 4, justifyContent: "center", opacity: dim ? 0.22 : 1, transition: "opacity 160ms" } },
        parts.map((L) => {
          const m = META[L], hot = spot === L;
          return React.createElement("span", {
            key: L, title: `${m.en} · ${m.zh}`,
            style: {
              width: 30, height: 30, borderRadius: 8, background: m.bg, color: m.color,
              fontSize: 14, fontWeight: 900, display: "inline-flex", alignItems: "center", justifyContent: "center",
              boxShadow: hot ? `0 0 0 2px ${m.color}` : "none",
            },
          }, L);
        })
      )
    );
  };

  // explanation text
  let exp;
  if (row !== null) {
    const r = ROWS[row];
    const byL = { R: [], A: [], C: [], I: [] };
    r.cells.forEach((c, i) => c.split("/").forEach((L) => byL[L].push(COLS[i])));
    const seg = (L, verb) => byL[L].length ? `${byL[L].join("、")} ${verb}(${L})` : null;
    const parts = [seg("A", "最終負責"), seg("R", "執行"), seg("C", "被諮詢"), seg("I", "被通知")].filter(Boolean);
    exp = React.createElement("span", null,
      React.createElement("strong", { style: { color: C.slate } }, `「${r.t}」`),
      "：", parts.join("；"), "。");
  } else if (spot) {
    const m = META[spot];
    exp = React.createElement("span", null,
      React.createElement("strong", { style: { color: m.color } }, `${spot} · ${m.en}（${m.zh}）`),
      "：", m.desc, ` 在此矩陣中共出現 ${countLetter(spot)} 次。`);
  } else {
    exp = "點上方 R / A / C / I 聚焦同類角色,或點任一列拆解該任務的權責分工。每列右側都標注「恰好 1 位 A」—— 這是 RACI 最重要的鐵律。";
  }

  const thBase = { padding: "11px 12px", fontSize: 13, fontWeight: 800, color: C.slate, borderBottom: `2px solid ${C.n200}`, whiteSpace: "nowrap" };

  return React.createElement(Figure, {
    id: "rr-raci", kind: "互動矩陣 · Interactive",
    caption: "RACI = Responsible(執行)、Accountable(最終負責)、Consulted(諮詢)、Informed(知會)。最容易出錯的鐵律:每項任務「A 只能有一個」,否則責任稀釋、出事互踢皮球。",
  },
    // legend / filter chips
    React.createElement("div", { style: { display: "flex", gap: 9, flexWrap: "wrap", marginBottom: 16 } },
      ["R", "A", "C", "I"].map(chip)
    ),
    // matrix
    React.createElement("div", { style: { overflowX: "auto", borderRadius: "var(--radius-md)", border: `1px solid ${C.n200}` } },
      React.createElement("table", { style: { width: "100%", minWidth: 560, borderCollapse: "collapse", fontFamily: "var(--font-sans)" } },
        React.createElement("thead", null,
          React.createElement("tr", null,
            React.createElement("th", { style: { ...thBase, textAlign: "left", background: "#fbfcfe" } }, "任務 \\ 角色"),
            COLS.map((c) => React.createElement("th", { key: c, style: { ...thBase, textAlign: "center", background: "#fbfcfe" } }, c)),
            React.createElement("th", { style: { ...thBase, textAlign: "center", background: "#fbfcfe" } }, "A 唯一性")
          )
        ),
        React.createElement("tbody", null,
          ROWS.map((r, rIdx) => {
            const aCount = r.cells.filter((c) => has(c, "A")).length;
            const seld = row === rIdx;
            return React.createElement("tr", {
              key: r.t, onClick: () => { setRow((x) => (x === rIdx ? null : rIdx)); setSpot(null); },
              style: { cursor: "pointer", background: seld ? C.blue50 : "#fff", transition: "background 140ms" },
            },
              React.createElement("td", { style: { padding: "11px 12px", fontSize: 13.5, fontWeight: 700, color: C.slate, borderTop: `1px solid ${C.n100}`, whiteSpace: "nowrap" } }, r.t),
              r.cells.map((c, i) => React.createElement(React.Fragment, { key: i }, letterCell(c, rIdx))),
              React.createElement("td", { style: { padding: "11px 12px", textAlign: "center", borderTop: `1px solid ${C.n100}`, borderLeft: `1px solid ${C.n100}` } },
                React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 999, background: C.green50, color: C.green, fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" } },
                  window.Icons.check({ s: 13 }), `${aCount} 位 A`)
              )
            );
          })
        )
      )
    ),
    // explanation
    React.createElement("div", { style: { marginTop: 14, padding: "12px 16px", borderRadius: "var(--radius-md)", background: row !== null ? C.blue50 : "#fbfcfe", borderLeft: `3px solid ${row !== null ? C.blue500 : (spot ? META[spot].color : C.n300)}`, fontSize: 13, lineHeight: 1.75, color: C.slate, minHeight: 22 } }, exp)
  );
}

const GENERATED = {
  "oauth-pkce-flow": OAuthFlow,
  "token-bucket": TokenBucket,
  "http-latency": HttpLatencyChart,
  "pm-project-vs-product-concept": ProjectVsProductConcept,
  "pm-project-vs-product-table": ProjectVsProductTable,
  "rr-structure": RRStructure,
  "rr-derived-roles": RRDerivedRoles,
  "rr-raci": RRRaci,
};
window.GENERATED = GENERATED;
