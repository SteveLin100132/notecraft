import { useState, useMemo } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { HardDrive, Gauge, Sparkles } from 'lucide-react'

/**
 * 向量儲存成本互動：維度 × 精度（量化）的取捨。
 * 核心洞察：從 float32 × 2048 降到 int8 × 512 或 binary × 1024，
 * 儲存可省九成以上，品質只掉一點。相對品質／速度為示意，非實測基準。
 */

type Dtype = 'float32' | 'int8' | 'binary'

const DIMS = [256, 512, 1024, 2048] as const
const DTYPES: { id: Dtype; label: string }[] = [
  { id: 'float32', label: 'float32' },
  { id: 'int8', label: 'int8' },
  { id: 'binary', label: 'binary' },
]

const BYTES_PER_DIM: Record<Dtype, number> = { float32: 4, int8: 1, binary: 1 / 8 }
// 示意用相對係數（非實測基準）
const DIM_QUALITY: Record<number, number> = { 256: 0.88, 512: 0.93, 1024: 0.97, 2048: 1.0 }
const DTYPE_QUALITY: Record<Dtype, number> = { float32: 1.0, int8: 0.985, binary: 0.94 }
const DTYPE_SPEED_FACTOR: Record<Dtype, number> = { float32: 1, int8: 0.6, binary: 1 / 32 }

const BASELINE_BYTES = 2048 * BYTES_PER_DIM.float32 // float32 × 2048
const BASELINE_COST = 2048 * DTYPE_SPEED_FACTOR.float32

function fmtBytes(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} GB`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)} KB`
  return `${Math.round(n)} B`
}

