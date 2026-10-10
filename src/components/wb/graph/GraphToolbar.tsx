// Graph 專用的 Toolbar（handoff §2）：關聯依據、著色、邊的開關、顯示孤島、搜尋、計數。
// List 的「分組」與 AI 篩選那排 chip 在 Graph 不顯示；但那四個旗標若已在網址上仍照常套用，
// 這裡給一顆「已篩選 ✕」可以清掉，否則使用者找不到節點變少的原因（規格 §8.1，Q5）。
import { Check, Filter, Search, X } from "lucide-react";
import type { WbEdgeKind } from "@/lib/wb-types";
import { GR_KINDS, GR_KIND_LABEL } from "@/lib/wb-graph";
import type { GraphColorBy, GraphMode } from "@/lib/wb-graph";
import { Seg } from "../ui";
import GrColorMenu from "./GrColorMenu";
import { GrLine } from "./GrOverlays";

const MODES: { value: GraphMode; label: string }[] = [
  { value: "doc", label: "文件" },
  { value: "tag", label: "標籤" },
];

export default function GraphToolbar({
  mode = "doc",
  colorBy = "folder",
  kinds = { ref: true, inc: true, link: true, seq: true },
  showOrphans = true,
  query = "",
  count = 0,
  extraFilters = 0,
  onMode = () => {},
  onColorBy = () => {},
  onKinds = () => {},
  onShowOrphans = () => {},
  onQuery = () => {},
  onClearExtra = () => {},
}: {
  mode?: GraphMode;
  colorBy?: GraphColorBy;
  kinds?: Record<WbEdgeKind, boolean>;
  showOrphans?: boolean;
  query?: string;
  /** 畫面上的筆記數（不含資料檔） */
  count?: number;
  /** 網址上生效中的 pending／hasAi／nofm／fav 數量 */
  extraFilters?: number;
  onMode?: (m: GraphMode) => void;
  onColorBy?: (c: GraphColorBy) => void;
  onKinds?: (k: Record<WbEdgeKind, boolean>) => void;
  onShowOrphans?: (v: boolean) => void;
  onQuery?: (q: string) => void;
  onClearExtra?: () => void;
}) {
  return (
    <div className="wb-tb gr-tb">
      {extraFilters > 0 ? (
        <>
          <button type="button" className="wb-chip on" onClick={onClearExtra} title="清除「含 AI 標記／待生成／無 frontmatter／收藏」篩選">
            <Filter size={12} strokeWidth={1.8} aria-hidden="true" />
            已篩選
            <X size={11} strokeWidth={2} aria-hidden="true" />
          </button>
          <span className="wb-tb-div" />
        </>
      ) : null}
      <div className="wb-tb-group">
        <span className="wb-tb-lbl">關聯依據</span>
        <Seg boxed label="關聯依據" value={mode} options={MODES} onChange={onMode} />
      </div>
      <span className="wb-tb-div" />
      <div className="wb-tb-group">
        <span className="wb-tb-lbl">著色</span>
        <GrColorMenu value={colorBy} onChange={onColorBy} />
      </div>
      {mode === "doc" ? (
        <>
          <span className="wb-tb-div" />
          <div className="wb-tb-group" role="group" aria-label="邊的種類">
            <span className="wb-tb-lbl">邊</span>
            {GR_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                role="checkbox"
                aria-checked={kinds[k]}
                className={"gr-kind" + (kinds[k] ? " on" : "")}
                onClick={() => onKinds({ ...kinds, [k]: !kinds[k] })}
                title={GR_KIND_LABEL[k].desc}
              >
                <span className="gr-box">{kinds[k] ? <Check size={9} strokeWidth={4} aria-hidden="true" /> : null}</span>
                <GrLine kind={k} w={16} />
                {GR_KIND_LABEL[k].short}
              </button>
            ))}
          </div>
        </>
      ) : null}
      <span className="wb-tb-div" />
      <button type="button" className="gr-sw" role="switch" aria-checked={showOrphans} onClick={() => onShowOrphans(!showOrphans)}>
        <span className={"wb-switch" + (showOrphans ? " on" : "")}>
          <i />
        </span>
        顯示孤島
      </button>
      <div className="wb-tb-right">
        <span className="wb-search gr-search">
          <Search size={13} strokeWidth={1.8} color="var(--wb-ink-3)" aria-hidden="true" />
          <input
            type="text"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="搜尋節點…"
            aria-label="搜尋節點"
            onKeyDown={(e) => {
              // 有字時 Esc 只清空，並擋下共用堆疊（wb-escape 看 defaultPrevented），不會同時關掉 Drawer
              if (e.key === "Escape" && query) {
                e.preventDefault();
                onQuery("");
              }
            }}
          />
          {query ? (
            <button type="button" className="wb-dw-x" onClick={() => onQuery("")} aria-label="清除搜尋">
              <X size={11} strokeWidth={1.8} aria-hidden="true" />
            </button>
          ) : null}
        </span>
        <span className="wb-count tnum">{count} 篇</span>
      </div>
    </div>
  );
}
