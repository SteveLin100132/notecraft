/* ER Diagram Renderer —— Table 頁的局部關聯圖（佔位，Task 82 實作） */

import type { ErDerived } from './derive'

export interface ErLocalDiagramProps {
  D: ErDerived
  name: string
  onOpen: (name: string) => void
}

export function ErLocalDiagram({ D, name }: ErLocalDiagramProps) {
  return (
    <p className="erd-root erd-empty">
      父表 {D.parentTables(name).length}、子表 {D.childTables(name).length}
    </p>
  )
}
