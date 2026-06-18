import { useState, useCallback, useId } from 'react';
import { useReducedMotion, motion } from 'motion/react';
import { Scale, Zap, Shield, Globe, Share2, GitMerge, Bot, Users } from 'lucide-react';
import { clsx } from 'clsx';

/* ---------------------------------------------------------------
   型別定義
--------------------------------------------------------------- */
interface DialItem {
  id: string;
  title: string;
  leftLabel: string;
  rightLabel: string;
  leftIcon: React.ReactNode;
  rightIcon: React.ReactNode;
  hints: {
    leftStrong: string;   // 偏左強調
    left: string;         // 偏左
    center: string;       // 中間
    right: string;        // 偏右
    rightStrong: string;  // 偏右強調
  };
}

/* ---------------------------------------------------------------
   五題設定
--------------------------------------------------------------- */
const DIALS: DialItem[] = [
  {
    id: 'task-dispatch',
    title: '多角色 / 多 Session 任務分派',
    leftLabel: '極致效率',
    rightLabel: '穩定可控',
    leftIcon: <Zap size={14} />,
    rightIcon: <Shield size={14} />,
    hints: {
      leftStrong: '高度並行、自動路由，速度最大化。需要強健的衝突處理與回滾機制，風險集中。',
      left: '以效率為主軸，多工並發。需注意任務狀態同步，偶發衝突由系統自動解決。',
      center: '待團隊決定：在速度與穩定之間選定平衡點，定義衝突發生時的優先處置規則。',
      right: '保留人工審核關鍵節點，降低意外發散風險。吞吐量略低，但可預測性高。',
      rightStrong: '所有任務分派經人工核准，完整可溯源。速度最慢，但適合高風險或合規情境。',
    },
  },
  {
    id: 'qa-automation',
    title: 'QA 與測試自動化程度（尤其 E2E）',
    leftLabel: '全自動',
    rightLabel: '人工把關',
    leftIcon: <Bot size={14} />,
    rightIcon: <Users size={14} />,
    hints: {
      leftStrong: '全流程自動化，CI 直接決定是否上線。速度極快，但測試覆蓋不完整時風險高。',
      left: '大部分情境自動化，極少量例外情境由人工補足。維護成本中等，效率明顯提升。',
      center: '待團隊決定：釐清哪些測試場景適合自動化、哪些需保留人工判斷，避免誤報與漏報。',
      right: 'E2E 以人工為主，自動化作為輔助。可捕捉主觀使用體驗，但速度受限於人力排程。',
      rightStrong: '全程人工測試，零自動化。品質主觀把關最嚴，但無法規模化，也難以快速迭代。',
    },
  },
  {
    id: 'doc-versioning',
    title: '文件存放與版本控管（涉外部 / 雲端）',
    leftLabel: '集中統一',
    rightLabel: '分散靈活',
    leftIcon: <Globe size={14} />,
    rightIcon: <Share2 size={14} />,
    hints: {
      leftStrong: '單一真相來源，強制版本控管。查找容易，但工具遷移或權限衝突時影響全局。',
      left: '主要集中管理，少數場景允許外部同步。版本一致性高，偶發例外需額外對齊。',
      center: '待團隊決定：定義哪些文件屬核心資產須集中、哪些允許外部 / 雲端自由存取。',
      right: '各工具各自管理，靈活度高。但版本碎片化，跨工具搜尋與稽核難度增加。',
      rightStrong: '完全分散，無中央索引。每個人選用最順手的工具，但知識易孤立、難以整體移交。',
    },
  },
  {
    id: 'api-deprecation',
    title: 'API 版本淘汰與遷移',
    leftLabel: '積極淘汰舊版',
    rightLabel: '長期相容',
    leftIcon: <Zap size={14} />,
    rightIcon: <Shield size={14} />,
    hints: {
      leftStrong: '嚴格廢棄期限，舊版快速下線。技術債清除快，但對消費端衝擊大，需強力溝通。',
      left: '訂定明確遷移期，過期後斷線。消費端有足夠時間調適，風險可控。',
      center: '待團隊決定：訂定廢棄 SLA（例如 6 個月通知期），平衡演進速度與消費端負擔。',
      right: '維持舊版長達數年，消費端零壓力。但維護成本持續累積，技術棧難以現代化。',
      rightStrong: '永久向後相容，舊版永不下線。最大相容性，但技術債幾乎無法清除。',
    },
  },
  {
    id: 'ai-review',
    title: 'commit / review / 衝突解決的 AI 自動化',
    leftLabel: 'AI 主導',
    rightLabel: '人工把關',
    leftIcon: <Bot size={14} />,
    rightIcon: <GitMerge size={14} />,
    hints: {
      leftStrong: 'AI 全程自動 merge、解衝突、通過 review。速度最快，但錯誤判斷可能直接進主幹。',
      left: 'AI 提供建議並自動處理低風險變更，人工只看例外。效率高，需信任 AI 判斷。',
      center: '待團隊決定：定義 AI 可自主執行的操作範圍，與必須人工確認的安全邊界。',
      right: 'AI 輔助分析，人工做最終決定。可靠性高，但 review 瓶頸仍在人力排程上。',
      rightStrong: '所有 commit 與衝突解決皆由人工處理，AI 僅作參考。品質可控，但速度完全依賴人力。',
    },
  },
];

