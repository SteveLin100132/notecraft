import React, { useState, useEffect, useRef, useId, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  TriangleAlert,
  FileText,
  Calendar,
  File,
  ArrowRight,
} from 'lucide-react';

// ── Data ──────────────────────────────────────────────────────────────────────

type Stage = {
  id: number;
  key: string;
  label: string;
  desc: string;
  optional?: boolean;
};

type Meeting = {
  id: string;
  label: string;
  stageRange: [number, number];
  desc: string;
};

type Deliverable = {
  id: string;
  label: string;
  stage: number;
  desc: string;
};

const STAGES: Stage[] = [
  { id: 0, key: 'blueprint',   label: 'Blueprint',       desc: '確認專案目標、範疇、預期成果，通常會產出 Project Charter 或藍圖文件。' },
  { id: 1, key: 'analysis',    label: 'System Analysis', desc: '訪談需求、釐清業務流程，產出需求規格 (SRS)、業務流程圖等。' },
  { id: 2, key: 'design',      label: 'System Design',   desc: '依需求設計系統架構、資料模型、介面、API 規格等。' },
  { id: 3, key: 'coding',      label: 'Coding',          desc: '依設計文件實作系統。' },
  { id: 4, key: 'sit',         label: 'SIT',             desc: '由 QA 進行模組整合測試，驗證系統各部分能正確協作。' },
  { id: 5, key: 'uat',         label: 'UAT',             desc: '由用戶端依驗收標準實際操作，確認系統符合需求。' },
  { id: 6, key: 'cutover',     label: 'Cutover',         desc: '正式上線前的切換作業，包含資料移轉、停機作業、舊系統下線等。', optional: true },
  { id: 7, key: 'golive',      label: 'Go-Live',         desc: '系統正式上線。' },
  { id: 8, key: 'maintenance', label: 'Maintenance',     desc: '上線後的維護、修補、優化。' },
];

const MEETINGS: Meeting[] = [
  { id: 'kickoff',   label: 'Kickoff Meeting',          stageRange: [0, 0], desc: '讓所有參與者了解目標、範疇、角色責任及初步計劃。' },
  { id: 'milestone', label: 'Milestone Review Meeting', stageRange: [1, 4], desc: '在關鍵節點評估進度與成果，必要時調整計劃與資源。' },
  { id: 'uat',       label: 'UAT Meeting',              stageRange: [5, 5], desc: '讓用戶或利益相關者實際參與驗收，收集回饋。' },
  { id: 'golive',    label: 'Go-Live Meeting',          stageRange: [6, 7], desc: '確認部署計劃、步驟、責任分工與支援資源，確保順利上線。' },
  { id: 'handover',  label: 'Handover Meeting',         stageRange: [8, 8], desc: '專案結束時將成果與文件交接給維運團隊，含專案總結、知識轉移。' },
];

const DELIVERABLES: Deliverable[] = [
  { id: 'prd',      label: 'PRD',              stage: 0, desc: 'Product Requirement Document — Blueprint 階段產出' },
  { id: 'srs',      label: 'SRS',              stage: 1, desc: 'System Requirement Spec — System Analysis 階段產出' },
  { id: 'sdd',      label: 'SDD',              stage: 2, desc: 'System Design Document — System Design 階段產出' },
  { id: 'testplan', label: 'Test Plan / Case', stage: 4, desc: 'SIT 階段產出的測試計畫與測試案例' },
  { id: 'uat',      label: 'UAT Checklist',    stage: 5, desc: 'UAT 階段的驗收清單' },
  { id: 'cutover',  label: 'Cutover Plan',     stage: 6, desc: 'Cutover 階段的切換計劃' },
  { id: 'manual',   label: 'Maintenance Manual', stage: 8, desc: 'Go-Live 後的維運手冊' },
];

const TOTAL = STAGES.length; // 9

// ── Waterfall SVG ─────────────────────────────────────────────────────────────
// Vertical channel SVG: each stage is a rectangle, water "fills" from top
// as user progresses. Arranged in a single column, connected by downward arrows.

const BOX_W  = 150;
const BOX_H  = 32;
const GAP_Y  = 20;  // gap between boxes
const SVG_PW = BOX_W + 24; // padding left+right
const UNIT_H = BOX_H + GAP_Y;
const SVG_H  = UNIT_H * TOTAL + GAP_Y;
const SVG_W  = SVG_PW;
const OX     = (SVG_W - BOX_W) / 2; // box x origin
const OY     = GAP_Y / 2;            // first box y origin

