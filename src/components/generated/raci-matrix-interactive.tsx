import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Check, TriangleAlert } from 'lucide-react';
import clsx from 'clsx';

type RaciValue = 'R' | 'A' | 'C' | 'I' | 'AR';
type ColumnKey = 'pm' | 'po' | 'techLead' | 'qa';

interface RaciRow {
  id: string;
  label: string;
  desc: string;
  cells: Record<ColumnKey, RaciValue>;
}

const COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: 'pm', label: 'PM' },
  { key: 'po', label: 'PO' },
  { key: 'techLead', label: 'Tech Lead' },
  { key: 'qa', label: 'QA' },
];

const RACI_DATA: RaciRow[] = [
  {
    id: 'prd',
    label: 'PRD 撰寫',
    desc: '釐清需求範疇、撰寫產品需求文件，確定功能邊界與驗收標準。',
    cells: { pm: 'R', po: 'A', techLead: 'C', qa: 'I' },
  },
  {
    id: 'arch',
    label: '架構設計',
    desc: '評估技術選型、設計系統架構、確認可行性與非功能需求。',
    cells: { pm: 'I', po: 'I', techLead: 'AR', qa: 'C' },
  },
  {
    id: 'uat',
    label: 'UAT 驗收',
    desc: '以使用者角度執行驗收測試，確認功能符合需求文件定義。',
    cells: { pm: 'C', po: 'A', techLead: 'I', qa: 'R' },
  },
  {
    id: 'launch',
    label: '上線核准',
    desc: '綜合品質、商業風險、時機，做出上線與否的最終決策。',
    cells: { pm: 'C', po: 'A', techLead: 'R', qa: 'I' },
  },
];

const RACI_LABELS: Record<string, string> = {
  R: '執行者',
  A: '最終負責人',
  C: '被諮詢者',
  I: '需被通知者',
};

const LEGEND_ITEMS: { key: string; full: string; color: string }[] = [
  { key: 'R', full: 'Responsible 執行者', color: 'bg-blue-50 text-blue-700' },
  { key: 'A', full: 'Accountable 最終負責人', color: 'bg-orange-50 text-orange-500 font-bold' },
  { key: 'C', full: 'Consulted 被諮詢者', color: 'bg-neutral-100 text-neutral-700' },
  { key: 'I', full: 'Informed 需被通知者', color: 'bg-neutral-50 text-neutral-500 border border-neutral-200' },
];

function countA(row: RaciRow): number {
  return Object.values(row.cells).filter((v) => v === 'A' || v === 'AR').length;
}

function getAccountableLabels(row: RaciRow): string[] {
  return COLUMNS.filter((col) => {
    const v = row.cells[col.key];
    return v === 'A' || v === 'AR';
  }).map((col) => col.label);
}

interface BadgeProps {
  value: RaciValue;
  isActive: boolean;
  rowId: string;
  reducedMotion: boolean;
}

