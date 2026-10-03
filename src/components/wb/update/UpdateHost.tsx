// 檢查更新的 host island（規格 docs/notecraft-workbench-update-check.md §3、§5、§6.1）。
// layout 每頁以 client:idle 掛一個：開頁自動檢查、接上一頁交棒的手動檢查、同步 Rail 圓點、渲染 toast 與 Drawer。
// SSR 不輸出任何東西。
import { useEffect } from "react";
import { createPortal } from "react-dom";
import UpdateDrawer from "./UpdateDrawer";
import { railHintOf } from "@/lib/update-check";
import { boot, check, dismissToast, getUpd, openDrawer, skip, takeHandoff, type UpdEnv } from "@/lib/update-store";
import { useUpd } from "./useUpd";
import UpdateToast from "./UpdateToast";

/** Rail「設定與關於」：圓點與 aria-label／title（Rail 是 .astro、不是 island，直接改 DOM 不會 hydration mismatch） */
function syncRail(hint: ReturnType<typeof railHintOf>): void {
  const a = document.getElementById("wb-rail-settings");
  const dot = a?.querySelector<HTMLElement>(".wb-upd-dot");
  if (!a || !dot) return;
  const label = hint ? `設定與關於 ・ ${hint.label}` : "設定與關於";
  a.setAttribute("aria-label", label);
  a.setAttribute("title", label);
  const prev = dot.hidden ? "" : dot.dataset.tone ?? "";
  if (!hint) {
    dot.hidden = true;
    delete dot.dataset.tone;
    return;
  }
  dot.dataset.tone = hint.tone;
  dot.hidden = false;
  // 預繪出來、色調沒變的不播；狀態改變（新出現、換色）才播 ncPop
  if (prev !== hint.tone) {
    dot.classList.remove("pop");
    void dot.offsetWidth;
    dot.classList.add("pop");
  }
}

export default function UpdateHost({ cur = "", userNode = "", repoBlobBase = "" }: Partial<UpdEnv>) {
  const u = useUpd({ cur, userNode, repoBlobBase });

  useEffect(() => {
    if (takeHandoff()) void check(true);
    else boot();
  }, []);

  // 用 getUpd() 而不是 u：hydration 那一輪 u 是 SSR 快照（無結果），拿它同步會先藏掉預繪的圓點再跳出來
  useEffect(() => {
    const s = getUpd();
    syncRail(railHintOf(s.res, s.skipped));
  }, [u.res, u.skipped]);

  const main = typeof document !== "undefined" ? document.getElementById("nc-main") : null;
  return (
    <>
      {u.toast ? <UpdateToast r={u.toast} onOpen={openDrawer} onSkip={() => skip(u.toast!.latest)} onClose={dismissToast} /> : null}
      {u.drawer && u.res && main ? createPortal(<UpdateDrawer u={u} />, main) : null}
    </>
  );
}
