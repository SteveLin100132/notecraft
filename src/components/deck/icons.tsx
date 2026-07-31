// IconName → lucide-react 查表（Task 33）。
//
// deck 資料只給字串（IconName），系統在此對映實際元件 —— 維持「5 個固定版型的頁是
// 純資料」的契約。`custom` 頁自己畫時可直接 import lucide-react，不經過本表（契約 §5.4）。
//
// 本表由 SlideChrome 與 blocks/ 共用，不要做第二份。

import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle, Check, X, Info, Lightbulb, Target,
  Clock, User, Users, Database, Lock, Gauge,
  Layers, File, Folder, Link, Cloud, Plug,
  GitBranch, Settings, TrendingUp,
} from "lucide-react";
import type { IconName, StatusTone } from "@/lib/decks";

const MAP: Record<IconName, LucideIcon> = {
  alert: AlertTriangle,
  check: Check,
  x: X,
  info: Info,
  lightbulb: Lightbulb,
  target: Target,
  clock: Clock,
  user: User,
  users: Users,
  database: Database,
  lock: Lock,
  gauge: Gauge,
  layers: Layers,
  file: File,
  folder: Folder,
  link: Link,
  cloud: Cloud,
  plug: Plug,
  "git-branch": GitBranch,
  settings: Settings,
  "trend-up": TrendingUp,
};

export function DeckIcon({ name, size, color }: { name: IconName; size?: number; color?: string }) {
  const C = MAP[name];
  // 型別上不會發生（IconName 是聯集、tsc 會擋），但資料若從型別外的路徑進來，
  // 寧可少畫一個 icon 也不要讓整頁 crash（React 對 undefined 元件型別會直接拋錯）。
  if (!C) {
    if (import.meta.env.DEV) console.warn(`[deck/icons] 未知的 IconName：${String(name)}`);
    return null;
  }
  return <C size={size ?? 20} color={color ?? "currentColor"} />;
}

/**
 * StatusTone 的預設 icon。
 *
 * 狀態色**不可**單獨用色彩承載語意 —— 渲染端一律 icon + 文字標籤並行（audit A-6）。
 * 呼叫端沒給 icon 時就用這張表補上，讓「忘記給 icon」不會導致色彩單獨承載語意。
 */
export const STATUS_ICON: Record<StatusTone, IconName> = {
  good: "check",
  warning: "alert",
  critical: "x",
};
