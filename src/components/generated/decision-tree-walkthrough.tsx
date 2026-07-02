import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ChevronUp,
  ChevronDown,
  Dog,        // 獵犬 → 主動追查型顧問語意
  Bell,       // 蜜蜂 → 提示/警示嗡嗡聲語意
  Database,   // 大象 → 記憶/資料庫龐大語意
  BookOpen,   // 貓頭鷹 → 知識/閱讀語意
  Flame,
  Scale,
  FileText,
  UserRound,
} from 'lucide-react';

// ─── 資料模型 ────────────────────────────────────────────────
interface LevelData {
  label: string;
  count: number;
  nodes?: string[];
}

const LEVELS: Record<number, LevelData> = {
  1:  { label: 'L1 大類分類',       count: 4,    nodes: ['獵犬', '蜜蜂', '大象', '貓頭鷹'] },
  2:  { label: 'L2 子分類',         count: 12 },
  3:  { label: 'L3 細項',           count: 32 },
  4:  { label: 'L4 必要事實',       count: 80 },
  5:  { label: 'L5 追問問題',       count: 160 },
  6:  { label: 'L6 選項分歧',       count: 320 },
  7:  { label: 'L7 風險分數',       count: 640 },
  8:  { label: 'L8 地雷標記',       count: 960 },
  9:  { label: 'L9 條文對應',       count: 1400 },
  10: { label: 'L10 報告與顧問推薦', count: 2000 },
};

const L1_ICONS: Record<string, React.ReactNode> = {
  '獵犬':  <Dog      size={20} className="text-[--blue-700]" />,
  '蜜蜂':  <Bell     size={20} className="text-[--blue-700]" />,
  '大象':  <Database size={20} className="text-[--blue-700]" />,
  '貓頭鷹': <BookOpen size={20} className="text-[--blue-700]" />,
};

// L2–L3 節點示範文字（各層示意，非完整資料）
const SAMPLE_NODES: Record<number, string[]> = {
  2: ['勞動契約', '工作規則', '薪資結構', '休假管理', '考核制度', '招募流程'],
  3: ['正職員工', '部分工時', '承攬', '實習', '派遣', '兼職契約'],
  4: ['到職日期', '試用期長度', '薪資約定', '職稱定義', '工作地點', '加班條款'],
  5: ['是否簽書面合約？', '有無工作規則？', '薪資計算方式？', '休假如何核定？'],
  6: ['正職 / 部分工時 / 承攬', '月薪 / 時薪 / 論件', '有 / 無書面合約'],
};

const FLAME_COUNTS: Record<number, number> = { 7: 2, 8: 4 };

const ARTICLE_CODES = ['§14', '§38', '§84-1', '§22', '§49', '§59'];

// ─── 對數比例計算（底 count / 2000，log scale） ──────────────
function logWidth(count: number, maxCount: number): number {
  if (count <= 1) return 0;
  const logVal  = Math.log(count);
  const logMax  = Math.log(maxCount);
  return Math.min(1, logVal / logMax);
}

// ─── 計數器：帶動畫的數字 ────────────────────────────────────
function AnimatedCount({ value, reduced }: { value: number; reduced: boolean }) {
  const [displayed, setDisplayed] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const target = value;
    const from   = prevRef.current;
    prevRef.current = target;

    if (reduced || from === target) {
      setDisplayed(target);
      return;
    }

    const steps    = 24;
    const duration = 360;
    const stepMs   = duration / steps;
    let   current  = 0;

    const id = setInterval(() => {
      current++;
      const progress = current / steps;
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(from + (target - from) * eased));
      if (current >= steps) {
        clearInterval(id);
        setDisplayed(target);
      }
    }, stepMs);

    return () => clearInterval(id);
  }, [value, reduced]);

  return (
    <span className="tabular-nums">
      {displayed.toLocaleString()}
      {value >= 2000 ? '+' : ''}
    </span>
  );
}

// ─── L1 節點卡 ───────────────────────────────────────────────
function L1Card({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center gap-2 p-3 rounded-xl border border-[--border-subtle] bg-[--surface-card]">
      <div
        className="rounded-full p-3"
        style={{ backgroundColor: 'var(--surface-brand-soft)' }}
      >
        {L1_ICONS[name]}
      </div>
      <span className="text-sm font-medium text-[--text-strong] text-center leading-tight">
        {name}
      </span>
    </div>
  );
}

// ─── L2–L3 節點卡 ────────────────────────────────────────────
function SimpleCard({ label }: { label: string }) {
  return (
    <div className="rounded-[10px] border border-[--border-subtle] bg-[--surface-card] px-3 py-2 text-sm text-[--text-body]">
      {label}
    </div>
  );
}

// ─── L4–L6 節點卡（含 pill 選項） ────────────────────────────
function OptionCard({ label, options }: { label: string; options: string[] }) {
  return (
    <div className="rounded-[10px] border border-[--border-subtle] bg-[--surface-card] px-3 py-2">
      <p className="text-sm text-[--text-body] mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => (
          <span
            key={opt}
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: 'var(--neutral-100)',
              color: 'var(--neutral-500)',
            }}
          >
            {opt}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── L7–L8 風險卡 ────────────────────────────────────────────
