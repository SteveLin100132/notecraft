/**
 * NoteCraft 自訂 remark transform — 將 `remark-directive` 解析出的指令節點
 * 對映到 Admonitions / Content tabs / Tooltips 的 HTML 結構。
 *
 * 須掛在 `remark-directive` 之後（先解析出 directive 節點，再由本 transform 轉換）。
 * 對應 PRD §7.1「Markdown 擴充語法」、tasks 14~16。樣式見 `src/styles/global.css`（.nc-adm / .nc-tabs / .nc-tip）。
 *
 * 設計取捨：
 * - 不依賴 unist-util-visit，改以自寫遞迴走訪，避免引入額外相依（tabs 需特殊處理子節點，
 *   一般 visitor 反而不便）。
 * - 透過 mdast `data.hName` / `data.hProperties` / `data.hChildren` 指定輸出的 HTML（remark-rehype 的標準做法）。
 */

// mdast 節點結構鬆散且動態，這裡用最小化的介面描述本 transform 會碰到的欄位。
interface DirectiveData {
  hName?: string;
  hProperties?: Record<string, unknown>;
  directiveLabel?: boolean;
}
interface MdNode {
  type: string;
  name?: string;
  attributes?: Record<string, string | null | undefined> | null;
  children?: MdNode[];
  value?: string;
  data?: DirectiveData;
}
interface VFileLike {
  path?: string;
}

const ADMONITION_TYPES = new Set([
  "note",
  "tip",
  "info",
  "warning",
  "danger",
  "success",
]);

// 線性 icon（lucide 風格）：以 path / circle / line 描述，輸出為 <svg>。color 由 currentColor 繼承標題色。
type SvgChild = { tag: string; props: Record<string, string> };
const ICONS: Record<string, SvgChild[]> = {
  note: [{ tag: "path", props: { d: "M12 20h9" } }, { tag: "path", props: { d: "M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" } }],
  info: [{ tag: "circle", props: { cx: "12", cy: "12", r: "10" } }, { tag: "path", props: { d: "M12 16v-4" } }, { tag: "path", props: { d: "M12 8h.01" } }],
  tip: [{ tag: "path", props: { d: "M15 14c.2-1 .7-1.7 1.5-2.5A4.8 4.8 0 0 0 18 8a6 6 0 0 0-12 0c0 1.3.5 2.4 1.5 3.5.8.8 1.3 1.5 1.5 2.5" } }, { tag: "path", props: { d: "M9 18h6" } }, { tag: "path", props: { d: "M10 22h4" } }],
  success: [{ tag: "path", props: { d: "M22 11.08V12a10 10 0 1 1-5.93-9.14" } }, { tag: "path", props: { d: "m22 4-10 10.01-3-3" } }],
  warning: [{ tag: "path", props: { d: "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" } }, { tag: "path", props: { d: "M12 9v4" } }, { tag: "path", props: { d: "M12 17h.01" } }],
  danger: [{ tag: "path", props: { d: "M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86Z" } }, { tag: "path", props: { d: "M12 8v4" } }, { tag: "path", props: { d: "M12 16h.01" } }],
};

const DEFAULT_LABEL: Record<string, string> = {
  note: "提示",
  info: "資訊",
  tip: "小技巧",
  success: "完成",
  warning: "警告",
  danger: "注意",
};

// Badge / Step 共用：variant 列舉與 Admonitions 對齊（PRD §1.8.0 Decided），多 "neutral"。
const BADGE_VARIANTS = new Set([
  "note",
  "info",
  "tip",
  "success",
  "warning",
  "danger",
  "neutral",
]);
const BADGE_SIZES = new Set(["sm", "md"]);
const STEP_STATUSES = new Set(["done", "current", "todo"]);
const STEPS_LAYOUTS = new Set(["vertical", "horizontal"]);

/** Badge / Step 可用的 icon 名稱集合 — lucide 風格、以 path 描述。 */
const BADGE_ICONS: Record<string, SvgChild[]> = {
  sparkle: [
    { tag: "path", props: { d: "M12 3v4M12 17v4M3 12h4M17 12h4" } },
    { tag: "path", props: { d: "M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" } },
  ],
  check: [{ tag: "path", props: { d: "M20 6 9 17l-5-5" } }],
  star: [
    {
      tag: "path",
      props: {
        d: "M12 2 14.6 8.6 22 9.3l-5.7 4.9 1.8 7.3L12 17.8 5.9 21.5l1.8-7.3L2 9.3l7.4-.7Z",
      },
    },
  ],
  bolt: [{ tag: "path", props: { d: "M13 2 4 14h7l-1 8 9-12h-7l1-8Z" } }],
  flag: [
    { tag: "path", props: { d: "M4 22V4" } },
    { tag: "path", props: { d: "M4 4h13l-2 4 2 4H4" } },
  ],
  // 語意 icon — 與 admonition 同一組路徑、字級隨 badge 縮放
  info: ICONS.info,
  warning: ICONS.warning,
  danger: ICONS.danger,
  note: ICONS.note,
  success: ICONS.success,
};

