import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import {
  ArrowUp,
  ArrowDown,
  X,
  CircleDot,
  Snowflake,
  TriangleAlert,
  Check,
  ChevronDown,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import clsx from 'clsx'

/**
 * L1~L10 範圍階梯。
 * 核心洞察：原設計是 L1 一路往下收斂到 L10；這一版把箭頭倒過來——
 * 從 L6 條文檢索起跳，往回反查出 L1–L3，L4／L5 整段抽掉，
 * L7／L8 因此永遠停在初始值，L9 用暫代 prompt 頂著，L10 斷線。
 */

type Mode = 'original' | 'poc'

/** done 完整｜frozen 有值但凍結｜stopgap 暫代｜skipped 規格未到 */
type Status = 'done' | 'frozen' | 'stopgap' | 'skipped'

/** 這一版的軌道方向：起點、往上反查、往下、斷線 */
type Flow = 'start' | 'up' | 'down' | 'cut'

interface Level {
  id: string
  title: string
  subtitle: string
  /** 原設計模式下改用的副標；省略時沿用 subtitle */
  subtitleOriginal?: string
  status: Status
  flow: Flow
  /** 這一版狀態徽章上的字 */
  badge: string
  /** 卡片上那一行說明（這一版） */
  pocNote: string
  /** 原設計模式下那一行說明 */
  originalNote: string
  /** 展開後的細節 */
  detailOriginal: string
  detailPoc: string
  /** 軌道旁的強調註記，只在這一版顯示 */
  railNote?: string
}

const LEVELS: Level[] = [
  {
    id: 'L1',
    title: '四大類',
    subtitle: '獵犬 · 蜜蜂 · 大象 · 貓頭鷹',
    status: 'done',
    flow: 'up',
    badge: '反查',
    pocNote: '由 L6 條文回推總表，不經模型',
    originalNote: 'LLM 分類 ＋ structured output',
    detailOriginal: '由模型讀問句判斷四大類，以 structured output 回傳。',
    detailPoc:
      '取 decision_tree 的 l1_code（A/B/C/D）與 l1_animal、l1_scope，直接由檢索到的條文 l1_codes 反查得到。',
  },
  {
    id: 'L2',
    title: '22 個主題',
    subtitle: 'l2_code ／ l2_name',
    status: 'done',
    flow: 'up',
    badge: '反查',
    pocNote: '同一次反查的副產物',
    originalNote: 'LLM 分類 ＋ structured output',
    detailOriginal: '在 L1 之下再由模型收斂到主題。',
    detailPoc: '條文的 l2_codes 是多值陣列，反查總表即得，沒有額外一次模型呼叫。',
  },
  {
    id: 'L3',
    title: '85 個題型',
    subtitle: 'l3_code ／ enterprise_tone',
    status: 'done',
    flow: 'up',
    badge: '反查',
    pocNote: '分類到此為止，這一版的終點',
    originalNote: 'LLM 分類 ＋ structured output',
    detailOriginal: '模型判定題型，信心不足時列候選。',
    detailPoc:
      '主鍵 l3_code，85 列。條文表的 l3_codes 建了 GIN 索引，「總表整合」那一步就是拿它比對。enterprise_tone 那 85 句同時是天然的評測 query。',
    railNote: '分類是檢索的副產物，不需要 LLM',
  },
  {
    id: 'L4',
    title: '必要事實清單',
    subtitle: '每個題型要問到哪些事實',
    status: 'skipped',
    flow: 'cut',
    badge: '規格未到',
    pocNote: '不做，也不用暫代邏輯頂',
    originalNote: '每個 L3 題型掛一組必要事實',
    detailOriginal: '每個 L3 題型掛一組必要事實，缺漏的進報告的「缺漏事實」章節。',
    detailPoc: '顧問師規格未交付。刻意不自己補一版，避免規格到位後要拆。',
  },
  {
    id: 'L5',
    title: '追問問題',
    subtitle: '單選，選項加減地雷',
    status: 'skipped',
    flow: 'cut',
    badge: '規格未到',
    pocNote: 'L7／L8 凍結的直接原因',
    originalNote: '回答結果決定地雷加減',
    detailOriginal: '依回答加減地雷數，風險隨作答浮動。',
    detailPoc:
      '不做。它沒做，就是下面 L7／L8 只能停在初始值的原因——不是漏了，是被卡住。',
  },
  {
    id: 'L6',
    title: '對應勞基法條文',
    subtitle: '向量檢索 Top-K = 5',
    subtitleOriginal: '分類完成後才對照條文',
    status: 'done',
    flow: 'start',
    badge: '起點',
    pocNote: '整條路徑唯一的模型就在這裡',
    originalNote: '向量檢索 ＋ rerank',
    detailOriginal: 'L1–L3 分類完成後，再對照該題型的 L6 條文；rerank 排在檢索之後。',
    detailPoc:
      'mistral-embed（1024 維）、HNSW ＋ cosine，Top-K 先設 5，rerank 延後。它從「分類的下游」變成「整條路徑的入口」。',
    railNote: '唯一的起點：向量檢索 Top-K = 5',
  },
  {
    id: 'L7',
    title: '地雷數',
    subtitle: 'initial_mines 1–5',
    status: 'frozen',
    flow: 'down',
    badge: '凍結',
    pocNote: '拿得到值，但值不會動',
    originalNote: '初始值 ＋ L5 加減後的實際值',
    detailOriginal: '初始值加上 L5 追問的加減，得到本案實際地雷數。',
    detailPoc:
      'initial_mines ＝ 頻率分（低 1／中 2／高 3）＋ 風險分（低 0／中 1／高 2），85 列零例外，由 CHECK 守著。實際值要等 L5 追問加減後才算得出來，所以這一版只拿得到靜態初始值。',
  },
  {
    id: 'L8',
    title: '顧問介入程度',
    subtitle: 'initial_intervention',
    status: 'frozen',
    flow: 'down',
    badge: '凍結',
    pocNote: '跟著 L7 走，所以也不會動',
    originalNote: '由實際地雷數換算低／中／高／急迫',
    detailOriginal: '由實際地雷數換算低／中／高／急迫。',
    detailPoc:
      '門檻是 1 顆低、2–3 顆中、4 顆高、5 顆以上急迫，同樣有 CHECK 守著。輸入是凍結的 L7，輸出自然也是凍結的。',
  },
  {
    id: 'L9',
    title: '白話檢測報告',
    subtitle: '自撰 prompt ＋ Codex 5.6 Luna',
    subtitleOriginal: '依規格模板的受控報告',
    status: 'stopgap',
    flow: 'down',
    badge: '暫代',
    pocNote: '規格到位後整段換掉',
    originalNote: 'L9 受控報告（依規格模板）',
    detailOriginal: '依規格模板產出受控報告，欄位與章節由 L4–L8 的結果餵入。',
    detailPoc:
      '固定七章節（問題摘要／命中題型／涉及條文／風險等級與地雷數／缺漏事實／建議下一步／顧問介入程度）。這是規格未到前的出口，不是 L9——規格到位後整段換掉，不要在上面疊功能。',
    railNote: 'L4~L8 規格未到，先以自撰 prompt 暫代',
  },
  {
    id: 'L10',
    title: '顧問推薦',
    subtitle: '轉介哪位顧問師',
    status: 'skipped',
    flow: 'cut',
    badge: '規格未到',
    pocNote: '不做',
    originalNote: '依題型與介入程度推薦顧問師',
    detailOriginal: '依題型與介入程度推薦顧問師，並記錄轉介。',
    detailPoc: '不做。使用者確認與顧問轉介的紀錄欄位也一併待補。',
  },
]

/** 這一版的進場順序：L6 起跳 → 往上掃 L3/L2/L1 → L4/L5 → L7/L8/L9 → L10 */
const POC_ORDER = ['L6', 'L3', 'L2', 'L1', 'L4', 'L5', 'L7', 'L8', 'L9', 'L10']

function revealDelay(mode: Mode, id: string): number {
  if (mode === 'original') {
    const i = LEVELS.findIndex((l) => l.id === id)
    return i * 0.09
  }
  return POC_ORDER.indexOf(id) * 0.11
}

// ── 狀態樣式 ────────────────────────────────────────────

const CARD_STYLE: Record<Status, string> = {
  done: 'border-[var(--blue-300)] bg-[var(--neutral-0)]',
  frozen: 'border-[var(--neutral-300)] bg-[var(--neutral-0)]',
  stopgap: 'border-[var(--warning-500)] bg-[var(--warning-50)]',
  skipped: 'border-dashed border-[var(--neutral-300)] bg-transparent',
}

const BADGE_STYLE: Record<Status, string> = {
  done: 'bg-[var(--blue-50)] text-[var(--blue-700)]',
  frozen: 'bg-[var(--neutral-100)] text-[var(--neutral-600)]',
  stopgap: 'bg-[var(--warning-500)]/15 text-[var(--neutral-800)]',
  skipped: 'bg-[var(--neutral-100)] text-[var(--neutral-500)]',
}

const BADGE_ICON: Record<Status, LucideIcon> = {
  done: Check,
  frozen: Snowflake,
  stopgap: TriangleAlert,
  skipped: X,
}

const FLOW_ICON: Record<Flow, LucideIcon> = {
  start: CircleDot,
  up: ArrowUp,
  down: ArrowDown,
  cut: X,
}

// ── 軌道 ────────────────────────────────────────────────

function Rail({
  mode,
  flow,
  isFirst,
  isLast,
}: {
  mode: Mode
  flow: Flow
  isFirst: boolean
  isLast: boolean
}) {
  const effectiveFlow: Flow = mode === 'original' ? 'down' : flow
  const Icon = FLOW_ICON[effectiveFlow]

  const muted = effectiveFlow === 'cut'
  const lineClass = muted
    ? 'border-dashed border-[var(--neutral-300)]'
    : 'border-[var(--blue-300)]'

  const nodeClass = muted
    ? 'border-dashed border-[var(--neutral-300)] bg-[var(--surface-page)] text-[var(--neutral-400)]'
    : effectiveFlow === 'start'
      ? 'border-[var(--blue-600)] bg-[var(--blue-600)] text-[var(--text-on-brand)]'
      : 'border-[var(--blue-300)] bg-[var(--neutral-0)] text-[var(--blue-600)]'

  return (
    <div className="relative flex w-9 justify-center" aria-hidden="true">
      <span
        className={clsx(
          'absolute left-1/2 w-0 -translate-x-1/2 border-l',
          lineClass,
          isFirst ? 'top-6' : 'top-0',
          isLast ? 'h-6' : 'bottom-0',
        )}
      />
      <span
        className={clsx(
          'relative z-10 mt-3 flex h-6 w-6 items-center justify-center rounded-full border',
          nodeClass,
        )}
      >
        <Icon size={13} strokeWidth={2.25} />
      </span>
    </div>
  )
}

// ── L7 的凍結地雷格 ─────────────────────────────────────

function MineMeter() {
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="h-3.5 w-3.5 rounded-[var(--radius-xs)] bg-[var(--blue-600)]"
          />
        ))}
        <span className="h-3.5 w-3.5 rounded-[var(--radius-xs)] border border-dashed border-[var(--neutral-400)]" />
      </span>
      <span className="text-[11px] text-[var(--text-muted)]">
        initial_mines ＝ 4；第 5 格要 L5 追問才會動
      </span>
    </div>
  )
}

