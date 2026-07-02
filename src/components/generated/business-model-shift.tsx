import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'motion/react';
import { Play, Pause, TriangleAlert, UserCheck, CheckCircle, ScanSearch } from 'lucide-react';

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

type EventType = 'crisis' | 'engage' | 'resolve' | 'check';

interface TimelineEvent {
  month: number;
  type: EventType;
  label: string;
  icon: 'TriangleAlert' | 'UserCheck' | 'CheckCircle' | 'ScanSearch';
}

// ─────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────

const PASSIVE_EVENTS: TimelineEvent[] = [
  { month: 3,   type: 'crisis',  label: '問題爆發', icon: 'TriangleAlert' },
  { month: 4,   type: 'engage',  label: '顧問接案', icon: 'UserCheck'     },
  { month: 4.5, type: 'resolve', label: '結案',     icon: 'CheckCircle'   },
  { month: 16,  type: 'crisis',  label: '再次爆發', icon: 'TriangleAlert' },
  { month: 17,  type: 'engage',  label: '顧問接案', icon: 'UserCheck'     },
  { month: 18,  type: 'resolve', label: '結案',     icon: 'CheckCircle'   },
];

const ACTIVE_EVENTS: TimelineEvent[] = [
  { month: 1,  type: 'check',  label: '初次檢測', icon: 'ScanSearch' },
  { month: 6,  type: 'check',  label: '定期檢測', icon: 'ScanSearch' },
  { month: 7,  type: 'engage', label: '顧問介入', icon: 'UserCheck'  },
  { month: 12, type: 'check',  label: '定期檢測', icon: 'ScanSearch' },
  { month: 18, type: 'check',  label: '定期檢測', icon: 'ScanSearch' },
  { month: 19, type: 'engage', label: '顧問介入', icon: 'UserCheck'  },
  { month: 24, type: 'check',  label: '定期檢測', icon: 'ScanSearch' },
];

// ─────────────────────────────────────────────────────────
// SVG layout constants
// ─────────────────────────────────────────────────────────

const SVG_W = 800;
const SVG_H = 540;
const LEFT_PAD = 16;
const RIGHT_PAD = 24;
const AXIS_X0 = LEFT_PAD + 60;    // where month 1 starts
const AXIS_X1 = SVG_W - RIGHT_PAD; // where month 24 ends
const TOTAL_MONTHS = 24;

// Upper section (passive)
const PASSIVE_AXIS_Y  = 130;
const PASSIVE_RISK_Y0 = 168;  // risk curve start baseline
const PASSIVE_RISK_Y1 = 228;  // risk curve bottom (peak)

// Lower section (active)
const ACTIVE_AXIS_Y   = 380;
const ACTIVE_RISK_Y0  = 418;
const ACTIVE_RISK_Y1  = 480;

const DIVIDER_Y = 272;

// Untracked gap rectangles (passive mode) — month ranges with no contact
const UNTRACKED_RANGES = [
  { m0: 5,  m1: 15 },
  { m0: 19, m1: 23 },
];

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function monthToX(m: number): number {
  return AXIS_X0 + ((m - 1) / (TOTAL_MONTHS - 1)) * (AXIS_X1 - AXIS_X0);
}

/** Build an SVG polyline/path string for the passive risk curve */
function buildPassiveRiskPath(): string {
  // Rises slowly → spikes at crisis (m3) → drops → quiet → rises again → spike (m16) → drops
  const pts: Array<[number, number]> = [
    [monthToX(1),    PASSIVE_RISK_Y0],
    [monthToX(2.5),  PASSIVE_RISK_Y0 + 22],
    [monthToX(3),    PASSIVE_RISK_Y1],         // crisis peak
    [monthToX(4.5),  PASSIVE_RISK_Y0 + 10],   // resolve, partial drop
    [monthToX(8),    PASSIVE_RISK_Y0 + 16],
    [monthToX(13),   PASSIVE_RISK_Y0 + 30],   // creeping up again
    [monthToX(16),   PASSIVE_RISK_Y1],         // second crisis
    [monthToX(18),   PASSIVE_RISK_Y0 + 10],
    [monthToX(22),   PASSIVE_RISK_Y0 + 18],
    [monthToX(24),   PASSIVE_RISK_Y0 + 24],
  ];
  return pts
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ');
}

/** Build an SVG polyline/path string for the active risk curve */
function buildActiveRiskPath(): string {
  // Low, gentle undulating wave — never spikes high
  const pts: Array<[number, number]> = [
    [monthToX(1),  ACTIVE_RISK_Y0],
    [monthToX(3),  ACTIVE_RISK_Y0 + 10],
    [monthToX(6),  ACTIVE_RISK_Y0 + 8],       // check point, stays low
    [monthToX(9),  ACTIVE_RISK_Y0 + 12],
    [monthToX(12), ACTIVE_RISK_Y0 + 8],        // check
    [monthToX(15), ACTIVE_RISK_Y0 + 10],
    [monthToX(18), ACTIVE_RISK_Y0 + 8],        // check
    [monthToX(21), ACTIVE_RISK_Y0 + 10],
    [monthToX(24), ACTIVE_RISK_Y0 + 8],
  ];
  return pts
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ');
}

