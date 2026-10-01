/*
 * 官網的捲動動態（vanilla，跟著頁面 bundle）。
 *
 * - [data-draw]：進入畫面時，裡面 SVG 的線條沿筆畫描出，文字（參照編號）隨後標上
 * - [data-reveal]：很輕的淡入（只用在標題）
 * - FIG. 1：hero 捲出時寫入 --spread，讓各層上下拉開（CSS 依 --k 位移）
 * - 版本大數字：隨捲動像里程表一樣轉到目前版本
 * - 浮動頁碼：依畫面中央的章節更新，點開是目錄
 *
 * 內容預設可見：只有 <html class="motion">（head 的 inline script 在非減少動態時加上）才會
 * 先藏起來等動畫；這支腳本 3 秒內沒跑起來，inline script 會把 class 拿掉。
 */

declare global {
  interface Window {
    __ncMotion?: boolean;
  }
}

window.__ncMotion = true;

const root = document.documentElement;
const motionOn = root.classList.contains("motion");
const SHAPES = "path, line, polyline, polygon, rect, circle";

/* ── 描線 ── */
function prepareDraw(el: Element) {
  let i = 0;
  el.querySelectorAll<SVGGeometryElement>(SHAPES).forEach((s) => {
    if (s.closest("defs, symbol")) return;
    s.setAttribute("pathLength", "1");
    s.classList.add("ln");
    s.style.setProperty("--d", String(Math.min(i * 40, 600)));
    i++;
  });
}

if (motionOn && "IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      }
    },
    { rootMargin: "0px 0px -15% 0px", threshold: 0.2 },
  );
  document.querySelectorAll("[data-draw]").forEach((el) => {
    prepareDraw(el);
    io.observe(el);
  });
  document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));
} else {
  document.querySelectorAll("[data-draw], [data-reveal]").forEach((el) => el.classList.add("is-in"));
}

/* ── 捲動連動：FIG. 1 拉開、版本里程表 ── */
const hero = document.querySelector<HTMLElement>(".hero");
const fig1 = () => document.querySelector<SVGSVGElement>(".f1-svg");
const big = document.querySelector<HTMLElement>(".rel-big");

type Odo = { el: HTMLElement; digit: number };
const odos: Odo[] = [];
if (motionOn && big) {
  big.querySelectorAll<HTMLElement>(".rel-digit").forEach((el) => {
    const digit = Number(el.textContent);
    if (Number.isNaN(digit)) return;
    // 0–9 兩輪：每一位至少轉一整圈再停在自己的值
    const strip = document.createElement("span");
    strip.className = "odo";
    strip.setAttribute("aria-hidden", "true");
    for (let n = 0; n < 20; n++) {
      const d = document.createElement("span");
      d.textContent = String(n % 10);
      strip.appendChild(d);
    }
    el.textContent = "";
    el.appendChild(strip);
    el.classList.add("has-odo");
    odos.push({ el: strip, digit });
  });
}

const clamp = (n: number) => Math.min(1, Math.max(0, n));
let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    const vh = window.innerHeight;
    if (motionOn && hero) {
      const p = clamp(window.scrollY / (hero.offsetHeight * 0.75));
      fig1()?.style.setProperty("--spread", (p * p).toFixed(3));
    }
    if (odos.length && big) {
      const r = big.getBoundingClientRect();
      const p = clamp((vh - r.top) / (vh * 0.7));
      const e = 1 - Math.pow(1 - p, 3);
      odos.forEach(({ el, digit }, i) => {
        // 高位數先停：每一位的進度略錯開
        const k = clamp(e * (1 + i * 0.12) - i * 0.06);
        el.style.setProperty("--v", ((10 + digit) * k).toFixed(3));
      });
    }
    updateFolioVisibility();
  });
}
window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", onScroll);

/* ── 浮動頁碼 ── */
const folio = document.querySelector<HTMLElement>("[data-folio-root]");
const folioBtn = folio?.querySelector<HTMLButtonElement>(".folio-btn");
const folioLabel = folio?.querySelector<HTMLElement>(".folio-label");
const folioMenu = folio?.querySelector<HTMLElement>(".folio-menu");
const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-folio]"));

function updateFolioVisibility() {
  if (!folio || !hero) return;
  const show = window.scrollY > hero.offsetHeight * 0.6;
  folio.classList.toggle("is-shown", show);
  if (!show) setMenu(false);
}

function setMenu(open: boolean) {
  if (!folioBtn || !folioMenu) return;
  folioBtn.setAttribute("aria-expanded", String(open));
  folioMenu.hidden = !open;
  if (open) (folioMenu.querySelector<HTMLAnchorElement>("a[aria-current='true']") ?? folioMenu.querySelector<HTMLAnchorElement>("a"))?.focus();
}

if (folio && folioBtn && folioLabel && folioMenu && "IntersectionObserver" in window) {
  folio.hidden = false;
  const links = Array.from(folioMenu.querySelectorAll<HTMLAnchorElement>("a"));
  const sio = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const id = (e.target as HTMLElement).id;
        folioLabel.textContent = (e.target as HTMLElement).dataset.folio ?? "";
        links.forEach((a) => a.setAttribute("aria-current", String(a.hash === `#${id}`)));
      }
    },
    { rootMargin: "-50% 0px -50% 0px" },
  );
  sections.forEach((s) => sio.observe(s));

  folioBtn.addEventListener("click", () => setMenu(folioMenu.hidden));
  folioMenu.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("a")) setMenu(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !folioMenu.hidden) {
      setMenu(false);
      folioBtn.focus();
    }
  });
  document.addEventListener("pointerdown", (e) => {
    if (!folioMenu.hidden && !folio.contains(e.target as Node)) setMenu(false);
  });
}

onScroll();

export {};
