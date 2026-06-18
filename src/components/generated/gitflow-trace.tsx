import { useState, useId } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { FileText, GitCommit, GitPullRequest, CircleDot, Code2 } from 'lucide-react';
import { clsx } from 'clsx';

// ─── Types ───────────────────────────────────────────────────────────────────

type SourceId = 'spec' | 'codebase' | 'commit' | 'pr' | 'issue';

interface SourceNode {
  id: SourceId;
  label: string;
  sublabel: string;
  trusted: boolean;
  detail: string;
  angle: number; // degrees, 0 = top
}

// ─── Data ────────────────────────────────────────────────────────────────────

const SOURCES: SourceNode[] = [
  {
    id: 'spec',
    label: 'Spec 文件',
    sublabel: 'AI 不一定會主動翻',
    trusted: false,
    detail: 'Spec 文件往往存放在獨立系統（Confluence、Google Docs）。AI 讀取 Codebase 時未必有這份脈絡，容易被忽略。',
    angle: -90,
  },
  {
    id: 'codebase',
    label: 'Codebase',
    sublabel: 'AI 比較會讀',
    trusted: true,
    detail: '程式碼本身是最直接的輸入。AI 通常從這裡出發，理解目前實作邏輯與結構。',
    angle: -20,
  },
  {
    id: 'commit',
    label: 'Commit',
    sublabel: 'AI 比較會讀',
    trusted: true,
    detail: '修改原因 / 重構動機 / 修 bug 的背景——留在 commit message 裡，AI 能 git log 直接讀到。',
    angle: 40,
  },
  {
    id: 'pr',
    label: 'Pull Request',
    sublabel: 'AI 比較會讀',
    trusted: true,
    detail: '技術決策、替代方案的取捨、reviewers 提出的疑慮——PR description 與留言是寶貴脈絡。',
    angle: 130,
  },
  {
    id: 'issue',
    label: 'Issue',
    sublabel: 'AI 比較會讀',
    trusted: true,
    detail: '背景需求、技術規格、驗收標準——issue 是需求與設計決策的第一手紀錄。',
    angle: 190,
  },
];

// ─── Geometry helpers ────────────────────────────────────────────────────────

const CX = 280; // SVG center-x
const CY = 240; // SVG center-y
const ORBIT = 170; // distance from center to node center
const NODE_R = 36; // node circle radius
const CENTER_R = 44; // center node radius

