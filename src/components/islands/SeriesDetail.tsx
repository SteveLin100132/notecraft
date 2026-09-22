// 系列詳情（規格 §8.4；prototype `PtSeriesDetail`）。頁首的 pill 靠 localStorage，所以整個主區由這個 island 渲染。
// **這一頁完整混合顯示筆記與資料檔**（Q14：資料檔移出的只有 /notes 列表），兩者一視同仁、都計入進度。
import { FileText, Layers } from "lucide-react";
import type { SeriesAccent, SeriesIconName } from "@/data/series";
import { readingMeta, readingStatus, resetSeriesProgress, seriesProgress, setReadingStatus, type ReadingStatus } from "@/lib/reading-progress";
import { toast } from "@/lib/prompts";
import WbHeader from "@/components/wb/WbHeader";
import { GroupHeader, Ic, MiniButton, Pill, Progress, StatStrip } from "@/components/wb/ui";
import { useReadingVersion } from "./seriesShared";

export type DetailChapter = {
  /** 筆記或資料檔頁；兩者一視同仁，只有型別標示不同 */
  kind: "note" | "data";
  /** 識別碼原字串，也是閱讀進度的 key（資料檔含 view: 前綴，不可剝掉） */
  ref: string;
  href: string;
  title: string;
  description: string;
  /** 顯示用路徑：筆記相對 notesDir、資料檔的 relPath */
  path: string;
  markersTotal: number;
  markersGenerated: number;
};
export type SeriesDetailData = {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  accent: SeriesAccent;
  icon: SeriesIconName;
  chapters: DetailChapter[];
};

const NEXT: Record<ReadingStatus, { next: ReadingStatus; act: string; tone: "muted" | "default" | "ok" }> = {
  "not-started": { next: "reading", act: "開始閱讀", tone: "muted" },
  reading: { next: "done", act: "標記完成", tone: "default" },
  done: { next: "not-started", act: "重設", tone: "ok" },
};

export default function SeriesDetail({ series, isDev = false }: { series: SeriesDetailData; isDev?: boolean }) {
  const refs = series.chapters.map((c) => c.ref);
  const live = useReadingVersion() > 0;
  const p = seriesProgress(refs, live);
  const next = p.nextIndex >= 0 ? series.chapters[p.nextIndex] : undefined;
  const status = (ref: string): ReadingStatus => (live ? readingStatus(ref) : "not-started");

  const reset = () => {
    if (window.confirm("確定要重設這個系列所有章節的閱讀進度嗎？")) {
      resetSeriesProgress(refs);
      toast("已重設系列進度");
    }
  };

  return (
    <>
      <WbHeader
        title={series.title}
        back="/series"
        crumbs={[{ label: "NoteCraft", href: "/" }, { label: "系列", href: "/series" }, { label: series.title }]}
        pills={[
          { label: `${p.done}/${p.total} 已讀`, tone: "muted" },
          { label: `${p.pct}%`, tone: "ok" },
        ]}
        actions={
          <a className="wb-btn-ghost" href={`/notes?series=${encodeURIComponent(series.id)}`}>
            <Ic icon={Layers} size={14} /> 在筆記列表中篩選
          </a>
        }
        isDev={isDev}
      />
      <div id="nc-scroll" className="wb-body flush">
        <StatStrip
          items={[
            { label: "章節", value: p.total },
            { label: "已完成", value: p.done, tone: "ok" },
            { label: "閱讀中", value: p.reading, tone: "blue" },
            { label: "未開始", value: p.notStarted },
            { label: "進度", value: p.pct + "%" },
          ]}
        />
        <div className="wb-sumbar">
          <Progress pct={p.pct} wide gc={`wb-acc-${series.accent}`} />
          <span className="wb-sum-note">{p.completed ? "已全部讀完" : next ? `下一章：${next.title}` : ""}</span>
          <button type="button" className="wb-btn-ghost" onClick={reset}>
            重設進度
          </button>
        </div>
        <GroupHeader name="章節" count={p.total} icon={Layers} gc={`wb-acc-${series.accent}`} stats="資料檔頁與筆記一視同仁，都計入進度" />
        {series.chapters.map((c, i) => {
          const st = status(c.ref);
          const m = readingMeta(st);
          const n = NEXT[st];
          return (
            <div key={c.ref} className="wb-row">
              <a className="wb-row-main" href={c.href}>
                <span className="wb-row-i tnum">{i + 1}</span>
                <Ic icon={FileText} size={13} color={c.kind === "data" ? "var(--wb-gold)" : "var(--wb-ink-3)"} />
                <span className="wb-row-t">{c.title}</span>
                <span className="wb-row-p">{c.path}</span>
                {c.kind === "data" ? <span className="wb-tagchip">資料檔</span> : null}
                <Pill tone={n.tone} style={{ width: 54, justifyContent: "center" }}>
                  {m.label}
                </Pill>
              </a>
              <MiniButton onClick={() => setReadingStatus(c.ref, n.next)} disabled={!live}>
                {n.act}
              </MiniButton>
            </div>
          );
        })}
      </div>
    </>
  );
}
