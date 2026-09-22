// 筆記 Drawer（規格 §8.2；README §5.2）。右側 480px 預覽，選取不進網址、換頁即關。
// 這裡**不放**閱讀狀態控制（Q26）、不放「筆記狀態」pill（Q7）、沒有字數（Q9）。
import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, X } from "lucide-react";
import type { WbNoteRow, WbSeries } from "@/lib/wb-types";
import { pushEscape } from "@/lib/wb-escape";
import { daysAgoLabel, ymd } from "@/lib/wb-time";
import { AiPill, SeriesPill } from "./ui";
import { CopyPromptAction, DeckAction, FavoriteIcon } from "./actions";
import { noteHref } from "./NoteRow";

export default function NoteDrawer({
  row,
  series,
  workspaceLabel = "",
  isDev = false,
  onClose = () => {},
}: {
  row: WbNoteRow;
  /** 該筆記所屬系列的完整章節（供「同系列章節」） */
  series?: WbSeries | null;
  workspaceLabel?: string;
  isDev?: boolean;
  onClose?: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const [ago, setAgo] = useState<string | null>(null); // 相對量在瀏覽器算；SSR 不輸出

  useEffect(() => {
    setAgo(daysAgoLabel(row.updatedAt));
  }, [row.updatedAt]);

  // 開啟時焦點移到關閉鈕；Escape 走共用堆疊；Tab 在 Drawer 內循環
  useEffect(() => {
    const prev = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const pop = pushEscape(onClose);
    return () => {
      pop();
      prev?.focus();
    };
    // 只在掛載／卸載時處理焦點；換一列（row 變）時 Drawer 不重掛
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingIds = useMemo(() => row.markers.filter((m) => m.status !== "generated").map((m) => m.id), [row.markers]);
  const chapters = series?.chapters ?? [];

  const onTrapTab = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || !panelRef.current) return;
    const f = Array.from(
      panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'),
    );
    if (f.length === 0) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const meta: [string, React.ReactNode][] = [
    ["路徑", row.path],
    ["資料夾", row.folder.length ? row.folder.join(" / ") : "根目錄"],
    ["系列", row.series ? `${row.series.title} ・ 第 ${row.series.index} 章 / ${row.series.total}` : "未歸入系列"],
    ["建立", ymd(row.createdAt)],
    ["更新", `${ymd(row.updatedAt)}${ago ? `（${ago}）` : ""}`],
  ];

  return (
    <>
      <button type="button" className="wb-scrim" onClick={onClose} aria-label="關閉預覽" tabIndex={-1} />
      <aside
        className="wb-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wb-dw-title"
        ref={panelRef}
        onKeyDown={onTrapTab}
      >
        <div className="wb-dw-h">
          <span className="wb-crumb" title={`${workspaceLabel}/${row.path}`}>
            {workspaceLabel}/{row.path}
          </span>
          <button type="button" className="wb-dw-x" onClick={onClose} aria-label="關閉" ref={closeRef}>
            <X size={14} strokeWidth={1.7} aria-hidden="true" />
          </button>
        </div>
        <div className="wb-dw-body">
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <h2 className="wb-dw-t" id="wb-dw-title" style={{ flex: 1, minWidth: 0 }}>
              {row.title}
            </h2>
            <FavoriteIcon slug={row.slug} />
          </div>
          <div className="wb-dw-pills">
            <AiPill markers={row.markers} hasFrontmatter={row.hasFrontmatter} />
            {row.series ? (
              <SeriesPill accent={row.series.accent} title={row.series.title} index={row.series.index} href={`/series/${row.series.id}`} />
            ) : null}
          </div>
          <div className="wb-dw-actions">
            <a className="wb-btn-solid" href={noteHref(row.slug)}>
              <FileText size={13} strokeWidth={1.7} aria-hidden="true" /> 開啟筆記
            </a>
            <DeckAction slug={row.slug} hasDeck={row.hasDeck} promptPath={row.promptPath} isDev={isDev} />
            {isDev ? <CopyPromptAction promptPath={row.promptPath} pendingIds={pendingIds} /> : null}
          </div>

          {row.description ? (
            <>
              <div className="wb-dw-sec">摘要</div>
              <p className="wb-dw-p">{row.description}</p>
            </>
          ) : null}

          <div className="wb-dw-sec">Metadata</div>
          <div className="wb-dw-meta">
            {meta.map(([k, v]) => (
              <div key={k} className="wb-dw-mrow">
                <span className="wb-dw-mk">{k}</span>
                <span className="wb-dw-mv">{v}</span>
              </div>
            ))}
            <div className="wb-dw-mrow">
              <span className="wb-dw-mk">標籤</span>
              <span className="wb-dw-mv" style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {row.tags.length
                  ? row.tags.map((t) => (
                      <a key={t} className="wb-tagchip" href={`/notes?tag=${encodeURIComponent(t)}`}>
                        {t}
                      </a>
                    ))
                  : "—"}
              </span>
            </div>
          </div>

          <div className="wb-dw-sec">
            @ai-visualize 標記 <span className="wb-dw-sec-n tnum">{row.markers.length}</span>
          </div>
          {row.markers.length ? (
            <div className="wb-dw-markers">
              {row.markers.map((m) => (
                <div key={m.id} className="wb-marker">
                  <span className={"wb-dot " + (m.status === "generated" ? "ok" : "warn")} aria-hidden="true" />
                  <span className="wb-marker-t" title={m.prompt}>
                    {m.id}
                  </span>
                  <span className="wb-marker-s">
                    {m.type} ・ {m.status === "generated" ? "已生成" : "待生成"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="wb-dw-p" style={{ color: "var(--wb-ink-3)", fontSize: 12.5 }}>
              這篇還沒有 @ai-visualize 標記。
            </p>
          )}

          {series && chapters.length ? (
            <>
              <div className="wb-dw-sec">
                同系列章節
                <a className="wb-sb-foot-a" style={{ padding: 0, fontSize: 11, marginLeft: "auto" }} href={`/series/${series.id}`}>
                  系列總覽 →
                </a>
              </div>
              <div className="wb-dw-markers">
                {chapters.map((c, i) => {
                  const current = c.kind === "note" && c.ref === row.slug;
                  return current ? (
                    <div key={c.ref} className="wb-marker" aria-current="true">
                      <span className="wb-marker-i tnum">{i + 1}</span>
                      <span className="wb-marker-t" style={{ fontWeight: 700, color: "var(--wb-ink)" }}>
                        {c.title}
                      </span>
                      <span className="wb-marker-s">目前</span>
                    </div>
                  ) : (
                    <a key={c.ref} className="wb-marker link" href={c.href}>
                      <span className="wb-marker-i tnum">{i + 1}</span>
                      <span className="wb-marker-t">{c.title}</span>
                      <span className="wb-marker-s">{c.kind === "data" ? "資料檔" : ""}</span>
                    </a>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>
      </aside>
    </>
  );
}
