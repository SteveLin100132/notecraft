import { useState } from 'react';
import { useReducedMotion } from 'motion/react';

// 特休是階梯函數：前 5 年快速爬升，10 年後每年 +1，30 日封頂。
const leaveDays = (y: number): number =>
  y < 0.5 ? 0 : y < 1 ? 3 : y < 2 ? 7 : y < 3 ? 10 : y < 5 ? 14 : y < 10 ? 15 : Math.min(30, 15 + Math.floor(y) - 9);

const leaveTier = (y: number): string =>
  y < 0.5 ? '未滿 6 個月，尚未取得特休。' :
  y < 1 ? '6 個月以上、未滿 1 年：3 日。' :
  y < 2 ? '1 年以上、未滿 2 年：7 日。' :
  y < 3 ? '2 年以上、未滿 3 年：10 日。' :
  y < 5 ? '3 年以上、未滿 5 年：每年 14 日。' :
  y < 10 ? '5 年以上、未滿 10 年：每年 15 日。' :
  y >= 24 ? '已達上限：每年 30 日。' : '10 年以上：每 1 年加給 1 日，加至 30 日為止。';

const XS: number[] = [0.5, ...Array.from({ length: 25 }, (_, i) => i + 1)];
const AXIS = [0.5, 5, 10, 15, 20, 25];

export default function AnnualLeaveCalculator() {
  const reduce = useReducedMotion();
  const [y, setY] = useState<number>(6);
  const on = y >= 1 ? Math.floor(y) : y >= 0.5 ? 0.5 : null;

  return (
    <div className="not-prose w-full" style={{ fontSize: 'calc(var(--md-fs, 16px) * 0.85)' }}>
      <div className="flex flex-wrap items-end gap-x-7 gap-y-3">
        <div>
          <div className="mb-1 text-[11.5px] text-[var(--wb-ink-3)]">年資</div>
          <div className="text-[38px] font-black leading-none tracking-[-0.02em] tabular-nums text-[var(--wb-ink)]">
            {y}<small className="ml-[3px] text-[15px] font-bold tracking-normal">年</small>
          </div>
        </div>
        <div>
          <div className="mb-1 text-[11.5px] text-[var(--wb-ink-3)]">當年度特休</div>
          <div className="text-[38px] font-black leading-none tracking-[-0.02em] tabular-nums text-[color-mix(in_srgb,var(--wb-gold)_80%,var(--wb-ink))]">
            {leaveDays(y)}<small className="ml-[3px] text-[15px] font-bold tracking-normal">日</small>
          </div>
        </div>
        <div aria-live="polite" className="min-h-[2.6em] min-w-[180px] flex-1 pb-1 text-[12.5px] text-[var(--wb-ink-2)] [text-wrap:pretty]">
          {leaveTier(y)}
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={25}
        step={0.5}
        value={y}
        onChange={(e) => setY(Number(e.target.value))}
        aria-label="年資（年）"
        className="mb-1 mt-4 w-full accent-[var(--wb-blue-l)]"
      />
      <div role="group" aria-label="各年資的特休天數" className="mt-[10px] flex h-[120px] items-end gap-[3px]">
        {XS.map((x) => {
          const state = x === on ? 'on' : on !== null && x < on ? 'past' : 'rest';
          const bg =
            state === 'on'
              ? 'var(--wb-gold)'
              : state === 'past'
                ? 'color-mix(in srgb, var(--wb-blue-l) 55%, var(--wb-panel))'
                : 'color-mix(in srgb, var(--wb-blue-l) 20%, var(--wb-panel))';
          return (
            <button
              key={x}
              type="button"
              onClick={() => setY(x)}
              title={`${x} 年：${leaveDays(x)} 日`}
              aria-label={`${x} 年，${leaveDays(x)} 日`}
              className="min-w-0 flex-1 cursor-pointer rounded-t-[3px] border-none p-0 hover:brightness-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--wb-blue-l)]"
              style={{
                height: `${(leaveDays(x) / 30) * 100}%`,
                background: bg,
                transition: reduce ? 'none' : 'background 160ms ease-out, height 260ms ease-out',
              }}
            />
          );
        })}
      </div>
      <div aria-hidden="true" className="mt-[5px] flex gap-[3px] text-[10.5px] tabular-nums text-[var(--wb-ink-3)]">
        {XS.map((x) => (
          <span key={x} className="min-w-0 flex-1 overflow-visible whitespace-nowrap text-center">
            {AXIS.includes(x) ? x : ''}
          </span>
        ))}
      </div>
      <p className="m-0 mt-2 text-[12px] text-[var(--wb-ink-3)]">10 年以上每年加 1 日，最多 30 日</p>
    </div>
  );
}
