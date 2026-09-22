// Board：依閱讀狀態分**三欄**（Q7：沒有第四欄「未發佈」）。HTML5 DnD，drop 寫入 setReadingStatus()。
// 只在有精確指標的裝置上可拖（Q26）；觸控裝置上是純總覽：點卡片開 Drawer、雙擊開筆記。
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { WbNoteRow } from "@/lib/wb-types";
import { markerCounts } from "@/lib/wb-types";
import { READING_EVENT, readingMeta, readingStatus, setReadingStatus, type ReadingStatus } from "@/lib/reading-progress";
import { md } from "@/lib/wb-time";
import { AiPill, SeriesPill } from "../ui";
import { OpenLink, rowHandlers } from "../NoteRow";

const COLS: ReadingStatus[] = ["not-started", "reading", "done"];

function subscribePointer(cb: () => void) {
  const mq = window.matchMedia("(pointer: fine)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
const getPointer = () => window.matchMedia("(pointer: fine)").matches;
const getPointerSSR = () => false;

/** 閱讀狀態版本號：SSR／首次 render 為 0（全部視為未開始），掛載後 1，之後每次事件遞增。 */
function useReadingVersion(): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    setV(1);
    const bump = () => setV((x) => x + 1);
    window.addEventListener(READING_EVENT, bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener(READING_EVENT, bump);
      window.removeEventListener("storage", bump);
    };
  }, []);
  return v;
}

export default function BoardView({
  rows = [],
  sel = null,
  onSelect = () => {},
}: {
  rows?: WbNoteRow[];
  sel?: string | null;
  onSelect?: (slug: string) => void;
}) {
  const canDrag = useSyncExternalStore(subscribePointer, getPointer, getPointerSSR);
  const version = useReadingVersion();
  const live = version > 0;
  const [drag, setDrag] = useState<{ slug: string; from: ReadingStatus } | null>(null);
  const dragRef = useRef<{ slug: string; from: ReadingStatus } | null>(null);
  const [over, setOver] = useState<ReadingStatus | null>(null);

  const status = (slug: string): ReadingStatus => (live ? readingStatus(slug) : "not-started");

  return (
    <div className="wb-board" data-wb-rows>
      {COLS.map((key) => {
        const meta = readingMeta(key);
        const items = rows.filter((r) => status(r.slug) === key);
        const pend = items.reduce((a, r) => a + markerCounts(r.markers).pending, 0);
        const droppable = !!drag && drag.from !== key;
        return (
          <div
            key={key}
            className={`wb-col wb-read-${key}` + (droppable && over === key ? " drop" : "")}
            onDragOver={(e) => {
              if (droppable) {
                e.preventDefault();
                if (over !== key) setOver(key);
              }
            }}
            onDragLeave={() => setOver((o) => (o === key ? null : o))}
            onDrop={(e) => {
              e.preventDefault();
              setOver(null);
              if (droppable && dragRef.current) setReadingStatus(dragRef.current.slug, key);
              dragRef.current = null;
              setDrag(null);
            }}
          >
            <div className="wb-col-h">
              <span className="wb-sb-swatch" aria-hidden="true" />
              <span className="wb-col-n">{meta.label}</span>
              <span className="wb-col-c tnum">{items.length}</span>
            </div>
            {/* hydrate 前欄內容隱藏：SSR 把所有卡片放在「未開始」，不讓卡片在眼前跳欄 */}
            <div className="wb-col-b" style={live ? undefined : { visibility: "hidden" }}>
              {items.map((r) => {
                const dragging = drag?.slug === r.slug;
                return (
                  <div
                    key={r.slug}
                    className={"wb-card" + (sel === r.slug ? " sel" : "") + (canDrag ? " drag" : "") + (dragging ? " dragging" : "")}
                    draggable={canDrag}
                    title={canDrag ? "拖曳可改變閱讀狀態" : undefined}
                    onDragStart={(e) => {
                      if (!canDrag) return;
                      if ((e.target as HTMLElement).closest(".wb-row-open")) {
                        e.preventDefault(); // 「開啟」圖示不作為拖曳把手
                        return;
                      }
                      const d = { slug: r.slug, from: key };
                      dragRef.current = d;
                      setDrag(d);
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", r.slug);
                    }}
                    onDragEnd={() => {
                      dragRef.current = null;
                      setDrag(null);
                      setOver(null);
                    }}
                  >
                    <button type="button" className="wb-card-main" data-wb-rowfocus aria-pressed={sel === r.slug} {...rowHandlers(r.slug, onSelect)}>
                      <div className="wb-card-t">{r.title}</div>
                      <div className="wb-card-m">
                        {r.series ? <SeriesPill chip accent={r.series.accent} title={r.series.title} index={r.series.index} /> : null}
                        {r.tags.slice(0, 2).map((t) => (
                          <span key={t} className="wb-tagchip">
                            {t}
                          </span>
                        ))}
                      </div>
                    </button>
                    <div className="wb-card-m">
                      <AiPill markers={r.markers} hasFrontmatter={r.hasFrontmatter} />
                      <span className="wb-row-d tnum" style={{ marginLeft: "auto" }}>
                        {md(r.updatedAt)}
                      </span>
                      <OpenLink slug={r.slug} title={r.title} />
                    </div>
                  </div>
                );
              })}
              {items.length === 0 ? (
                <div className="wb-empty" style={{ padding: "18px 8px", fontSize: 12 }}>
                  {droppable ? "拖到這裡" : "無筆記"}
                </div>
              ) : null}
              <div className="wb-col-f tnum">{pend ? `待生成 ${pend} 個標記` : "標記皆已生成"}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
