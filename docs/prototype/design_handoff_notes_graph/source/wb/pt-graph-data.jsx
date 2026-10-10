// 關聯圖（Graph）示範資料與佈局 —— 補齊約 60 篇筆記，併入 window.NOTES，讓清單／關聯圖看到同一批資料
const GR_TAGS = ["前端", "效能", "網路", "資安", "後端", "系統設計", "系統規格", "產品管理"];
const GR_UNTAGGED = "未加標籤";
const GR_CAT = { fe: "frontend", be: "backend", pm: "pm", sec: "security", net: "network", root: "" };
// [slug, 標題, 資料夾, 標籤, 摘要, 更新日]
const GR_EXTRA = [
  ["g-react-hooks", "React Hooks 心智模型", "fe", ["前端", "React"], "useState、useEffect 與閉包陷阱，從渲染快照理解 Hooks。", "06-07"],
  ["g-react-state", "React 狀態管理比較", "fe", ["前端", "React"], "Context、Redux、Zustand 與伺服器狀態的分工。", "06-01"],
  ["g-virtual-dom", "Virtual DOM 與 Diff 演算法", "fe", ["前端", "效能", "React"], "同層比較、key 與 O(n) 啟發式的取捨。", "05-27"],
  ["g-web-vitals", "Core Web Vitals 指標", "fe", ["前端", "效能"], "LCP、INP、CLS 的量測方式與常見改善手段。", "05-22"],
  ["g-bundle-split", "打包與程式碼分割", "fe", ["前端", "效能"], "動態 import、路由切分與 vendor chunk 的拆法。", "05-18"],
  ["g-browser-render", "瀏覽器渲染管線", "fe", ["前端", "效能"], "Style → Layout → Paint → Composite，哪一步最貴。", "05-14"],
  ["g-css-flexbox", "Flexbox 排版速查", "fe", ["前端", "CSS"], "主軸、交錯軸與 flex 縮寫的三個值。", "04-20"],
  ["g-a11y-aria", "ARIA 與無障礙語意", "fe", [], "什麼時候該用原生元素，什麼時候才需要 role。", "04-02"],
  ["g-db-transaction", "資料庫交易與隔離等級", "be", ["後端", "資料庫"], "髒讀、不可重複讀與幻讀，四種隔離等級的差異。", "06-06"],
  ["g-db-replica", "讀寫分離與主從複製", "be", ["後端", "系統設計", "資料庫"], "複製延遲帶來的一致性問題與因應。", "05-30"],
  ["g-redis-cache", "Redis 快取模式", "be", ["後端", "效能"], "Cache-Aside、Write-Through 與快取雪崩。", "05-26"],
  ["g-msg-queue", "訊息佇列與非同步處理", "be", ["後端", "系統設計"], "至少一次投遞、死信佇列與消費者冪等。", "05-21"],
  ["g-idempotency", "API 冪等性設計", "be", ["後端", "系統設計"], "Idempotency-Key 與重送安全的請求設計。", "05-16"],
  ["g-rest-design", "RESTful API 設計原則", "be", ["後端"], "資源命名、狀態碼與分頁的慣例。", "05-11"],
  ["g-sys-glossary", "系統設計術語表", "be", ["系統設計"], "吞吐量、延遲、可用性、一致性等共用術語的定義。", "06-12"],
  ["g-circuit", "斷路器與重試策略", "be", ["後端", "系統設計"], "指數退避、抖動與斷路器的三種狀態。", "05-06"],
  ["g-observability", "可觀測性：日誌、指標、追蹤", "be", ["後端"], "三種訊號各自回答的問題。", "04-12"],
  ["g-jwt", "JWT 結構與驗證", "sec", ["資安", "後端"], "Header、Payload、Signature 與常見誤用。", "06-04"],
  ["g-csrf", "CSRF 攻擊與防護", "sec", ["資安", "前端"], "SameSite Cookie 與 CSRF Token 的分工。", "05-24"],
  ["g-cors", "CORS 跨來源請求", "sec", ["資安", "網路"], "預檢請求、憑證與 Access-Control-* 標頭。", "05-19"],
  ["g-oidc", "OpenID Connect 身分層", "sec", ["資安"], "ID Token 與 UserInfo，OAuth 之上的身分協定。", "05-09"],
  ["g-hash", "密碼雜湊與加鹽", "sec", ["資安"], "bcrypt、scrypt 與 Argon2 的選擇。", "04-08"],
  ["g-http-basics", "HTTP 基礎總覽", "net", ["網路"], "方法、狀態碼、標頭與連線模型的共用定義。", "06-14"],
  ["g-tls", "TLS 1.3 交握流程", "net", ["網路", "資安"], "1-RTT 交握與 0-RTT 的重放風險。", "05-29"],
  ["g-tcp", "TCP 三向交握與壅塞控制", "net", ["網路", "效能"], "慢啟動、壅塞避免與快速重傳。", "05-13"],
  ["g-cdn", "CDN 與邊緣快取", "net", ["網路", "效能"], "回源、快取鍵與失效策略。", "05-08"],
  ["g-dns", "DNS 解析流程", "net", ["網路"], "遞迴、迭代查詢與 TTL。", "04-16"],
  ["g-quic", "QUIC 協定", "net", ["網路"], "以 UDP 為基礎的多工傳輸。", "03-28"],
  ["g-user-story", "使用者故事撰寫", "pm", ["產品管理"], "INVEST 原則與驗收條件的寫法。", "06-02"],
  ["g-prd", "PRD 撰寫要點", "pm", ["產品管理"], "問題、目標、範圍與不做的事。", "05-25"],
  ["g-okr", "OKR 目標設定", "pm", ["產品管理"], "目標與關鍵結果的拆解方式。", "04-24"],
  ["g-retro", "敏捷回顧會議", "pm", [], "讓回顧產出可執行的改善項目。", "04-04"],
  ["g-estimate", "工時估算與故事點", "pm", [], "相對估算與規劃撲克。", "03-22"],
  ["g-git-flow", "Git 分支策略", "root", [], "Git Flow、GitHub Flow 與主幹開發。", "03-18"],
  ["g-markdown", "MDX 寫作慣例", "root", [], "標題層級、程式碼區塊與元件的使用規則。", "03-10"],
];
// [來源, 目標, 種類, 次數]   ref 定義引用 / inc 定義嵌入 / link 站內連結 / seq 系列順序（由 SERIES 推導）
const GR_LINKS = [
  ["http-caching", "g-http-basics", "ref", 3], ["http-versions-performance", "g-http-basics", "ref", 2], ["g-tls", "g-http-basics", "link", 1],
  ["g-cdn", "g-http-basics", "ref", 1], ["g-tcp", "g-http-basics", "ref", 1], ["g-cors", "g-http-basics", "ref", 2],
  ["g-rest-design", "g-http-basics", "ref", 2], ["g-jwt", "g-http-basics", "link", 1], ["g-csrf", "g-http-basics", "link", 1],
  ["rate-limiting-token-bucket", "g-sys-glossary", "ref", 2], ["g-msg-queue", "g-sys-glossary", "ref", 1], ["g-idempotency", "g-sys-glossary", "inc", 1],
  ["g-db-replica", "g-sys-glossary", "ref", 2], ["g-circuit", "g-sys-glossary", "ref", 3], ["g-redis-cache", "g-sys-glossary", "ref", 1],
  ["http-caching", "g-sys-glossary", "link", 1], ["database-index-btree", "g-sys-glossary", "ref", 1],
  ["g-react-hooks", "react-rendering-fiber", "ref", 2], ["g-react-state", "react-rendering-fiber", "link", 1], ["g-virtual-dom", "react-rendering-fiber", "ref", 2],
  ["g-web-vitals", "react-rendering-fiber", "link", 1], ["g-browser-render", "react-rendering-fiber", "ref", 1],
  ["g-jwt", "oauth-2-pkce", "ref", 1], ["g-oidc", "oauth-2-pkce", "inc", 2], ["g-csrf", "oauth-2-pkce", "link", 1],
  ["g-db-transaction", "database-index-btree", "ref", 1], ["g-db-replica", "database-index-btree", "link", 1],
  ["g-cdn", "http-caching", "inc", 1], ["g-redis-cache", "http-caching", "link", 1], ["g-msg-queue", "g-idempotency", "link", 1],
  ["g-circuit", "rate-limiting-token-bucket", "link", 1], ["g-csrf", "g-cors", "ref", 1], ["g-tls", "g-tcp", "link", 1],
  ["http-versions-performance", "g-tcp", "ref", 1], ["g-bundle-split", "g-web-vitals", "ref", 1], ["g-browser-render", "g-web-vitals", "link", 1],
  ["g-react-hooks", "g-react-state", "link", 1], ["g-user-story", "g-prd", "link", 1], ["g-prd", "project-vs-product", "ref", 1],
  ["g-user-story", "role-and-responsibility", "ref", 1], ["g-prd", "role-and-responsibility", "link", 1], ["g-db-transaction", "g-db-replica", "link", 1],
  ["database-index-btree", "view:trendmile-schema", "inc", 1], ["g-prd", "view:roadmap-2026h2", "link", 1], ["g-db-transaction", "view:notes-schema-mini", "link", 1],
];
const GR_DATA_IDS = ["trendmile-schema", "roadmap-2026h2", "notes-schema-mini"];
const GR_KIND = {
  ref: { name: "定義引用", short: "引用", desc: "行內引用某篇筆記的定義" },
  inc: { name: "定義嵌入", short: "嵌入", desc: "把某篇筆記的定義整段嵌入" },
  link: { name: "站內連結", short: "連結", desc: "一般連到另一篇筆記的連結" },
  seq: { name: "系列順序", short: "系列", desc: "同一系列的上一章 → 下一章" },
};
const GR_KINDS = ["ref", "inc", "link", "seq"];

