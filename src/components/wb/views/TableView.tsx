// Table：六欄 + 「開啟」圖示欄（規格 §8.2；沒有「字數」欄，Q9）。
// <tr> 掛點擊處理；鍵盤焦點由標題格內的 <button> 承接；連結在末欄。不做點表頭排序。
import type { WbNoteRow } from "@/lib/wb-types";
import { ymd } from "@/lib/wb-time";
import { AiPill, SeriesPill } from "../ui";
import { OpenLink, rowHandlers } from "../NoteRow";

const COLS = ["標題", "資料夾", "系列", "標籤", "AI 標記", "更新日"];

export default function TableView({
  rows = [],
  sel = null,
  onSelect = () => {},
}: {
  rows?: WbNoteRow[];
  sel?: string | null;
  onSelect?: (slug: string) => void;
}) {
  return (
    <div className="wb-tablewrap" data-wb-rows>
      <table className="wb-table">
        <thead>
          <tr>
            {COLS.map((c) => (
              <th key={c} className={c === "更新日" ? "num" : ""}>
                {c}
              </th>
            ))}
            <th className="open" aria-label="開啟" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const h = rowHandlers(r.slug, onSelect);
            return (
              <tr
                key={r.slug}
                className={sel === r.slug ? "sel" : ""}
                aria-selected={sel === r.slug}
                onClick={h.onClick}
                onAuxClick={h.onAuxClick}
                onDoubleClick={h.onDoubleClick}
              >
                <td className="t">
                  <button type="button" className="wb-cell-btn" data-wb-rowfocus onKeyDown={h.onKeyDown} onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()} tabIndex={0}>
                    {r.title}
                  </button>
                </td>
                <td style={{ color: "var(--wb-ink-3)", fontSize: 11.5 }}>{r.folder.length ? r.folder.join("/") : "—"}</td>
                <td>{r.series ? <SeriesPill accent={r.series.accent} title={r.series.title} index={r.series.index} /> : <span style={{ color: "var(--wb-ink-3)" }}>—</span>}</td>
                <td>
                  {r.tags.length ? (
                    r.tags.map((t) => (
                      <span key={t} className="wb-tagchip" style={{ marginRight: 4 }}>
                        {t}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: "var(--wb-ink-3)" }}>—</span>
                  )}
                </td>
                <td>
                  <AiPill markers={r.markers} hasFrontmatter={r.hasFrontmatter} />
                </td>
                <td className="num">{ymd(r.updatedAt)}</td>
                <td className="open">
                  <OpenLink slug={r.slug} title={r.title} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
