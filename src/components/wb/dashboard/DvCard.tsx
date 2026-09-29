// 總覽卡片殼（pt-dash2.jsx 的 DvCard）：標題／副標／右側 slot。無 state。
import type { ReactNode } from "react";

export default function DvCard({
  title,
  sub,
  right,
  cls = "",
  label,
  children,
}: {
  title?: string;
  sub?: ReactNode;
  right?: ReactNode;
  cls?: string;
  /** 沒有 title 的卡（KPI）用它當 aria-label */
  label?: string;
  children?: ReactNode;
}) {
  return (
    <section className={"dv-card " + cls} aria-label={title ?? label}>
      {title ? (
        <header className="dv-card-h">
          <div>
            <h3>{title}</h3>
            {sub ? <p>{sub}</p> : null}
          </div>
          {right}
        </header>
      ) : null}
      {children}
    </section>
  );
}
