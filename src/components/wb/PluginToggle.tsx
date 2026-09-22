// Plugin 啟用／停用（Task 71）。dev 才渲染：樂觀更新 + Toast，API 失敗時還原並提示。
// 停用不是解除安裝 —— renderer 仍在 client chunk 裡；要離開 bundle 得用 install-plugin --remove。
import { useState } from "react";
import { toast } from "@/lib/prompts";
import { Switch } from "./ui";

export async function setPluginEnabled(id: string, enabled: boolean): Promise<boolean> {
  try {
    const res = await fetch(`/api/plugins/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      toast(data.error || "更新失敗", "x");
      return false;
    }
    toast(enabled ? "已啟用外掛，頁面將重新整理" : "已停用外掛，頁面將重新整理", "check");
    return true;
  } catch {
    toast("dev API 不可用", "x");
    return false;
  }
}

export function useToggle(id: string, initial: boolean, onChanged?: (v: boolean) => void) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  const toggle = async (next: boolean) => {
    if (busy) return;
    setBusy(true);
    setOn(next); // 樂觀
    const ok = await setPluginEnabled(id, next);
    if (!ok) setOn(!next);
    else onChanged?.(next);
    setBusy(false);
  };
  return { on, busy, toggle };
}

export function PluginSwitch({ id, title, enabled, onChanged }: { id: string; title: string; enabled: boolean; onChanged?: (v: boolean) => void }) {
  const t = useToggle(id, enabled, onChanged);
  return <Switch checked={t.on} disabled={t.busy} label={`啟用 ${title}`} onChange={(v) => void t.toggle(v)} />;
}

export function PluginToggleButton({ id, enabled, onChanged }: { id: string; enabled: boolean; onChanged?: (v: boolean) => void }) {
  const t = useToggle(id, enabled, onChanged);
  return (
    <button type="button" className={t.on ? "wb-btn-ghost" : "wb-btn-solid"} disabled={t.busy} onClick={() => void t.toggle(!t.on)}>
      {t.on ? "停用此外掛" : "啟用此外掛"}
    </button>
  );
}
