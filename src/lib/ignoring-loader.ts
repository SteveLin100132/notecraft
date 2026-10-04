// 套用 `.notecraft/ignore.json` 的筆記 loader（docs/notecraft-ignore-config.md §5.1）。
//
// 不能只把規則塞進 glob() 的 pattern：Astro glob loader 的 dev watcher 以
// `picomatch.isMatch(entry, pattern陣列)` 判斷變動檔，陣列是「任一命中就算」，
// 負向 pattern 會讓被排除的筆記一存檔就冒出來，甚至讓 notesDir 裡的 .json 被當成筆記同步。
// 所以拆成三層：
//   1. 初次載入：先用 walkNotes() 算出被排除的資料夾與檔案（gitignore 語意由 ignore 套件負責），
//      轉成「字面路徑」的負向 pattern 交給 glob —— 被排除的檔不會被讀、不會 parse frontmatter
//   2. dev watcher：包一層 context.watcher，glob loader 掛上的 handler 只收到
//      notesDir 內、沒被排除的 .md／.mdx 事件
//   3. store.set：最後一道，被排除的 entry 不寫入（含檔名帶 glob 特殊字元、沒法轉成字面 pattern 的）

import { glob } from "astro/loaders";
import type { Loader, LoaderContext } from "astro/loaders";
import { walkNotes, toNotesRel } from "./notes-ignore.mjs";
import { entryRelToNotes, getNotesIgnore, notesBaseUrl } from "./notes-ignore-state.mjs";

const NOTE_RE = /\.(md|mdx)$/i;
/** 含這些字元的路徑沒辦法安全地寫成字面 glob（各平台跳脫規則不同），交給 store.set 那一層。 */
const GLOB_SPECIAL = /[*?[\]{}()!+@\\]/;

type WatchHandler = (p: string, ...rest: unknown[]) => unknown;

export function ignoringNotesLoader(notesDir: string): Loader {
  return {
    name: "notecraft-ignoring-glob",
    load: async (ctx: LoaderContext) => {
      const ig = getNotesIgnore();
      // entry.filePath 是相對 Astro root 的 posix 路徑
      const ignoredEntry = (filePath: string): boolean => {
        const rel = entryRelToNotes(ctx.config.root, filePath, notesDir);
        return rel !== null && ig.ignores(rel);
      };

      const { prunedDirs, ignoredFiles } = walkNotes(notesDir, ig);
      const negations = [
        ...prunedDirs.filter((d) => !GLOB_SPECIAL.test(d)).map((d) => `!${d}**`),
        ...ignoredFiles.filter((f) => NOTE_RE.test(f) && !GLOB_SPECIAL.test(f)).map((f) => `!${f}`),
      ];

      const inner = glob({
        pattern: negations.length ? ["**/*.{md,mdx}", ...negations] : "**/*.{md,mdx}",
        base: notesBaseUrl(notesDir),
      });

      const store = new Proxy(ctx.store, {
        get(target, prop, receiver) {
          if (prop === "set") {
            return (entry: Parameters<LoaderContext["store"]["set"]>[0]) => {
              if (entry.filePath && ignoredEntry(entry.filePath)) {
                target.delete(entry.id);
                return false;
              }
              return target.set(entry);
            };
          }
          const v = Reflect.get(target, prop, receiver);
          return typeof v === "function" ? v.bind(target) : v;
        },
      });

      let watcher = ctx.watcher;
      if (watcher) {
        const real = watcher;
        const accept = (p: string): boolean => {
          const rel = toNotesRel(notesDir, p);
          return rel !== null && NOTE_RE.test(rel) && !ig.ignores(rel);
        };
        watcher = new Proxy(real, {
          get(target, prop, receiver) {
            if (prop === "on") {
              return (event: string, fn: WatchHandler) => {
                const wrapped: WatchHandler =
                  event === "add" || event === "change" || event === "unlink"
                    ? (p, ...rest) => (accept(p) ? fn(p, ...rest) : undefined)
                    : fn;
                target.on(event, wrapped);
                return receiver;
              };
            }
            const v = Reflect.get(target, prop, receiver);
            return typeof v === "function" ? v.bind(target) : v;
          },
        });
      }

      await inner.load({ ...ctx, store, watcher });
    },
  };
}
