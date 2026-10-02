export type LegendItem = { n: number | string; name: string };

export type LegendProps = {
  title?: string;
  /** 本頁出現的每一個參照編號與其名稱，依編號排序。 */
  items?: LegendItem[];
};

const DEFAULT_ITEMS: LegendItem[] = [
  { n: 10, name: "你的 git repo" },
  { n: 12, name: "三欄工作台" },
  { n: 14, name: "筆記" },
  { n: 16, name: "生成元件" },
  { n: 18, name: "筆記頁籤" },
  { n: 20, name: "⌘K 指令面板" },
];

/**
 * 符號說明：說明頁側欄（約 260px）的編號清單，2px 章節線起頭、兩欄。
 * 每一個出現在頁面上的 Ref 都必須在這裡有一項。
 */
export function Legend({ title = "符號說明", items = DEFAULT_ITEMS }: LegendProps) {
  return (
    <aside aria-label={title}>
      <h2 className="legend-title">{title}</h2>
      <ol className="legend-all">
        {items.map((it) => (
          <li key={it.n}>
            <span className="ref">{it.n}</span>
            <span>{it.name}</span>
          </li>
        ))}
      </ol>
    </aside>
  );
}
