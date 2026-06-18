import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { MousePointerClick, RotateCcw } from 'lucide-react';

// ── Design tokens (from trendlink-design colors.css) ─────────────────────────
const C = {
  blue700:    '#1b4f9c',
  blue500:    '#2c6ebb',
  blue100:    '#d6e4f5',
  blue50:     '#eef4fb',
  orange500:  '#e37b24',
  orange50:   '#fdf4e6',
  neutral900: '#161c28',
  neutral600: '#4f5b6e',
  neutral500: '#6c798e',
  neutral400: '#9aa6b8',
  neutral300: '#cbd3df',
  neutral200: '#e1e6ee',
  neutral100: '#eef1f6',
  white:      '#ffffff',
} as const;

// ── Data ──────────────────────────────────────────────────────────────────────
type NodeKind = 'start' | 'middle' | 'terminal-success' | 'terminal-cancel' | 'terminal-refund';

interface NodeDef {
  id: string;
  label: string;
  cx: number;
  cy: number;
  kind: NodeKind;
}

interface EdgeDef {
  from: string;
  to: string;
  label: string;
  path: string;
  labelX: number;
  labelY: number;
}

const NODES: NodeDef[] = [
  { id: 'pending-payment', label: '待付款',  cx: 100, cy: 210, kind: 'start' },
  { id: 'paid',            label: '已付款',  cx: 310, cy: 210, kind: 'middle' },
  { id: 'shipped',         label: '已出貨',  cx: 510, cy: 210, kind: 'middle' },
  { id: 'completed',       label: '已完成',  cx: 665, cy: 120, kind: 'terminal-success' },
  { id: 'cancelled',       label: '已取消',  cx: 310, cy: 360, kind: 'terminal-cancel' },
  { id: 'refunded',        label: '已退款',  cx: 560, cy: 360, kind: 'terminal-refund' },
];

