import { useMemo, useState } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'motion/react';
import {
  Hand,
  FileText,
  ArrowRight,
  ShieldCheck,
  Users,
  GitBranch,
  Sparkles,
} from 'lucide-react';

type StageId =
  | 'sa'
  | 'sd'
  | 'ui-ux'
  | 'propose'
  | 'clarify'
  | 'tech-lead'
  | 'apply-change'
  | 'archive';

interface Stage {
  id: StageId;
  num: string;
  name: string;
  role: string;
  short: string;
  trigger: 'manual' | 'auto';
  output: string;
  gate: string;
  consumers: StageId[];
  isNew?: boolean;
}

const stages: Stage[] = [
  {
    id: 'sa',
    num: '1',
    name: 'System Analysis',
    role: 'sa',
    short: 'SA',
    trigger: 'manual',
    output: 'openspec/changes/<name>/system-analysis.md',
    gate: 'PRD / Spec 矛盾與跨功能耦合都已列出；Flow Chart 覆蓋 happy path + 主要例外',
    consumers: ['sd', 'ui-ux'],
  },
  {
    id: 'sd',
    num: '2a',
    name: 'System Design',
    role: 'sd',
    short: 'SD',
    trigger: 'manual',
    output: 'openspec/changes/<name>/system-design.md',
    gate: 'Class Diagram 覆蓋主要分層；Sequence Diagram 覆蓋每個關鍵 Scenario',
    consumers: ['propose', 'tech-lead'],
    isNew: true,
  },
  {
    id: 'ui-ux',
    num: '2b',
    name: 'UI/UX Design',
    role: 'ui-ux',
    short: 'ui-ux',
    trigger: 'manual',
    output: 'openspec/changes/<name>/system-ui-design.md',
    gate: '依 Prototype 逐頁還原；Handlebars 拆分明確；每個視覺屬性皆映射到 Design Token（無寫死色值 / 尺寸）',
    consumers: ['propose', 'tech-lead', 'apply-change'],
    isNew: true,
  },
  {
    id: 'propose',
    num: '3',
    name: 'OpenSpec Propose',
    role: 'openspec-propose',
    short: 'propose',
    trigger: 'manual',
    output: 'openspec/changes/<name>/{proposal, design, tasks}.md',
    gate: '三件套齊備、Spec 只寫 What；design.md / tasks.md 已納入 UI 藍圖與 Prototype 來源指標',
    consumers: ['tech-lead', 'apply-change'],
  },
  {
    id: 'clarify',
    num: '4',
    name: 'Clarify',
    role: 'clarify',
    short: 'clarify',
    trigger: 'manual',
    output: 'Q / P 釐清報告＋三件套回修',
    gate: '所有 Q 有答、P 已補',
    consumers: ['tech-lead'],
  },
  {
    id: 'tech-lead',
    num: '5',
    name: 'Tech Lead',
    role: 'tech-lead',
    short: 'tech-lead',
    trigger: 'manual',
    output: 'tasks.md（+ @assignee + deps + parallel 標記）',
    gate: '章節保留、deps 無環、每 task 有 @assignee、可平行群組已標',
    consumers: ['apply-change'],
  },
  {
    id: 'apply-change',
    num: '6',
    name: 'Apply Change',
    role: 'openspec-apply-change',
    short: 'apply',
    trigger: 'manual',
    output: '程式 + 測試 + tasks.md 全 [x]',
    gate: '每 task 通過 Code Review + QA(DoD)',
    consumers: ['archive'],
  },
  {
    id: 'archive',
    num: '7',
    name: 'Archive',
    role: 'openspec-archive-change',
    short: 'archive',
    trigger: 'manual',
    output: 'change 歸檔',
    gate: '全 task [x]、測試綠、可啟動',
    consumers: [],
  },
];

const stageIndex: Record<StageId, Stage> = stages.reduce(
  (acc, s) => ({ ...acc, [s.id]: s }),
  {} as Record<StageId, Stage>
);

// Layout: single horizontal row, [2a]/[2b] grouped inside a dashed frame.
const VIEW_W = 900;
const VIEW_H = 150;
const ROW_Y = 96;
const NODE_H = 40;

