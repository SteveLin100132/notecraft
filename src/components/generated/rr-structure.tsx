import React, { useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { Sparkles, Pause, Play } from 'lucide-react';

// -----------------------------------------------------------------------
// R&R — Waterfall 指揮鏈 vs Agile 自組織圈（互動結構對照）
// 左欄：由上而下的指揮鏈（箭頭向下）；右欄：自組織圈（箭頭向內）。
// 點選任一角色於下方面板顯示完整職責；可暫停 / 恢復「權責流向」虛線動畫。
// -----------------------------------------------------------------------

type Side = 'wf' | 'ag';

interface Role {
  side: Side;
  abbr: string;
  name: string;
  zh: string;
  d: string;
}

const ROLES: Record<string, Role> = {
  pm: {
    side: 'wf',
    abbr: 'PM',
    name: 'Project Manager',
    zh: '專案經理',
    d: '負責專案整體規劃、執行與監控，確保專案如期、如質完成；管理團隊與資源，與利益相關者溝通協調，並處理風險與問題。站在指揮鏈頂端，由上而下指派工作。',
  },
  sa: {
    side: 'wf',
    abbr: '架構師',
    name: 'System Architect',
    zh: '系統架構師',
    d: '設計系統整體架構與技術方案，確保系統的可擴展性、可靠性與效能，並指導開發團隊進行技術實現。',
  },
  devw: {
    side: 'wf',
    abbr: '開發團隊',
    name: 'Development',
    zh: '開發團隊',
    d: '實際開發產品的成員，通常包含軟體工程師、設計師、測試人員等，依需求規格進行開發。',
  },
  qa: {
    side: 'wf',
    abbr: '測試團隊',
    name: 'QA Team',
    zh: '品保團隊',
    d: '負責品質保證，包括測試計劃設計、測試案例撰寫、測試執行與缺陷管理等，確保產品品質符合標準。',
  },
  po: {
    side: 'ag',
    abbr: 'PO',
    name: 'Product Owner',
    zh: '產品負責人',
    d: '定義產品願景、制定 Roadmap、規劃 MVP、管理 Product Backlog，並與團隊及利益相關者溝通，確保開發方向符合用戶需求與商業目標。',
  },
  sm: {
    side: 'ag',
    abbr: 'SM',
    name: 'Scrum Master',
    zh: '敏捷教練',
    d: '促進 Scrum 團隊的運作，協助團隊遵循 Scrum 流程，排除障礙，促進團隊協作，確保 Sprint 目標能順利達成。',
  },
  deva: {
    side: 'ag',
    abbr: '開發團隊',
    name: 'Dev Team',
    zh: '開發團隊',
    d: '自組織、跨功能的開發成員，共同對 Sprint 目標負責。沒有人由上而下指派工作，團隊一起決定如何達成目標。',
  },
};

function ColHead({ en, zh, tone }: { en: string; zh: string; tone: string }): React.ReactElement {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.16em', color: tone, marginBottom: 2 }}>
        {en}
      </div>
      <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--neutral-700)' }}>{zh}</div>
    </div>
  );
}

function Foot({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, marginTop: 6, textAlign: 'center' }}>
      {children}
    </div>
  );
}

