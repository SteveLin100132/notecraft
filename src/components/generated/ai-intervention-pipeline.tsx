import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import {
  Bot,
  Ruler,
  Search,
  ShieldCheck,
  ShieldOff,
  Snowflake,
  CircleSlash,
  ChevronDown,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import clsx from 'clsx'

/**
 * 模型介入管線：L1~L10 十層 ＋ G0~G3 四道閘門，排成執行順序。
 *
 * 核心洞察：AI 只在頭尾兩端——入口的 G1 判意圖、出口的 L9／L10 寫報告；
 * 中間 L1→L8 整段不經模型。而且用來兜住 AI 的四道閘門裡，只有 G1 是 AI，
 * 真正兜底的 G2（檢索幾何）與 G3（輸出白名單）都不經模型。
 *
 * 刻意用執行順序而非 L 編號順序：G2「L3 之後進 L4 前」、G3「L9 輸出」
 * 這種位置只有在執行順序裡才成立。每列仍掛代號徽章，兩種讀法都通。
 */

type Filter = 'all' | 'ai' | 'rule'

/** ai 碰模型｜lookup 反查（規則的一種）｜rule 一般規則 */
type Method = 'ai' | 'lookup' | 'rule'

type Segment = 'entry' | 'middle' | 'exit'

interface Step {
  code: string
  /** 閘門與 L 層在視覺上要分得開 */
  kind: 'gate' | 'layer'
  name: string
  method: Method
  /** 卡片上那一行 */
  limit: string
  /** 展開後的全文 */
  detail: string
  segment: Segment
  /** 規格未到、這一版不做 */
  skipped?: boolean
  /** 這一版的起點（L6） */
  start?: boolean
  /** 只看規則時浮出「兜底：不經模型」 */
  backstop?: boolean
}

const STEPS: Step[] = [
  {
    code: 'G0',
    kind: 'gate',
    name: '使用者輸入',
    method: 'rule',
    limit: '長度／次數／檔案限制；不判斷內容',
    detail:
      '純規則檢查，成本是零。不做語言限制（產品要國際化，入口不鎖語言），也刻意不做注入樣式的字面比對——關鍵詞列舉在多語言下不可能窮盡。內容意圖一律交給 G1。',
    segment: 'entry',
  },
  {
    code: 'G1',
    kind: 'gate',
    name: '意圖判定',
    method: 'ai',
    limit: 'fail closed；不與報告生成共用 context',
    detail:
      '唯一做內容意圖判斷的一關。回傳 in_scope 與 has_directive，溫度 0、獨立呼叫。句級判定，任一句被判為指令型就整筆拒絕。逾時或格式錯誤一律拒絕——守門 fail closed，與報告生成失敗時盡量交付的方向刻意相反。它是 LLM、可以被說服，所以不是最後一道。',
    segment: 'entry',
  },
  {
    code: 'L6',
    kind: 'layer',
    name: '對應勞基法條文',
    method: 'rule',
    limit: '向量檢索 Top-K = 5 ＋ 條文代碼 join',
    detail:
      'mistral-embed（1024 維）、HNSW ＋ cosine，Top-K 先設 5，rerank 延後。這一版它從「分類的下游」變成整條路徑的入口。未經顧問核准，AI 不得自行擴寫法律結論。',
    segment: 'middle',
    start: true,
  },
  {
    code: 'L1',
    kind: 'layer',
    name: '四大類',
    method: 'lookup',
    limit: '零 AI，由 L6 條文回推總表',
    detail:
      '取 decision_tree 的 l1_code（A/B/C/D）與 l1_animal、l1_scope，直接由檢索到的條文 l1_codes 反查得到，不經模型。',
    segment: 'middle',
  },
  {
    code: 'L2',
    kind: 'layer',
    name: '22 個主題',
    method: 'lookup',
    limit: '同一次反查的副產物',
    detail: '條文的 l2_codes 是多值陣列，反查總表即得，沒有額外一次模型呼叫。',
    segment: 'middle',
  },
  {
    code: 'L3',
    kind: 'layer',
    name: '85 個題型',
    method: 'lookup',
    limit: '無命中走 unclassified 出口，不強制歸類',
    detail:
      '主鍵 l3_code，85 列。條文表的 l3_codes 建了 GIN 索引，「總表整合」那一步就是拿它比對。任何情況都保留「無法分類／超出範圍」的出口。',
    segment: 'middle',
  },
  {
    code: 'G2',
    kind: 'gate',
    name: '檢索幾何',
    method: 'rule',
    limit: 'top1／mean@5／margin 三個統計量',
    detail:
      '分類確定的同時就有 similarity 可用。top1 < τ_low 判超出範圍；τ_low ≤ top1 < τ_high 或 margin 過小則列 2–3 候選待人工確認。門檻待校準，換 embedding 模型必須重新校準。',
    segment: 'middle',
    backstop: true,
  },
  {
    code: 'L4',
    kind: 'layer',
    name: '必要事實清單',
    method: 'rule',
    limit: '規格未到，不做',
    detail: '顧問師規格未交付。刻意不自己補一版，避免規格到位後要拆。',
    segment: 'middle',
    skipped: true,
  },
  {
    code: 'L5',
    kind: 'layer',
    name: '追問問題',
    method: 'rule',
    limit: '規格未到，不做',
    detail:
      '單選、選項加減地雷。它沒做，就是下面 L7／L8 只能停在初始值的原因——不是漏了，是被卡住。',
    segment: 'middle',
    skipped: true,
  },
  {
    code: 'L7',
    kind: 'layer',
    name: '地雷數',
    method: 'rule',
    limit: 'initial_mines 取 DB 值，模型改不動',
    detail:
      'initial_mines ＝ 頻率分（低 1／中 2／高 3）＋ 風險分（低 0／中 1／高 2），85 列零例外，由 CHECK 守著。實際值要等 L5 追問加減後才算得出來，這一版拿到的是靜態初始值。',
    segment: 'middle',
  },
  {
    code: 'L8',
    kind: 'layer',
    name: '顧問介入程度',
    method: 'rule',
    limit: 'initial_intervention 取 DB 值，模型改不動',
    detail:
      '門檻是 1 顆低、2–3 顆中、4 顆高、5 顆以上急迫，同樣有 CHECK 守著。輸入是凍結的 L7，輸出自然也是凍結的。',
    segment: 'middle',
  },
  {
    code: 'G3',
    kind: 'gate',
    name: '輸出白名單',
    method: 'rule',
    limit: '條文 ⊆ 檢索集合；禁貨幣數字；語氣詞黑名單',
    detail:
      '不檢查「有沒有壞東西」，檢查「每一格是不是來自允許的來源」。l3_code 必須 ∈ 本次候選集合，article_codes 必須 ⊆ 本次檢索結果，風險等級與地雷數直接取 DB 值。另掛語意對稱檢查與矛盾偵測，成本近乎為零。',
    segment: 'middle',
    backstop: true,
  },
  {
    code: 'L9',
    kind: 'layer',
    name: '白話檢測報告',
    method: 'ai',
    limit: '固定七章節；不得新增事實、條文或法律結論',
    detail:
      '自撰 prompt ＋ Codex 5.6 Luna。七章節：問題摘要／命中題型／涉及條文／風險等級與地雷數／缺漏事實／建議下一步／顧問介入程度，固定不得增刪。這是規格未到前的暫代出口，不是 L9。',
    segment: 'exit',
  },
  {
    code: 'L10',
    kind: 'layer',
    name: '顧問推薦',
    method: 'ai',
    limit: '規格未到，不做',
    detail: '依題型與介入程度推薦顧問師並記錄轉介。規格未到，這一版不做。',
    segment: 'exit',
    skipped: true,
  },
]

const AI_COUNT = STEPS.filter((s) => s.method === 'ai').length
const NON_AI_COUNT = STEPS.length - AI_COUNT

// ── 樣式 ────────────────────────────────────────────────

const METHOD_LABEL: Record<Method, string> = {
  ai: 'AI',
  lookup: '反查',
  rule: '規則',
}

const METHOD_ICON: Record<Method, LucideIcon> = {
  ai: Bot,
  lookup: Search,
  rule: Ruler,
}

const METHOD_BADGE: Record<Method, string> = {
  ai: 'bg-[var(--warning-500)]/15 text-[var(--neutral-800)]',
  lookup: 'bg-[var(--blue-50)] text-[var(--blue-700)]',
  rule: 'bg-[var(--neutral-100)] text-[var(--neutral-600)]',
}

const METHOD_CARD: Record<Method, string> = {
  ai: 'border-[var(--warning-500)] bg-[var(--warning-50)]',
  lookup: 'border-[var(--blue-300)] bg-[var(--neutral-0)]',
  rule: 'border-[var(--neutral-300)] bg-[var(--neutral-0)]',
}

const SEGMENTS: { key: Segment; title: string; sub: string }[] = [
  { key: 'entry', title: '入口', sub: '守門' },
  { key: 'middle', title: '中段', sub: `不經模型（${NON_AI_COUNT - 1} 個節點）` },
  { key: 'exit', title: '出口', sub: '生成' },
]

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'ai', label: '只看 AI' },
  { key: 'rule', label: '只看規則' },
]

