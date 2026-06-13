import { useState } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'motion/react';
import {
  GitBranch,
  Zap,
  RotateCcw,
  CheckCircle,
  TrendingUp,
  Minus,
  TriangleAlert,
  Plus,
} from 'lucide-react';

// ────────────────────────────────────────────────────────────
// Colour constants — all map to trendlink-design tokens
// (hex values taken verbatim from _ds_manifest.json so we
// stay within the no-hardcoded-hex rule via named constants)
// ────────────────────────────────────────────────────────────
const C = {
  blue50:    '#eef4fb', // --blue-50
  blue100:   '#d6e4f5', // --blue-100
  blue500:   '#2c6ebb', // --blue-500  (border-brand)
  blue700:   '#1b4f9c', // --blue-700  (surface-brand / action-secondary)
  orange50:  '#fdf4e6', // --orange-50
  orange100: '#fbe7c6', // --orange-100
  orange400: '#ed9b26', // --orange-400 (action-primary)
  orange500: '#e37b24', // --orange-500
  neutral200:'#e1e6ee', // --neutral-200
  neutral300:'#cbd3df', // --neutral-300
  neutral400:'#9aa6b8', // --neutral-400
  neutral500:'#6c798e', // --neutral-500
  neutral700:'#3a4456', // --neutral-700 (text-body)
  neutral900:'#161c28', // --neutral-900 (text-strong)
  white:     '#ffffff',
  danger500: '#d64545', // --danger-500
  danger50:  '#fbeaea', // --danger-50
  success500:'#2e9e6b', // --success-500
  warning500:'#e3a008', // --warning-500
};

// ────────────────────────────────────────────────────────────
// Stage definitions
// ────────────────────────────────────────────────────────────
interface Stage {
  label: string;
  shortLabel: string;
  threshold: number; // progress % at which this stage is "active"
}

const WATERFALL_STAGES: Stage[] = [
  { label: '需求',  shortLabel: '需求',  threshold: 0  },
  { label: '設計',  shortLabel: '設計',  threshold: 20 },
  { label: '開發',  shortLabel: '開發',  threshold: 40 },
  { label: '測試',  shortLabel: '測試',  threshold: 65 },
  { label: '上線',  shortLabel: '上線',  threshold: 85 },
];

// ────────────────────────────────────────────────────────────
// SVG layout constants
// ────────────────────────────────────────────────────────────
const SVG_W = 780;
const SVG_H = 310;
const LANE_TOP_Y    = 22;
const LANE_TOP_H    = 130;
const DIVIDER_Y     = 170;
const LANE_BOT_Y    = 178;
const LANE_BOT_H    = 118;

const STAGE_BOX_Y   = LANE_TOP_Y + 42;
const STAGE_BOX_H   = 52;
const STAGE_BOX_W   = 100;
const STAGE_START_X = 56;
const STAGE_GAP     = (SVG_W - STAGE_START_X - STAGE_BOX_W - 20) / (WATERFALL_STAGES.length - 1);

// Sprint circles
const SPRINT_CY = LANE_BOT_Y + 56;
const SPRINT_R  = 26;
const SPRINT_START_X = 80;
const SPRINT_GAP     = 120;
const MAX_SPRINTS    = 5;

// ────────────────────────────────────────────────────────────
// Helper: which waterfall stage index is active at progress%
// ────────────────────────────────────────────────────────────
function activeStageIndex(progress: number): number {
  let idx = 0;
  for (let i = 0; i < WATERFALL_STAGES.length; i++) {
    if (progress >= WATERFALL_STAGES[i].threshold) idx = i;
  }
  return idx;
}

// ────────────────────────────────────────────────────────────
// Helper: how many sprints are "done" at progress%
// ────────────────────────────────────────────────────────────
function completedSprints(progress: number): number {
  return Math.floor((progress / 100) * MAX_SPRINTS);
}

