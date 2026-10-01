/* OpenAPI Renderer —— NoteCraft plugin（骨架，Task 99）
 *
 * 外殼、導覽與頁面在 Task 100–103 補上；這一版只確認資料進得來、Swagger 2.0 有轉檔指引。
 */

import { useMemo } from 'react'
import { derive } from './derive'
import type { OpenApiDoc, PluginRendererProps } from './types'

const warned = new Set<string>()

export default function OpenApiRenderer({ data, file }: PluginRendererProps<OpenApiDoc>) {
  const D = useMemo(() => derive(data), [data])
  if (D.version.kind === 'swagger') {
    if (typeof window === 'undefined' && !warned.has(file.path)) {
      warned.add(file.path)
      console.warn(`[openapi-renderer] ${file.path} 是 Swagger ${D.version.raw}，只顯示轉檔指引（plugin 只支援 OpenAPI 3.0／3.1）`)
    }
    return <p>這份文件是 Swagger {D.version.raw}，plugin 只支援 OpenAPI 3.0 / 3.1。請先轉檔（例如 swagger2openapi）再放進筆記資料夾。</p>
  }
  return (
    <p>
      {data.info?.title} · {D.ops.length} 支 operation
    </p>
  )
}
