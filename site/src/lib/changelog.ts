import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export type Release = { version: string; date: string };

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

/** build 期讀 repo 根目錄的 CHANGELOG.md；「[0.1.1] – [0.1.3]」這種合併標題展開成三版。 */
export function readReleases(): Release[] {
  const text = readFileSync(repoRoot + "CHANGELOG.md", "utf-8");
  const out: Release[] = [];
  for (const line of text.split("\n")) {
    const m = line.match(/^## \[(\d+\.\d+\.\d+)\](?:\s*[–-]\s*\[(\d+\.\d+\.\d+)\])?\s*-\s*(\d{4}-\d{2}-\d{2})/);
    if (!m) continue;
    const [, from, to, date] = m;
    if (to) {
      const [a, b, c0] = from.split(".").map(Number);
      const c1 = Number(to.split(".")[2]);
      for (let c = c0; c <= c1; c++) out.push({ version: `${a}.${b}.${c}`, date });
    } else {
      out.push({ version: from, date });
    }
  }
  return out;
}

export function readVersion(): string {
  const pkg = JSON.parse(readFileSync(repoRoot + "package.json", "utf-8")) as { version: string };
  return pkg.version;
}
