import React, { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowDownToLine, CircleDot, X } from 'lucide-react'

type Mode = 'waterfall' | 'agile'

interface NodeData {
  id: string
  label: string
  description: string
}

const waterfallNodes: NodeData[] = [
  {
    id: 'pm',
    label: 'Project Manager',
    description:
      '負責專案整體規劃、執行與監控，確保專案如期如質完成；管理團隊與資源，與利益相關者溝通協調，並處理風險與問題。',
  },
  {
    id: 'sa',
    label: 'System Architect',
    description:
      '負責設計系統整體架構與技術方案，確保系統的可擴展性、可靠性與效能，並指導開發團隊進行技術實現。',
  },
  {
    id: 'dev',
    label: 'Development Team',
    description:
      '實際開發產品的成員，通常包含軟體工程師、設計師、測試人員等，依需求規格進行開發。',
  },
  {
    id: 'qa',
    label: 'QA Team',
    description:
      '負責品質保證，包括測試計劃設計、測試案例撰寫、測試執行與缺陷管理等，確保產品品質符合標準。',
  },
]

const agileNodes: NodeData[] = [
  {
    id: 'devTeam',
    label: 'Development Team',
    description:
      '自組織、跨功能的開發成員，共同對 Sprint 目標負責，不需等待指令即可自主決策技術執行方向。',
  },
  {
    id: 'po',
    label: 'Product Owner',
    description:
      '負責定義產品願景、制定 Roadmap、管理 Product Backlog，確保開發方向符合用戶需求與商業目標。',
  },
  {
    id: 'sm',
    label: 'Scrum Master',
    description:
      '促進 Scrum 團隊的運作，協助遵循 Scrum 流程，排除障礙，促進協作，確保 Sprint 目標順利達成。',
  },
]

function getNodeById(mode: Mode, id: string): NodeData | undefined {
  const list = mode === 'waterfall' ? waterfallNodes : agileNodes
  return list.find((n) => n.id === id)
}

// SVG arrow marker defs
function SvgDefs() {
  return (
    <defs>
      {/* Blue downward arrow marker for waterfall */}
      <marker
        id="arrow-blue"
        markerWidth="8"
        markerHeight="8"
        refX="4"
        refY="4"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <path d="M0,1 L4,7 L8,1" fill="#1b4f9c" />
      </marker>
      {/* Bidirectional arrow — both ends */}
      <marker
        id="arrow-both-end"
        markerWidth="8"
        markerHeight="8"
        refX="4"
        refY="4"
        orient="auto-start-reverse"
        markerUnits="strokeWidth"
      >
        <path d="M0,1 L4,7 L8,1" fill="#7ba6da" />
      </marker>
    </defs>
  )
}

interface WaterfallSvgProps {
  activeNode: string | null
  onNodeClick: (id: string) => void
  reduced: boolean
}

