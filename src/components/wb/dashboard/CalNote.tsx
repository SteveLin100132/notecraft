// 週檢視的筆記卡片（規格 §6.5）。卡片是 §8.2.1 的容器：<button.wb-row-main>（直排四層）+ <a.wb-row-open>，連結不包在按鈕裡。
// 系列名是純文字（藍色），不是第二個連結；AI 計數有待生成時用既有 --wb-warn-ink（Dashboard Q6）。
import { BookOpen, Sparkles } from "lucide-react";
import { markerCounts, type WbNoteRow } from "@/lib/wb-types";
import { OpenLink, rowHandlers } from "../NoteRow";
import { readingSeg } from "./CalDot";

export default function CalNote({ row, live, selected, onSelect }: { row: WbNoteRow; live: boolean; selected: boolean; onSelect: (slug: string) => void }) {
  const st = readingSeg(row.slug, live);
  const c = markerCounts(row.markers);
  const extra = row.tags.length - 2;
  return (
    <div className={"cal-note" + (selected ? " sel" : "")}>
      <button type="button" className="wb-row-main" data-wb-rowfocus aria-pressed={selected} {...rowHandlers(row.slug, onSelect)}>
        <span className="cal-note-st">
          <i className={st.cls} aria-hidden="true" />
          {st.l}
        </span>
        <span className="cal-note-t">{row.title}</span>
        {row.series ? (
          <span className="cal-note-sr">
            <BookOpen size={11} strokeWidth={1.7} aria-hidden="true" />
            <span>{row.series.title}</span>
          </span>
        ) : null}
        {row.tags.length || row.markers.length ? (
          <span className="cal-note-meta">
            {row.tags.slice(0, 2).map((t) => (
              <span key={t} className="dv-tag">
                {t}
              </span>
            ))}
            {extra > 0 ? <span className="dv-tag more">+{extra}</span> : null}
            {row.markers.length ? (
              <span className={"dv-ai" + (c.pending ? " warn" : "")}>
                <Sparkles size={11} strokeWidth={1.7} aria-hidden="true" />
                {c.done}/{row.markers.length}
              </span>
            ) : null}
          </span>
        ) : null}
      </button>
      <OpenLink slug={row.slug} title={row.title} />
    </div>
  );
}
