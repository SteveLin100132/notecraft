/* ER Diagram Renderer —— 資料推導
 *
 * 由資料檔推導出 UI 需要的一切：關聯（含多重性）、唯一鍵、中間表、資料問題、父子表、schema 歸屬、導覽樹。
 * 推導而不存，是為了只有一份真相 —— edges 由 tables[].foreignKeys 與 columns[].fk 推，父／子表數由 edges 推，
 * 沒有 schemas 時補一個隱含 schema，讓 v1.1 的資料檔不改也能跑。
 * 畫面一律讀這裡的結果，不要再自己讀 columns[].fk（v1.3）。
 *
 * 純函式、只有 `import type`：scripts/checks/er-derive.mjs 以 Node 的 strip-types 直接載入本檔，
 * 它不解析省略副檔名的相對 import、也不轉 JSX。
 */

import type {
  Edge,
  ErChildCardinality,
  ErDiagnostic,
  ErDiagnosticCode,
  ErDiagramData,
  ErGroup,
  ErJunction,
  ErParentCardinality,
  ErSchema,
  ErTable,
} from './types'

/** 沒有 schemas 時補上的隱含 schema。UI 不以節點形式顯示它 */
export const IMPLICIT_SCHEMA_KEY = '_all'
/** group 指向不存在的分群時，表歸入的虛擬分群 */
export const UNGROUPED_KEY = '__ungrouped'

export interface ErTreeGroup extends ErGroup {
  tables: ErTable[]
}

export interface ErTreeSchema extends ErSchema {
  groups: ErTreeGroup[]
}

export interface ErDerived {
  byName: Map<string, ErTable>
  groupByKey: Map<string, ErGroup>
  schemas: ErSchema[]
  /** 資料檔沒有 schemas、用的是隱含 schema */
  implicit: boolean
  schemaOfGroup: (groupKey: string) => string
  schemaOfTable: (tableName: string) => string
  /** schema 缺漏或指向不存在 key 的 group（只在有 schemas 時才算） */
  orphanGroups: string[]
  /** group 指向不存在分群的表 */
  ungroupedTables: string[]
  edges: Edge[]
  /** 本表的外鍵 edge（排除自我參照） */
  parentsOf: (name: string) => Edge[]
  /** 指向本表的 edge（排除自我參照） */
  childrenOf: (name: string) => Edge[]
  /** 父表名，去重、依 tables[] 原順序 */
  parentTables: (name: string) => string[]
  /** 子表名，去重、依 tables[] 原順序 */
  childTables: (name: string) => string[]
  /** schema → group（依 layout 順序）→ table */
  tree: ErTreeSchema[]
  /** 主鍵欄位（依欄位順序）；沒有時為空陣列 */
  pkOf: (table: string) => string[]
  /** 唯一鍵：主鍵、單欄 unique、indexes[].unique（去重） */
  uniqueKeysOf: (table: string) => string[][]
  /** 這一欄參與的外鍵（含複合） */
  fksOfColumn: (table: string, col: string) => Edge[]
  /** 中間表，key 是中間表名 */
  junctions: Map<string, ErJunction>
  /** 本表是兩端之一的多對多 */
  manyToManyOf: (table: string) => ErJunction[]
  /** 資料問題，依資料順序 */
  diagnostics: ErDiagnostic[]
  /** 反引號自動連結的目標。隱含模式下 schemas 為空集合 */
  linkTargets: { tables: Set<string>; schemas: Set<string> }
}

