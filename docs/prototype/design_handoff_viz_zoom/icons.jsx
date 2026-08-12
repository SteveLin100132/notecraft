// NoteCraft — line icon set (Lucide-style, ~2px stroke), matches TrendLink iconography.
const Ico = (paths, opts = {}) => (p = {}) => {
  const s = p.s || 20;
  return React.createElement(
    "svg",
    {
      width: s, height: s, viewBox: "0 0 24 24", fill: opts.fill || "none",
      stroke: opts.fill ? "none" : "currentColor", strokeWidth: p.sw || opts.sw || 1.9,
      strokeLinecap: "round", strokeLinejoin: "round", style: p.style,
    },
    paths.map((d, i) =>
      typeof d === "string"
        ? React.createElement("path", { key: i, d })
        : React.createElement(d.t, { key: i, ...d.a })
    )
  );
};

const Icons = {
  dashboard: Ico([
    { t: "rect", a: { x: 3, y: 3, width: 7, height: 9, rx: 1.5 } },
    { t: "rect", a: { x: 14, y: 3, width: 7, height: 5, rx: 1.5 } },
    { t: "rect", a: { x: 14, y: 12, width: 7, height: 9, rx: 1.5 } },
    { t: "rect", a: { x: 3, y: 16, width: 7, height: 5, rx: 1.5 } },
  ]),
  notes: Ico([
    { t: "path", a: { d: "M4 4.5A1.5 1.5 0 0 1 5.5 3H16l4 4v12.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5Z" } },
    "M15 3v4.5H20", "M8 12h8", "M8 16h5",
  ]),
  tag: Ico([
    "M3 7.5V4.5A1.5 1.5 0 0 1 4.5 3h3a2 2 0 0 1 1.4.6l9 9a1.5 1.5 0 0 1 0 2.1l-3.8 3.8a1.5 1.5 0 0 1-2.1 0l-9-9A2 2 0 0 1 3 8Z",
    { t: "circle", a: { cx: 7, cy: 7, r: 1.2, fill: "currentColor", stroke: "none" } },
  ]),
  about: Ico([
    { t: "circle", a: { cx: 12, cy: 12, r: 9 } }, "M12 16v-4", "M12 8h.01",
  ]),
  search: Ico([{ t: "circle", a: { cx: 11, cy: 11, r: 7 } }, "m21 21-4.3-4.3"], { sw: 2.1 }),
  plus: Ico(["M12 5v14", "M5 12h14"], { sw: 2.3 }),
  clock: Ico([{ t: "circle", a: { cx: 12, cy: 12, r: 9 } }, "M12 7v5l3 2"]),
  sparkle: Ico([
    "M12 3l1.8 4.9L18.7 9l-4.9 1.8L12 15.7l-1.8-4.9L5.3 9l4.9-1.1Z",
    "M19 14l.7 2 2 .7-2 .7L19 19.4 18.3 17.4l-2-.7 2-.7Z",
  ]),
  code: Ico(["m16 18 4-4-4-4", "m8 6-4 4 4 4", "m13 4-2 16"], { sw: 2 }),
  edit: Ico(["M12 20h8", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"]),
  copy: Ico([
    { t: "rect", a: { x: 9, y: 9, width: 11, height: 11, rx: 2 } },
    "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1",
  ]),
  arrowRight: Ico(["M5 12h14", "m13 6 6 6-6 6"], { sw: 2.1 }),
  chevronRight: Ico(["m9 6 6 6-6 6"], { sw: 2.2 }),
  chevronLeft: Ico(["m15 6-6 6 6 6"], { sw: 2.2 }),
  menu: Ico(["M4 6h16", "M4 12h16", "M4 18h16"], { sw: 2 }),
  grid: Ico([
    { t: "rect", a: { x: 3, y: 3, width: 7, height: 7, rx: 1.5 } },
    { t: "rect", a: { x: 14, y: 3, width: 7, height: 7, rx: 1.5 } },
    { t: "rect", a: { x: 3, y: 14, width: 7, height: 7, rx: 1.5 } },
    { t: "rect", a: { x: 14, y: 14, width: 7, height: 7, rx: 1.5 } },
  ]),
  list: Ico(["M8 6h13", "M8 12h13", "M8 18h13", "M3.5 6h.01", "M3.5 12h.01", "M3.5 18h.01"], { sw: 2 }),
  check: Ico(["M20 6 9 17l-5-5"], { sw: 2.6 }),
  clipboard: Ico([
    { t: "rect", a: { x: 5, y: 4, width: 14, height: 17, rx: 2 } },
    { t: "rect", a: { x: 9, y: 2.5, width: 6, height: 3.5, rx: 1 } }, "M9 11h6", "M9 15h4",
  ]),
  folder: Ico(["M3 7.5A1.5 1.5 0 0 1 4.5 6h4l2 2.2h7A1.5 1.5 0 0 1 19 9.7v8.8A1.5 1.5 0 0 1 17.5 20h-13A1.5 1.5 0 0 1 3 18.5Z"]),
  x: Ico(["M18 6 6 18", "M6 6l12 12"], { sw: 2.2 }),
  layers: Ico(["m12 2 9 5-9 5-9-5 9-5Z", "m3 12 9 5 9-5", "M3 17l9 5 9-5"]),
  bolt: Ico(["M13 2 4 14h7l-1 8 9-12h-7Z"]),
  hash: Ico(["M4 9h16", "M4 15h16", "M10 3 8 21", "M16 3l-2 18"], { sw: 1.8 }),
  gitBranch: Ico([{ t: "circle", a: { cx: 6, cy: 6, r: 3 } }, { t: "circle", a: { cx: 6, cy: 18, r: 3 } }, { t: "circle", a: { cx: 18, cy: 8, r: 3 } }, "M18 11a6 6 0 0 1-6 6H9", "M6 9v6"]),
  external: Ico(["M15 3h6v6", "M10 14 21 3", "M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"], { sw: 2 }),
  trash: Ico(["M4 7h16", "M10 11v6", "M14 11v6", "M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13", "M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"], { sw: 1.9 }),
  target: Ico([{ t: "circle", a: { cx: 12, cy: 12, r: 9 } }, { t: "circle", a: { cx: 12, cy: 12, r: 5 } }, { t: "circle", a: { cx: 12, cy: 12, r: 1, fill: "currentColor", stroke: "none" } }], { sw: 1.9 }),
  lightbulb: Ico(["M9 18h6", "M10 21h4", "M12 3a6 6 0 0 0-4 10.5c.6.6 1 1.4 1 2.5h6c0-1.1.4-1.9 1-2.5A6 6 0 0 0 12 3Z"], { sw: 1.9 }),
  circle: Ico([{ t: "circle", a: { cx: 12, cy: 12, r: 8 } }]),
  circleCheck: Ico([{ t: "circle", a: { cx: 12, cy: 12, r: 9 } }, "m8.5 12 2.4 2.4 4.6-5"]),
  bookOpen: Ico(["M12 6.5C10.4 5.2 7.9 4.6 4 4.5V18c3.9.1 6.4.7 8 2 1.6-1.3 4.1-1.9 8-2V4.5c-3.9.1-6.4.7-8 2Z", "M12 6.5V20"], { sw: 1.8 }),
  rotateCcw: Ico(["M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3 8", "M3 4v4h4"], { sw: 2 }),
  play: Ico([{ t: "path", a: { d: "M7.5 5.2v13.6l11-6.8Z", fill: "currentColor", stroke: "none" } }]),
  filter: Ico(["M3.5 5.5h17l-6.6 8V20l-3.8-2v-4.5Z"], { sw: 1.9 }),
  chevronDown: Ico(["m6 9 6 6 6-6"], { sw: 2.2 }),
};

window.Icons = Icons;
