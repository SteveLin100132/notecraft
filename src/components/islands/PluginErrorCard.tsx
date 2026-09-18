// 渲染器在瀏覽器裡出錯時顯示的卡片（Task 48）。
//
// 它要回答讀者心裡的第一個問題：「是我的筆記壞了嗎？」 —— 不是。
// 壞的是畫這張圖的程式，筆記與資料檔都還在。訊息因此把這句話直接寫出來，
// 而不是丟一個 stack trace 讓人自己猜。
//
// build 期的錯誤（plugin 未安裝、JSON 壞、schema 不符）不走這裡 —— 那些一律 build fail。
// 會走到這裡的是「資料通過驗證、但渲染器自己 throw」。

import { AlertTriangle, ExternalLink, RotateCw } from "lucide-react";

export interface PluginErrorCardProps {
  pluginId: string;
  filePath: string;
  message: string;
  /** 渲染器原始碼的絕對路徑，供 dev 模式的「以 VS Code 開啟」 */
  rendererPath?: string;
  onRetry?: () => void;
  isDev?: boolean;
}

const rowStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  fontSize: 12.5,
  lineHeight: 1.7,
  alignItems: "baseline",
};

const labelStyle: React.CSSProperties = {
  flex: "0 0 74px",
  color: "var(--text-muted)",
};

const valueStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  color: "var(--text-body)",
  wordBreak: "break-all",
  minWidth: 0,
};

const btnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "5px 11px",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--border-default)",
  background: "var(--surface-card)",
  color: "var(--text-muted)",
  fontSize: 12.5,
  fontWeight: 700,
  cursor: "pointer",
  textDecoration: "none",
};

export default function PluginErrorCard({
  pluginId,
  filePath,
  message,
  rendererPath,
  onRetry,
  isDev = false,
}: PluginErrorCardProps) {
  return (
    <div
      role="alert"
      style={{
        border: "1px solid var(--danger-300)",
        borderRadius: "var(--radius-lg)",
        background: "var(--surface-card)",
        padding: "18px 20px",
        margin: "18px 0",
        maxWidth: 720,
      }}
    >
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <span
          style={{
            flex: "0 0 auto",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 38,
            height: 38,
            borderRadius: "var(--radius-md)",
            background: "var(--danger-50)",
            color: "var(--danger-500)",
          }}
        >
          <AlertTriangle size={20} aria-hidden />
        </span>
        <div style={{ minWidth: 0 }}>
          <h3
            style={{
              margin: "0 0 6px",
              fontSize: 16,
              fontWeight: 700,
              color: "var(--text-strong)",
              lineHeight: 1.4,
            }}
          >
            這份資料沒有畫出來
          </h3>
          <p style={{ margin: 0, fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.75 }}>
            你的筆記與這份資料檔都沒有壞 —— 出問題的是負責把資料畫成圖的渲染程式。
            頁面其餘部分不受影響。
          </p>
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          padding: "12px 14px",
          borderRadius: "var(--radius-md)",
          background: "var(--surface-sunken)",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <div style={rowStyle}>
          <span style={labelStyle}>plugin</span>
          <span style={valueStyle}>{pluginId}</span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>資料檔</span>
          <span style={valueStyle}>{filePath}</span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>錯誤訊息</span>
          <span style={{ ...valueStyle, color: "var(--danger-500)" }}>{message}</span>
        </div>
      </div>

      {isDev && (
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {rendererPath && (
            <a style={btnStyle} href={`vscode://file/${rendererPath.replace(/^\/+/, "")}`}>
              <ExternalLink size={13} aria-hidden /> 以 VS Code 開啟渲染器
            </a>
          )}
          {onRetry && (
            <button type="button" style={btnStyle} onClick={onRetry}>
              <RotateCw size={13} aria-hidden /> 重新載入此區塊
            </button>
          )}
        </div>
      )}
    </div>
  );
}
