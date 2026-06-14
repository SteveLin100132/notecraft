import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, LayoutGroup, useReducedMotion } from 'motion/react'
import {
  ArrowRight,
  PauseCircle,
  X,
  RotateCcw,
  Plus,
  Minus,
  AlertCircle,
  Timer,
  Check,
  LogOut,
} from 'lucide-react'
import { clsx } from 'clsx'

type ColumnId = 'open' | 'ongoing' | 'done' | 'verified' | 'closed'
type CardStatus = 'active' | 'pending' | 'cancelled'

interface KanbanCard {
  id: string
  title: string
  avatar: string
  column: ColumnId
  status: CardStatus
  leadTimeSteps: number
  isLeadTimeCard: boolean
}

const COLUMNS: { id: ColumnId; label: string; sub: string }[] = [
  { id: 'open', label: 'Open', sub: '待辦' },
  { id: 'ongoing', label: 'On Going', sub: '進行中' },
  { id: 'done', label: 'Done', sub: '待驗收' },
  { id: 'verified', label: 'Verified', sub: '待結案' },
  { id: 'closed', label: 'Closed', sub: '已結案' },
]

const COLUMN_ORDER: ColumnId[] = ['open', 'ongoing', 'done', 'verified', 'closed']

const INITIAL_CARDS: KanbanCard[] = [
  { id: 'c1', title: '首頁改版', avatar: 'WL', column: 'open', status: 'active', leadTimeSteps: 0, isLeadTimeCard: false },
  { id: 'c2', title: '會員登入流程', avatar: 'CY', column: 'open', status: 'active', leadTimeSteps: 0, isLeadTimeCard: false },
  { id: 'c3', title: '購物車 UX', avatar: 'SL', column: 'open', status: 'active', leadTimeSteps: 0, isLeadTimeCard: false },
  { id: 'c4', title: '商品列表 API', avatar: 'JW', column: 'ongoing', status: 'active', leadTimeSteps: 0, isLeadTimeCard: true },
  { id: 'c5', title: '搜尋功能', avatar: 'TK', column: 'ongoing', status: 'active', leadTimeSteps: 0, isLeadTimeCard: false },
  { id: 'c6', title: '訂單通知信', avatar: 'WL', column: 'done', status: 'active', leadTimeSteps: 0, isLeadTimeCard: false },
  { id: 'c7', title: '金流串接', avatar: 'CY', column: 'verified', status: 'active', leadTimeSteps: 0, isLeadTimeCard: false },
  // 示範卡片：讓泳道一開始就有內容，教學意義明確
  { id: 'c8', title: '活動報名頁', avatar: 'PM', column: 'ongoing', status: 'pending', leadTimeSteps: 0, isLeadTimeCard: false },
  { id: 'c9', title: '舊版報表匯出', avatar: 'TK', column: 'done', status: 'cancelled', leadTimeSteps: 0, isLeadTimeCard: false },
]

const INITIAL_WIP: Record<ColumnId, number | null> = {
  open: null,
  ongoing: 2,
  done: null,
  verified: 2,
  closed: null,
}

function getActiveCount(cards: KanbanCard[], colId: ColumnId): number {
  return cards.filter((c) => c.column === colId && c.status === 'active').length
}

function isWipReached(cards: KanbanCard[], colId: ColumnId, wip: Record<ColumnId, number | null>): boolean {
  const limit = wip[colId]
  if (limit === null) return false
  return getActiveCount(cards, colId) >= limit
}

function isWipExceeded(cards: KanbanCard[], colId: ColumnId, wip: Record<ColumnId, number | null>): boolean {
  const limit = wip[colId]
  if (limit === null) return false
  return getActiveCount(cards, colId) > limit
}

