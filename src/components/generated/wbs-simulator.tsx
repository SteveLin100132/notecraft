import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ChevronRight,
  ChevronDown,
  Check,
  TriangleAlert,
  Trash2,
  CalendarDays,
} from 'lucide-react';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WBSNode {
  id: string;
  label: string;
  hours?: number;
  children?: WBSNode[];
}

type HourStatus = 'short' | 'ok' | 'long';

interface VisibleRow {
  node: WBSNode;
  depth: number;
  isLeaf: boolean;
}

// ---------------------------------------------------------------------------
// Default data — e-commerce website WBS
// ---------------------------------------------------------------------------

const DEFAULT_TREE: WBSNode[] = [
  {
    id: 'root',
    label: '電商網站專案',
    children: [
      {
        id: 'req',
        label: '需求與規劃',
        children: [
          { id: 'req-interview', label: '需求訪談', hours: 4 },
          { id: 'req-spec', label: '功能規格書', hours: 24 },
        ],
      },
      {
        id: 'design',
        label: '設計',
        children: [
          { id: 'design-wireframe', label: 'UX 線框稿', hours: 40 },
          { id: 'design-visual', label: 'UI 視覺稿', hours: 48 },
        ],
      },
      {
        id: 'dev',
        label: '開發',
        children: [
          { id: 'dev-frontend', label: '前端開發', hours: 80 },
          { id: 'dev-backend', label: '後端 API', hours: 72 },
          { id: 'dev-db', label: '資料庫設計', hours: 100 },
        ],
      },
      {
        id: 'test',
        label: '測試',
        children: [
          { id: 'test-func', label: '功能測試', hours: 32 },
          { id: 'test-uat', label: 'UAT 驗收', hours: 16 },
        ],
      },
      {
        id: 'launch',
        label: '上線',
        children: [
          { id: 'launch-deploy', label: '環境部署', hours: 16 },
          { id: 'launch-monitor', label: '上線後監控', hours: 8 },
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Default PIC names
// ---------------------------------------------------------------------------

const DEFAULT_PICS = ['陳建宏', '林雅婷', '王志明', '黃淑芬', '張偉傑'];

// ---------------------------------------------------------------------------
// Gantt constants
// ---------------------------------------------------------------------------

const BASE_DATE = '2026-06-15';
const DAY_PX = 28;
const ROW_H = 44;
const HEAD_H = 32;

// ---------------------------------------------------------------------------
// Date utilities
// ---------------------------------------------------------------------------

function parseDate(s: string): { y: number; m: number; d: number } {
  const parts = s.split('-');
  return { y: parseInt(parts[0], 10), m: parseInt(parts[1], 10), d: parseInt(parts[2], 10) };
}

function fmtDate(date: { y: number; m: number; d: number }): string {
  const mm = String(date.m).padStart(2, '0');
  const dd = String(date.d).padStart(2, '0');
  return `${date.y}-${mm}-${dd}`;
}

function addDays(s: string, n: number): string {
  const { y, m, d } = parseDate(s);
  const ms = Date.UTC(y, m - 1, d) + n * 86400000;
  const dt = new Date(ms);
  return fmtDate({ y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() });
}

function diffDays(a: string, b: string): number {
  const pa = parseDate(a);
  const pb = parseDate(b);
  const msA = Date.UTC(pa.y, pa.m - 1, pa.d);
  const msB = Date.UTC(pb.y, pb.m - 1, pb.d);
  return Math.round((msB - msA) / 86400000);
}

function hoursToDays(h: number): number {
  return Math.max(1, Math.ceil(h / 8));
}

function calcEnd(start: string, h: number): string {
  return addDays(start, hoursToDays(h) - 1);
}

function fmtMD(s: string): string {
  const { m, d } = parseDate(s);
  return `${m}/${d}`;
}

// ---------------------------------------------------------------------------
// Tree helpers
// ---------------------------------------------------------------------------

function collectIds(nodes: WBSNode[]): string[] {
  const ids: string[] = [];
  function walk(node: WBSNode) {
    ids.push(node.id);
    node.children?.forEach(walk);
  }
  nodes.forEach(walk);
  return ids;
}

function collectLeafDefaults(nodes: WBSNode[]): Record<string, number> {
  const map: Record<string, number> = {};
  function walk(node: WBSNode) {
    if (!node.children || node.children.length === 0) {
      map[node.id] = node.hours ?? 8;
    }
    node.children?.forEach(walk);
  }
  nodes.forEach(walk);
  return map;
}

function collectLeafPics(nodes: WBSNode[]): Record<string, string> {
  const map: Record<string, string> = {};
  let idx = 0;
  function walk(node: WBSNode) {
    if (!node.children || node.children.length === 0) {
      map[node.id] = DEFAULT_PICS[idx % DEFAULT_PICS.length];
      idx++;
    }
    node.children?.forEach(walk);
  }
  nodes.forEach(walk);
  return map;
}

interface LeafInfo {
  id: string;
  parentId: string;
  hours: number;
}

function collectLeafInfos(nodes: WBSNode[]): LeafInfo[] {
  const infos: LeafInfo[] = [];
  function walk(node: WBSNode, parentId: string) {
    if (!node.children || node.children.length === 0) {
      infos.push({ id: node.id, parentId, hours: node.hours ?? 8 });
    } else {
      node.children.forEach((c) => walk(c, node.id));
    }
  }
  nodes.forEach((n) => walk(n, n.id));
  return infos;
}

function collectLeafStarts(nodes: WBSNode[], leafHours: Record<string, number>): Record<string, string> {
  const infos = collectLeafInfos(nodes);
  const result: Record<string, string> = {};

  const groups: { parentId: string; leaves: LeafInfo[] }[] = [];
  const parentOrder: string[] = [];
  for (const info of infos) {
    if (!parentOrder.includes(info.parentId)) {
      parentOrder.push(info.parentId);
      groups.push({ parentId: info.parentId, leaves: [] });
    }
    groups[parentOrder.indexOf(info.parentId)].leaves.push(info);
  }

  let groupStart = BASE_DATE;
  for (const group of groups) {
    let leafStart = groupStart;
    let groupEnd = groupStart;
    for (const leaf of group.leaves) {
      const h = leafHours[leaf.id] ?? leaf.hours;
      result[leaf.id] = leafStart;
      const end = calcEnd(leafStart, h);
      if (diffDays(groupEnd, end) > 0) groupEnd = end;
      leafStart = addDays(end, 1);
    }
    groupStart = addDays(groupEnd, 1);
  }
  return result;
}

function collectLeaves(nodes: WBSNode[]): WBSNode[] {
  const leaves: WBSNode[] = [];
  function walk(node: WBSNode) {
    if (!node.children || node.children.length === 0) {
      leaves.push(node);
    } else {
      node.children.forEach(walk);
    }
  }
  nodes.forEach(walk);
  return leaves;
}

// ---------------------------------------------------------------------------
// Hour status helper
// ---------------------------------------------------------------------------

function hourStatus(h: number): HourStatus {
  if (h < 8) return 'short';
  if (h > 80) return 'long';
  return 'ok';
}

// ---------------------------------------------------------------------------
// Recursive sum (ignores deleted)
// ---------------------------------------------------------------------------

function sumHours(node: WBSNode, hours: Record<string, number>, deleted: Set<string>): number {
  if (!node.children || node.children.length === 0) {
    if (deleted.has(node.id)) return 0;
    return hours[node.id] ?? 0;
  }
  return node.children.reduce((acc, child) => acc + sumHours(child, hours, deleted), 0);
}

// ---------------------------------------------------------------------------
// Collect all visible descendant leaves of a parent node (not deleted)
// ---------------------------------------------------------------------------

function collectDescendantLeaves(
  node: WBSNode,
  deleted: Set<string>,
): WBSNode[] {
  if (deleted.has(node.id)) return [];
  if (!node.children || node.children.length === 0) return [node];
  return node.children.flatMap((c) => collectDescendantLeaves(c, deleted));
}

// ---------------------------------------------------------------------------
// Flatten tree into visible rows
// ---------------------------------------------------------------------------

function flattenVisible(
  nodes: WBSNode[],
  expanded: Set<string>,
  deleted: Set<string>,
): VisibleRow[] {
  const rows: VisibleRow[] = [];
  function walk(node: WBSNode, depth: number) {
    if (deleted.has(node.id)) return;
    const isLeaf = !node.children || node.children.length === 0;
    rows.push({ node, depth, isLeaf });
    if (!isLeaf && expanded.has(node.id)) {
      node.children!.forEach((c) => walk(c, depth + 1));
    }
  }
  nodes.forEach((n) => walk(n, 0));
  return rows;
}

// ---------------------------------------------------------------------------
// Leaf-level HourInput with internal state for raw input string
// ---------------------------------------------------------------------------

interface HourCellProps {
  id: string;
  value: number;
  onChange: (id: string, v: number) => void;
}

function HourCell({ id, value, onChange }: HourCellProps) {
  const [inputVal, setInputVal] = useState<string>(String(value));

  // sync external value when it changes from outside
  useEffect(() => {
    setInputVal(String(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInputVal(raw);
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      onChange(id, parsed);
    }
  };

  const handleBlur = () => {
    const parsed = parseInt(inputVal, 10);
    if (isNaN(parsed) || parsed < 0) {
      setInputVal(String(value));
    } else {
      setInputVal(String(parsed));
    }
  };

  return (
    <div className="flex items-center gap-0.5">
      <input
        type="number"
        min={0}
        value={inputVal}
        onChange={handleChange}
        onBlur={handleBlur}
        className="w-12 text-center text-xs border border-neutral-300 rounded-md py-0.5 focus:border-blue-500 focus:outline-none text-neutral-700"
        aria-label={`工時輸入：${id}`}
      />
      <span className="text-[10px] text-neutral-400">h</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tooltip content by status
// ---------------------------------------------------------------------------

function tooltipText(status: HourStatus, h: number): string {
  if (status === 'short') {
    return `工時 ${h} h 低於 8 小時：拆得太細，管理成本可能超過產出價值，建議與相鄰工作包合併。`;
  }
  if (status === 'long') {
    return `工時 ${h} h 高於 80 小時：顆粒太大，風險被掩蓋、難估時追蹤，建議再向下拆解。`;
  }
  return `工時 ${h} h 落在 8～80 小時：粒度合理，能由一位負責人扛起且驗收標準明確。`;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function WbsSimulator() {
  const reduced = useReducedMotion() ?? false;

  const allIds = useMemo(() => collectIds(DEFAULT_TREE), []);
  const leafDefaults = useMemo(() => collectLeafDefaults(DEFAULT_TREE), []);
  const initialPics = useMemo(() => collectLeafPics(DEFAULT_TREE), []);
  const initialStarts = useMemo(() => collectLeafStarts(DEFAULT_TREE, leafDefaults), [leafDefaults]);

  const [expanded, setExpanded] = useState<Set<string>>(new Set(allIds));
  const [hours, setHours] = useState<Record<string, number>>(leafDefaults);
  const [deleted, setDeleted] = useState<Set<string>>(new Set<string>());
  const [pics, setPics] = useState<Record<string, string>>(initialPics);
  const [starts, setStarts] = useState<Record<string, string>>(initialStarts);
  const [openTooltipId, setOpenTooltipId] = useState<string | null>(null);

  // ref map for tooltip/icon elements, for outside-click detection
  const tooltipRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // close tooltip on outside click
  useEffect(() => {
    if (openTooltipId === null) return;
    const handleClick = (e: MouseEvent) => {
      const ref = tooltipRefs.current.get(openTooltipId);
      if (ref && !ref.contains(e.target as Node)) {
        setOpenTooltipId(null);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [openTooltipId]);

  const handleToggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleHourChange = useCallback((id: string, v: number) => {
    setHours((prev) => ({ ...prev, [id]: v }));
  }, []);

  const handleDelete = useCallback((id: string) => {
    setDeleted((prev) => new Set(prev).add(id));
  }, []);

  const handlePicChange = useCallback((id: string, pic: string) => {
    setPics((prev) => ({ ...prev, [id]: pic }));
  }, []);

  const handleStartChange = useCallback((id: string, val: string) => {
    if (val) setStarts((prev) => ({ ...prev, [id]: val }));
  }, []);

  // Flatten visible rows
  const visibleRows = useMemo(
    () => flattenVisible(DEFAULT_TREE, expanded, deleted),
    [expanded, deleted],
  );

  // All leaves (tree order)
  const allLeaves = useMemo(() => collectLeaves(DEFAULT_TREE), []);

  // Active leaves
  const activeLeaves = useMemo(
    () => allLeaves.filter((l) => !deleted.has(l.id)),
    [allLeaves, deleted],
  );

  // Total hours
  const totalHours = useMemo(
    () => DEFAULT_TREE.reduce((acc, n) => acc + sumHours(n, hours, deleted), 0),
    [hours, deleted],
  );

  const deletedCount = deleted.size;

  // Gantt bounds derived from active leaves
  const { minDate, totalDays } = useMemo(() => {
    if (activeLeaves.length === 0) {
      return { minDate: BASE_DATE, maxDate: BASE_DATE, totalDays: 30 };
    }
    let mn = starts[activeLeaves[0].id] ?? BASE_DATE;
    let mx = calcEnd(mn, hours[activeLeaves[0].id] ?? 8);
    for (const leaf of activeLeaves) {
      const s = starts[leaf.id] ?? BASE_DATE;
      const e = calcEnd(s, hours[leaf.id] ?? 8);
      if (s < mn) mn = s;
      if (e > mx) mx = e;
    }
    const td = diffDays(mn, mx) + 1;
    return { minDate: mn, maxDate: mx, totalDays: Math.max(td, 14) };
  }, [activeLeaves, starts, hours]);

  // Tick step
  const tickStep = totalDays <= 30 ? 3 : 7;
  const ticks = useMemo(() => {
    const arr: { label: string; offset: number }[] = [];
    for (let i = 0; i < totalDays; i += tickStep) {
      arr.push({ label: fmtMD(addDays(minDate, i)), offset: i });
    }
    return arr;
  }, [totalDays, tickStep, minDate]);

  const barColor = (status: HourStatus) => {
    if (status === 'short') return 'bg-amber-400';
    if (status === 'long') return 'bg-red-400';
    return 'bg-emerald-500';
  };

  const ganttWidth = totalDays * DAY_PX;

  // Empty state
  const isEmpty = activeLeaves.length === 0;

  return (
    <div className="not-prose max-w-5xl mx-auto space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-neutral-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-blue-100 border border-blue-300" />
          <span>
            <span className="font-medium text-blue-700">彙總節點</span>：唯讀，顯示子工作包工時加總
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-neutral-100 border border-neutral-300" />
          <span>
            <span className="font-medium text-neutral-700">工作包</span>：可估時、可刪除（刪除即移出範圍）
          </span>
        </span>
      </div>

      {/* Integrated Gantt table */}
      <div className="rounded-lg border border-neutral-200">
        <div className="flex">
          {/* ---- Left frozen panel ---- */}
          <div className="shrink-0 border-r border-neutral-200" style={{ width: '568px' }}>
            {/* Table header */}
            <div
              className="flex items-center bg-neutral-50 border-b border-neutral-200 text-xs text-neutral-400"
              style={{ height: `${HEAD_H}px` }}
            >
              <div className="w-56 shrink-0 px-2 font-medium">工作項目</div>
              <div className="w-24 px-1 font-medium shrink-0">PIC</div>
              <div className="w-20 px-1 font-medium shrink-0">工時</div>
              <div className="w-32 px-1 font-medium shrink-0">開始日期</div>
              <div className="w-10 shrink-0" />
            </div>

            {/* Rows */}
            {isEmpty ? (
              <div
                className="flex flex-col items-center justify-center gap-2 text-neutral-400"
                style={{ height: `${ROW_H * 3}px` }}
              >
                <CalendarDays size={24} />
                <span className="text-sm">尚無未刪除的工作包</span>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {visibleRows.map(({ node, depth, isLeaf }) => {
                  const isExpanded = expanded.has(node.id);
                  const h = isLeaf ? (hours[node.id] ?? 8) : 0;
                  const status = isLeaf ? hourStatus(h) : 'ok';
                  const nodeSum = !isLeaf ? sumHours(node, hours, deleted) : 0;
                  const isTooltipOpen = openTooltipId === node.id;

                  return (
                    <motion.div
                      key={node.id}
                      initial={reduced ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, transition: { duration: reduced ? 0 : 0.15 } }}
                      className="flex items-center border-b border-neutral-100 hover:bg-neutral-50"
                      style={{ height: `${ROW_H}px` }}
                    >
                      {/* Main name column — fixed w-56 to match header */}
                      <div
                        className="w-56 shrink-0 flex items-center gap-1 min-w-0 pr-1"
                        style={{ paddingLeft: `${depth * 16 + 8}px` }}
                      >
                        {/* Expand/collapse chevron */}
                        {!isLeaf ? (
                          <button
                            onClick={() => handleToggle(node.id)}
                            className="text-neutral-400 hover:text-neutral-600 transition-colors shrink-0"
                            aria-label={isExpanded ? '收合' : '展開'}
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        ) : (
                          <span className="w-4 shrink-0" />
                        )}

                        {/* Status icon + tooltip (leaf only) */}
                        {isLeaf && (
                          <div
                            className="relative shrink-0"
                            ref={(el) => {
                              if (el) tooltipRefs.current.set(node.id, el);
                              else tooltipRefs.current.delete(node.id);
                            }}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenTooltipId(isTooltipOpen ? null : node.id);
                              }}
                              aria-label={
                                status === 'ok'
                                  ? '工時合理'
                                  : status === 'short'
                                  ? '工時過短'
                                  : '工時過長'
                              }
                              className={clsx(
                                'flex items-center justify-center w-5 h-5 rounded',
                                status === 'ok' && 'text-emerald-500 hover:bg-emerald-50',
                                status === 'short' && 'text-amber-500 hover:bg-amber-50',
                                status === 'long' && 'text-red-500 hover:bg-red-50',
                              )}
                            >
                              {status === 'ok' ? (
                                <Check size={14} />
                              ) : (
                                <TriangleAlert size={14} />
                              )}
                            </button>

                            {/* Tooltip */}
                            {isTooltipOpen && (
                              <div
                                role="tooltip"
                                className="absolute left-0 top-full mt-1 z-30 w-60 bg-white border border-neutral-200 shadow-md rounded-md px-3 py-2 text-xs text-neutral-600"
                              >
                                {tooltipText(status, h)}
                              </div>
                            )}
                          </div>
                        )}
                        {!isLeaf && <span className="w-5 shrink-0" />}

                        {/* Name label */}
                        <span
                          className={clsx(
                            'flex-1 truncate',
                            isLeaf
                              ? 'text-sm text-neutral-700'
                              : 'text-sm font-semibold text-blue-700',
                          )}
                          title={node.label}
                        >
                          {node.label}
                        </span>
                      </div>

                      {/* PIC column */}
                      <div className="w-24 px-1 shrink-0">
                        {isLeaf ? (
                          <input
                            type="text"
                            value={pics[node.id] ?? ''}
                            onChange={(e) => handlePicChange(node.id, e.target.value)}
                            className="w-full text-xs border border-neutral-300 rounded-md px-2 py-0.5 focus:border-blue-500 focus:outline-none text-neutral-700"
                            placeholder="負責人"
                            aria-label={`負責人：${node.id}`}
                          />
                        ) : null}
                      </div>

                      {/* Hours column */}
                      <div className="w-20 px-1 shrink-0 flex items-center">
                        {isLeaf ? (
                          <HourCell id={node.id} value={h} onChange={handleHourChange} />
                        ) : (
                          <span className="text-xs bg-neutral-100 text-neutral-500 rounded-full px-2 py-0.5 font-mono whitespace-nowrap">
                            {'Σ'} {nodeSum} h
                          </span>
                        )}
                      </div>

                      {/* Start date column */}
                      <div className="w-32 px-1 shrink-0">
                        {isLeaf ? (
                          <input
                            type="date"
                            value={starts[node.id] ?? BASE_DATE}
                            onChange={(e) => handleStartChange(node.id, e.target.value)}
                            className="text-[11px] border border-neutral-300 rounded px-1 py-0.5 w-full focus:border-blue-500 focus:outline-none"
                            aria-label={`開始日期：${node.label}`}
                          />
                        ) : null}
                      </div>

                      {/* Delete column */}
                      <div className="w-10 flex items-center justify-center shrink-0">
                        {isLeaf ? (
                          <button
                            onClick={() => handleDelete(node.id)}
                            className="text-neutral-300 hover:text-red-400 transition-colors"
                            aria-label={`刪除節點 ${node.id}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : null}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>

          {/* ---- Right scrollable Gantt panel ---- */}
          <div className="flex-1 overflow-x-auto">
            <div
              className="relative"
              style={{ width: `${Math.max(ganttWidth, 200)}px`, minWidth: '100%' }}
            >
              {/* Tick / header row */}
              <div
                className="border-b border-neutral-200 bg-neutral-50 relative"
                style={{ height: `${HEAD_H}px` }}
              >
                {ticks.map((tick) => (
                  <span
                    key={tick.offset}
                    className="absolute top-1/2 -translate-y-1/2 text-[10px] text-neutral-400 pl-1"
                    style={{ left: `${tick.offset * DAY_PX}px` }}
                  >
                    {tick.label}
                  </span>
                ))}
              </div>

              {/* Background grid lines spanning full height */}
              {ticks.map((tick) => (
                <div
                  key={tick.offset}
                  className="absolute top-0 bottom-0 border-l border-neutral-100 pointer-events-none"
                  style={{ left: `${tick.offset * DAY_PX}px` }}
                />
              ))}

              {/* Gantt rows — one per visibleRow */}
              {isEmpty ? (
                <div style={{ height: `${ROW_H * 3}px` }} />
              ) : (
                <AnimatePresence initial={false}>
                  {visibleRows.map(({ node, isLeaf }) => {
                    if (isLeaf) {
                      const h = hours[node.id] ?? 8;
                      const start = starts[node.id] ?? BASE_DATE;
                      const status = hourStatus(h);
                      const days = hoursToDays(h);
                      const end = calcEnd(start, h);
                      const leftPx = diffDays(minDate, start) * DAY_PX;
                      const widthPx = days * DAY_PX;

                      return (
                        <motion.div
                          key={node.id}
                          initial={reduced ? false : { opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0, transition: { duration: reduced ? 0 : 0.15 } }}
                          className="border-b border-neutral-100 relative"
                          style={{ height: `${ROW_H}px` }}
                        >
                          <div
                            className={clsx(
                              'absolute top-1/2 -translate-y-1/2 h-5 rounded-sm flex items-center overflow-hidden',
                              barColor(status),
                            )}
                            style={{ left: `${Math.max(0, leftPx)}px`, width: `${widthPx}px` }}
                          >
                            {widthPx > 48 && (
                              <span className="text-[10px] text-white px-1.5 leading-5 truncate whitespace-nowrap">
                                {fmtMD(start)}–{fmtMD(end)}
                              </span>
                            )}
                          </div>
                        </motion.div>
                      );
                    } else {
                      // Parent (rollup) row
                      const descendantLeaves = collectDescendantLeaves(node, deleted);
                      let rollupLeft: number | null = null;
                      let rollupRight: number | null = null;

                      for (const leaf of descendantLeaves) {
                        const s = starts[leaf.id] ?? BASE_DATE;
                        const h = hours[leaf.id] ?? 8;
                        const e = calcEnd(s, h);
                        const lPx = diffDays(minDate, s) * DAY_PX;
                        const rPx = (diffDays(minDate, e) + 1) * DAY_PX;
                        if (rollupLeft === null || lPx < rollupLeft) rollupLeft = lPx;
                        if (rollupRight === null || rPx > rollupRight) rollupRight = rPx;
                      }

                      return (
                        <motion.div
                          key={node.id}
                          initial={reduced ? false : { opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0, transition: { duration: reduced ? 0 : 0.15 } }}
                          className="border-b border-neutral-100 relative"
                          style={{ height: `${ROW_H}px` }}
                        >
                          {rollupLeft !== null && rollupRight !== null && (
                            <div
                              className="absolute top-1/2 -translate-y-1/2 h-2 rounded-sm bg-blue-300"
                              style={{
                                left: `${Math.max(0, rollupLeft)}px`,
                                width: `${rollupRight - rollupLeft}px`,
                              }}
                            />
                          )}
                        </motion.div>
                      );
                    }
                  })}
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Summary footer */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-neutral-600">
          全部未刪除工作包合計：
          <span className="ml-1 font-semibold text-blue-700">{totalHours} h</span>
        </span>
        <AnimatePresence>
          {deletedCount > 0 && (
            <motion.span
              key="deleted-note"
              initial={reduced ? false : { opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduced ? undefined : { opacity: 0, x: -4 }}
              transition={{ duration: reduced ? 0 : 0.15 }}
              className="flex items-center gap-1 text-xs text-neutral-400"
            >
              <TriangleAlert size={12} className="text-amber-400" />
              已刪除 {deletedCount} 個節點，該範圍不在估算內（未列入 WBS = 不在範圍）
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Hour feedback legend */}
      <div className="flex flex-wrap gap-4 text-xs text-neutral-500">
        <span className="flex items-center gap-1 text-amber-500">
          <TriangleAlert size={12} />
          &lt;8h：工時過短
        </span>
        <span className="flex items-center gap-1 text-emerald-500">
          <Check size={12} />
          8–80h：工時合理
        </span>
        <span className="flex items-center gap-1 text-red-500">
          <TriangleAlert size={12} />
          &gt;80h：工時過長
        </span>
        <span className="text-neutral-400">點名稱前的狀態圖示可看詳細建議</span>
      </div>
    </div>
  );
}
