import { useState, useRef } from 'react'
import { motion, useReducedMotion, useInView } from 'motion/react'
import {
  ChevronRight,
  Target,
  Plug,
  Wrench,
  CloudUpload,
  Trophy,
  ListChecks,
} from 'lucide-react'
import { clsx } from 'clsx'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ScoreDimension {
  id: string
  label: string
  icon: React.ReactNode
  pts: number
  max: number
  color: string      // accent hex for top stripe & fill bar
  bgClass: string    // card background Tailwind class
  source: string
}

// ─── Data ────────────────────────────────────────────────────────────────────

const PIPELINE_STAGES: { label: string; sub: string; highlight?: boolean }[] = [
  { label: '培訓', sub: '共同範例打底' },
  { label: '系統建置', sub: '痛點做成系統' },
  { label: '評分', sub: '依 rubric 達標', highlight: true },
  { label: '展示', sub: '對外可見' },
  { label: '上架', sub: '成公司資產' },
]

const THRESHOLD = 85

// ─── Sub-components ──────────────────────────────────────────────────────────

function StageCard({
  stage,
  index,
  reduced,
}: {
  stage: (typeof PIPELINE_STAGES)[number]
  index: number
  reduced: boolean
}) {
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: reduced ? 0 : index * 0.08, ease: 'easeOut' }}
      className={clsx(
        'flex flex-col items-center justify-center rounded-xl px-3 py-3 text-center min-w-0 flex-1',
        stage.highlight
          ? 'bg-[#1b4f9c] dark:bg-[#163f7d]'
          : 'bg-[#eef4fb] dark:bg-[#163f7d]/60',
        stage.highlight
          ? 'ring-2 ring-[#ed9b26]'
          : 'ring-1 ring-[#e1e6ee] dark:ring-[#163f7d]',
      )}
    >
      <span
        className={clsx(
          'text-sm font-semibold leading-tight',
          stage.highlight
            ? 'text-white'
            : 'text-[#1b4f9c] dark:text-[#7ba6da]',
        )}
      >
        {stage.label}
      </span>
      <span
        className={clsx(
          'mt-0.5 text-[10px] leading-tight',
          stage.highlight
            ? 'text-[#d6e4f5]'
            : 'text-[#6c798e] dark:text-[#9aa6b8]',
        )}
      >
        {stage.sub}
      </span>
    </motion.div>
  )
}

