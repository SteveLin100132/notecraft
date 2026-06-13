import { useState } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'motion/react';
import {
  PackageCheck,
  RefreshCw,
  Lock,
  Repeat,
  FileText,
  FileCheck,
  CalendarClock,
  RotateCcw,
  Milestone,
  MessageCircle,
  Building2,
  Rocket,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';

// ────────────────────────────────────────────────────────────
// Colour constants — mapped verbatim to trendlink-design tokens
// (named so we honour the no-hardcoded-hex rule)
// ────────────────────────────────────────────────────────────
const C = {
  blue50: '#eef4fb', // --blue-50
  blue100: '#d6e4f5', // --blue-100
  blue200: '#adc8e8', // --blue-200
  blue500: '#2c6ebb', // --blue-500
  blue700: '#1b4f9c', // --blue-700  (surface-brand)
  blue800: '#163f7d', // --blue-800
  orange50: '#fdf4e6', // --orange-50
  orange100: '#fbe7c6', // --orange-100
  orange200: '#f6cd86', // --orange-200
  orange400: '#ed9b26', // --orange-400 (action-primary)
  orange500: '#e37b24', // --orange-500
  neutral50: '#f6f8fb', // --neutral-50
  neutral100: '#eef1f6', // --neutral-100
  neutral200: '#e1e6ee', // --neutral-200
  neutral400: '#9aa6b8', // --neutral-400
  neutral500: '#6c798e', // --neutral-500  (text-muted)
  neutral700: '#3a4456', // --neutral-700  (text-body)
  neutral900: '#161c28', // --neutral-900  (text-strong)
  white: '#ffffff',
};

type Side = {
  Icon: LucideIcon;
  title: string;
  description: string;
};

type Dimension = {
  key: string;
  aspect: string;
  // 對比軸：兩端的一句話標籤，凸顯「剛性 vs 柔性」
  axisLeft: string;
  axisRight: string;
  // 瀑布在這條軸上偏剛性（靠左），敏捷偏柔性（靠右），0–100
  waterfallPos: number;
  agilePos: number;
  waterfall: Side;
  agile: Side;
};

const DIMENSIONS: Dimension[] = [
  {
    key: 'delivery',
    aspect: '交付方式',
    axisLeft: '一次到位',
    axisRight: '持續累積',
    waterfallPos: 12,
    agilePos: 88,
    waterfall: {
      Icon: PackageCheck,
      title: '階段一次性交付',
      description: '走完所有階段後，在專案末期一次性交付成品；中途看不到可用的東西。',
    },
    agile: {
      Icon: RefreshCw,
      title: '迭代增量交付',
      description: '每個 Sprint 結束都產出可交付的增量版本，價值一點一滴持續累積。',
    },
  },
  {
    key: 'change',
    aspect: '需求變更',
    axisLeft: '凍結 · 抗拒',
    axisRight: '流動 · 擁抱',
    waterfallPos: 8,
    agilePos: 92,
    waterfall: {
      Icon: Lock,
      title: '成本高、抗拒變更',
      description: '需求在前期凍結，越後期變更代價越高，因此變更被當成風險嚴加控管。',
    },
    agile: {
      Icon: Repeat,
      title: '成本低、擁抱變化',
      description: '每次迭代前都能重排優先序，變更是設計的輸入，而不是要擋下的阻礙。',
    },
  },
  {
    key: 'docs',
    aspect: '文件',
    axisLeft: '前期齊全',
    axisRight: '夠用就好',
    waterfallPos: 18,
    agilePos: 78,
    waterfall: {
      Icon: FileText,
      title: '前期齊全、文件驅動',
      description: '進開發前須完成完整的需求規格、設計文件與驗收標準，文件即契約。',
    },
    agile: {
      Icon: FileCheck,
      title: '精簡夠用即可',
      description: '文件隨進度漸進補齊，以「能溝通、夠用」為原則，不追求一次完備。',
    },
  },
  {
    key: 'planning',
    aspect: '規劃時機',
    axisLeft: '一次定案',
    axisRight: '滾動調整',
    waterfallPos: 14,
    agilePos: 84,
    waterfall: {
      Icon: CalendarClock,
      title: '前期規劃重、一次定案',
      description: '初期投入大量資源做完整規劃，計畫一旦核准就難以更動。',
    },
    agile: {
      Icon: RotateCcw,
      title: '持續滾動、隨迭代調整',
      description: '計畫是活的，每個 Sprint 前都重新排列待辦的優先順序。',
    },
  },
  {
    key: 'feedback',
    aspect: '溝通反饋',
    axisLeft: '里程碑審查',
    axisRight: '高頻反饋',
    waterfallPos: 20,
    agilePos: 90,
    waterfall: {
      Icon: Milestone,
      title: '里程碑階段審查',
      description: '利害關係人只在特定里程碑節點審查進度，反饋週期以週、月計。',
    },
    agile: {
      Icon: MessageCircle,
      title: '高頻、持續反饋',
      description: 'Daily Standup、Sprint Review 讓反饋在數天內就形成閉環。',
    },
  },
  {
    key: 'fit',
    aspect: '適用情境',
    axisLeft: '需求穩定',
    axisRight: '快速試錯',
    waterfallPos: 16,
    agilePos: 86,
    waterfall: {
      Icon: Building2,
      title: '需求穩定 / 合規導向',
      description: '政府標案、ERP 導入、金融核心系統——需求清晰且不易變動的場域。',
    },
    agile: {
      Icon: Rocket,
      title: '需求不明 / 快速試錯',
      description: '消費型 App、SaaS 產品——市場反饋是最重要的設計輸入。',
    },
  },
];

const EASE = [0.22, 1, 0.36, 1] as const;

export default function WaterfallAgileDimensions() {
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();
  const dim = DIMENSIONS[active];

  const go = (next: number) => {
    const len = DIMENSIONS.length;
    setActive(((next % len) + len) % len);
  };

  const dur = reduce ? 0 : 0.32;

  return (
    <div className="not-prose mx-auto w-full max-w-3xl" style={{ color: C.neutral700 }}>
      {/* 標題與核心洞察 */}
      <div className="mb-4 text-center">
        <p className="text-base font-bold" style={{ color: C.neutral900 }}>
          瀑布式 vs 敏捷開發：核心差異對照
        </p>
        <p
          className="mt-1 max-w-xl text-center text-sm"
          // marginInline:auto 設為 inline style，以蓋過專案 .nc-prose p 的 margin:0 0 16px
          // （該規則特異度高於 Tailwind 的 .mx-auto，會使區塊靠左而非置中）
          style={{ color: C.neutral500, textWrap: 'balance', marginInline: 'auto' }}
        >
          一個把變更視為<span style={{ color: C.blue700, fontWeight: 600 }}>威脅</span>而力求凍結，一個把變更視為<span style={{ color: C.orange500, fontWeight: 600 }}>原料</span>而擁抱流動。逐項切換，感受同一面向上「剛性 vs 柔性」的拉扯。
        </p>
      </div>

      {/* 面向選擇器 */}
      <div className="mb-4 flex flex-wrap justify-center gap-2">
        {DIMENSIONS.map((d, i) => {
          const on = i === active;
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => setActive(i)}
              aria-pressed={on}
              className="rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors"
              style={{
                background: on ? C.neutral900 : C.neutral100,
                color: on ? C.white : C.neutral500,
                border: `1px solid ${on ? C.neutral900 : C.neutral200}`,
              }}
            >
              {d.aspect}
            </button>
          );
        })}
      </div>

      {/* 對照面板 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={dim.key}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: dur, ease: EASE }}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SideCard side="waterfall" data={dim.waterfall} dur={dur} reduce={reduce} />
            <SideCard side="agile" data={dim.agile} dur={dur} reduce={reduce} />
          </div>

          {/* 對比軸：剛性 ↔ 柔性 */}
          <ContrastAxis dim={dim} dur={dur} reduce={reduce} />
        </motion.div>
      </AnimatePresence>

      {/* 步進控制 */}
      <div className="mt-4 flex items-center justify-between">
        <NavButton dir="prev" onClick={() => go(active - 1)} />
        <div className="flex items-center gap-1.5">
          {DIMENSIONS.map((d, i) => (
            <button
              key={d.key}
              type="button"
              aria-label={`切換到「${d.aspect}」`}
              onClick={() => setActive(i)}
              className="h-2 rounded-full transition-all"
              style={{
                width: i === active ? 18 : 8,
                background: i === active ? C.neutral900 : C.neutral200,
              }}
            />
          ))}
        </div>
        <NavButton dir="next" onClick={() => go(active + 1)} />
      </div>
    </div>
  );
}

