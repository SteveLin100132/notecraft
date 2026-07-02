import React, { useState, useRef, useEffect } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────

const VB_W = 900;
const VB_H = 360;

// Lane regions
const HUMAN_Y_TOP = 30;
const HUMAN_Y_BOT = 148;
const AI_Y_TOP = 172;
const AI_Y_BOT = 300;
const LANE_MID_HUMAN = (HUMAN_Y_TOP + HUMAN_Y_BOT) / 2; // 89
const LANE_MID_AI = (AI_Y_TOP + AI_Y_BOT) / 2; // 236

// Node dimensions
const NODE_W = 88;
const NODE_H = 40;
const NODE_RX = 8;

// Column x-centers for 6 columns (index 0–5)
const COL_X = [82, 202, 322, 442, 562, 722];

// Subagent cluster (step 4/5): 3 nodes side by side at col 4
const SUB_AGENT_X = [530, 562, 594];
const SUB_AGENT_Y = LANE_MID_AI;

// Node definitions
const NODES = {
  // Human lane
  pmsa:  { id: 'pmsa',   label: 'PM / SA',    lane: 'human', col: 0, x: COL_X[0], y: LANE_MID_HUMAN },
  sd:    { id: 'sd',     label: 'SD',          lane: 'human', col: 1, x: COL_X[1], y: LANE_MID_HUMAN },
  teddy: { id: 'teddy',  label: 'Teddy',       lane: 'human', col: 4, x: COL_X[4], y: LANE_MID_HUMAN },
  qa:    { id: 'qa',     label: 'QA',          lane: 'human', col: 5, x: COL_X[5], y: LANE_MID_HUMAN },
  // AI lane
  mainAgent: { id: 'mainAgent', label: '主 Agent', lane: 'ai', col: 2, x: COL_X[2], y: LANE_MID_AI },
  // Subagents are handled separately as a cluster at col 4
} as const;

type NodeId = keyof typeof NODES | 'sub1' | 'sub2' | 'sub3';

// Which nodes are "active" at each step
const STEP_ACTIVE: Record<number, NodeId[]> = {
  0: [],
  1: ['pmsa'],
  2: ['sd', 'mainAgent'],
  3: ['mainAgent'],
  4: ['mainAgent', 'sub1', 'sub2', 'sub3'],
  5: ['sub1', 'sub2', 'sub3', 'teddy'],
  6: ['qa', 'mainAgent'],
};

interface ArtifactLabel {
  text: string;
  x: number;
  y: number;
}

const STEP_ARTIFACTS: Record<number, ArtifactLabel[]> = {
  0: [],
  1: [{ text: '需求摘要', x: COL_X[0], y: 16 }],
  2: [
    { text: 'Proposal', x: COL_X[1] - 82, y: 16 },
    { text: 'Design',   x: COL_X[1],      y: 16 },
    { text: 'Task',     x: COL_X[1] + 82, y: 16 },
  ],
  3: [{ text: 'Task MD', x: COL_X[2], y: AI_Y_BOT + 26 }],
  4: [{ text: 'Sub-tasks', x: COL_X[3], y: AI_Y_BOT + 26 }],
  5: [{ text: 'PR', x: (COL_X[4] + COL_X[4]) / 2, y: (LANE_MID_HUMAN + LANE_MID_AI) / 2 }],
  6: [{ text: '驗收報告', x: COL_X[5], y: AI_Y_BOT + 26 }],
};

const STEP_LABELS: string[] = [
  '點擊下一步開始',
  'PM / SA 提出需求',
  'SD 規劃、下派給主 Agent',
  '主 Agent 拆解任務',
  '主 Agent 分派 Subagents',
  'Subagents 執行、Teddy 把關',
  'QA 驗收、主 Agent 更新狀態',
];

const TOTAL_STEPS = 6;

// ─── Helper: node rect path ───────────────────────────────────────────────────

