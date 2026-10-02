import type { ReactNode } from "react";
import { useTone } from "../tone";

export type PageTitleProps = {
  /** 標題的每一行；說明書的標題固定斷成兩行，480px 以上不換行。 */
  lines?: ReactNode[];
  /**
   * `display`：首頁主張（clamp 34–68px）。
   * `headline`：每一頁的頁標題（clamp 32–56px）；在 paper 上自帶上下留白。
   * `closing`：收尾標題（clamp 32–64px），兩行並排成一行內聯。
   */
  size?: "display" | "headline" | "closing";
  /** 標題層級。 */
  level?: 1 | 2 | 3;
  id?: string;
};

const CLASS = { display: "hero-title", closing: "closing-title" } as const;

/** 頁標題：Archivo 800，兩行，每行一個 span。在 sheet／paper 上自動換色。 */
export function PageTitle({ lines = ["文字講不清楚的，", "就讓讀者自己操作。"], size = "headline", level = 2, id }: PageTitleProps) {
  const tone = useTone();
  const H = `h${level}` as "h1" | "h2" | "h3";
  const cls = size === "headline" ? `${tone}-title` : CLASS[size];
  return (
    <H className={cls} id={id}>
      {lines.map((l, i) => (
        <span key={i}>{l}</span>
      ))}
    </H>
  );
}