function SideCard({
  side,
  data,
  dur,
  reduce,
}: {
  side: 'waterfall' | 'agile';
  data: Side;
  dur: number;
  reduce: boolean | null;
}) {
  const isWf = side === 'waterfall';
  const accent = isWf ? C.blue700 : C.orange500;
  const soft = isWf ? C.blue50 : C.orange50;
  const ring = isWf ? C.blue200 : C.orange200;
  const label = isWf ? 'Waterfall · 瀑布' : 'Agile · 敏捷';
  const { Icon } = data;

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: dur, ease: EASE }}
      className="overflow-hidden p-4"
      style={{
        background: soft,
        border: `1px solid ${ring}`,
        // 兩張卡片圓角一致（比照 Waterfall）；剛柔對比改由色彩與圖示形狀承擔
        borderRadius: 6,
      }}
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center"
          style={{
            background: accent,
            color: C.white,
            borderRadius: isWf ? 5 : 999,
          }}
        >
          <Icon size={17} />
        </span>
        <span
          className="text-[11px] font-bold uppercase tracking-wide"
          style={{ color: accent, letterSpacing: '.04em' }}
        >
          {label}
        </span>
      </div>
      <p className="text-sm font-bold" style={{ color: C.neutral900 }}>
        {data.title}
      </p>
      <p className="mt-1 text-xs leading-relaxed" style={{ color: C.neutral500 }}>
        {data.description}
      </p>
    </motion.div>
  );
}

