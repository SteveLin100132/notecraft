// 筆記頁首與 Drawer 共用的動作按鈕（規格 §8.2、§8.3；Q11、Q17、Q18）。
// 三段式簡報、複製生成提示、收藏星號 —— 兩處同一套規則，文案只在這裡出現一次。
import { useEffect, useState } from "react";
import { Check, Clipboard, Play, Sparkles, Star } from "lucide-react";
import { FAVORITES_EVENT, isFavorite, toggleFavorite } from "@/lib/favorites";
import { buildDeckPrompt, buildRegeneratePrompt, copyToClipboard, toast } from "@/lib/prompts";

/**
 * 簡報按鈕的三段式：有 deck → solid「簡報」；無 deck 且 dev → ghost「生成簡報」（複製提示詞）；
 * 無 deck 且正式環境 → 不顯示（訪客無從讓它變成可按，不放停用按鈕）。
 */
export function DeckAction({
  slug = "",
  hasDeck = false,
  promptPath = "",
  isDev = false,
}: {
  slug?: string;
  hasDeck?: boolean;
  promptPath?: string;
  isDev?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  if (hasDeck) {
    return (
      <a className="wb-btn-solid" href={`/present/${slug.normalize("NFC")}`}>
        <Play size={13} strokeWidth={1.7} aria-hidden="true" /> 簡報
      </a>
    );
  }
  if (!isDev || !promptPath) return null;
  return (
    <button
      type="button"
      className="wb-btn-ghost"
      onClick={async () => {
        if (await copyToClipboard(buildDeckPrompt({ promptPath }))) {
          setCopied(true);
          toast("已複製生成簡報提示詞，貼到 Claude Code 即可", "sparkle");
          setTimeout(() => setCopied(false), 1800);
        }
      }}
    >
      {copied ? <Check size={13} aria-hidden="true" /> : <Sparkles size={13} strokeWidth={1.7} aria-hidden="true" />}
      {copied ? "已複製提示詞" : "生成簡報"}
    </button>
  );
}

/** 「複製生成提示」：僅 dev、且有待生成標記時顯示。複製對話範本 + Toast。 */
export function CopyPromptAction({ promptPath = "", pendingIds = [] }: { promptPath?: string; pendingIds?: string[] }) {
  const [copied, setCopied] = useState(false);
  if (!promptPath || pendingIds.length === 0) return null;
  return (
    <button
      type="button"
      className="wb-btn-ghost"
      onClick={async () => {
        if (await copyToClipboard(buildRegeneratePrompt({ promptPath, pendingIds }))) {
          setCopied(true);
          toast("已複製，貼到 Claude Code 即可");
          setTimeout(() => setCopied(false), 1800);
        }
      }}
    >
      {copied ? <Check size={13} aria-hidden="true" /> : <Clipboard size={13} strokeWidth={1.7} aria-hidden="true" />}
      {copied ? "已複製" : "複製生成提示"}
    </button>
  );
}

/** 收藏：24px 方形 icon 鈕。SSR 一律未收藏，hydrate 後依 localStorage 修正。 */
export function FavoriteIcon({ slug = "" }: { slug?: string }) {
  const [fav, setFav] = useState(false);
  useEffect(() => {
    const sync = () => setFav(isFavorite(slug));
    sync();
    window.addEventListener(FAVORITES_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(FAVORITES_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [slug]);
  return (
    <button
      type="button"
      className={"wb-iconbtn" + (fav ? " on" : "")}
      onClick={() => setFav(toggleFavorite(slug))}
      aria-pressed={fav}
      aria-label={fav ? "取消收藏" : "收藏"}
      title={fav ? "取消收藏" : "收藏"}
    >
      <Star size={15} strokeWidth={1.7} fill={fav ? "currentColor" : "none"} aria-hidden="true" />
    </button>
  );
}
