import { Check, Ban, ShieldCheck, ClipboardCheck, ArrowRight } from 'lucide-react';

interface RoleColumn {
  key: 'tech-lead' | 'qa';
  label: string;
  scope: string;
  icon: React.ReactNode;
  accent: string;
  accentBg: string;
  accentBgSoft: string;
  accentBorder: string;
  duties: { title: string; hint?: string }[];
  notDoing: string;
}

const columns: RoleColumn[] = [
  {
    key: 'tech-lead',
    label: 'tech-lead',
    scope: 'Code Review（架構 / 設計層）',
    icon: <ShieldCheck size={20} />,
    accent: '#1b4f9c',
    accentBg: '#1b4f9c',
    accentBgSoft: '#eef4fb',
    accentBorder: '#adc8e8',
    duties: [
      { title: '分層、SOLID、命名' },
      { title: 'JSDoc、檔案位置' },
      { title: 'DTO + class-validator' },
      { title: 'Design Token 引用', hint: '禁止寫死色值 / 尺寸' },
      { title: '是否符合 design.md / Spec' },
    ],
    notDoing: 'Scenario 驗收',
  },
  {
    key: 'qa',
    label: 'qa',
    scope: '驗收審查（review）',
    icon: <ClipboardCheck size={20} />,
    accent: '#2a76ad',
    accentBg: '#2a76ad',
    accentBgSoft: '#f0f7fd',
    accentBorder: '#4aa3d6',
    duties: [
      { title: '對照 spec 每個 Scenario', hint: 'Given / When / Then' },
      { title: 'E2E（Playwright）' },
      { title: '跨模組整合 + 回歸' },
      { title: 'Migration up / down 實跑' },
      { title: '啟動冒煙 + 確認 DoD 滿足' },
    ],
    notDoing: 'Code Review',
  },
];

function RoleCard({ col }: { col: RoleColumn }) {
  return (
    <div className="flex-1 rounded-2xl border border-[#e1e6ee] bg-white overflow-hidden flex flex-col">
      {/* Header band */}
      <div
        className="px-4 py-3 flex items-center gap-2.5 text-white"
        style={{ background: col.accentBg }}
      >
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/15">
          {col.icon}
        </span>
        <div>
          <div className="text-[10.5px] font-semibold tracking-widest uppercase opacity-80">
            {col.scope}
          </div>
          <div className="text-lg font-black leading-tight">{col.label}</div>
        </div>
      </div>

      {/* 負責 */}
      <div className="p-4 space-y-2.5 flex-1">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-flex items-center justify-center w-5 h-5 rounded-full"
            style={{ background: '#e7f6ee' }}
          >
            <Check size={12} className="text-[#2e9e6b]" />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#2e9e6b]">
            負責
          </span>
        </div>
        <ul className="space-y-1.5">
          {col.duties.map((d) => (
            <li
              key={d.title}
              className="flex items-start gap-2 rounded-lg px-2.5 py-1.5 border"
              style={{ borderColor: col.accentBorder, background: col.accentBgSoft }}
            >
              <Check
                size={13}
                className="mt-0.5 flex-shrink-0 text-[#2e9e6b]"
                strokeWidth={2.5}
              />
              <div className="text-sm leading-snug" style={{ color: col.accent }}>
                <span className="font-semibold">{d.title}</span>
                {d.hint && (
                  <span className="block text-[11px] font-normal text-[#6c798e] mt-0.5">
                    {d.hint}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* 不做 */}
      <div className="border-t border-dashed border-[#cbd3df] bg-[#f6f8fb] px-4 py-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#eef1f6]">
            <Ban size={11} className="text-[#6c798e]" />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6c798e]">
            不做
          </span>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[#cbd3df] bg-white px-3 py-1">
          <Ban size={11} className="text-[#9aa6b8]" />
          <span className="text-sm font-semibold text-[#9aa6b8] line-through decoration-[1.5px] decoration-[#9aa6b8]">
            {col.notDoing}
          </span>
        </div>
        <p className="text-[10.5px] text-[#6c798e] mt-1.5 leading-relaxed">
          留給另一角色，避免互相取代
        </p>
      </div>
    </div>
  );
}

export default function SddReviewBoundary() {
  return (
    <div className="not-prose max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck size={16} className="text-[#1b4f9c]" />
          <span className="text-[11px] font-semibold tracking-widest uppercase text-[#4f5b6e]">
            審查職責分工
          </span>
        </div>
        <p className="text-sm text-[#4f5b6e] leading-relaxed">
          這條邊界由<strong className="text-[#1b4f9c]">「不做什麼」</strong>定義：tech-lead 不做 Scenario 驗收、qa 不做 Code Review。
        </p>
      </div>

      {/* Cards + divider */}
      <div className="relative flex flex-col md:flex-row gap-4 md:gap-0">
        <RoleCard col={columns[0]} />
        <div className="hidden md:flex items-center justify-center w-6 flex-shrink-0 relative">
          <div className="absolute inset-y-4 left-1/2 -translate-x-1/2 border-l border-dashed border-[#adc8e8]" />
          <span className="relative z-[1] bg-white px-1 py-1 text-[10px] font-bold tracking-widest uppercase text-[#adc8e8] rotate-90">
            邊界
          </span>
        </div>
        <RoleCard col={columns[1]} />
      </div>

      {/* Sequence footer */}
      <div className="rounded-2xl border border-[#e1e6ee] bg-[#f6f8fb] px-4 py-3 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#4f5b6e]">
          順序
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[#1b4f9c] rounded-full px-3 py-1">
          <ShieldCheck size={12} /> tech-lead Code Review
        </span>
        <ArrowRight size={16} className="text-[#6c798e]" />
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[#2a76ad] rounded-full px-3 py-1">
          <ClipboardCheck size={12} /> qa 驗收
        </span>
        <span className="text-xs text-[#4f5b6e] ml-1">
          互補不取代
        </span>
      </div>
    </div>
  );
}
