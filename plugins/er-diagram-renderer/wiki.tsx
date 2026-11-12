/* ER Diagram Renderer —— Wiki（總覽／Schema／Table）
 *
 * 內文來自資料檔的 description（Markdown）；其餘全部由既有欄位推導 ——
 * 父／子表、索引與唯一鍵、衍生欄都不另外存。description 缺漏時照常渲染、顯示空狀態。
 */

import type { ReactNode } from 'react'
import { ArrowRight, ChevronRight, Workflow } from 'lucide-react'
import { stripMarkdown } from './markdown-text'
import type { LinkTargets } from './markdown-text'
import { ErMarkdown } from './markdown'
import { cardinalityText, colsLabel } from './derive'
import type { ErDerived, ErTreeGroup, ErTreeSchema } from './derive'
import { ErLocalDiagram } from './local-diagram'
import type { Edge, ErColumn, ErDiagramData, ErOptions, ErTable, Route } from './types'

export interface ErWikiProps {
  data: ErDiagramData
  D: ErDerived
  opts: ErOptions
  route: Route
  go: (r: Route) => void
  toDiagram: () => void
}

/* ── 共用小元件 ───────────────────────────────────────── */

export function FlagBadges({ data, col }: { data: ErDiagramData; col: Partial<ErColumn> }) {
  const der = col.derivation ? data.derivations.find((d) => d.key === col.derivation) : undefined
  return (
    <span className="erd-root erd-keys">
      {data.flags.map((f) =>
        col[f.key] ? (
          <b key={f.key} className={`erd-root erd-k erd-k--${f.tone ?? 'neutral'}`} title={f.label}>
            {f.badge}
          </b>
        ) : null,
      )}
      {der ? (
        <b className="erd-root erd-k erd-k--warning" title={der.label}>
          {der.badge}
        </b>
      ) : null}
    </span>
  )
}

function Dot({ data, req }: { data: ErDiagramData; req: string }) {
  const r = data.requirement.find((x) => x.key === req)
  return <i className={`erd-root erd-dot erd-dot--${r?.marker ?? 'hollow'}`} title={r?.title ?? r?.label ?? req} />
}

function SectionHead({ children, count, id }: { children: ReactNode; count?: number; id?: string }) {
  return (
    <h2 className="erd-root erd-h2" id={id}>
      {children}
      {count != null ? <span className="erd-root erd-h2-n">{count}</span> : null}
    </h2>
  )
}

/* ── 總覽 ─────────────────────────────────────────────── */

