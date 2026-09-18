// Plugin 渲染器的派發島。
//
// 為什麼需要這一層：Astro 的 hydration 指令（client:load 等）要在編譯期就知道
// 元件來自哪個模組。若 .astro 頁面從一個 Map 裡取出元件再掛 client:load，
// build 會直接失敗（NoMatchingImport）—— 元件是執行期才決定的，Astro 無從產生對應的
// client 進入點。既有的簡報頁是同一個形狀：<PresentApp slug={...} client:only>
// 只傳一個字串，由島自己查表。
//
// 因此渲染器的 glob 放在這個島裡（會被打包進 client chunk），而
// src/lib/plugins.ts 只負責 build 期的解析與驗證（它用了 node:fs，不能進 client）。

import { Component, type ComponentType, type ErrorInfo, type ReactNode } from "react";
import PluginErrorCard from "./PluginErrorCard";

interface HostProps {
  pluginId: string;
  data: unknown;
  file: { path: string; name: string; updatedAt: string };
  options: Record<string, unknown>;
  mode: "page" | "embed";
  /** 渲染器原始碼的絕對路徑，只在 dev 模式用於「以 VS Code 開啟」 */
  rendererPath?: string;
  isDev?: boolean;
}

// renderer 的 props 對每個 plugin 而言型別不同，這一層只負責轉交、不解讀內容。
type AnyRenderer = ComponentType<Omit<HostProps, "pluginId">>;

// eager：plugin 數量是個位數，換來的是不必處理 Suspense 與載入閃動。
// 若日後一個專案裝到十幾個 plugin，這裡改成惰性載入。
const modules: Record<string, { default?: AnyRenderer }> = {
  ...import.meta.glob<{ default?: AnyRenderer }>("/plugins/*/renderer.tsx", { eager: true }),
  ...import.meta.glob<{ default?: AnyRenderer }>("@notes/plugins/*/renderer.tsx", { eager: true }),
};

const byId = new Map<string, AnyRenderer>();
for (const [key, mod] of Object.entries(modules)) {
  const m = key.match(/(?:^|\/)plugins\/([^/]+)\/renderer\.tsx$/);
  if (m && mod?.default) byId.set(m[1], mod.default);
}

/* error boundary 必須是 class component —— React 沒有對應的 hook。
   它只包住渲染器本身，因此一個 plugin 炸掉不會波及頁面其他區塊。 */
interface BoundaryProps {
  children: ReactNode;
  fallback: (message: string, retry: () => void) => ReactNode;
}
interface BoundaryState {
  message: string | null;
  /** 改變 key 可強制重建子樹，供「重新載入此區塊」用 */
  attempt: number;
}

class RendererBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { message: null, attempt: 0 };

  static getDerivedStateFromError(error: unknown): Partial<BoundaryState> {
    return { message: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    // 留給開發者的完整堆疊；畫面上的卡片只給讀者看得懂的那部分。
    console.error("[plugin] 渲染器拋出例外", error, info.componentStack);
  }

  retry = (): void => {
    this.setState((s) => ({ message: null, attempt: s.attempt + 1 }));
  };

  render(): ReactNode {
    if (this.state.message !== null) return this.props.fallback(this.state.message, this.retry);
    return <div key={this.state.attempt}>{this.props.children}</div>;
  }
}

export default function PluginHost({
  pluginId,
  data,
  file,
  options,
  mode,
  rendererPath,
  isDev = false,
}: HostProps) {
  const Renderer = byId.get(pluginId);
  if (!Renderer) {
    // build 期已經擋過「plugin 未安裝」（plugins.ts），走到這裡代表 client 與 server
    // 的解析結果不一致 —— 少數情況才會發生，但不該整頁白掉。
    return (
      <PluginErrorCard
        pluginId={pluginId}
        filePath={file.path}
        message="找不到這個 plugin 的渲染器（client 與 build 的解析結果不一致）"
        isDev={isDev}
      />
    );
  }
  return (
    <RendererBoundary
      fallback={(message, retry) => (
        <PluginErrorCard
          pluginId={pluginId}
          filePath={file.path}
          message={message}
          rendererPath={rendererPath}
          onRetry={retry}
          isDev={isDev}
        />
      )}
    >
      <Renderer data={data} file={file} options={options} mode={mode} />
    </RendererBoundary>
  );
}