function el(hName: string, hProperties: Record<string, unknown>, children: MdNode[] = []): MdNode {
  return { type: "ncElement", data: { hName, hProperties }, children };
}
function text(value: string): MdNode {
  return { type: "text", value };
}

function iconSvg(type: string): MdNode {
  const paths = (ICONS[type] || ICONS.note).map((c) =>
    el(c.tag, { ...c.props }),
  );
  return el(
    "svg",
    {
      className: ["nc-adm__icon"],
      viewBox: "0 0 24 24",
      width: 18,
      height: 18,
      fill: "none",
      stroke: "currentColor",
      "stroke-width": 2,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "aria-hidden": "true",
    },
    paths,
  );
}

/** 取得 directive 的可見標籤（`:::name[label]` 的 label 段），若有則回傳文字並從 children 移除該節點。 */
function takeDirectiveLabel(node: MdNode): string | null {
  const children = node.children || [];
  const idx = children.findIndex((c) => c.data?.directiveLabel);
  if (idx === -1) return null;
  const [label] = children.splice(idx, 1);
  return (label.children || []).map((c) => c.value || "").join("").trim() || null;
}

function buildAdmonition(node: MdNode): void {
  const type = ADMONITION_TYPES.has(node.name || "") ? (node.name as string) : "note";
  const attrs = node.attributes || {};
  const collapsible = attrs.collapsible !== undefined && attrs.collapsible !== null;
  const open = attrs.open !== undefined && attrs.open !== null;
  const labelFromAttr = (attrs.title || "").trim();
  const labelFromInline = takeDirectiveLabel(node);
  const label = labelFromAttr || labelFromInline || DEFAULT_LABEL[type] || DEFAULT_LABEL.note;

  const titleChildren: MdNode[] = [
    iconSvg(type),
    el("span", { className: ["nc-adm__label"] }, [text(label)]),
  ];
  const title = el(
    collapsible ? "summary" : "div",
    { className: ["nc-adm__title"] },
    titleChildren,
  );
  const body = el("div", { className: ["nc-adm__body"] }, node.children || []);

  node.data = node.data || {};
  node.data.hName = collapsible ? "details" : "aside";
  node.data.hProperties = {
    className: ["nc-adm", `nc-adm--${type}`],
    ...(collapsible && open ? { open: true } : {}),
  };
  node.children = [title, body];
}

function buildTabs(node: MdNode, uid: number, file: VFileLike): void {
  const tabNodes = (node.children || []).filter(
    (c) => c.type === "containerDirective" && c.name === "tab",
  );

  const tablistChildren: MdNode[] = [];
  const panels: MdNode[] = [];

  tabNodes.forEach((tab, i) => {
    const attrs = tab.attributes || {};
    let label = (attrs.label || "").trim() || takeDirectiveLabel(tab) || "";
    if (!label) {
      label = `分頁 ${i + 1}`;
      console.warn(
        `[notecraft-directives] :::tab 缺少 label，已以「${label}」命名${file.path ? `（${file.path}）` : ""}`,
      );
    }
    const tabId = `nc-tab-${uid}-${i}`;
    const panelId = `nc-panel-${uid}-${i}`;

    tablistChildren.push(
      el(
        "button",
        {
          type: "button",
          className: ["nc-tabs__tab"],
          role: "tab",
          id: tabId,
          "aria-controls": panelId,
          "aria-selected": i === 0 ? "true" : "false",
          tabindex: i === 0 ? "0" : "-1",
        },
        [text(label)],
      ),
    );
    panels.push(
      el(
        "div",
        {
          className: ["nc-tabs__panel"],
          role: "tabpanel",
          id: panelId,
          "aria-labelledby": tabId,
          "data-nc-tab-label": label,
        },
        tab.children || [],
      ),
    );
  });

  const tablist = el(
    "div",
    { className: ["nc-tabs__list"], role: "tablist" },
    tablistChildren,
  );

  node.data = node.data || {};
  node.data.hName = "div";
  node.data.hProperties = { className: ["nc-tabs"], "data-nc-tabs": "true" };
  node.children = [tablist, ...panels];
}