const EDGES: EdgeDef[] = [
  {
    from: 'pending-payment',
    to: 'paid',
    label: '完成付款',
    path: 'M 134 210 L 274 210',
    labelX: 204,
    labelY: 202,
  },
  {
    from: 'pending-payment',
    to: 'cancelled',
    label: '逾時/買家取消',
    path: 'M 100 244 C 100 310 220 360 274 360',
    labelX: 150,
    labelY: 318,
  },
  {
    from: 'paid',
    to: 'shipped',
    label: '出貨',
    path: 'M 346 210 L 474 210',
    labelX: 410,
    labelY: 202,
  },
  {
    from: 'paid',
    to: 'refunded',
    label: '買家取消',
    path: 'M 310 246 C 310 310 430 360 524 360',
    labelX: 380,
    labelY: 342,
  },
  {
    from: 'shipped',
    to: 'completed',
    label: '簽收/鑑賞期結束',
    path: 'M 540 193 C 560 150 620 130 629 120',
    labelX: 575,
    labelY: 150,
  },
  {
    from: 'shipped',
    to: 'refunded',
    label: '退貨',
    path: 'M 510 246 L 510 310 C 510 345 530 360 524 360',
    labelX: 530,
    labelY: 308,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function getNodeById(id: string): NodeDef | undefined {
  return NODES.find((n) => n.id === id);
}

function isActive(
  activeNode: string | null,
  nodeId: string,
  edges: EdgeDef[],
): boolean {
  if (activeNode === null) return true;
  if (nodeId === activeNode) return true;
  return edges.some((e) => e.from === activeNode && e.to === nodeId);
}

function isEdgeActive(activeNode: string | null, edge: EdgeDef): boolean {
  if (activeNode === null) return true;
  return edge.from === activeNode;
}

// ── Sub-components ────────────────────────────────────────────────────────────
interface NodeProps {
  node: NodeDef;
  opacity: number;
  isSelected: boolean;
  duration: number;
  onClick: (id: string) => void;
}

function StartNode({ node, opacity, isSelected, duration, onClick }: NodeProps) {
  const strokeColor = isSelected ? C.blue700 : C.blue700;
  return (
    <motion.g
      style={{ cursor: 'pointer' }}
      onClick={() => onClick(node.id)}
      animate={{ opacity }}
      transition={{ duration, ease: 'easeOut' }}
      initial={false}
    >
      <circle
        cx={node.cx}
        cy={node.cy}
        r={34}
        fill={C.blue100}
        stroke={strokeColor}
        strokeWidth={isSelected ? 3 : 2}
      />
      <text
        x={node.cx}
        y={node.cy + 5}
        textAnchor="middle"
        fontSize={14}
        fontWeight={500}
        fill={C.neutral900}
      >
        {node.label}
      </text>
    </motion.g>
  );
}

function MiddleNode({ node, opacity, isSelected, duration, onClick }: NodeProps) {
  const w = 100;
  const h = 44;
  return (
    <motion.g
      style={{ cursor: 'pointer' }}
      onClick={() => onClick(node.id)}
      animate={{ opacity }}
      transition={{ duration, ease: 'easeOut' }}
      initial={false}
    >
      <rect
        x={node.cx - w / 2}
        y={node.cy - h / 2}
        width={w}
        height={h}
        rx={10}
        fill={C.white}
        stroke={isSelected ? C.blue700 : C.blue500}
        strokeWidth={isSelected ? 2.5 : 1.5}
      />
      <text
        x={node.cx}
        y={node.cy + 5}
        textAnchor="middle"
        fontSize={14}
        fontWeight={500}
        fill={C.neutral900}
      >
        {node.label}
      </text>
    </motion.g>
  );
}

interface TerminalNodeProps extends NodeProps {
  outerColor: string;
  fillColor: string;
  checkColor?: string;
}

function TerminalNode({
  node,
  opacity,
  isSelected,
  duration,
  onClick,
  outerColor,
  fillColor,
  checkColor,
}: TerminalNodeProps) {
  return (
    <motion.g
      style={{ cursor: 'pointer' }}
      onClick={() => onClick(node.id)}
      animate={{ opacity }}
      transition={{ duration, ease: 'easeOut' }}
      initial={false}
    >
      <circle
        cx={node.cx}
        cy={node.cy}
        r={34}
        fill={fillColor}
        stroke={outerColor}
        strokeWidth={isSelected ? 3.5 : 3}
      />
      <circle
        cx={node.cx}
        cy={node.cy}
        r={27}
        fill="none"
        stroke={outerColor}
        strokeWidth={1.5}
      />
      {checkColor && (
        <path
          d={`M ${node.cx - 10} ${node.cy + 2} L ${node.cx - 3} ${node.cy + 9} L ${node.cx + 11} ${node.cy - 7}`}
          fill="none"
          stroke={checkColor}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      <text
        x={node.cx}
        y={node.cy + 5}
        textAnchor="middle"
        fontSize={13}
        fontWeight={500}
        fill={C.neutral900}
      >
        {node.label}
      </text>
    </motion.g>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function OrderStateMachine() {
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const duration = shouldReduceMotion ? 0 : 0.18;

  const handleNodeClick = (id: string) => {
    setActiveNode((prev) => (prev === id ? null : id));
  };

  const handleBgClick = () => {
    setActiveNode(null);
  };

  const nodeOpacity = (id: string) =>
    isActive(activeNode, id, EDGES) ? 1 : 0.15;

  const edgeOpacity = (edge: EdgeDef) =>
    isEdgeActive(activeNode, edge) ? 1 : 0.15;

  return (
    <div className="not-prose mx-auto max-w-3xl space-y-3">
      {/* SVG diagram */}
      <svg
        viewBox="0 0 720 420"
        width="100%"
        aria-label="訂單狀態機走查圖"
        role="img"
        style={{ display: 'block' }}
      >
        <defs>
          {/* Default arrow marker */}
          <marker
            id="arrow"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L0,6 L8,3 z" fill={C.neutral400} />
          </marker>
          {/* Active arrow marker */}
          <marker
            id="arrow-active"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L0,6 L8,3 z" fill={C.blue500} />
          </marker>
        </defs>

        {/* Clickable background reset */}
        <rect
          x={0}
          y={0}
          width={720}
          height={420}
          fill="transparent"
          onClick={handleBgClick}
          style={{ cursor: 'default' }}
        />

        {/* Entry arrow */}
        <motion.g
          animate={{ opacity: activeNode === null || activeNode === 'pending-payment' ? 1 : 0.15 }}
          transition={{ duration, ease: 'easeOut' }}
          initial={false}
        >
          <line
            x1={46}
            y1={210}
            x2={64}
            y2={210}
            stroke={C.neutral400}
            strokeWidth={1.5}
            markerEnd="url(#arrow)"
          />
        </motion.g>

        {/* Edges */}
        {EDGES.map((edge) => {
          const active = isEdgeActive(activeNode, edge);
          const op = edgeOpacity(edge);
          return (
            <motion.g
              key={`${edge.from}-${edge.to}`}
              animate={{ opacity: op }}
              transition={{ duration, ease: 'easeOut' }}
              initial={false}
            >
              <path
                d={edge.path}
                fill="none"
                stroke={active ? C.blue500 : C.neutral400}
                strokeWidth={active ? 2 : 1.5}
                markerEnd={active ? 'url(#arrow-active)' : 'url(#arrow)'}
              />
              {/* Label background */}
              <rect
                x={edge.labelX - 36}
                y={edge.labelY - 10}
                width={72}
                height={16}
                rx={3}
                fill={C.white}
                opacity={0.85}
              />
              <text
                x={edge.labelX}
                y={edge.labelY + 2}
                textAnchor="middle"
                fontSize={11}
                fill={C.neutral600}
              >
                {edge.label}
              </text>
            </motion.g>
          );
        })}

        {/* Nodes */}
        {NODES.map((node) => {
          const op = nodeOpacity(node.id);
          const selected = activeNode === node.id;
          const commonProps: NodeProps = {
            node,
            opacity: op,
            isSelected: selected,
            duration,
            onClick: handleNodeClick,
          };

          if (node.kind === 'start') {
            return <StartNode key={node.id} {...commonProps} />;
          }
          if (node.kind === 'middle') {
            return <MiddleNode key={node.id} {...commonProps} />;
          }
          if (node.kind === 'terminal-success') {
            return (
              <TerminalNode
                key={node.id}
                {...commonProps}
                outerColor={C.blue700}
                fillColor={C.blue50}
                checkColor={C.blue700}
              />
            );
          }
          if (node.kind === 'terminal-cancel') {
            return (
              <TerminalNode
                key={node.id}
                {...commonProps}
                outerColor={C.neutral400}
                fillColor={C.neutral100}
              />
            );
          }
          // terminal-refund
          return (
            <TerminalNode
              key={node.id}
              {...commonProps}
              outerColor={C.orange500}
              fillColor={C.orange50}
            />
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        {/* Start */}
        <span className="flex items-center gap-1.5 text-xs" style={{ color: C.neutral600 }}>
          <span
            className="inline-block rounded-full"
            style={{
              width: 14,
              height: 14,
              background: C.blue100,
              border: `2px solid ${C.blue700}`,
            }}
          />
          起始狀態
        </span>
        {/* Terminal success */}
        <span className="flex items-center gap-1.5 text-xs" style={{ color: C.neutral600 }}>
          <span
            className="inline-block rounded-full"
            style={{
              width: 14,
              height: 14,
              background: C.blue50,
              border: `3px double ${C.blue700}`,
            }}
          />
          終態（完成）
        </span>
        {/* Terminal cancel */}
        <span className="flex items-center gap-1.5 text-xs" style={{ color: C.neutral600 }}>
          <span
            className="inline-block rounded-full"
            style={{
              width: 14,
              height: 14,
              background: C.neutral100,
              border: `3px double ${C.neutral400}`,
            }}
          />
          終態（取消）
        </span>
        {/* Terminal refund */}
        <span className="flex items-center gap-1.5 text-xs" style={{ color: C.neutral600 }}>
          <span
            className="inline-block rounded-full"
            style={{
              width: 14,
              height: 14,
              background: C.orange50,
              border: `3px double ${C.orange500}`,
            }}
          />
          終態（退款）
        </span>
      </div>

      {/* Interaction hint */}
      <div
        className="flex items-center justify-center gap-1.5 text-xs"
        style={{ color: C.neutral500 }}
      >
        {activeNode === null ? (
          <>
            <MousePointerClick size={14} />
            <span>點擊狀態節點以探索可達轉移</span>
          </>
        ) : (
          <>
            <RotateCcw size={14} />
            <span>點擊任意空白處重置</span>
          </>
        )}
      </div>
    </div>
  );
}
