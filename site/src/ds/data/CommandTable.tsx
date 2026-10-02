export type CommandRow = {
  /** 指令（等寬）。 */
  command: string;
  /** 說明。 */
  description: string;
};

export type CommandTableProps = {
  /** 表名，寫法同節名（15px／700、字距 0.08em）。 */
  caption?: string;
  columns?: [string, string];
  rows?: CommandRow[];
};

const DEFAULT_ROWS: CommandRow[] = [
  { command: "npx notecraftapp view ./docs", description: "開 dev server，編輯即時反映" },
  { command: "npx notecraftapp serve ./docs", description: "服務 build 好的靜態站，背景 rebuild" },
  { command: "npx notecraftapp build ./docs", description: "輸出純靜態網站" },
  { command: "npx notecraftapp init-skill", description: "把 skill 與 subagent 裝進 .claude/" },
];

/** 靜態參考表（如指令一覽）：表頭 2px 墨線、列間 1px rule、內容 ink-2。只放在 paper 上。 */
export function CommandTable({ caption = "指令一覽", columns = ["指令", "用途"], rows = DEFAULT_ROWS }: CommandTableProps) {
  return (
    <table className="cli">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">{columns[0]}</th>
          <th scope="col">{columns[1]}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.command}>
            <th scope="row">
              <code>{r.command}</code>
            </th>
            <td>{r.description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
