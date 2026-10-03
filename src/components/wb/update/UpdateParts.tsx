// 檢查更新的共用小元件：pills、提示框、升級指令、行內 Markdown（規格 docs/notecraft-workbench-update-check.md §6.3、§8、§10）。
// 「版本與更新」區塊與更新內容 Drawer 共用；對應 handoff 的 UpdLevelPills、UpdNotes、UpdCmd(s)、updInline。
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Copy, TriangleAlert } from "lucide-react";
import { daysLabel, type UpdResult } from "@/lib/update-check";
import { inlineTokens, type ClCat, type InlineToken } from "@/lib/changelog-parse";
import type { UpdState } from "@/lib/update-store";
import { writeClipboard } from "@/lib/clipboard";

export const UPD_CMDS: { label: string; cmd: string }[] = [
  { label: "viewer 模式", cmd: "npx notecraftapp@latest view" },
  { label: "全域安裝", cmd: "npm i -g notecraftapp@latest" },
];

const LEVEL: Record<string, [string, string]> = {
  patch: ["修補更新 patch", "wb-pill muted"],
  minor: ["功能更新 minor", "wb-pill"],
  major: ["主版本更新 major", "wb-pill warn wb-upd-strong"],
};

export const Spin = () => <span className="wb-upd-spin" aria-hidden="true" />;

/** 「≥ 22.0.0」；推不出時照原字串 */
export function nodeReq(r: UpdResult): string {
  if (!r.engines) return "—";
  return r.engines.replace(/^>=\s*/, "≥ ");
}

export function UpdatePills({ u }: { u: UpdState }) {
  const r = u.res;
  if (u.status === "checking" && !r)
    return (
      <span className="wb-upd-line">
        <Spin />
        正在向 npm registry 查詢…
      </span>
    );
  if (!r) return <span className="wb-pill muted">尚未檢查新版</span>;
  const now = Date.now();
  const out: ReactNode[] = [];
  if (r.deprecated)
    out.push(
      <span key="d" className="wb-pill danger wb-upd-strong">
        目前版本已棄用
      </span>,
    );
  if (r.ahead) {
    // 目前版本比 npm 新（開發中、bump 了還沒發佈；Q4）。npm 的版本號在版本列與 Drawer 的套件資訊對照
    out.push(
      <span key="a" className="wb-pill muted">
        尚未發佈的版本
      </span>,
    );
    return <>{out}</>;
  }
  if (!r.level) {
    out.push(
      <span key="ok" className="wb-pill ok">
        <Check size={11} strokeWidth={2.4} style={{ marginRight: 4 }} aria-hidden="true" />
        已是最新版
      </span>,
    );
    if (r.curDate)
      out.push(
        <span key="r" className="wb-pill muted">
          發佈於 {daysLabel(r.curDate, now)}
        </span>,
      );
    return <>{out}</>;
  }
  const [lbl, cls] = LEVEL[r.level];
  out.push(
    <span key="l" className={cls}>
      {lbl}
    </span>,
    <span key="b" className="wb-pill muted tnum">
      落後 {r.behind} 個版本
    </span>,
  );
  if (r.latestDate)
    out.push(
      <span key="t" className="wb-pill muted">
        最新版 {daysLabel(r.latestDate, now)}發佈
      </span>,
    );
  return <>{out}</>;
}