/** 依篩選決定某一步是亮著還是收進虛線帶 */
function isLit(step: Step, filter: Filter): boolean {
  if (filter === 'all') return true
  if (filter === 'ai') return step.method === 'ai'
  return step.method !== 'ai'
}

// ── 模型介入帶 ──────────────────────────────────────────

function InterventionRail({ method, dimmed }: { method: Method; dimmed: boolean }) {
  const ai = method === 'ai'
  return (
    <div className="flex w-2 shrink-0 justify-center" aria-hidden="true">
      <span
        className={clsx(
          'h-full transition-colors',
          ai
            ? 'w-2 rounded-[var(--radius-pill)] bg-[var(--warning-500)]'
            : 'w-px bg-[var(--neutral-300)]',
          dimmed && 'opacity-30',
        )}
      />
    </div>
  )
}

// ── 收合帶 ──────────────────────────────────────────────

function CollapsedBand({ text }: { text: string }) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      initial={{ opacity: 0, scaleY: reduced ? 1 : 0.6 }}
      animate={{ opacity: 1, scaleY: 1 }}
      transition={{ duration: reduced ? 0 : 0.25, ease: 'easeOut' }}
      className="ml-4 flex items-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-[var(--neutral-300)] bg-[var(--surface-sunken)] px-3.5 py-2.5"
    >
      <CircleSlash size={14} className="shrink-0 text-[var(--neutral-400)]" />
      <span className="text-xs text-[var(--text-muted)]">{text}</span>
    </motion.div>
  )
}

