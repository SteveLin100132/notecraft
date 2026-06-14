// 收藏狀態：純前端，存於瀏覽器 localStorage（正式環境亦可用，無需 API）。
const KEY = "nc:favorites";
export const FAVORITES_EVENT = "nc-favorites-changed";

export function getFavorites(): string[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

export function isFavorite(slug: string): boolean {
  return getFavorites().includes(slug);
}

export function toggleFavorite(slug: string): boolean {
  const cur = new Set(getFavorites());
  const now = !cur.has(slug);
  if (now) cur.add(slug);
  else cur.delete(slug);
  try {
    localStorage.setItem(KEY, JSON.stringify([...cur]));
  } catch {
    /* localStorage 不可用（隱私模式等）時降級：僅當下 session 有效 */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(FAVORITES_EVENT));
  }
  return now;
}