(function grInstall() {
  if (!window.NOTES || window.__grInstalled) return;
  window.__grInstalled = true;
  GR_EXTRA.forEach(([slug, title, cat, tags, desc, md]) => {
    if (window.NOTES.some((n) => n.slug === slug)) return;
    const [m, d] = md.split("-").map(Number);
    const cd = new Date(2026, m - 1, d - 9);
    window.NOTES.push({ slug, title, description: desc, tags, category: GR_CAT[cat], createdAt: cd.toISOString().slice(0, 10), updatedAt: "2026-" + md,
      content: [{ t: "p", c: desc }] });
  });
})();

// ── 邊：手寫連結 + 系列順序 + 請假系統的 define/ref（rfBacklinks）──
function grAllEdges() {
  if (window.__grEdges) return window.__grEdges;
  const m = new Map();
  const add = (s, t, k, n) => {
    if (s === t) return;
    const key = s + ">" + t;
    if (!m.has(key)) m.set(key, { id: key, s, t, kinds: {} });
    const e = m.get(key); e.kinds[k] = (e.kinds[k] || 0) + n;
  };
  GR_LINKS.forEach(([s, t, k, n]) => add(s, t, k, n));
  (window.SERIES || []).forEach((sr) => sr.slugs.forEach((x, i) => { if (i) add(sr.slugs[i - 1], x, "seq", 1); }));
  (window.NOTES || []).filter((n) => n.rf).forEach((n) => {
    (window.rfBacklinks ? window.rfBacklinks(n.slug) : []).forEach((b) => {
      if (!b.note) return;
      b.ids.forEach((x) => add(b.note.slug, n.slug, (x.kinds || []).includes("inc") ? "inc" : "ref", 1));
    });
  });
  const out = [...m.values()].map((e) => {
    const ks = Object.keys(e.kinds);
    const kind = ks.sort((a, b) => e.kinds[b] - e.kinds[a] || GR_KINDS.indexOf(a) - GR_KINDS.indexOf(b))[0];
    return { ...e, kind, n: ks.reduce((a, k) => a + e.kinds[k], 0) };
  });
  window.__grEdges = out;
  return out;
}

