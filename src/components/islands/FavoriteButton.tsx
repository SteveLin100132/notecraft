import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { isFavorite, toggleFavorite, FAVORITES_EVENT } from "@/lib/favorites";

export default function FavoriteButton({ slug }: { slug: string }) {
  // SSR / 首次 render 一律未收藏，hydration 後再依 localStorage 修正，避免 mismatch。
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
      onClick={() => setFav(toggleFavorite(slug))}
      aria-pressed={fav}
      aria-label={fav ? "取消收藏" : "收藏"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 34,
        padding: "0 14px",
        borderRadius: 999,
        border: `1.5px solid ${fav ? "var(--orange-400)" : "var(--neutral-200)"}`,
        background: fav ? "var(--orange-50)" : "#fff",
        color: fav ? "var(--orange-600)" : "var(--text-body)",
        fontFamily: "var(--font-sans)",
        fontSize: 13,
        fontWeight: 700,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      <Star size={15} fill={fav ? "currentColor" : "none"} />
      {fav ? "已收藏" : "收藏"}
    </button>
  );
}
