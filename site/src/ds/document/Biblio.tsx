export type BiblioField = { label: string; value: string };

export type BiblioProps = {
  fields?: BiblioField[];
};

const DEFAULT_FIELDS: BiblioField[] = [
  { label: "名稱", value: "NoteCraftApp" },
  { label: "版本", value: "1.7.0" },
  { label: "授權", value: "MIT" },
  { label: "套件", value: "notecraftapp" },
];

/** 書目欄：只在首頁 sheet 上，名稱／版本／授權／套件四欄；欄名次要字色、值 600。版本取自 package，不寫死。 */
export function Biblio({ fields = DEFAULT_FIELDS }: BiblioProps) {
  return (
    <dl className="biblio">
      {fields.map((f) => (
        <div key={f.label}>
          <dt>{f.label}</dt>
          <dd>{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}
