/* ER Diagram Renderer —— NoteCraft plugin
 *
 * 把一份資料庫 schema JSON 畫成可聚焦、可搜尋的實體關聯圖。
 *
 * 前身是 TrendMile 專案裡一支 751 行的 tsx，其中 68 KB 是寫死的表定義。
 * 本檔把資料全部移出去，同時把幾個「只對那個專案成立」的常數也一併外部化 ——
 * 五欄版面、必填性語彙、徽章叫法、hub 表、預設顯示欄數、提示文案。
 * 只抽表定義是不夠的：那些常數留著，換一個專案還是得改程式。
 *
 * 檔案分工：renderer.tsx 是入口（設定合併、全寬檢視）；畫布在 diagram.tsx；
 * 型別與常數在 types.ts；樣式在 styles.ts。入口檔名固定為 renderer.tsx（NoteCraft 的 glob 只認它），
 * 其餘檔案由相對 import 帶進打包 —— 新增檔案時記得登記到 plugins/registry.json 的 files。
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ErDiagram } from './diagram'
import { CSS } from './styles'
import type { ErDiagramData, ErOptions, PluginRendererProps } from './types'
import { DEFAULT_OPTIONS } from './types'

export type { ErColumn, ErDiagramData, ErGroup, ErOptions, ErSchema, ErTable } from './types'

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

  const [wide, setWide] = useState(false)
  const toggleWide = useCallback(() => setWide((w) => !w), [])
  const closeWide = useCallback(() => setWide(false), [])

  /* 全寬檢視期間鎖住本文捲動，免得覆蓋層底下的頁面跟著滾 */
  useEffect(() => {
    if (!wide) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [wide])

  /* 全寬時只換掉包在畫布外面的容器，<ErDiagram> 在樹上的位置不變 ——
     換位置 React 會重掛元件，聚焦、搜尋、展開欄位就全部歸零。 */
  return (
    <div className="erd-root erd-host">
      <style>{CSS}</style>
      {wide ? (
        <div className="erd-root erd-hold">
          <span>{data.meta?.title ?? '關聯圖'}已在全寬檢視開啟，按 Esc 或右側按鈕回到本文。</span>
          <button type="button" className="erd-root erd-act" onClick={closeWide}>
            回到本文
          </button>
        </div>
      ) : null}
      <div
        className={wide ? 'erd-root erd-overlay' : 'erd-root erd-inline'}
        role={wide ? 'dialog' : undefined}
        aria-modal={wide ? true : undefined}
        aria-label={wide ? `${data.meta?.title ?? '關聯圖'}（全寬檢視）` : undefined}
      >
        <ErDiagram
          data={data}
          opts={opts}
          mode={mode}
          wide={wide}
          onToggleWide={toggleWide}
          onEscapeEmpty={closeWide}
        />
      </div>
    </div>
  )
}
