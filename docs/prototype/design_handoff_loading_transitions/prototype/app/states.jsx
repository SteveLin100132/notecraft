// NoteCraft — note-status states.
//   status: "empty"        → 新增筆記的初始（onboarding）畫面
//   status: "coming-soon"  → 結合 design system 的佔位插圖 + 彩蛋互動
// 兩者皆為自成一頁的螢幕，由 NoteView 依 frontmatter status 切換。
(function () {
const { useState, useRef } = React;

const SC = {
  blue: "var(--blue-700)", blue500: "var(--blue-500)", blue300: "var(--blue-300)", blue50: "var(--blue-50)",
  sky: "var(--sky-600)",
  orange: "var(--orange-500)", orange400: "var(--orange-400)", orange50: "var(--orange-50)",
  ink: "var(--text-strong)", body: "var(--text-body)", muted: "var(--text-muted)",
  n100: "var(--neutral-100)", n200: "var(--neutral-200)", n300: "var(--neutral-300)", n50: "var(--neutral-50)",
};
const I = (n, o) => window.Icons[n](o || {});

// 唯讀標籤列（兩個 placeholder 狀態共用）
function TagChips({ tags }) {
  if (!tags || !tags.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
      {tags.map((tg) => (
        <span key={tg} style={{ fontSize: 12, fontWeight: 600, color: SC.blue, background: SC.blue50, padding: "3px 10px", borderRadius: 999 }}>{tg}</span>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  EMPTY — 新增筆記後的初始畫面
// ════════════════════════════════════════════════════════════════════
function EmptyNoteState({ note, devMode }) {
  const { Badge, Button } = window.TrendLinkDesignSystem_b2a0d6;
  const [copied, setCopied] = useState(false);

  const tagsStr = note.tags && note.tags.length ? `[${note.tags.join(", ")}]` : "[]";
  const tpl =
`---
title: ${note.title}
description:
tags: ${tagsStr}
status: empty
createdAt: ${note.createdAt}
---

{/* 開始撰寫內容，並在需要圖表、動畫或互動之處插入標記： */}
{/* @ai-visualize: 用一句話描述你想要的視覺化 */}
`;
  const copy = () => {
    try { navigator.clipboard.writeText(tpl); } catch (e) {}
    setCopied(true); setTimeout(() => setCopied(false), 1700);
  };

  const steps = [
    ["撰寫", "在 VS Code 自由寫下文字內容", "edit", "blue"],
    ["標記", "在需要圖、動畫、互動處填入 @ai-visualize 提示詞", "sparkle", "orange"],
    ["生成", "在 Claude Code 請 AI 掃描標記、產出元件", "code", "blue"],
    ["發佈", "commit 後由 CI 自動 build & deploy", "layers", "orange"],
  ];

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      {/* hero illustration */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
        <BlankPageArt />
      </div>

      <div style={{ textAlign: "center", marginBottom: 26 }}>
        <div className="tl-eyebrow" style={{ justifyContent: "center", marginBottom: 12 }}>EMPTY NOTE</div>
        <div style={{ display: "inline-flex", marginBottom: 14 }}>
          <Badge tone="neutral" variant="soft">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>{I("edit", { s: 12 })}草稿 · 尚無內容</span>
          </Badge>
        </div>
        <h1 style={{ fontSize: "var(--text-4xl)", color: SC.ink, lineHeight: 1.2, margin: "0 0 12px", fontWeight: 900 }}>{note.title}</h1>
        <p style={{ fontSize: "var(--text-lg)", color: SC.muted, lineHeight: 1.7, margin: "0 auto", maxWidth: 540 }}>
          這篇筆記剛建立、還是一張白紙。依下面四步，就能把它變成會「動」的互動筆記。
        </p>
      </div>

      {/* frontmatter starter */}
      <div style={{ borderRadius: "var(--radius-lg)", overflow: "hidden", border: `1px solid ${SC.n200}`, background: "#fff", boxShadow: "var(--shadow-sm)", marginBottom: 26 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 14px", background: SC.n50, borderBottom: `1px solid ${SC.n200}` }}>
          <span style={{ display: "inline-flex", color: SC.orange }}>{I("code", { s: 15 })}</span>
          <code style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, fontWeight: 700, letterSpacing: ".04em", color: SC.muted }}>{`src/content/notes/${note.slug}.mdx`}</code>
          <button onClick={copy} style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600, padding: "5px 11px", borderRadius: 999, border: `1px solid ${copied ? "rgba(46,158,107,0.45)" : SC.n300}`, background: copied ? "var(--success-50)" : "#fff", color: copied ? "var(--success-500)" : SC.muted, transition: "all 140ms" }}>
            {copied ? I("check", { s: 14 }) : I("copy", { s: 14 })}{copied ? "已複製" : "複製範本"}
          </button>
        </div>
        <pre style={{ margin: 0, padding: "16px 18px", overflowX: "auto", fontFamily: "var(--font-mono)", fontSize: 13, lineHeight: 1.85, color: SC.body }}>
          <code>
            <span style={{ color: SC.n300 }}>{"---\n"}</span>
            <FmLine k="title" v={note.title} />
            <FmLine k="description" v="" />
            <FmLine k="tags" v={tagsStr} />
            <FmLine k="status" v="empty" hl />
            <FmLine k="createdAt" v={note.createdAt} />
            <span style={{ color: SC.n300 }}>{"---\n\n"}</span>
            <span style={{ color: SC.muted, fontStyle: "italic" }}>{"{/* 開始撰寫內容，並插入 @ai-visualize 標記… */}"}</span>
          </code>
        </pre>
      </div>

      {/* lifecycle steps */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginBottom: 26 }}>
        {steps.map(([t, d, ic, tone], i) => (
          <div key={t} style={{ display: "flex", gap: 13, alignItems: "flex-start", padding: 16, borderRadius: "var(--radius-md)", border: `1px solid ${SC.n200}`, borderTop: `3px solid ${tone === "orange" ? SC.orange400 : SC.blue500}`, background: "#fff" }}>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 8, background: tone === "orange" ? SC.orange50 : SC.blue50, color: tone === "orange" ? SC.orange : SC.blue, flex: "none" }}>{I(ic, { s: 18 })}</span>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: SC.muted, letterSpacing: ".05em" }}>{`STEP ${i + 1}`}</div>
              <div style={{ fontSize: 15.5, fontWeight: 800, color: SC.ink, margin: "2px 0 4px" }}>{t}</div>
              <div style={{ fontSize: 12.5, color: SC.muted, lineHeight: 1.65 }}>{d}</div>
            </div>
          </div>
        ))}
      </div>

      {/* CTAs */}
      {devMode && (
        <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
          <Button variant="primary" size="md" iconLeft={I("edit", { s: 17 })}
            onClick={() => window.dispatchEvent(new CustomEvent("nc-toast", { detail: { msg: `已喚起 VS Code 開啟 ${note.slug}.mdx`, icon: "code" } }))}>
            以 VS Code 編輯
          </Button>
          <Button variant="outline" size="md" iconLeft={copied ? I("check", { s: 16 }) : I("clipboard", { s: 16 })} onClick={copy}>
            {copied ? "已複製 MDX 範本" : "複製 MDX 範本"}
          </Button>
        </div>
      )}
    </div>
  );
}

