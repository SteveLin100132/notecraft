// 更新月曆的一個日期格（規格 §6.3）：格頭（日期／今天膠囊／N 篇）＋ 內容區（月：色塊、週：卡片）。
// 底色與排列全靠 class（.out／.today／.thiswk 與 .cal-grid.mo／.wk 的後代選擇器），元件只掛 class。
import type { WbNoteRow } from "@/lib/wb-types";
import { calCellLabel, type CalView } from "@/lib/wb-calendar";
import CalDot from "./CalDot";
import CalNote from "./CalNote";

export default function CalCell({
  iso,
  list,
  view,
  out,
  today,
  thisWeek,
  firstCell,
  live,
  sel,
  onSelect,
}: {
  iso: string;
  list: WbNoteRow[];
  view: CalView;
  /** 月檢視的前後月補位格 */
  out: boolean;
  today: boolean;
  /** 月檢視才會為 true（週檢視不標當週） */
  thisWeek: boolean;
  /** 週檢視首格：日期顯示 M/D */
  firstCell: boolean;
  live: boolean;
  sel: string | null;
  onSelect: (slug: string) => void;
}) {
  return (
    <div className={"cal-cell" + (out ? " out" : "") + (today ? " today" : "") + (thisWeek ? " thiswk" : "")} aria-current={today ? "date" : undefined}>
      <div className="cal-cell-h">
        <b className="tnum">{calCellLabel(iso, firstCell)}</b>
        {list.length ? <span className="tnum">{list.length} 篇</span> : null}
      </div>
      <div className="cal-cell-b">
        {list.map((r) =>
          view === "month" ? (
            <CalDot key={r.slug} row={r} live={live} selected={sel === r.slug} onSelect={onSelect} />
          ) : (
            <CalNote key={r.slug} row={r} live={live} selected={sel === r.slug} onSelect={onSelect} />
          ),
        )}
      </div>
    </div>
  );
}
