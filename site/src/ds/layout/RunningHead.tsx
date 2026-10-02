import { DOC_NAME } from "../tone";

export type RunningHeadProps = {
  /** 左側文件名（粗體）。 */
  docName?: string;
  /** 右側頁序：「圖頁 n／4」或「第 n 頁」。 */
  folio?: string;
};

/**
 * 頁眉：左側文件名、右側頁序，Archivo 13px、1px 底線。
 * 只承載文件名與頁序，不放標語或區塊說明。Page 會自動畫一條，通常不必單獨使用。
 */
export function RunningHead({ docName = DOC_NAME, folio = "第 1 頁" }: RunningHeadProps) {
  return (
    <div className="runhead">
      <span>
        <b>{docName}</b>
      </span>
      <span>{folio}</span>
    </div>
  );
}
