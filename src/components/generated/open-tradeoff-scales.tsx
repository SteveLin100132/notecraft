import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

interface TradeoffItem {
  id: string;
  title: string;
  leftLabel: string;
  rightLabel: string;
  leftCost: string;
  rightCost: string;
  leftDetail: string;
  rightDetail: string;
}

// ----------------------------------------------------------------
// Data
// ----------------------------------------------------------------

const TRADEOFFS: TradeoffItem[] = [
  {
    id: 'image-access',
    title: '圖片存取策略',
    leftLabel: '公開存取',
    rightLabel: '安全管控',
    leftCost: '方便引用、快速分享',
    rightCost: '受控存取、取用麻煩',
    leftDetail:
      '任何人可直接連結圖片，便於外部引用與嵌入，但會暴露儲存路徑與潛在資安風險，難以區分授權與非授權讀者。',
    rightDetail:
      '透過 token 或登入驗證保護圖片，資料更安全，但每次取用都需要額外步驟，增加開發與維護成本。',
  },
  {
    id: 'ai-issue-split',
    title: 'AI 拆分 Issue',
    leftLabel: '拆分效率',
    rightLabel: '拆分品質',
    leftCost: '快速自動化，省力',
    rightCost: '人工校正，耗時',
    leftDetail:
      'AI 可在秒級批次拆分大量 issue，顯著降低人力成本，但拆出的粒度或關聯性可能偏差，需後續補救。',
    rightDetail:
      '由人工或嚴格規則審查拆分結果，確保每條 issue 語意清晰、可追蹤，但速度慢且難以規模化。',
  },
  {
    id: 'usability-scalability',
    title: '系統設計方向',
    leftLabel: '易用性',
    rightLabel: '可擴展性',
    leftCost: '上手快、摩擦低',
    rightCost: '架構彈性、長期穩健',
    leftDetail:
      '針對當前使用者情境優化操作流程，降低學習曲線，但往往做出假設與硬編碼，讓後續擴充更困難。',
    rightDetail:
      '以抽象層、介面與模組化設計為優先，具備長期演化的彈性，但早期版本對使用者可能顯得複雜。',
  },
];

// ----------------------------------------------------------------
// Balance Scale SVG
// ----------------------------------------------------------------

interface ScaleSVGProps {
  /** -1 (full left) .. +1 (full right) */
  tilt: number;
  reduced: boolean;
}

function ScaleSVG({ tilt, reduced }: ScaleSVGProps) {
  // Beam rotates around its center; max ±20 deg
  const beamAngle = tilt * 20;
  // Pan vertical offset based on tilt (left pan goes down when tilt < 0)
  const leftPanY = -tilt * 28;
  const rightPanY = tilt * 28;

  const transition = reduced
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 180, damping: 22 };

  // SVG coordinate constants
  const CX = 160; // pivot x
  const CY = 90;  // pivot y
  const BEAM_HALF = 110;
  const CHAIN_LEN = 40;
  const PAN_W = 64;
  const PAN_H = 12;
  const PAN_RX = 6;

  return (
    <svg
      viewBox="0 0 320 210"
      width="100%"
      aria-hidden="true"
      className="select-none"
    >
      {/* Stand pole */}
      <line
        x1={CX}
        y1={CY}
        x2={CX}
        y2={190}
        stroke="#cbd3df"
        strokeWidth={5}
        strokeLinecap="round"
      />
      {/* Base */}
      <rect
        x={CX - 40}
        y={188}
        width={80}
        height={10}
        rx={5}
        fill="#cbd3df"
      />
      {/* Pivot circle */}
      <circle cx={CX} cy={CY} r={7} fill="#6c798e" />

      {/* Animated beam group */}
      <motion.g
        style={{ originX: `${CX}px`, originY: `${CY}px` }}
        animate={{ rotate: beamAngle }}
        transition={transition}
      >
        {/* Beam */}
        <line
          x1={CX - BEAM_HALF}
          y1={CY}
          x2={CX + BEAM_HALF}
          y2={CY}
          stroke="#3a4456"
          strokeWidth={4}
          strokeLinecap="round"
        />

        {/* Left chain */}
        <line
          x1={CX - BEAM_HALF}
          y1={CY}
          x2={CX - BEAM_HALF}
          y2={CY + CHAIN_LEN}
          stroke="#9aa6b8"
          strokeWidth={2}
          strokeDasharray="4 3"
        />
        {/* Right chain */}
        <line
          x1={CX + BEAM_HALF}
          y1={CY}
          x2={CX + BEAM_HALF}
          y2={CY + CHAIN_LEN}
          stroke="#9aa6b8"
          strokeWidth={2}
          strokeDasharray="4 3"
        />

        {/* Left pan */}
        <motion.rect
          x={CX - BEAM_HALF - PAN_W / 2}
          y={CY + CHAIN_LEN - PAN_H / 2}
          width={PAN_W}
          height={PAN_H}
          rx={PAN_RX}
          fill="#1b4f9c"
          animate={{ y: CY + CHAIN_LEN - PAN_H / 2 + leftPanY }}
          transition={transition}
        />

        {/* Right pan */}
        <motion.rect
          x={CX + BEAM_HALF - PAN_W / 2}
          y={CY + CHAIN_LEN - PAN_H / 2}
          width={PAN_W}
          height={PAN_H}
          rx={PAN_RX}
          fill="#ed9b26"
          animate={{ y: CY + CHAIN_LEN - PAN_H / 2 + rightPanY }}
          transition={transition}
        />
      </motion.g>
    </svg>
  );
}

