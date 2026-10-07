// 筆記 Drawer（規格 §8.2；README §5.2）。右側 480px 預覽，選取不進網址、換頁即關。
// 這裡**不放**閱讀狀態控制（Q26）、不放「筆記狀態」pill（Q7）、沒有字數（Q9）。
import { useEffect, useMemo, useState } from "react";
import { CornerDownRight, FileText, Hash } from "lucide-react";
import DrawerShell from "./DrawerShell";
import type { WbNoteRow, WbSeries } from "@/lib/wb-types";
import { daysAgoLabel, ymd } from "@/lib/wb-time";
import { AiPill, SeriesPill } from "./ui";
import { CopyPromptAction, DeckAction, FavoriteIcon } from "./actions";
import { noteHref } from "./NoteRow";
import { withBase } from "@/lib/base";
import { useWbIndex } from "./useWbIndex";
import type { WbRefKind } from "@/lib/wb-types";

/** 「被引用」只列前幾筆，其餘到筆記頁看（define-ref §8.2） */
const BL_TOP = 3;
const BL_IDS = 2;

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
  const [ago, setAgo] = useState<string | null>(null); // 相對量在瀏覽器算；SSR 不輸出

  useEffect(() => {
    setAgo(daysAgoLabel(row.updatedAt));
  }, [row.updatedAt]);

  // 定義與引用（define-ref §8.2）：反向連結只存在 WbDef.refs，從共用的 /wb-index.json 取（與 Palette 共用同一次請求）
  const needDefs = row.defines.length > 0 || row.references.length > 0;
  const { index } = useWbIndex(needDefs);
  const defMap = useMemo(() => new Map((index?.defs ?? []).map((d) => [d.id, d])), [index]);
  const titleOf = useMemo(() => {
    const m = new Map((index?.notes ?? []).map((n) => [n.slug, n.title]));
    return (slug: string) => m.get(slug) ?? slug;
  }, [index]);
  const cited = useMemo(() => {
    const by = new Map<string, { slug: string; ids: { id: string; kinds: WbRefKind[] }[] }>();
    for (const id of row.defines) {
      for (const r of defMap.get(id)?.refs ?? []) {
        const x = by.get(r.slug) ?? { slug: r.slug, ids: [] };
        x.ids.push({ id, kinds: r.kinds });
        by.set(r.slug, x);
      }
    }
    return [...by.values()].sort((a, b) => b.ids.length - a.ids.length);
  }, [row.defines, defMap]);

  const pendingIds = useMemo(() => row.markers.filter((m) => m.status !== "generated").map((m) => m.id), [row.markers]);
  const chapters = series?.chapters ?? [];

  const meta: [string, React.ReactNode][] = [
    ["路徑", row.path],
    ["資料夾", row.folder.length ? row.folder.join(" / ") : "根目錄"],
    ["系列", row.series ? `${row.series.title} ・ 第 ${row.series.index} 章 / ${row.series.total}` : "未歸入系列"],
    ["建立", ymd(row.createdAt)],
    ["更新", `${ymd(row.updatedAt)}${ago ? `（${ago}）` : ""}`],
  ];

  return (
    <DrawerShell crumb={`${workspaceLabel}/${row.path}`} labelledBy="wb-dw-title" onClose={onClose}>
      <>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <h2 className="wb-dw-t" id="wb-dw-title" style={{ flex: 1, minWidth: 0 }}>
              {row.title}
            </h2>
            <FavoriteIcon slug={row.slug} />
          </div>
          <div className="wb-dw-pills">
            <AiPill markers={row.markers} hasFrontmatter={row.hasFrontmatter} />
            {row.series ? (
              <SeriesPill accent={row.series.accent} title={row.series.title} index={row.series.index} href={withBase(`/series/${row.series.id}`)} />
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

          {index && cited.length ? (
            <>
              <div className="wb-dw-sec">
                被引用 <span className="wb-dw-sec-n tnum">{cited.length}</span>
              </div>
              <div className="wb-dw-markers">
                {cited.slice(0, BL_TOP).map((c) => (
                  <a key={c.slug} className="wb-marker link rf-dw-row" href={noteHref(c.slug)}>
                    <span className="wb-marker-t">{titleOf(c.slug)}</span>
                    <span className="rf-dw-ids">
                      {c.ids.slice(0, BL_IDS).map((x) => (
                        <span key={x.id} className="rf-dw-id">
                          {x.kinds.includes("inc") ? <CornerDownRight size={10} aria-hidden="true" /> : <Hash size={10} aria-hidden="true" />}
                          {x.id}
                        </span>
                      ))}
                      {c.ids.length > BL_IDS ? <span className="rf-dw-id more">+{c.ids.length - BL_IDS}</span> : null}
                    </span>
                  </a>
                ))}
              </div>
              {cited.length > BL_TOP ? (
                <a className="wb-sb-foot-a rf-dw-all" href={withBase(`/notes/${row.slug}?backlinks=1`)}>
                  開啟筆記看全部 {cited.length} 篇 ↗
                </a>
              ) : null}
            </>
          ) : null}

          {index && row.defines.length ? (
            <>
              <div className="wb-dw-sec">
                本篇定義 <span className="wb-dw-sec-n tnum">{row.defines.length}</span>
              </div>
              <div className="wb-dw-markers">
                {row.defines.map((id) => {
                  const d = defMap.get(id);
                  const n = d?.refs.length ?? 0;
                  return (
                    <a key={id} className="wb-marker link" href={withBase(`/notes/${row.slug}#def-${id}`)}>
                      <Hash size={12} aria-hidden="true" className="rf-dw-ic" />
                      <span className="wb-marker-t">
                        {d?.label ?? id} <span className="rf-dw-mono">{id}</span>
                      </span>
                      <span className="wb-marker-s">{n ? `被 ${n} 篇引用` : "尚未被引用"}</span>
                    </a>
                  );
                })}
              </div>
            </>
          ) : null}

          {index && row.references.length ? (
            <>
              <div className="wb-dw-sec">
                引用的定義 <span className="wb-dw-sec-n tnum">{row.references.length}</span>
              </div>
              <div className="wb-dw-markers">
                {row.references.map((r) => {
                  const d = defMap.get(r.id);
                  return (
                    <a key={r.id} className="wb-marker link" href={d ? withBase(`/notes/${d.slug}#def-${r.id}`) : undefined}>
                      {r.kinds.includes("inc") ? (
                        <CornerDownRight size={12} aria-hidden="true" className="rf-dw-ic" />
                      ) : (
                        <Hash size={12} aria-hidden="true" className="rf-dw-ic" />
                      )}
                      <span className="wb-marker-t">
                        {d?.label ?? r.id} <span className="rf-dw-mono">{r.id}</span>
                      </span>
                      <span className="wb-marker-s rf-dw-src">{d ? titleOf(d.slug) : ""}</span>
                    </a>
                  );
                })}
              </div>
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
                      <a key={t} className="wb-tagchip" href={withBase(`/notes?tag=${encodeURIComponent(t)}`)}>
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
                <a className="wb-sb-foot-a" style={{ padding: 0, fontSize: 11, marginLeft: "auto" }} href={withBase(`/series/${series.id}`)}>
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
      </>
    </DrawerShell>
  );
}
