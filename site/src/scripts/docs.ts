// 使用文件頁的小事：窄螢幕的章節抽屜、書脊標出所在節、程式碼複製、本頁目錄跟著捲動標出所在小節、內文寫在橫線上、換節後內文進場。
// 頁面由 ClientRouter 換頁：這支模組只執行一次。書脊是跨頁保留的元素，其餘每次換頁都是新的 DOM，
// 所以事件一律掛在 document 上（委派），每頁要重算的東西放在 astro:page-load。

const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel);

// ── 章節抽屜（< 960px） ──
function setDrawer(open: boolean) {
  const btn = $<HTMLButtonElement>(".dtop-btn");
  const spine = document.getElementById("spine");
  const scrim = $(".spine-scrim");
  if (!spine || !scrim) return;
  btn?.setAttribute("aria-expanded", String(open));
  spine.toggleAttribute("data-open", open);
  scrim.hidden = !open;
  document.body.classList.toggle("drawer-open", open);
  // 抽屜開著時，背後的頁面不可聚焦也不可點（Tab 不會跑出抽屜）
  for (const el of [document.getElementById("doc-main"), $(".dtop")]) el?.toggleAttribute("inert", open);
  if (open) spine.querySelector<HTMLElement>("[aria-current='page'], a")?.focus({ preventScroll: true });
  else btn?.focus({ preventScroll: true });
}
const drawerOpen = () => !!document.getElementById("spine")?.hasAttribute("data-open");

document.addEventListener("click", (e) => {
  const t = e.target as HTMLElement;
  if (t.closest(".dtop-btn")) setDrawer(!drawerOpen());
  else if (t.closest(".spine-scrim, .spine-close")) setDrawer(false);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && drawerOpen()) setDrawer(false);
});
matchMedia("(min-width: 960px)").addEventListener("change", (e) => {
  if (e.matches && drawerOpen()) setDrawer(false);
});

// ── 書脊：跨頁保留，換頁後自己標出所在的節 ──
function markSpine() {
  const spine = document.getElementById("spine");
  const nav = spine?.querySelector<HTMLElement>(".spine-nav");
  if (!spine || !nav) return;
  const here = location.pathname.replace(/\/?$/, "/");
  let current: HTMLAnchorElement | null = null;
  for (const a of spine.querySelectorAll<HTMLAnchorElement>("a.sec")) {
    const on = new URL(a.href).pathname.replace(/\/?$/, "/") === here;
    if (on) {
      a.setAttribute("aria-current", "page");
      current = a;
    } else a.removeAttribute("aria-current");
  }
  for (const g of spine.querySelectorAll(".sec--group")) {
    g.classList.toggle("has-current", !!current && !!g.parentElement?.contains(current));
  }
  const chapter = current?.closest("details");
  if (chapter && !chapter.open) chapter.open = true;
  // 只有所在的節不在可見範圍內才捲；已經看得到就不動，避免把上方的章名捲走
  if (current) {
    const top = current.getBoundingClientRect().top - nav.getBoundingClientRect().top;
    if (top < 0 || top + current.offsetHeight > nav.clientHeight) nav.scrollTop += top - nav.clientHeight / 3;
  }
}

// ── 程式碼複製 ──
document.addEventListener("click", async (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>(".code-copy");
  if (!b) return;
  const code = b.closest("figure.code")?.querySelector("pre")?.textContent ?? "";
  let msg = "已複製";
  try {
    await navigator.clipboard.writeText(code.replace(/\n$/, ""));
  } catch {
    msg = "請手動選取";
  }
  b.textContent = msg;
  b.classList.add("is-done");
  setTimeout(() => {
    b.textContent = "複製";
    b.classList.remove("is-done");
  }, 2000);
});

// ── 本頁目錄：標出目前讀到的小節，只展開它所在的那一組 ──
let toc: HTMLElement | null = null;
let tocLinks: HTMLAnchorElement[] = [];
let heads: HTMLElement[] = [];
let lastId = "";
let ticking = false;

function mark() {
  ticking = false;
  if (!toc || !heads.length) return;
  const line = window.innerHeight * 0.25;
  let active = heads[0];
  for (const h of heads) {
    if (h.getBoundingClientRect().top <= line) active = h;
    else break;
  }
  // 捲到底時最後一節一定要亮
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) active = heads[heads.length - 1];
  if (active.id === lastId) return;
  lastId = active.id;

  let current: HTMLAnchorElement | undefined;
  for (const a of tocLinks) {
    const on = decodeURIComponent(a.hash.slice(1)) === active.id;
    if (on) {
      a.setAttribute("aria-current", "location");
      current = a;
    } else a.removeAttribute("aria-current");
  }
  const group = current?.closest(".toc-group");
  for (const g of toc.querySelectorAll(".toc-group")) {
    g.classList.toggle("is-open", g === group);
    // 讀到 `###` 時，所屬的 `##` 也標成目前位置的上層
    g.classList.toggle("has-current", g === group && current?.parentElement !== g);
  }
  // 目錄比視窗高時，讓目前的項目留在看得到的地方（只捲目錄本身，不動整頁）
  if (current && toc.scrollHeight > toc.clientHeight) {
    const a = current.getBoundingClientRect();
    const box = toc.getBoundingClientRect();
    if (a.top < box.top + 48 || a.bottom > box.bottom - 24) toc.scrollTop += a.top - box.top - toc.clientHeight / 3;
  }
}
addEventListener(
  "scroll",
  () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(mark);
    }
  },
  { passive: true },
);

