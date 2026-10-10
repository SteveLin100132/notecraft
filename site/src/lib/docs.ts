// 使用文件的章節結構：章、節的順序與標題只寫在這裡，書脊、首頁目錄、上一節／下一節都由它推出。
// 節號依位置計算，不寫死。內容在 src/content/docs/<slug>.mdx；沒有檔案的節在書脊上顯示「撰寫中」、不可點。

export type DocItem = {
  title: string;
  /** 葉節點才有：對應 src/content/docs/<slug>.mdx 與網址 /docs/<slug>/。 */
  slug?: string;
  /** 分組節點（例如「安裝」「AI 視覺化」）只當標題，本身不是頁面。 */
  children?: DocItem[];
};

export type DocChapter = {
  title: string;
  /** 首頁目錄上，章名下的一句話。 */
  lead: string;
  items: DocItem[];
};

export const CHAPTERS: DocChapter[] = [
  {
    title: "介紹",
    lead: "NoteCraftApp 是什麼、適不適合你，以及後面章節會用到的幾個名詞。",
    items: [
      { title: "NoteCraftApp 是什麼", slug: "intro/what-is" },
      { title: "三層體驗", slug: "intro/three-layers" },
      { title: "核心概念", slug: "intro/concepts" },
      { title: "系統架構", slug: "intro/architecture" },
      { title: "與其他工具的差異", slug: "intro/comparison" },
    ],
  },
  {
    title: "快速開始",
    lead: "從零到在瀏覽器看見自己的筆記，再把 AI 生成與 Plugin 接上。",
    items: [
      {
        title: "安裝",
        children: [
          { title: "系統需求", slug: "getting-started/requirements" },
          { title: "npx 與全域安裝", slug: "getting-started/install" },
          { title: "第一次啟動", slug: "getting-started/first-run" },
        ],
      },
      { title: "五分鐘教學", slug: "getting-started/tutorial" },
      { title: "專案結構", slug: "getting-started/project-structure" },
      {
        title: "設定",
        children: [
          { title: "Frontmatter", slug: "getting-started/frontmatter" },
          { title: "系列設定", slug: "getting-started/series" },
          { title: "排除檔案", slug: "getting-started/ignore" },
          { title: "安裝內建 Skill", slug: "getting-started/skills" },
          { title: "安裝與設定內建 Plugin", slug: "getting-started/plugins" },
        ],
      },
    ],
  },
  {
    title: "撰寫筆記",
    lead: "在筆記裡能寫什麼、會被怎麼渲染。",
    items: [
      { title: "Markdown 與 MDX", slug: "writing/md-vs-mdx" },
      { title: "標題、目錄與錨點", slug: "writing/headings" },
      { title: "程式碼區塊", slug: "writing/code-blocks" },
      { title: "圖片與附件", slug: "writing/images" },
      { title: "巢狀資料夾與網址", slug: "writing/folders" },
      { title: "在筆記裡嵌元件", slug: "writing/embed" },
      { title: "定義與引用", slug: "writing/define-ref" },
      { title: "標籤", slug: "writing/tags" },
    ],
  },
  {
    title: "使用指南",
    lead: "依功能分節，每節回答「怎麼用」。",
    items: [
      {
        title: "工作台",
        children: [
          { title: "介面總覽", slug: "guides/workbench" },
          { title: "筆記列表", slug: "guides/notes-list" },
          { title: "筆記關聯圖（Graph）", slug: "guides/notes-graph" },
          { title: "儀表板與更新月曆", slug: "guides/dashboard" },
          { title: "筆記頁籤", slug: "guides/tabs" },
          { title: "指令面板與全文搜尋", slug: "guides/palette" },
        ],
      },
      { title: "系列與閱讀進度", slug: "guides/series" },
      {
        title: "AI 視覺化",
        children: [
          { title: "標記語法", slug: "guides/ai-markers" },
          { title: "生成流程", slug: "guides/ai-pipeline" },
          { title: "狀態與重新生成", slug: "guides/ai-status" },
          { title: "寫出好的 prompt", slug: "guides/ai-prompts" },
          { title: "放大檢視與匯出 PNG", slug: "guides/zoom" },
          { title: "孤兒元件", slug: "guides/ai-orphans" },
        ],
      },
      {
        title: "筆記轉簡報",
        children: [
          { title: "生成一份簡報", slug: "guides/deck" },
          { title: "版型與 29 個原子", slug: "guides/deck-atoms" },
          { title: "播放與快捷鍵", slug: "guides/deck-play" },
        ],
      },
      {
        title: "Plugin 與資料檔",
        children: [
          { title: "安裝來源", slug: "guides/plugin-install" },
          { title: "映射規則 plugins.json", slug: "guides/plugin-mapping" },
          { title: "啟用與停用", slug: "guides/plugin-toggle" },
          { title: "ER Diagram Renderer", slug: "guides/plugin-er" },
          { title: "OpenAPI Renderer", slug: "guides/plugin-openapi" },
        ],
      },
      { title: "在介面新增與編輯", slug: "guides/editing" },
      { title: "即時預覽", slug: "guides/live-preview" },
      { title: "部署", slug: "guides/deploy" },
    ],
  },
  {
    title: "進階",
    lead: "要擴充或深究運作方式時才需要讀。",
    items: [
      { title: "開發自己的 Plugin", slug: "advanced/plugin-dev" },
      { title: "自訂 Skill 與 Subagent", slug: "advanced/skills" },
      { title: "運作原理", slug: "advanced/internals" },
      { title: "安全模型", slug: "advanced/security" },
    ],
  },
  {
    title: "參考",
    lead: "查表用，不必從頭讀。",
    items: [
      { title: "CLI", slug: "reference/cli" },
      { title: "Frontmatter 欄位", slug: "reference/frontmatter" },
      { title: "@ai-visualize 標記欄位", slug: "reference/markers" },
      { title: "series.json", slug: "reference/series-json" },
      { title: "ignore.json", slug: "reference/ignore-json" },
      { title: "plugins.json 與 notecraft-plugin.json", slug: "reference/plugin-json" },
      { title: "鍵盤快捷鍵", slug: "reference/shortcuts" },
      { title: "網址參數", slug: "reference/url-params" },
    ],
  },
  {
    title: "其他",
    lead: "疑難排解、升級與參與開發。",
    items: [
      { title: "常見問題與疑難排解", slug: "resources/faq" },
      { title: "升級", slug: "resources/upgrade" },
      { title: "版本歷程", slug: "resources/changelog" },
      { title: "參與開發", slug: "resources/contributing" },
    ],
  },
];

