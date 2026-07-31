/**
 * RAG 檢索管線（純靜態手寫 SVG）。
 * 核心洞察：embedding 決定「找得到什麼」（第一段），rerank 決定「排得對不對」（第二段）。
 * query 與 chunks 走同一個 embedding model，落進同一個向量空間。
 */

interface NodeProps {
  x: number
  y: number
  w: number
  h: number
  title: string
  sub?: string
  fill: string
  stroke: string
  titleColor: string
}

function Node({ x, y, w, h, title, sub, fill, stroke, titleColor }: NodeProps) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={10} fill={fill} stroke={stroke} strokeWidth={1.25} />
      <text x={x + 18} y={sub ? y + 26 : y + h / 2 + 5} fontSize={15} fontWeight={700} fill={titleColor}>
        {title}
      </text>
      {sub && (
        <text x={x + 18} y={y + 46} fontSize={12} fill="var(--neutral-500)">
          {sub}
        </text>
      )}
    </g>
  )
}

export default function RagEmbeddingPipeline() {
  return (
    <div className="not-prose w-full max-w-xl mx-auto">
      <svg
        viewBox="0 0 620 650"
        width="100%"
        role="img"
        aria-label="RAG 檢索管線：文件切成 chunks 與使用者 query 經過同一個 embedding model 進入向量庫，做相似度檢索取出 top-k 候選（第一段 embedding 檢索），再經 reranker 精排成 top-n（第二段 rerank），最後餵給 LLM 產生答案。"
        style={{ fontFamily: 'inherit' }}
      >
        <defs>
          <marker id="rep-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="var(--neutral-400)" />
          </marker>
        </defs>

        {/* ── 第一段 group ── */}
        <rect x={18} y={46} width={584} height={392} rx={16} fill="var(--blue-50)" stroke="var(--blue-200)" strokeWidth={1.5} />
        <rect x={30} y={35} width={318} height={22} rx={11} fill="#ffffff" stroke="var(--blue-200)" strokeWidth={1} />
        <text x={44} y={50} fontSize={11.5} fontWeight={700} fill="var(--blue-700)">第一段 · embedding 檢索：找得到什麼</text>

        {/* ── 第二段 group ── */}
        <rect x={18} y={456} width={584} height={96} rx={16} fill="var(--orange-50)" stroke="var(--orange-200)" strokeWidth={1.5} />
        <rect x={30} y={445} width={250} height={22} rx={11} fill="#ffffff" stroke="var(--orange-200)" strokeWidth={1} />
        <text x={44} y={460} fontSize={11.5} fontWeight={700} fill="var(--orange-600)">第二段 · rerank：排得對不對</text>

        {/* ── 連接箭頭 ── */}
        <line x1={165} y1={128} x2={298} y2={173} stroke="var(--neutral-400)" strokeWidth={1.5} markerEnd="url(#rep-arrow)" />
        <line x1={455} y1={128} x2={322} y2={173} stroke="var(--neutral-400)" strokeWidth={1.5} markerEnd="url(#rep-arrow)" />
        <line x1={310} y1={234} x2={310} y2={270} stroke="var(--neutral-400)" strokeWidth={1.5} markerEnd="url(#rep-arrow)" />
        <line x1={310} y1={330} x2={310} y2={366} stroke="var(--neutral-400)" strokeWidth={1.5} markerEnd="url(#rep-arrow)" />
        <line x1={310} y1={426} x2={310} y2={476} stroke="var(--neutral-400)" strokeWidth={1.75} markerEnd="url(#rep-arrow)" />
        <line x1={310} y1={536} x2={310} y2={570} stroke="var(--neutral-400)" strokeWidth={1.5} markerEnd="url(#rep-arrow)" />

        {/* ── 節點 ── */}
        <Node x={40} y={70} w={250} h={58} title="文件庫" sub="切成 chunks" fill="#ffffff" stroke="var(--blue-300)" titleColor="var(--blue-700)" />
        <Node x={330} y={70} w={250} h={58} title="使用者 query" sub="同一個 embedding" fill="#ffffff" stroke="var(--blue-300)" titleColor="var(--blue-700)" />
        <Node x={150} y={176} w={320} h={58} title="Embedding model" sub="query 與 chunks → 同一個向量空間" fill="#ffffff" stroke="var(--blue-500)" titleColor="var(--blue-700)" />
        <Node x={150} y={272} w={320} h={58} title="向量庫 Vector DB" sub="存所有 chunk 向量" fill="#ffffff" stroke="var(--blue-300)" titleColor="var(--blue-700)" />
        <Node x={150} y={368} w={320} h={58} title="相似度檢索" sub="cosine → top-k 候選（如 top-20）" fill="#ffffff" stroke="var(--blue-300)" titleColor="var(--blue-700)" />
        <Node x={150} y={478} w={320} h={58} title="Reranker 精排" sub="rerank-2.5 → top-n（如 top-3）" fill="#ffffff" stroke="var(--orange-400)" titleColor="var(--orange-600)" />
        <Node x={150} y={572} w={320} h={52} title="LLM → 答案" fill="var(--neutral-50)" stroke="var(--neutral-300)" titleColor="var(--neutral-700)" />
      </svg>
    </div>
  )
}
