import React, { useState, useEffect, useRef } from 'react';
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  useAnimation,
} from 'motion/react';
import {
  PlayCircle,
  RotateCcw,
  Flag,
  CheckCircle,
  RefreshCw,
  Lock,
  Inbox,
  Zap,
  Ruler,
  Clock,
  Wallet,
  Star,
  TrendingUp,
} from 'lucide-react';

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------
type TabIndex = 0 | 1 | 2;

interface MetricCard {
  label: string;
  baseValue: number;
  unit: string;
}

// -----------------------------------------------------------------------
// Static data
// -----------------------------------------------------------------------
const TABS: { label: string; short: string }[] = [
  { label: '生命週期', short: '生命週期' },
  { label: '需求變動', short: '需求變動' },
  { label: '衡量標準', short: '衡量標準' },
];

const CR_PROJECT_STEPS = [
  { label: '評估影響範疇' },
  { label: 'CR 提案文件' },
  { label: '多層簽核審批' },
  { label: '批准後執行變更' },
];

const CR_PRODUCT_STEPS = [
  { label: '加入 Backlog' },
  { label: '排序優先級' },
  { label: '下個 Sprint 執行' },
];

const FIXED_METRICS: { label: string; icon: React.ReactElement }[] = [
  { label: '範疇', icon: <Ruler size={16} className="text-blue-700" /> },
  { label: '時程', icon: <Clock size={16} className="text-blue-700" /> },
  { label: '預算', icon: <Wallet size={16} className="text-blue-700" /> },
  { label: '品質', icon: <Star size={16} className="text-blue-700" /> },
];

const FLOATING_METRICS: MetricCard[] = [
  { label: '留存率', baseValue: 72, unit: '%' },
  { label: 'DAU:MAU', baseValue: 18, unit: '%' },
  { label: '轉換率', baseValue: 3.4, unit: '%' },
  { label: '商業價值', baseValue: 85, unit: '%' },
];

// -----------------------------------------------------------------------
// Sub-panels
// -----------------------------------------------------------------------

// --- Tab 1: Lifecycle ---

interface LifecyclePanelProps {
  reducedMotion: boolean;
}