export default function KanbanSimulator() {
  const prefersReducedMotion = useReducedMotion()
  const [cards, setCards] = useState<KanbanCard[]>(INITIAL_CARDS)
  const [wipLimits, setWipLimits] = useState<Record<ColumnId, number | null>>(INITIAL_WIP)
  const [blockedColumn, setBlockedColumn] = useState<ColumnId | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const boardRef = useRef<HTMLDivElement>(null)
  const colRefs = useRef<Record<ColumnId, HTMLDivElement | null>>({
    open: null,
    ongoing: null,
    done: null,
    verified: null,
    closed: null,
  })
  const blockedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const triggerBlocked = useCallback((colId: ColumnId) => {
    if (blockedTimerRef.current) clearTimeout(blockedTimerRef.current)
    setBlockedColumn(colId)
    blockedTimerRef.current = setTimeout(() => {
      setBlockedColumn(null)
      blockedTimerRef.current = null
    }, 2000)
  }, [])

  useEffect(() => {
    return () => {
      if (blockedTimerRef.current) clearTimeout(blockedTimerRef.current)
    }
  }, [])

  function advanceCard(cardId: string) {
    setCards((prev) => {
      const card = prev.find((c) => c.id === cardId)
      if (!card || card.status !== 'active') return prev
      const curIdx = COLUMN_ORDER.indexOf(card.column)
      if (curIdx === COLUMN_ORDER.length - 1) return prev
      const nextCol = COLUMN_ORDER[curIdx + 1]
      if (isWipReached(prev, nextCol, wipLimits)) {
        triggerBlocked(nextCol)
        return prev
      }
      return prev.map((c) =>
        c.id === cardId
          ? {
              ...c,
              column: nextCol,
              leadTimeSteps: c.isLeadTimeCard ? c.leadTimeSteps + 1 : c.leadTimeSteps,
            }
          : c
      )
    })
  }

  function setCardStatus(cardId: string, newStatus: CardStatus) {
    setCards((prev) => {
      const card = prev.find((c) => c.id === cardId)
      if (!card) return prev
      if (newStatus === 'active') {
        // Check WIP for the card's current column (return column)
        if (isWipReached(prev.filter((c) => c.id !== cardId), card.column, wipLimits)) {
          triggerBlocked(card.column)
          return prev
        }
      }
      return prev.map((c) => (c.id === cardId ? { ...c, status: newStatus } : c))
    })
  }

  function adjustWip(colId: ColumnId, delta: number) {
    setWipLimits((prev) => {
      const cur = prev[colId]
      if (cur === null) return prev
      const next = Math.max(1, cur + delta)
      return { ...prev, [colId]: next }
    })
  }

  function findColumnFromX(clientX: number): ColumnId | null {
    for (const colId of COLUMN_ORDER) {
      const el = colRefs.current[colId]
      if (!el) continue
      const rect = el.getBoundingClientRect()
      if (clientX >= rect.left && clientX <= rect.right) return colId
    }
    return null
  }

  function handleDragEnd(cardId: string, event: { clientX: number; clientY: number }) {
    setDraggingId(null)
    const card = cards.find((c) => c.id === cardId)
    if (!card || card.status !== 'active') return
    const targetCol = findColumnFromX(event.clientX)
    if (!targetCol || targetCol === card.column) return
    if (isWipReached(cards.filter((c) => c.id !== cardId), targetCol, wipLimits)) {
      triggerBlocked(targetCol)
      return
    }
    setCards((prev) => {
      const c = prev.find((x) => x.id === cardId)
      if (!c) return prev
      const curIdx = COLUMN_ORDER.indexOf(c.column)
      const tgtIdx = COLUMN_ORDER.indexOf(targetCol)
      const steps = c.isLeadTimeCard && tgtIdx > curIdx ? tgtIdx - curIdx : 0
      return prev.map((x) =>
        x.id === cardId ? { ...x, column: targetCol, leadTimeSteps: x.leadTimeSteps + steps } : x
      )
    })
  }

  const transition = prefersReducedMotion ? { duration: 0 } : { duration: 0.3, ease: 'easeOut' }

  const swimlaneCards = cards.filter((c) => c.status === 'pending' || c.status === 'cancelled')

  return (
    <div className="not-prose w-full overflow-x-auto">
      <p className="text-xs text-neutral-400 mb-3 flex items-center gap-1 flex-wrap">
        <ArrowRight size={12} className="text-blue-400" />
        點擊
        <ArrowRight size={12} className="text-blue-400" />
        推進卡片；可拖放移欄；達到 WIP 上限的欄位標頭會變色；標記
        <PauseCircle size={12} className="text-amber-400" />
        Pending 或
        <X size={12} className="text-neutral-400" />
        Cancelled 會讓卡片離開欄位、移到下方「離開流動」泳道
      </p>

      <LayoutGroup>
        <div ref={boardRef} className="flex gap-3 min-w-[800px] pb-2">
          {COLUMNS.map((col) => {
            const activeCount = getActiveCount(cards, col.id)
            const limit = wipLimits[col.id]
            const reached = limit !== null && activeCount >= limit
            const exceeded = isWipExceeded(cards, col.id, wipLimits)
            const headerCls = clsx(
              'border rounded-md px-2 py-1.5 transition-colors duration-200',
              exceeded
                ? 'bg-red-50 border-red-300'
                : reached
                ? 'bg-orange-50 border-orange-300'
                : 'bg-neutral-50 border-neutral-200'
            )
            const badgeCls = clsx(
              'rounded-full text-xs px-1.5 py-0.5 font-medium',
              reached ? 'bg-red-500 text-white' : 'bg-neutral-100 text-neutral-600'
            )
            const activeCards = cards.filter((c) => c.column === col.id && c.status === 'active')

            return (
              <div
                key={col.id}
                className="flex flex-col w-48 flex-shrink-0"
                ref={(el) => { colRefs.current[col.id] = el }}
              >
                <div className={headerCls}>
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="text-blue-700 font-semibold text-sm truncate">{col.label}</span>
                      <span className="text-neutral-500 text-xs truncate">{col.sub}</span>
                    </div>
                    <span className={badgeCls}>
                      {activeCount}{limit !== null ? `/${limit}` : ''}
                    </span>
                  </div>
                  {(col.id === 'ongoing' || col.id === 'verified') && limit !== null && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs text-neutral-400">WIP</span>
                      <button
                        onClick={() => adjustWip(col.id, -1)}
                        className="text-neutral-400 hover:text-blue-600 transition-colors"
                        aria-label="減少 WIP"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-xs font-medium text-neutral-600 w-3 text-center">{limit}</span>
                      <button
                        onClick={() => adjustWip(col.id, 1)}
                        className="text-neutral-400 hover:text-blue-600 transition-colors"
                        aria-label="增加 WIP"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {blockedColumn === col.id && (
                    <motion.div
                      key="blocked"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={transition}
                      className="flex items-center gap-1 mt-1 px-1"
                    >
                      <AlertCircle size={12} className="text-red-600 flex-shrink-0" />
                      <span className="text-xs text-red-600">先完成、再開始</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex flex-col gap-2 mt-2 min-h-[120px]">
                  {activeCards.map((card) => (
                    <CardItem
                      key={card.id}
                      card={card}
                      cards={cards}
                      wipLimits={wipLimits}
                      isLastColumn={card.column === 'closed'}
                      draggingId={draggingId}
                      prefersReducedMotion={prefersReducedMotion ?? false}
                      transition={transition}
                      onAdvance={advanceCard}
                      onSetStatus={setCardStatus}
                      onDragStart={() => setDraggingId(card.id)}
                      onDragEnd={(ev) => handleDragEnd(card.id, ev)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* 離開流動泳道 */}
        <div className="min-w-[800px] mt-4 border-t-2 border-dashed border-neutral-300 pt-3">
          <div className="bg-neutral-50/60 rounded-md p-3">
            <div className="flex items-center gap-2 mb-2.5">
              <LogOut size={14} className="text-neutral-400 flex-shrink-0" />
              <span className="text-sm font-medium text-neutral-600">離開流動</span>
              <span className="text-xs text-neutral-400">
                Pending（暫離）與 Cancelled（退出）不佔欄位 WIP，已離開正常往前的流動
              </span>
            </div>

            {swimlaneCards.length === 0 ? (
              <p className="text-xs text-neutral-300 italic">目前沒有暫離或退出流動的卡片</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {swimlaneCards.map((card) => (
                  <SwimlaneCardItem
                    key={card.id}
                    card={card}
                    cards={cards}
                    wipLimits={wipLimits}
                    prefersReducedMotion={prefersReducedMotion ?? false}
                    transition={transition}
                    onSetStatus={setCardStatus}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </LayoutGroup>
    </div>
  )
}

interface CardItemProps {
  card: KanbanCard
  cards: KanbanCard[]
  wipLimits: Record<ColumnId, number | null>
  isLastColumn: boolean
  draggingId: string | null
  prefersReducedMotion: boolean
  transition: object
  onAdvance: (id: string) => void
  onSetStatus: (id: string, s: CardStatus) => void
  onDragStart: () => void
  onDragEnd: (ev: { clientX: number; clientY: number }) => void
}

function CardItem({
  card,
  cards,
  wipLimits,
  isLastColumn,
  draggingId,
  prefersReducedMotion,
  transition,
  onAdvance,
  onSetStatus,
  onDragStart,
  onDragEnd,
}: CardItemProps) {
  const curIdx = COLUMN_ORDER.indexOf(card.column)
  const nextCol = curIdx < COLUMN_ORDER.length - 1 ? COLUMN_ORDER[curIdx + 1] : null
  const nextBlocked = nextCol ? isWipReached(cards.filter((c) => c.id !== card.id), nextCol, wipLimits) : false

  const canDrag = card.status === 'active' && !prefersReducedMotion

  const showLeadTimeInProgress = card.isLeadTimeCard && card.column !== 'closed' && card.column !== 'open'
  const showLeadTimeDone = card.isLeadTimeCard && card.column === 'closed'

  return (
    <motion.div
      layoutId={prefersReducedMotion ? undefined : card.id}
      key={prefersReducedMotion ? card.id : undefined}
      layout
      transition={transition}
      drag={canDrag ? 'x' : false}
      dragSnapToOrigin
      onDragStart={onDragStart}
      onDragEnd={(_e, info) => onDragEnd({ clientX: info.point.x, clientY: info.point.y })}
      className={clsx(
        'bg-white border border-neutral-200 shadow-sm rounded-lg overflow-hidden cursor-grab active:cursor-grabbing select-none',
        draggingId === card.id && 'shadow-md z-10 relative',
        !canDrag && 'cursor-default'
      )}
      style={{ touchAction: 'none' }}
    >
      <div className="h-1 bg-blue-600 rounded-t-lg" />
      <div className="p-2.5">
        <p className="text-sm font-medium text-neutral-800 leading-snug mb-2">{card.title}</p>

        {showLeadTimeInProgress && (
          <div className="flex items-center gap-1 mb-1.5">
            <Timer size={11} className="text-orange-500" />
            <span className="text-xs text-orange-500">{card.leadTimeSteps} 格</span>
          </div>
        )}
        {showLeadTimeDone && (
          <div className="flex items-center gap-1 mb-1.5">
            <Check size={11} className="text-emerald-500" />
            <span className="text-xs text-emerald-500">Lead Time: {card.leadTimeSteps} 步</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold flex-shrink-0">
            {card.avatar}
          </div>
          <div className="flex items-center gap-1">
            {card.status === 'active' && !isLastColumn && (
              <button
                onClick={() => onAdvance(card.id)}
                className={clsx(
                  'transition-colors',
                  nextBlocked
                    ? 'text-neutral-300 cursor-not-allowed'
                    : 'text-blue-500 hover:text-blue-700'
                )}
                title="推進到下一欄"
                disabled={nextBlocked}
              >
                <ArrowRight size={14} />
              </button>
            )}
            {card.status === 'active' && (
              <button
                onClick={() => onSetStatus(card.id, 'pending')}
                className="text-neutral-400 hover:text-amber-500 transition-colors"
                title="標記為 Pending（暫離流動）"
              >
                <PauseCircle size={14} />
              </button>
            )}
            {card.status === 'active' && (
              <button
                onClick={() => onSetStatus(card.id, 'cancelled')}
                className="text-neutral-400 hover:text-red-500 transition-colors"
                title="標記為 Cancelled（退出流動）"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

interface SwimlaneCardItemProps {
  card: KanbanCard
  cards: KanbanCard[]
  wipLimits: Record<ColumnId, number | null>
  prefersReducedMotion: boolean
  transition: object
  onSetStatus: (id: string, s: CardStatus) => void
}

function SwimlaneCardItem({
  card,
  cards,
  wipLimits,
  prefersReducedMotion,
  transition,
  onSetStatus,
}: SwimlaneCardItemProps) {
  const isPending = card.status === 'pending'

  const accentColor = isPending ? 'bg-amber-400' : 'bg-neutral-300'
  const opacity = isPending ? 'opacity-80' : 'opacity-60'

  return (
    <motion.div
      layoutId={prefersReducedMotion ? undefined : card.id}
      key={prefersReducedMotion ? card.id : undefined}
      layout
      transition={transition}
      className={clsx(
        'bg-white border border-neutral-200 shadow-sm rounded-lg overflow-hidden select-none w-44 flex-shrink-0',
        opacity
      )}
    >
      {/* Left accent stripe via top bar */}
      <div className={clsx('h-1 rounded-t-lg', accentColor)} />
      <div className="p-2.5">
        {/* Status badge */}
        <div className="flex items-center gap-1 mb-1.5">
          {isPending ? (
            <span className="inline-flex items-center gap-0.5 bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full font-medium">
              <PauseCircle size={11} />
              暫離流動
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 bg-neutral-200 text-neutral-500 text-xs px-1.5 py-0.5 rounded-full font-medium">
              <X size={11} />
              退出流動
            </span>
          )}
        </div>

        <p className={clsx('text-sm font-medium text-neutral-800 leading-snug mb-2', !isPending && 'line-through text-neutral-400')}>
          {card.title}
        </p>

        <div className="text-xs text-neutral-400 mb-2">
          原欄位：{COLUMNS.find((c) => c.id === card.column)?.label}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-neutral-100 text-neutral-500 text-xs font-semibold flex-shrink-0">
            {card.avatar}
          </div>
          <div className="flex items-center gap-1">
            {/* Return to flow */}
            <button
              onClick={() => onSetStatus(card.id, 'active')}
              className="text-neutral-400 hover:text-blue-600 transition-colors"
              title="回到流動"
            >
              <RotateCcw size={13} />
            </button>
            {/* Pending -> Cancelled */}
            {isPending && (
              <button
                onClick={() => onSetStatus(card.id, 'cancelled')}
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
                title="改為退出流動"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