export default function RrStructure(): React.ReactElement {
  const reduced = useReducedMotion() ?? false;
  const [sel, setSel] = useState<string | null>(null);
  const [flow, setFlow] = useState(true);
  const cur = sel ? ROLES[sel] : null;
  const animate = flow && !reduced;
  const dashClass = animate ? 'rr-flow' : undefined;
  const pick = (id: string) => setSel((s) => (s === id ? null : id));

  // Waterfall box node
  const wfNode = (id: string, x: number, y: number, w: number, h: number) => {
    const on = sel === id;
    const r = ROLES[id];
    return (
      <g className="rr-node" onClick={() => pick(id)} style={{ cursor: 'pointer' }}>
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          rx={9}
          fill={on ? 'var(--orange-50)' : 'var(--blue-50)'}
          stroke={on ? 'var(--orange-500)' : 'var(--blue-700)'}
          strokeWidth={on ? 2.4 : 1.6}
          style={{ transition: 'fill 160ms, stroke 160ms' }}
        />
        <text
          x={x + w / 2}
          y={y + h / 2 - 3}
          textAnchor="middle"
          fontSize={14.5}
          fontWeight={800}
          fill={on ? 'var(--orange-500)' : 'var(--blue-700)'}
          style={{ pointerEvents: 'none' }}
        >
          {r.abbr}
        </text>
        <text
          x={x + w / 2}
          y={y + h / 2 + 13}
          textAnchor="middle"
          fontSize={10}
          fill="var(--text-muted)"
          style={{ pointerEvents: 'none' }}
        >
          {r.name}
        </text>
      </g>
    );
  };

  // Agile circular node
  const agNode = (id: string, cx: number, cy: number, rad: number, big?: boolean) => {
    const on = sel === id;
    const tone = id === 'deva' ? 'var(--blue-700)' : 'var(--orange-500)';
    const fill = on
      ? id === 'deva'
        ? 'var(--blue-50)'
        : 'var(--orange-50)'
      : id === 'deva'
        ? 'var(--blue-50)'
        : 'var(--surface-card)';
    const r = ROLES[id];
    return (
      <g className="rr-node" onClick={() => pick(id)} style={{ cursor: 'pointer' }}>
        <circle
          cx={cx}
          cy={cy}
          r={rad}
          fill={fill}
          stroke={on ? 'var(--orange-500)' : tone}
          strokeWidth={on ? 2.8 : 2}
          style={{ transition: 'fill 160ms, stroke 160ms' }}
        />
        <text
          x={cx}
          y={cy + (big ? -4 : -2)}
          textAnchor="middle"
          fontSize={big ? 16 : 14}
          fontWeight={800}
          fill={on && id !== 'deva' ? 'var(--orange-500)' : tone}
          style={{ pointerEvents: 'none' }}
        >
          {r.abbr}
        </text>
        <text
          x={cx}
          y={cy + (big ? 15 : 12)}
          textAnchor="middle"
          fontSize={big ? 10.5 : 8.5}
          fill="var(--text-muted)"
          style={{ pointerEvents: 'none' }}
        >
          {big ? '自組織 · 跨功能' : r.name}
        </text>
      </g>
    );
  };

  return (
    <figure className="not-prose mx-auto" style={{ maxWidth: '48rem', margin: 0 }}>
      <style>{`@keyframes rrDash { to { stroke-dashoffset: -24; } } .rr-flow { animation: rrDash .8s linear infinite; }`}</style>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 18, flexWrap: 'wrap' }}>
        <button
          onClick={() => setFlow((f) => !f)}
          aria-label={flow ? '暫停權責流向' : '顯示權責流向'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            height: 38,
            padding: '0 16px',
            borderRadius: 'var(--radius-pill)',
            border: '1.5px solid var(--blue-700)',
            background: flow ? 'var(--blue-700)' : 'var(--surface-card)',
            color: flow ? 'var(--text-on-brand)' : 'var(--blue-700)',
            fontFamily: 'var(--font-sans)',
            fontWeight: 700,
            fontSize: 13.5,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {flow ? <Pause size={14} /> : <Play size={14} />}
          {flow ? '暫停權責流向' : '顯示權責流向'}
        </button>
        {sel && (
          <button
            onClick={() => setSel(null)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: 38,
              padding: '0 16px',
              borderRadius: 'var(--radius-pill)',
              border: '1.5px solid var(--neutral-300)',
              background: 'var(--surface-card)',
              color: 'var(--neutral-700)',
              fontFamily: 'var(--font-sans)',
              fontWeight: 700,
              fontSize: 13.5,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            清除選取
          </button>
        )}
      </div>

      {/* Two columns */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 0,
          alignItems: 'start',
        }}
      >
        {/* LEFT — waterfall (top-down command chain) */}
        <div style={{ paddingRight: 22, borderRight: '2px dashed var(--neutral-200)' }}>
          <ColHead en="WATERFALL" zh="指揮鏈 · 由上而下指派" tone="var(--blue-700)" />
          <svg viewBox="0 0 300 290" width="100%" style={{ fontFamily: 'var(--font-sans)' }}>
            <defs>
              <marker id="rrAhB" markerWidth={9} markerHeight={9} refX={7} refY={4.5} orient="auto">
                <path d="M0 0 L9 4.5 L0 9 Z" fill="var(--blue-500)" />
              </marker>
            </defs>
            <line className={dashClass} x1={150} y1={62} x2={150} y2={90} stroke="var(--blue-500)" strokeWidth={2} strokeDasharray="5 5" markerEnd="url(#rrAhB)" />
            <line x1={150} y1={140} x2={150} y2={168} stroke="var(--blue-500)" strokeWidth={2} />
            <line x1={80} y1={168} x2={220} y2={168} stroke="var(--blue-500)" strokeWidth={2} />
            <line className={dashClass} x1={80} y1={168} x2={80} y2={196} stroke="var(--blue-500)" strokeWidth={2} strokeDasharray="5 5" markerEnd="url(#rrAhB)" />
            <line className={dashClass} x1={220} y1={168} x2={220} y2={196} stroke="var(--blue-500)" strokeWidth={2} strokeDasharray="5 5" markerEnd="url(#rrAhB)" />
            {wfNode('pm', 70, 16, 160, 46)}
            {wfNode('sa', 58, 96, 184, 44)}
            {wfNode('devw', 18, 200, 124, 52)}
            {wfNode('qa', 158, 200, 124, 52)}
          </svg>
          <Foot>PM 在頂端拍板，指令逐層往下傳遞。</Foot>
        </div>

        {/* RIGHT — agile (self-organizing circle) */}
        <div style={{ paddingLeft: 22 }}>
          <ColHead en="AGILE" zh="自組織圈 · 由外圍服務" tone="var(--orange-500)" />
          <svg viewBox="0 0 300 290" width="100%" style={{ fontFamily: 'var(--font-sans)' }}>
            <defs>
              <marker id="rrAhO" markerWidth={9} markerHeight={9} refX={7} refY={4.5} orient="auto">
                <path d="M0 0 L9 4.5 L0 9 Z" fill="var(--orange-500)" />
              </marker>
            </defs>
            <circle cx={150} cy={165} r={96} fill="none" stroke="var(--neutral-200)" strokeWidth={2} strokeDasharray="3 7" />
            <path className={dashClass} d="M92 110 Q120 132 126 145" fill="none" stroke="var(--orange-500)" strokeWidth={2} strokeDasharray="5 5" markerEnd="url(#rrAhO)" />
            <path className={dashClass} d="M208 110 Q180 132 174 145" fill="none" stroke="var(--orange-500)" strokeWidth={2} strokeDasharray="5 5" markerEnd="url(#rrAhO)" />
            <text x={70} y={138} textAnchor="middle" fontSize={9.5} fill="var(--orange-500)" fontWeight={700}>
              餵養 Backlog
            </text>
            <text x={232} y={138} textAnchor="middle" fontSize={9.5} fill="var(--orange-500)" fontWeight={700}>
              排除障礙
            </text>
            {agNode('deva', 150, 165, 58, true)}
            {agNode('po', 68, 82, 38)}
            {agNode('sm', 232, 82, 38)}
          </svg>
          <Foot>團隊在中央自組織；PO 餵養方向、SM 移除障礙，都是「服務」。</Foot>
        </div>
      </div>

      {/* Detail panel */}
      <div
        style={{
          marginTop: 18,
          padding: '14px 18px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--neutral-200)',
          background: 'var(--neutral-50)',
          minHeight: 80,
        }}
      >
        {cur ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  letterSpacing: '.1em',
                  padding: '3px 9px',
                  borderRadius: 'var(--radius-pill)',
                  background: cur.side === 'wf' ? 'var(--blue-50)' : 'var(--orange-50)',
                  color: cur.side === 'wf' ? 'var(--blue-700)' : 'var(--orange-500)',
                }}
              >
                {cur.side === 'wf' ? 'WATERFALL' : 'AGILE'}
              </span>
              <span style={{ fontSize: 17, fontWeight: 900, color: 'var(--neutral-700)' }}>{cur.zh}</span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{cur.name}</span>
            </div>
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--neutral-700)', lineHeight: 1.8 }}>{cur.d}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: 'var(--text-muted)', fontSize: 13.5, lineHeight: 1.7 }}>
            <Sparkles size={17} style={{ color: 'var(--orange-500)', flexShrink: 0 }} />
            點選任一角色查看完整職責 —— 注意左欄箭頭一路向下（指派），右欄箭頭向內（服務）。
          </div>
        )}
      </div>
    </figure>
  );
}
