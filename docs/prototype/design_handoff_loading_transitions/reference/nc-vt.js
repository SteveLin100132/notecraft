// public/nc-vt.js — 放在 <head>，以 <script is:inline src="/nc-vt.js"> 載入（不可 defer / module）
// 1) 新頁 pagereveal：依來源／目的網址決定轉場 type，寫進 <html data-nc-vt>
// 2) 舊頁：點站內連結 150ms 後顯示 2px 進度線；手機抽屜點了就關
(() => {
  const HUB = /^\/(?:$|notes\/?$|plugins\/?$|settings\/?|series\/?$|tags\/?|ai\/?$)/;
  const kind = (u) => (HUB.test(new URL(u, location.href).pathname) ? "hub" : "leaf");
  const de = document.documentElement;

  addEventListener("pagereveal", (e) => {
    if (!e.viewTransition) return;
    const act = window.navigation && navigation.activation;
    if (!act || !act.from || act.navigationType === "reload") { e.viewTransition.skipTransition(); return; }
    const to = kind(location.href), from = kind(act.from.url);
    de.dataset.ncVt = to === "hub" ? "section" : from === "hub" ? "drill" : "peer";
    e.viewTransition.finished.finally(() => { delete de.dataset.ncVt; });
  });

  const clearProgress = () => document.querySelectorAll(".nc-progress").forEach((n) => n.remove());
  addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest("a[href]");
    if (!a || a.target || a.hasAttribute("download") || a.origin !== location.origin) return;
    if (a.pathname === location.pathname && a.hash) return;
    const pane = document.querySelector(".nc-main-pane");
    if (pane && !pane.querySelector(".nc-progress")) {
      const i = document.createElement("i"); i.className = "nc-progress"; i.setAttribute("aria-hidden", "true"); pane.prepend(i);
    }
    const sb = a.closest(".wb-sb.open");
    if (sb) sb.classList.remove("open");
  }, true);
  addEventListener("pageswap", clearProgress);
  addEventListener("pageshow", (e) => { if (e.persisted) clearProgress(); });
})();