function NodeRect({
  cx,
  cy,
  label,
  lane,
  active,
  highlight,
  shouldReduce,
}: {
  cx: number;
  cy: number;
  label: string;
  lane: 'human' | 'ai';
  active: boolean;
  highlight?: boolean;
  shouldReduce: boolean | null;
}) {
  const isHuman = lane === 'human';
  // fill
  const fillActive = isHuman ? '#1b4f9c' : '#ed9b26';
  const fillInactive = isHuman ? '#adc8e8' : '#f6cd86';
  const textActive = isHuman ? '#ffffff' : '#161c28';
  const textInactive = isHuman ? '#163f7d' : '#a04f15';

  const dur = shouldReduce ? 0 : 0.22;

  return (
    <motion.g
      animate={{
        opacity: active ? 1 : 0.2,
        scale: active ? 1 : 1,
      }}
      transition={{ duration: dur, ease: 'easeOut' }}
      style={{ originX: `${cx}px`, originY: `${cy}px` }}
    >
      {highlight && (
        <rect
          x={cx - NODE_W / 2 - 3}
          y={cy - NODE_H / 2 - 3}
          width={NODE_W + 6}
          height={NODE_H + 6}
          rx={NODE_RX + 3}
          fill="none"
          stroke="#e37b24"
          strokeWidth={2.5}
        />
      )}
      <rect
        x={cx - NODE_W / 2}
        y={cy - NODE_H / 2}
        width={NODE_W}
        height={NODE_H}
        rx={NODE_RX}
        fill={active ? fillActive : fillInactive}
      />
      <text
        x={cx}
        y={cy + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={13}
        fontWeight="600"
        fill={active ? textActive : textInactive}
      >
        {label}
      </text>
    </motion.g>
  );
}

// ─── Subagent small circle node ───────────────────────────────────────────────

function SubAgentNode({
  cx,
  cy,
  active,
  shouldReduce,
  delay,
}: {
  cx: number;
  cy: number;
  active: boolean;
  shouldReduce: boolean | null;
  delay: number;
}) {
  const dur = shouldReduce ? 0 : 0.28;
  return (
    <motion.g
      animate={{ opacity: active ? 1 : 0.2, scale: active ? 1.04 : 1 }}
      transition={{ duration: dur, ease: 'easeOut', delay: active && !shouldReduce ? delay : 0 }}
      style={{ originX: `${cx}px`, originY: `${cy}px` }}
    >
      <circle cx={cx} cy={cy} r={20} fill={active ? '#ed9b26' : '#f6cd86'} />
      {/* Inline CPU-style icon (top half) + "AI" label (bottom) */}
      <rect x={cx - 5} y={cy - 9} width={10} height={10} rx={2} fill="none" stroke={active ? '#161c28' : '#a04f15'} strokeWidth={1.2} />
      <line x1={cx - 2} y1={cy - 9} x2={cx - 2} y2={cy - 12} stroke={active ? '#161c28' : '#a04f15'} strokeWidth={1} />
      <line x1={cx + 2} y1={cy - 9} x2={cx + 2} y2={cy - 12} stroke={active ? '#161c28' : '#a04f15'} strokeWidth={1} />
      <text
        x={cx}
        y={cy + 7}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={9}
        fontWeight="700"
        fill={active ? '#161c28' : '#a04f15'}
      >
        AI
      </text>
    </motion.g>
  );
}

// ─── Arrow (simple horizontal) ────────────────────────────────────────────────

function Arrow({
  x1,
  y1,
  x2,
  y2,
  active,
  color,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  active: boolean;
  color?: string;
}) {
  const stroke = color ?? (active ? '#2c6ebb' : '#9aa6b8');
  const sw = active ? 2 : 1.5;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / len;
  const uy = dy / len;
  const arrowLen = 8;
  const arrowW = 4;
  const bx = x2 - ux * arrowLen;
  const by = y2 - uy * arrowLen;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      <polygon
        points={`${x2},${y2} ${bx - uy * arrowW},${by + ux * arrowW} ${bx + uy * arrowW},${by - ux * arrowW}`}
        fill={stroke}
      />
    </g>
  );
}

// ─── Return arc (QA -> Main Agent) ────────────────────────────────────────────

