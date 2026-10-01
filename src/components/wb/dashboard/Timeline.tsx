// 最近更新（pt-dash2.jsx 的 DvTimeline）：最新 7 篇的垂直時間軸。全是 build 期值，SSR 完整畫。
// 節點不是 prototype 的單一 <button>，而是 workbench §8.2.1 的容器：並排 <button.wb-row-main> 與常駐 <a.wb-row-open>（規格 §6.2）。
import { Sparkles } from "lucide-react";
import { markerCounts, type WbNoteRow } from "@/lib/wb-types";
import { mdShort } from "@/lib/wb-time";
import { OpenLink, rowHandlers } from "../NoteRow";
import DvCard from "./DvCard";
import { withBase } from "@/lib/base";

export default function Timeline({ rows, sel, onSelect }: { rows: WbNoteRow[]; sel: string | null; onSelect: (slug: string) => void }) {
  const list = rows.slice(0, 7);
  return (
    <DvCard
      cls="dv-tl"
      title="最近更新"
      sub={`最新 ${list.length} 篇`}
      right={
        <a className="dv-link" href={withBase("/notes")}>
          查看全部
        </a>
      }
    >
      {list.length === 0 ? (
        <div className="dv-empty">尚無筆記</div>
      ) : (
        <ol className="dv-tl-list">
          {list.map((r) => {
            const extra = r.tags.length - 2;
            const c = markerCounts(r.markers);
            const selected = sel === r.slug;
            return (
              <li key={r.slug}>
                <span className="dv-tl-dot" aria-hidden="true" />
                <div className={"dv-tl-node" + (selected ? " sel" : "")}>
                  <button type="button" className="wb-row-main" data-wb-rowfocus aria-pressed={selected} {...rowHandlers(r.slug, onSelect)}>
                    <span className="dv-tl-t">{r.title}</span>
                    <span className="dv-tl-top">
                      <span className="dv-tl-path">{r.path}</span>
                      <span className="dv-tl-d tnum">{mdShort(r.updatedAt)}</span>
                    </span>
                    {r.description ? <span className="dv-tl-desc">{r.description}</span> : null}
                    <span className="dv-tl-meta">
                      {r.tags.slice(0, 2).map((t) => (
                        <span key={t} className="dv-tag">
                          {t}
                        </span>
                      ))}
                      {extra > 0 ? <span className="dv-tag more">+{extra}</span> : null}
                      {r.markers.length ? (
                        <span className={"dv-ai" + (c.pending ? " warn" : "")}>
                          <Sparkles size={12} strokeWidth={1.7} aria-hidden="true" />
                          AI {c.done}/{r.markers.length}
                        </span>
                      ) : null}
                    </span>
                  </button>
                  <OpenLink slug={r.slug} title={r.title} />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </DvCard>
  );
}