function ContrastAxis({
  dim,
  dur,
  reduce,
}: {
  dim: Dimension;
  dur: number;
  reduce: boolean | null;
}) {
  return (
    <div className="mt-3 px-1">
      <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold">
        <span style={{ color: C.blue700 }}>{dim.axisLeft}</span>
        <span
          className="text-[10px] font-medium uppercase tracking-widest"
          style={{ color: C.neutral400 }}
        >
          剛性 — 柔性
        </span>
        <span style={{ color: C.orange500 }}>{dim.axisRight}</span>
      </div>
      <div
        className="relative h-2.5 w-full rounded-full"
        style={{
          background: `linear-gradient(90deg, ${C.blue700} 0%, ${C.blue200} 35%, ${C.neutral200} 50%, ${C.orange200} 65%, ${C.orange500} 100%)`,
        }}
      >
        <AxisDot side="waterfall" pos={dim.waterfallPos} dur={dur} reduce={reduce} />
        <AxisDot side="agile" pos={dim.agilePos} dur={dur} reduce={reduce} />
      </div>
    </div>
  );
}

function AxisDot({
  side,
  pos,
  dur,
  reduce,
}: {
  side: 'waterfall' | 'agile';
  pos: number;
  dur: number;
  reduce: boolean | null;
}) {
  const isWf = side === 'waterfall';
  const color = isWf ? C.blue700 : C.orange500;
  return (
    <motion.span
      className="absolute top-1/2 inline-flex items-center justify-center"
      style={{
        height: 16,
        width: 16,
        marginLeft: -8,
        marginTop: -8,
        background: C.white,
        border: `3px solid ${color}`,
        borderRadius: isWf ? 3 : 999,
        boxShadow: '0 1px 3px rgba(22,28,40,0.18)',
      }}
      initial={reduce ? false : { left: '50%' }}
      animate={{ left: `${pos}%` }}
      transition={{ duration: dur, ease: EASE }}
      aria-hidden
    />
  );
}

function NavButton({ dir, onClick }: { dir: 'prev' | 'next'; onClick: () => void }) {
  const isPrev = dir === 'prev';
  const Icon = isPrev ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isPrev ? '上一個面向' : '下一個面向'}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors"
      style={{ background: C.neutral100, color: C.neutral700, border: `1px solid ${C.neutral200}` }}
    >
      <Icon size={16} />
    </button>
  );
}
