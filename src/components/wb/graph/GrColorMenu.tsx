// 著色依據的下拉（handoff §2.1）。自訂 listbox、不用原生 <select>；選單 position:fixed（Toolbar 有 overflow，不能用 absolute）。
// Esc 走共用堆疊（lib/wb-escape.ts 的 LIFO；handoff 的「優先級 35」在這個 codebase 不存在，規格 §14 D2）。
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";
import { GR_COLOR_BY } from "@/lib/wb-graph";
import type { GraphColorBy } from "@/lib/wb-graph";
import { pushEscape } from "@/lib/wb-escape";

/** 按鈕與選項上的三顆色點預覽 */
const swatches = (v: GraphColorBy): string[] =>
  v === "none"
    ? ["var(--wb-gr-c0)", "var(--wb-gr-c0)", "var(--wb-gr-c0)"]
    : v === "folder"
      ? ["var(--wb-gr-c1)", "var(--wb-gr-c2)", "var(--wb-gr-c3)"]
      : ["var(--wb-gr-c1)", "var(--wb-gr-c4)", "var(--wb-gr-c0)"];

export default function GrColorMenu({ value = "folder", onChange = () => {} }: { value?: GraphColorBy; onChange?: (v: GraphColorBy) => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [hi, setHi] = useState(0);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const idx = Math.max(0, GR_COLOR_BY.findIndex((x) => x.value === value));
  const n = GR_COLOR_BY.length;

  const show = () => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    setPos({ left: r.left, top: r.bottom + 6 });
    setHi(idx);
    setOpen(true);
  };
  const close = (focus: boolean) => {
    setOpen(false);
    if (focus) btn.current?.focus();
  };
  const pick = (i: number) => {
    onChange(GR_COLOR_BY[i].value);
    close(true);
  };

  useEffect(() => {
    if (!open) return;
    list.current?.focus();
    return pushEscape(() => close(true));
  }, [open]);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((h) => (h + 1) % n);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((h) => (h - 1 + n) % n);
    } else if (e.key === "Home") {
      e.preventDefault();
      setHi(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setHi(n - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick(hi);
    } else if (e.key === "Tab") {
      close(false);
    }
  };

  return (
    <>
      <button
        ref={btn}
        type="button"
        className={"gr-dd" + (open ? " open" : "")}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={"著色依據：" + GR_COLOR_BY[idx].label}
        onClick={() => (open ? close(false) : show())}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            e.preventDefault();
            show();
          }
        }}
      >
        <span className="gr-dd-sw">
          {swatches(value).map((c, i) => (
            <i key={i} style={{ background: c }} />
          ))}
        </span>
        <span>{GR_COLOR_BY[idx].label}</span>
        <span className="gr-dd-car">
          <ChevronDown size={10} strokeWidth={2.6} aria-hidden="true" />
        </span>
      </button>
      {open && pos ? (
        <>
          <div className="gr-dd-scrim" onPointerDown={() => close(false)} />
          <div
            ref={list}
            className="gr-dd-menu"
            role="listbox"
            tabIndex={-1}
            aria-label="著色依據"
            aria-activedescendant={"gr-cb-" + GR_COLOR_BY[hi].value}
            style={{ left: pos.left, top: pos.top }}
            onKeyDown={onKey}
          >
            <div className="gr-dd-h">節點著色依據</div>
            {GR_COLOR_BY.map((o, i) => (
              <div
                key={o.value}
                id={"gr-cb-" + o.value}
                role="option"
                aria-selected={o.value === value}
                className={"gr-dd-opt" + (i === hi ? " hi" : "") + (o.value === value ? " on" : "")}
                onPointerEnter={() => setHi(i)}
                onClick={() => pick(i)}
              >
                <span className="gr-dd-sw lg">
                  {swatches(o.value).map((c, j) => (
                    <i key={j} style={{ background: c }} />
                  ))}
                </span>
                <span className="gr-dd-txt">
                  <b>{o.label}</b>
                  <span>{o.desc}</span>
                </span>
                {o.value === value ? <Check className="gr-dd-ck" size={14} strokeWidth={2.4} aria-hidden="true" /> : null}
              </div>
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}
