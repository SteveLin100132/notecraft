import { useMemo, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import {
  TriangleAlert,
  HelpCircle,
  CircleSlash,
  FileWarning,
  Activity,
  Check,
  RotateCcw,
  ChevronRight,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import clsx from 'clsx'

/**
 * 「故障開關 × 還剩下什麼」面板。
 * 核心洞察：降級不是壞掉，是退到下一層仍然交得出東西的結果——
 * 最壞也只是一句誠實的「超出範圍」，且每一次退讓都在 Langfuse 留下痕跡。
 */

type FallbackKey = 'classifyTimeout' | 'lowConfidence' | 'noHit' | 'reportFailure'

interface FallbackDef {
  key: FallbackKey
  icon: LucideIcon
  label: string
  behavior: string
  traceReason: string
}

const FALLBACKS: FallbackDef[] = [
  {
    key: 'classifyTimeout',
    icon: TriangleAlert,
    label: '分類模型逾時／schema 驗證失敗',
    behavior: '退回純反查',
    traceReason: '分類逾時或 schema 驗證失敗，改走條文反查',
  },
  {
    key: 'lowConfidence',
    icon: HelpCircle,
    label: '信心低於門檻',
    behavior: '列 2–3 個候選待確認',
    traceReason: '信心分數低於門檻，改列候選待使用者確認',
  },
  {
    key: 'noHit',
    icon: CircleSlash,
    label: '完全無命中',
    behavior: '走「超出範圍」出口',
    traceReason: '向量檢索無命中，標記為未覆蓋問題',
  },
  {
    key: 'reportFailure',
    icon: FileWarning,
    label: '報告模型失敗',
    behavior: '退回結構化 JSON',
    traceReason: '報告模型逾時，回傳結構化 JSON 佔位',
  },
]

const FALLBACK_MAP: Record<FallbackKey, FallbackDef> = FALLBACKS.reduce(
  (acc, def) => {
    acc[def.key] = def
    return acc
  },
  {} as Record<FallbackKey, FallbackDef>,
)

/** 嚴重度由輕到重；同時啟用多個開關時，最後一個命中的即為最嚴重者 */
const SEVERITY_ORDER: FallbackKey[] = [
  'reportFailure',
  'classifyTimeout',
  'lowConfidence',
  'noHit',
]

const INITIAL_ACTIVE: Record<FallbackKey, boolean> = {
  classifyTimeout: false,
  lowConfidence: false,
  noHit: false,
  reportFailure: false,
}

/** 固定時間戳，避免 SSR／hydration 因 Date.now() 產生落差 */
const TRACE_TIMES = ['12:04:33', '12:04:37', '12:04:41', '12:04:45']

function worstOf(active: Record<FallbackKey, boolean>): FallbackKey | null {
  let worst: FallbackKey | null = null
  for (const key of SEVERITY_ORDER) {
    if (active[key]) worst = key
  }
  return worst
}

const STATUTES = ['第38條', '第39條', '第23條', '第79條']
const CANDIDATES = [
  'B5-02 特別休假管理',
  'B5-03 假日出勤與工資加倍管理',
  'D5-05 一般罰鍰與準用罰則',
]

// ── 故障開關 ──────────────────────────────────────────────

interface FaultToggleProps {
  def: FallbackDef
  checked: boolean
  onToggle: () => void
}

function FaultToggle({ def, checked, onToggle }: FaultToggleProps) {
  const Icon = def.icon
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[var(--border-subtle)] py-3 last:border-b-0">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <Icon
            size={14}
            className={clsx(
              'shrink-0',
              checked ? 'text-[var(--warning-500)]' : 'text-[var(--neutral-400)]',
            )}
          />
          <span className="text-sm font-medium text-[var(--text-strong)]">
            {def.label}
          </span>
        </div>
        <div className="mt-0.5 pl-[20px] text-xs text-[var(--text-muted)]">
          → {def.behavior}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={def.label}
        onClick={onToggle}
        className={clsx(
          'relative inline-flex h-[26px] w-[46px] shrink-0 items-center rounded-[var(--radius-pill)] p-[3px] transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2',
          checked ? 'bg-[var(--warning-500)]' : 'bg-[var(--neutral-300)]',
        )}
      >
        <motion.span
          className="block h-5 w-5 rounded-full bg-[var(--neutral-0)] shadow-[var(--shadow-sm)]"
          animate={{ x: checked ? 20 : 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        />
      </button>
    </div>
  )
}

// ── 卡片內容切片（原地換成虛線占位框用） ──────────────────

function CardSlot({
  variantKey,
  children,
}: {
  variantKey: string
  children: React.ReactNode
}) {
  const reduced = useReducedMotion()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={variantKey}
        initial={{ opacity: 0, y: reduced ? 0 : 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: reduced ? 0 : -4 }}
        transition={{ duration: reduced ? 0 : 0.25, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

function StatuteCard() {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--neutral-300)] bg-[var(--neutral-0)] p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--text-muted)]">
          條文清單
        </span>
        <span className="rounded-[var(--radius-pill)] bg-[var(--neutral-100)] px-2 py-0.5 text-[11px] font-medium text-[var(--neutral-600)]">
          Top-K 5
        </span>
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {STATUTES.map((s) => (
          <li
            key={s}
            className="rounded-[var(--radius-sm)] bg-[var(--blue-50)] px-2.5 py-1 text-xs font-medium text-[var(--blue-700)]"
          >
            {s}
          </li>
        ))}
      </ul>
    </div>
  )
}

type ClassificationVariant = 'normal' | 'tagged' | 'candidates'

function ClassificationCard({ variant }: { variant: ClassificationVariant }) {
  if (variant === 'candidates') {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--neutral-300)] bg-[var(--neutral-0)] p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-[var(--text-muted)]">
            L1 ~ L3 分類 · 候選
          </span>
          <span className="flex items-center gap-1 rounded-[var(--radius-pill)] bg-[var(--warning-50)] px-2 py-0.5 text-[11px] font-medium text-[var(--neutral-800)]">
            <HelpCircle size={11} />
            待使用者確認
          </span>
        </div>
        <ul className="space-y-1.5">
          {CANDIDATES.map((c) => (
            <li
              key={c}
              className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--neutral-200)] px-2.5 py-1.5 text-sm text-[var(--text-body)]"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--warning-500)]" />
              {c}
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--neutral-300)] bg-[var(--neutral-0)] p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--text-muted)]">
          L1 ~ L3 分類
        </span>
        {variant === 'tagged' && (
          <span className="flex items-center gap-1 rounded-[var(--radius-pill)] bg-[var(--warning-50)] px-2 py-0.5 text-[11px] font-medium text-[var(--neutral-800)]">
            <TriangleAlert size={11} />
            未經語意分類
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1 text-sm font-medium text-[var(--text-strong)]">
        <span>B · 蜜蜂</span>
        <ChevronRight size={14} className="text-[var(--neutral-400)]" />
        <span>B5</span>
        <ChevronRight size={14} className="text-[var(--neutral-400)]" />
        <span className="text-[var(--blue-700)]">B5-02（特別休假管理）</span>
      </div>
      {variant === 'tagged' && (
        <p className="mt-1.5 text-xs text-[var(--text-muted)]">
          由檢索到的條文反查得到，非模型語意分類。
        </p>
      )}
    </div>
  )
}

