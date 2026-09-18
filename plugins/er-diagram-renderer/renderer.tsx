/* ER Diagram Renderer —— NoteCraft plugin
 *
 * 把一份資料庫 schema JSON 畫成可聚焦、可搜尋的實體關聯圖。
 *
 * 前身是 TrendMile 專案裡一支 751 行的 tsx，其中 68 KB 是寫死的表定義。
 * 本檔把資料全部移出去，同時把幾個「只對那個專案成立」的常數也一併外部化 ——
 * 五欄版面、必填性語彙、徽章叫法、hub 表、預設顯示欄數、提示文案。
 * 只抽表定義是不夠的：那些常數留著，換一個專案還是得改程式。
 *
 * 關聯（edges）由欄位的 fk 推導，不存進資料檔 —— 存了就會有兩份真相。
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { ChevronDown, ChevronUp, Info, Search, X } from 'lucide-react'

/* props 的型別在這裡自帶一份，不從 `@notes/plugins/_types` import。
 * 理由：官方 plugin 同時要能在主 repo（CI 驗證用）與使用者專案裡 build，
 * 而 `@notes` 在兩處指向不同的根。TypeScript 是結構型別，自帶一份不影響相容性。
 * 偏好共用型別的 plugin 作者仍可改寫成 `import type { PluginRendererProps } from '@notes/plugins/_types'`。
 */
interface PluginRendererProps<T> {
  data: T
  file: { path: string; name: string; updatedAt: string }
  options: Record<string, unknown>
  mode: 'page' | 'embed'
}

/* ── 資料型別 ─────────────────────────────────────────── */

/** 徽章可以掛在哪些欄位屬性上。fk 是字串（父表名），其餘是 boolean，兩者都以 truthy 判定。 */
type ErFlagKey = 'pk' | 'fk' | 'unique' | 'index'

export interface ErColumn {
  name: string
  type: string
  /** 對應 data.requirement[].key */
  required: string
  default?: string
  note?: string
  /** 父表名；有值即為外鍵 */
  fk?: string
  pk?: boolean
  unique?: boolean
  index?: boolean
  /** 對應 data.derivations[].key */
  derivation?: string
  /** 個資標示。目前渲染器不用，保留讓資料先記著 */
  pii?: boolean
}

export interface ErTable {
  name: string
  label: string
  /** 章節編號，顯示在卡片右上 */
  section?: string
  /** 對應 data.groups[].key */
  group: string
  columns: ErColumn[]
}

export interface ErOptions {
  /** 卡片預設顯示幾欄（主鍵與外鍵一律顯示，不計入） */
  defaultRows: number
  /** hub 表：被極多張表指向的共用表，連線預設收起，否則整張圖會被它蓋滿 */
  hubTables: string[]
  /** 章節編號的前綴 */
  sectionPrefix: string
  hint: string
  searchPlaceholder: string
}

export interface ErDiagramData {
  meta?: { title?: string; description?: string; source?: string; backTo?: string }
  options?: Partial<ErOptions>
  /** 必填性語彙。marker 對應 CSS 的圓點樣式：solid / half / hollow / muted */
  requirement: { key: string; label: string; marker: string; title?: string }[]
  /** 欄位徽章。tone 對應配色：danger / info / success / neutral / warning */
  flags: { key: ErFlagKey; badge: string; tone?: string; label?: string }[]
  /** 衍生欄徽章，一律 warning 色 */
  derivations: { key: string; badge: string; label?: string }[]
  groups: { key: string; label: string }[]
  layout: { columns: { key: string; groups: string[] }[] }
  tables: ErTable[]
}

const DEFAULT_OPTIONS: ErOptions = {
  defaultRows: 6,
  hubTables: [],
  sectionPrefix: '§',
  hint: '點一張表可聚焦它的關聯，其餘變淡；再點一次、點空白處或按 Esc 取消。欄位右側的圖示 hover 可看該欄說明。',
  searchPlaceholder: '搜尋表名或欄位名',
}

interface Edge {
  id: string
  child: string
  parent: string
  col: string
  self: boolean
}

const TIP_MAX_WIDTH = 320
const TIP_HALF = TIP_MAX_WIDTH / 2

interface TipState {
  x: number
  rawX: number
  y: number
  up: boolean
  adjusted: boolean
  title: string
  body: string
}

