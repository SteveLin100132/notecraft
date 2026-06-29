import React from "react";
import clsx from "clsx";

/* ----------------------------------------------------------------
   Types
---------------------------------------------------------------- */
type ColumnId = "core" | "crm" | "bpm" | "clm" | "board";
type Column = {
  id: ColumnId;
  label: string;
  system: string;
  subtitle?: string;
};

type RowId = "inhouse" | "vital-crm" | "bizform" | "vital-km" | "dotdotsign";
type RowKind = "inhouse" | "saas";
type Row = { id: RowId; label: string; kind: RowKind };

type Level = "full" | "partial" | "none";
type Cell = { level: Level; footnote: number | null; adopted: boolean };
type Matrix = Record<RowId, Record<ColumnId, Cell>>;

type Footnote = { id: number; text: string };

type AccentColor = "blue" | "orange";
type RoleCard = { name: string; accent: AccentColor; desc: string };

/* ----------------------------------------------------------------
   Data Constants
---------------------------------------------------------------- */
const COLUMNS: Column[] = [
  { id: "core", label: "主系統", system: "自建中控" },
  { id: "crm", label: "客戶管理（CRM）", system: "CRM" },
  {
    id: "bpm",
    label: "業務流程管理（BPM）",
    system: "BPM",
    subtitle: "派案・諮詢・報價・執案",
  },
  { id: "clm", label: "合約管理（CLM）", system: "CLM" },
  { id: "board", label: "看板（分析）", system: "Dashboard" },
];

const ROWS: Row[] = [
  { id: "inhouse", label: "自建系統", kind: "inhouse" },
  { id: "vital-crm", label: "Vital CRM", kind: "saas" },
  { id: "bizform", label: "BizForm", kind: "saas" },
  { id: "vital-km", label: "Vital KM", kind: "saas" },
  { id: "dotdotsign", label: "點點簽", kind: "saas" },
];

const MATRIX: Matrix = {
  inhouse: {
    core: { level: "full", footnote: null, adopted: true },
    crm: { level: "full", footnote: null, adopted: true },
    bpm: { level: "full", footnote: null, adopted: true },
    clm: { level: "partial", footnote: 1, adopted: true },
    board: { level: "full", footnote: null, adopted: true },
  },
  "vital-crm": {
    core: { level: "none", footnote: null, adopted: false },
    crm: { level: "full", footnote: null, adopted: false },
    bpm: { level: "partial", footnote: 2, adopted: false },
    clm: { level: "partial", footnote: 2, adopted: false },
    board: { level: "partial", footnote: 3, adopted: false },
  },
  bizform: {
    core: { level: "none", footnote: null, adopted: false },
    crm: { level: "none", footnote: null, adopted: false },
    bpm: { level: "partial", footnote: 4, adopted: false },
    clm: { level: "partial", footnote: 4, adopted: false },
    board: { level: "partial", footnote: 4, adopted: false },
  },
  "vital-km": {
    core: { level: "none", footnote: null, adopted: false },
    crm: { level: "none", footnote: null, adopted: false },
    bpm: { level: "none", footnote: null, adopted: false },
    clm: { level: "partial", footnote: 5, adopted: false },
    board: { level: "none", footnote: null, adopted: false },
  },
  dotdotsign: {
    core: { level: "none", footnote: null, adopted: false },
    crm: { level: "none", footnote: null, adopted: false },
    bpm: { level: "none", footnote: null, adopted: false },
    clm: { level: "partial", footnote: 6, adopted: true },
    board: { level: "none", footnote: null, adopted: false },
  },
};

const FOOTNOTES: Footnote[] = [
  {
    id: 1,
    text: "自建系統 × 合約管理：可管理合約資料，但無法取代實體合約、解決電子簽章法律效力 → 故搭配點點簽",
  },
  {
    id: 2,
    text: "Vital CRM × 業務流程／合約管理：須整合 BizForm 才能建表單並交付節點資料",
  },
  { id: 3, text: "Vital CRM × 看板：統計範圍僅含 CRM 自身資料" },
  {
    id: 4,
    text: "BizForm：無法自主實現業務流程控管，需由主系統串接 API／Webhook",
  },
  {
    id: 5,
    text: "Vital KM × 合約管理：偏文件管理與表單整合，須整合 Vital CRM",
  },
  {
    id: 6,
    text: "點點簽 × 合約管理：可取代實體合約、具電子簽章法律效力，但無法單獨管理合約資料",
  },
];

