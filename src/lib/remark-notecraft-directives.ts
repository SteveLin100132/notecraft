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
        if (child.type === "textDirective" && child.name === "tip") {
          buildTooltip(child, counter++, file);
          continue;
        }
        walk(child);
      }
    };

    walk(tree);
  };
}
