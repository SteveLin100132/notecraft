import React, { useState } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'motion/react';
import { TriangleAlert, Check, CheckCircle, RotateCcw, Plus } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

// No-SSOT viewBox
const LVB_W = 380;
const LVB_H = 300;

// Has-SSOT viewBox
const RVB_W = 380;
const RVB_H = 300;

// Feature card dimensions (left panel)
const FEAT_W = 340;
const FEAT_H = 76;
const FEAT_X = 20;
const FEAT_A_Y = 18;
const FEAT_B_Y = 116;
const FEAT_C_Y = 214;
const FEAT_RX = 8;

// Sub-block dimensions inside each feature card
const SUB_W = 82;
const SUB_H = 36;
const SUB_RX = 5;
const SUB_Y_OFFSET = 28; // from top of feature card

// Sub-block labels
const SUB_LABELS = ['Service', 'Table', 'API'];

// Sub-block x positions inside card (relative to FEAT_X)
const SUB_OFFSETS = [14, 130, 246];

// Helper: center x of sub-block i in a card
function subCx(i: number): number {
  return FEAT_X + SUB_OFFSETS[i] + SUB_W / 2;
}

// Helper: center y of sub-block in a card at cardY
function subCy(cardY: number): number {
  return cardY + SUB_Y_OFFSET + SUB_H / 2;
}

// Warning connection endpoints for left panel
// Connections: duplicate "Service" blocks across cards
// A.Service ↔ B.Service, A.Service ↔ C.Service, B.Service ↔ C.Service
// Plus Table and API cross-connections for 3-feature spaghetti
const WARN_CONNECTIONS = [
  // A-Service → B-Service
  { x1: subCx(0), y1: subCy(FEAT_A_Y) + SUB_H / 2, x2: subCx(0), y2: subCy(FEAT_B_Y) - SUB_H / 2 },
  // B-Service → C-Service
  { x1: subCx(0), y1: subCy(FEAT_B_Y) + SUB_H / 2, x2: subCx(0), y2: subCy(FEAT_C_Y) - SUB_H / 2 },
  // A-Table → C-Table (diagonal)
  { x1: subCx(1) + SUB_W / 2, y1: subCy(FEAT_A_Y), x2: subCx(0) - SUB_W / 2, y2: subCy(FEAT_C_Y) },
  // B-API → A-API (cross)
  { x1: subCx(2), y1: subCy(FEAT_B_Y) - SUB_H / 2, x2: subCx(2), y2: subCy(FEAT_A_Y) + SUB_H / 2 },
  // C-Table → B-Table (diagonal)
  { x1: subCx(1) - 10, y1: subCy(FEAT_C_Y) - SUB_H / 2, x2: subCx(1) - 10, y2: subCy(FEAT_B_Y) + SUB_H / 2 },
  // C-API → A-API (long diagonal)
  { x1: subCx(2) + 10, y1: subCy(FEAT_C_Y) - SUB_H / 2, x2: subCx(2) + 10, y2: subCy(FEAT_A_Y) + SUB_H / 2 },
];

// Right panel: SSOT center block
const SSOT_CX = 190;
const SSOT_CY = 148;
const SSOT_W = 140;
const SSOT_H = 88;
const SSOT_RX = 10;

// Feature cards in right panel (positions around SSOT)
const R_FEAT_W = 90;
const R_FEAT_H = 44;
const R_FEAT_RX = 7;

interface RFeature {
  label: string;
  cx: number;
  cy: number;
}

const R_FEATURES: RFeature[] = [
  { label: 'Feature A', cx: 58,  cy: 68  },
  { label: 'Feature B', cx: 322, cy: 68  },
  { label: 'Feature C', cx: 58,  cy: 232 },
];

// Arrow end-point from feature center toward SSOT edge
function arrowEndpoint(fcx: number, fcy: number): { x1: number; y1: number; x2: number; y2: number } {
  const dx = SSOT_CX - fcx;
  const dy = SSOT_CY - fcy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / dist;
  const uy = dy / dist;
  // Start from edge of feature card
  const startDist = Math.max(R_FEAT_W, R_FEAT_H) / 2 + 4;
  // End at SSOT edge (approximate as rect intersection)
  const endDist = dist - Math.max(SSOT_W, SSOT_H) / 2 - 4;
  return {
    x1: fcx + ux * startDist,
    y1: fcy + uy * startDist,
    x2: fcx + ux * endDist,
    y2: fcy + uy * endDist,
  };
}

