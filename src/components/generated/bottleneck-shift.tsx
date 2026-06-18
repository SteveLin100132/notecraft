import { useState, useCallback } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'motion/react';
import { AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import { clsx } from 'clsx';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface BottleneckBar {
  id: string;
  label: string;
  sublabel: string;
}

// ──────────────────────────────────────────────
// Data
// ──────────────────────────────────────────────

const TRADITIONAL: BottleneckBar = {
  id: 'coding',
  label: '寫程式 / 產出',
  sublabel: '傳統瓶頸',
};

const NEW_BOTTLENECKS: BottleneckBar[] = [
  { id: 'spec',   label: '規格清晰度', sublabel: '需求夠不夠精確？' },
  { id: 'test',   label: '測試完整度', sublabel: '邊角案例覆蓋了嗎？' },
  { id: 'review', label: '驗收可信度', sublabel: '怎麼知道結果對了？' },
  { id: 'git',    label: 'Git 可追溯性', sublabel: '改了什麼？為什麼？' },
];

// ──────────────────────────────────────────────
// Sub-component: pressure bar
// ──────────────────────────────────────────────

interface PressureBarProps {
  label: string;
  sublabel: string;
  heightFraction: number; // 0–1
  variant: 'traditional' | 'new';
  flash: boolean;
  reducedMotion: boolean | null;
}

function PressureBar({ label, sublabel, heightFraction, variant, flash, reducedMotion }: PressureBarProps) {
  const maxBarHeightPx = 160;
  const barH = Math.max(4, heightFraction * maxBarHeightPx);

  const barColor =
    variant === 'traditional'
      ? heightFraction > 0.15
        ? 'bg-[#1b4f9c]'   // --blue-700
        : 'bg-[#9aa6b8]'   // --neutral-400 (faded)
      : heightFraction > 0.5
        ? 'bg-[#d64545]'   // --danger-500
        : heightFraction > 0.15
          ? 'bg-[#ed9b26]' // --orange-400
          : 'bg-[#cbd3df]'; // --neutral-300

  const labelColor =
    variant === 'traditional'
      ? heightFraction > 0.15
        ? 'text-[#1b4f9c]'
        : 'text-[#9aa6b8]'
      : heightFraction > 0.5
        ? 'text-[#d64545]'
        : heightFraction > 0.15
          ? 'text-[#e37b24]'
          : 'text-[#9aa6b8]';

  const duration = reducedMotion ? 0 : 0.3;

  return (
    <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
      {/* Bar container — fixed height, bar grows from bottom */}
      <div
        className="w-full flex items-end justify-center"
        style={{ height: `${maxBarHeightPx}px` }}
      >
        <motion.div
          className={clsx('w-10 rounded-t-md', barColor)}
          animate={{
            height: barH,
            scale: flash && !reducedMotion ? [1, 1.08, 1] : 1,
          }}
          transition={
            flash && !reducedMotion
              ? { duration: 0.4, times: [0, 0.5, 1], ease: 'easeOut' }
              : { duration, ease: 'easeOut' }
          }
          style={{ height: barH }}
        />
      </div>

      {/* Label */}
      <motion.p
        className={clsx('text-xs font-semibold text-center leading-snug', labelColor)}
        animate={{ opacity: heightFraction < 0.05 ? 0.35 : 1 }}
        transition={{ duration }}
      >
        {label}
      </motion.p>
      <p className="text-[10px] text-[#6c798e] text-center leading-snug hidden sm:block">
        {sublabel}
      </p>
    </div>
  );
}

// ──────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────

export default function BottleneckShift() {
  const [aiLevel, setAiLevel] = useState(0);
  const reducedMotion = useReducedMotion();

  // Derived pressures
  // Traditional coding bottleneck: shrinks as AI level rises
  const traditionalPressure = Math.max(0, 1 - aiLevel / 100);

  // New bottlenecks: grow as AI level rises, each with different onset
  const newPressures: Record<string, number> = {
    spec:   Math.min(1, Math.max(0, (aiLevel - 10) / 80)),
    test:   Math.min(1, Math.max(0, (aiLevel - 15) / 75)),
    review: Math.min(1, Math.max(0, (aiLevel - 20) / 70)),
    git:    Math.min(1, Math.max(0, (aiLevel - 25) / 65)),
  };

  // Flash at high AI level
  const isHighAI = aiLevel >= 85;

  // Dynamic caption
  const caption = aiLevel <= 20
    ? '瓶頸還在「寫得出來」——人力是限制因子。'
    : aiLevel <= 50
      ? 'AI 開始分擔產出，規格與測試的重要性逐漸浮現。'
      : aiLevel <= 80
        ? '產出速度不再是問題；規格、測試、驗收成為新關鍵路徑。'
        : '瓶頸已轉移到規格・測試・驗收・追溯——工程判斷力比打字速度更重要。';

  const handleSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAiLevel(Number(e.target.value));
  }, []);

  const transitionDuration = reducedMotion ? 0 : 0.3;

  return (
    <div className="not-prose max-w-2xl mx-auto space-y-6 py-2">

      {/* Slider section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-[#6c798e]">
          <span>純手工 0%</span>
          <span className="font-semibold text-sm text-[#1b4f9c]">
            AI 投入程度：{aiLevel}%
          </span>
          <span>高度依賴 AI 100%</span>
        </div>

        {/* Custom slider */}
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={aiLevel}
          onChange={handleSlider}
          className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[#1b4f9c]"
          style={{
            background: `linear-gradient(to right, #1b4f9c ${aiLevel}%, #e1e6ee ${aiLevel}%)`,
          }}
          aria-label="AI 投入程度"
        />
      </div>

      {/* Chart area */}
      <div className="rounded-xl bg-[#f6f8fb] p-4 sm:p-6">
        <div className="flex items-end gap-1 sm:gap-3">

          {/* Traditional bottleneck */}
          <div className="flex flex-col items-center gap-2 flex-none w-20 sm:w-24">
            <PressureBar
              label={TRADITIONAL.label}
              sublabel={TRADITIONAL.sublabel}
              heightFraction={traditionalPressure}
              variant="traditional"
              flash={false}
              reducedMotion={reducedMotion}
            />
          </div>

          {/* Divider with arrow */}
          <div className="flex flex-col items-center justify-center pb-10 flex-none">
            <motion.div
              animate={{ opacity: aiLevel > 5 ? 1 : 0.2, x: aiLevel > 50 ? 2 : 0 }}
              transition={{ duration: transitionDuration, ease: 'easeOut' }}
            >
              <ArrowRight size={16} className="text-[#9aa6b8]" />
            </motion.div>
          </div>

          {/* New bottlenecks */}
          <div className="flex items-end gap-1 sm:gap-2 flex-1">
            {NEW_BOTTLENECKS.map((b) => (
              <PressureBar
                key={b.id}
                label={b.label}
                sublabel={b.sublabel}
                heightFraction={newPressures[b.id] ?? 0}
                variant="new"
                flash={isHighAI}
                reducedMotion={reducedMotion}
              />
            ))}
          </div>
        </div>

        {/* Legend row */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-[#6c798e]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-[#1b4f9c]" />
            傳統瓶頸（縮小中）
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-[#ed9b26]" />
            新興瓶頸（上升中）
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-[#d64545]" />
            新興瓶頸（已成關鍵）
          </span>
        </div>
      </div>

      {/* Status callout */}
      <motion.div
        key={Math.floor(aiLevel / 25)}
        initial={reducedMotion ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: transitionDuration, ease: 'easeOut' }}
        className={clsx(
          'flex items-start gap-3 rounded-lg px-4 py-3 text-sm',
          aiLevel >= 80
            ? 'bg-[#fbeaea] text-[#d64545]'
            : aiLevel >= 40
              ? 'bg-[#fdf4e6] text-[#a04f15]'
              : 'bg-[#eef4fb] text-[#1b4f9c]'
        )}
      >
        {aiLevel >= 80 ? (
          <AlertTriangle size={16} className="mt-0.5 flex-none" />
        ) : (
          <CheckCircle size={16} className="mt-0.5 flex-none" />
        )}
        <span>{caption}</span>
      </motion.div>

      {/* High-AI emphasis */}
      <AnimatePresence>
        {isHighAI && (
          <motion.p
            initial={reducedMotion ? false : { opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: transitionDuration, ease: 'easeOut' }}
            className="text-xs text-center text-[#6c798e] leading-relaxed"
          >
            AI 導入不是把工程師的判斷拿掉，而是把產出速度提高——<br />
            真正的護城河變成「規格是否清楚、測試是否完整、驗收是否可信、Git 紀錄是否可追溯」。
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
