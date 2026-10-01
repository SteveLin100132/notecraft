// 頁籤的浮層外殼：右鍵選單與全部頁籤下拉共用（規格 §6.3；對照 prototype NtPop）。
// - position:fixed、夾在視窗內 8px；scrim 吃掉點外部與外部右鍵
// - Escape 走 wb-escape 堆疊（不自己掛 keydown）
// - 關閉後焦點回到觸發元素
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { pushEscape } from "@/lib/wb-escape";

export interface TabPopProps {
  x: number;
  y: number;
  /** x 是右緣（下拉從按鈕右下對齊展開） */
  alignRight?: boolean;
  width: number;
  label: string;
  onClose: () => void;
  /** 關閉後要把焦點還給誰 */
  returnFocus?: HTMLElement | null;
  children: ReactNode;
}

export default function TabPop({ x, y, alignRight = false, width, label, onClose, returnFocus, children }: TabPopProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; op: number }>({ left: x, top: y, op: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let l = alignRight ? x - el.offsetWidth : x;
    let t = y;
    l = Math.max(8, Math.min(l, window.innerWidth - el.offsetWidth - 8));
    t = Math.max(8, Math.min(t, window.innerHeight - el.offsetHeight - 8));
    setPos({ left: l, top: t, op: 1 });
  }, [x, y, alignRight]);

  useEffect(() => {
    const pop = pushEscape(onClose);
    // 開 Palette 時先關掉自己（兩者同在 overlay 層）
    window.addEventListener("nc-open-palette", onClose);
    return () => {
      pop();
      window.removeEventListener("nc-open-palette", onClose);
      if (returnFocus && document.contains(returnFocus)) returnFocus.focus();
    };
  }, [onClose, returnFocus]);

  return (
    <>
      <div
        className="nt-pop-scrim"
        onMouseDown={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div ref={ref} className="nt-pop" role="menu" aria-label={label} style={{ left: pos.left, top: pos.top, opacity: pos.op, width }}>
        {children}
      </div>
    </>
  );
}

/** 選單內 ↑／↓ 在可用項目間移動焦點 */
export function menuArrows(e: React.KeyboardEvent<HTMLElement>, selector = '[role="menuitem"]:not(:disabled)'): void {
  if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
  const root = e.currentTarget;
  const items = Array.from(root.querySelectorAll<HTMLElement>(selector));
  if (items.length === 0) return;
  e.preventDefault();
  const i = items.indexOf(document.activeElement as HTMLElement);
  const n = e.key === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
  items[i < 0 ? 0 : n].focus();
}
