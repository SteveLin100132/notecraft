import { useReducedMotion, motion } from "motion/react";
import { Lock, RefreshCw } from "lucide-react";

// Color tokens (literal values — CSS variables are not expanded in SVG fill attributes during Astro SSR static output)
const C = {
  blue: "#1b4f9c",
  blueSoft: "#eef4fb",
  orange: "#e37b24",
  orangeSoft: "#fdf4e6",
  slate: "#3a4456",
  muted: "#6c798e",
  border: "#e1e6ee",
  green: "#2e9e6b",
  white: "#ffffff",
};

// Easing shared across all motion variants
const ease = [0.16, 1, 0.3, 1] as const;

interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  reduced: boolean;
  className?: string;
}

function FadeIn({ children, delay = 0, reduced, className }: FadeInProps) {
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease }}
    >
      {children}
    </motion.div>
  );
}

export default function FiberStates() {
  const reduced = useReducedMotion() ?? false;

  // Shared animation helpers for SVG elements
  const svgMotionProps = (delay: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          transition: { duration: 0.3, delay, ease },
        };

  return (
    <figure
      role="img"
      aria-label="React Fiber Work Loop 狀態圖"
      className="rounded-2xl border border-[#e1e6ee] bg-white shadow-sm p-6 not-prose"
    >
      {/* Eyebrow label */}
      <FadeIn reduced={reduced} delay={0} className="mb-4">
        <p
          className="text-[11px] tracking-widest uppercase font-semibold"
          style={{ color: C.muted }}
        >
          REACT FIBER — WORK LOOP
        </p>
      </FadeIn>

      {/* Main SVG diagram */}
      <FadeIn reduced={reduced} delay={0.05}>
        <svg
          viewBox="0 0 780 480"
          width="100%"
          preserveAspectRatio="xMidYMid meet"
          style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif", overflow: "visible" }}
        >
          <defs>
            {/* Arrow markers */}
            <marker id="fs-arrow-default" markerWidth={10} markerHeight={10} refX={8} refY={5} orient="auto">
              <path d="M0 0 L10 5 L0 10 Z" fill={C.slate} />
            </marker>
            <marker id="fs-arrow-orange" markerWidth={10} markerHeight={10} refX={8} refY={5} orient="auto">
              <path d="M0 0 L10 5 L0 10 Z" fill={C.orange} />
            </marker>
            <marker id="fs-arrow-green" markerWidth={10} markerHeight={10} refX={8} refY={5} orient="auto">
              <path d="M0 0 L10 5 L0 10 Z" fill={C.green} />
            </marker>
            <marker id="fs-arrow-dashed" markerWidth={10} markerHeight={10} refX={8} refY={5} orient="auto">
              <path d="M0 0 L10 5 L0 10 Z" fill={C.muted} />
            </marker>
          </defs>

          {/* ── Background bands ── */}

          {/* Render Phase band */}
          <motion.rect
            x={60} y={55} width={480} height={310}
            rx={12} ry={12}
            fill={C.blueSoft}
            stroke={C.border}
            strokeWidth={1}
            {...(reduced ? {} : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3, delay: 0.1, ease } })}
          />
          <motion.text
            x={76} y={76}
            fontSize={11} fontWeight={600} fill={C.muted} letterSpacing=".06em"
            {...(reduced ? {} : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3, delay: 0.15, ease } })}
          >
            RENDER PHASE（可中斷）
          </motion.text>

          {/* Commit Phase band */}
          <motion.rect
            x={280} y={388} width={220} height={68}
            rx={12} ry={12}
            fill={C.orangeSoft}
            stroke={C.border}
            strokeWidth={1}
            {...(reduced ? {} : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3, delay: 0.2, ease } })}
          />
          <motion.text
            x={296} y={403}
            fontSize={11} fontWeight={600} fill={C.muted} letterSpacing=".06em"
            {...(reduced ? {} : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3, delay: 0.25, ease } })}
          >
            COMMIT PHASE（同步）
          </motion.text>

          {/* ── Nodes ── */}

          {/* 1. beginWork() node — (390,90), centered */}
          <motion.g {...svgMotionProps(0.3)}>
            <rect x={330} y={80} width={120} height={44} rx={10} fill={C.white} stroke={C.border} strokeWidth={1.5} />
            <text x={390} y={98} textAnchor="middle" fontSize={13} fontWeight={700} fill={C.blue}>beginWork()</text>
            <text x={390} y={114} textAnchor="middle" fontSize={11} fill={C.muted}>處理每個 fiber 節點</text>
          </motion.g>

          {/* 2. yield decision diamond — (390,200) */}
          <motion.g transform="translate(390,200)" {...svgMotionProps(0.35)}>
            <rect x={-54} y={-32} width={108} height={64} rx={6} transform="rotate(45)" fill={C.white} stroke={C.orange} strokeWidth={1.8} />
            <text x={0} y={-8} textAnchor="middle" fontSize={11} fontWeight={600} fill={C.slate}>排程器有</text>
            <text x={0} y={7} textAnchor="middle" fontSize={11} fontWeight={600} fill={C.slate}>更高優先任務？</text>
          </motion.g>

          {/* 3. Yield / interrupt node — (590,200), dashed border */}
          <motion.g {...svgMotionProps(0.4)}>
            <rect x={530} y={178} width={150} height={44} rx={10} fill={C.white} stroke={C.muted} strokeWidth={1.5} strokeDasharray="5 3" />
            <text x={605} y={196} textAnchor="middle" fontSize={12} fontWeight={600} fill={C.muted}>歸還控制權</text>
            <text x={605} y={212} textAnchor="middle" fontSize={11} fill={C.muted}>給 scheduler</text>
          </motion.g>

          {/* 4. completeWork() node — (390,310) */}
          <motion.g {...svgMotionProps(0.45)}>
            <rect x={330} y={298} width={120} height={44} rx={10} fill={C.white} stroke={C.border} strokeWidth={1.5} />
            <text x={390} y={316} textAnchor="middle" fontSize={13} fontWeight={700} fill={C.blue}>completeWork()</text>
            <text x={390} y={332} textAnchor="middle" fontSize={11} fill={C.muted}>完成 fiber 工作</text>
          </motion.g>

          {/* 5. commitRoot() node — (390,420), filled blue */}
          <motion.g {...svgMotionProps(0.5)}>
            <rect x={330} y={410} width={120} height={44} rx={10} fill={C.blue} stroke={C.blue} strokeWidth={1.5} />
            <text x={390} y={428} textAnchor="middle" fontSize={13} fontWeight={700} fill={C.white}>commitRoot()</text>
            <text x={390} y={444} textAnchor="middle" fontSize={11} fill="rgba(255,255,255,0.75)">DOM 變更提交</text>
          </motion.g>

          {/* ── Arrows ── */}

          {/* a. beginWork → yield (down) */}
          <motion.g {...svgMotionProps(0.55)}>
            <line
              x1={390} y1={124} x2={390} y2={163}
              stroke={C.slate} strokeWidth={1.8}
              markerEnd="url(#fs-arrow-default)"
            />
            <text x={406} y={149} fontSize={11} fill={C.muted}>每個 fiber 處理完畢</text>
          </motion.g>

          {/* b. yield → Yield node (right, Yes branch, orange) */}
          <motion.g {...svgMotionProps(0.6)}>
            <line
              x1={436} y1={200} x2={527} y2={200}
              stroke={C.orange} strokeWidth={1.8}
              markerEnd="url(#fs-arrow-orange)"
            />
            <text x={480} y={192} textAnchor="middle" fontSize={11} fontWeight={600} fill={C.orange}>Yes</text>
          </motion.g>

          {/* c. Yield node → beginWork (L-shape dashed resume path) */}
          <motion.g {...svgMotionProps(0.65)}>
            <path
              d="M 605 178 L 605 55 L 390 55 L 390 80"
              stroke={C.muted} strokeWidth={1.5} strokeDasharray="5 4"
              fill="none" markerEnd="url(#fs-arrow-dashed)"
            />
            <text x={500} y={47} textAnchor="middle" fontSize={11} fill={C.muted}>resumeWork</text>
          </motion.g>

          {/* d. yield → completeWork (down, No branch, green) */}
          <motion.g {...svgMotionProps(0.6)}>
            <line
              x1={390} y1={237} x2={390} y2={295}
              stroke={C.green} strokeWidth={1.8}
              markerEnd="url(#fs-arrow-green)"
            />
            <text x={406} y={272} fontSize={11} fontWeight={600} fill={C.green}>No — 繼續</text>
          </motion.g>

          {/* e. completeWork → commitRoot (down) */}
          <motion.g {...svgMotionProps(0.65)}>
            <line
              x1={390} y1={342} x2={390} y2={407}
              stroke={C.slate} strokeWidth={1.8}
              markerEnd="url(#fs-arrow-default)"
            />
            <text x={406} y={380} fontSize={11} fill={C.muted}>effect list 完成</text>
          </motion.g>
        </svg>
      </FadeIn>

      {/* HTML overlay for icons (outside SVG for Astro SSR compatibility) */}
      <FadeIn reduced={reduced} delay={0.7} className="mt-3 flex items-center gap-3 flex-wrap">
        {/* Commit phase: not-interruptible badge */}
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold bg-[#1b4f9c] text-white">
          <Lock size={11} />
          commitRoot — 不可中斷
        </span>
        {/* Resume path badge */}
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold border border-[#e1e6ee] text-[#6c798e]">
          <RefreshCw size={11} />
          resumeWork — 從中斷點恢復
        </span>
      </FadeIn>

      {/* Legend */}
      <FadeIn reduced={reduced} delay={0.75} className="mt-4 pt-3 border-t border-[#e1e6ee] flex flex-wrap gap-4">
        <span className="flex items-center gap-2 text-[11px]" style={{ color: C.muted }}>
          <svg width="28" height="10">
            <line x1={0} y1={5} x2={28} y2={5} stroke={C.slate} strokeWidth={1.8} />
          </svg>
          正常流程
        </span>
        <span className="flex items-center gap-2 text-[11px]" style={{ color: C.muted }}>
          <svg width="28" height="10">
            <line x1={0} y1={5} x2={28} y2={5} stroke={C.muted} strokeWidth={1.5} strokeDasharray="4 3" />
          </svg>
          可中斷路徑
        </span>
        <span className="flex items-center gap-2 text-[11px]" style={{ color: C.muted }}>
          <svg width="14" height="14">
            <rect x={1} y={1} width={12} height={12} rx={3} fill={C.blue} />
          </svg>
          Commit（同步不可中斷）
        </span>
      </FadeIn>
    </figure>
  );
}
