/**
 * demo-usage-chart
 * 示範用：各部門請假結構的堆疊條圖，可隱藏假別。
 * 注意：以下數據為示範用的示意數據，非真實統計。
 */
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useReducedMotion } from 'motion/react';

const CATS = [
  { name: '特休', color: 'var(--wb-blue-l)' },
  { name: '病假', color: 'var(--wb-ok)' },
  { name: '事假', color: 'var(--wb-gold)' },
  { name: '公假', color: 'color-mix(in srgb, var(--wb-blue) 55%, var(--wb-danger))' },
] as const;

const DEPTS: ReadonlyArray<{ name: string; hours: readonly number[] }> = [
  { name: '業務部', hours: [168, 42, 36, 12] },
  { name: '研發部', hours: [212, 30, 18, 24] },
  { name: '客服部', hours: [96, 58, 44, 6] },
  { name: '行政部', hours: [74, 22, 16, 30] },
];

const DEFAULT_HINT = '點圖例可隱藏或顯示假別，滑過色塊顯示數值';

type Hover = { dept: number; cat: number; value: number; total: number } | null;

export default function DemoUsageChart() {
  const reduce = useReducedMotion();
  const [off, setOff] = useState<Record<number, boolean>>({});
  const [hv, setHv] = useState<Hover>(null);

  const visibleTotal = (hours: readonly number[]) =>
    hours.reduce((s, h, i) => (off[i] ? s : s + h), 0);
  const max = Math.max(...DEPTS.map((d) => visibleTotal(d.hours)));
  const allOff = CATS.every((_, i) => off[i]);

  const toggle = (i: number) => {
    setOff((o) => ({ ...o, [i]: !o[i] }));
    setHv(null);
  };

  const trans: CSSProperties['transition'] = reduce
    ? 'none'
    : 'width 300ms ease-out, opacity 160ms';

  return (
    <div className="not-prose" style={{ color: 'var(--wb-ink-2)' }}>
      <div style={{ fontSize: 11.5, color: 'var(--wb-ink-3)', marginBottom: 8 }}>
        示範數據（單位：小時）
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }} role="group" aria-label="假別圖例">
        {CATS.map((c, i) => (
          <button
            key={c.name}
            type="button"
            aria-pressed={!off[i]}
            onClick={() => toggle(i)}
            style={{
              height: 26,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '0 10px',
              border: '1px solid var(--wb-line)',
              borderRadius: 999,
              background: off[i] ? 'var(--wb-bg)' : 'var(--wb-panel)',
              font: 'inherit',
              fontSize: 12,
              color: off[i] ? 'var(--wb-ink-3)' : 'var(--wb-ink-2)',
              cursor: 'pointer',
            }}
          >
            <i
              style={{
                width: 9,
                height: 9,
                borderRadius: 3,
                background: off[i] ? 'none' : c.color,
                boxShadow: off[i] ? `inset 0 0 0 1.5px ${c.color}` : 'none',
              }}
            />
            {c.name}
          </button>
        ))}
      </div>

      {DEPTS.map((d, di) => {
        const total = visibleTotal(d.hours);
        return (
          <div
            key={d.name}
            style={{
              display: 'grid',
              gridTemplateColumns: '56px minmax(0,1fr) 64px',
              alignItems: 'center',
              gap: 10,
              marginTop: 12,
            }}
          >
            <span style={{ fontSize: 12.5, color: 'var(--wb-ink-2)', textAlign: 'right' }}>{d.name}</span>
            <div
              style={{
                display: 'flex',
                height: 20,
                borderRadius: 4,
                overflow: 'hidden',
                background: 'var(--wb-bg)',
              }}
            >
              {CATS.map((c, ci) => {
                const w = off[ci] || max === 0 ? 0 : (d.hours[ci] / max) * 100;
                return (
                  <button
                    key={c.name}
                    type="button"
                    aria-label={`${d.name}・${c.name} ${d.hours[ci]} 小時`}
                    tabIndex={off[ci] ? -1 : 0}
                    onMouseEnter={() => setHv({ dept: di, cat: ci, value: d.hours[ci], total })}
                    onFocus={() => setHv({ dept: di, cat: ci, value: d.hours[ci], total })}
                    onMouseLeave={() => setHv(null)}
                    onBlur={() => setHv(null)}
                    className="hover:!opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--wb-ink)]"
                    style={{
                      width: `${w}%`,
                      height: '100%',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      background: c.color,
                      boxShadow: w > 0 ? 'inset -1px 0 0 var(--wb-panel)' : 'none',
                      opacity: hv && hv.dept === di && hv.cat !== ci ? 0.55 : 1,
                      transition: trans,
                    }}
                  />
                );
              })}
            </div>
            <span
              style={{ fontSize: 12, color: 'var(--wb-ink-3)', fontVariantNumeric: 'tabular-nums' }}
            >
              {total} 小時
            </span>
          </div>
        );
      })}

      <div
        aria-live="polite"
        style={{ marginTop: 12, minHeight: 20, fontSize: 12, color: 'var(--wb-ink-3)' }}
      >
        {allOff ? (
          '請至少開啟一個假別'
        ) : hv ? (
          <>
            <b style={{ color: 'var(--wb-ink)' }}>
              {DEPTS[hv.dept].name}・{CATS[hv.cat].name}
            </b>
            {'　'}
            {hv.value} 小時，占該部門 {hv.total ? Math.round((hv.value / hv.total) * 100) : 0}%
          </>
        ) : (
          DEFAULT_HINT
        )}
      </div>
    </div>
  );
}
