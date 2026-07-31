// dev-only 溢出偵測（Task 35 — 契約 v0.2 §7.3）。
//
// 為什麼需要：1600×900 是固定座標系、SlideFrame 是 overflow:hidden，
// 內容溢出**不報錯、只會被靜靜裁掉**，而 `tsc` 與 `astro build` 永遠測不到。
// v0.1 靠 block 型別上限擋，`custom` 頁擋不到了。
//
// 量測對象刻意是 **custom 頁的內容區 vs 它拿到的 area**，不是整張 1600×900 畫框：
// cover / section 有刻意出血的裝飾圓（right: -120 等），量整張畫框會每頁誤報。
//
// 這是截圖驗證的**補強而非替代** —— 用 position:absolute 溢出座標系外的內容
// 不一定撐開父容器，是已知盲區。

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

export interface OverflowInfo {
  dw: number;
  dh: number;
}

/**
 * 回傳 [ref, over]。把 ref 掛在「應該剛好塞滿 area」的容器上。
 * 只在 dev 生效；prod 恆回 null，且整段邏輯會被 Vite 消除。
 */
export function useOverflowProbe(
  area: { w: number; h: number },
  label: string,
): [RefObject<HTMLDivElement>, OverflowInfo | null] {
  const ref = useRef<HTMLDivElement>(null);
  const [over, setOver] = useState<OverflowInfo | null>(null);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const el = ref.current;
    if (!el) return;

    let last = "";
    const check = () => {
      // 容差 1px：瀏覽器次像素捨入會讓剛好塞滿的內容多出 0.x px
      const dw = Math.round(el.scrollWidth - area.w);
      const dh = Math.round(el.scrollHeight - area.h);
      const next = dw > 1 || dh > 1 ? { dw: Math.max(0, dw), dh: Math.max(0, dh) } : null;
      const key = next ? `${next.dw}x${next.dh}` : "";
      if (key === last) return;
      last = key;
      setOver(next);
      if (next) {
        console.warn(
          `[deck] 內容溢出，會被裁掉：${label} —— 超出 ${next.dw}px 寬 / ${next.dh}px 高` +
            `（可用區 ${area.w}×${area.h}）。請減少內容或切頁（契約 §7.1）。`,
        );
      }
    };

    check();

    // 字型、圖表、圖片可能晚一步才撐開內容 → 需要追蹤變化。
    //
    // ⚠️ 只 observe(el) 是無效的：el 的高度固定為 100%，它自己的盒子永遠不變，
    // 子元素長高不會觸發回呼（第一版就是這樣漏報的）。必須觀察**子元素**，
    // 並用 MutationObserver 接住「子元素數量改變」的情況。
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(check) : null;
    const observeKids = () => {
      if (!ro) return;
      ro.disconnect();
      ro.observe(el);
      for (const kid of Array.from(el.children)) ro.observe(kid);
    };
    observeKids();

    const mo =
      typeof MutationObserver !== "undefined"
        ? new MutationObserver(() => {
            observeKids();
            check();
          })
        : null;
    mo?.observe(el, { childList: true, subtree: true });

    // 字型載入完成會改變文字高度
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    fonts?.ready.then(check).catch(() => {});
    const raf = requestAnimationFrame(check);

    return () => {
      ro?.disconnect();
      mo?.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [area.w, area.h, label]);

  return [ref, over];
}

/** 溢出時疊一層紅框 + 角標。不影響版面（絕對定位、pointer-events: none）。 */
export function OverflowBadge({ over }: { over: OverflowInfo | null }) {
  if (!import.meta.env.DEV || !over) return null;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        outline: "3px solid var(--danger-500)",
        outlineOffset: -3,
        zIndex: 50,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          padding: "4px 10px",
          background: "var(--danger-500)",
          color: "var(--neutral-0)",
          fontSize: 15,
          fontWeight: 800,
          fontFamily: "var(--font-mono)",
          borderBottomLeftRadius: "var(--radius-sm)",
        }}
      >
        OVERFLOW +{over.dw}×{over.dh}
      </span>
    </div>
  );
}