export function erDerive(data: ErDiagramData): ErDerived {
  const tables = data.tables
  const byName = new Map(tables.map((t) => [t.name, t]))
  const groupByKey = new Map(data.groups.map((g) => [g.key, g]))
  const implicit = !data.schemas || data.schemas.length === 0
  const schemas: ErSchema[] = implicit
    ? [{ key: IMPLICIT_SCHEMA_KEY, label: '全部' }]
    : (data.schemas as ErSchema[])
  const schemaKeys = new Set(schemas.map((s) => s.key))
  const firstSchema = schemas[0].key

  const schemaOfGroup = (groupKey: string): string => {
    const s = groupByKey.get(groupKey)?.schema
    return s && schemaKeys.has(s) ? s : firstSchema
  }
  const schemaOfTable = (tableName: string): string => {
    const t = byName.get(tableName)
    return t ? schemaOfGroup(t.group) : firstSchema
  }

  const orphanGroups = implicit
    ? []
    : data.groups.filter((g) => !g.schema || !schemaKeys.has(g.schema)).map((g) => g.key)
  const ungroupedTables = tables.filter((t) => !groupByKey.has(t.group)).map((t) => t.name)

  const keys = deriveKeys(data, byName)
  const { edges, diagnostics } = deriveEdges(data, byName, keys)
  const junctions = deriveJunctions(tables, edges, keys.uniqueKeysOf, diagnostics)

  const fkCols = new Map<string, Edge[]>()
  for (const e of edges) {
    for (const c of e.cols) {
      const k = `${e.child}\u0000${c}`
      const list = fkCols.get(k)
      if (list) list.push(e)
      else fkCols.set(k, [e])
    }
  }

  const order = new Map(tables.map((t, i) => [t.name, i]))
  const byOrder = (a: string, b: string) => (order.get(a) ?? 0) - (order.get(b) ?? 0)
  const parentsOf = (n: string) => edges.filter((e) => e.child === n && !e.self)
  const childrenOf = (n: string) => edges.filter((e) => e.parent === n && !e.self)
  const parentTables = (n: string) => [...new Set(parentsOf(n).map((e) => e.parent))].sort(byOrder)
  const childTables = (n: string) => [...new Set(childrenOf(n).map((e) => e.child))].sort(byOrder)

  /* 導覽樹的分群順序依 layout.columns —— 與圖上的位置一致；沒出現在 layout 的接在最後 */
  const groupOrder: string[] = []
  for (const col of data.layout.columns) {
    for (const g of col.groups) if (groupByKey.has(g) && !groupOrder.includes(g)) groupOrder.push(g)
  }
  for (const g of data.groups) if (!groupOrder.includes(g.key)) groupOrder.push(g.key)

  const tree: ErTreeSchema[] = schemas.map((s) => {
    const groups: ErTreeGroup[] = groupOrder
      .map((k) => groupByKey.get(k) as ErGroup)
      .filter((g) => schemaOfGroup(g.key) === s.key)
      .map((g) => ({ ...g, tables: tables.filter((t) => t.group === g.key) }))
    if (s.key === firstSchema && ungroupedTables.length) {
      groups.push({
        key: UNGROUPED_KEY,
        label: '未分群',
        tables: tables.filter((t) => !groupByKey.has(t.group)),
      })
    }
    return { ...s, groups }
  })

  return {
    byName,
    groupByKey,
    schemas,
    implicit,
    schemaOfGroup,
    schemaOfTable,
    orphanGroups,
    ungroupedTables,
    edges,
    parentsOf,
    childrenOf,
    parentTables,
    childTables,
    tree,
    pkOf: keys.pkOf,
    uniqueKeysOf: keys.uniqueKeysOf,
    fksOfColumn: (t, c) => fkCols.get(`${t}\u0000${c}`) ?? [],
    junctions,
    manyToManyOf: (n) => [...junctions.values()].filter((j) => j.a.parent === n || j.b.parent === n),
    diagnostics,
    linkTargets: {
      tables: new Set(tables.map((t) => t.name)),
      schemas: implicit ? new Set() : new Set(schemaKeys),
    },
  }
}

/* ── 鍵、外鍵、多重性、中間表（v1.3） ─────────────────── */

const sameSet = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((x) => b.includes(x))
const within = (a: readonly string[], b: readonly string[]): boolean => a.every((x) => b.includes(x))
const list = (cols: readonly string[]): string => (cols.length === 1 ? cols[0] : `(${cols.join(', ')})`)

/** 欄位組合的顯示：單欄 `a`、多欄 `(a, b)`；解析不出來的參照欄位是 `?` */
export const colsLabel = (cols: readonly string[] | null): string => (cols ? list(cols) : '?')

