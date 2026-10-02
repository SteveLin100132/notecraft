import type { ReactNode } from "react";

export type FigureProps = {
  /** 圖號，渲染成「FIG. n」。 */
  n?: number | string;
  /** 圖說：在 FIG. n 之後、同一行基線對齊。可接 Ref。 */
  caption?: ReactNode;
  /** 圖本身（SVG 線稿、FolderTree、FlowSteps…）。 */
  children?: ReactNode;
};

/**
 * 圖與圖說：圖下方一條細線、12px 間距、「FIG. n」在前、說明在後。圖說以外不另設圖標題。
 * 在 sheet 上線是半透白、在 paper 上是 rule。
 */
export function Figure({ n = 3, caption = "一個專案就是一份文件：全部是文字檔，全部在 git 裡。", children }: FigureProps) {
  return (
    <figure className="ds-fig">
      {children}
      <figcaption>
        <span className="fig-no">FIG. {n}</span>
        <span>{caption}</span>
      </figcaption>
    </figure>
  );
}
