// 更新內容 Drawer（規格 docs/notecraft-workbench-update-check.md §6.4；handoff §4）。
// UpdateHost 在 drawer 開啟時以 portal 掛進 #nc-main（.wb-drawer 以 .wb-main 為定位基準）。
// 外框用既有 DrawerShell：scrim、焦點管理、Tab 循環、Esc 走 wb-escape 堆疊。
import { useEffect, useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { agoLabel, sizeLabel, ymdSlash } from "@/lib/update-check";
import { countByCategory, sliceChangelog } from "@/lib/changelog-parse";
import { changelogLinks, closeDrawer, getUpdEnv, loadChangelog, skip, unskip, type UpdState } from "@/lib/update-store";
import DrawerShell from "../DrawerShell";
import UpdateChangelog from "./UpdateChangelog";
import { nodeReq, UpdateCmds, UpdateNotes, UpdatePills } from "./UpdateParts";
import { useTick } from "./useUpd";

export default function UpdateDrawer({ u }: { u: UpdState }) {
  useTick();
  const r = u.res;
  const env = getUpdEnv();
  const base = env?.repoBlobBase ?? "";
  const { page } = changelogLinks();

  useEffect(() => {
    loadChangelog();
  }, [r?.latest, r?.cur, r?.level, r?.ahead]);

  const slices = useMemo(
    () => (r && u.cl.versions ? sliceChangelog(u.cl.versions, r.missed, r.cur) : []),
    [r, u.cl.versions],
  );
  const counts = useMemo(() => (u.cl.status === "ok" ? countByCategory(slices) : null), [u.cl.status, slices]);

  if (!r) return null;
  const has = !!r.level;
  const skipped = u.skipped === r.latest;

  const footer = (
    <div className="wb-upd-dw-f">
      {page ? (
        <a href={page} target="_blank" rel="noopener" className="wb-upd-gh">
          到 GitHub 看完整 CHANGELOG ↗
        </a>
      ) : (
        <span />
      )}
      {has && !r.deprecated ? (
        skipped ? (
          <button type="button" className="wb-btn-ghost" onClick={unskip}>
            恢復這一版的提醒
          </button>
        ) : (
          <button type="button" className="wb-btn-ghost" onClick={() => skip(r.latest)} title="不再為這一版跳通知與顯示 Rail 圓點">
            略過這一版
          </button>
        )
      ) : null}
    </div>
  );

  const meta: [string, string][] = [
    ["最新版", `v${r.latest}${r.latestDate ? `（${ymdSlash(r.latestDate)}）` : ""}`],
    ["Node", nodeReq(r) + (r.needsNode ? `　目前 ${r.userNode}，需先升級` : "")],
    ["大小", [sizeLabel(r.size), r.files !== null ? `${r.files} 個檔案` : ""].filter(Boolean).join(" ・ ") || "—"],
    ["檢查", u.checkedAt ? agoLabel(u.checkedAt, Date.now()) : "—"],
  ];

  return (
    <DrawerShell
      crumb="notecraftapp ・ 更新內容"
      ariaLabel="更新內容"
      className="wb-upd-dw"
      closeLabel="關閉（Esc）"
      onClose={closeDrawer}
      footer={footer}
    >
      <h2 className="wb-dw-t wb-upd-dw-t">
        v{r.cur}
        {has ? (
          <>
            <ArrowRight size={16} strokeWidth={1.7} aria-label="升級到" />v{r.latest}
          </>
        ) : null}
      </h2>
      <div className="wb-dw-pills">
        <UpdatePills u={u} />
      </div>
      <UpdateNotes r={r} counts={counts} />
      {has ? (
        <>
          <div className="wb-dw-sec">升級指令</div>
          <UpdateCmds />
          <div className="wb-dw-sec">
            你錯過的更新 <span className="wb-dw-sec-n tnum">{r.behind}</span>
            <span style={{ fontWeight: 400, letterSpacing: 0 }}>個版本</span>
          </div>
        </>
      ) : (
        <div className="wb-dw-sec">目前版本的更新內容</div>
      )}
      <UpdateChangelog
        key={u.cl.key + ":" + u.cl.status}
        slices={slices}
        status={u.cl.status}
        cur={r.cur}
        firstLabel={has ? "最新" : "目前"}
        base={base}
        ghPage={page}
      />
      <div className="wb-dw-sec">套件資訊</div>
      <div className="wb-dw-meta">
        {meta.map(([k, v]) => (
          <div key={k} className="wb-dw-mrow">
            <span className="wb-dw-mk">{k}</span>
            <span className="wb-dw-mv">{v}</span>
          </div>
        ))}
      </div>
    </DrawerShell>
  );
}
