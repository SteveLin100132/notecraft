import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

type Level = 1 | 2 | 3;
type Heading = { id: string; label: string; lv: Level };
type Node = Heading & { depth: number; parent: Node | null };

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
    flat.push({ ...h, depth: h.lv - minLv, parent });
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

  if (!flat.length) return null;

  return (
    <nav ref={navRef} className="nc-toc" aria-label="目錄">
      <button
        type="button"
        className="nc-toc-head"
        aria-expanded={open}
        onClick={() => mobile && setOpen((o) => !o)}
      >
        <span>目錄</span>
        <span className="nc-toc-head-r">
          <span className="nc-toc-count">{counts}</span>
          <ChevronDown className="nc-toc-chevron" size={16} style={{ transform: open ? "rotate(180deg)" : "none" }} />
        </span>
      </button>
      {open && (
        <div className="nc-toc-list">
          {flat.map((h) => {
            const on = active === h.id;
            const cls = ["nc-toc-item", `d${h.depth}`, on ? "on" : trail.has(h.id) ? "trail" : ""].filter(Boolean).join(" ");
            return (
              <a
                key={h.id}
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
            );
          })}
        </div>
      )}
    </nav>
  );
}