function WaterfallSvg({ activeNode, onNodeClick, reduced }: WaterfallSvgProps) {
  const dur = reduced ? 0 : 0.25

  const nodeStyle = (id: string, isBrand: boolean) => ({
    cursor: 'pointer' as const,
    filter: 'none',
  })

  return (
    <motion.g
      key="waterfall"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: dur, ease: [0.16, 1, 0.3, 1] }}
    >
      <SvgDefs />

      {/* Connecting lines */}
      {/* PM -> SA */}
      <line
        x1="240" y1="78" x2="240" y2="116"
        stroke="#1b4f9c"
        strokeWidth="2"
        markerEnd="url(#arrow-blue)"
      />
      {/* SA -> Dev */}
      <line
        x1="216" y1="163" x2="184" y2="206"
        stroke="#1b4f9c"
        strokeWidth="2"
        markerEnd="url(#arrow-blue)"
      />
      {/* SA -> QA */}
      <line
        x1="264" y1="163" x2="296" y2="206"
        stroke="#1b4f9c"
        strokeWidth="2"
        markerEnd="url(#arrow-blue)"
      />

      {/* PM node */}
      <g
        style={nodeStyle('pm', true)}
        onClick={() => onNodeClick('pm')}
        aria-label="Project Manager"
      >
        <circle
          cx="240" cy="50" r="28"
          fill="#1b4f9c"
          stroke={activeNode === 'pm' ? '#ed9b26' : 'none'}
          strokeWidth={activeNode === 'pm' ? 3 : 0}
        />
        <text
          x="240" y="45"
          textAnchor="middle"
          fill="#ffffff"
          fontSize="9"
          fontFamily="'Noto Sans TC', 'Noto Sans', sans-serif"
          fontWeight="600"
        >
          Project
        </text>
        <text
          x="240" y="57"
          textAnchor="middle"
          fill="#ffffff"
          fontSize="9"
          fontFamily="'Noto Sans TC', 'Noto Sans', sans-serif"
          fontWeight="600"
        >
          Manager
        </text>
      </g>

      {/* System Architect node */}
      <g
        style={nodeStyle('sa', false)}
        onClick={() => onNodeClick('sa')}
        aria-label="System Architect"
      >
        <circle
          cx="240" cy="140" r="24"
          fill="#d6e4f5"
          stroke={activeNode === 'sa' ? '#ed9b26' : '#adc8e8'}
          strokeWidth={activeNode === 'sa' ? 3 : 1}
        />
        <text
          x="240" y="135"
          textAnchor="middle"
          fill="#1b4f9c"
          fontSize="8"
          fontFamily="'Noto Sans TC', 'Noto Sans', sans-serif"
          fontWeight="600"
        >
          System
        </text>
        <text
          x="240" y="147"
          textAnchor="middle"
          fill="#1b4f9c"
          fontSize="8"
          fontFamily="'Noto Sans TC', 'Noto Sans', sans-serif"
          fontWeight="600"
        >
          Architect
        </text>
      </g>

      {/* Development Team node */}
      <g
        style={nodeStyle('dev', false)}
        onClick={() => onNodeClick('dev')}
        aria-label="Development Team"
      >
        <circle
          cx="160" cy="230" r="24"
          fill="#d6e4f5"
          stroke={activeNode === 'dev' ? '#ed9b26' : '#adc8e8'}
          strokeWidth={activeNode === 'dev' ? 3 : 1}
        />
        <text
          x="160" y="225"
          textAnchor="middle"
          fill="#1b4f9c"
          fontSize="8"
          fontFamily="'Noto Sans TC', 'Noto Sans', sans-serif"
          fontWeight="600"
        >
          <tspan x="160" dy="0">Development</tspan>
          <tspan x="160" dy="12">Team</tspan>
        </text>
      </g>

      {/* QA Team node */}
      <g
        style={nodeStyle('qa', false)}
        onClick={() => onNodeClick('qa')}
        aria-label="QA Team"
      >
        <circle
          cx="320" cy="230" r="24"
          fill="#d6e4f5"
          stroke={activeNode === 'qa' ? '#ed9b26' : '#adc8e8'}
          strokeWidth={activeNode === 'qa' ? 3 : 1}
        />
        <text
          x="320" y="225"
          textAnchor="middle"
          fill="#1b4f9c"
          fontSize="9"
          fontFamily="'Noto Sans TC', 'Noto Sans', sans-serif"
          fontWeight="600"
        >
          <tspan x="320" dy="0">QA</tspan>
          <tspan x="320" dy="12">Team</tspan>
        </text>
      </g>
    </motion.g>
  )
}

interface AgileSvgProps {
  activeNode: string | null
  onNodeClick: (id: string) => void
  reduced: boolean
}

function AgileSvg({ activeNode, onNodeClick, reduced }: AgileSvgProps) {
  const dur = reduced ? 0 : 0.25
  const stagger1 = reduced ? 0 : 0.08
  const stagger2 = reduced ? 0 : 0.16

  return (
    <motion.g
      key="agile"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: dur, ease: [0.16, 1, 0.3, 1] }}
    >
      <defs>
        <marker
          id="arrow-both-agile"
          markerWidth="8"
          markerHeight="8"
          refX="4"
          refY="4"
          orient="auto-start-reverse"
          markerUnits="strokeWidth"
        >
          <path d="M0,1 L4,7 L8,1" fill="#7ba6da" />
        </marker>
      </defs>

      {/* Outer guide arc — full circle, dashed */}
      <circle
        cx="240" cy="160" r="108"
        fill="none"
        stroke="#9aa6b8"
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />

      {/* PO <-> center bidirectional */}
      <line
        x1="307" y1="132" x2="270" y2="148"
        stroke="#7ba6da"
        strokeWidth="1.5"
        markerStart="url(#arrow-both-agile)"
        markerEnd="url(#arrow-both-agile)"
      />
      {/* SM <-> center bidirectional */}
      <line
        x1="173" y1="132" x2="210" y2="148"
        stroke="#7ba6da"
        strokeWidth="1.5"
        markerStart="url(#arrow-both-agile)"
        markerEnd="url(#arrow-both-agile)"
      />

      {/* Development Team (center) */}
      <g
        style={{ cursor: 'pointer' }}
        onClick={() => onNodeClick('devTeam')}
        aria-label="Development Team"
      >
        <circle
          cx="240" cy="160" r="38"
          fill="#1b4f9c"
          stroke={activeNode === 'devTeam' ? '#ed9b26' : 'none'}
          strokeWidth={activeNode === 'devTeam' ? 3 : 0}
        />
        <text
          x="240" y="155"
          textAnchor="middle"
          fill="#ffffff"
          fontSize="10"
          fontFamily="'Noto Sans TC', 'Noto Sans', sans-serif"
          fontWeight="600"
        >
          <tspan x="240" dy="0">Development</tspan>
          <tspan x="240" dy="14">Team</tspan>
        </text>
      </g>

      {/* Product Owner */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: dur, delay: stagger1, ease: [0.16, 1, 0.3, 1] }}
        style={{ cursor: 'pointer' }}
        onClick={() => onNodeClick('po')}
        aria-label="Product Owner"
      >
        <circle
          cx="333" cy="106" r="26"
          fill="#fdf4e6"
          stroke={activeNode === 'po' ? '#ed9b26' : '#f2b955'}
          strokeWidth={activeNode === 'po' ? 3 : 1.5}
        />
        <text
          x="333" y="101"
          textAnchor="middle"
          fill="#e37b24"
          fontSize="8"
          fontFamily="'Noto Sans TC', 'Noto Sans', sans-serif"
          fontWeight="700"
        >
          <tspan x="333" dy="0">Product</tspan>
          <tspan x="333" dy="12">Owner</tspan>
        </text>
      </motion.g>

      {/* Scrum Master */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: dur, delay: stagger2, ease: [0.16, 1, 0.3, 1] }}
        style={{ cursor: 'pointer' }}
        onClick={() => onNodeClick('sm')}
        aria-label="Scrum Master"
      >
        <circle
          cx="147" cy="106" r="26"
          fill="#fdf4e6"
          stroke={activeNode === 'sm' ? '#ed9b26' : '#f2b955'}
          strokeWidth={activeNode === 'sm' ? 3 : 1.5}
        />
        <text
          x="147" y="101"
          textAnchor="middle"
          fill="#e37b24"
          fontSize="8"
          fontFamily="'Noto Sans TC', 'Noto Sans', sans-serif"
          fontWeight="700"
        >
          <tspan x="147" dy="0">Scrum</tspan>
          <tspan x="147" dy="12">Master</tspan>
        </text>
      </motion.g>
    </motion.g>
  )
}

