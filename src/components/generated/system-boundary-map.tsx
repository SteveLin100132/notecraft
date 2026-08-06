import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  Activity,
  BookText,
  Braces,
  Building2,
  Lock,
  ShieldCheck,
  TriangleAlert,
  UserCog,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import clsx from 'clsx'

/**
 * 系統邊界圖：四個面 × 誰在用 × 暴露面 × PoC 覆蓋到哪。
 *
 * 核心洞察：主角不是「四個面」，是中間那條信任邊界。線的上方公開在
 * internet，每一次跨越都得驗身分；線的下方靠網路層擋在門外，根本走不到
 * 驗證那一步。四個面是被這條線分配到兩側的結果，不是四個並列的框。
 *
 * 版面採泳道圖 × use case 的混血：每一列讀作「誰在用 → 閘門 → 面」，
 * 閘門刻意畫在**線上而不是框裡**——擋的是「跨越邊界」這個動作。上下泳道
 * 的閘門本質不同（身分 vs 網路層），用 icon 與語彙分開。
 *
 * 全圖唯一穿過邊界的線：「對外 API · 寫」→「法條管理後台」，兩者是改動
 * 向量庫的同一件事的兩個入口。這兩張卡片刻意排成上下相鄰（公開泳道的最後
 * 一列、限定 IP 泳道的第一列），線就從信任邊界帶內垂直穿過去——跨越畫在
 * 它真正發生的位置，也不必為它另闢走廊擠掉正文欄寬。
 *
 * 第四維（PoC 覆蓋到哪）做成 full / poc 兩種模式的切換，而不是塞進第五欄
 * 徽章：切到 PoC 時前台的登入閘門原地變成缺口，兩列對外 API 淡出，
 * 每張卡片浮出一條琥珀註記說明只做了半格。
 */

type Mode = 'full' | 'poc'
type GateTone = 'pending' | 'breach'

const GRID_COLS = 'grid-cols-[118px_22px_180px_22px_minmax(0,1fr)]'

/* ── 小元件 ────────────────────────────────────────────────── */

function Connector({ accent = false }: { accent?: boolean }) {
  const color = accent ? 'var(--orange-500)' : 'var(--neutral-400)'
  return (
    <div className="flex items-center justify-center self-center">
      <svg width={24} height={10} viewBox="0 0 24 10" aria-hidden="true">
        <line x1={0} y1={5} x2={17} y2={5} stroke={color} strokeWidth={2} />
        <path d="M16 1 L23 5 L16 9 Z" fill={color} />
      </svg>
    </div>
  )
}

function Actor({
  icon: Icon,
  name,
  sub,
  accent = false,
}: {
  icon: LucideIcon
  name: string
  sub: string
  accent?: boolean
}) {
  return (
    <div className="flex h-full items-center gap-2.5 px-1 py-2.5">
      <Icon
        size={25}
        strokeWidth={1.6}
        className={accent ? 'shrink-0 text-[var(--orange-600)]' : 'shrink-0 text-[var(--blue-700)]'}
      />
      <div className="min-w-0">
        <div className="text-sm font-bold leading-snug text-[var(--text-strong)]">{name}</div>
        <div className="text-[11px] leading-snug text-[var(--text-muted)]">{sub}</div>
      </div>
    </div>
  )
}

