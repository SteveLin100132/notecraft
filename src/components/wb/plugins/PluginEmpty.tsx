// /plugins 的空狀態與提示區塊（規格 docs/notecraft-workbench-plugin-empty-states.md §7；
// handoff design_handoff_plugin_empty_states/ 的 PtPlInstallEmpty／PtPlDataEmpty／PtPlHint／PlCmd／PlSnippet）。
// 情境由 lib/wb-plugin-env.ts 判定，這裡只依 reason 出文案。正式環境不出現任何 npx 指令或設定提示（§10）。
import type { ReactNode } from "react";
import { Check, Copy, FileText, Plug } from "lucide-react";
import type { PluginEnv, PluginReason } from "@/lib/wb-plugin-env";
import { INSTALL_BASE_CMD, OFFICIAL_PLUGINS, installCmd, mappingSnippet } from "@/lib/official-plugins";
import { toast } from "@/lib/toast";
import { useCopyState, type CopyState } from "../useCopyState";
import { Ic } from "../ui";
import PluginEmptyArt, { type PluginArtKind } from "./PluginEmptyArt";

function CopyBtn({ state, copy, label }: { state: CopyState; copy: () => void; label: string }) {
  return (
    <>
      <button type="button" className={"wb-upd-copy" + (state ? " " + state : "")} onClick={copy} aria-label={label}>
        {state === "done" ? <Check size={13} strokeWidth={2.2} aria-hidden="true" /> : <Copy size={13} strokeWidth={1.7} aria-hidden="true" />}
        {state === "done" ? "已複製" : state === "fail" ? "無法複製" : "複製"}
      </button>
      <span className="wb-upd-sr" aria-live="polite">
        {state === "done" ? "已複製到剪貼簿" : state === "fail" ? "無法複製，請手動選取" : ""}
      </span>
    </>
  );
}

/** 可複製的指令；`$` 只是提示字元，不在複製內容裡 */
export function PlCmd({ cmd, primary = false }: { cmd: string; primary?: boolean }) {
  const { state, copy, selectRef } = useCopyState<HTMLElement>(cmd, () => toast("已複製指令", "check"));
  return (
    <div className={"pl-cmd" + (primary ? " primary" : "")}>
      <span className="pl-cmd-p" aria-hidden="true">
        $
      </span>
      <code ref={selectRef}>{cmd}</code>
      <CopyBtn state={state} copy={copy} label={"複製指令 " + cmd} />
    </div>
  );
}

export function PlSnippet({ name = "", text = "" }: { name?: string; text?: string }) {
  const { state, copy, selectRef } = useCopyState<HTMLPreElement>(text, () => toast(`已複製 ${name} 範例`, "check"));
  return (
    <div className="pl-snip">
      <div className="pl-snip-h">
        {name}
        <CopyBtn state={state} copy={copy} label={`複製 ${name} 範例`} />
      </div>
      <pre ref={selectRef} className="wb-pre">
        {text}
      </pre>
    </div>
  );
}

function Es({ art, title, sub, children }: { art: PluginArtKind; title: string; sub: string; children?: ReactNode }) {
  return (
    <div className="pl-es">
      <PluginEmptyArt kind={art} />
      <div className="pt-empty-t">{title}</div>
      <div className="pt-empty-s">{sub}</div>
      {children}
    </div>
  );
}

/** 「已安裝外掛」頁籤，0 個外掛（情境 3／4） */
export function PlInstallEmpty({ reason = "fresh", isDev = false }: { reason?: PluginReason; isDev?: boolean }) {
  if (!isDev) return <Es art="quiet" title="這個站沒有使用外掛" sub="外掛用來把 JSON 資料畫成頁面，這個站目前沒有用到。" />;
  return (
    <Es
      art="plug"
      title="還沒有安裝外掛"
      sub="外掛負責把結構化的 JSON 資料檔畫成頁面，例如把資料庫 schema 畫成關聯圖。先安裝外掛，再指定它要處理哪些檔案。"
    >
      <div className="pl-es-main">
        <PlCmd cmd={INSTALL_BASE_CMD} primary />
        <div className="pl-note">不帶 id 會列出官方外掛清單讓你選。</div>
        {reason === "fresh" ? (
          <div className="pl-fresh">
            <Ic icon={FileText} size={14} color="var(--wb-gold)" />
            <div>
              這個工作區還沒有 <span className="wb-code">.notecraft/plugins.json</span>。用下方帶 <span className="wb-code">--apply</span>{" "}
              的指令安裝，會一併建立這個檔案並寫入映射規則；只裝外掛的話，之後要自己建立。
            </div>
          </div>
        ) : null}
        <div className="pl-sec">官方外掛</div>
        <div className="pl-off">
          {OFFICIAL_PLUGINS.map((o) => (
            <div key={o.id} className="pl-off-row">
              <div className="pl-off-top">
                <Ic icon={Plug} size={13} color="var(--wb-gold)" />
                <span className="pl-off-t">{o.title}</span>
                <span className="pl-off-id">{o.id}</span>
              </div>
              <div className="pl-off-d">{o.description}</div>
              <PlCmd cmd={installCmd(o)} />
            </div>
          ))}
        </div>
      </div>
    </Es>
  );
}

