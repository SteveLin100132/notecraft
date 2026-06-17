import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  AlertTriangle,
  Check,
  ArrowRight,
  Inbox,
  Timer,
  ClipboardCheck,
  Rocket,
  Eye,
  Stethoscope,
  Pill,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import clsx from "clsx";

// ── 資料模型 ──────────────────────────────────────────────

type SegmentKey = "queue" | "exec" | "review" | "deploy";

/** 介入三階段：察覺症狀 → 診斷病因 → 開立處方 */
type Stage = 0 | 1 | 2;

const MILESTONES = ["建立", "開始", "完成", "驗收", "上線"];

interface Scenario {
  key: SegmentKey;
  /** tab 標題 */
  name: string;
  /** 對應區間 */
  span: string;
  icon: LucideIcon;
  /** 看板上的徵狀 */
  symptom: string;
  /** 病因 */
  cause: string;
  /** 處方 */
  remedies: string[];
  /** 越早越便宜：拖久的連鎖後果 */
  ripple: string;
  /** 介入前 / 後，四段的相對天數（用來畫長條） */
  before: Record<SegmentKey, number>;
  after: Record<SegmentKey, number>;
}

const SCENARIOS: Scenario[] = [
  {
    key: "queue",
    name: "前置擁塞",
    span: "建立 → 開始（Open → On Going）",
    icon: Inbox,
    symptom:
      "卡片大量堆在 Open，遲遲不進 On Going；待辦越積越多，卻很少真正動工。",
    cause: "需求還沒釐清、資源還沒到位、或優先級不清，工作「進得來卻動不了」。",
    remedies: [
      "把需求講清、驗收標準定好再放行，而不是先塞進來再說",
      "對 Open 欄設 WIP 上限，逼團隊先消化、再接新需求",
      "每日掃最舊的卡片，凡停留過久就當面釐清卡點",
    ],
    ripple: "前置一塞，後面每一段都跟著延後——這是最該先處理、CP 值最高的一段。",
    before: { queue: 8, exec: 4, review: 2, deploy: 1 },
    after: { queue: 2, exec: 4, review: 2, deploy: 1 },
  },
  {
    key: "exec",
    name: "估時失準",
    span: "開始 → 完成（實際完成起訖）",
    icon: Timer,
    symptom: "實際耗時遠超「預計」，且常常一拖再拖；估時與實際的差距越來越大。",
    cause: "估時太樂觀，或範圍在執行中偷偷長大。",
    remedies: [
      "用「預計 vs 實際」的差距回頭校正下一次估時，讓估算越來越準",
      "把過大的工作包再拆小，降低估時不確定性",
      "凍結範圍、變更走 CR，別讓需求邊做邊長",
    ],
    ripple: "估時長期失準，整張 Gantt 的時程都不可信，連帶影響對外承諾的交期。",
    before: { queue: 1, exec: 12, review: 2, deploy: 1 },
    after: { queue: 1, exec: 6, review: 2, deploy: 1 },
  },
  {
    key: "review",
    name: "驗收塞車",
    span: "完成 → 驗收（Done → Verified）",
    icon: ClipboardCheck,
    symptom: "卡片堆在「待驗收」遲遲不動——開發明明做完了，卻過不了驗收這關。",
    cause: "驗收人沒空、或驗收標準不清，導致來回退件、反覆確認。",
    remedies: [
      "明確「做完」的定義與驗收標準，讓「做完」有客觀定義",
      "保障驗收產能：別讓驗收人的時間被其他工作佔滿",
      "把「批量驗收」改成「流動驗收」，做完一件就驗一件，不要囤著",
    ],
    ripple: "驗收最常被忽略、卻最容易卡關；它一塞，前面做得再快也卡在門口。",
    before: { queue: 1, exec: 5, review: 9, deploy: 1 },
    after: { queue: 1, exec: 5, review: 3, deploy: 1 },
  },
  {
    key: "deploy",
    name: "上線延宕",
    span: "驗收 → 上線（Verified → 上線）",
    icon: Rocket,
    symptom: "驗收通過的東西排隊等上線，要等特定時機或是主管審核才能進行。",
    cause: "上線審核排程卡住，或部署被當成「大事件」而非例行流程。",
    remedies: [
      "固定發布窗口，讓上線變成可預期的節奏而非臨時喬",
      "把部署自動化並建立完整的通知機制，降低每次上線的人為成本",
      "上線檢查表前置準備，避免到了窗口才發現缺東缺西",
    ],
    ripple:
      "價值卡在最後一哩進不了使用者手上；越接近交付端的延宕，使用者感受越直接。",
    before: { queue: 1, exec: 4, review: 2, deploy: 7 },
    after: { queue: 1, exec: 4, review: 2, deploy: 2 },
  },
];

