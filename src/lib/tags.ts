export function normalizeTags(raw: unknown): string[] {
  const arr = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(",") : [];
  const seen = new Map<string, string>();
  for (const item of arr) {
    const t = String(item).trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (!seen.has(k)) seen.set(k, t);
  }
  return Array.from(seen.values());
}
