import { useState } from "react";
import { Clipboard, Check } from "lucide-react";

export default function RegenerateButton({ slug, pendingIds }: { slug: string; pendingIds: string[] }) {
  const [copied, setCopied] = useState(false);
  const onClick = async () => {
    const template = `請使用 content-visualize-skill 重新處理 src/content/notes/${slug}.mdx 內的 @ai-visualize 標記區塊（${pendingIds.join(
      ", ",
    )}），依 note-scanner → visualize-planner → component-generator → mdx-writer 流程生成元件並回寫 MDX。`;
    try {
      await navigator.clipboard.writeText(template);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.dispatchEvent(
        new CustomEvent("nc-toast", { detail: { msg: "無法複製，請檢查瀏覽器權限", icon: "x" } }),
      );
    }
  };
  return (
    <button onClick={onClick} style={btn}>
      {copied ? <Check size={15} /> : <Clipboard size={15} />}
      {copied ? "已複製範本" : "在 Claude Code 重新生成"}
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
  border: "1.5px solid var(--blue-500)",
  background: "#fff",
  color: "var(--blue-700)",
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};
