import { useState } from 'react';

type BillingMode = 'monthly' | 'prepay';
type SegmentKey = 'dottedsign' | 'gcpDev' | 'gcpPrd' | 'bizform';

interface SegmentData {
  key: SegmentKey;
  label: string;
  monthly: number;
  prepay: number;
  colorClass: string;
  textColorClass: string;
  showInnerText: boolean;
}

interface PlanData {
  id: 'A' | 'B';
  label: string;
  segments: SegmentKey[];
  monthly: number;
  prepay: number;
  monthlyAvgMonthly: number;
  monthlyAvgPrepay: number;
}

const SEGMENTS: Record<SegmentKey, SegmentData> = {
  dottedsign: {
    key: 'dottedsign',
    label: '點點簽',
    monthly: 6000,
    prepay: 6000,
    colorClass: 'bg-blue-200',
    textColorClass: 'text-blue-700',
    showInnerText: false,
  },
  gcpDev: {
    key: 'gcpDev',
    label: 'GCP DEV',
    monthly: 45148,
    prepay: 32666,
    colorClass: 'bg-blue-400',
    textColorClass: 'text-white',
    showInnerText: true,
  },
  gcpPrd: {
    key: 'gcpPrd',
    label: 'GCP PRD',
    monthly: 89042,
    prepay: 64080,
    colorClass: 'bg-blue-700',
    textColorClass: 'text-white',
    showInnerText: true,
  },
  bizform: {
    key: 'bizform',
    label: 'BizForm',
    monthly: 11100,
    prepay: 11100,
    colorClass: 'bg-orange-400',
    textColorClass: 'text-white',
    showInnerText: false,
  },
};

const PLAN_B: PlanData = {
  id: 'B',
  label: '方案 B',
  segments: ['dottedsign', 'gcpDev', 'gcpPrd'],
  monthly: 140190,
  prepay: 102746,
  monthlyAvgMonthly: 11683,
  monthlyAvgPrepay: 8542,
};

const PLAN_A: PlanData = {
  id: 'A',
  label: '方案 A',
  segments: ['dottedsign', 'gcpDev', 'gcpPrd', 'bizform'],
  monthly: 151290,
  prepay: 113846,
  monthlyAvgMonthly: 12608,
  monthlyAvgPrepay: 9467,
};

const BIZFORM_DIFF = 11100;
const PREPAY_SAVING = 37444;

// Inline Check SVG (12x12, stroke=currentColor)
function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="2,6 5,9 10,3" />
    </svg>
  );
}

// Inline Info SVG (12x12, stroke=currentColor)
function InfoIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="6" cy="6" r="5" />
      <line x1="6" y1="5.5" x2="6" y2="8.5" />
      <circle cx="6" cy="3.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function formatNTD(value: number): string {
  return value.toLocaleString('zh-TW');
}

interface BarSegmentProps {
  seg: SegmentData;
  value: number;
  planATotal: number;
}

