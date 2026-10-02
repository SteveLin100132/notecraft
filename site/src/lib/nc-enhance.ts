// 筆記頁的漸進增強（分頁切換、行內提示定位、程式碼註解、複製鈕），移植自 app 的
// src/pages/notes/[...slug].astro 底部的 <script>。行為照抄，只差兩點：
// - 作用範圍是傳進來的示範框，而不是整份 document；回傳清除函式，原文改了重新渲染時先拆掉舊的
// - 定位用的捲動容器：app 是 #nc-scroll，文件頁沒有，退回視窗（與 app 找不到 #nc-scroll 時相同）

type Off = () => void;

function on<K extends keyof HTMLElementEventMap>(el: HTMLElement, type: K, fn: (e: HTMLElementEventMap[K]) => void, offs: Off[]) {
  el.addEventListener(type, fn as EventListener);
  offs.push(() => el.removeEventListener(type, fn as EventListener));
}

function initTabs(root: HTMLElement, offs: Off[]) {
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const panels = Array.from(root.querySelectorAll<HTMLElement>('[role="tabpanel"]'));
  if (!tabs.length) return;
  root.setAttribute("data-enhanced", "");
  const select = (i: number) => {
    tabs.forEach((tab, j) => {
      const selected = j === i;
      tab.setAttribute("aria-selected", selected ? "true" : "false");
      tab.tabIndex = selected ? 0 : -1;
      if (panels[j]) panels[j].hidden = !selected;
    });
  };
  tabs.forEach((tab, i) => {
    on(tab, "click", () => {
      select(i);
      tab.focus();
    }, offs);
    on(tab, "keydown", (e) => {
      let next: number | null = null;
      if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
      else if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = tabs.length - 1;
      else return;
      e.preventDefault();
      select(next);
      tabs[next].focus();
    }, offs);
  });
  const initial = tabs.findIndex((t) => t.getAttribute("aria-selected") === "true");
  select(initial < 0 ? 0 : initial);
}

function positionTip(tip: HTMLElement) {
  const bubble = tip.querySelector<HTMLElement>(".nc-tip__bubble");
  if (!bubble) return;
  bubble.style.left = "0px";
  bubble.style.top = "0px";
  const tr = tip.getBoundingClientRect();
  const bw = bubble.offsetWidth;
  const bh = bubble.offsetHeight;
  const minX = 8;
  const maxX = window.innerWidth - 8;
  let left = tr.left + tr.width / 2 - bw / 2;
  left = Math.max(minX, Math.min(left, maxX - bw));
  let top = tr.top - bh - 9;
  const below = top < 8;
  if (below) top = tr.bottom + 9;
  bubble.style.left = `${Math.round(left)}px`;
  bubble.style.top = `${Math.round(top)}px`;
  bubble.style.setProperty("--nc-tip-arrow", `${Math.round(tr.left + tr.width / 2 - left)}px`);
  bubble.classList.toggle("nc-tip__bubble--below", below);
}

