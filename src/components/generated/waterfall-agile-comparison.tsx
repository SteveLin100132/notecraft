import React from 'react';
import {
  PackageCheck,
  RefreshCw,
  Lock,
  Repeat,
  FileText,
  FileCheck,
  CalendarClock,
  RotateCcw,
  Milestone,
  MessageCircle,
  Building2,
  Rocket,
} from 'lucide-react';

type RowDef = {
  aspect: string;
  waterfall: {
    Icon: React.ElementType;
    iconClass: string;
    title: string;
    description: string;
  };
  agile: {
    Icon: React.ElementType;
    iconClass: string;
    title: string;
    description: string;
  };
};

const rows: RowDef[] = [
  {
    aspect: '交付方式',
    waterfall: {
      Icon: PackageCheck,
      iconClass: 'text-blue-700',
      title: '階段一次性交付',
      description: '完成所有階段後，在專案末期一次性交付成品。',
    },
    agile: {
      Icon: RefreshCw,
      iconClass: 'text-orange-500',
      title: '迭代增量交付',
      description: '每個 Sprint 結束都有可交付的增量版本，持續累積價值。',
    },
  },
  {
    aspect: '需求變更',
    waterfall: {
      Icon: Lock,
      iconClass: 'text-red-500',
      title: '成本高、抗拒變更',
      description: '需求在前期凍結，後期變更代價極高，往往被視為風險。',
    },
    agile: {
      Icon: Repeat,
      iconClass: 'text-green-600',
      title: '成本低、擁抱變化',
      description: '每次迭代前都可調整優先順序，變更是輸入而非阻礙。',
    },
  },
  {
    aspect: '文件',
    waterfall: {
      Icon: FileText,
      iconClass: 'text-blue-700',
      title: '前期齊全、文件驅動',
      description: '進入開發前須完成完整的需求規格、設計文件與驗收標準。',
    },
    agile: {
      Icon: FileCheck,
      iconClass: 'text-orange-500',
      title: '精簡夠用即可',
      description: '文件隨進度漸進補齊，以「夠用」為原則，不追求完備。',
    },
  },
  {
    aspect: '規劃時機',
    waterfall: {
      Icon: CalendarClock,
      iconClass: 'text-blue-700',
      title: '前期規劃重、一次定案',
      description: '專案初期投入大量資源做完整規劃，計畫一旦核准即難以更動。',
    },
    agile: {
      Icon: RotateCcw,
      iconClass: 'text-orange-500',
      title: '持續滾動、隨迭代調整',
      description: '計畫是活的，每個 Sprint 前都重新排列待辦事項的優先順序。',
    },
  },
  {
    aspect: '溝通反饋',
    waterfall: {
      Icon: Milestone,
      iconClass: 'text-blue-700',
      title: '里程碑階段審查',
      description: '利害關係人僅在特定里程碑節點審查進度，反饋週期長。',
    },
    agile: {
      Icon: MessageCircle,
      iconClass: 'text-orange-500',
      title: '高頻、持續反饋',
      description: 'Daily Standup、Sprint Review 讓反饋在數天內形成閉環。',
    },
  },
  {
    aspect: '適用情境',
    waterfall: {
      Icon: Building2,
      iconClass: 'text-blue-700',
      title: '需求穩定 / 合規導向',
      description: '政府標案、ERP 導入、金融核心系統——需求清晰且不易變動的場域。',
    },
    agile: {
      Icon: Rocket,
      iconClass: 'text-orange-500',
      title: '需求不明 / 快速試錯',
      description: '消費型 App、SaaS 產品——市場反饋是最重要的設計輸入。',
    },
  },
];

export default function WaterfallAgileComparison() {
  return (
    <figure className="my-6">
      <figcaption className="mb-3 text-center">
        <p className="text-base font-bold text-neutral-900">瀑布式 vs 敏捷開發：核心差異對照</p>
        <p className="mt-1 text-sm text-neutral-500">
          兩種方法論對「變更」的根本態度相反——一個視變更為威脅，一個視變更為原料。
        </p>
      </figcaption>

      <div className="overflow-x-auto rounded-lg shadow-md">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-24 bg-neutral-100 px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                面向
              </th>
              <th className="bg-blue-700 px-4 py-3 text-left text-sm font-bold text-white">
                Waterfall 瀑布
              </th>
              <th className="bg-orange-500 px-4 py-3 text-left text-sm font-bold text-white">
                Agile 敏捷
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.aspect} className={index % 2 === 0 ? 'bg-white' : 'bg-neutral-100'}>
                <td className="px-4 py-4 align-top">
                  <span className="text-sm font-medium text-neutral-500">{row.aspect}</span>
                </td>

                <td className="px-4 py-4 align-top">
                  <div className="flex items-start gap-2">
                    <row.waterfall.Icon
                      size={16}
                      className={`mt-0.5 shrink-0 ${row.waterfall.iconClass}`}
                    />
                    <div>
                      <p className="font-semibold text-neutral-900">{row.waterfall.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">
                        {row.waterfall.description}
                      </p>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-4 align-top">
                  <div className="flex items-start gap-2">
                    <row.agile.Icon
                      size={16}
                      className={`mt-0.5 shrink-0 ${row.agile.iconClass}`}
                    />
                    <div>
                      <p className="font-semibold text-neutral-900">{row.agile.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">
                        {row.agile.description}
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
