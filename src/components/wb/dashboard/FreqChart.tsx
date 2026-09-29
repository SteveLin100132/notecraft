// 寫作頻率（pt-dash2.jsx 的 DvFreq + DvSeg）：每週一根依閱讀狀態分段的堆疊長條，8／12／16 週切換。
// 分格靠今天（weekOf）、分段靠 localStorage（readingStatus）：now 為 null 或 live 為 false 時不畫長條、Y 軸「—」。
// range 是元件 state，不進網址、不進偏好（規格 §1.3）。進場動畫由 CSS 的 ncGrow 負責。
import { useMemo, useState } from "react";
import { readingStatus } from "@/lib/reading-progress";
import { countByStatus, type ReadingKey } from "@/lib/wb-dashboard";
import { weekBuckets, weekOf } from "@/lib/wb-time";
import type { WbNoteRow } from "@/lib/wb-types";
import DvCard from "./DvCard";
import { DV_RS } from "./patterns";

type Range = 8 | 12 | 16;
const RANGES: Range[] = [8, 12, 16];

type Week = { label: string; parts: { k: ReadingKey; l: string; cls: string; v: number }[]; tot: number };

function DvSeg({ on, set }: { on: Range; set: (r: Range) => void }) {
  return (
    <div className="dv-seg" role="group" aria-label="區間">
      {RANGES.map((r) => (
        <button key={r} type="button" className={r === on ? "on" : ""} aria-pressed={r === on} onClick={() => set(r)}>
          {r} 週
        </button>
      ))}
    </div>
  );
}

export default function FreqChart({
  rows,
  now,
  live,
  readingVersion,
}: {
  rows: WbNoteRow[];
  now: Date | null;
  live: boolean;
  readingVersion: number;
}) {
  const [range, setRange] = useState<Range>(12);
  const n = range;
  const ready = now !== null && live;

  const weeks: Week[] | null = useMemo(() => {
    if (!now || !live) return null;
    const labels = weekBuckets([], n, now).map((b) => b.label);
    const perWeek: ReadingKey[][] = Array.from({ length: n }, () => []);
    for (const r of rows) {
      const i = weekOf(r.updatedAt, n, now);
      if (i >= 0) perWeek[i].push(readingStatus(r.slug));
    }
    return perWeek.map((st, i) => {
      const c = countByStatus(st);
      return { label: labels[i], parts: DV_RS.map((s) => ({ k: s.k, l: s.l, cls: s.cls, v: c[s.k] })), tot: st.length };
    });
    // readingVersion：localStorage 變了 rows 不會變
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, now, live, n, readingVersion]);

  const top = weeks ? Math.max(2, ...weeks.map((w) => w.tot)) : 0;
  const every = Math.ceil(n / 6);
  const summary = weeks ? `近 ${n} 週每週更新：` + weeks.map((w) => `${w.label} ${w.tot} 篇`).join("、") : "載入中";

  return (
    <DvCard cls="dv-freq" title="寫作頻率" right={<DvSeg on={range} set={setRange} />}>
      <div className="dv-legend">
        {DV_RS.map((s) => (
          <span key={s.k}>
            <i className={s.cls} aria-hidden="true" />
            {s.l}
          </span>
        ))}
      </div>
      <div className="dv-chart" role="img" aria-label={summary}>
        <div className="dv-chart-y tnum" aria-hidden="true">
          <span style={{ top: 0 }}>{ready ? top : "—"}</span>
          <span style={{ top: "50%" }}>{ready ? Math.round(top / 2) : "—"}</span>
          <span style={{ top: "100%" }}>{ready ? 0 : "—"}</span>
        </div>
        <div className="dv-chart-p">
          {[0, 50, 100].map((p) => (
            <i key={p} className="dv-gl" style={{ top: `calc((100% - 18px) * ${p / 100})` }} />
          ))}
          {Array.from({ length: n }, (_, i) => {
            const w = weeks?.[i];
            const title = w ? `${w.label} 當週更新 ${w.tot} 篇：` + w.parts.filter((p) => p.v).map((p) => `${p.l} ${p.v}`).join("、") : undefined;
            return (
              <div key={i} className="dv-col" title={title}>
                <div className="dv-col-up">
                  {w && w.tot > 0 ? (
                    <div className="dv-stack" style={{ height: (w.tot / top) * 100 + "%" }}>
                      {w.parts.map((p) => (p.v ? <span key={p.k} className={p.cls} style={{ flex: p.v }} /> : null))}
                    </div>
                  ) : null}
                </div>
                <em className="tnum">{w && (n - 1 - i) % every === 0 ? w.label : ""}</em>
              </div>
            );
          })}
        </div>
      </div>
    </DvCard>
  );
}
