export type VersionNumeralProps = {
  /** 目前版本，如「1.7.0」。取自 package，不寫死。 */
  version?: string;
};

/** 巨大的目前版本號：Archivo 窄體（wdth 66）700，clamp 96–232px，每個數字下一條 3px 底線，像填寫欄。只放在 sheet 上。 */
export function VersionNumeral({ version = "1.7.0" }: VersionNumeralProps) {
  return (
    <p className="rel-big" aria-label={`目前版本 ${version}`}>
      {version.split("").map((ch, i) => (
        <span key={i} className={ch === "." ? "rel-dot" : "rel-digit"}>
          {ch}
        </span>
      ))}
    </p>
  );
}