// ── 節點：rows（已套用側欄篩選）→ 筆記節點 + 相連的資料檔節點 ──
const GR_TIERS = [[0, 1], [2, 3], [4, 7], [8, Infinity]];
function grTier(inDeg) { return GR_TIERS.findIndex(([a, b]) => inDeg >= a && inDeg <= b) + 1; }
function grBuild(rows, opt = {}) {
  const ids = new Set(rows.map((r) => r.slug));
  const all = opt.noLinks ? [] : grAllEdges();
  const dataIds = new Set();
  all.forEach((e) => {
    if (e.t.startsWith("view:") && ids.has(e.s)) dataIds.add(e.t);
    if (e.s.startsWith("view:") && ids.has(e.t)) dataIds.add(e.s);
  });
  const nodes = rows.map((r) => ({ id: r.slug, title: r.title, row: r, folder: r.folder, series: r.series ? r.series.title : null,
    tags: r.tags, gtags: r.tags.filter((t) => GR_TAGS.includes(t)), data: false }));
  dataIds.forEach((id) => {
    const f = (window.DATAFILES || []).find((x) => "view:" + x.id === id);
    nodes.push({ id, title: f ? f.title : id, folder: "資料檔", series: null, tags: [], gtags: [], data: true, plugin: f ? f.plugin : "", fileId: f ? f.id : "" });
  });
  const has = new Set(nodes.map((n) => n.id));
  const edges = all.filter((e) => has.has(e.s) && has.has(e.t));
  return grFinish(nodes, edges);
}
function grFinish(nodes, edges) {
  const inS = {}, outS = {};
  edges.forEach((e) => { (inS[e.t] = inS[e.t] || new Set()).add(e.s); (outS[e.s] = outS[e.s] || new Set()).add(e.t); });
  nodes.forEach((n) => {
    n.inDeg = inS[n.id] ? inS[n.id].size : 0; n.outDeg = outS[n.id] ? outS[n.id].size : 0;
    n.tier = grTier(n.inDeg); n.orphan = n.inDeg + n.outDeg === 0;
  });
  return { nodes, edges };
}