type ReportVariant = 'normal' | 'timeout' | 'pending'

function ReportCard({ variant }: { variant: ReportVariant }) {
  if (variant === 'timeout' || variant === 'pending') {
    const text =
      variant === 'timeout'
        ? '報告未生成：模型逾時。條文與分類仍可用，已回傳結構化 JSON。'
        : '等待題型確認後才生成。'
    return (
      <div className="flex items-start gap-2.5 rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--warning-500)] bg-[var(--warning-50)] p-4">
        <TriangleAlert
          size={16}
          className="mt-0.5 shrink-0 text-[var(--warning-500)]"
        />
        <p className="text-sm leading-relaxed text-[var(--neutral-800)]">
          {text}
        </p>
      </div>
    )
  }
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--neutral-300)] bg-[var(--neutral-0)] p-4">
      <div className="mb-2 text-xs font-medium text-[var(--text-muted)]">
        風險分析報告
      </div>
      <p className="text-sm leading-relaxed text-[var(--text-body)]">
        本案涉及特別休假排定與未休折現，雇主應留意排定程序是否符合勞基法規定，並就未休畢日數依約定工資核實折算發給，以免遭主管機關認定違法。
      </p>
    </div>
  )
}

function RightColumn({ worst }: { worst: FallbackKey | null }) {
  const reduced = useReducedMotion()
  const collapsed = worst === 'noHit'

  const classificationVariant: ClassificationVariant =
    worst === 'lowConfidence'
      ? 'candidates'
      : worst === 'classifyTimeout'
        ? 'tagged'
        : 'normal'
  const reportVariant: ReportVariant =
    worst === 'reportFailure'
      ? 'timeout'
      : worst === 'lowConfidence'
        ? 'pending'
        : 'normal'

  return (
    <AnimatePresence mode="wait" initial={false}>
      {collapsed ? (
        <motion.div
          key="collapsed"
          initial={{ opacity: 0, y: reduced ? 0 : 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduced ? 0 : -4 }}
          transition={{ duration: reduced ? 0 : 0.25, ease: 'easeOut' }}
          className="flex items-start gap-2.5 rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--neutral-400)] bg-[var(--neutral-50)] p-5"
        >
          <CircleSlash
            size={18}
            className="mt-0.5 shrink-0 text-[var(--neutral-500)]"
          />
          <p className="text-sm leading-relaxed text-[var(--text-body)]">
            這個問題超出勞基法 L1~L3 的涵蓋範圍。已記錄為未覆蓋問題，不強制歸類。
          </p>
        </motion.div>
      ) : (
        <motion.div
          key="expanded"
          initial={{ opacity: 0, y: reduced ? 0 : 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduced ? 0 : -4 }}
          transition={{ duration: reduced ? 0 : 0.25, ease: 'easeOut' }}
          className="space-y-3"
        >
          <StatuteCard />
          <CardSlot variantKey={`classification-${classificationVariant}`}>
            <ClassificationCard variant={classificationVariant} />
          </CardSlot>
          <CardSlot variantKey={`report-${reportVariant}`}>
            <ReportCard variant={reportVariant} />
          </CardSlot>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Langfuse trace 條 ─────────────────────────────────────

interface TraceRow {
  key: FallbackKey
  time: string
  detail: string
}

function TraceBar({ rows }: { rows: TraceRow[] }) {
  const reduced = useReducedMotion()
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--neutral-300)] bg-[var(--neutral-0)]">
      <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--neutral-50)] px-4 py-2.5">
        <Activity size={14} className="text-[var(--blue-700)]" />
        <span className="text-xs font-semibold tracking-wide text-[var(--text-strong)]">
          Langfuse Trace
        </span>
      </div>
      <ul className="divide-y divide-[var(--border-subtle)]">
        <li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-xs">
          <span className="font-mono text-[var(--text-muted)]">12:04:31</span>
          <Check size={13} className="shrink-0 text-[var(--success-500)]" />
          <span className="font-medium text-[var(--text-strong)]">
            report.generate
          </span>
          <span className="text-[var(--text-muted)]">
            1,842 tokens ／ 2.1s
          </span>
          <span className="ml-auto rounded-[var(--radius-pill)] bg-[var(--success-50)] px-2 py-0.5 font-medium text-[var(--neutral-800)]">
            ok
          </span>
        </li>
        <AnimatePresence initial={false}>
          {rows.map((row) => (
            <motion.li
              key={row.key}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: reduced ? 0 : 0.25, ease: 'easeOut' }}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 overflow-hidden px-4 py-2.5 text-xs"
            >
              <span className="font-mono text-[var(--text-muted)]">
                {row.time}
              </span>
              <TriangleAlert
                size={13}
                className="shrink-0 text-[var(--warning-500)]"
              />
              <span className="font-medium text-[var(--text-strong)]">
                fallback.emit
              </span>
              <span className="text-[var(--text-muted)]">
                降級原因：{row.detail}
              </span>
              <span className="ml-auto rounded-[var(--radius-pill)] bg-[var(--warning-50)] px-2 py-0.5 font-medium text-[var(--neutral-800)]">
                degraded
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  )
}

