/**
 * PoC L1-L3 檢索閉環技術架構圖（手寫 SVG，純靜態，無 motion／無 state）。
 *
 * 核心洞察：這條路徑上唯一的模型是 embedding —— 沒有任何生成式 LLM 介入；
 * L1/L2/L3 分類不是算出來的，是拿檢索到的近似條文回「L1~L3+L6 總表」反查
 * 出來的。版面因此刻意做成左右對稱、中間交棒的形狀：左側「API 常駐服務」
 * 由上而下跑一條線上查詢流程，右側「Indexer & Data Loader 離線 CLI」由外
 * 而內跑兩條離線建庫流程，兩側都只透過中間唯一的 PostgreSQL + pgvector
 * 交換資料，彼此不直接呼叫。
 *
 * 畫布尺度刻意對齊同系列 poc-system-architecture（viewBox 寬度 ~1160、
 * 外層 min-w ~1000px，scale ≈ 0.86），避免筆記內文欄寬把字級壓得太小；
 * 節點內文一律拆成「標題（14）＋ 說明行（12）」兩層，不把長句硬塞進單行
 * 標題，圖例／核心洞察摘要的字級也一併調大，最小 fontSize 不低於 11。
 *
 * 刻意不用 motion：這個元件在 MDX 裡未必掛 client 指令可以 hydrate（純靜態
 * 結構圖，讀者要一眼看完整條資料流，不需要逐步播放或互動揭露）。若加上
 * motion 的 initial 動畫狀態，SSR 會把它序列化成 opacity="0" 之類的靜態屬性，
 * 在沒有 hydration 的情況下會永遠停在那個狀態——這與同系列 poc-* 元件
 * （poc-system-architecture、poc-phase-roadmap）採取的策略一致。
 */

import type { LucideIcon } from 'lucide-react'
import { Database, FileText, GitMerge, HelpCircle, Search, Sparkles, StickyNote as StickyNoteIcon, Table2, User } from 'lucide-react'

/* ── 版面常數（對齊 poc-system-architecture 的畫布尺度）───────── */
const VIEW_W = 1160
const VIEW_H = 870

const FRAME_TOP = 88
const FRAME_BOTTOM = 654

const LEFT_X = 24
const LEFT_W = 350
const RIGHT_X = 786
const RIGHT_W = 350

const MID_CX = 580
const TABLE_W = 280
const TABLE_X = MID_CX - TABLE_W / 2 // 440
const TABLE_RIGHT = TABLE_X + TABLE_W // 720

const VTABLE_Y = 150
const VTABLE_H = 100
const STABLE_Y = 530
const STABLE_H = 100

const CYL_RX = 100
const CYL_RY = 16
const CYL_TOP_CY = 350
const CYL_BODY_H = 140
const CYL_BOTTOM_CY = CYL_TOP_CY + CYL_BODY_H // 490
const CYL_OUTER_TOP = CYL_TOP_CY - CYL_RY // 334
const CYL_OUTER_BOTTOM = CYL_BOTTOM_CY + CYL_RY // 506
const CYL_LEFT_X = MID_CX - CYL_RX // 480
const CYL_RIGHT_X = MID_CX + CYL_RX // 680

/* ── 左側：API 常駐服務，由上而下五個節點 ─────────────────────── */
const CONTENT_X = LEFT_X + 20 // 44
const CONTENT_W = LEFT_W - 40 // 310
const CONTENT_RIGHT = CONTENT_X + CONTENT_W // 354
const CONTENT_CENTER = CONTENT_X + CONTENT_W / 2 // 199

interface NodeLine {
  text: string
  color?: string
  weight?: number
}

interface FlowNodeData {
  key: string
  icon: LucideIcon
  title: string
  lines: NodeLine[]
  y: number
  h: number
}