// 非瓶頸區段的中性配色
const NEUTRAL_FILL: Record<SegmentKey, string> = {
  queue: "bg-blue-100",
  exec: "bg-blue-200",
  review: "bg-blue-100",
  deploy: "bg-blue-200",
};

const SEGMENT_ORDER: SegmentKey[] = ["queue", "exec", "review", "deploy"];

// 三階段定義
interface StageDef {
  label: string;
  hint: string;
  icon: LucideIcon;
}

const STAGES: StageDef[] = [
  { label: "介入前", hint: "察覺症狀", icon: Eye },
  { label: "介入中", hint: "診斷病因", icon: Stethoscope },
  { label: "介入後", hint: "開立處方", icon: Pill },
];

// 瓶頸長條依階段的狀態
function bottleneckStyle(stage: Stage): {
  fill: string;
  label: string;
  icon: LucideIcon;
} {
  if (stage === 2)
    return { fill: "bg-green-500", label: "已疏通", icon: Check };
  if (stage === 1)
    return { fill: "bg-amber-500", label: "診斷中", icon: Stethoscope };
  return { fill: "bg-red-500", label: "瓶頸", icon: AlertTriangle };
}

// ── 迷你時間軸 ────────────────────────────────────────────

interface TimelineProps {
  scenario: Scenario;
  stage: Stage;
  duration: number;
}

