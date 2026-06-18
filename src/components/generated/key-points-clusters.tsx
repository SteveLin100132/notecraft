import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Users,
  GitPullRequest,
  FileText,
  ClipboardCheck,
  ListChecks,
  ShieldCheck,
  Tag,
  Milestone,
  Bot,
  Server,
  GitMerge,
  BookOpen,
  Image,
  type LucideIcon,
} from 'lucide-react';
import { clsx } from 'clsx';

// ── 型別 ──────────────────────────────────────────────────────────────────────

type GroupKey = 'all' | 'collab' | 'quality' | 'version' | 'ai';

interface CardItem {
  id: string;
  group: Exclude<GroupKey, 'all'>;
  text: string;
  Icon: LucideIcon;
}

// ── 資料 ──────────────────────────────────────────────────────────────────────

const cards: CardItem[] = [
  // 協作與流程
  {
    id: 'c1',
    group: 'collab',
    text: '任務分派與多 Session 平行處理',
    Icon: Users,
  },
  {
    id: 'c2',
    group: 'collab',
    text: 'PR 與衝突先本地解決再推 GitHub',
    Icon: GitPullRequest,
  },
  {
    id: 'c3',
    group: 'collab',
    text: '釐清文件 / issue 負責人，避免重工',
    Icon: FileText,
  },
  // 品質與驗證
  {
    id: 'q1',
    group: 'quality',
    text: 'QA 獨立成流程，Unit / E2E / Code Review 三層保障',
    Icon: ShieldCheck,
  },
  {
    id: 'q2',
    group: 'quality',
    text: '建立可重複執行的檢查清單',
    Icon: ListChecks,
  },
  {
    id: 'q3',
    group: 'quality',
    text: '可由專門 QA sub-agent 自動負責驗收',
    Icon: ClipboardCheck,
  },
  // 版本與文件
  {
    id: 'v1',
    group: 'version',
    text: 'API 採 V2 並保留 V1 相容，平滑升版',
    Icon: GitMerge,
  },
  {
    id: 'v2',
    group: 'version',
    text: '統一 template / coding style / best practice',
    Icon: BookOpen,
  },
  {
    id: 'v3',
    group: 'version',
    text: '圖片公開存取的安全疑慮需提前評估',
    Icon: Image,
  },
  // AI 自動化與擴展
  {
    id: 'a1',
    group: 'ai',
    text: 'AI 自動建立 issue 並完成標籤分類',
    Icon: Bot,
  },
  {
    id: 'a2',
    group: 'ai',
    text: '用 GitHub milestones & labels 管理優先序',
    Icon: Milestone,
  },
  {
    id: 'a3',
    group: 'ai',
    text: '系統擴展性與分散式架構（K8s / AWS / GCP）',
    Icon: Server,
  },
];

// ── 群組設定 ──────────────────────────────────────────────────────────────────

interface GroupMeta {
  key: GroupKey;
  label: string;
  pill: string;
  cardBg: string;
  cardBorder: string;
  iconColor: string;
  badgeBg: string;
  badgeText: string;
}

const groups: GroupMeta[] = [
  {
    key: 'all',
    label: '全部',
    pill: 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200',
    cardBg: '',
    cardBorder: '',
    iconColor: '',
    badgeBg: '',
    badgeText: '',
  },
  {
    key: 'collab',
    label: '協作與流程',
    pill: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
    cardBg: 'bg-blue-50',
    cardBorder: 'border-blue-200',
    iconColor: 'text-blue-600',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-700',
  },
  {
    key: 'quality',
    label: '品質與驗證',
    pill: 'bg-orange-50 text-orange-600 hover:bg-orange-100',
    cardBg: 'bg-orange-50',
    cardBorder: 'border-orange-200',
    iconColor: 'text-orange-500',
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-600',
  },
  {
    key: 'version',
    label: '版本與文件',
    pill: 'bg-sky-50 text-sky-700 hover:bg-sky-100',
    cardBg: 'bg-sky-50',
    cardBorder: 'border-sky-200',
    iconColor: 'text-sky-600',
    badgeBg: 'bg-sky-100',
    badgeText: 'text-sky-700',
  },
  {
    key: 'ai',
    label: 'AI 自動化與擴展',
    pill: 'bg-neutral-800 text-neutral-100 hover:bg-neutral-700',
    cardBg: 'bg-neutral-900',
    cardBorder: 'border-neutral-700',
    iconColor: 'text-neutral-100',
    badgeBg: 'bg-neutral-700',
    badgeText: 'text-neutral-100',
  },
];

