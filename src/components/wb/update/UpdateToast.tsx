// 發現新版的 toast（規格 docs/notecraft-workbench-update-check.md §6.5；handoff §5）。
// 不是 ToastHost 的提示：版面、動作鈕、10 秒計時都不同。不分 viewer／部署站（Q3 = D），只有三種文案。
import { useEffect, useRef } from "react";
import { ArrowUp, TriangleAlert, X } from "lucide-react";
import type { UpdResult } from "@/lib/update-check";
import { pushEscape } from "@/lib/wb-escape";

const DURATION = 10_000;

export default function UpdateToast({
  r,
  onOpen,
  onSkip,
  onClose,
}: {
  r: UpdResult;
  onOpen: () => void;
  onSkip: () => void;
  onClose: () => void;
}) {
  const timer = useRef<number | null>(null);
  const hold = useRef({ hover: false, focus: false });

  const stop = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  const start = () => {
    stop();
    if (hold.current.hover || hold.current.focus) return;
    timer.current = window.setTimeout(onClose, DURATION);
  };

  useEffect(() => {
    start();
    const pop = pushEscape(onClose);
    return () => {
      stop();
      pop();
    };
    // 每個 toast 只登記一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r.latest]);

  const dep = !!r.deprecated;
  const title = dep ? `你使用的 v${r.cur} 已被棄用` : `NoteCraftApp v${r.latest} 已發佈`;
  const sub = dep
    ? `建議升級到 v${r.latest}，原因見更新內容`
    : r.level === "major"
      ? `主版本更新，可能有破壞性變更 ・ 落後 ${r.behind} 個版本`
      : `目前 v${r.cur} ・ 落後 ${r.behind} 個版本`;

  return (
    <div
      className="wb-upd-toast-wrap"
      onPointerEnter={() => {
        hold.current.hover = true;
        stop();
      }}
      onPointerLeave={() => {
        hold.current.hover = false;
        start();
      }}
      onFocus={() => {
        hold.current.focus = true;
        stop();
      }}
      onBlur={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        hold.current.focus = false;
        start();
      }}
    >
      <div className={"wb-upd-toast" + (dep ? " danger" : "")} role="status">
        <span className="wb-upd-toast-ic" aria-hidden="true">
          {dep ? <TriangleAlert size={17} strokeWidth={2} /> : <ArrowUp size={17} strokeWidth={2} />}
        </span>
        <div className="wb-upd-toast-b">
          <div className="wb-upd-toast-t">{title}</div>
          <div className="wb-upd-toast-s tnum">{sub}</div>
          <div className="wb-upd-toast-a">
            <button type="button" className="pri" onClick={onOpen}>
              查看更新內容
            </button>
            {!dep ? (
              <button type="button" onClick={onSkip}>
                略過這一版
              </button>
            ) : null}
          </div>
        </div>
        <button type="button" className="wb-upd-toast-x" onClick={onClose} aria-label="關閉通知">
          <X size={13} strokeWidth={1.7} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
