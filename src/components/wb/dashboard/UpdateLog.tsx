// 更新日誌（pt-dash2.jsx 的 DvLog）：週導覽 + 7 天日期列 + 當週更新的筆記卡片。
// 週窗靠今天（weekWindow）：now 為 null 時週導覽「—」、日期格空、清單與空狀態都不輸出（規格 §5.2、§6.5）。
// 空狀態是插圖式 EmptyState（docs/notecraft-workbench-empty-states.md §4.1）。
// off／pick 是元件 state，不進網址。事件卡是 §8.2.1 的容器：<button.wb-row-main> + <a.wb-row-open>。
import { useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Sparkles, Tag } from "lucide-react";
import { markerCounts, type WbNoteRow } from "@/lib/wb-types";
import { mdShort, weekWindow } from "@/lib/wb-time";
import { OpenLink, rowHandlers } from "../NoteRow";
import DvCard from "./DvCard";
import EmptyState from "../EmptyState";
import { withBase } from "@/lib/base";

const WD = ["日", "一", "二", "三", "四", "五", "六"];

export default function UpdateLog({
  rows,
  now,
  sel,
  onSelect,
}: {
  rows: WbNoteRow[];
  now: Date | null;
  sel: string | null;
  onSelect: (slug: string) => void;
}) {
  const [off, setOff] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  const win = now ? weekWindow(off, now) : null;
  const inWeek = win ? rows.filter((r) => win.days.includes(r.updatedAt.slice(0, 10))) : [];
  const list = pick ? inWeek.filter((r) => r.updatedAt.slice(0, 10) === pick) : inWeek;
  const go = (d: number) => {
    setOff((o) => Math.max(0, o + d));
    setPick(null);
  };

  return (
    <DvCard cls="dv-log" title="更新日誌" sub={win ? `${off ? "該週" : "本週"}共更新 ${inWeek.length} 篇筆記` : "共 — 篇筆記"}>
      <div className="dv-week-nav">
        <button type="button" onClick={() => go(1)} aria-label="上一週" disabled={!win}>
          <ChevronLeft size={15} strokeWidth={1.7} aria-hidden="true" />
        </button>
        <span className="tnum">
          <b>7 天</b>・{win ? `${mdShort(win.start)} – ${mdShort(win.end)}` : "—"}
        </span>
        <button type="button" onClick={() => go(-1)} aria-label="下一週" disabled={!win || !off}>
          <ChevronRight size={15} strokeWidth={1.7} aria-hidden="true" />
        </button>
      </div>
      <div className="dv-days">
        {Array.from({ length: 7 }, (_, i) => {
          const s = win?.days[i];
          const has = !!s && inWeek.some((r) => r.updatedAt.slice(0, 10) === s);
          const on = !!s && pick === s;
          return (
            <button
              key={i}
              type="button"
              className={(on ? "on " : "") + (has ? "has" : "")}
              aria-pressed={on}
              disabled={!s}
              onClick={() => s && setPick(pick === s ? null : s)}
            >
              <b className="tnum">{s ? s.slice(8, 10) : ""}</b>
              <span>{s ? WD[new Date(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10))).getDay()] : ""}</span>
            </button>
          );
        })}
      </div>
      {win ? (
        <div className={"dv-log-list" + (list.length ? "" : " is-empty")}>
          {list.map((r) => {
            const c = markerCounts(r.markers);
            const selected = sel === r.slug;
            return (
              <div key={r.slug} className={"dv-ev" + (selected ? " sel" : "")}>
                <button type="button" className="wb-row-main" data-wb-rowfocus aria-pressed={selected} {...rowHandlers(r.slug, onSelect)}>
                  <span className="dv-ev-t">
                    <i aria-hidden="true" />
                    <span>{r.title}</span>
                  </span>
                  <span className="dv-ev-s tnum">
                    <span>{mdShort(r.updatedAt)}</span>
                    {r.series ? (
                      <span className="dv-ev-sr">
                        <BookOpen size={11} strokeWidth={1.7} aria-hidden="true" />
                        <span>{r.series.title}</span>
                      </span>
                    ) : null}
                    <span>
                      <Tag size={11} strokeWidth={1.7} aria-hidden="true" />
                      {r.tags.length}
                    </span>
                    <span>
                      <Sparkles size={11} strokeWidth={1.7} aria-hidden="true" />
                      {c.done}/{r.markers.length}
                    </span>
                  </span>
                </button>
                <OpenLink slug={r.slug} title={r.title} />
              </div>
            );
          })}
          {list.length === 0 ? (
            // 選了沒圓點的日期、但整週有更新 → 講「這一天」，否則與「本週共更新 N 篇」矛盾（規格 Q1）；整週都空時照週文案
            pick && inWeek.length ? (
              <EmptyState kind="log" title="這一天沒有更新的筆記" sub="點選有圓點的日期，或再點一次回到整週。" />
            ) : (
              <EmptyState kind="log" title="這段期間沒有更新的筆記" sub={off ? "切換到其他週看看，或回到本週。" : "本週還沒有動靜，寫下第一篇吧。"} />
            )
          ) : null}
        </div>
      ) : (
        <div className="dv-log-list" aria-hidden="true" />
      )}
      <a className="dv-full" href={withBase("/notes")}>
        查看全部筆記
      </a>
    </DvCard>
  );
}
