export type LogoProps = {
  /** 邊長（px）。 */
  size?: number;
  /** 是否在圖示右側顯示產品名。 */
  withName?: boolean;
  /** 產品名。 */
  name?: string;
};

/**
 * NoteCraftApp 標誌：圓角外框、兩條文字線與一顆星芒。
 * 外框與線用 currentColor（隨紙換色），星芒固定是品牌橙。全站唯一的圓角屬於這個品牌資產，不外推到元件。
 */
export function Logo({ size = 28, withName = true, name = "NoteCraftApp" }: LogoProps) {
  return (
    <span className="brand">
      <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden={withName ? true : undefined} role={withName ? undefined : "img"} aria-label={withName ? undefined : name}>
        <rect x="1" y="1" width="46" height="46" rx="9" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M14 30h20M14 36h13" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M24 11c1 5.6 2.6 7.2 8.2 8.2-5.6 1-7.2 2.6-8.2 8.2-1-5.6-2.6-7.2-8.2-8.2 5.6-1 7.2-2.6 8.2-8.2z" fill="#ed9b26" />
      </svg>
      {withName && <span>{name}</span>}
    </span>
  );
}
