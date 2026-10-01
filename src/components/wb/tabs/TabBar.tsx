// 筆記頁籤 island（client:load；規格 docs/notecraft-workbench-note-tabs.md §3–§8）。
// 掛在 WorkbenchLayout 的 .wb-main 最前面，每一頁都有；頁面以 layout 的 `tab` prop 宣告「我是頁籤」。
//
// MPA 下頁籤是存在 localStorage 的已開啟清單：每次換頁由這個 island 重畫、ensure 目前頁面，
// idle 時以 /wb-index.json 校正快照並清掉已不存在的頁籤。
import { useCallback, useEffect } from "react";
import { closable, ensure, hrefOf, move, neighborAfterClose, close, prune, refreshSnapshot, tabKey, type TabSelf, type TabStore } from "@/lib/wb-tabs";
import type { TabStoreHandle } from "@/lib/wb-tabs-store";
import { loadWbIndex } from "@/components/wb/useWbIndex";
import { markerCounts } from "@/lib/wb-types";
import { toast } from "@/lib/toast";
import { useTabStore } from "./useTabStore";
import TabStrip from "./TabStrip";

export interface TabBarProps {
  /** 目前頁面（筆記頁、資料檔頁）；其他頁為 null */
  self?: TabSelf | null;
  /** 工作區名稱：localStorage key 依它分開（Q5） */
  workspace?: string;
}

/**
 * 關閉一批頁籤；若目前頁面在其中，導覽到鄰居（沒有就回 /notes）。
 * 規格 §6.5。Palette、選單、快捷鍵共用。
 */
export function closeAndNavigate(handle: TabStoreHandle, keys: string[], activeKey: string | null): void {
  const before = handle.get();
  const gone = closable(before, keys);
  if (gone.length === 0) return;
  const leaving = activeKey !== null && gone.includes(activeKey);
  const next = leaving ? neighborAfterClose(before, activeKey, new Set(gone)) : null;
  handle.update((s) => close(s, gone));
  if (leaving) location.assign(next ? hrefOf(next) : "/notes");
}

const idle = (fn: () => void): (() => void) => {
  if (typeof requestIdleCallback === "function") {
    const id = requestIdleCallback(fn, { timeout: 2000 });
    return () => cancelIdleCallback(id);
  }
  const id = window.setTimeout(fn, 300);
  return () => window.clearTimeout(id);
};

export default function TabBar({ self = null, workspace = "" }: TabBarProps) {
  const { store, handle } = useTabStore(workspace);
  const activeKey = self ? tabKey(self.kind, self.id) : null;

  // 1) 目前頁面加入／聚焦
  useEffect(() => {
    handle.setActive(activeKey);
    if (!self) return;
    let evictedTitle: string | null = null;
    handle.update((s) => {
      const r = ensure(s, self, Date.now());
      evictedTitle = r.evicted?.title ?? null;
      return r.store;
    });
    if (evictedTitle) toast(`已達 20 個頁籤上限，關閉最久未用的「${evictedTitle}」`, "x");
    // self 是 SSR 傳入的常數，只在掛載時跑一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          handle.update((s: TabStore) => {
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
            // 快照沒變就回傳原物件，避免無謂的寫入與重畫
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

  const onClose = useCallback((key: string) => closeAndNavigate(handle, [key], activeKey), [handle, activeKey]);
  const onMove = useCallback((from: string, to: string) => handle.update((s) => move(s, from, to)), [handle]);

  return <TabStrip tabs={store ? store.tabs : null} activeKey={activeKey} onClose={onClose} onMove={onMove} />;
}
