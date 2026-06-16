import { useState, useCallback } from "react";
import { motion, useReducedMotion, AnimatePresence } from "motion/react";
import { Lock, LockOpen, RotateCcw, ChevronRight, Check } from "lucide-react";
import clsx from "clsx";

// ─── Data ────────────────────────────────────────────────────────────────────

interface Chapter {
  id: number;
  title: string;
  insight: string;
  points: string[];
  outcome: string;
}

const CHAPTERS: Chapter[] = [
  {
    id: 1,
    title: "專案 vs 產品",
    insight: "判斷手上是專案還是產品，是後面所有選擇的地基。",
    points: [
      "專案重成果（鐵三角：範疇 / 時程 / 成本），傾向凍結需求",
      "產品重價值，持續迭代、擁抱變化",
      "同一句「需求變了」在兩邊意義完全相反",
    ],
    outcome: "對一件新工作，先判斷它是一次性交付還是持續經營。",
  },
  {
    id: 2,
    title: "專案管理方法論",
    insight: "知道在管什麼之後，才挑選適合的方法（Waterfall 或 Agile）來執行。",
    points: [
      "SDLC 把工作拆成明確階段",
      "Waterfall 剛性、文件驅動；Agile 柔性、迭代增量",
      "實務多為混搭，無絕對優劣",
    ],
    outcome: "依專案性質選擇（或混搭）合適的方法論。",
  },
  {
    id: 3,
    title: "R&R 角色與職責",
    insight: "同一群人在不同方法論下，權責流向完全相反。",
    points: [
      "Waterfall 由上而下「指派」；Agile 由外圍「服務」自組織團隊",
      "RACI 矩陣釐清誰負責、誰拍板、誰諮詢、誰知情",
      "鐵律：A（最終負責人）只能有一個",
    ],
    outcome: "用 RACI 把任務的權責分工講清楚。",
  },
  {
    id: 4,
    title: "Waterfall SDLC",
    insight: "水只能往下流——閘門式單向流程，越後期進行變更，成本越高。",
    points: [
      "9 個階段以閘門（交付物驗收 / 里程碑審查）串接",
      "文件交付鏈環環相扣：PRD → SRS → SDD → …",
      "變更成本隨階段後移，近似指數放大",
    ],
    outcome: "理解需求凍結與階段閘門為何存在。",
  },
  {
    id: 5,
    title: "專案管理工具",
    insight: "工具是把觀念落地執行的載體。",
    points: [
      "把階段、任務、權責、進度具象成可操作的欄位與看板",
      "觀念先行，工具才不淪為填表",
      "工具承接前面所有觀念，最後才選它",
    ],
    outcome: "用工具承接前面所有觀念，從觀念到落地。",
  },
];

// ─── Design tokens: chapter id → color pair ──────────────────────────────────

interface ChapterColors {
  nodeRing: string; // border color class
  nodeBg: string; // bg class
  nodeText: string; // text class
  badgeBg: string; // status badge bg
  badgeText: string; // status badge text
  connectorColor: string; // hex for SVG connector line
  accentBg: string; // outcome block bg
  accentBorder: string; // outcome block border
  accentText: string; // outcome block text
}

function getChapterColors(
  id: number,
  unlocked: boolean,
  active: boolean,
): ChapterColors {
  if (!unlocked) {
    return {
      nodeRing: "border-[var(--neutral-300)]",
      nodeBg: "bg-[var(--neutral-100)]",
      nodeText: "text-[var(--neutral-400)]",
      badgeBg: "bg-[var(--neutral-100)]",
      badgeText: "text-[var(--neutral-400)]",
      connectorColor: "var(--neutral-300)",
      accentBg: "bg-[var(--neutral-50)]",
      accentBorder: "border-[var(--neutral-200)]",
      accentText: "text-[var(--neutral-500)]",
    };
  }
  // Chapter 1-2: cool blue
  if (id <= 2) {
    return {
      nodeRing: active
        ? "border-[var(--blue-700)]"
        : "border-[var(--blue-300)]",
      nodeBg: active ? "bg-[var(--blue-700)]" : "bg-[var(--blue-50)]",
      nodeText: active ? "text-white" : "text-[var(--blue-700)]",
      badgeBg: active ? "bg-[var(--blue-700)]" : "bg-[var(--blue-50)]",
      badgeText: active ? "text-white" : "text-[var(--blue-600)]",
      connectorColor: "var(--blue-300)",
      accentBg: "bg-[var(--blue-50)]",
      accentBorder: "border-[var(--blue-200)]",
      accentText: "text-[var(--blue-700)]",
    };
  }
  // Chapter 3: sky (transition)
  if (id === 3) {
    return {
      nodeRing: active ? "border-[var(--sky-500)]" : "border-[var(--sky-400)]",
      nodeBg: active ? "bg-[var(--sky-500)]" : "bg-[var(--blue-50)]",
      nodeText: active ? "text-white" : "text-[var(--sky-600)]",
      badgeBg: active ? "bg-[var(--sky-500)]" : "bg-[var(--blue-50)]",
      badgeText: active ? "text-white" : "text-[var(--sky-600)]",
      connectorColor: "var(--sky-400)",
      accentBg: "bg-[var(--blue-50)]",
      accentBorder: "border-[var(--sky-400)]",
      accentText: "text-[var(--sky-600)]",
    };
  }
  // Chapter 4-5: warm orange
  return {
    nodeRing: active
      ? "border-[var(--orange-500)]"
      : "border-[var(--orange-300)]",
    nodeBg: active ? "bg-[var(--orange-400)]" : "bg-[var(--orange-50)]",
    nodeText: active ? "text-white" : "text-[var(--orange-600)]",
    badgeBg: active ? "bg-[var(--orange-400)]" : "bg-[var(--orange-50)]",
    badgeText: active ? "text-white" : "text-[var(--orange-600)]",
    connectorColor: "var(--orange-300)",
    accentBg: "bg-[var(--orange-50)]",
    accentBorder: "border-[var(--orange-200)]",
    accentText: "text-[var(--orange-700)]",
  };
}

