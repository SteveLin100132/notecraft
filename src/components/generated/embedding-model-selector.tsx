import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { ArrowRight, TriangleAlert, Info, Layers } from 'lucide-react'

/**
 * embedding 選型互動指南。
 * 核心洞察：先看語料領域與資料落地，再談維度與成本；
 * embedding 選完別忘了加 rerank。
 */

type Vendor = 'mistral' | 'voyage'

interface Model {
  name: string
  vendor: Vendor
}

interface Note {
  kind: 'info' | 'cost'
  text: string
}

interface Scenario {
  tab: string
  title: string
  models: Model[]
  reason: string
  note: Note
}

const SCENARIOS: Scenario[] = [
  {
    tab: '一般文件 RAG',
    title: '一般文件 / 客服 RAG',
    models: [{ name: 'voyage-4', vendor: 'voyage' }, { name: 'mistral-embed', vendor: 'mistral' }],
    reason: '多數專案的起點——文件問答、客服知識庫。voyage-4 品質優先，mistral-embed 旋鈕少、上手快。',
    note: { kind: 'info', text: '先用預設維度跑通，別一開始就糾結量化。' },
  },
  {
    tab: '程式碼檢索',
    title: '程式碼檢索',
    models: [{ name: 'voyage-code-3', vendor: 'voyage' }, { name: 'codestral-embed', vendor: 'mistral' }],
    reason: '程式碼有自己的詞彙與結構，領域模型的命中率明顯高於通用模型。',
    note: { kind: 'info', text: 'codestral-embed 維度可截任意 n，適合超大程式碼庫。' },
  },
  {
    tab: '金融 / 法律',
    title: '金融 / 法律語料',
    models: [{ name: 'voyage-finance-2', vendor: 'voyage' }, { name: 'voyage-law-2', vendor: 'voyage' }],
    reason: '受規範產業的專有詞彙密集，專用模型比通用模型準得多——這塊目前 Voyage 較完整。',
    note: { kind: 'cost', text: 'voyage-law-2 context 為 16K，比其它模型短，長文件要注意切法。' },
  },
  {
    tab: '已在 Atlas',
    title: '已經在 MongoDB Atlas',
    models: [{ name: 'voyage-4', vendor: 'voyage' }, { name: 'rerank-2.5', vendor: 'voyage' }],
    reason: 'Voyage 已是 MongoDB 旗下，原生整合 Atlas Vector Search，向量庫本來就放 Atlas 的話最順路。',
    note: { kind: 'cost', text: '順路的另一面是生態綁定，計費也綁 Atlas 帳戶。' },
  },
  {
    tab: '壓成本',
    title: '要壓儲存與延遲',
    models: [{ name: 'voyage-4-lite', vendor: 'voyage' }, { name: 'codestral-embed', vendor: 'mistral' }],
    reason: '用 Matryoshka 低維 + int8／binary 量化，把百萬級向量庫的儲存壓下來，品質只掉一點。',
    note: { kind: 'info', text: '等你有真實資料能量測品質掉多少，再動維度與量化。' },
  },
  {
    tab: '資料主權',
    title: '資料主權 / 歐洲落地',
    models: [{ name: 'mistral-embed', vendor: 'mistral' }, { name: 'codestral-embed', vendor: 'mistral' }],
    reason: 'Mistral 是歐洲公司、有 EU 資料處理選項，對 GDPR 或資料主權要求較好交代。',
    note: { kind: 'cost', text: '仍是線上 API；真的要資料不出境需另評估自架方案。' },
  },
]

function VendorBadge({ model }: { model: Model }) {
  const isMistral = model.vendor === 'mistral'
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-pill)] text-xs font-semibold"
      style={{
        background: isMistral ? 'var(--orange-50)' : 'var(--blue-50)',
        color: isMistral ? 'var(--orange-600)' : 'var(--blue-700)',
        border: `1px solid ${isMistral ? 'var(--orange-200)' : 'var(--blue-200)'}`,
      }}
    >
      {model.name}
      <span className="opacity-70 font-normal">{isMistral ? 'Mistral' : 'Voyage'}</span>
    </span>
  )
}

export default function EmbeddingModelSelector() {
  const reduce = useReducedMotion() ?? false
  const [active, setActive] = useState(0)
  const s = SCENARIOS[active]

  return (
    <div className="not-prose max-w-3xl mx-auto space-y-3">
      <div className="flex flex-col md:flex-row gap-4">
        {/* ── 左側：情境清單 ── */}
        <div className="flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-visible md:w-44 md:shrink-0 pb-1 md:pb-0">
          {SCENARIOS.map((sc, i) => {
            const on = i === active
            return (
              <button
                key={sc.tab}
                onClick={() => setActive(i)}
                className="text-left whitespace-nowrap md:whitespace-normal px-3 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-colors flex items-center gap-2 shrink-0"
                style={{
                  background: on ? 'var(--blue-700)' : 'var(--neutral-100)',
                  color: on ? '#fff' : 'var(--text-body)',
                }}
                aria-pressed={on}
              >
                <span
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold shrink-0"
                  style={{
                    background: on ? 'rgba(255,255,255,0.22)' : 'var(--neutral-0)',
                    color: on ? '#fff' : 'var(--neutral-500)',
                  }}
                >
                  {i + 1}
                </span>
                {sc.tab}
              </button>
            )
          })}
        </div>

        {/* ── 右側：內容面板 ── */}
        <div className="flex-1 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 min-h-[236px]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={active}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
              className="space-y-4"
            >
              <h4 className="m-0 text-lg font-bold text-[var(--text-brand)]">{s.title}</h4>

              <div className="flex flex-wrap gap-2">
                {s.models.map((m) => (
                  <VendorBadge key={m.name} model={m} />
                ))}
              </div>

              <p className="m-0 text-sm leading-relaxed text-[var(--text-body)] flex gap-2">
                <ArrowRight size={16} className="shrink-0 mt-1 text-[var(--blue-500)]" />
                <span>{s.reason}</span>
              </p>

              <div
                className="flex gap-2 rounded-[var(--radius-md)] p-3 text-sm leading-relaxed"
                style={{
                  background: s.note.kind === 'cost' ? 'var(--warning-50)' : 'var(--blue-50)',
                  color: 'var(--text-body)',
                }}
              >
                <span
                  className="shrink-0 mt-0.5"
                  style={{ color: s.note.kind === 'cost' ? 'var(--warning-500)' : 'var(--blue-600)' }}
                >
                  {s.note.kind === 'cost' ? <TriangleAlert size={16} /> : <Info size={16} />}
                </span>
                <span>{s.note.text}</span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── 固定提醒：rerank ── */}
      <div className="flex items-center gap-2 rounded-[var(--radius-md)] px-4 py-2.5 text-sm bg-[var(--surface-brand-soft)] text-[var(--text-body)]">
        <Layers size={16} className="shrink-0 text-[var(--blue-600)]" />
        <span>不論選哪個，正式上線都建議在 embedding 之後補上 rerank（如 <strong>rerank-2.5</strong>）。</span>
      </div>
    </div>
  )
}
