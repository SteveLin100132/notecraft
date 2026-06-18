import { useState, useCallback } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';

interface ThemeNode {
  id: string;
  label: string;
  summary: string;
  category: 'process' | 'quality' | 'infra';
  angle: number; // degrees
}

const NODES: ThemeNode[] = [
  {
    id: 'task-session',
    label: '任務分派與\n多 Session',
    summary: '明確切分責任邊界，多 Session 並行需依賴介面契約而非默契。',
    category: 'process',
    angle: 0,
  },
  {
    id: 'qa-testing',
    label: 'QA 與\n測試策略',
    summary: 'QA 需獨立成流程，含 Unit / E2E / Code Review 與檢查清單。',
    category: 'quality',
    angle: 45,
  },
  {
    id: 'code-review',
    label: 'Code Review\n與衝突解決',
    summary: '衝突應在 Review 階段消化，而非留到整合時爆發。',
    category: 'quality',
    angle: 90,
  },
  {
    id: 'api-versioning',
    label: 'API 版本管理',
    summary: '版本策略決定升級代價，早期設計比事後補救便宜一個量級。',
    category: 'process',
    angle: 135,
  },
  {
    id: 'docs-spec',
    label: '文件與規格',
    summary: '活文件應與程式碼同步更新，否則比沒有文件更危險。',
    category: 'process',
    angle: 180,
  },
  {
    id: 'ai-automation',
    label: 'AI 工具\n自動化',
    summary: 'AI 工具加速重複性任務，但需搭配驗收標準防止靜默失敗。',
    category: 'process',
    angle: 225,
  },
  {
    id: 'security-image',
    label: '安全性與\n圖片公開存取',
    summary: '公開資源的存取控制需在架構層決策，不能依賴應用層補丁。',
    category: 'infra',
    angle: 270,
  },
  {
    id: 'scalability',
    label: '系統擴展性\n（K8s/AWS/GCP）',
    summary: '橫向擴展前提是無狀態服務設計，平台工具只是最後一哩路。',
    category: 'infra',
    angle: 315,
  },
];

const CATEGORY_COLORS: Record<ThemeNode['category'], { fill: string; stroke: string; text: string; line: string; lineHighlight: string }> = {
  process:  { fill: '#eff6ff', stroke: '#1d4ed8', text: '#1e40af', line: '#93c5fd', lineHighlight: '#1d4ed8' },
  quality:  { fill: '#fff7ed', stroke: '#f97316', text: '#c2410c', line: '#fdba74', lineHighlight: '#f97316' },
  infra:    { fill: '#f0f9ff', stroke: '#0284c7', text: '#0369a1', line: '#7dd3fc', lineHighlight: '#0284c7' },
};

const CENTER_X = 300;
const CENTER_Y = 300;
const SPOKE_R = 195;
const CORE_R = 62;
const NODE_RX = 54;
const NODE_H = 46;

function polarToXY(angleDeg: number, r: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CENTER_X + r * Math.cos(rad), y: CENTER_Y + r * Math.sin(rad) };
}

