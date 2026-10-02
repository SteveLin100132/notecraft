import { Logo } from "./Logo";

export type NavLink = {
  label: string;
  href: string;
  /** 760px 以下隱藏（只留 Demo 與 GitHub 這類主要連結）。 */
  hideOnSmall?: boolean;
};

export type TopNavProps = {
  /** 品牌連結的目的地。 */
  homeHref?: string;
  links?: NavLink[];
};

const DEFAULT_LINKS: NavLink[] = [
  { label: "圖式", href: "#figures", hideOnSmall: true },
  { label: "實施方式", href: "#embodiment", hideOnSmall: true },
  { label: "請求項", href: "#claims", hideOnSmall: true },
  { label: "版本", href: "#releases", hideOnSmall: true },
  { label: "Demo", href: "#demo" },
  { label: "GitHub", href: "#github" },
];

/** 首頁圖頁頂端的導覽：左側標誌、右側錨點連結。只放在 sheet 首頁上。 */
export function TopNav({ homeHref = "/", links = DEFAULT_LINKS }: TopNavProps) {
  return (
    <nav className="topnav" aria-label="主要導覽">
      <a href={homeHref} aria-label="NoteCraftApp 首頁" style={{ color: "inherit", textDecoration: "none" }}>
        <Logo />
      </a>
      <ul className="topnav-links">
        {links.map((l) => (
          <li key={l.href} className={l.hideOnSmall ? "hide-sm" : undefined}>
            <a href={l.href}>{l.label}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
