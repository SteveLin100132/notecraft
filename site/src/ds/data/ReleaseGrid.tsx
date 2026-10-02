export type Release = {
  version: string;
  /** YYYY-MM-DD；格內顯示 MM/DD。 */
  date: string;
  /** 里程碑版本：白色 800；其他 on-sheet-2 400。 */
  major?: boolean;
};

export type ReleaseGridProps = {
  /** 由新到舊。 */
  releases?: Release[];
};

const DEFAULT_RELEASES: Release[] = [
  { version: "1.7.0", date: "2026-10-01", major: true },
  { version: "1.6.0", date: "2026-10-01", major: true },
  { version: "1.5.1", date: "2026-09-30" },
  { version: "1.5.0", date: "2026-09-30", major: true },
  { version: "1.4.1", date: "2026-09-29" },
  { version: "1.4.0", date: "2026-09-29", major: true },
  { version: "1.3.0", date: "2026-09-27" },
  { version: "1.2.3", date: "2026-09-26" },
  { version: "1.2.2", date: "2026-09-25" },
  { version: "1.2.1", date: "2026-09-25" },
  { version: "1.2.0", date: "2026-09-22" },
  { version: "1.1.1", date: "2026-09-22" },
];

/** 版本格：自動填滿（最小 104px）、1px 半透白格線，版本號＋日期。只放在 sheet 上。 */
export function ReleaseGrid({ releases = DEFAULT_RELEASES }: ReleaseGridProps) {
  return (
    <ol className="rel-grid">
      {releases.map((r) => (
        <li key={r.version} className={r.major ? "is-major" : undefined}>
          <span className="rel-v">{r.version}</span>
          <span className="rel-d">{r.date.slice(5).replace("-", "/")}</span>
        </li>
      ))}
    </ol>
  );
}
