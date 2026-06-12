import { motion, useReducedMotion } from 'motion/react';
import { MessageSquareQuote } from 'lucide-react';

export default function HookTakeawayQuote() {
  const shouldReduceMotion = useReducedMotion();

  const initial = shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 };
  const whileInView = { opacity: 1, y: 0 };
  const transition = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.4, ease: 'easeOut' as const };

  return (
    <motion.figure
      className="not-prose my-8 border-l-4 border-blue-700 bg-blue-50 rounded-r-2xl px-8 py-8"
      initial={initial}
      whileInView={whileInView}
      viewport={{ once: true }}
      transition={transition}
    >
      <MessageSquareQuote
        size={32}
        className="text-blue-700 opacity-30 mb-2"
        aria-hidden="true"
      />
      <blockquote className="text-xl md:text-2xl font-bold text-blue-900 leading-snug">
        Hook 是哨兵，不是司令官。
      </blockquote>
      <p className="mt-4 text-sm text-neutral-600 leading-relaxed">
        它站在固定位置（事件）、看到固定情況（matcher）、做固定動作（script）——不思考、不判斷、不指揮，那是 AI 的工作。
      </p>
    </motion.figure>
  );
}