const CSS = `
.erd-root.erd-wrap { position: relative; font-family: var(--font-sans); color: var(--text-body); }
.erd-root .erd-cardhead, .erd-root .erd-cardhead .erd-tname, .erd-root .erd-cardhead .erd-tlabel, .erd-root .erd-cardhead .erd-tsec { color: var(--neutral-0); }
.erd-root .erd-card--focus .erd-cardhead, .erd-root .erd-card--focus .erd-cardhead .erd-tname, .erd-root .erd-card--focus .erd-cardhead .erd-tlabel, .erd-root .erd-card--focus .erd-cardhead .erd-tsec { color: var(--blue-950); }
.erd-root .erd-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 16px; margin: 0 0 10px; }
.erd-root .erd-search { position: relative; display: flex; align-items: center; gap: 6px; padding: 5px 10px; border: 1px solid var(--border-default); border-radius: var(--radius-pill); background: var(--surface-card); color: var(--text-muted); min-width: 280px; }
.erd-root .erd-input { border: 0; outline: none; background: transparent; font-size: 13px; color: var(--text-strong); width: 100%; font-family: inherit; }
.erd-root .erd-clear { border: 0; background: transparent; cursor: pointer; color: var(--text-muted); display: flex; padding: 2px; }
.erd-root .erd-hits { flex: none; font-size: 11.5px; font-weight: 600; white-space: nowrap; font-variant-numeric: tabular-nums; }
.erd-root .erd-hits-ok { color: var(--blue-700, #1b4f9c); }
.erd-root .erd-hits-none { color: var(--danger-500, #d64545); }
.erd-root .erd-toggle { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); cursor: pointer; }
.erd-root .erd-legend { display: flex; gap: 12px; margin-left: auto; font-size: 12px; color: var(--text-muted); }
.erd-root .erd-lg { display: inline-flex; align-items: center; gap: 5px; }
.erd-root .erd-hint { font-size: 12px; color: var(--text-muted); margin: 0 0 10px; line-height: 1.6; }
.erd-root .erd-focusbar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; margin: 0 0 10px; padding: 8px 12px; border-radius: var(--radius-md); background: var(--surface-accent-soft); border: 1px solid var(--orange-200); font-size: 12px; line-height: 1.6; }
.erd-root .erd-focusbar strong { font-family: var(--font-mono); color: var(--blue-800); font-size: 13px; }
.erd-root .erd-muted { color: var(--text-muted); }
.erd-root .erd-reset { margin-left: auto; border: 1px solid var(--orange-300); background: var(--surface-card); color: var(--orange-700); border-radius: var(--radius-pill); padding: 3px 12px; font-size: 12px; cursor: pointer; font-family: inherit; }
.erd-root .erd-scroll { overflow-x: auto; overflow-y: hidden; padding-bottom: 6px; }
.erd-root .erd-canvas { position: relative; width: max-content; min-width: 100%; }
.erd-root .erd-svg { position: absolute; inset: 0; pointer-events: none; overflow: visible; }
.erd-root .erd-cols { position: relative; display: grid; gap: 34px; align-items: start; }
.erd-root .erd-col { display: flex; flex-direction: column; gap: 26px; }
.erd-root .erd-group { border: 1px dashed var(--border-subtle); border-radius: var(--radius-lg); padding: 10px 10px 12px; background: color-mix(in srgb, var(--blue-50) 45%, transparent); }
.erd-root .erd-grouphead { margin: 0 0 8px; font-size: 11px; font-weight: var(--weight-bold); letter-spacing: var(--tracking-wide); color: var(--blue-700); text-transform: none; }
.erd-root .erd-card { position: relative; z-index: 2; background: var(--surface-card); border: 1px solid var(--border-default); border-radius: var(--radius-md); box-shadow: var(--shadow-xs); margin-bottom: 18px; min-width: 218px; max-width: 380px; width: max-content; transition: opacity var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out), border-color var(--duration-fast) var(--ease-out); }
.erd-root .erd-card:last-child { margin-bottom: 0; }
.erd-root .erd-card:hover { box-shadow: var(--shadow-sm); border-color: var(--blue-300); }
.erd-root .erd-card--dim { opacity: .25; }
.erd-root .erd-card--focus { border-color: var(--orange-400); box-shadow: var(--shadow-accent); z-index: 4; }
.erd-root .erd-card--rel { border-color: var(--blue-500); box-shadow: var(--shadow-sm); z-index: 3; }
.erd-root .erd-card--hit { border-color: var(--orange-300); }
.erd-root .erd-cardhead { display: flex; flex-wrap: nowrap; align-items: baseline; gap: 4px 10px; width: 100%; white-space: nowrap; text-align: left; border: 0; border-radius: var(--radius-md) var(--radius-md) 0 0; background: var(--blue-700); color: var(--neutral-0); padding: 6px 9px; cursor: pointer; font-family: inherit; }
.erd-root .erd-card--focus .erd-cardhead { background: var(--gradient-accent); color: var(--blue-950); }
.erd-root .erd-cardhead:focus-visible { outline: var(--focus-ring); outline-offset: 2px; }
.erd-root .erd-tname { font-family: var(--font-mono); font-size: 12.5px; font-weight: var(--weight-bold); }
.erd-root .erd-tlabel { font-size: 11px; opacity: .88; }
.erd-root .erd-tsec { margin-left: auto; font-size: 10px; opacity: .75; }
.erd-root .erd-cols-list { list-style: none; margin: 0; padding: 4px 0; }
.erd-root .erd-field { display: flex; flex-wrap: nowrap; align-items: center; gap: 5px; margin: 0; padding: 2px 9px; font-size: 11px; line-height: 1.5; white-space: nowrap; }
.erd-root .erd-field--hit { background: var(--orange-50); }
.erd-root .erd-fname { font-family: var(--font-mono); color: var(--text-strong); }
.erd-root .erd-ftype { font-family: var(--font-mono); color: var(--text-muted); font-size: 10px; }
.erd-root .erd-keys { display: inline-flex; gap: 3px; margin-left: auto; padding-left: 6px; flex: 0 0 auto; }
.erd-root .erd-k { font-size: 8.5px; font-weight: var(--weight-bold); line-height: 1; padding: 2px 4px; border-radius: var(--radius-xs); font-style: normal; }
.erd-root .erd-k--danger { background: var(--danger-50); color: var(--danger-500); }
.erd-root .erd-k--info { background: var(--blue-50); color: var(--blue-600); }
.erd-root .erd-k--success { background: var(--success-50); color: var(--success-500); }
.erd-root .erd-k--neutral { background: var(--neutral-100); color: var(--neutral-600); }
.erd-root .erd-k--warning { background: var(--warning-50); color: var(--warning-700); }
.erd-root .erd-dot { width: 7px; height: 7px; border-radius: var(--radius-circle); border: 1.5px solid var(--blue-500); flex: 0 0 auto; display: inline-block; }
.erd-root .erd-dot--solid { background: var(--blue-500); }
.erd-root .erd-dot--half { background: linear-gradient(90deg, var(--blue-500) 50%, transparent 50%); }
.erd-root .erd-dot--hollow { background: transparent; }
.erd-root .erd-dot--muted { background: var(--neutral-300); border-color: var(--neutral-400); }
.erd-root .erd-info { border: 0; background: transparent; padding: 0; margin-left: 2px; flex: 0 0 auto; cursor: help; color: var(--neutral-400); display: inline-flex; }
.erd-root .erd-info:hover, .erd-root .erd-info:focus-visible { color: var(--blue-600); }
.erd-root .erd-more { width: 100%; border: 0; border-top: 1px solid var(--border-subtle); background: transparent; color: var(--blue-600); font-size: 10.5px; padding: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 3px; border-radius: 0 0 var(--radius-md) var(--radius-md); font-family: inherit; }
.erd-root .erd-more:hover { background: var(--blue-50); }
.erd-root .erd-edge path { fill: none; stroke: var(--blue-300); stroke-width: 1.1; transition: opacity var(--duration-fast) var(--ease-out), stroke-width var(--duration-fast) var(--ease-out); }
.erd-root .erd-edge text { font-family: var(--font-mono); font-size: 9.5px; fill: var(--orange-700); paint-order: stroke; stroke: var(--neutral-0); stroke-width: 3px; }
.erd-root marker path { fill: var(--blue-300); }
.erd-root .erd-head--on { fill: var(--orange-500); }
.erd-root .erd-edge--base path { opacity: .55; }
.erd-root .erd-edge--opt path { stroke: var(--neutral-300); }
.erd-root .erd-edge--dim path { opacity: .18; }
.erd-root .erd-edge--off path { opacity: .08; }
.erd-root .erd-edge--on path { stroke: var(--orange-500); stroke-width: 2; opacity: 1; }
.erd-root .erd-tip { position: absolute; z-index: 20; width: max-content; max-width: 320px; transform: translateX(-50%); background: var(--blue-950); color: var(--neutral-0); border-radius: var(--radius-sm); padding: 7px 10px; box-shadow: var(--shadow-lg); pointer-events: none; }
.erd-root .erd-tip--up { transform: translate(-50%, -100%); }
.erd-root .erd-tiphead { font-family: var(--font-mono); font-size: 11px; color: var(--orange-300); margin-bottom: 3px; }
.erd-root .erd-tipbody { font-size: 11.5px; line-height: 1.65; }
.erd-root .erd-act { appearance: none; font: inherit; font-size: 12px; font-weight: var(--weight-bold); line-height: 1.5; padding: 5px 13px; border-radius: var(--radius-pill); border: 1px solid var(--orange-400); background: var(--orange-400); color: var(--blue-950); cursor: pointer; white-space: nowrap; transition: background var(--duration-fast) var(--ease-out), border-color var(--duration-fast) var(--ease-out); }
.erd-root .erd-act:hover { background: var(--orange-300); border-color: var(--orange-300); }
.erd-root .erd-act--ghost { background: var(--surface-card); border-color: var(--border-default); color: var(--text-muted); }
.erd-root .erd-act--ghost:hover { background: var(--surface-card); border-color: var(--blue-400); color: var(--blue-700); }
.erd-root .erd-act:focus-visible { outline: var(--focus-ring); outline-offset: 2px; }
.erd-root .erd-hold { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 18px 16px; border: 1px dashed var(--border-default); border-radius: var(--radius-lg); background: var(--surface-sunken); font-size: 13px; color: var(--text-muted); }
.erd-root .erd-hold .erd-act { margin-left: auto; }
.erd-root .erd-overlay { position: fixed; inset: 0; z-index: 2147483000; background: var(--surface-page); overflow: auto; padding: 18px clamp(12px, 3vw, 40px) 48px; }
@media (max-width: 900px) {
  .erd-root .erd-legend { margin-left: 0; }
}
`