// ── 主元件 ────────────────────────────────────────────────

export default function FallbackDegradationSwitchboard() {
  const [active, setActive] =
    useState<Record<FallbackKey, boolean>>(INITIAL_ACTIVE)
  const [order, setOrder] = useState<FallbackKey[]>([])

  const toggle = (key: FallbackKey) => {
    const turningOn = !active[key]
    setActive((prev) => ({ ...prev, [key]: turningOn }))
    setOrder((prev) =>
      turningOn ? [...prev, key] : prev.filter((k) => k !== key),
    )
  }

  const resetAll = () => {
    setActive(INITIAL_ACTIVE)
    setOrder([])
  }

  const worst = useMemo(() => worstOf(active), [active])

  const traceRows: TraceRow[] = useMemo(
    () =>
      order.map((key, i) => ({
        key,
        time: TRACE_TIMES[i] ?? TRACE_TIMES[TRACE_TIMES.length - 1],
        detail: FALLBACK_MAP[key].traceReason,
      })),
    [order],
  )

  const anyActive = order.length > 0

  return (
    <div className="not-prose mx-auto max-w-4xl space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        {/* 左欄：故障開關 */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--neutral-300)] bg-[var(--neutral-0)] p-4">
          <div className="mb-1 flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-[var(--text-strong)]">
              故障開關
            </h4>
            <button
              type="button"
              onClick={resetAll}
              disabled={!anyActive}
              className={clsx(
                'inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius-pill)] px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2',
                anyActive
                  ? 'bg-[var(--neutral-100)] text-[var(--neutral-700)] hover:bg-[var(--neutral-200)]'
                  : 'cursor-not-allowed bg-[var(--neutral-50)] text-[var(--neutral-400)]',
              )}
            >
              <RotateCcw size={13} />
              全部復原
            </button>
          </div>
          <div>
            {FALLBACKS.map((def) => (
              <FaultToggle
                key={def.key}
                def={def}
                checked={active[def.key]}
                onToggle={() => toggle(def.key)}
              />
            ))}
          </div>
        </div>

        {/* 右欄：使用者實際看到 */}
        <div>
          <h4 className="mb-2 text-sm font-semibold text-[var(--text-strong)]">
            使用者實際看到
          </h4>
          <RightColumn worst={worst} />
        </div>
      </div>

      {/* 底部：Langfuse trace */}
      <TraceBar rows={traceRows} />
    </div>
  )
}
