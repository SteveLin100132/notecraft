// React 端讀檢查更新的狀態（規格 docs/notecraft-workbench-update-check.md §3.1）。
// hydration 期間用 getServerUpd（一律「尚未檢查」）與 SSR 一致，掛載後才換成快取／查詢結果。
import { useEffect, useState, useSyncExternalStore } from "react";
import { getServerUpd, getUpd, initUpdate, subscribeUpd, type UpdEnv, type UpdState } from "@/lib/update-store";

export function useUpd(e?: UpdEnv): UpdState {
  // 第一個帶 env 的元件負責初始化（client:load 的 SettingsView 可能比 client:idle 的 UpdateHost 早）
  useState(() => {
    if (e) initUpdate(e);
    return null;
  });
  return useSyncExternalStore(subscribeUpd, getUpd, getServerUpd);
}

/** 每 30 秒遞增一次，讓「N 分鐘前」重算；enabled 為 false 時不跑 interval */
export function useTick(enabled = true): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => setN((x) => x + 1), 30_000);
    return () => window.clearInterval(id);
  }, [enabled]);
  return n;
}
