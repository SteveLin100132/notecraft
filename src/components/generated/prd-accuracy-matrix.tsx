import { useState, useId } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { TriangleAlert, CheckCircle, Info } from 'lucide-react'
import { clsx } from 'clsx'

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

type SpecLevel = 'full' | 'vague'
type DomainLevel = 'common' | 'complex'

interface MatrixCell {
  spec: SpecLevel
  domain: DomainLevel
  accuracy: number
  label: string
  color: 'green' | 'yellow' | 'orange' | 'red'
  warning?: string
}

// ----------------------------------------------------------------
// Data
// ----------------------------------------------------------------

const MATRIX_CELLS: MatrixCell[] = [
  {
    spec: 'full',
    domain: 'common',
    accuracy: 90,
    label: '完整 PRD × 常見模式',
    color: 'green',
  },
  {
    spec: 'vague',
    domain: 'common',
    accuracy: 80,
    label: '模糊需求 × 常見模式',
    color: 'yellow',
  },
  {
    spec: 'full',
    domain: 'complex',
    accuracy: 75,
    label: '完整 PRD × 複雜在地',
    color: 'orange',
  },
  {
    spec: 'vague',
    domain: 'complex',
    accuracy: 45,
    label: '模糊需求 × 複雜在地',
    color: 'red',
    warning: '容易偏離預期',
  },
]

function getCell(spec: SpecLevel, domain: DomainLevel): MatrixCell {
  return MATRIX_CELLS.find((c) => c.spec === spec && c.domain === domain)!
}

// ----------------------------------------------------------------
// Color helpers (using CSS variables from trendlink-design tokens)
// ----------------------------------------------------------------

const COLOR_CLASSES = {
  green: {
    ring: 'ring-[var(--success-500)]',
    bg: 'bg-[var(--success-50)]',
    text: 'text-[var(--success-500)]',
    track: 'bg-[var(--success-500)]',
    glow: '#2e9e6b',
  },
  yellow: {
    ring: 'ring-[var(--warning-500)]',
    bg: 'bg-[var(--warning-50)]',
    text: 'text-[var(--warning-500)]',
    track: 'bg-[var(--warning-500)]',
    glow: '#e3a008',
  },
  orange: {
    ring: 'ring-[var(--orange-400)]',
    bg: 'bg-[var(--orange-50)]',
    text: 'text-[var(--orange-500)]',
    track: 'bg-[var(--orange-400)]',
    glow: '#ed9b26',
  },
  red: {
    ring: 'ring-[var(--danger-500)]',
    bg: 'bg-[var(--danger-50)]',
    text: 'text-[var(--danger-500)]',
    track: 'bg-[var(--danger-500)]',
    glow: '#d64545',
  },
} as const

type ColorKey = keyof typeof COLOR_CLASSES

// ----------------------------------------------------------------
// Sub-components
// ----------------------------------------------------------------

interface ToggleGroupProps {
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
  groupId: string
}

