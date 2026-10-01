// 系列（pt-dash2.jsx 的 DvSeries）：最多 3 個（Q5），排序沿用 v1.0.0（進行中 → 未開始 → 已讀完；workbench Q15a）。
// 進度在 localStorage：live 為 false 時全部未開始、不顯示按鈕、依 registry 順序（與 SSR 一致）。
// 名稱連結與「下一篇」連結是兩個獨立 <a>，同列不巢狀；資料檔章節直接連 /view/…（規格 §6.3）。
import { useMemo } from "react";
import { Check, ChevronRight } from "lucide-react";
import { seriesProgress } from "@/lib/reading-progress";
import type { WbSeries } from "@/lib/wb-types";
import DvCard from "./DvCard";
import { withBase } from "@/lib/base";

const MAX = 3;

export default function SeriesCard({ series, live, readingVersion }: { series: WbSeries[]; live: boolean; readingVersion: number }) {
  const all = series.filter((s) => s.chapters.length > 0);
  const items = useMemo(
    () =>
      all
        .map((s, i) => {
          const p = seriesProgress(
            s.chapters.map((c) => c.ref),
            live,
          );
          const next = p.nextIndex >= 0 ? s.chapters[p.nextIndex] : null;
          const state: 0 | 1 | 2 = p.completed ? 2 : p.started ? 0 : 1; // 進行中 0 → 未開始 1 → 已讀完 2
          return { s, p, next, state, i };
        })
        .sort((a, b) => a.state - b.state || (a.state === 0 ? b.p.pct - a.p.pct : 0) || a.i - b.i)
        .slice(0, MAX),
    // readingVersion：localStorage 變了 series 不會變
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [all, live, readingVersion],
  );

  return (
    <DvCard
      cls="dv-sl"
      title="系列"
      sub={`共 ${all.length} 個系列`}
      right={
        <a className="dv-link" href={withBase("/series")}>
          查看全部
        </a>
      }
    >
      <div className="dv-sl-list">
        {all.length === 0 ? (
          <div className="dv-sl-empty">
            尚未定義系列。
            <a className="dv-link" href={withBase("/series")}>
              了解怎麼建立
            </a>
          </div>
        ) : null}
        {items.map(({ s, p, next, state }) => (
          <div key={s.id} className={`dv-sl-row wb-acc-${s.accent}`}>
            <div className="dv-sl-top">
              <a className="dv-sl-n" href={withBase(`/series/${s.id}`)}>
                <span className="dv-sw" aria-hidden="true" />
                {s.title}
              </a>
              <span className="dv-sl-c tnum">
                <b>{p.done}</b>／{p.total} 篇
              </span>
            </div>
            <div className="dv-sl-bar" title={`已完成 ${p.done}・閱讀中 ${p.reading}・待開始 ${p.notStarted}`}>
              <i style={{ width: (p.total ? p.done / p.total : 0) * 100 + "%" }} />
              <i className="rd" style={{ width: (p.total ? p.reading / p.total : 0) * 100 + "%" }} />
            </div>
            <div className="dv-sl-foot">
              {state === 2 ? (
                <span className="dv-sl-done">
                  <Check size={13} strokeWidth={2} aria-hidden="true" />
                  已全部閱讀
                </span>
              ) : (
                <>
                  <span className="dv-sl-next">
                    <span>下一篇</span>
                    {next?.title ?? ""}
                  </span>
                  {live && next ? (
                    <a className="dv-btn" href={next.href}>
                      {state === 0 ? "繼續閱讀" : "開始閱讀"}
                      <ChevronRight size={13} strokeWidth={2} aria-hidden="true" />
                    </a>
                  ) : null}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </DvCard>
  );
}