const ROLE_CARDS: RoleCard[] = [
  { name: "點點簽", accent: "blue", desc: "目前唯一提供電子簽章服務的方案。" },
  {
    name: "BizForm",
    accent: "orange",
    desc: "扮演 BPM 整合角色，讓 Vital CRM 串起業務流程節點。",
  },
  {
    name: "Vital KM",
    accent: "orange",
    desc: "扮演 CLM 整合角色，讓合約／文件集中管理。",
  },
];

/* ----------------------------------------------------------------
   Inline SVG Icons (16×16, currentColor)
---------------------------------------------------------------- */
function IconCheck() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <polyline
        points="3,8 6.5,12 13,4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconExclamation() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <line
        x1="8"
        y1="3"
        x2="8"
        y2="9.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="8" cy="12.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

function IconMinus() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <line
        x1="3"
        y1="8"
        x2="13"
        y2="8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ----------------------------------------------------------------
   Sub-components
---------------------------------------------------------------- */
interface CellContentProps {
  cell: Cell;
}

function CellContent({ cell }: CellContentProps) {
  const { level, footnote, adopted } = cell;

  const bgClass =
    level === "full"
      ? "bg-[var(--success-50)]"
      : level === "partial"
        ? "bg-[var(--warning-50)]"
        : "bg-[var(--neutral-100)]";

  const iconColor =
    level === "full"
      ? "var(--success-500)"
      : level === "partial"
        ? "var(--warning-500)"
        : "var(--neutral-400)";

  const ringClass = adopted ? "ring-2 ring-[var(--orange-400)]" : "";

  return (
    <div
      className={clsx(
        "relative flex flex-col items-center justify-center gap-0.5 p-2 rounded-[6px]",
        bgClass,
        ringClass,
      )}
      style={{ minHeight: "48px" }}
    >
      <div
        style={{ color: iconColor }}
        className="relative flex items-center justify-center"
      >
        {level === "full" && <IconCheck />}
        {level === "partial" && <IconExclamation />}
        {level === "none" && <IconMinus />}
        {footnote !== null && (
          <sup
            className="absolute -top-1 -right-2 text-[11px]"
            style={{ color: "var(--neutral-500)" }}
          >
            {footnote}
          </sup>
        )}
      </div>
      {adopted && (
        <span
          className="text-[11px] font-medium"
          style={{ color: "var(--orange-500)" }}
        >
          採用
        </span>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------
   Main Component
---------------------------------------------------------------- */
export default function ModuleServiceSupportMatrix() {
  return (
    <div className="not-prose w-full space-y-6 overflow-x-auto">
      {/* 1. Insight Banner */}
      <p
        className="text-sm italic border-l-2 pl-3"
        style={{
          color: "var(--neutral-500)",
          borderColor: "var(--warning-500)",
        }}
      >
        合約管理整欄皆需整合：無單一服務能獨力涵蓋，故採「自建（管資料）＋
        點點簽（管簽章法律效力）」組合
      </p>

      {/* 2. Table */}
      <table
        className="w-full text-sm"
        style={{
          tableLayout: "fixed",
          borderCollapse: "separate",
          borderSpacing: "4px",
        }}
      >
        <colgroup>
          <col style={{ width: "15%" }} />
          {COLUMNS.map((col) => (
            <col key={col.id} style={{ width: "17%" }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {/* Diagonal header cell */}
            <th
              className="relative rounded-tl-md overflow-hidden"
              style={{
                background: "var(--blue-700)",
                padding: 0,
                minHeight: "64px",
                height: "64px",
              }}
            >
              <svg
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none",
                }}
              >
                <line
                  x1="0"
                  y1="0"
                  x2="100%"
                  y2="100%"
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="1"
                />
              </svg>
              <span
                className="absolute bottom-1.5 left-2 text-[10px]"
                style={{ color: "rgba(255,255,255,0.75)" }}
              >
                服務選型
              </span>
              <span
                className="absolute top-1.5 right-2 text-[10px]"
                style={{ color: "rgba(255,255,255,0.75)" }}
              >
                模組
              </span>
            </th>
            {/* Column headers */}
            {COLUMNS.map((col) => (
              <th
                key={col.id}
                className="py-2 px-3 text-left align-top rounded-[6px]"
                style={{ background: "var(--blue-700)", color: "#fff" }}
              >
                <div className="font-bold text-sm leading-tight">
                  {col.label}
                </div>
                <div>
                  <span
                    className="inline-block mt-1 border border-white/60 rounded-full px-2 py-0.5 text-[11px]"
                    style={{ color: "rgba(255,255,255,0.9)" }}
                  >
                    {col.system}
                  </span>
                </div>
                {col.subtitle && (
                  <div
                    className="text-[11px] mt-0.5"
                    style={{ color: "rgba(255,255,255,0.75)" }}
                  >
                    {col.subtitle}
                  </div>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.id}>
              {/* Row header */}
              <td
                className="px-3 py-2 font-medium text-sm rounded-[6px]"
                style={{
                  background: "var(--neutral-50)",
                  color: "var(--neutral-700)",
                }}
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                    style={{
                      background:
                        row.kind === "inhouse"
                          ? "var(--success-500)"
                          : "var(--orange-500)",
                    }}
                  />
                  {row.label}
                </span>
              </td>
              {/* Data cells */}
              {COLUMNS.map((col) => {
                const cell = MATRIX[row.id][col.id];
                return (
                  <td key={col.id} style={{ padding: 0 }}>
                    <CellContent cell={cell} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* 3. Legend */}
      <div
        className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs"
        style={{ color: "var(--neutral-600)" }}
      >
        {/* Icon legends */}
        <span
          className="flex items-center gap-1"
          style={{ color: "var(--success-500)" }}
        >
          <IconCheck />
          <span style={{ color: "var(--neutral-600)" }}>完全支援</span>
        </span>
        <span
          className="flex items-center gap-1"
          style={{ color: "var(--warning-500)" }}
        >
          <IconExclamation />
          <span style={{ color: "var(--neutral-600)" }}>需整合或客制</span>
        </span>
        <span
          className="flex items-center gap-1"
          style={{ color: "var(--neutral-400)" }}
        >
          <IconMinus />
          <span style={{ color: "var(--neutral-600)" }}>不支援</span>
        </span>

        <span style={{ color: "var(--neutral-400)" }}>|</span>

        {/* Dot legends */}
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: "var(--success-500)" }}
          />
          自建
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: "var(--orange-500)" }}
          />
          外部 SaaS
        </span>

        <span style={{ color: "var(--neutral-400)" }}>|</span>

        {/* Adopted legend */}
        <span className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 border-2 rounded-[3px] flex-shrink-0"
            style={{ borderColor: "var(--orange-400)" }}
          />
          採用（方案 B 建議）
        </span>
      </div>

      {/* 4. Footnotes */}
      <div
        className="space-y-1 text-xs"
        style={{ color: "var(--neutral-500)" }}
      >
        {FOOTNOTES.map((fn) => (
          <div key={fn.id}>
            <sup className="mr-1" style={{ color: "var(--neutral-400)" }}>
              {fn.id}
            </sup>
            {fn.text}
          </div>
        ))}
      </div>

      {/* 5. Role Cards */}
      <div className="grid grid-cols-3 gap-3">
        {ROLE_CARDS.map((card) => (
          <div
            key={card.name}
            className={clsx(
              "rounded-md px-3 py-2.5",
              card.accent === "blue" ? "border-l-[3px]" : "border-l-[3px]",
            )}
            style={{
              background:
                card.accent === "blue" ? "var(--blue-50)" : "var(--orange-50)",
              borderLeftColor:
                card.accent === "blue"
                  ? "var(--blue-700)"
                  : "var(--orange-400)",
            }}
          >
            <div
              className="font-bold text-sm"
              style={{ color: "var(--neutral-800)" }}
            >
              {card.name}
            </div>
            <div
              className="text-xs mt-0.5 leading-relaxed"
              style={{ color: "var(--neutral-600)" }}
            >
              {card.desc}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