/**
 * Code annotations（PRD §7.1 / task-20）：`:::annotate` 容器顯式配對「程式碼區塊 + 緊接的編號清單」。
 *
 * 程式碼中的 `(n)!` sentinel 由 EC 外掛（ec-plugin-annotations）轉為標記節點；本處只負責：
 *  - 把容器標成 `.nc-annotate`（帶 uid）
 *  - 把其中的有序清單標成 `.nc-anno-list`，每個項目給 `id` / `data-anno`，供標記以 aria-controls 對應
 * 互動（點擊標記展開對應說明、Esc 關閉）由筆記頁 vanilla JS 完成；JS 未載入時清單照常依序顯示（漸進增強）。
 */
function buildAnnotate(node: MdNode, uid: number, file: VFileLike): void {
  const children = node.children || [];
  const code = children.find((c) => c.type === "code");
  const list = children.find((c) => c.type === "list");

  node.data = node.data || {};
  node.data.hName = "div";

  if (!code || !list) {
    // 缺程式碼或缺清單 → 退化為一般容器（不破壞內容），並於 build log 警示。
    console.warn(
      `[notecraft-directives] :::annotate 需同時含一個程式碼區塊與一個編號清單，已退化為一般區塊${file.path ? `（${file.path}）` : ""}`,
    );
    node.data.hProperties = { className: ["nc-annotate", "nc-annotate--degraded"] };
    return;
  }

  node.data.hProperties = {
    className: ["nc-annotate"],
    "data-nc-annotate": String(uid),
  };

  // 標記數（程式碼中的 `(n)!` sentinel）與清單項數不一致時警示（不中斷 build）。
  const markerCount = ((code.value || "").match(/\(\d+\)!/g) || []).length;
  const itemCount = (list.children || []).length;
  if (markerCount !== itemCount) {
    console.warn(
      `[notecraft-directives] :::annotate 標記數（${markerCount}）與說明清單項數（${itemCount}）不一致${file.path ? `（${file.path}）` : ""}`,
    );
  }

  // 標註清單與各項目；n 為 1-based，對應程式碼中的 `(n)!`。
  list.data = list.data || {};
  list.data.hName = "ol";
  list.data.hProperties = {
    ...(list.data.hProperties || {}),
    className: ["nc-anno-list"],
  };
  (list.children || []).forEach((item, i) => {
    const n = i + 1;
    item.data = item.data || {};
    item.data.hProperties = {
      ...(item.data.hProperties || {}),
      id: `nc-anno-${uid}-${n}`,
      className: ["nc-anno-item"],
      "data-anno": String(n),
    };
  });
}

/** Badge（PRD §1.8.0）：行內 directive `:badge[文字]{variant outline size icon href}`。 */
function buildBadge(node: MdNode, file: VFileLike): void {
  const attrs = node.attributes || {};
  let variant = (attrs.variant || "neutral").trim();
  if (!BADGE_VARIANTS.has(variant)) {
    console.warn(
      `[notecraft-directives] :badge 未知 variant=${variant}，回退 neutral${file.path ? `（${file.path}）` : ""}`,
    );
    variant = "neutral";
  }
  const outline = attrs.outline !== undefined && attrs.outline !== null;
  let size = (attrs.size || "md").trim();
  if (!BADGE_SIZES.has(size)) size = "md";
  const iconName = (attrs.icon || "").trim();
  const href = (attrs.href || "").trim();

  const children = node.children || [];
  const hasContent = children.some(
    (c) => (c.value || "").trim() !== "" || (c.children && c.children.length),
  );
  if (!hasContent) {
    console.warn(
      `[notecraft-directives] :badge 內容為空，已移除${file.path ? `（${file.path}）` : ""}`,
    );
    node.data = { hName: "span", hProperties: {} };
    node.children = [];
    return;
  }

  let iconNode: MdNode | null = null;
  if (iconName) {
    const paths = BADGE_ICONS[iconName];
    if (paths) {
      const px = size === "sm" ? 11 : 13;
      iconNode = el(
        "svg",
        {
          className: ["nc-badge__icon"],
          viewBox: "0 0 24 24",
          width: px,
          height: px,
          fill: "none",
          stroke: "currentColor",
          "stroke-width": 2,
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
          "aria-hidden": "true",
        },
        paths.map((p) => el(p.tag, { ...p.props })),
      );
    } else {
      console.warn(
        `[notecraft-directives] :badge 未知 icon=${iconName}，不顯示 icon${file.path ? `（${file.path}）` : ""}`,
      );
    }
  }

  const className = [
    "nc-badge",
    `nc-badge--${variant}`,
    outline ? "nc-badge--outline" : "nc-badge--solid",
    `nc-badge--${size}`,
  ];

  node.data = node.data || {};
  const hProperties: Record<string, unknown> = { className };
  if (href) {
    node.data.hName = "a";
    hProperties.href = href;
    // 外部連結（含 scheme）→ 自動帶 target / rel；站內相對路徑不加。
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(href)) {
      hProperties.target = "_blank";
      hProperties.rel = "noopener";
    }
  } else {
    node.data.hName = "span";
  }
  node.data.hProperties = hProperties;
  node.children = iconNode ? [iconNode, ...children] : children;
}