export function UpdateNotes({ r, counts }: { r: UpdResult | null; counts: Partial<Record<ClCat, number>> | null }) {
  if (!r) return null;
  const notes: ReactNode[] = [];
  if (r.deprecated)
    notes.push(
      <div key="dep" className="wb-upd-note danger" role="status">
        <TriangleAlert size={15} strokeWidth={1.7} aria-hidden="true" />
        <div>
          <div className="wb-upd-note-t">v{r.cur} 已被標記為棄用</div>
          <div>
            npm 上的說明：「{r.deprecated}」建議直接升級到 v{r.latest}。
          </div>
        </div>
      </div>,
    );
  if (r.level && r.needsNode)
    notes.push(
      <div key="node" className="wb-upd-note">
        <TriangleAlert size={15} strokeWidth={1.7} aria-hidden="true" />
        <div>
          <div className="wb-upd-note-t">升級前需要先升級 Node</div>
          {/* 不分 viewer／部署站的通用文案（Q3 = D，規格 §8） */}
          <div>
            v{r.latest} 要求 Node {nodeReq(r)}，目前環境是 Node {r.userNode}。請先升級 Node（部署站請調整建置環境的 Node 版本，例如 Netlify 的{" "}
            <code className="wb-upd-code">NODE_VERSION</code>），再執行升級指令。
            <a href="https://nodejs.org/" target="_blank" rel="noopener">
              下載 Node.js ↗
            </a>
          </div>
        </div>
      </div>,
    );
  if (r.level === "major" && !r.needsNode)
    notes.push(
      <div key="major" className="wb-upd-note">
        <TriangleAlert size={15} strokeWidth={1.7} aria-hidden="true" />
        <div>
          <div className="wb-upd-note-t">主版本更新可能有破壞性變更</div>
          <div>
            {counts ? `這次有 ${counts.removed ?? 0} 項移除、${counts.changed ?? 0} 項變更。` : ""}
            升級前請先看更新內容，必要時對照遷移指南。
          </div>
        </div>
      </div>,
    );
  return notes.length ? <div className="wb-upd-notes">{notes}</div> : null;
}

function UpdateCmd({ label, cmd }: { label: string; cmd: string }) {
  const [state, setState] = useState<"" | "done" | "fail">("");
  const timer = useRef<number | null>(null);
  const codeRef = useRef<HTMLElement>(null);
  useEffect(() => () => void (timer.current !== null && window.clearTimeout(timer.current)), []);
  const copy = async () => {
    const ok = await writeClipboard(cmd);
    setState(ok ? "done" : "fail");
    if (!ok && codeRef.current) {
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(codeRef.current);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState(""), 1600);
  };
  return (
    <div className="wb-upd-cmd">
      <span className="wb-upd-cmd-l">{label}</span>
      <code ref={codeRef}>{cmd}</code>
      <button type="button" className={"wb-upd-copy" + (state ? " " + state : "")} onClick={copy} aria-label={"複製指令 " + cmd}>
        {state === "done" ? <Check size={13} strokeWidth={2.2} aria-hidden="true" /> : <Copy size={13} strokeWidth={1.7} aria-hidden="true" />}
        {state === "done" ? "已複製" : state === "fail" ? "無法複製" : "複製"}
      </button>
      <span className="wb-upd-sr" aria-live="polite">
        {state === "done" ? "已複製到剪貼簿" : state === "fail" ? "無法複製，請手動選取" : ""}
      </span>
    </div>
  );
}

export function UpdateCmds() {
  return (
    <div className="wb-upd-cmds">
      {UPD_CMDS.map((c) => (
        <UpdateCmd key={c.cmd} label={c.label} cmd={c.cmd} />
      ))}
    </div>
  );
}

function renderTokens(tokens: InlineToken[], key = "t"): ReactNode[] {
  return tokens.map((k, i) => {
    const id = `${key}-${i}`;
    if (k.t === "text") return <span key={id}>{k.s}</span>;
    if (k.t === "code")
      return (
        <code key={id} className="wb-upd-code">
          {k.s}
        </code>
      );
    if (k.t === "bold") return <strong key={id}>{renderTokens(k.c, id)}</strong>;
    return (
      <a key={id} href={k.href} target="_blank" rel="noopener">
        {renderTokens(k.c, id)}
      </a>
    );
  });
}

/** CHANGELOG 的行內 Markdown（切 token 後組 React 節點，不用 dangerouslySetInnerHTML） */
export function Inline({ text, base }: { text: string; base: string }) {
  return <>{renderTokens(inlineTokens(text, base))}</>;
}
