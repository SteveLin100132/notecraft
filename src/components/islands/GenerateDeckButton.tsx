// dev-only「生成簡報」鈕（Task 29）：複製提示詞到剪貼簿 + nc-toast，仿 RegenerateButton。
import { useState } from "react";
import { Check, Sparkles } from "lucide-react";

export default function GenerateDeckButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const onClick = async () => {
    const template = `請把 src/content/notes/${slug}.mdx 轉成 16:9 簡報：套用 deck 版型庫（cover / section / bullets / media / full-visual / compare / quote / closing），沿用筆記中既有的 @ai-visualize 互動元件，輸出到 src/components/generated/${slug}.deck.tsx`;
    try {
      await navigator.clipboard.writeText(template);
      setCopied(true);
      window.dispatchEvent(
        new CustomEvent("nc-toast", { detail: { msg: "已複製生成簡報提示詞，貼到 Claude Code 即可", icon: "sparkle" } }),
      );
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.dispatchEvent(
        new CustomEvent("nc-toast", { detail: { msg: "無法複製，請檢查瀏覽器權限", icon: "x" } }),
      );
    }
  };
  return (
    <button onClick={onClick} style={btn}>
      {copied ? <Check size={15} /> : <Sparkles size={15} />}
      {copied ? "已複製提示詞" : "生成簡報"}
    </button>
  );
}

const btn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 34,
  padding: "0 14px",
  borderRadius: 999,
  border: "1.5px solid var(--orange-400)",
  background: "#fff",
  color: "var(--orange-600)",
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap",
};
