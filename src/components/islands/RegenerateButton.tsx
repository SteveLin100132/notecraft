import { useState } from "react";
import { Clipboard, Check } from "lucide-react";
import { buildRegeneratePrompt, copyToClipboard } from "@/lib/prompts";

export default function RegenerateButton({ promptPath, pendingIds }: { promptPath: string; pendingIds: string[] }) {
  const [copied, setCopied] = useState(false);
  const onClick = async () => {
    if (await copyToClipboard(buildRegeneratePrompt({ promptPath, pendingIds }))) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
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
  whiteSpace: "nowrap",
};
