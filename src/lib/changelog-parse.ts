// CHANGELOG.md（Keep a Changelog）的解析與切片（規格 docs/notecraft-workbench-update-check.md §4.3）。
// 只能 import type、無 JSX、不碰 window：scripts/checks/upd-changelog.mjs 直接載入，並拿 repo 的真實 CHANGELOG.md 斷言。

export type ClCat = "security" | "removed" | "changed" | "deprecated" | "added" | "fixed" | "other";
export interface ClItem {
  text: string;
  children: string[];
}
export interface ClSection {
  cat: ClCat;
  title: string;
  items: ClItem[];
}
export interface ClVersion {
  /** 比較用的版號；區間標題取上界 */
  v: string;
  /** 區間標題的下界；單一版號為 null */
  vFrom: string | null;
  date: string | null;
  /** 版本標題之後、第一個 ### 之前的導言 */
  lead: string | null;
  sections: ClSection[];
  /** 切出來後只剩「內部」類別（解析時被丟棄）的版本 */
  internalOnly?: boolean;
}
/** 切片結果：找不到段落的 npm 版本以 empty 佔位，讓版本數與「落後 N 個版本」一致 */
export type ClSlice = ClVersion & { empty?: boolean };

/** 顯示順序（刻意與 Keep a Changelog 不同，讓風險先被看到）、中文、類別點的色 token */
export const CL_CATS: { key: ClCat; label: string; color: string }[] = [
  { key: "security", label: "安全", color: "var(--wb-upd-security)" },
  { key: "removed", label: "移除", color: "var(--wb-upd-major)" },
  { key: "changed", label: "變更", color: "var(--wb-blue-l)" },
  { key: "deprecated", label: "棄用", color: "var(--wb-upd-major)" },
  { key: "added", label: "新增", color: "var(--wb-ok)" },
  { key: "fixed", label: "修正", color: "var(--wb-ink-3)" },
  { key: "other", label: "其他", color: "var(--wb-ink-3)" },
];

const CAT_NAMES: Record<string, ClCat | "internal"> = {
  安全: "security",
  security: "security",
  移除: "removed",
  removed: "removed",
  變更: "changed",
  changed: "changed",
  棄用: "deprecated",
  deprecated: "deprecated",
  新增: "added",
  added: "added",
  修正: "fixed",
  fixed: "fixed",
  內部: "internal",
  internal: "internal",
};

export function catOf(title: string): ClCat | "internal" {
  return CAT_NAMES[title.trim().toLowerCase()] ?? "other";
}

// 與官網 site/src/lib/changelog.ts 的 readReleases() 逐字相同（upd-changelog.mjs 對照兩邊的解析結果）
const VERSION_RE = /^## \[(\d+\.\d+\.\d+)\](?:\s*[–-]\s*\[(\d+\.\d+\.\d+)\])?\s*-\s*(\d{4}-\d{2}-\d{2})/;

export function parseChangelog(md: string): ClVersion[] {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const out: ClVersion[] = [];
  let ver: ClVersion | null = null;
  let sec: ClSection | null = null;
  let dropSec = false;
  let hadInternal = false;
  let item: ClItem | null = null;
  let leadLines: string[] = [];
  let inComment = false;

  const flushLead = () => {
    if (ver && leadLines.length) {
      const t = leadLines.join("\n").trim();
      ver.lead = t || null;
    }
    leadLines = [];
  };
  const finishVersion = () => {
    if (!ver) return;
    flushLead();
    if (ver.sections.length === 0 && hadInternal) ver.internalOnly = true;
    out.push(ver);
    ver = null;
  };

  for (const raw of lines) {
    // HTML 註解（含 <!-- 重點：… -->）略過；可能跨行
    let line = raw;
    if (inComment) {
      const end = line.indexOf("-->");
      if (end < 0) continue;
      inComment = false;
      line = line.slice(end + 3);
      if (!line.trim()) continue;
    }
    if (/^\s*<!--/.test(line)) {
      if (!line.includes("-->")) inComment = true;
      continue;
    }

    if (line.startsWith("## ")) {
      finishVersion();
      sec = null;
      item = null;
      dropSec = false;
      hadInternal = false;
      const m = VERSION_RE.exec(line);
      if (m) {
        ver = m[2]
          ? { v: m[2], vFrom: m[1], date: m[3], lead: null, sections: [] }
          : { v: m[1], vFrom: null, date: m[3], lead: null, sections: [] };
      }
      continue;
    }
    if (!ver) continue;

    if (line.startsWith("### ")) {
      flushLead();
      item = null;
      const title = line.slice(4).trim();
      const cat = catOf(title);
      if (cat === "internal") {
        dropSec = true;
        hadInternal = true;
        sec = null;
      } else {
        dropSec = false;
        sec = { cat, title, items: [] };
        ver.sections.push(sec);
      }
      continue;
    }

    // 第一個 ### 之前：導言
    if (!sec && !dropSec) {
      if (line.trim()) leadLines.push(line.trim());
      continue;
    }
    if (dropSec || !sec) continue;

    if (/^- /.test(line)) {
      item = { text: line.slice(2).trim(), children: [] };
      sec.items.push(item);
      continue;
    }
    const nested = /^\s{2,}[-*] (.*)$/.exec(line);
    if (nested && item) {
      item.children.push(nested[1].trim());
      continue;
    }
    if (/^\s{2,}\S/.test(line) && item) {
      const t = line.trim();
      if (item.children.length) item.children[item.children.length - 1] += "\n" + t;
      else item.text += "\n" + t;
      continue;
    }
    // 空行或其他：結束目前項目的續行
    if (!line.trim()) continue;
    item = null;
  }
  finishVersion();
  return out;
}

