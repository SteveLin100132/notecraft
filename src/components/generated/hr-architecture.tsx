import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Monitor, Server, Database, ChevronDown, ChevronRight, ArrowRight, Clock } from 'lucide-react';
import { clsx } from 'clsx';

interface Tech {
  name: string;
  pending?: boolean;
  note?: string;
}

interface Layer {
  id: string;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  colorClasses: {
    header: string;
    headerText: string;
    body: string;
    border: string;
    chip: string;
    chipPending: string;
    highlight: string;
  };
  techs: Tech[];
  notes?: string[];
}

const LAYERS: Layer[] = [
  {
    id: 'frontend',
    label: '前端層',
    sublabel: 'Frontend',
    icon: <Monitor size={20} />,
    colorClasses: {
      header: 'bg-[#1b4f9c]',
      headerText: 'text-white',
      body: 'bg-[#eef4fb]',
      border: 'border-[#1b4f9c]',
      chip: 'bg-[#d6e4f5] text-[#1b4f9c] border border-[#adc8e8]',
      chipPending: 'bg-[#fdf4e6] text-[#a04f15] border border-[#f2b955]',
      highlight: 'ring-2 ring-[#1b4f9c]',
    },
    techs: [
      { name: 'React' },
      { name: 'TypeScript' },
      { name: 'Tailwind CSS' },
      { name: 'shadcn/ui' },
      { name: 'Zod（前後端驗證一致）' },
      { name: 'Vitest' },
      { name: 'Playwright (E2E)' },
      { name: 'TanStack Query', pending: true, note: '處理 loading/success/error/cache，有學習成本' },
      { name: 'Storybook', pending: true, note: '視情況引入' },
    ],
    notes: [
      'API 存取抽象成一層，不要把 API call 與狀態更新混在同一層',
      'AI 產 React 易亂加 hook，需訂規範',
    ],
  },
  {
    id: 'backend',
    label: '後端層',
    sublabel: 'Backend',
    icon: <Server size={20} />,
    colorClasses: {
      header: 'bg-[#1f5aa6]',
      headerText: 'text-white',
      body: 'bg-[#eef4fb]',
      border: 'border-[#1f5aa6]',
      chip: 'bg-[#d6e4f5] text-[#163f7d] border border-[#adc8e8]',
      chipPending: 'bg-[#fdf4e6] text-[#a04f15] border border-[#f2b955]',
      highlight: 'ring-2 ring-[#1f5aa6]',
    },
    techs: [
      { name: 'NestJS' },
      { name: 'TypeScript' },
      { name: 'Zod 驗證' },
      { name: 'Pino (logging)' },
      { name: 'JWT / OIDC (認證)' },
      { name: 'ABAC (授權，非只 RBAC)' },
      { name: 'Helmet (安全 header)' },
    ],
    notes: [],
  },
  {
    id: 'data',
    label: '資料 / 基礎設施層',
    sublabel: 'Data & Infra',
    icon: <Database size={20} />,
    colorClasses: {
      header: 'bg-[#163f7d]',
      headerText: 'text-white',
      body: 'bg-[#eef4fb]',
      border: 'border-[#163f7d]',
      chip: 'bg-[#d6e4f5] text-[#112f5d] border border-[#adc8e8]',
      chipPending: 'bg-[#fdf4e6] text-[#a04f15] border border-[#f2b955]',
      highlight: 'ring-2 ring-[#163f7d]',
    },
    techs: [
      { name: 'PostgreSQL（主候選，未來可評估 pgvector）' },
      { name: 'ORM（Prisma / Knex / 原生 SQL）', pending: true, note: '待評估最佳選項' },
      { name: 'Redis（快取 / Queue）' },
      { name: 'BullMQ（Queue 控耗時 / LLM 任務）' },
      { name: 'Dev / Staging / Production 三套環境' },
      { name: 'GCP 或 VPS / Docker 部署' },
    ],
    notes: [],
  },
];

