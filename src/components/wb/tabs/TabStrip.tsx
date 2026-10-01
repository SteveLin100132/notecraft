// 桌面頁籤列（規格 docs/notecraft-workbench-note-tabs.md §6.1、§6.2、§12.1；對照 prototype PtTabStrip）。
//
// DOM（Q2）：容器 .nt-tab（無 role）內並排 <a class="nt-tab-main" role="tab" href> 與 <button class="nt-x">。
// 連結不包在按鈕裡、按鈕不包在 tab 裡；<a> 保住 ⌘／Ctrl＋點擊開新分頁、複製連結這些原生行為。
import { Fragment, useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent, type MouseEvent } from "react";
import { ChevronDown, FileText, Pin, X } from "lucide-react";
import { hrefOf, tabTooltip, type TabEntry } from "@/lib/wb-tabs";

export interface TabStripProps {
  /** null = SSR／hydrate 第一輪，只畫空列 */
  tabs: TabEntry[] | null;
  activeKey: string | null;
  allOpen?: boolean;
  onClose: (key: string) => void;
  onMove: (from: string, to: string) => void;
  onMenu?: (key: string, x: number, y: number, fromKeyboard: boolean) => void;
  onAll?: (anchor: DOMRect) => void;
}

const modified = (e: MouseEvent) => e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;

export function TabIcon({ t, active, size = 13 }: { t: Pick<TabEntry, "kind">; active: boolean; size?: number }) {
  const color = t.kind === "view" ? "var(--wb-gold)" : active ? "var(--wb-blue-l)" : "var(--wb-ink-3)";
  return (
    <span className="nt-ic" aria-hidden="true">
      <FileText size={size} strokeWidth={1.7} style={{ color }} />
    </span>
  );
}

