// 全部頁籤下拉（規格 §6.3；對照 prototype PtTabAll）。
import { Fragment, useMemo, useRef, useState } from "react";
import { Pin, Search, Undo2, X } from "lucide-react";
import { hrefOf, type TabEntry } from "@/lib/wb-tabs";
import TabPop, { menuArrows } from "./TabPop";
import { TabIcon } from "./TabStrip";

export interface TabAllProps {
  tabs: TabEntry[];
  activeKey: string | null;
  canReopen: boolean;
  x: number;
  y: number;
  returnFocus?: HTMLElement | null;
  onClose: () => void;
  onActivate: (t: TabEntry) => void;
  onCloseTab: (key: string) => void;
  onReopen: () => void;
  onCloseAll: () => void;
}

export default function TabAll({ tabs, activeKey, canReopen, x, y, returnFocus, onClose, onActivate, onCloseTab, onReopen, onCloseAll }: TabAllProps) {
  const [q, setQ] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const ql = q.trim().toLowerCase();
  const list = useMemo(() => tabs.filter((t) => !ql || (t.title + t.path).toLowerCase().includes(ql)), [tabs, ql]);
  const go = (t: TabEntry) => {
    onClose();
    onActivate(t);
  };

  return (
    <TabPop x={x} y={y} alignRight width={340} label="全部頁籤" onClose={onClose} returnFocus={returnFocus}>
      <div className="nt-all-in">
        <Search size={13} strokeWidth={1.7} aria-hidden="true" style={{ color: "var(--wb-ink-3)", flex: "none" }} />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`在 ${tabs.length} 個頁籤中篩選…`}
          aria-label="篩選頁籤"
          autoComplete="off"
          spellCheck={false}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return;
            if (e.key === "Enter" && list[0]) {
              e.preventDefault();
              go(list[0]);
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              listRef.current?.querySelector<HTMLElement>(".nt-all-main")?.focus();
            }
          }}
        />
      </div>
      <div className="nt-all-list" ref={listRef} onKeyDown={(e) => menuArrows(e, ".nt-all-main")}>
        {list.map((t, i) => (
          <Fragment key={t.key}>
            {i === 0 && t.pinned ? <div className="nt-all-sec">已固定</div> : null}
            {(i === 0 && !t.pinned && tabs.some((x2) => x2.pinned)) || (i > 0 && list[i - 1].pinned && !t.pinned) ? <div className="nt-all-sec">頁籤</div> : null}
            {/* 容器內並排連結與關閉鈕：按鈕不包在連結裡（與頁籤同一條 DOM 規則） */}
            <div className={"nt-all-row" + (t.key === activeKey ? " on" : "")}>
              <a
                className="nt-all-main"
                role="menuitem"
                href={hrefOf(t)}
                title={t.path}
                aria-current={t.key === activeKey ? "page" : undefined}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                  e.preventDefault();
                  go(t);
                }}
              >
                <TabIcon t={t} active={false} />
                <span className="nt-all-t">{t.title}</span>
                <span className="nt-all-p">{t.path}</span>
              </a>
              {t.pinned ? (
                <span className="nt-pin" aria-label="已固定">
                  <Pin size={12} strokeWidth={1.7} />
                </span>
              ) : (
                <button
                  type="button"
                  className="nt-x show"
                  tabIndex={-1}
                  aria-label={`關閉 ${t.title}`}
                  onClick={() => onCloseTab(t.key)}
                >
                  <X size={12} strokeWidth={2} />
                </button>
              )}
            </div>
          </Fragment>
        ))}
        {list.length === 0 ? <div className="wb-pal-empty">沒有相符的頁籤</div> : null}
      </div>
      <div className="nt-all-f">
        <button
          type="button"
          className="wb-mini"
          disabled={!canReopen}
          onClick={() => {
            onClose();
            onReopen();
          }}
        >
          <Undo2 size={12} strokeWidth={1.8} aria-hidden="true" />
          重開剛關閉的 <span className="nt-kbd">⌥⇧T</span>
        </button>
        <button
          type="button"
          className="wb-mini danger"
          disabled={!tabs.some((t) => !t.pinned)}
          onClick={() => {
            onClose();
            onCloseAll();
          }}
        >
          全部關閉
        </button>
      </div>
    </TabPop>
  );
}
