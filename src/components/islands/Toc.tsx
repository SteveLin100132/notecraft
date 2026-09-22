import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { readPrefs } from "@/lib/wb-prefs";

type Level = 1 | 2 | 3;
type Heading = { id: string; label: string; lv: Level };
type Node = Heading & { depth: number; parent: Node | null; hasKids: boolean };

/** 標題距捲動容器頂端小於這個值，就算「已讀到」。 */
const ACTIVE_OFFSET = 140;

/**
 * 依文件順序建樹：parent ＝ 往前第一個層級比自己小的標題（允許跳層，h1 後直接 h3 會掛在 h1 下）。
 * depth 取相對於全文最小層級，只有 h2/h3 的筆記因此 h2 仍是頂層、外觀與改版前一致。
 */
function buildTree(items: Heading[]): Node[] {
  const minLv = Math.min(3, ...items.map((h) => h.lv));
  const flat: Node[] = [];
  for (const h of items) {
    let parent: Node | null = null;
    for (let i = flat.length - 1; i >= 0; i--) {
      if (flat[i].lv < h.lv) {
        parent = flat[i];
        break;
      }
    }
    if (parent) parent.hasKids = true;
    flat.push({ ...h, depth: h.lv - minLv, parent, hasKids: false });
  }
  return flat;
}

/** 往上找第一個真的在捲動的祖先（工作台內是 #nc-scroll），找不到回 null 表示用 window。 */
function scrollParentOf(el: HTMLElement | null): HTMLElement | null {
  let p = el?.parentElement ?? null;
  while (p) {
    const o = getComputedStyle(p).overflowY;
    if ((o === "auto" || o === "scroll") && p.scrollHeight > p.clientHeight) return p;
    p = p.parentElement;
  }
  return null;
}

