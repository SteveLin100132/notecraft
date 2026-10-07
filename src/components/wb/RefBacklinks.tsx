// 筆記頁的「被引用 N」入口與反向連結 Drawer（docs/notecraft-workbench-define-ref.md §8.1；handoff §4.1）。
//
// 只在本篇任一 define 被引用時掛載。按鈕在頁首 actions；meta 列另有一顆 SSR 的按鈕（data-nc-bl-open），
// 點擊時發 nc-backlinks-open 事件由這裡接手。網址帶 ?backlinks=1（NoteDrawer「開啟筆記看全部」）時自動打開並移除參數。
// 清單在 build 期就確定，以 props 帶入；Drawer 沿用 DrawerShell，portal 到 #nc-main（Drawer 以 .wb-main 為定位基準）。
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CornerDownRight, FileText, Hash } from "lucide-react";
import DrawerShell from "./DrawerShell";
import { withBase } from "@/lib/base";
import type { WbRefKind } from "@/lib/wb-types";

export const BACKLINKS_EVENT = "nc-backlinks-open";

export interface BacklinkRow {
  slug: string;
  title: string;
  folder: string;
  /** 這篇引用了本篇的哪些定義 */
  ids: { id: string; kinds: WbRefKind[] }[];
}

function KindIcon({ kinds }: { kinds: WbRefKind[] }) {
  return kinds.includes("inc") ? <CornerDownRight size={11} aria-hidden="true" /> : <Hash size={11} aria-hidden="true" />;
}

export default function RefBacklinks({
  title = "",
  rows = [],
  defIds = [],
}: {
  /** 本篇標題（Drawer 的 crumb） */
  title?: string;
  rows?: BacklinkRow[];
  /** 本篇被引用的定義 id 與各自的引用篇數（篩選 chips） */
  defIds?: { id: string; count: number }[];
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [main, setMain] = useState<HTMLElement | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMain(document.getElementById("nc-main"));
    const onOpen = () => setOpen(true);
    window.addEventListener(BACKLINKS_EVENT, onOpen);
    const url = new URL(location.href);
    if (url.searchParams.get("backlinks") === "1") {
      url.searchParams.delete("backlinks");
      history.replaceState(history.state, "", url.pathname + url.search + url.hash);
      setOpen(true);
    }
    return () => window.removeEventListener(BACKLINKS_EVENT, onOpen);
  }, []);

  // meta 列的 SSR 按鈕與頁首按鈕同步 aria-expanded
  useEffect(() => {
    document.querySelectorAll<HTMLElement>("[data-nc-bl-open]").forEach((el) => el.setAttribute("aria-expanded", String(open)));
    if (!open) setFilter(null);
  }, [open]);

  const n = rows.length;
  const shown = filter ? rows.filter((r) => r.ids.some((x) => x.id === filter)) : rows;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={"wb-btn-ghost rf-bl-trig" + (open ? " on" : "")}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        title="引用本篇定義的筆記"
      >
        <CornerDownRight size={14} aria-hidden="true" />
        被引用 <b>{n}</b>
      </button>
      {open && main
        ? createPortal(
            <DrawerShell crumb={`${title} ・ 反向連結`} labelledBy="rf-bl-dw-t" className="rf-bl-dw" onClose={() => setOpen(false)}>
              <h2 className="wb-dw-t" id="rf-bl-dw-t">
                被 {n} 篇筆記引用
              </h2>
              <div className="wb-dw-pills">
                <span className="wb-pill">{defIds.length} 個定義被引用</span>
              </div>
              <p className="wb-dw-p rf-bl-note">這些筆記引用了本篇的定義。修改定義前，先確認它們的文意仍然成立。</p>
              {defIds.length >= 2 ? (
                <div className="rf-bl-chips" role="group" aria-label="依定義篩選">
                  <button type="button" className="rf-bl-chip" aria-pressed={filter === null} onClick={() => setFilter(null)}>
                    全部 <span className="tnum">{n}</span>
                  </button>
                  {defIds.map((d) => (
                    <button key={d.id} type="button" className="rf-bl-chip mono" aria-pressed={filter === d.id} onClick={() => setFilter(d.id)}>
                      {d.id} <span className="tnum">{d.count}</span>
                    </button>
                  ))}
                </div>
              ) : null}
              <ul className="nc-bl-list" aria-label="引用本篇的筆記">
                {shown.map((r) => (
                  <li key={r.slug}>
                    <a className="nc-bl-row" href={withBase(`/notes/${r.slug}`)}>
                      <span className="nc-bl-row-t">
                        <FileText size={14} aria-hidden="true" className="nc-bl-doc" />
                        <span>
                          <span className="nc-bl-ti">{r.title}</span>
                          {r.folder ? <span className="nc-bl-fo">{r.folder}</span> : null}
                        </span>
                      </span>
                      <span className="nc-bl-ids">
                        {r.ids.map((x) => (
                          <span key={x.id} className="nc-bl-id" title={x.kinds.includes("inc") ? "嵌入" : "行內引用"}>
                            <KindIcon kinds={x.kinds} />
                            {x.id}
                          </span>
                        ))}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
              <div className="rf-bl-legend">
                <span>
                  <CornerDownRight size={11} aria-hidden="true" /> 嵌入
                </span>
                <span>
                  <Hash size={11} aria-hidden="true" /> 行內引用
                </span>
              </div>
            </DrawerShell>,
            main,
          )
        : null}
    </>
  );
}