const RANGE: Record<ErChildCardinality, string> = {
  'zero-or-many': '0..N',
  'one-or-many': '1..N',
  'zero-or-one': '0..1',
  one: '1',
}

export interface CardinalityText {
  /** 例：N:1、1:N（可選）、1:1 */
  label: string
  /** 子端是 one-or-many 或 one：每筆父資料至少一筆子資料 */
  atLeastOne: boolean
  /** hover 用的完整句子 */
  sentence: string
}

/** Wiki 與局部關聯圖的多重性文字。side 是「這一頁的表」在這條外鍵裡的角色：child 寫 N:1、parent 寫 1:N。
 *  （可選）固定表示外鍵可為 null（父端 zero-or-one） */
export function cardinalityText(e: Edge, side: 'child' | 'parent'): CardinalityText {
  const many = e.card.child === 'zero-or-many' || e.card.child === 'one-or-many'
  const ratio = many ? (side === 'child' ? 'N:1' : '1:N') : '1:1'
  return {
    label: `${ratio}${e.card.parent === 'zero-or-one' ? '（可選）' : ''}`,
    atLeastOne: e.card.child === 'one-or-many' || e.card.child === 'one',
    sentence: `每筆 ${e.parent} 有 ${RANGE[e.card.child]} 筆 ${e.child}；每筆 ${e.child} 對應 ${e.card.parent === 'one' ? '1' : '0..1'} 筆 ${e.parent}`,
  }
}

interface ErKeys {
  pkOf: (table: string) => string[]
  uniqueKeysOf: (table: string) => string[][]
  /** 欄位不存在時當作不可為 null */
  nullable: (table: string, col: string) => boolean
}

function deriveKeys(data: ErDiagramData, byName: Map<string, ErTable>): ErKeys {
  const reqNullable = new Map(data.requirement.map((r) => [r.key, r.nullable]))
  const pk = new Map<string, string[]>()
  const uniq = new Map<string, string[][]>()
  for (const t of data.tables) {
    const p = t.columns.filter((c) => c.pk).map((c) => c.name)
    pk.set(t.name, p)
    const u: string[][] = []
    const add = (cols: string[]) => {
      if (cols.length && !u.some((x) => sameSet(x, cols))) u.push(cols)
    }
    add(p)
    for (const c of t.columns) if (c.unique) add([c.name])
    for (const ix of t.indexes ?? []) if (ix.unique) add(ix.columns)
    uniq.set(t.name, u)
  }
  return {
    pkOf: (n) => pk.get(n) ?? [],
    uniqueKeysOf: (n) => uniq.get(n) ?? [],
    nullable: (n, col) => {
      const c = byName.get(n)?.columns.find((x) => x.name === col)
      if (!c) return false
      return c.nullable ?? reqNullable.get(c.required) ?? false
    },
  }
}

/** fk 簡寫：整串剛好是表名就當表名；否則從最後一個 . 切開成表與欄位 */
export function parseFkRef(fk: string, tableNames: { has: (n: string) => boolean }): { table: string; column?: string } {
  if (tableNames.has(fk)) return { table: fk }
  const i = fk.lastIndexOf('.')
  if (i > 0 && i < fk.length - 1) return { table: fk.slice(0, i), column: fk.slice(i + 1) }
  return { table: fk }
}

interface FkSource {
  name?: string
  cols: string[]
  table: string
  refCols?: string[]
  /** 原始寫法，給訊息用 */
  raw: string
  cardinality?: { parent?: ErParentCardinality; child?: ErChildCardinality }
  note?: string
  origin: 'column' | 'table'
}