// ─── Arrow Helper ─────────────────────────────────────────────────────────────

function ArrowLine({
  x1, y1, x2, y2,
  stroke,
  strokeWidth,
}: {
  x1: number; y1: number; x2: number; y2: number;
  stroke: string;
  strokeWidth: number;
}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return null;
  const ux = dx / len;
  const uy = dy / len;
  const al = 8;
  const aw = 4;
  const bx = x2 - ux * al;
  const by = y2 - uy * al;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
      <polygon
        points={`${x2},${y2} ${bx - uy * aw},${by + ux * aw} ${bx + uy * aw},${by - ux * aw}`}
        fill={stroke}
      />
    </g>
  );
}

// ─── Animated Path (pathLength 0→1) ──────────────────────────────────────────

function AnimatedPath({
  d,
  stroke,
  strokeWidth,
  duration,
  delay,
  shouldReduce,
}: {
  d: string;
  stroke: string;
  strokeWidth: number;
  duration: number;
  delay: number;
  shouldReduce: boolean | null;
}) {
  const actualDuration = shouldReduce ? 0 : duration;
  return (
    <motion.path
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: actualDuration, delay: shouldReduce ? 0 : delay, ease: 'easeOut' }}
    />
  );
}

// ─── Left Panel: No-SSOT ─────────────────────────────────────────────────────

interface FeatureCardProps {
  label: string;
  y: number;
  featureIndex: number;
  shouldReduce: boolean | null;
}

function NoSsotFeatureCard({ label, y, featureIndex, shouldReduce }: FeatureCardProps) {
  const dur = shouldReduce ? 0 : 0.28;
  // Sub-block fill: "Service" blocks in feature B and C are duplicates (danger style)
  // Feature A: all normal
  // Feature B: Service is a duplicate
  // Feature C: Service is a duplicate too
  const isDangerSub = (subIdx: number) => featureIndex > 0 && subIdx === 0;

  return (
    <motion.g
      key={`feat-${label}`}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: dur, ease: 'easeOut' }}
      style={{ originX: `${FEAT_X + FEAT_W / 2}px`, originY: `${y + FEAT_H / 2}px` }}
    >
      {/* Card background */}
      <rect
        x={FEAT_X}
        y={y}
        width={FEAT_W}
        height={FEAT_H}
        rx={FEAT_RX}
        fill="var(--neutral-50, #f6f8fb)"
        stroke="var(--neutral-200, #e1e6ee)"
        strokeWidth={1}
      />
      {/* Card label */}
      <text
        x={FEAT_X + 10}
        y={y + 16}
        fontSize={11}
        fontWeight={600}
        fill="var(--neutral-700, #3a4456)"
        dominantBaseline="middle"
      >
        {label}
      </text>
      {/* Sub-blocks */}
      {SUB_LABELS.map((sub, i) => {
        const isDanger = isDangerSub(i);
        return (
          <g key={sub}>
            <rect
              x={FEAT_X + SUB_OFFSETS[i]}
              y={y + SUB_Y_OFFSET}
              width={SUB_W}
              height={SUB_H}
              rx={SUB_RX}
              fill={isDanger ? 'var(--danger-50, #fbeaea)' : 'var(--neutral-0, #ffffff)'}
              stroke={isDanger ? 'var(--danger-500, #d64545)' : 'var(--neutral-200, #e1e6ee)'}
              strokeWidth={isDanger ? 1 : 1}
            />
            <text
              x={FEAT_X + SUB_OFFSETS[i] + SUB_W / 2}
              y={y + SUB_Y_OFFSET + SUB_H / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={10}
              fontWeight={500}
              fill={isDanger ? 'var(--danger-500, #d64545)' : 'var(--neutral-600, #4f5b6e)'}
            >
              {sub}
            </text>
          </g>
        );
      })}
    </motion.g>
  );
}

// ─── Right Panel: Has-SSOT ────────────────────────────────────────────────────

