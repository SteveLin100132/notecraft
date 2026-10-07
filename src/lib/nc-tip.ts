// Tooltips（PRD §7.1 / task-16）定位：氣泡採 position:fixed，於 hover / focus 時以 JS
// 夾在內容捲動區內，避免被 table/tabs 的 overflow 裁切、超出視窗或被 sidebar 遮蔽。
// 筆記頁與預覽卡（RefLayer）共用。

export function positionTip(tip: HTMLElement): void {
  const bubble = tip.querySelector<HTMLElement>(".nc-tip__bubble");
  if (!bubble) return;
  bubble.style.left = "0px";
  bubble.style.top = "0px";
  const tr = tip.getBoundingClientRect();
  const bw = bubble.offsetWidth;
  const bh = bubble.offsetHeight;
  const scroll = document.getElementById("nc-scroll");
  const sr = scroll ? scroll.getBoundingClientRect() : ({ left: 8, right: window.innerWidth - 8, top: 8 } as DOMRect);
  const minX = Math.max(8, sr.left + 8);
  const maxX = Math.min(window.innerWidth - 8, sr.right - 8);
  let left = tr.left + tr.width / 2 - bw / 2;
  left = Math.max(minX, Math.min(left, maxX - bw));
  let top = tr.top - bh - 9;
  const below = top < sr.top + 8;
  if (below) top = tr.bottom + 9;
  bubble.style.left = `${Math.round(left)}px`;
  bubble.style.top = `${Math.round(top)}px`;
  bubble.style.setProperty("--nc-tip-arrow", `${Math.round(tr.left + tr.width / 2 - left)}px`);
  bubble.classList.toggle("nc-tip__bubble--below", below);
}

export function initTips(scope: ParentNode): void {
  scope.querySelectorAll<HTMLElement>(".nc-tip").forEach((tip) => {
    if (tip.dataset.ncTip) return;
    tip.dataset.ncTip = "1";
    tip.addEventListener("mouseenter", () => positionTip(tip));
    tip.addEventListener("focusin", () => positionTip(tip));
  });
}
