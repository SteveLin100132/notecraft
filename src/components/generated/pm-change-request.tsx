import React, { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Lock, Inbox, Zap, RotateCcw } from "lucide-react";

// -----------------------------------------------------------------------
// 需求變動：專案走正式變更流程 vs 產品走輕量 Backlog 流程
// -----------------------------------------------------------------------

const CR_PROJECT_STEPS = [
  { label: "評估影響範疇" },
  { label: "CR 提案文件" },
  { label: "多層簽核審批" },
  { label: "批准後執行變更" },
];

const CR_PRODUCT_STEPS = [
  { label: "加入 Backlog" },
  { label: "排序優先級" },
  { label: "下個 Sprint 執行" },
];

export default function PmChangeRequest(): React.ReactElement {
  const reducedMotion = useReducedMotion() ?? false;
  const [revealed, setRevealed] = useState(false);

  const containerVariants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.12 },
    },
  };

  const productContainerVariants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.08 },
    },
  };

  const itemVariants = {
    hidden: reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.28, ease: "easeOut" as const },
    },
  };

  return (
    <figure className="not-prose mx-auto" style={{ maxWidth: "48rem" }}>
      <div className="flex flex-col gap-4">
        {/* Two columns */}
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: "repeat(2, 1fr)",
          }}
        >
          {/* Project column */}
          <div className="flex flex-col gap-2">
            <div
              className="flex items-center gap-1.5 text-xs font-semibold mb-1"
              style={{ color: "var(--blue-700)" }}
            >
              <Lock size={14} style={{ color: "var(--blue-700)" }} />
              專案：正式變更流程
            </div>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate={revealed || reducedMotion ? "visible" : "hidden"}
              className="flex flex-col gap-2"
            >
              {CR_PROJECT_STEPS.map((step, i) => (
                <motion.div
                  key={i}
                  variants={itemVariants}
                  className="px-3 py-2.5 text-xs rounded-lg"
                  style={{
                    backgroundColor: "var(--blue-50)",
                    border: "1px solid var(--blue-200)",
                    color: "var(--text-body)",
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  <span
                    className="inline-block w-4 h-4 text-center leading-4 text-xs font-bold mr-1.5 rounded-full"
                    style={{
                      backgroundColor: "var(--blue-700)",
                      color: "var(--text-on-brand)",
                    }}
                  >
                    {i + 1}
                  </span>
                  {step.label}
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Product column */}
          <div className="flex flex-col gap-2">
            <div
              className="flex items-center gap-1.5 text-xs font-semibold mb-1"
              style={{ color: "var(--orange-500)" }}
            >
              <Inbox size={14} style={{ color: "var(--orange-500)" }} />
              產品：輕量 Backlog 流程
            </div>
            <motion.div
              variants={productContainerVariants}
              initial="hidden"
              animate={revealed || reducedMotion ? "visible" : "hidden"}
              className="flex flex-col gap-2"
            >
              {CR_PRODUCT_STEPS.map((step, i) => (
                <motion.div
                  key={i}
                  variants={itemVariants}
                  className="px-3 py-2.5 text-xs"
                  style={{
                    backgroundColor: "var(--orange-50)",
                    border: "1px solid var(--orange-200)",
                    color: "var(--text-body)",
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  <span
                    className="inline-block w-4 h-4 text-center leading-4 text-xs font-bold mr-1.5 rounded-full"
                    style={{
                      backgroundColor: "var(--orange-500)",
                      color: "var(--text-on-brand)",
                    }}
                  >
                    {i + 1}
                  </span>
                  {step.label}
                </motion.div>
              ))}
            </motion.div>

            {/* Spacer to fill height difference */}
            <div
              className="px-3 py-2.5 text-xs"
              style={{
                border: "1px dashed var(--orange-200)",
                color: "var(--text-muted)",
                borderRadius: "var(--radius-md)",
                opacity: revealed || reducedMotion ? 1 : 0,
              }}
            >
              <span className="italic">通常兩週內上線</span>
            </div>
          </div>
        </div>

        {/* Trigger button */}
        {!revealed && !reducedMotion && (
          <div className="flex justify-center">
            <button
              onClick={() => setRevealed(true)}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold transition-all"
              style={{
                backgroundColor: "var(--orange-400)",
                color: "var(--text-on-brand)",
                borderRadius: "var(--radius-pill)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <Zap size={16} />
              模擬需求變更
            </button>
          </div>
        )}

        {revealed && (
          <div className="flex justify-center">
            <button
              onClick={() => setRevealed(false)}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold transition-all"
              style={{
                backgroundColor: "var(--neutral-100)",
                color: "var(--text-muted)",
                borderRadius: "var(--radius-pill)",
                boxShadow: "var(--shadow-xs)",
              }}
            >
              <RotateCcw size={14} />
              重設
            </button>
          </div>
        )}
      </div>
    </figure>
  );
}
