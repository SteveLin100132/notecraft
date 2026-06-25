import { useState, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { Crown, Compass, Languages, Code2, User, FileText } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────

type LaneId = 'founder' | 'po' | 'po-translator' | 'translator' | 'dev'

interface StageExample {
  heading: string
  body: string
  whyRole: string
}

interface Stage {
  id: string
  label: string
  labelZh: string
  timespan: string
  ownerLane: LaneId
  laneSpan: 1 | 2
  granularity: string
  artifact: string
  example: StageExample
}

interface Lane {
  id: string
  label: string
  icon: React.ElementType
  bgLight: string
  bgMid: string
  bgStrong: string
  textStrong: string
  border: string
}

// ── Data ──────────────────────────────────────────────────────────────────

const STAGES: Stage[] = [
  {
    id: 'vision',
    label: 'Vision',
    labelZh: '願景',
    timespan: '數年',
    ownerLane: 'founder',
    laneSpan: 1,
    granularity: '一句話',
    artifact: '產品定位句',
    example: {
      heading: '讓企業不需要 HR 部門也能管好人',
      body: '產品存在的根本理由。它定義服務誰、解決什麼，但完全不談怎麼做。',
      whyRole:
        '這是創辦人發起的「一句話」，所有下層工作都必須回答：這如何推進這個願景？',
    },
  },
  {
    id: 'roadmap',
    label: 'Roadmap',
    labelZh: '路線圖',
    timespan: '季度',
    ownerLane: 'po',
    laneSpan: 1,
    granularity: '主題切片',
    artifact: '季度主題',
    example: {
      heading: 'Q3 2026 MVP：讓 HR 不用紙本處理新人',
      body: '路線圖把願景切成季度主題，承諾的是「方向」而非「日期」。',
      whyRole: 'PO 負責把長期願景轉成「先做什麼、後做什麼」的取捨。',
    },
  },
  {
    id: 'epic',
    label: 'Epic',
    labelZh: '史詩',
    timespan: '月-季',
    ownerLane: 'po',
    laneSpan: 1,
    granularity: '大型主題',
    artifact: '問題空間描述',
    example: {
      heading: '員工生命週期管理',
      body: '涵蓋入職、異動、離職的完整流程。Epic 描述問題空間，不描述實作。',
      whyRole: 'PO 在此層仍主導：界定「我們要處理哪個大類問題」。',
    },
  },
  {
    id: 'feature',
    label: 'Feature',
    labelZh: '功能',
    timespan: '數週',
    ownerLane: 'po-translator',
    laneSpan: 2,
    granularity: '可獨立交付',
    artifact: '可交付能力',
    example: {
      heading: '線上 onboarding 流程',
      body: 'Feature 是可獨立上線、單獨展示價值的能力單元，附 user flow 與成功指標。',
      whyRole:
        '這是 PO 的商業意圖與 Translator 的需求語言碰撞的地方——兩種角色必須在此對齊。',
    },
  },
  {
    id: 'user-story',
    label: 'User Story',
    labelZh: '使用者故事',
    timespan: '1-N 天',
    ownerLane: 'translator',
    laneSpan: 1,
    granularity: '一個使用者・一個需求',
    artifact: '可估點的需求卡',
    example: {
      heading: '身為新員工，我想線上簽署勞動契約',
      body: 'As a 新員工, I want to 線上簽署勞動契約, so that 第一天上班就能直接報到。符合 INVEST 原則。',
      whyRole:
        'Translator 把 PO 的商業意圖翻譯成「Dev 可實作的語言」——這是規格交接的關鍵點。',
    },
  },
  {
    id: 'ac',
    label: 'Acceptance',
    labelZh: '驗收條件',
    timespan: '與 Story 同步',
    ownerLane: 'translator',
    laneSpan: 1,
    granularity: 'Given / When / Then',
    artifact: '可驗收條件',
    example: {
      heading: 'Story 的驗收條件',
      body: 'Given 員工剩餘特休足夠 When 送出休假申請 Then 系統設為「待主管審核」並通知主管。',
      whyRole:
        '仍由 Translator 主筆——AC 是 Story 的具體化，必須與 Story 同一支筆寫。',
    },
  },
  {
    id: 'task',
    label: 'Task',
    labelZh: '任務',
    timespan: '數小時',
    ownerLane: 'dev',
    laneSpan: 1,
    granularity: '技術拆解',
    artifact: '可執行工項',
    example: {
      heading: '本 Story 的技術拆解',
      body: '串接電子簽章 API（8h）・設計簽署流程 UI（4h）・實作 PDF 蓋章與儲存（6h）',
      whyRole:
        '進入 Dev 團隊的領域：規格已經夠具體，剩下的是「怎麼做」。',
    },
  },
]

const LANES: Lane[] = [
  {
    id: 'founder',
    label: '創辦人',
    icon: Crown,
    bgLight: 'bg-amber-50/40',
    bgMid: 'bg-amber-100',
    bgStrong: 'bg-amber-500',
    textStrong: 'text-amber-800',
    border: 'border-amber-200',
  },
  {
    id: 'po',
    label: 'PO',
    icon: Compass,
    bgLight: 'bg-blue-50/40',
    bgMid: 'bg-blue-100',
    bgStrong: 'bg-blue-600',
    textStrong: 'text-blue-800',
    border: 'border-blue-200',
  },
  {
    id: 'translator',
    label: 'Translator',
    icon: Languages,
    bgLight: 'bg-purple-50/40',
    bgMid: 'bg-purple-100',
    bgStrong: 'bg-purple-600',
    textStrong: 'text-purple-800',
    border: 'border-purple-200',
  },
  {
    id: 'dev',
    label: '開發團隊',
    icon: Code2,
    bgLight: 'bg-teal-50/40',
    bgMid: 'bg-teal-100',
    bgStrong: 'bg-teal-600',
    textStrong: 'text-teal-800',
    border: 'border-teal-200',
  },
]

// ── Helpers ──────────────────────────────────────────────────────────────

function getLane(ownerLane: LaneId): Lane {
  if (ownerLane === 'po-translator') return LANES[1]
  return LANES.find((l) => l.id === ownerLane) ?? LANES[0]
}

function getSecondLane(ownerLane: LaneId): Lane | null {
  if (ownerLane === 'po-translator') return LANES[2]
  return null
}

// Stage col (1-indexed within the 7 stage columns, so add 1 for label col)
const STAGE_COL: Record<string, number> = {
  vision: 2,
  roadmap: 3,
  epic: 4,
  feature: 5,
  'user-story': 6,
  ac: 7,
  task: 8,
}

// Lane row (1-indexed, rows 1-4 = founder/po/translator/dev)
const LANE_ROW: Record<string, number> = {
  founder: 1,
  po: 2,
  'po-translator': 2,
  translator: 3,
  dev: 4,
}

// ── Capsule ───────────────────────────────────────────────────────────────

function Capsule({
  stage,
  isSelected,
  onSelect,
  reduced,
}: {
  stage: Stage
  isSelected: boolean
  onSelect: () => void
  reduced: boolean | null
}) {
  const lane = getLane(stage.ownerLane)
  const lane2 = getSecondLane(stage.ownerLane)
  const springTransition = reduced
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 500, damping: 40 }

  return (
    <div className="relative flex h-full items-stretch">
      {isSelected && (
        <motion.div
          layoutId="active-glow"
          className={`absolute inset-0 rounded-xl blur-md opacity-25 ${lane.bgStrong}`}
          transition={springTransition}
        />
      )}
      <motion.button
        onClick={onSelect}
        animate={reduced ? {} : { scale: isSelected ? 1.04 : 1 }}
        transition={springTransition}
        className={[
          'relative z-10 w-full rounded-xl border px-2.5 py-2 text-left transition-colors',
          isSelected
            ? `${lane.bgStrong} border-transparent text-white shadow-lg`
            : `${lane.bgMid} ${lane.border} ${lane.textStrong} hover:brightness-95`,
        ].join(' ')}
      >
        <div className="text-[11px] font-bold leading-tight">{stage.label}</div>
        <div
          className={[
            'mt-0.5 text-[10px] leading-tight',
            isSelected ? 'text-white/70' : 'text-neutral-400',
          ].join(' ')}
        >
          {stage.labelZh}
        </div>
        {lane2 && (
          <div className="mt-1.5 flex gap-1">
            <span className="block h-1.5 w-1.5 rounded-full bg-current opacity-50" />
            <span className="block h-1.5 w-1.5 rounded-full bg-current opacity-50" />
          </div>
        )}
      </motion.button>
    </div>
  )
}