// ── 單列 ────────────────────────────────────────────────

function LevelRow({
  level,
  mode,
  isFirst,
  isLast,
  expanded,
  onToggle,
}: {
  level: Level
  mode: Mode
  isFirst: boolean
  isLast: boolean
  expanded: boolean
  onToggle: () => void
}) {
  const reduced = useReducedMotion()
  const isPoc = mode === 'poc'
  const status: Status = isPoc ? level.status : 'done'
  const BadgeIcon = BADGE_ICON[status]

  return (
    <motion.li
      key={`${mode}-${level.id}`}
      initial={{ opacity: 0, x: reduced ? 0 : isPoc && level.flow === 'up' ? 8 : -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: reduced ? 0 : 0.3,
        ease: 'easeOut',
        delay: reduced ? 0 : revealDelay(mode, level.id),
      }}
      className="flex gap-3"
    >
      <Rail mode={mode} flow={level.flow} isFirst={isFirst} isLast={isLast} />

      <div className="min-w-0 flex-1 pb-2.5">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className={clsx(
            'w-full rounded-[var(--radius-lg)] border px-3.5 py-2.5 text-left transition-colors',
            'hover:border-[var(--blue-500)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]',
            isPoc ? CARD_STYLE[status] : CARD_STYLE.done,
          )}
        >
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span
              className={clsx(
                'shrink-0 rounded-[var(--radius-sm)] px-1.5 py-0.5 font-mono text-xs font-semibold',
                status === 'skipped'
                  ? 'bg-[var(--neutral-100)] text-[var(--neutral-500)]'
                  : 'bg-[var(--blue-50)] text-[var(--blue-700)]',
              )}
            >
              {level.id}
            </span>
            <span
              className={clsx(
                'text-sm font-semibold',
                status === 'skipped'
                  ? 'text-[var(--neutral-500)]'
                  : 'text-[var(--text-strong)]',
              )}
            >
              {level.title}
            </span>
            <span className="truncate text-xs text-[var(--text-muted)]">
              {isPoc ? level.subtitle : (level.subtitleOriginal ?? level.subtitle)}
            </span>

            <span className="ml-auto flex shrink-0 items-center gap-1.5">
              {isPoc && (
                <span
                  className={clsx(
                    'flex items-center gap-1 rounded-[var(--radius-pill)] px-2 py-0.5 text-[11px] font-medium',
                    BADGE_STYLE[status],
                  )}
                >
                  <BadgeIcon size={11} />
                  {level.badge}
                </span>
              )}
              <ChevronDown
                size={14}
                className={clsx(
                  'text-[var(--neutral-400)] transition-transform',
                  expanded && 'rotate-180',
                )}
              />
            </span>
          </div>

          <p
            className={clsx(
              'mt-1 text-xs',
              status === 'stopgap'
                ? 'text-[var(--neutral-800)]'
                : status === 'skipped'
                  ? 'text-[var(--neutral-500)]'
                  : 'text-[var(--text-body)]',
            )}
          >
            {isPoc ? level.pocNote : level.originalNote}
          </p>

          {isPoc && level.id === 'L7' && <MineMeter />}

          {isPoc && level.id === 'L8' && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className="rounded-[var(--radius-sm)] bg-[var(--neutral-100)] px-2 py-0.5 text-xs font-semibold text-[var(--neutral-700)]">
                高
              </span>
              <span className="rounded-[var(--radius-sm)] border border-dashed border-[var(--neutral-400)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]">
                低 ／ 中 ／ 急迫：要 L5 才走得到
              </span>
            </div>
          )}

          {expanded && (
            <motion.div
              initial={{ opacity: 0, y: reduced ? 0 : -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduced ? 0 : 0.22, ease: 'easeOut' }}
            >
              <dl className="mt-2.5 space-y-1.5 border-t border-[var(--border-subtle)] pt-2.5">
                <div className="flex gap-2">
                  <dt className="w-14 shrink-0 text-[11px] font-medium text-[var(--text-muted)]">
                    原設計
                  </dt>
                  <dd className="text-xs leading-relaxed text-[var(--text-muted)]">
                    {level.detailOriginal}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-14 shrink-0 text-[11px] font-medium text-[var(--text-brand)]">
                    這一版
                  </dt>
                  <dd className="text-xs leading-relaxed text-[var(--text-body)]">
                    {level.detailPoc}
                  </dd>
                </div>
              </dl>
            </motion.div>
          )}
        </button>

        {isPoc && level.railNote && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: reduced ? 0 : 0.3,
              ease: 'easeOut',
              delay: reduced ? 0 : revealDelay(mode, level.id) + 0.2,
            }}
            className="mt-1.5 flex items-center gap-1.5 pl-1 text-[11px] font-medium text-[var(--text-brand)]"
          >
            <span className="h-px w-4 bg-[var(--blue-300)]" />
            {level.railNote}
          </motion.p>
        )}
      </div>
    </motion.li>
  )
}

