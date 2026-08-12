// 生成元件「放大檢視」—— 圖框標題列的觸發鈕 + 全螢幕可拖曳縮放的覆蓋層。
//
// 規格來源：docs/prototype/design_handoff_viz_zoom/README.md（hifi handoff）。
//
// 為什麼需要：@ai-visualize 生成的元件是為**內文欄寬**（約 720px）設計的，但並排雙欄
// 結構圖、RACI 矩陣、寬表格這類元件在內文寬度下會被擠壓或橫向溢出。放大檢視把同一份
// 元件放進簡報端已有的 CanvasViewport（可平移、可縮放的藍圖畫布），在全螢幕下閱讀。
//
// 硬約束：
//   - 本功能只是 CanvasViewport 的**新增呼叫端**，不改它任何行為（平移 / 縮放 / fit /
//     邊界遮罩 / 元件互動優先，全部沿用）。
//   - 一次只檢視一個元件：沒有上下切換、沒有縮覽列、沒有暗色舞台切換。
//   - 只用既有 token，不新增色碼 / 字級 / 間距；icon 一律 lucide-react。
//   - 動畫由 global.css 的 `prefers-reduced-motion` 全域規則收斂（`* { animation: none
//     !important; transition: none !important }`），故此處不另外掛 JS 偵測。
//
// 與原型的一處實作差異（刻意）：
//   原型是 React 單頁，覆蓋層可以直接把同一份 React element 再 render 一次（新 instance、
//   state 從頭開始）。本專案的元件是從 MDX 掛進 Astro island 的，React 這端拿不到那個
//   element，因此改為「**借用內文那個 DOM 節點**」：開啟時把節點搬進畫布、原位留一塊等高
//   佔位以維持文件高度，關閉時搬回去。副作用是元件 state 會沿用（不是從初始值開始），
//   對讀者而言更順（放大前選到的格子還在），且互動 100% 保留。

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Hand, Image as ImageIcon, Loader2, Maximize2, MousePointer, Sparkles, X } from "lucide-react";
import CanvasViewport from "@/components/deck/CanvasViewport";
import { dkt } from "@/components/deck/theme";

/** 覆蓋層三段式版面：標題列固定高、畫布舞台 padding（README〈Layout〉） */
const HEAD = 64;
const PAD = 24;
/** 畫布尺寸下限，避免極小視窗算出負值 */
const MIN_W = 320;
const MIN_H = 260;
/** 淡入 180ms、按鈕狀態 140ms，皆 var(--ease-out) */
const FADE_MS = 180;
const BTN_MS = 140;

const ncToast = (msg: string, icon: "check" | "x") =>
  window.dispatchEvent(new CustomEvent("nc-toast", { detail: { msg, icon } }));

export interface VizZoomProps {
  /** 標記 id，同時是元件檔名與 PNG 檔名 */
  id: string;
  /** 元件類型的中文標籤（與圖框標題列同一份） */
  kind: string;
  /** @ai-visualize 的 type 欄位 */
  type?: string;
  caption?: string;
  /** 紙張內容寬度：生成元件的原設計版心 */
  natural?: number;
}

