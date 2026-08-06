import { useMemo, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import {
  Users,
  Building2,
  KeyRound,
  CircleHelp,
  Link2Off,
  RotateCcw,
  ArrowRight,
} from 'lucide-react'
import clsx from 'clsx'

/**
 * 「假如我們沒有說不」開關面板。
 * 核心洞察：這張權限表之所以只有 4 個角色、6 條資料權限，
 * 是三個範圍決策撐出來的。讀者讀到的是「權限很單純」，
 * 感受不到單純是設計出來的——所以讓他親手把複雜度放回去。
 */

type SwitchKey = 'org' | 'consultant' | 'apikey'

/** 出處：筆記已寫 vs 由內文推估 */
type Source = 'noted' | 'inferred'

interface PendingItem {
  text: string
  source: Source
}

interface SwitchDef {
  key: SwitchKey
  label: string
  sub: string
  addsRole: string | null
  /** pending 前 N 條同時也是「資料權限」會長出來的列，避免同一句話在面板裡出現兩次 */
  addsRows: number
  pending: PendingItem[]
  note: string
}

const SWITCHES: SwitchDef[] = [
  {
    key: 'org',
    label: '加上企業帳號層',
    sub: '企業管理者、租戶隔離',
    addsRole: '企業管理者',
    addsRows: 3,
    pending: [
      { text: '同企業同事的問句與報告', source: 'noted' },
      { text: '企業管理者看得到員工問了什麼嗎', source: 'inferred' },
      { text: '員工離職後，他的問句歸誰', source: 'inferred' },
      { text: '會員要加 org_id，所有查詢都得帶租戶條件', source: 'inferred' },
    ],
    note: '評估的是外部法律，不是企業內部工作規則。問句只屬於問的那個人。',
  },
  {
    key: 'consultant',
    label: '讓顧問師看會員問句',
    sub: '跨會員的第二條路',
    addsRole: null,
    addsRows: 0,
    pending: [
      { text: '會員要不要同意？怎麼同意', source: 'noted' },
      { text: '看得到哪些欄位，要不要去識別化', source: 'inferred' },
      { text: '誰指派哪位顧問師看哪個案子', source: 'inferred' },
      { text: '這次調閱留不留紀錄，留在哪', source: 'inferred' },
    ],
    note: '調一格權限做不到，要新增一套機制（例如「會員主動送出個案」才開權限）。',
  },
  {
    key: 'apikey',
    label: 'API key 併進角色表',
    sub: '當成第四種「人」',
    addsRole: null,
    addsRows: 0,
    pending: [
      { text: '密碼重設對不到 key', source: 'noted' },
      { text: '離職停用對不到 key', source: 'noted' },
      { text: '輪替對不到人', source: 'noted' },
      { text: '洩漏即失效對不到人', source: 'inferred' },
      { text: '兩把 key 混用 ＝ 把管理面搬到公開網路上', source: 'noted' },
    ],
    note: '會員 key 讀、公開 internet；管理端 key 寫整個向量庫、限定 IP。',
  },
]

const BASE_ROLES = ['會員', '顧問師', '系統管理者', 'API 串接方 · 機器']

const BASE_ROWS = [
  '自己的問句與報告',
  '其他會員的問句與報告',
  '法條與決策樹',
  '向量庫',
  'Langfuse trace',
  '帳號與配額設定',
]

const HUMAN_LIFECYCLE = ['註冊', '登入', '改密碼', '離職停用']
const MACHINE_LIFECYCLE = ['簽發', '輪替', '撤銷', '洩漏即失效']

const ORG_SWITCH = SWITCHES[0]

const CARD = 'rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--neutral-0)]'
const PENDING_BOX =
  'rounded-[var(--radius-sm)] border border-dashed border-[var(--warning-500)] bg-[var(--warning-50)]'

function SourceDot({ source, className }: { source: Source; className?: string }) {
  return (
    <span
      aria-hidden
      title={source === 'noted' ? '筆記已寫' : '推估'}
      className={clsx(
        'h-1.5 w-1.5 shrink-0 rounded-full',
        source === 'noted'
          ? 'bg-[var(--warning-500)]'
          : 'border border-[var(--warning-500)] bg-transparent',
        className,
      )}
    />
  )
}

function PendingList({ items }: { items: PendingItem[] }) {
  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <div key={item.text} className="flex gap-2 text-[0.8125rem] leading-snug">
          <SourceDot source={item.source} className="mt-[0.4rem]" />
          <span className="text-[var(--text-body)]">{item.text}</span>
        </div>
      ))}
    </div>
  )
}

