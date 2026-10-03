// 「設定與關於 › 關於」最上方的「版本與更新」區塊（規格 docs/notecraft-workbench-update-check.md §6.3；handoff §3）。
// 版本資訊的唯一完整位置。SSR：目前版本＋「尚未檢查新版」＋只有「檢查更新」，hydrate 後讀 store 補上其他內容。
import { useEffect, useMemo } from "react";
import { ArrowRight, FileText, RefreshCw } from "lucide-react";
import { agoLabel, sizeLabel, updTone } from "@/lib/update-check";
import { countByCategory, sliceChangelog } from "@/lib/changelog-parse";
import { check, loadChangelog, openDrawer, unskip, type UpdState } from "@/lib/update-store";
import { GroupHeader, SetRow } from "../ui";
import { nodeReq, Spin, UpdateCmds, UpdateNotes, UpdatePills } from "./UpdateParts";
import { useTick } from "./useUpd";

export default function UpdateBlock({ u, cur, visible }: { u: UpdState; cur: string; visible: boolean }) {
  useTick(visible);
  const r = u.res;
  const tone = updTone(r);
  const has = !!r?.level;
  const checking = u.status === "checking";
  const skipped = !!r && has && u.skipped === r.latest && !r.deprecated;

  // major 的「破壞性變更」提示框要顯示移除／變更項數 → 需要 CHANGELOG
  useEffect(() => {
    if (visible && r?.level === "major") loadChangelog();
  }, [visible, r?.level, r?.latest]);
  const counts = useMemo(() => {
    if (!r || u.cl.status !== "ok" || !u.cl.versions) return null;
    return countByCategory(sliceChangelog(u.cl.versions, r.missed, r.cur));
  }, [r, u.cl.status, u.cl.versions]);

  const status = u.err ? (
    <span className="wb-upd-err">{u.err}</span>
  ) : u.checkedAt ? (
    <span className="tnum">{agoLabel(u.checkedAt, Date.now())}檢查</span>
  ) : checking ? (
    ""
  ) : (
    "尚未檢查"
  );

  return (
    <section className="wb-upd" aria-label="版本與更新">
      <GroupHeader name="版本與更新" icon={RefreshCw} gc="wb-gc-blue" stats="開頁時自動檢查，30 分鐘內不重複" />
      <div className={"wb-upd-hero" + (tone === "major" ? " major" : tone === "danger" ? " danger" : "")}>
        <div className="wb-upd-ver">
          <div className="wb-upd-ver-row">
            <span className="wb-upd-v-k">目前</span>
            <span className={"wb-upd-v" + (has ? " old" : "")}>v{cur}</span>
            {has && r ? (
              <>
                <ArrowRight size={15} strokeWidth={1.7} aria-label="升級到" />
                <span className="wb-upd-v-k">最新</span>
                <span className="wb-upd-v">v{r.latest}</span>
              </>
            ) : r?.ahead ? (
              <>
                <span className="wb-upd-v-k">npm 最新</span>
                <span className="wb-upd-v old">v{r.latest}</span>
              </>
            ) : null}
          </div>
          <div className="wb-upd-pills">
            <UpdatePills u={u} />
          </div>
        </div>
        <div className="wb-upd-act">
          <div className="wb-upd-act-btns">
            {r ? (
              <button type="button" className="wb-btn-solid" onClick={openDrawer}>
                <FileText size={14} strokeWidth={1.7} aria-hidden="true" /> 查看更新內容
              </button>
            ) : null}
            <button
              type="button"
              className="wb-btn-ghost"
              aria-disabled={checking || undefined}
              aria-busy={checking || undefined}
              onClick={() => {
                if (!checking) void check(true);
              }}
            >
              {checking ? <Spin /> : <RefreshCw size={14} strokeWidth={1.7} aria-hidden="true" />}
              {checking ? "檢查中…" : "檢查更新"}
            </button>
          </div>
          <div className="wb-upd-status" aria-live="polite">
            {status}
          </div>
        </div>
      </div>
      <UpdateNotes r={r} counts={counts} />
      {r && (has || r.deprecated) ? (
        <SetRow k="升級指令" d="複製後在終端機執行。部署站請由站台維護者升級並重新部署">
          <UpdateCmds />
        </SetRow>
      ) : null}
      {r ? (
        <SetRow k={has ? "最新版需求" : "Node 需求"} d={"engines.node：" + (r.engines ?? "未指定")}>
          <span className="wb-set-v tnum">Node {nodeReq(r)}</span>
          <span className={"wb-pill tnum " + (r.needsNode ? "warn" : "muted")}>目前 {r.userNode}</span>
        </SetRow>
      ) : null}
      {r ? (
        <SetRow k="套件" d={"notecraftapp@" + r.latest}>
          <span className="wb-set-v tnum" style={{ color: "var(--wb-ink-3)" }}>
            {[sizeLabel(r.size), r.files !== null ? `${r.files} 個檔案` : ""].filter(Boolean).join(" ・ ") || "—"}
          </span>
        </SetRow>
      ) : null}
      {skipped && r ? (
        <SetRow k={`已略過 v${r.latest} 的提醒`} d="這一版不再跳通知、Rail 不顯示圓點。有更新的版本時會恢復提醒。">
          <button type="button" className="wb-btn-ghost" onClick={unskip}>
            恢復提醒
          </button>
        </SetRow>
      ) : null}
    </section>
  );
}
