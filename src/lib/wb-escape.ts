// Escape 的關閉順序（規格 §4.5）：Palette → Modal → Drawer → Sidebar 抽屜。
// 做法是一個簡單的堆疊 —— 後開的浮層在上面，Escape 只關最上面那一個。
// 各浮層都走這裡，不要各自掛 keydown，否則一次 Escape 會同時關掉好幾層。
//
// ES module 在同一頁是單例，不同 island 共用同一份堆疊。

type Close = () => void;

const stack: Close[] = [];
let bound = false;

function onKey(e: KeyboardEvent): void {
  if (e.key !== "Escape" || e.defaultPrevented || stack.length === 0) return;
  e.preventDefault();
  stack[stack.length - 1]();
}

/** 登記一個可被 Escape 關閉的浮層；回傳的函式用來取消登記（浮層關閉或卸載時呼叫）。 */
export function pushEscape(close: Close): () => void {
  if (typeof window === "undefined") return () => {};
  if (!bound) {
    window.addEventListener("keydown", onKey);
    bound = true;
  }
  stack.push(close);
  return () => {
    const i = stack.lastIndexOf(close);
    if (i >= 0) stack.splice(i, 1);
  };
}
