import { useState, useMemo } from 'react'
import { useReducedMotion, motion, AnimatePresence } from 'motion/react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceArea,
  Label,
} from 'recharts'

// ── helpers ────────────────────────────────────────────────────────────────

function formatMoney(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + ' 萬'
  return String(Math.round(n))
}

function formatMultiple(n: number): string {
  return n.toFixed(2) + ' 倍'
}

// ── types ──────────────────────────────────────────────────────────────────

type Freq = 1 | 4 | 12

interface DataPoint {
  year: number
  compound: number
  simple: number
}

interface FreqOption {
  label: string
  value: Freq
}

const FREQ_OPTIONS: FreqOption[] = [
  { label: '年複利', value: 1 },
  { label: '季複利', value: 4 },
  { label: '月複利', value: 12 },
]

// ── sub-components ─────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: string
  valueClass?: string
  shouldReduceMotion: boolean
}

function StatCard({ label, value, valueClass, shouldReduceMotion }: StatCardProps) {
  return (
    <div
      className="bg-[var(--blue-50)] rounded-[var(--radius-lg)] p-4 text-center"
    >
      <div className="text-xs text-[var(--text-muted)] mb-1">{label}</div>
      {shouldReduceMotion ? (
        <div className={`text-xl font-bold ${valueClass ?? 'text-[var(--blue-700)]'}`}>
          {value}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={value}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1, ease: 'easeOut' }}
            className={`text-xl font-bold ${valueClass ?? 'text-[var(--blue-700)]'}`}
          >
            {value}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}

// ── tooltip formatter ──────────────────────────────────────────────────────

// recharts Tooltip formatter signature
function tooltipFormatter(value: number): [string, string] {
  return [formatMoney(value), '']
}

// ── main component ─────────────────────────────────────────────────────────

export default function CompoundInterestExplorer() {
  const shouldReduceMotion = useReducedMotion() ?? false

  const [principal, setPrincipal] = useState(100000)
  const [rate, setRate] = useState(6)
  const [years, setYears] = useState(20)
  const [freq, setFreq] = useState<Freq>(1)

  const { data, finalCompound, totalInterest, multiple, accelStart } = useMemo(() => {
    const points: DataPoint[] = []
    for (let t = 0; t <= years; t++) {
      const compound = principal * Math.pow(1 + rate / 100 / freq, freq * t)
      const simple = principal * (1 + (rate / 100) * t)
      points.push({ year: t, compound, simple })
    }

    const finalCompound = points[years].compound
    const totalInterest = finalCompound - principal
    const multiple = finalCompound / principal

    // First year where compound exceeds simple by 10% of principal
    let accelStart: number | undefined
    for (let t = 1; t <= years; t++) {
      if (points[t].compound - points[t].simple >= principal * 0.1) {
        accelStart = t
        break
      }
    }

    return { data: points, finalCompound, totalInterest, multiple, accelStart }
  }, [principal, rate, years, freq])

  // ── slider label helpers ───────────────────────────────────────────────

  const principalLabel = `${(principal / 10000).toFixed(0)} 萬`
  const rateLabel = `${rate.toFixed(1)}%`
  const yearsLabel = `${years} 年`

  return (
    <div className="not-prose max-w-3xl mx-auto space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="期末本利和"
          value={formatMoney(finalCompound)}
          shouldReduceMotion={shouldReduceMotion}
        />
        <StatCard
          label="總利息收益"
          value={formatMoney(totalInterest)}
          shouldReduceMotion={shouldReduceMotion}
        />
        <StatCard
          label="是本金的"
          value={formatMultiple(multiple)}
          valueClass="text-[var(--orange-500)]"
          shouldReduceMotion={shouldReduceMotion}
        />
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-200)" />
          <XAxis
            dataKey="year"
            tickFormatter={(v: number) => v + '年'}
            tick={{ fill: 'var(--neutral-500)', fontSize: 12 }}
          />
          <YAxis
            tickFormatter={(v: number) => formatMoney(v)}
            width={52}
            tick={{ fill: 'var(--neutral-500)', fontSize: 12 }}
          />
          {/* Acceleration region — only render when accelStart is defined */}
          {accelStart !== undefined && (
            <ReferenceArea
              x1={accelStart}
              x2={years}
              fill="var(--orange-50)"
              fillOpacity={0.6}
            >
              <Label
                value="複利加速拉開"
                position="insideTopLeft"
                fill="var(--orange-500)"
                fontSize={11}
              />
            </ReferenceArea>
          )}
          <Line
            type="monotone"
            dataKey="compound"
            name="複利"
            stroke="var(--blue-700)"
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={!shouldReduceMotion}
            animationDuration={220}
          />
          <Line
            type="monotone"
            dataKey="simple"
            name="單利"
            stroke="var(--neutral-400)"
            strokeWidth={1.5}
            strokeDasharray="6 3"
            dot={false}
            isAnimationActive={!shouldReduceMotion}
            animationDuration={220}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--surface-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              fontSize: 12,
            }}
            formatter={tooltipFormatter}
          />
          <Legend
            formatter={(value: string) => (
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{value}</span>
            )}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Frequency pill buttons */}
      <div className="flex gap-2 justify-center">
        {FREQ_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFreq(opt.value)}
            className={
              freq === opt.value
                ? 'px-4 py-1.5 rounded-[var(--radius-pill)] text-sm font-medium bg-[var(--blue-700)] text-white transition-colors'
                : 'px-4 py-1.5 rounded-[var(--radius-pill)] text-sm font-medium bg-[var(--neutral-100)] text-[var(--text-body)] hover:bg-[var(--blue-50)] transition-colors'
            }
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* 本金 */}
        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="font-medium text-[var(--text-body)]">本金</span>
            <span className="font-semibold text-[var(--blue-700)]">{principalLabel}</span>
          </div>
          <input
            type="range"
            min={10000}
            max={1000000}
            step={10000}
            value={principal}
            onChange={(e) => setPrincipal(Number(e.target.value))}
            className="w-full accent-[var(--blue-700)]"
          />
        </div>

        {/* 年利率 */}
        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="font-medium text-[var(--text-body)]">年利率</span>
            <span className="font-semibold text-[var(--blue-700)]">{rateLabel}</span>
          </div>
          <input
            type="range"
            min={1}
            max={12}
            step={0.5}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="w-full accent-[var(--blue-700)]"
          />
        </div>

        {/* 年數 */}
        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="font-medium text-[var(--text-body)]">投資年數</span>
            <span className="font-semibold text-[var(--blue-700)]">{yearsLabel}</span>
          </div>
          <input
            type="range"
            min={1}
            max={40}
            step={1}
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            className="w-full accent-[var(--blue-700)]"
          />
        </div>
      </div>
    </div>
  )
}