export default function TabStrip({ tabs, activeKey, allOpen = false, onClose, onMove, onMenu, onAll }: TabStripProps) {
  const sc = useRef<HTMLDivElement>(null);
  const [fade, setFade] = useState<[boolean, boolean]>([false, false]);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [dg, setDg] = useState<{ from: string | null; over: string | null }>({ from: null, over: null });
  const [fine, setFine] = useState(false);
  const list = tabs ?? [];

  useEffect(() => {
    // 拖曳只給有精確指標的裝置（與 Board 規則一致）；放 effect 裡，SSR 一律 false
    setFine(typeof matchMedia === "function" && matchMedia("(pointer:fine)").matches);
  }, []);

  const updFade = () => {
    const el = sc.current;
    if (!el) return;
    const next: [boolean, boolean] = [el.scrollLeft > 2, el.scrollLeft + el.clientWidth < el.scrollWidth - 2];
    setFade((f) => (f[0] === next[0] && f[1] === next[1] ? f : next));
  };

  // active 捲進可視區（左右留 24px）。不用 scrollIntoView：它會連帶捲動 .wb-main 的祖先
  useEffect(() => {
    const el = sc.current;
    if (!el) return;
    const a = el.querySelector<HTMLElement>(".nt-tab.on");
    if (a) {
      const l = a.offsetLeft;
      const r = l + a.offsetWidth;
      if (l < el.scrollLeft + 24) el.scrollLeft = l - 24;
      else if (r > el.scrollLeft + el.clientWidth - 24) el.scrollLeft = r - el.clientWidth + 24;
    }
    updFade();
  }, [activeKey, list.length]);

  // 溢出遮罩跟著尺寸走；滾輪 deltaY 轉水平（只在真的溢出時攔，React 的 onWheel 是 passive 不能 preventDefault）
  const hasTabs = list.length > 0;
  useEffect(() => {
    const el = sc.current;
    if (!el) return;
    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(updFade) : null;
    ro?.observe(el);
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      ro?.disconnect();
      el.removeEventListener("wheel", onWheel);
    };
  }, [hasTabs]);

  const fk = useMemo(() => {
    if (focusKey && list.some((t) => t.key === focusKey)) return focusKey;
    if (activeKey && list.some((t) => t.key === activeKey)) return activeKey;
    return list[0]?.key ?? null;
  }, [focusKey, activeKey, list]);

  const focusTab = (key: string) => {
    setFocusKey(key);
    sc.current?.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"] .nt-tab-main`)?.focus();
  };

  const onKey = (e: KeyboardEvent<HTMLAnchorElement>, t: TabEntry, i: number) => {
    const n = list.length;
    let next: number | null = null;
    if (e.key === "ArrowRight") next = (i + 1) % n;
    else if (e.key === "ArrowLeft") next = (i - 1 + n) % n;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    else if (e.key === " ") {
      e.preventDefault();
      e.currentTarget.click();
      return;
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      if (t.pinned) return;
      const after = list[i + 1] ?? list[i - 1];
      onClose(t.key);
      if (after && t.key !== activeKey) requestAnimationFrame(() => focusTab(after.key));
      return;
    } else if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
      e.preventDefault();
      const r = e.currentTarget.getBoundingClientRect();
      onMenu?.(t.key, r.left, r.bottom + 2, true);
      return;
    }
    if (next === null) return;
    e.preventDefault();
    focusTab(list[next].key);
  };

  const drag = {
    start: (e: DragEvent, k: string) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", k);
      setDg({ from: k, over: null });
    },
    over: (e: DragEvent, k: string) => {
      if (!dg.from) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (dg.over !== k) setDg({ ...dg, over: k });
    },
    drop: (e: DragEvent, k: string) => {
      e.preventDefault();
      if (dg.from && dg.from !== k) onMove(dg.from, k);
      setDg({ from: null, over: null });
    },
    end: () => setDg({ from: null, over: null }),
  };

  return (
    <div className="nt-bar" data-pagefind-ignore>
      {tabs === null ? null : hasTabs ? (
        <div className={"nt-scrollwrap" + (fade[0] ? " fl" : "") + (fade[1] ? " fr" : "")}>
          <div className="nt-scroll" ref={sc} role="tablist" aria-label="已開啟的頁籤" onScroll={updFade}>
            {list.map((t, i) => {
              const on = t.key === activeKey;
              return (
                <Fragment key={t.key}>
                  {i > 0 && list[i - 1].pinned && !t.pinned ? <span className="nt-sep" aria-hidden="true" /> : null}
                  <div
                    data-key={t.key}
                    className={
                      "nt-tab" +
                      (on ? " on" : "") +
                      (t.pinned ? " pinned" : "") +
                      (dg.over === t.key && dg.from !== t.key ? " over" : "") +
                      (dg.from === t.key ? " dragging" : "")
                    }
                    draggable={fine}
                    onDragStart={(e) => drag.start(e, t.key)}
                    onDragOver={(e) => drag.over(e, t.key)}
                    onDrop={(e) => drag.drop(e, t.key)}
                    onDragEnd={drag.end}
                    onMouseDown={(e) => {
                      // 中鍵：擋掉自動捲動游標與瀏覽器的「連結開新分頁」
                      if (e.button === 1) e.preventDefault();
                    }}
                    onAuxClick={(e) => {
                      if (e.button !== 1) return;
                      e.preventDefault();
                      if (!t.pinned) onClose(t.key);
                    }}
                    onContextMenu={(e) => {
                      if (!onMenu) return;
                      e.preventDefault();
                      onMenu(t.key, e.clientX, e.clientY, false);
                    }}
                  >
                    <a
                      className="nt-tab-main"
                      role="tab"
                      href={hrefOf(t)}
                      draggable={false}
                      aria-selected={on}
                      aria-label={t.pinned ? `${t.title}（已固定）` : undefined}
                      tabIndex={fk === t.key ? 0 : -1}
                      title={tabTooltip(t)}
                      onFocus={() => setFocusKey(t.key)}
                      onClick={(e) => {
                        if (on && !modified(e)) e.preventDefault();
                      }}
                      onKeyDown={(e) => onKey(e, t, i)}
                    >
                      <TabIcon t={t} active={on} />
                      <span className="nt-t">{t.title}</span>
                    </a>
                    {t.pinned ? (
                      <span className="nt-pin" aria-hidden="true">
                        <Pin size={12} strokeWidth={1.7} />
                      </span>
                    ) : (
                      <button type="button" className="nt-x" tabIndex={-1} aria-label={`關閉 ${t.title}`} onClick={() => onClose(t.key)}>
                        <X size={12} strokeWidth={2} />
                      </button>
                    )}
                  </div>
                </Fragment>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="nt-empty">
          <FileText size={13} strokeWidth={1.7} aria-hidden="true" />
          <span className="nt-empty-t">尚未開啟任何筆記。在列表雙擊一列，或按列上的「開啟」，筆記會在這裡留下頁籤。</span>
        </div>
      )}
      {hasTabs ? (
        <button
          type="button"
          className={"nt-all" + (allOpen ? " on" : "")}
          aria-haspopup="menu"
          aria-expanded={allOpen}
          aria-label={`全部頁籤（${list.length} 個）`}
          title="全部頁籤"
          onClick={(e) => onAll?.(e.currentTarget.getBoundingClientRect())}
        >
          <span className="tnum">{list.length}</span>
          <ChevronDown size={12} strokeWidth={2} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