// ─────────────────────────────────────────────────────────
// Icon resolver
// ─────────────────────────────────────────────────────────

function EventIcon({ icon, className }: { icon: TimelineEvent['icon']; className?: string }) {
  const props = { size: 10, className };
  switch (icon) {
    case 'TriangleAlert': return <TriangleAlert {...props} />;
    case 'UserCheck':     return <UserCheck {...props} />;
    case 'CheckCircle':   return <CheckCircle {...props} />;
    case 'ScanSearch':    return <ScanSearch {...props} />;
  }
}

// Fill color by event type
function nodeFill(type: EventType, section: 'passive' | 'active'): string {
  if (section === 'passive') {
    if (type === 'crisis')  return 'var(--danger-500)';
    if (type === 'engage')  return 'var(--warning-500)';
    if (type === 'resolve') return 'var(--neutral-500)';
  } else {
    if (type === 'check')  return 'var(--blue-500)';
    if (type === 'engage') return 'var(--success-500)';
  }
  return 'var(--neutral-400)';
}

// ─────────────────────────────────────────────────────────
// Risk path with dashoffset reveal
// ─────────────────────────────────────────────────────────

interface RiskPathProps {
  d: string;
  stroke: string;
  month: number;
  reduced: boolean | null;
}

function RiskPath({ d, stroke, month, reduced }: RiskPathProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const [total, setTotal] = useState<number>(0);

  useEffect(() => {
    if (pathRef.current) {
      setTotal(pathRef.current.getTotalLength());
    }
  }, [d]);

  const progress = Math.min(month / TOTAL_MONTHS, 1);
  const offset = reduced ? 0 : total - total * progress;

  return (
    <path
      ref={pathRef}
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={2.5}
      strokeOpacity={0.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={total > 0 ? total : undefined}
      strokeDashoffset={total > 0 ? offset : undefined}
      style={{ transition: reduced ? 'none' : 'stroke-dashoffset 0.12s linear' }}
    />
  );
}

// ─────────────────────────────────────────────────────────
// Animated event node (circle + icon overlay)
// ─────────────────────────────────────────────────────────

interface EventNodeProps {
  event: TimelineEvent;
  axisY: number;
  section: 'passive' | 'active';
  currentMonth: number;
  reduced: boolean | null;
}

function EventNode({ event, axisY, section, currentMonth, reduced }: EventNodeProps) {
  const cx = monthToX(event.month);
  const cy = axisY - 22;
  const isReached = event.month <= currentMonth;
  const fill = nodeFill(event.type, section);

  return (
    <AnimatePresence>
      {/* Always render the node, change opacity if not yet reached */}
      <motion.g
        key={`${section}-${event.month}-${event.label}`}
        initial={reduced ? { scale: 1, opacity: isReached ? 1 : 0.2 } : { scale: 0.3, opacity: 0 }}
        animate={{ scale: 1, opacity: isReached ? 1 : 0.2 }}
        transition={reduced ? { duration: 0 } : { duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      >
        <circle
          cx={cx}
          cy={cy}
          r={9}
          fill={fill}
          stroke="white"
          strokeWidth={1.5}
        />
        {/* Label below node */}
        <text
          x={cx}
          y={cy + 24}
          textAnchor="middle"
          fontSize={9}
          fill={isReached ? 'var(--neutral-600)' : 'var(--neutral-300)'}
          fontFamily="'Noto Sans TC', sans-serif"
        >
          {event.label}
        </text>
      </motion.g>
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────

export default function BusinessModelShift() {
  const [month, setMonth] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reduced = useReducedMotion();

  const passivePath = buildPassiveRiskPath();
  const activePath  = buildActiveRiskPath();

  const stopPlayback = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const startPlayback = useCallback(() => {
    setIsPlaying(true);
    setMonth(1);
    if (intervalRef.current !== null) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setMonth(prev => {
        if (prev >= 24) {
          stopPlayback();
          return 24;
        }
        return prev + 1;
      });
    }, 80);
  }, [stopPlayback]);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      stopPlayback();
    } else {
      if (reduced) {
        // Reduced motion: jump directly to end, no animation
        setMonth(24);
      } else {
        startPlayback();
      }
    }
  }, [isPlaying, reduced, startPlayback, stopPlayback]);

  // Auto-stop when month reaches 24
  useEffect(() => {
    if (month >= 24 && isPlaying) {
      stopPlayback();
    }
  }, [month, isPlaying, stopPlayback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
  }, []);

  const progressX = monthToX(month);
  const MONTH_LABELS = [1, 6, 12, 18, 24];

  // Untracked rect rendering helper
  const untrackedRects = UNTRACKED_RANGES.map(({ m0, m1 }) => {
    const x0 = monthToX(m0);
    const x1 = monthToX(m1);
    const isActive = month >= m0;
    return { x0, x1, isActive };
  });

  return (
    <div className="not-prose max-w-4xl mx-auto">
      {/* SVG Main Visualization */}
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        width="100%"
        aria-label="商業模式升級：傳統被動接案 vs 主動風險管理"
      >
        {/* ── Section labels ── */}
        <text
          x={AXIS_X0}
          y={20}
          fontSize={13}
          fontWeight="700"
          fill="var(--danger-500)"
          fontFamily="'Noto Sans TC', sans-serif"
        >
          傳統模式（被動接案）
        </text>
        <text
          x={AXIS_X0}
          y={36}
          fontSize={10}
          fill="var(--neutral-500)"
          fontFamily="'Noto Sans TC', sans-serif"
        >
          問題發生才介入，長期存在大量未追蹤盲區
        </text>

        <text
          x={AXIS_X0}
          y={296}
          fontSize={13}
          fontWeight="700"
          fill="var(--success-500)"
          fontFamily="'Noto Sans TC', sans-serif"
        >
          新模式（主動風險管理）
        </text>
        <text
          x={AXIS_X0}
          y={312}
          fontSize={10}
          fill="var(--neutral-500)"
          fontFamily="'Noto Sans TC', sans-serif"
        >
          每 6 個月定期健檢，24 個月全週期都在視野內
        </text>

        {/* ── Divider line ── */}
        <line
          x1={AXIS_X0 - 8}
          y1={DIVIDER_Y}
          x2={AXIS_X1}
          y2={DIVIDER_Y}
          stroke="var(--neutral-200)"
          strokeWidth={1}
          strokeDasharray="5 4"
        />

        {/* ══════════════════════════════════
            PASSIVE section (upper)
        ══════════════════════════════════ */}

        {/* Untracked background rects */}
        {untrackedRects.map(({ x0, x1 }, i) => (
          <g key={i}>
            <rect
              x={x0}
              y={PASSIVE_AXIS_Y - 50}
              width={x1 - x0}
              height={100}
              fill="var(--neutral-100)"
              opacity={0.8}
            />
            <text
              x={(x0 + x1) / 2}
              y={PASSIVE_AXIS_Y - 22}
              textAnchor="middle"
              fontSize={8.5}
              fill="var(--neutral-400)"
              fontFamily="'Noto Sans TC', sans-serif"
            >
              未追蹤
            </text>
          </g>
        ))}

        {/* Time axis line — passive */}
        {/* Past segment (solid) */}
        <line
          x1={AXIS_X0}
          y1={PASSIVE_AXIS_Y}
          x2={Math.min(progressX, AXIS_X1)}
          y2={PASSIVE_AXIS_Y}
          stroke="var(--neutral-600)"
          strokeWidth={2}
        />
        {/* Future segment (dashed) */}
        {month < 24 && (
          <line
            x1={progressX}
            y1={PASSIVE_AXIS_Y}
            x2={AXIS_X1}
            y2={PASSIVE_AXIS_Y}
            stroke="var(--neutral-300)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
        )}

        {/* Risk curve — passive */}
        <RiskPath
          d={passivePath}
          stroke="var(--danger-500)"
          month={month}
          reduced={reduced}
        />

        {/* Risk area label */}
        <text
          x={AXIS_X0 - 8}
          y={PASSIVE_RISK_Y0 + 24}
          fontSize={8.5}
          fill="var(--neutral-400)"
          textAnchor="end"
          fontFamily="'Noto Sans TC', sans-serif"
        >
          風險
        </text>

        {/* Event nodes — passive */}
        {PASSIVE_EVENTS.map(evt => (
          <EventNode
            key={`passive-${evt.month}-${evt.label}`}
            event={evt}
            axisY={PASSIVE_AXIS_Y}
            section="passive"
            currentMonth={month}
            reduced={reduced}
          />
        ))}

        {/* Progress indicator dot — passive */}
        <circle
          cx={progressX}
          cy={PASSIVE_AXIS_Y}
          r={4}
          fill="var(--blue-700)"
          opacity={0.9}
        />

        {/* ══════════════════════════════════
            ACTIVE section (lower)
        ══════════════════════════════════ */}

        {/* Continuous tracking background */}
        <rect
          x={AXIS_X0}
          y={ACTIVE_AXIS_Y - 50}
          width={AXIS_X1 - AXIS_X0}
          height={100}
          fill="var(--success-50)"
          opacity={0.6}
        />
        <text
          x={(AXIS_X0 + AXIS_X1) / 2}
          y={ACTIVE_AXIS_Y - 28}
          textAnchor="middle"
          fontSize={8.5}
          fill="var(--success-500)"
          fontFamily="'Noto Sans TC', sans-serif"
        >
          持續追蹤
        </text>

        {/* Time axis line — active */}
        <line
          x1={AXIS_X0}
          y1={ACTIVE_AXIS_Y}
          x2={Math.min(progressX, AXIS_X1)}
          y2={ACTIVE_AXIS_Y}
          stroke="var(--success-500)"
          strokeWidth={2}
          opacity={0.8}
        />
        {month < 24 && (
          <line
            x1={progressX}
            y1={ACTIVE_AXIS_Y}
            x2={AXIS_X1}
            y2={ACTIVE_AXIS_Y}
            stroke="var(--success-500)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            opacity={0.4}
          />
        )}

        {/* Risk curve — active */}
        <RiskPath
          d={activePath}
          stroke="var(--success-500)"
          month={month}
          reduced={reduced}
        />

        {/* Risk area label */}
        <text
          x={AXIS_X0 - 8}
          y={ACTIVE_RISK_Y0 + 24}
          fontSize={8.5}
          fill="var(--neutral-400)"
          textAnchor="end"
          fontFamily="'Noto Sans TC', sans-serif"
        >
          風險
        </text>

        {/* Event nodes — active */}
        {ACTIVE_EVENTS.map(evt => (
          <EventNode
            key={`active-${evt.month}-${evt.label}`}
            event={evt}
            axisY={ACTIVE_AXIS_Y}
            section="active"
            currentMonth={month}
            reduced={reduced}
          />
        ))}

        {/* Progress indicator dot — active */}
        <circle
          cx={progressX}
          cy={ACTIVE_AXIS_Y}
          r={4}
          fill="var(--blue-700)"
          opacity={0.9}
        />

        {/* ══════════════════════════════════
            Shared X-axis ticks
        ══════════════════════════════════ */}
        {MONTH_LABELS.map(m => {
          const x = monthToX(m);
          return (
            <g key={m}>
              {/* Tick on passive axis */}
              <line
                x1={x} y1={PASSIVE_AXIS_Y - 4}
                x2={x} y2={PASSIVE_AXIS_Y + 4}
                stroke="var(--neutral-400)"
                strokeWidth={1}
              />
              {/* Tick on active axis */}
              <line
                x1={x} y1={ACTIVE_AXIS_Y - 4}
                x2={x} y2={ACTIVE_AXIS_Y + 4}
                stroke="var(--neutral-400)"
                strokeWidth={1}
              />
              {/* Label below active axis */}
              <text
                x={x}
                y={SVG_H - 16}
                textAnchor="middle"
                fontSize={11}
                fill="var(--neutral-500)"
                fontFamily="'Noto Sans TC', sans-serif"
              >
                {m === 1 ? '第1月' : m === 24 ? '第24月' : `第${m}月`}
              </text>
            </g>
          );
        })}

        {/* Vertical guide line at current month */}
        <line
          x1={progressX}
          y1={50}
          x2={progressX}
          y2={SVG_H - 30}
          stroke="var(--blue-500)"
          strokeWidth={1}
          strokeDasharray="3 3"
          opacity={0.4}
        />
      </svg>

      {/* ── Controls ── */}
      <div className="mt-4 flex flex-col gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Play/Pause button */}
          <button
            onClick={handlePlayPause}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white transition-colors"
            style={{
              backgroundColor: 'var(--blue-700)',
              borderRadius: 'var(--radius-pill)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--blue-800)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--blue-700)';
            }}
            aria-label={isPlaying ? '暫停' : '播放'}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            <span>{isPlaying ? '暫停' : '播放'}</span>
          </button>

          {/* Month readout */}
          <span
            className="text-sm tabular-nums"
            style={{ color: 'var(--text-muted)' }}
          >
            當前月份：第 <strong style={{ color: 'var(--text-body)' }}>{month}</strong> 月
          </span>
        </div>

        {/* Slider */}
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>第1月</span>
          <input
            type="range"
            min={1}
            max={24}
            step={1}
            value={month}
            onChange={e => {
              stopPlayback();
              setMonth(Number(e.target.value));
            }}
            className="flex-1"
            style={{ accentColor: 'var(--blue-700)' }}
            aria-label="月份進度"
          />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>第24月</span>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--danger-500)' }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>危機爆發</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--warning-500)' }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>顧問接案</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--neutral-500)' }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>結案</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--blue-500)' }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>定期檢測</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--success-500)' }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>顧問介入</span>
        </div>
      </div>
    </div>
  );
}
