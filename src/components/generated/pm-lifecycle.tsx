import React, { useState, useEffect, useRef } from 'react';

// -----------------------------------------------------------------------
// 生命週期：單一時鐘同步模擬
// 左「專案」沿單一路徑前進、抵達交付物後結案停止；
// 右「產品」繞迭代圓環永不停止、持續累積價值。
// -----------------------------------------------------------------------

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

function PlayIcon({ size = 16 }: { size?: number }): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon({ size = 16 }: { size?: number }): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
    </svg>
  );
}

function ResetIcon({ size = 14 }: { size?: number }): React.ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 2v6h6" />
      <path d="M3 13a9 9 0 1 0 3-7.7L3 8" />
    </svg>
  );
}

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

export default function PmLifecycle(): React.ReactElement {
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [proj, setProj] = useState(0); // 0 → 1，鎖在 1
  const [ang, setAng] = useState(-90); // 產品 token 角度（度），起點在圓頂（探索）
  const lastRef = useRef(0);

  useEffect(() => {
    if (!playing) return;
    lastRef.current = performance.now();
    let raf = 0;
    const tick = (now: number) => {
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
  const spun = ang + 90;
  const laps = Math.floor(spun / 360);
  const value = Math.round(spun / 3.6);
  const phaseIdx = ((Math.floor((spun % 360) / 90)) % 4 + 4) % 4;

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
    <figure className="not-prose mx-auto" style={{ maxWidth: '48rem' }}>
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
          {playing ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
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
          <ResetIcon size={14} />
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
                {MILESTONES.map((m, i) => {
                  const reached = proj >= m.p - 0.001;
                  const isEnd = m.p === 1;
                  const labelColor = m.key ? 'var(--orange-500)' : 'var(--blue-700)';
                  const dotColor = m.key ? 'var(--orange-500)' : 'var(--blue-700)';
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
                <div
                  style={{
                    position: 'absolute',
                    top: 28,
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
    </figure>
  );
}