export default function HrArchitecture() {
  const [openLayer, setOpenLayer] = useState<string | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const duration = shouldReduceMotion ? 0 : 0.28;
  const ease = 'easeOut' as const;

  const toggle = (id: string) => {
    setOpenLayer(prev => (prev === id ? null : id));
  };

  return (
    <div className="not-prose max-w-2xl mx-auto font-sans">
      {/* 架構外框標籤 */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 h-px bg-[#cbd3df]" />
        <span className="text-xs font-semibold tracking-widest text-[#4f5b6e] uppercase px-2">
          單體 + Domain 模組化架構
        </span>
        <div className="flex-1 h-px bg-[#cbd3df]" />
      </div>

      {/* 分層圖 */}
      <div
        className="rounded-xl border border-[#e1e6ee] overflow-hidden"
        style={{ background: 'var(--surface-card, #fff)' }}
      >
        {LAYERS.map((layer, idx) => {
          const isOpen = openLayer === layer.id;
          const isOther = openLayer !== null && !isOpen;

          return (
            <div key={layer.id}>
              {/* 層間分隔（除了第一層） */}
              {idx > 0 && (
                <div className="flex justify-center py-0 bg-[#f6f8fb]">
                  <ChevronDown size={16} className="text-[#9aa6b8]" />
                </div>
              )}

              {/* 層 header（可點擊） */}
              <motion.button
                type="button"
                onClick={() => toggle(layer.id)}
                animate={{ opacity: isOther ? 0.55 : 1 }}
                transition={{ duration, ease }}
                className={clsx(
                  'w-full flex items-center gap-3 px-5 py-4 text-left cursor-pointer select-none transition-opacity',
                  layer.colorClasses.header,
                  layer.colorClasses.headerText,
                  isOpen && 'opacity-100'
                )}
                aria-expanded={isOpen}
              >
                <span className="shrink-0 opacity-90">{layer.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm leading-tight">{layer.label}</div>
                  <div className="text-xs opacity-70 mt-0.5">{layer.sublabel}</div>
                </div>
                <motion.span
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration, ease }}
                  className="shrink-0 opacity-75"
                >
                  <ChevronDown size={16} />
                </motion.span>
              </motion.button>

              {/* 展開內容 */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="content"
                    initial={shouldReduceMotion ? false : { height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={shouldReduceMotion ? undefined : { height: 0, opacity: 0 }}
                    transition={{ duration, ease }}
                    className="overflow-hidden"
                  >
                    <div className={clsx('px-5 py-4 space-y-4', layer.colorClasses.body)}>
                      {/* 技術 chip 列表 */}
                      <div className="flex flex-wrap gap-2">
                        {layer.techs.map(tech => (
                          <div key={tech.name} className="group relative">
                            <span
                              className={clsx(
                                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium leading-none',
                                tech.pending
                                  ? layer.colorClasses.chipPending
                                  : layer.colorClasses.chip
                              )}
                            >
                              {tech.pending && (
                                <Clock size={11} className="shrink-0 opacity-80" />
                              )}
                              {tech.name}
                              {tech.pending && (
                                <span className="ml-1 text-[10px] opacity-70 font-normal">待評估</span>
                              )}
                            </span>
                            {/* tooltip for pending note */}
                            {tech.pending && tech.note && (
                              <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                                <div className="bg-[#262e3d] text-white text-xs rounded-lg px-3 py-2 max-w-[200px] text-center leading-snug whitespace-normal shadow-lg">
                                  {tech.note}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#262e3d]" />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* 附註 */}
                      {layer.notes && layer.notes.length > 0 && (
                        <ul className="space-y-1.5">
                          {layer.notes.map(note => (
                            <li
                              key={note}
                              className="flex items-start gap-2 text-xs text-[#4f5b6e] leading-snug"
                            >
                              <ArrowRight
                                size={12}
                                className="shrink-0 mt-0.5 text-[#9aa6b8]"
                              />
                              {note}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* 未來拆微服務提示 */}
      <div className="mt-8 flex items-center gap-3">
        <div className="flex-1 h-px bg-[#e1e6ee]" />
        <div className="flex items-center gap-2 rounded-full border border-[#f2b955] bg-[#fdf4e6] px-4 py-1.5 text-xs text-[#a04f15] font-medium">
          <ChevronRight size={13} className="text-[#ed9b26]" />
          未來視規模再拆微服務
        </div>
        <div className="flex-1 h-px bg-[#e1e6ee]" />
      </div>

      {/* 說明列 */}
      <div className="mt-6 flex flex-wrap gap-3 justify-center text-[11px] text-[#6c798e]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-[#d6e4f5] border border-[#adc8e8]" />
          已選定技術
        </span>
        <span className="flex items-center gap-1.5">
          <Clock size={11} className="text-[#ed9b26]" />
          <span className="inline-block px-1.5 rounded-full bg-[#fdf4e6] border border-[#f2b955] text-[#a04f15]">
            待評估
          </span>
          hover 可查附註
        </span>
      </div>
    </div>
  );
}
