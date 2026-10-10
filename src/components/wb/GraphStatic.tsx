// Graph 檢視裡「不需要 Graph 程式」的兩個畫面：窄畫面說明與載入骨架。
// 刻意不放進 wb/graph/（那裡整包是 React.lazy 的 chunk）：窄畫面不該為了一段說明下載整個 Graph，
// 骨架則是 chunk 下載期間的 Suspense fallback（規格 docs/notecraft-workbench-notes-graph.md §10、§11）。
import { List, Monitor } from "lucide-react";

/** 寬度 ≤ 860：不畫圖，請使用者改用清單檢視（handoff §6.4）。 */
export function GraphNarrow({ onList = () => {} }: { onList?: () => void }) {
  return (
    <div className="gr-center">
      <div className="gr-msg">
        <div className="gr-medal">
          <Monitor size={20} strokeWidth={1.8} aria-hidden="true" />
        </div>
        <h3>Graph 需要較寬的畫面</h3>
        <p>Graph 要能平移、縮放並同時看到圖例，視窗寬度 860px 以上才會顯示。目前畫面較窄，請改用清單檢視，或把視窗拉寬。</p>
        <div className="gr-acts">
          <button type="button" className="wb-btn-solid" onClick={onList}>
            <List size={13} strokeWidth={1.8} aria-hidden="true" /> 改用清單檢視
          </button>
        </div>
      </div>
    </div>
  );
}

const SKEL_DOTS: readonly (readonly [number, number, number])[] = [
  [150, 100, 15],
  [86, 64, 9],
  [222, 58, 10],
  [60, 142, 7],
  [240, 150, 12],
  [148, 30, 6],
  [110, 178, 8],
  [196, 196, 6],
  [28, 92, 5],
  [292, 104, 5],
  [270, 30, 5],
  [36, 192, 5],
];

/** 載入中（handoff §6.1）：chunk 還在下載、或大圖的佈局還沒算完。 */
export function GraphSkeleton() {
  return (
    <div className="gr-center" aria-busy="true" aria-live="polite">
      <div>
        <div className="gr-skel" aria-hidden="true">
          {SKEL_DOTS.slice(1, 8).map(([x, y], i) => {
            const dx = x - 150;
            const dy = y - 100;
            return <s key={i} style={{ left: 150, top: 100, width: Math.hypot(dx, dy), transform: `rotate(${Math.atan2(dy, dx)}rad)` }} />;
          })}
          {SKEL_DOTS.map(([x, y, r], i) => (
            <i key={i} style={{ left: x - r, top: y - r, width: r * 2, height: r * 2, animationDelay: `${i * 90}ms` }} />
          ))}
        </div>
        <div className="gr-skel-t">正在計算筆記之間的關聯…</div>
      </div>
    </div>
  );
}

/** chunk 下載期間的整塊佔位：空的 Toolbar ＋ 骨架。#nc-scroll 要留著（Toc、捲動還原靠它找容器）。 */
export function GraphFallback() {
  return (
    <>
      <div className="wb-tb gr-tb" />
      <div id="nc-scroll" className="wb-body flush gr-body">
        <GraphSkeleton />
      </div>
    </>
  );
}
