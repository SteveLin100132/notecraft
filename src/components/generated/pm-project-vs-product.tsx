import React, { useState, useEffect, useRef } from 'react';
import {
  motion,
  AnimatePresence,
  useReducedMotion,
} from 'motion/react';
import {
  Play,
  Pause,
  RotateCcw,
  Lock,
  Inbox,
  Zap,
  TriangleAlert,
} from 'lucide-react';

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------
type TabIndex = 0 | 1 | 2;

interface Axis {
  key: string;
  label: string;
  angle: number; // 度，0 = 右、-90 = 上
  consequence: string; // 當此軸被推到偏高時的白話後果
}

// -----------------------------------------------------------------------
// Static data
// -----------------------------------------------------------------------
const TABS: { label: string; short: string }[] = [
  { label: '生命週期', short: '生命週期' },
  { label: '需求變動', short: '需求變動' },
  { label: '衡量標準', short: '衡量標準' },
];

const CR_PROJECT_STEPS = [
  { label: '評估影響範疇' },
  { label: 'CR 提案文件' },
  { label: '多層簽核審批' },
  { label: '批准後執行變更' },
];

const CR_PRODUCT_STEPS = [
  { label: '加入 Backlog' },
  { label: '排序優先級' },
  { label: '下個 Sprint 執行' },
];

// 衡量指標：可拖曳的「最佳化總量守恆」模型。
// 每一軸代表「這項有多被最佳化」，總和固定 —— 拉高一項，其餘被迫下降，
// 親手體驗「動一個就牽動其他、不可能同時最佳化」的取捨本質。
const PROJECT_AXES: Axis[] = [
  {
    key: 'scope',
    label: '範疇',
    angle: -90,
    consequence: '想完整交付所有功能（範疇↑）→ 時程被迫拉長、成本升高，或犧牲品質。',
  },
  {
    key: 'time',
    label: '時程',
    angle: 30,
    consequence: '想準時又快速交付（時程↑）→ 只能加人加錢，或縮減範疇。',
  },
  {
    key: 'cost',
    label: '成本',
    angle: 150,
    consequence: '想壓低成本（成本↑）→ 範疇得縮水，或時程被迫延長。',
  },
];

const PRODUCT_AXES: Axis[] = [
  {
    key: 'user',
    label: '用戶價值',
    angle: -90,
    consequence: '想極大化用戶體驗（用戶價值↑）→ 短期商業變現與營收常被犧牲。',
  },
  {
    key: 'biz',
    label: '商業價值',
    angle: 0,
    consequence: '為衝營收強推付費牆／廣告（商業價值↑）→ 用戶價值、留存、黏著一起下滑。',
  },
  {
    key: 'retain',
    label: '留存率',
    angle: 90,
    consequence: '把資源全押在留存（留存率↑）→ 商業變現與新體驗的投入受到擠壓。',
  },
  {
    key: 'sticky',
    label: '黏著度',
    angle: 180,
    consequence: '一味追求高黏著／成癮機制（黏著度↑）→ 可能傷害用戶價值與長期信任。',
  },
];

const METRIC_FLOOR = 10; // 單一指標下限，避免形狀塌陷
const METRIC_CEIL = 100; // 單一指標上限

// Lifecycle simulation tuning + geometry
const PROJECT_SECS = 5.2; // 專案約 5.2 秒抵達結案
const PROD_DEG = 72; // 產品角速度 度/秒 → 約 5 秒一圈

const MILESTONES: { p: number; l: string; key?: boolean }[] = [
  { p: 0, l: '啟動' },
  { p: 0.36, l: '執行' },
  { p: 0.72, l: '交付物', key: true },
  { p: 1, l: '結案' },
];

const PHASES: { a: number; l: string }[] = [
  { a: -90, l: '探索' },
  { a: 0, l: '打造' },
  { a: 90, l: '發布' },
  { a: 180, l: '學習' },
];

// -----------------------------------------------------------------------
// Shared presentational helpers
// -----------------------------------------------------------------------