function initAnnotate(root: HTMLElement, offs: Off[]) {
  const markers = Array.from(root.querySelectorAll<HTMLElement>(".nc-anno-marker"));
  const items = Array.from(root.querySelectorAll<HTMLElement>(".nc-anno-item"));
  if (!markers.length || !items.length) return;
  root.setAttribute("data-enhanced", "");
  const byN = new Map<string, HTMLElement>();
  items.forEach((it) => {
    const n = it.getAttribute("data-anno");
    if (n) byN.set(n, it);
  });
  let openItem: HTMLElement | null = null;
  let openMarker: HTMLElement | null = null;
  const close = () => {
    openItem?.classList.remove("is-open");
    openMarker?.setAttribute("aria-expanded", "false");
    openItem = null;
    openMarker = null;
  };
  const position = (item: HTMLElement, marker: HTMLElement) => {
    item.style.left = "0px";
    item.style.top = "0px";
    const tr = marker.getBoundingClientRect();
    const bw = item.offsetWidth;
    const bh = item.offsetHeight;
    let left = tr.left + tr.width / 2 - bw / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - 8 - bw));
    let top = tr.bottom + 8;
    if (top + bh > window.innerHeight - 8) top = Math.max(8, tr.top - bh - 8);
    item.style.left = `${Math.round(left)}px`;
    item.style.top = `${Math.round(top)}px`;
  };
  const open = (marker: HTMLElement) => {
    const n = marker.getAttribute("data-anno");
    const item = n ? byN.get(n) : null;
    if (!item) return;
    close();
    item.classList.add("is-open");
    marker.setAttribute("aria-expanded", "true");
    openItem = item;
    openMarker = marker;
    position(item, marker);
  };
  markers.forEach((marker) => {
    const n = marker.getAttribute("data-anno");
    const item = n ? byN.get(n) : null;
    if (item) marker.setAttribute("aria-controls", item.id);
    marker.setAttribute("aria-expanded", "false");
    const toggle = () => (openMarker === marker ? close() : open(marker));
    on(marker, "click", (e) => {
      e.stopPropagation();
      toggle();
    }, offs);
    on(marker, "keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    }, offs);
  });
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" && openMarker) {
      const m = openMarker;
      close();
      m.focus();
    }
  };
  const onDocClick = (e: MouseEvent) => {
    if (openItem && !openItem.contains(e.target as Node)) close();
  };
  // 氣泡是 position: fixed；文件頁是整頁捲動（app 是捲內層），捲動時直接收起來
  const onMove = () => {
    if (openItem) close();
  };
  document.addEventListener("keydown", onKey);
  document.addEventListener("click", onDocClick);
  window.addEventListener("resize", onMove);
  window.addEventListener("scroll", onMove, { passive: true });
  offs.push(() => {
    document.removeEventListener("keydown", onKey);
    document.removeEventListener("click", onDocClick);
    window.removeEventListener("resize", onMove);
    window.removeEventListener("scroll", onMove);
  });
}

async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

function initCopy(btn: HTMLButtonElement, offs: Off[]) {
  const label = btn.querySelector<HTMLElement>(".nc-cb__copy-label");
  const textCopy = label?.dataset.copy ?? "複製";
  const textCopied = label?.dataset.copied ?? "已複製";
  let timer: number | undefined;
  const show = (text: string, copied: boolean, ms: number) => {
    btn.classList.toggle("is-copied", copied);
    if (label) label.textContent = text;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      btn.classList.remove("is-copied");
      if (label) label.textContent = textCopy;
    }, ms);
  };
  on(btn, "click", async () => {
    if (await writeClipboard(btn.getAttribute("data-code") ?? "")) {
      show(textCopied, true, 1600);
      return;
    }
    const codeEl = btn.closest(".nc-cb")?.querySelector(".nc-cb__code");
    if (codeEl) window.getSelection()?.selectAllChildren(codeEl);
    show("無法複製", false, 2400);
  }, offs);
  offs.push(() => window.clearTimeout(timer));
}

/** 對一個示範框套上筆記頁的互動；回傳清除函式。 */
export function enhanceNote(scope: HTMLElement): Off {
  const offs: Off[] = [];
  scope.querySelectorAll<HTMLElement>("[data-nc-tabs]").forEach((el) => initTabs(el, offs));
  scope.querySelectorAll<HTMLElement>(".nc-tip").forEach((tip) => {
    on(tip, "mouseenter", () => positionTip(tip), offs);
    on(tip, "focusin", () => positionTip(tip), offs);
  });
  scope.querySelectorAll<HTMLElement>("[data-nc-annotate]").forEach((el) => initAnnotate(el, offs));
  scope.querySelectorAll<HTMLButtonElement>(".nc-cb__copy").forEach((b) => initCopy(b, offs));
  return () => offs.forEach((f) => f());
}