function setupToc() {
  toc = $(".toc");
  tocLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>(".toc a"));
  heads = tocLinks.map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1)))).filter((h): h is HTMLElement => !!h);
  lastId = "";
  mark();
}

// ── 橫線格：內文寫在線上 ──
// 每一格 32px。段落與標題已由 CSS 對齊；每個區塊的下緣在這裡補到格線上：
// 段落、清單、標題保留 CSS 的下距（一格或半格），程式碼框、表格、圖版這類只保證至少 16px，補到下一條線為止，
// 不會「先補滿一格、再加一格下距」而空出兩三條線。並算出內文欄相對筆記紙的偏移，讓背景的橫線從內文欄的第一格開始。
const GRID = 32;
const TEXT = new Set(["P", "UL", "OL", "BLOCKQUOTE", "H2", "H3"]);
let snapQueued = false;
function snapGrid() {
  snapQueued = false;
  const body = $(".doc-body");
  const paper = document.getElementById("doc-main");
  if (!body || !paper) return;
  // 頁首的兩條線（頁眉底線、頁首下緣的細線）也要壓在橫線上：橫線以內文欄頂端為原點，
  // 先用 .doc-head 的下外距對齊「頁首下緣線→內文頂」，再用上內距對齊「頁眉線→內文頂」（頁首與內文一起移，前一步不受影響）
  const head = $(".doc-head");
  const runhead = paper.querySelector<HTMLElement>(".runhead");
  if (head && runhead) {
    if (head.dataset.pt === undefined) head.dataset.pt = String(parseFloat(getComputedStyle(head).paddingTop) || 0);
    const mod = (n: number) => ((Math.round(n) % GRID) + GRID) % GRID;
    head.style.paddingTop = `${head.dataset.pt}px`;
    head.style.marginBottom = "0px";
    const dBot = mod(head.getBoundingClientRect().bottom - 1 - body.getBoundingClientRect().top);
    head.style.marginBottom = `${dBot}px`;
    const dTop = mod(runhead.getBoundingClientRect().bottom - 1 - body.getBoundingClientRect().top);
    head.style.paddingTop = `${Number(head.dataset.pt) + dTop}px`;
  }
  const top = body.getBoundingClientRect().top;
  const y0 = Math.round(top - paper.getBoundingClientRect().top);
  paper.style.setProperty("--rule-y", `${((y0 % GRID) + GRID) % GRID}px`);
  for (const el of Array.from(body.children) as HTMLElement[]) {
    if (el.dataset.mb === undefined) el.dataset.mb = String(TEXT.has(el.tagName) ? parseFloat(getComputedStyle(el).marginBottom) || 0 : 16);
    const minGap = Number(el.dataset.mb);
    const bottom = el.getBoundingClientRect().bottom - top;
    const want = Math.ceil((bottom + minGap - 0.5) / GRID) * GRID - bottom;
    // 差不到半像素就不動：小數像素的捨入會讓兩個值來回跳，ResizeObserver 就停不下來
    const cur = parseFloat(el.style.marginBottom);
    if (Number.isNaN(cur) || Math.abs(cur - want) > 0.5) el.style.marginBottom = `${want.toFixed(2)}px`;
  }
}
const queueSnap = () => {
  if (snapQueued) return;
  snapQueued = true;
  requestAnimationFrame(snapGrid);
};
addEventListener("resize", queueSnap, { passive: true });
document.fonts?.ready.then(queueSnap);
let bodyObserver: ResizeObserver | null = null;
function watchGrid() {
  bodyObserver?.disconnect();
  const body = $(".doc-body");
  if (!body) return;
  // 圖片載入、示範元件展開都會改高度：觀察每個區塊，變了就重新對齊
  bodyObserver = new ResizeObserver(queueSnap);
  for (const el of Array.from(body.children)) bodyObserver.observe(el);
  // 換頁當下直接對齊一次（不經 requestAnimationFrame：分頁在背景時它會暫停）
  snapGrid();
}

// ── 換節：關抽屜、內文逐段進場 ──
let arrived = false;
document.addEventListener("astro:after-swap", () => {
  if (drawerOpen()) setDrawer(false);
  arrived = true;
});

document.addEventListener("astro:page-load", () => {
  markSpine();
  setupToc();
  watchGrid();
  if (arrived && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const paper = document.getElementById("doc-main");
    paper?.classList.add("is-arriving");
    setTimeout(() => paper?.classList.remove("is-arriving"), 1200);
  }
});
