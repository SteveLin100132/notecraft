// dev 樣式頁的內容：把 wb/ui.tsx 的每個元件、每個變體各擺一個。不進正式 build（頁面本身不產出）。
import { useState } from "react";
import { ArrowRight, FileText, Filter, Folder, Layers, Search, Tag } from "lucide-react";
import { Chip, GroupHeader, Ic, MiniButton, Pill, Progress, SearchBox, Seg, SeriesPill, StatStrip, Switch, TagChips } from "./ui";

export default function StyleSamples() {
  const [group, setGroup] = useState<"folder" | "series" | "tag" | "month">("folder");
  const [on, setOn] = useState(true);
  const [q, setQ] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  return (
    <>
      <div className="wb-tb">
        <Seg
          label="分組"
          value={group}
          onChange={setGroup}
          options={[
            { value: "folder", label: "資料夾" },
            { value: "series", label: "系列" },
            { value: "tag", label: "標籤" },
            { value: "month", label: "月份" },
          ]}
        />
        <span className="wb-tb-div" />
        <div className="wb-tb-group">
          <Chip icon={Filter} on>含 AI 標記</Chip>
          <Chip count={12}>待生成 </Chip>
          <Chip count={3}>收藏 </Chip>
        </div>
        <div className="wb-tb-right">
          <SearchBox value={q} onChange={setQ} icon={Search} placeholder="搜尋標題、路徑、標籤…" />
          <span className="wb-count tnum">59 篇</span>
        </div>
      </div>
      <div className="wb-body flush" style={{ overflow: "visible" }}>
        <StatStrip
          items={[
            { label: "章節", value: 7 },
            { label: "已完成", value: 3, tone: "ok" },
            { label: "閱讀中", value: 1, tone: "blue" },
            { label: "待生成", value: 12, tone: "warn" },
            { label: "進度", value: "43%" },
          ]}
        />
        <div className="wb-sumbar">
          <Progress pct={43} wide gc="wb-acc-orange" />
          <span className="wb-sum-note">下一章：Workshop 0625</span>
          <button className="wb-btn-ghost">重設進度</button>
        </div>
        <GroupHeader name="根目錄" count={3} gc="root" icon={Folder} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} stats="已生成 4 ・ 待生成 2 ・ 最後更新 09/18" />
        {collapsed ? null : (
          <>
            {(["warn", "ok", "muted"] as const).map((tone, i) => (
              <div key={tone} className={"wb-row" + (i === 1 ? " sel" : "")}>
                <button type="button" className="wb-row-main">
                  <Ic icon={FileText} size={13} color="var(--wb-ink-3)" />
                  <span className="wb-row-t">列高 38 的筆記列（{tone}）</span>
                  <span className="wb-row-p">private/sample-{i}.mdx</span>
                  <TagChips tags={["專案管理", "PM", "AI"]} />
                  <Pill tone={tone}>{tone === "warn" ? "待生成 2" : tone === "ok" ? "已生成 4" : "無標記"}</Pill>
                  <span className="wb-row-d tnum">09/18</span>
                </button>
                <a className="wb-row-open" href="#" aria-label="開啟筆記">
                  <ArrowRight size={14} strokeWidth={1.7} aria-hidden="true" />
                </a>
              </div>
            ))}
          </>
        )}
        <GroupHeader name="全部系列" count={2} gc="wb-gc-blue-l" icon={Layers} stats="點一列進入系列詳情" />
        <a className="wb-row wb-acc-orange" href="#">
          <span className="wb-sb-swatch" />
          <span className="wb-row-t">AI 顧問陪跑筆記系列</span>
          <span className="wb-row-p">5 章 ・ 已完成 2</span>
          <Progress pct={40} />
          <span className="wb-row-d tnum" style={{ width: 38, flex: "0 0 38px" }}>40%</span>
          <Pill style={{ width: 54, justifyContent: "center" }}>進行中</Pill>
        </a>
        <GroupHeader name="全部標籤" count={1} gc="wb-gc-ink3" icon={Tag} />
        <div className="wb-row">
          <Ic icon={Tag} size={13} color="var(--wb-ink-3)" />
          <span className="wb-row-t">專案管理</span>
          <span className="wb-row-p">最後使用 2026/09/18</span>
          <Progress pct={70} />
          <span className="wb-row-d tnum">12 篇</span>
          <MiniButton>重新命名</MiniButton>
          <MiniButton danger>刪除</MiniButton>
        </div>
        <div className="wb-set">
          <div className="wb-set-l">
            <div className="wb-set-k">Pill 變體 / Switch 38×22 / 系列 pill</div>
            <div className="wb-set-d">pill 高 20、按鈕高 30、chip 高 26、mini 高 24</div>
          </div>
          <div className="wb-set-c">
            <Pill>default</Pill>
            <Pill tone="ok">ok</Pill>
            <Pill tone="warn">warn</Pill>
            <Pill tone="muted">muted</Pill>
            <Pill tone="danger">danger</Pill>
            <SeriesPill accent="orange" title="陪跑" index={2} />
            <SeriesPill accent="navy" title="規格書" index={1} chip />
            <Switch checked={on} onChange={setOn} label="啟用" />
            <Seg boxed value={group} onChange={setGroup} options={[{ value: "folder", label: "List" }, { value: "series", label: "Board" }]} />
          </div>
        </div>
      </div>
    </>
  );
}