/** 顧問師那條「還不存在的路」 */
function VisibilityRoutes({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 320 84" width="100%" className="max-w-md" role="img" aria-hidden>
      <text x="0" y="16" fontSize="9" fill="var(--neutral-500)">
        系統管理者
      </text>
      <line
        x1="62"
        y1="12"
        x2="132"
        y2="12"
        stroke="var(--blue-300)"
        strokeWidth="1.5"
      />
      <text x="136" y="16" fontSize="9" fill="var(--blue-700)">
        Langfuse
      </text>
      <line
        x1="184"
        y1="12"
        x2="236"
        y2="12"
        stroke="var(--blue-300)"
        strokeWidth="1.5"
      />
      <text x="240" y="16" fontSize="9" fill="var(--neutral-500)">
        全體會員問句
      </text>

      <text x="0" y="62" fontSize="9" fill="var(--neutral-500)">
        顧問師
      </text>
      {open ? (
        <>
          <path
            d="M44 58 C 140 58, 180 30, 238 22"
            fill="none"
            stroke="var(--warning-500)"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          <text x="52" y="76" fontSize="8" fill="var(--warning-500)">
            新增的路：四個問題要先回答
          </text>
        </>
      ) : (
        <>
          <line
            x1="44"
            y1="58"
            x2="70"
            y2="58"
            stroke="var(--neutral-300)"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
          <text x="78" y="62" fontSize="8" fill="var(--neutral-400)">
            沒有這條路
          </text>
        </>
      )}
    </svg>
  )
}

/** 人與機器兩條對不齊的生命週期軌 */
function LifecycleTracks() {
  return (
    <div className="space-y-3">
      {[
        { icon: Users, title: '人（會員／顧問師／系統管理者）', steps: HUMAN_LIFECYCLE },
        { icon: KeyRound, title: '機器（API key）', steps: MACHINE_LIFECYCLE },
      ].map(({ icon: Icon, title, steps }) => (
        <div key={title}>
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <Icon size={13} />
            {title}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {steps.map((step, i) => (
              <span key={step} className="flex items-center gap-1">
                <span className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--neutral-50)] px-2 py-1 text-xs text-[var(--text-body)]">
                  {step}
                </span>
                {i < steps.length - 1 ? (
                  <ArrowRight size={11} className="text-[var(--neutral-400)]" />
                ) : null}
              </span>
            ))}
          </div>
        </div>
      ))}
      <div className="flex items-center gap-1.5 text-xs text-[var(--warning-500)]">
        <Link2Off size={13} />
        四個節點兩軌對不上——併成一張表，等於假裝它們是同一種東西
      </div>
    </div>
  )
}

