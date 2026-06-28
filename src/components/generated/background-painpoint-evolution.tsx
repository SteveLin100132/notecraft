import React from 'react';
import clsx from 'clsx';

/* -----------------------------------------------------------------------
   Inline SVG icon map — no emoji, no lucide-react
   ----------------------------------------------------------------------- */
type IconName =
  | 'table'
  | 'notebook'
  | 'server'
  | 'share'
  | 'lock'
  | 'form'
  | 'gauge'
  | 'versions'
  | 'chevron-right'
  | 'alert-triangle'
  | 'lightbulb';

interface IconProps {
  name: IconName;
  size?: number;
}

function Icon({ name, size = 16 }: IconProps): React.ReactElement {
  const props = {
    viewBox: '0 0 24 24',
    width: size,
    height: size,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  switch (name) {
    case 'table':
      return (
        <svg {...props}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="3" y1="15" x2="21" y2="15" />
          <line x1="9" y1="3" x2="9" y2="21" />
          <line x1="15" y1="3" x2="15" y2="21" />
        </svg>
      );
    case 'notebook':
      return (
        <svg {...props}>
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <line x1="9" y1="2" x2="9" y2="22" />
          <line x1="12" y1="7" x2="18" y2="7" />
          <line x1="12" y1="11" x2="18" y2="11" />
          <line x1="12" y1="15" x2="18" y2="15" />
        </svg>
      );
    case 'server':
      return (
        <svg {...props}>
          <rect x="2" y="3" width="20" height="7" rx="2" />
          <rect x="2" y="14" width="20" height="7" rx="2" />
          <circle cx="6" cy="6.5" r="1" fill="currentColor" stroke="none" />
          <circle cx="6" cy="17.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'share':
      return (
        <svg {...props}>
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="15" y1="6.4" x2="9" y2="10.6" />
          <line x1="15" y1="17.6" x2="9" y2="13.4" />
        </svg>
      );
    case 'lock':
      return (
        <svg {...props}>
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
      );
    case 'form':
      return (
        <svg {...props}>
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="8" y1="13" x2="16" y2="13" />
          <line x1="8" y1="17" x2="16" y2="17" />
        </svg>
      );
    case 'gauge':
      return (
        <svg {...props}>
          <path d="M5 17A7 7 0 1119 17" />
          <line x1="12" y1="12" x2="8.5" y2="14.5" />
        </svg>
      );
    case 'versions':
      return (
        <svg {...props}>
          <polyline points="23 4 23 10 17 10" />
          <path d="M20.5 15a9 9 0 11-2.4-7.4L23 10" />
        </svg>
      );
    case 'chevron-right':
      return (
        <svg {...props}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
      );
    case 'alert-triangle':
      return (
        <svg {...props}>
          <path d="M10.3 3.3L1.5 18a2 2 0 001.7 3h17.6a2 2 0 001.7-3L13.7 3.3a2 2 0 00-3.4 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case 'lightbulb':
      return (
        <svg {...props}>
          <path d="M9 21h6" />
          <path d="M12 21v-3" />
          <path d="M12 3a6 6 0 00-6 6c0 2.2 1.2 4.2 3 5.3V17h6v-2.7A6 6 0 0012 3z" />
        </svg>
      );
  }
}

/* -----------------------------------------------------------------------
   Data constants
   ----------------------------------------------------------------------- */
interface TimelineNode {
  phase: string;
  phaseZh: string;
  title: string;
  desc: string;
  style: 'neutral' | 'blue' | 'orange';
  icon: 'table' | 'notebook' | 'server';
}

const TIMELINE_NODES: TimelineNode[] = [
  {
    phase: 'PAST',
    phaseZh: '過去',
    title: 'Excel 手動維護',
    desc: '客服與顧問師逐筆把客戶合約資訊手動維護進 Excel',
    style: 'neutral',
    icon: 'table',
  },
  {
    phase: 'NOW',
    phaseZh: '現在（PoC 過渡）',
    title: 'Notion 過渡工具',
    desc: '作為過渡期工具，同步搜集需求、記錄規格與流程',
    style: 'blue',
    icon: 'notebook',
  },
  {
    phase: 'FUTURE',
    phaseZh: '目標',
    title: '自建系統',
    desc: '合約與客戶規格已趨成熟，可作為開發藍本',
    style: 'orange',
    icon: 'server',
  },
];

interface Painpoint {
  name: string;
  desc: string;
  impact: string;
  icon: 'share' | 'lock' | 'form' | 'gauge' | 'versions';
}

const PAINPOINTS: Painpoint[] = [
  {
    name: '資料分散',
    desc: '跨 DB 關聯，無法像 RDB 做複雜查詢',
    impact: '跨表報表需人工彙整',
    icon: 'share',
  },
  {
    name: '權限設定',
    desc: '無法做到 Column Level 權限控管',
    impact: '薪資、合約金額無法分層遮蔽',
    icon: 'lock',
  },
  {
    name: '欄位驗證',
    desc: '無法鎖定必填欄位與資料格式',
    impact: '漏填、格式錯誤難以稽核',
    icon: 'form',
  },
  {
    name: '效能瓶頸',
    desc: '資料量大時查詢速度明顯變慢',
    impact: '客戶量一大即明顯卡頓',
    icon: 'gauge',
  },
  {
    name: '版本迭代',
    desc: 'Notion 改版常導致權限功能失效',
    impact: '每次改版需重設、不可控',
    icon: 'versions',
  },
];

/* -----------------------------------------------------------------------
   Sub-components
   ----------------------------------------------------------------------- */
interface NodeCardProps {
  node: TimelineNode;
}

function NodeCard({ node }: NodeCardProps): React.ReactElement {
  const cardStyle: React.CSSProperties =
    node.style === 'neutral'
      ? {
          background: 'var(--neutral-100)',
          border: '1px solid var(--neutral-200)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
        }
      : node.style === 'blue'
        ? {
            background: 'var(--blue-50)',
            border: '1.5px solid var(--blue-700)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
          }
        : {
            background: 'var(--orange-50)',
            border: '1.5px dashed var(--orange-400)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
          };

  const phaseColor: React.CSSProperties =
    node.style === 'neutral'
      ? { color: 'var(--neutral-500)' }
      : node.style === 'blue'
        ? { color: 'var(--blue-700)', fontWeight: 700 }
        : { color: 'var(--orange-600)', fontWeight: 700 };

  const iconBg: React.CSSProperties =
    node.style === 'neutral'
      ? {
          background: 'var(--neutral-300)',
          color: 'var(--neutral-500)',
        }
      : node.style === 'blue'
        ? {
            background: 'var(--blue-100)',
            color: 'var(--blue-700)',
          }
        : {
            background: 'var(--orange-100)',
            color: 'var(--orange-600)',
          };

  return (
    <div style={cardStyle} className="flex flex-col gap-3 flex-1 min-w-0">
      {/* Phase label */}
      <div
        className="text-xs tracking-widest uppercase"
        style={phaseColor}
      >
        {node.phase} &nbsp;·&nbsp; {node.phaseZh}
      </div>

      {/* Icon circle */}
      <div
        className="flex items-center justify-center shrink-0"
        style={{
          ...iconBg,
          width: 40,
          height: 40,
          borderRadius: 'var(--radius-circle)',
        }}
      >
        <Icon name={node.icon} size={16} />
      </div>

      {/* Title */}
      <div
        className="text-sm font-bold"
        style={{ color: 'var(--neutral-900)' }}
      >
        {node.title}
      </div>

      {/* Description */}
      <div
        className="text-xs leading-relaxed"
        style={{ color: 'var(--neutral-500)' }}
      >
        {node.desc}
      </div>
    </div>
  );
}

interface PainpointRowProps {
  item: Painpoint;
}

function PainpointRow({ item }: PainpointRowProps): React.ReactElement {
  return (
    <div
      className="flex flex-col sm:flex-row rounded-r gap-x-4 gap-y-2 py-3 pr-4"
      style={{
        borderLeft: '3px solid var(--danger-500)',
        background: 'var(--neutral-0)',
        paddingLeft: '12px',
        borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
      }}
    >
      {/* Column A: icon + name */}
      <div className="flex items-center gap-2 shrink-0 sm:w-[130px]">
        <div
          className="flex items-center justify-center shrink-0"
          style={{
            background: 'var(--danger-50)',
            color: 'var(--danger-500)',
            width: 28,
            height: 28,
            borderRadius: 'var(--radius-circle)',
          }}
        >
          <Icon name={item.icon} size={14} />
        </div>
        <span
          className="text-sm font-bold whitespace-nowrap"
          style={{ color: 'var(--neutral-900)' }}
        >
          {item.name}
        </span>
      </div>

      {/* Column B: description */}
      <div
        className="flex-1 min-w-0 text-xs leading-relaxed self-center"
        style={{ color: 'var(--neutral-700)' }}
      >
        {item.desc}
      </div>

      {/* Column C: impact */}
      <div className="sm:w-[220px] shrink-0 text-xs leading-relaxed self-center">
        <span
          className="font-bold"
          style={{ color: 'var(--danger-500)' }}
        >
          影響：
        </span>
        <span style={{ color: 'var(--neutral-700)' }}>{item.impact}</span>
      </div>
    </div>
  );
}

/* -----------------------------------------------------------------------
   Main component
   ----------------------------------------------------------------------- */
export default function BackgroundPainpointEvolution(): React.ReactElement {
  return (
    <div className="not-prose w-full space-y-5">
      {/* ---- Row 1: Timeline ---- */}
      <div className="flex flex-col sm:flex-row items-stretch gap-2">
        {TIMELINE_NODES.map((node, idx) => (
          <React.Fragment key={node.phase}>
            <NodeCard node={node} />
            {idx < TIMELINE_NODES.length - 1 && (
              <div
                className="flex items-center justify-center shrink-0 sm:self-center rotate-90 sm:rotate-0"
                style={{ color: 'var(--neutral-400)' }}
              >
                <Icon name="chevron-right" size={20} />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ---- Row 2: Five painpoints ---- */}
      <div className="space-y-1">
        {/* Section header */}
        <div className="flex items-center gap-2 mb-3">
          <span style={{ color: 'var(--danger-500)' }}>
            <Icon name="alert-triangle" size={16} />
          </span>
          <span
            className="text-sm font-bold"
            style={{ color: 'var(--neutral-900)' }}
          >
            Notion 五大痛點 &mdash; 為何 Notion 不是終點
          </span>
          <span
            className="ml-auto text-xs px-3 py-0.5 shrink-0"
            style={{
              background: 'var(--danger-50)',
              color: 'var(--danger-500)',
              borderRadius: 'var(--radius-pill)',
            }}
          >
            現況問題
          </span>
        </div>

        {/* Painpoint rows */}
        <div className="space-y-1">
          {PAINPOINTS.map((item) => (
            <PainpointRow key={item.name} item={item} />
          ))}
        </div>
      </div>

      {/* ---- Row 3: Conclusion ---- */}
      <div
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
        style={{
          background: 'var(--blue-50)',
          borderLeft: '3px solid var(--blue-700)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
        }}
      >
        {/* Left: insight text */}
        <div
          className="flex items-start gap-2 flex-1 min-w-0 text-xs leading-relaxed"
          style={{ color: 'var(--neutral-700)' }}
        >
          <span
            className="mt-0.5 shrink-0"
            style={{ color: 'var(--blue-700)' }}
          >
            <Icon name="lightbulb" size={16} />
          </span>
          <p className="m-0">
            五大痛點皆源於 Notion 的
            <strong style={{ color: 'var(--blue-700)' }}>「工具天花板」</strong>
            ，需轉向具
            <strong style={{ color: 'var(--blue-700)' }}>RDB 複雜查詢</strong>
            與
            <strong style={{ color: 'var(--blue-700)' }}>Column-Level 權限控管</strong>
            的自建系統。
          </p>
        </div>

        {/* Right: status pill */}
        <div
          className="shrink-0 text-xs px-3 py-1"
          style={{
            background: 'var(--success-50)',
            color: 'var(--success-500)',
            border: '1px solid var(--success-500)',
            borderRadius: 'var(--radius-pill)',
            whiteSpace: 'nowrap',
          }}
        >
          規格已成熟 &middot; 可作開發藍本
        </div>
      </div>
    </div>
  );
}
