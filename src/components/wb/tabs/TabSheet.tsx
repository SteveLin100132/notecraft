// 手機（≤860）的頁籤底部抽屜（規格 §9；對照 prototype PtTabSheet）。
// 蓋過底部 Tab bar（650），所以用 overlay 層；Escape 走 wb-escape；開啟時 Body 不捲。
import { useEffect, useRef } from "react";
import { Pin, Undo2, X } from "lucide-react";
import { hrefOf, type TabEntry } from "@/lib/wb-tabs";
import { pushEscape } from "@/lib/wb-escape";
import { TabIcon } from "./TabStrip";

export interface TabSheetProps {
  tabs: TabEntry[];
  activeKey: string | null;
  canReopen: boolean;
  returnFocus?: HTMLElement | null;
  onClose: () => void;
  onActivate: (t: TabEntry) => void;
  onCloseTab: (key: string) => void;
  onReopen: () => void;
  onCloseAll: () => void;
}

export default function TabSheet({ tabs, activeKey, canReopen, returnFocus, onClose, onActivate, onCloseTab, onReopen, onCloseAll }: TabSheetProps) {
  const xRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const pop = pushEscape(onClose);
    document.body.classList.add("nt-sheet-open");
    xRef.current?.focus();
    return () => {
      pop();
      document.body.classList.remove("nt-sheet-open");
      if (returnFocus && document.contains(returnFocus)) returnFocus.focus();
    };
  }, [onClose, returnFocus]);

  return (
    <div className="nt-sheet-wrap">
      <button type="button" className="nt-sheet-scrim" onClick={onClose} aria-label="關閉頁籤清單" tabIndex={-1} />
      <div className="nt-sheet" role="dialog" aria-modal="true" aria-label="已開啟的頁籤">
        <div className="nt-sheet-grip" aria-hidden="true" />
        <div className="nt-sheet-h">
          <b>已開啟的頁籤</b>
          <span className="wb-count tnum">{tabs.length} 個</span>
          <button ref={xRef} type="button" className="wb-dw-x" style={{ marginLeft: "auto" }} onClick={onClose} aria-label="關閉">
            <X size={15} strokeWidth={1.8} />
          </button>
        </div>
        <div className="nt-sheet-list">
          {tabs.length === 0 ? (
            <div className="wb-empty nt-sheet-empty">尚未開啟任何筆記。在列表點一列，或按列上的「開啟」，筆記會在這裡留下頁籤。</div>
          ) : null}
          {tabs.map((t) => {
            const on = t.key === activeKey;
            return (
              // 容器內並排連結與關閉鈕（與頁籤同一條 DOM 規則）
              <div key={t.key} className={"nt-sheet-row" + (on ? " on" : "")}>
                <a
                  className="nt-sheet-main"
                  href={hrefOf(t)}
                  aria-current={on ? "page" : undefined}
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                    e.preventDefault();
                    onClose();
                    onActivate(t);
                  }}
                >
                  <TabIcon t={t} active={on} size={15} />
                  <span className="nt-sheet-m">
                    <span className="nt-sheet-t">{t.title}</span>
                    <span className="nt-sheet-p">{t.path}</span>
                  </span>
                </a>
                {t.pinned ? (
                  <span className="nt-sheet-pin" aria-label="已固定">
                    <Pin size={14} strokeWidth={1.7} />
                  </span>
                ) : (
                  <button type="button" className="nt-sheet-x" aria-label={`關閉 ${t.title}`} onClick={() => onCloseTab(t.key)}>
                    <X size={15} strokeWidth={2} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <div className="nt-sheet-f">
          <button
            type="button"
            className="wb-btn-ghost"
            disabled={!canReopen}
            onClick={() => {
              onClose();
              onReopen();
            }}
          >
            <Undo2 size={14} strokeWidth={1.8} aria-hidden="true" /> 重開剛關閉的
          </button>
          <button type="button" className="wb-btn-ghost" disabled={!tabs.some((t) => !t.pinned)} onClick={onCloseAll}>
            全部關閉
          </button>
        </div>
      </div>
    </div>
  );
}