export default function WaterfallVsAgileRoles() {
  const [activeMode, setActiveMode] = useState<Mode>('waterfall')
  const [activeNode, setActiveNode] = useState<string | null>(null)
  const shouldReduceMotion = useReducedMotion()
  const reduced = shouldReduceMotion ?? false

  const cardDur = reduced ? 0 : 0.2
  const cardY = reduced ? 0 : 8

  function handleNodeClick(id: string) {
    setActiveNode((prev) => (prev === id ? null : id))
  }

  const activeNodeData = activeNode ? getNodeById(activeMode, activeNode) : null

  return (
    <figure className="bg-white rounded-lg shadow-sm p-6 space-y-4">
      {/* Toggle */}
      <div className="flex gap-2 justify-center flex-wrap">
        <button
          type="button"
          onClick={() => {
            setActiveMode('waterfall')
            setActiveNode(null)
          }}
          className={[
            'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors',
            activeMode === 'waterfall'
              ? 'bg-[#1b4f9c] text-white'
              : 'bg-[#eef1f6] text-[#4f5b6e] hover:bg-[#e1e6ee]',
          ].join(' ')}
        >
          <ArrowDownToLine size={14} />
          Waterfall 指揮鏈
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveMode('agile')
            setActiveNode(null)
          }}
          className={[
            'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors',
            activeMode === 'agile'
              ? 'bg-[#1b4f9c] text-white'
              : 'bg-[#eef1f6] text-[#4f5b6e] hover:bg-[#e1e6ee]',
          ].join(' ')}
        >
          <CircleDot size={14} />
          Agile 服務圈
        </button>
      </div>

      {/* SVG diagram */}
      <svg
        viewBox="0 0 480 320"
        width="100%"
        style={{ display: 'block' }}
        aria-label={activeMode === 'waterfall' ? 'Waterfall 指揮鏈示意圖' : 'Agile 服務圈示意圖'}
      >
        <AnimatePresence mode="wait" initial={false}>
          {activeMode === 'waterfall' ? (
            <WaterfallSvg
              key="waterfall"
              activeNode={activeNode}
              onNodeClick={handleNodeClick}
              reduced={reduced}
            />
          ) : (
            <AgileSvg
              key="agile"
              activeNode={activeNode}
              onNodeClick={handleNodeClick}
              reduced={reduced}
            />
          )}
        </AnimatePresence>
      </svg>

      {/* Role description card */}
      <AnimatePresence>
        {activeNodeData && (
          <motion.div
            key={activeNodeData.id}
            initial={{ opacity: 0, y: cardY }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduced ? 0 : 4 }}
            transition={{ duration: cardDur, ease: 'easeOut' }}
            className="relative bg-[#eef4fb] border border-[#d6e4f5] rounded-lg p-4"
          >
            <button
              type="button"
              onClick={() => setActiveNode(null)}
              className="absolute top-3 right-3 text-[#6c798e] hover:text-[#3a4456]"
              aria-label="關閉職責說明"
            >
              <X size={14} />
            </button>
            <p className="text-sm font-bold text-[#1b4f9c] mb-1">{activeNodeData.label}</p>
            <p className="text-sm text-[#3a4456] leading-relaxed pr-6">
              {activeNodeData.description}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom tagline */}
      <p className="text-xs text-[#6c798e] text-center italic">
        從 PM 由上而下指揮，到 PO / SM 由外圍服務一個自組織團隊——這是權力結構的翻轉，不只是改名。
      </p>
    </figure>
  )
}
