/**
 * PoC L1~L3 檢索閉環技術架構圖（v2，手寫 SVG，純靜態，無 motion／無 state）。
 *
 * Core insight：主線（建庫＋檢索＋分類）從頭到尾只認一個模型 mistral-embed；
 * 生成式模型只在最末端「風險分析報告」這一步例外登場，而且是因為 L4~L8
 * 規格還沒交付的暫代做法。版面因此把「查詢流程」畫成五個由上而下的節點，
 * 前四個共用同一種中性配色，只有第五個（風險分析報告）單獨換成琥珀色，
 * 讓讀者一眼看出「LLM 被刻意隔離在最後一格」。
 *
 * 版面骨架：頂端標註／主題橫幅 → 左側 UI 小框（對齊查詢流程欄位）→
 * 雙向箭頭 → 左側「API · NestJS 常駐服務」大框（內部左右並排 Indexer 元件
 * 與查詢流程兩個虛線子區）→ 右側共用 PostgreSQL 欄（上下兩張 DataTable
 * 夾住 pgvector 圓柱）→ 底部圖例與核心洞察 callout。Indexer 元件的兩條
 * 寫入路徑用直角折線（elbow）繞到 API 大框標題下方與虛線子區上緣之間的
 * 空白走廊，避免視覺穿越查詢流程子區或 UI 小框；查詢流程節點 3／4 則直接
 * 水平連到 PostgreSQL 圓柱，代表這是唯一會即時查詢資料庫的路徑。
 *
 * 刻意不用 motion：純靜態結構圖，讀者要一眼看完整條資料流，不需要逐步
 * 播放或互動揭露；純 SVG 元件也不掛 client 指令即可渲染完整畫面。
 */

import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  Bot,
  ClipboardList,
  Database,
  FileText,
  GitMerge,
  HelpCircle,
  Search,
  Settings2,
  Sparkles,
  StickyNote,
  Table2,
  Tags,
  User,
} from 'lucide-react'

/* ── 版面常數 ──────────────────────────────────────────────────── */
const VIEW_W = 1200
const VIEW_H = 1210

/* Langfuse 側掛觀測小框（非主資料流，往外接在節點 5「風險分析報告」旁） */
const LF_X = 470
const LF_Y = 850
const LF_W = 260
const LF_H = 108
const LF_CX = LF_X + LF_W / 2 // 600
const LF_BOTTOM = LF_Y + LF_H // 958
const CX = 600

/* UI 小框（對齊查詢流程子區） */
const UI_X = 364
const UI_Y = 96
const UI_W = 300
const UI_H = 130
const UI_BOTTOM = UI_Y + UI_H // 226

/* UI ↔ API 雙向箭頭 */
const API_Y = 278

/* API 大框 */
const API_X = 24
const API_W = 660
const SUBA_X = 44
const SUBA_W = 300
const SUBB_X = 364
const SUBB_W = 300
const SUBBOX_Y = 334
const SUBBOX_BOTTOM = 780
const API_BOTTOM = 800

/* Indexer 子區內容欄位 */
const SUBA_CONTENT_X = SUBA_X + 16 // 60
const SUBA_CONTENT_W = SUBA_W - 32 // 268
const SUBA_CONTENT_CENTER = SUBA_CONTENT_X + SUBA_CONTENT_W / 2 // 194
const SUBA_CONTENT_RIGHT = SUBA_CONTENT_X + SUBA_CONTENT_W // 328

/* 查詢流程節點欄位 */
const NODE_X = SUBB_X + 16 // 380
const NODE_W = SUBB_W - 32 // 268
const NODE_RIGHT = NODE_X + NODE_W // 648
const NODE_CENTER = NODE_X + NODE_W / 2 // 514

/* 共用 PostgreSQL 欄 */
const MID_CX = 958
const TABLE_W = 360
const TABLE_X = MID_CX - TABLE_W / 2 // 778
const TOP_TABLE_Y = 150
const TOP_TABLE_H = 90
const BOTTOM_TABLE_Y = 740
const BOTTOM_TABLE_H = 90

