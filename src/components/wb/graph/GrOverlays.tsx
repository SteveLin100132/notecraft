// Graph 畫布上的浮層：統計列、縮放控制、圖例、提示框（handoff §4.6），以及共用的線型樣本。
// 這些在 DOM 裡排在 <svg> 之前：鍵盤使用者不必先 Tab 過所有節點才碰得到（規格 §8.4）。
import { ChevronUp, Maximize, Minus, Plus } from "lucide-react";
import type { WbEdgeKind } from "@/lib/wb-types";
import { GR_COLOR_BY, GR_KINDS, GR_KIND_LABEL, GR_R, GR_ZOOM } from "@/lib/wb-graph";
import type { GraphColorBy, GraphEdge, GraphMode, GraphNode } from "@/lib/wb-graph";

/** 線型樣本（Toolbar 的邊開關、圖例、提示框共用）。kind 為 "tagl" 是標籤模式的細線。 */
export function GrLine({ kind, w = 26, arrow = false }: { kind: WbEdgeKind | "tagl"; w?: number; arrow?: boolean }) {
  return (
    <svg className="gr-line" width={w} height={10} viewBox={`0 0 ${w} 10`} aria-hidden="true">
      <line x1={1} y1={5} x2={arrow ? w - 6 : w - 1} y2={5} className={"gr-e " + kind} style={{ strokeWidth: kind === "tagl" ? "var(--wb-gr-w-tag)" : `var(--wb-gr-w-${kind})` }} />
      {arrow ? <path d={`M${w - 7} 1.6 L${w - 1} 5 L${w - 7} 8.4z`} className={"gr-arr gr-arr-" + kind} /> : null}
    </svg>
  );
}

export function GrStats({
  mode = "doc",
  notes = 0,
  edges = 0,
  orphans = 0,
  tags = 0,
  untagged = 0,
  match = null,
}: {
  mode?: GraphMode;
  notes?: number;
  edges?: number;
  orphans?: number;
  tags?: number;
  untagged?: number;
  /** 搜尋中才有：符合的節點數 */
  match?: number | null;
}) {
  return (
    <div className="gr-stats" role="status">
      <span>
        <b>{notes}</b> 篇筆記
      </span>
      <i>・</i>
      {mode === "tag" ? (
        <>
          <span>
            <b>{tags}</b> 個標籤
          </span>
          <i>・</i>
          <span>
            <b>{untagged}</b> 篇未加標籤
          </span>
        </>
      ) : (
        <>
          <span>
            <b>{edges}</b> 條關聯
          </span>
          <i>・</i>
          <span>
            <b>{orphans}</b> 篇孤島
          </span>
        </>
      )}
      {match !== null ? (
        <>
          <i>・</i>
          <span className="gr-match">
            符合 <b>{match}</b>
          </span>
        </>
      ) : null}
    </div>
  );
}

export function GrZoom({ k = 1, onIn = () => {}, onOut = () => {}, onFit = () => {} }: { k?: number; onIn?: () => void; onOut?: () => void; onFit?: () => void }) {
  return (
    <div className="gr-zoom" role="group" aria-label="縮放">
      <button type="button" className="gr-zb" onClick={onIn} disabled={k >= GR_ZOOM.max - 0.001} aria-label="放大" title="放大">
        <Plus size={15} strokeWidth={1.8} aria-hidden="true" />
      </button>
      <button type="button" className="gr-zb" onClick={onOut} disabled={k <= GR_ZOOM.min + 0.001} aria-label="縮小" title="縮小">
        <Minus size={15} strokeWidth={1.8} aria-hidden="true" />
      </button>
      <button type="button" className="gr-zb" onClick={onFit} aria-label="符合視窗" title="符合視窗">
        <Maximize size={15} strokeWidth={1.8} aria-hidden="true" />
      </button>
      <div className="gr-zpct" aria-live="polite">
        {Math.round(k * 100)}%
      </div>
    </div>
  );
}

export type LegendGroup = { key: string; label: string; color: string; n: number };