function Meter({
  pct,
  fill,
  track,
  live,
}: {
  pct: number;
  fill: string;
  track?: string;
  live: boolean;
}): React.ReactElement {
  return (
    <div
      style={{
        height: 8,
        borderRadius: 'var(--radius-pill)',
        background: track ?? 'var(--neutral-100)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${Math.max(0, Math.min(100, pct))}%`,
          background: fill,
          borderRadius: 'var(--radius-pill)',
          // 播放中關閉 transition，避免與 rAF 疊加產生拖影
          transition: live ? 'none' : 'width 280ms ease',
        }}
      />
    </div>
  );
}

function ColHead({
  en,
  zh,
  sub,
  tone,
}: {
  en: string;
  zh: string;
  sub: string;
  tone: string;
}): React.ReactElement {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '.14em',
          color: tone,
          textTransform: 'uppercase',
          marginBottom: 3,
        }}
      >
        {en}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 19, fontWeight: 900, color: 'var(--neutral-700)' }}>{zh}</span>
        <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{sub}</span>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------
// Sub-panels
// -----------------------------------------------------------------------

// --- Tab 1: Lifecycle (single-clock synchronized simulation) ---
// 一個 requestAnimationFrame 時鐘同時推進左右兩欄：
// 左「專案」沿單一路徑前進、抵達交付物後結案停止；
// 右「產品」繞迭代圓環永不停止、持續累積價值。

