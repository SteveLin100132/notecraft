// 複製鈕的狀態（檢查更新的升級指令、/plugins 空狀態的安裝指令與 plugins.json 範例共用）。
// 成功顯示「已複製」、失敗顯示「無法複製」並選取文字讓人手動複製，1600ms 後還原；
// 失敗時不謊報成功（docs/notecraft-workbench-plugin-empty-states.md §8.1，Q3）。
import { useEffect, useRef, useState, type RefObject } from "react";
import { writeClipboard } from "@/lib/clipboard";

export type CopyState = "" | "done" | "fail";

export function useCopyState<T extends HTMLElement>(
  text: string,
  onDone?: () => void,
): { state: CopyState; copy: () => Promise<void>; selectRef: RefObject<T> } {
  const [state, setState] = useState<CopyState>("");
  const timer = useRef<number | null>(null);
  const selectRef = useRef<T>(null);
  useEffect(() => () => void (timer.current !== null && window.clearTimeout(timer.current)), []);
  const copy = async () => {
    const ok = await writeClipboard(text);
    setState(ok ? "done" : "fail");
    if (ok) onDone?.();
    else if (selectRef.current) {
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(selectRef.current);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState(""), 1600);
  };
  return { state, copy, selectRef };
}
