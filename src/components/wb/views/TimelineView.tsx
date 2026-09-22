// Timeline：依 updatedAt 月份分段，月份由新到舊、月內由新到舊。列結構同 NoteRow（容器內並排按鈕與連結）。
import type { WbNoteRow } from "@/lib/wb-types";
import { md, monthLabel } from "@/lib/wb-time";
import NoteRow from "../NoteRow";

export default function TimelineView({
  rows = [],
  sel = null,
  onSelect = () => {},
}: {
  rows?: WbNoteRow[];
  sel?: string | null;
  onSelect?: (slug: string) => void;
}) {
  const groups: { key: string; rows: WbNoteRow[] }[] = [];
  for (const r of [...rows].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))) {
    const key = monthLabel(r.updatedAt);
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) {
      g = { key, rows: [] };
      groups.push(g);
    }
    g.rows.push(r);
  }
  return (
    <div className="wb-tl" data-wb-rows>
      {groups.map((g) => (
        <section key={g.key} aria-label={g.key}>
          <div className="wb-tl-m">
            <b>{g.key}</b>
            <span className="tnum">{g.rows.length} 篇</span>
            <i aria-hidden="true" />
          </div>
          {g.rows.map((r) => (
            <NoteRow
              key={r.slug}
              row={r}
              selected={sel === r.slug}
              onSelect={onSelect}
              showDate={false}
              className="wb-tl-row"
              lead={
                <>
                  <span className="wb-tl-d tnum">{md(r.updatedAt)}</span>
                  <span className="wb-tl-axis" aria-hidden="true" />
                </>
              }
            />
          ))}
        </section>
      ))}
    </div>
  );
}
