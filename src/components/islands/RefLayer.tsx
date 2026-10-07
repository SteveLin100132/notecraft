// 定義與引用的閱讀端互動（docs/notecraft-workbench-define-ref.md §7；像素與時序見 design_handoff_workbench_define_ref §1、§3、§5、§6、§8）。
//
// - :ref 預覽卡：hover 300ms／focus 150ms 開卡、150ms 關閉寬限；點擊或 Enter 固定；修飾鍵點擊走原生（新分頁）
// - 手機（≤860px）或沒有 hover 的裝置：底部 sheet
// - define 的「被 N 篇引用」popover、id 複製、前往來源後的落點 flash
//
// 不改 MDX 輸出的 DOM 結構：以事件委派監聽，只切換 aria-expanded／.on／.is-open／.flash。
// 卡片內容從頁面上隱藏的 [data-nc-def] 複製（build 期就備好，沒有載入中狀態）。
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, ChevronDown, CornerDownRight, FileText, Hash, X } from "lucide-react";
import { pushEscape } from "@/lib/wb-escape";
import { COPY_FAILED_MSG, writeClipboard } from "@/lib/clipboard";
import { toast } from "@/lib/toast";
import { withBase } from "@/lib/base";
import { initAllTabs } from "@/lib/nc-tabs";
import { initTips } from "@/lib/nc-tip";

type Kind = "inc" | "ref";
export interface RefLayerBacklink {
  slug: string;
  title: string;
  folder: string;
  kinds: Kind[];
}
export interface RefLayerDef {
  id: string;
  label: string;
  refs: RefLayerBacklink[];
}

const DELAY_HOVER = 300;
const DELAY_FOCUS = 150;
const GRACE = 150;
const GAP = 8;
const EDGE = 12;
const FLASH_MS = 1600;
const FILTER_MIN = 10;
const SHEET_MQ = "(max-width: 860px), (hover: none)";

const isSheet = () => typeof window !== "undefined" && window.matchMedia(SHEET_MQ).matches;
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** 卡片放在 anchor 下方 8px，放不下且上方較大就翻上去；都放不下就夾在視窗內（handoff §3.3）。 */
function place(anchor: Element, card: HTMLElement, alignOffset: number): { left: number; top: number; up: boolean } {
  const rects = anchor.getClientRects();
  const first = rects[0] ?? anchor.getBoundingClientRect();
  const last = rects[rects.length - 1] ?? first;
  const w = card.offsetWidth;
  const h = card.offsetHeight;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const below = vh - EDGE - (last.bottom + GAP);
  const above = first.top - GAP - EDGE;
  let up = false;
  let top: number;
  let left: number;
  if (h <= below || below >= above) {
    top = last.bottom + GAP;
    left = last.left - alignOffset;
    if (h > below) top = Math.max(EDGE, vh - EDGE - h);
  } else {
    up = true;
    top = first.top - GAP - h;
    left = first.left - alignOffset;
    if (h > above) top = EDGE;
  }
  left = Math.max(EDGE, Math.min(left, vw - w - EDGE));
  return { left: Math.round(left), top: Math.round(top), up };
}

