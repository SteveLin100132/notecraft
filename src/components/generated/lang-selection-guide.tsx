import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { ArrowRight, TriangleAlert, Building2 } from 'lucide-react'

/**
 * 「什麼時候用哪個」互動選型指南。
 * 核心洞察：這些不是選擇題——實務答案是用 LangChain 寫、跑在 LangGraph 上、
 * 把 trace 送進 Langfuse 或 LangSmith，LangFlow 視團隊組成決定加不加。
 */

type Form = 'lib' | 'service'

interface Tool {
  name: string
  form: Form
}

interface Note {
  kind: 'case' | 'cost'
  text: string
}

interface Scenario {
  tab: string
  title: string
  tools: Tool[]
  reason: string
  note: Note
}

const SCENARIOS: Scenario[] = [
  {
    tab: '只用 LangChain',
    title: '只用 LangChain 就夠',
    tools: [{ name: 'LangChain', form: 'lib' }],
    reason: '單向流程的原型與小型系統——文件問答 RAG、客服 FAQ bot、內容生成工具。不需要循環或人工介入，學習曲線最低。',
    note: { kind: 'case', text: '最快做出可跑版本的起點。' },
  },
  {
    tab: '往下掉到 LangGraph',
    title: '需要往下掉到 LangGraph',
    tools: [{ name: 'LangChain', form: 'lib' }, { name: 'LangGraph', form: 'lib' }],
    reason: '有狀態、會分支、要人審的流程——多 agent 協作、人工審核卡點、可中斷後續跑、複雜條件路由。',
    note: { kind: 'case', text: 'Klarna 客服 bot 服務 8500 萬用戶、解決時間降 80%；LinkedIn 全公司 SQL Bot。' },
  },
  {
    tab: '接上可觀測層',
    title: '一定要接上可觀測層',
    tools: [{ name: 'Langfuse', form: 'service' }, { name: 'LangSmith', form: 'service' }],
    reason: '任何要進生產環境的系統。沒有 trace 就是在猜——你需要知道當時檢索了哪些文件、實際送出的 prompt、這次請求花了多少錢。',
    note: { kind: 'case', text: 'Langfuse 或 LangSmith 都行，重點是要有。' },
  },
  {
    tab: 'Langfuse',
    title: 'Langfuse 而非 LangSmith',
    tools: [{ name: 'Langfuse', form: 'service' }],
    reason: '資料主權是硬需求，或團隊會長大。受規範產業無法把資料送到第三方，Langfuse 可完全自架、零授權費、不按 seat 計費。',
    note: { kind: 'cost', text: '自架的維運工時是真實成本，別只算授權費。' },
  },
  {
    tab: 'LangSmith',
    title: 'LangSmith 而非 Langfuse',
    tools: [{ name: 'LangSmith', form: 'service' }],
    reason: '吃 LangGraph 官方工具鏈——LangGraph Studio 視覺化逐步除錯、官方託管 agent 部署，線上評估目前也較完整。',
    note: { kind: 'case', text: '小團隊起步時免費方案夠用。' },
  },
  {
    tab: 'LangFlow',
    title: '加上 LangFlow',
    tools: [{ name: 'LangFlow', form: 'service' }],
    reason: '非工程成員（PM、領域專家）要參與流程設計時，拖拉介面比 code review 有效率。',
    note: { kind: 'cost', text: '別把它當生產環境的執行引擎。' },
  },
]

function FormBadge({ tool }: { tool: Tool }) {
  const isLib = tool.form === 'lib'
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-pill)] text-xs font-semibold"
      style={{
        background: isLib ? 'var(--blue-50)' : 'var(--orange-50)',
        color: isLib ? 'var(--blue-700)' : 'var(--orange-600)',
        border: `1px solid ${isLib ? 'var(--blue-200)' : 'var(--orange-200)'}`,
      }}
    >
      {tool.name}
      <span className="opacity-70 font-normal">{isLib ? '函式庫' : '服務'}</span>
    </span>
  )
}

export default function LangSelectionGuide() {
  const reduce = useReducedMotion() ?? false
  const [active, setActive] = useState(0)
  const s = SCENARIOS[active]

  return (
    <div className="not-prose max-w-3xl mx-auto flex flex-col md:flex-row gap-4">
      {/* ── 左側：情境清單 ── */}
      <div className="flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-visible md:w-52 md:shrink-0 pb-1 md:pb-0">
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
      <div className="flex-1 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 min-h-[240px]">
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
              {s.tools.map((t) => (
                <FormBadge key={t.name} tool={t} />
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
                {s.note.kind === 'cost' ? <TriangleAlert size={16} /> : <Building2 size={16} />}
              </span>
              <span>{s.note.text}</span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
