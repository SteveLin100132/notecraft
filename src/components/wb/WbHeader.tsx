// 壓縮頁首的 React 版。給「Header Tab、Toolbar、Body、Drawer 是同一份 state」的頁面用
//（/notes、Dashboard、/plugins…）。DOM 結構與 Header.astro 一致，視覺由 workbench.css 保證。
import type { ReactNode } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import type { PillTone } from "./ui";

export type WbCrumb = { label: string; href?: string };
export type WbHeaderPill = { label: string; tone?: PillTone; href?: string; className?: string };
export type WbTab<T extends string> = { key: T; label: string };

export function openNewNote(): void {
  window.dispatchEvent(new CustomEvent("nc-open-new-note"));
}

export default function WbHeader<T extends string>({
  title = "",
  crumbs = [],
  pills = [],
  back,
  tabs = [],
  activeTab,
  onTab,
  actions,
  isDev = false,
}: {
  title?: string;
  crumbs?: WbCrumb[];
  pills?: WbHeaderPill[];
  back?: string;
  tabs?: WbTab<T>[];
  activeTab?: T;
  onTab?: (key: T) => void;
  actions?: ReactNode;
  isDev?: boolean;
}) {
  return (
    <header className="wb-hd">
      <div className="wb-hd-top">
        <div style={{ minWidth: 0 }}>
          <nav className="wb-crumb" aria-label="麵包屑">
            {crumbs.map((c, i) => (
              <span key={i}>
                {i > 0 ? <span aria-hidden="true">{"  /  "}</span> : null}
                {c.href ? <a href={c.href}>{c.label}</a> : <span>{c.label}</span>}
              </span>
            ))}
          </nav>
          <div className="wb-hd-title-row">
            {back ? (
              <a className="wb-dw-x" href={back} title="返回" aria-label="返回">
                <ArrowLeft size={15} strokeWidth={1.7} aria-hidden="true" />
              </a>
            ) : null}
            <h1 className="wb-hd-title" title={title}>
              {title}
            </h1>
            {pills.map((p, i) => {
              const cls = ["wb-pill", "tnum", p.tone && p.tone !== "default" ? p.tone : "", p.className ?? ""]
                .filter(Boolean)
                .join(" ");
              return p.href ? (
                <a key={i} className={cls} href={p.href}>
                  {p.label}
                </a>
              ) : (
                <span key={i} className={cls}>
                  {p.label}
                </span>
              );
            })}
          </div>
        </div>
        <div className="wb-hd-actions">
          {actions}
          {isDev ? (
            <button type="button" className="wb-btn-gold" onClick={openNewNote}>
              <Plus size={14} strokeWidth={2.2} aria-hidden="true" /> 新增筆記
            </button>
          ) : null}
        </div>
      </div>
      {tabs.length > 1 ? (
        <div className="wb-tabs" role="tablist" aria-label="檢視">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={t.key === activeTab}
              className={"wb-tab" + (t.key === activeTab ? " on" : "")}
              onClick={() => onTab?.(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      ) : null}
    </header>
  );
}
