// 指令面板 ⌘K：全站跳轉 + pagefind 全文（規格 §8.9）。由 WorkbenchLayout 以 client:idle 全站掛一次。
// 平時不渲染任何 DOM、也不抓任何資料；第一次開啟才載入 /wb-index.json 與 pagefind。
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { FileText, Search, Tag } from "lucide-react";
import type { WbDataFile, WbNoteRow, WbSeries, WbTagStat } from "@/lib/wb-types";
import { seriesProgress } from "@/lib/reading-progress";
import { pushEscape } from "@/lib/wb-escape";
import { AiPill, Ic, Pill } from "./ui";
import { useWbIndex } from "./useWbIndex";

export const PALETTE_EVENT = "nc-open-palette";

// ── pagefind（只存在於正式 build；dev 下載入失敗就整組不顯示）──
type PagefindHit = { url: string; meta: { title?: string }; excerpt: string };
type PagefindApi = { search: (q: string) => Promise<{ results: { data: () => Promise<PagefindHit> }[] }> };
let pagefindPromise: Promise<PagefindApi | null> | null = null;
function loadPagefind(): Promise<PagefindApi | null> {
  // 索引只存在於正式 build。dev 下連請求都不發 —— 發了必然 404，瀏覽器會在 console 印一筆網路錯誤。
  if (import.meta.env.DEV) return Promise.resolve(null);
  if (!pagefindPromise) {
    // 字串相加是為了避開 Vite 的靜態分析，否則 dev server 會嘗試解析這個不存在的模組。
    const url = "/pagefind/" + "pagefind.js";
    pagefindPromise = import(/* @vite-ignore */ url).then(
      (mod) => mod as PagefindApi,
      () => null,
    );
  }
  return pagefindPromise;
}

