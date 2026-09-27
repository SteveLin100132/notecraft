/* ER Diagram Renderer —— Table 頁的局部關聯圖
 *
 * 三欄：父表 ← 本表 ← 子表。箭頭一律指向父表（與 FK 方向相同：子 → 父）。
 * 固定版面、不縮放；連線量測 DOM 後以 SVG 貝茲曲線繪製，容器尺寸變動（含字型晚到）時重算。
 *
 * 父／子表各最多畫 8 張：hub 表（例：選項主檔）的子表可能上百張，全畫會把頁面拉到數千 px。
 * 超過的以「另有 N 張」chip 帶到下方清單 —— 清單永遠列全部。
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ErDerived } from './derive'

/** 每欄最多畫幾張 */
const LOCAL_MAX = 8
/** 容器寬度小於此值時改為上下三列 */
const VERTICAL_BELOW = 560

export interface ErLocalDiagramProps {
  D: ErDerived
  name: string
  onOpen: (name: string) => void
}

interface Line {
  id: string
  d: string
}

export function ErLocalDiagram({ D, name, onOpen }: ErLocalDiagramProps) {
  const boxRef = useRef<HTMLDivElement | null>(null)
  const nodes = useRef<Map<string, HTMLElement>>(new Map())
  const [lines, setLines] = useState<Line[]>([])
  const [vertical, setVertical] = useState(false)

  const parents = D.parentTables(name)
  const children = D.childTables(name)
  const self = D.edges.some((e) => e.self && e.child === name)
  const shownP = parents.slice(0, LOCAL_MAX)
  const shownC = children.slice(0, LOCAL_MAX)
  const t = D.byName.get(name)

  const measure = useCallback(() => {
    const box = boxRef.current
    const me = nodes.current.get('@')
    if (!box || !me) return
    setVertical(box.clientWidth > 0 && box.clientWidth < VERTICAL_BELOW)
    const b = box.getBoundingClientRect()
    const m = me.getBoundingClientRect()
    const out: Line[] = []
    const rel = (r: DOMRect) => ({
      l: r.left - b.left,
      r: r.right - b.left,
      t: r.top - b.top,
      b: r.bottom - b.top,
      cx: r.left - b.left + r.width / 2,
      cy: r.top - b.top + r.height / 2,
    })
    const M = rel(m)
    const isVertical = box.clientWidth < VERTICAL_BELOW
    for (const p of shownP) {
      const el = nodes.current.get(`p:${p}`)
      if (!el) continue
      const P = rel(el.getBoundingClientRect())
      /* 本表 → 父表，箭頭落在父表 */
      out.push({
        id: `p:${p}`,
        d: isVertical
          ? `M ${M.cx} ${M.t} C ${M.cx} ${M.t - 28}, ${P.cx} ${P.b + 28}, ${P.cx} ${P.b}`
          : `M ${M.l} ${M.cy} C ${M.l - 40} ${M.cy}, ${P.r + 40} ${P.cy}, ${P.r} ${P.cy}`,
      })
    }
    for (const c of shownC) {
      const el = nodes.current.get(`c:${c}`)
      if (!el) continue
      const C = rel(el.getBoundingClientRect())
      /* 子表 → 本表，箭頭落在本表 */
      out.push({
        id: `c:${c}`,
        d: isVertical
          ? `M ${C.cx} ${C.t} C ${C.cx} ${C.t - 28}, ${M.cx} ${M.b + 28}, ${M.cx} ${M.b}`
          : `M ${C.l} ${C.cy} C ${C.l - 40} ${C.cy}, ${M.r + 40} ${M.cy}, ${M.r} ${M.cy}`,
      })
    }
    setLines(out)
    // shownP／shownC 由 name 與 D 決定
  }, [name, D])

  useLayoutEffect(() => {
    measure()
  }, [measure, vertical])

  useEffect(() => {
    const box = boxRef.current
    if (!box) return undefined
    const ro = new ResizeObserver(() => measure())
    ro.observe(box)
    /* Noto Sans TC 較晚到，首次量測的節點寬度會偏 */
    let alive = true
    document.fonts?.ready.then(() => {
      if (alive) measure()
    })
    return () => {
      alive = false
      ro.disconnect()
    }
  }, [measure])

  const jumpTo = (which: 'parents' | 'children') => {
    const page = boxRef.current?.closest('.erd-page')
    page?.querySelector(`[data-erd-rel="${which}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }

  const node = (n: string, key: string) => (
    <button
      type="button"
      key={key}
      ref={(el) => {
        if (el) nodes.current.set(key, el)
        else nodes.current.delete(key)
      }}
      className="erd-root erd-ln"
      onClick={() => onOpen(n)}
    >
      <span className="erd-root erd-ln-n">{n}</span>
      <span className="erd-root erd-ln-l">{D.byName.get(n)?.label}</span>
    </button>
  )

  const more = (total: number, which: 'parents' | 'children') =>
    total > LOCAL_MAX ? (
      <button type="button" className="erd-root erd-ln-more" onClick={() => jumpTo(which)}>
        另有 {total - LOCAL_MAX} 張
      </button>
    ) : null

  return (
    <div className={`erd-root erd-local${vertical ? ' erd-local--v' : ''}`} ref={boxRef}>
      <svg className="erd-root erd-local-svg" aria-hidden>
        <defs>
          <marker id="erd-la" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
            <path d="M0,0 L7,3 L0,6 z" className="erd-root erd-local-head" />
          </marker>
        </defs>
        {lines.map((l) => (
          <path key={l.id} d={l.d} markerEnd="url(#erd-la)" />
        ))}
      </svg>
      <div className="erd-root erd-local-col erd-local-col--p">
        <div className="erd-root erd-local-h">父表 {parents.length}</div>
        {shownP.length ? shownP.map((p) => node(p, `p:${p}`)) : <div className="erd-root erd-local-empty">無</div>}
        {more(parents.length, 'parents')}
      </div>
      <div className="erd-root erd-local-col erd-local-col--me">
        <div className="erd-root erd-local-h">本表</div>
        <div
          className="erd-root erd-ln erd-ln--me"
          ref={(el) => {
            if (el) nodes.current.set('@', el)
            else nodes.current.delete('@')
          }}
        >
          <span className="erd-root erd-ln-n">{name}</span>
          <span className="erd-root erd-ln-l">{t?.label}</span>
          {self ? <span className="erd-root erd-ln-self">自我參照</span> : null}
        </div>
      </div>
      <div className="erd-root erd-local-col erd-local-col--c">
        <div className="erd-root erd-local-h">子表 {children.length}</div>
        {shownC.length ? shownC.map((c) => node(c, `c:${c}`)) : <div className="erd-root erd-local-empty">無</div>}
        {more(children.length, 'children')}
      </div>
    </div>
  )
}
