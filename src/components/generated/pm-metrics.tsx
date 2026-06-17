import React, { useState } from 'react';
import { RotateCcw, TriangleAlert } from 'lucide-react';

// -----------------------------------------------------------------------
// 衡量標準：可拖曳的「取捨示意」模型（以固定總和模擬資源有限下的此消彼長）。
// 每一軸代表「這項有多被最佳化」，拉高一項、其餘被迫下降，
// 親手體驗「動一個就牽動其他、不可能同時最佳化」的取捨本質。
// 註：左側鐵三角為公認模型；右側產品四要素僅為示意，非既有框架、實務上常一起上升。
// -----------------------------------------------------------------------

interface Axis {
  key: string;
  label: string;
  angle: number; // 度，0 = 右、-90 = 上
  consequence: string; // 當此軸被推到偏高時的白話後果
}

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

const clampMetric = (v: number): number =>
  Math.max(METRIC_FLOOR, Math.min(METRIC_CEIL, v));

// 把第 idx 軸設為 raw，其餘軸依目前比例重新分配剩餘額度，使總和守恆。
function redistribute(values: number[], idx: number, raw: number): number[] {
  const total = values.reduce((a, b) => a + b, 0);
  const next = clampMetric(raw);
  const remaining = total - next;
  const othersSum = values.reduce((a, b, i) => (i === idx ? a : a + b), 0) || 1;
  const draft = values.map((v, i) =>
    i === idx ? next : Math.max(METRIC_FLOOR, (v / othersSum) * remaining)
  );
  const draftOthers = draft.reduce((a, v, i) => (i === idx ? a : a + v), 0) || 1;
  return draft.map((v, i) => (i === idx ? v : (v * remaining) / draftOthers));
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

export default function PmMetrics(): React.ReactElement {
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
    <figure className="not-prose mx-auto" style={{ maxWidth: '48rem' }}>
      <p
        className="text-xs text-center mb-4"
        style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}
      >
        拖動任一指標，看資源有限下其他指標如何被牽動 —— 這是「取捨示意」，凸顯不可能同時都最佳化。
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

      <p
        className="text-xs text-center"
        style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginTop: 16 }}
      >
        左側鐵三角是業界公認、有明確約束的模型；右側「價值四要素」只是挑出的幾個代表指標，
        並非既有框架，實務上也常一起上升，這裡的守恆僅為凸顯取捨精神的示意。
      </p>
    </figure>
  );
}
