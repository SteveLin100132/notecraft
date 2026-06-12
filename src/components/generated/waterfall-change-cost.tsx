import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { TrendingUp, TriangleAlert, RotateCcw, Check } from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Data                                                                  */
/* ------------------------------------------------------------------ */

interface Stage {
  id: number;
  key: string;
  label: string;
  shortLabel: string;
  optional?: boolean;
}

const STAGES: Stage[] = [
  { id: 0, key: 'blueprint', label: 'Blueprint', shortLabel: 'BP' },
  { id: 1, key: 'analysis', label: 'System Analysis', shortLabel: 'SA' },
  { id: 2, key: 'design', label: 'System Design', shortLabel: 'SD' },
  { id: 3, key: 'coding', label: 'Coding', shortLabel: 'DEV' },
  { id: 4, key: 'sit', label: 'SIT', shortLabel: 'SIT' },
  { id: 5, key: 'uat', label: 'UAT', shortLabel: 'UAT' },
  { id: 6, key: 'cutover', label: 'Cutover', shortLabel: 'CUT', optional: true },
  { id: 7, key: 'golive', label: 'Go-Live', shortLabel: 'GO' },
  { id: 8, key: 'maintenance', label: 'Maintenance', shortLabel: 'MNT' },
];

const COST_MULTIPLIERS = [1, 1.5, 2.5, 5, 10, 20, 40, 60, 80];

const AFFECTED_DELIVERABLES: Record<number, string[]> = {
  0: [],
  1: ['SRS'],
  2: ['SDD', 'SRS (局部)'],
  3: ['SDD (局部)', 'SRS (局部)', '開發程式碼'],
  4: ['開發程式碼', 'Test Plan', 'SDD (局部)'],
  5: ['開發程式碼', 'Test Plan', 'Test Case', 'UAT Checklist'],
  6: ['開發程式碼', 'Test Plan', 'Test Case', 'UAT Checklist', 'Cutover Plan'],
  7: ['開發程式碼', 'Test Plan', 'Test Case', 'UAT Checklist', 'Cutover Plan', '部署腳本'],
  8: ['所有前期文件需同步修訂', 'Maintenance Manual', '補丁開發'],
};

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

/** Map stage index → cost multiplier color bucket */
function costColor(stageId: number): string {
  if (stageId <= 2) return '#1b4f9c'; // blue-700
  if (stageId <= 5) return '#e3a008'; // warning-500
  return '#d64545'; // danger-500
}

/** Compute exponential-curve y for the chart (SVG coords) */
function curveY(cost: number): number {
  return 140 - (cost / 80) * 120;
}

