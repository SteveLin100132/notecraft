import React, { useId } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Layers, Briefcase, Users } from 'lucide-react';

// TrendLink design tokens (from tokens/colors.css & tokens/spacing.css)
// Blue: --blue-700 #1b4f9c, --blue-300 #7ba6da, --blue-50 #eef4fb
// Orange: --orange-400 #ed9b26, --orange-300 #f2b955, --orange-50 #fdf4e6
// Neutral: --neutral-500 #6c798e, --neutral-700 #3a4456, --neutral-200 #e1e6ee

const BLUE_700 = '#1b4f9c';
const BLUE_300 = '#7ba6da';
const BLUE_50 = '#eef4fb';
const ORANGE_400 = '#ed9b26';
const ORANGE_300 = '#f2b955';
const ORANGE_50 = '#fdf4e6';
const NEUTRAL_500 = '#6c798e';
const NEUTRAL_700 = '#3a4456';
const NEUTRAL_200 = '#e1e6ee';
const WHITE = '#ffffff';

// ---- Layout constants --------------------------------------------------
const AXIS_Y = 100;
const VIEW_W = 760;
const VIEW_H = 280;

// Milestone positions (x-coordinate)
const MILESTONES: { x: number; label: string; time: string }[] = [
  { x: 120, label: '範疇定義', time: 'M1' },
  { x: 280, label: '設計凍結', time: 'M2' },
  { x: 480, label: '開發完成', time: 'M3' },
  { x: 640, label: '交付上線', time: 'M4' },
];

// Sprint groups per interval (between milestones)
// Interval 0: M1→M2, Interval 1: M2→M3, Interval 2: M3→M4
type SprintGroup = {
  sprints: { cx: number; label: string }[];
  cy: number;
};

const SPRINT_GROUPS: SprintGroup[] = [
  {
    cy: 195,
    sprints: [
      { cx: 168, label: 'S1' },
      { cx: 228, label: 'S2' },
    ],
  },
  {
    cy: 195,
    sprints: [
      { cx: 340, label: 'S3' },
      { cx: 400, label: 'S4' },
      { cx: 460, label: 'S5' },
    ],
  },
  {
    cy: 195,
    sprints: [
      { cx: 540, label: 'S6' },
      { cx: 600, label: 'S7' },
    ],
  },
];

const SPRINT_R = 22; // sprint circle radius

// ---- Spinning arc around a Sprint circle -------------------------------
interface SpinningArcProps {
  cx: number;
  cy: number;
  r: number;
  shouldReduce: boolean;
  uid: string;
  offset: number; // stagger offset in seconds
}

function SpinningArc({ cx, cy, r, shouldReduce, uid, offset }: SpinningArcProps) {
  const arcR = r + 7;
  // Arc: 270 degrees of a circle, leaving a gap so the rotation is visible
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + (3 * Math.PI) / 2;
  const sx = cx + arcR * Math.cos(startAngle);
  const sy = cy + arcR * Math.sin(startAngle);
  const ex = cx + arcR * Math.cos(endAngle);
  const ey = cy + arcR * Math.sin(endAngle);
  const pathD = `M ${sx} ${sy} A ${arcR} ${arcR} 0 1 1 ${ex} ${ey}`;

  if (shouldReduce) {
    return (
      <path
        d={pathD}
        fill="none"
        stroke={ORANGE_300}
        strokeWidth={2}
        strokeDasharray="5 3"
        strokeLinecap="round"
      />
    );
  }

  return (
    <motion.path
      key={uid}
      d={pathD}
      fill="none"
      stroke={ORANGE_300}
      strokeWidth={2}
      strokeDasharray="5 3"
      strokeLinecap="round"
      style={{ originX: `${cx}px`, originY: `${cy}px` }}
      animate={{ rotate: 360 }}
      transition={{
        repeat: Infinity,
        duration: 12,
        ease: 'linear',
        delay: offset,
      }}
    />
  );
}

