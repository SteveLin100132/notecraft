import CopyCommand from "../../components/CopyCommand";

export type CommandBarProps = {
  /** 要複製的指令（不含 `$`）。 */
  command?: string;
};

/**
 * 主行動：`$` 提示符＋等寬指令，右側實心複製鈕（hover 轉橙）。複製成功顯示「已複製」兩秒，失敗顯示「請手動選取」。
 * 只放在 sheet 上；480px 以下滿寬、複製鈕只剩圖示。
 */
export function CommandBar({ command = "npx notecraftapp view ./docs" }: CommandBarProps) {
  return <CopyCommand command={command} tone="sheet" />;
}