function LifecyclePanel() {
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false); // 是否曾按下播放（決定產品階段是否高亮）
  const [proj, setProj] = useState(0); // 0 → 1，鎖在 1
  const [ang, setAng] = useState(-90); // 產品 token 角度（度），起點在圓頂（探索）
  const lastRef = useRef(0);

  // 單一時鐘驅動兩欄
  useEffect(() => {
    if (!playing) return;
    lastRef.current = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      // 夾住 dt，避免分頁切回時一次大跳
      const dt = Math.min(0.05, (now - lastRef.current) / 1000);
      lastRef.current = now;
      setProj((p) => Math.min(1, p + dt / PROJECT_SECS));
      setAng((a) => a + dt * PROD_DEG);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const toggle = () => {
    setStarted(true);
    setPlaying((p) => !p);
  };
  const reset = () => {
    setPlaying(false);
    setStarted(false);
    setProj(0);
    setAng(-90);
  };

  const projPct = Math.round(proj * 100);
  const projDone = proj >= 1;
  const spun = ang + 90; // 自起點累計角度
  const laps = Math.floor(spun / 360); // 完成迭代圈數
  const value = Math.round(spun / 3.6); // 360° == +100 累積價值
  const phaseIdx = ((Math.floor((spun % 360) / 90)) % 4 + 4) % 4;

  // 圓環幾何
  const cx = 122;
  const cy = 100;
  const R = 64;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const tokX = cx + R * Math.cos(toRad(ang));
  const tokY = cy + R * Math.sin(toRad(ang));

  let insight: string;
  if (!started && proj === 0) {
    insight = '按下「開始模擬」，看同一個時鐘下，專案與產品如何走向完全不同的終局。';
  } else if (!projDone) {
    insight =
      '專案沿單一路徑前進，逐步逼近交付物；產品繞著「探索 → 打造 → 發布 → 學習」循環，邊跑邊累積價值。';
  } else {
    insight = `專案已結案、生命週期結束；產品仍在第 ${laps} 圈持續迭代，價值不斷累積 —— 這正是兩者最根本的差異。`;
  }

  return (
    <div className="flex flex-col">
      {/* Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          marginBottom: 22,
        }}
      >
        <button
          onClick={toggle}
          aria-label={playing ? '暫停模擬' : started ? '繼續模擬' : '開始模擬'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            height: 40,
            padding: '0 20px',
            borderRadius: 'var(--radius-pill)',
            border: 'none',
            background: 'var(--orange-400)',
            color: 'var(--text-on-brand)',
            fontWeight: 800,
            fontSize: 14,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            boxShadow: 'var(--shadow-accent)',
          }}
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}
          {playing ? '暫停' : started ? '繼續' : '開始模擬'}
        </button>
        <button
          onClick={reset}
          aria-label="重置模擬"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            height: 40,
            padding: '0 16px',
            borderRadius: 'var(--radius-pill)',
            border: '1.5px solid var(--neutral-300)',
            background: 'var(--surface-card)',
            color: 'var(--neutral-700)',
            fontWeight: 700,
            fontSize: 13.5,
            cursor: 'pointer',
          }}
        >
          <RotateCcw size={14} />
          重置
        </button>
      </div>

      {/* Two columns */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(252px, 1fr))',
          gap: 0,
          alignItems: 'start',
        }}
      >
        {/* LEFT — project linear track */}
        <div style={{ padding: '0 24px 0 0', borderRight: '2px dashed var(--neutral-200)' }}>
          <div className="flex flex-col" style={{ gap: 16 }}>
            <ColHead en="PROJECT" zh="專案" sub="單一路徑 · 有終點" tone="var(--blue-700)" />

            <div style={{ height: 156, display: 'flex', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '100%', height: 64, padding: '0 4px' }}>
                {/* track base */}
                <div
                  style={{
                    position: 'absolute',
                    left: 4,
                    right: 4,
                    top: 26,
                    height: 4,
                    borderRadius: 'var(--radius-pill)',
                    background: 'var(--neutral-200)',
                  }}
                />
                {/* progress fill */}
                <div
                  style={{
                    position: 'absolute',
                    left: 4,
                    top: 26,
                    height: 4,
                    borderRadius: 'var(--radius-pill)',
                    background: 'var(--blue-500)',
                    width: `calc(${proj} * (100% - 8px))`,
                    transition: playing ? 'none' : 'width 200ms',
                  }}
                />
                {/* milestones */}
                {MILESTONES.map((m, i) => {
                  const reached = proj >= m.p - 0.001;
                  const isEnd = m.p === 1;
                  const labelColor = m.key ? 'var(--orange-500)' : 'var(--blue-700)';
                  const dotColor = m.key ? 'var(--orange-500)' : 'var(--blue-700)';
                  // 用偶數尺寸，圓心對齊軌道中心線（y = 28）時 margin 落在整數像素 → 邊框不會半像素糊掉
                  const size = m.key ? 22 : 18;
                  return (
                    <div
                      key={i}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: `calc(4px + ${m.p} * (100% - 8px))`,
                        transform: 'translateX(-50%)',
                        textAlign: 'center',
                        width: 56,
                      }}
                    >
                      <div
                        style={{
                          width: size,
                          height: size,
                          borderRadius: 'var(--radius-pill)',
                          margin: `${28 - size / 2}px auto 0`,
                          background: reached ? dotColor : 'var(--surface-card)',
                          border: `2.5px solid ${reached ? dotColor : 'var(--neutral-300)'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'background 200ms, border-color 200ms',
                        }}
                      >
                        {isEnd && projDone ? (
                          <span
                            style={{
                              color: 'var(--text-on-brand)',
                              fontSize: 11,
                              fontWeight: 900,
                              lineHeight: 1,
                            }}
                          >
                            {'✓'}
                          </span>
                        ) : null}
                      </div>
                      <div
                        style={{
                          fontSize: 11.5,
                          fontWeight: 700,
                          color: reached ? labelColor : 'var(--text-muted)',
                          marginTop: 6,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {m.l}
                      </div>
                    </div>
                  );
                })}
                {/* travelling token */}
                <div
                  style={{
                    position: 'absolute',
                    top: 28, // 軌道中心線，與里程碑節點圓心對齊
                    left: `calc(4px + ${proj} * (100% - 8px))`,
                    transform: 'translate(-50%,-50%)',
                    width: 14,
                    height: 14,
                    borderRadius: 'var(--radius-pill)',
                    background: 'var(--surface-card)',
                    border: '3px solid var(--blue-700)',
                    boxShadow: '0 1px 5px rgba(27,79,156,.45)',
                    zIndex: 2,
                    transition: playing ? 'none' : 'left 200ms',
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col" style={{ gap: 8 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12.5,
                  fontWeight: 700,
                }}
              >
                <span style={{ color: 'var(--text-muted)' }}>進度</span>
                <span style={{ color: 'var(--blue-700)', fontVariantNumeric: 'tabular-nums' }}>
                  {projPct}%
                </span>
              </div>
              <Meter pct={projPct} fill="var(--blue-500)" live={playing} />
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  minHeight: 26,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {projDone ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '4px 11px',
                      borderRadius: 'var(--radius-pill)',
                      background: 'var(--blue-50)',
                      color: 'var(--blue-700)',
                    }}
                  >
                    {'✓'} 已結案 · 生命週期結束
                  </span>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>抵達「結案」後，專案即告結束</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — product loop */}
        <div style={{ padding: '0 0 0 24px' }}>
          <div className="flex flex-col" style={{ gap: 16 }}>
            <ColHead en="PRODUCT" zh="產品" sub="循環迭代 · 無終點" tone="var(--orange-500)" />

            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: 156,
              }}
            >
              <svg
                viewBox="0 0 244 200"
                width={184}
                height={151}
                style={{ fontFamily: 'var(--font-sans)', overflow: 'visible' }}
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={R}
                  fill="none"
                  stroke="var(--neutral-200)"
                  strokeWidth={2}
                  strokeDasharray="3 7"
                />
                {PHASES.map((ph, i) => {
                  const x = cx + R * Math.cos(toRad(ph.a));
                  const y = cy + R * Math.sin(toRad(ph.a));
                  const active = started && i === phaseIdx;
                  return (
                    <g key={i}>
                      <circle
                        cx={x}
                        cy={y}
                        r={21}
                        fill={active ? 'var(--orange-500)' : 'var(--surface-card)'}
                        stroke={active ? 'var(--orange-500)' : 'var(--neutral-300)'}
                        strokeWidth={2}
                        style={{ transition: 'fill 180ms, stroke 180ms' }}
                      />
                      <text
                        x={x}
                        y={y + 5}
                        textAnchor="middle"
                        fontSize={13.5}
                        fontWeight={800}
                        fill={active ? 'var(--text-on-brand)' : 'var(--neutral-700)'}
                        style={{ transition: 'fill 180ms' }}
                      >
                        {ph.l}
                      </text>
                    </g>
                  );
                })}
                <text
                  x={cx}
                  y={cy - 3}
                  textAnchor="middle"
                  fontSize={26}
                  fontWeight={900}
                  fill="var(--orange-500)"
                >
                  {'∞'}
                </text>
                <text
                  x={cx}
                  y={cy + 17}
                  textAnchor="middle"
                  fontSize={12.5}
                  fontWeight={800}
                  fill="var(--neutral-700)"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {`第 ${laps} 次迭代`}
                </text>
                <circle
                  cx={tokX}
                  cy={tokY}
                  r={7}
                  fill="var(--orange-400)"
                  stroke="var(--surface-card)"
                  strokeWidth={2}
                />
              </svg>
            </div>

            <div className="flex flex-col" style={{ gap: 8 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12.5,
                  fontWeight: 700,
                }}
              >
                <span style={{ color: 'var(--text-muted)' }}>累積價值</span>
                <span style={{ color: 'var(--orange-500)', fontVariantNumeric: 'tabular-nums' }}>
                  {`+${value}`}
                </span>
              </div>
              <Meter
                pct={value % 100}
                fill="linear-gradient(90deg, var(--orange-400) 0%, var(--orange-500) 100%)"
                track="var(--orange-50)"
                live={playing}
              />
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  minHeight: 26,
                  display: 'flex',
                  alignItems: 'center',
                  color: 'var(--text-muted)',
                }}
              >
                每一圈都釋出價值，然後繼續下一輪
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Insight */}
      <div
        style={{
          marginTop: 18,
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--blue-50)',
          borderLeft: '3px solid var(--blue-500)',
          fontSize: 13,
          lineHeight: 1.7,
          color: 'var(--neutral-700)',
        }}
      >
        {insight}
      </div>
    </div>
  );
}

// --- Tab 2: Change Request ---

interface ChangeRequestPanelProps {
  reducedMotion: boolean;
}

function ChangeRequestPanel({ reducedMotion }: ChangeRequestPanelProps) {
  const [revealed, setRevealed] = useState(false);

  const containerVariants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.12 },
    },
  };

  const productContainerVariants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.08 },
    },
  };

  const itemVariants = {
    hidden: reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.28, ease: 'easeOut' as const },
    },
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Two columns */}
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: 'repeat(2, 1fr)',
        }}
      >
        {/* Project column */}
        <div className="flex flex-col gap-2">
          <div
            className="flex items-center gap-1.5 text-xs font-semibold mb-1"
            style={{ color: 'var(--blue-700)' }}
          >
            <Lock size={14} style={{ color: 'var(--blue-700)' }} />
            專案：正式變更流程
          </div>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={revealed || reducedMotion ? 'visible' : 'hidden'}
            className="flex flex-col gap-2"
          >
            {CR_PROJECT_STEPS.map((step, i) => (
              <motion.div
                key={i}
                variants={itemVariants}
                className="px-3 py-2.5 text-xs rounded-lg"
                style={{
                  backgroundColor: 'var(--blue-50)',
                  border: '1px solid var(--blue-200)',
                  color: 'var(--text-body)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <span
                  className="inline-block w-4 h-4 text-center leading-4 text-xs font-bold mr-1.5 rounded-full"
                  style={{
                    backgroundColor: 'var(--blue-700)',
                    color: 'var(--text-on-brand)',
                  }}
                >
                  {i + 1}
                </span>
                {step.label}
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Product column */}
        <div className="flex flex-col gap-2">
          <div
            className="flex items-center gap-1.5 text-xs font-semibold mb-1"
            style={{ color: 'var(--orange-500)' }}
          >
            <Inbox size={14} style={{ color: 'var(--orange-500)' }} />
            產品：輕量 Backlog 流程
          </div>
          <motion.div
            variants={productContainerVariants}
            initial="hidden"
            animate={revealed || reducedMotion ? 'visible' : 'hidden'}
            className="flex flex-col gap-2"
          >
            {CR_PRODUCT_STEPS.map((step, i) => (
              <motion.div
                key={i}
                variants={itemVariants}
                className="px-3 py-2.5 text-xs"
                style={{
                  backgroundColor: 'var(--orange-50)',
                  border: '1px solid var(--orange-200)',
                  color: 'var(--text-body)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <span
                  className="inline-block w-4 h-4 text-center leading-4 text-xs font-bold mr-1.5 rounded-full"
                  style={{
                    backgroundColor: 'var(--orange-500)',
                    color: 'var(--text-on-brand)',
                  }}
                >
                  {i + 1}
                </span>
                {step.label}
              </motion.div>
            ))}
          </motion.div>

          {/* Spacer to fill height difference */}
          <div
            className="px-3 py-2.5 text-xs"
            style={{
              border: '1px dashed var(--orange-200)',
              color: 'var(--text-muted)',
              borderRadius: 'var(--radius-md)',
              opacity: revealed || reducedMotion ? 1 : 0,
            }}
          >
            <span className="italic">通常一週內上線</span>
          </div>
        </div>
      </div>

      {/* Trigger button */}
      {!revealed && !reducedMotion && (
        <div className="flex justify-center">
          <button
            onClick={() => setRevealed(true)}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold transition-all"
            style={{
              backgroundColor: 'var(--orange-400)',
              color: 'var(--text-on-brand)',
              borderRadius: 'var(--radius-pill)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <Zap size={16} />
            模擬需求變更
          </button>
        </div>
      )}

      {revealed && (
        <div className="flex justify-center">
          <button
            onClick={() => setRevealed(false)}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold transition-all"
            style={{
              backgroundColor: 'var(--neutral-100)',
              color: 'var(--text-muted)',
              borderRadius: 'var(--radius-pill)',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <RotateCcw size={14} />
            重設
          </button>
        </div>
      )}
    </div>
  );
}

// --- Tab 3: Metrics (constraint trade-off — drag one, the rest move) ---

const clampMetric = (v: number): number =>
  Math.max(METRIC_FLOOR, Math.min(METRIC_CEIL, v));

// 把第 idx 軸設為 raw，其餘軸依目前比例重新分配剩餘額度，使總和守恆。
function redistribute(values: number[], idx: number, raw: number): number[] {
  const total = values.reduce((a, b) => a + b, 0);
  const next = clampMetric(raw);
  const remaining = total - next;
  const othersSum = values.reduce((a, b, i) => (i === idx ? a : a + b), 0) || 1;
  // 先依比例分配（並夾住下限），再正規化讓其餘軸的和精確等於 remaining
  const draft = values.map((v, i) =>
    i === idx ? next : Math.max(METRIC_FLOOR, (v / othersSum) * remaining)
  );
  const draftOthers = draft.reduce((a, v, i) => (i === idx ? a : a + v), 0) || 1;
  return draft.map((v, i) => (i === idx ? v : (v * remaining) / draftOthers));
}

// 多邊形雷達圖：頂點到中心的距離 = 該軸數值，會隨拖曳即時形變。
function MetricRadar({
  axes,
  values,
  tone,
  soft,
}: {
  axes: Axis[];
  values: number[];
  tone: string;
  soft: string;
}): React.ReactElement {
  const cx = 120;
  const cy = 100;
  const R = 64;
  const at = (angle: number, val: number): [number, number] => {
    const r = (val / METRIC_CEIL) * R;
    const a = (angle * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const toStr = (pts: [number, number][]): string =>
    pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');

  const outer = axes.map((ax) => at(ax.angle, METRIC_CEIL));
  const mid = axes.map((ax) => at(ax.angle, METRIC_CEIL / 2));
  const shape = axes.map((ax, i) => at(ax.angle, values[i]));

  return (
    <svg
      viewBox="0 0 240 200"
      width="100%"
      style={{ overflow: 'visible', maxWidth: 240, margin: '0 auto', display: 'block' }}
    >
      <polygon points={toStr(outer)} fill="none" stroke="var(--neutral-200)" strokeWidth={1.5} />
      <polygon points={toStr(mid)} fill="none" stroke="var(--neutral-100)" strokeWidth={1} />
      {axes.map((ax, i) => {
        const [x, y] = at(ax.angle, METRIC_CEIL);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--neutral-200)" strokeWidth={1} />;
      })}
      <polygon points={toStr(shape)} fill={soft} stroke={tone} strokeWidth={2} />
      {shape.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={4} fill={tone} stroke="var(--surface-card)" strokeWidth={1.5} />
      ))}
      {axes.map((ax, i) => {
        const [lx, ly] = at(ax.angle, METRIC_CEIL + 34);
        return (
          <text
            key={i}
            x={lx}
            y={ly + 4}
            textAnchor="middle"
            fontSize={11.5}
            fontWeight={700}
            fill="var(--neutral-700)"
          >
            {ax.label}
          </text>
        );
      })}
    </svg>
  );
}

function MetricColumn({
  en,
  zh,
  sub,
  tone,
  soft,
  axes,
  values,
  onChange,
}: {
  en: string;
  zh: string;
  sub: string;
  tone: string;
  soft: string;
  axes: Axis[];
  values: number[];
  onChange: (idx: number, raw: number) => void;
}): React.ReactElement {
  // 找出目前最突出的軸；若各軸相近則視為均衡
  const maxIdx = values.reduce((m, v, i) => (v > values[m] ? i : m), 0);
  const spread = Math.max(...values) - Math.min(...values);
  const balanced = spread < 16;

  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      <ColHead en={en} zh={zh} sub={sub} tone={tone} />

      <div style={{ height: 178, display: 'flex', alignItems: 'center' }}>
        <MetricRadar axes={axes} values={values} tone={tone} soft={soft} />
      </div>

      <div className="flex flex-col" style={{ gap: 9 }}>
        {axes.map((ax, i) => (
          <div key={ax.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                width: 56,
                fontSize: 12.5,
                fontWeight: 700,
                color: 'var(--neutral-700)',
                flexShrink: 0,
              }}
            >
              {ax.label}
            </span>
            <input
              type="range"
              min={METRIC_FLOOR}
              max={METRIC_CEIL}
              value={Math.round(values[i])}
              onChange={(e) => onChange(i, Number(e.target.value))}
              aria-label={`調整${ax.label}`}
              style={{ flex: 1, accentColor: tone, cursor: 'pointer' }}
            />
            <span
              style={{
                width: 30,
                textAlign: 'right',
                fontSize: 12.5,
                fontWeight: 800,
                color: tone,
                fontVariantNumeric: 'tabular-nums',
                flexShrink: 0,
              }}
            >
              {Math.round(values[i])}
            </span>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: '10px 12px',
          borderRadius: 'var(--radius-md)',
          background: soft,
          fontSize: 12.5,
          lineHeight: 1.6,
          color: 'var(--neutral-700)',
          minHeight: 62,
        }}
      >
        <TriangleAlert size={15} style={{ color: tone, flexShrink: 0, marginTop: 2 }} />
        <span>
          {balanced
            ? '目前相對均衡 —— 但每往一項傾斜，就得從其他項挪走資源。'
            : axes[maxIdx].consequence}
        </span>
      </div>
    </div>
  );
}

function MetricsPanel(): React.ReactElement {
  const [projValues, setProjValues] = useState<number[]>(PROJECT_AXES.map(() => 50));
  const [prodValues, setProdValues] = useState<number[]>(PRODUCT_AXES.map(() => 50));

  const reset = () => {
    setProjValues(PROJECT_AXES.map(() => 50));
    setProdValues(PRODUCT_AXES.map(() => 50));
  };

  const touched =
    projValues.some((v) => Math.abs(v - 50) > 0.5) ||
    prodValues.some((v) => Math.abs(v - 50) > 0.5);

  return (
    <div className="flex flex-col">
      <p
        className="text-xs text-center mb-4"
        style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}
      >
        拖動任一指標，看其他指標如何被牽動 —— 總量固定，不可能同時都最佳化。
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(258px, 1fr))',
          gap: 0,
          alignItems: 'start',
        }}
      >
        <div style={{ padding: '0 24px 0 0', borderRight: '2px dashed var(--neutral-200)' }}>
          <MetricColumn
            en="PROJECT"
            zh="專案 · 管理鐵三角"
            sub="範疇 / 時程 / 成本"
            tone="var(--blue-700)"
            soft="var(--blue-50)"
            axes={PROJECT_AXES}
            values={projValues}
            onChange={(idx, raw) => setProjValues((vs) => redistribute(vs, idx, raw))}
          />
        </div>
        <div style={{ padding: '0 0 0 24px' }}>
          <MetricColumn
            en="PRODUCT"
            zh="產品 · 價值四要素"
            sub="用戶 / 商業 / 留存 / 黏著"
            tone="var(--orange-500)"
            soft="var(--orange-50)"
            axes={PRODUCT_AXES}
            values={prodValues}
            onChange={(idx, raw) => setProdValues((vs) => redistribute(vs, idx, raw))}
          />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18 }}>
        <button
          onClick={reset}
          disabled={!touched}
          aria-label="重置指標"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            height: 36,
            padding: '0 16px',
            borderRadius: 'var(--radius-pill)',
            border: '1.5px solid var(--neutral-300)',
            background: 'var(--surface-card)',
            color: 'var(--neutral-700)',
            fontWeight: 700,
            fontSize: 13,
            cursor: touched ? 'pointer' : 'default',
            opacity: touched ? 1 : 0.5,
          }}
        >
          <RotateCcw size={14} />
          重置
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------
// Main component
// -----------------------------------------------------------------------
export default function PmProjectVsProduct(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<TabIndex>(0);
  const reducedMotion = useReducedMotion() ?? false;
  const tabBarRef = useRef<HTMLDivElement>(null);

  const panelVariants = {
    initial: reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 },
    animate: reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 },
    exit: reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 },
  };

  const panelTransition = { duration: 0.2, ease: 'easeOut' as const };

  return (
    <figure
      className="not-prose mx-auto"
      style={{
        maxWidth: '48rem',
      }}
    >
      {/* Core insight eyebrow */}
      <p
        className="text-xs text-center tracking-wide mb-4"
        style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}
      >
        專案問「我有沒有把該做的做完」，產品問「我有沒有做對的事」。
      </p>

      {/* Tab navigation */}
      <div
        ref={tabBarRef}
        className="relative flex border-b mb-5"
        style={{ borderColor: 'var(--border-subtle)' }}
        role="tablist"
      >
        {TABS.map((tab, i) => {
          const isActive = activeTab === i;
          return (
            <button
              key={i}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(i as TabIndex)}
              className="relative px-4 py-2.5 text-sm font-medium transition-colors duration-200"
              style={{
                color: isActive ? 'var(--blue-700)' : 'var(--text-muted)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {tab.label}
              {isActive && (
                <motion.span
                  layoutId="tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: 'var(--blue-700)' }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Panel content */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeTab}
          variants={panelVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={panelTransition}
          role="tabpanel"
        >
          {activeTab === 0 && <LifecyclePanel />}
          {activeTab === 1 && <ChangeRequestPanel reducedMotion={reducedMotion} />}
          {activeTab === 2 && <MetricsPanel />}
        </motion.div>
      </AnimatePresence>
    </figure>
  );
}