/** Steps（PRD §1.8.0）：`::::steps{layout start}` 內含 `:::step{title status}`。 */
function buildSteps(node: MdNode, file: VFileLike): void {
  const attrs = node.attributes || {};
  let layout = (attrs.layout || "vertical").trim();
  if (!STEPS_LAYOUTS.has(layout)) {
    console.warn(
      `[notecraft-directives] :::steps 未知 layout=${layout}，回退 vertical${file.path ? `（${file.path}）` : ""}`,
    );
    layout = "vertical";
  }
  const startNum = parseInt((attrs.start || "1").trim(), 10);
  const start = Number.isFinite(startNum) && startNum > 0 ? startNum : 1;

  const allChildren = node.children || [];
  const stepNodes = allChildren.filter(
    (c) => c.type === "containerDirective" && c.name === "step",
  );
  const strayNodes = allChildren.filter(
    (c) => !(c.type === "containerDirective" && c.name === "step"),
  );
  if (strayNodes.length) {
    console.warn(
      `[notecraft-directives] :::steps 含 ${strayNodes.length} 個非 :::step 子節點，已置於容器底部${file.path ? `（${file.path}）` : ""}`,
    );
  }

  const items: MdNode[] = stepNodes.map((step, i) => {
    const stepAttrs = step.attributes || {};
    let status = (stepAttrs.status || "todo").trim();
    if (!STEP_STATUSES.has(status)) {
      console.warn(
        `[notecraft-directives] :::step 未知 status=${status}，回退 todo${file.path ? `（${file.path}）` : ""}`,
      );
      status = "todo";
    }
    const titleAttr = (stepAttrs.title || "").trim();
    const titleInline = takeDirectiveLabel(step);
    const title = titleAttr || titleInline || "";
    const n = start + i;
    const num = String(n).padStart(2, "0");

    const badge =
      status === "done"
        ? el(
            "span",
            { className: ["nc-step__badge"], "aria-hidden": "true" },
            [
              el(
                "svg",
                {
                  className: ["nc-step__check"],
                  viewBox: "0 0 24 24",
                  width: 14,
                  height: 14,
                  fill: "none",
                  stroke: "currentColor",
                  "stroke-width": 3,
                  "stroke-linecap": "round",
                  "stroke-linejoin": "round",
                  "aria-hidden": "true",
                },
                [el("path", { d: "M5 12.5 10 17.5 19 7" })],
              ),
            ],
          )
        : el(
            "span",
            { className: ["nc-step__badge"], "aria-hidden": "true" },
            [text(num)],
          );

    const bodyChildren: MdNode[] = [];
    if (title) {
      bodyChildren.push(
        el("p", { className: ["nc-step__title"] }, [text(title)]),
      );
    }
    bodyChildren.push(...(step.children || []));
    const body = el("div", { className: ["nc-step__body"] }, bodyChildren);

    return {
      type: "ncElement",
      data: {
        hName: "li",
        hProperties: {
          className: ["nc-step", `nc-step--${status}`],
          "data-step": String(n),
        },
      },
      children: [badge, body],
    };
  });

  const strayWrap = strayNodes.length
    ? [
        el(
          "div",
          { className: ["nc-steps__stray"], "data-nc-stray": "true" },
          strayNodes,
        ),
      ]
    : [];

  node.data = node.data || {};
  node.data.hName = "ol";
  node.data.hProperties = {
    className: ["nc-steps", `nc-steps--${layout}`],
    start,
  };
  node.children = [...items, ...strayWrap];
}