function Overview({ data, D, go, targets }: ErWikiProps & { targets: LinkTargets }) {
  const cols = data.tables.reduce((a, t) => a + t.columns.length, 0)
  const groups = D.tree.flatMap((s) => s.groups)
  return (
    <article className="erd-root erd-page">
      <div className="erd-root erd-eyebrow">DATABASE</div>
      <h1 className="erd-root erd-h1">{data.meta?.title ?? '資料庫 schema'}</h1>
      <div className="erd-root erd-meta">
        {D.implicit ? null : (
          <span>
            <b>{D.schemas.length}</b> schemas
          </span>
        )}
        <span>
          <b>{data.tables.length}</b> 張表
        </span>
        <span>
          <b>{cols}</b> 個欄位
        </span>
        <span>
          <b>{D.edges.length}</b> 條外鍵
        </span>
        {D.junctions.size ? (
          <span>
            <b>{D.junctions.size}</b> 組多對多
          </span>
        ) : null}
        {data.meta?.source ? <span className="erd-root erd-meta-src">來源：{data.meta.source}</span> : null}
      </div>
      <ErMarkdown src={data.meta?.description} targets={targets} onLink={go} />

      {D.implicit ? (
        <>
          <SectionHead count={groups.length}>分群</SectionHead>
          <div className="erd-root erd-cards">
            {groups.map((g) => (
              <div key={g.key} className="erd-root erd-card2 erd-card2--static">
                <div className="erd-root erd-card2-h">
                  <span>{g.label}</span>
                  <em>{g.tables.length} 張表</em>
                </div>
                {g.description ? <p>{stripMarkdown(g.description, 'first')}</p> : null}
                <div className="erd-root erd-card2-g">
                  {g.tables.slice(0, 6).map((t) => (
                    <button type="button" key={t.name} onClick={() => go({ kind: 'table', key: t.name })}>
                      <code>{t.name}</code>
                    </button>
                  ))}
                  {g.tables.length > 6 ? <span>+{g.tables.length - 6}</span> : null}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <SectionHead count={D.tree.length}>Schemas</SectionHead>
          <div className="erd-root erd-cards">
            {D.tree.map((s) => (
              <button
                type="button"
                key={s.key}
                className="erd-root erd-card2"
                onClick={() => go({ kind: 'schema', key: s.key })}
              >
                <div className="erd-root erd-card2-h">
                  <code>{s.key}</code>
                  <span>{s.label}</span>
                  <em>{s.groups.reduce((a, g) => a + g.tables.length, 0)} 張表</em>
                </div>
                {s.description ? <p>{stripMarkdown(s.description, 'first')}</p> : null}
                <div className="erd-root erd-card2-g">
                  {s.groups.map((g) => (
                    <span key={g.key}>{g.label}</span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      <SectionHead>語彙</SectionHead>
      <p className="erd-root erd-lede">本份資料自訂的標示方式。這些叫法寫在資料檔裡，換專案可以改。</p>
      <div className="erd-root erd-vocab">
        <div>
          <h4>必填性</h4>
          {data.requirement.map((r) => (
            <div key={r.key} className="erd-root erd-vocab-row">
              <i className={`erd-root erd-dot erd-dot--${r.marker}`} />
              <b>{r.label}</b>
              <span>
                {r.title ?? ''}
                {r.nullable ? <em className="erd-root erd-vocab-null">資料庫可為 null</em> : null}
              </span>
            </div>
          ))}
        </div>
        <div>
          <h4>欄位徽章</h4>
          {data.flags.map((f) => (
            <div key={f.key} className="erd-root erd-vocab-row">
              <b className={`erd-root erd-k erd-k--${f.tone ?? 'neutral'}`}>{f.badge}</b>
              <b>{f.label ?? f.key}</b>
            </div>
          ))}
        </div>
        {data.derivations.length ? (
          <div>
            <h4>衍生欄</h4>
            {data.derivations.map((d) => (
              <div key={d.key} className="erd-root erd-vocab-row">
                <b className="erd-root erd-k erd-k--warning">{d.badge}</b>
                <b>{d.label ?? d.key}</b>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  )
}

/* ── Schema 頁 ────────────────────────────────────────── */

function TableList({ group, D, go }: { group: ErTreeGroup; D: ErDerived; go: (r: Route) => void }) {
  return (
    <div className="erd-root erd-tlist" role="table" aria-label={`${group.label}的資料表`}>
      <div className="erd-root erd-tlist-h" role="row">
        <span role="columnheader">資料表</span>
        <span role="columnheader">說明</span>
        <span role="columnheader">欄位</span>
        <span role="columnheader">父／子</span>
      </div>
      {group.tables.map((t) => (
        <button
          type="button"
          key={t.name}
          role="row"
          className="erd-root erd-tlist-r"
          onClick={() => go({ kind: 'table', key: t.name })}
        >
          <span role="cell" className="erd-root erd-tlist-name">
            <code>{t.name}</code>
            <em>{t.label}</em>
          </span>
          <span role="cell" className="erd-root erd-tlist-d">
            {t.description ? stripMarkdown(t.description, 'first') : <i>尚無說明</i>}
          </span>
          <span role="cell" className="erd-root erd-tnum">
            {t.columns.length}
          </span>
          <span role="cell" className="erd-root erd-tnum">
            {D.parentTables(t.name).length}／{D.childTables(t.name).length}
          </span>
        </button>
      ))}
    </div>
  )
}

function SchemaPage({ s, D, go, toDiagram, targets }: ErWikiProps & { s: ErTreeSchema; targets: LinkTargets }) {
  return (
    <article className="erd-root erd-page">
      <div className="erd-root erd-eyebrow">SCHEMA</div>
      <div className="erd-root erd-h1-row">
        <h1 className="erd-root erd-h1">
          <code>{s.key}</code>
          {s.label}
        </h1>
        <button type="button" className="erd-root erd-pill erd-pill--blue" onClick={toDiagram}>
          <Workflow size={12} aria-hidden />
          在 Diagram 檢視
        </button>
      </div>
      <ErMarkdown src={s.description} targets={targets} onLink={go} />
      {s.groups.length === 0 ? (
        <p className="erd-root erd-empty">
          這個 schema 底下還沒有分群。在資料檔的 <code>groups[].schema</code> 指定歸屬。
        </p>
      ) : null}
      {s.groups.map((g) => (
        <section key={g.key}>
          <SectionHead count={g.tables.length}>{g.label}</SectionHead>
          <ErMarkdown src={g.description} targets={targets} onLink={go} className="erd-md--lede" />
          <TableList group={g} D={D} go={go} />
        </section>
      ))}
    </article>
  )
}

/* ── Table 頁 ─────────────────────────────────────────── */

/** 欄位表說明欄的外鍵參照：逐欄配對（複合外鍵各寫自己對到的那一欄）；父表不存在時灰色顯示原字串 */
function FkRefs({ t, c, D, open }: { t: ErTable; c: ErColumn; D: ErDerived; open: (n: string) => void }) {
  const fks = D.fksOfColumn(t.name, c.name)
  if (fks.length) {
    return (
      <>
        {fks.map((e) => {
          const ref = e.refCols?.[e.cols.indexOf(c.name)] ?? '?'
          return (
            <a
              key={e.id}
              href={`#table:${e.parent}`}
              className="erd-root erd-fkref"
              onClick={(ev) => {
                ev.preventDefault()
                open(e.parent)
              }}
            >
              <ArrowRight size={11} aria-hidden />
              <code>
                {e.parent}.{ref}
              </code>
              {e.cols.length > 1 ? <em className="erd-root erd-fkcomp">複合外鍵{e.name ? ` ${e.name}` : ''}</em> : null}
            </a>
          )
        })}
      </>
    )
  }
  if (!c.fk) return null
  return (
    <span className="erd-root erd-fkref erd-fkref--missing" title="父表或欄位不在這份資料檔裡">
      <ArrowRight size={11} aria-hidden />
      <code>{c.fk}</code>
    </span>
  )
}

/** 參照／被參照清單的一列。side 是本頁的表在這條外鍵裡的角色 */
function RelRow({ e, side, hub, onOpen }: { e: Edge; side: 'child' | 'parent'; hub: boolean; onOpen: () => void }) {
  const ct = cardinalityText(e, side)
  const explicit = e.cardFrom.parent === 'explicit' || e.cardFrom.child === 'explicit'
  return (
    <button type="button" className="erd-root erd-rel-r" onClick={onOpen} title={ct.sentence}>
      <code className={side === 'parent' ? 'erd-root erd-to' : undefined}>
        {e.child}.{colsLabel(e.cols)}
      </code>
      <ArrowRight size={12} aria-hidden />
      <code className={side === 'child' ? 'erd-root erd-to' : undefined}>
        {e.parent}.{colsLabel(e.refCols)}
      </code>
      <b className="erd-root erd-cardt">{ct.label}</b>
      {/* 「至少一筆」描述的是父表那一側（每筆父資料至少一筆子資料），只在被參照清單寫，免得在子表頁被讀成反方向 */}
      {ct.atLeastOne && side === 'parent' ? <em>至少一筆</em> : null}
      {e.cols.length > 1 ? <em>複合</em> : null}
      {explicit ? <em>指定</em> : null}
      {e.self ? <em>自我參照</em> : null}
      {hub ? <em>hub</em> : null}
      {e.note ? <span className="erd-root erd-rel-note">{e.note}</span> : null}
    </button>
  )
}

function TablePage({ t, data, D, opts, go, toDiagram, targets }: ErWikiProps & { t: ErTable; targets: LinkTargets }) {
  const g = D.groupByKey.get(t.group)
  const schemaKey = D.schemaOfTable(t.name)
  const s = D.schemas.find((x) => x.key === schemaKey)
  const parents = D.parentsOf(t.name)
  const children = D.childrenOf(t.name)
  const selfRefs = D.edges.filter((e) => e.self && e.child === t.name)
  const pk = D.pkOf(t.name)
  /* 索引與唯一鍵：複合主鍵算一列；欄位上的 unique／index；表層 indexes[] 每項一列 */
  const keyed: { key: string; cols: string[]; flags: Partial<ErColumn>; text: string }[] = []
  if (pk.length > 1) keyed.push({ key: '@pk', cols: pk, flags: { pk: true }, text: '主鍵（複合）' })
  for (const c of t.columns) {
    const soloPk = !!c.pk && pk.length === 1
    if (!soloPk && !c.unique && !c.index) continue
    keyed.push({
      key: c.name,
      cols: [c.name],
      flags: { pk: soloPk, unique: c.unique, index: c.index },
      text: [soloPk && '主鍵', c.unique && '唯一', c.index && '一般索引'].filter(Boolean).join('、'),
    })
  }
  ;(t.indexes ?? []).forEach((ix, i) => {
    keyed.push({
      key: `@ix${i}`,
      cols: ix.columns,
      flags: ix.unique ? { unique: true } : { index: true },
      text: `${[ix.unique ? '唯一' : '一般索引', ix.name].filter(Boolean).join('・')}${ix.note ? `　${ix.note}` : ''}`,
    })
  })
  const mn = D.manyToManyOf(t.name)
  const asJunction = D.junctions.get(t.name)
  const derived = t.columns.filter((c) => c.derivation)
  const der = (k: string | undefined) => data.derivations.find((d) => d.key === k)
  const req = (k: string) => data.requirement.find((r) => r.key === k)
  const hub = new Set(opts.hubTables)
  const open = (n: string) => go({ kind: 'table', key: n })

  return (
    <article className="erd-root erd-page">
      <div className="erd-root erd-crumbs">
        {D.implicit || !s ? null : (
          <>
            <button type="button" onClick={() => go({ kind: 'schema', key: s.key })}>
              <code>{s.key}</code>
            </button>
            <ChevronRight size={11} aria-hidden />
          </>
        )}
        <span>{g?.label ?? '未分群'}</span>
      </div>
      <div className="erd-root erd-h1-row">
        <h1 className="erd-root erd-h1">
          <code>{t.name}</code>
          {t.label}
        </h1>
        <button type="button" className="erd-root erd-pill erd-pill--blue" onClick={toDiagram}>
          <Workflow size={12} aria-hidden />
          在 Diagram 聚焦
        </button>
      </div>
      <div className="erd-root erd-meta">
        {t.section ? (
          <span className="erd-root erd-badge erd-badge--blue">
            {opts.sectionPrefix}
            {t.section}
          </span>
        ) : null}
        <span>
          <b>{t.columns.length}</b> 個欄位
        </span>
        <span>
          <b>{D.parentTables(t.name).length}</b> 張父表
        </span>
        <span>
          <b>{D.childTables(t.name).length}</b> 張子表
        </span>
        {asJunction ? (
          <span>
            中間表：<code>{asJunction.a.parent}</code> ↔ <code>{asJunction.b.parent}</code>
            {asJunction.auto ? '（自動判斷）' : ''}
          </span>
        ) : null}
      </div>
      {t.description ? (
        <ErMarkdown src={t.description} targets={targets} onLink={go} />
      ) : (
        <p className="erd-root erd-empty">
          這張表還沒有說明。在資料檔的 <code>tables[].description</code> 以 Markdown 撰寫。
        </p>
      )}

      <SectionHead id="cols" count={t.columns.length}>
        欄位
      </SectionHead>
      <div className="erd-root erd-colt-wrap">
        <table className="erd-root erd-colt">
          <thead>
            <tr>
              <th scope="col">欄位</th>
              <th scope="col">型別</th>
              <th scope="col">必填</th>
              <th scope="col">預設</th>
              <th scope="col">標示</th>
              <th scope="col">說明</th>
            </tr>
          </thead>
          <tbody>
            {t.columns.map((c) => (
              <tr key={c.name}>
                <td>
                  <code className="erd-root erd-cname">{c.name}</code>
                </td>
                <td>
                  <code className="erd-root erd-ctype">{c.type}</code>
                </td>
                <td>
                  <span className="erd-root erd-req">
                    <Dot data={data} req={c.required} />
                    {req(c.required)?.label ?? c.required}
                  </span>
                </td>
                <td>{c.default ? <code className="erd-root erd-ctype">{c.default}</code> : <span className="erd-root erd-na">—</span>}</td>
                <td>
                  <FlagBadges data={data} col={c} />
                </td>
                <td className="erd-root erd-cnote">
                  <FkRefs t={t} c={c} D={D} open={open} />
                  {c.note}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SectionHead id="rel" count={parents.length + children.length + selfRefs.length}>
        關聯
      </SectionHead>
      <ErLocalDiagram key={t.name} D={D} name={t.name} onOpen={open} />
      <div className="erd-root erd-rel">
        <div data-erd-rel="parents">
          <h4>參照（本表 → 父表）</h4>
          {parents.length || selfRefs.length ? (
            [...parents, ...selfRefs].map((e) => (
              <RelRow key={e.id} e={e} side="child" hub={hub.has(e.parent)} onOpen={() => open(e.parent)} />
            ))
          ) : (
            <p className="erd-root erd-empty">沒有外鍵欄位。</p>
          )}
        </div>
        <div data-erd-rel="children">
          <h4>被參照（子表 → 本表）</h4>
          {children.length ? (
            children.map((e) => <RelRow key={e.id} e={e} side="parent" hub={false} onOpen={() => open(e.child)} />)
          ) : (
            <p className="erd-root erd-empty">沒有其他表指向這張表。</p>
          )}
        </div>
      </div>

      {mn.length || asJunction ? (
        <>
          <SectionHead id="mn" count={asJunction ? undefined : mn.length}>
            多對多
          </SectionHead>
          <div className="erd-root erd-rel erd-rel--mn">
            {asJunction ? (
              <div>
                <p className="erd-root erd-lede">
                  這張表是中間表{asJunction.auto ? '（自動判斷：恰好兩條外鍵、合起來是主鍵或唯一鍵）' : ''}，連接：
                </p>
                {[asJunction.a, asJunction.b].map((e) => (
                  <button key={e.id} type="button" className="erd-root erd-rel-r" onClick={() => open(e.parent)}>
                    <code className="erd-root erd-to">{e.parent}</code>
                    <span className="erd-root erd-muted">經由 {colsLabel(e.cols)}</span>
                  </button>
                ))}
              </div>
            ) : null}
            {mn.length ? (
              <div>
                {mn.map((j) => {
                  const peer = j.a.parent === t.name ? j.b.parent : j.a.parent
                  return (
                    <button key={j.table} type="button" className="erd-root erd-rel-r" onClick={() => open(peer)}>
                      <code className="erd-root erd-to">{peer}</code>
                      <b className="erd-root erd-cardt">M:N</b>
                      <span className="erd-root erd-muted">
                        經由 <code>{j.table}</code>
                      </span>
                      {j.auto ? <em>自動判斷</em> : null}
                    </button>
                  )
                })}
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      <SectionHead id="idx" count={keyed.length}>
        索引與唯一鍵
      </SectionHead>
      {keyed.length ? (
        <div className="erd-root erd-kv">
          {keyed.map((r) => (
            <div key={r.key} className="erd-root erd-kv-r">
              <code className="erd-root erd-cname">{colsLabel(r.cols)}</code>
              <FlagBadges data={data} col={r.flags} />
              <span>{r.text}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="erd-root erd-empty">沒有索引或唯一鍵。</p>
      )}

      {derived.length ? (
        <>
          <SectionHead id="der" count={derived.length}>
            衍生欄
          </SectionHead>
          <p className="erd-root erd-lede">這些欄位由資料庫維護或特殊儲存，應用層不應直接寫入。</p>
          <div className="erd-root erd-kv">
            {derived.map((c) => (
              <div key={c.name} className="erd-root erd-kv-r">
                <code className="erd-root erd-cname">{c.name}</code>
                <b className="erd-root erd-k erd-k--warning">{der(c.derivation)?.badge}</b>
                <span>
                  <b>{der(c.derivation)?.label}</b>
                  {c.note ? `　${c.note}` : ''}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </article>
  )
}

/* ── 路由 ─────────────────────────────────────────────── */

export function ErWiki(props: ErWikiProps) {
  const { D, route } = props
  const targets = D.linkTargets
  if (route.kind === 'schema') {
    const s = D.tree.find((x) => x.key === route.key)
    if (s && !D.implicit) return <SchemaPage {...props} s={s} targets={targets} />
  } else if (route.kind === 'table') {
    const t = D.byName.get(route.key)
    if (t) return <TablePage {...props} t={t} targets={targets} />
  }
  return <Overview {...props} targets={targets} />
}
