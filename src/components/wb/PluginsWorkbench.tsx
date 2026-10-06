// /plugins（規格 §8.6）：資料檔 Tab（依資料夾分組、單擊即進渲染頁）與已安裝外掛 Tab（列 + Plugin Drawer）。
// 列上有「啟用／停用」與「未映射／無命中」；「渲染錯誤」「不相容」都不做（Q23、Q24）。Switch 由 Task 71 接上。
// 沒有資料檔、沒有外掛時的畫面依 lib/wb-plugin-env.ts 的 reason 分派（docs/notecraft-workbench-plugin-empty-states.md）。
import { useEffect, useMemo, useState } from "react";
import { Folder, Plug, Search, Sparkles } from "lucide-react";
import type { WbDataFile, WbPlugin } from "@/lib/wb-types";
import { derivePluginEnv, pluginRowState } from "@/lib/wb-plugin-env";
import { ROOT_GROUP } from "@/lib/wb-types";
import { md } from "@/lib/wb-time";
import WbHeader from "./WbHeader";
import DataFileRow from "./DataFileRow";
import PluginDrawer from "./PluginDrawer";
import { GroupHeader, Ic, Pill, SearchBox, StatStrip } from "./ui";
import { PluginSwitch, PluginToggleButton } from "./PluginToggle";
import { withBase } from "@/lib/base";
import { PlDataEmpty, PlHint, PlInstallEmpty } from "./plugins/PluginEmpty";

type Tab = "files" | "installed";