function deriveEdges(
  data: ErDiagramData,
  byName: Map<string, ErTable>,
  keys: ErKeys,
): { edges: Edge[]; diagnostics: ErDiagnostic[] } {
  const edges: Edge[] = []
  const diagnostics: ErDiagnostic[] = []
  const diag = (code: ErDiagnosticCode, table: string, message: string) => diagnostics.push({ code, table, message })

  for (const t of data.tables) {
    const sources: FkSource[] = (t.foreignKeys ?? []).map((fk) => ({
      name: fk.name,
      cols: fk.columns,
      table: fk.references.table,
      refCols: fk.references.columns,
      raw: fk.references.columns ? `${fk.references.table} ${list(fk.references.columns)}` : fk.references.table,
      cardinality: fk.cardinality,
      note: fk.note,
      origin: 'table',
    }))
    const tableLevel = sources.slice()
    for (const c of t.columns) {
      if (!c.fk) continue
      const ref = parseFkRef(c.fk, byName)
      const same = tableLevel.find((s) => s.cols.length === 1 && s.cols[0] === c.name)
      if (same) {
        const differs =
          same.table !== ref.table || (!!ref.column && !!same.refCols && (same.refCols.length !== 1 || same.refCols[0] !== ref.column))
        if (differs) {
          diag('fk-duplicate', t.name, `${t.name}.${c.name}：欄位的 fk（${c.fk}）與表層 foreignKeys（${same.raw}）指向不同，以表層為準`)
        }
        continue
      }
      sources.push({
        cols: [c.name],
        table: ref.table,
        refCols: ref.column ? [ref.column] : undefined,
        raw: c.fk,
        origin: 'column',
      })
    }

    const mine: Edge[] = []
    const notUnique = new Map<Edge, string>()
    const seen = new Set<string>()
    const ids = new Set<string>()
    const childUnique = keys.uniqueKeysOf(t.name)
    for (const src of sources) {
      const head = `${t.name} ${list(src.cols)}`
      const parent = byName.get(src.table)
      if (!parent) {
        diag('fk-missing-table', t.name, `${head} → ${src.raw}：父表不存在，這條外鍵不畫`)
        continue
      }
      const pk = keys.pkOf(parent.name)
      const refCols = src.refCols ?? (pk.length ? pk : null)
      const arrow = `${head} → ${parent.name}${refCols ? ` ${list(refCols)}` : ''}`

      const dupKey = `${src.cols.join('\u0000')}\u0001${parent.name}\u0001${refCols?.join('\u0000') ?? ''}`
      if (seen.has(dupKey)) {
        diag('fk-duplicate', t.name, `${arrow}：重複的外鍵，只保留第一條`)
        continue
      }
      seen.add(dupKey)

      const missing = src.cols.filter((c) => !t.columns.some((x) => x.name === c))
      if (missing.length) diag('fk-missing-column', t.name, `${arrow}：本表沒有欄位 ${missing.join(', ')}`)
      if (!refCols) {
        diag('ref-no-pk', t.name, `${arrow}：父表沒有主鍵，也沒寫參照欄位`)
      } else {
        const refMissing = refCols.filter((c) => !parent.columns.some((x) => x.name === c))
        if (refMissing.length) diag('ref-missing-column', t.name, `${arrow}：父表沒有欄位 ${refMissing.join(', ')}`)
        if (refCols.length !== src.cols.length) {
          diag('fk-arity', t.name, `${arrow}：欄數不同（本表 ${src.cols.length} 欄、父表 ${refCols.length} 欄）`)
        }
      }

      const anyNull = src.cols.some((c) => keys.nullable(t.name, c))
      const derivedParent: ErParentCardinality = anyNull ? 'zero-or-one' : 'one'
      const derivedChild: ErChildCardinality = childUnique.some((u) => within(u, src.cols)) ? 'zero-or-one' : 'zero-or-many'
      const card = {
        parent: src.cardinality?.parent ?? derivedParent,
        child: src.cardinality?.child ?? derivedChild,
      }
      let id = src.origin === 'column' ? `${t.name}.${src.cols[0]}` : `${t.name}.fk:${src.name ?? src.cols.join('+')}`
      for (let n = 2; ids.has(id); n++) id = `${id.replace(/#\d+$/, '')}#${n}`
      ids.add(id)
      const e: Edge = {
        id,
        child: t.name,
        parent: parent.name,
        cols: src.cols,
        refCols,
        col: src.cols.join(', '),
        self: parent.name === t.name,
        card,
        cardFrom: {
          parent: src.cardinality?.parent ? 'explicit' : 'derived',
          child: src.cardinality?.child ? 'explicit' : 'derived',
        },
        optional: card.parent === 'zero-or-one',
        ...(src.name ? { name: src.name } : {}),
        ...(src.note ? { note: src.note } : {}),
        origin: src.origin,
      }
      mine.push(e)
      if (refCols && refCols.length === src.cols.length && !refCols.some((c) => !parent.columns.some((x) => x.name === c))) {
        if (!keys.uniqueKeysOf(parent.name).some((u) => sameSet(u, refCols))) {
          notUnique.set(e, `${arrow}：參照的欄位不是父表的主鍵或唯一鍵`)
        }
      }
    }

    /* 疑似拆開寫的複合外鍵：多條單欄外鍵指向同一父表，參照欄位合起來剛好是父表的複合主鍵。
       不自動合併（同一對表之間本來就可能有兩條獨立的外鍵），只提示一次，並收掉它們各自的 ref-not-unique */
    const byParent = new Map<string, Edge[]>()
    for (const e of mine) {
      if (e.cols.length !== 1 || !e.refCols || e.refCols.length !== 1) continue
      const pk = keys.pkOf(e.parent)
      if (pk.length < 2 || !pk.includes(e.refCols[0])) continue
      const g = byParent.get(e.parent)
      if (g) g.push(e)
      else byParent.set(e.parent, [e])
    }
    for (const [parent, group] of byParent) {
      const refs = [...new Set(group.map((e) => (e.refCols as string[])[0]))]
      if (group.length < 2 || !sameSet(refs, keys.pkOf(parent))) continue
      diag(
        'fk-maybe-composite',
        t.name,
        `${t.name} ${list(group.map((e) => e.cols[0]))} → ${parent} ${list(refs)}：這幾欄合起來剛好是父表的複合主鍵，可能是一條複合外鍵，請改寫到 foreignKeys`,
      )
      for (const e of group) notUnique.delete(e)
    }
    for (const msg of notUnique.values()) diag('ref-not-unique', t.name, msg)

    edges.push(...mine)
  }
  return { edges, diagnostics }
}