const CYL_RX = 110
const CYL_RY = 16
const CYL_TOP_CY = 520
const CYL_BODY_H = 170
const CYL_BOTTOM_CY = CYL_TOP_CY + CYL_BODY_H // 690
const CYL_OUTER_TOP = CYL_TOP_CY - CYL_RY // 504
const CYL_OUTER_BOTTOM = CYL_BOTTOM_CY + CYL_RY // 706
const CYL_LEFT_X = MID_CX - CYL_RX // 848
const CYL_RIGHT_X = MID_CX + CYL_RX // 1068

/* Indexer 兩條寫入路徑走廊車道（title 文字下方、虛線子區上緣之間） */
const LANE_1_Y = 318
const LANE_2_Y = 326
const LANE_TURN_X = 770

/* ── 型別 ─────────────────────────────────────────────────────── */
interface NodeLine {
  text: string
  color?: string
  weight?: number
}

interface FlowNodeData {
  key: string
  icon: LucideIcon
  title: string
  titleColor?: string
  lines: NodeLine[]
  y: number
  h: number
  fill?: string
  stroke?: string
  iconColor?: string
}

/* 查詢流程五個節點（節點 5：風險分析報告，唯一碰生成式模型、唯一暖色底） */
const QUERY_NODES: FlowNodeData[] = [
  {
    key: 'question',
    icon: HelpCircle,
    title: 'Question',
    lines: [{ text: '收下白話問句' }],
    y: 402,
    h: 46,
  },
  {
    key: 'embedding',
    icon: Sparkles,
    title: 'Embedding',
    lines: [{ text: '與 Indexer 元件同一份設定', color: 'var(--blue-600)' }],
    y: 464,
    h: 46,
  },
  {
    key: 'retrieval',
    icon: Search,
    title: '檢索近似條文（Top-K）',
    lines: [{ text: 'K：常數設定，先設 5' }],
    y: 526,
    h: 56,
  },
  {
    key: 'mapping',
    icon: GitMerge,
    title: 'Mapping',
    lines: [
      { text: '近似條文 × 決策樹分類表' },
      { text: '分類是檢索的副產物，不需要 LLM', color: 'var(--orange-600)', weight: 700 },
    ],
    y: 598,
    h: 68,
  },
  {
    key: 'report',
    icon: Bot,
    title: '風險分析報告',
    titleColor: 'var(--orange-600)',
    lines: [
      { text: '自撰 prompt ＋ Codex 5.6 Luna', color: 'var(--orange-600)' },
      { text: 'L4~L8 規格未到，先以自撰 prompt 暫代', color: 'var(--orange-600)', weight: 700 },
    ],
    y: 682,
    h: 80,
    fill: 'var(--warning-50)',
    stroke: 'var(--warning-500)',
    iconColor: 'var(--orange-600)',
  },
]

const NODE3 = QUERY_NODES[2]
const NODE4 = QUERY_NODES[3]
const NODE3_MID_Y = NODE3.y + NODE3.h / 2 // 554
const NODE4_MID_Y = NODE4.y + NODE4.h / 2 // 632

const UI_CHIPS: { icon: LucideIcon; label: string }[] = [
  { icon: FileText, label: '條文清單' },
  { icon: Tags, label: 'L1~L3' },
  { icon: ClipboardList, label: '報告卡片' },
]

/* Langfuse 側掛小框內列項（報告生成這一段的觀測欄位） */
const LANGFUSE_ITEMS = ['問句與輸出', 'token 用量', '延遲', '模型與 Prompt 版本']

/* ── 子元件 ─────────────────────────────────────────────────────── */
function ArrowV({ x, y1, y2, color = 'var(--neutral-400)', width = 1.75 }: { x: number; y1: number; y2: number; color?: string; width?: number }) {
  return <line x1={x} y1={y1} x2={x} y2={y2} stroke={color} strokeWidth={width} markerEnd="url(#pocv2-arrow)" />
}