function FmLine({ k, v, hl }) {
  return (
    <span>
      <span style={{ color: hl ? SC.orange : SC.blue, fontWeight: hl ? 800 : 600 }}>{k}</span>
      <span style={{ color: SC.n300 }}>{": "}</span>
      <span style={{ color: hl ? SC.orange : SC.body, fontWeight: hl ? 700 : 400 }}>{v}</span>
      {hl && <span style={{ color: SC.orange400, fontStyle: "italic" }}>{"   ← 新屬性"}</span>}
      {"\n"}
    </span>
  );
}

// 空白 MDX 文件插圖（line-art，brand 配色）
function BlankPageArt() {
  return (
    <svg viewBox="0 0 200 168" width="170" height="143" style={{ overflow: "visible" }} aria-hidden="true">
      <ellipse cx="100" cy="150" rx="62" ry="9" fill="var(--blue-50)" />
      {/* page */}
      <g style={{ animation: "ncRise 520ms cubic-bezier(0.16,1,0.3,1) both" }}>
        <path d="M52 22h70l26 26v92a4 4 0 0 1-4 4H52a4 4 0 0 1-4-4V26a4 4 0 0 1 4-4Z" fill="#fff" stroke="var(--blue-300)" strokeWidth="2" />
        <path d="M122 22v26h26" fill="none" stroke="var(--blue-300)" strokeWidth="2" strokeLinejoin="round" />
        {/* dashed content lines */}
        {[70, 84, 98, 112].map((y, i) => (
          <line key={y} x1="64" y1={y} x2={i === 3 ? 108 : 134} y2={y} stroke="var(--neutral-200)" strokeWidth="4" strokeLinecap="round" strokeDasharray="2 8" />
        ))}
      </g>
      {/* sparkle badge */}
      <g style={{ transformOrigin: "150px 36px", animation: "ncPop 520ms 220ms cubic-bezier(0.16,1,0.3,1) both" }}>
        <circle cx="150" cy="36" r="17" fill="var(--orange-50)" stroke="var(--orange-400)" strokeWidth="2" />
        <path d="M150 27l2.4 6.1 6.1 2.4-6.1 2.4L150 44l-2.4-6.1-6.1-2.4 6.1-2.4Z" fill="var(--orange-500)" />
      </g>
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════════
//  COMING SOON — 佔位插圖 + 彩蛋互動
// ════════════════════════════════════════════════════════════════════
const PARTICLE_COLORS = ["var(--orange-500)", "var(--blue-500)", "var(--orange-400)", "var(--sky-600)"];

function ComingSoonState({ note }) {
  const { Badge } = window.TrendLinkDesignSystem_b2a0d6;
  const figRef = useRef(null);
  const idRef = useRef(0);
  const tapsRef = useRef(0);
  const [parts, setParts] = useState([]);   // 飛濺粒子（短暫）
  const [dots, setDots] = useState([]);      // 畫布上的速寫點（保留）
  const [spin, setSpin] = useState(0);       // 中央 sparkle 點擊旋轉
  const [taps, setTaps] = useState(0);       // sparkle 點擊次數
  const [unlocked, setUnlocked] = useState(false);

  const burst = (cx, cy, n, big) => {
    const add = [];
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = (big ? 54 : 30) + Math.random() * (big ? 78 : 42);
      add.push({
        id: idRef.current++, x: cx, y: cy,
        dx: Math.cos(ang) * dist, dy: -Math.abs(Math.sin(ang) * dist) - (big ? 40 : 26),
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
        rot: (Math.random() * 160 - 80) + "deg",
        size: big ? 11 + Math.random() * 9 : 8 + Math.random() * 5,
      });
    }
    setParts((p) => [...p, ...add]);
    const ids = add.map((a) => a.id);
    setTimeout(() => setParts((p) => p.filter((x) => !ids.includes(x.id))), 1050);
  };

  const figXY = (e) => {
    const r = figRef.current.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top, r];
  };

  // 彩蛋 1：點畫布任意處 → 落下一個 brand 速寫點（像在幫忙畫）
  const onCanvas = (e) => {
    const [x, y] = figXY(e);
    setDots((d) => [...d.slice(-15), { id: idRef.current++, x, y, c: PARTICLE_COLORS[d.length % 2] }]);
  };

  // 彩蛋 2：點中央 sparkle → 粒子噴發 + 計數；第 7 下解鎖隱藏訊息
  const onSparkle = (e) => {
    e.stopPropagation();
    const [x, y, r] = figXY(e);
    burst(x, y, 9, false);
    setSpin((s) => s + 200);
    tapsRef.current += 1;
    const nt = tapsRef.current;
    setTaps(nt);
    if (nt >= 7 && !unlocked) {
      setUnlocked(true);
      burst(r.width / 2, r.height / 2 - 10, 28, true);
      window.dispatchEvent(new CustomEvent("nc-toast", { detail: { msg: "彩蛋解鎖 · 聯和趨動 7645", icon: "sparkle" } }));
    }
  };

  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      <style>{`
        @keyframes scFloat { 0%{opacity:1;transform:translate(-50%,-50%) scale(1) rotate(0)} 100%{opacity:0;transform:translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(.5) rotate(var(--rot))} }
        @keyframes scSpin { to { transform: rotate(360deg) } }
        @keyframes scPulse { 0%,100%{transform:scale(1);opacity:.9} 50%{transform:scale(1.08);opacity:1} }
        .sc-ring { animation: scSpin 17s linear infinite; transform-origin:center }
        @media (prefers-reduced-motion: reduce){ .sc-ring{animation:none} }
      `}</style>

      <TagChips tags={note.tags} />
      <div style={{ display: "inline-flex", marginBottom: 12 }}>
        <Badge tone="orange" variant="soft">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>{I("sparkle", { s: 12 })}即將登場</span>
        </Badge>
      </div>
      <h1 style={{ fontSize: "var(--text-4xl)", color: SC.ink, lineHeight: 1.2, margin: "0 0 12px", fontWeight: 900 }}>{note.title}</h1>
      {note.description && (
        <p style={{ fontSize: "var(--text-lg)", color: SC.muted, lineHeight: 1.7, margin: "0 0 22px", maxWidth: 620 }}>{note.description}</p>
      )}

      {/* ── 佔位畫布（artboard）── */}
      <figure
        ref={figRef}
        onClick={onCanvas}
        style={{ position: "relative", margin: "0 0 16px", padding: 0, borderRadius: "var(--radius-lg)", overflow: "hidden", border: `1px dashed ${SC.n300}`, background: "linear-gradient(180deg, var(--blue-50) 0%, #fff 70%)", cursor: "crosshair", userSelect: "none" }}
      >
        {/* 中央插圖 — 強調 Coming Soon */}
        <div style={{ position: "relative", height: 360, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 26 }}>
          {/* 旋轉 dashed ring + 衛星點 */}
          <div style={{ position: "relative", width: 168, height: 168, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg className="sc-ring" viewBox="0 0 168 168" width="168" height="168" style={{ position: "absolute", inset: 0 }}>
              <circle cx="84" cy="84" r="74" fill="none" stroke={SC.n200} strokeWidth="2" strokeDasharray="3 9" />
              <circle cx="84" cy="10" r="6" fill="var(--orange-500)" />
              <circle cx="158" cy="84" r="5" fill="var(--blue-500)" />
              <circle cx="84" cy="158" r="4.5" fill="var(--sky-600)" />
              <circle cx="10" cy="84" r="4" fill="var(--orange-400)" />
            </svg>
            {/* 中央 sparkle（彩蛋鈕）*/}
            <button
              onClick={onSparkle}
              title="這顆會發光的東西，似乎可以點…"
              style={{ position: "relative", zIndex: 2, width: 96, height: 96, borderRadius: "50%", border: "none", cursor: "pointer", background: "radial-gradient(circle at 50% 42%, var(--orange-50) 0%, #fff 72%)", boxShadow: "0 8px 26px rgba(227,123,36,0.22), 0 0 0 1px var(--orange-100)", display: "flex", alignItems: "center", justifyContent: "center", transform: `rotate(${spin}deg)`, transition: "transform 620ms cubic-bezier(0.16,1,0.3,1)" }}
            >
              <span style={{ display: "flex", color: SC.orange, animation: "scPulse 2.6s ease-in-out infinite" }}>{I("sparkle", { s: 46 })}</span>
            </button>
          </div>

          {/* 強調的 Coming Soon 字樣 */}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "clamp(40px, 6vw, 58px)", fontWeight: 900, color: SC.blue, lineHeight: 1, letterSpacing: "-0.02em" }}>Coming Soon</div>
            <div style={{ marginTop: 14, fontSize: 15, fontWeight: 800, letterSpacing: ".42em", textIndent: ".42em", color: SC.orange, textTransform: "uppercase" }}>即將登場</div>
          </div>
        </div>

        {/* 短暫粒子 */}
        {parts.map((p) => (
          <span key={p.id} style={{ position: "absolute", left: p.x, top: p.y, color: p.color, pointerEvents: "none", zIndex: 4, "--dx": p.dx + "px", "--dy": p.dy + "px", "--rot": p.rot, animation: "scFloat 1s cubic-bezier(0.16,1,0.3,1) forwards" }}>
            {I("sparkle", { s: p.size })}
          </span>
        ))}
        {/* 保留的速寫點 */}
        {dots.map((d) => (
          <span key={d.id} style={{ position: "absolute", left: d.x, top: d.y, width: 9, height: 9, marginLeft: -4.5, marginTop: -4.5, borderRadius: "50%", background: d.c, pointerEvents: "none", zIndex: 3, boxShadow: "0 0 0 3px color-mix(in srgb, " + d.c + " 18%, transparent)", animation: "ncPop 320ms cubic-bezier(0.16,1,0.3,1)" }} />
        ))}
      </figure>

      {/* 給讀者的訊息 */}
      <p style={{ fontSize: 14.5, color: SC.muted, lineHeight: 1.8, margin: "0 auto", maxWidth: 520, textAlign: "center" }}>
        這篇筆記正在細細打磨，很快就會與你見面。
        <span style={{ display: "block", marginTop: 6, fontSize: 12.5, color: SC.n300 }}>
          {taps > 0 ? `（這塊畫布藏了點東西…你已經點亮 ${taps} / 7 ✦）` : "（這塊畫布似乎藏了點東西，不妨點點看）"}
        </span>
      </p>

      {/* 彩蛋解鎖面板 */}
      {unlocked && (
        <div style={{ marginTop: 20, padding: "20px 24px", borderRadius: "var(--radius-lg)", border: "1px solid var(--orange-200)", background: "linear-gradient(120deg, var(--orange-50), #fff 80%)", boxShadow: "var(--shadow-sm)", animation: "ncRise 360ms cubic-bezier(0.16,1,0.3,1) both" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 8, background: "var(--orange-100)", color: SC.orange }}>{I("sparkle", { s: 17 })}</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: SC.ink }}>彩蛋解鎖</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: SC.orange, marginLeft: 4 }}>7645</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {["聯結夥伴", "和睦溝通", "趨動前進", "動見成長"].map((w, i) => (
              <span key={w} style={{ padding: "6px 13px", borderRadius: 999, background: i % 2 ? SC.blue50 : SC.orange50, color: i % 2 ? SC.blue : SC.orange, fontSize: 13.5, fontWeight: 800 }}>{w}</span>
            ))}
          </div>
          <p style={{ margin: "12px 0 0", fontSize: 13, color: SC.muted, lineHeight: 1.7 }}>謝謝你願意停下來等它 —— 筆記上線時，這裡就會換上完整內容。</p>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { EmptyNoteState, ComingSoonState });
})();