// ----------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------

export default function OpenTradeoffScales() {
  const [activeIndex, setActiveIndex] = useState(0);
  // tilt values per tradeoff: -1 = full left, 0 = center, +1 = full right
  const [tilts, setTilts] = useState<number[]>([0, 0, 0]);
  const reduced = useReducedMotion() ?? false;

  const item = TRADEOFFS[activeIndex];
  const tilt = tilts[activeIndex];

  function setTilt(val: number) {
    setTilts((prev) => {
      const next = [...prev];
      next[activeIndex] = val;
      return next;
    });
  }

  function handlePrev() {
    setActiveIndex((i) => (i - 1 + TRADEOFFS.length) % TRADEOFFS.length);
  }

  function handleNext() {
    setActiveIndex((i) => (i + 1) % TRADEOFFS.length);
  }

  // Interpolate label opacity based on tilt
  const leftStrength = Math.max(0, -tilt);   // 0..1 when tilt < 0
  const rightStrength = Math.max(0, tilt);   // 0..1 when tilt > 0

  return (
    <div className="not-prose max-w-2xl mx-auto space-y-6 py-2">

      {/* Tab navigation */}
      <div className="flex items-center gap-2" role="tablist" aria-label="兩難取捨天秤">
        <button
          onClick={handlePrev}
          aria-label="上一組"
          className="rounded-full p-1.5 text-neutral-500 hover:text-blue-700 hover:bg-blue-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="flex gap-1.5 flex-1 justify-center">
          {TRADEOFFS.map((t, i) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={i === activeIndex}
              onClick={() => setActiveIndex(i)}
              className={clsx(
                'px-3 py-1 rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                i === activeIndex
                  ? 'bg-blue-700 text-white'
                  : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
              )}
            >
              {t.title}
            </button>
          ))}
        </div>

        <button
          onClick={handleNext}
          aria-label="下一組"
          className="rounded-full p-1.5 text-neutral-500 hover:text-blue-700 hover:bg-blue-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Scale panel */}
      <motion.div
        key={item.id}
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="rounded-xl border border-neutral-200 bg-neutral-50 overflow-hidden"
        role="tabpanel"
        aria-label={item.title}
      >
        {/* Labels above scale */}
        <div className="flex justify-between items-center px-6 pt-5 pb-1">
          <span
            className={clsx(
              'text-sm font-semibold transition-colors duration-200',
              leftStrength > 0.1 ? 'text-blue-700' : 'text-neutral-400'
            )}
          >
            {item.leftLabel}
          </span>
          <span
            className={clsx(
              'text-sm font-semibold transition-colors duration-200',
              rightStrength > 0.1 ? 'text-orange-500' : 'text-neutral-400'
            )}
          >
            {item.rightLabel}
          </span>
        </div>

        {/* SVG scale */}
        <div className="px-6">
          <ScaleSVG tilt={tilt} reduced={reduced} />
        </div>

        {/* Slider */}
        <div className="px-8 pb-5">
          <input
            type="range"
            min={-10}
            max={10}
            step={1}
            value={Math.round(tilt * 10)}
            onChange={(e) => setTilt(Number(e.target.value) / 10)}
            aria-label={`${item.leftLabel} 到 ${item.rightLabel} 的偏好`}
            className="w-full accent-blue-700 cursor-pointer"
          />
          <div className="flex justify-between text-xs text-neutral-400 mt-0.5 select-none">
            <span>偏左</span>
            <span>平衡</span>
            <span>偏右</span>
          </div>
        </div>
      </motion.div>

      {/* Cost cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Left cost card */}
        <motion.div
          animate={{ opacity: tilt <= 0.6 ? 1 : 0.45 }}
          transition={reduced ? { duration: 0 } : { duration: 0.2 }}
          className="rounded-xl border border-blue-200 bg-blue-50 p-4"
        >
          <p className="text-xs font-semibold text-blue-700 mb-1 uppercase tracking-wide">
            {item.leftLabel}
          </p>
          <p className="text-sm font-medium text-blue-900 mb-2">{item.leftCost}</p>
          <p className="text-xs text-blue-800 leading-relaxed">{item.leftDetail}</p>
        </motion.div>

        {/* Right cost card */}
        <motion.div
          animate={{ opacity: tilt >= -0.6 ? 1 : 0.45 }}
          transition={reduced ? { duration: 0 } : { duration: 0.2 }}
          className="rounded-xl border border-orange-200 bg-orange-50 p-4"
        >
          <p className="text-xs font-semibold text-orange-600 mb-1 uppercase tracking-wide">
            {item.rightLabel}
          </p>
          <p className="text-sm font-medium text-orange-900 mb-2">{item.rightCost}</p>
          <p className="text-xs text-orange-900 leading-relaxed">{item.rightDetail}</p>
        </motion.div>
      </div>

      {/* Insight callout */}
      <div className="rounded-xl border border-neutral-200 bg-white px-5 py-4 flex gap-3 items-start">
        <span className="mt-0.5 shrink-0 text-neutral-400">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.5" />
            <path d="M9 8v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="9" cy="5.5" r="0.75" fill="currentColor" />
          </svg>
        </span>
        <p className="text-sm text-neutral-600 leading-relaxed">
          這些是<strong className="text-neutral-800">沒有標準答案的開放取捨</strong>——
          天秤兩端都有代價。拖動滑桿，感受在不同情境下你會如何權衡，
          比找到「正確答案」更重要的是意識到自己正在做選擇。
        </p>
      </div>
    </div>
  );
}
