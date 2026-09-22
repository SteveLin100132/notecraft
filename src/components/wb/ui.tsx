// 工作台共用的展示元件：純 props → DOM，無 state、無副作用。
// class 名稱與 docs/prototype/design_handoff_workbench/prototype/wb/*.jsx 一致，樣式全在 src/styles/workbench.css。
import type { CSSProperties, ComponentType, ReactNode } from "react";
import { ChevronRight, type LucideProps } from "lucide-react";
import { markerCounts, type WbMarker } from "@/lib/wb-types";

/** prototype 的圖示是 24 grid／1.7 stroke；lucide 預設 stroke 2，這裡統一成 1.7。 */
export function Ic({
  icon: Icon,
  size = 17,
  strokeWidth = 1.7,
  color,
  style,
}: {
  icon: ComponentType<LucideProps>;
  size?: number;
  strokeWidth?: number;
  color?: string;
  style?: CSSProperties;
}) {
  return <Icon size={size} strokeWidth={strokeWidth} color={color} style={style} aria-hidden="true" />;
}

export type PillTone = "default" | "ok" | "warn" | "muted" | "danger";

export function Pill({
  tone = "default",
  children,
  className = "",
  style,
  title,
}: {
  tone?: PillTone;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  title?: string;
}) {
  const cls = ["wb-pill", tone === "default" ? "" : tone, "tnum", className].filter(Boolean).join(" ");
  return (
    <span className={cls} style={style} title={title}>
      {children}
    </span>
  );
}

/** 系列 pill：顏色由 accent class 的 --gc 決定。帶 href 時是連結。 */
export function SeriesPill({
  accent = "blue",
  title = "",
  index,
  href,
  chip = false,
}: {
  accent?: string;
  title?: string;
  index?: number;
  href?: string;
  /** true = Board 卡片上的外框 chip 樣式；false = 實底 pill */
  chip?: boolean;
}) {
  const cls = `${chip ? "wb-tagchip" : "wb-pill"} series wb-acc-${accent} tnum`;
  const text = index ? `${title} #${index}` : title;
  return href ? (
    <a className={cls} href={href}>
      {text}
    </a>
  ) : (
    <span className={cls}>{text}</span>
  );
}

export function TagChips({ tags = [], max = 2, style }: { tags?: string[]; max?: number; style?: CSSProperties }) {
  return (
    <span className="wb-row-tags" style={style}>
      {tags.slice(0, max).map((t) => (
        <span key={t} className="wb-tagchip">
          {t}
        </span>
      ))}
      {tags.length > max ? <span className="wb-tagchip more tnum">+{tags.length - max}</span> : null}
    </span>
  );
}

/**
 * 群組標頭。有 onToggle 時是可收合的按鈕（帶 caret）；沒有時是純標頭（caret 位置留白）。
 * `gc` 是 workbench.css 裡的色彩 class（wb-gc-gold、wb-acc-orange、root…）。
 */