interface RightFeatureCardProps {
  feature: RFeature;
  shouldReduce: boolean | null;
  delay: number;
}

function SsotFeatureCard({ feature, shouldReduce, delay }: RightFeatureCardProps) {
  const dur = shouldReduce ? 0 : 0.28;
  const { label, cx, cy } = feature;
  const ep = arrowEndpoint(cx, cy);

  return (
    <motion.g
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: dur, delay: shouldReduce ? 0 : delay, ease: 'easeOut' }}
    >
      {/* Arrow to SSOT */}
      <AnimatedPath
        d={`M ${ep.x1} ${ep.y1} L ${ep.x2} ${ep.y2}`}
        stroke="var(--blue-400, #4d84cb)"
        strokeWidth={1.5}
        duration={0.35}
        delay={delay + (shouldReduce ? 0 : 0.05)}
        shouldReduce={shouldReduce}
      />
      {/* Arrowhead */}
      <ArrowLine
        x1={ep.x1}
        y1={ep.y1}
        x2={ep.x2}
        y2={ep.y2}
        stroke="var(--blue-400, #4d84cb)"
        strokeWidth={1.5}
      />
      {/* Feature card */}
      <rect
        x={cx - R_FEAT_W / 2}
        y={cy - R_FEAT_H / 2}
        width={R_FEAT_W}
        height={R_FEAT_H}
        rx={R_FEAT_RX}
        fill="var(--neutral-50, #f6f8fb)"
        stroke="var(--neutral-200, #e1e6ee)"
        strokeWidth={1}
      />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={11}
        fontWeight={600}
        fill="var(--neutral-700, #3a4456)"
      >
        {label}
      </text>
    </motion.g>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type FeatureKey = 0 | 1 | 2;

const FEATURE_LABELS: string[] = ['Feature A', 'Feature B', 'Feature C'];
const L_FEAT_Y: number[] = [FEAT_A_Y, FEAT_B_Y, FEAT_C_Y];

