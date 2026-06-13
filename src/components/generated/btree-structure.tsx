import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { clsx } from 'clsx';

// ─── Tree layout constants ────────────────────────────────────────────────────
// viewBox: 780 × 340
// Layer Y centers: root=40, internal=130, leaf=260
// Node dimensions: internal/root w=90 h=36; leaf w=80 h=36

const ROOT_Y = 40;
const INTERNAL_Y = 130;
const LEAF_Y = 240;
const NODE_H = 36;
const NODE_W_WIDE = 90; // root & internal
const NODE_W_LEAF = 84; // leaf

// ─── Node definitions ────────────────────────────────────────────────────────
// Keys chosen so that point-query target=45 hits leaf L2 (keys 40,45,48)
// Range query [25..55] walks L1(20,25,28) → L2(40,45,48) → L3(50,53,55)

interface TreeNode {
  id: string;
  x: number; // cx of node rect
  y: number; // top of node rect
  w: number;
  h: number;
  label: string;
  layer: 0 | 1 | 2;
}

const NODES: TreeNode[] = [
  // root
  { id: 'R', x: 390 - 45, y: ROOT_Y, w: NODE_W_WIDE, h: NODE_H, label: '30 | 70', layer: 0 },
  // internal
  { id: 'I0', x: 120 - 45, y: INTERNAL_Y, w: NODE_W_WIDE, h: NODE_H, label: '15 | 22', layer: 1 },
  { id: 'I1', x: 390 - 45, y: INTERNAL_Y, w: NODE_W_WIDE, h: NODE_H, label: '40 | 53', layer: 1 },
  { id: 'I2', x: 660 - 45, y: INTERNAL_Y, w: NODE_W_WIDE, h: NODE_H, label: '62 | 80', layer: 1 },
  // leaves
  { id: 'L0', x: 40  - 42, y: LEAF_Y, w: NODE_W_LEAF, h: NODE_H, label: '10,12,14', layer: 2 },
  { id: 'L1', x: 135 - 42, y: LEAF_Y, w: NODE_W_LEAF, h: NODE_H, label: '20,25,28', layer: 2 },
  { id: 'L2', x: 230 - 42, y: LEAF_Y, w: NODE_W_LEAF, h: NODE_H, label: '30,33,38', layer: 2 },
  { id: 'L3', x: 325 - 42, y: LEAF_Y, w: NODE_W_LEAF, h: NODE_H, label: '40,45,48', layer: 2 },
  { id: 'L4', x: 420 - 42, y: LEAF_Y, w: NODE_W_LEAF, h: NODE_H, label: '50,53,55', layer: 2 },
  { id: 'L5', x: 515 - 42, y: LEAF_Y, w: NODE_W_LEAF, h: NODE_H, label: '60,62,65', layer: 2 },
  { id: 'L6', x: 610 - 42, y: LEAF_Y, w: NODE_W_LEAF, h: NODE_H, label: '70,75,78', layer: 2 },
  { id: 'L7', x: 705 - 42, y: LEAF_Y, w: NODE_W_LEAF, h: NODE_H, label: '80,85,90', layer: 2 },
];

// ─── Edge definitions (parent-child) ─────────────────────────────────────────
interface Edge {
  id: string;
  from: string;
  to: string;
}

const EDGES: Edge[] = [
  { id: 'R-I0', from: 'R',  to: 'I0' },
  { id: 'R-I1', from: 'R',  to: 'I1' },
  { id: 'R-I2', from: 'R',  to: 'I2' },
  { id: 'I0-L0', from: 'I0', to: 'L0' },
  { id: 'I0-L1', from: 'I0', to: 'L1' },
  { id: 'I0-L2', from: 'I0', to: 'L2' },
  { id: 'I1-L3', from: 'I1', to: 'L3' },
  { id: 'I1-L4', from: 'I1', to: 'L4' },
  { id: 'I1-L5', from: 'I1', to: 'L5' },
  { id: 'I2-L6', from: 'I2', to: 'L6' },
  { id: 'I2-L7', from: 'I2', to: 'L7' },
];

// ─── Leaf linked-list edges ───────────────────────────────────────────────────
const LEAF_IDS = ['L0','L1','L2','L3','L4','L5','L6','L7'];
const LEAF_CHAIN: { id: string; from: string; to: string }[] = LEAF_IDS.slice(0,-1).map((id, i) => ({
  id: `chain-${i}`,
  from: id,
  to: LEAF_IDS[i+1],
}));

// ─── Animation sequences ──────────────────────────────────────────────────────
// point query: search 45 → R → I1 → L3 (leaf with 40,45,48 - contains 45)
const POINT_PATH = ['R', 'I1', 'L3'];

