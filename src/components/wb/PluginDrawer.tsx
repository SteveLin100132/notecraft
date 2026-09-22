// Plugin Drawer（規格 §8.6）。「不相容」警告框與「渲染錯誤」pill 都不做（Q23、Q24）；
// 「引擎需求」照列原字串供人工判斷。停用／啟用按鈕由 Task 71 接上。
import type { ReactNode } from "react";
import type { WbDataFile, WbPlugin } from "@/lib/wb-types";
import DrawerShell from "./DrawerShell";
import { Pill } from "./ui";

export default function PluginDrawer({
  plugin,
  files = [],
  onClose = () => {},
  action,
}: {
  plugin: WbPlugin;
  /** 命中的資料檔（完整資料，供標題與路徑） */
  files?: WbDataFile[];
  onClose?: () => void;
  /** Task 71：停用／啟用按鈕 */
  action?: ReactNode;
}) {
  const p = plugin;
  const src =
    p.source.kind === "builtin"
      ? "內建 ・ 隨 notecraftapp 發佈"
      : `已安裝${p.source.origin ? ` ・ ${p.source.origin}` : ""}${p.source.commit ? ` @ ${p.source.commit}` : ""}`;
  const meta: [string, ReactNode][] = [
    ["id", <code key="id">{p.id}</code>],
    ["版本", `v${p.version}`],
    ["作者", p.author || "—"],
    ["來源", src],
    ["引擎需求", p.engines ? `notecraftapp ${p.engines}` : "—"],
    ["data schema", p.dataSchema || "—"],
    ["範例資料", p.example || "—"],
  ];
  const options = p.mappings.map((m) => m.options).filter((o) => o && Object.keys(o).length > 0);
  const byRoute = new Map(files.map((f) => [f.routePath, f]));
  const inactive = p.inactiveMatches;

  return (
    <DrawerShell crumb={p.dir} labelledBy="wb-pl-title" onClose={onClose}>
      <h2 className="wb-dw-t" id="wb-pl-title">
        {p.title}
      </h2>
      <div className="wb-dw-pills">
        <Pill tone={p.enabled ? "ok" : "muted"}>{p.enabled ? "啟用中" : "已停用"}</Pill>
        <Pill>v{p.version}</Pill>
      </div>
      {p.description ? <p className="wb-dw-p" style={{ paddingTop: 10 }}>{p.description}</p> : null}
      <div className="wb-dw-actions">
        {action}
        {p.homepage ? (
          <a className="wb-btn-ghost" href={p.homepage} target="_blank" rel="noreferrer">
            homepage ↗
          </a>
        ) : null}
      </div>

      <div className="wb-dw-sec">Manifest</div>
      <div className="wb-dw-meta">
        {meta.map(([k, v]) => (
          <div key={k} className="wb-dw-mrow">
            <span className="wb-dw-mk">{k}</span>
            <span className="wb-dw-mv">{v}</span>
          </div>
        ))}
      </div>

      <div className="wb-dw-sec">
        映射規則 <span className="wb-dw-sec-n">plugins.json</span>
      </div>
      {p.mappings.length ? (
        <div className="wb-pl-globs" style={{ padding: "6px 0 10px", flexDirection: "column", alignItems: "flex-start" }}>
          {p.mappings.map((m, i) => (
            <div key={i} style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
              {m.files.map((g) => (
                <span key={g} className="wb-code">
                  {g}
                </span>
              ))}
              {m.exclude?.length ? (
                <>
                  <span className="wb-pl-note">排除</span>
                  {m.exclude.map((g) => (
                    <span key={"x" + g} className="wb-code">
                      {g}
                    </span>
                  ))}
                </>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="wb-dw-p" style={{ fontSize: 12.5, color: "var(--wb-ink-3)" }}>
          plugins.json 沒有指向這個外掛的規則。
        </p>
      )}

      <div className="wb-dw-sec">
        命中的資料檔 <span className="wb-dw-sec-n tnum">{p.matched.length + inactive.length}</span>
      </div>
      {p.matched.length || inactive.length ? (
        <div className="wb-dw-markers">
          {p.matched.map((r) => {
            const f = byRoute.get(r);
            return (
              <a key={r} className="wb-marker link" href={`/view/${r}`}>
                <span className="wb-dot ok" aria-hidden="true" />
                <span className="wb-marker-t">{f?.title ?? r}</span>
                <span className="wb-marker-s">{f?.relPath ?? r}</span>
              </a>
            );
          })}
          {inactive.map((r) => (
            <div key={"i" + r} className="wb-marker" style={{ color: "var(--wb-ink-3)" }} title="外掛已停用，這個檔不會產生頁面">
              <span className="wb-dot" aria-hidden="true" />
              <span className="wb-marker-t" style={{ color: "var(--wb-ink-3)" }}>
                {r}
              </span>
              <span className="wb-marker-s">已停用</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="wb-dw-p" style={{ fontSize: 12.5, color: "var(--wb-ink-3)" }}>
          沒有檔案符合這些映射。
        </p>
      )}

      {options.length ? (
        <>
          <div className="wb-dw-sec">
            設定覆寫 <span className="wb-dw-sec-n">options</span>
          </div>
          {options.map((o, i) => (
            <pre key={i} className="wb-pre" style={{ padding: "10px 12px", borderRadius: 6, border: "1px solid var(--wb-line)", marginBottom: 6 }}>
              {JSON.stringify(o, null, 2)}
            </pre>
          ))}
        </>
      ) : null}

      <div className="wb-dw-sec">外掛檔案</div>
      <div className="wb-dw-markers">
        {p.assets.map((a) => (
          <div key={a.path} className="wb-marker">
            <span className="wb-marker-t" style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
              {a.path}
            </span>
            <span className="wb-marker-s">{a.role}</span>
          </div>
        ))}
      </div>
    </DrawerShell>
  );
}
