import React, { useState } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'motion/react';
import {
  TriangleAlert,
  CheckCircle,
  MessageSquare,
  Settings,
  X,
  Globe,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* 地區資料                                                             */
/* ------------------------------------------------------------------ */

type RegionKey = 'tw' | 'jp' | 'vn';

interface RegionData {
  key: RegionKey;
  label: string;
  sublabel: string;
  chips: string[];
}

const REGIONS: RegionData[] = [
  {
    key: 'tw',
    label: '台灣',
    sublabel: 'TW',
    chips: ['勞保', '健保', '二代健保', '特休計算'],
  },
  {
    key: 'jp',
    label: '日本',
    sublabel: 'JP',
    chips: ['厚生年金', '健康保険', '残業 36協定'],
  },
  {
    key: 'vn',
    label: '越南',
    sublabel: 'VN',
    chips: ['社保 BHXH', '醫療 BHYT', '所得税 PIT'],
  },
];

const FIXED_BASE_CHIPS = ['社保', '加班', '假別', '扣款', '稅務'];

/* ------------------------------------------------------------------ */
/* 危險 badge 資料                                                      */
/* ------------------------------------------------------------------ */

const DANGER_BADGES = ['幻覺', '無法審計', '無驗證', '無區域差異參數'];

/* ------------------------------------------------------------------ */
/* 子元件：危險 badge                                                   */
/* ------------------------------------------------------------------ */

interface DangerBadgeProps {
  label: string;
  delay: number;
  shouldAnimate: boolean;
}

function DangerBadge({ label, delay, shouldAnimate }: DangerBadgeProps) {
  return (
    <motion.span
      initial={shouldAnimate ? { opacity: 0, y: -4 } : { opacity: 1, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldAnimate ? 0.2 : 0, delay: shouldAnimate ? delay : 0, ease: 'easeOut' }}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
      style={{
        backgroundColor: 'var(--danger-50)',
        color: 'var(--danger-500)',
        border: '1px solid var(--danger-500)',
      }}
    >
      <X size={10} strokeWidth={2.5} />
      {label}
    </motion.span>
  );
}

/* ------------------------------------------------------------------ */
/* 主元件                                                               */
/* ------------------------------------------------------------------ */

export default function PayrollLlmBoundary() {
  const shouldReduceMotion = useReducedMotion();
  const [activeRegion, setActiveRegion] = useState<RegionKey>('tw');

  const dur = (ms: number) => (shouldReduceMotion ? 0 : ms / 1000);
  const currentRegion = REGIONS.find((r) => r.key === activeRegion) ?? REGIONS[0];

  /* 節點入場動畫 helper */
  const nodeVariants = (index: number) => ({
    initial: shouldReduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: -12 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: dur(300), delay: shouldReduceMotion ? 0 : index * 0.08, ease: 'easeOut' },
  });

  /* 箭頭路徑動畫 */
  const arrowVariants = (delay: number) => ({
    initial: shouldReduceMotion ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0.5 },
    animate: { pathLength: 1, opacity: 1 },
    transition: { duration: dur(240), delay: shouldReduceMotion ? 0 : delay, ease: 'easeOut' },
  });

  /* ---------------------------------------------------------------- */
  /* SVG 常數                                                           */
  /* ---------------------------------------------------------------- */

  // 區域 A — 錯誤路徑（y: 30–130）
  const A_Y_CENTER = 80;
  const NODES_A = [
    { x: 60, w: 100, label: '使用者需求', type: 'neutral' },
    { x: 240, w: 160, label: 'LLM 直接輸出計算結果', type: 'danger' },
    { x: 490, w: 100, label: '使用者', type: 'neutral' },
  ];
  const ARROW_A1 = { x1: 162, x2: 236 };
  const ARROW_A2 = { x1: 402, x2: 486 };

  // 區域 B — 正確路徑（y: 230–370）
  const B_Y_TOP = 230;
  const B_NODE_H = 52;
  const B_Y_CENTER = B_Y_TOP + B_NODE_H / 2;

  const NODES_B_LEFT = [
    { x: 30, w: 90, label: '使用者需求', type: 'neutral', idx: 0 },
    { x: 160, w: 130, label: 'LLM 理解需求 / 解釋法規', type: 'blue', idx: 1 },
  ];
  const ARROW_B1 = { x1: 122, x2: 156 };

  // 程式化計算工具區塊
  const TOOL_X = 330;
  const TOOL_W = 220;
  const TOOL_Y = B_Y_TOP - 10;
  const TOOL_H = 90;

  // 右側節點
  const NODES_B_RIGHT = [
    { x: 596, w: 110, label: 'LLM 說明結果', type: 'blue', idx: 5 },
    { x: 752, w: 80, label: '使用者', type: 'neutral', idx: 6 },
  ];
  const ARROW_B2 = { x1: 292, x2: 326 };   // LLM → 工具
  const ARROW_B3 = { x1: 552, x2: 592 };   // 工具 → LLM右
  const ARROW_B4 = { x1: 708, x2: 748 };   // LLM右 → 使用者

  // 分隔線 y
  const SEP_Y = 185;

  /* 整體 SVG viewBox */
  const VB_W = 860;
  const VB_H = 370;

  /* ---------------------------------------------------------------- */
  /* Render                                                             */
  /* ---------------------------------------------------------------- */

  return (
    <div className="not-prose flex flex-col gap-4 max-w-4xl mx-auto">

      {/* ---- SVG diagram ---- */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          width="100%"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="薪資系統中 LLM 的正確邊界示意圖"
        >
          <defs>
            {/* 箭頭 marker — 一般 */}
            <marker id="arrow-neutral" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
              <path d="M0,0 L0,6 L7,3 z" fill="var(--neutral-400)" />
            </marker>
            {/* 箭頭 marker — 強調（藍色） */}
            <marker id="arrow-blue" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
              <path d="M0,0 L0,6 L7,3 z" fill="var(--blue-400)" />
            </marker>
          </defs>

          {/* ============================================================ */}
          {/* 區域 A 標題色帶                                              */}
          {/* ============================================================ */}
          <rect x="0" y="18" width="4" height="118" fill="var(--danger-500)" rx="2" />
          <motion.g {...nodeVariants(0)}>
            <svg x="10" y="22" viewBox="0 0 14 14" width="14" height="14" overflow="visible">
              <TriangleAlert size={14} color="var(--danger-500)" />
            </svg>
          </motion.g>
          <motion.text
            x="28"
            y="33"
            fontSize="13"
            fontWeight="600"
            fill="var(--text-strong)"
            {...(shouldReduceMotion
              ? {}
              : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: dur(300), delay: 0 } })}
          >
            錯誤路徑
          </motion.text>

          {/* ============================================================ */}
          {/* 區域 A 節點                                                  */}
          {/* ============================================================ */}

          {/* 節點 A-1：使用者需求 */}
          <motion.g {...nodeVariants(1)}>
            <rect
              x={NODES_A[0].x}
              y={A_Y_CENTER - 22}
              width={NODES_A[0].w}
              height={44}
              rx={6}
              fill="var(--neutral-100)"
              stroke="var(--neutral-300)"
              strokeWidth="1"
            />
            <text x={NODES_A[0].x + 50} y={A_Y_CENTER + 5} textAnchor="middle" fontSize="11" fill="var(--text-body)">
              使用者需求
            </text>
          </motion.g>

          {/* 箭頭 A1 */}
          <motion.line
            x1={ARROW_A1.x1} y1={A_Y_CENTER}
            x2={ARROW_A1.x2} y2={A_Y_CENTER}
            stroke="var(--neutral-400)"
            strokeWidth="1.5"
            markerEnd="url(#arrow-neutral)"
            {...(shouldReduceMotion ? {} : { initial: { pathLength: 0, opacity: 0.5 }, animate: { pathLength: 1, opacity: 1 }, transition: { duration: dur(240), delay: 0.1, ease: 'easeOut' } })}
          />

          {/* 節點 A-2：LLM 直接輸出（danger） */}
          <motion.g {...nodeVariants(2)}>
            <rect
              x={NODES_A[1].x}
              y={A_Y_CENTER - 28}
              width={NODES_A[1].w}
              height={56}
              rx={6}
              fill="var(--danger-50)"
              stroke="var(--danger-500)"
              strokeWidth="2"
            />
            {/* TriangleAlert icon rendered as foreignObject is tricky in SVG; use text fallback */}
            <text x={NODES_A[1].x + 16} y={A_Y_CENTER - 6} fontSize="11" fontWeight="600" fill="var(--danger-500)">
              &#9888;
            </text>
            <text x={NODES_A[1].x + 80} y={A_Y_CENTER - 8} textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--danger-500)">
              LLM 直接輸出
            </text>
            <text x={NODES_A[1].x + 80} y={A_Y_CENTER + 8} textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--danger-500)">
              計算結果
            </text>
          </motion.g>

          {/* 箭頭 A2 */}
          <motion.line
            x1={ARROW_A2.x1} y1={A_Y_CENTER}
            x2={ARROW_A2.x2} y2={A_Y_CENTER}
            stroke="var(--neutral-400)"
            strokeWidth="1.5"
            markerEnd="url(#arrow-neutral)"
            {...(shouldReduceMotion ? {} : { initial: { pathLength: 0, opacity: 0.5 }, animate: { pathLength: 1, opacity: 1 }, transition: { duration: dur(240), delay: 0.18, ease: 'easeOut' } })}
          />

          {/* 節點 A-3：使用者 */}
          <motion.g {...nodeVariants(3)}>
            <rect
              x={NODES_A[2].x}
              y={A_Y_CENTER - 22}
              width={NODES_A[2].w}
              height={44}
              rx={6}
              fill="var(--neutral-100)"
              stroke="var(--neutral-300)"
              strokeWidth="1"
            />
            <text x={NODES_A[2].x + 50} y={A_Y_CENTER + 5} textAnchor="middle" fontSize="11" fill="var(--text-body)">
              使用者
            </text>
          </motion.g>

          {/* ============================================================ */}
          {/* 分隔虛線                                                      */}
          {/* ============================================================ */}
          <line
            x1="0" y1={SEP_Y}
            x2={VB_W} y2={SEP_Y}
            stroke="var(--neutral-200)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          <rect x={VB_W / 2 - 56} y={SEP_Y - 10} width="112" height="20" rx="10" fill="var(--neutral-100)" stroke="var(--neutral-200)" strokeWidth="1" />
          <text x={VB_W / 2} y={SEP_Y + 4} textAnchor="middle" fontSize="10" fill="var(--text-muted)">
            LLM 的正確邊界
          </text>

          {/* ============================================================ */}
          {/* 區域 B 標題色帶                                              */}
          {/* ============================================================ */}
          <rect x="0" y={B_Y_TOP - 20} width="4" height={TOOL_H + 40} fill="var(--success-500)" rx="2" />
          <text x="28" y={B_Y_TOP - 5} fontSize="13" fontWeight="600" fill="var(--text-strong)">
            正確路徑
          </text>

          {/* ============================================================ */}
          {/* 區域 B 節點（左側）                                          */}
          {/* ============================================================ */}

          {/* 節點 B-1：使用者需求 */}
          <motion.g {...nodeVariants(4)}>
            <rect
              x={NODES_B_LEFT[0].x}
              y={B_Y_CENTER - 22}
              width={NODES_B_LEFT[0].w}
              height={44}
              rx={6}
              fill="var(--neutral-100)"
              stroke="var(--neutral-300)"
              strokeWidth="1"
            />
            <text x={NODES_B_LEFT[0].x + 45} y={B_Y_CENTER + 5} textAnchor="middle" fontSize="11" fill="var(--text-body)">
              使用者需求
            </text>
          </motion.g>

          {/* 箭頭 B1 */}
          <motion.line
            x1={ARROW_B1.x1} y1={B_Y_CENTER}
            x2={ARROW_B1.x2} y2={B_Y_CENTER}
            stroke="var(--neutral-400)"
            strokeWidth="1.5"
            markerEnd="url(#arrow-neutral)"
            {...(shouldReduceMotion ? {} : { initial: { pathLength: 0, opacity: 0.5 }, animate: { pathLength: 1, opacity: 1 }, transition: { duration: dur(240), delay: 0.24, ease: 'easeOut' } })}
          />

          {/* 節點 B-2：LLM 理解需求 */}
          <motion.g {...nodeVariants(5)}>
            <rect
              x={NODES_B_LEFT[1].x}
              y={B_Y_CENTER - 28}
              width={NODES_B_LEFT[1].w}
              height={56}
              rx={6}
              fill="var(--blue-50)"
              stroke="var(--blue-500)"
              strokeWidth="1"
            />
            <text x={NODES_B_LEFT[1].x + 65} y={B_Y_CENTER - 8} textAnchor="middle" fontSize="10" fill="var(--blue-700)">
              LLM 理解需求 /
            </text>
            <text x={NODES_B_LEFT[1].x + 65} y={B_Y_CENTER + 8} textAnchor="middle" fontSize="10" fill="var(--blue-700)">
              解釋法規
            </text>
          </motion.g>

          {/* 箭頭 B2（呼叫工具）— 強調藍 */}
          <motion.line
            x1={ARROW_B2.x1} y1={B_Y_CENTER}
            x2={ARROW_B2.x2} y2={B_Y_CENTER}
            stroke="var(--blue-400)"
            strokeWidth="2"
            markerEnd="url(#arrow-blue)"
            {...(shouldReduceMotion ? {} : { initial: { pathLength: 0, opacity: 0.5 }, animate: { pathLength: 1, opacity: 1 }, transition: { duration: dur(240), delay: 0.32, ease: 'easeOut' } })}
          />
          <text x={(ARROW_B2.x1 + ARROW_B2.x2) / 2} y={B_Y_CENTER - 8} textAnchor="middle" fontSize="10" fill="var(--text-muted)">
            呼叫工具
          </text>

          {/* ============================================================ */}
          {/* 程式化計算工具大方塊（SVG 純框）                             */}
          {/* ============================================================ */}
          <motion.g {...nodeVariants(6)}>
            <rect
              x={TOOL_X}
              y={TOOL_Y}
              width={TOOL_W}
              height={TOOL_H}
              rx={10}
              fill="var(--success-50)"
              stroke="var(--success-500)"
              strokeWidth="1.5"
            />
            <text x={TOOL_X + TOOL_W / 2} y={TOOL_Y + 16} textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--success-500)">
              程式化計算工具
            </text>
            {/* 固定基底標籤 */}
            <text x={TOOL_X + 8} y={TOOL_Y + 34} fontSize="9" fill="var(--text-muted)">
              固定基底
            </text>
          </motion.g>

          {/* 箭頭 B3（回傳結果）*/}
          <motion.line
            x1={ARROW_B3.x1} y1={B_Y_CENTER}
            x2={ARROW_B3.x2} y2={B_Y_CENTER}
            stroke="var(--neutral-400)"
            strokeWidth="1.5"
            markerEnd="url(#arrow-neutral)"
            {...(shouldReduceMotion ? {} : { initial: { pathLength: 0, opacity: 0.5 }, animate: { pathLength: 1, opacity: 1 }, transition: { duration: dur(240), delay: 0.4, ease: 'easeOut' } })}
          />
          <text x={(ARROW_B3.x1 + ARROW_B3.x2) / 2} y={B_Y_CENTER - 8} textAnchor="middle" fontSize="10" fill="var(--text-muted)">
            回傳結果
          </text>

          {/* 節點 B-3：LLM 說明結果 */}
          <motion.g {...nodeVariants(7)}>
            <rect
              x={NODES_B_RIGHT[0].x}
              y={B_Y_CENTER - 22}
              width={NODES_B_RIGHT[0].w}
              height={44}
              rx={6}
              fill="var(--blue-50)"
              stroke="var(--blue-500)"
              strokeWidth="1"
            />
            <text x={NODES_B_RIGHT[0].x + 55} y={B_Y_CENTER + 5} textAnchor="middle" fontSize="10" fill="var(--blue-700)">
              LLM 說明結果
            </text>
          </motion.g>

          {/* 箭頭 B4 */}
          <motion.line
            x1={ARROW_B4.x1} y1={B_Y_CENTER}
            x2={ARROW_B4.x2} y2={B_Y_CENTER}
            stroke="var(--neutral-400)"
            strokeWidth="1.5"
            markerEnd="url(#arrow-neutral)"
            {...(shouldReduceMotion ? {} : { initial: { pathLength: 0, opacity: 0.5 }, animate: { pathLength: 1, opacity: 1 }, transition: { duration: dur(240), delay: 0.48, ease: 'easeOut' } })}
          />

          {/* 節點 B-4：使用者 */}
          <motion.g {...nodeVariants(8)}>
            <rect
              x={NODES_B_RIGHT[1].x}
              y={B_Y_CENTER - 22}
              width={NODES_B_RIGHT[1].w}
              height={44}
              rx={6}
              fill="var(--neutral-100)"
              stroke="var(--neutral-300)"
              strokeWidth="1"
            />
            <text x={NODES_B_RIGHT[1].x + 40} y={B_Y_CENTER + 5} textAnchor="middle" fontSize="11" fill="var(--text-body)">
              使用者
            </text>
          </motion.g>

        </svg>
      </div>

      {/* ---- 危險 badge（SVG 外，浮在 LLM 錯誤節點上方視覺位置不適合 SVG foreignObject，改用 HTML 絕對定位替代） */}
      {/* 因 SVG 與 HTML 定位較複雜，badges 改為圖說列在錯誤路徑下方 */}
      <div className="flex flex-wrap gap-2 justify-center -mt-2">
        <p className="w-full text-center text-xs font-medium" style={{ color: 'var(--danger-500)' }}>
          LLM 直接輸出計算結果的問題：
        </p>
        {DANGER_BADGES.map((label, i) => (
          <DangerBadge key={label} label={label} delay={i * 0.06} shouldAnimate={!shouldReduceMotion} />
        ))}
      </div>

      {/* ---- 程式化計算工具詳細內容（HTML，補充 SVG 的基底 + 可換模組） */}
      <div
        className="rounded-[10px] p-4"
        style={{
          backgroundColor: 'var(--success-50)',
          border: '1.5px solid var(--success-500)',
        }}
      >
        <p className="text-xs font-semibold mb-3" style={{ color: 'var(--success-500)' }}>
          程式化計算工具 — 內部結構
        </p>

        {/* 固定基底 */}
        <div className="mb-3">
          <p className="text-[10px] font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
            固定基底（切換地區時保持不變）
          </p>
          <div className="flex flex-wrap gap-1.5">
            {FIXED_BASE_CHIPS.map((chip) => (
              <span
                key={chip}
                className="px-2.5 py-0.5 text-[10px] rounded-full"
                style={{
                  backgroundColor: 'var(--blue-50)',
                  border: '1px solid var(--blue-300)',
                  color: 'var(--text-body)',
                }}
              >
                {chip}
              </span>
            ))}
          </div>
        </div>

        {/* 地區差異模組 */}
        <div>
          <p className="text-[10px] font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
            地區差異模組（可替換）
          </p>
          <div className="min-h-[32px] flex flex-wrap gap-1.5">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeRegion}
                initial={shouldReduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -8 }}
                transition={{ duration: dur(200), ease: 'easeOut' }}
                className="flex flex-wrap gap-1.5"
              >
                {currentRegion.chips.map((chip) => (
                  <span
                    key={chip}
                    className="px-2.5 py-0.5 text-[10px] rounded-full font-medium"
                    style={{
                      backgroundColor: 'var(--orange-50)',
                      border: '2px solid var(--orange-400)',
                      color: 'var(--orange-600)',
                    }}
                  >
                    {chip}
                  </span>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ---- 地區切換 tab ---- */}
      <div className="flex justify-center gap-2">
        {REGIONS.map((region) => {
          const isActive = region.key === activeRegion;
          return (
            <button
              key={region.key}
              type="button"
              onClick={() => setActiveRegion(region.key)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium transition-all duration-200 rounded-full focus:outline-none focus-visible:ring-2"
              style={{
                backgroundColor: isActive ? 'var(--orange-400)' : 'var(--neutral-100)',
                color: isActive ? 'var(--neutral-900)' : 'var(--neutral-500)',
                border: isActive ? '1.5px solid var(--orange-400)' : '1.5px solid var(--neutral-200)',
              }}
              aria-pressed={isActive}
            >
              <Globe size={12} />
              {region.label}
              <span
                className="text-[9px] font-semibold opacity-70"
              >
                {region.sublabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* ---- 核心洞察提示 ---- */}
      <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
        LLM 只負責「理解語意、呼叫工具」；每個數字都來自可被審計的程式化模組。
      </p>
    </div>
  );
}