// ---- Curved arrow between two sprint circles ---------------------------
function SprintArrow({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const mx = (x1 + x2) / 2;
  const curveY = y1 + 26; // curve below
  const d = `M ${x1 + SPRINT_R} ${y1} Q ${mx} ${curveY} ${x2 - SPRINT_R} ${y2}`;
  // arrowhead tip at end of path
  const angle = Math.atan2(y2 - curveY, x2 - SPRINT_R - mx) * (180 / Math.PI);
  const tipX = x2 - SPRINT_R;
  const tipY = y2;
  return (
    <g>
      <path d={d} fill="none" stroke={ORANGE_400} strokeWidth={1.5} markerEnd={`url(#arrowOrange)`} />
      {/* explicit arrowhead fallback */}
      <polygon
        points={`${tipX},${tipY} ${tipX - 7},${tipY - 3} ${tipX - 7},${tipY + 3}`}
        fill={ORANGE_400}
        transform={`rotate(${angle}, ${tipX}, ${tipY})`}
      />
    </g>
  );
}

// ---- Milestone diamond -------------------------------------------------
interface MilestoneNodeProps {
  x: number;
  y: number;
  label: string;
  time: string;
  shouldReduce: boolean;
  delay: number;
}

function MilestoneNode({ x, y, label, time, shouldReduce, delay }: MilestoneNodeProps) {
  const d = 10; // half-diagonal of the diamond
  const points = `${x},${y - d} ${x + d},${y} ${x},${y + d} ${x - d},${y}`;
  const boxW = 70;
  const boxH = 22;
  const boxX = x - boxW / 2;
  const boxY = y + 18;

  const nodeVariants = {
    hidden: { opacity: 0, scale: 0.6 },
    visible: { opacity: 1, scale: 1 },
  };

  if (shouldReduce) {
    return (
      <g>
        <text x={x} y={y - 18} textAnchor="middle" fontSize={9} fill={NEUTRAL_500} fontWeight={500}>
          {time}
        </text>
        <polygon points={points} fill={BLUE_700} stroke={WHITE} strokeWidth={2} />
        <line x1={x} y1={y + d} x2={x} y2={boxY} stroke={BLUE_300} strokeWidth={1.5} />
        <rect x={boxX} y={boxY} width={boxW} height={boxH} rx={3} fill={BLUE_50} stroke={BLUE_300} strokeWidth={1.5} />
        <text x={x} y={boxY + 14} textAnchor="middle" fontSize={10} fill={BLUE_700} fontWeight={600}>
          {label}
        </text>
      </g>
    );
  }

  return (
    <motion.g
      variants={nodeVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      transition={{ duration: 0.3, ease: 'easeOut', delay }}
    >
      <text x={x} y={y - 18} textAnchor="middle" fontSize={9} fill={NEUTRAL_500} fontWeight={500}>
        {time}
      </text>
      <polygon points={points} fill={BLUE_700} stroke={WHITE} strokeWidth={2} />
      <line x1={x} y1={y + d} x2={x} y2={boxY} stroke={BLUE_300} strokeWidth={1.5} />
      <rect x={boxX} y={boxY} width={boxW} height={boxH} rx={3} fill={BLUE_50} stroke={BLUE_300} strokeWidth={1.5} />
      <text x={x} y={boxY + 14} textAnchor="middle" fontSize={10} fill={BLUE_700} fontWeight={600}>
        {label}
      </text>
    </motion.g>
  );
}

// ---- Main component ----------------------------------------------------
export default function WaterfallAgileHybrid() {
  const shouldReduce = useReducedMotion() ?? false;
  const uid = useId();

  return (
    <figure className="not-prose">
      {/* Title row */}
      <div className="flex items-center gap-2 mb-4">
        <Layers size={16} className="text-blue-700 shrink-0" />
        <div>
          <span className="text-sm font-bold text-neutral-900">混搭模型</span>
          <span className="ml-2 text-xs text-neutral-500">對外瀑布 x 對內敏捷</span>
        </div>
      </div>

      {/* SVG diagram */}
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        width="100%"
        aria-label="混搭模型：外層瀑布里程碑（剛性）+ 內層 Sprint 迴圈（柔性）"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <marker id={`${uid}-arrowOrange`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill={ORANGE_400} />
          </marker>
        </defs>

        {/* ---- Outer timeline axis (rigid/blue) ---- */}
        <line
          x1={60}
          y1={AXIS_Y}
          x2={700}
          y2={AXIS_Y}
          stroke={BLUE_700}
          strokeWidth={3}
        />
        {/* Axis arrowhead */}
        <polygon
          points={`700,${AXIS_Y} 692,${AXIS_Y - 4} 692,${AXIS_Y + 4}`}
          fill={BLUE_700}
        />

        {/* ---- Milestone nodes ---- */}
        {MILESTONES.map((m, i) => (
          <MilestoneNode
            key={m.label}
            x={m.x}
            y={AXIS_Y}
            label={m.label}
            time={m.time}
            shouldReduce={shouldReduce}
            delay={i * 0.18}
          />
        ))}

        {/* ---- Sprint groups ---- */}
        {SPRINT_GROUPS.map((group, gi) =>
          group.sprints.map((sprint, si) => {
            const { cx, label } = sprint;
            const cy = group.cy;
            const arcUid = `${uid}-arc-${gi}-${si}`;

            return (
              <g key={arcUid}>
                {/* Dashed vertical line: sprint circle up to timeline */}
                <line
                  x1={cx}
                  y1={AXIS_Y}
                  x2={cx}
                  y2={cy - SPRINT_R}
                  stroke={ORANGE_300}
                  strokeWidth={1.2}
                  strokeDasharray="4 3"
                />
                {/* Sprint circle */}
                <circle cx={cx} cy={cy} r={SPRINT_R} fill={ORANGE_50} stroke={ORANGE_400} strokeWidth={2.5} />
                <text x={cx} y={cy + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill={ORANGE_400}>
                  {label}
                </text>
                {/* Spinning arc */}
                <SpinningArc
                  cx={cx}
                  cy={cy}
                  r={SPRINT_R}
                  shouldReduce={shouldReduce}
                  uid={arcUid}
                  offset={(gi * 2 + si) * 1.5}
                />
              </g>
            );
          })
        )}

        {/* ---- Curved arrows between consecutive sprints within same group ---- */}
        {SPRINT_GROUPS.map((group, gi) =>
          group.sprints.slice(0, -1).map((sprint, si) => {
            const next = group.sprints[si + 1];
            return (
              <SprintArrow
                key={`arrow-${gi}-${si}`}
                x1={sprint.cx}
                y1={group.cy}
                x2={next.cx}
                y2={group.cy}
              />
            );
          })
        )}

        {/* ---- Layer labels (left side) ---- */}
        {/* Contract layer label */}
        <g transform="translate(4, 80)">
          {/* Briefcase icon — simplified SVG path (Lucide style) */}
          <rect x={0} y={2} width={12} height={9} rx={1} fill="none" stroke={BLUE_700} strokeWidth={1.5} />
          <path d="M4 2 V1 a1 1 0 0 1 1-1 h2 a1 1 0 0 1 1 1 v1" fill="none" stroke={BLUE_700} strokeWidth={1.5} />
          <line x1={0} y1={6} x2={12} y2={6} stroke={BLUE_700} strokeWidth={1.5} />
          <text x={16} y={10} fontSize={9} fontWeight={700} fill={BLUE_700}>
            對外契約層
          </text>
        </g>

        {/* Team layer label */}
        <g transform="translate(4, 192)">
          {/* Users icon — simplified SVG path */}
          <circle cx={4} cy={3} r={2.5} fill="none" stroke={ORANGE_400} strokeWidth={1.5} />
          <circle cx={10} cy={3} r={2} fill="none" stroke={ORANGE_400} strokeWidth={1.2} />
          <path d="M0 11 Q4 7 8 11" fill="none" stroke={ORANGE_400} strokeWidth={1.5} />
          <path d="M8 11 Q11 8 14 11" fill="none" stroke={ORANGE_400} strokeWidth={1.2} />
          <text x={17} y={10} fontSize={9} fontWeight={700} fill={ORANGE_400}>
            對內團隊層
          </text>
        </g>

        {/* ---- Legend (right side) ---- */}
        <g transform="translate(700, 72)">
          {/* Blue diamond */}
          <polygon points="7,0 14,7 7,14 0,7" fill={BLUE_700} />
          <text x={18} y={10} fontSize={9} fill={NEUTRAL_700}>
            里程碑（剛性）
          </text>
        </g>
        <g transform="translate(700, 92)">
          {/* Orange circle */}
          <circle cx={7} cy={7} r={6} fill={ORANGE_50} stroke={ORANGE_400} strokeWidth={2} />
          <text x={18} y={11} fontSize={9} fill={NEUTRAL_700}>
            Sprint 迴圈（柔性）
          </text>
        </g>

        {/* ---- Separator line between contract and team layers ---- */}
        <line
          x1={60}
          y1={140}
          x2={700}
          y2={140}
          stroke={NEUTRAL_200}
          strokeWidth={1}
          strokeDasharray="6 4"
        />
      </svg>

      {/* Bottom note */}
      <p className="mt-4 text-xs leading-relaxed" style={{ color: NEUTRAL_500 }}>
        外層剛性框架確保對外承諾可預期；內層敏捷迴圈讓執行保持彈性。兩者並存，而非二選一。
      </p>
    </figure>
  );
}
