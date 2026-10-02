// 頁籤列預繪（規格 docs/notecraft-workbench-loading-transitions.md §6）。
//
// 頁籤清單在 localStorage，SSR 只能畫空列；TabBar island 要等 JS 載完才畫（Fast 4G 下比內容晚 0.9 秒以上）。
// WorkbenchLayout 在 island 旁邊放一層 #nt-pre，由 inline script 在第一次繪製前畫出與 TabStrip 相同外觀的頁籤；
// island 畫好後移除。**不可改 island 自己的 DOM**（React 18 hydration 會 mismatch、整棵重畫）。
//
// 兩個函式以 `Function.prototype.toString()` 內嵌進 inline script，所以：
// **每個函式必須自足**（不引用模組內其他識別碼）；只能 import type、不能有 JSX、不碰 window／localStorage。
// 排序規則必須與 wb-tabs.ts 的 parseStore + ensure 相同（scripts/checks/wb-tabs-prepaint.mjs 以隨機資料對照）。

export interface PrepaintSelf {
  kind: "note" | "view";
  id: string;
  title: string;
  path: string;
  pending: number;
}

export interface PrepaintTab {
  key: string;
  kind: "note" | "view";
  title: string;
  href: string;
  tip: string;
  pinned: boolean;
  on: boolean;
}

/** 解析 nc-tabs-v1:<ws> 的原字串，套用 ensure 的「目前頁補在 at 最大者右側」，回傳要畫的頁籤（不做 LRU 淘汰）。 */
export function prepaintTabs(raw: string | null, self: PrepaintSelf | null, base: string): PrepaintTab[] {
  type E = { kind: "note" | "view"; id: string; key: string; pinned: boolean; at: number; title: string; path: string; pending: number };
  let list: E[] = [];
  try {
    const d = raw ? JSON.parse(raw) : null;
    if (d && typeof d === "object" && d.v === 1 && Array.isArray(d.tabs)) {
      const seen: Record<string, true> = {};
      for (const x of d.tabs) {
        const ok =
          x &&
          typeof x === "object" &&
          (x.kind === "note" || x.kind === "view") &&
          typeof x.id === "string" &&
          x.id !== "" &&
          x.key === x.kind + ":" + x.id &&
          typeof x.pinned === "boolean" &&
          typeof x.scroll === "number" &&
          typeof x.at === "number" &&
          typeof x.title === "string" &&
          typeof x.path === "string" &&
          typeof x.pending === "number";
        if (!ok || seen[x.key]) continue;
        seen[x.key] = true;
        list.push({ kind: x.kind, id: x.id, key: x.key, pinned: x.pinned, at: x.at, title: x.title, path: x.path, pending: x.pending });
      }
    }
  } catch {
    list = [];
  }
  const norm = (l: E[]): E[] => l.filter((t) => t.pinned).concat(l.filter((t) => !t.pinned));
  list = norm(list);
  let cur: string | null = null;
  if (self) {
    cur = self.kind + ":" + self.id;
    const i = list.findIndex((t) => t.key === cur);
    if (i >= 0) {
      // 已開著：位置不動，快照換成目前頁面的值
      list[i] = { ...list[i], title: self.title, path: self.path, pending: self.pending };
    } else {
      let prev = -1;
      for (let j = 0; j < list.length; j++) if (prev < 0 || list[j].at > list[prev].at) prev = j;
      const entry: E = { kind: self.kind, id: self.id, key: cur, pinned: false, at: Infinity, title: self.title, path: self.path, pending: self.pending };
      if (prev < 0) list.push(entry);
      else list.splice(prev + 1, 0, entry);
      list = norm(list);
    }
  }
  return list.map((t) => ({
    key: t.key,
    kind: t.kind,
    title: t.title,
    href: base + (t.kind === "note" ? "/notes/" : "/view/") + t.id,
    tip: [t.title, t.path, t.pending > 0 ? "待生成 AI 標記 " + t.pending : ""].filter(Boolean).join("\n"),
    pinned: t.pinned,
    on: t.key === cur,
  }));
}

/** 產生與 TabStrip 相同 class 的 HTML（只有外觀；連結可點、不進 Tab 序）。icons 是 lucide 圖示的 SVG 字串。 */
export function prepaintHtml(
  tabs: PrepaintTab[],
  icons: { file: string; pin: string; x: string; chevron: string },
  colors: { on: string; off: string; view: string },
): string {
  const esc = (s: string): string =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
  if (!tabs.length) {
    return '<div class="nt-bar"><div class="nt-empty">' + icons.file + '<span class="nt-empty-t">尚未開啟任何筆記。在列表雙擊一列，或按列上的「開啟」，筆記會在這裡留下頁籤。</span></div></div>';
  }
  let h = '<div class="nt-bar"><div class="nt-scrollwrap"><div class="nt-scroll">';
  tabs.forEach((t, i) => {
    if (i > 0 && tabs[i - 1].pinned && !t.pinned) h += '<span class="nt-sep"></span>';
    const color = t.kind === "view" ? colors.view : t.on ? colors.on : colors.off;
    h +=
      '<div class="nt-tab' + (t.on ? " on" : "") + (t.pinned ? " pinned" : "") + '" data-key="' + esc(t.key) + '">' +
      (t.on ? '<i class="nt-ind"></i>' : "") +
      '<a class="nt-tab-main" tabindex="-1" href="' + esc(t.href) + '" title="' + esc(t.tip) + '">' +
      '<span class="nt-ic" style="color:' + color + '">' + icons.file + "</span>" +
      '<span class="nt-t">' + esc(t.title) + "</span></a>" +
      (t.pinned ? '<span class="nt-pin">' + icons.pin + "</span>" : '<span class="nt-x">' + icons.x + "</span>") +
      "</div>";
  });
  h += '</div></div><span class="nt-all"><span class="tnum">' + tabs.length + "</span>" + icons.chevron + "</span></div>";
  return h;
}
