// /wb-index.json 的延遲載入（規格 §5.3，Q2 混合式）。
// 模組層快取：同一頁上 Palette 與 Dashboard 的 Drawer 共用同一個 Promise，只抓一次。
// **呼叫 load() 才發請求** —— 沒開面板、沒點列的頁面完全不會抓。
import { useCallback, useEffect, useState } from "react";
import type { WbIndex } from "@/lib/wb-types";

let pending: Promise<WbIndex> | null = null;

export function loadWbIndex(): Promise<WbIndex> {
  if (!pending) {
    pending = fetch("/wb-index.json")
      .then((r) => {
        if (!r.ok) throw new Error(`wb-index.json ${r.status}`);
        return r.json() as Promise<WbIndex>;
      })
      .catch((e) => {
        pending = null; // 失敗不快取，下次開啟再試
        throw e;
      });
  }
  return pending;
}

export type WbIndexState = { index: WbIndex | null; loading: boolean; error: boolean; load: () => void };

/** `eager` 為 true 時掛載後立刻載入；否則等呼叫 load()。 */
export function useWbIndex(eager = false): WbIndexState {
  const [index, setIndex] = useState<WbIndex | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    loadWbIndex()
      .then((d) => setIndex(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (eager) load();
  }, [eager, load]);

  return { index, loading, error, load };
}
