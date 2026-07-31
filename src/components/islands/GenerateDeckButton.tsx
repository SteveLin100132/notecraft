// dev-only「生成簡報」鈕（Task 29）：複製提示詞到剪貼簿 + nc-toast，仿 RegenerateButton。
import { useState } from "react";
import { Check, Sparkles } from "lucide-react";

export default function GenerateDeckButton({ slug, notePath }: { slug: string; notePath?: string }) {
  const [copied, setCopied] = useState(false);
  const onClick = async () => {
    // 刻意**不列舉版型、也不寫輸出路徑** —— 兩者都由 content-present Skill 定義：
    //   - 版型詞彙會隨改制變動（v0.2 已從 8 種收成 6 種），在這裡列一份必然過時
    //   - 輸出路徑兩種模式不同（主專案 src/components/generated/、viewer .notecraft/components/），
    //     Skill 的 viewer 版由 sync-skill-template 自動改寫，這裡寫死只會錯一邊
    const src = notePath ?? `src/content/notes/${slug}.mdx`;
    const template = `請依 content-present Skill 把 ${src} 轉成 16:9 簡報，沿用筆記中既有的 @ai-visualize 互動元件。`;
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