export default function VizZoom({ id, kind, type, caption, natural = 880 }: VizZoomProps) {
  const c = dkt(false); // 覆蓋層恆為亮色：與簡報端共用同一組語意 token 定義
  const [zoom, setZoom] = useState(false);
  const [node, setNode] = useState<HTMLElement | null>(null);
  const [win, setWin] = useState({ w: 0, h: 0 });
  const [footH, setFootH] = useState(0);
  const [busy, setBusy] = useState(false);

  const anchor = useRef<HTMLSpanElement | null>(null);
  const foot = useRef<HTMLDivElement | null>(null);
  const shot = useRef<HTMLDivElement | null>(null);

  const open = () => {
    // 內文那份元件節點：同一個 <figure> 裡由 GeneratedFrame 標記出來的容器
    const el = anchor.current?.closest("figure")?.querySelector<HTMLElement>("[data-nc-viz-body]");
    if (!el) return; // 找不到內容就不開空覆蓋層
    setNode(el);
    setWin({ w: window.innerWidth, h: window.innerHeight });
    setZoom(true);
  };
  const close = useCallback(() => setZoom(false), []);

  // content 的 element identity 必須跨 re-render 穩定 —— CanvasViewport 把 content 放在
  // 重新 fit 的 effect 依賴裡，每次換新 element 就會把使用者的縮放平移打回原點
  //（例如按下「匯出 PNG」讓 busy 變動時）。
  const content = useMemo(() => (node ? <AdoptedNode node={node} /> : null), [node]);

  // Esc 關閉 + 鎖 body 捲動。
  // capture 階段 + stopPropagation：同頁若有簡報 / modal 的 Esc handler，不讓它們先攔走。
  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      close();
    };
    window.addEventListener("keydown", onKey, true);
    const prev = document.body.style.overflow; // 還原成「原本的」值，不是清成空字串
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prev;
    };
  }, [zoom, close]);

  // 視窗尺寸 + 說明列實際高度 —— 兩者都是畫布尺寸的輸入，故都要跟著 resize 重算。
  useEffect(() => {
    if (!zoom) return;
    const sync = () => {
      setWin({ w: window.innerWidth, h: window.innerHeight });
      setFootH(foot.current?.offsetHeight ?? 0); // 量測回填，不寫死 78
    };
    sync();
    window.addEventListener("resize", sync);
    // 說明列會因視窗變窄而換行變高，caption 本身也可能之後才排版完成
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(sync) : null;
    if (foot.current) ro?.observe(foot.current);
    return () => {
      window.removeEventListener("resize", sync);
      ro?.disconnect();
    };
  }, [zoom]);

  /** 畫布尺寸：視窗扣掉標題列、說明列與舞台 padding（README〈畫布舞台〉） */
  const area = {
    w: Math.max(MIN_W, win.w - PAD * 2),
    h: Math.max(MIN_H, win.h - HEAD - footH - PAD * 2),
  };

  // PNG 匯出：來源是離屏乾淨副本，不是畫布上那份（畫布那份帶 transform，會連縮放與裁切一起截）。
  const exportPng = async () => {
    const host = shot.current;
    if (busy || !node || !host) return;
    setBusy(true);
    try {
      // 動態載入：html-to-image 只在首次匯出時進網路，不進 initial bundle
      const { toPng } = await import("html-to-image");
      host.replaceChildren(node.cloneNode(true));
      const url = await toPng(host, { pixelRatio: 2, backgroundColor: "#ffffff" });
      const a = document.createElement("a");
      a.href = url;
      a.download = `${id}.png`;
      a.click();
      ncToast("已匯出 PNG", "check");
    } catch {
      ncToast("PNG 匯出失敗，請稍後再試", "x");
    } finally {
      host.replaceChildren();
      setBusy(false);
    }
  };

  return (
    <span ref={anchor} style={{ display: "inline-flex", marginLeft: 12 }}>
      <ZoomButton onClick={open} />
      {zoom &&
        content &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${kind} 放大檢視`}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 900,
              display: "flex",
              flexDirection: "column",
              background: "var(--neutral-0)",
              fontFamily: "var(--font-sans)",
              animation: `ncFade ${FADE_MS}ms var(--ease-out)`,
            }}
          >
            {/* 標題列 */}
            <div
              style={{
                flex: "none",
                height: HEAD,
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "0 20px 0 24px",
                borderBottom: `1px solid ${c.border}`,
                background: "var(--neutral-0)",
              }}
            >
              <span style={{ display: "flex", color: "var(--orange-500)" }}>
                <Sparkles size={18} />
              </span>
              <span style={{ fontSize: 16, fontWeight: 800, color: "var(--blue-700)" }}>
                {kind}
                {type && (
                  <span style={{ fontSize: 12.5, textTransform: "uppercase", letterSpacing: ".05em", opacity: 0.75 }}>
                    {" "}
                    · {type}
                  </span>
                )}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: c.muted }}>
                generated/{id}.tsx
              </span>

              <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 8 }}>
                {/* 操作提示（靜態，非按鈕）*/}
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    height: 28,
                    padding: "0 12px",
                    borderRadius: "var(--radius-pill)",
                    background: "var(--neutral-100)",
                    color: c.muted,
                    fontSize: 12.5,
                    fontWeight: 600,
                  }}
                >
                  <Hand size={14} />
                  拖曳平移
                  <span style={{ opacity: 0.5 }}>·</span>
                  <MousePointer size={14} />
                  滾輪縮放
                </span>

                <button
                  type="button"
                  onClick={exportPng}
                  disabled={busy}
                  title="匯出 PNG（原尺寸、白底）"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    height: 36,
                    padding: "0 15px",
                    borderRadius: "var(--radius-pill)",
                    border: `1px solid ${c.border}`,
                    background: "var(--neutral-0)",
                    color: busy ? c.muted : "var(--blue-700)",
                    fontFamily: "var(--font-sans)",
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: busy ? "default" : "pointer",
                    transition: `color ${BTN_MS}ms var(--ease-out)`,
                  }}
                >
                  {busy ? (
                    <Loader2 size={16} style={{ animation: "ncSpin 900ms linear infinite" }} />
                  ) : (
                    <ImageIcon size={16} />
                  )}
                  {busy ? "匯出中…" : "匯出 PNG"}
                </button>

                <button
                  type="button"
                  onClick={close}
                  title="關閉（Esc）"
                  aria-label="關閉"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 36,
                    height: 36,
                    borderRadius: "var(--radius-pill)",
                    border: "none",
                    background: "var(--neutral-100)",
                    color: c.body,
                    cursor: "pointer",
                  }}
                >
                  <X size={18} />
                </button>
              </span>
            </div>

            {/* 畫布舞台：平移 / 縮放 / fit / 元件互動優先，全部沿用 CanvasViewport */}
            <div
              style={{
                flex: "1 1 auto",
                minHeight: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: PAD,
                background: "var(--neutral-50)",
              }}
            >
              <CanvasViewport
                content={content}
                natural={natural}
                w={area.w}
                h={area.h}
                mode="play"
                dark={false}
              />
            </div>

            {/* 說明列 */}
            {caption && (
              <div
                ref={foot}
                style={{
                  flex: "none",
                  padding: "16px 28px 20px",
                  borderTop: `1px solid ${c.border}`,
                  background: "var(--neutral-0)",
                }}
              >
                <p
                  style={{
                    margin: "0 auto",
                    maxWidth: 980,
                    fontSize: 14.5,
                    lineHeight: 1.8,
                    color: c.body,
                    textWrap: "pretty",
                  }}
                >
                  {caption}
                </p>
              </div>
            )}

            {/* 離屏乾淨副本的容器：匯出當下才塞入節點複本，故 PNG 一律是 100% 原尺寸 */}
            <div
              aria-hidden="true"
              style={{ position: "fixed", left: -99999, top: 0, opacity: 0, pointerEvents: "none" }}
            >
              {/* content-box：Tailwind preflight 全域是 border-box，會把 padding 吃進 natural 裡，
                  導致元件以 832px 排版、與畫布上那份對不起來 */}
              <div
                ref={shot}
                style={{ boxSizing: "content-box", width: natural, padding: PAD, background: "#ffffff" }}
              />
            </div>
          </div>,
          document.body,
        )}
    </span>
  );
}

/** 圖框標題列的常駐觸發鈕。文字要自行覆蓋標題列可能繼承的 uppercase / tracking。 */
function ZoomButton({ onClick }: { onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title="放大檢視（可拖拉、可縮放）"
      aria-label="放大檢視"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 26,
        padding: "0 10px 0 8px",
        borderRadius: "var(--radius-pill)",
        border: `1px solid ${hover ? "var(--blue-300)" : "var(--neutral-200)"}`,
        background: hover ? "var(--blue-50)" : "var(--neutral-0)",
        color: hover ? "var(--blue-700)" : "var(--neutral-600)",
        fontFamily: "var(--font-sans)",
        fontSize: 11.5,
        fontWeight: 700,
        letterSpacing: 0,
        textTransform: "none",
        whiteSpace: "nowrap",
        cursor: "pointer",
        transition: `background ${BTN_MS}ms var(--ease-out), color ${BTN_MS}ms var(--ease-out), border-color ${BTN_MS}ms var(--ease-out)`,
      }}
    >
      <Maximize2 size={13} strokeWidth={2.1} />
      放大檢視
    </button>
  );
}

/**
 * 把內文那份元件節點搬進畫布，卸載時歸還原位。
 *
 * 原位留一塊等高佔位：文件高度不變，關閉後回到原本的捲動位置（而不是被 clamp 上去）。
 */
function AdoptedNode({ node }: { node: HTMLElement }) {
  const slot = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const host = slot.current;
    if (!host) return;
    const park = document.createElement("div");
    park.setAttribute("data-nc-viz-parked", "");
    park.style.height = `${node.offsetHeight}px`;
    node.replaceWith(park);
    host.appendChild(node);
    return () => park.replaceWith(node);
  }, [node]);
  return <div ref={slot} />;
}
