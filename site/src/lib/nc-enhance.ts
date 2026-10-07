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

// ── 定義與引用（app 的 islands/RefLayer.tsx 的精簡移植）──────────────────
// 行內引用的預覽卡：hover 300ms 開、離開 150ms 關、點擊固定、Esc／點外面關閉；卡片內容複製自頁面上隱藏的 [data-nc-def]。
// 「被 N 篇引用」列出示範裡引用它的檔案。卡片掛在示範框（.ncp）裡，才吃得到筆記樣式與 token。
// 文件頁是整頁捲動，卡片是 position: fixed：沒固定的卡片捲動就收起來，固定的跟著重新定位。

export type DefsBacklink = { slug: string; title: string; kinds: ("inc" | "ref")[] };

const GAP = 8;
const EDGE = 12;

function place(anchor: Element, card: HTMLElement, alignOffset: number) {
  const rects = anchor.getClientRects();
  const first = rects[0] ?? anchor.getBoundingClientRect();
  const last = rects[rects.length - 1] ?? first;
  const w = card.offsetWidth;
  const h = card.offsetHeight;
  const below = window.innerHeight - EDGE - (last.bottom + GAP);
  const above = first.top - GAP - EDGE;
  let top: number;
  let left: number;
  let up = false;
  if (h <= below || below >= above) {
    top = last.bottom + GAP;
    left = last.left - alignOffset;
    if (h > below) top = Math.max(EDGE, window.innerHeight - EDGE - h);
  } else {
    up = true;
    top = first.top - GAP - h;
    left = first.left - alignOffset;
    if (h > above) top = EDGE;
  }
  left = Math.max(EDGE, Math.min(left, window.innerWidth - w - EDGE));
  card.style.left = `${Math.round(left)}px`;
  card.style.top = `${Math.round(top)}px`;
  card.classList.toggle("anim-up", up);
  card.classList.toggle("anim", !up);
}