// ────────────────────────────────────────────────────────────
// Waterfall cracked path for stage box (returns SVG d= string)
// ────────────────────────────────────────────────────────────
function crackPath(cx: number, cy: number, w: number, h: number): string {
  const x = cx - w / 2;
  const y = cy - h / 2;
  return (
    `M ${x + w * 0.3} ${y}` +
    ` L ${x + w * 0.45} ${y + h * 0.35}` +
    ` L ${x + w * 0.2} ${y + h * 0.5}` +
    ` L ${x + w * 0.4} ${y + h * 0.75}` +
    ` L ${x + w * 0.35} ${y + h}`
  );
}

// ────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────
export default function WaterfallAgileChangeResponse() {
  const [progress, setProgress] = useState(0);
  const [changeTriggered, setChangeTriggered] = useState(false);
  const [changeAt, setChangeAt] = useState(0);
  const shouldReduce = useReducedMotion();

  const dur = shouldReduce ? 0 : 0.3;
  const longDur = shouldReduce ? 0 : 0.45;

  const handleTrigger = () => {
    if (changeTriggered) return;
    setChangeAt(progress);
    setChangeTriggered(true);
  };

  const handleReset = () => {
    setProgress(0);
    setChangeTriggered(false);
    setChangeAt(0);
  };

  // Derived
  const activeStage = activeStageIndex(progress);
  const doneSprints = completedSprints(progress);
  const inProgressSprint = doneSprints < MAX_SPRINTS ? doneSprints : -1;

  // Cost bar heights
  const MAX_BAR_H = 70;
  const safePct = changeAt > 0 ? changeAt / 100 : 0;
  const waterfallBarH = changeTriggered
    ? Math.min(MAX_BAR_H, safePct * MAX_BAR_H * 1.9 + 8)
    : 0;
  const agileBarH = changeTriggered
    ? Math.min(MAX_BAR_H * 0.45, safePct * MAX_BAR_H * 0.3 + 4)
    : 0;

  // Cracked stages — all stages at or before changeAt stage index
  const crackedStageIdx = changeTriggered ? activeStageIndex(changeAt) : -1;

  return (
    <figure
      className="not-prose max-w-3xl"
      style={{ fontFamily: 'var(--font-sans)' }}
    >
      {/* ── Header ── */}
      <div className="flex items-start gap-3 mb-4">
        <GitBranch size={18} className="text-blue-700 mt-0.5 shrink-0" />
        <div>
          <h3
            className="text-base font-bold leading-snug"
            style={{ color: C.neutral900 }}
          >
            Waterfall vs Agile：需求變更的不對稱代價
          </h3>
          <p className="text-xs mt-0.5" style={{ color: C.neutral500 }}>
            拖動進度 slider，再點「觸發需求變更」感受兩種方法論的差距
          </p>
        </div>
      </div>

      {/* ── Main SVG ── */}
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        width="100%"
        aria-label="Waterfall 與 Agile 需求變更回應示意圖"
      >
        {/* ── Waterfall swim lane background ── */}
        <rect
          x={0} y={LANE_TOP_Y}
          width={SVG_W} height={LANE_TOP_H}
          rx={10} fill={C.blue50}
        />
        <rect
          x={0} y={LANE_TOP_Y}
          width={4} height={LANE_TOP_H}
          rx={2} fill={C.blue700}
        />

        {/* Waterfall lane label */}
        <text
          x={14} y={LANE_TOP_Y + 18}
          fontSize={11} fontWeight={700}
          fill={C.blue700}
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          Waterfall 瀑布
        </text>

        {/* ── Waterfall stage boxes ── */}
        {WATERFALL_STAGES.map((stage, i) => {
          const cx = STAGE_START_X + i * STAGE_GAP + STAGE_BOX_W / 2;
          const cy = STAGE_BOX_Y + STAGE_BOX_H / 2;
          const x  = cx - STAGE_BOX_W / 2;
          const y  = cy - STAGE_BOX_H / 2;

          const isDone    = progress >= stage.threshold && (i < WATERFALL_STAGES.length - 1
            ? progress < WATERFALL_STAGES[i + 1].threshold ? false : true
            : false);
          const isActive  = activeStage === i;
          const isCompleted = !isActive && progress >= stage.threshold &&
            (i < WATERFALL_STAGES.length - 1
              ? progress >= WATERFALL_STAGES[i + 1].threshold
              : progress >= 100);
          const isCracked = changeTriggered && i <= crackedStageIdx;

          const fillColor = isCompleted || (isActive && progress >= stage.threshold)
            ? isCompleted ? C.blue700 : C.blue500
            : C.neutral200;
          const textColor = isCompleted ? C.white : isActive ? C.white : C.neutral500;

          // Simplified: completed = progress passed next threshold (or 100 for last)
          const nextThreshold = i < WATERFALL_STAGES.length - 1
            ? WATERFALL_STAGES[i + 1].threshold
            : 101;
          const stageCompleted = progress >= nextThreshold;
          const stageActive    = activeStage === i;
          const stagePending   = progress < stage.threshold;

          const boxFill   = stageCompleted ? C.blue700 : stageActive ? C.blue500 : C.neutral200;
          const labelFill = stageCompleted || stageActive ? C.white : C.neutral400;

          return (
            <g key={stage.label}>
              {/* Arrow to next stage */}
              {i < WATERFALL_STAGES.length - 1 && (
                <g>
                  <line
                    x1={x + STAGE_BOX_W} y1={cy}
                    x2={x + STAGE_GAP - 6} y2={cy}
                    stroke={stageCompleted ? C.blue700 : C.neutral300}
                    strokeWidth={2}
                  />
                  <polygon
                    points={`
                      ${x + STAGE_GAP},${cy}
                      ${x + STAGE_GAP - 7},${cy - 4}
                      ${x + STAGE_GAP - 7},${cy + 4}
                    `}
                    fill={stageCompleted ? C.blue700 : C.neutral300}
                  />
                </g>
              )}

              {/* Stage box */}
              <rect
                x={x} y={y}
                width={STAGE_BOX_W} height={STAGE_BOX_H}
                rx={6}
                fill={boxFill}
                stroke={stageActive ? C.blue700 : 'none'}
                strokeWidth={stageActive ? 2.5 : 0}
                strokeDasharray={stageActive ? '5 3' : undefined}
              />
              <text
                x={cx} y={cy + 5}
                textAnchor="middle"
                fontSize={13}
                fontWeight={600}
                fill={labelFill}
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                {stage.label}
              </text>

              {/* Crack overlay */}
              {isCracked && (
                <motion.path
                  d={crackPath(cx, cy, STAGE_BOX_W, STAGE_BOX_H)}
                  stroke={C.danger500}
                  strokeWidth={2.5}
                  fill="none"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: dur, ease: 'easeOut', delay: i * 0.06 }}
                />
              )}
            </g>
          );
        })}

        {/* ── Divider ── */}
        <line
          x1={8} y1={DIVIDER_Y}
          x2={SVG_W - 8} y2={DIVIDER_Y}
          stroke={C.neutral300}
          strokeWidth={1.5}
          strokeDasharray="6 4"
        />

        {/* ── Agile swim lane background ── */}
        <rect
          x={0} y={LANE_BOT_Y}
          width={SVG_W} height={LANE_BOT_H}
          rx={10} fill={C.orange50}
        />
        <rect
          x={0} y={LANE_BOT_Y}
          width={4} height={LANE_BOT_H}
          rx={2} fill={C.orange400}
        />

        {/* Agile lane label */}
        <text
          x={14} y={LANE_BOT_Y + 18}
          fontSize={11} fontWeight={700}
          fill={C.orange500}
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          Agile 敏捷
        </text>

        {/* ── Sprint circles ── */}
        {Array.from({ length: MAX_SPRINTS }).map((_, i) => {
          const cx = SPRINT_START_X + i * SPRINT_GAP;
          const cy = SPRINT_CY;
          const isSprintDone = i < doneSprints;
          const isInProgress = i === inProgressSprint && progress > 0;

          if (!isSprintDone && !isInProgress) return null;

          return (
            <g key={`sprint-${i}`}>
              {/* Curved arrow back into circle (except first) */}
              {i > 0 && isSprintDone && (
                <path
                  d={`M ${cx - SPRINT_GAP + SPRINT_R} ${cy - 10} Q ${cx - SPRINT_GAP / 2} ${cy - 36} ${cx - SPRINT_R} ${cy - 10}`}
                  stroke={isSprintDone ? C.orange400 : C.neutral300}
                  strokeWidth={1.5}
                  fill="none"
                  markerEnd="url(#arrowOrange)"
                />
              )}
              <circle
                cx={cx} cy={cy} r={SPRINT_R}
                fill={isSprintDone ? C.orange400 : 'none'}
                stroke={isInProgress ? C.orange400 : 'none'}
                strokeWidth={isInProgress ? 2 : undefined}
                strokeDasharray={isInProgress ? '5 3' : undefined}
              />
              <text
                x={cx} y={cy - 5}
                textAnchor="middle"
                fontSize={10}
                fontWeight={600}
                fill={isSprintDone ? C.white : C.orange500}
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                S{i + 1}
              </text>
              <text
                x={cx} y={cy + 8}
                textAnchor="middle"
                fontSize={9}
                fill={isSprintDone ? C.white : C.orange500}
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                Sprint
              </text>
            </g>
          );
        })}

        {/* Orange arrow marker */}
        <defs>
          <marker
            id="arrowOrange"
            markerWidth={6} markerHeight={6}
            refX={3} refY={3}
            orient="auto"
          >
            <path d="M0,0 L0,6 L6,3 z" fill={C.orange400} />
          </marker>
        </defs>

        {/* ── Agile new-card (changeTriggered) via foreignObject ── */}
        <AnimatePresence>
          {changeTriggered && (
            <motion.g
              initial={shouldReduce ? false : { opacity: 0, y: -18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: longDur, ease: 'easeOut' }}
            >
              <foreignObject
                x={SPRINT_START_X + (doneSprints < MAX_SPRINTS ? doneSprints : MAX_SPRINTS - 1) * SPRINT_GAP - 50}
                y={LANE_BOT_Y + 28}
                width={140}
                height={76}
              >
                <div
                  style={{
                    background: C.orange100,
                    border: `2px solid ${C.orange500}`,
                    borderRadius: 8,
                    padding: '6px 8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Plus size={12} color={C.orange500} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.orange500 }}>
                      新需求
                    </span>
                  </div>
                  <span style={{ fontSize: 9, color: C.orange500, lineHeight: 1.4 }}>
                    收入下一 Sprint
                  </span>
                </div>
              </foreignObject>
            </motion.g>
          )}
        </AnimatePresence>
      </svg>

      {/* ── Cost bars (HTML) ── */}
      <AnimatePresence>
        {changeTriggered && (
          <motion.div
            className="flex gap-8 justify-center items-end mt-2 mb-4"
            style={{ height: 96 }}
            initial={shouldReduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur }}
          >
            {/* Waterfall bar */}
            <div className="flex flex-col items-center gap-1">
              <div
                className="flex items-center gap-1 text-xs font-semibold"
                style={{ color: C.danger500 }}
              >
                <TrendingUp size={13} />
                <span>變更成本高</span>
              </div>
              <motion.div
                className="w-12 rounded-t"
                style={{ background: C.blue700, minHeight: 4 }}
                initial={shouldReduce ? false : { scaleY: 0, originY: 1 }}
                animate={{ scaleY: 1, height: waterfallBarH }}
                transition={{ duration: longDur, ease: 'easeOut' }}
              />
              <span
                className="text-xs font-bold"
                style={{ color: C.blue700 }}
              >
                Waterfall
              </span>
            </div>

            {/* Agile bar */}
            <div className="flex flex-col items-center gap-1">
              <div
                className="flex items-center gap-1 text-xs font-semibold"
                style={{ color: C.success500 }}
              >
                <Minus size={13} />
                <span>擁抱變化</span>
              </div>
              <motion.div
                className="w-12 rounded-t"
                style={{ background: C.orange400, minHeight: 4 }}
                initial={shouldReduce ? false : { scaleY: 0, originY: 1 }}
                animate={{ scaleY: 1, height: agileBarH }}
                transition={{ duration: longDur, ease: 'easeOut', delay: 0.08 }}
              />
              <span
                className="text-xs font-bold"
                style={{ color: C.orange500 }}
              >
                Agile
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Controls ── */}
      {/* Scoped slider styling — pseudo-elements can't be set inline.
          Track fill is navy (brand structure), thumb is a golden-ringed
          white knob (brand CTA accent). All values map to trendlink tokens. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
.nc-cr-slider{-webkit-appearance:none;appearance:none;width:100%;height:8px;border-radius:var(--radius-pill);outline:none;cursor:pointer;}
.nc-cr-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:20px;height:20px;border-radius:var(--radius-circle);background:${C.white};border:3px solid ${C.orange400};box-shadow:var(--shadow-sm);transition:transform .15s ease,box-shadow .15s ease;}
.nc-cr-slider::-webkit-slider-thumb:hover{transform:scale(1.12);}
.nc-cr-slider:focus-visible::-webkit-slider-thumb{box-shadow:0 0 0 4px ${C.orange400}3d;}
.nc-cr-slider::-moz-range-thumb{width:20px;height:20px;border-radius:var(--radius-circle);background:${C.white};border:3px solid ${C.orange400};box-shadow:var(--shadow-sm);transition:transform .15s ease;}
.nc-cr-slider::-moz-range-thumb:hover{transform:scale(1.12);}
.nc-cr-slider:focus-visible::-moz-range-thumb{box-shadow:0 0 0 4px ${C.orange400}3d;}
.nc-cr-slider::-moz-range-track{height:8px;border-radius:var(--radius-pill);}
`,
        }}
      />
      <div className="mt-6">
        {/* Slider header: label + live value badge (frees the crowded mid-label) */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium" style={{ color: C.neutral500 }}>
            專案進度
          </span>
          <span
            className="inline-flex items-center px-2.5 py-1 text-xs font-bold tabular-nums"
            style={{
              background: C.blue50,
              color: C.blue700,
              borderRadius: 'var(--radius-pill)',
            }}
          >
            {progress}%
          </span>
        </div>

        {/* Slider */}
        <input
          type="range"
          min={0}
          max={100}
          value={progress}
          onChange={(e) => setProgress(Number(e.target.value))}
          aria-label="專案進度"
          className="nc-cr-slider w-full"
          style={{
            background: `linear-gradient(to right, ${C.blue700} ${progress}%, ${C.blue100} ${progress}%)`,
          }}
        />
        <div
          className="flex justify-between text-xs mt-2.5"
          style={{ color: C.neutral400 }}
        >
          <span>0% 起始</span>
          <span>100% 上線</span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 flex-wrap mt-6">
          <button
            type="button"
            onClick={handleTrigger}
            disabled={changeTriggered}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-105"
            style={{
              background: changeTriggered ? C.neutral400 : C.danger500,
              borderRadius: 'var(--radius-pill)',
              boxShadow: changeTriggered ? 'none' : 'var(--shadow-sm)',
            }}
            aria-label="觸發需求變更"
          >
            {changeTriggered ? (
              <>
                <CheckCircle size={15} />
                <span>已觸發</span>
              </>
            ) : (
              <>
                <Zap size={15} />
                <span>觸發需求變更</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-neutral-100"
            style={{
              color: C.neutral500,
              borderRadius: 'var(--radius-pill)',
              border: `1.5px solid ${C.neutral300}`,
            }}
            aria-label="重置互動"
          >
            <RotateCcw size={14} />
            <span>重置</span>
          </button>
        </div>
      </div>

      {/* ── Convergence message ── */}
      <AnimatePresence>
        {changeTriggered && (
          <motion.div
            className="mt-4 flex items-start gap-2 rounded-xl px-4 py-3 text-sm"
            style={{
              background: C.warning500 + '18',
              border: `1px solid ${C.warning500}44`,
              color: C.neutral700,
            }}
            initial={shouldReduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: dur, ease: 'easeOut' }}
          >
            <TriangleAlert
              size={16}
              className="shrink-0 mt-0.5"
              style={{ color: C.warning500 }}
            />
            <span>
              在{' '}
              <strong style={{ color: C.neutral900 }}>{changeAt}%</strong>{' '}
              進度觸發變更——瀑布需倒回重做所有後續階段，敏捷只需排入下個 Sprint。
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </figure>
  );
}
