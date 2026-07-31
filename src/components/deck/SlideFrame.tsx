// Slide 分派 + 16:9 等比縮放畫框（Task 25）。縮覽圖 / 主畫布 / 播放全螢幕共用同一份
// 版型元件（1600×900 內部座標），外層以 transform: scale 等比縮放，字級不需 RWD。

import { useEffect, useRef, useState } from "react";
import type { ComponentType, CSSProperties } from "react";
import type { Deck, Slide as SlideData } from "@/lib/decks";
import { FALLBACK_LAYOUT, LAYOUTS } from "./slideLayouts";
import type { LayoutProps } from "./slideLayouts";
import { dkt } from "./theme";

/** ResizeObserver 量測容器尺寸；SSR / 無 ResizeObserver 時安全跳過 */
export function useMeasure() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    if (!ref.current || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, box] as const;
}

export function Slide({
  slide,
  deck,
  index,
  total,
  dark,
  live,
}: {
  slide: SlideData;
  deck: Deck;
  index: number;
  total: number;
  dark: boolean;
  live?: boolean;
}) {
  // 唯一的型別放行點：LAYOUTS 各值只接受自己那個 slide 型別，分派時才在此收斂。
  const L = (LAYOUTS[slide.layout] ?? FALLBACK_LAYOUT) as ComponentType<LayoutProps>;
  return <L s={slide} dark={dark} deck={deck} index={index} total={total} live={live} />;
}

export interface SlideFrameProps {
  slide: SlideData;
  deck: Deck;
  index: number;
  total: number;
  dark: boolean;
  /** full-visual：true 掛真元件、false（縮覽）顯示占位 */
  live?: boolean;
  width: number;
  radius?: string;
  border?: string;
  shadow?: string;
  style?: CSSProperties;
}

/** 等比縮放的 16:9 畫框 */
export function SlideFrame({ slide, deck, index, total, dark, live, width, radius, border, shadow, style }: SlideFrameProps) {
  const scale = width / 1600;
  return (
    <div
      style={{
        width,
        height: Math.round((width * 9) / 16),
        position: "relative",
        overflow: "hidden",
        borderRadius: radius ?? "var(--radius-lg)",
        border,
        boxShadow: shadow,
        background: dkt(dark).slide,
        ...style,
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, width: 1600, height: 900, transformOrigin: "top left", transform: `scale(${scale})` }}>
        <Slide slide={slide} deck={deck} index={index} total={total} dark={dark} live={live} />
      </div>
    </div>
  );
}