// range query [25..55]: descend to L1, then scan L1→L2→L3→L4
const RANGE_DESCENT = ['R', 'I0', 'L1'];
const RANGE_SCAN = ['L1', 'L2', 'L3', 'L4'];

// ─── Helper ───────────────────────────────────────────────────────────────────
function nodeCx(n: TreeNode) { return n.x + n.w / 2; }
function nodeCy(n: TreeNode) { return n.y + n.h / 2; }
function getNode(id: string): TreeNode {
  const n = NODES.find(nd => nd.id === id);
  if (!n) throw new Error(`Node ${id} not found`);
  return n;
}

// ─── Inline SVG icons (replaces lucide-react) ────────────────────────────────
function CheckIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function RotateCcwIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

function MousePointerIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m4 4 7.07 17 2.51-7.39L21 11.07z" />
    </svg>
  );
}

function ScanLineIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <line x1="7" y1="12" x2="17" y2="12" />
    </svg>
  );
}

// ─── Brand colors (from trendlink-design tokens; #1b4f9c / #2c6ebb / #ed9b26) ─
const COLOR = {
  blue700: '#1b4f9c',
  blue500: '#2c6ebb',
  blue100: '#dbeafe',
  orange400: '#ed9b26',
  orange100: '#fef3c7',
  neutral200: '#e2e8f0',
  neutral400: '#94a3b8',
  neutral600: '#475569',
  neutral800: '#1e293b',
  white: '#ffffff',
  greenSuccess: '#16a34a',
};

// ─── Component ────────────────────────────────────────────────────────────────
type Mode = 'point' | 'range';

