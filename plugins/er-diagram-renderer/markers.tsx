/* ER Diagram Renderer —— 多重性 marker（crow's foot / IE notation）
 *
 * Diagram 與局部關聯圖共用。線一律從子表畫到父表：父端掛 markerEnd、子端掛 markerStart，
 * 起點端靠 orient="auto-start-reverse" 自動翻轉，所以每種形狀只畫一個朝向。
 *
 * 座標：viewBox 0 0 16 12、refX 16 —— 線從左邊進來，x = 16 就是卡片邊緣。
 * markerUnits="userSpaceOnUse"：線變粗（聚焦）時 marker 不跟著放大。
 *
 * marker 的內容不是 .erd-edge 的子孫，吃不到 .erd-edge--on path 的規則，
 * 所以每種「形狀 × 色調」各一個 marker。id 以 useId() 加前綴：同一頁有好幾個 ER 內嵌時不會互相引用。
 */

import type { ErChildCardinality, ErParentCardinality } from './types'

/** 子端 one 與父端 one 是同一個形狀，zero-or-one 亦同，實際只有四種 */
export type MarkerShape = 'one' | 'zero-or-one' | 'one-or-many' | 'zero-or-many'
export type MarkerTone = 'base' | 'on' | 'opt' | 'local'

export const MARKER_SHAPES: readonly MarkerShape[] = ['one', 'zero-or-one', 'one-or-many', 'zero-or-many']

export const shapeOf = (c: ErParentCardinality | ErChildCardinality): MarkerShape => c

/** useId() 的值含冒號等字元，放進 url(#…) 前先去掉 */
export const markerUid = (raw: string): string => `erd${raw.replace(/[^a-zA-Z0-9_-]/g, '')}`

export const markerUrl = (uid: string, shape: MarkerShape, tone: MarkerTone): string => `url(#${uid}-${shape}-${tone})`

/** 圖例與 Wiki 用的文字 */
export const SHAPE_LABEL: Record<MarkerShape, string> = {
  one: '恰好一筆',
  'zero-or-one': '零或一筆',
  'one-or-many': '一筆以上',
  'zero-or-many': '零或多筆',
}

function Glyph({ shape }: { shape: MarkerShape }) {
  switch (shape) {
    case 'one':
      return <path d="M10 1 V11 M13 1 V11" />
    case 'zero-or-one':
      return (
        <>
          <circle cx="5" cy="6" r="3" />
          <path d="M13 1 V11" />
        </>
      )
    case 'one-or-many':
      return <path d="M6 1 V11 M9 6 L16 1 M9 6 L16 6 M9 6 L16 11" />
    case 'zero-or-many':
      return (
        <>
          <circle cx="4" cy="6" r="3" />
          <path d="M9 6 L16 1 M9 6 L16 6 M9 6 L16 11" />
        </>
      )
  }
}

export function ErMarkers({ uid, tones }: { uid: string; tones: readonly MarkerTone[] }) {
  return (
    <defs>
      {tones.flatMap((tone) =>
        MARKER_SHAPES.map((shape) => (
          <marker
            key={`${shape}-${tone}`}
            id={`${uid}-${shape}-${tone}`}
            className={`erd-root erd-mk erd-mk--${tone}`}
            viewBox="0 0 16 12"
            refX="16"
            refY="6"
            markerWidth="16"
            markerHeight="12"
            markerUnits="userSpaceOnUse"
            orient="auto-start-reverse"
            overflow="visible"
          >
            <Glyph shape={shape} />
          </marker>
        )),
      )}
    </defs>
  )
}
