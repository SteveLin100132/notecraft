import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { AlertTriangle, AlignJustify, LayoutGrid } from 'lucide-react';
import clsx from 'clsx';

// ── 資料模型 ──────────────────────────────────────────────

type SegmentKey = 'queue' | 'exec' | 'review' | 'deploy';

interface Segment {
  key: SegmentKey;
  label: string;
  sub: string;
  problem: string;
}

const SEGMENTS: Segment[] = [
  {
    key: 'queue',
    label: '建立 → 開始',
    sub: '排隊／前置壅塞',
    problem: '任務在待辦排隊太久：資源不足或優先級不清，前置壅塞嚴重。',
  },
  {
    key: 'exec',
    label: '開始 → 完成',
    sub: '執行／估時',
    problem: '執行遠超預計：估時誤差大（常見於金流等高複雜任務），需回頭校正估時。',
  },
  {
    key: 'review',
    label: '完成 → 驗收',
    sub: '驗收負荷',
    problem: '驗收方負荷過重：驗收人沒空、驗收標準不清，最容易被忽略卻最卡關。',
  },
  {
    key: 'deploy',
    label: '驗收 → 上線',
    sub: '上線窗口',
    problem: '卡在上線審核與發布窗口：部署排程或發布窗口受限。',
  },
];

const MILESTONES = ['建立', '開始', '完成', '驗收', '上線'];

interface ScenarioData {
  name: string;
  days: Record<SegmentKey, number>;
  bottleneck: SegmentKey;
  estExec: number;
}

const SCENARIOS: ScenarioData[] = [
  { name: '前置壅塞', days: { queue: 8, exec: 4, review: 1, deploy: 1 }, bottleneck: 'queue', estExec: 4 },
  { name: '估時失準', days: { queue: 1, exec: 12, review: 2, deploy: 1 }, bottleneck: 'exec', estExec: 6 },
  { name: '驗收塞車', days: { queue: 1, exec: 5, review: 9, deploy: 1 }, bottleneck: 'review', estExec: 5 },
  { name: '上線延宕', days: { queue: 1, exec: 4, review: 2, deploy: 7 }, bottleneck: 'deploy', estExec: 4 },
];

// 中性段顏色（非瓶頸）
const SEGMENT_COLORS: Record<SegmentKey, string> = {
  queue: 'bg-blue-100 text-blue-700',
  exec: 'bg-blue-200 text-blue-800',
  review: 'bg-neutral-200 text-neutral-600',
  deploy: 'bg-neutral-300 text-neutral-700',
};

// ── 元件 ─────────────────────────────────────────────────