function deriveJunctions(
  tables: ErTable[],
  edges: Edge[],
  uniqueKeysOf: (n: string) => string[][],
  diagnostics: ErDiagnostic[],
): Map<string, ErJunction> {
  const out = new Map<string, ErJunction>()
  for (const t of tables) {
    if (t.junction === false) continue
    const own = edges.filter((e) => e.child === t.name)
    const union = [...new Set(own.flatMap((e) => e.cols))]
    const isKey = own.length === 2 && uniqueKeysOf(t.name).some((u) => sameSet(u, union))
    if (t.junction === true) {
      if (own.length !== 2) {
        diagnostics.push({
          code: 'junction-invalid',
          table: t.name,
          message: `${t.name}：標了 junction: true，但有 ${own.length} 條外鍵，不當中間表處理`,
        })
        continue
      }
      if (!isKey) {
        diagnostics.push({
          code: 'junction-not-unique',
          table: t.name,
          message: `${t.name}：標了 junction: true，但兩條外鍵的欄位合起來不是主鍵或唯一鍵`,
        })
      }
      out.set(t.name, { table: t.name, a: own[0], b: own[1], auto: false })
      continue
    }
    if (isKey && own.every((e) => e.card.parent === 'one')) {
      out.set(t.name, { table: t.name, a: own[0], b: own[1], auto: true })
    }
  }
  return out
}

export interface TableMatch {
  hit: boolean
  /** 表名或表 label 命中 */
  byName: boolean
  /** 命中的欄位名 */
  columns: string[]
}

/** 表名、表 label、欄位名，不分大小寫。導覽篩選與 Diagram 搜尋共用這一支 */
export function matchTable(table: ErTable, query: string): TableMatch {
  const q = query.trim().toLowerCase()
  if (!q) return { hit: true, byName: true, columns: [] }
  const byName = table.name.toLowerCase().includes(q) || table.label.toLowerCase().includes(q)
  const columns = table.columns.filter((c) => c.name.toLowerCase().includes(q)).map((c) => c.name)
  return { hit: byName || columns.length > 0, byName, columns }
}