// ── 300 節點的壓力測試資料（不併入 NOTES，點擊不開 Drawer）──
function grBig() {
  if (window.__grBig) return window.__grBig;
  const rnd = grRng(7);
  const folders = ["01-前端", "02-後端", "03-產品管理", "04-資安", "05-網路", "請假系統", "根目錄"];
  const nodes = [], edges = [];
  const hubs = [["b-hub-0", "HTTP 基礎總覽"], ["b-hub-1", "系統設計術語表"], ["b-hub-2", "系統 Overview"], ["b-hub-3", "React 渲染機制與 Fiber 架構"]];
  hubs.forEach(([id, title], i) => nodes.push({ id, title, folder: folders[[4, 1, 5, 0][i]], series: null, tags: [GR_TAGS[i * 2]], gtags: [GR_TAGS[i * 2]], data: false, big: true }));
  for (let i = 0; i < 296; i++) {
    const f = folders[Math.floor(rnd() * folders.length)];
    const t = GR_TAGS[Math.floor(rnd() * GR_TAGS.length)];
    nodes.push({ id: "b-" + i, title: f.replace(/^\d+-/, "") + "筆記 " + String(i + 1).padStart(3, "0"), folder: f, series: null, tags: rnd() < .12 ? [] : [t], gtags: [], data: false, big: true });
  }
  nodes.forEach((n) => { n.gtags = n.tags.filter((t) => GR_TAGS.includes(t)); });
  const ids = nodes.map((n) => n.id);
  const seen = new Set();
  for (let i = 4; i < nodes.length; i++) {
    if (rnd() < .2) continue;
    const k = rnd() < .5 ? 1 : 2;
    for (let j = 0; j < k; j++) {
      const t = rnd() < .35 ? ids[Math.floor(rnd() * 4)] : ids[4 + Math.floor(rnd() * (nodes.length - 4))];
      const key = ids[i] + ">" + t;
      if (t === ids[i] || seen.has(key)) continue;
      seen.add(key);
      const kind = GR_KINDS[Math.floor(rnd() * 3)];
      edges.push({ id: key, s: ids[i], t, kind, kinds: { [kind]: 1 }, n: 1 });
    }
  }
  window.__grBig = grFinish(nodes, edges);
  return window.__grBig;
}

