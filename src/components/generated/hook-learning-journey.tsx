// 垂直時間軸：認知演進 6 節點，scroll-driven stagger fade+slide
// 節點 4 橘色高亮 + scale 輕彈；節點 6 藍色；其餘 neutral
import { motion, useReducedMotion } from 'motion/react';
import { Zap, CircleCheck, ArrowRight } from 'lucide-react';

interface StepData {
  num: number;
  title: string;
  idea: string;
  insightLabel: string;
  insight: string;
  variant: 'neutral' | 'orange' | 'blue';
}

const STEPS: StepData[] = [
  {
    num: 1,
    title: '初始想法',
    idea: '用 hook 在 git merge 時自動 bump 版號',
    insightLabel: '發現',
    insight:
      'Hook 綁的是 Claude Code 生命週期，不是 git 事件；merge 自動 bump 該用 CI 或 git hook。',
    variant: 'neutral',
  },
  {
    num: 2,
    title: '退而求其次',
    idea: 'Hook 偵測「我要 release」關鍵字自動 bump',
    insightLabel: '理解',
    insight:
      'Hook 可注入 context，但判斷與執行是 AI 跟 slash command 的事；regex 關鍵字偵測會誤判漏判。',
    variant: 'neutral',
  },
  {
    num: 3,
    title: '想全自動',
    idea: 'docs 改完後 hook 自己判斷該 bump 哪一位',
    insightLabel: '發現',
    insight:
      'Hook 沒有 AI，要判斷得呼叫 Anthropic API——需 API key、要付費、引入不確定性、多 2–10 秒延遲。',
    variant: 'neutral',
  },
  {
    num: 4,
    title: '關鍵轉折',
    idea: '讓 AI 判斷後把版號當參數傳給 script',
    insightLabel: '理解',
    insight:
      'Slash command 才是接收參數的正確機制，不是事件 hook；事件 hook 只能拿 JSON context。',
    variant: 'orange',
  },
  {
    num: 5,
    title: '流程修正',
    idea: '綁在 commit 流程，AI 看 diff 後判斷',
    insightLabel: '發現',
    insight:
      '觸發點對齊 git workflow，不需事件 hook 也不需 API key；AI 在 commit 前本就要看 diff，順手判斷版號是免費加值。',
    variant: 'neutral',
  },
  {
    num: 6,
    title: '最終定位',
    idea: 'Hook 只當「忘記發版」的哨兵',
    insightLabel: '理解',
    insight:
      'Hook 不執行 bump，只在 Stop event 檢查「docs 改了但版號沒動」用 exit 2 印提醒；職責切乾淨。',
    variant: 'blue',
  },
];

const DELAYS = [0, 0.08, 0.16, 0.24, 0.32, 0.4];

export default function HookLearningJourney() {
  const prefersReduced = useReducedMotion();

  return (
    <ol className="not-prose relative my-6 list-none pl-0">
      {/* 垂直連接線：絕對定位，從第一個圓心到最後一個圓心 */}
      <div
        className="absolute left-4 top-4 bottom-4 w-px bg-neutral-200"
        aria-hidden="true"
        style={{ transform: 'translateX(-0.5px)' }}
      />

      {STEPS.map((step, i) => {
        const isOrange = step.variant === 'orange';
        const isBlue = step.variant === 'blue';
        const isLast = i === STEPS.length - 1;

        // Badge styles
        const badgeClass = isOrange
          ? 'bg-orange-500 text-white'
          : isBlue
          ? 'bg-blue-700 text-white'
          : 'bg-neutral-200 text-neutral-600';

        // Card styles
        const cardClass = isOrange
          ? 'bg-orange-50 border border-orange-400'
          : isBlue
          ? 'bg-blue-50 border border-blue-600'
          : 'bg-neutral-50 border border-neutral-200';

        // Insight label / arrow color
        const insightIconClass = isOrange
          ? 'text-orange-400'
          : isBlue
          ? 'text-blue-600'
          : 'text-neutral-400';

        const insightLabelClass = isOrange
          ? 'text-orange-500'
          : isBlue
          ? 'text-blue-600'
          : 'text-neutral-500';

        // motion variants
        const initial = prefersReduced
          ? { opacity: 1, x: 0 }
          : { opacity: 0, x: -16 };

        const animate = { opacity: 1, x: 0 };

        const transition = prefersReduced
          ? { duration: 0 }
          : {
              duration: 0.32,
              delay: DELAYS[i],
              ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
            };

        // 步驟 4 額外 scale 輕彈
        const scaleKeyframes =
          isOrange && !prefersReduced ? [1, 1.02, 1] : undefined;

        return (
          <motion.li
            key={step.num}
            className={`relative flex items-start gap-4 ${isLast ? 'mb-0' : 'mb-5'}`}
            initial={initial}
            whileInView={
              isOrange && !prefersReduced
                ? { opacity: 1, x: 0, scale: scaleKeyframes }
                : animate
            }
            viewport={{ once: true, margin: '-60px' }}
            transition={transition}
          >
            {/* 左側圓形序號徽章 */}
            <div
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${badgeClass}`}
              aria-hidden="true"
            >
              {isOrange ? (
                <span>{step.num}</span>
              ) : isBlue ? (
                <span>{step.num}</span>
              ) : (
                <span>{step.num}</span>
              )}
            </div>

            {/* 右側內容卡 */}
            <div className={`flex-1 rounded-xl p-4 ${cardClass}`}>
              {/* 標題列 */}
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-neutral-800">
                  {step.title}
                </span>
                {isOrange && (
                  <Zap
                    size={16}
                    className="text-orange-500 shrink-0"
                    aria-hidden="true"
                  />
                )}
                {isBlue && (
                  <CircleCheck
                    size={16}
                    className="text-blue-600 shrink-0"
                    aria-hidden="true"
                  />
                )}
              </div>

              {/* 想法描述 */}
              <p className="mt-1 text-sm text-neutral-700 leading-relaxed">
                {step.idea}
              </p>

              {/* 發現 / 理解 小標 + 說明 */}
              <div className="mt-2.5 flex items-start gap-1.5">
                <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
                  <ArrowRight
                    size={12}
                    className={`${insightIconClass} shrink-0`}
                    aria-hidden="true"
                  />
                  <span
                    className={`text-[11px] uppercase tracking-wide font-semibold ${insightLabelClass}`}
                  >
                    {step.insightLabel}
                  </span>
                </div>
                <p className="text-sm text-neutral-700 leading-relaxed">
                  {step.insight}
                </p>
              </div>
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
