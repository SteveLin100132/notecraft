// 月檢視的筆記色塊（規格 §6.4；Q2）：14×14 純 <button>，底色走 .dv-rs-* class。
// 沒有常駐 wb-row-open（與 treemap 方塊同一例外）：雙擊／Enter／⌘點擊／中鍵都能開筆記，Drawer 內也有「開啟」。
import { readingStatus } from "@/lib/reading-progress";
import type { WbNoteRow } from "@/lib/wb-types";
import { rowHandlers } from "../NoteRow";
import { DV_RS } from "./patterns";

/** live 為 false 時一律「待開始」（SSR／首次 render 不讀 localStorage） */
export function readingSeg(slug: string, live: boolean) {
  const k = live ? readingStatus(slug) : "not-started";
  return DV_RS.find((s) => s.k === k) ?? DV_RS[2];
}

export default function CalDot({ row, live, selected, onSelect }: { row: WbNoteRow; live: boolean; selected: boolean; onSelect: (slug: string) => void }) {
  const st = readingSeg(row.slug, live);
  return (
    <button
      type="button"
      className={"cal-dot " + st.cls + (selected ? " sel" : "")}
      data-wb-rowfocus
      aria-pressed={selected}
      title={`${row.title}${row.series ? "・" + row.series.title : ""}・${st.l}`}
      aria-label={`${row.title}（${st.l}）`}
      {...rowHandlers(row.slug, onSelect)}
    />
  );
}