export default function TimeFieldsBottleneck() {
  const prefersReduced = useReducedMotion();
  const duration = prefersReduced ? 0 : 0.3;

  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [mode, setMode] = useState<'merged' | 'split'>('merged');

  const scenario = SCENARIOS[scenarioIndex];
  const total = (Object.values(scenario.days) as number[]).reduce((a, b) => a + b, 0);
  const bottleneckSeg = SEGMENTS.find((s) => s.key === scenario.bottleneck)!;

  return (
    <div className="not-prose max-w-3xl mx-auto space-y-4">
      {/* 1) 情境切換 */}
      <div className="flex flex-wrap gap-2">
        {SCENARIOS.map((sc, i) => (
          <button
            key={sc.name}
            onClick={() => setScenarioIndex(i)}
            className={clsx(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              i === scenarioIndex
                ? 'bg-blue-600 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200',
            )}
          >
            {sc.name}
          </button>
        ))}
      </div>

      {/* 2) 視角切換 */}
      <div className="inline-flex rounded-md border border-neutral-200 overflow-hidden">
        <button
          onClick={() => setMode('merged')}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors',
            mode === 'merged'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-neutral-600 hover:bg-neutral-50',
          )}
        >
          <AlignJustify size={14} />
          合併視角
        </button>
        <button
          onClick={() => setMode('split')}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors border-l border-neutral-200',
            mode === 'split'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-neutral-600 hover:bg-neutral-50',
          )}
        >
          <LayoutGrid size={14} />
          攤開視角
        </button>
      </div>

      {/* 3) 時間軸主體 */}
      <div className="space-y-2">
        {/* 里程碑標籤 */}
        {mode === 'split' && (
          <div className="flex w-full text-xs text-neutral-500 font-medium">
            {MILESTONES.map((m, i) => {
              // 計算每個里程碑的左偏移百分比
              let offset = 0;
              const keys: SegmentKey[] = ['queue', 'exec', 'review', 'deploy'];
              for (let k = 0; k < i; k++) {
                offset += (scenario.days[keys[k]] / total) * 100;
              }
              const isLast = i === MILESTONES.length - 1;
              return (
                <div
                  key={m}
                  style={
                    isLast
                      ? { marginLeft: 'auto' }
                      : i === 0
                        ? { width: `${(scenario.days[keys[0]] / total) * 100}%` }
                        : { width: `${(scenario.days[keys[i]] / total) * 100}%` }
                  }
                  className={clsx('truncate', isLast ? 'text-right' : i === 0 ? 'text-left' : 'text-left')}
                >
                  {m}
                </div>
              );
            })}
          </div>
        )}

        {/* 主長條 */}
        <div className="w-full h-12 rounded-md overflow-hidden relative">
          <AnimatePresence mode="wait">
            {mode === 'merged' ? (
              <motion.div
                key="merged"
                className="absolute inset-0 bg-neutral-300 flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration }}
              >
                <span className="text-sm font-semibold text-neutral-700">總耗時 {total} 天</span>
              </motion.div>
            ) : (
              <motion.div
                key="split"
                className="absolute inset-0 flex"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration }}
              >
                {SEGMENTS.map((seg, idx) => {
                  const days = scenario.days[seg.key];
                  const pct = (days / total) * 100;
                  const isBottleneck = seg.key === scenario.bottleneck;
                  const isExecOverrun =
                    seg.key === 'exec' && scenario.estExec < days;

                  return (
                    <motion.div
                      key={seg.key}
                      className={clsx(
                        'relative flex items-center justify-center overflow-hidden',
                        idx > 0 && 'border-l-2 border-white',
                        isBottleneck
                          ? 'bg-red-500 text-white'
                          : SEGMENT_COLORS[seg.key],
                      )}
                      style={{ width: `${pct}%` }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration, ease: 'easeOut' }}
                    >
                      {/* 瓶頸徽章 */}
                      {isBottleneck && (
                        <span className="absolute top-0.5 left-0.5 flex items-center gap-0.5 bg-red-700 text-white text-[9px] font-bold px-1 rounded">
                          <AlertTriangle size={8} />
                          瓶頸
                        </span>
                      )}

                      {/* exec 預計基準線 */}
                      {isExecOverrun && (
                        <div
                          className="absolute top-0 bottom-0 border-l-2 border-dashed border-white/70 flex flex-col justify-end pb-0.5"
                          style={{ left: `${(scenario.estExec / days) * 100}%` }}
                        >
                          <span className="text-[9px] text-white/80 pl-0.5 whitespace-nowrap">
                            預計 {scenario.estExec} 天
                          </span>
                        </div>
                      )}

                      {/* 段天數 */}
                      {pct > 10 && (
                        <span className="text-xs font-semibold truncate px-1 mt-2">
                          {days} 天
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 合併視角提示 */}
        {mode === 'merged' && (
          <p className="text-xs text-neutral-500 text-center">
            只記錄上線時間 → 看不出時間花在哪一段
          </p>
        )}
      </div>

      {/* 4) 診斷卡 */}
      <AnimatePresence mode="wait">
        {mode === 'split' ? (
          <motion.div
            key={`diag-${scenarioIndex}`}
            className="bg-red-50 border border-red-200 rounded-md p-3 space-y-1.5"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration }}
          >
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-red-700">
                  {bottleneckSeg.label}
                  <span className="ml-2 text-xs font-normal text-red-500">
                    {bottleneckSeg.sub}
                  </span>
                </p>
                <p className="text-sm text-red-700">{bottleneckSeg.problem}</p>
              </div>
            </div>
            <p className="text-xs text-neutral-600 border-t border-red-100 pt-1.5">
              同樣 {total} 天 —— 合併視角只看到「慢」，攤開成四段，才指得出卡在「{bottleneckSeg.label}」。
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="merged-hint"
            className="bg-neutral-50 border border-neutral-200 rounded-md p-3"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration }}
          >
            <p className="text-sm text-neutral-600 text-center">
              切到「攤開視角」看看瓶頸在哪
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
