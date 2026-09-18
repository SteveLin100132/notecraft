// Plugin System 的共用契約（Task 46）。
//
// 三方要對同一份約定，而三方在不同的檔案裡：
//
// 1. 筆記作者寫 <專案根>/.notecraft/plugins.json          → PluginsConfig
// 2. plugin 作者寫 <plugin>/notecraft-plugin.json 與渲染器 → PluginManifest / PluginRendererProps
// 3. app 讀上述兩者並把資料交給渲染器                       → ResolvedDataFile
//
// 對應的 JSON Schema 在 plugins/{plugins,notecraft-plugin}.schema.json，
// 供作者在編輯器裡以 $schema 取得補全；本檔是 TypeScript 這一側的同一份契約。
//
// 完整設計見 docs/notecraft-plugin-system.md §5、§6。

/** 專案級映射表的一條規則。 */
export interface PluginMapping {
  /** plugin id，對應 .notecraft/plugins/<id>/。未安裝 → build fail。 */
  plugin: string;
  /**
   * glob 陣列（picomatch 語意），基準為 notesDir —— 資料檔必須放在筆記資料夾內。
   * 不允許比對 .md / .mdx：那是 notes collection 的地盤，重疊會產生兩條路由指向同一內容。
   */
  files: string[];
  exclude?: string[];
  /** 原封不動傳給 renderer；每個 plugin 自行定義可用的鍵。 */
  options?: Record<string, unknown>;
}

/** <專案根>/.notecraft/plugins.json 的形狀。 */
export interface PluginsConfig {
  $schema?: string;
  /** 由上而下比對，第一條命中的勝（Q8）。 */
  plugins: PluginMapping[];
}

/**
 * plugin 套件的身分證。
 *
 * 刻意沒有的兩個欄位（Q2a 定案，不要「順手補回去」）：
 * - `entry` —— 入口固定約定為 renderer.tsx，讓 plugin 自由命名沒有換到任何價值
 * - `accepts` / 副檔名宣告 —— 吃哪些檔完全由 plugins.json 的 files 決定
 */
export interface PluginManifest {
  $schema?: string;
  /** 必須與所在資料夾名一致，否則安裝時拒裝。 */
  id: string;
  title: string;
  description: string;
  version: string;
  author?: string;
  homepage?: string;
  /** 相對 manifest 的路徑，指向驗證資料檔用的 JSON Schema。 */
  dataSchema?: string;
  /** 相對 manifest 的路徑，指向可直接 build 的範例資料；CI 拿它驗證這個 plugin 跑得起來。 */
  example?: string;
  engines?: { notecraftapp?: string };
}

/** 傳給 renderer 的資料檔中繼資訊。 */
export interface PluginFileInfo {
  /** 相對 notesDir 的路徑，含副檔名，例：planning/schema.json */
  path: string;
  /** 檔名，例：schema.json */
  name: string;
  /** 檔案 mtime（ISO 日期字串）。資料檔沒有 frontmatter，時間只能取自檔案系統。 */
  updatedAt: string;
}

/**
 * renderer 的 props。
 *
 * `data` 不是 Promise —— 資料在 build 期就 parse 與驗證完畢、inline 成 island props（Q10），
 * renderer 不需要處理 loading 或失敗狀態（那些一律 build fail）。
 */
export interface PluginRendererProps<T = unknown> {
  data: T;
  file: PluginFileInfo;
  options: Record<string, unknown>;
  /**
   * page：獨立頁 /view/<path>，已是全寬、不套外框卡片，renderer 不該再提供「展開全寬」。
   * embed：嵌在筆記內文的 760px 版心裡，由 GeneratedFrame 包住、需要放大檢視。
   */
  mode: "page" | "embed";
}

/** Task 47 的解析輸出：一個命中的資料檔加上它的歸屬與內容。 */
export interface ResolvedDataFile {
  pluginId: string;
  /** 絕對路徑。 */
  absPath: string;
  /** 相對 notesDir 的路徑，含副檔名。 */
  relPath: string;
  /**
   * 去副檔名的路徑，同時是 /view/<routePath> 的路由段，
   * 也是系列識別碼 `view:<routePath>` 前綴後的那一段。
   */
  routePath: string;
  /** 取自資料檔的 meta.title，缺值時退回檔名。 */
  title: string;
  /** 取自資料檔的 meta.description，缺值時為空字串。 */
  description: string;
  data: unknown;
  options: Record<string, unknown>;
  updatedAt: string;
}

/**
 * 安裝 plugin 時寫到 <專案根>/.notecraft/plugins/_types.d.ts 的內容（Task 54 使用）。
 *
 * plugin 不該相依 app 的原始碼 —— 使用者專案裡沒有 NoteCraft 的 src/，
 * 但 renderer 仍需要 PluginRendererProps 才能寫出有型別的元件。
 * 因此安裝時把這份宣告落地，plugin 以下列方式取用：
 *
 *   import type { PluginRendererProps } from "@notes/plugins/_types";
 *
 * 內容是上面幾個型別的複製而非 re-export，刻意為之：使用者專案解析不到 @/lib/*。
 * 兩邊要同步時以本檔為準。
 */
export const PLUGIN_TYPES_DTS = `// 由 \`notecraftapp install-plugin\` 自動產生，請勿手動編輯。
// 來源：NoteCraft src/lib/plugin-types.ts

export interface PluginFileInfo {
  /** 相對筆記資料夾的路徑，含副檔名 */
  path: string;
  name: string;
  /** 檔案 mtime（ISO 日期字串） */
  updatedAt: string;
}

export interface PluginRendererProps<T = unknown> {
  /** 已 parse 且通過 schema 驗證的資料檔內容 */
  data: T;
  file: PluginFileInfo;
  /** 來自 plugins.json 的 options，renderer 自行合併預設值 */
  options: Record<string, unknown>;
  /** page：獨立全寬頁；embed：嵌在筆記內文、由外框卡片包住 */
  mode: "page" | "embed";
}
`;