function fmtCount(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`
  if (n >= 1e3) return `${Math.round(n / 1e3)}K`
  return String(n)
}

export default function EmbeddingDimensionTradeoff() {
  const reduce = useReducedMotion() ?? false
  const [dim, setDim] = useState<number>(1024)
  const [dtype, setDtype] = useState<Dtype>('float32')
  const [chunks, setChunks] = useState<number>(1_000_000)

  const m = useMemo(() => {
    const perVec = dim * BYTES_PER_DIM[dtype]
    const total = perVec * chunks
    const savings = Math.max(0, (1 - perVec / BASELINE_BYTES) * 100)
    const quality = 100 * DIM_QUALITY[dim] * DTYPE_QUALITY[dtype]
    const cost = dim * DTYPE_SPEED_FACTOR[dtype]
    const speedX = BASELINE_COST / cost
    return { perVec, total, savings, quality, speedX }
  }, [dim, dtype, chunks])

  const relWidth = Math.max(1.5, (m.perVec / BASELINE_BYTES) * 100)

  return (
    <div className="not-prose max-w-2xl mx-auto space-y-6">
      {/* ── 主要數字 ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[var(--blue-50)] rounded-[var(--radius-lg)] p-4 text-center">
          <div className="text-xs text-[var(--text-muted)] mb-1">每筆向量</div>
          <div className="text-2xl font-bold text-[var(--blue-700)]">{fmtBytes(m.perVec)}</div>
        </div>
        <div className="bg-[var(--blue-50)] rounded-[var(--radius-lg)] p-4 text-center">
          <div className="text-xs text-[var(--text-muted)] mb-1">總儲存（{fmtCount(chunks)} 筆）</div>
          {reduce ? (
            <div className="text-2xl font-bold text-[var(--blue-700)]">{fmtBytes(m.total)}</div>
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={fmtBytes(m.total)}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="text-2xl font-bold text-[var(--blue-700)]"
              >
                {fmtBytes(m.total)}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
        <div className="bg-[var(--success-50)] rounded-[var(--radius-lg)] p-4 text-center">
          <div className="text-xs text-[var(--text-muted)] mb-1">比 float32×2048 省</div>
          <div className="text-2xl font-bold text-[var(--success-500)]">{m.savings.toFixed(m.savings >= 99 ? 1 : 0)}%</div>
        </div>
      </div>

      {/* ── 儲存量長條（相對基準）── */}
      <div>
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-2">
          <HardDrive size={13} />
          <span>每筆向量儲存（相對 float32 × 2048 = 100%）</span>
        </div>
        <div className="w-full h-4 rounded-[var(--radius-pill)] bg-[var(--neutral-100)] overflow-hidden">
          <motion.div
            className="h-full rounded-[var(--radius-pill)] bg-[var(--blue-500)]"
            initial={false}
            animate={{ width: `${relWidth}%` }}
            transition={{ duration: reduce ? 0 : 0.3, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* ── 示意指標：品質 / 速度 ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] p-3">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-2">
            <Sparkles size={13} /><span>相對檢索品質（示意）</span>
          </div>
          <div className="w-full h-2.5 rounded-[var(--radius-pill)] bg-[var(--neutral-100)] overflow-hidden">
            <motion.div
              className="h-full rounded-[var(--radius-pill)] bg-[var(--orange-400)]"
              initial={false}
              animate={{ width: `${m.quality}%` }}
              transition={{ duration: reduce ? 0 : 0.3, ease: 'easeOut' }}
            />
          </div>
          <div className="text-right text-xs font-semibold text-[var(--orange-500)] mt-1">{m.quality.toFixed(0)}%</div>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] p-3">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-2">
            <Gauge size={13} /><span>相對比對速度（示意）</span>
          </div>
          <div className="text-2xl font-bold text-[var(--blue-700)]">
            {m.speedX >= 1 ? `~${m.speedX >= 10 ? Math.round(m.speedX) : m.speedX.toFixed(1)}×` : `~${m.speedX.toFixed(2)}×`}
          </div>
          <div className="text-xs text-[var(--text-muted)]">相對 float32 × 2048 基準</div>
        </div>
      </div>

      {/* ── 控制項：維度 ── */}
      <div className="space-y-3">
        <div>
          <div className="text-sm font-medium text-[var(--text-body)] mb-1.5">維度（Matryoshka 截斷）</div>
          <div className="flex flex-wrap gap-2">
            {DIMS.map((d) => (
              <button
                key={d}
                onClick={() => setDim(d)}
                className="px-4 py-1.5 rounded-[var(--radius-pill)] text-sm font-semibold transition-colors"
                style={{
                  background: dim === d ? 'var(--blue-700)' : 'var(--neutral-100)',
                  color: dim === d ? '#fff' : 'var(--text-body)',
                }}
                aria-pressed={dim === d}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* dtype */}
        <div>
          <div className="text-sm font-medium text-[var(--text-body)] mb-1.5">精度（量化 dtype）</div>
          <div className="flex flex-wrap gap-2">
            {DTYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => setDtype(t.id)}
                className="px-4 py-1.5 rounded-[var(--radius-pill)] text-sm font-semibold transition-colors"
                style={{
                  background: dtype === t.id ? 'var(--blue-700)' : 'var(--neutral-100)',
                  color: dtype === t.id ? '#fff' : 'var(--text-body)',
                }}
                aria-pressed={dtype === t.id}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* chunks slider */}
        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="font-medium text-[var(--text-body)]">知識庫規模</span>
            <span className="font-semibold text-[var(--blue-700)]">{fmtCount(chunks)} 筆 chunk</span>
          </div>
          <input
            type="range" min={10000} max={10000000} step={10000}
            value={chunks}
            onChange={(e) => setChunks(Number(e.target.value))}
            className="w-full accent-[var(--blue-700)]"
            aria-label="知識庫規模（chunk 數）"
          />
        </div>
      </div>

      <p className="m-0 text-xs text-[var(--text-muted)] leading-relaxed">
        儲存數字為精確計算（每維位元組：float32=4、int8=1、binary=1/8）。相對品質與速度僅為示意，用來建立直覺，非任何實測基準。
      </p>
    </div>
  )
}
