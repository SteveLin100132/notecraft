// 筆記列（規格 §8.2.1）。**列是容器**：裡面並排一顆承接單擊／雙擊／鍵盤的按鈕，與一個真正的連結。
// 連結不可包在按鈕裡（互動元素巢狀，HTML 不合法、輔助科技也會混亂）。
//
//   單擊 → 切換 Drawer          雙擊、Enter → 開啟筆記       ⌘/Ctrl+單擊、中鍵 → 新分頁開啟
//   Space → 切換 Drawer         ↑ ↓ → 在列之間移動焦點       「開啟」圖示 → 真連結，原生行為全有
import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import { ArrowRight, FileText } from "lucide-react";
import type { WbNoteRow } from "@/lib/wb-types";
import { md } from "@/lib/wb-time";
import { AiPill, Ic, TagChips } from "./ui";

export const noteHref = (slug: string): string => `/notes/${slug}`;

/** 供列、卡片、表格列共用的點擊與鍵盤語意。回傳可直接展開到元素上的 handlers。 */
export function rowHandlers(slug: string, onSelect: (slug: string) => void) {
  const href = noteHref(slug);
  return {
    onClick: (e: MouseEvent) => {
      if (e.metaKey || e.ctrlKey) {
        window.open(href, "_blank", "noopener");
        return;
      }
      onSelect(slug);
    },
    onAuxClick: (e: MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault();
        window.open(href, "_blank", "noopener");
      }
    },
    onDoubleClick: () => {
      window.location.href = href;
    },
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if (e.key === "Enter") {
        e.preventDefault(); // 按鈕的 Enter 預設等同 click（開 Drawer）；這裡改成開啟筆記
        if (e.metaKey || e.ctrlKey) window.open(href, "_blank", "noopener");
        else window.location.href = href;
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        // 跨群組連續移動；收合的群組沒有渲染列，自然被跳過
        const scope = e.currentTarget.closest("[data-wb-rows]") ?? document;
        const all = Array.from(scope.querySelectorAll<HTMLElement>("[data-wb-rowfocus]"));
        const i = all.indexOf(e.currentTarget);
        const next = all[i + (e.key === "ArrowDown" ? 1 : -1)];
        if (next) {
          e.preventDefault();
          next.focus();
        }
      }
      // Space：按鈕的原生行為就是 click → 切換 Drawer，不必處理
    },
  };
}

export function OpenLink({ slug, title }: { slug: string; title: string }) {
  return (
    <a
      className="wb-row-open"
      href={noteHref(slug)}
      aria-label={`開啟筆記：${title}`}
      title="開啟筆記"
      draggable={false}
      onClick={(e) => e.stopPropagation()}
    >
      <ArrowRight size={14} strokeWidth={1.7} aria-hidden="true" />
    </a>
  );
}

export default function NoteRow({
  row,
  selected = false,
  onSelect = () => {},
  dense = false,
  lead,
  showTags = true,
  showPath = true,
  showDate = true,
  className = "wb-row",
}: {
  row: WbNoteRow;
  selected?: boolean;
  onSelect?: (slug: string) => void;
  /** Dashboard widget 裡的 34px 列 */
  dense?: boolean;
  /** 取代預設 doc icon 的開頭內容（Timeline 的日期與軸） */
  lead?: ReactNode;
  showTags?: boolean;
  showPath?: boolean;
  showDate?: boolean;
  className?: string;
}) {
  return (
    <div className={className + (dense ? " dense" : "") + (selected ? " sel" : "")}>
      <button
        type="button"
        className="wb-row-main"
        data-wb-rowfocus
        aria-pressed={selected}
        {...rowHandlers(row.slug, onSelect)}
      >
        {lead ?? <Ic icon={FileText} size={13} color="var(--wb-ink-3)" />}
        <span className="wb-row-t">{row.title}</span>
        {showPath ? <span className="wb-row-p">{row.path}</span> : <span className="wb-row-p" />}
        {showTags && !dense ? <TagChips tags={row.tags} /> : null}
        <AiPill markers={row.markers} hasFrontmatter={row.hasFrontmatter} />
        {showDate ? <span className="wb-row-d tnum">{md(row.updatedAt)}</span> : null}
      </button>
      <OpenLink slug={row.slug} title={row.title} />
    </div>
  );
}
