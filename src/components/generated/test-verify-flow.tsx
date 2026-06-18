import { useState } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'motion/react';
import { TriangleAlert, User, Bot, ChevronRight, CheckCircle2, CircleDot } from 'lucide-react';
import { clsx } from 'clsx';

type Responsibility = 'human' | 'ai' | 'both';

interface Step {
  id: number;
  title: string;
  description: string;
  responsibility: Responsibility;
  badge?: {
    icon: React.ReactNode;
    text: string;
    variant: 'warning' | 'info';
  };
}

const steps: Step[] = [
  {
    id: 1,
    title: '需求與規格先明確化',
    description: '在任何開發行動之前，先把驗收情境寫進規格。哪些情境必須通過，哪些是邊界條件，在這一步就要定義清楚。',
    responsibility: 'human',
  },
  {
    id: 2,
    title: 'AI 協助產生開發文件或 Issue',
    description: 'AI 依據規格產生 User Story、技術文件、Issue 拆解等，大幅縮短準備時間。人工仍需審閱確保規格不走樣。',
    responsibility: 'ai',
  },
  {
    id: 3,
    title: 'AI 開發功能',
    description: 'AI 根據 Issue 撰寫程式碼。這個階段 AI 產出速度快，但正確性必須由後續步驟驗證，不能靠 AI 自己確認。',
    responsibility: 'ai',
  },
  {
    id: 4,
    title: '單元測試與整合測試先跑',
    description: '執行所有自動化測試，確保基本正確性。但測試覆蓋的只是已知情境——未被涵蓋的核心情境是盲點所在。',
    responsibility: 'both',
    badge: {
      icon: <TriangleAlert size={14} />,
      text: '測試通過 ≠ 需求正確：當心看起來有測、其實沒涵蓋核心情境',
      variant: 'warning',
    },
  },
  {
    id: 5,
    title: '用另一個 Session / Agent 做交叉檢查',
    description: '換一個全新的 AI Session 或 Agent，以「使用者視角」重新審查功能。跳出原本的思維框架，找出盲點。',
    responsibility: 'human',
  },
  {
    id: 6,
    title: '人工 End-to-End 驗證',
    description: '人工執行完整的端到端驗收，對照步驟 1 定義的驗收情境逐一確認。這是確保需求正確性的最後防線。',
    responsibility: 'human',
  },
];

const responsibilityConfig: Record<Responsibility, { label: string; bgClass: string; textClass: string; icon: React.ReactNode }> = {
  human: {
    label: '人工把關',
    bgClass: 'bg-[#eef4fb]',
    textClass: 'text-[#1b4f9c]',
    icon: <User size={12} />,
  },
  ai: {
    label: 'AI 可協助',
    bgClass: 'bg-[#fdf4e6]',
    textClass: 'text-[#a04f15]',
    icon: <Bot size={12} />,
  },
  both: {
    label: 'AI 可協助 + 人工把關',
    bgClass: 'bg-[#e7f6ee]',
    textClass: 'text-[#2e9e6b]',
    icon: <Bot size={12} />,
  },
};