// ── Detail Card ───────────────────────────────────────────────────────────

function DetailCard({
  stage,
  reduced,
}: {
  stage: Stage
  reduced: boolean | null
}) {
  const lane = getLane(stage.ownerLane)
  const lane2 = getSecondLane(stage.ownerLane)
  const LaneIcon = lane.icon

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stage.id}
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduced ? {} : { opacity: 0, y: -8 }}
        transition={reduced ? { duration: 0 } : { duration: 0.22, ease: 'easeOut' }}
        className={`min-h-[200px] rounded-xl border ${lane.border} bg-white p-5`}
      >
        {/* Header */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${lane.bgMid} ${lane.textStrong}`}
          >
            <LaneIcon size={13} />
            {lane.label}
          </span>
          {lane2 && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${lane2.bgMid} ${lane2.textStrong}`}
            >
              {(() => {
                const L2Icon = lane2.icon
                return <L2Icon size={13} />
              })()}
              {lane2.label}
            </span>
          )}
          <span className="text-sm font-semibold text-neutral-700">
            {stage.label} · {stage.labelZh}
          </span>
          <span className="ml-auto rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-500">
            {stage.timespan}
          </span>
        </div>

        {/* Heading */}
        <p className="mb-3 text-base font-semibold leading-snug text-neutral-900 md:text-lg">
          {stage.example.heading}
        </p>

        {/* Body */}
        <p className="mb-4 text-sm leading-relaxed text-neutral-600">{stage.example.body}</p>

        {/* Why role */}
        <div className={`mb-4 rounded-lg p-3 ${lane.bgMid}`}>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            為什麼是這位角色？
          </p>
          <p className="text-sm leading-relaxed text-neutral-700">{stage.example.whyRole}</p>
        </div>

        {/* Artifact */}
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <FileText size={14} className="shrink-0 text-neutral-400" />
          <span>
            產出：<span className="font-medium text-neutral-700">{stage.artifact}</span>
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function ScrumSpecHierarchy() {
  const [selectedId, setSelectedId] = useState<string>('user-story')
  const reduced = useReducedMotion()

  const selectedIndex = STAGES.findIndex((s) => s.id === selectedId)
  const selectedStage = STAGES[selectedIndex] ?? STAGES[0]
  const selectedLane = getLane(selectedStage.ownerLane)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        setSelectedId(STAGES[Math.min(selectedIndex + 1, STAGES.length - 1)].id)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setSelectedId(STAGES[Math.max(selectedIndex - 1, 0)].id)
      }
    },
    [selectedIndex],
  )

  const springTransition = reduced
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 500, damping: 40 }

  return (
    <div
      className="not-prose mx-auto max-w-5xl focus:outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="region"
      aria-label="Scrum 規格分層互動圖"
    >
      {/* ── Desktop Grid (md+) ── */}
      <div className="hidden md:block">
        {/* Time header row */}
        <div className="mb-1 grid grid-cols-[110px_repeat(7,1fr)] gap-1">
          <div />
          {STAGES.map((s) => {
            const isActive = selectedId === s.id
            return (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className="flex flex-col items-center gap-0.5 focus:outline-none"
              >
                <span
                  className={[
                    'text-[11px] transition-colors',
                    isActive ? 'font-semibold text-neutral-900' : 'text-neutral-400',
                  ].join(' ')}
                >
                  {s.timespan}
                </span>
                <div className="h-0.5 w-6">
                  {isActive && (
                    <motion.div
                      layoutId="time-underline"
                      className={`h-full w-full rounded-full ${selectedLane.bgStrong}`}
                      transition={springTransition}
                    />
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Swim lanes grid */}
        {/* 4 lane rows + 1 runner row = 5 rows */}
        <div
          className="relative grid gap-1"
          style={{
            gridTemplateColumns: '110px repeat(7, 1fr)',
            gridTemplateRows: 'repeat(4, auto) 44px',
          }}
        >
          {/* Lane background bands */}
          {LANES.map((lane, li) => (
            <div
              key={`bg-${lane.id}`}
              className={`rounded-lg ${lane.bgLight}`}
              style={{
                gridColumn: '1 / -1',
                gridRow: li + 1,
              }}
            />
          ))}

          {/* Lane labels */}
          {LANES.map((lane, li) => {
            const LIcon = lane.icon
            return (
              <div
                key={`label-${lane.id}`}
                className="z-10 flex items-center gap-2 px-3 py-2.5"
                style={{ gridColumn: 1, gridRow: li + 1 }}
              >
                <span className={`rounded-full p-1.5 ${lane.bgMid}`}>
                  <LIcon size={13} className={lane.textStrong} />
                </span>
                <span className={`text-[11px] font-semibold leading-tight ${lane.textStrong}`}>
                  {lane.label}
                </span>
              </div>
            )
          })}

          {/* Capsules */}
          {STAGES.map((stage) => {
            const col = STAGE_COL[stage.id]
            const row = LANE_ROW[stage.ownerLane]
            return (
              <div
                key={stage.id}
                className="z-10 p-0.5"
                style={{
                  gridColumn: col,
                  gridRow: `${row} / span ${stage.laneSpan}`,
                }}
              >
                <Capsule
                  stage={stage}
                  isSelected={selectedId === stage.id}
                  onSelect={() => setSelectedId(stage.id)}
                  reduced={reduced}
                />
              </div>
            )
          })}

          {/* Runner track */}
          <div
            className="z-10 col-span-full flex items-center"
            style={{ gridRow: 5 }}
          >
            <div className="w-[110px] shrink-0" />
            <div className="relative flex flex-1 items-center rounded-full bg-neutral-100 py-1">
              <div className="flex w-full items-center justify-around px-2">
                {STAGES.map((s) => {
                  const isActive = selectedId === s.id
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedId(s.id)}
                      aria-label={`跳至 ${s.label}`}
                      className="group relative flex h-8 w-8 items-center justify-center focus:outline-none"
                    >
                      {!isActive && (
                        <span className="block h-2 w-2 rounded-full bg-neutral-300 transition-colors group-hover:bg-neutral-400" />
                      )}
                      {isActive && (
                        <motion.div
                          layoutId="runner"
                          className={`absolute inset-0 flex items-center justify-center rounded-full shadow-md ${selectedLane.bgStrong}`}
                          transition={springTransition}
                        >
                          <User size={15} className="text-white" />
                        </motion.div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile Layout (< md) ── */}
      <div className="flex flex-col gap-3 md:hidden">
        {/* Horizontal stepper */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {STAGES.map((s) => {
            const lane = getLane(s.ownerLane)
            const isActive = selectedId === s.id
            return (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={[
                  'shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  isActive
                    ? `${lane.bgStrong} text-white shadow-sm`
                    : 'bg-neutral-100 text-neutral-500',
                ].join(' ')}
              >
                {s.label}
              </button>
            )
          })}
        </div>

        {/* Stage cards vertical list */}
        <div className="flex flex-col gap-2">
          {STAGES.map((s) => {
            const lane = getLane(s.ownerLane)
            const lane2 = getSecondLane(s.ownerLane)
            const isActive = selectedId === s.id
            return (
              <motion.button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                animate={reduced ? {} : { scale: isActive ? 1.01 : 1 }}
                transition={reduced ? { duration: 0 } : { duration: 0.18 }}
                className={[
                  'w-full rounded-xl border p-4 text-left transition-colors',
                  isActive
                    ? `${lane.bgStrong} border-transparent text-white shadow-md`
                    : `bg-white ${lane.border} ${lane.textStrong}`,
                ].join(' ')}
              >
                <div className="mb-2 flex flex-wrap gap-1.5">
                  <span
                    className={[
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                      isActive ? 'bg-white/20 text-white' : `${lane.bgMid} ${lane.textStrong}`,
                    ].join(' ')}
                  >
                    {(() => {
                      const LIcon = lane.icon
                      return <LIcon size={11} />
                    })()}
                    {lane.label}
                  </span>
                  {lane2 && (
                    <span
                      className={[
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                        isActive ? 'bg-white/20 text-white' : `${lane2.bgMid} ${lane2.textStrong}`,
                      ].join(' ')}
                    >
                      {(() => {
                        const L2Icon = lane2.icon
                        return <L2Icon size={11} />
                      })()}
                      {lane2.label}
                    </span>
                  )}
                  <span
                    className={[
                      'rounded-full px-2 py-0.5 text-[11px]',
                      isActive ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-400',
                    ].join(' ')}
                  >
                    {s.timespan}
                  </span>
                </div>
                <div className="font-semibold">{s.label}</div>
                <div className={['text-sm', isActive ? 'text-white/75' : 'text-neutral-400'].join(' ')}>
                  {s.labelZh} · {s.granularity}
                </div>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* ── Detail Card (shared) ── */}
      <div className="mt-4">
        <DetailCard stage={selectedStage} reduced={reduced} />
      </div>

      {/* Keyboard hint */}
      <p className="mt-2 text-center text-[11px] text-neutral-400">
        點擊膠囊或使用鍵盤左右鍵切換層級
      </p>
    </div>
  )
}