// ─── Accordion Row ────────────────────────────────────────────────────────────

interface ChapterRowProps {
  chapter: Chapter;
  unlocked: boolean;
  active: boolean;
  isLast: boolean;
  onToggle: (id: number) => void;
  shouldReduceMotion: boolean;
}

function ChapterRow({
  chapter,
  unlocked,
  active,
  isLast,
  onToggle,
  shouldReduceMotion,
}: ChapterRowProps) {
  const colors = getChapterColors(chapter.id, unlocked, active);
  const expanded = active && unlocked;

  return (
    <div className="flex gap-0">
      {/* ── Left rail ─────────────────────────────────────────── */}
      <div className="flex flex-col items-center w-10 flex-shrink-0">
        {/* Node */}
        <button
          onClick={() => onToggle(chapter.id)}
          aria-expanded={expanded}
          aria-label={`第 ${chapter.id} 章 ${chapter.title}`}
          className={clsx(
            "relative z-10 w-9 h-9 flex-shrink-0 rounded-full border-2 flex items-center justify-center",
            "font-bold text-sm transition-all duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2",
            colors.nodeBg,
            colors.nodeRing,
            colors.nodeText,
            !unlocked && "cursor-default",
          )}
          disabled={false}
        >
          {unlocked ? (
            <span>{chapter.id}</span>
          ) : (
            <Lock size={14} className="text-[var(--neutral-400)]" />
          )}
        </button>

        {/* Connector line to next node */}
        {!isLast && (
          <div
            className="flex-1 w-0.5 mt-0.5"
            style={{
              minHeight: "2rem",
              background: unlocked
                ? `var(--connector-color, ${colors.connectorColor})`
                : "var(--neutral-200)",
              backgroundColor: unlocked
                ? colors.connectorColor
                : "var(--neutral-200)",
            }}
          />
        )}
      </div>

      {/* ── Right card ────────────────────────────────────────── */}
      <div className="flex-1 ml-3 mb-4">
        {/* Header row — always visible */}
        <button
          onClick={() => onToggle(chapter.id)}
          disabled={!unlocked}
          className={clsx(
            "w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-left",
            "border transition-all duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-1",
            expanded
              ? clsx(
                  "border-[var(--border-brand)] bg-[var(--surface-card)]",
                  "shadow-sm",
                )
              : unlocked
                ? "border-[var(--border-subtle)] bg-[var(--surface-card)] hover:border-[var(--border-default)] hover:bg-[var(--surface-sunken)]"
                : "border-[var(--border-subtle)] bg-[var(--neutral-50)] opacity-60 cursor-not-allowed",
          )}
          aria-expanded={expanded}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-0.5">
                第 {chapter.id} 章
              </p>
              <p
                className={clsx(
                  "text-sm font-bold leading-snug truncate",
                  unlocked
                    ? "text-[var(--text-strong)]"
                    : "text-[var(--text-muted)]",
                )}
              >
                {chapter.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Status badge */}
            <span
              className={clsx(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold",
                expanded
                  ? colors.badgeBg + " " + colors.badgeText
                  : unlocked
                    ? "bg-[var(--neutral-100)] text-[var(--text-muted)]"
                    : "bg-[var(--neutral-100)] text-[var(--neutral-400)]",
              )}
            >
              {!unlocked && <Lock size={9} />}
              {unlocked && !expanded && <span>已解鎖</span>}
              {expanded && <span>進行中</span>}
            </span>

            {/* Chevron — 僅已解鎖章節顯示，提示可展開 */}
            {unlocked && (
              <motion.span
                animate={{ rotate: expanded ? 90 : 0 }}
                transition={{
                  duration: shouldReduceMotion ? 0 : 0.2,
                  ease: "easeOut",
                }}
                className="text-[var(--text-muted)]"
              >
                <ChevronRight size={16} />
              </motion.span>
            )}
          </div>
        </button>

        {/* Expandable detail panel */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="detail"
              initial={shouldReduceMotion ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={
                shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }
              }
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="px-4 pt-3 pb-1 flex flex-col gap-3">
                {/* Core insight */}
                <div className="rounded-lg px-3 py-2.5 bg-[var(--surface-sunken)] border border-[var(--border-subtle)]">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-1">
                    核心洞察
                  </p>
                  <p className="text-sm text-[var(--text-body)] leading-relaxed italic">
                    {chapter.insight}
                  </p>
                </div>

                {/* Learning points */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">
                    學習重點
                  </p>
                  <ul className="space-y-1.5">
                    {chapter.points.map((pt, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-[var(--text-body)] leading-relaxed"
                      >
                        <ChevronRight
                          size={14}
                          className="flex-shrink-0 mt-0.5 text-[var(--text-muted)]"
                        />
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Outcome */}
                <div
                  className={clsx(
                    "flex items-start gap-2 rounded-lg px-3 py-2.5 border mb-1",
                    colors.accentBg,
                    colors.accentBorder,
                  )}
                >
                  <Check
                    size={15}
                    className={clsx("flex-shrink-0 mt-0.5", colors.accentText)}
                  />
                  <div>
                    <p
                      className={clsx(
                        "text-[10px] font-semibold mb-0.5",
                        colors.accentText,
                      )}
                    >
                      讀完你會
                    </p>
                    <p
                      className={clsx(
                        "text-sm leading-relaxed",
                        colors.accentText,
                      )}
                    >
                      {chapter.outcome}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PmLearningMap() {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const totalChapters = CHAPTERS.length;
  const [unlockedUpTo, setUnlockedUpTo] = useState(1);
  const [expandedId, setExpandedId] = useState<number>(1);
  const allUnlocked = unlockedUpTo >= totalChapters;

  const handleToggle = useCallback((id: number) => {
    // 只有已解鎖的章節能展開 / 收合；鎖住的章節不可點（須由「解鎖下一章」逐步開啟）
    setUnlockedUpTo((prevUnlocked) => {
      if (id > prevUnlocked) return prevUnlocked;
      setExpandedId((prev) => (prev === id ? 0 : id));
      return prevUnlocked;
    });
  }, []);

  // 手動逐步解鎖：每次解鎖「下一章」並自動展開它
  const handleUnlockNext = useCallback(() => {
    setUnlockedUpTo((prev) => {
      if (prev >= totalChapters) return prev;
      const next = prev + 1;
      setExpandedId(next);
      return next;
    });
  }, [totalChapters]);

  // 全部解鎖後可重置回第一章
  const handleReset = useCallback(() => {
    setUnlockedUpTo(1);
    setExpandedId(1);
  }, []);

  return (
    <div className="not-prose max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-1.5">
          學習路徑
        </p>
        <p className="text-sm text-[var(--text-body)] leading-relaxed">
          先搞懂在管什麼 → 再決定怎麼做 → 誰來做 → 深入經典方法 → 用工具落地
        </p>
      </div>

      {/* 手動解鎖控制 */}
      <div className="mb-5 flex items-center gap-3">
        {allUnlocked ? (
          <button
            onClick={handleReset}
            className={clsx(
              "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold",
              "border transition-all duration-200",
              "border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-body)]",
              "hover:bg-[var(--surface-sunken)] hover:border-[var(--text-muted)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2",
            )}
          >
            <RotateCcw size={14} />
            重置
          </button>
        ) : (
          <button
            onClick={handleUnlockNext}
            className={clsx(
              "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold",
              "border transition-all duration-200",
              "border-[var(--orange-300)] bg-[var(--orange-50)] text-[var(--orange-600)]",
              "hover:bg-[var(--orange-400)] hover:text-white hover:border-[var(--orange-400)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2",
            )}
          >
            <LockOpen size={14} />
            解鎖下一章
          </button>
        )}
        <span className="text-xs text-[var(--text-muted)] tabular-nums">
          {unlockedUpTo} / {totalChapters} 已解鎖
        </span>
      </div>

      {/* Timeline accordion */}
      <div>
        {CHAPTERS.map((chapter, i) => (
          <ChapterRow
            key={chapter.id}
            chapter={chapter}
            unlocked={unlockedUpTo >= chapter.id}
            active={expandedId === chapter.id}
            isLast={i === CHAPTERS.length - 1}
            onToggle={handleToggle}
            shouldReduceMotion={shouldReduceMotion}
          />
        ))}
      </div>

      {/* Footer */}
      <p className="mt-2 text-xs text-[var(--text-muted)] text-center">
        每一章都建立在前一章之上——循序理解，工具才有意義。
      </p>
    </div>
  );
}
