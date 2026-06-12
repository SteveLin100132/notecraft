import { Shield, Terminal, FileText, Package, GitBranch } from 'lucide-react';

interface Row {
  icon: React.ReactNode;
  name: string;
  trigger: string;
  purpose: string;
  highlight?: boolean;
  badge?: string;
}

const rows: Row[] = [
  {
    icon: <Shield size={16} className="text-blue-700 shrink-0" />,
    name: 'Hook',
    trigger: 'Claude Code 引擎（事件）',
    purpose: '機械式動作、守門',
    highlight: true,
  },
  {
    icon: <Terminal size={16} className="text-orange-500 shrink-0" />,
    name: 'Slash command',
    trigger: '使用者或 AI 主動呼叫',
    purpose: '可帶參數的工具',
  },
  {
    icon: <FileText size={16} className="text-neutral-500 shrink-0" />,
    name: 'CLAUDE.md',
    trigger: 'AI 每次讀（advisory）',
    purpose: '行為指引、SOP',
  },
  {
    icon: <Package size={16} className="text-neutral-400 shrink-0" />,
    name: 'Skill',
    trigger: 'AI 依需要載入',
    purpose: '給 AI 用的知識/工具集',
  },
  {
    icon: <GitBranch size={16} className="text-neutral-400 shrink-0" />,
    name: 'Git hook',
    trigger: 'Git 觸發（commit/push 時）',
    purpose: '跟 Claude Code 無關',
    badge: '與 Claude 無關',
  },
];

export default function MechanismComparisonTable() {
  return (
    <figure className="not-prose my-6">
      <figcaption className="text-xs text-neutral-400 mb-2">機制對照</figcaption>
      <div className="overflow-x-auto">
        <div className="rounded-xl overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-blue-700 text-white">
                <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide">機制</th>
                <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide">誰觸發</th>
                <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide">做什麼</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={row.name}
                  className={[
                    index % 2 === 0 ? 'bg-white' : 'bg-neutral-50',
                    'hover:bg-blue-50 transition-colors',
                    row.highlight ? 'border-l-2 border-blue-700' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <td className="px-4 py-3 text-neutral-700">
                    <span className="flex items-center gap-2">
                      {row.icon}
                      <span className="font-medium text-neutral-800">{row.name}</span>
                      {row.badge !== undefined && (
                        <span className="bg-neutral-100 text-neutral-500 text-[11px] rounded-full px-2 py-0.5">
                          {row.badge}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-700">{row.trigger}</td>
                  <td className="px-4 py-3 text-neutral-700">{row.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </figure>
  );
}