const API_NODES: FlowNodeData[] = [
  {
    key: 'question-in',
    icon: User,
    title: '使用者提問',
    lines: [{ text: '「公司可以不給特休嗎」' }],
    y: 140,
    h: 60,
  },
  {
    key: 'question',
    icon: HelpCircle,
    title: 'Question',
    lines: [{ text: '收下白話問句' }],
    y: 216,
    h: 60,
  },
  {
    key: 'embedding',
    icon: Sparkles,
    title: 'Embedding',
    lines: [{ text: 'mistral-embed（與 Indexer 同一模型）', color: 'var(--blue-600)' }],
    y: 292,
    h: 60,
  },
  {
    key: 'retrieval',
    icon: Search,
    title: '檢索近似條文（Top-K）',
    lines: [{ text: 'K ＝ 5（先設常數）' }],
    y: 368,
    h: 60,
  },
  {
    key: 'mapping',
    icon: GitMerge,
    title: 'Mapping',
    lines: [
      { text: '近似條文 × 決策樹分類表' },
      { text: '分類是檢索的副產物，不需要 LLM', color: 'var(--orange-600)', weight: 700 },
    ],
    y: 444,
    h: 84,
  },
]

const RESULT_Y = 544
const RESULT_H = 44

const NODE4 = API_NODES[3]
const NODE5 = API_NODES[4]
const NODE4_MID_Y = NODE4.y + NODE4.h / 2 // 398
const NODE5_MID_Y = NODE5.y + NODE5.h / 2 // 486

/* ── 子元件 ─────────────────────────────────────────────────── */
function ArrowDown({ x, y1, y2 }: { x: number; y1: number; y2: number }) {
  return <line x1={x} y1={y1} x2={x} y2={y2} stroke="var(--neutral-400)" strokeWidth={1.75} markerEnd="url(#l1l3-arrow)" />
}

function FlowNode({ node }: { node: FlowNodeData }) {
  const Icon = node.icon
  const titleY = node.y + 24
  return (
    <g>
      <rect x={CONTENT_X} y={node.y} width={CONTENT_W} height={node.h} rx={12} fill="var(--neutral-0)" stroke="var(--neutral-300)" strokeWidth={1.25} />
      <g transform={`translate(${CONTENT_X + 16} ${node.y + 10})`}>
        <Icon width={26} height={26} strokeWidth={1.75} color="var(--blue-600)" />
      </g>
      <text x={CONTENT_X + 58} y={titleY} fontSize={14} fontWeight={700} fill="var(--text-strong)">
        {node.title}
      </text>
      {node.lines.map((line, i) => (
        <text key={i} x={CONTENT_X + 58} y={titleY + 20 * (i + 1)} fontSize={12} fontWeight={line.weight ?? 400} fill={line.color ?? 'var(--neutral-600)'}>
          {line.text}
        </text>
      ))}
    </g>
  )
}

function SubFrame({ x, y, w, h, title }: { x: number; y: number; w: number; h: number; title: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={14} fill="var(--neutral-0)" stroke="var(--neutral-400)" strokeWidth={1.25} strokeDasharray="7 5" />
      <text x={x + 16} y={y + 26} fontSize={14} fontWeight={700} fill="var(--text-strong)">
        {title}
      </text>
    </g>
  )
}

function MiniPill({ x, y, w, h, label, caption }: { x: number; y: number; w: number; h: number; label: string; caption?: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={h / 2} fill="var(--neutral-50)" stroke="var(--neutral-400)" strokeWidth={1.25} />
      <text x={x + w / 2} y={y + h / 2 + 4.5} textAnchor="middle" fontSize={13} fontWeight={700} fill="var(--text-strong)">
        {label}
      </text>
      {caption && (
        <text x={x + w / 2} y={y + h + 18} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--orange-600)">
          {caption}
        </text>
      )}
    </g>
  )
}

