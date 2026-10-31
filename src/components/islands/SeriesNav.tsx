import { Database, Layers } from "lucide-react";
import type { SeriesAccent, SeriesIconName } from "@/data/series";
import { withBase } from "@/lib/base";

// 筆記頁文末的系列章節導覽（docs/notecraft-workbench-note-page.md §7；外觀照 handoff 的 .md-series）。
// 純靜態：上列是系列名稱與「第 n / N 章」，下列是上一章／下一章；章節是資料檔時前往檢視頁。
// 系列的完整章節清單與閱讀進度在系列頁（/series/<id>）與 Sidebar，這裡不重複。

export type SeriesNavChapter = {
  /** 識別碼原字串，也是閱讀進度的 key */
  ref: string;
  href: string;
  title: string;
  kind: "note" | "data";
  /** 只有資料檔有 */
  relPath?: string;
};
export type SeriesNavData = {
  id: string;
  title: string;
  eyebrow: string;
  accent: SeriesAccent;
  icon: SeriesIconName;
  chapters: SeriesNavChapter[];
  currentIndex: number;
};

export default function SeriesNav({ series }: { series: SeriesNavData }) {
  const cur = series.currentIndex;
  const prev = cur > 0 ? series.chapters[cur - 1] : null;
  const next = cur < series.chapters.length - 1 ? series.chapters[cur + 1] : null;
  if (!prev && !next) return null;

  return (
    <nav className="md-series" aria-label="系列章節">
      <div className="md-series-h">
        <Layers size={13} aria-hidden="true" />
        <a href={withBase(`/series/${series.id}`)}>{series.title}</a>
        <span className="tnum">
          第 {cur + 1} / {series.chapters.length} 章
        </span>
      </div>
      <div className="md-series-n">
        {prev ? <Cell c={prev} dir="上一章" /> : <span />}
        {next ? <Cell c={next} dir="下一章" right /> : <span />}
      </div>
    </nav>
  );
}

function Cell({ c, dir, right = false }: { c: SeriesNavChapter; dir: string; right?: boolean }) {
  return (
    <a href={c.href} className={right ? "r" : undefined}>
      <small>
        {dir}
        {c.kind === "data" && (
          <>
            {" · "}
            <Database size={11} aria-hidden="true" /> 資料檔
          </>
        )}
      </small>
      <b>{c.title}</b>
    </a>
  );
}
