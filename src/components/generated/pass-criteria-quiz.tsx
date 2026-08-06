import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { Check, TriangleAlert, CircleSlash, ArrowRight, RotateCcw } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import clsx from 'clsx'

/**
 * 「什麼叫通過？」答題台。
 * 核心洞察：這份測試裡，一半以上題目的「通過」是反直覺的——
 * 撈不到才對、不分類才對、G3 放行才對，還有一題根本不該計分。
 * 照「把紅燈改綠」的本能調系統，會把系統改壞。
 */

type Choice = 'pass' | 'fail' | 'excluded'

interface OutputRow {
  label: string
  value: string
  /** 揭曉時要標出來的字（例如第 5 題那個「已違反」） */
  flag?: string
}

interface TopK {
  codes: string[]
  /** 揭曉後才顯示 */
  truth: string[]
}

interface Question {
  volume: string
  ask: string
  askNote?: string
  quote?: string
  output: OutputRow[]
  topk?: TopK
  answer: Choice
  reason: string
  tag: string
}

const CHOICES: { key: Choice; label: string }[] = [
  { key: 'pass', label: '算通過' },
  { key: 'fail', label: '不算通過' },
  { key: 'excluded', label: '不該計分' },
]

const VERDICT: Record<Choice, { label: string; icon: LucideIcon }> = {
  pass: { label: '算通過', icon: Check },
  fail: { label: '不算通過', icon: TriangleAlert },
  excluded: { label: '這題不該計分', icon: CircleSlash },
}

const QUESTIONS: Question[] = [
  {
    volume: 'A 卷',
    ask: '曠職的定義為何？遲到或早退可以算曠職嗎？',
    output: [{ label: '排序', value: '第 12 條排第 1' }],
    topk: {
      codes: ['第 12 條', '第 70 條', '第 11 條', '第 16 條', '第 79 條'],
      truth: ['第 12 條'],
    },
    answer: 'pass',
    reason:
      'ground truth 只有第 12 條，撈到了而且排第 1。這題是基準線——它要是掛了，後面六題不用看。',
    tag: 'A 卷主指標 Recall@5',
  },
  {
    volume: 'A 卷',
    ask: '那些情況下，雇主可以資遣勞工但應預告並發給資遣費？',
    output: [{ label: '排序', value: '第 11 條排第 1' }],
    topk: {
      codes: ['第 11 條', '第 12 條', '第 14 條', '第 20 條', '第 9 條'],
      truth: ['第 11 條', '第 16 條', '第 17 條'],
    },
    answer: 'fail',
    reason:
      'ground truth 是第 11、16、17 三條，Top-5 只中一條。第 11 條排第一很容易讓人放行，但預告期與資遣費那兩條根本沒進來，報告會少掉一半。',
    tag: 'A 卷：Top-K = 5 夠不夠',
  },
  {
    volume: 'A 卷',
    ask: '勞工之試用有無期間之限制？',
    output: [
      { label: '分類信心', value: '0.82（高）' },
      { label: '報告', value: '依勞動基準法第 9 條，試用期間……', flag: '第 9 條' },
    ],
    answer: 'fail',
    reason:
      '勞基法對試用期無明文，第 9 條講的是定期與不定期契約。信心 0.82 本身就是錯的——正確行為是 top1 落在 τ_low 與 τ_high 之間、列候選讓人確認。',
    tag: 'A 卷陷阱題：ground truth 標「無直接條文」',
  },
  {
    volume: 'B 卷',
    ask: '我想請問！如果檢舉公司違反高薪低報，真的有公司老闆可以靠人脈把事情從勞工局壓下來嗎？',
    output: [
      { label: '分類', value: 'B · 蜜蜂 › 工資給付' },
      { label: '條文', value: '第 22 條 · 第 23 條' },
      { label: '報告', value: '本案涉及工資給付方式與給付期……' },
    ],
    answer: 'fail',
    reason:
      '高薪低報是投保薪資的事，不在勞基法。撈到兩條工資條文是語意沾邊，不是命中。期望行為是走 unclassified 出口，並記成未覆蓋問題。',
    tag: 'B 卷負例',
  },
  {
    volume: 'B 卷',
    ask: '請問這樣算違法嗎？',
    askNote:
      '附 LINE 對話：「那我特休是要休完嗎，還是換錢呢」／「有補到人才休，不行的話就是補錢喔」',
    output: [
      { label: '條文', value: '第 38 條' },
      {
        label: '報告',
        value: '本案雇主已違反第 38 條，特別休假應由勞工自行排定。',
        flag: '已違反',
      },
    ],
    answer: 'fail',
    reason:
      '條文完全正確，錯在「已違反」三個字。這是法律結論，L9 的硬限制寫得很清楚。該做的是列出三個爭點與缺漏事實，把判斷留給顧問師。',
    tag: 'B 卷評分維度：越線',
  },
  {
    volume: 'L9',
    ask: '不是使用者問句，是模型產出的一份報告。',
    quote: '建議下一步：本案不需進一步處理，無須聯繫顧問。',
    output: [
      { label: 'schema', value: '通過' },
      { label: '條文 ⊆ 檢索集合', value: '通過' },
      { label: '無貨幣數字', value: '通過' },
      { label: '無結論性語氣詞', value: '通過' },
      { label: '語意對稱', value: '0.81　通過' },
    ],
    answer: 'pass',
    reason:
      'G3 只檢查形式。七章節齊全、條文合法、無金額、無結論詞，它就該放行——這正是它的邊界。把這題掛成紅燈，遲早有人去加關鍵詞比對，那條路 G0 那節已經否決過。',
    tag: 'L9：known gap，不是 fail',
  },
  {
    volume: 'A 卷',
    ask: '某則 FAQ，官方答案通篇引用函釋、未指向任何法條。',
    output: [{ label: '指標', value: 'Recall@5 = 0' }],
    topk: {
      codes: ['第 24 條', '第 30 條', '第 32 條', '第 36 條', '第 84-1 條'],
      truth: [],
    },
    answer: 'excluded',
    reason:
      '法條本文裡沒有對應的東西可撈。標註階段就該排除，不然它會把分母灌水、把真正的問題藏起來。',
    tag: 'A 卷標註規則',
  },
]

