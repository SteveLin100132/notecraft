import type { ReactNode } from "react";

export type LeadProps = {
  /** `abstract`：首頁摘要（18px／1.8，最寬 34em）；`sheet`：圖頁的導言（17px、次要字色，最寬 40em）。 */
  variant?: "abstract" | "sheet";
  children?: ReactNode;
};

/** 導言段落。行內 `<code>` 會畫一圈細框。可在文字後接 `<Ref>` 指認部件。 */
export function Lead({ variant = "sheet", children = "標記寫在筆記裡要放圖的位置。處理完，標記下方多了一行 import 和一行 JSX。" }: LeadProps) {
  return <p className={variant === "abstract" ? "hero-abstract" : "sheet-lead"}>{children}</p>;
}