const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&#x27;": "'", "&nbsp;": " " };
function decodeEntities(s: string): string {
  return s
    .replace(/&(amp|lt|gt|quot|nbsp|#39|#x27);/g, (m) => ENTITIES[m] ?? m)
    .replace(/&#(\d+);/g, (_m, n: string) => String.fromCodePoint(Number(n)));
}
/**
 * pagefind 的 excerpt 是含 <mark> 的 HTML 字串。**不用 dangerouslySetInnerHTML**：
 * 切成「一般／命中」片段，各自做 entity 解碼後以 React 節點組回 —— 內文裡就算有
 * `<img onerror=…>` 字樣也只會是純文字。
 */
function excerptNodes(excerpt: string): ReactNode[] {
  return excerpt.split(/(<mark>[\s\S]*?<\/mark>)/g).map((part, i) => {
    const m = /^<mark>([\s\S]*?)<\/mark>$/.exec(part);
    const text = decodeEntities((m ? m[1] : part).replace(/<[^>]*>/g, ""));
    return m ? <b key={i}>{text}</b> : <span key={i}>{text}</span>;
  });
}
function slugFromUrl(url: string): string | null {
  const m = /^\/notes\/(.+?)\/?$/.exec(url.split(/[?#]/)[0]);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

type Item = { key: string; href: string; node: ReactNode };
type Group = { label: string; items: Item[] };

const has = (hay: string, q: string) => hay.toLowerCase().includes(q);

export default function Palette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const [hits, setHits] = useState<PagefindHit[]>([]);
  const { index, loading, load } = useWbIndex();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const loaded = useRef(false);
  const seq = useRef(0);

  const close = useCallback(() => setOpen(false), []);

  // 開啟：事件（Rail 搜尋鈕）或 ⌘K／Ctrl+K
  useEffect(() => {
    const doOpen = () => {
      setOpen((was) => {
        if (!was) lastFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        return true;
      });
      requestAnimationFrame(() => inputRef.current?.focus());
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        doOpen();
      }
    };
    window.addEventListener(PALETTE_EVENT, doOpen);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(PALETTE_EVENT, doOpen);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    if (!loaded.current) {
      loaded.current = true;
      load();
      void loadPagefind();
    }
    setQ("");
    setSel(0);
    setHits([]);
    const pop = pushEscape(close);
    return () => {
      pop();
      lastFocus.current?.focus();
      lastFocus.current = null;
    };
  }, [open, load, close]);

  // 全文：debounce 150ms；較晚回來的舊查詢結果丟棄
  const term = q.trim();
  useEffect(() => {
    if (!open) return;
    const my = ++seq.current;
    if (!term) {
      setHits([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      const pf = await loadPagefind();
      if (!pf || my !== seq.current) return;
      try {
        const res = await pf.search(term);
        const data = await Promise.all(res.results.slice(0, 12).map((r) => r.data()));
        if (my === seq.current) setHits(data);
      } catch {
        if (my === seq.current) setHits([]);
      }
    }, 150);
    return () => window.clearTimeout(timer);
  }, [term, open]);

  const groups = useMemo<Group[]>(() => {
    if (!index) return [];
    const ql = term.toLowerCase();
    const notes: WbNoteRow[] = index.notes.filter((r) => !ql || has(r.title + r.path + r.tags.join(), ql)).slice(0, 7);
    const series: WbSeries[] = index.series
      .filter((s) => s.chapters.length > 0 && (!ql || has(s.title, ql)))
      .slice(0, 3);
    const tags: WbTagStat[] = ql ? index.tags.filter((t) => has(t.name, ql)).slice(0, 4) : [];
    const files: WbDataFile[] = ql ? index.dataFiles.filter((f) => has(f.title + f.relPath + f.pluginId, ql)).slice(0, 3) : [];
    const shown = new Set(notes.map((n) => n.slug));
    const body = ql
      ? hits
          .filter((h) => {
            const slug = slugFromUrl(h.url);
            return !(slug && shown.has(slug));
          })
          .slice(0, 5)
      : [];

    const out: Group[] = [
      {
        label: "筆記",
        items: notes.map((r) => ({
          key: "n:" + r.slug,
          href: `/notes/${r.slug}`,
          node: (
            <>
              <Ic icon={FileText} size={13} color="var(--wb-ink-3)" />
              <span className="wb-row-t">{r.title}</span>
              <span className="wb-row-p">{r.path}</span>
              <AiPill markers={r.markers} hasFrontmatter={r.hasFrontmatter} />
            </>
          ),
        })),
      },
      {
        label: "系列",
        items: series.map((s) => ({
          key: "s:" + s.id,
          href: `/series/${s.id}`,
          node: (
            <>
              <span className={`wb-sb-swatch wb-acc-${s.accent}`} />
              <span className="wb-row-t">{s.title}</span>
              <span className="wb-row-p">系列 ・ {s.chapters.length} 章</span>
              <Pill>{seriesProgress(s.chapters.map((c) => c.ref)).pct}%</Pill>
            </>
          ),
        })),
      },
      {
        label: "標籤",
        items: tags.map((t) => ({
          key: "t:" + t.name,
          href: `/notes?tag=${encodeURIComponent(t.name)}`,
          node: (
            <>
              <Ic icon={Tag} size={13} color="var(--wb-ink-3)" />
              <span className="wb-row-t">{t.name}</span>
              <span className="wb-row-p">標籤</span>
              <Pill>{t.count} 篇</Pill>
            </>
          ),
        })),
      },
      {
        label: "資料檔",
        items: files.map((f) => ({
          key: "d:" + f.routePath,
          href: `/view/${f.routePath}`,
          node: (
            <>
              <Ic icon={FileText} size={13} color="var(--wb-gold)" />
              <span className="wb-row-t">{f.title}</span>
              <span className="wb-row-p">{f.relPath}</span>
              <span className="wb-tagchip" style={{ fontFamily: "var(--font-mono)" }}>
                {f.pluginId}
              </span>
            </>
          ),
        })),
      },
      {
        label: "內文",
        items: body.map((h) => ({
          key: "p:" + h.url,
          href: h.url,
          node: (
            <>
              <Ic icon={FileText} size={13} color="var(--wb-ink-3)" />
              <span className="wb-row-t">{h.meta.title ?? h.url}</span>
              <span className="wb-row-p">{excerptNodes(h.excerpt)}</span>
            </>
          ),
        })),
      },
    ];
    return out.filter((g) => g.items.length > 0);
  }, [index, term, hits]);

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const active = Math.min(sel, Math.max(flat.length - 1, 0));

  useEffect(() => setSel(0), [term]);
  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active, flat.length]);

  if (!open) return null;

  const go = (href: string, newTab: boolean) => {
    if (newTab) window.open(href, "_blank", "noopener");
    else window.location.href = href;
  };

  let n = -1;
  return (
    <div className="wb-pal-scrim" onMouseDown={(e) => (e.target === e.currentTarget ? close() : undefined)}>
      <div className="wb-pal" role="dialog" aria-modal="true" aria-label="指令面板">
        <div className="wb-pal-in">
          <Ic icon={Search} size={16} color="var(--wb-ink-3)" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜尋筆記、系列、標籤、內文…"
            role="combobox"
            aria-expanded="true"
            aria-controls="wb-pal-list"
            aria-activedescendant={flat[active] ? "wb-pal-" + active : undefined}
            aria-label="搜尋"
            autoComplete="off"
            spellCheck={false}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return; // 注音／拼音選字中的 Enter 不是送出
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSel(Math.min(active + 1, flat.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSel(Math.max(active - 1, 0));
              } else if (e.key === "Enter" && flat[active]) {
                e.preventDefault();
                go(flat[active].href, e.metaKey || e.ctrlKey);
              }
            }}
          />
          <span className="wb-crumb">Esc 關閉</span>
        </div>
        <div className="wb-pal-list" id="wb-pal-list" role="listbox" aria-label="搜尋結果" ref={listRef}>
          {!index && loading ? (
            <>
              <div className="wb-row wb-skel" aria-hidden="true" />
              <div className="wb-row wb-skel" aria-hidden="true" />
              <div className="wb-row wb-skel" aria-hidden="true" />
            </>
          ) : null}
          {!index && !loading ? <div className="wb-pal-empty">索引載入失敗，請重新整理後再試。</div> : null}
          {index && flat.length === 0 ? <div className="wb-pal-empty">找不到相符的項目</div> : null}
          {groups.map((g) => (
            <div key={g.label} role="group" aria-label={g.label}>
              <div className="wb-pal-sec">{g.label}</div>
              {g.items.map((it) => {
                n += 1;
                const i = n;
                return (
                  <a
                    key={it.key}
                    id={"wb-pal-" + i}
                    role="option"
                    aria-selected={i === active}
                    className={"wb-row" + (i === active ? " sel" : "")}
                    href={it.href}
                    onMouseMove={() => (i === active ? undefined : setSel(i))}
                  >
                    {it.node}
                  </a>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
