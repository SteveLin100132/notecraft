// 互動視覺化（client:visible）佔位包裝 —— 給「需要量測容器才能畫、SSR 會輸出空白」的生成元件用。
// 能 SSR 的元件不需要它：Astro 已輸出靜態 HTML，只要在 hydrate 前把按鈕設為 disabled。
//
// MDX：<VizIsland id="rr-raci" h={420} client:visible={{ rootMargin: "200px" }}><RRRaci /></VizIsland>
// h 由生成 skill 驗證時量測後寫入；佔位以 min-height 預留，hydrate 前後高度不變。
import { useEffect, useRef, useState, type ReactNode } from "react";

const DELAY = 150, MIN = 300; // 與 --nc-sk-delay / --nc-sk-min 同值

export default function VizIsland({ id, h, children }: { id: string; h: number; children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [fade, setFade] = useState(false);
  const t0 = useRef(performance.now());
  useEffect(() => {
    // 元件掛上就代表已 hydrate；等一個 frame 讓子元件量測完畢
    const id = requestAnimationFrame(() => {
      const e = performance.now() - t0.current;
      const hold = e < DELAY ? 0 : Math.max(0, DELAY + MIN - e);
      setTimeout(() => { setFade(e >= DELAY); setReady(true); }, hold);
    });
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div className={"nc-island " + (ready ? "ready" : "pending")} style={{ minHeight: h + 52 }} aria-busy={!ready}>
      <div className={"nc-island-real" + (fade ? " was" : "")}>{children}</div>
      {!ready && (
        <div className="nc-island-ph nc-sk-root" aria-hidden="true">
          <div className="nc-sk-fig">
            <div className="nc-sk-fig-h">
              <span className="nc-sk sq" style={{ width: 14, height: 14 }} />
              <span className="nc-sk" style={{ width: 76, height: 9 }} />
              <span style={{ marginLeft: "auto" }}>generated/{id}.tsx</span>
            </div>
            <div className="nc-island-ph-b">
              <span className="nc-sk" style={{ width: "auto", height: "auto" }} />
              <span className="nc-island-lbl">互動圖表載入中</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// 注意：SSR 時 ready=false，佔位會隨 HTML 一起輸出；CSS 的 150ms 延遲讓快速 hydrate 時看不到它。
