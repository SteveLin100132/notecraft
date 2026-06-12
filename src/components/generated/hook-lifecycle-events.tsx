import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Shield, ShieldOff, Clock, Info } from 'lucide-react';

type EventId =
  | 'SessionStart'
  | 'UserPromptSubmit'
  | 'PreToolUse'
  | 'PostToolUse'
  | 'Notification'
  | 'Stop'
  | 'SubagentStop';

interface EventInfo {
  id: EventId;
  label: string;
  /** Lines shown under SVG node (split by \n if needed) */
  svgLines: string[];
  /** Human-readable trigger description */
  description: string;
}

const EVENTS: EventInfo[] = [
  {
    id: 'SessionStart',
    label: 'SessionStart',
    svgLines: ['SessionStart'],
    description: 'Session 開始時',
  },
  {
    id: 'UserPromptSubmit',
    label: 'UserPromptSubmit',
    svgLines: ['UserPrompt', 'Submit'],
    description: '使用者送出訊息、AI 還沒處理',
  },
  {
    id: 'PreToolUse',
    label: 'PreToolUse',
    svgLines: ['PreToolUse'],
    description: 'AI 決定用工具、還沒執行',
  },
  {
    id: 'PostToolUse',
    label: 'PostToolUse',
    svgLines: ['PostToolUse'],
    description: '工具執行完成',
  },
  {
    id: 'Notification',
    label: 'Notification',
    svgLines: ['Notification'],
    description: 'Claude Code 要通知你',
  },
  {
    id: 'Stop',
    label: 'Stop',
    svgLines: ['Stop'],
    description: 'AI 結束回應時（使用中）',
  },
  {
    id: 'SubagentStop',
    label: 'SubagentStop',
    svgLines: ['Subagent', 'Stop'],
    description: '子 agent 結束時',
  },
];

const TOTAL = EVENTS.length;
const SVG_W = 900;
const SVG_H = 120;
const PAD_X = 55;
const NODE_Y = 50;
const LABEL_LINE_H = 13;
const LABEL_Y_BASE = NODE_Y + 22;

function nodeX(index: number): number {
  return PAD_X + (index / (TOTAL - 1)) * (SVG_W - PAD_X * 2);
}

interface WhyCard {
  icon: React.ReactNode;
  title: string;
  body: string;
  delay: number;
}

export default function HookLifecycleEvents() {
  const [activeNode, setActiveNode] = useState<EventId>('Stop');
  const shouldReduceMotion = useReducedMotion() ?? false;

  const activeEvent = EVENTS.find((e) => e.id === activeNode);

  const whyCards: WhyCard[] = [
    {
      icon: <Shield size={20} className="text-blue-600" />,
      title: '一次性檢查',
      body: '對話結束時做一次性檢查，不會像 PostToolUse 那樣每改一個檔案就觸發。',
      delay: shouldReduceMotion ? 0 : 0,
    },
    {
      icon: <ShieldOff size={20} className="text-orange-500" />,
      title: '避免無限迴圈',
      body: '不會因為改了 PRD 又再次觸發自己。',
      delay: shouldReduceMotion ? 0 : 0.08,
    },
    {
      icon: <Clock size={20} className="text-blue-600" />,
      title: '時機自然',
      body: 'Claude 講完話的瞬間檢查，使用者剛好會看到提醒。',
      delay: shouldReduceMotion ? 0 : 0.16,
    },
  ];

  return (
    <div className="w-full font-sans select-none">
      {/* SVG Timeline */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          width="100%"
          style={{ minWidth: '520px', display: 'block' }}
          aria-label="Claude Code Hook 生命週期事件時間軸"
        >
          {/* Connecting line */}
          <line
            x1={nodeX(0)}
            y1={NODE_Y}
            x2={nodeX(TOTAL - 1)}
            y2={NODE_Y}
            stroke="#e1e6ee"
            strokeWidth={2}
          />

          {EVENTS.map((event, index) => {
            const cx = nodeX(index);
            const isActive = activeNode === event.id;
            const isStop = event.id === 'Stop';
            const r = isStop ? 10 : 7;
            const circleFill = isActive ? '#1b4f9c' : '#cbd3df';
            const labelFill = isActive ? '#1b4f9c' : '#6b7280';
            const fontSize =
              event.id === 'UserPromptSubmit' || event.id === 'SubagentStop' ? 9 : 10.5;

            return (
              <g
                key={event.id}
                className="cursor-pointer"
                onClick={() => setActiveNode(event.id)}
                role="button"
                aria-label={`查看 ${event.label} 說明`}
                aria-pressed={isActive}
              >
                {/* Halo ring for Stop node */}
                {isStop && (
                  <circle
                    cx={cx}
                    cy={NODE_Y}
                    r={18}
                    fill="none"
                    stroke="#1b4f9c"
                    strokeWidth={1.5}
                    opacity={0.28}
                  />
                )}

                {/* Main node circle */}
                <circle
                  cx={cx}
                  cy={NODE_Y}
                  r={r}
                  fill={circleFill}
                  style={{ transition: 'fill 200ms ease-out' }}
                />

                {/* Orange badge dot + label for Stop */}
                {isStop && (
                  <>
                    <circle cx={cx + 14} cy={NODE_Y - 14} r={7} fill="#ed9b26" />
                    <text
                      x={cx + 14}
                      y={NODE_Y - 14}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={6}
                      fontWeight={700}
                      fill="white"
                      fontFamily="system-ui, sans-serif"
                    >
                      使用中
                    </text>
                  </>
                )}

                {/* Multi-line label below node */}
                {event.svgLines.map((line, li) => (
                  <text
                    key={li}
                    x={cx}
                    y={LABEL_Y_BASE + li * LABEL_LINE_H}
                    textAnchor="middle"
                    fontSize={fontSize}
                    fontWeight={isActive ? 600 : 400}
                    fill={labelFill}
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                    style={{ transition: 'fill 200ms ease-out' }}
                  >
                    {line}
                  </text>
                ))}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Detail panel */}
      <div className="min-h-[140px] p-4 mt-1">
        {activeNode !== 'Stop' && activeEvent != null ? (
          <div className="flex items-start gap-2">
            <Info size={14} className="text-neutral-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-neutral-700 mb-1 font-mono">
                {activeEvent.label}
              </p>
              <p className="text-sm text-neutral-600 mb-3">{activeEvent.description}</p>
              <span className="inline-flex items-center rounded px-2 py-0.5 text-xs bg-neutral-100 text-neutral-500">
                未使用
              </span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {whyCards.map((card) => (
              <motion.div
                key={card.title}
                initial={
                  shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }
                }
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: shouldReduceMotion ? 0 : 0.3,
                  ease: 'easeOut',
                  delay: card.delay,
                }}
                className="bg-blue-50 border border-blue-100 rounded-xl p-4"
              >
                <div className="mb-2">{card.icon}</div>
                <p className="text-sm font-semibold text-neutral-800 mb-1">{card.title}</p>
                <p className="text-xs text-neutral-600 leading-relaxed">{card.body}</p>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom hint */}
      <p className="text-xs text-neutral-400 px-4 pb-2">點擊節點查看說明</p>
    </div>
  );
}
