import { useState } from "react";

export type DataTableRow = {
  /** 第一欄（列標題），是可點的按鈕。 */
  head: string;
  /** 其餘欄位。 */
  cells: string[];
  /** 選中時顯示在表格下方的說明（mark-paper 600）。 */
  detail?: string;
};

export type DataTableProps = {
  columns?: string[];
  rows?: DataTableRow[];
  /** 初始選中的列索引；-1 表示都不選。 */
  defaultSelected?: number;
};

const DEFAULT_COLUMNS = ["方案", "適用", "限制"];
const DEFAULT_ROWS: DataTableRow[] = [
  { head: "@ai-visualize", cells: ["只為這一段文字服務的圖", "每次生成一個元件"], detail: "寫在筆記裡，Claude Code 生成元件並寫回。" },
  { head: "Plugin", cells: ["同一種形狀反覆出現的資料", "需要 JSON Schema"], detail: "資料檔放在筆記資料夾，build 時驗證 schema。" },
  { head: "靜態圖片", cells: ["截圖、照片", "不能互動、會過時"], detail: "能用元件講清楚的，就不要貼圖。" },
];

/**
 * 可選列的比較表：表頭 2px 墨線、列間 1px rule；點列標題選中，整列填 sheet，下方顯示該列說明。
 * 只放在 paper 上。
 */
export function DataTable({ columns = DEFAULT_COLUMNS, rows = DEFAULT_ROWS, defaultSelected = 0 }: DataTableProps) {
  const [sel, setSel] = useState(defaultSelected);
  return (
    <div>
      <table className="dt-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.head} className={i === sel ? "is-on" : undefined}>
              <th scope="row">
                <button type="button" className="dt-row" aria-pressed={i === sel} onClick={() => setSel(i)}>
                  {r.head}
                </button>
              </th>
              {r.cells.map((c, j) => (
                <td key={j}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="dt-detail" aria-live="polite">
        {rows[sel]?.detail ?? ""}
      </p>
    </div>
  );
}