export default function WorkshopThemeConstellation() {
  const [selected, setSelected] = useState<string | null>(null);
  const shouldReduce = useReducedMotion();

  const handleNodeClick = useCallback((id: string) => {
    setSelected(prev => (prev === id ? null : id));
  }, []);

  const selectedNode = NODES.find(n => n.id === selected) ?? null;

  const containerVariants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: shouldReduce ? 0 : 0.07 },
    },
  };

  const nodeVariants = {
    hidden: { opacity: 0, scale: 0.6 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: shouldReduce ? 0 : 0.32, ease: 'easeOut' },
    },
  };

  const coreVariants = {
    hidden: { opacity: 0, scale: 0.5 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: shouldReduce ? 0 : 0.4, ease: 'easeOut' },
    },
  };

  return (
    <div className="not-prose mx-auto max-w-3xl flex flex-col gap-4">
      {/* SVG constellation */}
      <svg
        viewBox="0 0 600 600"
        width="100%"
        aria-label="Workshop 主題星座圖"
        role="img"
      >
        {/* Spoke lines */}
        {NODES.map(node => {
          const pos = polarToXY(node.angle, SPOKE_R);
          const colors = CATEGORY_COLORS[node.category];
          const isSelected = selected === node.id;
          return (
            <motion.line
              key={`line-${node.id}`}
              x1={CENTER_X}
              y1={CENTER_Y}
              x2={pos.x}
              y2={pos.y}
              stroke={isSelected ? colors.lineHighlight : colors.line}
              strokeWidth={isSelected ? 2.5 : 1.5}
              strokeDasharray={isSelected ? undefined : '5 4'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: shouldReduce ? 0 : 0.3 } }}
            />
          );
        })}

        {/* Theme nodes */}
        <motion.g
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {NODES.map(node => {
            const pos = polarToXY(node.angle, SPOKE_R);
            const colors = CATEGORY_COLORS[node.category];
            const isSelected = selected === node.id;
            const lines = node.label.split('\n');

            return (
              <motion.g
                key={node.id}
                variants={nodeVariants}
                style={{ cursor: 'pointer' }}
                onClick={() => handleNodeClick(node.id)}
                role="button"
                aria-pressed={isSelected}
                aria-label={node.label.replace('\n', ' ')}
              >
                <rect
                  x={pos.x - NODE_RX}
                  y={pos.y - NODE_H / 2}
                  width={NODE_RX * 2}
                  height={NODE_H}
                  rx={10}
                  fill={isSelected ? colors.stroke : colors.fill}
                  stroke={colors.stroke}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                />
                {lines.map((line, i) => (
                  <text
                    key={i}
                    x={pos.x}
                    y={pos.y + (lines.length === 1 ? 5 : i === 0 ? -4 : 10)}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight={isSelected ? '700' : '500'}
                    fill={isSelected ? '#ffffff' : colors.text}
                    fontFamily="ui-sans-serif, system-ui, sans-serif"
                  >
                    {line}
                  </text>
                ))}
              </motion.g>
            );
          })}

          {/* Core node */}
          <motion.g
            variants={coreVariants}
            initial="hidden"
            animate="visible"
            onClick={() => setSelected(null)}
            style={{ cursor: 'default' }}
          >
            <circle
              cx={CENTER_X}
              cy={CENTER_Y}
              r={CORE_R}
              fill="#1e3a5f"
              stroke="#1d4ed8"
              strokeWidth={2.5}
            />
            <text
              x={CENTER_X}
              y={CENTER_Y - 8}
              textAnchor="middle"
              fontSize="11"
              fontWeight="700"
              fill="#e0f2fe"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
            >
              軟體開發
            </text>
            <text
              x={CENTER_X}
              y={CENTER_Y + 6}
              textAnchor="middle"
              fontSize="11"
              fontWeight="700"
              fill="#e0f2fe"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
            >
              流程與 QA
            </text>
          </motion.g>
        </motion.g>
      </svg>

      {/* Detail panel */}
      <AnimatePresence mode="wait">
        {selectedNode ? (
          <motion.div
            key={selectedNode.id}
            initial={{ opacity: 0, y: shouldReduce ? 0 : 8 }}
            animate={{ opacity: 1, y: 0, transition: { duration: shouldReduce ? 0 : 0.25, ease: 'easeOut' } }}
            exit={{ opacity: 0, y: shouldReduce ? 0 : -6, transition: { duration: shouldReduce ? 0 : 0.18 } }}
            className={clsx(
              'rounded-xl px-5 py-4 border',
              selectedNode.category === 'quality'
                ? 'bg-orange-50 border-orange-200'
                : selectedNode.category === 'infra'
                ? 'bg-sky-50 border-sky-200'
                : 'bg-blue-50 border-blue-200'
            )}
          >
            <p
              className={clsx(
                'text-sm font-semibold mb-1',
                selectedNode.category === 'quality'
                  ? 'text-orange-700'
                  : selectedNode.category === 'infra'
                  ? 'text-sky-700'
                  : 'text-blue-700'
              )}
            >
              {selectedNode.label.replace('\n', ' ')}
            </p>
            <p className="text-sm text-neutral-700 leading-relaxed">
              {selectedNode.summary}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="core-insight"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: shouldReduce ? 0 : 0.3 } }}
            exit={{ opacity: 0 }}
            className="rounded-xl px-5 py-4 bg-neutral-50 border border-neutral-200"
          >
            <p className="text-sm text-neutral-500 mb-1 font-medium">核心洞察</p>
            <p className="text-sm text-neutral-700 leading-relaxed">
              讓多角色 / 多 Session 的開發協作，在效率與穩定之間取得平衡。
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-2 px-1">
        {(
          [
            { category: 'process', label: '流程協作' },
            { category: 'quality', label: '品質驗證' },
            { category: 'infra',   label: '基礎建設 / 擴展' },
          ] as const
        ).map(({ category, label }) => {
          const colors = CATEGORY_COLORS[category];
          return (
            <span key={category} className="flex items-center gap-1.5 text-xs text-neutral-600">
              <span
                className="inline-block w-3 h-3 rounded-sm border"
                style={{ backgroundColor: colors.fill, borderColor: colors.stroke }}
              />
              {label}
            </span>
          );
        })}
        <span className="text-xs text-neutral-400 ml-auto">點擊節點查看摘要</span>
      </div>
    </div>
  );
}
