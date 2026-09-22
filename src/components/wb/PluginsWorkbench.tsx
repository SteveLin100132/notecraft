// /plugins（規格 §8.6）：資料檔 Tab（依資料夾分組、單擊即進渲染頁）與已安裝外掛 Tab（列 + Plugin Drawer）。
// 列上只有「啟用／停用」一種狀態；「渲染錯誤」「不相容」都不做（Q23、Q24）。Switch 由 Task 71 接上。
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Folder, Plug, Search, Sparkles } from "lucide-react";
import type { WbDataFile, WbPlugin } from "@/lib/wb-types";
import { ROOT_GROUP } from "@/lib/wb-types";
import { md } from "@/lib/wb-time";
import WbHeader from "./WbHeader";
import DataFileRow from "./DataFileRow";
import PluginDrawer from "./PluginDrawer";
import { GroupHeader, Ic, Pill, SearchBox, StatStrip } from "./ui";

type Tab = "files" | "installed";

export function PluginEmptyState() {
  return (
    <div className="wb-empty" style={{ textAlign: "left", maxWidth: 560, margin: "0 auto", padding: "56px 16px" }}>
      <h2 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700, color: "var(--wb-ink)" }}>還沒有資料檔</h2>
      <p style={{ margin: 0, lineHeight: 1.8 }}>
        資料檔是被 plugin 畫成頁面的結構化 JSON。裝一個 plugin、在 <code className="wb-code">.notecraft/plugins.json</code>{" "}
        寫一條映射，符合的檔案就會出現在這裡。
      </p>
      <pre className="wb-pre" style={{ marginTop: 14, borderRadius: 6, border: "1px solid var(--wb-line)" }}>npx notecraftapp install-plugin</pre>
    </div>
  );
}

export default function PluginsWorkbench({
  files = [],
  plugins = [],
  enabledSystem = true,
  appVersion = "",
  isDev = false,
  renderSwitch,
  renderDrawerAction,
}: {
  files?: WbDataFile[];
  plugins?: WbPlugin[];
  enabledSystem?: boolean;
  appVersion?: string;
  isDev?: boolean;
  /** Task 71：列上的 Switch（dev） */
  renderSwitch?: (p: WbPlugin) => ReactNode;
  renderDrawerAction?: (p: WbPlugin) => ReactNode;
}) {
  const [tab, setTab] = useState<Tab>("files");
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

  const enabledCount = plugins.filter((p) => p.enabled).length;
  const mappedCount = new Set(plugins.flatMap((p) => p.matched)).size;
  const selPlugin = sel ? (plugins.find((p) => p.id === sel) ?? null) : null;

  return (
    <>
      <WbHeader
        title="Plugin 資料檔"
        crumbs={[{ label: "NoteCraft", href: "/" }, { label: "Plugin" }]}
        pills={[
          { label: `${files.length} 個資料檔`, tone: "muted" },
          { label: `已裝 ${plugins.length} 個外掛` },
        ]}
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
            <span className="wb-tb-lbl">所有 plugin 資料檔，依所在資料夾分組</span>
            <div className="wb-tb-right">
              <SearchBox value={q} onChange={setQ} icon={Search} placeholder="搜尋檔名、plugin…" />
              <span className="wb-count tnum">{shown.length} 個</span>
            </div>
          </div>
          <div id="nc-scroll" className="wb-body flush">
            {!enabledSystem ? (
              <PluginEmptyState />
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
            <span className="wb-tb-lbl">.notecraft/plugins.json ・ 點一列可看映射規則、設定覆寫與外掛檔案</span>
            <div className="wb-tb-right">
              <span className="wb-count tnum">{plugins.length} 個外掛</span>
            </div>
          </div>
          <div id="nc-scroll" className="wb-body flush">
            {!enabledSystem && plugins.length === 0 ? (
              <PluginEmptyState />
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
                <GroupHeader name="已安裝外掛" count={plugins.length} icon={Plug} gc="wb-gc-gold" stats="點一列看設定、映射與檔案" />
                {plugins.map((p) => (
                  <div key={p.id} className={"wb-row" + (sel === p.id ? " sel" : "") + (p.enabled ? "" : " dim")}>
                    <button
                      type="button"
                      className="wb-row-main"
                      aria-pressed={sel === p.id}
                      onClick={() => setSel((cur) => (cur === p.id ? null : p.id))}
                    >
                      <Ic icon={Plug} size={13} color={p.enabled ? "var(--wb-gold)" : "var(--wb-ink-3)"} />
                      <span className="wb-row-t">{p.title}</span>
                      <span className="wb-row-p">{p.id}</span>
                      <span className="wb-tagchip tnum">v{p.version}</span>
                      <span className="wb-row-d tnum" style={{ width: 34, flex: "0 0 34px" }}>
                        {p.matched.length + p.inactiveMatches.length} 檔
                      </span>
                      <Pill tone={p.enabled ? "ok" : "muted"} style={{ width: 44, justifyContent: "center" }}>
                        {p.enabled ? "啟用" : "停用"}
                      </Pill>
                    </button>
                    {renderSwitch?.(p)}
                  </div>
                ))}
                <div className="wb-callout">
                  <Ic icon={Sparkles} size={14} color="var(--wb-blue-l)" />
                  <div>
                    <div className="wb-callout-t">安裝新外掛</div>
                    <div className="wb-callout-b">
                      執行 <span className="wb-code">npx notecraftapp install-plugin &lt;id&gt;</span>，檔案會寫入{" "}
                      <span className="wb-code">.notecraft/plugins/</span> 並產生型別定義 <span className="wb-code">_types.d.ts</span>。
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
      {selPlugin ? (
        <PluginDrawer plugin={selPlugin} files={files} onClose={() => setSel(null)} action={renderDrawerAction?.(selPlugin)} />
      ) : null}
    </>
  );
}