export function GrLegend({
  open = true,
  onToggle = () => {},
  mode = "doc",
  colorBy = "folder",
  groups = [],
  kinds = { ref: true, inc: true, link: true, seq: true },
}: {
  open?: boolean;
  onToggle?: () => void;
  mode?: GraphMode;
  colorBy?: GraphColorBy;
  /** 只列畫面上有的分組 */
  groups?: LegendGroup[];
  kinds?: Record<WbEdgeKind, boolean>;
}) {
  const cbLabel = GR_COLOR_BY.find((x) => x.value === colorBy)?.label ?? "";
  return (
    <div className={"gr-lg" + (open ? "" : " closed")}>
      <button type="button" className="gr-lg-h" onClick={onToggle} aria-expanded={open}>
        圖例
        <span className="gr-car">
          <ChevronUp size={13} strokeWidth={2.2} aria-hidden="true" />
        </span>
      </button>
      {open ? (
        <div className="gr-lg-b">
          <div className="gr-lg-sec">
            <div className="gr-lg-t">著色依據：{cbLabel}</div>
            <div className="gr-lg-grid">
              {groups.map((g) => (
                <div key={g.key} className="gr-lg-r" title={g.key}>
                  <span className="gr-dot" style={{ background: g.color }} />
                  <span>{g.label}</span>
                  <em>{g.n}</em>
                </div>
              ))}
            </div>
          </div>
          {mode === "doc" ? (
            <>
              <div className="gr-lg-sec">
                <div className="gr-lg-t">節點大小：被連入數</div>
                <div className="gr-sizes">
                  {GR_R.map((r, i) => (
                    <div key={r}>
                      <i style={{ width: r * 2, height: r * 2 }} />
                      {["0–1", "2–3", "4–7", "8+"][i]}
                    </div>
                  ))}
                </div>
                <div className="gr-lg-r">
                  <span className="gr-dot" style={{ background: "var(--wb-gr-c0)" }} />
                  <span>筆記</span>
                  <span className="gr-sq" style={{ background: "var(--wb-gr-c-data)" }} />
                  <span>資料檔</span>
                </div>
              </div>
              <div className="gr-lg-sec">
                <div className="gr-lg-t">邊：箭頭指向被參照的一方</div>
                {GR_KINDS.map((k) => (
                  <div key={k} className={"gr-lg-r" + (kinds[k] ? "" : " off")}>
                    <GrLine kind={k} arrow w={30} />
                    <span>{GR_KIND_LABEL[k].name}</span>
                  </div>
                ))}
                <div className="gr-lg-r note">
                  <span>線越粗，兩篇之間的關聯次數越多</span>
                </div>
              </div>
            </>
          ) : (
            <div className="gr-lg-sec">
              <div className="gr-lg-t">結構</div>
              <div className="gr-lg-r">
                <svg width={16} height={16} aria-hidden="true">
                  <circle className="gr-lg-hub" cx={8} cy={8} r={6.5} />
                </svg>
                <span>標籤樞紐・筆記數</span>
              </div>
              <div className="gr-lg-r">
                <svg width={16} height={16} aria-hidden="true">
                  <circle className="gr-lg-hub plain" cx={8} cy={8} r={6.5} />
                </svg>
                <span>其他標籤、未加標籤</span>
              </div>
              <div className="gr-lg-r">
                <GrLine kind="tagl" w={16} />
                <span>筆記屬於該標籤</span>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function GrTipNode({ n, mode = "doc", folderLabel = "", hubTags = [] }: { n: GraphNode; mode?: GraphMode; folderLabel?: string; hubTags?: string[] }) {
  return (
    <>
      <div className="gr-tip-t">{n.title}</div>
      <div className="gr-tip-r">
        {n.data ? (
          <>
            資料檔<b>{n.pluginId}</b>
          </>
        ) : (
          <>
            資料夾<b>{folderLabel}</b>
          </>
        )}
      </div>
      <div className="gr-tip-r">
        連入<b>{n.inDeg}</b>・連出<b>{n.outDeg}</b>
        {n.orphan ? <span>・孤島</span> : null}
      </div>
      {mode === "tag" && hubTags.length ? (
        <div className="gr-tip-r">
          標籤<b>{hubTags.join("、")}</b>
        </div>
      ) : null}
    </>
  );
}

export function GrTipEdge({ e, from = "", to = "" }: { e: GraphEdge; from?: string; to?: string }) {
  return (
    <>
      <div className="gr-tip-t">
        {from} <span>→</span> {to}
      </div>
      {GR_KINDS.filter((k) => e.kinds[k]).map((k) => (
        <div key={k} className="gr-tip-r">
          <span className="gr-tip-k">
            <GrLine kind={k} arrow w={22} />
            <b>
              {GR_KIND_LABEL[k].name} ×{e.kinds[k]}
            </b>
          </span>
        </div>
      ))}
    </>
  );
}

export function GrTipHub({ tag = "", n = 0, plain = false }: { tag?: string; n?: number; plain?: boolean }) {
  return (
    <>
      <div className="gr-tip-t">{tag}</div>
      <div className="gr-tip-r">
        筆記<b>{n}</b>
        {plain ? null : <span>・點一下只看這個標籤</span>}
      </div>
    </>
  );
}