// ── 佈局 ──
function grRng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const GR_GA = 2.39996;
function grLayoutDoc(nodes, edges, keyOf, groups, R) {
  const rnd = grRng(11);
  const P = {};
  const conn = nodes.filter((n) => !n.orphan), orph = nodes.filter((n) => n.orphan);
  conn.forEach((n) => {
    const gi = Math.max(0, groups.indexOf(keyOf(n)));
    const a = (gi / Math.max(1, groups.length)) * Math.PI * 2 + rnd() * .9;
    const rr = 60 + rnd() * 180;
    P[n.id] = { x: Math.cos(a) * rr, y: Math.sin(a) * rr, r: R(n) };
  });
  const L = edges.filter((e) => P[e.s] && P[e.t]);
  const arr = conn.map((n) => P[n.id]);
  const N = arr.length, it = N > 150 ? 260 : 380, rep = N > 150 ? 1300 : 3200;
  const vx = new Float64Array(N), vy = new Float64Array(N), idx = {};
  conn.forEach((n, i) => (idx[n.id] = i));
  for (let s = 0; s < it; s++) {
    const al = Math.max(.03, 1 - s / it);
    const fx = new Float64Array(N), fy = new Float64Array(N);
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      let dx = arr[i].x - arr[j].x, dy = arr[i].y - arr[j].y, d2 = dx * dx + dy * dy;
      if (d2 < 1) { dx = rnd() - .5; dy = rnd() - .5; d2 = 1; }
      if (d2 > 160000) continue;
      const d = Math.sqrt(d2), f = rep / d2;
      fx[i] += dx / d * f; fy[i] += dy / d * f; fx[j] -= dx / d * f; fy[j] -= dy / d * f;
    }
    L.forEach((e) => {
      const i = idx[e.s], j = idx[e.t], a = arr[i], b = arr[j];
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
      const len = (N > 150 ? 40 : 58) + a.r + b.r, f = (d - len) * .05;
      fx[i] += dx / d * f; fy[i] += dy / d * f; fx[j] -= dx / d * f; fy[j] -= dy / d * f;
    });
    for (let i = 0; i < N; i++) {
      fx[i] -= arr[i].x * .014; fy[i] -= arr[i].y * .014;
      vx[i] = (vx[i] + fx[i]) * .55; vy[i] = (vy[i] + fy[i]) * .55;
      arr[i].x += Math.max(-24, Math.min(24, vx[i] * al)); arr[i].y += Math.max(-24, Math.min(24, vy[i] * al));
    }
    if (s > it * .5) grCollide(arr, 7);
  }
  // 孤島：依著色依據分團，排在外圍環上
  let Rm = 0;
  arr.forEach((p) => { Rm = Math.max(Rm, Math.hypot(p.x, p.y) + p.r); });
  const og = [];
  orph.forEach((n) => { const k = keyOf(n); let g = og.find((x) => x.key === k); if (!g) { g = { key: k, items: [] }; og.push(g); } g.items.push(n); });
  og.sort((a, b) => groups.indexOf(a.key) - groups.indexOf(b.key));
  const clusters = [];
  const W = og.reduce((a, g) => a + Math.sqrt(g.items.length) + 1.2, 0);
  let acc = 0;
  const ring = (N ? Rm + 46 : 0);
  og.forEach((g) => {
    const w = Math.sqrt(g.items.length) + 1.2;
    const a = -Math.PI / 2 + ((acc + w / 2) / W) * Math.PI * 2; acc += w;
    const cr = 9 * Math.sqrt(g.items.length) + 8;
    const rr = N ? ring + cr : (og.length > 1 ? 90 + og.length * 18 : 0);
    const cx = Math.cos(a) * rr, cy = Math.sin(a) * rr;
    g.items.forEach((n, i) => {
      const q = 10.5 * Math.sqrt(i + .5), t = i * GR_GA;
      P[n.id] = { x: cx + Math.cos(t) * q, y: cy + Math.sin(t) * q, r: R(n) };
    });
    clusters.push({ key: g.key, x: cx, y: cy + cr + 14, n: g.items.length });
  });
  const pos = {};
  Object.keys(P).forEach((k) => (pos[k] = { x: P[k].x, y: P[k].y }));
  return { pos, clusters, hubs: [] };
}
function grCollide(arr, pad) {
  const N = arr.length;
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
    const a = arr[i], b = arr[j];
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || .01, m = a.r + b.r + pad;
    if (d < m) {
      const k = (m - d) / d / 2;
      if (a.fixed) { b.x += dx * k * 2; b.y += dy * k * 2; }
      else if (b.fixed) { a.x -= dx * k * 2; a.y -= dy * k * 2; }
      else { a.x -= dx * k; a.y -= dy * k; b.x += dx * k; b.y += dy * k; }
    }
  }
}
function grHubR(n) { return 15 + Math.sqrt(n) * 2.6; }
function grLayoutTag(nodes, R) {
  const rnd = grRng(5);
  const cnt = {};
  const place = {};
  nodes.forEach((n) => { (n.gtags.length ? n.gtags : [GR_UNTAGGED]).forEach((t) => { place[t] = (place[t] || 0) + 1; if (!n.data) cnt[t] = (cnt[t] || 0) + 1; }); });
  const slots = GR_TAGS.concat(GR_UNTAGGED).filter((t) => place[t]);
  const S = slots.length, RR = S <= 1 ? 0 : Math.max(140, S * 26 + Math.sqrt(nodes.length) * 10);
  const hubs = slots.map((t, i) => {
    const a = -Math.PI / 2 + (i / S) * Math.PI * 2;
    return { id: "tag:" + t, tag: t, n: cnt[t] || 0, x: Math.cos(a) * RR, y: Math.sin(a) * RR, r: grHubR(place[t]), untagged: t === GR_UNTAGGED };
  });
  const H = {}; hubs.forEach((h) => (H[h.tag] = h));
  const k = {};
  const arr = nodes.map((n) => {
    const tg = n.gtags.length ? n.gtags : [GR_UNTAGGED];
    let tx, ty;
    if (tg.length === 1) {
      const h = H[tg[0]], i = (k[tg[0]] = (k[tg[0]] || 0) + 1) - 1;
      const q = h.r + 12 + 10.5 * Math.sqrt(i + .5), t = i * GR_GA;
      tx = h.x + Math.cos(t) * q; ty = h.y + Math.sin(t) * q;
    } else {
      tx = tg.reduce((a, t) => a + H[t].x, 0) / tg.length + (rnd() - .5) * 14;
      ty = tg.reduce((a, t) => a + H[t].y, 0) / tg.length + (rnd() - .5) * 14;
    }
    return { id: n.id, x: tx, y: ty, tx, ty, r: R(n) };
  });
  const all = arr.concat(hubs.map((h) => ({ ...h, fixed: true })));
  for (let s = 0; s < 120; s++) {
    arr.forEach((p) => { p.x += (p.tx - p.x) * .06; p.y += (p.ty - p.y) * .06; });
    grCollide(all, 3.5);
  }
  const pos = {};
  arr.forEach((p) => (pos[p.id] = { x: p.x, y: p.y }));
  hubs.forEach((h) => (pos[h.id] = { x: h.x, y: h.y }));
  return { pos, clusters: [], hubs };
}

