// 每一節文件的爆炸圖組裝稿，依章分檔。key 是文件 slug（src/content/docs/<slug>.mdx）。
// 規則見 src/components/fig/PARTS.md；build 時 [...slug].astro 會檢查每一節都有、`to` 錨點都存在、編號偶數不重複。
import type { Fig } from "./types";
import { INTRO } from "./intro";
import { GETTING_STARTED } from "./getting-started";
import { WRITING } from "./writing";
import { GUIDES } from "./guides";
import { GUIDES_A } from "./guides-a";
import { GUIDES_B } from "./guides-b";
import { ADVANCED } from "./advanced";
import { REFERENCE } from "./reference";
import { RESOURCES } from "./resources";

export const FIGS: Record<string, Fig> = {
  ...INTRO,
  ...GETTING_STARTED,
  ...WRITING,
  ...GUIDES,
  ...GUIDES_A,
  ...GUIDES_B,
  ...ADVANCED,
  ...REFERENCE,
  ...RESOURCES,
};

/** build 期檢查：缺圖、錨點不存在、編號不是偶數或重複，一律丟錯讓 build 失敗。 */
export function checkFig(slug: string, fig: Fig | undefined, anchors: Set<string>, h2s: string[] = []): Fig {
  if (fig) {
    const covered = new Set(fig.layers.flatMap((l) => [l.to, ...(l.also ?? [])]));
    const loose = h2s.filter((h) => !covered.has(h));
    if (loose.length) throw new Error(`爆炸圖 ${slug}：這些 ## 小節沒有零件涵蓋（加進某個零件的 to 或 also）：${loose.join("、")}`);
  }
  if (!fig) throw new Error(`爆炸圖：${slug} 沒有組裝稿（請加進 src/lib/figs/）`);
  const refs = new Set<number>();
  const ids = new Set<string>();
  for (const l of fig.layers) {
    if (l.ref % 2 !== 0) throw new Error(`爆炸圖 ${slug}：${l.id} 的編號 ${l.ref} 不是偶數`);
    if (refs.has(l.ref)) throw new Error(`爆炸圖 ${slug}：編號 ${l.ref} 重複`);
    if (ids.has(l.id)) throw new Error(`爆炸圖 ${slug}：id「${l.id}」重複`);
    if (l.to && !anchors.has(l.to)) throw new Error(`爆炸圖 ${slug}：${l.id} 的 to「${l.to}」不是這一頁的小節（node scripts/doc-headings.mjs ${slug}）`);
    for (const a of l.also ?? []) if (!anchors.has(a)) throw new Error(`爆炸圖 ${slug}：${l.id} 的 also「${a}」不是這一頁的小節`);
    refs.add(l.ref);
    ids.add(l.id);
  }
  return fig;
}