/** 預覽內容（remark-notecraft-defs 輸出在 hidden 容器裡；不用 <template>，見該檔說明） */
function templateOf(id: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-nc-def-templates] > [data-nc-def="${CSS.escape(id)}"]`);
}

/** 複製進卡片的內容：id 換上卡片前綴（同一份 template 的 id 不會和頁面撞，但保險起見），並啟用 tabs／tip。 */
function fillBody(body: HTMLElement, tpl: HTMLElement, prefix: string): void {
  const frag = document.createDocumentFragment();
  tpl.childNodes.forEach((n) => frag.appendChild(n.cloneNode(true)));
  // 頁面的 inline script 已初始化過隱藏的原件；複製出來的沒有事件，要重新初始化
  frag.querySelectorAll("[data-enhanced]").forEach((el) => el.removeAttribute("data-enhanced"));
  frag.querySelectorAll("[data-nc-tip]").forEach((el) => el.removeAttribute("data-nc-tip"));
  const ids = new Map<string, string>();
  frag.querySelectorAll<HTMLElement>("[id]").forEach((el) => {
    const next = `${prefix}${el.id}`;
    ids.set(el.id, next);
    el.id = next;
  });
  for (const attr of ["aria-controls", "aria-labelledby", "aria-describedby"]) {
    frag.querySelectorAll<HTMLElement>(`[${attr}]`).forEach((el) => {
      const v = (el.getAttribute(attr) ?? "").split(/\s+/).map((x) => ids.get(x) ?? x).join(" ");
      el.setAttribute(attr, v);
    });
  }
  body.replaceChildren(frag);
  initAllTabs(body);
  initTips(body);
}

const FOCUSABLE = 'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';

interface CardState {
  id: string;
  el: HTMLAnchorElement;
  pinned: boolean;
}

export default function RefLayer({ defs = [], isDev = false }: { defs?: RefLayerDef[]; isDev?: boolean }) {
  const [card, setCard] = useState<CardState | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [clipped, setClipped] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; up: boolean } | null>(null);
  const [sheet, setSheet] = useState(false);
  const [bl, setBl] = useState<{ id: string; btn: HTMLButtonElement } | null>(null);
  const [blPos, setBlPos] = useState<{ left: number; top: number; up: boolean } | null>(null);
  const [blSheet, setBlSheet] = useState(false);
  const [q, setQ] = useState("");

  const cardRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const blRef = useRef<HTMLDivElement>(null);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);
  const suppress = useRef<Element | null>(null);
  const cardNow = useRef<CardState | null>(null);
  cardNow.current = card;
  const blNow = useRef<{ id: string; btn: HTMLButtonElement } | null>(null);
  blNow.current = bl;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const clearTimers = () => {
    if (openTimer.current) window.clearTimeout(openTimer.current);
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    openTimer.current = closeTimer.current = null;
  };

  const closeCard = useCallback((returnFocus: boolean) => {
    clearTimers();
    const c = cardNow.current;
    if (!c) return;
    c.el.classList.remove("on");
    c.el.setAttribute("aria-expanded", "false");
    c.el.removeAttribute("aria-controls");
    if (returnFocus && document.contains(c.el)) {
      suppress.current = c.el;
      c.el.focus({ preventScroll: true });
    }
    setCard(null);
    setPos(null);
    setExpanded(false);
    setClipped(false);
  }, []);

  const openCard = useCallback((el: HTMLAnchorElement, pinned: boolean) => {
    clearTimers();
    const id = el.dataset.def ?? "";
    if (!templateOf(id)) return;
    const prev = cardNow.current;
    if (prev && prev.el !== el) {
      prev.el.classList.remove("on");
      prev.el.setAttribute("aria-expanded", "false");
      prev.el.removeAttribute("aria-controls");
    }
    el.classList.add("on");
    el.setAttribute("aria-expanded", "true");
    el.setAttribute("aria-controls", "rf-pop");
    setSheet(isSheet());
    setExpanded(false);
    setCard({ id, el, pinned });
  }, []);

  const closeBl = useCallback((returnFocus: boolean) => {
    const cur = blNow.current;
    if (cur) {
      cur.btn.setAttribute("aria-expanded", "false");
      cur.btn.closest(".nc-def")?.classList.remove("is-open");
      if (returnFocus && document.contains(cur.btn)) cur.btn.focus({ preventScroll: true });
    }
    setBl(null);
    setBlPos(null);
    setQ("");
  }, []);

  // ── 事件委派 ────────────────────────────────────────────────
  useEffect(() => {
    const refOf = (t: EventTarget | null) =>
      t instanceof Element ? (t.closest("a.nc-ref:not(.is-static)") as HTMLAnchorElement | null) : null;
    const inCard = (t: EventTarget | null) => t instanceof Node && !!cardRef.current?.contains(t);

    const onOver = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || isSheet()) return;
      const el = refOf(e.target);
      if (!el) return;
      const c = cardNow.current;
      if (closeTimer.current && c?.el === el) {
        window.clearTimeout(closeTimer.current);
        closeTimer.current = null;
      }
      if (c?.pinned || c?.el === el) return;
      if (openTimer.current) window.clearTimeout(openTimer.current);
      openTimer.current = window.setTimeout(() => openCard(el, false), DELAY_HOVER);
    };
    const onOut = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const el = refOf(e.target);
      if (!el || refOf(e.relatedTarget) === el || inCard(e.relatedTarget)) return;
      if (openTimer.current && !cardNow.current) {
        window.clearTimeout(openTimer.current);
        openTimer.current = null;
      }
      const c = cardNow.current;
      if (c && !c.pinned && c.el === el) closeTimer.current = window.setTimeout(() => closeCard(false), GRACE);
    };
    const onFocusIn = (e: FocusEvent) => {
      const el = refOf(e.target);
      if (!el) return;
      if (suppress.current === el) {
        suppress.current = null;
        return;
      }
      if (cardNow.current?.pinned || isSheet() || !el.matches(":focus-visible")) return;
      if (openTimer.current) window.clearTimeout(openTimer.current);
      openTimer.current = window.setTimeout(() => openCard(el, false), DELAY_FOCUS);
    };
    const onFocusOut = (e: FocusEvent) => {
      const el = refOf(e.target);
      if (!el) return;
      if (openTimer.current) {
        window.clearTimeout(openTimer.current);
        openTimer.current = null;
      }
      const c = cardNow.current;
      if (c && !c.pinned && c.el === el && !inCard(e.relatedTarget)) closeTimer.current = window.setTimeout(() => closeCard(false), GRACE);
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target instanceof Element ? e.target : null;
      if (!t) return;
      const el = refOf(t);
      if (el) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return; // 原生：新分頁開來源
        e.preventDefault();
        const c = cardNow.current;
        if (c && c.el === el && c.pinned) closeCard(false);
        else openCard(el, true);
        return;
      }
      const cnt = t.closest<HTMLButtonElement>("button.nc-def-cnt");
      if (cnt) {
        const id = cnt.dataset.def ?? "";
        const cur = blNow.current;
        if (cur?.btn === cnt) {
          closeBl(false);
          return;
        }
        if (cur) {
          cur.btn.setAttribute("aria-expanded", "false");
          cur.btn.closest(".nc-def")?.classList.remove("is-open");
        }
        cnt.setAttribute("aria-expanded", "true");
        cnt.closest(".nc-def")?.classList.add("is-open");
        setBlSheet(isSheet());
        setQ("");
        setBlPos(null);
        setBl({ id, btn: cnt });
        return;
      }
      const copy = t.closest<HTMLButtonElement>("button.nc-def-id");
      if (copy) {
        const url = new URL(copy.dataset.ncCopy ?? "", location.origin).href;
        void writeClipboard(url).then((ok) => toast(ok ? "已複製定義連結" : COPY_FAILED_MSG, ok ? "check" : undefined));
      }
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target;
      const c = cardNow.current;
      if (c?.pinned && !inCard(t) && !refOf(t)) closeCard(false);
      if (blRef.current && t instanceof Node && !blRef.current.contains(t) && !(t instanceof Element && t.closest("button.nc-def-cnt"))) {
        closeBl(false);
      }
    };
    document.addEventListener("pointerover", onOver);
    document.addEventListener("pointerout", onOut);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    document.addEventListener("click", onClick);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("click", onClick);
      document.removeEventListener("pointerdown", onDown);
      clearTimers();
    };
  }, [openCard, closeCard, closeBl]);

  // ── 卡片內容與定位 ──────────────────────────────────────────
  useLayoutEffect(() => {
    if (!card || !bodyRef.current) return;
    const tpl = templateOf(card.id);
    if (!tpl) return;
    fillBody(bodyRef.current, tpl, "pv-");
    setClipped(!sheet && bodyRef.current.scrollHeight > bodyRef.current.clientHeight + 1);
  }, [card?.id, card?.el, sheet]);

  const reposition = useCallback(() => {
    const c = cardNow.current;
    if (c && cardRef.current && !sheet) setPos(place(c.el, cardRef.current, 14));
    const b = blNow.current;
    if (b && blRef.current && !blSheet) setBlPos(place(b.btn, blRef.current, 0));
  }, [sheet, blSheet]);

  useLayoutEffect(() => {
    reposition();
  }, [card, expanded, clipped, bl, reposition]);

  useEffect(() => {
    if (!card && !bl) return;
    const onScroll = () => {
      const c = cardNow.current;
      if (c && !c.pinned) {
        const r = c.el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) {
          closeCard(false);
          return;
        }
      }
      reposition();
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    const ro = new ResizeObserver(() => reposition());
    if (cardRef.current) ro.observe(cardRef.current);
    if (blRef.current) ro.observe(blRef.current);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      ro.disconnect();
    };
  }, [card, bl, reposition, closeCard]);

  // 固定的卡片：焦點移進卡片；Esc 關閉並還焦點
  useEffect(() => {
    if (!card) return;
    if (card.pinned) cardRef.current?.focus({ preventScroll: true });
    return pushEscape(() => closeCard(true));
  }, [card?.id, card?.el, card?.pinned, closeCard]);

  useEffect(() => {
    if (!bl) return;
    blRef.current?.focus({ preventScroll: true });
    return pushEscape(() => closeBl(true));
  }, [bl, closeBl]);

  // ── 前往來源後的落點 flash（handoff §1「導覽落點」）──────────────
  useEffect(() => {
    const land = () => {
      const h = decodeURIComponent(location.hash.slice(1));
      if (!h.startsWith("def-")) return;
      const sec = document.getElementById(h);
      if (!sec) return;
      // 捲動還原的 inline script 遇到 hash 會讓位；再晚一拍，等瀏覽器自己的錨點捲動結束
      window.setTimeout(() => {
        const scroller = document.getElementById("nc-scroll");
        if (scroller) {
          const top = sec.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - 32;
          scroller.scrollTo({ top, behavior: "auto" });
        } else sec.scrollIntoView({ block: "start" });
        sec.focus({ preventScroll: true });
        sec.classList.remove("flash");
        void sec.offsetWidth;
        sec.classList.add("flash");
        window.setTimeout(() => sec.classList.remove("flash"), FLASH_MS);
      }, 90);
    };
    land();
    window.addEventListener("hashchange", land);
    return () => window.removeEventListener("hashchange", land);
  }, []);

  const onCardKey = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || !card?.pinned || !cardRef.current) return;
    const items = Array.from(cardRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((x) => x.offsetParent !== null);
    const first = items[0];
    const last = items[items.length - 1];
    const at = document.activeElement;
    if ((!e.shiftKey && (at === last || items.length === 0)) || (e.shiftKey && (at === first || at === cardRef.current))) {
      e.preventDefault();
      closeCard(true);
    }
  };

  if (!mounted) return null;

  const tpl = card ? templateOf(card.id) : null;
  const label = tpl?.dataset.label ?? "";
  const srcTitle = tpl?.dataset.srcTitle ?? "";
  const srcFolder = tpl?.dataset.srcFolder ?? "";
  const href = tpl?.dataset.href ?? "#";
  const anim = reducedMotion() ? "" : pos?.up ? " anim-up" : " anim";

  const cardEl = card && (
    sheet ? (
      <div className="nc-sheet-wrap">
        <button type="button" className="nc-sheet-scrim" aria-label="關閉" tabIndex={-1} onClick={() => closeCard(true)} />
        <div ref={cardRef} id="rf-pop" className="nc-sheet" role="dialog" aria-modal="true" aria-labelledby="rf-pop-t" tabIndex={-1} onKeyDown={onCardKey}>
          <div className="nc-sheet-grip" aria-hidden="true" />
          <div className="nc-pop-h">
            <div className="nc-pop-hl">
              <div id="rf-pop-t" className="nc-pop-t">{label}</div>
              <div className="nc-pop-id"># {card.id}</div>
            </div>
            <button type="button" className="nc-pop-x" aria-label="關閉" onClick={() => closeCard(true)}>
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          <div ref={bodyRef} className="nc-pv-b nc-prose is-sheet" tabIndex={0} />
          <div className="nc-pop-f">
            <span className="nc-pop-src">
              來自 <b>{srcTitle}</b>
              {srcFolder ? ` · ${srcFolder}` : ""}
            </span>
            <a className="nc-pop-go is-pill" href={href}>
              開啟來源 <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    ) : (
      <div
        ref={cardRef}
        id="rf-pop"
        className={`nc-pop${anim}`}
        role="dialog"
        aria-modal="false"
        aria-labelledby="rf-pop-t"
        tabIndex={-1}
        style={pos ? { left: pos.left, top: pos.top } : { left: -9999, top: 0 }}
        onPointerEnter={() => {
          if (closeTimer.current) window.clearTimeout(closeTimer.current);
          closeTimer.current = null;
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse" && !cardNow.current?.pinned) closeTimer.current = window.setTimeout(() => closeCard(false), GRACE);
        }}
        onPointerDown={() => {
          const c = cardNow.current;
          if (c && !c.pinned) setCard({ ...c, pinned: true });
        }}
        onKeyDown={onCardKey}
      >
        <div className="nc-pop-h">
          <div className="nc-pop-hl">
            <div id="rf-pop-t" className="nc-pop-t">{label}</div>
            <div className="nc-pop-id"># {card.id}</div>
          </div>
          {card.pinned && (
            <button type="button" className="nc-pop-x" aria-label="關閉" onClick={() => closeCard(true)}>
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
        <div className={`nc-pv-wrap${clipped && !expanded ? " clip" : ""}`}>
          <div ref={bodyRef} className={`nc-pv-b nc-prose${expanded ? " open" : ""}`} tabIndex={expanded ? 0 : undefined} />
          {clipped && !expanded && (
            <button type="button" className="nc-pv-more" onClick={() => setExpanded(true)}>
              <ChevronDown size={13} aria-hidden="true" /> 看完整內容
            </button>
          )}
        </div>
        <div className="nc-pop-f">
          <span className="nc-pop-src">
            來自 <b>{srcTitle}</b>
            {srcFolder ? ` · ${srcFolder}` : ""}
          </span>
          <a className="nc-pop-go" href={href}>
            開啟來源 <ArrowUpRight size={13} aria-hidden="true" />
          </a>
        </div>
      </div>
    )
  );

  const def = bl ? defs.find((d) => d.id === bl.id) : null;
  const rows = def ? def.refs.filter((r) => !q || `${r.title} ${r.folder}`.toLowerCase().includes(q.toLowerCase())) : [];
  const blInner = def && (
    <>
      <div className="nc-pop-h">
        <div className="nc-pop-hl">
          <div id="rf-bl-t" className="nc-pop-t">
            被 {def.refs.length} 篇筆記引用
          </div>
          <div className="nc-pop-id"># {def.id}</div>
        </div>
        <button type="button" className="nc-pop-x" aria-label="關閉" onClick={() => closeBl(true)}>
          <X size={14} aria-hidden="true" />
        </button>
      </div>
      {def.refs.length >= FILTER_MIN && (
        <div className="nc-bl-filter">
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`篩選 ${def.refs.length} 篇筆記…`} aria-label="篩選引用的筆記" />
        </div>
      )}
      {rows.length ? (
        <ul className={`nc-bl-pl${def.refs.length >= FILTER_MIN ? " scroll" : ""}`}>
          {rows.map((r) => (
            <li key={r.slug}>
              <a className="nc-bl-pi" href={withBase(`/notes/${r.slug}`)}>
                <FileText size={14} className="nc-bl-doc" aria-hidden="true" />
                <span className="nc-bl-tx">
                  <span className="nc-bl-ti">{r.title}</span>
                  {r.folder && <span className="nc-bl-fo">{r.folder}</span>}
                </span>
                <span className="nc-bl-kinds">
                  {r.kinds.map((k) => (
                    <span key={k} className="nc-bl-kind" title={k === "inc" ? "嵌入" : "行內引用"}>
                      {k === "inc" ? <CornerDownRight size={11} aria-hidden="true" /> : <Hash size={11} aria-hidden="true" />}
                      {k === "inc" ? "嵌入" : "行內"}
                    </span>
                  ))}
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <div className="nc-bl-none">沒有符合「{q}」的筆記</div>
      )}
      {isDev && (
        <div className="nc-pop-acts">
          <button type="button" onClick={() => void writeClipboard(`::include{id="${def.id}"}`).then((ok) => toast(ok ? "已複製 include 語法" : COPY_FAILED_MSG, ok ? "check" : undefined))}>
            複製 include 語法
          </button>
          <button type="button" onClick={() => void writeClipboard(`:ref[${def.label}]{id="${def.id}"}`).then((ok) => toast(ok ? "已複製 ref 語法" : COPY_FAILED_MSG, ok ? "check" : undefined))}>
            複製 ref 語法
          </button>
        </div>
      )}
    </>
  );
  const blEl =
    def &&
    (blSheet ? (
      <div className="nc-sheet-wrap">
        <button type="button" className="nc-sheet-scrim" aria-label="關閉" tabIndex={-1} onClick={() => closeBl(true)} />
        <div ref={blRef} className="nc-sheet nc-bl-pop" role="dialog" aria-modal="true" aria-labelledby="rf-bl-t" tabIndex={-1}>
          <div className="nc-sheet-grip" aria-hidden="true" />
          {blInner}
        </div>
      </div>
    ) : (
      <div
        ref={blRef}
        className={`nc-pop nc-bl-pop${reducedMotion() ? "" : blPos?.up ? " anim-up" : " anim"}`}
        role="dialog"
        aria-modal="false"
        aria-labelledby="rf-bl-t"
        tabIndex={-1}
        style={blPos ? { left: blPos.left, top: blPos.top } : { left: -9999, top: 0 }}
      >
        {blInner}
      </div>
    ));

  return createPortal(
    <>
      {cardEl}
      {blEl}
    </>,
    document.body,
  );
}