function angleToXY(deg: number, r: number): { x: number; y: number } {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function lineThroughCircles(
  ax: number,
  ay: number,
  ar: number,
  bx: number,
  by: number,
  br: number,
): { x1: number; y1: number; x2: number; y2: number } {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / len;
  const uy = dy / len;
  return {
    x1: ax + ux * ar,
    y1: ay + uy * ar,
    x2: bx - ux * br,
    y2: by - uy * br,
  };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface AnimatedLineProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  trusted: boolean;
  active: boolean;
  reduced: boolean | null;
  gradientId: string;
}

function AnimatedLine({ x1, y1, x2, y2, trusted, active, reduced, gradientId }: AnimatedLineProps) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (!trusted) {
    // Dashed, low-opacity, grey
    return (
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="#9aa6b8"
        strokeWidth={1.5}
        strokeDasharray="5 4"
        opacity={active ? 0.55 : 0.28}
        strokeLinecap="round"
      />
    );
  }

  // Animated dash offset for trusted nodes
  const dashLen = length * 0.35;
  const gap = length - dashLen;

  return (
    <g>
      {/* Base line */}
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={active ? 'url(#' + gradientId + ')' : '#adc8e8'}
        strokeWidth={active ? 2.5 : 1.5}
        opacity={active ? 1 : 0.4}
        strokeLinecap="round"
      />
      {/* Flowing particle */}
      {!reduced && active && (
        <motion.line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="#ed9b26"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={`${dashLen} ${gap}`}
          initial={{ strokeDashoffset: length }}
          animate={{ strokeDashoffset: -length }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        />
      )}
    </g>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function GitflowTrace() {
  const [active, setActive] = useState<SourceId | null>(null);
  const reduced = useReducedMotion();
  const uid = useId().replace(/:/g, '');
  const gradientId = `tl-grad-${uid}`;

  const activeSource = SOURCES.find((s) => s.id === active) ?? null;

  function toggle(id: SourceId) {
    setActive((prev) => (prev === id ? null : id));
  }

  return (
    <div className="not-prose mx-auto max-w-2xl space-y-0 font-sans select-none">
      {/* SVG diagram */}
      <svg
        viewBox={`0 0 ${CX * 2} ${CY * 2 + 20}`}
        width="100%"
        aria-label="AI 追溯程式脈絡的路徑對照圖"
        role="img"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1b4f9c" />
            <stop offset="100%" stopColor="#4d84cb" />
          </linearGradient>
        </defs>

        {/* Connection lines */}
        {SOURCES.map((src) => {
          const { x, y } = angleToXY(src.angle, ORBIT);
          const isActive = active === src.id;
          const line = lineThroughCircles(CX, CY, CENTER_R, x, y, NODE_R);
          return (
            <AnimatedLine
              key={src.id}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              trusted={src.trusted}
              active={isActive}
              reduced={reduced}
              gradientId={gradientId}
            />
          );
        })}

        {/* Center node: Code */}
        <circle
          cx={CX}
          cy={CY}
          r={CENTER_R}
          fill="#1b4f9c"
        />
        <foreignObject x={CX - 18} y={CY - 20} width={36} height={40}>
          <div className="flex flex-col items-center justify-center h-full">
            <Code2 size={18} color="#ffffff" />
            <span className="text-white text-center leading-tight mt-0.5" style={{ fontSize: '9px' }}>程式碼</span>
          </div>
        </foreignObject>

        {/* Source nodes */}
        {SOURCES.map((src) => {
          const { x, y } = angleToXY(src.angle, ORBIT);
          const isActive = active === src.id;

          const fillColor = src.trusted
            ? isActive
              ? '#1b4f9c'
              : '#eef4fb'
            : isActive
              ? '#eef1f6'
              : '#f6f8fb';

          const strokeColor = src.trusted
            ? isActive
              ? '#1b4f9c'
              : '#7ba6da'
            : '#cbd3df';

          const textColor = src.trusted
            ? isActive
              ? '#ffffff'
              : '#1b4f9c'
            : '#9aa6b8';

          return (
            <g
              key={src.id}
              role="button"
              tabIndex={0}
              aria-pressed={isActive}
              aria-label={src.label}
              onClick={() => toggle(src.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') toggle(src.id);
              }}
              style={{ cursor: 'pointer', outline: 'none' }}
              className="focus:outline-none"
            >
              <motion.circle
                cx={x}
                cy={y}
                r={NODE_R}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={isActive ? 2.5 : 1.5}
                animate={
                  !reduced && isActive && src.trusted
                    ? { scale: [1, 1.06, 1] }
                    : { scale: 1 }
                }
                transition={{ duration: 0.3, ease: 'easeOut' }}
                style={{ transformOrigin: `${x}px ${y}px` }}
                opacity={src.trusted ? 1 : isActive ? 0.75 : 0.45}
              />
              <foreignObject
                x={x - NODE_R + 4}
                y={y - NODE_R + 4}
                width={(NODE_R - 4) * 2}
                height={(NODE_R - 4) * 2}
                style={{ pointerEvents: 'none' }}
              >
                <div className="flex flex-col items-center justify-center h-full w-full">
                  <NodeIcon id={src.id} active={isActive} trusted={src.trusted} />
                  <span
                    className="text-center leading-tight mt-0.5 font-medium"
                    style={{ fontSize: '9px', color: textColor }}
                  >
                    {src.label}
                  </span>
                </div>
              </foreignObject>
            </g>
          );
        })}

        {/* Sublabel badges */}
        {SOURCES.map((src) => {
          const { x, y } = angleToXY(src.angle, ORBIT);
          const badgeY = y + NODE_R + 14;

          return (
            <foreignObject
              key={`badge-${src.id}`}
              x={x - 52}
              y={badgeY - 10}
              width={104}
              height={20}
              style={{ pointerEvents: 'none' }}
            >
              <div className="flex justify-center">
                <span
                  className={clsx(
                    'inline-block px-1.5 py-0.5 rounded text-center leading-none font-medium',
                    src.trusted
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-neutral-100 text-neutral-400',
                  )}
                  style={{ fontSize: '8px' }}
                >
                  {src.sublabel}
                </span>
              </div>
            </foreignObject>
          );
        })}
      </svg>

      {/* Detail panel */}
      <div className="min-h-[72px] px-4 pb-4">
        {activeSource ? (
          <motion.div
            key={activeSource.id}
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className={clsx(
              'rounded-lg px-4 py-3 text-sm leading-relaxed',
              activeSource.trusted
                ? 'bg-blue-50 text-blue-900 border border-blue-200'
                : 'bg-neutral-100 text-neutral-500 border border-neutral-200',
            )}
          >
            <span className="font-semibold">{activeSource.label}：</span>
            {activeSource.detail}
          </motion.div>
        ) : (
          <p className="text-center text-sm text-neutral-400 pt-2">
            點擊任一節點，查看 AI 的取用傾向說明
          </p>
        )}
      </div>

      {/* Footer conclusion */}
      <div className="mx-4 mb-1 rounded-lg bg-gradient-to-r from-blue-800 to-blue-600 px-4 py-3 text-center">
        <div className="text-sm font-semibold text-white leading-snug">
          把脈絡留在 Git，而不是只留在 Spec
        </div>
        <div className="mt-0.5 text-xs text-white/90 leading-snug">
          Issue / Commit / PR 是 AI 最可靠的記憶宮殿
        </div>
      </div>
    </div>
  );
}

// ─── Icon helper ─────────────────────────────────────────────────────────────

function NodeIcon({ id, active, trusted }: { id: SourceId; active: boolean; trusted: boolean }) {
  const color = trusted ? (active ? '#ffffff' : '#1b4f9c') : '#9aa6b8';
  const size = 14;
  switch (id) {
    case 'spec':
      return <FileText size={size} color={color} />;
    case 'codebase':
      return <Code2 size={size} color={color} />;
    case 'commit':
      return <GitCommit size={size} color={color} />;
    case 'pr':
      return <GitPullRequest size={size} color={color} />;
    case 'issue':
      return <CircleDot size={size} color={color} />;
  }
}