// 著色依據
function grColorKey(by) {
  if (by === "series") return (n) => n.series || "未歸入系列";
  if (by === "tag") return (n) => n.gtags[0] || GR_UNTAGGED;
  if (by === "none") return () => "全部";
  return (n) => n.folder;
}
const GR_NEUTRAL = ["未歸入系列", GR_UNTAGGED, "全部", "資料檔"];
function grGroups(by) {
  if (by === "series") return (window.SERIES || []).map((s) => s.title).concat("未歸入系列");
  if (by === "tag") return GR_TAGS.concat(GR_UNTAGGED);
  if (by === "none") return ["全部"];
  return ["01-前端", "02-後端", "03-產品管理", "04-資安", "05-網路", "請假系統", "根目錄", "資料檔"];
}
function grColor(key, by) {
  if (GR_NEUTRAL.includes(key)) return key === "資料檔" ? "var(--wb-gr-c-data)" : "var(--wb-gr-c0)";
  const i = grGroups(by).indexOf(key);
  return i < 0 ? "var(--wb-gr-c0)" : "var(--wb-gr-c" + ((i % 8) + 1) + ")";
}
Object.assign(window, { GR_TAGS, GR_UNTAGGED, GR_KIND, GR_KINDS, GR_TIERS, grBuild, grBig, grAllEdges, grLayoutDoc, grLayoutTag, grColorKey, grGroups, grColor, grHubR, grTier });