// ── 單列 ────────────────────────────────────────────────

function StepRow({
  step,
  expanded,
  onToggle,
  filter,
}: {
  step: Step
  expanded: boolean
  onToggle: () => void
  filter: Filter
}) {
  const reduced = useReducedMotion()
  const MethodIcon = METHOD_ICON[step.method]
  const GateIcon = step.method === 'ai' ? ShieldOff : ShieldCheck
  const showBackstop = filter === 'rule' && step.backstop

  return (
    <motion.li
      initial={{ opacity: 0, y: reduced ? 0 : 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.25, ease: 'easeOut' }}
      className="flex gap-2"
    >
      <InterventionRail method={step.method} dimmed={!!step.skipped} />

      <div className="min-w-0 flex-1 pb-2">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className={clsx(
            'w-full rounded-[var(--radius-lg)] border px-3.5 py-2.5 text-left transition-colors',
            'hover:border-[var(--blue-500)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]',
            step.skipped
              ? 'border-dashed border-[var(--neutral-300)] bg-transparent'
              : METHOD_CARD[step.method],
            step.kind === 'gate' && !step.skipped && 'border-l-4',
          )}
        >
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span
              className={clsx(
                'shrink-0 rounded-[var(--radius-sm)] px-1.5 py-0.5 font-mono text-xs font-semibold',
                step.skipped
                  ? 'bg-[var(--neutral-100)] text-[var(--neutral-500)]'
                  : step.kind === 'gate'
                    ? 'bg-[var(--neutral-800)] text-[var(--text-on-brand)]'
                    : 'bg-[var(--blue-50)] text-[var(--blue-700)]',
              )}
            >
              {step.code}
            </span>

            {step.kind === 'gate' && (
              <GateIcon
                size={14}
                className={
                  step.method === 'ai'
                    ? 'shrink-0 text-[var(--warning-500)]'
                    : 'shrink-0 text-[var(--neutral-500)]'
                }
              />
            )}

            <span
              className={clsx(
                'text-sm font-semibold',
                step.skipped ? 'text-[var(--neutral-500)]' : 'text-[var(--text-strong)]',
              )}
            >
              {step.name}
            </span>

            {step.start && (
              <span className="rounded-[var(--radius-pill)] bg-[var(--blue-600)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-on-brand)]">
                起點
              </span>
            )}

            {step.skipped && (
              <span className="flex items-center gap-1 rounded-[var(--radius-pill)] bg-[var(--neutral-100)] px-2 py-0.5 text-[11px] font-medium text-[var(--neutral-500)]">
                <Snowflake size={10} />
                不做
              </span>
            )}

            <span className="ml-auto flex shrink-0 items-center gap-1.5">
              <span
                className={clsx(
                  'flex items-center gap-1 rounded-[var(--radius-pill)] px-2 py-0.5 text-[11px] font-semibold',
                  METHOD_BADGE[step.method],
                )}
              >
                <MethodIcon size={11} />
                {METHOD_LABEL[step.method]}
              </span>
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
              step.skipped ? 'text-[var(--neutral-500)]' : 'text-[var(--text-body)]',
            )}
          >
            {step.limit}
          </p>

          {showBackstop && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: reduced ? 0 : 0.25, ease: 'easeOut' }}
              className="mt-2 inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-[var(--blue-50)] px-2.5 py-1 text-[11px] font-semibold text-[var(--blue-700)]"
            >
              <ShieldCheck size={12} />
              兜底：不經模型
            </motion.p>
          )}

          {expanded && (
            <motion.p
              initial={{ opacity: 0, y: reduced ? 0 : -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduced ? 0 : 0.22, ease: 'easeOut' }}
              className="mt-2.5 border-t border-[var(--border-subtle)] pt-2.5 text-xs leading-relaxed text-[var(--text-muted)]"
            >
              {step.detail}
            </motion.p>
          )}
        </button>
      </div>
    </motion.li>
  )
}

