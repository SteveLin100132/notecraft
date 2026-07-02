import { useCallback, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Play,
  RotateCcw,
  AlertTriangle,
  Check,
  GitCommit,
  ShieldCheck,
  Code2,
  ClipboardCheck,
  Hand,
} from 'lucide-react';

type StepId = 'impl' | 'cr' | 'qa' | 'tick' | 'commit';
type StepState = 'idle' | 'active' | 'success' | 'rejected';

interface Step {
  id: StepId;
  label: string;
  sub: string;
  icon: React.ReactNode;
}

const steps: Step[] = [
  { id: 'impl', label: '實作 agent', sub: 'backend-dev / dba / ui-ux…', icon: <Code2 size={14} /> },
  { id: 'cr', label: '① tech-lead CR', sub: '架構 / SOLID / Design Token', icon: <ShieldCheck size={14} /> },
  { id: 'qa', label: '② qa 驗收', sub: 'Scenario + DoD', icon: <ClipboardCheck size={14} /> },
  { id: 'tick', label: '③ 標 [x]', sub: 'tech-lead 打勾', icon: <Check size={14} /> },
  { id: 'commit', label: '④ commit', sub: '同章節群組', icon: <GitCommit size={14} /> },
];

const VIEW_W = 780;
const VIEW_H = 250;
const LEFT_PAD = 60;
const RIGHT_PAD = 40;
const NODE_W = 118;
const NODE_H = 62;
const MAIN_Y = 150;
const positions: Record<StepId, { cx: number; cy: number }> = steps.reduce(
  (acc, s, i) => {
    const usable = VIEW_W - LEFT_PAD - RIGHT_PAD;
    const cx = LEFT_PAD + (usable * i) / (steps.length - 1);
    acc[s.id] = { cx, cy: MAIN_Y };
    return acc;
  },
  {} as Record<StepId, { cx: number; cy: number }>
);

function forwardPath(from: StepId, to: StepId): string {
  const a = positions[from];
  const b = positions[to];
  const x1 = a.cx + NODE_W / 2;
  const x2 = b.cx - NODE_W / 2;
  return `M ${x1} ${a.cy} L ${x2} ${b.cy}`;
}

function rejectPath(from: StepId, arch: 'up' | 'down'): string {
  const a = positions[from];
  const b = positions['impl'];
  const x1 = a.cx;
  const x2 = b.cx;
  const y = arch === 'up' ? 68 : 232;
  return `M ${x1} ${arch === 'up' ? a.cy - NODE_H / 2 : a.cy + NODE_H / 2}
          C ${x1} ${y}, ${x2} ${y}, ${x2} ${arch === 'up' ? b.cy - NODE_H / 2 : b.cy + NODE_H / 2}`;
}

interface RunEntry {
  kind: 'ok' | 'cr-reject' | 'qa-reject' | 'escalated';
  text: string;
}