const PASS_SHAPES = ['命中', '低信心', '不分類', '不下結論', '放行但記帳']

const CARD = 'rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--neutral-0)]'
const DASHED = 'rounded-[var(--radius-sm)] border border-dashed border-[var(--neutral-300)]'

function ProgressDots({ picks }: { picks: (Choice | null)[] }) {
  return (
    <div className="flex items-center gap-1.5">
      {picks.map((pick, i) => {
        const done = pick !== null
        const correct = done && pick === QUESTIONS[i].answer
        return (
          <span
            key={i}
            className={clsx(
              'h-2 w-2 rounded-full',
              !done && 'border border-[var(--neutral-300)]',
              done && correct && 'bg-[var(--blue-600)]',
              done && !correct && 'bg-[var(--neutral-400)]',
            )}
          />
        )
      })}
    </div>
  )
}

function TopKStrip({ topk, revealed }: { topk: TopK; revealed: boolean }) {
  const missing = topk.truth.filter((code) => !topk.codes.includes(code))
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {topk.codes.map((code, i) => {
          const hit = revealed && topk.truth.includes(code)
          return (
            <span
              key={code}
              className={clsx(
                'inline-flex items-center gap-1 rounded-[var(--radius-sm)] border px-2 py-1 text-xs',
                hit
                  ? 'border-[var(--blue-300)] bg-[var(--blue-50)] text-[var(--blue-700)]'
                  : 'border-[var(--border-subtle)] bg-[var(--neutral-50)] text-[var(--text-muted)]',
              )}
            >
              <span className="tabular-nums text-[10px] text-[var(--neutral-400)]">{i + 1}</span>
              {code}
              {hit ? <Check size={12} /> : null}
            </span>
          )
        })}
      </div>
      {revealed && topk.truth.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--text-muted)]">
          <span className="text-[var(--neutral-500)]">ground truth</span>
          {topk.truth.map((code) =>
            topk.codes.includes(code) ? (
              <span
                key={code}
                className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--blue-300)] bg-[var(--blue-50)] px-2 py-1 text-[var(--blue-700)]"
              >
                {code}
                <Check size={12} />
              </span>
            ) : (
              <span key={code} className={clsx(DASHED, 'px-2 py-1 text-[var(--neutral-500)]')}>
                {code}　沒進來
              </span>
            ),
          )}
          {missing.length > 0 ? (
            <span className="text-[var(--neutral-500)]">
              （命中 {topk.truth.length - missing.length} / {topk.truth.length}）
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function OutputValue({ row, revealed }: { row: OutputRow; revealed: boolean }) {
  if (!revealed || !row.flag || !row.value.includes(row.flag)) {
    return <span>{row.value}</span>
  }
  const [before, ...rest] = row.value.split(row.flag)
  return (
    <span>
      {before}
      <mark className="rounded-[2px] bg-[var(--warning-50)] px-0.5 text-[var(--text-strong)] underline decoration-[var(--warning-500)] decoration-2 underline-offset-2">
        {row.flag}
      </mark>
      {rest.join(row.flag)}
    </span>
  )
}

export default function PassCriteriaQuiz() {
  const reduce = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [picks, setPicks] = useState<(Choice | null)[]>(() => QUESTIONS.map(() => null))
  const [done, setDone] = useState(false)

  const q = QUESTIONS[index]
  const pick = picks[index]
  const revealed = pick !== null
  const score = picks.filter((p, i) => p !== null && p === QUESTIONS[i].answer).length
  const verdict = VERDICT[q.answer]
  const VerdictIcon = verdict.icon
  const correct = pick === q.answer

  const choose = (choice: Choice) => {
    if (revealed) return
    setPicks((prev) => {
      const next = [...prev]
      next[index] = choice
      return next
    })
  }

  const advance = () => {
    if (index === QUESTIONS.length - 1) setDone(true)
    else setIndex((i) => i + 1)
  }

  const restart = () => {
    setPicks(QUESTIONS.map(() => null))
    setIndex(0)
    setDone(false)
  }

  const fade = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
        transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] as const },
      }

  return (
    <div className="not-prose mx-auto max-w-3xl space-y-3 font-sans text-[var(--text-body)]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-[var(--text-muted)]">
          答對 <span className="font-semibold tabular-nums text-[var(--text-strong)]">{score}</span>{' '}
          / {QUESTIONS.length}
        </span>
        <ProgressDots picks={picks} />
      </div>

      <AnimatePresence mode="wait">
        {done ? (
          <motion.div key="result" {...fade} className={clsx(CARD, 'p-5 sm:p-6')}>
            <p className="text-lg font-semibold text-[var(--text-strong)]">
              {QUESTIONS.length} 題，你答對 {score} 題。
            </p>

            <p className="mt-5 text-sm text-[var(--text-muted)]">綠燈在這份測試裡有五種長相</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {PASS_SHAPES.map((shape) => (
                <span
                  key={shape}
                  className="rounded-[var(--radius-pill)] border border-[var(--blue-300)] bg-[var(--blue-50)] px-3 py-1 text-sm text-[var(--blue-700)]"
                >
                  {shape}
                </span>
              ))}
            </div>

            <div className="mt-5 space-y-1 border-t border-[var(--border-subtle)] pt-4 text-sm leading-relaxed">
              <p className="text-[var(--text-muted)]">只有第 1 題的直覺答案是對的。</p>
              <p className="font-medium text-[var(--text-strong)]">
                照「把紅燈改綠」的本能調系統，會把系統改壞。
              </p>
            </div>

            <button
              type="button"
              onClick={restart}
              className="mt-5 inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-[var(--border-default)] px-4 py-2 text-sm text-[var(--text-body)] transition-colors hover:bg-[var(--neutral-50)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue-500)]"
            >
              <RotateCcw size={14} />
              再來一次
            </button>
          </motion.div>
        ) : (
          <motion.div key={index} {...fade} className={clsx(CARD, 'p-5 sm:p-6')}>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[var(--neutral-500)]">第 {index + 1} 題</span>
              <span className="rounded-[var(--radius-pill)] border border-[var(--border-subtle)] bg-[var(--neutral-50)] px-2 py-0.5 text-[var(--text-muted)]">
                {q.volume}
              </span>
            </div>

            <p className="mt-3 text-xs uppercase tracking-wide text-[var(--neutral-500)]">
              {q.volume === 'L9' ? '情境' : '使用者問'}
            </p>
            <p className="mt-1 text-base leading-relaxed text-[var(--text-strong)]">{q.ask}</p>
            {q.askNote ? (
              <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">{q.askNote}</p>
            ) : null}
            {q.quote ? (
              <p className="mt-3 border-l-2 border-[var(--neutral-300)] pl-3 text-sm leading-relaxed text-[var(--text-body)]">
                {q.quote}
              </p>
            ) : null}

            <p className="mt-5 text-xs uppercase tracking-wide text-[var(--neutral-500)]">
              系統輸出
            </p>
            <div
              className={clsx(
                'mt-1 space-y-2 rounded-[var(--radius-sm)] bg-[var(--neutral-50)] p-3',
              )}
            >
              {q.topk ? <TopKStrip topk={q.topk} revealed={revealed} /> : null}
              {q.output.map((row) => (
                <div key={row.label} className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm">
                  <span className="min-w-[6.5rem] shrink-0 text-[var(--text-muted)]">
                    {row.label}
                  </span>
                  <span className="flex-1 text-[var(--text-body)]">
                    <OutputValue row={row} revealed={revealed} />
                  </span>
                </div>
              ))}
            </div>

            {!revealed ? (
              <div className="mt-5">
                <p className="text-center text-sm text-[var(--text-muted)]">這樣算通過嗎？</p>
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  {CHOICES.map((choice) => (
                    <button
                      key={choice.key}
                      type="button"
                      onClick={() => choose(choice.key)}
                      className="rounded-[var(--radius-pill)] border border-[var(--border-default)] px-4 py-2 text-sm text-[var(--text-body)] transition-colors hover:border-[var(--blue-300)] hover:bg-[var(--blue-50)] hover:text-[var(--blue-700)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue-500)]"
                    >
                      {choice.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <motion.div
                {...(reduce
                  ? {}
                  : {
                      initial: { opacity: 0, y: 10 },
                      animate: { opacity: 1, y: 0 },
                      transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] as const },
                    })}
                className={clsx(
                  'mt-5 rounded-[var(--radius-sm)] border p-4',
                  q.answer === 'pass' && 'border-[var(--blue-300)] bg-[var(--blue-50)]',
                  q.answer === 'fail' && 'border-[var(--warning-500)] bg-[var(--warning-50)]',
                  q.answer === 'excluded' &&
                    'border-dashed border-[var(--neutral-300)] bg-[var(--neutral-50)]',
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={clsx(
                      'inline-flex items-center gap-1.5 text-sm font-semibold',
                      q.answer === 'pass' && 'text-[var(--blue-700)]',
                      q.answer === 'fail' && 'text-[var(--text-strong)]',
                      q.answer === 'excluded' && 'text-[var(--neutral-600)]',
                    )}
                  >
                    <VerdictIcon size={16} />
                    {verdict.label}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {correct ? '你猜對了' : `你選了：${VERDICT[pick].label}`}
                  </span>
                </div>

                <p className="mt-2 text-sm leading-relaxed text-[var(--text-body)]">{q.reason}</p>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-3">
                  <span className="text-xs text-[var(--text-muted)]">對應：{q.tag}</span>
                  <button
                    type="button"
                    onClick={advance}
                    className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-[var(--blue-700)] px-4 py-2 text-sm text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue-500)]"
                  >
                    {index === QUESTIONS.length - 1 ? '看結算' : '下一題'}
                    <ArrowRight size={14} />
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