export default function BtreeStructure() {
  const prefersReduced = useReducedMotion();
  const [mode, setMode] = useState<Mode>('point');
  const [step, setStep] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(id => clearTimeout(id));
    timersRef.current = [];
  }, []);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const play = useCallback((m: Mode) => {
    clearTimers();
    setStep(-1);
    setIsPlaying(true);

    if (prefersReduced) {
      // jump to final state immediately
      const finalStep = m === 'point' ? POINT_PATH.length - 1
        : RANGE_DESCENT.length - 1 + RANGE_SCAN.length - 1;
      setStep(finalStep);
      setIsPlaying(false);
      return;
    }

    const stagger = m === 'point' ? 500 : 400;
    const totalSteps = m === 'point'
      ? POINT_PATH.length
      : RANGE_DESCENT.length - 1 + RANGE_SCAN.length; // descent shares L1 with scan

    for (let i = 0; i < totalSteps; i++) {
      const t = setTimeout(() => {
        setStep(i);
        if (i === totalSteps - 1) setIsPlaying(false);
      }, stagger + i * stagger);
      timersRef.current.push(t);
    }
  }, [prefersReduced, clearTimers]);

  const handleModeChange = (m: Mode) => {
    setMode(m);
    setStep(-1);
    setIsPlaying(false);
    clearTimers();
  };

  const handleReplay = () => {
    play(mode);
  };

  // ─── Derive highlighted sets from step ──────────────────────────────────────
  const highlightedNodes = new Set<string>();
  const highlightedEdges = new Set<string>();
  const rangeScannedLeaves = new Set<string>();
  const highlightedChains = new Set<string>();
  let showCheck = false;

  if (step >= 0) {
    if (mode === 'point') {
      const path = POINT_PATH.slice(0, step + 1);
      path.forEach(id => highlightedNodes.add(id));
      for (let i = 0; i < path.length - 1; i++) {
        const eid = EDGES.find(e => e.from === path[i] && e.to === path[i+1])?.id;
        if (eid) highlightedEdges.add(eid);
      }
      showCheck = step === POINT_PATH.length - 1;
    } else {
      // descent phase: steps 0,1,2 go through RANGE_DESCENT[0..2]
      // scan phase: step >= 2 scans RANGE_SCAN
      const descentSteps = RANGE_DESCENT.length - 1; // 2 transitions
      if (step < descentSteps) {
        // currently in descent
        const path = RANGE_DESCENT.slice(0, step + 2);
        path.forEach(id => highlightedNodes.add(id));
        for (let i = 0; i < path.length - 1; i++) {
          const eid = EDGES.find(e => e.from === path[i] && e.to === path[i+1])?.id;
          if (eid) highlightedEdges.add(eid);
        }
      } else {
        // full descent always shown in range mode once we reach scan
        RANGE_DESCENT.forEach(id => highlightedNodes.add(id));
        for (let i = 0; i < RANGE_DESCENT.length - 1; i++) {
          const eid = EDGES.find(e => e.from === RANGE_DESCENT[i] && e.to === RANGE_DESCENT[i+1])?.id;
          if (eid) highlightedEdges.add(eid);
        }
        // scan: step - descentSteps gives scan progress
        const scanIdx = step - descentSteps + 1; // number of scan leaves visible
        const scannedLeaves = RANGE_SCAN.slice(0, scanIdx + 1);
        scannedLeaves.forEach(id => rangeScannedLeaves.add(id));
        for (let i = 0; i < scannedLeaves.length - 1; i++) {
          const cid = LEAF_CHAIN.find(c => c.from === scannedLeaves[i] && c.to === scannedLeaves[i+1])?.id;
          if (cid) highlightedChains.add(cid);
        }
      }
    }
  }

  // ─── Edge midpoint helper ────────────────────────────────────────────────────
  function edgeCoords(from: string, to: string) {
    const f = getNode(from);
    const t = getNode(to);
    return {
      x1: nodeCx(f), y1: f.y + f.h,
      x2: nodeCx(t), y2: t.y,
    };
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  const transition = { duration: 0.25, ease: 'easeOut' as const };

  return (
    <figure className="max-w-3xl mx-auto select-none font-sans">
      {/* Controls */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {/* Pill buttons */}
        <button
          onClick={() => handleModeChange('point')}
          className={clsx(
            'flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold border transition-all duration-200',
            mode === 'point'
              ? 'bg-[#1b4f9c] text-white border-[#1b4f9c] shadow-sm'
              : 'bg-white text-[#475569] border-[#e2e8f0] hover:border-[#2c6ebb] hover:text-[#2c6ebb]'
          )}
          aria-pressed={mode === 'point'}
        >
          <MousePointerIcon size={14} />
          點查詢 O(log n)
        </button>
        <button
          onClick={() => handleModeChange('range')}
          className={clsx(
            'flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold border transition-all duration-200',
            mode === 'range'
              ? 'bg-[#ed9b26] text-white border-[#ed9b26] shadow-sm'
              : 'bg-white text-[#475569] border-[#e2e8f0] hover:border-[#ed9b26] hover:text-[#ed9b26]'
          )}
          aria-pressed={mode === 'range'}
        >
          <ScanLineIcon size={14} />
          範圍查詢
        </button>

        {/* Replay button */}
        <button
          onClick={handleReplay}
          disabled={isPlaying}
          className={clsx(
            'ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-200',
            isPlaying
              ? 'text-[#94a3b8] border-[#e2e8f0] cursor-not-allowed'
              : 'text-[#475569] border-[#e2e8f0] hover:border-[#1b4f9c] hover:text-[#1b4f9c] bg-white'
          )}
          aria-label="重播動畫"
        >
          <RotateCcwIcon size={14} />
          重播
        </button>
      </div>

      {/* SVG tree */}
      <svg
        viewBox="0 0 780 340"
        width="100%"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="B+ Tree 結構示意圖"
      >
        {/* ── Tree edges (parent → child) ────────────────────────────────── */}
        {EDGES.map(e => {
          const { x1, y1, x2, y2 } = edgeCoords(e.from, e.to);
          const active = highlightedEdges.has(e.id);
          return (
            <line
              key={e.id}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={active ? COLOR.blue500 : COLOR.neutral200}
              strokeWidth={active ? 2 : 1}
              opacity={active ? 1 : 0.6}
              style={{ transition: 'stroke 0.25s ease-out, stroke-width 0.25s ease-out' }}
            />
          );
        })}

        {/* ── Leaf linked-list chain ─────────────────────────────────────── */}
        {LEAF_CHAIN.map(c => {
          const fromNode = getNode(c.from);
          const toNode   = getNode(c.to);
          const x1 = fromNode.x + fromNode.w;
          const y1 = fromNode.y + fromNode.h / 2;
          const x2 = toNode.x;
          const y2 = toNode.y + toNode.h / 2;
          const active = highlightedChains.has(c.id);
          return (
            <line
              key={c.id}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={active ? COLOR.orange400 : COLOR.neutral400}
              strokeWidth={active ? 2.5 : 1}
              strokeDasharray={active ? undefined : '4 3'}
              opacity={active ? 1 : 0.5}
              style={{ transition: 'stroke 0.25s ease-out, stroke-width 0.25s ease-out' }}
            />
          );
        })}

        {/* ── Nodes ─────────────────────────────────────────────────────── */}
        {NODES.map(n => {
          const isHighlightedBlue = highlightedNodes.has(n.id) && !rangeScannedLeaves.has(n.id);
          const isOrange = rangeScannedLeaves.has(n.id);
          const isHitLeaf = showCheck && n.id === 'L3';

          let fill = COLOR.white;
          let stroke = COLOR.neutral200;
          let strokeWidth = 1;
          let labelColor = COLOR.neutral800;

          if (isHighlightedBlue) {
            fill = COLOR.blue100;
            stroke = COLOR.blue700;
            strokeWidth = 2;
            labelColor = COLOR.blue700;
          }
          if (isOrange) {
            fill = COLOR.orange100;
            stroke = COLOR.orange400;
            strokeWidth = 2;
            labelColor = COLOR.orange400;
          }

          const cx = nodeCx(n);
          const scale = (isHighlightedBlue || isOrange) && !prefersReduced ? 1.04 : 1;

          return (
            <g
              key={n.id}
              style={{
                transform: `translate(${cx}px, ${nodeCy(n)}px) scale(${scale}) translate(${-cx}px, ${-nodeCy(n)}px)`,
                transition: prefersReduced ? undefined : 'transform 0.25s ease-out',
              }}
            >
              <rect
                x={n.x}
                y={n.y}
                width={n.w}
                height={n.h}
                rx={6}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
                style={{ transition: 'fill 0.25s ease-out, stroke 0.25s ease-out' }}
              />
              <text
                x={cx}
                y={n.y + n.h / 2 + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={n.layer === 2 ? 9.5 : 11}
                fontWeight={isHighlightedBlue || isOrange ? 700 : 500}
                fill={labelColor}
                fontFamily="system-ui, sans-serif"
                style={{ transition: 'fill 0.25s ease-out' }}
              >
                {n.label}
              </text>

              {/* layer label above root & internal */}
              {n.id === 'R' && (
                <text
                  x={cx}
                  y={n.y - 8}
                  textAnchor="middle"
                  fontSize={9}
                  fill={COLOR.neutral400}
                  fontFamily="system-ui, sans-serif"
                  letterSpacing="0.04em"
                >
                  ROOT
                </text>
              )}

              {/* check mark on hit leaf */}
              {isHitLeaf && (
                <g transform={`translate(${n.x + n.w - 12}, ${n.y - 10})`}>
                  <circle r={8} cx={0} cy={0} fill={COLOR.greenSuccess} />
                  {/* simple check path */}
                  <polyline
                    points="-4,0 -1.5,3 5,-3"
                    fill="none"
                    stroke={COLOR.white}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              )}
            </g>
          );
        })}

        {/* ── Layer annotations on left ──────────────────────────────────── */}
        <text x={8} y={ROOT_Y + NODE_H / 2 + 1} fontSize={9} fill={COLOR.neutral400} fontFamily="system-ui, sans-serif" dominantBaseline="middle">L0</text>
        <text x={8} y={INTERNAL_Y + NODE_H / 2 + 1} fontSize={9} fill={COLOR.neutral400} fontFamily="system-ui, sans-serif" dominantBaseline="middle">L1</text>
        <text x={8} y={LEAF_Y + NODE_H / 2 + 1} fontSize={9} fill={COLOR.neutral400} fontFamily="system-ui, sans-serif" dominantBaseline="middle">L2</text>

        {/* ── Query label ────────────────────────────────────────────────── */}
        {step >= 0 && (
          <text
            x={390}
            y={310}
            textAnchor="middle"
            fontSize={11}
            fill={mode === 'point' ? COLOR.blue700 : COLOR.orange400}
            fontFamily="system-ui, sans-serif"
            fontWeight={600}
          >
            {mode === 'point'
              ? `搜尋鍵值 45 — 深度 ${Math.min(step + 1, POINT_PATH.length)} / ${POINT_PATH.length} 層`
              : step < RANGE_DESCENT.length - 1
                ? `定位起始葉節點 [25]...`
                : `範圍掃描 [25..55] — 已掃 ${Math.min(step - (RANGE_DESCENT.length - 2), RANGE_SCAN.length)} 個葉節點`
            }
          </text>
        )}
      </svg>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-5 justify-center text-xs text-[#475569]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-0.5 rounded" style={{ background: COLOR.blue700 }} />
          點查詢路徑
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-0.5 rounded" style={{ background: COLOR.orange400 }} />
          範圍掃描
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 border-t border-dashed" style={{ borderColor: COLOR.neutral400 }} />
          鏈結串列
        </span>
      </div>

      {/* Start hint */}
      {step < 0 && (
        <p className="mt-2 text-center text-xs text-[#94a3b8]">
          選擇查詢模式後點「重播」開始動畫
        </p>
      )}
    </figure>
  );
}
