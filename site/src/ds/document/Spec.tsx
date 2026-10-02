import type { ReactNode } from "react";

export type SpecProps = {
  /** SpecHeading 與 SpecParagraph 交錯排列。 */
  children?: ReactNode;
};

/**
 * 說明頁內文：段落編號格線 `5.5em | 68ch`。【0001】掛在左欄、靠右、13px；640px 以下收成單欄。
 * 只放在 paper 上。子元素用 SpecHeading（【節名】）與 SpecParagraph（帶編號的段落）。
 */
export function Spec({ children }: SpecProps) {
  return (
    <div className="spec">
      {children ?? (
        <>
          <SpecHeading>【技術領域】</SpecHeading>
          <SpecParagraph n={1}>本工作台用於撰寫與閱讀技術筆記：流程、比較、架構、策略，這些只用文字很難講清楚的知識。</SpecParagraph>
        </>
      )}
    </div>
  );
}

export type SpecHeadingProps = {
  /** 節名，以全形方括號包住，如「【先前技術】」。 */
  children?: ReactNode;
};

/** 說明頁的節名（15px／700、字距 0.08em），只能放在 Spec 裡。 */
export function SpecHeading({ children = "【內容】" }: SpecHeadingProps) {
  return <h3>{children}</h3>;
}

export type SpecParagraphProps = {
  /** 段落編號；渲染成四位數【0001】。編號全站連續，跨頁不重來。 */
  n?: number;
  children?: ReactNode;
};

/** 帶段落編號的內文段落（17px／1.75），只能放在 Spec 裡。 */
export function SpecParagraph({ n = 1, children = "筆記留在你的 git repo。" }: SpecParagraphProps) {
  return (
    <>
      <span className="pn">【{String(n).padStart(4, "0")}】</span>
      <p>{children}</p>
    </>
  );
}