/* ---------------------------------------------------------------
   取得提示文字
--------------------------------------------------------------- */
function getHint(value: number, hints: DialItem['hints']): string {
  if (value <= 15) return hints.leftStrong;
  if (value <= 35) return hints.left;
  if (value <= 65) return hints.center;
  if (value <= 85) return hints.right;
  return hints.rightStrong;
}

/* ---------------------------------------------------------------
   單張 Dial 卡片
--------------------------------------------------------------- */
interface DialCardProps {
  item: DialItem;
  value: number;
  onChange: (v: number) => void;
  reducedMotion: boolean;
}

function DialCard({ item, value, onChange, reducedMotion }: DialCardProps) {
  const inputId = useId();
  const hint = getHint(value, item.hints);
  const isCenter = value >= 36 && value <= 64;

  // 左 / 右偏向強度（0=中→1=極端）
  const leftIntensity = value <= 50 ? (50 - value) / 50 : 0;
  const rightIntensity = value > 50 ? (value - 50) / 50 : 0;

  const thumbPercent = value; // 0–100

  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-3">
      {/* 標題列 */}
      <div className="flex items-start gap-2">
        <Scale size={16} className="mt-0.5 shrink-0 text-neutral-500" />
        <p className="text-sm font-semibold text-neutral-800 leading-snug">{item.title}</p>
      </div>

      {/* Slider 軌道區 */}
      <div className="space-y-2">
        {/* 兩端標籤 */}
        <div className="flex justify-between items-center gap-2">
          <span
            className={clsx(
              'flex items-center gap-1 text-xs font-medium transition-colors duration-200',
              leftIntensity > 0.3 ? 'text-blue-700' : 'text-blue-400',
            )}
            style={{ opacity: 0.5 + leftIntensity * 0.5 }}
          >
            {item.leftIcon}
            {item.leftLabel}
          </span>
          <span
            className={clsx(
              'flex items-center gap-1 text-xs font-medium transition-colors duration-200',
              rightIntensity > 0.3 ? 'text-orange-500' : 'text-orange-400',
            )}
            style={{ opacity: 0.5 + rightIntensity * 0.5 }}
          >
            {item.rightLabel}
            {item.rightIcon}
          </span>
        </div>

        {/* 可視化軌道（SVG）+ 原生 range（可及性） */}
        <div className="relative h-8 flex items-center">
          {/* SVG 軌道 */}
          <svg
            viewBox="0 0 300 16"
            width="100%"
            height="16"
            aria-hidden="true"
            className="absolute inset-0"
            style={{ pointerEvents: 'none' }}
          >
            {/* 漸層背景軌道 */}
            <defs>
              <linearGradient id={`track-${item.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1b4f9c" stopOpacity="0.25" />
                <stop offset="50%" stopColor="#e1e6ee" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#e37b24" stopOpacity="0.25" />
              </linearGradient>
            </defs>
            <rect x="6" y="6" width="288" height="4" rx="2" fill={`url(#track-${item.id})`} />

            {/* 填充段（左至滑塊） */}
            <rect
              x="6"
              y="6"
              width={Math.max(0, (thumbPercent / 100) * 288 - 2)}
              height="4"
              rx="2"
              fill={value <= 50 ? '#1b4f9c' : '#e37b24'}
              opacity="0.45"
            />

            {/* 滑塊圓點 */}
            <circle
              cx={6 + (thumbPercent / 100) * 288}
              cy="8"
              r="7"
              fill={value <= 50 ? '#1b4f9c' : '#e37b24'}
              opacity="0.9"
            />
            <circle
              cx={6 + (thumbPercent / 100) * 288}
              cy="8"
              r="3.5"
              fill="white"
              opacity="0.9"
            />
          </svg>

          {/* 原生 range（隱藏外觀但保留鍵盤 / 指針操作） */}
          <input
            id={inputId}
            type="range"
            min={0}
            max={100}
            step={1}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            aria-label={`${item.title}：${item.leftLabel} 至 ${item.rightLabel}，目前值 ${value}`}
            className={clsx(
              'absolute inset-0 w-full h-full cursor-pointer opacity-0',
              'focus:opacity-100 focus:outline-none focus-visible:outline-2 focus-visible:outline-blue-500',
            )}
            style={{ WebkitAppearance: 'none' }}
          />
        </div>

        {/* 中間指示 */}
        {isCenter && (
          <p className="text-center text-[11px] text-neutral-400 font-medium tracking-wide">
            — 目前：中間 —
          </p>
        )}
      </div>

      {/* 取捨提示文字 —— 原地更新，不隨數值變動而重新掛載（避免拖動時閃爍 / 空白） */}
      <div
        className={clsx(
          'rounded-lg px-3 py-2 text-xs leading-relaxed min-h-[3.25rem] transition-colors duration-200',
          isCenter
            ? 'bg-neutral-100 text-neutral-600 border border-neutral-200'
            : value <= 50
            ? 'bg-blue-50 text-blue-900 border border-blue-200'
            : 'bg-orange-50 text-orange-700 border border-orange-200',
        )}
      >
        <motion.span
          key={hint}
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="block"
        >
          {hint}
        </motion.span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   主元件
--------------------------------------------------------------- */
export default function ClarifyTensionDials() {
  const reducedMotion = useReducedMotion() ?? false;

  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(DIALS.map((d) => [d.id, 50])),
  );

  const handleChange = useCallback((id: string, v: number) => {
    setValues((prev) => ({ ...prev, [id]: v }));
  }, []);

  return (
    <div className="not-prose max-w-2xl mx-auto space-y-4">
      {/* 頂部說明 */}
      <div className="flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
        <Scale size={16} className="mt-0.5 shrink-0 text-blue-600" />
        <p className="text-xs leading-relaxed text-blue-900">
          <span className="font-semibold">這些不是是非題</span>，而是團隊需要共同選定的平衡點。
          拖動每條 slider，感受兩端的取捨張力——預設停在中間，代表「待團隊決定」。
        </p>
      </div>

      {/* 五張卡片 */}
      {DIALS.map((dial) => (
        <DialCard
          key={dial.id}
          item={dial}
          value={values[dial.id] ?? 50}
          onChange={(v) => handleChange(dial.id, v)}
          reducedMotion={reducedMotion}
        />
      ))}

      {/* 底部總結提示 */}
      <p className="text-center text-xs text-neutral-400 pt-1">
        左端（藍）與右端（橙）代表光譜兩極，沒有絕對的對錯——只有適合當下團隊情境的選擇。
      </p>
    </div>
  );
}
