import { useEffect, useRef, useState } from "react";

type Props = {
  command?: string;
  tone?: "sheet" | "paper";
};

/** 主要行動：一行 npx 指令與複製鈕。複製成功後兩秒內顯示「已複製」。 */
export default function CopyCommand({ command = "npx notecraftapp view ./docs", tone = "sheet" }: Props) {
  const [state, setState] = useState<"idle" | "done" | "fail">("idle");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setState("done");
    } catch {
      setState("fail");
    }
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 2000);
  }

  const label = state === "done" ? "已複製" : state === "fail" ? "請手動選取" : "複製";

  return (
    <div className={`cmd cmd--${tone}`}>
      <code className="cmd-text">
        <span className="cmd-prompt" aria-hidden="true">$</span>
        {command}
      </code>
      <button type="button" className="cmd-copy" onClick={copy} aria-label={`複製指令：${command}`}>
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
          {state === "done" ? (
            <path d="M3 8.5l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <>
              <rect x="5" y="5" width="8.5" height="8.5" />
              <path d="M3 10.5V2.5h8" />
            </>
          )}
        </svg>
        <span aria-live="polite">{label}</span>
      </button>
    </div>
  );
}
