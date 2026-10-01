// 筆記頁籤 island（client:load；規格 docs/notecraft-workbench-note-tabs.md §3–§8）。
// 掛在 WorkbenchLayout 的 .wb-main 最前面，每一頁都有；頁面以 layout 的 `tab` prop 宣告「我是頁籤」。
//
// MPA 下頁籤是存在 localStorage 的已開啟清單：每次換頁由這個 island 重畫、ensure 目前頁面，
// idle 時以 /wb-index.json 校正快照並清掉已不存在的頁籤；也負責 ⌥ 快捷鍵與 #nc-scroll 的捲動記錄／還原。
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  close,
  closable,
  closeAll,
  closeOthers,
  closeRight,
  cycle,
  ensure,
  hrefOf,
  move,
  neighborAfterClose,
  popClosed,
  prune,
  refreshSnapshot,
  setScroll,
  tabKey,
  togglePin,
  type TabEntry,
  type TabSelf,
  type TabStore,
} from "@/lib/wb-tabs";
import { withBase } from "@/lib/base";
import type { TabStoreHandle } from "@/lib/wb-tabs-store";
import { loadWbIndex } from "@/components/wb/useWbIndex";
import { markerCounts } from "@/lib/wb-types";
import { toast } from "@/lib/toast";
import { useTabStore } from "./useTabStore";
import TabStrip from "./TabStrip";
import TabMenu from "./TabMenu";
import TabAll from "./TabAll";
import TabSheet from "./TabSheet";

export interface TabBarProps {
  /** 目前頁面（筆記頁、資料檔頁）；其他頁為 null */
  self?: TabSelf | null;
  /** 工作區名稱：localStorage key 依它分開（Q5） */
  workspace?: string;
}

/**
 * 以 op 關閉一批頁籤；若目前頁面在其中，導覽到 prefer（若仍開著）、否則鄰居、都沒有就回 /notes。
 * 規格 §6.5。固定頁籤永遠不會被關（由 wb-tabs 的 close 保證）。
 */
export function closeAndNavigate(
  handle: TabStoreHandle,
  op: (s: TabStore) => TabStore,
  activeKey: string | null,
  prefer?: string,
): void {
  const before = handle.get();
  const after = op(before);
  if (after === before) return;
  const still = new Set(after.tabs.map((t) => t.key));
  const gone = before.tabs.filter((t) => !still.has(t.key)).map((t) => t.key);
  const leaving = activeKey !== null && gone.includes(activeKey);
  let dest: TabEntry | null = null;
  if (leaving) {
    dest = (prefer && after.tabs.find((t) => t.key === prefer)) || neighborAfterClose(before, activeKey, new Set(gone));
  }
  handle.update(op);
  if (leaving) location.assign(dest ? hrefOf(dest) : withBase("/notes"));
}

/** 關閉單一頁籤（固定的無作用） */
export function closeOne(handle: TabStoreHandle, key: string, activeKey: string | null): void {
  if (closable(handle.get(), [key]).length === 0) return;
  closeAndNavigate(handle, (s) => close(s, [key]), activeKey);
}

const idle = (fn: () => void): (() => void) => {
  if (typeof requestIdleCallback === "function") {
    const id = requestIdleCallback(fn, { timeout: 2000 });
    return () => cancelIdleCallback(id);
  }
  const id = window.setTimeout(fn, 300);
  return () => window.clearTimeout(id);
};

const typing = (el: EventTarget | null): boolean => {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
};

const SCROLL_KEYS = new Set(["PageUp", "PageDown", " ", "ArrowUp", "ArrowDown", "Home", "End"]);

type Pop = { kind: "menu"; key: string; x: number; y: number; focus: HTMLElement | null } | { kind: "all"; x: number; y: number; focus: HTMLElement | null };