const parse3 = (v: string): number[] => v.split(".").map((n) => Number(n));
function cmp(a: string, b: string): number {
  const x = parse3(a);
  const y = parse3(b);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return (x[i] ?? 0) - (y[i] ?? 0);
  return 0;
}

/** 單一版號 → 段落；區間段落涵蓋 vFrom ≤ v ≤ v */
export function findSection(versions: ClVersion[], v: string): ClVersion | null {
  for (const s of versions) {
    if (s.vFrom ? cmp(s.vFrom, v) <= 0 && cmp(v, s.v) <= 0 : s.v === v) return s;
  }
  return null;
}

/**
 * 依 missed（npm 上 cur < v ≤ latest 的穩定版，新到舊）取段落（Q1 = B）。
 * 同一段只列一次；找不到段落的版本以 empty 佔位。missed 空（已是最新或目前版本較新）→ 取 cur 那一段。
 */
export function sliceChangelog(versions: ClVersion[], missed: string[], cur: string): ClSlice[] {
  const want = missed.length ? missed : [cur];
  const out: ClSlice[] = [];
  const seen = new Set<ClVersion>();
  for (const v of want) {
    const s = findSection(versions, v);
    if (s) {
      if (seen.has(s)) continue;
      seen.add(s);
      out.push(s);
    } else {
      out.push({ v, vFrom: null, date: null, lead: null, sections: [], empty: true });
    }
  }
  return out;
}

/** 各類別項目數（巢狀項目不另計） */
export function countByCategory(versions: ClVersion[]): Record<ClCat, number> {
  const c: Record<ClCat, number> = { security: 0, removed: 0, changed: 0, deprecated: 0, added: 0, fixed: 0, other: 0 };
  for (const v of versions) for (const s of v.sections) c[s.cat] += s.items.length;
  return c;
}

export type InlineToken =
  | { t: "text"; s: string }
  | { t: "code"; s: string }
  | { t: "bold"; c: InlineToken[] }
  | { t: "link"; c: InlineToken[]; href: string };

function resolveHref(href: string, base: string): string | null {
  const h = href.trim();
  if (/^https?:\/\//i.test(h)) return h;
  if (/^[a-z][a-z0-9+.-]*:/i.test(h) || h.startsWith("//")) return null; // javascript:、mailto: 等其他協定一律不放行
  if (!base) return null;
  return base + h.replace(/^\.\//, "").replace(/^\//, "");
}

// code span 先換成佔位字元（內部不再解析），粗體與連結可以包住 code
const PH = "\u0000";

function expandCode(s: string, codes: string[]): InlineToken[] {
  const out: InlineToken[] = [];
  const re = new RegExp(`${PH}(\\d+)${PH}`, "g");
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push({ t: "text", s: s.slice(last, m.index) });
    out.push({ t: "code", s: codes[Number(m[1])] });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ t: "text", s: s.slice(last) });
  return out;
}

function tokenize(s: string, base: string, codes: string[], allowLink: boolean): InlineToken[] {
  const out: InlineToken[] = [];
  const re = allowLink ? /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g : /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(...expandCode(s.slice(last, m.index), codes));
    if (m[1] !== undefined) out.push({ t: "bold", c: tokenize(m[1], base, codes, allowLink) });
    else {
      const href = resolveHref(m[3], base);
      if (href) out.push({ t: "link", c: tokenize(m[2], base, codes, false), href });
      else out.push(...expandCode(m[0], codes));
    }
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push(...expandCode(s.slice(last), codes));
  return out;
}

/** 行內 Markdown：`code`（內部不再解析）、**粗體**、[text](url)；粗體與連結可包住 code。相對連結以 repoBlobBase 補成絕對網址 */
export function inlineTokens(text: string, repoBlobBase: string): InlineToken[] {
  const codes: string[] = [];
  const masked = text.replace(new RegExp(PH, "g"), "").replace(/`([^`]+)`/g, (_m, c: string) => {
    codes.push(c);
    return `${PH}${codes.length - 1}${PH}`;
  });
  return tokenize(masked, repoBlobBase, codes, true);
}

/** token 的純文字（給 aria、測試用） */
export function tokensText(tokens: InlineToken[]): string {
  return tokens.map((k) => (k.t === "text" || k.t === "code" ? k.s : tokensText(k.c))).join("");
}