function Timeline({ scenario, stage, duration }: TimelineProps) {
  // 只有「介入後」才把瓶頸段縮短
  const days = stage === 2 ? scenario.after : scenario.before;
  const total = SEGMENT_ORDER.reduce((sum, k) => sum + days[k], 0);
  const bn = bottleneckStyle(stage);
  const BnIcon = bn.icon;

  return (
    <div className="w-full">
      {/* milestones */}
      <div className="flex justify-between text-xs text-neutral-400 mb-1.5">
        {MILESTONES.map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>

      {/* segment bars */}
      <div className="flex w-full gap-1 h-9">
        {SEGMENT_ORDER.map((k) => {
          const isBottleneck = k === scenario.key;
          return (
            <motion.div
              key={k}
              className="h-full first:rounded-l-md last:rounded-r-md overflow-hidden relative"
              animate={{ flexGrow: days[k] }}
              transition={{ duration, ease: "easeOut" }}
              style={{ flexGrow: days[k], flexBasis: 0 }}
            >
              <div
                className={clsx(
                  "h-full w-full flex items-center justify-center transition-colors",
                  isBottleneck ? bn.fill : NEUTRAL_FILL[k],
                )}
              >
                {isBottleneck && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-white px-1">
                    <BnIcon size={13} />
                    {bn.label}
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-1.5 text-xs text-neutral-400 text-right">
        總耗時 {total} 天 · 瓶頸段{" "}
        {stage === 2
          ? scenario.after[scenario.key]
          : scenario.before[scenario.key]}{" "}
        天
      </div>
    </div>
  );
}

// ── 揭露區塊 ──────────────────────────────────────────────

interface RevealProps {
  icon: LucideIcon;
  title: string;
  accent: string;
  children: React.ReactNode;
  duration: number;
}

function RevealSection({
  icon: Icon,
  title,
  accent,
  children,
  duration,
}: RevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration, ease: "easeOut" }}
    >
      <div
        className={clsx(
          "flex items-center gap-1.5 text-xs font-medium mb-1.5",
          accent,
        )}
      >
        <Icon size={14} />
        {title}
      </div>
      {children}
    </motion.div>
  );
}

// ── 主元件 ────────────────────────────────────────────────

export default function BottleneckPlaybook() {
  const prefersReduced = useReducedMotion();
  const duration = prefersReduced ? 0 : 0.35;
  const reveal = prefersReduced ? 0 : 0.28;

  const [active, setActive] = useState<SegmentKey>("queue");
  const [stage, setStage] = useState<Stage>(0);

  const scenario = SCENARIOS.find((s) => s.key === active)!;

  const selectScenario = (key: SegmentKey) => {
    setActive(key);
    setStage(0);
  };

  return (
    <div className="not-prose max-w-3xl mx-auto space-y-5">
      {/* 情境 tabs */}
      <div className="flex flex-wrap gap-2">
        {SCENARIOS.map((s) => {
          const Icon = s.icon;
          const isActive = s.key === active;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => selectScenario(s.key)}
              className={clsx(
                "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-700 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200",
              )}
            >
              <Icon size={15} />
              {s.name}
            </button>
          );
        })}
      </div>

      {/* timeline */}
      <Timeline scenario={scenario} stage={stage} duration={duration} />

      {/* 三階段 stepper */}
      <div className="flex items-center gap-1.5">
        {STAGES.map((st, i) => {
          const StIcon = st.icon;
          const isActive = i === stage;
          const isDone = i < stage;
          return (
            <div key={st.label} className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setStage(i as Stage)}
                className={clsx(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-blue-700 text-white"
                    : isDone
                      ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                      : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200",
                )}
              >
                <StIcon size={14} />
                <span>
                  {st.label}
                  <span className="opacity-70">（{st.hint}）</span>
                </span>
              </button>
              {i < STAGES.length - 1 && (
                <ArrowRight size={14} className="text-neutral-300 shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* 診療卡 */}
      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 space-y-4">
        <div>
          <div className="text-xs text-neutral-400">{scenario.span}</div>
          <h4 className="text-base font-semibold text-neutral-900 mt-0.5">
            {scenario.name}
          </h4>
        </div>

        {/* 症狀：介入前即顯示 */}
        <RevealSection
          icon={Eye}
          title="症狀（看板上長怎樣）"
          accent="text-red-600"
          duration={reveal}
        >
          <p className="text-sm text-neutral-700 leading-relaxed">
            {scenario.symptom}
          </p>
        </RevealSection>

        {/* 病因：介入中才揭露 */}
        <AnimatePresence>
          {stage >= 1 && (
            <RevealSection
              key="cause"
              icon={Stethoscope}
              title="病因（root cause）"
              accent="text-amber-600"
              duration={reveal}
            >
              <p className="text-sm text-neutral-700 leading-relaxed">
                {scenario.cause}
              </p>
            </RevealSection>
          )}
        </AnimatePresence>

        {/* 處方：介入後才揭露 */}
        <AnimatePresence>
          {stage >= 2 && (
            <RevealSection
              key="remedies"
              icon={Pill}
              title="處方（PM 的介入手段）"
              accent="text-green-700"
              duration={reveal}
            >
              <ul className="space-y-1.5">
                {scenario.remedies.map((r, i) => (
                  <motion.li
                    key={r}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: reveal,
                      delay: prefersReduced ? 0 : i * 0.08,
                      ease: "easeOut",
                    }}
                    className="flex items-start gap-2 text-sm text-neutral-700"
                  >
                    <span className="mt-0.5 shrink-0 text-green-600">
                      <Check size={16} />
                    </span>
                    <span>{r}</span>
                  </motion.li>
                ))}
              </ul>
            </RevealSection>
          )}
        </AnimatePresence>

        {/* 越早越便宜：全程顯示，作為提醒 */}
        <div className="flex items-start gap-2 rounded-lg bg-orange-50 px-3 py-2.5">
          <AlertTriangle
            size={16}
            className="mt-0.5 shrink-0 text-orange-500"
          />
          <p className="text-xs text-orange-700 leading-relaxed">
            <span className="font-medium">越早越便宜：</span>
            {scenario.ripple}
          </p>
        </div>
      </div>
    </div>
  );
}