function boxY(i: number): number { return OY + i * UNIT_H; }
function boxCY(i: number): number { return boxY(i) + BOX_H / 2; }

interface WaterfallSVGProps {
  current: number;
  onSelect: (i: number) => void;
  reduced: boolean;
  gradId: string;
}

function WaterfallSVG({ current, onSelect, reduced, gradId }: WaterfallSVGProps) {
  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      width="100%"
      aria-label="瀑布式開發流程圖"
      style={{ fontFamily: 'inherit', display: 'block' }}
    >
      <defs>
        <linearGradient id={`${gradId}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="var(--blue-400, #4a90d9)" stopOpacity="0.85" />
          <stop offset="100%" stopColor="var(--blue-700, #1b4f9c)" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id={`${gradId}-current`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="var(--orange-400, #ed9b26)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--orange-500, #e37b24)" stopOpacity="1"   />
        </linearGradient>
      </defs>

      {/* Connector lines between stages */}
      {STAGES.slice(0, -1).map((s) => {
        const y1 = boxY(s.id) + BOX_H;
        const y2 = boxY(s.id + 1);
        const cx = OX + BOX_W / 2;
        const midY = (y1 + y2) / 2;
        const isPast = s.id < current;
        const isCutoverEdge = s.id === 5 || s.id === 6;
        return (
          <g key={`conn-${s.id}`}>
            <line
              x1={cx} y1={y1}
              x2={cx} y2={y2 - 6}
              stroke={
                isPast
                  ? 'var(--blue-500, #2c6ebb)'
                  : isCutoverEdge
                  ? 'var(--neutral-300, #cbd5e1)'
                  : 'var(--neutral-200, #e2e8f0)'
              }
              strokeWidth={isPast ? 3 : 1.5}
              strokeDasharray={isCutoverEdge ? '4 3' : undefined}
              strokeLinecap="round"
            />
            {/* Arrowhead */}
            <path
              d={`M ${cx - 5} ${y2 - 9} L ${cx} ${y2 - 2} L ${cx + 5} ${y2 - 9}`}
              fill="none"
              stroke={
                isPast
                  ? 'var(--blue-500, #2c6ebb)'
                  : isCutoverEdge
                  ? 'var(--neutral-300, #cbd5e1)'
                  : 'var(--neutral-200, #e2e8f0)'
              }
              strokeWidth={isPast ? 2 : 1.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Gate dot at midpoint */}
            {isPast && (
              <circle
                cx={cx}
                cy={midY}
                r={4}
                fill="var(--orange-400, #ed9b26)"
                opacity={0.85}
              />
            )}
          </g>
        );
      })}

      {/* Stage boxes */}
      {STAGES.map((s) => {
        const isPast    = s.id < current;
        const isCurrent = s.id === current;
        const isFuture  = s.id > current;
        const isCutover = s.optional === true;

        const fill   = isCurrent ? 'var(--orange-50, #fdf4e6)'
                     : isPast    ? 'var(--blue-50, #eef4fb)'
                     : 'var(--neutral-50, #f8fafc)';
        const stroke = isCurrent ? 'var(--orange-500, #e37b24)'
                     : isPast    ? 'var(--blue-500, #2c6ebb)'
                     : isCutover ? 'var(--neutral-300, #cbd5e1)'
                     : 'var(--neutral-200, #e2e8f0)';
        const textColor = isCurrent ? 'var(--orange-600, #c7641a)'
                     : isPast    ? 'var(--blue-700, #1b4f9c)'
                     : isCutover ? 'var(--neutral-400, #94a3b8)'
                     : 'var(--neutral-500, #64748b)';
        const opacity = isFuture ? 0.55 : 1;

        const bx = OX;
        const by = boxY(s.id);

        // Has deliverable
        const hasDel = DELIVERABLES.some((d) => d.stage === s.id);

        return (
          <g
            key={s.id}
            opacity={opacity}
            style={{ cursor: 'pointer' }}
            role="button"
            tabIndex={0}
            aria-label={`前往 ${s.label} 階段`}
            aria-current={isCurrent ? 'step' : undefined}
            onClick={() => onSelect(s.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(s.id); } }}
          >
            <motion.rect
              x={bx} y={by}
              width={BOX_W} height={BOX_H}
              rx={6}
              fill={fill}
              stroke={stroke}
              strokeWidth={isCurrent ? 2 : 1.5}
              strokeDasharray={isCutover ? '5 3' : undefined}
              initial={false}
              animate={
                isCurrent && !reduced
                  ? { strokeWidth: [2, 2.8, 2], opacity: [1, 0.9, 1] }
                  : { strokeWidth: isCurrent ? 2 : 1.5, opacity: 1 }
              }
              transition={{ duration: 0.8, repeat: isCurrent ? Infinity : 0, ease: 'easeInOut' }}
            />
            {/* Stage number */}
            <text
              x={bx + 10}
              y={by + BOX_H / 2 + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={9}
              fontWeight={700}
              fill={isCurrent ? 'var(--orange-300, #f2b955)' : isPast ? 'var(--blue-300, #7ba6da)' : 'var(--neutral-300)'}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {s.id + 1}
            </text>
            {/* Stage label */}
            <text
              x={bx + BOX_W / 2}
              y={by + BOX_H / 2 + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={11}
              fontWeight={600}
              fill={textColor}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {s.label}
            </text>
            {/* Deliverable dot */}
            {hasDel && (
              <circle
                cx={bx + BOX_W - 9}
                cy={by + BOX_H / 2}
                r={3.5}
                fill={isCurrent ? 'var(--orange-400, #ed9b26)' : isPast ? 'var(--blue-400, #4d84cb)' : 'var(--blue-200, #bfdbfe)'}
              />
            )}
            {/* Optional label */}
            {isCutover && (
              <text
                x={bx + BOX_W + 6}
                y={by + BOX_H / 2 + 1}
                textAnchor="start"
                dominantBaseline="middle"
                fontSize={8}
                fill="var(--neutral-400)"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                視情況
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Deliverable Chain ──────────────────────────────────────────────────────────

interface DeliverableChainProps {
  current: number;
  reduced: boolean;
}

function DeliverableChain({ current, reduced }: DeliverableChainProps) {
  const reached = DELIVERABLES.filter((d) => d.stage <= current);

  if (reached.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-neutral-400 py-2">
        <File size={13} className="shrink-0" />
        <span>通過各階段後，交付物將在此串連</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1" aria-label="交付物接力鏈">
      {DELIVERABLES.map((d, idx) => {
        const isReached = d.stage <= current;
        const isNew     = d.stage === current;
        const prevReached = idx > 0 ? DELIVERABLES[idx - 1].stage <= current : false;

        return (
          <React.Fragment key={d.id}>
            {/* Connector arrow */}
            {idx > 0 && (isReached || prevReached) && (
              <span className="text-neutral-300 select-none" aria-hidden="true">
                <ArrowRight size={10} />
              </span>
            )}
            {isReached && (
              <motion.span
                initial={reduced || !isNew ? false : { opacity: 0, y: -8, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: reduced ? 0 : 0.3, ease: 'easeOut' }}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                style={{
                  background: 'var(--blue-700, #1b4f9c)',
                  color: '#ffffff',
                }}
                title={d.desc}
              >
                <File size={10} />
                {d.label}
              </motion.span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── HUD Panel ─────────────────────────────────────────────────────────────────

interface HudPanelProps {
  current: number;
  reduced: boolean;
}

function HudPanel({ current, reduced }: HudPanelProps) {
  const stage = STAGES[current];
  if (!stage) return null;

  const activeMeetings = MEETINGS.filter(
    (m) => current >= m.stageRange[0] && current <= m.stageRange[1]
  );
  const stageDeliverable = DELIVERABLES.find((d) => d.stage === current);

  const enter = reduced ? {} : { opacity: 0, x: 10 };
  const animate = { opacity: 1, x: 0 };
  const transition = { duration: reduced ? 0 : 0.28, ease: 'easeOut' as const };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`hud-${current}`}
        initial={enter}
        animate={animate}
        exit={{ opacity: 0 }}
        transition={transition}
        className="flex flex-col gap-3"
        aria-live="polite"
      >
        {/* Stage block */}
        <div
          className="rounded-lg p-3"
          style={{
            background: 'var(--blue-50, #eff6ff)',
            border: '1px solid var(--blue-200, #bfdbfe)',
          }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <FileText size={13} style={{ color: 'var(--blue-700, #1b4f9c)' }} className="shrink-0" />
            <span className="text-xs font-bold" style={{ color: 'var(--blue-900, #1e3a5f)' }}>
              {stage.id + 1} / {TOTAL} — {stage.label}
            </span>
            {stage.optional && (
              <span
                className="ml-auto rounded-full px-1.5 py-0.5 text-xs"
                style={{ background: 'var(--neutral-100)', color: 'var(--neutral-500)' }}
              >
                視情況
              </span>
            )}
          </div>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--neutral-700, #374151)' }}>
            {stage.desc}
          </p>
        </div>

        {/* Meetings block */}
        <div
          className="rounded-lg p-3"
          style={{
            background: 'var(--orange-50, #fffbeb)',
            border: '1px solid var(--orange-200, #fde68a)',
          }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <Calendar size={12} style={{ color: 'var(--orange-500, #e37b24)' }} className="shrink-0" />
            <span className="text-xs font-bold" style={{ color: 'var(--orange-900, #7c2d12)' }}>
              此階段的會議
            </span>
          </div>
          {activeMeetings.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--neutral-400)' }}>此階段無排程會議</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {activeMeetings.map((m) => (
                <div key={m.id} className="flex flex-col gap-0.5">
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold w-fit"
                    style={{
                      background: 'var(--orange-400, #ed9b26)',
                      color: '#ffffff',
                    }}
                  >
                    {m.label}
                  </span>
                  <p className="text-xs pl-1" style={{ color: 'var(--neutral-600, #4b5563)' }}>
                    {m.desc}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Deliverable block */}
        <div
          className="rounded-lg p-3"
          style={{
            background: stageDeliverable ? 'var(--blue-50, #eff6ff)' : 'var(--neutral-50, #f8fafc)',
            border: `1px solid ${stageDeliverable ? 'var(--blue-200, #bfdbfe)' : 'var(--neutral-200, #e2e8f0)'}`,
          }}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <File size={12} style={{ color: stageDeliverable ? 'var(--blue-700, #1b4f9c)' : 'var(--neutral-400)' }} className="shrink-0" />
            <span
              className="text-xs font-bold"
              style={{ color: stageDeliverable ? 'var(--blue-900, #1e3a5f)' : 'var(--neutral-500)' }}
            >
              本階段交付物
            </span>
          </div>
          {stageDeliverable ? (
            <div className="flex flex-col gap-0.5">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold w-fit"
                style={{ background: 'var(--blue-700, #1b4f9c)', color: '#ffffff' }}
              >
                <File size={9} />
                {stageDeliverable.label}
              </span>
              <p className="text-xs pl-1 mt-0.5" style={{ color: 'var(--neutral-600)' }}>
                {stageDeliverable.desc}
              </p>
            </div>
          ) : (
            <p className="text-xs" style={{ color: 'var(--neutral-400)' }}>此階段無指定交付物</p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function WaterfallLifecycle() {
  const reduced = useReducedMotion() ?? false;
  const uid = useId().replace(/:/g, '');
  const gradId = `wfl-${uid}`;

  const [current,    setCurrent]    = useState(0);
  const [isPlaying,  setIsPlaying]  = useState(false);
  const [showHint,   setShowHint]   = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hintRef     = useRef<ReturnType<typeof setTimeout>  | null>(null);

  const clearAutoPlay = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const clearHint = useCallback(() => {
    if (hintRef.current !== null) {
      clearTimeout(hintRef.current);
      hintRef.current = null;
    }
  }, []);

  // Auto-play
  useEffect(() => {
    if (!isPlaying) {
      clearAutoPlay();
      return;
    }
    if (current >= TOTAL - 1) {
      setIsPlaying(false);
      return;
    }
    intervalRef.current = setInterval(() => {
      setCurrent((c) => {
        const next = c + 1;
        if (next >= TOTAL - 1) {
          setIsPlaying(false);
          clearAutoPlay();
        }
        return next;
      });
    }, 1800);
    return clearAutoPlay;
  }, [isPlaying, current, clearAutoPlay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAutoPlay();
      clearHint();
    };
  }, [clearAutoPlay, clearHint]);

  function goTo(i: number) {
    if (i < 0 || i >= TOTAL) return;
    // Show backward hint when going back
    if (i < current) {
      clearHint();
      setShowHint(true);
      hintRef.current = setTimeout(() => setShowHint(false), 2400);
    }
    setCurrent(i);
    setIsPlaying(false);
  }

  function goNext() {
    if (current < TOTAL - 1) {
      setCurrent((c) => c + 1);
      setIsPlaying(false);
    }
  }

  function goPrev() {
    if (current > 0) {
      goTo(current - 1);
    }
  }

  function togglePlay() {
    if (current >= TOTAL - 1) {
      setCurrent(0);
      setIsPlaying(true);
    } else {
      setIsPlaying((p) => !p);
    }
  }

  // Progress %
  const progress = (current / (TOTAL - 1)) * 100;

  return (
    <figure className="not-prose w-full max-w-3xl mx-auto">

      {/* ── HUD Control Bar ─────────────────────────────────────────────── */}
      <div
        className="flex flex-wrap items-center gap-2 rounded-lg px-3 py-2.5 mb-3"
        style={{
          background: 'var(--neutral-50, #f8fafc)',
          border: '1px solid var(--neutral-200, #e2e8f0)',
        }}
      >
        {/* Prev */}
        <button
          onClick={goPrev}
          disabled={current === 0}
          className="rounded p-1.5 transition-colors disabled:opacity-30"
          style={{
            background: current === 0 ? 'transparent' : 'var(--neutral-100)',
            color: 'var(--neutral-600)',
          }}
          aria-label="上一階段"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Play / Pause */}
        <button
          onClick={togglePlay}
          className="rounded-full px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          style={{
            background: isPlaying ? 'var(--neutral-200)' : 'var(--orange-400, #ed9b26)',
            color: isPlaying ? 'var(--neutral-700)' : '#ffffff',
          }}
          aria-label={isPlaying ? '暫停自動播放' : '自動播放'}
        >
          {isPlaying ? <Pause size={13} /> : <Play size={13} />}
          {isPlaying ? '暫停' : '自動播放'}
        </button>

        {/* Next / Gate */}
        <button
          onClick={goNext}
          disabled={current === TOTAL - 1}
          className="rounded-full px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-30"
          style={{
            background: current < TOTAL - 1 ? 'var(--blue-700, #1b4f9c)' : 'var(--neutral-200)',
            color: current < TOTAL - 1 ? '#ffffff' : 'var(--neutral-400)',
          }}
          aria-label="通過閘門，前往下一階段"
        >
          通過閘門
          <ChevronRight size={13} />
        </button>

        {/* Step indicator */}
        <span
          className="ml-auto text-xs font-medium tabular-nums"
          style={{ color: 'var(--neutral-500)' }}
          aria-live="polite"
          aria-atomic="true"
        >
          第 {current + 1} / {TOTAL} 階段
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="h-1.5 rounded-full mb-3 overflow-hidden"
        style={{ background: 'var(--neutral-100, #f1f5f9)' }}
        role="progressbar"
        aria-valuenow={current + 1}
        aria-valuemin={1}
        aria-valuemax={TOTAL}
        aria-label="流程進度"
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, var(--blue-500, #2c6ebb), var(--orange-400, #ed9b26))' }}
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: reduced ? 0 : 0.35, ease: 'easeOut' }}
        />
      </div>

      {/* ── Backward hint ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showHint && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.22, ease: 'easeOut' }}
            className="flex items-center gap-2 rounded-lg px-3 py-2 mb-3 text-xs"
            style={{
              background: 'var(--warning-50, #fffbeb)',
              border: '1px solid var(--warning-200, #fde68a)',
              color: 'var(--warning-700, #92400e)',
            }}
            role="alert"
          >
            <TriangleAlert size={13} className="shrink-0" style={{ color: 'var(--warning-500, #f59e0b)' }} />
            <span>回頭重做在瀑布模型中成本很高，每一閘門的決策都是不可逆的。</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Body: SVG + HUD Panel ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">

        {/* Waterfall SVG column */}
        <div style={{ flex: '0 0 auto', width: '100%', maxWidth: 200 }}>
          <WaterfallSVG
            current={current}
            onSelect={goTo}
            reduced={reduced}
            gradId={gradId}
          />
        </div>

        {/* HUD info panel */}
        <div style={{ flex: '1 1 240px', minWidth: 0 }}>
          <HudPanel current={current} reduced={reduced} />
        </div>
      </div>

      {/* ── Deliverable Chain ──────────────────────────────────────────────── */}
      <div
        className="mt-4 rounded-lg px-3 py-2.5"
        style={{
          background: 'var(--neutral-50)',
          border: '1px solid var(--neutral-200)',
        }}
      >
        <div className="flex items-center gap-1.5 mb-2">
          <ArrowRight size={12} style={{ color: 'var(--blue-500)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--neutral-600)' }}>
            交付物接力鏈
          </span>
        </div>
        <DeliverableChain current={current} reduced={reduced} />
      </div>

    </figure>
  );
}