export default function PermissionScopeSwitches() {
  const reduce = useReducedMotion()
  const [on, setOn] = useState<Record<SwitchKey, boolean>>({
    org: false,
    consultant: false,
    apikey: false,
  })

  const anyOn = SWITCHES.some((s) => on[s.key])

  const tally = useMemo(() => {
    let roles = BASE_ROLES.length
    let rows = BASE_ROWS.length
    let pending = 0
    for (const s of SWITCHES) {
      if (!on[s.key]) continue
      if (s.addsRole) roles += 1
      rows += s.addsRows
      pending += s.pending.length
    }
    return { roles, rows, pending }
  }, [on])

  const toggle = (key: SwitchKey) => setOn((prev) => ({ ...prev, [key]: !prev[key] }))
  const reset = () => setOn({ org: false, consultant: false, apikey: false })

  const grow = reduce
    ? { initial: false as const }
    : {
        initial: { opacity: 0, height: 0 },
        animate: { opacity: 1, height: 'auto' as const },
        exit: { opacity: 0, height: 0 },
        transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const },
      }

  const stagger = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 6 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.28, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] as const },
        }

  return (
    <div className="not-prose mx-auto max-w-4xl space-y-3 font-sans text-[var(--text-body)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-[var(--text-muted)]">假如我們沒有說「不」</div>
        <button
          type="button"
          onClick={reset}
          disabled={!anyOn}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-[var(--border-default)] px-3 py-1.5 text-xs text-[var(--text-body)] transition-colors hover:bg-[var(--neutral-50)] disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue-500)]"
        >
          <RotateCcw size={13} />
          全部關掉
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
        {/* 左欄：三個開關 */}
        <div className="space-y-2">
          {SWITCHES.map((s) => {
            const active = on[s.key]
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => toggle(s.key)}
                aria-pressed={active}
                className={clsx(
                  'w-full rounded-[var(--radius-lg)] border p-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue-500)]',
                  active
                    ? 'border-[var(--warning-500)] bg-[var(--warning-50)]'
                    : 'border-[var(--border-subtle)] bg-[var(--neutral-0)] hover:border-[var(--blue-300)]',
                )}
              >
                <span className="flex items-start gap-2">
                  <span
                    aria-hidden
                    className={clsx(
                      'mt-0.5 flex h-4 w-7 shrink-0 items-center rounded-[var(--radius-pill)] p-0.5 transition-colors',
                      active ? 'bg-[var(--warning-500)]' : 'bg-[var(--neutral-300)]',
                    )}
                  >
                    <span
                      className={clsx(
                        'h-3 w-3 rounded-full bg-[var(--neutral-0)] transition-transform',
                        active && 'translate-x-3',
                      )}
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-[var(--text-strong)]">
                      {s.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-[var(--text-muted)]">{s.sub}</span>
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        {/* 右欄：現況面板 */}
        <div className={clsx(CARD, 'space-y-4 p-4')}>
          <div>
            <div className="text-xs uppercase tracking-wide text-[var(--neutral-500)]">角色</div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {BASE_ROLES.map((role) => (
                <span
                  key={role}
                  className="rounded-[var(--radius-pill)] border border-[var(--blue-300)] bg-[var(--blue-50)] px-2.5 py-1 text-xs text-[var(--blue-700)]"
                >
                  {role}
                </span>
              ))}
              <AnimatePresence initial={false}>
                {on.org ? (
                  <motion.span
                    key="org-role"
                    {...(reduce
                      ? {}
                      : {
                          initial: { opacity: 0, scale: 0.94 },
                          animate: { opacity: 1, scale: 1 },
                          exit: { opacity: 0, scale: 0.94 },
                          transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] as const },
                        })}
                    className={clsx(
                      PENDING_BOX,
                      'inline-flex items-center gap-1 rounded-[var(--radius-pill)] px-2.5 py-1 text-xs text-[var(--text-strong)]',
                    )}
                  >
                    <Building2 size={12} />
                    企業管理者
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wide text-[var(--neutral-500)]">資料權限</div>
            <div className="mt-1.5 space-y-1">
              {BASE_ROWS.map((row) => (
                <div
                  key={row}
                  className="flex gap-2 text-[0.8125rem] leading-snug text-[var(--text-body)]"
                >
                  <span aria-hidden className="text-[var(--neutral-400)]">
                    ·
                  </span>
                  {row}
                </div>
              ))}
            </div>
            <AnimatePresence initial={false}>
              {on.org ? (
                <motion.div key="org-rows" {...grow} className="overflow-hidden">
                  <div className="mt-1 space-y-1">
                    {ORG_SWITCH.pending.slice(0, ORG_SWITCH.addsRows).map((item, i) => (
                      <motion.div
                        key={item.text}
                        {...stagger(i)}
                        className={clsx(
                          PENDING_BOX,
                          'flex items-center gap-1.5 px-2 py-1 text-[0.8125rem] leading-snug text-[var(--text-strong)]',
                        )}
                      >
                        <CircleHelp size={13} className="shrink-0 text-[var(--warning-500)]" />
                        <span className="flex-1">{item.text}</span>
                        <SourceDot source={item.source} />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          {/* 各開關長出來的細節 */}
          <AnimatePresence initial={false}>
            {SWITCHES.filter((s) => on[s.key]).map((s) => (
              <motion.section key={s.key} {...grow} className="overflow-hidden">
                <div className="mt-1 border-t border-[var(--border-subtle)] pt-3">
                  <div className="text-xs font-medium text-[var(--text-strong)]">{s.label}</div>

                  {s.key === 'consultant' ? (
                    <div className="mt-2">
                      <VisibilityRoutes open />
                    </div>
                  ) : null}
                  {s.key === 'apikey' ? (
                    <div className="mt-2">
                      <LifecycleTracks />
                    </div>
                  ) : null}

                  <div className="mt-2">
                    <PendingList items={s.pending.slice(s.addsRows)} />
                  </div>
                  <div className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">{s.note}</div>
                </div>
              </motion.section>
            ))}
          </AnimatePresence>

          {!anyOn ? (
            <div className="mt-1">
              <VisibilityRoutes open={false} />
            </div>
          ) : null}
        </div>
      </div>

      {/* 計量列 */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--neutral-50)] px-4 py-3 text-sm">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex items-center gap-1.5 text-[var(--text-body)]">
            <Users size={14} className="text-[var(--neutral-400)]" />
            <strong className="tabular-nums text-[var(--text-strong)]">{tally.roles}</strong> 個角色
          </span>
          <span className="text-[var(--neutral-300)]">·</span>
          <span className="text-[var(--text-body)]">
            <strong className="tabular-nums text-[var(--text-strong)]">{tally.rows}</strong>{' '}
            條資料權限
          </span>
          <span className="text-[var(--neutral-300)]">·</span>
          <span
            className={clsx(
              'flex items-center gap-1.5',
              tally.pending > 0 ? 'text-[var(--warning-500)]' : 'text-[var(--text-muted)]',
            )}
          >
            <CircleHelp size={14} />
            <strong className="tabular-nums">{tally.pending}</strong> 個待決問題
          </span>
        </span>

        <span className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
          <span className="flex items-center gap-1">
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full bg-[var(--warning-500)]"
            />
            筆記已寫
          </span>
          <span className="flex items-center gap-1">
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full border border-[var(--warning-500)]"
            />
            推估
          </span>
        </span>
      </div>
    </div>
  )
}
