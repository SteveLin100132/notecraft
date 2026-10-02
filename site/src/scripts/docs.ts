// 使用文件頁的三件小事：窄螢幕的章節抽屜、程式碼複製、本頁目錄跟著捲動標出所在小節。

// ── 章節抽屜（< 960px） ──
const btn = document.querySelector<HTMLButtonElement>(".dtop-btn");
const spine = document.getElementById("spine");
const scrim = document.querySelector<HTMLElement>(".spine-scrim");
const closeBtn = spine?.querySelector<HTMLButtonElement>(".spine-close");
// 抽屜開著時，背後的頁面不可聚焦也不可點（Tab 不會跑出抽屜）
const behind = [document.getElementById("doc-main"), document.querySelector<HTMLElement>(".dtop")];

function setDrawer(open: boolean) {
  if (!btn || !spine || !scrim) return;
  btn.setAttribute("aria-expanded", String(open));
  spine.toggleAttribute("data-open", open);
  scrim.hidden = !open;
  document.body.classList.toggle("drawer-open", open);
  for (const el of behind) el?.toggleAttribute("inert", open);
  if (open) spine.querySelector<HTMLElement>("[aria-current='page'], a")?.focus({ preventScroll: true });
  else btn.focus({ preventScroll: true });
}

btn?.addEventListener("click", () => setDrawer(btn.getAttribute("aria-expanded") !== "true"));
scrim?.addEventListener("click", () => setDrawer(false));
closeBtn?.addEventListener("click", () => setDrawer(false));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && spine?.hasAttribute("data-open")) setDrawer(false);
});
matchMedia("(min-width: 960px)").addEventListener("change", (e) => {
  if (e.matches && spine?.hasAttribute("data-open")) setDrawer(false);
});

// 目前那一節捲進書脊可見範圍（書脊自己捲動，不動整頁）
const current = spine?.querySelector<HTMLElement>(".spine-nav [aria-current='page']");
const nav = spine?.querySelector<HTMLElement>(".spine-nav");
// 只有所在的節不在可見範圍內才捲；已經看得到就不動，避免把上方的章名捲走
if (current && nav) {
  const top = current.getBoundingClientRect().top - nav.getBoundingClientRect().top;
  if (top + current.offsetHeight > nav.clientHeight) nav.scrollTop = top - nav.clientHeight / 3;
}

// ── 程式碼複製 ──
document.querySelectorAll<HTMLButtonElement>(".code-copy").forEach((b) => {
  b.addEventListener("click", async () => {
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
});

// ── 本頁目錄：標出目前讀到的小節 ──
const tocLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>(".toc a"));
const heads = tocLinks
  .map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1))))
  .filter((h): h is HTMLElement => !!h);

if (heads.length) {
  let ticking = false;
  const mark = () => {
    ticking = false;
    const line = window.innerHeight * 0.25;
    let active = heads[0];
    for (const h of heads) {
      if (h.getBoundingClientRect().top <= line) active = h;
      else break;
    }
    // 捲到底時最後一節一定要亮
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) active = heads[heads.length - 1];
    for (const a of tocLinks) {
      const on = decodeURIComponent(a.hash.slice(1)) === active.id;
      if (on) a.setAttribute("aria-current", "location");
      else a.removeAttribute("aria-current");
    }
  };
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
  mark();
}