function RiskCard({ label, flameCount }: { label: string; flameCount: number }) {
  return (
    <div
      className="rounded-[10px] border px-3 py-2"
      style={{
        borderColor: 'var(--danger-500)',
        backgroundColor: 'var(--danger-50)',
      }}
    >
      <div className="flex items-center gap-1 mb-1">
        {Array.from({ length: flameCount }).map((_, i) => (
          <Flame key={i} size={14} className="text-[--danger-500]" />
        ))}
      </div>
      <p className="text-sm text-[--text-body]">{label}</p>
    </div>
  );
}

// ─── L9 條文卡 ───────────────────────────────────────────────
function ArticleCard({ code, label }: { code: string; label: string }) {
  return (
    <div
      className="rounded-[10px] border px-3 py-2 flex items-center gap-2"
      style={{
        borderColor: 'var(--blue-200)',
        backgroundColor: 'var(--surface-brand-soft)',
      }}
    >
      <Scale size={14} className="text-[--blue-700] shrink-0" />
      <span className="text-sm font-mono text-[--blue-700]">{code}</span>
      <span className="text-xs text-[--text-muted]">{label}</span>
    </div>
  );
}

// ─── L10 報告卡 ──────────────────────────────────────────────
function ReportCard({ label }: { label: string }) {
  return (
    <div
      className="rounded-[10px] border px-3 py-2 flex items-center gap-2"
      style={{
        borderColor: 'var(--success-500)',
        backgroundColor: 'var(--success-50)',
      }}
    >
      <FileText size={14} style={{ color: 'var(--success-500)' }} className="shrink-0" />
      <UserRound size={14} style={{ color: 'var(--success-500)' }} className="shrink-0" />
      <span className="text-sm text-[--text-body]">{label}</span>
    </div>
  );
}

// ─── 當前層節點區 ────────────────────────────────────────────
function LevelNodes({ level }: { level: number }) {
  if (level === 1) {
    const nodes = LEVELS[1].nodes ?? [];
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {nodes.map((name) => (
          <L1Card key={name} name={name} />
        ))}
      </div>
    );
  }
  if (level === 2 || level === 3) {
    const samples = SAMPLE_NODES[level] ?? [];
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {samples.map((label) => (
          <SimpleCard key={label} label={label} />
        ))}
      </div>
    );
  }
  if (level === 4) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {(SAMPLE_NODES[4] ?? []).map((label) => (
          <OptionCard key={label} label={label} options={['必填', '選填', '依情形']} />
        ))}
      </div>
    );
  }
  if (level === 5) {
    return (
      <div className="flex flex-col gap-2">
        {(SAMPLE_NODES[5] ?? []).map((label) => (
          <OptionCard key={label} label={label} options={['是', '否', '不確定']} />
        ))}
      </div>
    );
  }
  if (level === 6) {
    return (
      <div className="flex flex-col gap-2">
        {(SAMPLE_NODES[6] ?? []).map((label, i) => (
          <OptionCard key={i} label={`分歧點 ${i + 1}`} options={label.split(' / ')} />
        ))}
      </div>
    );
  }
  if (level === 7 || level === 8) {
    const flameCount = FLAME_COUNTS[level] ?? 2;
    const labels = level === 7
      ? ['試用期違規風險', '加班費計算', '未簽書面契約', '不當解雇風險']
      : ['強制條款地雷', '試用期違法', '超時工作隱患', '職災未預防'];
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {labels.map((label) => (
          <RiskCard key={label} label={label} flameCount={flameCount} />
        ))}
      </div>
    );
  }
  if (level === 9) {
    const labels = ['勞動基準法', '性別平等法', '職安衛法', '就業服務法', '勞退條例', '勞保條例'];
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {ARTICLE_CODES.map((code, i) => (
          <ArticleCard key={code} code={code} label={labels[i] ?? ''} />
        ))}
      </div>
    );
  }
  if (level === 10) {
    const items = [
      '綜合風險評估報告',
      '顧問校正建議書',
      '法遵優先順序清單',
      '後續追蹤行動計畫',
    ];
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map((label) => (
          <ReportCard key={label} label={label} />
        ))}
      </div>
    );
  }
  return null;
}

