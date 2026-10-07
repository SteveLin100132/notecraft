// dev 期間的跨檔失效（docs/notecraft-workbench-define-ref.md §4.4，做法見 Task 125 spike）。
//
// Astro 只會重新渲染「改了的那篇」：改了來源 define，嵌入或引用它的筆記不會更新；
// 新增一個 :ref，來源頁的「被 N 篇引用」也不會更新。這裡在 notesDir 的 .md／.mdx 變動時：
//   1. 比對變動前後每個 define 的簽章（內容、label、標題、反向連結）
//   2. 找出受影響的筆記：簽章變了的 define 的來源筆記＋前後引用它的筆記
//   3. 讓這些筆記的模組失效（getModulesByFile 會有本體與 ?astroPropagatedAssets 兩個）並 full-reload
// build 不受影響（只掛 astro:server:setup）。

import path from "node:path";
import { getDefIndex, relOfNoteAbs, setDefIndexDev } from "./defs-state.mjs";
import { getNotesDir } from "./notes-ignore-state.mjs";

/** @param {import("./defs-state.d.mts").DefIndex} index */
function signatures(index) {
  /** @type {Map<string, { sig: string, slugs: Set<string> }>} */
  const out = new Map();
  for (const d of index.defs.values()) {
    out.set(d.id, {
      sig: JSON.stringify([d.source, d.label, d.title, d.slug, d.refs]),
      slugs: new Set([d.slug, ...d.refs.map((r) => r.slug)]),
    });
  }
  return out;
}

/** @param {import("./defs-state.d.mts").DefIndex} index */
function usersOf(index) {
  /** @type {Map<string, Set<string>>} id → 用到它的筆記 slug（含 define 內的、含錯誤的引用） */
  const out = new Map();
  for (const n of index.notes.values()) {
    for (const u of [...n.includes, ...n.refs]) {
      if (!out.has(u.id)) out.set(u.id, new Set());
      /** @type {Set<string>} */ (out.get(u.id)).add(n.slug);
    }
  }
  return out;
}

/** @returns {import("astro").AstroIntegration} */
export default function defsWatch() {
  return {
    name: "notecraft-defs-watch",
    hooks: {
      "astro:server:setup": ({ server, logger }) => {
        setDefIndexDev(true);
        const notesDir = getNotesDir();
        let before = (() => {
          try {
            return getDefIndex();
          } catch {
            return null;
          }
        })();
        /** @type {ReturnType<typeof setTimeout> | null} */
        let timer = null;
        const flush = () => {
          timer = null;
          let after;
          try {
            after = getDefIndex();
          } catch (err) {
            logger.warn(`無法重算定義索引：${/** @type {Error} */ (err).message}`);
            return;
          }
          const prev = before;
          before = after;
          if (!prev) return;
          const a = signatures(prev);
          const b = signatures(after);
          const ua = usersOf(prev);
          const ub = usersOf(after);
          /** @type {Set<string>} */
          const affected = new Set();
          for (const id of new Set([...a.keys(), ...b.keys()])) {
            if (a.get(id)?.sig === b.get(id)?.sig) continue;
            for (const s of [...(a.get(id)?.slugs ?? []), ...(b.get(id)?.slugs ?? []), ...(ua.get(id) ?? []), ...(ub.get(id) ?? [])]) affected.add(s);
          }
          if (affected.size === 0) return;
          let count = 0;
          for (const slug of affected) {
            const n = after.notes.get(slug) ?? prev.notes.get(slug);
            if (!n) continue;
            const abs = path.join(notesDir, n.rel);
            for (const m of server.moduleGraph.getModulesByFile(abs) ?? []) {
              server.moduleGraph.invalidateModule(m);
              count++;
            }
          }
          if (count) {
            logger.info(`定義有變動，重新渲染 ${affected.size} 篇引用相關的筆記`);
            server.ws.send({ type: "full-reload" });
          }
        };
        /** @param {string} p */
        const onEvent = (p) => {
          if (!/\.(md|mdx)$/i.test(p) || !relOfNoteAbs(path.resolve(p))) return;
          if (timer) clearTimeout(timer);
          timer = setTimeout(flush, 80);
        };
        server.watcher.on("change", onEvent);
        server.watcher.on("add", onEvent);
        server.watcher.on("unlink", onEvent);
      },
    },
  };
}
