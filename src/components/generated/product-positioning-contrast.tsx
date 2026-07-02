import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Play,
  RotateCcw,
  MessageSquare,
  TriangleAlert,
  ShieldCheck,
  Tag,
  UserCheck,
  Clock,
  Flame,
  FileText,
  UserRound,
} from 'lucide-react';

type Phase = 'idle' | 'running' | 'done';

interface StepCard {
  icon: React.ReactNode;
  title: string;
  detail?: string | null;
}

const LEFT_STEPS: StepCard[] = [
  {
    icon: <MessageSquare size={14} className="text-[--text-muted]" />,
    title: '問題輸入',
    detail: '員工週日出勤要給多少加班費？',
  },
  {
    icon: <TriangleAlert size={14} className="text-[--danger-500]" />,
    title: 'AI 直接給出答案',
    detail: '週日加班一律加倍給付即可。',
  },
];

const RIGHT_STEPS: StepCard[] = [
  {
    icon: <MessageSquare size={14} className="text-[--text-muted]" />,
    title: '問題輸入',
    detail: '員工週日出勤要給多少加班費？',
  },
  {
    icon: <Tag size={14} className="text-[--blue-500]" />,
    title: '主題分類',
    detail: '工資給付',
  },
  {
    icon: <UserCheck size={14} className="text-[--blue-500]" />,
    title: '追問 A：員工身分別？',
    detail: '正職 / 部分工時 / 承攬',
  },
  {
    icon: <Clock size={14} className="text-[--blue-500]" />,
    title: '追問 B：工時制度？',
    detail: '標準工時 / 變形工時 / 責任制',
  },
  {
    icon: <Flame size={14} className="text-[--danger-500]" />,
    title: '風險計算',
    detail: null,
  },
  {
    icon: <FileText size={14} className="text-[--success-500]" />,
    title: '條文與建議',
    detail: '勞基法 §24、§39・建議洽詢顧問',
  },
];