export default function TestVerifyFlow() {
  const [activeStep, setActiveStep] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  const currentStep = steps[activeStep];
  const isLastStep = activeStep === steps.length - 1;

  const animationProps = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
        transition: { duration: 0.25, ease: 'easeOut' },
      };

  const resp = responsibilityConfig[currentStep.responsibility];

  return (
    <div className="not-prose max-w-2xl mx-auto space-y-5 py-2">
      {/* Spec-to-Acceptance dashed connector hint */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#f6f8fb] border border-dashed border-[#cbd3df]">
        <CircleDot size={14} className="text-[#1b4f9c] shrink-0" />
        <span className="text-xs text-[#4f5b6e] leading-snug">
          驗收情境必須從<span className="font-semibold text-[#1b4f9c]">規格階段（步驟 1）</span>就先定義，才能在<span className="font-semibold text-[#1b4f9c]">人工驗收（步驟 6）</span>有所依據。
        </span>
      </div>

      {/* Step progress indicators */}
      <div className="flex items-center gap-1">
        {steps.map((step, idx) => {
          const isCompleted = idx < activeStep;
          const isActive = idx === activeStep;
          return (
            <button
              key={step.id}
              onClick={() => setActiveStep(idx)}
              aria-label={`跳到步驟 ${step.id}：${step.title}`}
              className={clsx(
                'flex-1 h-1.5 rounded-full transition-all duration-300 cursor-pointer',
                isCompleted && 'bg-[#1b4f9c]',
                isActive && 'bg-[#ed9b26]',
                !isCompleted && !isActive && 'bg-[#e1e6ee]'
              )}
            />
          );
        })}
      </div>

      {/* Step number row */}
      <div className="flex items-start gap-2 relative">
        {/* Dashed vertical connector line from step 1 to step 6 */}
        <div
          className="absolute left-7 top-6 bottom-6 w-px border-l-2 border-dashed border-[#cbd3df] pointer-events-none"
          aria-hidden="true"
        />
        <div className="flex flex-col gap-3 w-full">
          {steps.map((step, idx) => {
            const isCompleted = idx < activeStep;
            const isActive = idx === activeStep;
            const r = responsibilityConfig[step.responsibility];
            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(idx)}
                className={clsx(
                  'relative flex items-start gap-3 text-left rounded-xl px-3 py-2.5 transition-all duration-200',
                  isActive && 'bg-[#eef4fb] ring-2 ring-[#1b4f9c]/30',
                  !isActive && 'hover:bg-[#f6f8fb]'
                )}
              >
                {/* Step circle */}
                <div
                  className={clsx(
                    'shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold z-10',
                    isCompleted && 'bg-[#1b4f9c] text-white',
                    isActive && 'bg-[#ed9b26] text-white shadow-sm',
                    !isCompleted && !isActive && 'bg-[#e1e6ee] text-[#6c798e]'
                  )}
                >
                  {isCompleted ? <CheckCircle2 size={16} /> : step.id}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={clsx(
                        'text-sm font-semibold leading-snug',
                        isActive ? 'text-[#1b4f9c]' : isCompleted ? 'text-[#3a4456]' : 'text-[#6c798e]'
                      )}
                    >
                      {step.title}
                    </span>
                    <span
                      className={clsx(
                        'inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                        r.bgClass,
                        r.textClass
                      )}
                    >
                      {r.icon}
                      {r.label}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail panel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeStep}
          {...(shouldReduceMotion ? { initial: false } : animationProps)}
          className="rounded-xl border border-[#e1e6ee] bg-white overflow-hidden"
        >
          <div className="bg-[#1b4f9c] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-white/60 text-xs font-medium">步驟 {currentStep.id} / {steps.length}</span>
              <span className="text-white text-sm font-semibold">{currentStep.title}</span>
            </div>
            <span
              className={clsx(
                'inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full',
                resp.bgClass,
                resp.textClass
              )}
            >
              {resp.icon}
              {resp.label}
            </span>
          </div>

          <div className="px-4 py-4 space-y-3">
            <p className="text-sm text-[#3a4456] leading-relaxed">{currentStep.description}</p>

            {currentStep.badge && (
              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.1, ease: 'easeOut' }}
                className={clsx(
                  'flex items-start gap-2 rounded-lg px-3 py-2.5 border',
                  currentStep.badge.variant === 'warning'
                    ? 'bg-[#fcf3da] border-[#e3a008]/40 text-[#a04f15]'
                    : 'bg-[#eef4fb] border-[#2c6ebb]/30 text-[#1b4f9c]'
                )}
              >
                <span className="shrink-0 mt-0.5">{currentStep.badge.icon}</span>
                <span className="text-xs font-medium leading-snug">{currentStep.badge.text}</span>
              </motion.div>
            )}

            {/* Spec reminder for step 1 and step 6 */}
            {(activeStep === 0 || activeStep === 5) && (
              <div className="flex items-center gap-1.5 text-xs text-[#6c798e] border-t border-[#e1e6ee] pt-3 mt-1">
                <div className="w-2 h-px border-t border-dashed border-[#9aa6b8]" />
                <span>
                  {activeStep === 0
                    ? '在此定義的驗收情境，將成為步驟 6 人工驗收的依據基準。'
                    : '現在對照步驟 1 所定義的驗收情境，逐一確認功能是否符合需求。'}
                </span>
                <div className="w-2 h-px border-t border-dashed border-[#9aa6b8]" />
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="px-4 pb-4 flex items-center justify-between">
            <button
              onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
              disabled={activeStep === 0}
              className={clsx(
                'text-xs px-3 py-1.5 rounded-lg transition-colors',
                activeStep === 0
                  ? 'text-[#9aa6b8] cursor-not-allowed'
                  : 'text-[#4f5b6e] hover:bg-[#eef1f6] cursor-pointer'
              )}
            >
              上一步
            </button>
            <button
              onClick={() => !isLastStep && setActiveStep((s) => s + 1)}
              disabled={isLastStep}
              className={clsx(
                'inline-flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg font-medium transition-all duration-200',
                isLastStep
                  ? 'bg-[#e7f6ee] text-[#2e9e6b] cursor-default'
                  : 'bg-[#ed9b26] text-white hover:bg-[#e37b24] cursor-pointer shadow-sm'
              )}
            >
              {isLastStep ? (
                <>
                  <CheckCircle2 size={13} />
                  流程完成
                </>
              ) : (
                <>
                  下一步
                  <ChevronRight size={13} />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