export default function Toc({ items = [] }: { items?: Heading[] }) {
  const flat = useMemo(() => buildTree(items), [items]);
  const counts = useMemo(
    () =>
      ([1, 2, 3] as const)
        .map((lv) => [lv, items.filter((h) => h.lv === lv).length] as const)
        .filter(([, n]) => n > 0)
        .map(([lv, n]) => `H${lv}×${n}`)
        .join(" · "),
    [items],
  );
  const [active, setActive] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [open, setOpen] = useState(true);
  // 展開中的節點。SSR 一律全部收合（localStorage 當作沒有），掛載後依設定頁的「目錄預設狀態」決定；
  // 捲動時不自動展開，完全由讀者決定。
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const navRef = useRef<HTMLElement>(null);

  const trail = useMemo(() => {
    const s = new Set<string>();
    for (let n = flat.find((h) => h.id === active) ?? null; n; n = n.parent) s.add(n.id);
    return s;
  }, [flat, active]);

  useEffect(() => {
    const sc = scrollParentOf(navRef.current);
    const target: HTMLElement | Window = sc ?? window;
    let raf = 0;
    const compute = () => {
      raf = 0;
      const base = sc ? sc.getBoundingClientRect().top : 0;
      let cur: string | null = null;
      for (const h of flat) {
        const el = document.getElementById(h.id);
        if (el && el.getBoundingClientRect().top < base + ACTIVE_OFFSET) cur = h.id;
      }
      setActive(cur);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(compute);
    };
    target.addEventListener("scroll", onScroll, { passive: true });
    compute();
    return () => {
      target.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [flat]);

  // 主區不夠寬（.wb-host 內容寬 < 900，與頁面 CSS 的 container query 同一個數字）：
  // 目錄改為可折疊面板（預設收合）；夠寬：右側常駐展開。用 ResizeObserver 量容器，不看視窗寬。
  useEffect(() => {
    const host = document.querySelector<HTMLElement>(".wb-host");
    if (!host) return;
    // ResizeObserver 在高度變化時也會觸發（展開目錄就會讓 .wb-host 變高），
    // 只在窄／寬真的切換時才重設展開狀態，否則一展開就被收回去。
    let last: boolean | null = null;
    const apply = () => {
      const narrow = host.clientWidth - 64 < 900; // 64 = .wb-host 左右 padding
      if (narrow === last) return;
      last = narrow;
      setMobile(narrow);
      setOpen(!narrow);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  const jumpTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const behavior: ScrollBehavior = matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    const sc = scrollParentOf(navRef.current);
    const top = el.getBoundingClientRect().top;
    // 不改 URL hash：工作台其他地方會讀 hash，跳轉只動捲動位置。
    if (sc) sc.scrollTo({ top: top - sc.getBoundingClientRect().top + sc.scrollTop - 24, behavior });
    else window.scrollTo({ top: top + window.scrollY - 90, behavior });
  };

  const parents = useMemo(() => flat.filter((h) => h.hasKids), [flat]);
  useEffect(() => {
    if (readPrefs().tocDefault === "expanded") setExpanded(new Set(parents.map((h) => h.id)));
  }, [parents]);
  const allOpen = parents.length > 0 && parents.every((h) => expanded.has(h.id));
  const isVisible = (h: Node) => {
    for (let p = h.parent; p; p = p.parent) if (!expanded.has(p.id)) return false;
    return true;
  };
  // 目前位置藏在收合的分支裡時，由看得到的最近祖先代為標示橘色左緣
  let proxyNode = flat.find((h) => h.id === active) ?? null;
  while (proxyNode && !isVisible(proxyNode)) proxyNode = proxyNode.parent;
  const proxy = proxyNode && proxyNode.id !== active ? proxyNode.id : null;
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () => setExpanded(allOpen ? new Set() : new Set(parents.map((h) => h.id)));

  if (!flat.length) return null;

  return (
    <nav ref={navRef} className="nc-toc" aria-label="目錄">
      <div className="nc-toc-head">
        <button
          type="button"
          className="nc-toc-title"
          aria-expanded={open}
          onClick={() => mobile && setOpen((o) => !o)}
        >
          <span>目錄</span>
          <span className="nc-toc-head-r">
            <span className="nc-toc-count">{counts}</span>
            <ChevronDown className="nc-toc-chevron" size={16} style={{ transform: open ? "rotate(180deg)" : "none" }} />
          </span>
        </button>
        {open && parents.length > 0 && (
          <button
            type="button"
            className="nc-toc-all"
            onClick={toggleAll}
            aria-label={allOpen ? "全部收合" : "全部展開"}
            title={allOpen ? "全部收合" : "全部展開"}
          >
            {allOpen ? <ChevronsDownUp size={14} /> : <ChevronsUpDown size={14} />}
          </button>
        )}
      </div>
      {open && (
        <div className="nc-toc-list">
          {flat.filter(isVisible).map((h) => {
            const on = active === h.id;
            const state = on ? "on" : h.id === proxy ? "trail proxy" : trail.has(h.id) ? "trail" : "";
            const cls = ["nc-toc-item", `d${h.depth}`, state].filter(Boolean).join(" ");
            const isOpen = expanded.has(h.id);
            return (
              <div key={h.id} className="nc-toc-row">
                <a
                  href={`#${h.id}`}
                  className={cls}
                  aria-current={on ? "location" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    if (!mobile) return jumpTo(h.id);
                    // 窄版面板在內文上方：先收合，等版面縮回去再算目標位置，否則會捲過頭
                    setOpen(false);
                    requestAnimationFrame(() => jumpTo(h.id));
                  }}
                >
                  {h.depth > 0 && <span className="nc-toc-mark" aria-hidden="true" />}
                  <span className="nc-toc-label">{h.label}</span>
                </a>
                {h.hasKids && (
                  <button
                    type="button"
                    className="nc-toc-twisty"
                    aria-expanded={isOpen}
                    aria-label={`${isOpen ? "收合" : "展開"}「${h.label}」`}
                    onClick={() => toggle(h.id)}
                  >
                    <ChevronRight size={14} style={{ transform: isOpen ? "rotate(90deg)" : "none" }} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </nav>
  );
}