function SourceIcon({ icon: Icon, x, y, label }: { icon: LucideIcon; x: number; y: number; label: string }) {
  return (
    <g>
      <rect x={x} y={y} width={26} height={26} rx={7} fill="var(--neutral-50)" stroke="var(--neutral-400)" strokeWidth={1.25} />
      <g transform={`translate(${x + 3} ${y + 3})`}>
        <Icon width={20} height={20} strokeWidth={1.75} color="var(--neutral-600)" />
      </g>
      <text x={x + 13} y={y + 44} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--text-strong)">
        {label}
      </text>
    </g>
  )
}

function DataTable({ y, h, title, lines }: { y: number; h: number; title: string; lines: string[] }) {
  return (
    <g>
      <rect x={TABLE_X} y={y} width={TABLE_W} height={h} rx={12} fill="var(--neutral-100)" stroke="var(--neutral-400)" strokeWidth={1.5} />
      <text x={TABLE_X + 16} y={y + 24} fontSize={14} fontWeight={700} fill="var(--text-strong)">
        {title}
      </text>
      {lines.map((line, i) => (
        <text key={i} x={TABLE_X + 16} y={y + 46 + i * 18} fontSize={12} fill="var(--neutral-600)">
          {line}
        </text>
      ))}
    </g>
  )
}

function LegendLine({ x, y, dashed }: { x: number; y: number; dashed?: boolean }) {
  return (
    <line
      x1={x}
      y1={y}
      x2={x + 42}
      y2={y}
      stroke="var(--neutral-400)"
      strokeWidth={1.75}
      strokeDasharray={dashed ? '5 4' : undefined}
      markerEnd={dashed ? undefined : 'url(#l1l3-arrow)'}
    />
  )
}

function LegendSwatch({ x, y, kind }: { x: number; y: number; kind: 'hatch' | 'solid' }) {
  return (
    <rect
      x={x}
      y={y - 10}
      width={42}
      height={20}
      rx={5}
      fill={kind === 'hatch' ? 'url(#l1l3-hatch)' : 'var(--neutral-100)'}
      stroke="var(--neutral-300)"
      strokeWidth={1}
    />
  )
}