// ─── 主元件 ──────────────────────────────────────────────────
export default function DecisionTreeWalkthrough() {
  const [currentLevel, setCurrentLevel] = useState(1);
  const shouldReduceMotion = useReducedMotion() ?? false;

  const maxCount = LEVELS[10].count;
  const currentCount = LEVELS[currentLevel]?.count ?? 0;
  const barWidth = logWidth(currentCount, maxCount);

  function goUp()   { setCurrentLevel((l) => Math.max(1, l - 1));  }
  function goDown() { setCurrentLevel((l) => Math.min(10, l + 1)); }

  const breadcrumbs = Array.from({ length: currentLevel - 1 }, (_, i) => i + 1);

  const nodeVariants = {
    initial: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 },
    animate: shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 },
    exit:    shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 },
  };

  return (
    <div className="not-prose max-w-3xl mx-auto space-y-4 select-none">

      {/* ── 控制列 ── */}
      <div className="flex flex-col gap-3">
        {/* stepper 按鈕 + 層級標籤 */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={goUp}
            disabled={currentLevel <= 1}
            aria-label="上一層"
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors disabled:opacity-30"
            style={{
              backgroundColor: 'var(--surface-sunken)',
              color: 'var(--text-body)',
            }}
            onMouseEnter={(e) => {
              if (currentLevel > 1) {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--neutral-200)';
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--surface-sunken)';
            }}
          >
            <ChevronUp size={16} />
            上一層
          </button>

          <span className="text-sm font-bold" style={{ color: 'var(--text-strong)' }}>
            {LEVELS[currentLevel]?.label ?? ''}
          </span>

          <button
            onClick={goDown}
            disabled={currentLevel >= 10}
            aria-label="下一層"
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors disabled:opacity-30"
            style={{
              backgroundColor: 'var(--surface-sunken)',
              color: 'var(--text-body)',
            }}
            onMouseEnter={(e) => {
              if (currentLevel < 10) {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--neutral-200)';
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--surface-sunken)';
            }}
          >
            下一層
            <ChevronDown size={16} />
          </button>
        </div>

        {/* Range slider */}
        <div className="px-1">
          <input
            type="range"
            min={1}
            max={10}
            value={currentLevel}
            onChange={(e) => setCurrentLevel(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{ accentColor: 'var(--blue-700)' }}
          />
          <div className="flex justify-between mt-1">
            {Array.from({ length: 10 }, (_, i) => (
              <span
                key={i}
                className="text-[0.6875rem]"
                style={{ color: currentLevel === i + 1 ? 'var(--blue-700)' : 'var(--neutral-400)' }}
              >
                L{i + 1}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── 主體區：節點 + 計數面板 ── */}
      <div className="flex flex-col lg:flex-row gap-4">

        {/* 左側：麵包屑 + 當前節點 */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* 麵包屑列 */}
          <AnimatePresence>
            {breadcrumbs.length > 0 && (
              <motion.div
                key="breadcrumbs"
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="flex flex-wrap gap-1.5"
              >
                {breadcrumbs.map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setCurrentLevel(lvl)}
                    className="text-xs px-2 py-0.5 rounded-full transition-opacity"
                    style={{
                      backgroundColor: 'var(--neutral-100)',
                      color: 'var(--neutral-500)',
                      transform: 'scale(0.85)',
                      opacity: 0.6,
                    }}
                  >
                    {LEVELS[lvl]?.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* 當前層節點 */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`level-${currentLevel}`}
              variants={nodeVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.28, ease: 'easeOut' }}
            >
              <LevelNodes level={currentLevel} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 右側：計數面板 */}
        <div
          className="lg:w-52 shrink-0 rounded-xl border p-4 flex flex-col gap-3"
          style={{
            borderColor: 'var(--border-subtle)',
            backgroundColor: 'var(--surface-card)',
          }}
        >
          <p
            className="text-xs font-medium"
            style={{ color: 'var(--text-muted)' }}
          >
            當前層級判斷點數量
          </p>

          <p
            className="text-2xl font-bold"
            style={{ color: 'var(--blue-700)' }}
          >
            <AnimatedCount value={currentCount} reduced={shouldReduceMotion} />
          </p>

          {/* 長條圖 */}
          <div className="space-y-1">
            <svg
              width="100%"
              height="12"
              viewBox="0 0 100 12"
              preserveAspectRatio="none"
            >
              {/* 背景軌道 */}
              <rect
                x={0} y={2} width={100} height={8}
                rx={4}
                style={{ fill: 'var(--neutral-200)' }}
              />
              {/* 進度條 */}
              <rect
                x={0} y={2}
                width={barWidth * 100}
                height={8}
                rx={4}
                style={{ fill: 'var(--blue-500)', transition: shouldReduceMotion ? 'none' : 'width 0.36s ease-out' }}
              />
            </svg>
            <div className="flex justify-between">
              <span style={{ fontSize: '0.6875rem', color: 'var(--neutral-400)' }}>L1: 4</span>
              <span style={{ fontSize: '0.6875rem', color: 'var(--neutral-400)' }}>L10: 2,000+</span>
            </div>
          </div>

          {/* 各層快速參照 */}
          <div className="space-y-1 pt-1 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            {([1, 3, 6, 10] as const).map((lvl) => (
              <div key={lvl} className="flex justify-between items-center">
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                  L{lvl}
                </span>
                <span
                  className="text-xs font-mono font-medium tabular-nums"
                  style={{ color: currentLevel === lvl ? 'var(--blue-700)' : 'var(--text-muted)' }}
                >
                  {LEVELS[lvl].count.toLocaleString()}
                  {lvl === 10 ? '+' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 底部說明（L8 以後出現） ── */}
      <AnimatePresence>
        {currentLevel >= 8 && (
          <motion.p
            key="warning-text"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="text-xs italic"
            style={{ color: 'var(--text-muted)' }}
          >
            越往下層，項目膨脹速度遠超直覺——這正是顧問校正成本常被低估的根源。
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