export function GroupHeader({
  name = "",
  count,
  stats,
  icon,
  gc = "",
  collapsed = false,
  onToggle,
}: {
  name?: string;
  count?: number;
  stats?: ReactNode;
  icon?: ComponentType<LucideProps>;
  gc?: string;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const body = (
    <>
      {onToggle ? (
        <span className={"wb-sb-caret" + (collapsed ? "" : " open")} style={{ color: "inherit" }}>
          <ChevronRight size={11} strokeWidth={2.4} aria-hidden="true" />
        </span>
      ) : (
        <span className="wb-sp11" />
      )}
      {icon ? <Ic icon={icon} size={13} /> : null}
      <span className="wb-gh-n">{name}</span>
      {count !== undefined ? <span className="wb-gh-c tnum">{count}</span> : null}
      {stats ? <span className="wb-gh-stats tnum">{stats}</span> : null}
    </>
  );
  return onToggle ? (
    <button type="button" className={`wb-gh ${gc}`} onClick={onToggle} aria-expanded={!collapsed}>
      {body}
    </button>
  ) : (
    <div className={`wb-gh static ${gc}`}>{body}</div>
  );
}

export type StatItem = { label: string; value: ReactNode; tone?: "ok" | "warn" | "blue" };
const STAT_COLOR: Record<NonNullable<StatItem["tone"]>, string> = {
  ok: "var(--wb-ok)",
  warn: "var(--wb-warn)",
  blue: "var(--wb-blue-l)",
};

export function StatStrip({ items = [] }: { items?: StatItem[] }) {
  return (
    <div className="wb-sum">
      {items.map((it) => (
        <div key={it.label} className="wb-sum-i">
          <div className="wb-sum-k">{it.label}</div>
          <div className="wb-sum-v tnum" style={it.tone ? { color: STAT_COLOR[it.tone] } : undefined}>
            {it.value}
          </div>
        </div>
      ))}
    </div>
  );
}

/** 列上的進度條（96px）；wide = stat strip 下方那條 220px。顏色吃 --gc。 */
export function Progress({ pct = 0, wide = false, gc = "" }: { pct?: number; wide?: boolean; gc?: string }) {
  const w = Math.max(0, Math.min(100, pct));
  return (
    <span
      className={`wb-prog${wide ? " wide" : ""} ${gc}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(w)}
    >
      <i style={{ width: w + "%" }} />
    </span>
  );
}

export function MiniButton({
  children,
  danger = false,
  onClick,
  href,
  title,
  disabled = false,
}: {
  children?: ReactNode;
  danger?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  href?: string;
  title?: string;
  disabled?: boolean;
}) {
  const cls = "wb-mini" + (danger ? " danger" : "");
  if (href)
    return (
      <a className={cls} href={href} title={title} style={{ display: "inline-flex", alignItems: "center" }}>
        {children}
      </a>
    );
  return (
    <button type="button" className={cls} onClick={onClick} title={title} disabled={disabled}>
      {children}
    </button>
  );
}

export type SegOption<T extends string> = { value: T; label: string };

/** segmented 選擇。boxed = 設定頁那種有外框的版本（.wb-setseg）。 */
export function Seg<T extends string>({
  value,
  options = [],
  onChange,
  boxed = false,
  label,
}: {
  value?: T;
  options?: SegOption<T>[];
  onChange?: (v: T) => void;
  boxed?: boolean;
  label?: string;
}) {
  const items = options.map((o) => (
    <button
      key={o.value}
      type="button"
      className={"wb-seg" + (value === o.value ? " on" : "")}
      aria-pressed={value === o.value}
      onClick={() => onChange?.(o.value)}
    >
      {o.label}
    </button>
  ));
  return boxed ? (
    <span className="wb-setseg" role="group" aria-label={label}>
      {items}
    </span>
  ) : (
    <div className="wb-tb-group" role="group" aria-label={label}>
      {label ? <span className="wb-tb-lbl">{label}</span> : null}
      {items}
    </div>
  );
}

export function Switch({
  checked = false,
  onChange,
  label,
  disabled = false,
}: {
  checked?: boolean;
  onChange?: (next: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={"wb-switch" + (checked ? " on" : "")}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange?.(!checked);
      }}
    >
      <i />
    </button>
  );
}

/** 篩選 chip。count 為 undefined 時不顯示數字。 */
export function Chip({
  on = false,
  onClick,
  children,
  count,
  icon,
}: {
  on?: boolean;
  onClick?: () => void;
  children?: ReactNode;
  count?: number;
  icon?: ComponentType<LucideProps>;
}) {
  return (
    <button type="button" className={"wb-chip" + (on ? " on" : "")} aria-pressed={on} onClick={onClick}>
      {icon ? <Ic icon={icon} size={12} /> : null}
      {children}
      {count !== undefined ? <b className="tnum">{count}</b> : null}
    </button>
  );
}

export function SearchBox({
  value = "",
  onChange,
  placeholder = "搜尋…",
  icon,
}: {
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  icon?: ComponentType<LucideProps>;
}) {
  return (
    <span className="wb-search">
      {icon ? <Ic icon={icon} size={13} color="var(--wb-ink-3)" /> : null}
      <input
        type="search"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </span>
  );
}

/**
 * AI 狀態 pill（README §4）。優先序：無 frontmatter → 待生成 N → 已生成 N → 無標記。
 * 列表、Drawer、Palette、Dashboard 全部共用這一顆，文案只在這裡出現一次。
 */
export function AiPill({ markers = [], hasFrontmatter = true }: { markers?: WbMarker[]; hasFrontmatter?: boolean }) {
  if (!hasFrontmatter) return <Pill tone="muted">無 frontmatter</Pill>;
  const { done, pending } = markerCounts(markers);
  if (pending > 0) return <Pill tone="warn">{`待生成 ${pending}`}</Pill>;
  if (done > 0) return <Pill tone="ok">{`已生成 ${done}`}</Pill>;
  return <Pill tone="muted">無標記</Pill>;
}
