// 殼內數值的同步寫入（第一層）：放在對應元素「後面」的 <script is:inline>，
// 且位於 #nc-hd 之前，讓跨文件 View Transition 的新頁快照已經是真值。
// 標題與路徑從 build 產出的 window.__NC_INDEX（inline JSON，slug → {title, path, data}）解析。

// ── 1. 頁籤列：<div class="nt-bar" id="nc-tabs"></div> 之後 ──
(() => {
  const bar = document.getElementById("nc-tabs");
  let st; try { st = JSON.parse(localStorage.getItem("nc.tabs.v1")); } catch (e) {}
  const idx = window.__NC_INDEX || {};
  const tabs = (st && st.tabs || []).filter((t) => idx[t.key]);
  const cur = document.body.dataset.tabKey; // 例如 "note:http-caching"；非頁籤頁為空
  if (cur && idx[cur] && !tabs.some((t) => t.key === cur)) tabs.push({ key: cur, pinned: false });
  if (!tabs.length) { bar.innerHTML = '<div class="nt-empty">尚未開啟任何筆記。</div>'; return; }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  bar.innerHTML = '<div class="nt-scrollwrap"><div class="nt-scroll" role="tablist" aria-label="已開啟的頁籤">' + tabs.map((t) => {
    const m = idx[t.key], on = t.key === cur;
    return '<div role="tab" aria-selected="' + on + '" data-key="' + esc(t.key) + '" class="nt-tab' + (on ? " on" : "") + (t.pinned ? " pinned" : "") + '">' +
      (on ? '<i class="nt-ind" aria-hidden="true"></i>' : "") + '<span class="nt-t">' + esc(m.title) + "</span></div>";
  }).join("") + "</div></div>";
  // island（client:load）hydrate 時沿用同一份 DOM 結構，不會位移；active 頁籤需捲進可視範圍（保留 24px）
})();

// ── 2. Sidebar 系列進度：Sidebar 之後 ──
(() => {
  let rs; try { rs = JSON.parse(localStorage.getItem("nc.reading.v1")) || {}; } catch (e) { rs = {}; }
  document.querySelectorAll("[data-series-slugs]").forEach((el) => {
    const slugs = el.dataset.seriesSlugs.split(","), done = slugs.filter((s) => rs[s] === "done").length;
    const n = el.querySelector("[data-done]"); if (n) n.textContent = done;
    const bar = el.querySelector(".wb-sb-prog i"); if (bar) bar.style.width = Math.round((done / slugs.length) * 100) + "%";
  });
})();
