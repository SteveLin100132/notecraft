// Graph 檢視純函式的斷言（Task 132–133，規格 docs/notecraft-workbench-notes-graph.md §4–§6）。
// 邊的來源與計數、URL 解析、連入數與級距、標籤樞紐、著色分組、佈局的性質 —— 這些壞了 build 仍全綠，只有這裡抓得到。
// 由 scripts/check-plugins.mjs 串接執行；單跑：npm run check:wb

import assert from "node:assert/strict";
import fs from "node:fs";
import {
  GR_DATA,
  GR_DENSE,
  GR_DIM,
  GR_HUB_R,
  GR_MOVE_MS,
  GR_OTHER,
  GR_OTHER_TAGS,
  GR_R,
  GR_ROOT,
  GR_UNTAGGED,
  GR_ZOOM,
  buildGraphEdges,
  colorScheme,
  deriveGraph,
  highlightOf,
  mainKind,
  matchNodes,
  pickTagHubs,
  tagLines,
  tagSlots,
  tierOf,
} from "../../src/lib/wb-graph.ts";
import { LAYOUT_DENSE, LAYOUT_HUB_R, edgeGeom, fitView, layoutDoc, layoutTag, mulberry32, runLayout } from "../../src/lib/wb-graph-layout.ts";

let failed = 0;
const check = (name, fn) => {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}\n    ${err.message.split("\n").join("\n    ")}`);
  }
};

console.log("wb-graph");

const note = (slug, extra = {}) => ({ slug, rel: slug + ".mdx", references: [], links: [], ...extra });
const link = (url) => ({ url, via: "link" });
const edgeOf = (edges, s, t) => edges.find((e) => e.s === s && e.t === t);
/** 測試用的 slugify：小寫、空白換成 -（與 github-slugger 對一般檔名的結果相同） */
const slugify = (s) => s.toLowerCase().replace(/\s+/g, "-");

// ── buildGraphEdges ──────────────────────────────────────────────────────────

check("四種邊：方向是「來源 → 被參照的一方」", () => {
  const edges = buildGraphEdges({
    notes: [
      note("a", { references: [{ slug: "b", kinds: ["ref"] }], links: [link("/notes/c")] }),
      note("b", { references: [{ slug: "c", kinds: ["inc"] }] }),
      note("c"),
      note("d"),
    ],
    series: [["c", "d"]],
    dataFiles: [],
  });
  assert.deepEqual(edges, [
    { s: "a", t: "b", kinds: { ref: 1 } },
    { s: "a", t: "c", kinds: { link: 1 } },
    { s: "b", t: "c", kinds: { inc: 1 } },
    { s: "c", t: "d", kinds: { seq: 1 } },
  ]);
});

check("ref／inc 以 id 計：每個 id 一筆，同一個 id 兩種都有時各算 1", () => {
  const edges = buildGraphEdges({
    notes: [
      note("a", {
        references: [
          { slug: "b", kinds: ["inc", "ref"] },
          { slug: "b", kinds: ["ref"] },
          { slug: "b", kinds: ["ref"] },
        ],
      }),
      note("b"),
    ],
    series: [],
    dataFiles: [],
  });
  assert.deepEqual(edges, [{ s: "a", t: "b", kinds: { inc: 1, ref: 3 } }]);
});

check("link 以出現次數計；同一對節點的多種關聯合成一條", () => {
  const edges = buildGraphEdges({
    notes: [note("a", { references: [{ slug: "b", kinds: ["ref"] }], links: [link("/notes/b"), link("/notes/b#x"), link("/notes/b/")] }), note("b")],
    series: [["a", "b"], ["a", "b"]],
    dataFiles: [],
  });
  assert.deepEqual(edges, [{ s: "a", t: "b", kinds: { ref: 1, link: 3, seq: 2 } }]);
});

check("URL 解析：/notes/…（中文、URL 編碼、結尾 /、query、hash、照檔名大小寫）", () => {
  const notes = [
    note("src", {
      links: [
        link("/notes/testing/資料檔內嵌測試"),
        link("/notes/testing/%E8%B3%87%E6%96%99%E6%AA%94%E5%85%A7%E5%B5%8C%E6%B8%AC%E8%A9%A6"),
        link("/notes/my-notes/er-diagram/?x=1#top"),
        link("/notes/My Notes/ER Diagram"),
      ],
    }),
    note("testing/資料檔內嵌測試"),
    note("my-notes/er-diagram", { rel: "My Notes/ER Diagram.md" }),
  ];
  const edges = buildGraphEdges({ notes, series: [], dataFiles: [], slugify });
  assert.equal(edgeOf(edges, "src", "testing/資料檔內嵌測試").kinds.link, 2);
  assert.equal(edgeOf(edges, "src", "my-notes/er-diagram").kinds.link, 2);
});

check("相對連結：.md／.mdx 以檔案位置解析（slug 與路徑不同也對得到）", () => {
  const notes = [
    note("guide/how", { rel: "Guide/How To.mdx", links: [link("../project-requirement-document.md"), link("./Sub Dir/Deep Note.md#sec"), link("Sibling.mdx")] }),
    note("project-requirement-document", { rel: "project-requirement-document.md" }),
    note("guide/sub-dir/deep-note", { rel: "Guide/Sub Dir/Deep Note.md" }),
    note("guide/sibling", { rel: "Guide/Sibling.mdx" }),
  ];
  const edges = buildGraphEdges({ notes, series: [], dataFiles: [] });
  assert.deepEqual(
    edges.map((e) => e.t),
    ["guide/sibling", "guide/sub-dir/deep-note", "project-requirement-document"],
  );
});

check("相對連結：沒有副檔名的以 /notes/<slug> 為基準（瀏覽器的規則）", () => {
  const notes = [
    note("project-mgmt-tool", { links: [link("./role-responsibility-rr")] }),
    note("role-responsibility-rr"),
    note("a/b", { links: [link("c"), link("../top"), link("./missing")] }),
    note("a/c"),
    note("top"),
  ];
  const edges = buildGraphEdges({ notes, series: [], dataFiles: [] });
  assert.ok(edgeOf(edges, "project-mgmt-tool", "role-responsibility-rr"));
  assert.ok(edgeOf(edges, "a/b", "a/c"));
  assert.ok(edgeOf(edges, "a/b", "top"));
  assert.equal(edges.length, 3);
});

check("略過：外部網址、協定相對、純 hash、mailto、不存在的目標、自己連自己、其他站內路徑", () => {
  const edges = buildGraphEdges({
    notes: [
      note("a", {
        links: [
          link("https://example.com/notes/b"),
          link("//cdn.example.com/notes/b"),
          link("#section"),
          link("mailto:x@example.com"),
          link("/notes/nope"),
          link("/notes/a"),
          link("/notes/a#top"),
          link("/series/x"),
          link("/tags"),
          link("./image.png"),
          link("/view/nope"),
        ],
      }),
      note("b"),
    ],
    series: [["a", "ghost", "b"]],
    dataFiles: [],
  });
  assert.deepEqual(edges, []);
});

check("資料檔：/view/…、<PluginView src>、meta.backTo 都連到同一個 view: 節點", () => {
  const edges = buildGraphEdges({
    notes: [
      note("spec", { links: [link("/view/api/orders.openapi#op/createOrder"), { url: "api/orders.openapi.json", via: "pluginview" }, { url: "./api/orders.openapi.json", via: "pluginview" }] }),
      note("other", { links: [{ url: "api/missing.json", via: "pluginview" }] }),
    ],
    series: [["spec", "view:api/orders.openapi"]],
    dataFiles: [
      { routePath: "api/orders.openapi", relPath: "api/orders.openapi.json", backTo: "/notes/spec#api" },
      { routePath: "schema", relPath: "schema.json", backTo: "/notes/nope" },
    ],
  });
  assert.deepEqual(edges, [
    { s: "spec", t: "view:api/orders.openapi", kinds: { link: 3, seq: 1 } },
    { s: "view:api/orders.openapi", t: "spec", kinds: { link: 1 } },
  ]);
});

check("輸出依 s、t 排序（build 結果穩定）", () => {
  const edges = buildGraphEdges({
    notes: [note("z", { links: [link("/notes/b"), link("/notes/a")] }), note("b", { links: [link("/notes/a")] }), note("a")],
    series: [],
    dataFiles: [],
  });
  assert.deepEqual(
    edges.map((e) => `${e.s}>${e.t}`),
    ["b>a", "z>a", "z>b"],
  );
});

// ── deriveGraph ──────────────────────────────────────────────────────────────

const row = (slug, extra = {}) => ({ slug, title: slug.toUpperCase(), folder: [], tags: [], series: null, ...extra });
const E = (s, t, kinds = { link: 1 }) => ({ s, t, kinds });

check("主要種類：次數最多者，同數依 ref → inc → link → seq", () => {
  assert.equal(mainKind({ link: 2, ref: 1 }), "link");
  assert.equal(mainKind({ seq: 1, link: 1 }), "link");
  assert.equal(mainKind({ inc: 2, ref: 2, seq: 2 }), "ref");
  assert.equal(mainKind({ seq: 3 }), "seq");
});

check("級距邊界：0–1、2–3、4–7、8 以上", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 7, 8, 99].map(tierOf), [1, 1, 2, 2, 3, 3, 4, 4]);
});

check("連入／連出以不同來源、目標計；總次數與主要種類", () => {
  const g = deriveGraph(
    [row("hub"), row("a"), row("b"), row("lonely")],
    [E("a", "hub", { ref: 5, link: 2 }), E("b", "hub", { seq: 1 }), E("hub", "a")],
    [],
  );
  const n = Object.fromEntries(g.nodes.map((x) => [x.id, x]));
  assert.equal(n.hub.inDeg, 2);
  assert.equal(n.hub.outDeg, 1);
  assert.equal(n.hub.tier, 2);
  assert.equal(n.a.inDeg, 1);
  assert.equal(n.lonely.orphan, true);
  assert.equal(n.a.orphan, false);
  const e = g.edges.find((x) => x.id === "a>hub");
  assert.equal(e.n, 7);
  assert.equal(e.kind, "ref");
});

check("可見性：篩掉一端後邊消失；資料檔只在與可見筆記相連時出現", () => {
  const data = [
    { id: "view:x", title: "X", pluginId: "er", href: "/view/x" },
    { id: "view:y", title: "Y", pluginId: "er", href: "/view/y" },
  ];
  const edges = [E("a", "b"), E("a", "view:x"), E("view:y", "c"), E("view:x", "view:y", { seq: 1 })];
  const g = deriveGraph([row("a"), row("b")], edges, data);
  assert.deepEqual(g.nodes.map((n) => n.id), ["a", "b", "view:x"]);
  assert.deepEqual(g.edges.map((e) => e.id), ["a>b", "a>view:x"]);
  assert.equal(g.nodes[2].data, true);
  assert.equal(g.nodes[2].href, "/view/x");
  const g2 = deriveGraph([row("b")], edges, data);
  assert.deepEqual(g2.nodes.map((n) => n.id), ["b"]);
  assert.equal(g2.nodes[0].orphan, true);
  // 兩個資料檔都可見時，它們之間的邊保留
  const g3 = deriveGraph([row("a"), row("c")], edges, data);
  assert.ok(g3.edges.some((e) => e.id === "view:x>view:y"));
});

check("樞紐：被 8 篇連入是第 4 級", () => {
  const rows = [row("hub"), ...Array.from({ length: 8 }, (_, i) => row("n" + i))];
  const g = deriveGraph(rows, rows.slice(1).map((r) => E(r.slug, "hub")), []);
  assert.equal(g.nodes[0].tier, 4);
});

// ── 標籤樞紐、著色分組 ──────────────────────────────────────────────────────

const tagStat = (name, count) => ({ name, count });

check("標籤樞紐：前 8 個、同數依名稱、篩選中的標籤被加入", () => {
  const tags = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"].map((n, i) => tagStat(n, 20 - i));
  assert.deepEqual(pickTagHubs(tags), ["a", "b", "c", "d", "e", "f", "g", "h"]);
  assert.deepEqual(pickTagHubs(tags, "j"), ["a", "b", "c", "d", "e", "f", "g", "h", "j"]);
  assert.deepEqual(pickTagHubs(tags, "b").length, 8);
  assert.deepEqual(pickTagHubs(tags, "不存在"), pickTagHubs(tags));
  assert.deepEqual(pickTagHubs([tagStat("乙", 1), tagStat("甲", 1), tagStat("丙", 3)]), ["丙", "乙", "甲"].sort((x, y) => (x === "丙" ? -1 : y === "丙" ? 1 : x < y ? -1 : 1)));
});

check("標籤的團：樞紐標籤可多個；只有非樞紐標籤 → 其他標籤；沒有標籤與資料檔 → 未加標籤", () => {
  const hubs = ["前端", "效能"];
  assert.deepEqual(tagSlots({ tags: ["效能", "冷門", "前端"], data: false }, hubs), ["前端", "效能"]);
  assert.deepEqual(tagSlots({ tags: ["冷門"], data: false }, hubs), [GR_OTHER_TAGS]);
  assert.deepEqual(tagSlots({ tags: [], data: false }, hubs), [GR_UNTAGGED]);
  assert.deepEqual(tagSlots({ tags: ["前端"], data: true }, hubs), [GR_UNTAGGED]);
});

check("著色分組：超過 8 組時第 9 組以後歸「其他」；配色依節點數", () => {
  const rows = [];
  for (let i = 1; i <= 10; i++) for (let j = 0; j < 12 - i; j++) rows.push(row(`f${i}/n${j}`, { folder: [`f${String(i).padStart(2, "0")}`] }));
  const cs = colorScheme("folder", rows);
  assert.deepEqual(cs.order.slice(0, 8), ["f01", "f02", "f03", "f04", "f05", "f06", "f07", "f08"]);
  assert.equal(cs.colorOf("f01"), "var(--wb-gr-c1)");
  assert.equal(cs.colorOf("f08"), "var(--wb-gr-c8)");
  assert.equal(cs.keyOf({ folder: ["f09"], series: null, tags: [], data: false }), GR_OTHER);
  assert.equal(cs.colorOf(GR_OTHER), "var(--wb-gr-c0)");
  assert.ok(cs.order.includes(GR_OTHER));
  assert.equal(cs.keyOf({ folder: [], series: null, tags: [], data: true }), GR_DATA);
  assert.equal(cs.colorOf(GR_DATA), "var(--wb-gr-c-data)");
});

check("著色分組：資料夾跟著 scope 往下一層；根目錄是一組；顯示名稱取最後一段", () => {
  const rows = [row("r"), row("a/x", { folder: ["a"] }), row("a/b/y", { folder: ["a", "b"] }), row("a/c/z", { folder: ["a", "c"] }), row("d/w", { folder: ["d"] })];
  const top = colorScheme("folder", rows);
  assert.deepEqual([...top.order].sort(), ["a", "d", GR_ROOT, GR_DATA].sort());
  const scoped = colorScheme("folder", rows, "a");
  assert.equal(scoped.keyOf({ folder: ["a", "b"], series: null, tags: [], data: false }), "a/b");
  assert.equal(scoped.keyOf({ folder: ["a"], series: null, tags: [], data: false }), "a");
  assert.ok(!scoped.order.includes("d"), "scope 之外的資料夾不佔色盤");
  assert.equal(scoped.labelOf("a/b"), "b");
});

check("著色分組：系列與標籤的未分類是灰色；不著色只有一組", () => {
  const rows = [row("a", { series: { title: "S1" }, tags: ["前端"] }), row("b", { tags: ["冷門"] }), row("c")];
  const s = colorScheme("series", rows);
  assert.equal(s.colorOf("S1"), "var(--wb-gr-c1)");
  assert.equal(s.colorOf(s.keyOf({ folder: [], series: null, tags: [], data: false })), "var(--wb-gr-c0)");
  const t = colorScheme("tag", rows, "", ["前端"]);
  assert.equal(t.keyOf({ folder: [], series: null, tags: ["冷門", "前端"], data: false }), "前端");
  assert.equal(t.keyOf({ folder: [], series: null, tags: ["冷門"], data: false }), GR_OTHER_TAGS);
  assert.equal(t.keyOf({ folder: [], series: null, tags: [], data: false }), GR_UNTAGGED);
  assert.equal(t.colorOf(GR_OTHER_TAGS), "var(--wb-gr-c0)");
  const n = colorScheme("none", rows);
  assert.equal(n.keyOf({ folder: ["x"], series: "S1", tags: ["前端"], data: false }), n.keyOf({ folder: [], series: null, tags: [], data: true }));
  assert.equal(n.order.length, 2);
});

check("標籤著色的配色順序跟著樞紐順序", () => {
  const rows = [row("a", { tags: ["乙"] }), row("b", { tags: ["甲"] }), row("c", { tags: ["甲"] })];
  const hubs = pickTagHubs([tagStat("甲", 2), tagStat("乙", 1)]);
  const t = colorScheme("tag", rows, "", hubs);
  assert.equal(t.colorOf("甲"), "var(--wb-gr-c1)");
  assert.equal(t.colorOf("乙"), "var(--wb-gr-c2)");
});

// ── 搜尋與高亮 ──────────────────────────────────────────────────────────────

check("搜尋：比對標題＋資料夾＋標籤，不分大小寫；空字串回 null", () => {
  const g = deriveGraph([row("a", { title: "React 渲染" }), row("b", { folder: ["Frontend"] }), row("c", { tags: ["react"] }), row("d")], [], []);
  assert.equal(matchNodes(g.nodes, "  "), null);
  assert.deepEqual([...matchNodes(g.nodes, "REACT")].sort(), ["a", "c"]);
  assert.deepEqual([...matchNodes(g.nodes, "front")], ["b"]);
});

check("高亮：hover 邊 ＞ hover 節點 ＞ 搜尋；都沒有回 null", () => {
  const g = deriveGraph([row("a"), row("b"), row("c"), row("d")], [E("a", "b"), E("b", "c")], []);
  const base = { mode: "doc", hover: null, hoverEdge: null, matches: null, nodes: g.nodes, edges: g.edges, lines: [], hubs: [] };
  assert.equal(highlightOf(base), null);
  const h = highlightOf({ ...base, hover: "b" });
  assert.deepEqual([...h.nodes].sort(), ["a", "b", "c"]);
  assert.deepEqual([...h.edges].sort(), ["a>b", "b>c"]);
  const he = highlightOf({ ...base, hover: "b", hoverEdge: "a>b" });
  assert.deepEqual([...he.nodes].sort(), ["a", "b"]);
  const hm = highlightOf({ ...base, matches: new Set(["a", "b", "d"]) });
  assert.deepEqual([...hm.edges], ["a>b"], "兩端都符合的邊才高亮");
});

check("高亮（標籤模式）：hover 樞紐 → 樞紐＋成員＋細線；hover 筆記 → 筆記＋它的樞紐", () => {
  const hubs = ["前端", "效能"];
  const g = deriveGraph([row("a", { tags: ["前端"] }), row("b", { tags: ["前端", "效能"] }), row("c", { tags: ["冷門"] }), row("d")], [], []);
  const lines = tagLines(g.nodes, hubs);
  assert.deepEqual(lines.map((l) => l.id), ["tl:a>前端", "tl:b>前端", "tl:b>效能"]);
  const base = { mode: "tag", hover: null, hoverEdge: null, matches: null, nodes: g.nodes, edges: [], lines, hubs };
  const hub = highlightOf({ ...base, hover: "tag:前端" });
  assert.deepEqual([...hub.nodes].sort(), ["a", "b", "tag:前端"].sort());
  assert.deepEqual([...hub.edges].sort(), ["tl:a>前端", "tl:b>前端"]);
  const other = highlightOf({ ...base, hover: "tag:" + GR_OTHER_TAGS });
  assert.deepEqual([...other.nodes].sort(), ["c", "tag:" + GR_OTHER_TAGS].sort());
  const n = highlightOf({ ...base, hover: "b" });
  assert.deepEqual([...n.nodes].sort(), ["b", "tag:前端", "tag:效能"].sort());
});

// ── 佈局（斷言性質，不比對座標快照）────────────────────────────────────────

/** 以固定種子產生一張圖：n 個節點、約 1.2n 條邊、其餘是孤島 */
function sample(n, seed = 7) {
  const rnd = mulberry32(seed);
  const groups = ["g0", "g1", "g2", "g3", "g4"];
  const nodes = Array.from({ length: n }, (_, i) => ({ id: "n" + i, r: GR_R[Math.floor(rnd() * rnd() * 4)], orphan: true, group: groups[Math.floor(rnd() * groups.length)] }));
  const pool = nodes.filter(() => rnd() > 0.2);
  const edges = [];
  for (let i = 0; i < n * 1.2; i++) {
    const a = pool[Math.floor(rnd() * pool.length)];
    const b = pool[Math.floor(rnd() * rnd() * pool.length)];
    if (a !== b) edges.push({ s: a.id, t: b.id });
  }
  const linked = new Set(edges.flatMap((e) => [e.s, e.t]));
  for (const x of nodes) x.orphan = !linked.has(x.id);
  return { nodes, edges, groups };
}

for (const n of [1, 12, 65, 200]) {
  check(`文件模式（${n} 節點）：結果確定、沒有 NaN、有邊的節點兩兩不重疊、孤島在主圖之外`, () => {
    const g = sample(n);
    const a = layoutDoc(g.nodes, g.edges, g.groups);
    const b = layoutDoc(g.nodes, g.edges, g.groups);
    assert.deepEqual(a, b, "同一輸入兩次結果要完全相同");
    assert.equal(Object.keys(a.pos).length, n);
    for (const p of Object.values(a.pos)) assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
    const conn = g.nodes.filter((x) => !x.orphan);
    let maxR = 0;
    for (const x of conn) maxR = Math.max(maxR, Math.hypot(a.pos[x.id].x, a.pos[x.id].y) + x.r);
    for (let i = 0; i < conn.length; i++) {
      for (let j = i + 1; j < conn.length; j++) {
        const p = a.pos[conn[i].id];
        const q = a.pos[conn[j].id];
        assert.ok(Math.hypot(p.x - q.x, p.y - q.y) >= conn[i].r + conn[j].r - 1, `${conn[i].id} 與 ${conn[j].id} 重疊`);
      }
    }
    if (conn.length) {
      for (const c of a.clusters) assert.ok(Math.hypot(c.x, c.y) > maxR, `孤島團「${c.key}」落在主圖裡`);
    }
    assert.equal(a.clusters.reduce((s, c) => s + c.n, 0), g.nodes.filter((x) => x.orphan).length);
  });
}

check("文件模式：孤島的團依分組順序排、同組相鄰", () => {
  const nodes = ["b", "a", "b", "c", "a"].map((g, i) => ({ id: "o" + i, r: 5, orphan: true, group: g }));
  const out = layoutDoc(nodes, [], ["a", "b", "c"]);
  assert.deepEqual(out.clusters.map((c) => [c.key, c.n]), [["a", 2], ["b", 2], ["c", 1]]);
  const d = (i, j) => Math.hypot(out.pos["o" + i].x - out.pos["o" + j].x, out.pos["o" + i].y - out.pos["o" + j].y);
  assert.ok(d(0, 2) < d(0, 1), "同組的孤島比不同組的近");
});

check("標籤模式：樞紐等距排在圓上、自 −90° 起；單一歸屬的節點離自己的樞紐最近；結果確定", () => {
  const slots = ["甲", "乙", "丙", "丁", "其他標籤", "未加標籤"];
  const rnd = mulberry32(3);
  const nodes = Array.from({ length: 60 }, (_, i) => {
    const one = slots[Math.floor(rnd() * 5)];
    const two = slots[Math.floor(rnd() * 4)];
    return { id: "n" + i, r: 5, data: i % 20 === 0, slots: i % 7 === 0 && one !== two && one !== "其他標籤" ? [one, two] : [one] };
  });
  const a = layoutTag(nodes, slots);
  assert.deepEqual(a, layoutTag(nodes, slots));
  const present = slots.filter((s) => nodes.some((n) => n.slots.includes(s)));
  assert.deepEqual(a.hubs.map((h) => h.tag), present, "只放有節點的樞紐，順序照 slots");
  assert.ok(Math.abs(a.hubs[0].x) < 1e-6 && a.hubs[0].y < 0, "第一個樞紐在正上方");
  const radii = a.hubs.map((h) => Math.hypot(h.x, h.y));
  for (const r of radii) assert.ok(Math.abs(r - radii[0]) < 1e-6);
  for (const h of a.hubs) {
    assert.equal(a.pos[h.id].x, h.x);
    assert.ok(h.r >= GR_HUB_R);
    assert.equal(h.n, nodes.filter((n) => !n.data && n.slots.includes(h.tag)).length, "樞紐上的數字不含資料檔");
  }
  for (const n of nodes.filter((x) => x.slots.length === 1)) {
    const p = a.pos[n.id];
    const nearest = [...a.hubs].sort((x, y) => Math.hypot(p.x - x.x, p.y - x.y) - Math.hypot(p.x - y.x, p.y - y.y))[0];
    assert.equal(nearest.tag, n.slots[0], n.id);
  }
  assert.deepEqual(layoutTag([], slots), { pos: {}, hubs: [] });
});

check("符合視窗：所有點落在視窗內、倍率在下限與 160% 之間", () => {
  const g = sample(65);
  const { pos } = layoutDoc(g.nodes, g.edges, g.groups);
  for (const [w, h] of [[1148, 721], [600, 400], [300, 2000]]) {
    const v = fitView(Object.values(pos), w, h);
    assert.ok(v.k >= GR_ZOOM.min && v.k <= 1.6);
    if (v.k > GR_ZOOM.min) {
      for (const p of Object.values(pos)) {
        const x = p.x * v.k + v.x;
        const y = p.y * v.k + v.y;
        assert.ok(x >= 0 && x <= w && y >= 0 && y <= h, `(${x.toFixed(0)}, ${y.toFixed(0)}) 超出 ${w}×${h}`);
      }
    }
  }
  assert.equal(fitView([{ x: 0, y: 0 }], 1000, 800).k, 1.6, "只有一個點時用上限");
  assert.equal(fitView([], 1000, 800), null);
  assert.equal(fitView([{ x: 0, y: 0 }], 0, 0), null);
});

check("邊的幾何：線從來源邊緣外 1.5px 到箭頭底部、尖端在目標邊緣外 2px；兩端太近不畫", () => {
  const g = edgeGeom({ x: 0, y: 0 }, { x: 100, y: 0 }, 5, 8);
  assert.equal(g.x1, 6.5);
  assert.equal(g.tx, 90);
  assert.equal(g.x2, 84.5);
  assert.equal(g.arrow, "M90 0L83 3.3L83 -3.3z");
  assert.equal(edgeGeom({ x: 0, y: 0 }, { x: 20, y: 0 }, 5, 8), null);
});

check("runLayout：兩種模式回同一種形狀；佈局常數與 wb-graph.ts 一致", () => {
  const g = sample(20);
  const doc = runLayout({ key: "k", mode: "doc", nodes: g.nodes, edges: g.edges, groups: g.groups });
  assert.deepEqual(Object.keys(doc).sort(), ["clusters", "hubs", "pos"]);
  const tag = runLayout({ key: "k", mode: "tag", nodes: g.nodes.map((n) => ({ id: n.id, r: n.r, data: false, slots: ["x"] })), slots: ["x"] });
  assert.equal(tag.hubs.length, 1);
  assert.equal(LAYOUT_DENSE, GR_DENSE);
  assert.equal(LAYOUT_HUB_R, GR_HUB_R);
});

// ── 常數與 token、純度 ──────────────────────────────────────────────────────

const root = new URL("../../", import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root), "utf8");

check("純度：wb-graph.ts 只有 import type、不碰 window／node:", () => {
  const src = read("src/lib/wb-graph.ts").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  for (const m of src.matchAll(/^import\s+(.*)$/gm)) assert.match(m[1], /^type\b/, `非 type 的 import：${m[0]}`);
  assert.doesNotMatch(src, /\bwindow\.|\bdocument\.|["']node:|\bprocess\./);
});

check("純度：wb-graph-layout.ts 沒有非 type 的 import、不碰 window／node:", () => {
  const src = read("src/lib/wb-graph-layout.ts").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  for (const m of src.matchAll(/^import\s+(.*)$/gm)) assert.match(m[1], /^type\b/, `非 type 的 import：${m[0]}`);
  assert.doesNotMatch(src, /\bwindow\.|\bdocument\.|["']node:|\bprocess\./);
});

const css = fs.existsSync(new URL("src/styles/workbench.css", root)) ? read("src/styles/workbench.css") : "";
const token = (name) => {
  const m = new RegExp(`--wb-gr-${name}:\\s*([^;}]+)`).exec(css);
  return m ? m[1].trim() : null;
};
if (token("r1") !== null) {
  check("token 同步：workbench.css 的 --wb-gr-* 與 wb-graph.ts 的常數相同", () => {
    const num = (name) => Number.parseFloat(token(name));
    assert.deepEqual([num("r1"), num("r2"), num("r3"), num("r4")], [...GR_R]);
    assert.equal(num("r-hub"), GR_HUB_R);
    assert.equal(num("edge-rest"), GR_DIM.rest);
    assert.equal(num("dim-node"), GR_DIM.node);
    assert.equal(num("dim-edge"), GR_DIM.edge);
    assert.equal(num("zoom-label"), GR_ZOOM.label);
    assert.equal(num("zoom-label-dense"), GR_ZOOM.dense);
    assert.equal(num("zoom-min"), GR_ZOOM.min);
    assert.equal(num("zoom-max"), GR_ZOOM.max);
    assert.equal(num("dur-move"), GR_MOVE_MS);
  });
}

if (failed) {
  console.error(`\n✗ wb-graph：${failed} 項失敗`);
  process.exit(1);
}
console.log("✓ wb-graph：通過");
