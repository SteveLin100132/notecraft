// 頁籤右鍵選單（規格 §6.3、§6.5；對照 prototype PtTabMenu）。
import { useEffect, useRef, type ComponentType, type ReactNode } from "react";
import { ExternalLink, Link, Pin, X, type LucideProps } from "lucide-react";
import type { TabEntry } from "@/lib/wb-tabs";
import TabPop, { menuArrows } from "./TabPop";

export interface TabMenuActions {
  close: (key: string) => void;
  closeOthers: (key: string) => void;
  closeRight: (key: string) => void;
  closeAll: () => void;
  pin: (key: string) => void;
  copy: (t: TabEntry) => void;
  newWindow: (t: TabEntry) => void;
}

export interface TabMenuProps {
  tab: TabEntry;
  tabs: TabEntry[];
  x: number;
  y: number;
  returnFocus?: HTMLElement | null;
  onClose: () => void;
  act: TabMenuActions;
}

function Mi({ icon: Icon, label, kbd, disabled, onClick }: { icon?: ComponentType<LucideProps>; label: ReactNode; kbd?: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" role="menuitem" className="nt-mi" disabled={disabled} onClick={onClick}>
      <span className="nt-mi-ic" aria-hidden="true">
        {Icon ? <Icon size={13} strokeWidth={1.7} /> : null}
      </span>
      <span className="nt-mi-l">{label}</span>
      {kbd ? <span className="nt-kbd">{kbd}</span> : null}
    </button>
  );
}

export default function TabMenu({ tab: t, tabs, x, y, returnFocus, onClose, act }: TabMenuProps) {
  const body = useRef<HTMLDivElement>(null);
  const i = tabs.findIndex((x2) => x2.key === t.key);
  const right = tabs.slice(i + 1).filter((x2) => !x2.pinned);
  const others = tabs.filter((x2) => x2.key !== t.key && !x2.pinned);
  const any = tabs.some((x2) => !x2.pinned);
  const run = (f: () => void) => () => {
    onClose();
    f();
  };

  // 開啟時焦點落在第一個可用項
  useEffect(() => {
    body.current?.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')?.focus();
  }, []);

  return (
    <TabPop x={x} y={y} width={232} label={`${t.title} 的頁籤選單`} onClose={onClose} returnFocus={returnFocus}>
      <div ref={body} onKeyDown={menuArrows}>
        <div className="nt-pop-h" title={t.title}>
          {t.title}
        </div>
        <Mi icon={X} label="關閉" kbd="⌥W" disabled={t.pinned} onClick={run(() => act.close(t.key))} />
        <Mi label="關閉其他" disabled={others.length === 0} onClick={run(() => act.closeOthers(t.key))} />
        <Mi label="關閉右側" disabled={right.length === 0} onClick={run(() => act.closeRight(t.key))} />
        <Mi label="全部關閉" disabled={!any} onClick={run(act.closeAll)} />
        <div className="nt-pop-sep" role="separator" />
        <Mi icon={Pin} label={t.pinned ? "取消固定" : "固定頁籤"} onClick={run(() => act.pin(t.key))} />
        <div className="nt-pop-sep" role="separator" />
        <Mi icon={Link} label="複製連結" onClick={run(() => act.copy(t))} />
        <Mi icon={ExternalLink} label="在新視窗開啟" onClick={run(() => act.newWindow(t))} />
      </div>
    </TabPop>
  );
}
