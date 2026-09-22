// dev-only「生成簡報」鈕（Task 29）：複製提示詞到剪貼簿 + nc-toast，仿 RegenerateButton。
import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { buildDeckPrompt, copyToClipboard, toast } from "@/lib/prompts";

export default function GenerateDeckButton({ promptPath }: { promptPath: string }) {
  const [copied, setCopied] = useState(false);
  const onClick = async () => {
    if (await copyToClipboard(buildDeckPrompt({ promptPath }))) {
      setCopied(true);
      toast("已複製生成簡報提示詞，貼到 Claude Code 即可", "sparkle");
      setTimeout(() => setCopied(false), 1800);
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