function ToggleGroup({ label, options, value, onChange, groupId }: ToggleGroupProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
        {label}
      </span>
      <div className="inline-flex rounded-lg overflow-hidden border border-[var(--neutral-200)] bg-[var(--neutral-100)]">
        {options.map((opt) => {
          const isActive = opt.value === value
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              aria-label={`${label}: ${opt.label}`}
              data-group={groupId}
              onClick={() => onChange(opt.value)}
              className={clsx(
                'relative px-4 py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue-500)] select-none',
                isActive
                  ? 'text-[var(--text-on-brand)] z-10'
                  : 'text-[var(--text-body)] hover:text-[var(--text-strong)] hover:bg-[var(--neutral-200)]',
              )}
            >
              {isActive && (
                <motion.span
                  layoutId={`toggle-bg-${groupId}`}
                  className="absolute inset-0 bg-[var(--blue-700)] rounded-[6px]"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{opt.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Arc progress ring
interface ProgressRingProps {
  accuracy: number
  color: ColorKey
  shouldReduce: boolean
}

const RING_RADIUS = 72
const RING_STROKE = 10
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

function ProgressRing({ accuracy, color, shouldReduce }: ProgressRingProps) {
  const id = useId()
  const colorClasses = COLOR_CLASSES[color]
  const dashOffset = RING_CIRCUMFERENCE * (1 - accuracy / 100)

  return (
    <div className="relative flex items-center justify-center" style={{ width: 180, height: 180 }}>
      <svg
        viewBox="0 0 180 180"
        width="180"
        height="180"
        aria-hidden="true"
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Track */}
        <circle
          cx="90"
          cy="90"
          r={RING_RADIUS}
          fill="none"
          stroke="var(--neutral-200)"
          strokeWidth={RING_STROKE}
        />
        {/* Glow filter */}
        <defs>
          <filter id={`glow-${id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Progress arc */}
        <motion.circle
          cx="90"
          cy="90"
          r={RING_RADIUS}
          fill="none"
          stroke={colorClasses.glow}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          filter={`url(#glow-${id})`}
          initial={false}
          animate={{ strokeDashoffset: shouldReduce ? dashOffset : dashOffset }}
          style={{ strokeDashoffset: RING_CIRCUMFERENCE }}
          transition={
            shouldReduce ? { duration: 0 } : { duration: 0.4, ease: 'easeOut' }
          }
        />
        {/* Separate animation trigger using key trick via wrapper handled externally */}
      </svg>

      {/* Center number */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          key={accuracy}
          initial={shouldReduce ? false : { opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={shouldReduce ? { duration: 0 } : { duration: 0.25, ease: 'easeOut' }}
          className={clsx('text-5xl font-bold tabular-nums leading-none', colorClasses.text)}
        >
          {accuracy}
        </motion.span>
        <span className="text-base text-[var(--text-muted)] mt-1">%</span>
      </div>
    </div>
  )
}

// Animated ring that re-triggers on accuracy change
function AnimatedProgressRing({ accuracy, color, shouldReduce }: ProgressRingProps) {
  const id = useId()
  const colorClasses = COLOR_CLASSES[color]
  const dashOffset = RING_CIRCUMFERENCE * (1 - accuracy / 100)

  return (
    <div className="relative flex items-center justify-center" style={{ width: 180, height: 180 }}>
      <svg
        viewBox="0 0 180 180"
        width="180"
        height="180"
        aria-hidden="true"
        style={{ transform: 'rotate(-90deg)' }}
      >
        <circle
          cx="90"
          cy="90"
          r={RING_RADIUS}
          fill="none"
          stroke="var(--neutral-200)"
          strokeWidth={RING_STROKE}
        />
        <defs>
          <filter id={`glow-${id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <motion.circle
          key={`${accuracy}-${color}`}
          cx="90"
          cy="90"
          r={RING_RADIUS}
          fill="none"
          stroke={colorClasses.glow}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          filter={`url(#glow-${id})`}
          initial={{ strokeDashoffset: RING_CIRCUMFERENCE }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={
            shouldReduce ? { duration: 0 } : { duration: 0.4, ease: 'easeOut' }
          }
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          key={accuracy}
          initial={shouldReduce ? false : { opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={shouldReduce ? { duration: 0 } : { duration: 0.25, ease: 'easeOut' }}
          className={clsx('text-5xl font-bold tabular-nums leading-none', colorClasses.text)}
        >
          {accuracy}
        </motion.span>
        <span className="text-base text-[var(--text-muted)] mt-1">%</span>
      </div>
    </div>
  )
}

// 2×2 mini grid
interface MiniGridProps {
  activeSpec: SpecLevel
  activeDomain: DomainLevel
  shouldReduce: boolean
}

const SPEC_OPTIONS: SpecLevel[] = ['full', 'vague']
const DOMAIN_OPTIONS: DomainLevel[] = ['common', 'complex']

function MiniGrid({ activeSpec, activeDomain, shouldReduce }: MiniGridProps) {
  return (
    <div className="flex flex-col gap-1">
      {/* Column headers */}
      <div className="grid grid-cols-[auto_1fr_1fr] gap-1 items-center">
        <div className="w-16" />
        <span className="text-[10px] text-center text-[var(--text-muted)] font-medium">常見模式</span>
        <span className="text-[10px] text-center text-[var(--text-muted)] font-medium">複雜在地</span>
      </div>
      {/* Rows */}
      {SPEC_OPTIONS.map((spec) => (
        <div key={spec} className="grid grid-cols-[auto_1fr_1fr] gap-1 items-center">
          <span className="w-16 text-[10px] text-right pr-1 text-[var(--text-muted)] font-medium">
            {spec === 'full' ? '完整 PRD' : '模糊需求'}
          </span>
          {DOMAIN_OPTIONS.map((domain) => {
            const cell = getCell(spec, domain)
            const isActive = spec === activeSpec && domain === activeDomain
            const colors = COLOR_CLASSES[cell.color as ColorKey]
            return (
              <motion.div
                key={domain}
                animate={
                  isActive
                    ? { scale: 1.08, opacity: 1 }
                    : { scale: 1, opacity: 0.55 }
                }
                transition={shouldReduce ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }}
                className={clsx(
                  'rounded-md px-1.5 py-1.5 flex flex-col items-center gap-0.5 ring-2 transition-colors',
                  colors.bg,
                  isActive ? [colors.ring, 'opacity-100'] : 'ring-transparent',
                )}
              >
                <span className={clsx('text-sm font-bold tabular-nums', colors.text)}>
                  {cell.accuracy}%
                </span>
              </motion.div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ----------------------------------------------------------------
// Main component
// ----------------------------------------------------------------

export default function PrdAccuracyMatrix() {
  const shouldReduce = useReducedMotion() ?? false
  const [spec, setSpec] = useState<SpecLevel>('full')
  const [domain, setDomain] = useState<DomainLevel>('common')

  const cell = getCell(spec, domain)
  const colors = COLOR_CLASSES[cell.color as ColorKey]

  return (
    <div className="not-prose max-w-2xl mx-auto">
      {/* Controls */}
      <div className="flex flex-wrap gap-4 mb-6">
        <ToggleGroup
          label="規格清晰度"
          groupId="spec"
          options={[
            { value: 'full', label: '完整 PRD' },
            { value: 'vague', label: '一句模糊需求' },
          ]}
          value={spec}
          onChange={(v) => setSpec(v as SpecLevel)}
        />
        <ToggleGroup
          label="領域複雜度"
          groupId="domain"
          options={[
            { value: 'common', label: '常見模式（排班）' },
            { value: 'complex', label: '複雜在地（薪資／多國法規）' },
          ]}
          value={domain}
          onChange={(v) => setDomain(v as DomainLevel)}
        />
      </div>

      {/* Main display */}
      <div className="flex flex-col sm:flex-row items-center gap-8">
        {/* Progress ring + label */}
        <div className="flex flex-col items-center gap-3">
          <AnimatedProgressRing
            accuracy={cell.accuracy}
            color={cell.color as ColorKey}
            shouldReduce={shouldReduce}
          />

          {/* Label + warning */}
          <div className="flex flex-col items-center gap-1.5 text-center">
            <motion.span
              key={cell.label}
              initial={shouldReduce ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={shouldReduce ? { duration: 0 } : { duration: 0.25, ease: 'easeOut' }}
              className="text-sm font-semibold text-[var(--text-body)]"
            >
              {cell.label}
            </motion.span>

            {cell.warning ? (
              <motion.div
                key="warning"
                initial={shouldReduce ? false : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={shouldReduce ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--danger-50)] text-[var(--danger-500)]"
              >
                <TriangleAlert size={13} />
                <span className="text-xs font-medium">{cell.warning}</span>
              </motion.div>
            ) : (
              <motion.div
                key="ok"
                initial={shouldReduce ? false : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={shouldReduce ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--success-50)] text-[var(--success-500)]"
              >
                <CheckCircle size={13} />
                <span className="text-xs font-medium">符合預期</span>
              </motion.div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px self-stretch bg-[var(--neutral-200)]" />
        <div className="sm:hidden w-full h-px bg-[var(--neutral-200)]" />

        {/* Mini 2×2 grid */}
        <div className="flex flex-col gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
            <Info size={13} />
            <span className="text-xs">四種組合落點</span>
          </div>
          <MiniGrid activeSpec={spec} activeDomain={domain} shouldReduce={shouldReduce} />
          {/* Insight callout */}
          <motion.p
            key={`insight-${spec}-${domain}`}
            initial={shouldReduce ? false : { opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={shouldReduce ? { duration: 0 } : { duration: 0.3, ease: 'easeOut' }}
            className="text-xs text-[var(--text-muted)] leading-relaxed mt-1"
          >
            {spec === 'full' && domain === 'common' &&
              '詳細規格搭配常見模式，AI 靠通用知識幾乎能全面對齊，準確度最高。'}
            {spec === 'vague' && domain === 'common' &&
              '模糊需求在常見領域仍有約八成，AI 依靠業界慣例填補空白相對有效。'}
            {spec === 'full' && domain === 'complex' &&
              '完整規格可讓 AI 跟上在地法規細節，但領域本身即有複雜不確定性。'}
            {spec === 'vague' && domain === 'complex' &&
              '模糊需求遇上複雜在地情境（薪資、台灣勞動法規）偏差最大，須格外小心。'}
          </motion.p>
        </div>
      </div>
    </div>
  )
}
