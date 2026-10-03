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

export type Milestone = Release & {
  /** 一句話重點，以反引號切段：奇數索引是行內 code。 */
  summary: string[];
};

/**
 * 文件「版本歷程」的主要里程碑：CHANGELOG.md 裡每個 x.y.0（minor 以上）一列，新的在上。
 * 重點優先取該版標題下的 `<!-- 重點：… -->` 註解（GitHub 上看不到）；沒有就取第一個條列項目
 * （沒有條列取導言），去掉粗體、連結與「（設計文件…）」括號，截到第一個「：」「——」「。」「；」。
 */
export function readMilestones(): Milestone[] {
  const text = readFileSync(repoRoot + "CHANGELOG.md", "utf-8").replace(/\r\n/g, "\n");
  const out: Milestone[] = [];
  for (const block of text.split(/^(?=## \[)/m).slice(1)) {
    const m = block.match(/^## \[(\d+)\.(\d+)\.(\d+)\]\s*-\s*(\d{4}-\d{2}-\d{2})/);
    if (!m || m[3] !== "0") continue;
    const version = `${m[1]}.${m[2]}.0`;
    const raw = pickSummary(block.split("\n").slice(1));
    if (!raw) throw new Error(`CHANGELOG.md 的 ${version} 抽不出重點：請在標題下加一行 <!-- 重點：… -->`);
    out.push({ version, date: m[4], summary: raw.split("`") });
  }
  return out;
}

function pickSummary(lines: string[]): string | undefined {
  for (const line of lines) {
    const c = line.match(/^<!--\s*重點[：:]\s*(.+?)\s*-->\s*$/);
    if (c) return c[1];
  }
  const firstSection = lines.findIndex((l) => l.startsWith("### "));
  const lead = lines.slice(0, firstSection < 0 ? undefined : firstSection).find((l) => l.trim() && !l.startsWith("<!--"));
  const bullet = lines.find((l) => l.startsWith("- "));
  const src = bullet ? bullet.slice(2) : lead;
  if (!src) return undefined;
  return src
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/（[^（）]*(?:設計|docs\/)[^（）]*）/g, "")
    .split(/：|——|。|；/)[0]
    .trim();
}