function buildTooltip(node: MdNode, uid: number, file: VFileLike): void {
  const attrs = node.attributes || {};
  const content = (attrs.content || "").trim();
  node.data = node.data || {};
  if (!content) {
    // 缺 content → 原樣輸出文字（以 span 包住可見內容），並於 build log 警示。
    console.warn(
      `[notecraft-directives] :tip 缺少 content，已退化為純文字${file.path ? `（${file.path}）` : ""}`,
    );
    node.data.hName = "span";
    node.data.hProperties = {};
    return;
  }
  const bubbleId = `nc-tip-${uid}`;
  const visible = node.children || [];
  const bubble = el(
    "span",
    { className: ["nc-tip__bubble"], role: "tooltip", id: bubbleId },
    [text(content)],
  );
  node.data.hName = "span";
  node.data.hProperties = {
    className: ["nc-tip"],
    tabindex: "0",
    "aria-describedby": bubbleId,
  };
  node.children = [...visible, bubble];
}

const DIRECTIVE_TYPES = new Set([
  "containerDirective",
  "leafDirective",
  "textDirective",
]);

/**
 * 安全網：把「未被本 transform 處理」的 directive 節點還原成字面文字。
 *
 * remark-directive 一旦啟用，任何 `:`／`::`／`:::` 後面接字元（含中文，如 `風險:需求`）
 * 都會被解析成 directive 節點；若沒人處理，remark-rehype 會直接丟棄該節點、造成內文「掉字」。
 * 這裡將未知 directive 還原為其原始字面（marker + name + 既有子節點），確保任何筆記都不會掉字。
 */
function revertDirective(node: MdNode): void {
  const marker =
    node.type === "containerDirective"
      ? ":::"
      : node.type === "leafDirective"
        ? "::"
        : ":";
  const orig = node.children || [];
  node.data = { hName: node.type === "containerDirective" ? "div" : "span" };
  if (node.type === "containerDirective") {
    // 容器（區塊）：在前面補上 marker+name，保留原本的區塊子節點。
    node.children = [text(marker + (node.name || "")), ...orig];
  } else if (orig.length) {
    // 行內且帶 [label]：還原成 :name[label]
    node.children = [text(`${marker}${node.name || ""}[`), ...orig, text("]")];
  } else {
    node.children = [text(marker + (node.name || ""))];
  }
}

export default function remarkNotecraftDirectives() {
  return (tree: MdNode, file: VFileLike) => {
    let counter = 0;

    const walk = (parent: MdNode): void => {
      const children = parent.children;
      if (!children) return;
      for (const child of children) {
        if (child.type === "containerDirective" && child.name === "tabs") {
          // 先遞迴處理各 tab 內容（允許巢狀 admonition / tooltip），再組裝 tabs 結構。
          for (const tab of child.children || []) walk(tab);
          buildTabs(child, counter++, file);
          continue;
        }
        if (child.type === "containerDirective" && ADMONITION_TYPES.has(child.name || "")) {
          walk(child); // 先處理內層巢狀指令
          buildAdmonition(child);
          continue;
        }
        if (child.type === "containerDirective" && child.name === "annotate") {
          walk(child); // 處理清單項目內可能的巢狀指令（程式碼節點不受影響）
          buildAnnotate(child, counter++, file);
          continue;
        }
        if (child.type === "containerDirective" && child.name === "steps") {
          // 先處理每個 :::step 子節點內可能的巢狀指令（admonition / badge / tabs 等）
          for (const step of child.children || []) {
            if (step.type === "containerDirective" && step.name === "step") {
              walk(step);
            }
          }
          buildSteps(child, file);
          continue;
        }
        if (child.type === "textDirective" && child.name === "tip") {
          buildTooltip(child, counter++, file);
          continue;
        }
        if (child.type === "textDirective" && child.name === "badge") {
          walk(child); // 容許 badge 文字中含其他行內 directive（如 :tip）
          buildBadge(child, file);
          continue;
        }
        if (DIRECTIVE_TYPES.has(child.type)) {
          // 未處理的 directive（誤判的 `:中文`、未知類型、孤立的 :::tab 等）→ 還原為字面文字，避免掉字。
          revertDirective(child);
          walk(child);
          continue;
        }
        walk(child);
      }
    };

    walk(tree);
  };
}
