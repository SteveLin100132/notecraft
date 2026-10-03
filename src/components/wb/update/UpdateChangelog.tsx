// 「你錯過的更新」：版本清單、類別篩選、摺疊（規格 docs/notecraft-workbench-update-check.md §4.3、§6.4；handoff §4 UpdChangelog）。
import { useMemo, useState } from "react";
import { ChevronRight, Info, Shield } from "lucide-react";
import { CL_CATS, countByCategory, type ClCat, type ClSlice } from "@/lib/changelog-parse";
import { daysLabel, parseSemver, ymdSlash } from "@/lib/update-check";
import type { ClStatus } from "@/lib/update-store";
import { Inline, Spin } from "./UpdateParts";

const FOLD = 4;

const secCount = (m: ClSlice) => m.sections.filter((s) => s.cat === "security").reduce((a, s) => a + s.items.length, 0);
const total = (m: ClSlice) => m.sections.reduce((a, s) => a + s.items.length, 0);
const majorOf = (v: string) => parseSemver(v)?.major ?? -1;
const label = (m: ClSlice) => (m.vFrom ? `v${m.vFrom} – v${m.v}` : `v${m.v}`);
const domId = (v: string) => "updv-" + v.replace(/\./g, "-");

function Version({
  m,
  older,
  open,
  onToggle,
  first,
  firstLabel,
  only,
  base,
}: {
  m: ClSlice;
  /** 清單中下一個（較舊的）版號；最舊的一版拿目前版本比 */
  older: string;
  open: boolean;
  onToggle: () => void;
  first: boolean;
  firstLabel: "最新" | "目前";
  only: ClCat | null;
  base: string;
}) {
  const isMajor = majorOf(m.v) !== majorOf(older) && majorOf(older) >= 0 && firstLabel === "最新";
  const sec = secCount(m);
  const id = domId(m.v);
  const now = Date.now();
  const sections = CL_CATS.flatMap((c) => m.sections.filter((s) => s.cat === c.key && (!only || only === c.key)).map((s) => ({ s, c })));
  return (
    <div className="wb-upd-vi">
      <button type="button" className="wb-upd-vh" aria-expanded={open} aria-controls={id} onClick={onToggle}>
        <span className={"wb-upd-caret" + (open ? " open" : "")}>
          <ChevronRight size={11} strokeWidth={2.2} aria-hidden="true" />
        </span>
        <span className="wb-upd-vh-v">{label(m)}</span>
        {isMajor ? <span className="wb-pill warn wb-upd-strong">major</span> : null}
        {m.date ? (
          <span className="wb-upd-vh-d tnum">
            {ymdSlash(m.date)} ・ {daysLabel(m.date, now)}
          </span>
        ) : null}
        <span className="wb-upd-vh-r">
          {sec ? (
            <span className="wb-upd-secpill">
              <Shield size={11} strokeWidth={2} aria-hidden="true" />
              安全 {sec}
            </span>
          ) : null}
          {first ? (
            <span className={firstLabel === "目前" ? "wb-pill ok" : "wb-pill"}>{firstLabel}</span>
          ) : (
            <span className="wb-badge-n tnum">{total(m)} 項</span>
          )}
        </span>
      </button>
      {open ? (
        <div className="wb-upd-vb" id={id}>
          {m.lead && !only ? (
            <p className="wb-upd-lead">
              <Inline text={m.lead} base={base} />
            </p>
          ) : null}
          {m.empty ? <p className="wb-upd-none">這一版沒有 CHANGELOG 紀錄</p> : null}
          {!m.empty && m.sections.length === 0 ? (
            <p className="wb-upd-none">{m.internalOnly ? "這一版只有內部調整" : "這一版沒有列出變更項目"}</p>
          ) : null}
          {sections.map(({ s, c }, i) => (
            <div key={i} className={"wb-upd-cat" + (s.cat === "security" ? " sec" : "")} style={{ ["--c" as string]: c.color }}>
              <div className="wb-upd-cat-h">
                {s.cat === "security" ? <Shield size={12} strokeWidth={2} aria-hidden="true" /> : <i />}
                {s.cat === "other" ? s.title : c.label}
              </div>
              <ul>
                {s.items.map((it, j) => (
                  <li key={j}>
                    <Inline text={it.text} base={base} />
                    {it.children.length ? (
                      <ul>
                        {it.children.map((ch, k) => (
                          <li key={k}>
                            <Inline text={ch} base={base} />
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function UpdateChangelog({
  slices,
  status,
  cur,
  firstLabel = "最新",
  base,
  ghPage,
}: {
  slices: ClSlice[];
  status: ClStatus;
  cur: string;
  firstLabel?: "最新" | "目前";
  base: string;
  ghPage: string;
}) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(slices.length ? [slices[0].v] : []));
  const [showAll, setShowAll] = useState(false);
  const [flt, setFlt] = useState<ClCat | null>(null);
  const counts = useMemo(() => countByCategory(slices), [slices]);

  if (status === "loading" || status === "idle")
    return (
      <div className="wb-upd-vlist" aria-busy="true">
        <div className="wb-upd-skel-h">
          <Spin />
          正在讀取 CHANGELOG.md…
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="wb-upd-skel-row" aria-hidden="true">
            <span className="wb-upd-skel" style={{ width: 52 }} />
            <span className="wb-upd-skel" style={{ width: 96 }} />
            <span className="wb-upd-skel" style={{ width: 38, marginLeft: "auto" }} />
          </div>
        ))}
      </div>
    );
  if (status === "error")
    return (
      <div className="wb-upd-vlist">
        <div className="wb-upd-clerr">
          <Info size={15} strokeWidth={1.7} aria-hidden="true" />
          <div>
            <div>CHANGELOG 暫時無法載入，版本資訊與升級指令不受影響。</div>
            {ghPage ? (
              <a href={ghPage} target="_blank" rel="noopener">
                到 GitHub 看完整 CHANGELOG ↗
              </a>
            ) : null}
          </div>
        </div>
      </div>
    );

  const list = flt ? slices.filter((m) => m.sections.some((s) => s.cat === flt)) : slices;
  const hidden = !flt && !showAll && list.length > FOLD + 1 ? list.slice(FOLD) : [];
  const vis = hidden.length ? list.slice(0, FOLD) : list;
  const allOpen = vis.length > 0 && vis.every((m) => open.has(m.v));
  const toggle = (v: string) => {
    const n = new Set(open);
    if (n.has(v)) n.delete(v);
    else n.add(v);
    setOpen(n);
  };
  const hiddenSec = hidden.reduce((a, m) => a + secCount(m), 0);
  const cats = CL_CATS.filter((c) => counts[c.key] > 0);

  return (
    <>
      <div className="wb-upd-sum">
        {cats.map((c) => (
          <button
            key={c.key}
            type="button"
            className={"wb-chip" + (c.key === "security" ? " wb-upd-chip-sec" : "") + (flt === c.key ? " on" : "")}
            aria-pressed={flt === c.key}
            onClick={() => setFlt(flt === c.key ? null : c.key)}
          >
            {c.key === "security" ? <Shield size={12} strokeWidth={2} aria-hidden="true" /> : null}
            {c.label} <b>{counts[c.key]}</b>
          </button>
        ))}
        {!flt ? (
          <button type="button" className="wb-upd-linkbtn" onClick={() => setOpen(allOpen ? new Set() : new Set(list.map((m) => m.v)))}>
            {allOpen ? "全部收合" : "全部展開"}
          </button>
        ) : (
          <button type="button" className="wb-upd-linkbtn" onClick={() => setFlt(null)}>
            清除篩選
          </button>
        )}
      </div>
      <div className="wb-upd-vlist">
        {vis.map((m, i) => (
          <Version
            key={m.v}
            m={m}
            older={list[i + 1]?.v ?? cur}
            first={!flt && i === 0}
            firstLabel={firstLabel}
            only={flt}
            open={!!flt || open.has(m.v)}
            onToggle={() => toggle(m.v)}
            base={base}
          />
        ))}
        {hidden.length ? (
          <button type="button" className="wb-upd-more" onClick={() => setShowAll(true)}>
            <ChevronRight size={11} strokeWidth={2.2} style={{ transform: "rotate(90deg)" }} aria-hidden="true" />
            顯示較早的 {hidden.length} 個版本（{label(hidden[hidden.length - 1]).split(" – ")[0]} – v{hidden[0].v}）
            {hiddenSec ? (
              <span className="wb-upd-secpill">
                <Shield size={11} strokeWidth={2} aria-hidden="true" />
                含安全 {hiddenSec}
              </span>
            ) : null}
          </button>
        ) : null}
      </div>
    </>
  );
}
