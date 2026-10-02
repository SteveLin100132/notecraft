import type { MouseEventHandler, ReactNode } from "react";

export type ButtonProps = {
  /** 有 href 時渲染成連結，否則是 `<button>`。 */
  href?: string;
  /** 文字後加一個向右箭頭（導向其他頁時用）。 */
  arrow?: boolean;
  onClick?: MouseEventHandler<HTMLElement>;
  rel?: string;
  children?: ReactNode;
};

/**
 * 說明書上的欄框按鈕：直角、1.5px currentColor 外框，hover 反白填滿（sheet 填白、paper 填墨）。
 * 全站只有這一種按鈕，沒有實心主按鈕；主行動是 CommandBar。
 */
export function Button({ href, arrow = false, onClick, rel, children = "進入 Demo 工作台" }: ButtonProps) {
  const icon = arrow && (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M2 7h10M8 3l4 4-4 4" />
    </svg>
  );
  if (href)
    return (
      <a className="btn" href={href} rel={rel} onClick={onClick}>
        {children}
        {icon}
      </a>
    );
  return (
    <button type="button" className="btn" onClick={onClick}>
      {children}
      {icon}
    </button>
  );
}