const groupMap = Object.fromEntries(groups.map((g) => [g.key, g])) as Record<GroupKey, GroupMeta>;

// ── 元件 ──────────────────────────────────────────────────────────────────────

export default function KeyPointsClusters() {
  const [active, setActive] = useState<GroupKey>('all');
  const prefersReduced = useReducedMotion();

  const filtered = active === 'all' ? cards : cards.filter((c) => c.group === active);

  const transition = prefersReduced
    ? { duration: 0 }
    : { duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] as number[] };

  return (
    <div className="not-prose max-w-3xl mx-auto space-y-6">
      {/* 標題列 */}
      <div className="space-y-1">
        <p className="text-xs font-medium tracking-wide text-neutral-400 uppercase">
          會議重點分群
        </p>
        <p className="text-sm text-neutral-500">
          十個零散重點收斂成「協作、品質、版本文件、AI 與擴展」四條主線
        </p>
      </div>

      {/* 篩選 pill chips */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="群組篩選">
        {groups.map((g) => (
          <button
            key={g.key}
            onClick={() => setActive(g.key)}
            className={clsx(
              'px-3 py-1 rounded-full text-sm font-medium transition-all duration-200',
              g.key === 'all'
                ? active === 'all'
                  ? 'bg-neutral-800 text-white'
                  : g.pill
                : active === g.key
                ? g.key === 'ai'
                  ? 'bg-neutral-900 text-white ring-2 ring-neutral-500'
                  : g.key === 'collab'
                  ? 'bg-blue-600 text-white ring-2 ring-blue-300'
                  : g.key === 'quality'
                  ? 'bg-orange-500 text-white ring-2 ring-orange-300'
                  : 'bg-sky-600 text-white ring-2 ring-sky-300'
                : g.pill
            )}
            aria-pressed={active === g.key}
          >
            {g.key === 'all' ? (
              g.label
            ) : (
              <span className="flex items-center gap-1.5">
                {g.key === 'collab' && <Users size={12} className="opacity-80" />}
                {g.key === 'quality' && <ShieldCheck size={12} className="opacity-80" />}
                {g.key === 'version' && <BookOpen size={12} className="opacity-80" />}
                {g.key === 'ai' && <Bot size={12} className="opacity-80" />}
                {g.label}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 卡片格 */}
      <motion.div
        layout={!prefersReduced}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
      >
        <AnimatePresence mode="popLayout">
          {filtered.map((card) => {
            const meta = groupMap[card.group];
            const isAi = card.group === 'ai';
            return (
              <motion.div
                key={card.id}
                layout={!prefersReduced}
                initial={prefersReduced ? false : { opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={prefersReduced ? undefined : { opacity: 0, scale: 0.95, y: -8 }}
                transition={transition}
                className={clsx(
                  'rounded-xl border p-4 flex flex-col gap-3',
                  meta.cardBg,
                  meta.cardBorder
                )}
              >
                {/* icon + text */}
                <div className="flex items-start gap-3">
                  <span
                    className={clsx(
                      'mt-0.5 flex-shrink-0',
                      meta.iconColor
                    )}
                  >
                    <card.Icon size={18} />
                  </span>
                  <p
                    className={clsx(
                      'text-sm leading-relaxed font-medium',
                      isAi ? '!text-white' : 'text-neutral-800'
                    )}
                  >
                    {card.text}
                  </p>
                </div>

                {/* 群組標籤 */}
                <div className="mt-auto pt-1">
                  <span
                    className={clsx(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                      meta.badgeBg,
                      meta.badgeText
                    )}
                  >
                    <Tag size={10} />
                    {groupMap[card.group].label}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* 計數 */}
      <p className="text-xs text-neutral-400 text-right">
        顯示 {filtered.length} / {cards.length} 個重點
      </p>
    </div>
  );
}