export default function ErDiagramRenderer({
  data,
  options,
  mode,
}: PluginRendererProps<ErDiagramData>) {
  /* 設定的三層來源：內建預設 < 資料檔自帶的 options < plugins.json 傳進來的 options。
     後者最優先 —— 同一份資料被不同專案引用時，覆寫權在引用的人手上。 */
  const opts = useMemo<ErOptions>(
    () => ({
      ...DEFAULT_OPTIONS,
      ...(data.options ?? {}),
      ...(options as Partial<ErOptions>),
    }),
    [data.options, options],
  )

  const tables = data.tables
  const layoutColumns = data.layout.columns

  const groupLabel = useMemo(
    () => Object.fromEntries(data.groups.map((g) => [g.key, g.label])),
    [data.groups],
  )
  const byName = useMemo(() => new Map(tables.map((t) => [t.name, t])), [tables])

  /* 關聯由欄位的 fk 推導，不存進資料檔 —— 存了就會有兩份真相，改一邊忘另一邊。 */
  const edges = useMemo<Edge[]>(
    () =>
      tables.flatMap((t) =>
        t.columns
          .filter((c) => c.fk && tables.some((x) => x.name === c.fk))
          .map((c) => ({
            id: `${t.name}.${c.name}`,
            child: t.name,
            parent: c.fk as string,
            col: c.name,
            self: c.fk === t.name,
          })),
      ),
    [tables],
  )

  /* hub 表：被極多張表指向的共用表（例：選項主檔）。它的連線預設收起來，
     否則整張圖會被這一張表的放射狀線條蓋滿。取代原本寫死的 option_item。 */
  const hubTables = useMemo(() => new Set(opts.hubTables), [opts])

  const requirementOf = useCallback(
    (key: string) => data.requirement.find((r) => r.key === key),
    [data.requirement],
  )
  const derivationOf = useCallback(
    (key: string | undefined) => (key ? data.derivations.find((d) => d.key === key) : undefined),
    [data.derivations],
  )

  /* 預設顯示：主鍵、全部外鍵，再補一般欄位到 defaultRows 為止 */
  const defaultColumns = useCallback(
    (t: ErTable): ErColumn[] => {
      const keyCols = t.columns.filter((c) => c.pk || c.fk)
      const rest = t.columns.filter((c) => !c.pk && !c.fk)
      const out = [...keyCols]
      for (const c of rest) {
        if (out.length >= opts.defaultRows) break
        out.push(c)
      }
      return t.columns.filter((c) => out.includes(c))
    },
    [opts.defaultRows],
  )

  const [focus, setFocus] = useState<string | null>(null)
  const [hover, setHover] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [showHubEdges, setShowHubEdges] = useState(false)
  const [wide, setWide] = useState(false)
  const [tip, setTip] = useState<TipState | null>(null)
  const [paths, setPaths] = useState<
    { id: string; d: string; child: string; parent: string; col: string; mx: number; my: number }[]
  >([])

  const wrapRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const gridRef = useRef<HTMLDivElement | null>(null)
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 })

  const q = query.trim().toLowerCase()

  /* 搜尋命中的表；命中欄位的表自動展開 */
  const { hitTables, hitCols } = useMemo(() => {
    const hitTableSet = new Set<string>()
    const hitColSet = new Set<string>()
    if (!q) return { hitTables: hitTableSet, hitCols: hitColSet }
    for (const t of tables) {
      if (t.name.toLowerCase().includes(q) || t.label.toLowerCase().includes(q)) hitTableSet.add(t.name)
      for (const c of t.columns) {
        if (c.name.toLowerCase().includes(q)) {
          hitTableSet.add(t.name)
          hitColSet.add(`${t.name}.${c.name}`)
        }
      }
    }
    return { hitTables: hitTableSet, hitCols: hitColSet }
  }, [q, tables])

  /* 搜尋結果數：沒有這個數字，「查不到」與「沒在查」在畫面上長得一樣 */
  const hitLabel = useMemo(() => {
    if (!q) return null
    if (hitTables.size === 0) return '查無符合'
    if (hitCols.size === 0) return `${hitTables.size} 張表`
    return `${hitTables.size} 張表・${hitCols.size} 個欄位`
  }, [q, hitTables, hitCols])

  const related = useMemo(() => {
    if (!focus) return null
    const parents = new Set<string>()
    const children = new Set<string>()
    for (const e of edges) {
      if (e.self) continue
      if (e.child === focus) parents.add(e.parent)
      if (e.parent === focus) children.add(e.child)
    }
    return { parents, children, all: new Set([...parents, ...children, focus]) }
  }, [focus, edges])

  const isHubEdge = useCallback(
    (e: { parent: string }) => hubTables.has(e.parent),
    [hubTables],
  )

  /* 量測卡片位置後畫線。展開、搜尋、容器寬度變動都會重算。
     放大檢視（VizZoom 的畫布）對祖先套 transform: scale，getBoundingClientRect 會連帶被放大，
     但 SVG 的座標系來自 scrollWidth（版面 px、不受 transform 影響）。兩者不同調線就會歪，
     因此一律除以當下倍率換回版面座標。 */
  const measure = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const base = canvas.getBoundingClientRect()
    const scale = canvas.offsetWidth > 0 ? base.width / canvas.offsetWidth : 1
    const k = scale > 0.01 ? scale : 1
    /* 尺寸取自格線而非畫布：SVG 是畫布的絕對定位子元素，若拿畫布的 scrollWidth
       會把 SVG 自己的寬度算進去，變成「越量越寬」的回饋迴圈，欄數會一路縮到 1。 */
    const grid = gridRef.current
    setCanvasSize({
      w: grid ? grid.scrollWidth : canvas.clientWidth,
      h: grid ? grid.scrollHeight : canvas.clientHeight,
    })
    const next: typeof paths = []
    for (const e of edges) {
      const a = cardRefs.current.get(e.child)
      const b = cardRefs.current.get(e.parent)
      if (!a || !b) continue
      const ra = a.getBoundingClientRect()
      const rb = b.getBoundingClientRect()
      const ax0 = (ra.left - base.left) / k
      const bx0 = (rb.left - base.left) / k
      const aw = ra.width / k
      const bw = rb.width / k
      const ay = (ra.top - base.top) / k + Math.min(ra.height / k / 2, 26)
      const by = (rb.top - base.top) / k + Math.min(rb.height / k / 2, 26)
      let x1: number
      let x2: number
      let c1: number
      let c2: number
      if (e.self) {
        x1 = ax0 + aw
        x2 = x1
        const d = 26
        next.push({
          id: e.id,
          d: `M ${x1} ${ay - 8} C ${x1 + d} ${ay - 22}, ${x1 + d} ${ay + 22}, ${x2} ${ay + 8}`,
          child: e.child,
          parent: e.parent,
          col: e.col,
          mx: x1 + d,
          my: ay,
        })
        continue
      }
      const aRight = ax0 + aw
      const bRight = bx0 + bw
      if (ax0 + aw / 2 <= bx0 + bw / 2) {
        x1 = aRight
        x2 = bx0
      } else {
        x1 = ax0
        x2 = bRight
      }
      const dx = Math.max(28, Math.min(110, Math.abs(x2 - x1) / 2))
      c1 = x1 + (x2 >= x1 ? dx : -dx)
      c2 = x2 + (x2 >= x1 ? -dx : dx)
      next.push({
        id: e.id,
        d: `M ${x1} ${ay} C ${c1} ${ay}, ${c2} ${by}, ${x2} ${by}`,
        child: e.child,
        parent: e.parent,
        col: e.col,
        mx: (x1 + x2) / 2,
        my: (ay + by) / 2,
      })
    }
    setPaths(next)
  }, [edges])

  useLayoutEffect(() => {
    measure()
  }, [measure, expanded, q, canvasSize.w, wide])

  useEffect(() => {
    const onResize = () => measure()
    window.addEventListener('resize', onResize)
    const ro = new ResizeObserver(() => measure())
    if (canvasRef.current) ro.observe(canvasRef.current)
    return () => {
      window.removeEventListener('resize', onResize)
      ro.disconnect()
    }
    /* wide 進 deps 是為了重掛 ResizeObserver：切換全寬會把畫布整棵搬到另一個容器，
       掛回來的是新的一顆 DOM 節點，沿用舊的 observer 等於在觀察一個已脫離文件的節點。 */
  }, [measure, wide])

  /* 全寬檢視期間鎖住本文捲動，免得覆蓋層底下的頁面跟著滾 */
  useEffect(() => {
    if (!wide) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [wide])

  useEffect(() => {
    /* Esc 逐層退：先解聚焦與 tooltip，兩者都沒有時才收掉全寬檢視，
       讀者在全寬下查完一張表按 Esc 才不會整張圖直接跳回本文欄。 */
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape') return
      if (focus || tip) {
        setFocus(null)
        setTip(null)
        return
      }
      setWide(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focus, tip])

  const toggleExpand = useCallback((name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }, [])

  const showTip = useCallback((el: HTMLElement, title: string, body: string) => {
    const wrap = wrapRef.current
    if (!wrap) return
    /* 座標相對於 .erd-wrap（position: relative，即 tooltip 的 offset parent）。
       圖示位在會橫向捲動的 .erd-scroll 裡，其 rect 已含捲動位移，相減即為正確位置。
       水平用「夾在容器內」處理溢出，不看視窗尺寸——巢狀捲動與隱藏分頁下視窗尺寸可能為 0。 */
    const base = wrap.getBoundingClientRect()
    const scale = wrap.offsetWidth > 0 ? base.width / wrap.offsetWidth : 1
    const k = scale > 0.01 ? scale : 1
    const r = el.getBoundingClientRect()
    const raw = (r.left - base.left) / k + r.width / k / 2
    const x = Math.max(
      TIP_HALF + 6,
      Math.min(raw, Math.max(TIP_HALF + 6, base.width - TIP_HALF - 6)),
    )
    const vh = window.innerHeight || document.documentElement.clientHeight || 0
    const up = vh > 0 && r.bottom > vh - 170
    const y = up
      ? (r.top - base.top) / k - 8
      : (r.bottom - base.top) / k + 8
    setTip({ x, rawX: raw, y, up, adjusted: false, title, body })
  }, [])

  const tipRef = useRef<HTMLDivElement | null>(null)

  /* 用估計半寬先放，量到實際寬度後再校正一次——窄的 tooltip 才不會被推離圖示 */
  useLayoutEffect(() => {
    const el = tipRef.current
    const wrap = wrapRef.current
    if (!el || !wrap || !tip || tip.adjusted) return
    const base = wrap.getBoundingClientRect()
    const scale = wrap.offsetWidth > 0 ? base.width / wrap.offsetWidth : 1
    const k = scale > 0.01 ? scale : 1
    const r = el.getBoundingClientRect()
    const half = r.width / k / 2
    const min = half + 6
    const max = Math.max(min, base.width / k - half - 6)
    /* 從未夾過的 rawX 重新計算——用 tip.x 會回不到圖示旁邊，它已被估計半寬夾過一次 */
    const nextX = Math.max(min, Math.min(tip.rawX, max))
    setTip((prev) => (prev ? { ...prev, x: nextX, adjusted: true } : prev))
  }, [tip])

  const dimmed = useCallback(
    (name: string) => {
      if (focus) return !related?.all.has(name)
      if (q) return !hitTables.has(name)
      return false
    },
    [focus, related, q, hitTables],
  )

  const edgeState = useCallback(
    (p: { child: string; parent: string }) => {
      if (focus) {
        if (p.child === focus || p.parent === focus) return 'on'
        return 'off'
      }
      if (hover) {
        if (p.child === hover || p.parent === hover) return 'on'
        return 'dim'
      }
      if (q) return hitTables.has(p.child) && hitTables.has(p.parent) ? 'on' : 'dim'
      return 'base'
    },
    [focus, hover, q, hitTables],
  )

  const focusTable = focus ? byName.get(focus) : null

  /* 全寬檢視搬的是同一段 JSX，聚焦、搜尋、展開欄位的狀態因此不會因為切換而重置 */
  const diagram = (
    <div className="erd-root erd-wrap" ref={wrapRef}>
      <div className="erd-root erd-toolbar">
        <div className="erd-root erd-search">
          <Search size={15} aria-hidden />
          <input
            className="erd-root erd-input"
            type="search"
            value={query}
            placeholder={opts.searchPlaceholder}
            onChange={(ev) => setQuery(ev.target.value)}
            aria-label="搜尋表名或欄位名"
          />
          {hitLabel ? (
            <span
              className={`erd-root erd-hits ${
                hitTables.size === 0 ? 'erd-hits-none' : 'erd-hits-ok'
              }`}
              role="status"
              aria-live="polite"
            >
              {hitLabel}
            </span>
          ) : null}
          {query ? (
            <button
              type="button"
              className="erd-root erd-clear"
              onClick={() => setQuery('')}
              aria-label="清除搜尋"
            >
              <X size={13} aria-hidden />
            </button>
          ) : null}
        </div>

        {hubTables.size > 0 ? (
          <label className="erd-root erd-toggle">
            <input
              type="checkbox"
              checked={showHubEdges}
              onChange={(ev) => setShowHubEdges(ev.target.checked)}
            />
            顯示 {opts.hubTables.join('、')} 的 {edges.filter(isHubEdge).length} 條連線
          </label>
        ) : null}

        <div className="erd-root erd-legend">
          {data.requirement.map((r) => (
            <span className="erd-root erd-lg" key={r.key} title={r.title}>
              <i className={`erd-root erd-dot erd-dot--${r.marker}`} />
              {r.label}
            </span>
          ))}
        </div>

        {mode === 'embed' ? (
          <button
            type="button"
            className={`erd-root erd-act${wide ? ' erd-act--ghost' : ''}`}
            onClick={() => setWide(!wide)}
          >
            {wide ? '回到本文' : '展開全寬'}
          </button>
        ) : null}
      </div>

      {focusTable ? (
        <div className="erd-root erd-focusbar">
          <div>
            <strong>{focusTable.name}</strong>
            <span className="erd-root erd-muted">　{focusTable.label}　{opts.sectionPrefix}{focusTable.section}</span>
          </div>
          <div className="erd-root erd-muted">
            指向 {related ? related.parents.size : 0} 張父表
            {related && related.parents.size
              ? `（${[...related.parents].join('、')}）`
              : ''}
            ；被 {related ? related.children.size : 0} 張子表指向
            {related && related.children.size
              ? `（${[...related.children].join('、')}）`
              : ''}
          </div>
          <button type="button" className="erd-root erd-reset" onClick={() => setFocus(null)}>
            取消聚焦（Esc）
          </button>
        </div>
      ) : (
        <p className="erd-root erd-hint">{opts.hint}</p>
      )}

      <div className="erd-root erd-scroll">
        <div
          className="erd-root erd-canvas"
          ref={canvasRef}
          onClick={(ev) => {
            if (ev.target === ev.currentTarget) setFocus(null)
          }}
        >
          <svg
            className="erd-root erd-svg"
            width={canvasSize.w}
            height={canvasSize.h}
            viewBox={`0 0 ${canvasSize.w || 1} ${canvasSize.h || 1}`}
            aria-hidden
          >
            <defs>
              <marker id="erd-arrow" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
                <path d="M0,0 L7,3 L0,6 z" />
              </marker>
              <marker id="erd-arrow-on" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto">
                <path d="M0,0 L7,3 L0,6 z" className="erd-root erd-head--on" />
              </marker>
            </defs>
            {paths.map((p) => {
              const hubEdge = hubTables.has(p.parent)
              const state = edgeState(p)
              if (hubEdge && !showHubEdges && state !== 'on') return null
              return (
                <g key={p.id} className={`erd-root erd-edge erd-edge--${state}${hubEdge ? ' erd-edge--opt' : ''}`}>
                  <path d={p.d} markerEnd={state === 'on' ? 'url(#erd-arrow-on)' : 'url(#erd-arrow)'} />
                  {state === 'on' ? (
                    <text x={p.mx} y={p.my - 5} textAnchor="middle">
                      {p.col}
                    </text>
                  ) : null}
                </g>
              )
            })}
          </svg>

          <div
            className="erd-root erd-cols"
            ref={gridRef}
            style={{ gridTemplateColumns: `repeat(${layoutColumns.length}, max-content)` }}
          >
            {layoutColumns.map((col) => (
              <div className="erd-root erd-col" key={col.key}>
                {col.groups.map((g) => (
                  <section className={`erd-root erd-group erd-group--${g}`} key={g}>
                    <h4 className="erd-root erd-grouphead">{groupLabel[g]}</h4>
                    {tables.filter((t) => t.group === g).map((t) => {
                      const isOpen = expanded.has(t.name)
                      const shown = isOpen ? t.columns : defaultColumns(t)
                      const hiddenCount = t.columns.length - shown.length
                      const cls = [
                        'erd-root erd-card',
                        dimmed(t.name) ? 'erd-card--dim' : '',
                        focus === t.name ? 'erd-card--focus' : '',
                        focus && related?.all.has(t.name) && focus !== t.name ? 'erd-card--rel' : '',
                        q && hitTables.has(t.name) ? 'erd-card--hit' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')
                      return (
                        <div
                          key={t.name}
                          className={cls}
                          ref={(el) => {
                            if (el) cardRefs.current.set(t.name, el)
                            else cardRefs.current.delete(t.name)
                          }}
                          onMouseEnter={() => setHover(t.name)}
                          onMouseLeave={() => setHover((h) => (h === t.name ? null : h))}
                        >
                          <button
                            type="button"
                            className="erd-root erd-cardhead"
                            aria-pressed={focus === t.name}
                            onClick={() => setFocus((f) => (f === t.name ? null : t.name))}
                          >
                            <span className="erd-root erd-tname">{t.name}</span>
                            <span className="erd-root erd-tlabel">{t.label}</span>
                            <span className="erd-root erd-tsec">{opts.sectionPrefix}{t.section}</span>
                          </button>

                          <ul className="erd-root erd-cols-list">
                            {shown.map((c) => {
                              const hit = hitCols.has(`${t.name}.${c.name}`)
                              return (
                                <li
                                  className={`erd-root erd-field${hit ? ' erd-field--hit' : ''}`}
                                  key={c.name}
                                >
                                  <i
                                    className={`erd-root erd-dot erd-dot--${
                                      requirementOf(c.required)?.marker ?? 'hollow'
                                    }`}
                                    title={
                                      requirementOf(c.required)?.title ??
                                      requirementOf(c.required)?.label ??
                                      c.required
                                    }
                                  />
                                  <span className="erd-root erd-fname">{c.name}</span>
                                  <span className="erd-root erd-ftype">{c.type}</span>
                                  <span className="erd-root erd-keys">
                                    {data.flags.map((f) =>
                                      c[f.key] ? (
                                        <b
                                          className={`erd-root erd-k erd-k--${f.tone ?? 'neutral'}`}
                                          key={f.key}
                                          title={f.label}
                                        >
                                          {f.badge}
                                        </b>
                                      ) : null,
                                    )}
                                    {derivationOf(c.derivation) ? (
                                      <b
                                        className="erd-root erd-k erd-k--warning"
                                        title={derivationOf(c.derivation)?.label}
                                      >
                                        {derivationOf(c.derivation)?.badge}
                                      </b>
                                    ) : null}
                                  </span>
                                  <button
                                    type="button"
                                    className="erd-root erd-info"
                                    aria-label={`${c.name} 的說明`}
                                    onMouseEnter={(ev) =>
                                      showTip(
                                        ev.currentTarget,
                                        `${c.name}　${c.type}${c.default ? `　預設 ${c.default}` : ''}`,
                                        c.note,
                                      )
                                    }
                                    onFocus={(ev) =>
                                      showTip(
                                        ev.currentTarget,
                                        `${c.name}　${c.type}${c.default ? `　預設 ${c.default}` : ''}`,
                                        c.note,
                                      )
                                    }
                                    onMouseLeave={() => setTip(null)}
                                    onBlur={() => setTip(null)}
                                  >
                                    <Info size={12} aria-hidden />
                                  </button>
                                </li>
                              )
                            })}
                          </ul>

                          {hiddenCount > 0 || isOpen ? (
                            <button
                              type="button"
                              className="erd-root erd-more"
                              onClick={() => toggleExpand(t.name)}
                            >
                              {isOpen ? (
                                <>
                                  收合 <ChevronUp size={12} aria-hidden />
                                </>
                              ) : (
                                <>
                                  展開全部 {t.columns.length} 欄 <ChevronDown size={12} aria-hidden />
                                </>
                              )}
                            </button>
                          ) : null}
                        </div>
                      )
                    })}
                  </section>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {tip ? (
        <div
          ref={tipRef}
          className={`erd-root erd-tip${tip.up ? ' erd-tip--up' : ''}`}
          style={{ left: tip.x, top: tip.y }}
          role="tooltip"
        >
          <div className="erd-root erd-tiphead">{tip.title}</div>
          <div className="erd-root erd-tipbody">{tip.body}</div>
        </div>
      ) : null}
    </div>
  )

  return (
    <div className="erd-root erd-host">
      <style>{CSS}</style>
      {wide ? (
        <div className="erd-root erd-hold">
          <span>{data.meta?.title ?? '關聯圖'}已在全寬檢視開啟，按 Esc 或右側按鈕回到本文。</span>
          <button type="button" className="erd-root erd-act" onClick={() => setWide(false)}>
            回到本文
          </button>
        </div>
      ) : (
        diagram
      )}
      {wide ? (
        <div
          className="erd-root erd-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={`${data.meta?.title ?? '關聯圖'}（全寬檢視）`}
        >
          {diagram}
        </div>
      ) : null}
    </div>
  )
}