function StepCardItem({
  step,
  index,
  isWarningCard,
  showWarning,
  reduced,
}: {
  step: StepCard;
  index: number;
  isWarningCard?: boolean;
  showWarning?: boolean;
  reduced: boolean;
}) {
  return (
    <motion.div
      layout
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className="relative rounded-[--radius-md] border border-[--border-subtle] bg-[--surface-card] p-3 text-sm"
    >
      <div className="flex items-start gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[--surface-sunken] text-[0.6875rem] font-medium text-[--text-muted]">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {step.icon}
            <span className="font-medium text-[--text-body]">{step.title}</span>
          </div>
          {step.detail && (
            <p className="mt-0.5 text-xs text-[--text-muted]">{step.detail}</p>
          )}
          {/* Risk flames for step 5 */}
          {index === 4 && (
            <div className="mt-1 flex gap-0.5">
              <Flame size={14} className="text-[--danger-500]" />
              <Flame size={14} className="text-[--danger-500]" />
              <Flame size={14} className="text-[--danger-500]" />
            </div>
          )}
          {/* Report card extra row */}
          {index === 5 && (
            <div className="mt-1 flex items-center gap-1">
              <UserRound size={12} className="text-[--success-500]" />
              <span className="text-xs text-[--success-500]">顧問轉介建議</span>
            </div>
          )}
        </div>
      </div>

      {/* Warning overlay on the final answer card of the left column */}
      {isWarningCard && showWarning && (
        <motion.div
          initial={reduced ? false : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="absolute inset-0 flex flex-col items-start justify-end rounded-[--radius-md] bg-[--warning-50] p-3"
        >
          <div className="flex items-center gap-1.5">
            <TriangleAlert size={14} className="text-[--warning-500]" />
            <span className="text-xs font-semibold text-[--warning-500]">
              警示
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[--text-body]">
            可能忽略了 3–5 個必要事實
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}

export default function ProductPositioningContrast() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [leftStep, setLeftStep] = useState(0);
  const [rightStep, setRightStep] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const reduced = useReducedMotion() ?? false;

  const reset = useCallback(() => {
    setPhase('idle');
    setLeftStep(0);
    setRightStep(0);
    setShowWarning(false);
  }, []);

  const play = useCallback(() => {
    if (phase === 'running') return;

    if (reduced) {
      setLeftStep(LEFT_STEPS.length);
      setRightStep(RIGHT_STEPS.length);
      setShowWarning(true);
      setPhase('done');
      return;
    }

    setPhase('running');
    setLeftStep(0);
    setRightStep(0);
    setShowWarning(false);

    // Left column: 2 cards at 200ms intervals
    let lStep = 0;
    const leftInterval = setInterval(() => {
      lStep += 1;
      setLeftStep(lStep);
      if (lStep >= LEFT_STEPS.length) {
        clearInterval(leftInterval);
      }
    }, 200);

    // Right column: 6 cards at 300ms intervals
    let rStep = 0;
    const rightInterval = setInterval(() => {
      rStep += 1;
      setRightStep(rStep);
      if (rStep >= RIGHT_STEPS.length) {
        clearInterval(rightInterval);
        // After right column finishes, show the warning on left column
        setTimeout(() => {
          setShowWarning(true);
          setPhase('done');
        }, 300);
      }
    }, 300);
  }, [phase, reduced]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // timeouts/intervals captured in closures will GC naturally
    };
  }, []);

  return (
    <div className="not-prose mx-auto max-w-4xl py-6">
      {/* Question banner */}
      <div className="mb-4 flex items-center gap-2 rounded-[--radius-md] bg-[--surface-sunken] px-4 py-3">
        <MessageSquare size={16} className="shrink-0 text-[--blue-500]" />
        <span className="text-xs font-medium text-[--text-muted]">
          使用者問題
        </span>
        <span className="ml-1 text-sm font-medium text-[--text-strong]">
          員工週日出勤要給多少加班費？
        </span>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Left column: AI 律師 */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 rounded-[--radius-md] bg-[--danger-50] px-3 py-2">
            <TriangleAlert size={14} className="text-[--danger-500]" />
            <span className="text-sm font-bold text-[--danger-500]">
              AI 律師
            </span>
            <span className="ml-auto text-xs text-[--text-muted]">
              2 個步驟
            </span>
          </div>
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {LEFT_STEPS.slice(0, leftStep).map((step, i) => (
                <StepCardItem
                  key={i}
                  step={step}
                  index={i}
                  isWarningCard={i === LEFT_STEPS.length - 1}
                  showWarning={showWarning}
                  reduced={reduced}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Right column: 前置檢測系統 */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 rounded-[--radius-md] bg-[--success-50] px-3 py-2">
            <ShieldCheck size={14} className="text-[--success-500]" />
            <span className="text-sm font-bold text-[--success-500]">
              前置檢測系統
            </span>
            <span className="ml-auto text-xs text-[--text-muted]">
              6 個步驟
            </span>
          </div>
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {RIGHT_STEPS.slice(0, rightStep).map((step, i) => (
                <StepCardItem
                  key={i}
                  step={step}
                  index={i}
                  reduced={reduced}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Control bar */}
      <div className="mt-6 flex justify-center">
        {phase !== 'done' ? (
          <button
            onClick={play}
            disabled={phase === 'running'}
            className="flex items-center gap-2 rounded-[--radius-pill] bg-[--blue-700] px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play size={16} />
            執行對比
          </button>
        ) : (
          <button
            onClick={reset}
            className="flex items-center gap-2 rounded-[--radius-pill] bg-[--surface-sunken] px-5 py-2 text-sm font-medium text-[--text-body] transition-colors hover:bg-[--neutral-200]"
          >
            <RotateCcw size={16} />
            重播
          </button>
        )}
      </div>
    </div>
  );
}