export default function PocL1L3RetrievalArchitecture() {
  return (
    <div className="not-prose max-w-6xl mx-auto overflow-x-auto">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        width="100%"
        role="img"
        className="min-w-[1000px]"
        style={{ fontFamily: 'inherit' }}
        aria-label="勞動法遵 PoC L1 至 L3 檢索閉環技術架構圖：頂端標註 Framework 為 LangChain、Embedding 為 Mistral，並以強調色標示整條路徑唯一的模型是 mistral-embed。左側是素色淡底的線上段方框「API，NestJS 常駐服務」，由上而下依序是使用者提問（人形圖示與對話框，內容為公司可以不給特休嗎）、Question 收下白話問句、Embedding 標註與 Indexer 同一個模型、檢索近似條文 Top-K 標註 K 常數設定先設 5、Mapping 將近似條文與決策樹分類表整合並以強調色標示分類是檢索的副產物不需要 LLM，最後回傳整合結果給使用者。右側是斜紋淡底的離線段方框「Indexer 與 Data Loader，離線 CLI」，內含兩個虛線子框：Indexer 子框中勞基法法條經 Embedding 寫入法條 Vector Data；Data Loader 子框中 L1 至 L3 加 L6 總表經 ETL 寫入決策樹分類 Structured Data；旁邊有一張便利貼樣式的註記，寫著 PoC 資料來源為勞基法條文加 L1 至 L3 加 L6 總表，可先用 Excel，並以虛線連到兩個資料來源圖示。中間是共用的 PostgreSQL 加 pgvector 圓柱，上方掛著法條 Vector Data 資料表方塊，下方掛著決策樹分類 Structured Data 資料表方塊，以細線連接圓柱。左側檢索近似條文與 Mapping 兩個節點各拉一條藍色箭頭到圓柱，分別標示向量相似度查詢與條文代碼 join。底部圖例說明實線含箭頭為主資料流、虛線為資料來源、斜紋淡底為離線段、素色淡底為線上段；並有核心洞察摘要：分類不是算出來的，是拿檢索到的條文回總表反查出來的，整條路徑上唯一的模型是 embedding，沒有任何生成式 LLM 介入。"
      >
        <defs>
          <marker id="l1l3-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto-start-reverse">
            <path d="M0,0 L8,4 L0,8 Z" fill="var(--neutral-400)" />
          </marker>
          <marker id="l1l3-arrow-blue" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto-start-reverse">
            <path d="M0,0 L8,4 L0,8 Z" fill="var(--blue-700)" />
          </marker>
          <pattern id="l1l3-hatch" patternUnits="userSpaceOnUse" width={8} height={8} patternTransform="rotate(45)">
            <rect width={8} height={8} fill="var(--neutral-50)" />
            <line x1={0} y1={0} x2={0} y2={8} stroke="var(--neutral-300)" strokeWidth={1} />
          </pattern>
        </defs>

        {/* ── 頂端：框架與模型標註 ── */}
        <text x={MID_CX} y={22} textAnchor="middle" fontSize={12} fill="var(--neutral-500)">
          Framework: LangChain ／ Embedding: Mistral
        </text>
        <rect x={MID_CX - 180} y={34} width={360} height={32} rx={16} fill="var(--orange-50)" stroke="var(--orange-400)" strokeWidth={1.25} />
        <text x={MID_CX} y={55} textAnchor="middle" fontSize={14} fontWeight={700} fill="var(--orange-700)">
          整條路徑唯一的模型：mistral-embed
        </text>

        {/* ── 左側大框：API · NestJS 常駐服務（線上段，素色淡底） ── */}
        <rect x={LEFT_X} y={FRAME_TOP} width={LEFT_W} height={FRAME_BOTTOM - FRAME_TOP} rx={16} fill="var(--neutral-100)" stroke="var(--neutral-300)" strokeWidth={1} />
        <text x={LEFT_X + 20} y={FRAME_TOP + 22} fontSize={15} fontWeight={700} fill="var(--text-strong)">
          API · NestJS 常駐服務
        </text>
        <text x={LEFT_X + 20} y={FRAME_TOP + 40} fontSize={11.5} fill="var(--neutral-500)">
          常駐服務 · 對外提供檢索與整合
        </text>

        {/* 五個節點（使用者提問 → Question → Embedding → 檢索 → Mapping） */}
        {API_NODES.map((node) => (
          <FlowNode key={node.key} node={node} />
        ))}
        <ArrowDown x={CONTENT_CENTER} y1={200} y2={216} />
        <ArrowDown x={CONTENT_CENTER} y1={276} y2={292} />
        <ArrowDown x={CONTENT_CENTER} y1={352} y2={368} />
        <ArrowDown x={CONTENT_CENTER} y1={428} y2={444} />
        <ArrowDown x={CONTENT_CENTER} y1={528} y2={RESULT_Y} />

        {/* 回傳結果 */}
        <rect x={CONTENT_X} y={RESULT_Y} width={CONTENT_W} height={RESULT_H} rx={RESULT_H / 2} fill="var(--neutral-0)" stroke="var(--neutral-300)" strokeWidth={1.25} />
        <text x={CONTENT_CENTER} y={RESULT_Y + RESULT_H / 2 + 4.5} textAnchor="middle" fontSize={13} fontWeight={700} fill="var(--text-strong)">
          回傳整合結果給使用者
        </text>

        {/* 節點 4／5 → 中間 PostgreSQL 的查詢箭頭（強調色，直線可達） */}
        <line x1={CONTENT_RIGHT} y1={NODE4_MID_Y} x2={CYL_LEFT_X} y2={NODE4_MID_Y} stroke="var(--blue-700)" strokeWidth={2} markerEnd="url(#l1l3-arrow-blue)" />
        <text x={(CONTENT_RIGHT + CYL_LEFT_X) / 2} y={NODE4_MID_Y - 10} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--blue-700)">
          向量相似度查詢
        </text>

        <line x1={CONTENT_RIGHT} y1={NODE5_MID_Y} x2={CYL_LEFT_X} y2={NODE5_MID_Y} stroke="var(--blue-700)" strokeWidth={2} markerEnd="url(#l1l3-arrow-blue)" />
        <text x={(CONTENT_RIGHT + CYL_LEFT_X) / 2} y={NODE5_MID_Y - 10} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--blue-700)">
          條文代碼 join
        </text>

        {/* ── 中間：共用 PostgreSQL + pgvector（交棒點） ── */}
        <DataTable y={VTABLE_Y} h={VTABLE_H} title="法條 Vector Data" lines={['metadata', '決策樹 L1／L2／L3 編號', '法條內容（vector）']} />
        <line x1={MID_CX} y1={VTABLE_Y + VTABLE_H} x2={MID_CX} y2={CYL_OUTER_TOP} stroke="var(--neutral-400)" strokeWidth={1.25} />

        <path
          d={`M ${CYL_LEFT_X} ${CYL_TOP_CY} L ${CYL_LEFT_X} ${CYL_BOTTOM_CY} A ${CYL_RX} ${CYL_RY} 0 0 0 ${CYL_RIGHT_X} ${CYL_BOTTOM_CY} L ${CYL_RIGHT_X} ${CYL_TOP_CY} Z`}
          fill="var(--neutral-100)"
          stroke="var(--neutral-400)"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        <ellipse cx={MID_CX} cy={CYL_TOP_CY} rx={CYL_RX} ry={CYL_RY} fill="var(--neutral-50)" stroke="var(--neutral-400)" strokeWidth={1.5} />
        <g transform={`translate(${MID_CX - 12} 366)`}>
          <Database width={24} height={24} strokeWidth={1.75} color="var(--neutral-600)" />
        </g>
        <text x={MID_CX} y={408} textAnchor="middle" fontSize={15} fontWeight={700} fill="var(--text-strong)">
          PostgreSQL
        </text>
        <text x={MID_CX} y={424} textAnchor="middle" fontSize={12} fill="var(--neutral-600)">
          + pgvector
        </text>
        <text x={MID_CX} y={440} textAnchor="middle" fontSize={11} fill="var(--neutral-500)">
          離線／線上共用同一庫
        </text>

        <line x1={MID_CX} y1={CYL_OUTER_BOTTOM} x2={MID_CX} y2={STABLE_Y} stroke="var(--neutral-400)" strokeWidth={1.25} />
        <DataTable y={STABLE_Y} h={STABLE_H} title="決策樹分類 Structured Data" lines={['L1：四大類編號', 'L2：主題編號', 'L3：企業端問題類型編號']} />

        {/* ── 右側大框：Indexer & Data Loader（離線段，斜紋淡底） ── */}
        <rect x={RIGHT_X} y={FRAME_TOP} width={RIGHT_W} height={FRAME_BOTTOM - FRAME_TOP} rx={16} fill="url(#l1l3-hatch)" stroke="var(--neutral-300)" strokeWidth={1} />
        <text x={RIGHT_X + 20} y={FRAME_TOP + 22} fontSize={15} fontWeight={700} fill="var(--text-strong)">
          Indexer &amp; Data Loader
        </text>
        <text x={RIGHT_X + 20} y={FRAME_TOP + 40} fontSize={11.5} fill="var(--neutral-500)">
          離線 CLI · 批次跑完即結束
        </text>

        {/* Indexer 子框：勞基法法條 → Embedding → 法條 Vector Data */}
        <SubFrame x={806} y={140} w={310} h={150} title="Indexer" />
        <SourceIcon icon={FileText} x={1060} y={202} label="勞基法法條" />
        <MiniPill x={880} y={199} w={110} h={32} label="Embedding" caption="mistral-embed" />
        <line x1={1058} y1={215} x2={992} y2={215} stroke="var(--neutral-400)" strokeWidth={1.5} markerEnd="url(#l1l3-arrow)" />
        <line x1={878} y1={215} x2={TABLE_RIGHT} y2={215} stroke="var(--neutral-400)" strokeWidth={1.5} markerEnd="url(#l1l3-arrow)" />

        {/* Data Loader 子框：L1~L3+L6 總表 → ETL → 決策樹分類 Structured Data */}
        <SubFrame x={806} y={310} w={310} h={338} title="Data Loader" />
        <SourceIcon icon={Table2} x={1060} y={567} label="L1~L3+L6 總表" />
        <MiniPill x={880} y={564} w={110} h={32} label="ETL" caption="可先用 Excel" />
        <line x1={1058} y1={580} x2={992} y2={580} stroke="var(--neutral-400)" strokeWidth={1.5} markerEnd="url(#l1l3-arrow)" />
        <line x1={878} y1={580} x2={TABLE_RIGHT} y2={580} stroke="var(--neutral-400)" strokeWidth={1.5} markerEnd="url(#l1l3-arrow)" />

        {/* 便利貼：PoC 資料來源（放在 Data Loader 子框內的空白處） */}
        <g transform="rotate(-2 961 435)">
          <rect x={826} y={380} width={270} height={110} rx={6} fill="var(--warning-50)" stroke="var(--warning-500)" strokeWidth={1.25} />
          <path d="M 1076 380 L 1096 380 L 1096 400 Z" fill="var(--orange-200)" />
          <g transform="translate(838 392)">
            <StickyNoteIcon width={18} height={18} strokeWidth={1.75} color="var(--warning-700)" />
          </g>
          <text x={864} y={406} fontSize={12.5} fontWeight={700} fill="var(--warning-700)">
            PoC 資料來源
          </text>
          <text x={838} y={430} fontSize={11.5} fill="var(--neutral-700)">
            勞基法條文 ＋ L1~L3+L6 總表
          </text>
          <text x={838} y={450} fontSize={11.5} fill="var(--neutral-700)">
            （可先用 Excel）
          </text>
        </g>

        {/* 便利貼虛線連到兩個資料來源圖示（資料來源關係，無箭頭） */}
        <line x1={1000} y1={490} x2={1073} y2={567} stroke="var(--neutral-400)" strokeWidth={1.25} strokeDasharray="5 4" />
        <line x1={900} y1={380} x2={1073} y2={228} stroke="var(--neutral-400)" strokeWidth={1.25} strokeDasharray="5 4" />

        {/* ── 圖例 ── */}
        <LegendLine x={40} y={696} />
        <text x={98} y={700} fontSize={12} fill="var(--text-body)">
          實線（含箭頭）＝ 主資料流；藍色實線＝關鍵查詢介面
        </text>

        <LegendLine x={40} y={730} dashed />
        <text x={98} y={734} fontSize={12} fill="var(--text-body)">
          虛線 ＝ 資料來源（便利貼與兩個原始資料來源的關係）
        </text>

        <LegendSwatch x={610} y={696} kind="hatch" />
        <text x={668} y={700} fontSize={12} fill="var(--text-body)">
          斜紋淡底 ＝ 離線段（Indexer ／ Data Loader）
        </text>

        <LegendSwatch x={610} y={730} kind="solid" />
        <text x={668} y={734} fontSize={12} fill="var(--text-body)">
          素色淡底 ＝ 線上段（API 常駐服務）
        </text>

        {/* ── 核心洞察摘要 ── */}
        <rect x={40} y={764} width={1080} height={70} rx={12} fill="var(--blue-50)" stroke="var(--blue-100)" strokeWidth={1} />
        <rect x={40} y={764} width={4} height={70} fill="var(--blue-700)" />
        <text x={64} y={792} fontSize={15} fontWeight={700} fill="var(--blue-700)">
          分類不是算出來的，是拿檢索到的條文回總表反查出來的
        </text>
        <text x={64} y={814} fontSize={12.5} fill="var(--text-body)">
          整條路徑上唯一的模型是 embedding（mistral-embed）—— 沒有任何生成式 LLM 介入
        </text>
      </svg>
    </div>
  )
}