export default function SsotVsDuplication() {
  const [addedFeatures, setAddedFeatures] = useState<FeatureKey[]>([]);
  const shouldReduce = useReducedMotion();

  const allAdded = addedFeatures.length === 3;

  function addFeature(i: FeatureKey) {
    if (!addedFeatures.includes(i)) {
      setAddedFeatures((prev) => [...prev, i]);
    }
  }

  function reset() {
    setAddedFeatures([]);
  }

  // Number of duplicate "Service" blocks visible = features B and C that are added
  const dupCount = addedFeatures.filter((f) => f > 0).length;

  // Which warning connections to show based on features added
  // After B is added: connections 0 (A-svc → B-svc)
  // After C is added: connections 1-5 (full spider web)
  const hasB = addedFeatures.includes(1);
  const hasC = addedFeatures.includes(2);
  const visibleWarnConns: typeof WARN_CONNECTIONS = [];
  if (hasB) visibleWarnConns.push(WARN_CONNECTIONS[0]); // A→B Service
  if (hasC) {
    visibleWarnConns.push(
      WARN_CONNECTIONS[1], // B→C Service
      WARN_CONNECTIONS[2], // A-Table→C-Table
      WARN_CONNECTIONS[3], // B-API→A-API
      WARN_CONNECTIONS[4], // C-Table→B-Table
      WARN_CONNECTIONS[5], // C-API→A-API
    );
  }

  // Right panel: SSOT pulse when all 3 features added
  const ssotPulse = allAdded;

  return (
    <div className="not-prose max-w-4xl mx-auto space-y-4">
      {/* ── Controls ── */}
      <div className="flex flex-wrap items-center gap-2 justify-center">
        {([0, 1, 2] as const).map((i) => {
          const added = addedFeatures.includes(i);
          return (
            <button
              key={i}
              onClick={() => addFeature(i)}
              disabled={added || allAdded}
              aria-label={`新增 ${FEATURE_LABELS[i]}`}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold transition-all"
              style={{
                borderRadius: 'var(--radius-pill, 999px)',
                background: added
                  ? 'var(--success-50, #e7f6ee)'
                  : allAdded
                  ? 'var(--neutral-100, #eef1f6)'
                  : 'var(--blue-700, #1b4f9c)',
                color: added
                  ? 'var(--success-500, #2e9e6b)'
                  : allAdded
                  ? 'var(--neutral-300, #cbd3df)'
                  : 'var(--neutral-0, #ffffff)',
                cursor: added || allAdded ? 'not-allowed' : 'pointer',
                border: 'none',
              }}
            >
              {added ? (
                <CheckCircle size={14} />
              ) : (
                <Plus size={14} />
              )}
              {FEATURE_LABELS[i]}
            </button>
          );
        })}
        <button
          onClick={reset}
          aria-label="重置"
          className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold transition-all"
          style={{
            borderRadius: 'var(--radius-pill, 999px)',
            background: 'var(--neutral-100, #eef1f6)',
            color: 'var(--neutral-600, #4f5b6e)',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <RotateCcw size={14} />
          重置
        </button>
      </div>

      {/* ── Two-column diagram ── */}
      <div
        className="flex flex-col sm:flex-row gap-0"
        style={{
          border: '1px solid var(--border-subtle, #e1e6ee)',
          borderRadius: 'var(--radius-md, 10px)',
          overflow: 'hidden',
        }}
      >
        {/* Left column: No SSOT */}
        <div className="flex-1 min-w-0">
          {/* Column header */}
          <div
            style={{
              height: 6,
              background: 'var(--danger-500, #d64545)',
            }}
          />
          <div
            className="px-4 py-2 text-sm font-semibold"
            style={{ color: 'var(--neutral-700, #3a4456)' }}
          >
            無 SSOT
          </div>

          {/* SVG */}
          <div className="w-full overflow-hidden">
            <svg
              viewBox={`0 0 ${LVB_W} ${LVB_H}`}
              width="100%"
              preserveAspectRatio="xMidYMid meet"
              aria-label="無 SSOT 架構示意圖"
              role="img"
              style={{ display: 'block' }}
            >
              {/* Placeholder when no features */}
              {addedFeatures.length === 0 && (
                <rect
                  x={FEAT_X}
                  y={20}
                  width={FEAT_W}
                  height={FEAT_H * 3 + 26}
                  rx={FEAT_RX}
                  fill="none"
                  stroke="var(--border-subtle, #e1e6ee)"
                  strokeDasharray="6 4"
                  strokeWidth={1.5}
                />
              )}

              {/* Warning connection lines */}
              <AnimatePresence>
                {visibleWarnConns.map((conn, idx) => (
                  <AnimatedPath
                    key={`warn-${idx}`}
                    d={`M ${conn.x1} ${conn.y1} L ${conn.x2} ${conn.y2}`}
                    stroke="var(--danger-500, #d64545)"
                    strokeWidth={1.2}
                    duration={0.4}
                    delay={idx * 0.08}
                    shouldReduce={shouldReduce}
                  />
                ))}
              </AnimatePresence>

              {/* Feature cards */}
              <AnimatePresence>
                {([0, 1, 2] as const).map((i) =>
                  addedFeatures.includes(i) ? (
                    <NoSsotFeatureCard
                      key={`left-feat-${i}`}
                      label={FEATURE_LABELS[i]}
                      y={L_FEAT_Y[i]}
                      featureIndex={i}
                      shouldReduce={shouldReduce}
                    />
                  ) : null
                )}
              </AnimatePresence>

              {/* Badge: duplicate count */}
              {dupCount >= 1 && (
                <g>
                  <rect
                    x={LVB_W - 110}
                    y={LVB_H - 32}
                    width={98}
                    height={22}
                    rx={11}
                    fill="var(--danger-50, #fbeaea)"
                    stroke="var(--danger-500, #d64545)"
                    strokeWidth={1}
                  />
                  <text
                    x={LVB_W - 61}
                    y={LVB_H - 21}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={10}
                    fontWeight={600}
                    fill="var(--danger-500, #d64545)"
                  >
                    {dupCount * (hasC ? 3 : 1)} 組重複 Service
                  </text>
                </g>
              )}
            </svg>
          </div>

          {/* Bottom hint */}
          <div
            className="px-4 py-2 flex items-center gap-1.5 text-xs min-h-[2rem]"
            style={{ color: 'var(--danger-500, #d64545)' }}
          >
            {addedFeatures.length >= 2 && (
              <>
                <TriangleAlert size={14} />
                已出現 {hasC ? 3 : 1} 處重複，維護成本開始上升
              </>
            )}
          </div>
        </div>

        {/* Divider */}
        <div
          className="hidden sm:block"
          style={{ width: 1, background: 'var(--border-subtle, #e1e6ee)', flexShrink: 0 }}
        />
        <div
          className="block sm:hidden"
          style={{ height: 1, background: 'var(--border-subtle, #e1e6ee)' }}
        />

        {/* Right column: Has SSOT */}
        <div className="flex-1 min-w-0">
          {/* Column header */}
          <div
            style={{
              height: 6,
              background: 'var(--success-500, #2e9e6b)',
            }}
          />
          <div
            className="px-4 py-2 text-sm font-semibold"
            style={{ color: 'var(--neutral-700, #3a4456)' }}
          >
            有 SSOT
          </div>

          {/* SVG */}
          <div className="w-full overflow-hidden">
            <svg
              viewBox={`0 0 ${RVB_W} ${RVB_H}`}
              width="100%"
              preserveAspectRatio="xMidYMid meet"
              aria-label="有 SSOT 架構示意圖"
              role="img"
              style={{ display: 'block' }}
            >
              {/* SSOT center block */}
              <motion.g
                animate={
                  ssotPulse && !shouldReduce
                    ? { scale: [1, 1.02, 1] }
                    : { scale: 1 }
                }
                transition={
                  ssotPulse && !shouldReduce
                    ? { duration: 0.4, ease: 'easeOut', times: [0, 0.5, 1] }
                    : {}
                }
                style={{ originX: `${SSOT_CX}px`, originY: `${SSOT_CY}px` }}
              >
                <rect
                  x={SSOT_CX - SSOT_W / 2}
                  y={SSOT_CY - SSOT_H / 2}
                  width={SSOT_W}
                  height={SSOT_H}
                  rx={SSOT_RX}
                  fill="var(--blue-50, #eef4fb)"
                  stroke="var(--blue-500, #2c6ebb)"
                  strokeWidth={2}
                />
                <text
                  x={SSOT_CX}
                  y={SSOT_CY - 26}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={11}
                  fontWeight={700}
                  fill="var(--blue-700, #1b4f9c)"
                >
                  SSOT
                </text>
                {['元件', 'Service', 'API', 'DB Schema'].map((row, ri) => (
                  <text
                    key={row}
                    x={SSOT_CX}
                    y={SSOT_CY - 8 + ri * 14}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={10}
                    fill="var(--blue-600, #1f5aa6)"
                    fontWeight={500}
                  >
                    {row}
                  </text>
                ))}
              </motion.g>

              {/* Feature cards + arrows */}
              <AnimatePresence>
                {([0, 1, 2] as const).map((i) =>
                  addedFeatures.includes(i) ? (
                    <SsotFeatureCard
                      key={`right-feat-${i}`}
                      feature={R_FEATURES[i]}
                      shouldReduce={shouldReduce}
                      delay={i * 0.06}
                    />
                  ) : null
                )}
              </AnimatePresence>

              {/* Badge: shared source count */}
              <g>
                <rect
                  x={RVB_W - 108}
                  y={RVB_H - 32}
                  width={96}
                  height={22}
                  rx={11}
                  fill="var(--success-50, #e7f6ee)"
                  stroke="var(--success-500, #2e9e6b)"
                  strokeWidth={1}
                />
                <text
                  x={RVB_W - 60}
                  y={RVB_H - 21}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={10}
                  fontWeight={600}
                  fill="var(--success-500, #2e9e6b)"
                >
                  1 份共用源
                </text>
              </g>
            </svg>
          </div>

          {/* Bottom hint */}
          <div
            className="px-4 py-2 flex items-center gap-1.5 text-xs min-h-[2rem]"
            style={{ color: 'var(--success-500, #2e9e6b)' }}
          >
            <Check size={14} />
            共用源始終只有 1 份
          </div>
        </div>
      </div>
    </div>
  );
}