/** 書脊與首頁用的節點：帶節號與是否已有內容。 */
export type NavNode = {
  no: string;
  title: string;
  slug?: string;
  ready: boolean;
  children?: NavNode[];
};

export type NavChapter = { no: string; title: string; lead: string; nodes: NavNode[] };

/** 依「哪些 slug 已有內容」標出可點的節。分組節點只要底下有一節可點就算 ready。 */
export function buildNav(available: Set<string>): NavChapter[] {
  const walk = (items: DocItem[], prefix: string): NavNode[] =>
    items.map((it, i) => {
      const no = `${prefix}.${i + 1}`;
      if (it.children) {
        const children = walk(it.children, no);
        return { no, title: it.title, ready: children.some((c) => c.ready), children };
      }
      return { no, title: it.title, slug: it.slug, ready: !!it.slug && available.has(it.slug) };
    });
  return CHAPTERS.map((ch, i) => ({ no: String(i + 1), title: ch.title, lead: ch.lead, nodes: walk(ch.items, String(i + 1)) }));
}

export type FlatPage = { no: string; title: string; slug: string; chapter: NavChapter };

/** 依閱讀順序攤平的可讀頁面，給上一節／下一節用。 */
export function flatPages(nav: NavChapter[]): FlatPage[] {
  const out: FlatPage[] = [];
  const walk = (nodes: NavNode[], chapter: NavChapter) => {
    for (const n of nodes) {
      if (n.children) walk(n.children, chapter);
      else if (n.ready && n.slug) out.push({ no: n.no, title: n.title, slug: n.slug, chapter });
    }
  };
  for (const ch of nav) walk(ch.nodes, ch);
  return out;
}

/** 大綱裡所有葉節點的 slug；內容檔若不在其中就是大綱漏了，build 直接失敗。 */
export function outlineSlugs(): Set<string> {
  const out = new Set<string>();
  const walk = (items: DocItem[]) => {
    for (const it of items) {
      if (it.children) walk(it.children);
      else if (it.slug) out.add(it.slug);
    }
  };
  for (const ch of CHAPTERS) walk(ch.items);
  return out;
}
