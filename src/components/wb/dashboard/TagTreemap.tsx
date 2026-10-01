// 標籤分布馬賽克（pt-dash2.jsx 的 DvTags）：前 11 名 + 「其他 N 個」，遞迴二分 treemap（純函式在 lib/wb-dashboard.ts）。
// 座標是 %，SSR 完整畫；方塊的文字等級依實際像素決定，hydrate 後以 ResizeObserver 量容器（量到 0×0 不更新——隱藏的 Browser pane）。
// 方塊是 <button>：內容依等級切換、hover 要 dim 其他方塊，做成 <a> 沒有額外好處；aria-label 已含名稱與數量（規格 §6.4）。
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { tileStyleIndex, tileTier, topTagsWithRest, treemap } from "@/lib/wb-dashboard";
import type { WbTagStat } from "@/lib/wb-types";
import DvCard from "./DvCard";
import { withBase } from "@/lib/base";

const MAX = 11;
/** handoff 的預設估算尺寸：SSR 與量測前用它決定文字等級 */
const DEFAULT_SIZE = { w: 360, h: 220 };
const TIP_W = 180;

type Tip = { x: number; y: number; l: string; v: number; p: number };

function tagHref(name: string): string {
  return withBase(`/notes?tag=${encodeURIComponent(name)}`);
}

export default function TagTreemap({ tags, tagTotal, tagUseTotal }: { tags: WbTagStat[]; tagTotal: number; tagUseTotal: number }) {
  const tiles = useMemo(() => treemap(topTagsWithRest(tags, MAX, tagTotal, tagUseTotal), 0, 0, 100, 100), [tags, tagTotal, tagUseTotal]);
  const [hov, setHov] = useState<string | null>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  const [sz, setSz] = useState(DEFAULT_SIZE);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const upd = () => {
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return; // 隱藏時量到 0：沿用上一次（或預設）
      setSz((p) => (p.w === r.width && p.h === r.height ? p : { w: r.width, h: r.height }));
    };
    upd();
    const raf = requestAnimationFrame(upd);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(upd) : null;
    ro?.observe(el);
    window.addEventListener("resize", upd);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener("resize", upd);
    };
  }, []);

  const moveTip = (e: MouseEvent, t: { k: string; l?: string; v: number }) =>
    setTip({ x: e.clientX, y: e.clientY, l: t.l ?? "#" + t.k, v: t.v, p: tagUseTotal ? Math.round((t.v / tagUseTotal) * 100) : 0 });

  const open = (e: MouseEvent, href: string) => {
    if (e.metaKey || e.ctrlKey || e.button === 1) window.open(href, "_blank", "noopener");
    else window.location.assign(href);
  };

  return (
    <DvCard
      cls="dv-tags"
      title="標籤分布"
      sub={`${tagTotal} 個標籤・共標記 ${tagUseTotal} 次`}
      right={
        <a className="dv-link" href={withBase("/tags")}>
          查看全部
        </a>
      }
    >
      {tiles.length === 0 ? (
        <div className="dv-sl-empty">尚無標籤</div>
      ) : (
        <div
          className="dv-tm"
          ref={ref}
          onMouseLeave={() => {
            setHov(null);
            setTip(null);
          }}
        >
          {tiles.map((t, i) => {
            const rest = !!t.rest;
            const styleIdx = tileStyleIndex(i, rest);
            const pw = (t.w / 100) * sz.w;
            const ph = (t.h / 100) * sz.h;
            const tier = tileTier(pw, ph);
            const label = t.l ?? "#" + t.k;
            const href = rest ? withBase("/tags") : tagHref(t.k);
            return (
              <button
                key={t.k}
                type="button"
                className={[
                  "dv-tile",
                  rest ? "dv-tile-rest" : `dv-tile-${styleIdx}`,
                  hov && hov !== t.k ? "dim" : "",
                  tier === "big" ? "big" : "",
                  tier === "num" ? "num" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{ left: t.x + "%", top: t.y + "%", width: t.w + "%", height: t.h + "%" }}
                aria-label={rest ? `${label}標籤：${t.v} 篇` : `${label}：${t.v} 篇`}
                onMouseEnter={(e) => {
                  setHov(t.k);
                  moveTip(e, t);
                }}
                onMouseMove={(e) => moveTip(e, t)}
                onClick={(e) => open(e, href)}
                onAuxClick={(e) => {
                  if (e.button === 1) {
                    e.preventDefault();
                    open(e, href);
                  }
                }}
              >
                {tier === "big" || tier === "full" ? (
                  <>
                    <span className="dv-tile-n">{label}</span>
                    <b className="tnum">{t.v}</b>
                  </>
                ) : tier === "num" ? (
                  <b className="tnum">{t.v}</b>
                ) : null}
              </button>
            );
          })}
          {tip ? (
            <div className="dv-tip" style={{ left: Math.min(tip.x + 12, window.innerWidth - TIP_W), top: tip.y + 14 }} aria-hidden="true">
              <b>{tip.l}</b>
              <span className="tnum">
                {tip.v} 篇・{tip.p}%
              </span>
            </div>
          ) : null}
        </div>
      )}
    </DvCard>
  );
}
