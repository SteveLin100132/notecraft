// 把 lib/wb-tabs-store.ts 接成 React 狀態。
// SSR 與 hydration 第一輪一律回 null（「還不知道」）：頁籤存在 localStorage，伺服器端沒有，
// 由呼叫端只畫 34px 空列；hydrate 後 React 會用 client snapshot 重畫，不會 mismatch。
import { useSyncExternalStore } from "react";
import { getTabStore, type TabStoreHandle } from "@/lib/wb-tabs-store";
import type { TabStore } from "@/lib/wb-tabs";

export function useTabStore(workspace: string): { store: TabStore | null; handle: TabStoreHandle } {
  const handle = getTabStore(workspace);
  const store = useSyncExternalStore(handle.subscribe, handle.get, () => null);
  return { store, handle };
}