interface SlotBase {
  x: number;
  w: number;
}
interface SingleSlot extends SlotBase {
  kind: 'single';
  stage: StageId;
}
interface GroupSlot extends SlotBase {
  kind: 'group';
  label: string;
  members: { stage: StageId; localX: number; w: number }[];
}
type Slot = SingleSlot | GroupSlot;

// Build layout
const gap = 22;
const nodeW = 74;
const groupInnerPadX = 14;
const groupSubW = 90;
const groupInnerGap = 12;
const groupW = groupInnerPadX * 2 + groupSubW * 2 + groupInnerGap;

const layoutSlots: Slot[] = (() => {
  const slots: Slot[] = [];
  let x = 40;
  const push = (slot: Slot) => {
    slots.push(slot);
    x += slot.w + gap;
  };
  push({ kind: 'single', stage: 'sa', x, w: nodeW });
  push({
    kind: 'group',
    label: '平行，兩者匯流後才進 propose',
    members: [
      { stage: 'sd', localX: groupInnerPadX + groupSubW / 2, w: groupSubW },
      {
        stage: 'ui-ux',
        localX: groupInnerPadX + groupSubW + groupInnerGap + groupSubW / 2,
        w: groupSubW,
      },
    ],
    x,
    w: groupW,
  });
  push({ kind: 'single', stage: 'propose', x, w: nodeW + 20 });
  push({ kind: 'single', stage: 'clarify', x, w: nodeW });
  push({ kind: 'single', stage: 'tech-lead', x, w: nodeW + 12 });
  push({ kind: 'single', stage: 'apply-change', x, w: nodeW });
  push({ kind: 'single', stage: 'archive', x, w: nodeW });
  return slots;
})();

// Precompute per-stage center X (for connector paths + detail lookups)
const nodeCenters: Record<StageId, { cx: number; cy: number; w: number }> = (() => {
  const map: Record<string, { cx: number; cy: number; w: number }> = {};
  layoutSlots.forEach((slot) => {
    if (slot.kind === 'single') {
      map[slot.stage] = { cx: slot.x + slot.w / 2, cy: ROW_Y, w: slot.w };
    } else {
      slot.members.forEach((m) => {
        map[m.stage] = { cx: slot.x + m.localX, cy: ROW_Y, w: m.w };
      });
    }
  });
  return map as Record<StageId, { cx: number; cy: number; w: number }>;
})();

// Slots by stage id → containing slot
const slotByStage: Record<StageId, Slot> = (() => {
  const map: Record<string, Slot> = {};
  layoutSlots.forEach((slot) => {
    if (slot.kind === 'single') map[slot.stage] = slot;
    else slot.members.forEach((m) => (map[m.stage] = slot));
  });
  return map as Record<StageId, Slot>;
})();

