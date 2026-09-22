// Sidebar 裡靠 client 才知道的兩件事：系列進度（localStorage）與平板／手機的抽屜開合。
// 以 DOM 查詢去增強 Sidebar.astro 畫好的靜態 HTML，**不重新渲染樹**；本身不輸出任何 DOM。
// （展開狀態、目前項目高亮、捲動位置在 Sidebar.astro 的 inline script，首次繪製前就套用。）
import { useEffect } from "react";
import { READING_EVENT, seriesProgress } from "@/lib/reading-progress";
import { pushEscape } from "@/lib/wb-escape";

function paintSeries(): void {
  document.querySelectorAll<HTMLElement>("#wb-sb [data-wb-series]").forEach((row) => {
    let refs: string[] = [];
    try {
      const raw: unknown = JSON.parse(row.dataset.wbRefs ?? "[]");
      if (Array.isArray(raw)) refs = raw.filter((x): x is string => typeof x === "string");
    } catch {
      /* 壞掉就當沒有章節 */
    }
    const p = seriesProgress(refs);
    const bar = row.querySelector<HTMLElement>(".wb-sb-prog i");
    const n = row.querySelector<HTMLElement>("[data-wb-series-n]");
    if (bar) bar.style.width = p.pct + "%";
    if (n) n.textContent = `${p.done}/${p.total}`;
  });
}

export default function SidebarLive() {
  useEffect(() => {
    paintSeries();
    window.addEventListener(READING_EVENT, paintSeries);
    window.addEventListener("storage", paintSeries);
    return () => {
      window.removeEventListener(READING_EVENT, paintSeries);
      window.removeEventListener("storage", paintSeries);
    };
  }, []);

  useEffect(() => {
    const sb = document.getElementById("wb-sb");
    const scrim = document.getElementById("wb-sb-scrim");
    const burger = document.getElementById("wb-mburger");
    if (!sb || !scrim || !burger) return;
    let popEscape: (() => void) | null = null;
    let lastFocus: HTMLElement | null = null;

    const close = () => {
      sb.classList.remove("open");
      scrim.hidden = true;
      burger.setAttribute("aria-expanded", "false");
      popEscape?.();
      popEscape = null;
      lastFocus?.focus();
      lastFocus = null;
    };
    const open = () => {
      lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      sb.classList.add("open");
      scrim.hidden = false;
      burger.setAttribute("aria-expanded", "true");
      popEscape = pushEscape(close);
      sb.querySelector<HTMLElement>("a, button")?.focus();
    };
    const toggle = () => (sb.classList.contains("open") ? close() : open());
    // 視窗拉回桌面寬度時，抽屜狀態要清掉，否則 scrim 會殘留
    const mq = window.matchMedia("(min-width: 1101px)");
    const onMq = () => {
      if (mq.matches && sb.classList.contains("open")) close();
    };

    burger.addEventListener("click", toggle);
    scrim.addEventListener("click", close);
    mq.addEventListener("change", onMq);
    return () => {
      burger.removeEventListener("click", toggle);
      scrim.removeEventListener("click", close);
      mq.removeEventListener("change", onMq);
      popEscape?.();
    };
  }, []);

  return null;
}