function Gate({
  kind,
  name,
  detail,
  status,
  tone,
}: {
  kind: 'identity' | 'network'
  name: string
  detail: string
  status?: string
  tone: GateTone
}) {
  const KindIcon = kind === 'identity' ? Lock : ShieldCheck
  const breach = tone === 'breach'
  return (
    <div
      className={clsx(
        'flex h-full flex-col justify-center gap-1 rounded-[var(--radius-xl)] px-3 py-2.5 transition-colors duration-200',
        breach
          ? 'border-2 border-dashed border-[var(--orange-500)] bg-[var(--orange-50)]'
          : 'border border-dashed border-[var(--warning-500)] bg-[var(--warning-50)]',
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] tracking-[var(--tracking-wide)] text-[var(--text-muted)]">
        <KindIcon size={12} strokeWidth={2} />
        {kind === 'identity' ? '身分閘門' : '網路層閘門'}
      </div>
      <div
        className={clsx(
          'text-[13px] font-bold',
          breach ? 'text-[var(--orange-600)]' : 'text-[var(--text-strong)]',
        )}
      >
        {name}
      </div>
      <div className="text-[11px] leading-snug text-[var(--text-muted)]">{detail}</div>
      {status && (
        <div
          className={clsx(
            'text-[11px] font-bold leading-snug',
            breach ? 'text-[var(--orange-600)]' : 'text-[var(--warning-700)]',
          )}
        >
          {status}
        </div>
      )}
    </div>
  )
}

type ChipTone = 'partial' | 'none' | 'done' | 'write'

function Chip({ tone, children }: { tone: ChipTone; children: React.ReactNode }) {
  const tones: Record<ChipTone, string> = {
    partial: 'border-[var(--warning-500)] bg-[var(--warning-50)] text-[var(--warning-700)]',
    none: 'border-dashed border-[var(--border-default)] text-[var(--text-muted)]',
    done: 'border-[var(--success-500)] bg-[var(--success-50)] text-[var(--success-500)]',
    write: 'border-[var(--orange-200)] bg-[var(--orange-50)] text-[var(--orange-600)]',
  }
  return (
    <span
      className={clsx(
        'whitespace-nowrap rounded-[var(--radius-pill)] border px-2 py-px text-[11px] font-bold',
        tones[tone],
      )}
    >
      {children}
    </span>
  )
}

function ApiItem({ mode, label, quota }: { mode: '讀' | '寫'; label: string; quota: string }) {
  const write = mode === '寫'
  return (
    <div
      className={clsx(
        'flex items-center gap-2.5 rounded-[var(--radius-lg)] border px-2.5 py-1.5 text-[12.5px] text-[var(--text-body)]',
        write
          ? 'border-[var(--orange-200)] bg-[var(--orange-50)]'
          : 'border-[var(--border-subtle)] bg-[var(--blue-50)]',
      )}
    >
      <span
        className={clsx(
          'shrink-0 rounded-[var(--radius-pill)] border bg-[var(--neutral-0)] px-1.5 text-[10.5px] font-bold',
          write
            ? 'border-[var(--orange-200)] text-[var(--orange-600)]'
            : 'border-[var(--border-default)] text-[var(--text-muted)]',
        )}
      >
        {mode}
      </span>
      <span className="min-w-0">{label}</span>
      <span className="ml-auto shrink-0 text-[11px] text-[var(--text-muted)]">{quota}</span>
    </div>
  )
}

function PocNote({ show, children }: { show: boolean; children: React.ReactNode }) {
  const reduce = useReducedMotion()
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          initial={reduce ? false : { opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden"
        >
          <div className="mt-1 flex items-start gap-2 rounded-[var(--radius-lg)] border border-dashed border-[var(--warning-500)] bg-[var(--warning-50)] px-2.5 py-2 text-xs leading-relaxed text-[var(--warning-700)]">
            <TriangleAlert size={14} strokeWidth={2} className="mt-0.5 shrink-0" />
            <span>{children}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Face({
  title,
  chips,
  desc,
  children,
  accent = false,
}: {
  title: string
  chips: React.ReactNode
  desc?: string
  children?: React.ReactNode
  accent?: boolean
}) {
  return (
    <div
      className={clsx(
        'flex h-full flex-col gap-2 rounded-[var(--radius-2xl)] border bg-[var(--neutral-0)] px-4 py-3.5 shadow-[var(--shadow-xs)]',
        accent ? 'border-[var(--orange-200)]' : 'border-[var(--border-default)]',
      )}
    >
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <span className="text-[15px] font-bold text-[var(--text-strong)]">{title}</span>
        {chips}
      </div>
      {desc && <div className="text-[12.5px] text-[var(--text-muted)]">{desc}</div>}
      {children}
    </div>
  )
}

function Row({
  dimmed = false,
  accent = false,
  children,
}: {
  dimmed?: boolean
  accent?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={clsx(
        'grid items-stretch transition-[opacity,filter] duration-300',
        GRID_COLS,
        dimmed && 'opacity-40 grayscale',
      )}
      data-accent={accent ? 'true' : undefined}
    >
      {children}
    </div>
  )
}

function LaneLabel({ title, sub, muted = false }: { title: string; sub: string; muted?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span
        className={clsx(
          'inline-block h-2 w-2 rounded-full',
          muted ? 'bg-[var(--neutral-400)]' : 'bg-[var(--blue-500)]',
        )}
      />
      <strong className="text-[15px] text-[var(--text-strong)]">{title}</strong>
      <span className="text-[12.5px] text-[var(--text-muted)]">{sub}</span>
    </div>
  )
}

/* ── 主元件 ────────────────────────────────────────────────── */

export default function SystemBoundaryMap() {
  const [mode, setMode] = useState<Mode>('full')
  const isPoc = mode === 'poc'

  return (
    <div className="flex flex-col gap-5">
      {/* 模式切換 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div
          role="tablist"
          aria-label="檢視模式"
          className="inline-flex gap-1 rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--neutral-0)] p-[3px]"
        >
          {(['full', 'poc'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={clsx(
                'cursor-pointer rounded-[var(--radius-pill)] px-4 py-1.5 text-sm font-bold transition-colors duration-200',
                mode === m
                  ? 'bg-[var(--blue-700)] text-[var(--text-on-brand)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-strong)]',
              )}
            >
              {m === 'full' ? '完整系統' : 'PoC 這一版'}
            </button>
          ))}
        </div>
        <p className="m-0 text-[13.5px] text-[var(--text-muted)]">
          {isPoc ? (
            <>
              四個面只碰到兩格，而且都只做了半格——
              <b className="text-[var(--orange-600)]">前台那道門還沒裝上</b>。
            </>
          ) : (
            '三個介面加一組對外 API，各自的閘門與暴露面。'
          )}
        </p>
      </div>

      {/* board */}
      <div className="overflow-x-auto pb-1">
        <div className="relative flex min-w-[720px] flex-col">
          {/* ── 公開 internet ── */}
          <section className="flex flex-col gap-3 rounded-[var(--radius-2xl)] border border-[var(--border-default)] bg-[var(--neutral-0)] px-4 pb-4 pt-4">
            <LaneLabel title="公開 internet" sub="誰都碰得到 · 靠身分擋" />

            {/* 客戶前台 */}
            <Row>
              <Actor icon={Building2} name="企業客戶" sub="業主／HR" />
              <Connector />
              <Gate
                kind="identity"
                name={isPoc ? '缺口' : '登入'}
                detail={isPoc ? '拿到網址就能問' : 'JWT／OAuth／SSO'}
                status={isPoc ? '無驗證' : '未定案'}
                tone={isPoc ? 'breach' : 'pending'}
              />
              <Connector />
              <Face
                title="客戶前台"
                chips={<Chip tone="partial">PoC：部分</Chip>}
                desc="問句進 → 條文、L1~L3 分類、風險分析報告出"
              >
                <PocNote show={isPoc}>
                  PoC 只有一頁展示 UI，目的是讓檢索品質被肉眼檢查——
                  <b>不做登入</b>。
                </PocNote>
              </Face>
            </Row>

            {/* 會員 API：讀 */}
            <Row dimmed={isPoc}>
              <Actor icon={Braces} name="產品會員" sub="串接方系統" />
              <Connector />
              <Gate
                kind="identity"
                name="驗證 ＋ 配額"
                detail="基礎／進階"
                status="級距未定"
                tone="pending"
              />
              <Connector />
              <Face
                title="對外 API · 讀"
                chips={<Chip tone="none">PoC：不對外</Chip>}
              >
                <div className="mt-0.5 flex flex-col gap-1.5">
                  <ApiItem mode="讀" label="檢索近似條文並取得相關決策樹主題" quota="基礎／進階" />
                  <ApiItem mode="讀" label="風險分析報告" quota="基礎／進階" />
                </div>
              </Face>
            </Row>

            {/* 管理員 API：寫 */}
            <Row dimmed={isPoc} accent>
              <Actor icon={UserCog} name="產品管理員" sub="顧問師等" accent />
              <Connector accent />
              <Gate
                kind="identity"
                name="管理員驗證"
                detail="不該與會員 API 共用"
                status="未定案"
                tone="pending"
              />
              <Connector accent />
              <Face
                title="對外 API · 寫"
                accent
                chips={
                  <>
                    <Chip tone="write">唯一會改動向量庫</Chip>
                    <Chip tone="none">PoC：不對外</Chip>
                  </>
                }
              >
                <div className="mt-0.5">
                  <ApiItem mode="寫" label="法條與決策樹主題 Embedding" quota="僅管理員" />
                </div>
                <PocNote show={isPoc}>
                  PoC 的 Embedding 只由 API 服務內的 <b>Indexer 模組</b>觸發，還沒開成對外 API。
                </PocNote>
              </Face>
            </Row>
          </section>

          {/* ── 信任邊界：全圖唯一穿過它的線也畫在這一帶 ── */}
          <div className={clsx('relative z-10 grid h-[86px] items-center', GRID_COLS)}>
            <div
              className="absolute inset-x-0 top-1/2 border-t-[3px] border-dashed border-[var(--orange-500)] opacity-90"
              aria-hidden="true"
            />
            <div className="col-span-3 flex items-center justify-center">
              <span className="relative bg-[var(--neutral-0)] px-4 text-[13px] font-bold tracking-[var(--tracking-wide)] text-[var(--orange-600)]">
                信任邊界
              </span>
            </div>
            <div aria-hidden="true" />
            {/* 「對外 API · 寫」→「法條管理後台」：改動向量庫的同一件事，兩個入口 */}
            <div className="relative h-full">
              <div
                className="absolute -bottom-4 -top-4 left-8 border-l-2 border-dashed border-[var(--orange-500)]"
                aria-hidden="true"
              />
              <div className="absolute left-[68px] top-1/2 -translate-y-1/2 rounded-[var(--radius-xl)] border border-dashed border-[var(--orange-500)] bg-[var(--neutral-0)] px-3 py-1.5 text-[11.5px] leading-normal text-[var(--orange-600)]">
                <b className="block text-[12.5px]">同一件事的兩個入口</b>
                全圖唯一穿過邊界的線
              </div>
            </div>
          </div>

          {/* ── 限定 IP ── */}
          <section className="flex flex-col gap-3 rounded-[var(--radius-2xl)] border border-dashed border-[var(--neutral-400)] bg-[var(--neutral-100)] px-4 pb-4 pt-4">
            <LaneLabel title="限定 IP（不公開）" sub="走不到驗證那一步 · 靠網路層擋" muted />

            {/* 法條管理後台 */}
            <Row>
              <Actor icon={BookText} name="顧問師" sub="內容制定與編修" />
              <Connector />
              <Gate
                kind="network"
                name="限定 IP"
                detail="VPN／IAP／allowlist"
                status={isPoc ? 'PoC 尚未設定' : '手段未定'}
                tone="pending"
              />
              <Connector />
              <Face
                title="法條管理後台"
                chips={
                  <>
                    <Chip tone="write">會改動向量庫</Chip>
                    <Chip tone="partial">PoC：部分</Chip>
                  </>
                }
                desc={isPoc ? undefined : '法條與決策樹分類的制定編修 → Embedding 進庫'}
              >
                <PocNote show={isPoc}>
                  PoC 只有 Indexer 那一段；<b>制定與編修先用 Excel 頂著</b>，沒有後台介面。
                </PocNote>
              </Face>
            </Row>

            {/* 運維管理後台 */}
            <Row>
              <Actor icon={Activity} name="IT" sub="運維" />
              <Connector />
              <Gate
                kind="network"
                name="限定 IP"
                detail="VPN／IAP／allowlist"
                status={isPoc ? 'PoC 尚未設定' : '手段未定'}
                tone="pending"
              />
              <Connector />
              <Face
                title="運維管理後台"
                chips={
                  <>
                    <Chip tone="done">唯讀觀測</Chip>
                    <Chip tone="partial">PoC：部分</Chip>
                  </>
                }
                desc="Langfuse tracing、API metric"
              >
                <PocNote show={isPoc}>
                  PoC 只有 self-host <b>Langfuse 自己的介面</b>，沒有另做後台。
                </PocNote>
              </Face>
            </Row>
          </section>

        </div>
      </div>

      {/* 圖例 */}
      <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-x-6 gap-y-2.5 rounded-[var(--radius-2xl)] border border-[var(--border-subtle)] bg-[var(--neutral-0)] px-4 py-3.5 text-[12.5px] text-[var(--text-muted)]">
        <li className="flex items-center gap-2.5">
          <span className="w-6 shrink-0 border-t-[3px] border-dashed border-[var(--orange-500)]" />
          信任邊界：跨越它就換一套擋法
        </li>
        <li className="flex items-center gap-2.5">
          <span className="w-6 shrink-0 border-t-2 border-[var(--neutral-400)]" />
          誰在用 → 閘門 → 面
        </li>
        <li className="flex items-center gap-2.5">
          <span className="h-3.5 w-5 shrink-0 rounded-[var(--radius-sm)] border border-dashed border-[var(--warning-500)] bg-[var(--warning-50)]" />
          閘門存在，但方案未定案
        </li>
        <li className="flex items-center gap-2.5">
          <span className="h-3.5 w-5 shrink-0 rounded-[var(--radius-sm)] border-2 border-dashed border-[var(--orange-500)] bg-[var(--orange-50)]" />
          PoC 這一版沒有閘門
        </li>
        <li className="flex items-center gap-2.5">
          <span className="h-3.5 w-5 shrink-0 rounded-[var(--radius-sm)] border border-dashed border-[var(--neutral-400)] bg-[var(--neutral-100)]" />
          虛線泳道：不公開在 internet
        </li>
        <li className="flex items-center gap-2.5">
          <Chip tone="write">寫</Chip>
          會改動向量庫的入口
        </li>
      </ul>
    </div>
  )
}
