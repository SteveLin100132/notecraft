import { useMemo, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import {
  MessageSquareText,
  Lock,
  Bot,
  Waypoints,
  Search,
  Ruler,
  ArrowUp,
  Ban,
  Snowflake,
  FileText,
  ShieldCheck,
  Pin,
  LayoutList,
  Unplug,
  CircleSlash,
  TriangleAlert,
  RotateCcw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Activity,
  Check,
  Database,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import clsx from 'clsx'

/**
 * 「一次提問的完整路徑」全景地圖：垂直流程 × 縱向泳道。
 *
 * 核心洞察：一次提問走的不是一條線，是一條主幹加六條提早離場的出口。
 * 主幹上真正碰模型的只有三格，其餘全是規則；四道閘門決定它走不走得下去，
 * 四種降級決定它走不到底時還交得出什麼——這是同一件事的兩面。
 * 而這一版的主幹在 L6 還轉了個彎，往回反查 L1–L3。
 *
 * 版面上的三個論證（靠位置本身講，不靠文字）：
 * 1. 模型層獨立成一欄，且只有三格（G1／Embedding／L9）
 * 2. G1 是唯一掉進模型欄的閘門，G0／G2／G3 都留在規則欄
 * 3. 六個出口全部往右掉在同一欄、不同高度——走多深才離場變成可比較的垂直距離
 */

// ── 泳道 ──────────────────────────────────────────────────

type LaneKey = 'ui' | 'rule' | 'model' | 'data'
type ColumnKey = LaneKey | 'exit'

const COLUMN_INDEX: Record<ColumnKey, number> = {
  ui: 0,
  rule: 1,
  model: 2,
  data: 3,
  exit: 4,
}

/**
 * 欄寬不等分：規則層要放最長的節點名，資料層只掛小晶片，出口欄要放得下降級說明。
 * 連接線用百分比座標畫，所以欄寬定義在這裡是唯一事實來源。
 */
const COLUMN_WIDTH: Record<ColumnKey, number> = {
  ui: 16,
  rule: 26,
  model: 20,
  data: 16,
  exit: 22,
}

const COLUMN_ORDER: ColumnKey[] = ['ui', 'rule', 'model', 'data', 'exit']

const GRID_TEMPLATE = COLUMN_ORDER.map((key) => `${COLUMN_WIDTH[key]}%`).join(' ')

const COLUMN_LEFT: Record<ColumnKey, number> = (() => {
  let cursor = 0
  const acc = {} as Record<ColumnKey, number>
  for (const key of COLUMN_ORDER) {
    acc[key] = cursor
    cursor += COLUMN_WIDTH[key]
  }
  return acc
})()

const columnCenter = (key: ColumnKey): number =>
  COLUMN_LEFT[key] + COLUMN_WIDTH[key] / 2
const columnRightEdge = (key: ColumnKey): number =>
  COLUMN_LEFT[key] + COLUMN_WIDTH[key]

const COL_START = [
  'col-start-1',
  'col-start-2',
  'col-start-3',
  'col-start-4',
  'col-start-5',
]

interface LaneDef {
  key: ColumnKey
  title: string
  sub: string
  badge?: string
}

const LANES: LaneDef[] = [
  { key: 'ui', title: '使用者 · UI', sub: 'Vite + React' },
  { key: 'rule', title: '規則層', sub: 'NestJS · 不經模型' },
  { key: 'model', title: '模型層', sub: '碰生成式／embedding', badge: '3 格' },
  { key: 'data', title: '資料層', sub: 'PostgreSQL' },
  { key: 'exit', title: '出口 · 降級', sub: '提早離場' },
]

// ── 主幹節點 ──────────────────────────────────────────────

type StepId =
  | 'ask'
  | 'g0'
  | 'g1'
  | 'embed'
  | 'retrieve'
  | 'g2'
  | 'lookup'
  | 'l45'
  | 'l78'
  | 'l9'
  | 'g3'
  | 'disclaimer'
  | 'respond'
  | 'l10'

type LevelState = 'plain' | 'reverse' | 'frozen' | 'ghost'

interface DataChip {
  title: string
  detail: string
}

interface Step {
  id: StepId
  lane: LaneKey
  icon: LucideIcon
  title: string
  detail?: string
  note?: string
  levels?: string[]
  levelState?: LevelState
  /** true = 這一格碰模型（blue-700 實心底） */
  model?: boolean
  /** true = 掛 Langfuse trace */
  traced?: boolean
  /** 恆為灰虛線的占位節點（規格未到） */
  ghost?: boolean
  dataChip?: DataChip
}

const STEPS: Step[] = [
  {
    id: 'ask',
    lane: 'ui',
    icon: MessageSquareText,
    title: '白話問句',
    detail: '「公司可以不給特休嗎」',
  },
  {
    id: 'g0',
    lane: 'rule',
    icon: Lock,
    title: 'G0 規則守門',
    detail: '長度上限／頻率限制',
    note: '不判斷內容',
  },
  {
    id: 'g1',
    lane: 'model',
    icon: Bot,
    title: 'G1 意圖判定',
    detail: 'in_scope／has_directive',
    note: '溫度 0 · 獨立呼叫 · fail closed',
    model: true,
    traced: true,
  },
  {
    id: 'embed',
    lane: 'model',
    icon: Waypoints,
    title: 'Embedding',
    detail: 'mistral-embed（1024 維）',
    note: '與 Indexer 同一份設定',
    model: true,
  },
  {
    id: 'retrieve',
    lane: 'rule',
    icon: Search,
    title: '向量檢索 Top-K = 5',
    detail: '不經模型，只算距離',
    levels: ['L6'],
    levelState: 'plain',
    dataChip: { title: '法條 Vector', detail: 'cosine 相似度' },
  },
  {
    id: 'g2',
    lane: 'rule',
    icon: Ruler,
    title: 'G2 檢索幾何',
    detail: 'top1 ／ mean@5 ／ margin',
    note: '不經模型',
  },
  {
    id: 'lookup',
    lane: 'rule',
    icon: ArrowUp,
    title: '條文代碼 join 總表',
    detail: 'L3 ▲ L2 ▲ L1 反查',
    note: '分類是檢索的副產物',
    levels: ['L3', 'L2', 'L1'],
    levelState: 'reverse',
    dataChip: { title: '決策樹總表', detail: '85 列 · l3_code' },
  },
  {
    id: 'l45',
    lane: 'rule',
    icon: Ban,
    title: 'L4 ／ L5',
    detail: '必要事實・追問加減地雷',
    note: '規格未到，整段抽掉',
    levels: ['L4', 'L5'],
    levelState: 'ghost',
    ghost: true,
  },
  {
    id: 'l78',
    lane: 'rule',
    icon: Snowflake,
    title: 'L7 ／ L8 直接取 DB 值',
    detail: 'initial_mines／initial_intervention',
    note: '凍結：要 L5 才會動，模型改不動',
    levels: ['L7', 'L8'],
    levelState: 'frozen',
    dataChip: { title: '決策樹總表', detail: 'CHECK 守著的初始值' },
  },
  {
    id: 'l9',
    lane: 'model',
    icon: FileText,
    title: 'L9 報告生成',
    detail: '自撰 prompt ＋ Codex 5.6 Luna',
    note: '固定七章節',
    levels: ['L9'],
    levelState: 'plain',
    model: true,
    traced: true,
  },
  {
    id: 'g3',
    lane: 'rule',
    icon: ShieldCheck,
    title: 'G3 輸出白名單',
    detail: 'l3_code ∈ 候選／條文 ⊆ 檢索集合',
    note: 'DB 值直取 · 語意對稱 · 矛盾偵測',
  },
  {
    id: 'disclaimer',
    lane: 'rule',
    icon: Pin,
    title: '免責語句拼接',
    detail: '程式固定，不讓模型生成',
  },
  {
    id: 'respond',
    lane: 'ui',
    icon: LayoutList,
    title: '回傳 UI',
    detail: '條文 ＋ L1~L3 ＋ 報告',
  },
  {
    id: 'l10',
    lane: 'rule',
    icon: Unplug,
    title: 'L10 顧問推薦',
    detail: '斷線（規格未到）',
    levels: ['L10'],
    levelState: 'ghost',
    ghost: true,
  },
]

const STEP_ROW: Record<StepId, number> = STEPS.reduce(
  (acc, step, index) => {
    acc[step.id] = index
    return acc
  },
  {} as Record<StepId, number>,
)

// ── 出口 ──────────────────────────────────────────────────

type ExitKey =
  | 'g0-reject'
  | 'g1-reject'
  | 'g2-reject'
  | 'g2-loop'
  | 'l9-degrade'
  | 'g3-degrade'

interface ExitDef {
  key: ExitKey
  from: StepId
  kind: 'reject' | 'degrade' | 'loop'
  icon: LucideIcon
  title: string
  detail: string
}

const EXITS: ExitDef[] = [
  {
    key: 'g0-reject',
    from: 'g0',
    kind: 'reject',
    icon: CircleSlash,
    title: '直接拒絕',
    detail: '超量輸入／頻率濫用',
  },
  {
    key: 'g1-reject',
    from: 'g1',
    kind: 'reject',
    icon: CircleSlash,
    title: 'fail closed',
    detail: '一般性拒絕，不說明細節',
  },
  {
    key: 'g2-reject',
    from: 'g2',
    kind: 'reject',
    icon: CircleSlash,
    title: 'unclassified 出口',
    detail: '明示超出範圍，記為未覆蓋問題',
  },
  {
    key: 'g2-loop',
    from: 'g2',
    kind: 'loop',
    icon: RotateCcw,
    title: '低信心 · 折返',
    detail: '列 2–3 候選，回使用者確認',
  },
  {
    key: 'l9-degrade',
    from: 'l9',
    kind: 'degrade',
    icon: TriangleAlert,
    title: '報告模型失敗',
    detail: '降級回結構化 JSON',
  },
  {
    key: 'g3-degrade',
    from: 'g3',
    kind: 'degrade',
    icon: TriangleAlert,
    title: 'G3 擋下',
    detail: '降級回結構化 JSON',
  },
]

const EXITS_BY_STEP: Partial<Record<StepId, ExitDef[]>> = EXITS.reduce(
  (acc, exit) => {
    const list = acc[exit.from] ?? []
    list.push(exit)
    acc[exit.from] = list
    return acc
  },
  {} as Partial<Record<StepId, ExitDef[]>>,
)

// ── 樣本（跑一次請求） ────────────────────────────────────

type RunKey = 'normal' | 'g0' | 'g1' | 'g2out' | 'g2low' | 'l9' | 'g3'

interface RunDef {
  key: RunKey
  group: '正常' | '被擋下' | '打折交付'
  label: string
  exit: ExitKey | null
  leaveAt: string
  userSees: string
  langfuse: string
}

const RUNS: RunDef[] = [
  {
    key: 'normal',
    group: '正常',
    label: '完整跑完',
    exit: null,
    leaveAt: '不離場，走完 14 格',
    userSees: '條文 ＋ L1~L3 分類 ＋ 報告（固定七章節）',
    langfuse: 'report.generate ／ ok',
  },
  {
    key: 'g0',
    group: '被擋下',
    label: 'G0 超量·濫用',
    exit: 'g0-reject',
    leaveAt: 'G0（第 2 格，還沒碰到任何模型）',
    userSees: '直接拒絕',
    langfuse: '不進報告 trace，計入濫用計數',
  },
  {
    key: 'g1',
    group: '被擋下',
    label: 'G1 離題或含指令',
    exit: 'g1-reject',
    leaveAt: 'G1（第 3 格，唯一判斷內容意圖的一關）',
    userSees: '一般性拒絕，不說明細節',
    langfuse: 'gate.g1 ／ in_scope=false 或 has_directive=true',
  },
  {
    key: 'g2out',
    group: '被擋下',
    label: 'G2 超出範圍',
    exit: 'g2-reject',
    leaveAt: 'G2（第 6 格，top1 低於 τ_low）',
    userSees: '明示超出勞基法 L1~L3 的涵蓋範圍',
    langfuse: 'fallback.emit ／ 降級原因：unclassified',
  },
  {
    key: 'g2low',
    group: '打折交付',
    label: 'G2 低信心',
    exit: 'g2-loop',
    leaveAt: 'G2（第 6 格）——全圖唯一會折返的路徑',
    userSees: '2–3 個候選題型，待使用者確認後才往下走',
    langfuse: 'fallback.emit ／ 降級原因：信心低於門檻',
  },
  {
    key: 'l9',
    group: '打折交付',
    label: '報告模型失敗',
    exit: 'l9-degrade',
    leaveAt: 'L9（第 10 格）',
    userSees: '條文與分類仍在，明示報告未生成與原因',
    langfuse: 'fallback.emit ／ 降級原因：報告模型逾時',
  },
  {
    key: 'g3',
    group: '打折交付',
    label: 'G3 擋下',
    exit: 'g3-degrade',
    leaveAt: 'G3（第 11 格）——與 L9 不同位置，同一種降級結果',
    userSees: '條文與分類仍在，報告未通過白名單',
    langfuse: 'fallback.emit ／ 降級原因：輸出白名單未過',
  },
]

const RUN_GROUPS: Array<RunDef['group']> = ['正常', '被擋下', '打折交付']

const EXIT_BY_KEY: Record<ExitKey, ExitDef> = EXITS.reduce(
  (acc, exit) => {
    acc[exit.key] = exit
    return acc
  },
  {} as Record<ExitKey, ExitDef>,
)

// ── 小元件 ────────────────────────────────────────────────

type StepState = 'active' | 'skipped' | 'ghost'

function LevelRail({ step, state }: { step: Step; state: StepState }) {
  if (!step.levels?.length) return null
  const levelState = step.levelState ?? 'plain'
  const dimmed = state !== 'active' || levelState === 'ghost'

  return (
    <div className="flex flex-col items-center gap-[3px] pt-3">
      {levelState === 'reverse' && (
        <ArrowUp size={11} className="text-[var(--blue-500)]" />
      )}
      {step.levels.map((level) => (
        <span
          key={level}
          className={clsx(
            'rounded-[var(--radius-xs)] px-1 py-[1px] text-[10px] font-semibold leading-none',
            levelState === 'ghost' &&
              'border border-dashed border-[var(--neutral-300)] text-[var(--neutral-400)]',
            levelState === 'frozen' &&
              'bg-[var(--neutral-100)] text-[var(--neutral-600)]',
            levelState !== 'ghost' &&
              levelState !== 'frozen' &&
              (dimmed
                ? 'bg-[var(--neutral-100)] text-[var(--neutral-400)]'
                : 'bg-[var(--blue-50)] text-[var(--blue-700)]'),
          )}
        >
          {level}
        </span>
      ))}
      {levelState === 'frozen' && (
        <Snowflake size={11} className="text-[var(--neutral-500)]" />
      )}
    </div>
  )
}

function StepCard({
  step,
  state,
  delay,
}: {
  step: Step
  state: StepState
  delay: number
}) {
  const Icon = step.icon
  const isModel = step.model === true && state === 'active'
  const muted = state !== 'active'

  return (
    <motion.div
      animate={{ opacity: state === 'active' ? 1 : 0.72 }}
      transition={{ duration: 0.25, ease: 'easeOut', delay }}
      className={clsx(
        'rounded-[var(--radius-md)] px-2.5 py-2',
        state === 'ghost' &&
          'border border-dashed border-[var(--neutral-300)] bg-transparent',
        state === 'skipped' &&
          'border border-dashed border-[var(--neutral-300)] bg-transparent',
        state === 'active' &&
          (isModel
            ? 'border border-[var(--blue-700)] bg-[var(--blue-700)] shadow-[var(--shadow-sm)]'
            : 'border border-[var(--blue-300)] bg-[var(--neutral-0)]'),
      )}
    >
      <div className="flex items-start gap-1.5">
        <Icon
          size={14}
          className={clsx(
            'mt-[2px] shrink-0',
            muted
              ? 'text-[var(--neutral-400)]'
              : isModel
                ? 'text-[var(--orange-300)]'
                : 'text-[var(--blue-600)]',
          )}
        />
        <div className="min-w-0">
          <div
            className={clsx(
              'text-[12.5px] font-semibold leading-snug',
              muted
                ? 'text-[var(--neutral-400)]'
                : isModel
                  ? 'text-[var(--neutral-0)]'
                  : 'text-[var(--text-strong)]',
            )}
          >
            {step.title}
          </div>
          {step.detail && (
            <div
              className={clsx(
                'mt-0.5 text-[10.5px] leading-snug',
                muted
                  ? 'text-[var(--neutral-400)]'
                  : isModel
                    ? 'text-[var(--blue-100)]'
                    : 'text-[var(--text-muted)]',
              )}
            >
              {step.detail}
            </div>
          )}
          {step.note && (
            <div
              className={clsx(
                'mt-1 text-[10px] leading-snug',
                muted
                  ? 'text-[var(--neutral-400)]'
                  : isModel
                    ? 'text-[var(--blue-200)]'
                    : 'text-[var(--neutral-500)]',
              )}
            >
              {step.note}
            </div>
          )}
          {(state === 'skipped' || state === 'ghost') && (
            <div className="mt-1.5 inline-flex items-center rounded-[var(--radius-pill)] border border-dashed border-[var(--neutral-300)] px-1.5 py-[1px] text-[10px] text-[var(--neutral-500)]">
              {state === 'ghost' ? '規格未到' : '未執行'}
            </div>
          )}
          {step.traced && state === 'active' && (
            <div
              className={clsx(
                'mt-1.5 inline-flex items-center gap-1 text-[10px]',
                isModel ? 'text-[var(--blue-200)]' : 'text-[var(--neutral-500)]',
              )}
            >
              <Activity size={10} />
              Langfuse trace
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function DataChipCard({ chip, active }: { chip: DataChip; active: boolean }) {
  return (
    <div
      className={clsx(
        'mt-3 rounded-[var(--radius-md)] border px-2 py-1.5',
        active
          ? 'border-[var(--neutral-300)] bg-[var(--neutral-50)]'
          : 'border-dashed border-[var(--neutral-300)] bg-transparent',
      )}
    >
      <div className="flex items-center gap-1">
        <Database
          size={11}
          className={
            active ? 'text-[var(--blue-600)]' : 'text-[var(--neutral-400)]'
          }
        />
        <span
          className={clsx(
            'text-[11px] font-medium',
            active ? 'text-[var(--text-strong)]' : 'text-[var(--neutral-400)]',
          )}
        >
          {chip.title}
        </span>
      </div>
      <div className="mt-0.5 text-[10px] text-[var(--neutral-500)]">
        {chip.detail}
      </div>
    </div>
  )
}

function ExitCard({ exit, active }: { exit: ExitDef; active: boolean }) {
  const Icon = exit.icon
  return (
    <motion.div
      animate={{ opacity: active ? 1 : 0.55 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={clsx(
        'rounded-[var(--radius-md)] border border-dashed px-2.5 py-2',
        active
          ? 'border-[var(--warning-500)] bg-[var(--warning-50)]'
          : 'border-[var(--neutral-300)] bg-transparent',
      )}
    >
      <div className="flex items-start gap-1.5">
        <Icon
          size={13}
          className={clsx(
            'mt-[2px] shrink-0',
            active ? 'text-[var(--warning-500)]' : 'text-[var(--neutral-400)]',
          )}
        />
        <div className="min-w-0">
          <div
            className={clsx(
              'text-[12px] font-semibold leading-snug',
              active ? 'text-[var(--text-strong)]' : 'text-[var(--neutral-400)]',
            )}
          >
            {exit.title}
          </div>
          <div
            className={clsx(
              'mt-0.5 text-[10.5px] leading-snug',
              active ? 'text-[var(--neutral-600)]' : 'text-[var(--neutral-400)]',
            )}
          >
            {exit.detail}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/** 主幹上下相接的連接線；換泳道時走一個直角彎 */
function TrunkConnector({
  from,
  to,
  active,
  delay,
}: {
  from: LaneKey
  to: LaneKey
  active: boolean
  delay: number
}) {
  const x1 = columnCenter(from)
  const x2 = columnCenter(to)
  const stroke = active ? 'var(--blue-300)' : 'var(--neutral-300)'

  return (
    <div className="flex">
      <div className="w-11 shrink-0" />
      <div className="relative h-7 flex-1">
        <motion.svg
          className="absolute inset-0 h-full w-full"
          animate={{ opacity: active ? 1 : 0.6 }}
          transition={{ duration: 0.25, ease: 'easeOut', delay }}
        >
          <line
            x1={`${x1}%`}
            y1="0"
            x2={`${x1}%`}
            y2="50%"
            stroke={stroke}
            strokeWidth={1.5}
            strokeDasharray={active ? undefined : '3 3'}
          />
          {x1 !== x2 && (
            <line
              x1={`${x1}%`}
              y1="50%"
              x2={`${x2}%`}
              y2="50%"
              stroke={stroke}
              strokeWidth={1.5}
              strokeDasharray={active ? undefined : '3 3'}
            />
          )}
          <line
            x1={`${x2}%`}
            y1="50%"
            x2={`${x2}%`}
            y2="100%"
            stroke={stroke}
            strokeWidth={1.5}
            strokeDasharray={active ? undefined : '3 3'}
          />
        </motion.svg>
        <ChevronDown
          size={12}
          className={clsx(
            'absolute -bottom-[5px]',
            active ? 'text-[var(--blue-400)]' : 'text-[var(--neutral-300)]',
          )}
          style={{ left: `${x2}%`, transform: 'translateX(-50%)' }}
        />
      </div>
    </div>
  )
}

/** 節點列上的水平支線：往資料層（實線細）或往出口欄（琥珀虛線） */
function BranchLines({
  step,
  active,
  exitActive,
}: {
  step: Step
  active: boolean
  exitActive: boolean
}) {
  const hasExit = Boolean(EXITS_BY_STEP[step.id])
  if (!step.dataChip && !hasExit) return null

  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full">
      {step.dataChip && (
        <line
          x1={`${columnRightEdge(step.lane)}%`}
          y1="20"
          x2={`${COLUMN_LEFT.data - 0.5}%`}
          y2="20"
          stroke={active ? 'var(--blue-300)' : 'var(--neutral-300)'}
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
      )}
      {hasExit && (
        <line
          x1={`${columnRightEdge(step.lane)}%`}
          y1="20"
          x2={`${COLUMN_LEFT.exit - 0.5}%`}
          y2="20"
          stroke={
            exitActive ? 'var(--warning-500)' : 'var(--neutral-300)'
          }
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
      )}
    </svg>
  )
}

// ── 主元件 ────────────────────────────────────────────────

export default function QuestionLifecycleSwimlane() {
  const reduced = useReducedMotion()
  const [runKey, setRunKey] = useState<RunKey>('normal')

  const run = useMemo(
    () => RUNS.find((r) => r.key === runKey) ?? RUNS[0],
    [runKey],
  )

  const activeExit = run.exit ? EXIT_BY_KEY[run.exit] : null
  const exitRow = activeExit ? STEP_ROW[activeExit.from] : null
  const stepDelay = (index: number) => (reduced ? 0 : Math.min(index, 13) * 0.05)

  const stateOf = (step: Step, index: number): StepState => {
    if (step.ghost) return 'ghost'
    if (exitRow === null) return 'active'
    return index <= exitRow ? 'active' : 'skipped'
  }

  return (
    <div className="not-prose mx-auto w-full max-w-[980px] space-y-4">
      {/* 樣本列 */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {RUN_GROUPS.map((group) => (
          <div key={group} className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-[var(--text-muted)]">
              {group}
            </span>
            {RUNS.filter((r) => r.group === group).map((r) => {
              const selected = r.key === runKey
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setRunKey(r.key)}
                  aria-pressed={selected}
                  className={clsx(
                    'rounded-[var(--radius-pill)] border px-2.5 py-1 text-[12px] transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]',
                    selected
                      ? group === '正常'
                        ? 'border-[var(--blue-600)] bg-[var(--blue-600)] font-medium text-[var(--neutral-0)]'
                        : 'border-[var(--warning-500)] bg-[var(--warning-50)] font-medium text-[var(--text-strong)]'
                      : 'border-[var(--border-default)] bg-[var(--neutral-0)] text-[var(--text-body)] hover:border-[var(--blue-300)]',
                  )}
                >
                  {r.label}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* 泳道圖本體 */}
      <div className="overflow-x-auto pb-1">
        <div className="relative min-w-[680px]">
          {/* 泳道分隔線 */}
          <div
            className="pointer-events-none absolute inset-y-0 right-0"
            style={{ left: '2.75rem' }}
            aria-hidden="true"
          >
            {COLUMN_ORDER.slice(1).map((key) => COLUMN_LEFT[key]).map((x) => (
              <div
                key={x}
                className="absolute inset-y-0 w-px bg-[var(--border-subtle)]"
                style={{ left: `${x}%` }}
              />
            ))}
          </div>

          {/* 泳道標題 */}
          <div className="relative flex">
            <div className="w-11 shrink-0 pb-2 pl-0.5 text-[10px] font-medium text-[var(--text-muted)]">
              L 對照
            </div>
            <div
              className="grid flex-1"
              style={{ gridTemplateColumns: GRID_TEMPLATE }}
            >
              {LANES.map((lane) => (
                <div key={lane.key} className="px-1.5 pb-2">
                  <div className="flex items-center gap-1">
                    <span className="text-[12px] font-semibold text-[var(--text-strong)]">
                      {lane.title}
                    </span>
                    {lane.badge && (
                      <span className="rounded-[var(--radius-pill)] bg-[var(--blue-700)] px-1.5 py-[1px] text-[10px] font-medium text-[var(--neutral-0)]">
                        {lane.badge}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)]">
                    {lane.sub}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mb-1 h-px w-full bg-[var(--border-default)]" />

          {/* 節點列 */}
          {STEPS.map((step, index) => {
            const state = stateOf(step, index)
            const prev = index > 0 ? STEPS[index - 1] : null
            const connectorActive =
              state === 'active' || (step.ghost === true && exitRow === null)
            const rowExits = EXITS_BY_STEP[step.id] ?? []
            const exitIsActive = (exit: ExitDef) => activeExit?.key === exit.key
            const anyExitActive = rowExits.some(exitIsActive)

            return (
              <div key={step.id}>
                {prev && (
                  <TrunkConnector
                    from={prev.lane}
                    to={step.lane}
                    active={connectorActive}
                    delay={stepDelay(index)}
                  />
                )}
                <div className="relative flex">
                  <div className="w-11 shrink-0">
                    <LevelRail step={step} state={state} />
                  </div>
                  <div
                    className="relative grid flex-1"
                    style={{ gridTemplateColumns: GRID_TEMPLATE }}
                  >
                    <BranchLines
                      step={step}
                      active={state === 'active'}
                      exitActive={anyExitActive}
                    />
                    <div
                      className={clsx(
                        'relative px-1.5',
                        COL_START[COLUMN_INDEX[step.lane]],
                      )}
                    >
                      <StepCard
                        step={step}
                        state={state}
                        delay={stepDelay(index)}
                      />
                    </div>
                    {step.dataChip && (
                      <div className={clsx('px-1.5', COL_START[3])}>
                        <DataChipCard
                          chip={step.dataChip}
                          active={state === 'active'}
                        />
                      </div>
                    )}
                    {rowExits.length > 0 && (
                      <div
                        className={clsx('space-y-1.5 px-1.5', COL_START[4])}
                      >
                        {rowExits.map((exit) => (
                          <ExitCard
                            key={exit.key}
                            exit={exit}
                            active={exitIsActive(exit)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 全圖唯一的迴圈：低信心折返回使用者 */}
                <AnimatePresence initial={false}>
                  {step.id === 'g2' && run.exit === 'g2-loop' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 38 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{
                        duration: reduced ? 0 : 0.3,
                        ease: 'easeOut',
                      }}
                      className="flex overflow-hidden"
                    >
                      <div className="w-11 shrink-0" />
                      <div className="relative flex-1">
                        <svg className="absolute inset-0 h-full w-full">
                          <line
                            x1={`${columnCenter('exit')}%`}
                            y1="4"
                            x2={`${columnCenter('exit')}%`}
                            y2="26"
                            stroke="var(--warning-500)"
                            strokeWidth={1.5}
                            strokeDasharray="4 3"
                          />
                          <line
                            x1={`${columnCenter('exit')}%`}
                            y1="26"
                            x2={`${columnCenter('ui')}%`}
                            y2="26"
                            stroke="var(--warning-500)"
                            strokeWidth={1.5}
                            strokeDasharray="4 3"
                          />
                        </svg>
                        <ChevronLeft
                          size={13}
                          className="absolute text-[var(--warning-500)]"
                          style={{
                            left: `${columnCenter('ui')}%`,
                            top: '19px',
                          }}
                        />
                        <span
                          className="absolute top-[6px] text-[10.5px] text-[var(--neutral-600)]"
                          style={{ left: `${columnCenter('rule') - 6}%` }}
                        >
                          回使用者確認題型
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>

      {/* 摘要 */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={run.key}
          initial={{ opacity: 0, y: reduced ? 0 : 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduced ? 0 : -4 }}
          transition={{ duration: reduced ? 0 : 0.25, ease: 'easeOut' }}
          className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--neutral-50)] p-3 sm:grid-cols-3"
        >
          <div>
            <div className="flex items-center gap-1 text-[11px] font-medium text-[var(--text-muted)]">
              <ChevronRight size={11} />
              離場於
            </div>
            <div className="mt-1 text-[12.5px] leading-snug text-[var(--text-strong)]">
              {run.leaveAt}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1 text-[11px] font-medium text-[var(--text-muted)]">
              <Check size={11} />
              使用者看到
            </div>
            <div className="mt-1 text-[12.5px] leading-snug text-[var(--text-strong)]">
              {run.userSees}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1 text-[11px] font-medium text-[var(--text-muted)]">
              <Activity size={11} />
              Langfuse
            </div>
            <div className="mt-1 text-[12.5px] leading-snug text-[var(--text-strong)]">
              {run.langfuse}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* 圖例 */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-[var(--text-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-[3px] border border-[var(--blue-700)] bg-[var(--blue-700)]" />
          碰模型的節點（共 3 格）
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-[3px] border border-[var(--blue-300)] bg-[var(--neutral-0)]" />
          不經模型
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-[3px] border border-dashed border-[var(--warning-500)] bg-[var(--warning-50)]" />
          出口／降級
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-[3px] border border-dashed border-[var(--neutral-300)]" />
          未執行／規格未到
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Activity size={11} />
          掛 Langfuse trace
        </span>
        <span className="inline-flex items-center gap-1.5">
          <RotateCcw size={11} />
          全圖唯一的折返
        </span>
      </div>
    </div>
  )
}
