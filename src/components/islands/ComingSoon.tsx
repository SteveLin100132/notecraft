import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Sparkles } from "lucide-react";

type Props = {
  /** 主標題，預設「Coming Soon」 */
  title?: string;
  /** 中文副標，預設「即將登場」 */
  subtitle?: string;
  /** 卡片下方補充說明 */
  hint?: string;
};

// 品牌色（trendlink-design）
const NAVY = "#1b4f9c"; // --blue-700
const AZURE = "#2c6ebb"; // --blue-500
const GOLD = "#ed9b26"; // --orange-400
const GOLD_DEEP = "#e37b24"; // --orange-500

// 環繞軌道上的點：角度（deg）+ 顏色 + 半徑微調
const ORBIT_DOTS = [
  { angle: -90, color: GOLD, r: 78 },
  { angle: -20, color: AZURE, r: 84 },
  { angle: 55, color: GOLD_DEEP, r: 76 },
  { angle: 135, color: NAVY, r: 82 },
  { angle: 205, color: GOLD, r: 80 },
];

export default function ComingSoon({
  title = "Coming Soon",
  subtitle = "即將登場",
  hint = "這篇筆記正在細細打磨，很快就會與你見面。",
}: Props) {
  const reduce = useReducedMotion();
  const [bursts, setBursts] = useState(0); // 彩蛋：點擊次數

  return (
    <div className="not-prose my-8 flex flex-col items-center gap-4">
      <motion.div
        onClick={() => setBursts((n) => n + 1)}
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative w-full cursor-pointer select-none overflow-hidden rounded-xl px-8 py-14 text-center"
        style={{
          background: "linear-gradient(160deg, #f6f8fb 0%, #eef4fb 55%, #d6e4f5 100%)",
          border: "2px dashed #adc8e8",
        }}
      >
        {/* 中央軌道區 */}
        <div className="relative mx-auto mb-8 h-44 w-44">
          {/* 虛線軌道環 — 緩慢旋轉 */}
          <motion.div
            aria-hidden
            className="absolute inset-2 rounded-full"
            style={{ border: "1.5px dashed #cbd3df" }}
            animate={reduce ? undefined : { rotate: 360 }}
            transition={{ duration: 24, ease: "linear", repeat: Infinity }}
          />

          {/* 環繞點 — 整組反向旋轉，點擊時加速一圈 */}
          <motion.div
            aria-hidden
            className="absolute inset-0"
            animate={reduce ? undefined : { rotate: -360 - bursts * 360 }}
            transition={{
              rotate: {
                duration: 18,
                ease: bursts ? "easeOut" : "linear",
                repeat: bursts ? 0 : Infinity,
              },
            }}
          >
            {ORBIT_DOTS.map((d, i) => {
              const rad = (d.angle * Math.PI) / 180;
              const x = Math.cos(rad) * d.r;
              const y = Math.sin(rad) * d.r;
              return (
                <motion.span
                  key={i}
                  className="absolute left-1/2 top-1/2 h-2.5 w-2.5 rounded-full"
                  style={{ background: d.color, x, y, marginLeft: -5, marginTop: -5 }}
                  animate={reduce ? undefined : { scale: [0.7, 1.1, 0.7] }}
                  transition={{ duration: 2, ease: "easeInOut", repeat: Infinity, delay: i * 0.25 }}
                />
              );
            })}
          </motion.div>

          {/* 中央光暈圓 */}
          <motion.div
            className="absolute left-1/2 top-1/2 flex h-20 w-20 items-center justify-center rounded-full"
            style={{
              marginLeft: -40,
              marginTop: -40,
              background: "radial-gradient(circle at 35% 30%, #ffffff 0%, #fbe7c6 70%, #f6cd86 100%)",
              boxShadow: `0 0 0 6px ${GOLD}1a, 0 10px 24px -6px ${GOLD}55`,
              color: GOLD_DEEP,
            }}
            animate={reduce ? undefined : { scale: [1, 1.07, 1] }}
            transition={{ duration: 2.6, ease: "easeInOut", repeat: Infinity }}
          >
            <motion.div
              key={bursts}
              animate={reduce ? undefined : { rotate: [0, 18, -12, 0], scale: [1, 1.25, 1] }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <Sparkles size={30} strokeWidth={2.2} />
            </motion.div>
          </motion.div>
        </div>

        {/* 大標題 — 漸層藍 */}
        <h3
          className="text-4xl font-extrabold tracking-tight sm:text-5xl"
          style={{
            background: `linear-gradient(180deg, ${AZURE} 0%, ${NAVY} 100%)`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          {title}
        </h3>

        {/* 副標 — 橘色寬字距 */}
        <p
          className="mt-2 text-sm font-bold"
          style={{ color: GOLD_DEEP, letterSpacing: "0.4em", paddingLeft: "0.4em" }}
        >
          {subtitle}
        </p>
      </motion.div>

      {/* 卡片下方說明 */}
      <p className="text-sm text-neutral-500">{hint}</p>
    </div>
  );
}
