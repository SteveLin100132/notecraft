// Drawer 的外框：scrim、滑入、焦點管理（開啟移到關閉鈕、Tab 循環、關閉還原）、Escape 走共用堆疊。
// NoteDrawer 與 PluginDrawer 共用；內容由 children 提供。
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { pushEscape } from "@/lib/wb-escape";

export default function DrawerShell({
  crumb = "",
  labelledBy,
  ariaLabel,
  className = "",
  closeLabel = "關閉",
  footer,
  onClose = () => {},
  children,
}: {
  /** 頂列文字 */
  crumb?: string;
  labelledBy?: string;
  /** 沒有可指的標題元素時用（更新內容 Drawer） */
  ariaLabel?: string;
  /** 加在 <aside> 上（例：更新內容 Drawer 的寬度 .wb-upd-dw） */
  className?: string;
  closeLabel?: string;
  /** 固定底列：在 .wb-dw-body 之外、不捲動 */
  footer?: ReactNode;
  onClose?: () => void;
  children?: ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const prev = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const pop = pushEscape(onClose);
    return () => {
      pop();
      prev?.focus();
    };
    // 只在掛載／卸載時處理焦點
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onTrapTab = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || !panelRef.current) return;
    const f = Array.from(
      panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'),
    );
    if (f.length === 0) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <>
      <button type="button" className="wb-scrim" onClick={onClose} aria-label="關閉預覽" tabIndex={-1} />
      <aside
        className={"wb-drawer" + (className ? " " + className : "")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : ariaLabel}
        ref={panelRef}
        onKeyDown={onTrapTab}
      >
        <div className="wb-dw-h">
          <span className="wb-crumb" title={crumb}>
            {crumb}
          </span>
          <button type="button" className="wb-dw-x" onClick={onClose} aria-label={closeLabel} ref={closeRef}>
            <X size={14} strokeWidth={1.7} aria-hidden="true" />
          </button>
        </div>
        <div className="wb-dw-body">{children}</div>
        {footer}
      </aside>
    </>
  );
}