function ArrowH({ x1, x2, y, color = 'var(--blue-700)', width = 2 }: { x1: number; x2: number; y: number; color?: string; width?: number }) {
  return <line x1={x1} y1={y} x2={x2} y2={y} stroke={color} strokeWidth={width} markerEnd="url(#pocv2-arrow-blue)" />
}

function ElbowArrow({ points }: { points: [number, number][] }) {
  const d = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ')
  return <path d={d} fill="none" stroke="var(--neutral-400)" strokeWidth={1.5} markerEnd="url(#pocv2-arrow)" />
}

function QueryFlowNode({ node }: { node: FlowNodeData }) {
  const Icon = node.icon
  const titleY = node.y + 22
  const fill = node.fill ?? 'var(--neutral-0)'
  const stroke = node.stroke ?? 'var(--neutral-300)'
  const iconColor = node.iconColor ?? 'var(--blue-600)'
  return (
    <g>
      <rect x={NODE_X} y={node.y} width={NODE_W} height={node.h} rx={12} fill={fill} stroke={stroke} strokeWidth={1.25} />
      <g transform={`translate(${NODE_X + 14} ${node.y + 9})`}>
        <Icon width={22} height={22} strokeWidth={1.75} color={iconColor} />
      </g>
      <text x={NODE_X + 46} y={titleY} fontSize={13} fontWeight={700} fill={node.titleColor ?? 'var(--text-strong)'}>
        {node.title}
      </text>
      {node.lines.map((line, i) => (
        <text key={i} x={NODE_X + 46} y={titleY + 18 * (i + 1)} fontSize={11} fontWeight={line.weight ?? 400} fill={line.color ?? 'var(--neutral-600)'}>
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
      <text x={x + 16} y={y + 22} fontSize={14} fontWeight={700} fill="var(--text-strong)">
        {title}
      </text>
    </g>
  )
}

function Badge({ x, y, w, icon: Icon, label }: { x: number; y: number; w: number; icon: LucideIcon; label: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={20} rx={10} fill="var(--neutral-100)" stroke="var(--neutral-500)" strokeWidth={1} />
      <g transform={`translate(${x + 8} ${y + 3})`}>
        <Icon width={14} height={14} strokeWidth={1.75} color="var(--neutral-500)" />
      </g>
      <text x={x + 28} y={y + 14} fontSize={11} fill="var(--neutral-600)">
        {label}
      </text>
    </g>
  )
}

function IndexerFlowRow({
  icon: Icon,
  label,
  iconY,
  pillLabel,
  pillY,
  caption,
}: {
  icon: LucideIcon
  label: string
  iconY: number
  pillLabel: string
  pillY: number
  caption?: string
}) {
  const iconCenter = SUBA_CONTENT_X + 8
  return (
    <g>
      <g transform={`translate(${SUBA_CONTENT_X} ${iconY})`}>
        <Icon width={16} height={16} strokeWidth={1.75} color="var(--neutral-600)" />
      </g>
      <text x={SUBA_CONTENT_X + 22} y={iconY + 13} fontSize={11.5} fill="var(--neutral-700)">
        {label}
      </text>
      <line x1={iconCenter} y1={iconY + 20} x2={iconCenter} y2={pillY - 2} stroke="var(--neutral-400)" strokeWidth={1.5} markerEnd="url(#pocv2-arrow)" />
      <rect x={SUBA_CONTENT_X} y={pillY} width={SUBA_CONTENT_W} height={26} rx={13} fill="var(--neutral-50)" stroke="var(--neutral-400)" strokeWidth={1.25} />
      <text x={SUBA_CONTENT_CENTER} y={pillY + 17} textAnchor="middle" fontSize={11.5} fontWeight={700} fill="var(--text-strong)">
        {pillLabel}
      </text>
      {caption && (
        <text x={SUBA_CONTENT_CENTER} y={pillY + 41} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--orange-600)">
          {caption}
        </text>
      )}
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
      x2={x + 40}
      y2={y}
      stroke="var(--neutral-400)"
      strokeWidth={1.75}
      strokeDasharray={dashed ? '5 4' : undefined}
      markerEnd={dashed ? undefined : 'url(#pocv2-arrow)'}
    />
  )
}

function LegendSwatch({ x, y, fill, stroke }: { x: number; y: number; fill: string; stroke: string }) {
  return <rect x={x} y={y - 9} width={40} height={18} rx={5} fill={fill} stroke={stroke} strokeWidth={1.25} />
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
        aria-label="勞動法遵決策支援系統 PoC L1 至 L3 檢索閉環技術架構圖 v2。頂端小字標註 Framework 為 LangChain、Embedding 為 Mistral mistral-embed，下方主題橫幅寫著主線只認一個模型 mistral-embed、生成式模型只在最末端的風險分析報告例外登場。左上是 UI 小框，標題 UI 使用 Vite 加 React TypeScript，內含人形圖示與輸入框寫著公司可以不給特休嗎，下方三個縮圖標籤分別是條文清單、L1 至 L3 標籤、報告卡片。UI 框與下方 API 大框之間有一組往下的箭頭標示提問、一組往上的箭頭標示條文加分類加報告。左側大框標題 API NestJS 常駐服務，內部左右並排兩個虛線子區：左半是 Indexer 元件，旁邊有徽章寫著管理端觸發非常駐流程，內含兩條垂直小流程，勞基法法條經 Embedding 寫入法條 Vector Data，L1 至 L3 加 L6 總表經 ETL 寫入決策樹分類 Structured Data，中間夾一張便利貼樣式的虛線註記寫著 PoC 資料來源為勞基法條文加 L1 至 L3 加 L6 總表可先用 Excel，兩條流程末端各以直角折線繞到右側寫入對應的 PostgreSQL 資料表；右半是查詢流程，標題下方有藍色藥丸標籤寫著唯一模型 mistral-embed 節點一到四，由上而下五個節點：Question 收下白話問句、Embedding 標註與 Indexer 元件同一份設定、檢索近似條文 Top-K 標註 K 為常數設定先設五、Mapping 將近似條文與決策樹分類表整合並以強調色標示分類是檢索的副產物不需要 LLM、最後風險分析報告節點單獨換成琥珀色底標示自撰 prompt 加 Codex 5.6 Luna 以及 L4 至 L8 規格未到先以自撰 prompt 暫代，是全圖唯一碰生成式模型的節點。風險分析報告節點另外拉出一條中性色虛線側掛連到獨立小框 Langfuse self-host GCP，線上標註 trace，表示這是非主資料流的可觀測性側錄；小框內列出問句與輸出、token 用量、延遲、模型與 Prompt 版本四項，框下小字註記不記 embedding 呼叫。節點三檢索與節點四 Mapping 各拉一條藍色實線到右側 PostgreSQL，分別標示向量相似度查詢與條文代碼 join。右側共用 PostgreSQL 欄由上而下是法條 Vector Data 資料表，欄位為 metadata、決策樹 L1 L2 L3 編號、法條內容向量；中間是標註 PostgreSQL 加 pgvector 建庫查詢共用同一庫的圓柱；下方是決策樹分類 Structured Data 資料表，欄位為 L1 L2 L3 編號說明。底部圖例列出五項：中性虛線代表可觀測性且屬非主資料流、實線含箭頭為主資料流且藍色實線代表關鍵查詢介面、虛線代表資料來源與非常駐流程、素色色塊代表不經生成式模型、琥珀色塊代表經生成式模型且僅風險分析報告節點。最下方是核心洞察摘要，標題寫著主線全程不碰生成式模型只有最末端例外，副標寫著分類是檢索的副產物不需要 LLM，風險分析報告因 L4 至 L8 規格未到先用自撰 prompt 暫代生成式模型輸出。"
      >
        <defs>
          <marker id="pocv2-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto-start-reverse">
            <path d="M0,0 L8,4 L0,8 Z" fill="var(--neutral-400)" />
          </marker>
          <marker id="pocv2-arrow-blue" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto-start-reverse">
            <path d="M0,0 L8,4 L0,8 Z" fill="var(--blue-700)" />
          </marker>
        </defs>

        {/* ── 區塊 1：頂端標註 ── */}
        <text x={CX} y={28} textAnchor="middle" fontSize={12} fill="var(--neutral-500)">
          Framework: LangChain ／ Embedding: Mistral mistral-embed
        </text>
        <rect x={CX - 260} y={38} width={520} height={46} rx={10} fill="var(--blue-50)" stroke="var(--blue-400)" strokeWidth={1.25} />
        <text x={CX} y={58} textAnchor="middle" fontSize={14} fontWeight={700} fill="var(--blue-700)">
          主線只認一個模型：mistral-embed
        </text>
        <text x={CX} y={76} textAnchor="middle" fontSize={12} fill="var(--text-body)">
          生成式模型只在最末端的風險分析報告例外登場
        </text>

        {/* ── 區塊 2：UI 小框 ── */}
        <rect x={UI_X} y={UI_Y} width={UI_W} height={UI_H} rx={12} fill="var(--neutral-0)" stroke="var(--neutral-300)" strokeWidth={1.25} />
        <text x={UI_X + 16} y={UI_Y + 24} fontSize={14} fontWeight={700} fill="var(--text-strong)">
          UI · Vite + React (TS)
        </text>
        <g transform={`translate(${UI_X + 16} ${UI_Y + 38})`}>
          <User width={16} height={16} strokeWidth={1.75} color="var(--blue-600)" />
        </g>
        <rect x={UI_X + 38} y={UI_Y + 38} width={246} height={26} rx={13} fill="var(--neutral-50)" stroke="var(--neutral-300)" strokeWidth={1.25} />
        <text x={UI_X + 50} y={UI_Y + 55} fontSize={11.5} fill="var(--neutral-700)">
          公司可以不給特休嗎
        </text>
        {UI_CHIPS.map((chip, i) => {
          const chipX = UI_X + 16 + i * 92
          const Icon = chip.icon
          return (
            <g key={chip.label}>
              <rect x={chipX} y={UI_Y + 76} width={84} height={40} rx={8} fill="var(--neutral-50)" stroke="var(--neutral-300)" strokeWidth={1.25} />
              <g transform={`translate(${chipX + 35} ${UI_Y + 84})`}>
                <Icon width={14} height={14} strokeWidth={1.75} color="var(--blue-600)" />
              </g>
              <text x={chipX + 42} y={UI_Y + 110} textAnchor="middle" fontSize={11} fill="var(--neutral-600)">
                {chip.label}
              </text>
            </g>
          )
        })}

        {/* ── 區塊 3：UI ↔ API 雙向箭頭 ── */}
        <ArrowV x={440} y1={UI_BOTTOM} y2={API_Y} />
        <text x={410} y={(UI_BOTTOM + API_Y) / 2 + 4} textAnchor="end" fontSize={11.5} fill="var(--neutral-600)">
          提問
        </text>
        <ArrowV x={588} y1={API_Y} y2={UI_BOTTOM} />
        <text x={618} y={(UI_BOTTOM + API_Y) / 2 + 4} textAnchor="start" fontSize={11.5} fill="var(--neutral-600)">
          條文＋分類＋報告
        </text>

        {/* ── 區塊 4：API · NestJS 常駐服務 ── */}
        <rect x={API_X} y={API_Y} width={API_W} height={API_BOTTOM - API_Y} rx={16} fill="var(--neutral-50)" stroke="var(--neutral-300)" strokeWidth={1} />
        <text x={API_X + 20} y={API_Y + 24} fontSize={15} fontWeight={700} fill="var(--text-strong)">
          API · NestJS 常駐服務
        </text>

        {/* 子區 A：Indexer 元件 */}
        <SubFrame x={SUBA_X} y={SUBBOX_Y} w={SUBA_W} h={SUBBOX_BOTTOM - SUBBOX_Y} title="Indexer 元件" />
        <Badge x={SUBA_CONTENT_X} y={SUBBOX_Y + 32} w={SUBA_CONTENT_W} icon={Settings2} label="管理端觸發．非常駐流程" />

        <IndexerFlowRow icon={FileText} label="勞基法法條" iconY={SUBBOX_Y + 66} pillLabel="Embedding（mistral-embed）" pillY={SUBBOX_Y + 100} />

        {/* 便利貼：PoC 資料來源（中性色，避免與節點 5 的琥珀色混淆） */}
        <g transform={`rotate(-2 ${SUBA_CONTENT_CENTER} ${SUBBOX_Y + 188})`}>
          <rect x={SUBA_X + 10} y={SUBBOX_Y + 148} width={SUBA_W - 20} height={80} rx={8} fill="var(--neutral-50)" stroke="var(--neutral-400)" strokeWidth={1.25} strokeDasharray="5 4" />
          <g transform={`translate(${SUBA_CONTENT_X + 8} ${SUBBOX_Y + 162})`}>
            <StickyNote width={16} height={16} strokeWidth={1.75} color="var(--neutral-500)" />
          </g>
          <text x={SUBA_CONTENT_X + 30} y={SUBBOX_Y + 174} fontSize={11.5} fontWeight={700} fill="var(--neutral-700)">
            PoC 資料來源
          </text>
          <text x={SUBA_CONTENT_X + 8} y={SUBBOX_Y + 194} fontSize={11} fill="var(--neutral-600)">
            勞基法條文 ＋ L1~L3+L6 總表
          </text>
          <text x={SUBA_CONTENT_X + 8} y={SUBBOX_Y + 210} fontSize={11} fill="var(--neutral-600)">
            （可先用 Excel）
          </text>
        </g>

        <IndexerFlowRow icon={Table2} label="L1~L3+L6 總表" iconY={SUBBOX_Y + 258} pillLabel="ETL" pillY={SUBBOX_Y + 292} caption="可先用 Excel" />

        {/* Indexer 兩條寫入路徑：直角折線繞到走廊，再進入右側對應 DataTable */}
        <ElbowArrow
          points={[
            [SUBA_CONTENT_CENTER, SUBBOX_Y + 100],
            [SUBA_CONTENT_CENTER, LANE_1_Y],
            [LANE_TURN_X, LANE_1_Y],
            [LANE_TURN_X, TOP_TABLE_Y + TOP_TABLE_H / 2],
            [TABLE_X, TOP_TABLE_Y + TOP_TABLE_H / 2],
          ]}
        />
        <ElbowArrow
          points={[
            [SUBA_CONTENT_CENTER, SUBBOX_Y + 292],
            [SUBA_CONTENT_CENTER, LANE_2_Y],
            [LANE_TURN_X, LANE_2_Y],
            [LANE_TURN_X, BOTTOM_TABLE_Y + BOTTOM_TABLE_H / 2],
            [TABLE_X, BOTTOM_TABLE_Y + BOTTOM_TABLE_H / 2],
          ]}
        />

        {/* 子區 B：查詢流程 */}
        <SubFrame x={SUBB_X} y={SUBBOX_Y} w={SUBB_W} h={SUBBOX_BOTTOM - SUBBOX_Y} title="查詢流程" />
        <rect x={NODE_X} y={SUBBOX_Y + 32} width={NODE_W} height={24} rx={12} fill="var(--blue-50)" stroke="var(--blue-300)" strokeWidth={1.25} />
        <text x={NODE_CENTER} y={SUBBOX_Y + 48} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--blue-700)">
          唯一模型：mistral-embed（節點 1–4）
        </text>

        {QUERY_NODES.map((node) => (
          <QueryFlowNode key={node.key} node={node} />
        ))}
        <ArrowV x={NODE_CENTER} y1={QUERY_NODES[0].y + QUERY_NODES[0].h} y2={QUERY_NODES[1].y} />
        <ArrowV x={NODE_CENTER} y1={QUERY_NODES[1].y + QUERY_NODES[1].h} y2={QUERY_NODES[2].y} />
        <ArrowV x={NODE_CENTER} y1={QUERY_NODES[2].y + QUERY_NODES[2].h} y2={QUERY_NODES[3].y} />
        <ArrowV x={NODE_CENTER} y1={QUERY_NODES[3].y + QUERY_NODES[3].h} y2={QUERY_NODES[4].y} />

        {/* 節點 3／4 → PostgreSQL（唯一即時查詢介面，藍色實線） */}
        <ArrowH x1={NODE_RIGHT} x2={CYL_LEFT_X} y={NODE3_MID_Y} />
        <text x={(NODE_RIGHT + CYL_LEFT_X) / 2} y={NODE3_MID_Y - 8} textAnchor="middle" fontSize={11.5} fontWeight={700} fill="var(--blue-700)">
          向量相似度查詢
        </text>
        <ArrowH x1={NODE_RIGHT} x2={CYL_LEFT_X} y={NODE4_MID_Y} />
        <text x={(NODE_RIGHT + CYL_LEFT_X) / 2} y={NODE4_MID_Y - 8} textAnchor="middle" fontSize={11.5} fontWeight={700} fill="var(--blue-700)">
          條文代碼 join
        </text>

        {/* ── 區塊 5：右側共用 PostgreSQL ── */}
        <DataTable y={TOP_TABLE_Y} h={TOP_TABLE_H} title="法條 Vector Data" lines={['metadata', '決策樹 L1／L2／L3 編號', '法條內容（vector）']} />
        <line x1={MID_CX} y1={TOP_TABLE_Y + TOP_TABLE_H} x2={MID_CX} y2={CYL_OUTER_TOP} stroke="var(--neutral-400)" strokeWidth={1.25} />

        <path
          d={`M ${CYL_LEFT_X} ${CYL_TOP_CY} L ${CYL_LEFT_X} ${CYL_BOTTOM_CY} A ${CYL_RX} ${CYL_RY} 0 0 0 ${CYL_RIGHT_X} ${CYL_BOTTOM_CY} L ${CYL_RIGHT_X} ${CYL_TOP_CY} Z`}
          fill="var(--neutral-100)"
          stroke="var(--neutral-400)"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        <ellipse cx={MID_CX} cy={CYL_TOP_CY} rx={CYL_RX} ry={CYL_RY} fill="var(--neutral-50)" stroke="var(--neutral-400)" strokeWidth={1.5} />
        <g transform={`translate(${MID_CX - 12} ${CYL_TOP_CY - 4})`}>
          <Database width={24} height={24} strokeWidth={1.75} color="var(--neutral-600)" />
        </g>
        <text x={MID_CX} y={CYL_TOP_CY + 38} textAnchor="middle" fontSize={15} fontWeight={700} fill="var(--text-strong)">
          PostgreSQL
        </text>
        <text x={MID_CX} y={CYL_TOP_CY + 56} textAnchor="middle" fontSize={12} fill="var(--neutral-600)">
          + pgvector
        </text>
        <text x={MID_CX} y={CYL_TOP_CY + 72} textAnchor="middle" fontSize={11} fill="var(--neutral-500)">
          建庫／查詢共用同一庫
        </text>

        <line x1={MID_CX} y1={CYL_OUTER_BOTTOM} x2={MID_CX} y2={BOTTOM_TABLE_Y} stroke="var(--neutral-400)" strokeWidth={1.25} />
        <DataTable y={BOTTOM_TABLE_Y} h={BOTTOM_TABLE_H} title="決策樹分類 Structured Data" lines={['L1：四大類編號', 'L2：主題編號', 'L3：企業端問題類型編號']} />

        {/* ── 區塊 5.5：Langfuse 側掛觀測（非主資料流，僅掛在節點 5） ── */}
        <path
          d={`M ${NODE_CENTER} ${QUERY_NODES[4].y + QUERY_NODES[4].h} L ${NODE_CENTER} 820 L ${LF_CX} 820 L ${LF_CX} ${LF_Y}`}
          fill="none"
          stroke="var(--neutral-400)"
          strokeWidth={1.5}
          strokeDasharray="6 4"
        />
        <text x={(NODE_CENTER + LF_CX) / 2} y={814} textAnchor="middle" fontSize={11} fill="var(--neutral-500)">
          trace
        </text>

        <rect x={LF_X} y={LF_Y} width={LF_W} height={LF_H} rx={12} fill="var(--neutral-0)" stroke="var(--neutral-300)" strokeWidth={1.25} strokeDasharray="6 4" />
        <g transform={`translate(${LF_X + 14} ${LF_Y + 12})`}>
          <Activity width={16} height={16} strokeWidth={1.75} color="var(--neutral-500)" />
        </g>
        <text x={LF_X + 40} y={LF_Y + 24} fontSize={13} fontWeight={700} fill="var(--text-strong)">
          Langfuse · self-host（GCP）
        </text>
        {LANGFUSE_ITEMS.map((item, i) => (
          <g key={item}>
            <circle cx={LF_X + 20} cy={LF_Y + 42 + i * 15} r={2.5} fill="var(--neutral-500)" />
            <text x={LF_X + 28} y={LF_Y + 46 + i * 15} fontSize={11} fill="var(--neutral-600)">
              {item}
            </text>
          </g>
        ))}
        <text x={LF_CX} y={LF_BOTTOM + 22} textAnchor="middle" fontSize={11} fill="var(--neutral-500)">
          不記 embedding 呼叫（量大、單價低）
        </text>

        {/* ── 區塊 6：圖例 ── */}
        <LegendLine x={40} y={1002} dashed />
        <text x={90} y={1006} fontSize={12} fill="var(--text-body)">
          可觀測性（非主資料流）
        </text>

        <LegendLine x={40} y={1032} />
        <text x={90} y={1036} fontSize={12} fill="var(--text-body)">
          實線＋箭頭 ＝ 主資料流；藍色實線 ＝ 關鍵查詢介面
        </text>
        <LegendLine x={620} y={1032} dashed />
        <text x={670} y={1036} fontSize={12} fill="var(--text-body)">
          虛線 ＝ 資料來源／非常駐流程
        </text>

        <LegendSwatch x={40} y={1062} fill="var(--neutral-0)" stroke="var(--neutral-300)" />
        <text x={90} y={1066} fontSize={12} fill="var(--text-body)">
          不經生成式模型
        </text>
        <LegendSwatch x={620} y={1062} fill="var(--warning-50)" stroke="var(--warning-500)" />
        <text x={670} y={1066} fontSize={12} fill="var(--text-body)">
          經生成式模型（僅風險分析報告節點）
        </text>

        {/* ── 區塊 7：核心洞察 callout ── */}
        <rect x={40} y={1094} width={1120} height={90} rx={12} fill="var(--blue-50)" stroke="var(--blue-100)" strokeWidth={1} />
        <rect x={40} y={1094} width={4} height={90} fill="var(--blue-700)" />
        <text x={64} y={1124} fontSize={15} fontWeight={700} fill="var(--blue-700)">
          主線全程不碰生成式模型，只有最末端例外
        </text>
        <text x={64} y={1150} fontSize={12.5} fill="var(--text-body)">
          分類是檢索的副產物，不需要 LLM；
        </text>
        <text x={64} y={1170} fontSize={12.5} fill="var(--text-body)">
          風險分析報告因 L4~L8 規格未到，先用自撰 prompt 暫代生成式模型輸出。
        </text>
      </svg>
    </div>
  )
}