function el(tag: string, cls: string, text?: string): HTMLElement {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

/**
 * 對示範框套上定義與引用的互動；回傳清除函式。
 * onGo(slug, hash)：點了指向某篇筆記的連結（前往來源、開啟來源、反向連結清單）——示範裡沒有真的頁面，交給呼叫端切換檔案。
 */
export function enhanceDefs(scope: HTMLElement, backlinks: Record<string, DefsBacklink[]>, onGo: (slug: string, hash: string) => void): Off {
  const offs: Off[] = [];
  let card: HTMLElement | null = null;
  let cardOff: Off | null = null;
  let anchor: HTMLElement | null = null;
  let pinned = false;
  let openT: number | undefined;
  let closeT: number | undefined;

  const close = () => {
    window.clearTimeout(openT);
    window.clearTimeout(closeT);
    cardOff?.();
    cardOff = null;
    card?.remove();
    card = null;
    if (anchor) {
      anchor.classList.remove("on");
      anchor.setAttribute("aria-expanded", "false");
      anchor.closest(".nc-def")?.classList.remove("is-open");
    }
    anchor = null;
    pinned = false;
  };

  const header = (title: string, id: string) => {
    const h = el("div", "nc-pop-h");
    const hl = el("div", "nc-pop-hl");
    hl.append(el("div", "nc-pop-t", title), el("div", "nc-pop-id", `# ${id}`));
    const x = el("button", "nc-pop-x", "✕");
    x.setAttribute("type", "button");
    x.setAttribute("aria-label", "關閉");
    x.addEventListener("click", () => {
      const a = anchor;
      close();
      a?.focus();
    });
    h.append(hl, x);
    return h;
  };

  const show = (c: HTMLElement, a: HTMLElement, alignOffset: number) => {
    card = c;
    anchor = a;
    a.classList.add("on");
    a.setAttribute("aria-expanded", "true");
    c.addEventListener("pointerenter", () => window.clearTimeout(closeT));
    c.addEventListener("pointerleave", () => {
      if (!pinned) closeT = window.setTimeout(close, 150);
    });
    c.addEventListener("pointerdown", () => (pinned = true));
    scope.appendChild(c);
    place(a, c, alignOffset);
  };

  const openRef = (a: HTMLAnchorElement, pin: boolean) => {
    const id = a.dataset.def ?? "";
    const tpl = scope.querySelector<HTMLElement>(`[data-nc-def-templates] > [data-nc-def="${CSS.escape(id)}"]`);
    if (!tpl) return;
    close();
    pinned = pin;
    const c = el("div", "nc-pop");
    c.setAttribute("role", "dialog");
    c.setAttribute("aria-label", tpl.dataset.label ?? id);
    c.tabIndex = -1;
    c.appendChild(header(tpl.dataset.label ?? id, id));
    const wrap = el("div", "nc-pv-wrap");
    const body = el("div", "nc-pv-b nc-prose");
    tpl.childNodes.forEach((n) => body.appendChild(n.cloneNode(true)));
    body.querySelectorAll("[id]").forEach((n) => (n.id = `pv-${n.id}`));
    body.querySelectorAll("[aria-controls]").forEach((n) => n.setAttribute("aria-controls", `pv-${n.getAttribute("aria-controls")}`));
    body.querySelectorAll("[aria-describedby]").forEach((n) => n.setAttribute("aria-describedby", `pv-${n.getAttribute("aria-describedby")}`));
    body.querySelectorAll("[data-enhanced]").forEach((n) => n.removeAttribute("data-enhanced"));
    wrap.appendChild(body);
    c.appendChild(wrap);
    const f = el("div", "nc-pop-f");
    const src = el("span", "nc-pop-src");
    src.append("來自 ", el("b", "", tpl.dataset.srcTitle ?? ""));
    const go = el("a", "nc-pop-go", "開啟來源 ↗") as HTMLAnchorElement;
    go.href = tpl.dataset.href ?? "#";
    f.append(src, go);
    c.appendChild(f);
    show(c, a, 14);
    cardOff = enhanceNote(body);
    // 太長就截斷，按「看完整內容」展開內捲
    if (body.scrollHeight > body.clientHeight + 1) {
      wrap.classList.add("clip");
      const more = el("button", "nc-pv-more", "⌄ 看完整內容");
      more.setAttribute("type", "button");
      more.addEventListener("click", () => {
        wrap.classList.remove("clip");
        body.classList.add("open");
        body.tabIndex = 0;
        more.remove();
        if (card && anchor) place(anchor, card, 14);
      });
      wrap.appendChild(more);
      place(a, c, 14);
    }
    if (pin) c.focus({ preventScroll: true });
  };

  const openBacklinks = (btn: HTMLButtonElement) => {
    const id = btn.dataset.def ?? "";
    const list = backlinks[id] ?? [];
    close();
    pinned = true;
    const c = el("div", "nc-pop nc-bl-pop");
    c.setAttribute("role", "dialog");
    c.tabIndex = -1;
    c.appendChild(header(`被 ${list.length} 篇筆記引用`, id));
    const ul = el("ul", "nc-bl-pl");
    for (const r of list) {
      const li = el("li", "");
      const a = el("a", "nc-bl-pi") as HTMLAnchorElement;
      a.href = `/notes/${r.slug}`;
      const tx = el("span", "nc-bl-tx");
      tx.append(el("span", "nc-bl-ti", r.title));
      const kinds = el("span", "nc-bl-kinds");
      for (const k of r.kinds) kinds.append(el("span", "nc-bl-kind", k === "inc" ? "↳ 嵌入" : "# 行內"));
      a.append(tx, kinds);
      li.appendChild(a);
      ul.appendChild(li);
    }
    c.appendChild(ul);
    btn.closest(".nc-def")?.classList.add("is-open");
    show(c, btn, 0);
    c.focus({ preventScroll: true });
  };

  const refOf = (t: EventTarget | null) => (t instanceof Element ? (t.closest("a.nc-ref:not(.is-static)") as HTMLAnchorElement | null) : null);

  const onOver = (e: PointerEvent) => {
    const a = refOf(e.target);
    if (!a || e.pointerType !== "mouse" || pinned || anchor === a) return;
    window.clearTimeout(openT);
    openT = window.setTimeout(() => openRef(a, false), 300);
  };
  const onOut = (e: PointerEvent) => {
    const a = refOf(e.target);
    if (!a || e.pointerType !== "mouse") return;
    window.clearTimeout(openT);
    if (!pinned && anchor === a && !(e.relatedTarget instanceof Node && card?.contains(e.relatedTarget))) closeT = window.setTimeout(close, 150);
  };
  const onClick = (e: MouseEvent) => {
    const t = e.target instanceof Element ? e.target : null;
    if (!t) return;
    const a = refOf(t);
    if (a) {
      e.preventDefault();
      if (anchor === a && pinned) close();
      else openRef(a, true);
      return;
    }
    const cnt = t.closest<HTMLButtonElement>("button.nc-def-cnt");
    if (cnt) {
      if (anchor === cnt) close();
      else openBacklinks(cnt);
      return;
    }
    if (t.closest("button.nc-def-id")) return; // 示範裡沒有真的網址可以複製
    const link = t.closest<HTMLAnchorElement>("a[href]");
    const m = link && /^\/notes\/([^#?]+)(#.*)?$/.exec(decodeURI(link.getAttribute("href") ?? ""));
    if (m) {
      e.preventDefault();
      close();
      onGo(m[1], (m[2] ?? "").slice(1));
    }
  };
  const onDown = (e: PointerEvent) => {
    if (!card) return;
    const t = e.target;
    if (t instanceof Node && (card.contains(t) || anchor?.contains(t))) return;
    close();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "Escape" || !card) return;
    const a = anchor;
    close();
    a?.focus();
  };
  const onMove = () => {
    if (!card || !anchor) return;
    if (!pinned) close();
    else place(anchor, card, card.classList.contains("nc-bl-pop") ? 0 : 14);
  };
  scope.addEventListener("pointerover", onOver);
  scope.addEventListener("pointerout", onOut);
  scope.addEventListener("click", onClick);
  document.addEventListener("pointerdown", onDown);
  document.addEventListener("keydown", onKey);
  window.addEventListener("scroll", onMove, { passive: true });
  window.addEventListener("resize", onMove);
  offs.push(() => {
    close();
    scope.removeEventListener("pointerover", onOver);
    scope.removeEventListener("pointerout", onOut);
    scope.removeEventListener("click", onClick);
    document.removeEventListener("pointerdown", onDown);
    document.removeEventListener("keydown", onKey);
    window.removeEventListener("scroll", onMove);
    window.removeEventListener("resize", onMove);
  });
  return () => offs.forEach((f) => f());
}
