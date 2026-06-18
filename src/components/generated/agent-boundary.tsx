import React, { useState } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'motion/react';
import { BookOpen, Bot, RefreshCw, CheckCircle, AlertTriangle, ArrowRight, TrendingUp, Layers } from 'lucide-react';
import { clsx } from 'clsx';

type RoleKey = 'skill' | 'subagent' | 'agentloop';

interface RoleData {
  key: RoleKey;
  label: string;
  icon: React.ReactNode;
  tagline: string;
  position: string;
  tasks: string[];
  boundary: string;
  boundaryType: 'ok' | 'warn' | 'danger';
  accentClass: string;
  bgClass: string;
  borderClass: string;
  iconBgClass: string;
}

const roles: RoleData[] = [
  {
    key: 'skill',
    label: 'Skill',
    icon: <BookOpen size={20} />,
    tagline: '定義固定流程、規則、工作方法',
    position: '知識庫與行為規範層',
    tasks: [
      '描述特定領域的操作步驟',
      '設定輸出格式與品質檢查規則',
      '封裝可重用的工作方法',
      '作為 Agent / Sub-agent 的指令基礎',
    ],
    boundary: '本身不執行任務，只是「規則文件」；沒有記憶、不決策、不呼叫工具。',
    boundaryType: 'ok',
    accentClass: 'text-[#1b4f9c]',
    bgClass: 'bg-[#eef4fb]',
    borderClass: 'border-[#7ba6da]',
    iconBgClass: 'bg-[#d6e4f5] text-[#1b4f9c]',
  },
  {
    key: 'subagent',
    label: 'Sub-agent',
    icon: <Bot size={20} />,
    tagline: '預先設定的角色，處理特定類型任務',
    position: '可部署的局部執行單元',
    tasks: [
      '資料蒐集與摘要（避免污染主 session）',
      '局部獨立任務（如：元件生成、格式轉換）',
      '獨立審查與驗證（不受主流程偏見影響）',
      '平行執行以加速整體 pipeline',
    ],
    boundary: '最適合「可明確定義輸入/輸出」的子任務；若邊界模糊或需要主 session 狀態，考慮保留在主 Agent。',
    boundaryType: 'ok',
    accentClass: 'text-[#2a76ad]',
    bgClass: 'bg-[#f0f7fd]',
    borderClass: 'border-[#4aa3d6]',
    iconBgClass: 'bg-[#d6e4f5] text-[#2a76ad]',
  },
  {
    key: 'agentloop',
    label: 'Agent loop',
    icon: <RefreshCw size={20} />,
    tagline: 'MVP / Prototype 快速驗證，不適合正式產品核心',
    position: '彈性探索層（成本敏感）',
    tasks: [
      'MVP 功能快速驗證與 PoC',
      '需求尚未穩定的探索性任務',
      '開發者工具與一次性自動化腳本',
      '正式產品進入生產前的 staging 測試',
    ],
    boundary: '成本難預估、穩定性差——正式產品應逐步拆成「可程式化節點」或「單次 LLM call」，避免 loop 無限膨脹。',
    boundaryType: 'danger',
    accentClass: 'text-[#d64545]',
    bgClass: 'bg-[#fdf6f6]',
    borderClass: 'border-[#d64545]',
    iconBgClass: 'bg-[#fbeaea] text-[#d64545]',
  },
];

