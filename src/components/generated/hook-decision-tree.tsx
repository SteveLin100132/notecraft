import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Check, X, FileText, Cpu, Terminal, Shield, RotateCcw } from 'lucide-react';

type Answer = 'yes' | 'no' | null;

interface Answers {
  q1: Answer;
  q2: Answer;
  q3: Answer;
}

const INITIAL_ANSWERS: Answers = { q1: null, q2: null, q3: null };

interface QuestionNodeProps {
  question: string;
  answer: Answer;
  onAnswer: (v: 'yes' | 'no') => void;
}

function QuestionNode({ question, answer, onAnswer }: QuestionNodeProps) {
  return (
    <div className="bg-white border-2 border-neutral-200 rounded-xl px-5 py-4">
      <p className="text-sm font-semibold text-neutral-800 mb-3">{question}</p>
      <div className="flex gap-2">
        <button
          onClick={() => onAnswer('yes')}
          disabled={answer !== null}
          className={[
            'inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
            answer === 'yes'
              ? 'bg-blue-700 text-white'
              : answer === null
              ? 'bg-blue-700 text-white hover:bg-blue-800'
              : 'bg-neutral-100 text-neutral-400 cursor-default',
          ].join(' ')}
        >
          <Check size={14} />
          Yes
        </button>
        <button
          onClick={() => onAnswer('no')}
          disabled={answer !== null}
          className={[
            'inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
            answer === 'no'
              ? 'bg-neutral-200 text-neutral-700'
              : answer === null
              ? 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              : 'bg-neutral-100 text-neutral-400 cursor-default',
          ].join(' ')}
        >
          <X size={14} />
          No
        </button>
      </div>
    </div>
  );
}

interface NoLeafProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  containerClass: string;
}

function NoLeaf({ icon, title, description, containerClass }: NoLeafProps) {
  return (
    <div className={['rounded-xl p-4', containerClass].join(' ')}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{icon}</div>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-xs leading-relaxed opacity-75">{description}</p>
        </div>
      </div>
    </div>
  );
}

function Connector() {
  return <div className="w-px h-6 bg-neutral-200 mx-auto" />;
}

export default function HookDecisionTree() {
  const [answers, setAnswers] = useState<Answers>(INITIAL_ANSWERS);
  const shouldReduceMotion = useReducedMotion();

  function buildMotionProps(key: string) {
    return {
      key,
      initial: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 },
      animate: shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 },
      exit: { opacity: 0 },
      transition: { duration: 0.25, ease: 'easeOut' as const },
    };
  }

  function handleAnswer(question: keyof Answers, value: 'yes' | 'no') {
    setAnswers((prev) => {
      const next = { ...prev, [question]: value };
      if (question === 'q1' && value === 'no') {
        next.q2 = null;
        next.q3 = null;
      }
      if (question === 'q2' && value === 'no') {
        next.q3 = null;
      }
      return next;
    });
  }

  function reset() {
    setAnswers(INITIAL_ANSWERS);
  }

  const showQ2 = answers.q1 === 'yes';
  const showQ3 = answers.q1 === 'yes' && answers.q2 === 'yes';
  const showFinalYes = answers.q1 === 'yes' && answers.q2 === 'yes' && answers.q3 === 'yes';

  const isTerminated =
    answers.q1 === 'no' ||
    answers.q2 === 'no' ||
    answers.q3 === 'no' ||
    showFinalYes;

  return (
    <div className="max-w-md mx-auto py-4 select-none">
      <div className="flex flex-col">
        {/* Q1 always visible */}
        <QuestionNode
          question="這件事「不能漏」嗎？"
          answer={answers.q1}
          onAnswer={(v) => handleAnswer('q1', v)}
        />

        {/* Q1 No leaf */}
        <AnimatePresence>
          {answers.q1 === 'no' && (
            <motion.div {...buildMotionProps('q1-no')}>
              <Connector />
              <NoLeaf
                containerClass="bg-neutral-100 border border-neutral-300"
                icon={<FileText size={18} className="text-neutral-500" />}
                title="寫進 CLAUDE.md 即可"
                description="漏了沒關係的事，寫在 CLAUDE.md 就好"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Q2 */}
        <AnimatePresence>
          {showQ2 && (
            <motion.div {...buildMotionProps('q2-node')}>
              <Connector />
              <QuestionNode
                question="這件事「不需要判斷」嗎？"
                answer={answers.q2}
                onAnswer={(v) => handleAnswer('q2', v)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Q2 No leaf */}
        <AnimatePresence>
          {answers.q2 === 'no' && (
            <motion.div {...buildMotionProps('q2-no')}>
              <Connector />
              <NoLeaf
                containerClass="bg-blue-50 border border-blue-200"
                icon={<Cpu size={18} className="text-blue-600" />}
                title="交給 AI 判斷"
                description="需要語意判斷的，給 AI"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Q3 */}
        <AnimatePresence>
          {showQ3 && (
            <motion.div {...buildMotionProps('q3-node')}>
              <Connector />
              <QuestionNode
                question="這件事「綁定在生命週期事件」嗎？"
                answer={answers.q3}
                onAnswer={(v) => handleAnswer('q3', v)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Q3 No leaf */}
        <AnimatePresence>
          {answers.q3 === 'no' && (
            <motion.div {...buildMotionProps('q3-no')}>
              <Connector />
              <NoLeaf
                containerClass="bg-orange-50 border border-orange-300"
                icon={<Terminal size={18} className="text-orange-600" />}
                title="用 Slash command"
                description="使用者意圖驅動的，給 slash command"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Final Yes endpoint */}
        <AnimatePresence>
          {showFinalYes && (
            <motion.div
              key="final-yes"
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <Connector />
              <div className="bg-blue-700 text-white rounded-xl p-5 flex flex-col items-center gap-2 text-center">
                <Shield size={24} />
                <p className="text-base font-bold leading-snug">使用 Hook</p>
                <p className="text-sm opacity-80">三個條件都符合</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reset button */}
        <AnimatePresence>
          {isTerminated && (
            <motion.div
              key="reset"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="mt-5 flex justify-center"
            >
              <button
                onClick={reset}
                className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-4 py-1.5 text-sm text-neutral-600 hover:bg-neutral-200 transition-colors"
              >
                <RotateCcw size={14} />
                重新走一次
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
