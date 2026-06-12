import { XCircle, CircleCheck, TriangleAlert } from "lucide-react";

interface ContrastRow {
  misconception: string;
  reality: string;
}

const rows: ContrastRow[] = [
  {
    misconception: "可以「偵測關鍵字」自動觸發",
    reality: "只在生命週期事件機械式觸發",
  },
  {
    misconception: "可以做語意判斷",
    reality: "只能跑 shell script，沒有判斷力",
  },
  {
    misconception: "可以呼叫 AI 來決定要做什麼",
    reality: "要 AI 判斷必須自己呼叫 API（需 API key、要付費）",
  },
  {
    misconception: "應該「幫我做事」",
    reality: "Hook 是「哨兵」不是「執行者」",
  },
  {
    misconception: "所有自動化都該用 hook",
    reality: "判斷給 AI、執行給 script、強制檢查才給 hook",
  },
];

export default function HookCognitionContrast() {
  return (
    <figure
      className="not-prose my-6 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm"
      role="figure"
      aria-label="Hook 認知對照：原本的誤解 vs 實際上的運作方式"
    >
      {/* Column headers */}
      <div className="grid grid-cols-1 sm:grid-cols-2">
        <div className="flex items-center gap-2 bg-neutral-100 px-5 py-3 text-neutral-500">
          <XCircle size={18} className="shrink-0" />
          <span className="text-sm font-semibold tracking-wide">原本的認知</span>
        </div>
        <div className="flex items-center gap-2 bg-blue-700 px-5 py-3 text-white">
          <CircleCheck size={18} className="shrink-0" />
          <span className="text-sm font-semibold tracking-wide">實際上的 hook</span>
        </div>
      </div>

      {/* Contrast rows */}
      <div className="grid grid-cols-1 divide-y divide-neutral-100 sm:grid-cols-2 sm:divide-y-0">
        {rows.map((row, index) => (
          <>
            <div
              key={`mis-${index}`}
              className="flex items-start gap-2 border-b border-neutral-100 bg-neutral-50 px-5 py-3 sm:border-r sm:border-neutral-100"
            >
              <XCircle
                size={16}
                className="mt-0.5 shrink-0 text-neutral-400"
              />
              <span className="text-sm leading-relaxed text-neutral-600">
                {row.misconception}
              </span>
            </div>
            <div
              key={`real-${index}`}
              className="flex items-start gap-2 border-b border-blue-100 bg-blue-50 px-5 py-3"
            >
              <CircleCheck
                size={16}
                className="mt-0.5 shrink-0 text-blue-600"
              />
              <span className="text-sm leading-relaxed text-blue-900">
                {row.reality}
              </span>
            </div>
          </>
        ))}
      </div>

      {/* Warning card */}
      <div className="flex items-start gap-3 border-l-4 border-orange-400 bg-[color:var(--orange-50)] px-5 py-4">
        <TriangleAlert
          size={20}
          className="mt-0.5 shrink-0 text-orange-500"
        />
        <div>
          <p className="text-sm font-bold leading-snug text-orange-700">
            最關鍵的誤解
          </p>
          <p className="mt-1 text-sm leading-relaxed text-neutral-700">
            把「使用者說 commit 就觸發」當成 hook 的工作。實際上那是 AI 在做語意理解，hook
            只認得生命週期事件（SessionStart、Stop、PreToolUse 等），不認得「意圖」。
          </p>
        </div>
      </div>
    </figure>
  );
}
