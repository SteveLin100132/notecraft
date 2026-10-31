import { useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { Check, Minus, Play, RotateCcw, TriangleAlert } from 'lucide-react';

type StepFlag = 'skip' | 'warn';
type Step = [title: string, role: string, desc: string, flag?: StepFlag];
type Scenario = { label: string; steps: Step[] };

const FLOWS: Record<string, Scenario> = {
  short: {
    label: '1–3 日',
    steps: [
      ['送出申請', '員工', '選擇假別與時段後送出，系統即時檢查剩餘天數。'],
      ['代理人確認', '職務代理人', '代理人需於 24 小時內確認，逾時會通知申請人改派。'],
      ['主管簽核', '直屬主管', '主管可核准、退回或要求補件；核准後立即扣除餘額。'],
      ['歸檔完成', '系統', '寫入假勤紀錄並同步至排班表與薪資計算。'],
    ],
  },
  long: {
    label: '4 日以上',
    steps: [
      ['送出申請', '員工', '連續 4 日以上的特休需提前 7 日申請。'],
      ['代理人確認', '職務代理人', '代理人需確認整段期間皆可代理。'],
      ['主管簽核', '直屬主管', '主管確認工作交接安排。'],
      ['部門經理', '部門經理', '超過 3 日由部門經理加簽，確認人力配置。'],
      ['HR 確認', '人資', 'HR 檢查與國定假日、補休是否重疊。'],
      ['歸檔完成', '系統', '寫入假勤紀錄並同步至排班表與薪資計算。'],
    ],
  },
  timeout: {
    label: '代理人逾時',
    steps: [
      ['送出申請', '員工', '申請送出後進入代理人確認。'],
      ['代理人逾時', '職務代理人', '超過 24 小時未確認，流程暫停並通知申請人。', 'warn'],
      ['改派代理人', '員工', '申請人改選其他代理人，原紀錄保留於簽核歷程。'],
      ['主管簽核', '直屬主管', '主管可在歷程中看到改派原因。'],
      ['歸檔完成', '系統', '寫入假勤紀錄並同步至排班表與薪資計算。'],
    ],
  },
};

const IDS = Object.keys(FLOWS);
const DEFAULT_KEY = 'short';

export default function DemoApprovalFlow() {
  const reduce = useReducedMotion();
  const [k, setK] = useState<string>(DEFAULT_KEY);
  const [cur, setCur] = useState(1);
  const [sel, setSel] = useState(1);
  const steps = FLOWS[k].steps;
  const finished = cur >= steps.length;
  const s = steps[sel];
  const tr = reduce ? 'none' : undefined;

  const pick = (nk: string) => {
    setK(nk);
    setCur(1);
    setSel(1);
  };
  const next = () => {
    const n = Math.min(cur + 1, steps.length);
    setCur(n);
    setSel(Math.min(n, steps.length - 1));
  };

  return (
    <div className="not-prose" style={{ color: 'var(--wb-ink-2)' }}>
      <div
        role="radiogroup"
        aria-label="情境"
        className="inline-flex flex-wrap gap-0.5 rounded-full p-[3px]"
        style={{ background: 'var(--wb-bg)', border: '1px solid var(--wb-line)' }}
      >
        {IDS.map((id) => {
          const on = id === k;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => pick(id)}
              className="h-[26px] cursor-pointer rounded-full border-none px-3 text-xs focus-visible:outline-2 focus-visible:outline-offset-1"
              style={{
                background: on ? 'var(--wb-panel)' : 'none',
                color: on ? 'var(--wb-blue-l)' : 'var(--wb-ink-2)',
                fontWeight: on ? 700 : 400,
                boxShadow: on ? '0 1px 2px color-mix(in srgb, var(--wb-ink) 12%, transparent)' : 'none',
                outlineColor: 'var(--wb-blue-l)',
              }}
            >
              {FLOWS[id].label}
            </button>
          );
        })}
      </div>

      <div className="mt-5 mb-1 flex items-start overflow-x-auto pt-1 pb-1.5" style={{ minHeight: 96 }}>
        {steps.map((st, i) => {
          const skip = st[3] === 'skip';
          const warn = st[3] === 'warn';
          const reached = i < cur || finished;
          const isCur = !reached && i === cur;
          const state = reached ? (skip ? 'skip' : warn ? 'warn' : 'done') : isCur ? 'cur' : 'todo';
          const isSel = sel === i;

          let dotBg = 'var(--wb-panel)';
          let dotBorder = 'var(--wb-line)';
          let dotColor = 'var(--wb-ink-3)';
          let borderStyle: 'solid' | 'dashed' = 'solid';
          let shadow = 'none';
          if (state === 'done') {
            dotBg = 'var(--wb-blue-l)';
            dotBorder = 'var(--wb-blue-l)';
            dotColor = 'var(--wb-panel)';
          } else if (state === 'cur') {
            dotBorder = 'var(--wb-gold)';
            dotColor = 'var(--wb-ink)';
            shadow = '0 0 0 4px color-mix(in srgb, var(--wb-gold) 22%, transparent)';
          } else if (state === 'warn') {
            dotBorder = 'var(--wb-warn)';
            dotColor = 'color-mix(in srgb, var(--wb-warn) 60%, var(--wb-ink))';
          } else if (state === 'skip') {
            borderStyle = 'dashed';
          }
          const lineColor =
            state === 'warn'
              ? 'var(--wb-warn)'
              : state === 'done' || state === 'cur'
                ? 'var(--wb-blue-l)'
                : 'var(--wb-line)';

          return (
            <div key={k + i} className="flex min-w-[86px] flex-1 items-start">
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className="mt-[15px] h-0.5 min-w-2 flex-1 rounded-sm"
                  style={{ background: lineColor, transition: tr ?? 'background 260ms ease-out' }}
                />
              )}
              <button
                type="button"
                onClick={() => setSel(i)}
                aria-pressed={isSel}
                aria-label={`第 ${i + 1} 步 ${st[0]}`}
                className="flex min-w-[86px] cursor-pointer flex-col items-center gap-1.5 rounded-md border-none bg-transparent px-1 focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ outlineColor: 'var(--wb-blue-l)', font: 'inherit' }}
              >
                <span
                  className="box-border grid h-[34px] w-[34px] place-items-center rounded-full text-xs font-extrabold"
                  style={{
                    background: dotBg,
                    border: `2px ${borderStyle} ${dotBorder}`,
                    color: dotColor,
                    boxShadow: shadow,
                    transition: tr ?? 'all 220ms ease-out',
                  }}
                >
                  {state === 'done' ? (
                    <Check size={14} strokeWidth={2.6} />
                  ) : state === 'warn' ? (
                    <TriangleAlert size={14} />
                  ) : state === 'skip' ? (
                    <Minus size={14} />
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className="text-center text-xs leading-[1.4]"
                  style={{
                    color: isSel ? 'var(--wb-blue-l)' : 'var(--wb-ink-2)',
                    fontWeight: isSel ? 700 : 400,
                  }}
                >
                  {st[0]}
                </span>
                <span className="text-center text-[10.5px]" style={{ color: 'var(--wb-ink-3)' }}>
                  {st[1]}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      <div
        aria-live="polite"
        className="mt-3 rounded-lg px-3 py-2.5 leading-[1.7]"
        style={{
          background: 'var(--wb-bg)',
          minHeight: '4.8em',
          fontSize: 'calc(var(--md-fs, 16px) * 0.85)',
          color: 'var(--wb-ink-2)',
        }}
      >
        <b style={{ color: 'var(--wb-ink)' }}>{s[0]}</b>・{s[1]}　{s[2]}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={next}
          disabled={finished}
          className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border-none px-3 text-xs font-semibold disabled:cursor-default disabled:opacity-50"
          style={{ background: 'var(--wb-blue)', color: 'var(--wb-panel)' }}
        >
          <Play size={12} />
          下一步
        </button>
        <button
          type="button"
          onClick={() => pick(k)}
          className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-transparent px-3 text-xs"
          style={{ border: '1px solid var(--wb-line)', color: 'var(--wb-ink-2)' }}
        >
          <RotateCcw size={13} />
          重設
        </button>
        <span className="ml-auto text-xs" style={{ color: 'var(--wb-ink-3)' }}>
          {finished ? '流程已完成' : `目前在第 ${cur + 1} / ${steps.length} 步`}
        </span>
      </div>
    </div>
  );
}
