import React, { useState, useCallback } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Brain,
  Zap,
  Shield,
  ArrowDown,
  Play,
  RotateCcw,
} from 'lucide-react';

// ---------------------------------------------------------------
// bump-prd-architecture — 合併「架構視圖」與「流程視圖」
// Tab1: 三層分工架構（判斷層 / 執行層 / 守門員）
// Tab2: 雙流程帶 SVG，含步進播放動畫
// ---------------------------------------------------------------

type TabId = 'architecture' | 'flows';

// ---- 架構視圖資料 -------------------------------------------

interface LayerDef {
  id: string;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  bgClass: string;
  titleClass: string;
  subtitleClass: string;
  bulletClass: string;
  arrowColor: string;
  arrowLabel: string;
  bullets: string[];
}

const LAYERS: LayerDef[] = [
  {
    id: 'judge',
    label: '判斷層',
    sublabel: 'AI / CLAUDE.md SOP',
    icon: <Brain size={22} className="text-blue-200" />,
    bgClass: 'bg-blue-700 text-white rounded-xl p-5',
    titleClass: 'text-white font-bold text-base',
    subtitleClass: 'text-blue-200 text-xs font-mono mt-0.5',
    bulletClass: 'text-sm text-blue-100',
    arrowColor: '#1b4f9c',
    arrowLabel: '指令 / 參數',
    bullets: [
      '理解「commit / 發版」意圖',
      '跑 git diff 看變更',
      '依 SemVer 判斷 bump major/minor/patch',
      '寫 changelog summary',
    ],
  },
  {
    id: 'execute',
    label: '執行層',
    sublabel: 'Slash command /bump-prd',
    icon: <Zap size={22} className="text-orange-100" />,
    bgClass: 'bg-orange-500 text-white rounded-xl p-5',
    titleClass: 'text-white font-bold text-base',
    subtitleClass: 'text-orange-100 text-xs font-mono mt-0.5',
    bulletClass: 'text-sm text-orange-50',
    arrowColor: '#e37b24',
    arrowLabel: '觸發守門',
    bullets: [
      '接收參數 <new_version> <category> "<summary>"',
      '機械式寫進 PRD 與 changelog',
      '可靠 deterministic 不依賴 AI 判斷力',
    ],
  },
  {
    id: 'guard',
    label: '守門員',
    sublabel: 'Stop hook 哨兵',
    icon: <Shield size={22} className="text-neutral-300" />,
    bgClass: 'bg-neutral-800 text-white rounded-xl p-5',
    titleClass: 'text-white font-bold text-base',
    subtitleClass: 'text-neutral-300 text-xs font-mono mt-0.5',
    bulletClass: 'text-sm text-neutral-300',
    arrowColor: '#262e3d',
    arrowLabel: '',
    bullets: [
      '對話結束時檢查「docs 有變更但 PRD 版號沒動」',
      '用 exit 2 印提醒讓 AI 轉達',
      '不執行 bump 只負責提醒',
    ],
  },
];

// ---- 流程視圖資料 -------------------------------------------

type NodeKind = 'verb' | 'object';

interface FlowNode {
  label: string;
  kind: NodeKind;
  mono?: boolean;
}

interface FlowLane {
  title: string;
  color: string; // hex
  nodes: FlowNode[];
  dashed: boolean;
}

const FLOW_LANES: FlowLane[] = [
  {
    title: '正常流程',
    color: '#1b4f9c',
    dashed: false,
    nodes: [
      { label: '改 docs', kind: 'object' },
      { label: '說「commit」', kind: 'verb' },
      { label: 'AI 判斷', kind: 'verb' },
      { label: '/bump-prd', kind: 'object', mono: true },
      { label: 'commit', kind: 'verb' },
    ],
  },
  {
    title: '哨兵介入',
    color: '#e37b24',
    dashed: true,
    nodes: [
      { label: '改 docs', kind: 'object' },
      { label: '對話結束', kind: 'object' },
      { label: 'Stop hook 檢查', kind: 'verb' },
      { label: '提醒「該發版」', kind: 'verb' },
    ],
  },
];

// SVG layout constants
const SVG_W = 720;
const LANE_H = 100;
const LANE_GAP = 28;
const PAD_TOP = 16;
const PAD_X = 8;
const TITLE_W = 108;
const NODE_W = 110;
const NODE_H = 40;
const NODE_RX = 7;
const TIP = 7;

const SVG_H = PAD_TOP + LANE_H * 2 + LANE_GAP + 16;

interface NodePos {
  left: number;
  center: number;
}

function layoutLane(count: number, availW: number, originX: number): NodePos[] {
  const gap = count > 1 ? (availW - count * NODE_W) / (count - 1) : 0;
  return Array.from({ length: count }, (_, i) => {
    const left = originX + i * (NODE_W + gap);
    return { left, center: left + NODE_W / 2 };
  });
}