function RaciBadge({ value, isActive, rowId, reducedMotion }: BadgeProps) {
  const baseClass =
    'text-xs font-mono rounded-sm px-2 py-0.5 inline-block min-w-[1.5rem] text-center';

  const renderBadge = (v: 'R' | 'A' | 'C' | 'I') => {
    const colorClass = {
      R: 'bg-blue-50 text-blue-700',
      A: 'bg-orange-50 text-orange-500 font-bold',
      C: 'bg-neutral-100 text-neutral-700',
      I: 'bg-neutral-50 text-neutral-500 border border-neutral-200',
    }[v];

    if (v === 'A') {
      return (
        <motion.span
          key={`${rowId}-a-badge-${isActive ? 'active' : 'idle'}`}
          className={clsx(baseClass, colorClass)}
          animate={
            isActive && !reducedMotion
              ? { scale: [1, 1.15, 1] }
              : { scale: 1 }
          }
          transition={{
            duration: 0.3,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          A
        </motion.span>
      );
    }

    return <span className={clsx(baseClass, colorClass)}>{v}</span>;
  };

  if (value === 'AR') {
    return (
      <span className="inline-flex items-center gap-1">
        {renderBadge('A')}
        {renderBadge('R')}
      </span>
    );
  }

  return renderBadge(value);
}

interface ExpandedDetailProps {
  row: RaciRow;
}

function ExpandedDetail({ row }: ExpandedDetailProps) {
  const grouped: Partial<Record<'R' | 'A' | 'C' | 'I', string[]>> = {};
  for (const col of COLUMNS) {
    const v = row.cells[col.key];
    const keys: Array<'R' | 'A' | 'C' | 'I'> = v === 'AR' ? ['A', 'R'] : [v];
    for (const k of keys) {
      if (!grouped[k]) grouped[k] = [];
      grouped[k]!.push(col.label);
    }
  }

  const orderedKeys: Array<'A' | 'R' | 'C' | 'I'> = ['A', 'R', 'C', 'I'];

  return (
    <div className="bg-white border border-neutral-200 rounded-md p-4 shadow-xs mx-4 mb-3 mt-1">
      <p className="text-xs text-neutral-500 mb-3">{row.desc}</p>
      <div className="space-y-1">
        {orderedKeys.map((k) => {
          const roles = grouped[k];
          if (!roles || roles.length === 0) return null;
          return (
            <div key={k} className="flex items-baseline gap-2 text-sm">
              <span className="text-neutral-500 shrink-0 w-4 font-mono text-xs">{k}</span>
              <span className="text-neutral-500 shrink-0">{RACI_LABELS[k]}:</span>
              <span className="font-bold text-blue-700">{roles.join('、')}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function RaciMatrixInteractive() {
  const [activeRow, setActiveRow] = useState<string | null>(null);
  const prefersReduced = useReducedMotion() ?? false;

  const handleRowClick = (id: string) => {
    setActiveRow((prev) => (prev === id ? null : id));
  };

  const expandDuration = prefersReduced ? 0 : 0.2;

  return (
    <div className="overflow-x-auto">
      <div className="bg-white rounded-lg shadow-sm overflow-hidden min-w-[540px]">
        {/* Legend */}
        <div className="flex flex-wrap gap-3 px-4 py-3 border-b border-neutral-200">
          {LEGEND_ITEMS.map((item) => (
            <span
              key={item.key}
              className={clsx(
                'text-xs px-2 py-0.5 rounded-sm inline-flex items-center gap-1',
                item.color
              )}
            >
              <span className="font-mono font-bold">{item.key}</span>
              <span className="text-neutral-500">{item.full}</span>
            </span>
          ))}
        </div>

        {/* Table */}
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200">
              <th className="text-left text-xs font-bold text-neutral-500 tracking-wider uppercase px-4 py-3 w-1/3">
                任務
              </th>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className="text-center text-xs font-bold text-neutral-500 tracking-wider uppercase px-4 py-3"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RACI_DATA.map((row, idx) => {
              const isActive = activeRow === row.id;
              return (
                <>
                  <tr
                    key={row.id}
                    onClick={() => handleRowClick(row.id)}
                    onMouseEnter={() => {
                      if (!isActive) {
                        /* visual feedback via CSS hover only */
                      }
                    }}
                    className={clsx(
                      'cursor-pointer transition-colors duration-150',
                      isActive
                        ? 'bg-blue-50'
                        : idx % 2 === 1
                        ? 'bg-neutral-50 hover:bg-blue-50'
                        : 'bg-white hover:bg-blue-50'
                    )}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-neutral-700">
                      {row.label}
                    </td>
                    {COLUMNS.map((col) => (
                      <td key={col.key} className="px-4 py-3 text-center">
                        <RaciBadge
                          value={row.cells[col.key]}
                          isActive={isActive}
                          rowId={row.id}
                          reducedMotion={prefersReduced}
                        />
                      </td>
                    ))}
                  </tr>
                  <AnimatePresence>
                    {isActive && (
                      <tr key={`${row.id}-detail`}>
                        <td colSpan={5} className="p-0">
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: expandDuration, ease: 'easeOut' }}
                            style={{ overflow: 'hidden' }}
                          >
                            <ExpandedDetail row={row} />
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </>
              );
            })}
          </tbody>
        </table>

        {/* A Uniqueness Health Check Panel */}
        <div className="bg-neutral-50 border-t border-neutral-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <TriangleAlert size={16} className="text-orange-500 shrink-0" />
            <span className="text-sm font-bold text-neutral-700">A 唯一性健檢</span>
          </div>

          <div className="space-y-1.5 mb-3">
            {RACI_DATA.map((row) => {
              const aCount = countA(row);
              const accountables = getAccountableLabels(row);
              const isOk = aCount === 1;

              return (
                <div key={row.id} className="flex items-center gap-2">
                  {isOk ? (
                    <Check size={14} className="text-green-600 shrink-0" />
                  ) : (
                    <TriangleAlert size={14} className="text-red-500 shrink-0" />
                  )}
                  <span
                    className={clsx(
                      'text-xs',
                      isOk ? 'text-green-700' : 'text-red-600'
                    )}
                  >
                    {row.label}
                    {isOk ? (
                      <>
                        {' '}—{' '}
                        <span className="font-medium">
                          A: {accountables.join('、')}
                        </span>
                      </>
                    ) : (
                      <>
                        {' '}— 警告：有 {aCount} 個 A（
                        {accountables.join('、')}），責任已被稀釋
                      </>
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-start gap-2">
            <TriangleAlert size={14} className="text-orange-500 shrink-0 mt-0.5" />
            <p className="text-xs text-neutral-500">
              若一列出現兩個 A，責任被稀釋——出事時沒有明確的最終負責人，容易陷入互踢皮球的困境。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
