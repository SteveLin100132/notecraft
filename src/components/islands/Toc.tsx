import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, CornerDownRight } from "lucide-react";
import { readPrefs } from "@/lib/wb-prefs";

// 筆記頁右側目錄（docs/notecraft-workbench-note-page.md §6；外觀照 design_handoff_note_page 的 np-toc，層級維持 H1–H3：Q7）。
type Level = 1 | 2 | 3;
/** inc：嵌入的內容（::include）的標題，前面加 icon（docs/notecraft-workbench-define-ref.md §6.1） */
type Heading = { id: string; label: string; lv: Level; inc?: boolean };
type Node = Heading & { depth: number; parent: Node | null; kids: number };

/** 標題距捲動容器頂端小於這個值，就算「已讀到」（handoff：120px） */
const ACTIVE_OFFSET = 120;
/** .np-host 內容寬小於這個值就是單欄：目錄移到內文上方、收成一列按鈕（與 workbench.css 的 container query 同一個數字） */
const NARROW = 720;

/**
 * 依文件順序建樹：parent ＝ 往前第一個層級比自己小的標題（允許跳層，h1 後直接 h3 會掛在 h1 下）。
 * depth 取相對於全文最小層級，只有 h2/h3 的筆記因此 h2 仍是頂層。kids ＝ 直接子項數（收合時顯示）
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
    if (parent) parent.kids++;
    flat.push({ ...h, depth: Math.min(2, h.lv - minLv), parent, kids: 0 });
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
  const [narrow, setNarrow] = useState(false);
  const [open, setOpen] = useState(false);
  // 展開中的節點。SSR 一律全部收合（localStorage 當作沒有），掛載後依設定頁的「目錄預設狀態」決定；
  // 捲動時不自動展開，完全由讀者決定。
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const navRef = useRef<HTMLElement>(null);

  const activeNode = flat.find((h) => h.id === active) ?? null;
  const trail = useMemo(() => {
    const s = new Set<string>();
    for (let n = activeNode?.parent ?? null; n; n = n.parent) s.add(n.id);
    return s;
  }, [activeNode]);

  useEffect(() => {
    const sc = scrollParentOf(navRef.current) ?? (document.getElementById("nc-scroll") as HTMLElement | null);
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

  // 單欄與否看 .np-host 的內容寬（Sidebar 收合、平板殼都會改變它），不看視窗寬
  useEffect(() => {
    const host = navRef.current?.closest<HTMLElement>(".np-host");
    if (!host) return;
    const apply = () => setNarrow(host.clientWidth < NARROW);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  const jumpTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const behavior: ScrollBehavior = matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    const sc = scrollParentOf(navRef.current) ?? (document.getElementById("nc-scroll") as HTMLElement | null);
    const top = el.getBoundingClientRect().top;
    // 不改 URL hash：工作台其他地方會讀 hash，跳轉只動捲動位置。
    if (sc) sc.scrollTo({ top: top - sc.getBoundingClientRect().top + sc.scrollTop - 24, behavior });
    else window.scrollTo({ top: top + window.scrollY - 90, behavior });
  };

  const parents = useMemo(() => flat.filter((h) => h.kids > 0), [flat]);
  useEffect(() => {
    if (readPrefs().tocDefault === "expanded") setExpanded(new Set(parents.map((h) => h.id)));
  }, [parents]);
  const allOpen = parents.length > 0 && parents.every((h) => expanded.has(h.id));
  // 祖先收合就藏起來；但目前位置即使在收合的段落裡也照樣顯示（handoff）
  const isVisible = (h: Node) => {
    if (h.id === active) return true;
    for (let p = h.parent; p; p = p.parent) if (!expanded.has(p.id)) return false;
    return true;
  };
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () => setExpanded(allOpen ? new Set() : new Set(parents.map((h) => h.id)));

  if (!flat.length) return null;
  const showList = !narrow || open;

  return (
    <nav ref={navRef} className={`np-toc${open ? " open" : ""}`} aria-label="目錄">
      <button type="button" className="np-toc-tg" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <ChevronRight size={12} strokeWidth={2.2} aria-hidden="true" />
        目錄
        <span className="cur">{activeNode?.label ?? ""}</span>
      </button>
      <div className="np-toc-h">
        <span>目錄</span>
        <span className="np-toc-cnt tnum">{counts}</span>
      </div>
      {showList && parents.length > 0 && (
        <button type="button" className="np-toc-all" onClick={toggleAll} aria-label={allOpen ? "全部收合" : "全部展開"}>
          <ChevronRight size={11} strokeWidth={2.2} aria-hidden="true" style={{ transform: allOpen ? "rotate(90deg)" : "none" }} />
          {allOpen ? "全部收合" : "全部展開"}
        </button>
      )}
      {showList && (
        <div className="np-toc-l">
          {flat.filter(isVisible).map((h) => {
            const on = active === h.id;
            const isOpen = expanded.has(h.id);
            const cls = [`d${h.depth}`, on ? "on" : trail.has(h.id) ? "tr" : ""].filter(Boolean).join(" ");
            return (
              <div key={h.id} className={`np-toc-r d${h.depth}`}>
                <a
                  href={`#${h.id}`}
                  className={cls}
                  aria-current={on ? "location" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    if (!narrow) return jumpTo(h.id);
                    // 單欄時目錄在內文上方：先收合，等版面縮回去再算目標位置，否則會捲過頭
                    setOpen(false);
                    requestAnimationFrame(() => jumpTo(h.id));
                  }}
                >
                  <span className="lb">
                    {h.inc && (
                      <span className="np-toc-inc" title="嵌入的內容">
                        <CornerDownRight size={11} aria-hidden="true" />
                      </span>
                    )}
                    {h.label}
                  </span>
                </a>
                {h.kids > 0 && (
                  <button
                    type="button"
                    className={`np-toc-cv${isOpen ? " open" : ""}`}
                    aria-expanded={isOpen}
                    aria-label={`${isOpen ? "收合" : "展開"}「${h.label}」`}
                    onClick={() => toggle(h.id)}
                  >
                    {!isOpen && <span className="k tnum">{h.kids}</span>}
                    <ChevronRight size={11} strokeWidth={2.2} aria-hidden="true" />
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