// ── 涵蓋率摘要 ──────────────────────────────────────────

interface Segment {
  label: string
  count: number
  className: string
}

const POC_SEGMENTS: Segment[] = [
  { label: '完整', count: 4, className: 'bg-[var(--blue-600)]' },
  { label: '凍結 ／ 暫代', count: 3, className: 'bg-[var(--warning-500)]' },
  { label: '不做', count: 3, className: 'bg-[var(--neutral-300)]' },
]

const ORIGINAL_SEGMENTS: Segment[] = [
  { label: '全做', count: 10, className: 'bg-[var(--blue-600)]' },
]

function CoverageBar({ mode }: { mode: Mode }) {
  const reduced = useReducedMotion()
  const segments = mode === 'poc' ? POC_SEGMENTS : ORIGINAL_SEGMENTS

  return (
    <div className="rounded-[var(--radius-lg)] bg-[var(--surface-sunken)] px-4 py-3">
      <div className="flex h-2 w-full gap-1 overflow-hidden">
        {segments.map((s) => (
          <motion.span
            key={`${mode}-${s.label}`}
            initial={{ width: 0 }}
            animate={{ width: `${(s.count / 10) * 100}%` }}
            transition={{ duration: reduced ? 0 : 0.45, ease: 'easeOut', delay: reduced ? 0 : 0.2 }}
            className={clsx('h-full rounded-[var(--radius-pill)]', s.className)}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        {segments.map((s) => (
          <span
            key={s.label}
            className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]"
          >
            <span className={clsx('h-2 w-2 rounded-[var(--radius-xs)]', s.className)} />
            {s.label}
            <span className="font-semibold text-[var(--text-strong)]">{s.count}</span>
            <span>層</span>
          </span>
        ))}
      </div>
    </div>
  )
}

// ── 主元件 ──────────────────────────────────────────────

const MODES: { key: Mode; label: string }[] = [
  { key: 'original', label: '原設計 L1 → L10' },
  { key: 'poc', label: '這一版 PoC' },
]

const HEADLINE: Record<Mode, string> = {
  original: '由上而下逐層收斂：問句進 L1 分四大類，一路走到 L10 顧問推薦。',
  poc: '箭頭倒過來：從 L6 起跳反查回 L1–L3，L4／L5 整段抽掉，L7／L8 因此凍結在初始值。',
}

export default function PocScopeL1L10Ladder() {
  const [mode, setMode] = useState<Mode>('poc')
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="not-prose mx-auto w-full max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="切換範圍模式"
          className="inline-flex rounded-[var(--radius-pill)] bg-[var(--surface-sunken)] p-1"
        >
          {MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMode(m.key)}
              aria-pressed={mode === m.key}
              className={clsx(
                'rounded-[var(--radius-pill)] px-3.5 py-1.5 text-xs font-medium transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]',
                mode === m.key
                  ? 'bg-[var(--action-primary)] text-[var(--text-on-brand)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-strong)]',
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        <p className="max-w-md text-xs leading-relaxed text-[var(--text-muted)]">
          {HEADLINE[mode]}
        </p>
      </div>

      <ul className="list-none pl-0">
        {LEVELS.map((level, i) => (
          <LevelRow
            key={level.id}
            level={level}
            mode={mode}
            isFirst={i === 0}
            isLast={i === LEVELS.length - 1}
            expanded={expanded === level.id}
            onToggle={() => setExpanded(expanded === level.id ? null : level.id)}
          />
        ))}
      </ul>

      <CoverageBar mode={mode} />
    </div>
  )
}
