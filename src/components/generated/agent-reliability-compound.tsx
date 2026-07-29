import { useState, useMemo } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { TriangleAlert, Check } from 'lucide-react'

/**
 * Agent 可靠度複利崩塌互動。
 * 核心洞察：單步看起來很高、全程其實很低；換更強的模型不會修好網路逾時，
 * 只有 checkpoint 與 resume 可以。兩個滑桿讓讀者親手拖出這個落差。
 */

type Level = 'ok' | 'warn' | 'bad'

const COLOR: Record<Level, string> = {
  ok: 'var(--success-500)',
  warn: 'var(--warning-500)',
  bad: 'var(--danger-500)',
}
const SOFT: Record<Level, string> = {
  ok: 'var(--success-50)',
  warn: 'var(--warning-50)',
  bad: 'var(--danger-50)',
}

function levelOf(p: number): Level {
  if (p >= 0.5) return 'ok'
  if (p >= 0.25) return 'warn'
  return 'bad'
}

function fmtPct(p: number): string {
  const v = p * 100
  if (v >= 10) return `${Math.round(v)}%`
  if (v >= 1) return `${v.toFixed(1)}%`
  return `${v.toFixed(2)}%`
}

export default function AgentReliabilityCompound() {
  const reduce = useReducedMotion() ?? false
  const [steps, setSteps] = useState(10)
  const [rate, setRate] = useState(85)

  const { overall, level } = useMemo(() => {
    const p = Math.pow(rate / 100, steps)
    return { overall: p, level: levelOf(p) }
  }, [rate, steps])

  const chain = useMemo(
    () => Array.from({ length: steps }, (_, i) => Math.pow(rate / 100, i + 1)),
    [rate, steps],
  )

  return (
    <div className="not-prose max-w-2xl mx-auto space-y-6">
      {/* ── 三個對照數字 ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[var(--blue-50)] rounded-[var(--radius-lg)] p-4 text-center">
          <div className="text-xs text-[var(--text-muted)] mb-1">單步成功率</div>
          <div className="text-2xl font-bold text-[var(--blue-700)]">{rate}%</div>
        </div>
        <div className="bg-[var(--neutral-100)] rounded-[var(--radius-lg)] p-4 text-center">
          <div className="text-xs text-[var(--text-muted)] mb-1">步驟數</div>
          <div className="text-2xl font-bold text-[var(--neutral-700)]">{steps}</div>
        </div>
        <div
          className="rounded-[var(--radius-lg)] p-4 text-center"
          style={{ background: SOFT[level] }}
        >
          <div className="text-xs text-[var(--text-muted)] mb-1">全程走完</div>
          {reduce ? (
            <div className="text-2xl font-bold" style={{ color: COLOR[level] }}>
              {fmtPct(overall)}
            </div>
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={fmtPct(overall)}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="text-2xl font-bold"
                style={{ color: COLOR[level] }}
              >
                {fmtPct(overall)}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* ── 步驟鏈：存活率沿鏈遞減 ── */}
      <div>
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
          <span>步驟鏈（每格的深淺＝走到這一步還沒失敗的機率）</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {chain.map((survival, i) => (
            <motion.div
              key={i}
              title={`第 ${i + 1} 步：${fmtPct(survival)}`}
              className="h-8 flex-1 min-w-[18px] rounded-[6px]"
              style={{ background: 'var(--blue-500)' }}
              initial={reduce ? undefined : { opacity: 0 }}
              animate={{ opacity: Math.max(0.14, survival) }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            />
          ))}
        </div>
      </div>

      {/* ── 全程走完機率條 ── */}
      <div>
        <div className="flex items-center justify-between text-sm mb-1.5">
          <span className="font-medium text-[var(--text-body)]">全程走完機率</span>
          <span className="font-semibold" style={{ color: COLOR[level] }}>{fmtPct(overall)}</span>
        </div>
        <div className="w-full h-3 rounded-[var(--radius-pill)] bg-[var(--neutral-100)] overflow-hidden">
          <motion.div
            className="h-full rounded-[var(--radius-pill)]"
            style={{ background: COLOR[level] }}
            initial={false}
            animate={{ width: `${Math.max(overall * 100, 1.5)}%` }}
            transition={{ duration: reduce ? 0 : 0.3, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* ── 兩個滑桿 ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="font-medium text-[var(--text-body)]">步驟數（tool call）</span>
            <span className="font-semibold text-[var(--blue-700)]">{steps} 步</span>
          </div>
          <input
            type="range" min={1} max={20} step={1} value={steps}
            onChange={(e) => setSteps(Number(e.target.value))}
            className="w-full accent-[var(--blue-700)]"
            aria-label="步驟數"
          />
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="font-medium text-[var(--text-body)]">每步成功率</span>
            <span className="font-semibold text-[var(--blue-700)]">{rate}%</span>
          </div>
          <input
            type="range" min={50} max={99} step={1} value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="w-full accent-[var(--blue-700)]"
            aria-label="每步成功率"
          />
        </div>
      </div>

      {/* ── 洞察 callout ── */}
      <div
        className="flex gap-3 rounded-[var(--radius-lg)] p-4 text-sm leading-relaxed"
        style={{ background: SOFT[level], color: 'var(--text-body)' }}
      >
        <span className="shrink-0 mt-0.5" style={{ color: COLOR[level] }}>
          {level === 'ok' ? <Check size={18} /> : <TriangleAlert size={18} />}
        </span>
        <p className="m-0">
          單步 <strong style={{ color: 'var(--blue-700)' }}>{rate}%</strong> 看起來很高，但
          <strong> {steps} </strong>步之後只剩 <strong style={{ color: COLOR[level] }}>{fmtPct(overall)}</strong>。
          換更強的模型不會修好網路逾時——只有 checkpoint 與 resume 可以。
        </p>
      </div>
    </div>
  )
}