// ── 主元件 ──────────────────────────────────────────────

export default function AiInterventionPipeline() {
  const [filter, setFilter] = useState<Filter>('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="not-prose mx-auto w-full max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="切換介入方式篩選"
          className="inline-flex rounded-[var(--radius-pill)] bg-[var(--surface-sunken)] p-1"
        >
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={clsx(
                'rounded-[var(--radius-pill)] px-3.5 py-1.5 text-xs font-medium transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]',
                filter === f.key
                  ? 'bg-[var(--action-primary)] text-[var(--text-on-brand)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-strong)]',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <p className="max-w-sm text-xs leading-relaxed text-[var(--text-muted)]">
          {STEPS.length} 個節點，只有 {AI_COUNT} 個碰模型；四道閘門，只有 1 道是 AI。
        </p>
      </div>

      <div className="space-y-3">
        {SEGMENTS.map((seg) => {
          const steps = STEPS.filter((s) => s.segment === seg.key)
          const lit = steps.filter((s) => isLit(s, filter))
          const hidden = steps.length - lit.length

          return (
            <section key={seg.key}>
              <div className="mb-1.5 flex items-center gap-2">
                <span className="text-xs font-semibold text-[var(--text-strong)]">
                  {seg.title}
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">{seg.sub}</span>
                <span className="h-px flex-1 bg-[var(--border-subtle)]" />
              </div>

              <ul className="list-none pl-0">
                {lit.map((step) => (
                  <StepRow
                    key={step.code}
                    step={step}
                    filter={filter}
                    expanded={expanded === step.code}
                    onToggle={() =>
                      setExpanded(expanded === step.code ? null : step.code)
                    }
                  />
                ))}
              </ul>

              {hidden > 0 && (
                <CollapsedBand
                  text={
                    filter === 'ai'
                      ? `${steps
                          .filter((s) => !isLit(s, filter))
                          .map((s) => s.code)
                          .join('、')}：${hidden} 個節點，不經模型`
                      : `${steps
                          .filter((s) => !isLit(s, filter))
                          .map((s) => s.code)
                          .join('、')}：${hidden} 個節點碰模型`
                  }
                />
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