export default function TabBar({ self = null, workspace = "" }: TabBarProps) {
  const { store, handle } = useTabStore(workspace);
  const activeKey = self ? tabKey(self.kind, self.id) : null;
  const [pop, setPop] = useState<Pop | null>(null);
  const closePop = useCallback(() => setPop(null), []);
  // 手機計數鈕：portal 進 layout 預留的 #nt-count-slot（在 Header 區，規格 §3.2）。effect 後才取，SSR 不渲染
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [sheet, setSheet] = useState<HTMLElement | null>(null);
  const closeSheet = useCallback(() => setSheet(null), []);
  useEffect(() => setSlot(document.getElementById("nt-count-slot")), []);

  // 目前頁面加入／聚焦（bfcache 還原時再跑一次，更新 at）
  const ensureSelf = useCallback(() => {
    handle.setActive(activeKey);
    if (!self) return;
    let evictedTitle: string | null = null;
    handle.update((s) => {
      const r = ensure(s, self, Date.now());
      evictedTitle = r.evicted?.title ?? null;
      return r.store;
    });
    if (evictedTitle) toast(`已達 20 個頁籤上限，關閉最久未用的「${evictedTitle}」`, "x");
    // self 是 SSR 傳入的常數
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle, activeKey]);

  // 1) 目前頁面加入／聚焦
  useEffect(() => {
    ensureSelf();
  }, [ensureSelf]);

  // 2) idle 校正（規格 §4.3）：覆寫快照、清掉已不存在的頁籤。索引載入失敗就只用快照，不清
  useEffect(() => {
    return idle(() => {
      loadWbIndex()
        .then((index) => {
          const notes = new Map(index.notes.map((n) => [n.slug, n]));
          const files = new Map(index.dataFiles.map((f) => [f.routePath, f]));
          const exists = (key: string) => {
            const i = key.indexOf(":");
            const kind = key.slice(0, i);
            const id = key.slice(i + 1);
            return kind === "note" ? notes.has(id) : kind === "view" ? files.has(id) : false;
          };
          let removed = 0;
          handle.update((s) => {
            const fresh = refreshSnapshot(s, (t) => {
              if (t.kind === "note") {
                const n = notes.get(t.id);
                return n ? { title: n.title, path: n.path, pending: markerCounts(n.markers).pending } : null;
              }
              const f = files.get(t.id);
              return f ? { title: f.title, path: f.relPath, pending: 0 } : null;
            });
            const r = prune(fresh, exists);
            removed = r.removed.length;
            // 內容沒變就回傳原物件，避免無謂的寫入與重畫
            return JSON.stringify(r.store) === JSON.stringify(s) ? s : r.store;
          });
          if (removed === 1) toast("筆記已不存在，對應頁籤已關閉", "x");
          else if (removed > 1) toast(`${removed} 篇筆記已不存在，對應頁籤已關閉`, "x");
        })
        .catch(() => {
          /* 離線或 404：保留快照 */
        });
    });
  }, [handle]);

  // 3) 捲動記錄與還原（規格 §7）
  useEffect(() => {
    if (!activeKey) return;
    const el = document.getElementById("nc-scroll");
    if (!el) return;
    const key = activeKey;
    const target = handle.get().tabs.find((t) => t.key === key)?.scroll ?? 0;
    // 還原期間不記錄：內容還沒撐開時 scrollTop 會被夾住，記下來會蓋掉真正的位置
    let restoring = !location.hash && target > 0;
    let timer = 0;

    const save = () => handle.update((s) => setScroll(s, key, el.scrollTop));
    const onScroll = () => {
      if (restoring) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(save, 220);
    };
    const onPageHide = () => {
      if (restoring) return;
      window.clearTimeout(timer);
      save();
    };
    const stop = () => {
      restoring = false;
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("keydown", onKeyStop);
      window.removeEventListener("load", onLoad);
    };
    const onKeyStop = (e: KeyboardEvent) => {
      if (SCROLL_KEYS.has(e.key)) stop();
    };
    const apply = () => {
      if (restoring) el.scrollTop = target;
    };
    const onLoad = () => {
      apply();
      stop();
    };

    if (restoring) {
      apply();
      requestAnimationFrame(apply);
      window.addEventListener("wheel", stop, { passive: true });
      window.addEventListener("touchstart", stop, { passive: true });
      window.addEventListener("keydown", onKeyStop);
      if (document.readyState === "complete") requestAnimationFrame(() => requestAnimationFrame(onLoad));
      else window.addEventListener("load", onLoad);
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", onPageHide);
    return () => {
      stop();
      window.clearTimeout(timer);
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [handle, activeKey]);

  // 4) bfcache：瀏覽器保留了捲動與 DOM，但頁籤清單可能已被其他頁改過
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      handle.refresh();
      ensureSelf();
      setPop(null);
      setSheet(null);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, [handle, ensureSelf]);

  const activate = useCallback(
    (t: Pick<TabEntry, "kind" | "id" | "key">) => {
      if (t.key !== activeKey) location.assign(hrefOf(t));
    },
    [activeKey],
  );

  const reopen = useCallback(() => {
    let entry: TabEntry | null = null;
    handle.update((s) => {
      const r = popClosed(s, () => true, Date.now());
      entry = r.entry;
      return r.store;
    });
    const e = entry as TabEntry | null;
    if (e) activate(e);
  }, [handle, activate]);

  // 5) 全域快捷鍵（規格 §12.2）：只用 ⌥、比對 event.code，焦點在輸入元件內不攔
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.metaKey || e.ctrlKey || e.defaultPrevented || typing(e.target)) return;
      if (e.code === "Period" || e.code === "Comma") {
        if (e.shiftKey) return;
        const t = cycle(handle.get(), activeKey, e.code === "Period" ? 1 : -1);
        e.preventDefault();
        if (t) activate(t);
      } else if (e.code === "KeyW" && !e.shiftKey) {
        e.preventDefault();
        if (activeKey) closeOne(handle, activeKey, activeKey);
      } else if (e.code === "KeyT" && e.shiftKey) {
        e.preventDefault();
        reopen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handle, activeKey, activate, reopen]);

  const onClose = useCallback((key: string) => closeOne(handle, key, activeKey), [handle, activeKey]);
  const onMove = useCallback((from: string, to: string) => handle.update((s) => move(s, from, to)), [handle]);
  const onMenu = useCallback((key: string, x: number, y: number, fromKeyboard: boolean) => {
    const focus = fromKeyboard ? (document.activeElement as HTMLElement | null) : null;
    setPop({ kind: "menu", key, x, y, focus });
  }, []);
  const onAll = useCallback((r: DOMRect) => {
    setPop((p) => (p?.kind === "all" ? null : { kind: "all", x: r.right, y: r.bottom + 4, focus: document.activeElement as HTMLElement | null }));
  }, []);

  const tabs = store ? store.tabs : null;
  const menuTab = pop?.kind === "menu" ? tabs?.find((t) => t.key === pop.key) : undefined;

  return (
    <>
      <TabStrip tabs={tabs} activeKey={activeKey} allOpen={pop?.kind === "all"} onClose={onClose} onMove={onMove} onMenu={onMenu} onAll={onAll} />
      {pop?.kind === "menu" && menuTab && tabs ? (
        <TabMenu
          tab={menuTab}
          tabs={tabs}
          x={pop.x}
          y={pop.y}
          returnFocus={pop.focus}
          onClose={closePop}
          act={{
            close: onClose,
            closeOthers: (k) => closeAndNavigate(handle, (s) => closeOthers(s, k), activeKey, k),
            closeRight: (k) => closeAndNavigate(handle, (s) => closeRight(s, k), activeKey, k),
            closeAll: () => closeAndNavigate(handle, closeAll, activeKey),
            pin: (k) => handle.update((s) => togglePin(s, k)),
            copy: (t) => {
              const url = location.origin + hrefOf(t);
              navigator.clipboard
                .writeText(url)
                .then(() => toast("已複製連結", "check"))
                .catch(() => toast("無法複製連結", "x"));
            },
            newWindow: (t) => {
              window.open(hrefOf(t), "_blank", "noopener");
            },
          }}
        />
      ) : null}
      {pop?.kind === "all" && tabs ? (
        <TabAll
          tabs={tabs}
          activeKey={activeKey}
          canReopen={(store?.closed.length ?? 0) > 0}
          x={pop.x}
          y={pop.y}
          returnFocus={pop.focus}
          onClose={closePop}
          onActivate={activate}
          onCloseTab={onClose}
          onReopen={reopen}
          onCloseAll={() => closeAndNavigate(handle, closeAll, activeKey)}
        />
      ) : null}
      {slot && tabs
        ? createPortal(
            <button
              type="button"
              className={"nt-count" + (activeKey && tabs.some((t) => t.key === activeKey) ? " on" : "")}
              aria-label={`已開啟 ${tabs.length} 個頁籤`}
              aria-haspopup="dialog"
              aria-expanded={!!sheet}
              onClick={(e) => setSheet(e.currentTarget)}
            >
              <span className="tnum">{tabs.length}</span>
            </button>,
            slot,
          )
        : null}
      {sheet && tabs ? (
        <TabSheet
          tabs={tabs}
          activeKey={activeKey}
          canReopen={(store?.closed.length ?? 0) > 0}
          returnFocus={sheet}
          onClose={closeSheet}
          onActivate={activate}
          onCloseTab={onClose}
          onReopen={reopen}
          onCloseAll={() => closeAndNavigate(handle, closeAll, activeKey)}
        />
      ) : null}
    </>
  );
}