/** Build a smooth cubic bezier path through the 9 cost points */
function buildCurvePath(): string {
  const W = 760;
  const pts = COST_MULTIPLIERS.map((c, i) => ({
    x: (i / 8) * (W - 60) + 30,
    y: curveY(c),
  }));

  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const cp1x = pts[i].x + (pts[i + 1].x - pts[i].x) / 3;
    const cp1y = pts[i].y;
    const cp2x = pts[i + 1].x - (pts[i + 1].x - pts[i].x) / 3;
    const cp2y = pts[i + 1].y;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${pts[i + 1].x} ${pts[i + 1].y}`;
  }
  return d;
}

const curvePath = buildCurvePath();

function buildFillPath(): string {
  const W = 760;
  const pts = COST_MULTIPLIERS.map((c, i) => ({
    x: (i / 8) * (W - 60) + 30,
    y: curveY(c),
  }));
  const last = pts[pts.length - 1];
  const first = pts[0];

  let d = `M ${first.x} ${first.y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const cp1x = pts[i].x + (pts[i + 1].x - pts[i].x) / 3;
    const cp1y = pts[i].y;
    const cp2x = pts[i + 1].x - (pts[i + 1].x - pts[i].x) / 3;
    const cp2y = pts[i + 1].y;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${pts[i + 1].x} ${pts[i + 1].y}`;
  }
  d += ` L ${last.x} 155 L ${first.x} 155 Z`;
  return d;
}

const fillPath = buildFillPath();

/* ------------------------------------------------------------------ */
/* Sub-components                                                        */
/* ------------------------------------------------------------------ */

interface WaterfallSVGProps {
  changeStage: number;
  reducedMotion: boolean | null;
}

function WaterfallSVG({ changeStage, reducedMotion }: WaterfallSVGProps) {
  const W = 760;
  const H = 200;
  const boxW = 64;
  const boxH = 36;
  const stepX = (W - boxW) / 8; // horizontal step between boxes
  const baseY = 40; // top of first box
  const stepY = 16; // vertical drop per stage

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" aria-hidden="true">
      {/* Arrow definitions */}
      <defs>
        <marker
          id="wf-arrow"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L0,6 L6,3 z" fill="#cbd3df" />
        </marker>
      </defs>

      {STAGES.map((stage) => {
        const x = stage.id * stepX;
        const y = baseY + stage.id * stepY;
        const cx = x + boxW / 2;
        const cy = y + boxH / 2;

        const isDone = stage.id < changeStage;
        const isCurrent = stage.id === changeStage;
        const isRedo = stage.id > changeStage;

        // Box fill / stroke colours
        let fill: string;
        let stroke: string;
        let textColor: string;

        if (isDone) {
          fill = '#eef4fb'; // blue-50
          stroke = '#adc8e8'; // blue-200 (softer)
          textColor = '#9aa6b8'; // neutral-400
        } else if (isCurrent) {
          fill = '#fff7ed'; // orange-50 approx
          stroke = '#e3a008'; // orange/warning
          textColor = '#3a4456'; // neutral-700
        } else {
          // isRedo
          fill = '#fbeaea'; // danger-50
          stroke = '#d64545'; // danger-500
          textColor = '#d64545';
        }

        return (
          <g key={stage.id}>
            {/* Arrow from previous box */}
            {stage.id > 0 && (
              <line
                x1={x - stepX + boxW}
                y1={y - stepY + boxH / 2}
                x2={x}
                y2={y + boxH / 2}
                stroke="#cbd3df"
                strokeWidth="1.5"
                markerEnd="url(#wf-arrow)"
              />
            )}

            {/* Box — using motion.rect for fill transition */}
            <motion.rect
              x={x}
              y={y}
              width={boxW}
              height={boxH}
              rx="6"
              ry="6"
              style={{
                fill,
                stroke,
                strokeWidth: isCurrent ? 2 : 1.5,
                transition: reducedMotion ? 'none' : 'fill 0.2s ease-out, stroke 0.2s ease-out',
              }}
            />

            {/* Pulse ring for current stage */}
            {isCurrent && !reducedMotion && (
              <motion.circle
                cx={cx}
                cy={cy}
                r={24}
                fill="none"
                stroke="#fed7aa" // orange-200
                strokeWidth="2"
                initial={{ scale: 1, opacity: 0.8 }}
                animate={{ scale: 1.15, opacity: 0 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                style={{ transformOrigin: `${cx}px ${cy}px` }}
              />
            )}

            {/* Stage short label */}
            <text
              x={cx}
              y={y + boxH / 2 + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="11"
              fontWeight="600"
              fill={textColor}
              style={{ transition: reducedMotion ? 'none' : 'fill 0.2s ease-out' }}
            >
              {stage.shortLabel}
            </text>

            {/* Status icon overlay: TriangleAlert for current, RotateCcw for redo */}
            {isCurrent && (
              <g transform={`translate(${x + boxW - 2}, ${y - 2})`}>
                <TriangleAlert
                  size={12}
                  color="#e3a008"
                  style={{ display: 'inline' }}
                />
              </g>
            )}
          </g>
        );
      })}

      {/* Redo icons as foreignObject for stages > changeStage */}
      {STAGES.filter((s) => s.id > changeStage).map((stage) => {
        const x = stage.id * stepX;
        const y = baseY + stage.id * stepY;
        return (
          <foreignObject
            key={`redo-${stage.id}`}
            x={x + boxW - 2}
            y={y - 2}
            width={14}
            height={14}
          >
            <div style={{ lineHeight: 0 }}>
              <RotateCcw size={12} color="#d64545" />
            </div>
          </foreignObject>
        );
      })}

      {/* TriangleAlert as foreignObject for current stage */}
      {STAGES.filter((s) => s.id === changeStage).map((stage) => {
        const x = stage.id * stepX;
        const y = baseY + stage.id * stepY;
        return (
          <foreignObject
            key={`alert-${stage.id}`}
            x={x + boxW - 2}
            y={y - 2}
            width={14}
            height={14}
          >
            <div style={{ lineHeight: 0 }}>
              <TriangleAlert size={12} color="#e3a008" />
            </div>
          </foreignObject>
        );
      })}
    </svg>
  );
}

interface CostCurveSVGProps {
  changeStage: number;
  reducedMotion: boolean | null;
}

function CostCurveSVG({ changeStage, reducedMotion }: CostCurveSVGProps) {
  const W = 760;
  const H = 160;

  const pts = COST_MULTIPLIERS.map((c, i) => ({
    x: (i / 8) * (W - 60) + 30,
    y: curveY(c),
  }));

  const yLabels = [
    { val: '1x', y: curveY(1) },
    { val: '10x', y: curveY(10) },
    { val: '80x', y: curveY(80) },
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" aria-hidden="true">
      {/* Area fill */}
      <path d={fillPath} fill="#adc8e8" opacity="0.2" />

      {/* Curve line */}
      <path d={curvePath} fill="none" stroke="#adc8e8" strokeWidth="2" />

      {/* Vertical cursor line via foreignObject (to allow motion) */}
      {/* We use a rect for the cursor line */}
      <motion.rect
        x={pts[changeStage].x - 0.75}
        y={curveY(80) - 4}
        width={1.5}
        height={155 - curveY(80) + 4}
        fill="#ed9b26"
        opacity={0.7}
        animate={{ x: pts[changeStage].x - 0.75 }}
        transition={
          reducedMotion ? { duration: 0 } : { duration: 0.22, ease: 'easeOut' }
        }
      />

      {/* Stage dot circles */}
      {pts.map((pt, i) => {
        const isSelected = i === changeStage;
        return (
          <motion.circle
            key={i}
            cx={pt.x}
            cy={pt.y}
            r={isSelected ? 7 : 4}
            fill={isSelected ? '#ed9b26' : '#7ba6da'}
            animate={{ r: isSelected ? 7 : 4 }}
            transition={
              reducedMotion ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }
            }
          />
        );
      })}

      {/* X-axis short labels */}
      {STAGES.map((stage, i) => (
        <text
          key={stage.id}
          x={pts[i].x}
          y={H - 2}
          textAnchor="middle"
          fontSize="10"
          fill="#6c798e"
          fontWeight={i === changeStage ? '700' : '400'}
        >
          {stage.shortLabel}
        </text>
      ))}

      {/* Y-axis labels */}
      {yLabels.map((lbl) => (
        <text
          key={lbl.val}
          x={6}
          y={lbl.y + 4}
          fontSize="10"
          fill="#9aa6b8"
          textAnchor="start"
        >
          {lbl.val}
        </text>
      ))}

      {/* Y-axis line */}
      <line x1={24} y1={curveY(80) - 4} x2={24} y2={155} stroke="#e1e6ee" strokeWidth="1" />
      {/* X-axis line */}
      <line x1={24} y1={155} x2={W - 10} y2={155} stroke="#e1e6ee" strokeWidth="1" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Main Component                                                        */
/* ------------------------------------------------------------------ */

export default function WaterfallChangeCost() {
  const [changeStage, setChangeStage] = useState<number>(2);
  const reducedMotion = useReducedMotion();

  const multiplier = COST_MULTIPLIERS[changeStage];
  const deliverables = AFFECTED_DELIVERABLES[changeStage];
  const currentStage = STAGES[changeStage];
  const color = costColor(changeStage);

  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-6 space-y-5"
      style={{ fontFamily: "'Noto Sans TC', 'Noto Sans', sans-serif" }}
    >
      {/* Title */}
      <div className="flex items-center gap-2">
        <TrendingUp size={20} className="text-blue-700" color="#1b4f9c" />
        <h3
          className="text-base font-bold"
          style={{ color: '#1b4f9c', margin: 0 }}
        >
          需求變更的成本放大效應
        </h3>
      </div>

      {/* Waterfall Backbone SVG */}
      <div className="overflow-x-auto">
        <WaterfallSVG changeStage={changeStage} reducedMotion={reducedMotion} />
      </div>

      {/* Cost Number Area */}
      <div className="flex items-start gap-4">
        <div className="flex items-baseline gap-1.5">
          <AnimatePresence mode="wait">
            <motion.span
              key={changeStage}
              initial={reducedMotion ? {} : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? {} : { opacity: 0, y: -8 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              style={{
                fontSize: '2.25rem',
                fontWeight: '900',
                lineHeight: 1,
                color,
                display: 'inline-block',
              }}
            >
              {multiplier}x
            </motion.span>
          </AnimatePresence>
        </div>
        <p
          className="text-xs leading-relaxed mt-1"
          style={{ color: '#6c798e', maxWidth: 320 }}
        >
          相較於 Blueprint 階段發生變更的預估相對成本
          <br />
          <span style={{ color: '#9aa6b8', fontSize: '0.7rem' }}>
            1x &rarr; 8x &rarr; 64x 的指數成長趨勢
          </span>
        </p>
      </div>

      {/* Cost Curve SVG */}
      <div className="overflow-x-auto">
        <CostCurveSVG changeStage={changeStage} reducedMotion={reducedMotion} />
      </div>

      {/* Slider */}
      <div className="space-y-2">
        <input
          type="range"
          min={0}
          max={8}
          step={1}
          value={changeStage}
          onChange={(e) => setChangeStage(Number(e.target.value))}
          aria-label="選擇需求變更發生的階段"
          aria-valuetext={currentStage.label}
          className="w-full accent-blue-700 cursor-pointer"
          style={{ accentColor: '#1b4f9c' }}
        />
        <div className="flex justify-between items-center">
          <span className="text-xs" style={{ color: '#9aa6b8' }}>
            Blueprint（最便宜）
          </span>
          <span className="text-xs" style={{ color: '#9aa6b8' }}>
            Maintenance（最昂貴）
          </span>
        </div>
        <p
          className="text-sm font-semibold text-center"
          style={{ color: '#1b4f9c' }}
        >
          {currentStage.label}
        </p>
      </div>

      {/* Affected Deliverables */}
      <div
        aria-live="polite"
        className="rounded-xl p-4 space-y-2"
        style={{ background: '#f6f8fb', border: '1px solid #e1e6ee' }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-wider mb-2"
          style={{ color: '#6c798e', letterSpacing: '0.06em' }}
        >
          受影響的交付物
        </p>

        {changeStage === 0 ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: '#2e9e6b' }}>
            <Check size={14} color="#2e9e6b" />
            <span>在 Blueprint 發現問題，幾乎無需回頭修改</span>
          </div>
        ) : (
          <AnimatePresence>
            {deliverables.map((item, i) => (
              <motion.div
                key={`${changeStage}-${item}`}
                initial={
                  reducedMotion ? { opacity: 0 } : { opacity: 0, x: -8 }
                }
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={
                  reducedMotion
                    ? { duration: 0.14 }
                    : { duration: 0.2, delay: i * 0.04, ease: 'easeOut' }
                }
                className="flex items-center gap-2 text-sm"
                style={{ color: '#3a4456' }}
              >
                <RotateCcw size={12} color="#d64545" />
                <span>{item}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
