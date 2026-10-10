export interface ScanLink {
  /** 原始 URL（未解析、未解碼）；via 為 "pluginview" 時是相對 notesDir 的資料檔路徑 */
  url: string;
  line: number;
  via: "link" | "pluginview";
}

export function scanLinks(source: string): ScanLink[];