/** 「資料檔」頁籤，沒有任何資料檔（情境 3–7） */
export function PlDataEmpty({
  reason = "fresh",
  isDev = false,
  pluginCount = 0,
  activeRules = 0,
  onGoInstalled = () => {},
}: {
  reason?: PluginReason;
  isDev?: boolean;
  pluginCount?: number;
  activeRules?: number;
  onGoInstalled?: () => void;
}) {
  if (!isDev)
    return (
      <Es art="quiet" title="這個站沒有使用資料檔" sub="這裡的內容都是筆記。資料檔是由外掛畫成的資料頁面，例如資料表關聯圖，這個站沒有發佈。" />
    );
  const C: Record<"fresh" | "nomap" | "nohit" | "disabled", [PluginArtKind, string, string, string]> = {
    fresh: [
      "data",
      "還沒有外掛，所以沒有資料檔",
      "資料檔是交給外掛渲染的 JSON 檔。這個工作區還沒有安裝任何外掛，JSON 檔會維持原樣，不會出現在這裡。",
      "查看官方外掛",
    ],
    nomap: [
      "map",
      "外掛還沒有分配到檔案",
      `已安裝 ${pluginCount} 個外掛，但 .notecraft/plugins.json 沒有任何映射規則，沒有 JSON 檔交給外掛處理。`,
      "設定映射規則",
    ],
    nohit: [
      "nohit",
      "映射規則沒有命中任何檔案",
      `plugins.json 有 ${activeRules} 條規則，但筆記資料夾裡沒有符合的 JSON 檔。可能是 glob 寫錯、檔案放在筆記資料夾外，或被 ignore.json 排除。`,
      "檢查映射規則",
    ],
    disabled: [
      "off",
      "外掛都停用了",
      `已安裝的 ${pluginCount} 個外掛都在停用中。停用的外掛不處理任何檔案，所以這裡沒有資料檔。`,
      "重新啟用外掛",
    ],
  };
  const key = reason === "noplugins" || reason === null ? "fresh" : reason;
  const [art, title, sub, act] = C[key];
  return (
    <Es art={art} title={title} sub={sub}>
      <button type="button" className="pt-empty-btn" onClick={onGoInstalled}>
        {act} →
      </button>
    </Es>
  );
}

/** 「已安裝外掛」頁籤，裝了卻沒在用（情境 5／6／7）；只在 dev 由呼叫端掛上 */
export function PlHint({
  env,
  enabledIds = [],
  pluginCount = 0,
  workspaceLabel = "",
}: {
  env: PluginEnv;
  /** 啟用中外掛的 id（plugins.json 範例只列它們；停用的寫了規則也不會生效） */
  enabledIds?: string[];
  pluginCount?: number;
  workspaceLabel?: string;
}) {
  const r = env.reason;
  if (r !== "nomap" && r !== "nohit" && r !== "disabled") return null;
  return (
    <div className="pl-hint" role="status">
      <Ic icon={Plug} size={15} color="var(--wb-gold)" />
      <div className="pl-hint-c">
        {r === "nomap" ? (
          <>
            <div className="pl-hint-t">外掛已安裝，但還沒有映射規則</div>
            <div className="pl-hint-b">
              在 <span className="wb-code">.notecraft/plugins.json</span> 指定每個外掛處理哪些 JSON 檔，命中的檔案才會變成資料檔頁。路徑相對於筆記資料夾。
            </div>
            <PlSnippet name=".notecraft/plugins.json" text={mappingSnippet(enabledIds)} />
          </>
        ) : null}
        {r === "nohit" ? (
          <>
            <div className="pl-hint-t">有 {env.activeRules} 條映射規則，但沒有命中任何檔案</div>
            <ul className="pl-hint-ul">
              <li>
                檢查 glob 寫法：<span className="wb-code">**/*.er.json</span> 會比對所有子資料夾，<span className="wb-code">*.er.json</span> 只比對最上層。
              </li>
              <li>
                資料檔必須放在筆記資料夾 <span className="wb-code">{workspaceLabel}</span> 內，規則裡的路徑相對於這個資料夾。
              </li>
              <li>
                檔案可能被 <span className="wb-code">.notecraft/ignore.json</span> 排除。
              </li>
            </ul>
            <div className="pl-hint-globs">
              {env.activeGlobs.map((g) => (
                <span key={g} className="wb-code">
                  {g}
                </span>
              ))}
            </div>
          </>
        ) : null}
        {r === "disabled" ? (
          <>
            <div className="pl-hint-t">{pluginCount} 個外掛都停用了</div>
            <div className="pl-hint-b">停用中的外掛不處理任何檔案。用列尾的開關重新啟用，命中的資料檔會出現在「資料檔」頁籤。</div>
          </>
        ) : null}
      </div>
    </div>
  );
}
