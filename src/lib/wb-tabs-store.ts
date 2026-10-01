// 筆記頁籤的 localStorage 讀寫（client only；規格 docs/notecraft-workbench-note-tabs.md §4.4）。
// 清單運算全在 wb-tabs.ts，這裡只負責「讀最新 → 算 → 寫回 → 通知」。
//
// - 每次 update 都重讀 localStorage，不拿 React state 當來源：多個瀏覽器分頁同時開時，
//   才不會用舊的整份清單覆蓋掉對方剛寫的變更
// - 監聽 storage 事件，其他分頁寫入後重畫
// - localStorage 不可用（隱私模式、配額滿）時退回記憶體內的 store，不 throw
// - ES module 在同一頁是單例：TabBar、Palette、刪除筆記拿到的是同一個實例（與 wb-escape.ts 同一招）
import { emptyStore, parseStore, tabStorageKey, type TabStore } from "./wb-tabs";

export interface TabStoreHandle {
  get(): TabStore;
  update(fn: (s: TabStore) => TabStore): TabStore;
  subscribe(cb: () => void): () => void;
  /** 強制重讀 localStorage 並通知（bfcache 還原時用：期間其他頁的寫入收不到 storage 事件） */
  refresh(): void;
  /** 目前頁面的頁籤 key（非頁籤頁為 null）；給 Palette 標「目前」 */
  setActive(key: string | null): void;
  getActive(): string | null;
}

const handles = new Map<string, TabStoreHandle>();

function createTabStore(workspace: string): TabStoreHandle {
  const key = tabStorageKey(workspace);
  const subs = new Set<() => void>();
  let memory: TabStore = emptyStore();
  let raw: string | null | undefined; // 上次讀到的原字串；相同就沿用同一個物件（useSyncExternalStore 需要穩定參照）
  let active: string | null = null;

  const read = (): TabStore => {
    let next: string | null;
    try {
      next = localStorage.getItem(key);
    } catch {
      return memory;
    }
    if (next !== raw) {
      raw = next;
      memory = parseStore(next);
    }
    return memory;
  };

  const emit = () => subs.forEach((cb) => cb());

  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key === key || e.key === null) emit();
    });
  }

  return {
    get: read,
    update(fn) {
      const next = fn(read());
      if (next === memory) return memory;
      memory = next;
      try {
        raw = JSON.stringify(next);
        localStorage.setItem(key, raw);
      } catch {
        /* 配額滿或不可用：只留在記憶體 */
      }
      emit();
      return memory;
    },
    subscribe(cb) {
      subs.add(cb);
      return () => {
        subs.delete(cb);
      };
    },
    refresh() {
      raw = undefined;
      read();
      emit();
    },
    setActive(k) {
      active = k;
    },
    getActive: () => active,
  };
}

export function getTabStore(workspace: string): TabStoreHandle {
  let h = handles.get(workspace);
  if (!h) {
    h = createTabStore(workspace);
    handles.set(workspace, h);
  }
  return h;
}