function BarSegment({ seg, value, planATotal }: BarSegmentProps) {
  const pct = (value / planATotal) * 100;
  return (
    <div
      className={`${seg.colorClass} h-full flex items-center justify-center overflow-hidden`}
      style={{
        width: `${pct}%`,
        transition: 'width 360ms cubic-bezier(0.16,1,0.3,1)',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {seg.showInnerText && value > 0 && (
        <span className="text-xs font-medium text-white whitespace-nowrap px-1 select-none">
          {formatNTD(value)}
        </span>
      )}
    </div>
  );
}

interface PlanBarRowProps {
  plan: PlanData;
  mode: BillingMode;
  planATotal: number;
  isRecommended?: boolean;
}

function PlanBarRow({ plan, mode, planATotal, isRecommended }: PlanBarRowProps) {
  const total = mode === 'monthly' ? plan.monthly : plan.prepay;
  const monthlyAvg = mode === 'monthly' ? plan.monthlyAvgMonthly : plan.monthlyAvgPrepay;

  return (
    <div className="flex items-center gap-3">
      {/* Left label */}
      <div className="w-28 sm:w-36 flex-shrink-0">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium" style={{ color: 'var(--text-strong)' }}>
            {plan.label}
          </span>
          {isRecommended && (
            <span
              className="inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full w-fit"
              style={{
                backgroundColor: 'var(--success-50)',
                color: 'var(--success-500)',
                borderRadius: 'var(--radius-pill)',
              }}
            >
              <CheckIcon />
              建議採用
            </span>
          )}
        </div>
      </div>

      {/* Bar */}
      <div
        className="flex-1 h-10 flex rounded overflow-hidden"
        style={{
          backgroundColor: 'var(--neutral-100)',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        {plan.segments.map((key) => {
          const seg = SEGMENTS[key];
          const value = mode === 'monthly' ? seg.monthly : seg.prepay;
          if (key === 'bizform' && plan.id === 'B') return null;
          return (
            <BarSegment
              key={key}
              seg={seg}
              value={value}
              planATotal={planATotal}
            />
          );
        })}
      </div>

      {/* Right total */}
      <div className="min-w-[140px] sm:min-w-[160px] text-right flex-shrink-0">
        <div className="text-lg font-bold" style={{ color: 'var(--text-strong)' }}>
          NTD {formatNTD(total)}
        </div>
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
          月均 NTD {formatNTD(monthlyAvg)}
        </div>
      </div>
    </div>
  );
}

export default function CostEstimateComparison() {
  const [activeMode, setActiveMode] = useState<BillingMode>('monthly');

  const planATotal = activeMode === 'monthly' ? PLAN_A.monthly : PLAN_A.prepay;
  const planBTotal = activeMode === 'monthly' ? PLAN_B.monthly : PLAN_B.prepay;
  const planBMonthlyAvg = activeMode === 'monthly' ? PLAN_B.monthlyAvgMonthly : PLAN_B.monthlyAvgPrepay;

  return (
    <div className="not-prose w-full space-y-6">
      {/* 1. Pill toggle */}
      <div className="flex justify-center">
        <div
          className="inline-flex p-1 gap-1"
          style={{
            backgroundColor: 'var(--neutral-100)',
            borderRadius: 'var(--radius-pill)',
          }}
        >
          {(
            [
              { value: 'monthly' as BillingMode, label: '月繳（隨用即付）' },
              { value: 'prepay' as BillingMode, label: '年費預繳' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setActiveMode(opt.value)}
              className="px-4 py-1.5 text-sm font-medium transition-colors"
              style={{
                borderRadius: 'var(--radius-pill)',
                backgroundColor:
                  activeMode === opt.value ? 'var(--blue-700)' : 'transparent',
                color:
                  activeMode === opt.value
                    ? 'var(--text-on-brand)'
                    : 'var(--neutral-500)',
                transition: 'background-color 220ms ease-out, color 220ms ease-out',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2 & 3. Plan bars */}
      <div className="space-y-4">
        <PlanBarRow
          plan={PLAN_B}
          mode={activeMode}
          planATotal={planATotal}
          isRecommended
        />
        <PlanBarRow
          plan={PLAN_A}
          mode={activeMode}
          planATotal={planATotal}
        />
      </div>

      {/* 4. BizForm diff note */}
      <div
        className="flex items-center gap-1.5 text-sm"
        style={{ color: 'var(--orange-600)' }}
      >
        <InfoIcon />
        <span>
          兩案唯一差異：BizForm 年費 +NTD {formatNTD(BIZFORM_DIFF)}
        </span>
      </div>

      {/* 5. Legend */}
      <div className="flex flex-wrap gap-3">
        {(Object.keys(SEGMENTS) as SegmentKey[]).map((key) => {
          const seg = SEGMENTS[key];
          const value = activeMode === 'monthly' ? seg.monthly : seg.prepay;
          const isBizform = key === 'bizform';
          return (
            <div key={key} className="flex items-center gap-1.5">
              <div
                className={`w-3 h-3 rounded-sm flex-shrink-0 ${seg.colorClass}`}
                style={{ borderRadius: 'var(--radius-xs)' }}
              />
              <span className="text-xs" style={{ color: 'var(--text-body)' }}>
                {seg.label}
                {!seg.showInnerText && (
                  <span className="ml-1" style={{ color: 'var(--text-muted)' }}>
                    NTD {formatNTD(value)}
                    {isBizform && (
                      <span className="ml-1" style={{ color: 'var(--orange-500)' }}>
                        （僅方案 A）
                      </span>
                    )}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* 6. KPI grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* KPI A: 方案 B 年費 */}
        <div
          className="p-4 border"
          style={{
            backgroundColor: 'var(--neutral-50)',
            borderColor: 'var(--neutral-200)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div
            className="text-xl font-bold"
            style={{ color: 'var(--success-500)' }}
          >
            NTD {formatNTD(planBTotal)}
          </div>
          <div className="text-sm font-medium mt-1" style={{ color: 'var(--text-strong)' }}>
            方案 B 年費（建議）
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {activeMode === 'prepay' ? '預繳' : '月繳'} / 月均 NTD {formatNTD(planBMonthlyAvg)}
          </div>
        </div>

        {/* KPI B: A 比 B 多花 */}
        <div
          className="p-4 border"
          style={{
            backgroundColor: 'var(--neutral-50)',
            borderColor: 'var(--neutral-200)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div
            className="text-xl font-bold"
            style={{ color: 'var(--orange-600)' }}
          >
            +NTD {formatNTD(BIZFORM_DIFF)}
          </div>
          <div className="text-sm font-medium mt-1" style={{ color: 'var(--text-strong)' }}>
            A 比 B 多花
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            BizForm 固定年費
          </div>
        </div>

        {/* KPI C: 改年費預繳省費 */}
        <div
          className="p-4 border"
          style={{
            backgroundColor:
              activeMode === 'prepay' ? 'var(--blue-50)' : 'var(--neutral-50)',
            borderColor:
              activeMode === 'prepay' ? 'var(--blue-200)' : 'var(--neutral-200)',
            borderRadius: 'var(--radius-md)',
            transition: 'background-color 220ms ease-out, border-color 220ms ease-out',
          }}
        >
          <div
            className="text-xl font-bold"
            style={{ color: 'var(--blue-700)' }}
          >
            省 NTD {formatNTD(PREPAY_SAVING)}
          </div>
          <div className="text-sm font-medium mt-1" style={{ color: 'var(--text-strong)' }}>
            改年費預繳每年節省
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            GCP 約省 25%
          </div>
        </div>
      </div>

      {/* 7. Footer note */}
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        尚未涵蓋：BizForm API 串接費、Cloud Storage 超用與對外流量費，後續評估另計。
      </p>
    </div>
  );
}
