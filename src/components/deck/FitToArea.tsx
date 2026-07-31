// 把「比投影片高的既有元件」等比縮到可用區內（Task 37 補）。
//
// 為什麼需要：筆記裡的 @ai-visualize 元件是為**網頁內文**設計的（高度隨內容長，
// 頁面可以往下滾），而投影片是 1600×900 的固定座標系、`overflow: hidden`。
// 直接把一個 1278px 高的架構圖放進 900px 的滿版頁，下面 378px 會被靜靜裁掉。
//
// 這是 v0.2 的第一批重新生成（Task 37）實際撞到的問題，不是假想情境。
//
// 做法：量子元素的**自然高度**（transform 不影響 layout，所以量到的一直是自然值、
// 不會與縮放形成回饋迴圈），需要時才等比縮小；夠放就不動（scale 上限 1，不放大）。

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

export interface FitToAreaProps {
  /** 來自 CustomSlideProps 的可用區 */
  area: { w: number; h: number };
  /** 縮放後在可用區內的垂直對齊。預設 center */
  align?: "top" | "center";
  children: ReactNode;
}

export function FitToArea({ area, align = "center", children }: FitToAreaProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [natural, setNatural] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      const h = el.scrollHeight;
      setNatural((prev) => (Math.abs(prev - h) > 1 ? h : prev));
    };
    check();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(check) : null;
    ro?.observe(el);
    for (const kid of Array.from(el.children)) ro?.observe(kid);
    const raf = requestAnimationFrame(check);
    return () => {
      ro?.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  const scale = natural > area.h && natural > 0 ? area.h / natural : 1;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        display: "flex",
        justifyContent: "center",
        alignItems: align === "top" ? "flex-start" : "center",
      }}
    >
      {/* 佔位盒：寬高是縮放後的實際視覺尺寸，讓外層 flex 能正確居中 */}
      <div style={{ width: area.w * scale, height: natural ? natural * scale : "100%", flex: "none" }}>
        <div ref={ref} style={{ width: area.w, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