function DimensionCard({
  dim,
  active,
  onToggle,
}: {
  dim: ScoreDimension
  active: boolean
  onToggle: () => void
}) {
  const pct = active ? (dim.pts / dim.max) * 100 : 0

  return (
    <button
      type="button"
      onClick={onToggle}
      className={clsx(
        'group relative flex flex-col rounded-xl overflow-hidden text-left transition-all duration-200',
        'bg-[#f6f8fb] dark:bg-[#1c2333]',
        'ring-1 ring-[#e1e6ee] dark:ring-[#262e3d]',
        'hover:ring-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#348bc9]',
        !active && 'opacity-50',
      )}
    >
      {/* top stripe */}
      <div className="h-[3px] w-full" style={{ backgroundColor: dim.color }} />

      <div className="flex flex-col gap-2 p-3">
        {/* icon + label */}
        <div className="flex items-center gap-1.5">
          <span style={{ color: dim.color }}>{dim.icon}</span>
          <span className="text-xs font-medium text-[#3a4456] dark:text-[#cbd3df] leading-tight">
            {dim.label}
          </span>
        </div>

        {/* big score */}
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold leading-none text-[#161c28] dark:text-white tabular-nums">
            {active ? dim.pts : 0}
          </span>
          <span className="text-xs text-[#6c798e] dark:text-[#6c798e]">
            / {dim.max} pts
          </span>
        </div>

        {/* fill bar */}
        <div className="h-1.5 w-full rounded-full bg-[#e1e6ee] dark:bg-[#262e3d] overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: dim.color }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          />
        </div>

        {/* source note */}
        <p className="text-[10px] leading-snug text-[#6c798e] dark:text-[#6c798e]">
          {dim.source}
        </p>
      </div>
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProposalSummary() {
  const reduced = useReducedMotion() ?? false

  const pipelineRef = useRef<HTMLDivElement>(null)
  const pipelineInView = useInView(pipelineRef, { once: true, margin: '-60px' })

  // which dimensions are "active" (done)
  const [active, setActive] = useState<Record<string, boolean>>({
    pain: true,
    data: true,
    maintain: true,
    deploy: true,
  })

  const dimensions: ScoreDimension[] = [
    {
      id: 'pain',
      label: '解決真實痛點',
      icon: <Target size={14} />,
      pts: 35,
      max: 40,
      color: '#e37b24',
      bgClass: '',
      source: '課前痛點 + S1 + 專案週',
    },
    {
      id: 'data',
      label: '資料串接完整度',
      icon: <Plug size={14} />,
      pts: 25,
      max: 25,
      color: '#348bc9',
      bgClass: '',
      source: 'Session 2 串雲端',
    },
    {
      id: 'maintain',
      label: '可維護',
      icon: <Wrench size={14} />,
      pts: 15,
      max: 15,
      color: '#6c798e',
      bgClass: '',
      source: 'S4 文件 + SOP + 部署',
    },
    {
      id: 'deploy',
      label: '可上架',
      icon: <CloudUpload size={14} />,
      pts: 20,
      max: 20,
      color: '#1b4f9c',
      bgClass: '',
      source: 'S4 Pages + Auth',
    },
  ]

  const totalScore = dimensions.reduce(
    (sum, d) => sum + (active[d.id] ? d.pts : 0),
    0,
  )
  const passed = totalScore >= THRESHOLD
  const gap = THRESHOLD - totalScore

  const barPct = Math.min((totalScore / 100) * 100, 100)
  const thresholdPct = THRESHOLD

  return (
    <div className="not-prose space-y-4 max-w-2xl mx-auto font-sans">

      {/* ① 輸入標籤 */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-full px-3 py-1 bg-[#eef4fb] dark:bg-[#163f7d]/50 ring-1 ring-[#d6e4f5] dark:ring-[#1b4f9c]">
          <ListChecks size={13} className="text-[#1b4f9c] dark:text-[#7ba6da]" />
          <span className="text-xs font-medium text-[#1b4f9c] dark:text-[#7ba6da]">
            輸入：行政同仁的日常痛點
          </span>
        </div>
        <ChevronRight size={14} className="text-[#9aa6b8]" />
      </div>

      {/* ② 流程管線 */}
      <div ref={pipelineRef} className="flex items-stretch gap-1.5">
        {PIPELINE_STAGES.map((stage, i) => (
          <div key={stage.label} className="flex items-center gap-1.5 flex-1 min-w-0">
            {(pipelineInView || reduced) && (
              <StageCard stage={stage} index={i} reduced={reduced} />
            )}
            {i < PIPELINE_STAGES.length - 1 && (
              <ChevronRight
                size={14}
                className="text-[#9aa6b8] dark:text-[#4f5b6e] flex-shrink-0"
              />
            )}
          </div>
        ))}
      </div>

      {/* ③ 評分試算器 */}
      <div className="rounded-xl bg-[#f6f8fb] dark:bg-[#1c2333] ring-1 ring-[#e1e6ee] dark:ring-[#262e3d] p-4 space-y-4">

        {/* header row: big score + status pill */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-1.5">
            <motion.span
              key={totalScore}
              initial={reduced ? false : { scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="text-4xl font-bold tabular-nums text-[#161c28] dark:text-white leading-none"
            >
              {totalScore}
            </motion.span>
            <span className="text-sm text-[#6c798e]">/ 100</span>
          </div>

          {/* status pill */}
          <div
            className={clsx(
              'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
              passed
                ? 'bg-[#e7f6ee] text-[#2e9e6b] dark:bg-[#2e9e6b]/20 dark:text-[#4abe8a]'
                : 'bg-[#fcf3da] text-[#e3a008] dark:bg-[#e3a008]/20 dark:text-[#f5c842]',
            )}
          >
            <Trophy size={12} />
            {passed ? '達標 · 完成獎' : `未達標 · 差 ${gap} 分`}
          </div>
        </div>

        {/* progress bar with threshold marker */}
        <div className="relative">
          <div className="h-3 w-full rounded-full bg-[#e1e6ee] dark:bg-[#262e3d] overflow-visible">
            <motion.div
              className="h-full rounded-full transition-colors duration-300"
              style={{ backgroundColor: passed ? '#2e9e6b' : '#e3a008' }}
              animate={{ width: `${barPct}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>

          {/* threshold marker */}
          <div
            className="absolute top-0 bottom-0 flex flex-col items-center"
            style={{ left: `${thresholdPct}%`, transform: 'translateX(-50%)' }}
          >
            <div className="w-0.5 h-3 bg-[#3a4456] dark:bg-[#9aa6b8]" />
            <span className="mt-1 text-[10px] font-medium text-[#3a4456] dark:text-[#9aa6b8] whitespace-nowrap">
              {THRESHOLD} 達標門檻
            </span>
          </div>
        </div>

        {/* dimension cards grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {dimensions.map((dim) => (
            <DimensionCard
              key={dim.id}
              dim={dim}
              active={active[dim.id]}
              onToggle={() =>
                setActive((prev) => ({ ...prev, [dim.id]: !prev[dim.id] }))
              }
            />
          ))}
        </div>

        <p className="text-[10px] text-[#6c798e] dark:text-[#6c798e] text-center">
          點擊任一面向切換已做 / 未做，查看總分變化
        </p>
      </div>

      {/* ④ 產出 banner */}
      <div className="rounded-xl px-4 py-4 flex items-start gap-3"
        style={{ backgroundColor: '#1b4f9c' }}>
        <Trophy size={22} className="flex-shrink-0 mt-0.5" style={{ color: '#ed9b26' }} />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#ffffff' }}>
            輸出
          </p>
          <p className="text-sm font-medium leading-snug" style={{ color: '#ffffff' }}>
            公司 AI 轉型的具體成果 &mdash; 可對外展示的實績 + 上架 Portal、可長期重用的內部資產
          </p>
        </div>
      </div>

    </div>
  )
}
