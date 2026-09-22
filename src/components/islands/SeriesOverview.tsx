// 系列總覽（規格 §8.4；prototype `PtSeriesList`）：stat strip + 一列一個系列。整列是連結。
// 進度在 localStorage：首次繪製用 seriesProgress(slugs, false)，hydrate 後更新。
import { useMemo, useState } from "react";
import { Layers, Search } from "lucide-react";
import type { SeriesAccent, SeriesIconName } from "@/data/series";
import { seriesProgress } from "@/lib/reading-progress";
import { GroupHeader, Pill, Progress, SearchBox, StatStrip } from "@/components/wb/ui";
import { useReadingVersion } from "./seriesShared";

export type SeriesChapterLite = { ref: string; title: string; tags: string[] };
export type SeriesCardData = {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  accent: SeriesAccent;
  icon: SeriesIconName;
  chapters: SeriesChapterLite[];
};

export default function SeriesOverview({ series = [] }: { series?: SeriesCardData[] }) {
  const [q, setQ] = useState("");
  const version = useReadingVersion();
  const rows = useMemo(
    () => series.map((s) => ({ s, p: seriesProgress(s.chapters.map((c) => c.ref), version > 0) })),
    [series, version],
  );
  const ql = q.trim().toLowerCase();
  const list = rows.filter(({ s }) => !ql || s.title.toLowerCase().includes(ql));
  const totalAll = rows.reduce((a, { p }) => a + p.total, 0);
  const totalDone = rows.reduce((a, { p }) => a + p.done, 0);

  return (
    <>
      <div className="wb-tb">
        <span className="wb-tb-lbl">依閱讀進度追蹤的章節集合，點一列進入詳情</span>
        <div className="wb-tb-right">
          <SearchBox value={q} onChange={setQ} icon={Search} placeholder="搜尋系列…" />
          <span className="wb-count tnum">{list.length} 個</span>
        </div>
      </div>
      <div id="nc-scroll" className="wb-body flush">
        <StatStrip
          items={[
            { label: "系列", value: rows.length },
            { label: "章節總數", value: totalAll },
            { label: "已完成", value: totalDone, tone: "ok" },
            { label: "整體進度", value: (totalAll ? Math.round((totalDone / totalAll) * 100) : 0) + "%" },
          ]}
        />
        <GroupHeader name="全部系列" count={list.length} icon={Layers} gc="wb-gc-blue-l" stats="點一列進入系列詳情" />
        {list.length === 0 ? (
          <div className="wb-empty">沒有符合條件的系列。</div>
        ) : (
          list.map(({ s, p }) => (
            <a key={s.id} className={`wb-row wb-acc-${s.accent}`} href={`/series/${s.id}`}>
              <span className="wb-sb-swatch" aria-hidden="true" />
              <span className="wb-row-t">{s.title}</span>
              <span className="wb-row-p">
                {p.total} 章 ・ 已完成 {p.done}
              </span>
              <Progress pct={p.pct} />
              <span className="wb-row-d tnum" style={{ width: 38, flex: "0 0 38px" }}>
                {p.pct}%
              </span>
              <Pill tone={p.completed ? "ok" : p.started ? "default" : "muted"} style={{ width: 54, justifyContent: "center" }}>
                {p.completed ? "已讀完" : p.started ? "進行中" : "未開始"}
              </Pill>
            </a>
          ))
        )}
      </div>
    </>
  );
}