export default function SddDeliveryLoop() {
  const shouldReduce = useReducedMotion();
  const [stepStates, setStepStates] = useState<Record<StepId, StepState>>({
    impl: 'idle',
    cr: 'idle',
    qa: 'idle',
    tick: 'idle',
    commit: 'idle',
  });
  const [crCount, setCrCount] = useState(0);
  const [qaCount, setQaCount] = useState(0);
  const [escalated, setEscalated] = useState(false);
  const [rejectFlash, setRejectFlash] = useState<'cr' | 'qa' | null>(null);
  const [log, setLog] = useState<RunEntry[]>([]);
  const [running, setRunning] = useState(false);
  const runIdRef = useRef(0);

  const stepDelay = shouldReduce ? 0 : 420;

  const sleep = useCallback(
    (ms: number) => new Promise<void>((res) => setTimeout(res, ms)),
    []
  );

  const resetStepStates = useCallback(() => {
    setStepStates({
      impl: 'idle',
      cr: 'idle',
      qa: 'idle',
      tick: 'idle',
      commit: 'idle',
    });
  }, []);

  const setStep = useCallback((id: StepId, state: StepState) => {
    setStepStates((prev) => ({ ...prev, [id]: state }));
  }, []);

  const runSuccess = useCallback(async () => {
    if (running || escalated) return;
    const rid = ++runIdRef.current;
    setRunning(true);
    resetStepStates();
    setRejectFlash(null);
    const seq: StepId[] = ['impl', 'cr', 'qa', 'tick', 'commit'];
    for (const id of seq) {
      if (runIdRef.current !== rid) return;
      setStep(id, 'active');
      await sleep(stepDelay);
      if (runIdRef.current !== rid) return;
      setStep(id, 'success');
    }
    setLog((prev) => [
      { kind: 'ok', text: '一路通過：CR 綠、QA 綠、打勾、commit' } as RunEntry,
      ...prev,
    ].slice(0, 5));
    setRunning(false);
  }, [escalated, resetStepStates, running, setStep, sleep, stepDelay]);

  const runCrReject = useCallback(async () => {
    if (running || escalated) return;
    const rid = ++runIdRef.current;
    setRunning(true);
    resetStepStates();
    setRejectFlash(null);
    // Move to impl → cr → reject
    setStep('impl', 'active');
    await sleep(stepDelay);
    if (runIdRef.current !== rid) return;
    setStep('impl', 'success');
    setStep('cr', 'active');
    await sleep(stepDelay);
    if (runIdRef.current !== rid) return;
    setStep('cr', 'rejected');
    setRejectFlash('cr');
    const nextCount = crCount + 1;
    setCrCount(nextCount);
    await sleep(stepDelay);
    if (runIdRef.current !== rid) return;
    if (nextCount >= 3) {
      setEscalated(true);
      setLog((prev) => [
        { kind: 'escalated', text: `CR 退回達 ${nextCount}/2，第 3 次升級回報使用者` } as RunEntry,
        ...prev,
      ].slice(0, 5));
    } else {
      setLog((prev) => [
        { kind: 'cr-reject', text: `Code Review 退回（${nextCount}/2）→ 回實作 agent 修正` } as RunEntry,
        ...prev,
      ].slice(0, 5));
    }
    setRunning(false);
  }, [crCount, escalated, resetStepStates, running, setStep, sleep, stepDelay]);

  const runQaReject = useCallback(async () => {
    if (running || escalated) return;
    const rid = ++runIdRef.current;
    setRunning(true);
    resetStepStates();
    setRejectFlash(null);
    setStep('impl', 'active');
    await sleep(stepDelay);
    if (runIdRef.current !== rid) return;
    setStep('impl', 'success');
    setStep('cr', 'active');
    await sleep(stepDelay);
    if (runIdRef.current !== rid) return;
    setStep('cr', 'success');
    setStep('qa', 'active');
    await sleep(stepDelay);
    if (runIdRef.current !== rid) return;
    setStep('qa', 'rejected');
    setRejectFlash('qa');
    const nextCount = qaCount + 1;
    setQaCount(nextCount);
    setLog((prev) => [
      { kind: 'qa-reject', text: `QA 驗收不通過 → 缺陷報告回實作 agent，重走 ① ②` } as RunEntry,
      ...prev,
    ].slice(0, 5));
    setRunning(false);
  }, [escalated, qaCount, resetStepStates, running, setStep, sleep, stepDelay]);

  const reset = useCallback(() => {
    runIdRef.current++;
    resetStepStates();
    setCrCount(0);
    setQaCount(0);
    setEscalated(false);
    setRejectFlash(null);
    setLog([]);
    setRunning(false);
  }, [resetStepStates]);

  const crBadgeColor = useMemo(() => {
    if (escalated) return { bg: '#fbeaea', border: '#d64545', text: '#a03535' };
    if (crCount >= 2) return { bg: '#fcf3da', border: '#e3a008', text: '#8a5f04' };
    if (crCount === 1) return { bg: '#fdf4e6', border: '#f6cd86', text: '#a04f15' };
    return { bg: '#eef4fb', border: '#adc8e8', text: '#1b4f9c' };
  }, [crCount, escalated]);

  return (
    <div className="not-prose max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <RotateCcw size={16} className="text-[#1b4f9c]" />
          <span className="text-[11px] font-semibold tracking-widest uppercase text-[#4f5b6e]">
            微觀交付迴圈（每 Task 內部）
          </span>
        </div>
        <p className="text-sm text-[#4f5b6e] leading-relaxed">
          按下模擬鈕看退回計數從 <strong className="text-[#1b4f9c]">0/2 → 2/2</strong>，
          第 3 次會觸發<strong className="text-[#d64545]">升級回報使用者</strong>。
        </p>
      </div>

      {/* Control panel */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={runSuccess}
          disabled={running || escalated}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[#1b4f9c] rounded-full px-4 py-2 hover:bg-[#163f7d] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Play size={14} /> 播放：一路通過
        </button>
        <button
          type="button"
          onClick={runCrReject}
          disabled={running || escalated}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#a04f15] bg-white border border-[#f2b955] rounded-full px-4 py-2 hover:bg-[#fdf4e6] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ShieldCheck size={14} /> 模擬：CR 退回
        </button>
        <button
          type="button"
          onClick={runQaReject}
          disabled={running || escalated}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2a76ad] bg-white border border-[#4aa3d6] rounded-full px-4 py-2 hover:bg-[#eef4fb] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ClipboardCheck size={14} /> 模擬：QA 退回
        </button>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1.5 text-sm text-[#4f5b6e] bg-transparent border border-[#cbd3df] rounded-full px-3 py-2 hover:bg-[#f6f8fb] transition-colors ml-auto"
        >
          <RotateCcw size={13} /> 重置
        </button>
      </div>

      {/* Stepper canvas */}
      <div className="rounded-2xl border border-[#e1e6ee] bg-[#f6f8fb] px-3 py-4 overflow-x-auto">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          width="100%"
          style={{ minWidth: 640, display: 'block' }}
          role="img"
          aria-label="微觀交付迴圈狀態機"
        >
          {/* Reject paths (behind nodes) */}
          <path
            d={rejectPath('cr', 'up')}
            fill="none"
            stroke={rejectFlash === 'cr' ? '#e3a008' : '#cbd3df'}
            strokeWidth={rejectFlash === 'cr' ? 2.4 : 1.4}
            strokeDasharray="5 4"
          />
          <path
            d={rejectPath('qa', 'down')}
            fill="none"
            stroke={rejectFlash === 'qa' ? '#2a76ad' : '#cbd3df'}
            strokeWidth={rejectFlash === 'qa' ? 2.4 : 1.4}
            strokeDasharray="5 4"
          />
          <text
            x={(positions['cr'].cx + positions['impl'].cx) / 2}
            y={54}
            textAnchor="middle"
            fontSize={10}
            fontWeight={700}
            fill={rejectFlash === 'cr' ? '#8a5f04' : '#6c798e'}
          >
            退回：計 1 次 · 上限 2 次
          </text>
          <text
            x={(positions['qa'].cx + positions['impl'].cx) / 2}
            y={246}
            textAnchor="middle"
            fontSize={10}
            fontWeight={700}
            fill={rejectFlash === 'qa' ? '#2a76ad' : '#6c798e'}
          >
            退回：重走 ① ②
          </text>

          {/* Forward paths */}
          {[
            ['impl', 'cr'],
            ['cr', 'qa'],
            ['qa', 'tick'],
            ['tick', 'commit'],
          ].map(([from, to]) => {
            const fromState = stepStates[from as StepId];
            const toState = stepStates[to as StepId];
            const active =
              (fromState === 'success' && toState === 'active') ||
              (fromState === 'success' && toState === 'success');
            return (
              <motion.path
                key={`fw-${from}-${to}`}
                d={forwardPath(from as StepId, to as StepId)}
                fill="none"
                stroke={active ? '#1b4f9c' : '#adc8e8'}
                strokeWidth={active ? 2.6 : 1.6}
                strokeLinecap="round"
                animate={{
                  stroke: active ? '#1b4f9c' : '#adc8e8',
                  strokeWidth: active ? 2.6 : 1.6,
                }}
                transition={{ duration: shouldReduce ? 0 : 0.2 }}
              />
            );
          })}

          {/* Nodes */}
          {steps.map((s) => {
            const { cx, cy } = positions[s.id];
            const state = stepStates[s.id];
            const stroke =
              state === 'active'
                ? '#1b4f9c'
                : state === 'success'
                  ? '#2e9e6b'
                  : state === 'rejected'
                    ? s.id === 'cr'
                      ? '#e3a008'
                      : '#2a76ad'
                    : '#cbd3df';
            const bg =
              state === 'active'
                ? '#eef4fb'
                : state === 'success'
                  ? '#e7f6ee'
                  : state === 'rejected'
                    ? s.id === 'cr'
                      ? '#fcf3da'
                      : '#eef4fb'
                    : '#ffffff';
            const textColor =
              state === 'idle' ? '#3a4456' : '#1b4f9c';
            const scale = state === 'active' ? 1.05 : 1;
            return (
              <motion.g
                key={s.id}
                animate={{ scale }}
                style={{ originX: `${cx}px`, originY: `${cy}px` }}
                transition={{ duration: shouldReduce ? 0 : 0.2, ease: 'easeOut' }}
              >
                <rect
                  x={cx - NODE_W / 2}
                  y={cy - NODE_H / 2}
                  width={NODE_W}
                  height={NODE_H}
                  rx={10}
                  ry={10}
                  fill={bg}
                  stroke={stroke}
                  strokeWidth={state === 'idle' ? 1.4 : 2}
                />
                <text
                  x={cx}
                  y={cy - 8}
                  textAnchor="middle"
                  fontSize={11.5}
                  fontWeight={800}
                  fill={textColor}
                >
                  {s.label}
                </text>
                <text
                  x={cx}
                  y={cy + 8}
                  textAnchor="middle"
                  fontSize={9.5}
                  fill="#6c798e"
                >
                  {s.sub}
                </text>
                {state === 'success' && (
                  <g transform={`translate(${cx + NODE_W / 2 - 16}, ${cy - NODE_H / 2 + 4})`}>
                    <circle r={8} fill="#2e9e6b" />
                    <path
                      d="M -3 0 L -0.5 2.5 L 4 -2.5"
                      stroke="#ffffff"
                      strokeWidth={2}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                )}
                {state === 'rejected' && (
                  <g transform={`translate(${cx + NODE_W / 2 - 16}, ${cy - NODE_H / 2 + 4})`}>
                    <circle r={8} fill={s.id === 'cr' ? '#e3a008' : '#2a76ad'} />
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={10}
                      fontWeight={800}
                      fill="#ffffff"
                    >
                      !
                    </text>
                  </g>
                )}
              </motion.g>
            );
          })}
        </svg>
      </div>

      {/* Counters + log */}
      <div className="grid md:grid-cols-3 gap-3">
        {/* CR counter */}
        <div
          className="rounded-xl p-3.5 border"
          style={{ background: crBadgeColor.bg, borderColor: crBadgeColor.border }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <ShieldCheck size={13} style={{ color: crBadgeColor.text }} />
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: crBadgeColor.text }}>
              Code Review 退回
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black tabular-nums" style={{ color: crBadgeColor.text }}>
              {Math.min(crCount, 2)}
            </span>
            <span className="text-sm font-semibold" style={{ color: crBadgeColor.text }}>
              / 2 上限
            </span>
            {escalated && (
              <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-[#a03535]">
                <AlertTriangle size={12} /> 升級
              </span>
            )}
          </div>
          <p className="text-[11px] mt-1" style={{ color: crBadgeColor.text }}>
            {escalated
              ? '第 3 次觸發：主 agent 停下回報使用者'
              : crCount === 0
                ? '尚未退回'
                : crCount === 1
                  ? '已退回 1 次，還可 1 次'
                  : '已達上限，下一次退回將升級'}
          </p>
        </div>

        {/* QA counter */}
        <div className="rounded-xl p-3.5 border border-[#adc8e8] bg-[#eef4fb]">
          <div className="flex items-center gap-1.5 mb-1">
            <ClipboardCheck size={13} className="text-[#2a76ad]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#2a76ad]">
              QA 驗收退回
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black tabular-nums text-[#2a76ad]">
              {qaCount}
            </span>
            <span className="text-sm font-semibold text-[#2a76ad]">次</span>
          </div>
          <p className="text-[11px] text-[#2a76ad] mt-1">
            {qaCount === 0
              ? '尚未觸發缺陷退回'
              : '同缺陷多次退回時回報使用者'}
          </p>
        </div>

        {/* Trigger note */}
        <div className="rounded-xl p-3.5 border border-[#f6cd86] bg-[#fdf4e6]">
          <div className="flex items-center gap-1.5 mb-1">
            <Hand size={13} className="text-[#c7641a]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#c7641a]">
              打勾權責
            </span>
          </div>
          <p className="text-xs text-[#a04f15] leading-relaxed">
            qa 驗收通過 → 回報主 agent → <strong>由 tech-lead</strong> 將 tasks.md 對應 task 標 [x]
          </p>
        </div>
      </div>

      {/* Log */}
      {log.length > 0 && (
        <div className="rounded-xl border border-[#e1e6ee] bg-white p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#6c798e] mb-2">
            最近事件
          </div>
          <ul className="space-y-1">
            {log.map((entry, i) => {
              const color =
                entry.kind === 'ok'
                  ? '#2e9e6b'
                  : entry.kind === 'cr-reject'
                    ? '#a04f15'
                    : entry.kind === 'qa-reject'
                      ? '#2a76ad'
                      : '#a03535';
              return (
                <li key={i} className="flex items-start gap-2 text-xs text-[#3a4456]">
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                    style={{ background: color }}
                  />
                  {entry.text}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