// Lighter version of a hex colour (mix with white by 85%)
function lightFill(hex: string): string {
  // Parse hex -> rgb
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const mix = (c: number) => Math.round(c * 0.18 + 255 * 0.82);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}

// ---- Architecture Tab -------------------------------------------

function ArchitectureTab({ reduced }: { reduced: boolean }) {
  return (
    <div className="flex flex-col gap-0">
      {LAYERS.map((layer, index) => (
        <div key={layer.id}>
          <motion.section
            className={layer.bgClass}
            initial={reduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.35,
              ease: 'easeOut',
              delay: reduced ? 0 : index * 0.2,
            }}
          >
            {/* Header */}
            <div className="flex items-start gap-3 mb-3">
              <div className="flex-shrink-0 mt-0.5">{layer.icon}</div>
              <div>
                <div className={layer.titleClass}>{layer.label}</div>
                <div className={layer.subtitleClass}>{layer.sublabel}</div>
              </div>
            </div>

            {/* Bullets */}
            <ul className="flex flex-col gap-1.5 m-0 p-0 list-none">
              {layer.bullets.map((bullet, bi) => (
                <li key={bi} className={`flex items-start gap-2 ${layer.bulletClass}`}>
                  <span className="flex-shrink-0 opacity-60 select-none leading-5">-</span>
                  <span className="leading-5">{bullet}</span>
                </li>
              ))}
            </ul>
          </motion.section>

          {/* Arrow connector */}
          {index < LAYERS.length - 1 && (
            <div className="flex flex-col items-center py-1 gap-0.5">
              <ArrowDown
                size={18}
                style={{ color: layer.arrowColor }}
              />
              {layer.arrowLabel && (
                <span className="text-xs text-neutral-500 leading-none">
                  {layer.arrowLabel}
                </span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ---- Flows Tab --------------------------------------------------

interface FlowsTabProps {
  reduced: boolean;
}

function FlowsTab({ reduced }: FlowsTabProps) {
  // Each lane has its own highlighted step state & running state
  const [highlights, setHighlights] = useState<number[]>([-1, -1]);
  const [running, setRunning] = useState<boolean[]>([false, false]);

  const availW = SVG_W - PAD_X * 2 - TITLE_W - 8;

  const startPlayback = useCallback(
    (laneIdx: number) => {
      const lane = FLOW_LANES[laneIdx];
      const nodeCount = lane.nodes.length;

      if (reduced) {
        // Immediately show final state
        setHighlights((prev) => {
          const next = [...prev];
          next[laneIdx] = nodeCount - 1;
          return next;
        });
        return;
      }

      setRunning((prev) => {
        const next = [...prev];
        next[laneIdx] = true;
        return next;
      });
      setHighlights((prev) => {
        const next = [...prev];
        next[laneIdx] = 0;
        return next;
      });

      let step = 0;
      const tick = () => {
        step += 1;
        if (step < nodeCount) {
          setHighlights((prev) => {
            const next = [...prev];
            next[laneIdx] = step;
            return next;
          });
          setTimeout(tick, 600);
        } else {
          setRunning((prev) => {
            const next = [...prev];
            next[laneIdx] = false;
            return next;
          });
        }
      };
      setTimeout(tick, 600);
    },
    [reduced],
  );

  const resetLane = useCallback((laneIdx: number) => {
    setHighlights((prev) => {
      const next = [...prev];
      next[laneIdx] = -1;
      return next;
    });
    setRunning((prev) => {
      const next = [...prev];
      next[laneIdx] = false;
      return next;
    });
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {FLOW_LANES.map((lane, li) => {
        const pos = layoutLane(lane.nodes.length, availW, PAD_X + TITLE_W);
        const highlight = highlights[li];
        const isRunning = running[li];
        const isDone = highlight === lane.nodes.length - 1 && !isRunning;
        const laneLight = lightFill(lane.color);

        return (
          <div key={li} className="flex flex-col gap-2">
            {/* Lane label + play button */}
            <div className="flex items-center justify-between">
              <span
                className="text-xs font-semibold"
                style={{ color: lane.color }}
              >
                {lane.title}
              </span>
              <button
                type="button"
                onClick={() => (isDone ? resetLane(li) : startPlayback(li))}
                disabled={isRunning}
                className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-opacity disabled:opacity-40"
                style={{
                  background: lane.color,
                  color: '#fff',
                }}
                aria-label={
                  isDone
                    ? `重播 ${lane.title}`
                    : `播放 ${lane.title}`
                }
              >
                {isDone ? (
                  <RotateCcw size={14} />
                ) : (
                  <Play size={14} />
                )}
                <span>{isDone ? '重播' : '播放'}</span>
              </button>
            </div>

            {/* SVG flow */}
            <div className="overflow-x-auto">
              <svg
                viewBox={`0 0 ${SVG_W} ${LANE_H}`}
                width="100%"
                xmlns="http://www.w3.org/2000/svg"
                aria-label={`${lane.title}流程圖`}
                style={{ display: 'block', minWidth: '480px' }}
              >
                <defs>
                  <marker
                    id={`arr-${li}`}
                    markerWidth={TIP}
                    markerHeight={TIP}
                    refX={TIP - 0.5}
                    refY={TIP / 2}
                    orient="auto"
                  >
                    <polygon
                      points={`0,0 ${TIP},${TIP / 2} 0,${TIP}`}
                      fill={lane.color}
                    />
                  </marker>
                  <marker
                    id={`arr-dim-${li}`}
                    markerWidth={TIP}
                    markerHeight={TIP}
                    refX={TIP - 0.5}
                    refY={TIP / 2}
                    orient="auto"
                  >
                    <polygon
                      points={`0,0 ${TIP},${TIP / 2} 0,${TIP}`}
                      fill="#e1e6ee"
                    />
                  </marker>
                </defs>

                {/* Lane title on left */}
                <text
                  x={PAD_X + TITLE_W - 10}
                  y={LANE_H / 2}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={11}
                  fontWeight={700}
                  fill={lane.color}
                >
                  {lane.title}
                </text>

                {lane.nodes.map((node, ni) => {
                  const ncx = pos[ni].center;
                  const nx = pos[ni].left;
                  const ny = LANE_H / 2 - NODE_H / 2;
                  const midY = LANE_H / 2;

                  const isLit = highlight >= ni;
                  const isVerb = node.kind === 'verb';

                  let fillColor: string;
                  let textColor: string;
                  let strokeColor: string;

                  if (isLit) {
                    fillColor = isVerb ? lane.color : laneLight;
                    textColor = isVerb ? '#ffffff' : lane.color;
                    strokeColor = isVerb ? 'none' : lane.color;
                  } else {
                    fillColor = '#e1e6ee';
                    textColor = '#8a94a6';
                    strokeColor = 'none';
                  }

                  const arrowLit = highlight >= ni && ni < lane.nodes.length - 1;

                  return (
                    <g key={ni}>
                      {/* Arrow to next node */}
                      {ni < lane.nodes.length - 1 && (
                        <line
                          x1={pos[ni].left + NODE_W}
                          y1={midY}
                          x2={pos[ni + 1].left - 1}
                          y2={midY}
                          stroke={arrowLit ? lane.color : '#e1e6ee'}
                          strokeWidth={2}
                          strokeDasharray={lane.dashed ? '4 3' : undefined}
                          markerEnd={`url(#${arrowLit ? `arr-${li}` : `arr-dim-${li}`})`}
                        />
                      )}

                      {/* Node rectangle */}
                      <rect
                        x={nx}
                        y={ny}
                        width={NODE_W}
                        height={NODE_H}
                        rx={NODE_RX}
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth={isVerb || !isLit ? 0 : 1.5}
                      />

                      {/* Node label */}
                      <text
                        x={ncx}
                        y={midY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={10.5}
                        fontWeight={isVerb ? 600 : 400}
                        fontFamily={
                          node.mono
                            ? 'ui-monospace, SFMono-Regular, Menlo, monospace'
                            : 'system-ui, sans-serif'
                        }
                        fill={textColor}
                      >
                        {node.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---- Root component -------------------------------------------

export default function BumpPrdArchitectureCombined() {
  const reduced = useReducedMotion() ?? false;
  const [activeTab, setActiveTab] = useState<TabId>('architecture');

  const tabs: { id: TabId; label: string }[] = [
    { id: 'architecture', label: '架構視圖' },
    { id: 'flows', label: '流程視圖' },
  ];

  return (
    <div className="not-prose my-6 flex flex-col gap-4">
      {/* Tab list */}
      <div
        role="tablist"
        aria-label="視圖切換"
        className="flex gap-2 flex-wrap"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={[
                'px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 select-none',
                isActive
                  ? 'bg-blue-700 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200',
              ].join(' ')}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab panels */}
      <div
        id="tabpanel-architecture"
        role="tabpanel"
        aria-labelledby="tab-architecture"
        hidden={activeTab !== 'architecture'}
      >
        <ArchitectureTab reduced={reduced} />
      </div>

      <div
        id="tabpanel-flows"
        role="tabpanel"
        aria-labelledby="tab-flows"
        hidden={activeTab !== 'flows'}
      >
        <FlowsTab reduced={reduced} />
      </div>
    </div>
  );
}
