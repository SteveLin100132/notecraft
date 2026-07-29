import { motion, useReducedMotion } from 'motion/react'

/**
 * 五個 Lang 的堆疊關係架構圖（手寫 SVG）。
 * 核心洞察：函式庫（跟 app 一起部署，實線）vs 服務（獨立部署的行程，虛線）。
 * 三條橫向 trace 箭頭代表「三層各自送出紀錄、可觀測層不參與執行」，依序浮現。
 */

interface Layer {
  title: string
  subtitle: string
  midY: number
  y: number
}

const LAYERS: Layer[] = [
  { title: 'LangChain', subtitle: '高階 API · createAgent · 整合', y: 168, midY: 209 },
  { title: 'LangGraph', subtitle: '狀態 · 節點 · checkpoint · 重試', y: 260, midY: 301 },
  { title: '模型與工具', subtitle: 'LLM · 向量庫 · 外部 API', y: 352, midY: 393 },
]

export default function LangStackArchitecture() {
  const reduce = useReducedMotion() ?? false

  return (
    <div className="not-prose w-full max-w-3xl mx-auto">
      <svg
        viewBox="0 0 760 520"
        width="100%"
        role="img"
        aria-label="五個 Lang 工具的堆疊關係：LangFlow 為可選的獨立服務，主堆疊由 LangChain、LangGraph、模型與工具三個函式庫層構成，三層各自把 trace 送往右側的可觀測層（Langfuse 或 LangSmith）。"
        style={{ fontFamily: 'inherit' }}
      >
        <defs>
          <marker id="lsa-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="var(--neutral-400)" />
          </marker>
          <marker id="lsa-trace" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="var(--blue-500)" />
          </marker>
        </defs>

        {/* ── LangFlow（可選 · 服務 · 虛線）── */}
        <rect
          x={56} y={40} width={348} height={64} rx={12}
          fill="var(--orange-50)" stroke="var(--orange-400)" strokeWidth={1.5} strokeDasharray="6 5"
        />
        <text x={72} y={69} fontSize={15} fontWeight={700} fill="var(--orange-500)">
          LangFlow<tspan fontSize={12} fontWeight={400} fill="var(--neutral-500)">（可選）</tspan>
        </text>
        <text x={72} y={90} fontSize={12} fill="var(--neutral-500)">拖拉建構，輸出即 API</text>
        <line x1={230} y1={104} x2={230} y2={147} stroke="var(--neutral-400)" strokeWidth={1.5} markerEnd="url(#lsa-arrow)" />

        {/* ── 主堆疊（函式庫 · 實線）── */}
        <rect
          x={40} y={150} width={380} height={300} rx={16}
          fill="var(--blue-50)" stroke="var(--blue-500)" strokeWidth={1.5}
        />
        {LAYERS.map((l) => (
          <g key={l.title}>
            <rect
              x={58} y={l.y} width={344} height={82} rx={10}
              fill="#ffffff" stroke="var(--blue-300)" strokeWidth={1.25}
            />
            <text x={76} y={l.y + 34} fontSize={16} fontWeight={700} fill="var(--blue-700)">{l.title}</text>
            <text x={76} y={l.y + 58} fontSize={12.5} fill="var(--neutral-500)">{l.subtitle}</text>
          </g>
        ))}

        {/* ── 可觀測層 · 擇一（容器）── */}
        <rect
          x={500} y={180} width={224} height={270} rx={16}
          fill="var(--neutral-50)" stroke="var(--neutral-300)" strokeWidth={1.5}
        />
        <text x={516} y={209} fontSize={14} fontWeight={700} fill="var(--neutral-700)">可觀測層 · 擇一</text>

        {/* Langfuse（服務 · 虛線） */}
        <rect
          x={516} y={224} width={192} height={94} rx={10}
          fill="var(--orange-50)" stroke="var(--orange-400)" strokeWidth={1.5} strokeDasharray="6 5"
        />
        <text x={532} y={256} fontSize={15} fontWeight={700} fill="var(--orange-500)">Langfuse</text>
        <text x={532} y={278} fontSize={12} fill="var(--neutral-600)">MIT · 可自架</text>
        <text x={532} y={298} fontSize={11.5} fill="var(--neutral-400)">開源，零授權費</text>

        {/* LangSmith（服務 · 虛線） */}
        <rect
          x={516} y={332} width={192} height={94} rx={10}
          fill="var(--orange-50)" stroke="var(--orange-400)" strokeWidth={1.5} strokeDasharray="6 5"
        />
        <text x={532} y={364} fontSize={15} fontWeight={700} fill="var(--orange-500)">LangSmith</text>
        <text x={532} y={386} fontSize={12} fill="var(--neutral-600)">閉源 · 託管</text>
        <text x={532} y={406} fontSize={11.5} fill="var(--neutral-400)">自架僅 Enterprise</text>

        {/* ── trace 資料流箭頭（依序浮現）── */}
        {LAYERS.map((l, i) => (
          <motion.line
            key={`trace-${l.title}`}
            x1={420} y1={l.midY} x2={498} y2={l.midY}
            stroke="var(--blue-500)" strokeWidth={1.75} markerEnd="url(#lsa-trace)"
            initial={reduce ? undefined : { opacity: 0 }}
            whileInView={reduce ? undefined : { opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: 0.15 + i * 0.28, ease: 'easeOut' }}
          />
        ))}

        {/* ── 說明與圖例 ── */}
        <text x={40} y={472} fontSize={12} fill="var(--neutral-500)">
          橫向箭頭＝trace 資料流：三層各自送出紀錄，可觀測層不參與執行
        </text>
        <rect x={40} y={488} width={22} height={14} rx={3} fill="var(--blue-50)" stroke="var(--blue-500)" strokeWidth={1.5} />
        <text x={70} y={499} fontSize={12.5} fill="var(--neutral-600)">函式庫（跟 app 一起部署）</text>
        <rect x={300} y={488} width={22} height={14} rx={3} fill="var(--orange-50)" stroke="var(--orange-400)" strokeWidth={1.5} strokeDasharray="4 3" />
        <text x={330} y={499} fontSize={12.5} fill="var(--neutral-600)">服務（獨立部署）</text>
      </svg>
    </div>
  )
}
