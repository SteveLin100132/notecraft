import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ClipboardList,
  GitPullRequest,
  UserCheck,
  FileText,
  GitBranch,
  Tag,
  Workflow,
  Bot,
  CheckCircle,
  Circle,
  ChevronRight,
} from 'lucide-react';
import { clsx } from 'clsx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActionItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  status: '待啟動' | '進行中' | '已完成';
}

interface Phase {
  id: string;
  label: string;
  subtitle: string;
  step: number;
  colorKey: 'blue' | 'orange' | 'sky';
  items: ActionItem[];
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const PHASES: Phase[] = [
  {
    id: 'mvp',
    label: '先做 MVP',
    subtitle: 'Phase 1',
    step: 1,
    colorKey: 'blue',
    items: [
      {
        id: 'qa-checklist',
        label: '建立獨立 QA 流程與檢查清單',
        icon: <ClipboardList size={16} />,
        status: '待啟動',
      },
      {
        id: 'pr-review',
        label: '標準化 PR 與 Code Review 流程',
        icon: <GitPullRequest size={16} />,
        status: '待啟動',
      },
      {
        id: 'doc-owner',
        label: '指派文件與 issue 負責人',
        icon: <UserCheck size={16} />,
        status: '待啟動',
      },
    ],
  },
  {
    id: 'standard',
    label: '標準化',
    subtitle: 'Phase 2',
    step: 2,
    colorKey: 'orange',
    items: [
      {
        id: 'coding-standards',
        label: '建立統一文件與 coding standards',
        icon: <FileText size={16} />,
        status: '待啟動',
      },
      {
        id: 'api-versioning',
        label: '維護 API 版本策略（V1/V2 相容）',
        icon: <GitBranch size={16} />,
        status: '待啟動',
      },
      {
        id: 'milestone',
        label: '建立標籤與 milestone 標準',
        icon: <Tag size={16} />,
        status: '待啟動',
      },
    ],
  },
  {
    id: 'automate',
    label: '自動化與規模化',
    subtitle: 'Phase 3',
    step: 3,
    colorKey: 'sky',
    items: [
      {
        id: 'session-mgmt',
        label: '整合並優化任務分派與 Session 管理',
        icon: <Workflow size={16} />,
        status: '待啟動',
      },
      {
        id: 'ai-label',
        label: '整合 AI 工具自動化 issue 標籤與工作流程',
        icon: <Bot size={16} />,
        status: '待啟動',
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Color helpers — map colorKey → Tailwind classes
// ---------------------------------------------------------------------------

const PHASE_COLORS = {
  blue: {
    stepBg: 'bg-blue-600',
    stepRing: 'ring-blue-200',
    stepText: 'text-white',
    headerBg: 'bg-blue-600',
    headerText: 'text-white',
    pillBg: 'bg-blue-50',
    pillText: 'text-blue-700',
    pillBorder: 'border-blue-200',
    cardBorder: 'border-blue-200',
    cardBg: 'bg-blue-50/40',
    iconColor: 'text-blue-500',
    activeStepper: 'bg-blue-600 text-white',
    connectorActive: 'bg-blue-300',
  },
  orange: {
    stepBg: 'bg-orange-400',
    stepRing: 'ring-orange-200',
    stepText: 'text-white',
    headerBg: 'bg-orange-400',
    headerText: 'text-white',
    pillBg: 'bg-orange-50',
    pillText: 'text-orange-600',
    pillBorder: 'border-orange-200',
    cardBorder: 'border-orange-200',
    cardBg: 'bg-orange-50/40',
    iconColor: 'text-orange-400',
    activeStepper: 'bg-orange-400 text-white',
    connectorActive: 'bg-orange-300',
  },
  sky: {
    stepBg: 'bg-sky-500',
    stepRing: 'ring-sky-200',
    stepText: 'text-white',
    headerBg: 'bg-sky-600',
    headerText: 'text-white',
    pillBg: 'bg-sky-50',
    pillText: 'text-sky-700',
    pillBorder: 'border-sky-200',
    cardBorder: 'border-sky-200',
    cardBg: 'bg-sky-50/40',
    iconColor: 'text-sky-500',
    activeStepper: 'bg-sky-500 text-white',
    connectorActive: 'bg-sky-300',
  },
} as const;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface StepperProps {
  phases: Phase[];
  activePhaseId: string | null;
  onSelect: (id: string) => void;
  shouldReduceMotion: boolean;
}

function Stepper({ phases, activePhaseId, onSelect, shouldReduceMotion }: StepperProps) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8 select-none">
      {phases.map((phase, idx) => {
        const colors = PHASE_COLORS[phase.colorKey];
        const isActive = activePhaseId === phase.id;
        const isLast = idx === phases.length - 1;

        return (
          <div key={phase.id} className="flex items-center">
            {/* Step node */}
            <button
              onClick={() => onSelect(phase.id)}
              className={clsx(
                'flex flex-col items-center gap-1.5 cursor-pointer group focus:outline-none',
                'w-24 sm:w-32',
              )}
              aria-pressed={isActive}
            >
              <motion.div
                animate={
                  shouldReduceMotion
                    ? {}
                    : { scale: isActive ? 1.12 : 1 }
                }
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className={clsx(
                  'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm',
                  'ring-4 transition-all duration-200',
                  isActive
                    ? [colors.stepBg, colors.stepText, colors.stepRing, 'shadow-md']
                    : 'bg-neutral-100 text-neutral-400 ring-neutral-100 group-hover:ring-neutral-200',
                )}
              >
                {phase.step}
              </motion.div>
              <span
                className={clsx(
                  'text-xs font-semibold text-center leading-tight transition-colors duration-200',
                  isActive ? colors.iconColor : 'text-neutral-400',
                )}
              >
                {phase.subtitle}
              </span>
              <span
                className={clsx(
                  'text-xs text-center leading-tight transition-colors duration-200 hidden sm:block',
                  isActive ? 'text-neutral-700' : 'text-neutral-400',
                )}
              >
                {phase.label}
              </span>
            </button>

            {/* Connector */}
            {!isLast && (
              <div className="flex items-center mb-5 w-8 sm:w-12 shrink-0">
                <div className="h-0.5 w-full bg-neutral-200 relative overflow-hidden rounded-full">
                  <motion.div
                    animate={
                      shouldReduceMotion
                        ? {}
                        : {
                            scaleX:
                              activePhaseId &&
                              PHASES.findIndex((p) => p.id === activePhaseId) > idx
                                ? 1
                                : 0,
                          }
                    }
                    initial={{ scaleX: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    style={{ originX: 0 }}
                    className={clsx('absolute inset-0', colors.connectorActive)}
                  />
                </div>
                <ChevronRight size={12} className="text-neutral-300 shrink-0 -ml-1" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface ActionCardProps {
  item: ActionItem;
  colorKey: 'blue' | 'orange' | 'sky';
  index: number;
  shouldReduceMotion: boolean;
}

function ActionCard({ item, colorKey, index, shouldReduceMotion }: ActionCardProps) {
  const colors = PHASE_COLORS[colorKey];

  const statusIcon =
    item.status === '已完成' ? (
      <CheckCircle size={12} className="text-green-500 shrink-0" />
    ) : (
      <Circle size={12} className="text-neutral-300 shrink-0" />
    );

  return (
    <motion.div
      initial={shouldReduceMotion ? {} : { opacity: 0, y: 12 }}
      animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
      transition={{
        duration: 0.25,
        delay: index * 0.07,
        ease: 'easeOut',
      }}
      className={clsx(
        'rounded-lg border p-3 flex flex-col gap-2',
        colors.cardBorder,
        colors.cardBg,
      )}
    >
      <div className="flex items-start gap-2">
        <span className={clsx('mt-0.5 shrink-0', colors.iconColor)}>{item.icon}</span>
        <p className="text-sm font-medium text-neutral-700 leading-snug">{item.label}</p>
      </div>
      <div className="flex items-center gap-1.5">
        {statusIcon}
        <span
          className={clsx(
            'text-xs font-medium px-2 py-0.5 rounded-full border',
            colors.pillBg,
            colors.pillText,
            colors.pillBorder,
          )}
        >
          {item.status}
        </span>
      </div>
    </motion.div>
  );
}

interface PhaseColumnProps {
  phase: Phase;
  isActive: boolean;
  shouldReduceMotion: boolean;
  onSelect: (id: string) => void;
}

function PhaseColumn({ phase, isActive, shouldReduceMotion, onSelect }: PhaseColumnProps) {
  const colors = PHASE_COLORS[phase.colorKey];

  return (
    <motion.div
      animate={
        shouldReduceMotion
          ? {}
          : { opacity: isActive ? 1 : 0.4, scale: isActive ? 1 : 0.97 }
      }
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onClick={() => onSelect(phase.id)}
      className="flex flex-col gap-0 rounded-xl overflow-hidden border border-neutral-200 cursor-pointer min-w-0"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect(phase.id);
      }}
      aria-label={`選擇 ${phase.subtitle} ${phase.label}`}
    >
      {/* Column header */}
      <div
        className={clsx(
          'px-4 py-3 flex items-center gap-2',
          colors.headerBg,
          colors.headerText,
        )}
      >
        <span className="text-xs font-semibold opacity-80">{phase.subtitle}</span>
        <span className="text-sm font-bold">{phase.label}</span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2.5 p-3 bg-white/60 flex-1">
        {isActive
          ? phase.items.map((item, idx) => (
              <ActionCard
                key={item.id}
                item={item}
                colorKey={phase.colorKey}
                index={idx}
                shouldReduceMotion={shouldReduceMotion}
              />
            ))
          : phase.items.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-neutral-100 bg-neutral-50 p-3 flex items-center gap-2"
              >
                <span className="text-neutral-300 shrink-0">{item.icon}</span>
                <p className="text-xs text-neutral-400 leading-snug line-clamp-2">
                  {item.label}
                </p>
              </div>
            ))}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Insight banner
// ---------------------------------------------------------------------------

function InsightBanner() {
  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-neutral-50 border border-neutral-200 px-4 py-3 mt-6">
      <CheckCircle size={16} className="text-blue-500 shrink-0" />
      <p className="text-xs text-neutral-600 leading-relaxed">
        <span className="font-semibold text-neutral-800">核心洞察：</span>
        不要一次到位——先以最小可行版本（MVP）驗證流程，再逐步標準化、最後才自動化擴張。
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

export default function ActionRoadmap() {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const [activePhaseId, setActivePhaseId] = useState<string>(PHASES[0].id);

  function handleSelect(id: string) {
    setActivePhaseId((prev) => (prev === id ? id : id));
  }

  return (
    <div className="not-prose max-w-4xl mx-auto space-y-2">
      {/* Header */}
      <div className="text-center mb-6">
        <h3 className="text-base font-bold text-neutral-800 mb-1">
          MVP-first 落地路線圖
        </h3>
        <p className="text-xs text-neutral-500">
          點擊階段以展開行動項目
        </p>
      </div>

      {/* Stepper */}
      <Stepper
        phases={PHASES}
        activePhaseId={activePhaseId}
        onSelect={handleSelect}
        shouldReduceMotion={shouldReduceMotion}
      />

      {/* Kanban columns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {PHASES.map((phase) => (
          <PhaseColumn
            key={phase.id}
            phase={phase}
            isActive={activePhaseId === phase.id}
            shouldReduceMotion={shouldReduceMotion}
            onSelect={handleSelect}
          />
        ))}
      </div>

      {/* Insight */}
      <InsightBanner />
    </div>
  );
}