function LifecyclePanel({ reducedMotion }: LifecyclePanelProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playKey, setPlayKey] = useState(0);

  const projectControls = useAnimation();
  const productControls = useAnimation();

  const handlePlay = () => {
    if (isPlaying) {
      // Reset
      setIsPlaying(false);
      projectControls.set({ pathLength: 0 });
      productControls.set({ pathLength: 0 });
      setPlayKey((k) => k + 1);
    } else {
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    if (!isPlaying) return;

    if (reducedMotion) {
      projectControls.set({ pathLength: 1 });
      productControls.set({ pathLength: 1 });
      return;
    }

    projectControls.start({
      pathLength: 1,
      transition: { duration: 1.2, ease: 'easeOut' },
    });
    productControls.start({
      pathLength: 1,
      transition: { duration: 2.4, ease: 'easeOut' },
    });
  }, [isPlaying, playKey, reducedMotion, projectControls, productControls]);

  const showEndState = isPlaying || reducedMotion;

  return (
    <div className="flex flex-col gap-4">
      {/* Labels */}
      <div className="flex justify-between text-xs font-semibold px-1">
        <span style={{ color: 'var(--blue-700)' }}>專案 Project</span>
        <span style={{ color: 'var(--orange-500)' }}>產品 Product</span>
      </div>

      {/* SVG canvas */}
      <div className="relative w-full">
        <svg viewBox="0 0 560 160" width="100%" className="overflow-visible">
          {/* Background grid lines */}
          <line x1="0" y1="140" x2="560" y2="140" stroke="var(--neutral-200)" strokeWidth="1" />

          {/* Project path: straight horizontal line that ends at a flag */}
          <motion.path
            key={`project-${playKey}`}
            d="M 20 80 L 300 80"
            stroke="var(--blue-700)"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            initial={{ pathLength: reducedMotion ? 1 : 0 }}
            animate={projectControls}
          />

          {/* Product path: extends further and curves into a loop (iterative cycle) */}
          <motion.path
            key={`product-${playKey}`}
            d="M 20 110 L 220 110 C 260 110 280 90 300 90 C 340 90 360 70 380 70 C 420 70 440 90 460 90 C 480 90 490 80 500 80 C 520 80 535 90 540 100 C 545 110 535 120 520 120 C 505 120 495 110 500 100"
            stroke="var(--orange-500)"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            initial={{ pathLength: reducedMotion ? 1 : 0 }}
            animate={productControls}
          />

          {/* Project endpoint: Flag icon area — rendered as SVG group */}
          {showEndState && (
            <g transform="translate(293, 68)">
              {/* Flag pole */}
              <line x1="0" y1="0" x2="0" y2="20" stroke="var(--blue-700)" strokeWidth="1.5" />
              {/* Flag shape */}
              <polygon points="0,0 14,4 0,8" fill="var(--blue-700)" />
            </g>
          )}

          {/* Delivery text */}
          {showEndState && (
            <text
              x="305"
              y="96"
              fontSize="9"
              fill="var(--blue-700)"
              fontWeight="600"
              fontFamily="var(--font-sans, sans-serif)"
            >
              交付完成
            </text>
          )}

          {/* Product tail: RefreshCw icon hint as arc arrow */}
          {showEndState && (
            <>
              <path
                d="M 492 92 A 10 10 0 1 1 508 92"
                stroke="var(--orange-500)"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
              />
              <polygon
                points="508,92 512,86 514,94"
                fill="var(--orange-500)"
              />
              <text
                x="502"
                y="128"
                fontSize="9"
                fill="var(--orange-500)"
                fontWeight="600"
                textAnchor="middle"
                fontFamily="var(--font-sans, sans-serif)"
              >
                持續迭代
              </text>
            </>
          )}

          {/* Start dots */}
          <circle cx="20" cy="80" r="4" fill="var(--blue-700)" />
          <circle cx="20" cy="110" r="4" fill="var(--orange-500)" />

          {/* Time axis label */}
          <text
            x="560"
            y="155"
            fontSize="9"
            fill="var(--neutral-400)"
            textAnchor="end"
            fontFamily="var(--font-sans, sans-serif)"
          >
            時間
          </text>
          <polygon points="555,138 560,143 555,148" fill="var(--neutral-400)" />
        </svg>
      </div>

      {/* Legend row */}
      <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5 h-0.5" style={{ backgroundColor: 'var(--blue-700)' }} />
          <Flag size={12} className="text-blue-700" />
          專案線（有限期）
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5 h-0.5" style={{ backgroundColor: 'var(--orange-500)' }} />
          <RefreshCw size={12} style={{ color: 'var(--orange-500)' }} />
          產品線（持續迭代）
        </span>
      </div>

      {/* Play / Reset button */}
      <div className="flex justify-center">
        <button
          onClick={handlePlay}
          className="flex items-center gap-2 px-5 py-2 text-xs font-semibold transition-all"
          style={{
            backgroundColor: isPlaying ? 'var(--neutral-100)' : 'var(--blue-700)',
            color: isPlaying ? 'var(--text-body)' : 'var(--text-on-brand)',
            borderRadius: 'var(--radius-pill)',
            boxShadow: isPlaying ? 'var(--shadow-xs)' : 'var(--shadow-sm)',
          }}
        >
          {isPlaying ? (
            <>
              <RotateCcw size={16} />
              重設
            </>
          ) : (
            <>
              <PlayCircle size={16} />
              播放
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// --- Tab 2: Change Request ---

interface ChangeRequestPanelProps {
  reducedMotion: boolean;
}

function ChangeRequestPanel({ reducedMotion }: ChangeRequestPanelProps) {
  const [revealed, setRevealed] = useState(false);

  const containerVariants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.12 },
    },
  };

  const productContainerVariants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.08 },
    },
  };

  const itemVariants = {
    hidden: reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.28, ease: 'easeOut' as const },
    },
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Two columns */}
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: 'repeat(2, 1fr)',
        }}
      >
        {/* Project column */}
        <div className="flex flex-col gap-2">
          <div
            className="flex items-center gap-1.5 text-xs font-semibold mb-1"
            style={{ color: 'var(--blue-700)' }}
          >
            <Lock size={14} style={{ color: 'var(--blue-700)' }} />
            專案：正式變更流程
          </div>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={revealed || reducedMotion ? 'visible' : 'hidden'}
            className="flex flex-col gap-2"
          >
            {CR_PROJECT_STEPS.map((step, i) => (
              <motion.div
                key={i}
                variants={itemVariants}
                className="px-3 py-2.5 text-xs rounded-lg"
                style={{
                  backgroundColor: 'var(--blue-50)',
                  border: '1px solid var(--blue-200)',
                  color: 'var(--text-body)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <span
                  className="inline-block w-4 h-4 text-center leading-4 text-xs font-bold mr-1.5 rounded-full"
                  style={{
                    backgroundColor: 'var(--blue-700)',
                    color: 'var(--text-on-brand)',
                  }}
                >
                  {i + 1}
                </span>
                {step.label}
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Product column */}
        <div className="flex flex-col gap-2">
          <div
            className="flex items-center gap-1.5 text-xs font-semibold mb-1"
            style={{ color: 'var(--orange-500)' }}
          >
            <Inbox size={14} style={{ color: 'var(--orange-500)' }} />
            產品：輕量 Backlog 流程
          </div>
          <motion.div
            variants={productContainerVariants}
            initial="hidden"
            animate={revealed || reducedMotion ? 'visible' : 'hidden'}
            className="flex flex-col gap-2"
          >
            {CR_PRODUCT_STEPS.map((step, i) => (
              <motion.div
                key={i}
                variants={itemVariants}
                className="px-3 py-2.5 text-xs"
                style={{
                  backgroundColor: 'var(--orange-50)',
                  border: '1px solid var(--orange-200)',
                  color: 'var(--text-body)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <span
                  className="inline-block w-4 h-4 text-center leading-4 text-xs font-bold mr-1.5 rounded-full"
                  style={{
                    backgroundColor: 'var(--orange-500)',
                    color: 'var(--text-on-brand)',
                  }}
                >
                  {i + 1}
                </span>
                {step.label}
              </motion.div>
            ))}
          </motion.div>

          {/* Spacer to fill height difference */}
          <div
            className="px-3 py-2.5 text-xs"
            style={{
              border: '1px dashed var(--orange-200)',
              color: 'var(--text-muted)',
              borderRadius: 'var(--radius-md)',
              opacity: revealed || reducedMotion ? 1 : 0,
            }}
          >
            <span className="italic">通常一週內上線</span>
          </div>
        </div>
      </div>

      {/* Trigger button */}
      {!revealed && !reducedMotion && (
        <div className="flex justify-center">
          <button
            onClick={() => setRevealed(true)}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold transition-all"
            style={{
              backgroundColor: 'var(--orange-400)',
              color: 'var(--text-on-brand)',
              borderRadius: 'var(--radius-pill)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <Zap size={16} />
            模擬需求變更
          </button>
        </div>
      )}

      {revealed && (
        <div className="flex justify-center">
          <button
            onClick={() => setRevealed(false)}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold transition-all"
            style={{
              backgroundColor: 'var(--neutral-100)',
              color: 'var(--text-muted)',
              borderRadius: 'var(--radius-pill)',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <RotateCcw size={14} />
            重設
          </button>
        </div>
      )}
    </div>
  );
}

// --- Tab 3: Metrics ---

interface FloatingValue {
  value: number;
}

function MetricsPanel({ reducedMotion }: { reducedMotion: boolean }) {
  const [floatingValues, setFloatingValues] = useState<FloatingValue[]>(
    FLOATING_METRICS.map((m) => ({ value: m.baseValue }))
  );

  useEffect(() => {
    if (reducedMotion) return;

    const interval = setInterval(() => {
      setFloatingValues((prev) =>
        prev.map((fv, i) => {
          const delta = (Math.random() - 0.5) * 6; // +-3%
          const base = FLOATING_METRICS[i].baseValue;
          const next = Math.min(Math.max(base + delta, base - 3), base + 3);
          return { value: Math.round(next * 10) / 10 };
        })
      );
    }, 2500);

    return () => clearInterval(interval);
  }, [reducedMotion]);

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Fixed metrics */}
      <div className="flex flex-col gap-2">
        <div
          className="text-xs font-semibold mb-1"
          style={{ color: 'var(--blue-700)' }}
        >
          專案：固定指標
        </div>
        <div className="grid grid-cols-2 gap-2">
          {FIXED_METRICS.map((m, i) => (
            <div
              key={i}
              className="flex flex-col items-center justify-center gap-1 py-3 px-2 text-xs text-center"
              style={{
                backgroundColor: 'var(--surface-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-xs)',
                color: 'var(--text-body)',
              }}
            >
              {m.icon}
              <span className="font-medium">{m.label}</span>
            </div>
          ))}
        </div>
        <div
          className="flex items-center justify-center gap-1.5 mt-1 text-xs py-1.5"
          style={{
            borderTop: '1px dashed var(--blue-200)',
            color: 'var(--text-muted)',
          }}
        >
          基準固定
        </div>
      </div>

      {/* Floating metrics */}
      <div className="flex flex-col gap-2">
        <div
          className="text-xs font-semibold mb-1"
          style={{ color: 'var(--orange-500)' }}
        >
          產品：浮動指標
        </div>
        <div className="grid grid-cols-2 gap-2">
          {FLOATING_METRICS.map((m, i) => (
            <div
              key={i}
              className="flex flex-col items-center justify-center gap-1 py-3 px-2 text-xs text-center"
              style={{
                backgroundColor: 'var(--surface-accent-soft)',
                border: '1px solid var(--orange-200)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-xs)',
                color: 'var(--text-body)',
              }}
            >
              <TrendingUp size={16} style={{ color: 'var(--orange-500)' }} />
              <span className="font-medium">{m.label}</span>
              <span
                className="font-bold text-sm tabular-nums"
                style={{ color: 'var(--orange-500)' }}
              >
                {floatingValues[i].value.toFixed(1)}{m.unit}
              </span>
            </div>
          ))}
        </div>
        <div
          className="flex items-center justify-center gap-1.5 mt-1 text-xs py-1.5"
          style={{
            borderTop: '1px dashed var(--orange-200)',
            color: 'var(--text-muted)',
          }}
        >
          <RefreshCw size={12} style={{ color: 'var(--orange-500)' }} />
          指標隨驗證假設更新（示意數值）
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------
// Main component
// -----------------------------------------------------------------------
export default function PmProjectVsProduct(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<TabIndex>(0);
  const reducedMotion = useReducedMotion() ?? false;
  const tabBarRef = useRef<HTMLDivElement>(null);

  const panelVariants = {
    initial: reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 },
    animate: reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 },
    exit: reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 },
  };

  const panelTransition = { duration: 0.2, ease: 'easeOut' as const };

  return (
    <figure
      className="not-prose my-8 mx-auto"
      style={{
        maxWidth: '48rem',
        backgroundColor: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-md)',
        padding: '1.5rem',
      }}
    >
      {/* Core insight eyebrow */}
      <p
        className="text-xs text-center tracking-wide mb-4"
        style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}
      >
        專案問「我有沒有把該做的做完」，產品問「我有沒有做對的事」。
      </p>

      {/* Tab navigation */}
      <div
        ref={tabBarRef}
        className="relative flex border-b mb-5"
        style={{ borderColor: 'var(--border-subtle)' }}
        role="tablist"
      >
        {TABS.map((tab, i) => {
          const isActive = activeTab === i;
          return (
            <button
              key={i}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(i as TabIndex)}
              className="relative px-4 py-2.5 text-sm font-medium transition-colors duration-200"
              style={{
                color: isActive ? 'var(--blue-700)' : 'var(--text-muted)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {tab.label}
              {isActive && (
                <motion.span
                  layoutId="tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: 'var(--blue-700)' }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Panel content */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeTab}
          variants={panelVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={panelTransition}
          role="tabpanel"
        >
          {activeTab === 0 && <LifecyclePanel reducedMotion={reducedMotion} />}
          {activeTab === 1 && <ChangeRequestPanel reducedMotion={reducedMotion} />}
          {activeTab === 2 && <MetricsPanel reducedMotion={reducedMotion} />}
        </motion.div>
      </AnimatePresence>
    </figure>
  );
}
