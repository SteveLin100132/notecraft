// 筆記頁首的「⋯」選單（規格 §8.3）。**僅 dev**：三個項目全是 dev-only，正式環境整顆不渲染（頁面端判斷）。
// 刪除筆記沿用 DeleteNoteButton 的對話框與「先導頁、不 await」的寫法 —— 那是為了避開 Astro dev 的 HMR 競態，不要整理。
import { useEffect, useRef, useState } from "react";
import { Check, Clipboard, Code2, MoreHorizontal, Trash2 } from "lucide-react";
import { useDeleteNote } from "@/components/islands/DeleteNoteButton";
import { buildRegeneratePrompt, copyToClipboard, toast } from "@/lib/prompts";
import { pushEscape } from "@/lib/wb-escape";

export default function MoreMenu({
  slug = "",
  title = "",
  path = "",
  promptPath = "",
  vscodeHref = "",
  pendingIds = [],
  componentIds = [],
}: {
  slug?: string;
  title?: string;
  path?: string;
  promptPath?: string;
  vscodeHref?: string;
  pendingIds?: string[];
  componentIds?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const del = useDeleteNote({ slug, title, componentIds, path });

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) btnRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const pop = pushEscape(() => close());
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) close(false);
    };
    document.addEventListener("mousedown", onDown);
    requestAnimationFrame(() => menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus());
    return () => {
      pop();
      document.removeEventListener("mousedown", onDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const i = items.indexOf(document.activeElement as HTMLElement);
    const next =
      e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : (i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
    items[next]?.focus();
  };

  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      <button
        ref={btnRef}
        type="button"
        className="wb-iconbtn"
        aria-label="更多動作"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <MoreHorizontal size={15} strokeWidth={1.7} aria-hidden="true" />
      </button>
      {open ? (
        <div className="wb-menu" role="menu" aria-label="更多動作" ref={menuRef} onKeyDown={onKey}>
          {vscodeHref ? (
            <a className="wb-menu-item" role="menuitem" href={vscodeHref} onClick={() => close(false)}>
              <Code2 size={14} strokeWidth={1.7} aria-hidden="true" /> 以 VS Code 編輯
            </a>
          ) : null}
          {pendingIds.length > 0 && promptPath ? (
            <button
              type="button"
              className="wb-menu-item"
              role="menuitem"
              onClick={async () => {
                if (await copyToClipboard(buildRegeneratePrompt({ promptPath, pendingIds }))) {
                  setCopied(true);
                  toast("已複製，貼到 Claude Code 即可");
                  setTimeout(() => {
                    setCopied(false);
                    close();
                  }, 900);
                }
              }}
            >
              {copied ? <Check size={14} aria-hidden="true" /> : <Clipboard size={14} strokeWidth={1.7} aria-hidden="true" />}
              {copied ? "已複製" : "重新生成提示"}
            </button>
          ) : null}
          <div className="wb-menu-sep" role="separator" />
          <button
            type="button"
            className="wb-menu-item danger"
            role="menuitem"
            onClick={() => {
              close(false);
              del.open();
            }}
          >
            <Trash2 size={14} strokeWidth={1.7} aria-hidden="true" /> 刪除筆記
          </button>
        </div>
      ) : null}
      {del.dialog}
    </div>
  );
}