function CostCurve() {
  const shouldReduce = useReducedMotion();
  const width = 560;
  const height = 180;
  const padL = 56;
  const padR = 24;
  const padT = 16;
  const padB = 40;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  // Prototype zone: x 0..45%, cost stays low; Production zone: x 45%..100%, cost rockets
  const splitX = padL + innerW * 0.45;

  // Green segment (prototype, cost manageable) — gentle rise
  const greenPoints: [number, number][] = [
    [padL, padT + innerH * 0.72],
    [padL + innerW * 0.15, padT + innerH * 0.65],
    [padL + innerW * 0.30, padT + innerH * 0.58],
    [padL + innerW * 0.45, padT + innerH * 0.50],
  ];

  // Red segment (production, cost explodes)
  const redPoints: [number, number][] = [
    [padL + innerW * 0.45, padT + innerH * 0.50],
    [padL + innerW * 0.60, padT + innerH * 0.38],
    [padL + innerW * 0.75, padT + innerH * 0.18],
    [padL + innerW * 0.88, padT + innerH * 0.04],
  ];

  function toPath(pts: [number, number][]): string {
    if (pts.length < 2) return '';
    const [x0, y0] = pts[0];
    let d = `M ${x0} ${y0}`;
    for (let i = 1; i < pts.length; i++) {
      const [xp, yp] = pts[i - 1];
      const [xc, yc] = pts[i];
      const cpx = (xp + xc) / 2;
      d += ` C ${cpx} ${yp}, ${cpx} ${yc}, ${xc} ${yc}`;
    }
    return d;
  }

  const greenPath = toPath(greenPoints);
  const redPath = toPath(redPoints);
  const lastRed = redPoints[redPoints.length - 1];

  return (
    <div className="mt-6">
      <p className="text-xs font-medium mb-2" style={{ color: '#4f5b6e' }}>
        成本曲線示意：Agent loop 在各階段的可控性
      </p>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          style={{ maxWidth: width, display: 'block' }}
          aria-label="Agent loop 成本曲線示意圖"
          role="img"
        >
          {/* Background zone: Prototype */}
          <rect
            x={padL}
            y={padT}
            width={splitX - padL}
            height={innerH}
            fill="#e7f6ee"
            opacity={0.5}
          />
          {/* Background zone: Production */}
          <rect
            x={splitX}
            y={padT}
            width={padL + innerW - splitX}
            height={innerH}
            fill="#fbeaea"
            opacity={0.5}
          />

          {/* Axes */}
          <line x1={padL} y1={padT} x2={padL} y2={padT + innerH} stroke="#cbd3df" strokeWidth={1.5} />
          <line x1={padL} y1={padT + innerH} x2={padL + innerW} y2={padT + innerH} stroke="#cbd3df" strokeWidth={1.5} />

          {/* Y axis label */}
          <text
            x={padL - 8}
            y={padT + innerH / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={10}
            fill="#6c798e"
            transform={`rotate(-90, ${padL - 8}, ${padT + innerH / 2})`}
          >
            成本 / 不穩定性
          </text>

          {/* X axis labels */}
          <text x={padL + innerW * 0.22} y={padT + innerH + 16} textAnchor="middle" fontSize={10} fill="#2e9e6b" fontWeight="600">
            Prototype
          </text>
          <text x={padL + innerW * 0.72} y={padT + innerH + 16} textAnchor="middle" fontSize={10} fill="#d64545" fontWeight="600">
            Production
          </text>

          {/* Green curve */}
          <motion.path
            d={greenPath}
            fill="none"
            stroke="#2e9e6b"
            strokeWidth={2.5}
            strokeLinecap="round"
            initial={shouldReduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />

          {/* Red curve */}
          <motion.path
            d={redPath}
            fill="none"
            stroke="#d64545"
            strokeWidth={2.5}
            strokeLinecap="round"
            initial={shouldReduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut', delay: shouldReduce ? 0 : 0.35 }}
          />

          {/* Annotation: refactor arrow at right side */}
          <motion.g
            initial={shouldReduce ? false : { opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut', delay: shouldReduce ? 0 : 0.6 }}
          >
            <line
              x1={lastRed[0] + 4}
              y1={lastRed[1]}
              x2={lastRed[0] + 4}
              y2={padT + innerH * 0.55}
              stroke="#e3a008"
              strokeWidth={1.5}
              strokeDasharray="3 2"
            />
            <text
              x={lastRed[0] + 8}
              y={padT + innerH * 0.34}
              fontSize={9}
              fill="#e3a008"
              fontWeight="600"
              textAnchor="start"
            >
              拆成可程式化節點
            </text>
            <text
              x={lastRed[0] + 8}
              y={padT + innerH * 0.34 + 12}
              fontSize={9}
              fill="#e3a008"
              fontWeight="600"
              textAnchor="start"
            >
              / 單次 LLM call
            </text>
          </motion.g>

          {/* Divider line */}
          <line
            x1={splitX}
            y1={padT}
            x2={splitX}
            y2={padT + innerH}
            stroke="#cbd3df"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
        </svg>
      </div>
    </div>
  );
}

export default function AgentBoundary() {
  const [active, setActive] = useState<RoleKey>('skill');
  const shouldReduce = useReducedMotion();
  const activeRole = roles.find((r) => r.key === active)!;

  const transition = {
    duration: shouldReduce ? 0 : 0.25,
    ease: 'easeOut' as const,
  };

  return (
    <div className="not-prose max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-[#1b4f9c]" />
          <span className="text-xs font-semibold tracking-widest uppercase text-[#4f5b6e]">
            角色分工與適用邊界
          </span>
        </div>
        <h2 className="text-lg font-bold text-[#1b4f9c]">
          Skill / Sub-agent / Agent loop
        </h2>
        <p className="text-sm text-[#4f5b6e]">
          三者定位不同，適用場景各異。點選 tab 查看各角色的適用任務與邊界。
        </p>
      </div>

      {/* Tab row */}
      <div className="flex gap-2 flex-wrap">
        {roles.map((role) => (
          <button
            key={role.key}
            onClick={() => setActive(role.key)}
            className={clsx(
              'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200',
              active === role.key
                ? clsx('border-transparent text-white', {
                    'bg-[#1b4f9c]': role.key === 'skill',
                    'bg-[#2a76ad]': role.key === 'subagent',
                    'bg-[#d64545]': role.key === 'agentloop',
                  })
                : 'border-[#e1e6ee] text-[#4f5b6e] bg-white hover:bg-[#f6f8fb]'
            )}
          >
            <span
              className={clsx(
                'transition-colors duration-200',
                active === role.key ? 'text-white' : role.accentClass
              )}
            >
              {role.icon}
            </span>
            {role.label}
          </button>
        ))}
      </div>

      {/* Detail panel */}
      <div className="relative overflow-hidden rounded-2xl border border-[#e1e6ee] bg-[#f6f8fb]">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={shouldReduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={transition}
            className="p-5 space-y-4"
          >
            {/* Role header */}
            <div className="flex items-start gap-3">
              <div className={clsx('rounded-xl p-2.5 flex-shrink-0', activeRole.iconBgClass)}>
                {activeRole.icon}
              </div>
              <div>
                <div className={clsx('text-xs font-semibold mb-0.5', activeRole.accentClass)}>
                  {activeRole.position}
                </div>
                <div className="font-semibold text-[#1b4f9c] text-base">{activeRole.tagline}</div>
              </div>
            </div>

            {/* Tasks */}
            <div>
              <p className="text-xs font-semibold text-[#6c798e] mb-2 uppercase tracking-wider">適用任務</p>
              <ul className="space-y-1.5">
                {activeRole.tasks.map((task) => (
                  <li key={task} className="flex items-start gap-2 text-sm text-[#3a4456]">
                    <ArrowRight size={14} className={clsx('mt-0.5 flex-shrink-0', activeRole.accentClass)} />
                    {task}
                  </li>
                ))}
              </ul>
            </div>

            {/* Boundary */}
            <div
              className={clsx(
                'rounded-xl p-3.5 border flex items-start gap-2.5',
                activeRole.bgClass,
                activeRole.borderClass
              )}
            >
              {activeRole.boundaryType === 'danger' ? (
                <AlertTriangle size={16} className={clsx('flex-shrink-0 mt-0.5', activeRole.accentClass)} />
              ) : (
                <CheckCircle size={16} className={clsx('flex-shrink-0 mt-0.5', activeRole.accentClass)} />
              )}
              <div>
                <span className={clsx('text-xs font-semibold mr-1', activeRole.accentClass)}>邊界：</span>
                <span className="text-sm text-[#3a4456]">{activeRole.boundary}</span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Cost curve (only shown when agentloop is selected) */}
      <AnimatePresence>
        {active === 'agentloop' && (
          <motion.div
            key="cost-curve"
            initial={shouldReduce ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: shouldReduce ? 0 : 0.3, ease: 'easeOut' }}
            className="overflow-hidden rounded-2xl border border-[#e1e6ee] bg-white px-5 py-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={15} className="text-[#d64545]" />
              <span className="text-sm font-semibold text-[#1b4f9c]">為何不適合正式產品核心？</span>
            </div>
            <p className="text-xs text-[#6c798e] mb-1">
              Agent loop 在 Prototype 階段成本尚可接受，一旦進入 Production 規模，成本曲線急速攀升且難以預估，
              應逐步重構為可程式化節點或單次 LLM call。
            </p>
            <CostCurve />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary legend */}
      <div className="grid grid-cols-3 gap-3 text-center">
        {roles.map((role) => (
          <button
            key={role.key}
            onClick={() => setActive(role.key)}
            className={clsx(
              'rounded-xl p-3 border transition-all duration-200 cursor-pointer',
              active === role.key
                ? clsx(role.bgClass, role.borderClass)
                : 'border-[#e1e6ee] bg-white hover:bg-[#f6f8fb]'
            )}
          >
            <div className={clsx('flex justify-center mb-1', role.accentClass)}>
              {role.icon}
            </div>
            <div className={clsx('text-xs font-semibold', role.accentClass)}>{role.label}</div>
            <div className="text-[10px] text-[#6c798e] mt-0.5 leading-snug line-clamp-2">
              {role.key === 'skill' && '規則與流程定義'}
              {role.key === 'subagent' && '局部任務執行'}
              {role.key === 'agentloop' && 'MVP 驗證，非產品核心'}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