export default function SddWorkflowMap() {
  const [active, setActive] = useState<StageId>('sa');
  const shouldReduce = useReducedMotion();
  const activeStage = stageIndex[active];

  const consumerIds = useMemo(() => new Set(activeStage.consumers), [activeStage]);

  const transition = { duration: shouldReduce ? 0 : 0.24, ease: 'easeOut' as const };

  // Slot-level arrows between adjacent layoutSlots
  const arrows = useMemo(() => {
    const out: { fromX: number; toX: number }[] = [];
    for (let i = 0; i < layoutSlots.length - 1; i++) {
      const a = layoutSlots[i];
      const b = layoutSlots[i + 1];
      const fromX = a.x + a.w;
      const toX = b.x;
      out.push({ fromX, toX });
    }
    return out;
  }, []);

  return (
    <div className="not-prose max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GitBranch size={16} className="text-[#1b4f9c]" />
            <span className="text-[11px] font-semibold tracking-widest uppercase text-[#4f5b6e]">
              SDD 巨觀主流程
            </span>
          </div>
          <p className="text-sm text-[#4f5b6e] leading-relaxed">
            點擊任一階段，右側面板顯示<strong className="text-[#1b4f9c]">角色 / 產物 / 過閘條件</strong>，並在流程上亮起<strong className="text-[#ed9b26]">下游必讀者</strong>。
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-[#6c798e]">
          <span className="inline-flex items-center gap-1.5">
            <Hand size={12} className="text-[#ed9b26]" /> 手動觸發
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-4 border-t border-dashed border-[#9aa6b8]" /> 平行分支
          </span>
        </div>
      </div>

      {/* Stepper SVG */}
      <div className="rounded-2xl border border-[#e1e6ee] bg-[#f6f8fb] px-3 py-4 overflow-x-auto">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          width="100%"
          style={{ minWidth: 720, display: 'block' }}
          role="img"
          aria-label="SDD 主流程七階段互動圖"
        >
          {/* Arrows */}
          {arrows.map(({ fromX, toX }, i) => {
            const midY = ROW_Y;
            return (
              <g key={`arrow-${i}`}>
                <line
                  x1={fromX + 2}
                  y1={midY}
                  x2={toX - 6}
                  y2={midY}
                  stroke="#adc8e8"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                />
                <path
                  d={`M ${toX - 6} ${midY} L ${toX - 12} ${midY - 4} L ${toX - 12} ${midY + 4} Z`}
                  fill="#adc8e8"
                />
              </g>
            );
          })}

          {/* Parallel group frame */}
          {layoutSlots.map((slot) => {
            if (slot.kind !== 'group') return null;
            const frameActive =
              active === 'sd' ||
              active === 'ui-ux' ||
              consumerIds.has('sd') ||
              consumerIds.has('ui-ux');
            return (
              <g key="group-frame">
                <motion.rect
                  x={slot.x}
                  y={ROW_Y - NODE_H / 2 - 12}
                  width={slot.w}
                  height={NODE_H + 24}
                  rx={12}
                  ry={12}
                  fill="#ffffff"
                  animate={{
                    stroke: frameActive ? '#ed9b26' : '#adc8e8',
                    strokeWidth: frameActive ? 1.8 : 1.4,
                  }}
                  transition={transition}
                  strokeDasharray="5 4"
                />
                <rect
                  x={slot.x + 12}
                  y={ROW_Y - NODE_H / 2 - 12 - 9}
                  width={slot.w - 24}
                  height={18}
                  rx={9}
                  ry={9}
                  fill="#f6f8fb"
                />
                <text
                  x={slot.x + slot.w / 2}
                  y={ROW_Y - NODE_H / 2 - 12}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={10.5}
                  fontWeight={700}
                  fill={frameActive ? '#c7641a' : '#6c798e'}
                >
                  {slot.label}
                </text>
              </g>
            );
          })}

          {/* Nodes */}
          {stages.map((s) => {
            const c = nodeCenters[s.id];
            const isActive = s.id === active;
            const isDownstream = consumerIds.has(s.id);
            const fill = isActive
              ? '#ed9b26'
              : isDownstream
                ? '#fdf4e6'
                : '#ffffff';
            const stroke = isActive
              ? '#c7641a'
              : isDownstream
                ? '#f2b955'
                : '#cbd3df';
            const textColor = isActive ? '#ffffff' : isDownstream ? '#a04f15' : '#1b4f9c';
            return (
              <g
                key={s.id}
                onClick={() => setActive(s.id)}
                style={{ cursor: 'pointer' }}
              >
                <motion.rect
                  x={c.cx - c.w / 2}
                  y={c.cy - NODE_H / 2}
                  width={c.w}
                  height={NODE_H}
                  rx={9}
                  ry={9}
                  animate={{ fill, stroke, strokeWidth: isActive ? 2 : 1.4 }}
                  transition={transition}
                />
                <text
                  x={c.cx}
                  y={c.cy}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={12}
                  fontWeight={700}
                  fill={textColor}
                >
                  {s.short}
                </text>
                {s.isNew && (
                  <g transform={`translate(${c.cx + c.w / 2 - 12}, ${c.cy - NODE_H / 2 + 3})`}>
                    <circle r={7} fill={isActive ? '#ffffff' : '#2e9e6b'} />
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={8}
                      fontWeight={800}
                      fill={isActive ? '#c7641a' : '#ffffff'}
                    >
                      新
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Stage number pills below each node */}
          {stages.map((s) => {
            const c = nodeCenters[s.id];
            return (
              <text
                key={`num-${s.id}`}
                x={c.cx}
                y={c.cy + NODE_H / 2 + 14}
                textAnchor="middle"
                fontSize={9.5}
                fontWeight={600}
                fill={s.id === active ? '#c7641a' : '#6c798e'}
                letterSpacing={0.3}
              >
                [{s.num}]
              </text>
            );
          })}
        </svg>
      </div>

      {/* Detail panel */}
      <div className="rounded-2xl border border-[#e1e6ee] bg-white overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={shouldReduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={transition}
            className="p-5 space-y-4"
          >
            {/* Title */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="text-[11px] font-semibold tracking-wider uppercase text-[#6c798e] mb-1">
                  階段 [{activeStage.num}]
                </div>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <h3 className="text-lg font-bold text-[#1b4f9c]">
                    {activeStage.name}
                  </h3>
                  <code className="text-xs font-mono text-[#c7641a] bg-[#fdf4e6] rounded-md px-2 py-0.5">
                    {activeStage.role}
                  </code>
                  {activeStage.isNew && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-[#2e9e6b] rounded-full px-2 py-0.5">
                      新增角色
                    </span>
                  )}
                </div>
              </div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#c7641a] bg-[#fdf4e6] border border-[#f6cd86] rounded-full px-2.5 py-1">
                <Hand size={11} /> 手動觸發
              </div>
            </div>

            {/* Grid: 產物 / 過閘 */}
            <div className="grid md:grid-cols-2 gap-3">
              <div className="rounded-xl border border-[#e1e6ee] bg-[#f6f8fb] p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <FileText size={13} className="text-[#2c6ebb]" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#4f5b6e]">
                    產物
                  </span>
                </div>
                <code className="text-xs font-mono text-[#1b4f9c] leading-relaxed break-all">
                  {activeStage.output}
                </code>
              </div>
              <div className="rounded-xl border border-[#e1e6ee] bg-[#f6f8fb] p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <ShieldCheck size={13} className="text-[#2e9e6b]" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#4f5b6e]">
                    過閘條件
                  </span>
                </div>
                <p className="text-xs text-[#3a4456] leading-relaxed">
                  {activeStage.gate}
                </p>
              </div>
            </div>

            {/* Downstream consumers */}
            <div className="rounded-xl border border-dashed border-[#f6cd86] bg-[#fdf4e6] p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Users size={13} className="text-[#c7641a]" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#c7641a]">
                  本階段產物被誰必讀
                </span>
              </div>
              {activeStage.consumers.length === 0 ? (
                <p className="text-xs text-[#a04f15] italic">
                  流程終點：無下游消費者
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {activeStage.consumers.map((cid) => {
                    const c = stageIndex[cid];
                    return (
                      <button
                        key={cid}
                        onClick={() => setActive(cid)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium bg-white text-[#c7641a] border border-[#f2b955] rounded-full pl-2 pr-2.5 py-1 hover:bg-[#fbe7c6] transition-colors"
                      >
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#ed9b26] text-white text-[9px] font-bold">
                          {c.num}
                        </span>
                        {c.short}
                        <ArrowRight size={11} className="opacity-60" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Signature callout when [2a] or [2b] active */}
            {(active === 'sd' || active === 'ui-ux') && (
              <div className="rounded-xl bg-[#eef4fb] border border-[#adc8e8] p-3 flex items-start gap-2">
                <Sparkles size={14} className="text-[#1b4f9c] mt-0.5 flex-shrink-0" />
                <p className="text-xs text-[#1b4f9c] leading-relaxed">
                  <strong>簽名設計：</strong>
                  [2a] sd 與 [2b] ui-ux 為平行分支，需在同一則提示詞內同時派工，讓主 agent 於單一 turn 發起兩個 subagent 呼叫（parallel tool calls）；拆兩則貼會退化成序列。
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