function ReturnArc({
  visible,
  shouldReduce,
}: {
  visible: boolean;
  shouldReduce: boolean | null;
}) {
  const pathRef = useRef<SVGPathElement>(null);
  const [totalLen, setTotalLen] = useState(0);

  // QA center to mainAgent center, arc below the AI lane
  const x1 = COL_X[5];
  const y1 = LANE_MID_AI + NODE_H / 2;
  const x2 = COL_X[2];
  const y2 = LANE_MID_AI + NODE_H / 2;
  const arcD = `M ${x1} ${y1} C ${x1} ${y1 + 60}, ${x2} ${y2 + 60}, ${x2} ${y2}`;

  useEffect(() => {
    if (pathRef.current) {
      setTotalLen(pathRef.current.getTotalLength());
    }
  }, []);

  const dur = shouldReduce ? 0 : 0.5;

  return (
    <g>
      {/* Hidden path to measure length */}
      <path ref={pathRef} d={arcD} fill="none" stroke="transparent" strokeWidth={0} />
      <AnimatePresence>
        {visible && totalLen > 0 && (
          <motion.path
            key="arc"
            d={arcD}
            fill="none"
            stroke="#e37b24"
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray={totalLen}
            initial={{ strokeDashoffset: totalLen }}
            animate={{ strokeDashoffset: 0 }}
            exit={{ strokeDashoffset: totalLen, opacity: 0 }}
            transition={{ duration: dur, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>
      {/* Static arrowhead at destination */}
      {visible && (
        <polygon
          points={`${x2},${y2} ${x2 - 5},${y2 + 8} ${x2 + 5},${y2 + 8}`}
          fill="#e37b24"
          opacity={visible ? 1 : 0}
        />
      )}
    </g>
  );
}

// ─── Artifact floating label ──────────────────────────────────────────────────

function ArtifactTag({ text, x, y }: ArtifactLabel) {
  return (
    <foreignObject x={x - 36} y={y - 14} width={72} height={28} style={{ overflow: 'visible' }}>
      <div
        style={{
          background: 'var(--surface-card, #ffffff)',
          border: '1px solid var(--border-default, #cbd3df)',
          boxShadow: 'var(--shadow-sm, 0 2px 6px rgba(17,47,93,0.08))',
          borderRadius: 6,
          padding: '2px 8px',
          fontSize: 11,
          fontWeight: 500,
          color: 'var(--text-strong, #161c28)',
          whiteSpace: 'nowrap',
          display: 'inline-block',
          lineHeight: '1.6',
        }}
      >
        {text}
      </div>
    </foreignObject>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AgentCollaborationFlow() {
  const [step, setStep] = useState(0);
  const shouldReduce = useReducedMotion();

  const activeNodes = STEP_ACTIVE[step] ?? [];
  const artifacts = STEP_ARTIFACTS[step] ?? [];

  const isActive = (id: NodeId) => activeNodes.includes(id);

  const dur = shouldReduce ? 0 : 0.22;

  function goNext() {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }
  function goPrev() {
    setStep((s) => Math.max(s - 1, 0));
  }

  // Connections to draw per step — only show during their relevant step to avoid stale visual noise
  const showSdToAgent = step === 2;
  const showAgentToSubs = step === 4;
  const showSubsToTeddy = step === 5;
  const showReturnArc = step === 6;

  // Teddy highlight (把關者) at step 5
  const teddyHighlight = step === 5;

  // MainAgent extra label at step 6
  const mainAgentLabel6 = step === 6;

  return (
    <div className="not-prose max-w-4xl mx-auto space-y-4">
      {/* SVG Diagram */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          width="100%"
          preserveAspectRatio="xMidYMid meet"
          aria-label="AI 顧問協作流程圖"
          role="img"
          style={{ display: 'block' }}
        >
          {/* ── Lane backgrounds ── */}
          <rect
            x={0}
            y={HUMAN_Y_TOP}
            width={VB_W}
            height={HUMAN_Y_BOT - HUMAN_Y_TOP}
            fill="#eef4fb"
            rx={0}
          />
          <rect
            x={0}
            y={AI_Y_TOP}
            width={VB_W}
            height={AI_Y_BOT - AI_Y_TOP}
            fill="#fdf4e6"
            rx={0}
          />

          {/* ── Lane divider dashes ── */}
          <line
            x1={80}
            y1={(HUMAN_Y_BOT + AI_Y_TOP) / 2}
            x2={VB_W - 10}
            y2={(HUMAN_Y_BOT + AI_Y_TOP) / 2}
            stroke="#e1e6ee"
            strokeWidth={1}
            strokeDasharray="4 4"
          />

          {/* ── Lane labels ── */}
          <text
            x={12}
            y={LANE_MID_HUMAN}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={10}
            fontWeight="700"
            fill="#1b4f9c"
            transform={`rotate(-90, 12, ${LANE_MID_HUMAN})`}
          >
            人角色
          </text>
          <text
            x={12}
            y={LANE_MID_AI}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={10}
            fontWeight="700"
            fill="#e37b24"
            transform={`rotate(-90, 12, ${LANE_MID_AI})`}
          >
            AI 角色
          </text>

          {/* ── Static connector lines (always visible, dim when inactive) ── */}
          {/* pmsa → sd (human lane) */}
          <line
            x1={COL_X[0] + NODE_W / 2}
            y1={LANE_MID_HUMAN}
            x2={COL_X[1] - NODE_W / 2}
            y2={LANE_MID_HUMAN}
            stroke="#9aa6b8"
            strokeWidth={1}
            strokeDasharray="3 3"
          />

          {/* SD → Main Agent cross-lane connector */}
          {showSdToAgent && (
            <Arrow
              x1={COL_X[1]}
              y1={LANE_MID_HUMAN + NODE_H / 2}
              x2={COL_X[2]}
              y2={LANE_MID_AI - NODE_H / 2}
              active={step === 2}
              color={step === 2 ? '#2c6ebb' : '#9aa6b8'}
            />
          )}

          {/* Main Agent → Subagents */}
          {showAgentToSubs && (
            <>
              <Arrow
                x1={COL_X[2] + NODE_W / 2}
                y1={LANE_MID_AI}
                x2={SUB_AGENT_X[0] - 20}
                y2={SUB_AGENT_Y}
                active={step >= 4}
                color={step >= 4 ? '#2c6ebb' : '#9aa6b8'}
              />
            </>
          )}

          {/* Subagents → Teddy (step 5) */}
          {showSubsToTeddy && (
            <Arrow
              x1={SUB_AGENT_X[2] + 20}
              y1={SUB_AGENT_Y}
              x2={COL_X[4] - NODE_W / 2}
              y2={LANE_MID_HUMAN}
              active
              color="#ed9b26"
            />
          )}

          {/* Return arc QA → Main Agent (step 6) */}
          <ReturnArc visible={showReturnArc} shouldReduce={shouldReduce} />

          {/* ── Human lane nodes ── */}
          <NodeRect
            cx={NODES.pmsa.x}
            cy={NODES.pmsa.y}
            label="PM / SA"
            lane="human"
            active={isActive('pmsa')}
            shouldReduce={shouldReduce}
          />
          <NodeRect
            cx={NODES.sd.x}
            cy={NODES.sd.y}
            label="SD"
            lane="human"
            active={isActive('sd')}
            shouldReduce={shouldReduce}
          />
          <NodeRect
            cx={NODES.teddy.x}
            cy={NODES.teddy.y}
            label="Teddy"
            lane="human"
            active={isActive('teddy')}
            highlight={teddyHighlight}
            shouldReduce={shouldReduce}
          />
          <NodeRect
            cx={NODES.qa.x}
            cy={NODES.qa.y}
            label="QA"
            lane="human"
            active={isActive('qa')}
            shouldReduce={shouldReduce}
          />

          {/* ── AI lane: Main Agent ── */}
          <NodeRect
            cx={NODES.mainAgent.x}
            cy={NODES.mainAgent.y}
            label="主 Agent"
            lane="ai"
            active={isActive('mainAgent')}
            shouldReduce={shouldReduce}
          />

          {/* Step 6 extra label on main agent (positioned above node to avoid return-arc overlap) */}
          {mainAgentLabel6 && (
            <text
              x={NODES.mainAgent.x}
              y={NODES.mainAgent.y - NODE_H / 2 - 8}
              textAnchor="middle"
              fontSize={11}
              fill="#a04f15"
              fontWeight="700"
            >
              更新任務狀態
            </text>
          )}

          {/* ── AI lane: Subagents (stagger) ── */}
          {([0, 1, 2] as const).map((i) => {
            const id = `sub${i + 1}` as NodeId;
            const active = isActive(id);
            return (
              <SubAgentNode
                key={id}
                cx={SUB_AGENT_X[i]}
                cy={SUB_AGENT_Y}
                active={active}
                shouldReduce={shouldReduce}
                delay={i * 0.06}
              />
            );
          })}

          {/* Subagent label */}
          <text
            x={(SUB_AGENT_X[0] + SUB_AGENT_X[2]) / 2}
            y={SUB_AGENT_Y + 38}
            textAnchor="middle"
            fontSize={11}
            fill={step === 4 || step === 5 ? '#a04f15' : '#9aa6b8'}
            fontWeight="600"
          >
            Subagents
          </text>

          {/* ── Artifacts ── */}
          <AnimatePresence>
            {artifacts.map((art) => (
              <motion.g
                key={`${step}-${art.text}`}
                initial={shouldReduce ? false : { opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: shouldReduce ? 0 : 0.2, ease: 'easeOut' }}
              >
                <ArtifactTag {...art} />
              </motion.g>
            ))}
          </AnimatePresence>

          {/* ── Step 0: hint text ── */}
          {step === 0 && (
            <text
              x={VB_W / 2}
              y={VB_H / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={14}
              fill="#6c798e"
              fontWeight="500"
            >
              點擊下一步開始
            </text>
          )}

          {/* ── Role icons (human / AI lane header) via SVG shapes ── */}
          {/* Human icon: simple circle + torso */}
          <circle cx={30} cy={LANE_MID_HUMAN - 8} r={5} fill="#1b4f9c" opacity={0.7} />
          <path
            d={`M ${30 - 8} ${LANE_MID_HUMAN + 8} Q ${30 - 8} ${LANE_MID_HUMAN - 2} ${30} ${LANE_MID_HUMAN - 2} Q ${30 + 8} ${LANE_MID_HUMAN - 2} ${30 + 8} ${LANE_MID_HUMAN + 8}`}
            fill="#1b4f9c"
            opacity={0.7}
          />
          {/* AI icon: simple processor square */}
          <rect x={22} y={LANE_MID_AI - 8} width={16} height={16} rx={3} fill="#e37b24" opacity={0.7} />
          <line x1={25} y1={LANE_MID_AI - 4} x2={37} y2={LANE_MID_AI - 4} stroke="#fff" strokeWidth={1.5} />
          <line x1={25} y1={LANE_MID_AI} x2={37} y2={LANE_MID_AI} stroke="#fff" strokeWidth={1.5} />
          <line x1={25} y1={LANE_MID_AI + 4} x2={37} y2={LANE_MID_AI + 4} stroke="#fff" strokeWidth={1.5} />
        </svg>
      </div>

      {/* ── Step description ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={shouldReduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: dur, ease: 'easeOut' }}
          className="text-center text-sm font-medium"
          style={{ color: '#3a4456' }}
        >
          {STEP_LABELS[step]}
        </motion.div>
      </AnimatePresence>

      {/* ── Controls ── */}
      <div className="flex items-center justify-between gap-3">
        {/* Prev button */}
        <button
          onClick={goPrev}
          disabled={step === 0}
          aria-label="上一步"
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all"
          style={{
            background: step === 0 ? '#eef1f6' : '#1b4f9c',
            color: step === 0 ? '#9aa6b8' : '#ffffff',
            cursor: step === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          <ChevronLeft size={18} />
          <span>上一步</span>
        </button>

        {/* Step chips */}
        <div className="flex gap-1.5 flex-wrap justify-center">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
            <button
              key={s}
              onClick={() => setStep(s)}
              aria-label={`跳到第 ${s} 步`}
              className="text-xs font-semibold px-3 py-1 rounded-full transition-all"
              style={{
                background: step === s ? '#1b4f9c' : '#eef1f6',
                color: step === s ? '#ffffff' : '#6c798e',
                border: 'none',
                cursor: 'pointer',
                minWidth: 32,
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Counter + Next button */}
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: '#6c798e' }}>
            {step} / {TOTAL_STEPS}
          </span>
          <button
            onClick={goNext}
            disabled={step === TOTAL_STEPS}
            aria-label="下一步"
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all"
            style={{
              background: step === TOTAL_STEPS ? '#eef1f6' : '#1b4f9c',
              color: step === TOTAL_STEPS ? '#9aa6b8' : '#ffffff',
              cursor: step === TOTAL_STEPS ? 'not-allowed' : 'pointer',
            }}
          >
            <span>下一步</span>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