export default function PluginsWorkbench({
  files = [],
  plugins = [],
  enabledSystem = true,
  appVersion = "",
  isDev = false,
  workspaceLabel = "",
}: {
  files?: WbDataFile[];
  plugins?: WbPlugin[];
  enabledSystem?: boolean;
  appVersion?: string;
  isDev?: boolean;
  /** 筆記資料夾的顯示名稱（WbIndex.workspaceLabel，不含本機絕對路徑）；情境 6 的提示用 */
  workspaceLabel?: string;
}) {
  const [tab, setTab] = useState<Tab>("files");
  // 樂觀更新後的啟用狀態；API 成功後整頁重載，build 期資料才會跟上
  const [override, setOverride] = useState<Record<string, boolean>>({});
  const isOn = (p: WbPlugin) => override[p.id] ?? p.enabled;
  const onChanged = (id: string) => (v: boolean) => {
    setOverride((o) => ({ ...o, [id]: v }));
    setTimeout(() => window.location.reload(), 600);
  };
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tab") === "installed") setTab("installed");
  }, []);
  const goTab = (t: Tab) => {
    setTab(t);
    window.history.replaceState(null, "", window.location.pathname + (t === "installed" ? "?tab=installed" : ""));
  };

  const ql = q.trim().toLowerCase();
  const shown = useMemo(
    () => files.filter((f) => !ql || (f.title + " " + f.relPath + " " + f.pluginId).toLowerCase().includes(ql)),
    [files, ql],
  );
  const groups = useMemo(() => {
    const out: { key: string; label: string; rows: WbDataFile[] }[] = [];
    for (const f of shown) {
      const key = f.dir;
      let g = out.find((x) => x.key === key);
      if (!g) {
        g = { key, label: key || ROOT_GROUP, rows: [] };
        out.push(g);
      }
      g.rows.push(f);
    }
    return out.sort((a, b) => (a.key === "" ? -1 : b.key === "" ? 1 : a.key.localeCompare(b.key, "zh-Hant")));
  }, [shown]);

  // 情境以 build 期資料判定。切換啟用狀態後到重載前（600ms），啟用後會命中哪些檔還不知道：
  // 用覆寫後的狀態重算會把「都停用了」錯判成「有規則但沒命中」，所以這段期間只收起提示，重載後由新資料接手
  const env = derivePluginEnv({ plugins, hasConfig: enabledSystem, fileCount: files.length });
  const toggling = Object.keys(override).length > 0;
  const noFiles = files.length === 0;
  const noPlugins = plugins.length === 0;
  const REASON_PILL = { nomap: "未設定映射", nohit: "映射無命中", disabled: "外掛全部停用" } as const;
  const pills: { label: string; tone?: "muted" | "warn" }[] = !noFiles
    ? [{ label: `${files.length} 個資料檔`, tone: "muted" }, { label: `已裝 ${plugins.length} 個外掛` }]
    : !isDev
      ? []
      : noPlugins
        ? [{ label: "未安裝外掛", tone: "muted" }]
        : [
            { label: `已裝 ${plugins.length} 個外掛` },
            ...(env.reason === "nomap" || env.reason === "nohit" || env.reason === "disabled"
              ? [{ label: REASON_PILL[env.reason], tone: "warn" as const }]
              : []),
          ];
  const installedLbl = !noPlugins
    ? ".notecraft/plugins.json ・ 展開可看映射規則、設定覆寫與外掛檔案"
    : !isDev
      ? "這個站沒有使用外掛"
      : env.reason === "fresh"
        ? "尚未建立 .notecraft/plugins.json ・ 沒有已安裝的外掛"
        : ".notecraft/plugins.json ・ 沒有已安裝的外掛";

  const enabledCount = plugins.filter(isOn).length;
  const mappedCount = new Set(plugins.flatMap((p) => p.matched)).size;
  const selPlugin = sel ? (plugins.find((p) => p.id === sel) ?? null) : null;

  return (
    <>
      <WbHeader
        title="Plugin 資料檔"
        crumbs={[{ label: "NoteCraft", href: withBase("/") }, { label: "Plugin" }]}
        pills={pills}
        tabs={[
          { key: "files", label: "資料檔" },
          { key: "installed", label: "已安裝外掛" },
        ]}
        activeTab={tab}
        onTab={goTab}
        isDev={isDev}
      />
      {tab === "files" ? (
        <>
          <div className="wb-tb">
            {noFiles ? (
              <span className="wb-tb-lbl">{isDev ? "沒有資料檔 ・ 由外掛渲染的 JSON 檔會列在這裡" : "這個站沒有使用資料檔"}</span>
            ) : (
              <>
                <span className="wb-tb-lbl">所有 plugin 資料檔，依所在資料夾分組</span>
                <div className="wb-tb-right">
                  <SearchBox value={q} onChange={setQ} icon={Search} placeholder="搜尋檔名、plugin…" />
                  <span className="wb-count tnum">{shown.length} 個</span>
                </div>
              </>
            )}
          </div>
          <div id="nc-scroll" className="wb-body flush">
            {noFiles ? (
              <PlDataEmpty
                reason={env.reason}
                isDev={isDev}
                pluginCount={plugins.length}
                activeRules={env.activeRules}
                onGoInstalled={() => goTab("installed")}
              />
            ) : shown.length === 0 ? (
              <div className="wb-empty">沒有符合條件的資料檔。</div>
            ) : (
              groups.map((g) => {
                const plugs = new Set(g.rows.map((r) => r.pluginId)).size;
                const latest = g.rows.reduce((a, r) => (r.updatedAt > a ? r.updatedAt : a), "");
                return (
                  <section key={g.key} aria-label={g.label}>
                    <GroupHeader
                      name={g.label}
                      count={g.rows.length}
                      icon={Folder}
                      gc="wb-gc-gold"
                      collapsed={!!collapsed[g.key]}
                      onToggle={() => setCollapsed((c) => ({ ...c, [g.key]: !c[g.key] }))}
                      stats={`${plugs} 個 plugin ・ 最後更新 ${md(latest)}`}
                    />
                    {collapsed[g.key] ? null : g.rows.map((f) => <DataFileRow key={f.routePath} file={f} />)}
                  </section>
                );
              })
            )}
          </div>
        </>
      ) : (
        <>
          <div className="wb-tb">
            <span className="wb-tb-lbl">{installedLbl}</span>
            {noPlugins ? null : (
              <div className="wb-tb-right">
                <span className="wb-count tnum">{plugins.length} 個外掛</span>
              </div>
            )}
          </div>
          <div id="nc-scroll" className="wb-body flush">
            {noPlugins ? (
              <PlInstallEmpty reason={env.reason} isDev={isDev} />
            ) : (
              <>
                <StatStrip
                  items={[
                    { label: "已安裝", value: plugins.length },
                    { label: "啟用中", value: enabledCount, tone: "ok" },
                    { label: "映射資料檔", value: mappedCount },
                    { label: "notecraftapp", value: `v${appVersion}` },
                  ]}
                />
                {isDev && !toggling ? (
                  <PlHint
                    env={env}
                    enabledIds={plugins.filter((p) => p.enabled).map((p) => p.id)}
                    pluginCount={plugins.length}
                    workspaceLabel={workspaceLabel}
                  />
                ) : null}
                <GroupHeader name="已安裝外掛" count={plugins.length} icon={Plug} gc="wb-gc-gold" stats="點一列看設定、映射與檔案" />
                {plugins.map((p) => {
                  const rs = pluginRowState({ ...p, enabled: isOn(p) });
                  return (
                    <div key={p.id} className={"wb-row" + (sel === p.id ? " sel" : "") + (isOn(p) ? "" : " dim")}>
                      <button
                        type="button"
                        className="wb-row-main"
                        aria-pressed={sel === p.id}
                        onClick={() => setSel((cur) => (cur === p.id ? null : p.id))}
                      >
                        <Ic icon={Plug} size={13} color={isOn(p) ? "var(--wb-gold)" : "var(--wb-ink-3)"} />
                        <span className="wb-row-t">{p.title}</span>
                        <span className="wb-row-p">{p.id}</span>
                        <span className="wb-tagchip tnum">v{p.version}</span>
                        {rs === "unmapped" ? <Pill tone="warn">未映射</Pill> : rs === "nohit" ? <Pill tone="warn">無命中</Pill> : null}
                        {rs === "off" ? (
                          <span className="wb-row-d tnum" style={{ width: 34, flex: "0 0 34px" }} title="停用中，不處理任何檔案">
                            —
                          </span>
                        ) : (
                          <span className="wb-row-d tnum" style={{ width: 34, flex: "0 0 34px" }}>
                            {p.matched.length} 檔
                          </span>
                        )}
                        <Pill tone={isOn(p) ? "ok" : "muted"} style={{ width: 44, justifyContent: "center" }}>
                          {isOn(p) ? "啟用" : "停用"}
                        </Pill>
                      </button>
                      {isDev ? <PluginSwitch id={p.id} title={p.title} enabled={isOn(p)} onChanged={onChanged(p.id)} /> : null}
                    </div>
                  );
                })}
                {isDev ? (
                  <div className="wb-callout">
                    <Ic icon={Sparkles} size={14} color="var(--wb-blue-l)" />
                    <div>
                      <div className="wb-callout-t">安裝新外掛</div>
                      <div className="wb-callout-b">
                        執行 <span className="wb-code">npx notecraftapp install-plugin &lt;id&gt;</span>，檔案會寫入{" "}
                        <span className="wb-code">.notecraft/plugins/</span> 並產生型別定義 <span className="wb-code">_types.d.ts</span>。
                        停用外掛不會把它移出 bundle；要解除安裝請用 <span className="wb-code">install-plugin --remove &lt;id&gt;</span>。
                      </div>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </>
      )}
      {selPlugin ? (
        <PluginDrawer
          plugin={{ ...selPlugin, enabled: isOn(selPlugin) }}
          files={files}
          onClose={() => setSel(null)}
          action={isDev ? <PluginToggleButton id={selPlugin.id} enabled={isOn(selPlugin)} onChanged={onChanged(selPlugin.id)} /> : null}
        />
      ) : null}
    </>
  );
}
