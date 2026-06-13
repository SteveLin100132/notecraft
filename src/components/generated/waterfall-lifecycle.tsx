import React, { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { FileText, Calendar, File, Users, ArrowRight, Info } from 'lucide-react';

// ── Data ──────────────────────────────────────────────────────────────────────

type Stage = {
  id: number;
  key: string;
  label: string;
  desc: string;
  optional?: boolean;
};

type Meeting = {
  id: string;
  label: string;
  stageRange: [number, number];
  desc: string;
};

type Deliverable = {
  id: string;
  label: string;
  stage: number;
  desc: string;
};

const STAGES: Stage[] = [
  { id: 0, key: 'blueprint',   label: 'Blueprint',      desc: '確認專案目標、範疇、預期成果,通常會產出 Project Charter 或藍圖文件。' },
  { id: 1, key: 'analysis',    label: 'System Analysis', desc: '訪談需求、釐清業務流程,產出需求規格 (SRS)、業務流程圖等。' },
  { id: 2, key: 'design',      label: 'System Design',   desc: '依需求設計系統架構、資料模型、介面、API 規格等。' },
  { id: 3, key: 'coding',      label: 'Coding',          desc: '依設計文件實作系統。' },
  { id: 4, key: 'sit',         label: 'SIT',             desc: '由 QA 進行模組整合測試,驗證系統各部分能正確協作。' },
  { id: 5, key: 'uat',         label: 'UAT',             desc: '由用戶端依驗收標準實際操作,確認系統符合需求。' },
  { id: 6, key: 'cutover',     label: 'Cutover',         desc: '正式上線前的切換作業,包含資料移轉、停機作業、舊系統下線等。', optional: true },
  { id: 7, key: 'golive',      label: 'Go-Live',         desc: '系統正式上線。' },
  { id: 8, key: 'maintenance', label: 'Maintenance',     desc: '上線後的維護、修補、優化。' },
];

const MEETINGS: Meeting[] = [
  { id: 'kickoff',   label: 'Kickoff Meeting',          stageRange: [0, 0], desc: '讓所有參與者了解目標、範疇、角色責任及初步計劃。' },
  { id: 'milestone', label: 'Milestone Review Meeting', stageRange: [1, 4], desc: '在關鍵節點評估進度與成果,必要時調整計劃與資源。' },
  { id: 'uat',       label: 'UAT Meeting',              stageRange: [5, 5], desc: '讓用戶或利益相關者實際參與驗收,收集回饋。' },
  { id: 'golive',    label: 'Go-Live Meeting',          stageRange: [6, 7], desc: '確認部署計劃、步驟、責任分工與支援資源,確保順利上線。' },
  { id: 'handover',  label: 'Handover Meeting',         stageRange: [8, 8], desc: '專案結束時將成果與文件交接給維運團隊,含專案總結、知識轉移。' },
];

const DELIVERABLES: Deliverable[] = [
  { id: 'prd',      label: 'PRD',               stage: 0, desc: 'Product Requirement Document — Blueprint 階段產出' },
  { id: 'srs',      label: 'SRS',               stage: 1, desc: 'System Requirement Spec — System Analysis 階段產出' },
  { id: 'sdd',      label: 'SDD',               stage: 2, desc: 'System Design Document — System Design 階段產出' },
  { id: 'testplan', label: 'Test Plan / Case',  stage: 4, desc: 'SIT 階段產出的測試計畫與測試案例' },
  { id: 'uat',      label: 'UAT Checklist',     stage: 5, desc: 'UAT 階段的驗收清單' },
  { id: 'cutover',  label: 'Cutover Plan',      stage: 6, desc: 'Cutover 階段的切換計劃' },
  { id: 'manual',   label: 'Maintenance Manual', stage: 8, desc: 'Go-Live 後的維運手冊' },
];

// ── SVG Layout constants (vertical 3-column) ──────────────────────────────────

const ROW_H   = 52;
const BOX_H   = 36;
const BOX_W   = 100;
const CENTER_X = 104; // left edge of centre column box

const SVG_W   = 380;
const SVG_H   = 9 * ROW_H + 16; // 484

function stageY(i: number): number { return i * ROW_H + 8; }
function stageCY(i: number): number { return stageY(i) + BOX_H / 2; }

const ARROW_CX = CENTER_X + BOX_W / 2; // 154 — vertical arrow x-centre
const RIGHT_WING_X = CENTER_X + BOX_W + 8; // 212
const BADGE_W  = 152;
const BADGE_H  = 22;

// ── Types ─────────────────────────────────────────────────────────────────────

type TabId = 'phases' | 'meetings' | 'deliverables';

type DetailContent =
  | { kind: 'stage';       stage: Stage }
  | { kind: 'meeting';     meeting: Meeting }
  | { kind: 'deliverable'; deliverable: Deliverable };

// ── SVG sub-components ────────────────────────────────────────────────────────

function ArrowConnectors() {
  return (
    <>
      {STAGES.slice(0, -1).map((s) => {
        const y1 = stageY(s.id) + BOX_H;
        const y2 = stageY(s.id + 1);
        // dashed for UAT->Cutover and Cutover->GoLive (can be bypassed)
        const dashed = s.id === 5 || s.id === 6;
        return (
          <line
            key={`arr-${s.id}`}
            x1={ARROW_CX} y1={y1}
            x2={ARROW_CX} y2={y2}
            stroke="var(--neutral-300)"
            strokeWidth={1.5}
            strokeDasharray={dashed ? '4 3' : undefined}
            markerEnd="url(#arrowhead)"
          />
        );
      })}
    </>
  );
}

function StageBoxes({
  activeTab,
  selectedStage,
  onSelect,
}: {
  activeTab: TabId;
  selectedStage: number | null;
  onSelect: (id: number | null) => void;
}) {
  return (
    <>
      {STAGES.map((s) => {
        const isCutover  = s.optional === true;
        const isSelected = selectedStage === s.id;

        // Cutover box is narrower and slightly indented to mark it as optional
        const bx = isCutover ? CENTER_X + 8 : CENTER_X;
        const bw = isCutover ? BOX_W - 16   : BOX_W;
        const y  = stageY(s.id);

        const fillColor   = isSelected ? 'var(--blue-700)' : isCutover ? 'var(--neutral-100)' : 'var(--blue-50)';
        const strokeColor = isSelected ? 'var(--blue-700)' : isCutover ? 'var(--neutral-400)' : 'var(--blue-500)';
        const textColor   = isSelected ? '#ffffff'         : isCutover ? 'var(--neutral-500)' : 'var(--blue-700)';

        const hasDel = activeTab === 'deliverables' && DELIVERABLES.some((d) => d.stage === s.id);

        return (
          <g
            key={s.id}
            onClick={() => onSelect(isSelected ? null : s.id)}
            style={{ cursor: 'pointer' }}
            role="button"
            aria-label={s.label}
            aria-pressed={isSelected}
          >
            <rect
              x={bx} y={y}
              width={bw} height={BOX_H}
              rx={6}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={isSelected ? 2 : 1.5}
              strokeDasharray={isCutover ? '5 3' : undefined}
            />
            <text
              x={bx + bw / 2} y={y + BOX_H / 2 + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={11}
              fontWeight={600}
              fill={textColor}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {s.label}
            </text>
            {/* Deliverable indicator dot */}
            {hasDel && (
              <circle
                cx={CENTER_X + BOX_W - 6}
                cy={y + 6}
                r={4}
                fill="var(--blue-500)"
              />
            )}
          </g>
        );
      })}
    </>
  );
}

function MeetingBrackets({
  selectedMeetingId,
  onSelect,
}: {
  selectedMeetingId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const BRACKET_X  = CENTER_X - 10; // bracket vertical line x
  const TOOTH      = 4;             // horizontal tooth length
  const PILL_W     = 80;
  const PILL_H     = 18;
  const PILL_RIGHT = BRACKET_X - 6; // right edge of pill

  return (
    <>
      {MEETINGS.map((m) => {
        const [s1, s2]   = m.stageRange;
        const isSelected  = selectedMeetingId === m.id;
        const bracketColor = isSelected ? 'var(--orange-500)' : 'var(--orange-400)';

        // bracket spans from top of s1 to bottom of s2
        const by1 = stageY(s1);
        const by2 = stageY(s2) + BOX_H;

        // For Go-Live meeting (covers Cutover+GoLive), bracket right edge
        // intentionally aligns with CENTER_X - 10 (not the narrowed Cutover box)
        const pillCY  = (by1 + by2) / 2;
        const pillX   = PILL_RIGHT - PILL_W;
        const labelRaw = m.label.replace(' Meeting', '');
        const label    = labelRaw.length > 12 ? labelRaw.slice(0, 9) + '...' : labelRaw;

        return (
          <g
            key={m.id}
            onClick={() => onSelect(isSelected ? null : m.id)}
            style={{ cursor: 'pointer' }}
            role="button"
            aria-label={m.label}
          >
            {/* Vertical bracket line */}
            <line
              x1={BRACKET_X} y1={by1}
              x2={BRACKET_X} y2={by2}
              stroke={bracketColor} strokeWidth={2} strokeLinecap="round"
            />
            {/* Top tooth */}
            <line
              x1={BRACKET_X} y1={by1}
              x2={BRACKET_X + TOOTH} y2={by1}
              stroke={bracketColor} strokeWidth={2} strokeLinecap="round"
            />
            {/* Bottom tooth */}
            <line
              x1={BRACKET_X} y1={by2}
              x2={BRACKET_X + TOOTH} y2={by2}
              stroke={bracketColor} strokeWidth={2} strokeLinecap="round"
            />
            {/* Dashed connector from pill right-centre to bracket mid-point */}
            <line
              x1={PILL_RIGHT} y1={pillCY}
              x2={BRACKET_X}  y2={pillCY}
              stroke={bracketColor}
              strokeWidth={1}
              strokeDasharray="2 2"
              opacity={0.7}
            />
            {/* Label pill */}
            <rect
              x={pillX} y={pillCY - PILL_H / 2}
              width={PILL_W} height={PILL_H}
              rx={9}
              fill={isSelected ? 'var(--orange-400)' : 'var(--orange-50)'}
              stroke={bracketColor}
              strokeWidth={1}
            />
            <text
              x={pillX + PILL_W / 2} y={pillCY + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={9}
              fontWeight={600}
              fill={isSelected ? '#ffffff' : 'var(--orange-600)'}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {label}
            </text>
          </g>
        );
      })}
    </>
  );
}

function DeliverableBadges({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <>
      {DELIVERABLES.map((d, idx) => {
        const isSelected = selectedId === d.id;
        const cy = stageCY(d.stage);
        const bx = RIGHT_WING_X;
        const by = cy - BADGE_H / 2;

        // Arrow connector from previous badge (if any and adjacent in array)
        const prev = idx > 0 ? DELIVERABLES[idx - 1] : null;
        const showConnector = prev !== null && prev.stage < d.stage;

        return (
          <g key={d.id}>
            {/* Relay connector from previous badge's bottom to this badge's top */}
            {showConnector && prev !== null && (
              <line
                x1={bx + BADGE_W / 2}
                y1={stageCY(prev.stage) + BADGE_H / 2}
                x2={bx + BADGE_W / 2}
                y2={by}
                stroke="var(--blue-200)"
                strokeWidth={1.5}
                markerEnd="url(#arrowBlue)"
              />
            )}
            <g
              onClick={() => onSelect(isSelected ? null : d.id)}
              style={{ cursor: 'pointer' }}
              role="button"
              aria-label={d.label}
            >
              <rect
                x={bx} y={by}
                width={BADGE_W} height={BADGE_H}
                rx={11}
                fill={isSelected ? 'var(--blue-700)' : 'var(--blue-50)'}
                stroke={isSelected ? 'var(--blue-700)' : 'var(--blue-200)'}
                strokeWidth={1}
              />
              <text
                x={bx + BADGE_W / 2} y={cy + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={9}
                fontWeight={600}
                fill={isSelected ? '#ffffff' : 'var(--blue-700)'}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {d.label}
              </text>
            </g>
          </g>
        );
      })}
    </>
  );
}

// ── Detail card ───────────────────────────────────────────────────────────────

function DetailCard({ content, reduced }: { content: DetailContent; reduced: boolean }) {
  const enter      = reduced ? {} : { x: 16, opacity: 0 };
  const center     = { x: 0, opacity: 1 };
  const transition = { duration: reduced ? 0 : 0.3, ease: 'easeOut' };

  if (content.kind === 'stage') {
    const { stage } = content;
    return (
      <motion.div
        key={`stage-${stage.id}`}
        initial={enter} animate={center} exit={{ opacity: 0 }} transition={transition}
        className="rounded-lg border border-blue-200 bg-blue-50 p-4"
      >
        <div className="mb-2 flex items-center gap-2">
          <FileText size={16} className="text-blue-700 shrink-0" />
          <span className="text-base font-bold text-blue-900">{stage.label}</span>
          {stage.optional && (
            <span className="ml-auto rounded-full bg-neutral-200 px-2 py-0.5 text-xs text-neutral-500">
              視情況
            </span>
          )}
        </div>
        <p className="text-sm leading-relaxed text-neutral-700">{stage.desc}</p>
      </motion.div>
    );
  }

  if (content.kind === 'meeting') {
    const { meeting } = content;
    return (
      <motion.div
        key={`meeting-${meeting.id}`}
        initial={enter} animate={center} exit={{ opacity: 0 }} transition={transition}
        className="rounded-lg border border-orange-200 bg-orange-50 p-4"
      >
        <div className="mb-2 flex items-center gap-2">
          <Calendar size={16} className="text-orange-500 shrink-0" />
          <span className="text-base font-bold text-orange-900">{meeting.label}</span>
        </div>
        <div className="mb-2 flex items-center gap-1">
          <Users size={13} className="text-orange-400 shrink-0" />
          <span className="text-xs text-orange-600">
            Stage {meeting.stageRange[0]}
            {meeting.stageRange[0] !== meeting.stageRange[1] ? ` – ${meeting.stageRange[1]}` : ''}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-neutral-700">{meeting.desc}</p>
      </motion.div>
    );
  }

  const { deliverable } = content;
  return (
    <motion.div
      key={`del-${deliverable.id}`}
      initial={enter} animate={center} exit={{ opacity: 0 }} transition={transition}
      className="rounded-lg border border-blue-200 bg-blue-50 p-4"
    >
      <div className="mb-2 flex items-center gap-2">
        <File size={16} className="text-blue-700 shrink-0" />
        <span className="text-base font-bold text-blue-900">{deliverable.label}</span>
        <ArrowRight size={13} className="text-neutral-400 shrink-0 ml-auto" />
        <span className="text-xs text-neutral-500">
          {STAGES[deliverable.stage]?.label ?? ''}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-neutral-700">{deliverable.desc}</p>
    </motion.div>
  );
}

// ── Tab bar ───────────────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; Icon: React.ElementType }[] = [
  { id: 'phases',       label: '階段',   Icon: FileText },
  { id: 'meetings',     label: '會議',   Icon: Calendar },
  { id: 'deliverables', label: '交付物', Icon: File },
];

// ── Main component ────────────────────────────────────────────────────────────

export default function WaterfallLifecycle() {
  const reduced = useReducedMotion() ?? false;

  const [activeTab,           setActiveTab]           = useState<TabId>('phases');
  const [selectedStage,       setSelectedStage]       = useState<number | null>(null);
  const [selectedMeeting,     setSelectedMeeting]     = useState<string | null>(null);
  const [selectedDeliverable, setSelectedDeliverable] = useState<string | null>(null);

  const detailContent: DetailContent | null = (() => {
    if (activeTab === 'phases' && selectedStage !== null) {
      const s = STAGES[selectedStage];
      return s ? { kind: 'stage', stage: s } : null;
    }
    if (activeTab === 'meetings' && selectedMeeting !== null) {
      const m = MEETINGS.find((x) => x.id === selectedMeeting);
      return m ? { kind: 'meeting', meeting: m } : null;
    }
    if (activeTab === 'deliverables' && selectedDeliverable !== null) {
      const d = DELIVERABLES.find((x) => x.id === selectedDeliverable);
      return d ? { kind: 'deliverable', deliverable: d } : null;
    }
    return null;
  })();

  function handleTabChange(tab: TabId) {
    setActiveTab(tab);
    setSelectedStage(null);
    setSelectedMeeting(null);
    setSelectedDeliverable(null);
  }

  const tabEnter      = reduced ? {} : { opacity: 0 };
  const tabCenter     = { opacity: 1 };
  const tabTransition = { duration: reduced ? 0 : 0.2, ease: 'easeOut' };

  const emptyHint =
    activeTab === 'phases'
      ? '點擊中央任一階段方塊，查看說明。'
      : activeTab === 'meetings'
      ? '點擊左側括號標記的會議，查看說明。'
      : '點擊右側交付物 badge，查看說明。';

  return (
    <figure className="not-prose w-full overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-neutral-200 bg-neutral-50 px-4">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => handleTabChange(id)}
              className={[
                'flex items-center gap-1.5 px-3 py-3 text-sm font-medium transition-colors',
                'border-b-2',
                isActive
                  ? 'border-blue-700 text-blue-700'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700',
              ].join(' ')}
              aria-selected={isActive}
              role="tab"
            >
              <Icon size={14} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Body: SVG column + detail card. Inline flex with wrap so the card
          sits beside the diagram when there is room and drops below when not —
          independent of Tailwind responsive variants. */}
      <div className="p-3" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'flex-start' }}>
        {/* SVG waterfall — vertical 3-column layout. Capped width keeps the
            tall vertical diagram at ~1x scale instead of filling the container. */}
        <div
          className="overflow-x-auto"
          style={{ flex: '0 1 auto', width: '100%', maxWidth: 360, margin: '0 auto' }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={tabEnter}
              animate={tabCenter}
              exit={{ opacity: 0 }}
              transition={tabTransition}
            >
              <svg
                viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                width="100%"
                aria-label="瀑布式開發生命週期圖"
                style={{ fontFamily: 'inherit' }}
              >
                <defs>
                  {/* Neutral arrowhead for vertical connectors */}
                  <marker
                    id="arrowhead"
                    markerWidth="7" markerHeight="7"
                    refX="3.5" refY="3.5"
                    orient="auto"
                  >
                    <path d="M0,0 L7,3.5 L0,7 Z" fill="var(--neutral-300)" />
                  </marker>
                  {/* Blue arrowhead for deliverable relay connectors */}
                  <marker
                    id="arrowBlue"
                    markerWidth="6" markerHeight="6"
                    refX="3" refY="3"
                    orient="auto"
                  >
                    <path d="M0,0 L6,3 L0,6 Z" fill="var(--blue-200)" />
                  </marker>
                </defs>

                {/* Vertical down-arrows between stages */}
                <ArrowConnectors />

                {/* Left-wing: meeting brackets (meetings tab only) */}
                {activeTab === 'meetings' && (
                  <MeetingBrackets
                    selectedMeetingId={selectedMeeting}
                    onSelect={setSelectedMeeting}
                  />
                )}

                {/* Right-wing: deliverable badges (deliverables tab only) */}
                {activeTab === 'deliverables' && (
                  <DeliverableBadges
                    selectedId={selectedDeliverable}
                    onSelect={setSelectedDeliverable}
                  />
                )}

                {/* Centre column: stage boxes (always rendered) */}
                <StageBoxes
                  activeTab={activeTab}
                  selectedStage={selectedStage}
                  onSelect={(id) => {
                    if (activeTab === 'phases') setSelectedStage(id);
                  }}
                />
              </svg>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Detail panel */}
        <div
          className="p-4 flex flex-col justify-start gap-3"
          style={{ flex: '1 1 240px', minWidth: 220 }}
          aria-live="polite"
        >
          <AnimatePresence mode="wait">
            {detailContent ? (
              <DetailCard
                key={
                  detailContent.kind === 'stage'       ? `s${detailContent.stage.id}`
                  : detailContent.kind === 'meeting'   ? `m${detailContent.meeting.id}`
                  : `d${detailContent.deliverable.id}`
                }
                content={detailContent}
                reduced={reduced}
              />
            ) : (
              <motion.div
                key="empty"
                initial={reduced ? {} : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.2 }}
                className="flex flex-col items-center justify-center gap-2 py-8 text-center"
              >
                <Info size={28} className="text-neutral-300" />
                <p className="text-sm text-neutral-400">{emptyHint}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </figure>
  );
}
