// ignore-sample.mjs（build）與 ignore-dev.mjs（dev／CLI）共用的範例筆記資料夾。
// node_modules/、dist/ 進不了 git，所以每次現場產生到 tmp/ 底下（tmp/ 已被 .gitignore）。

import fs from "node:fs";
import path from "node:path";

export const root = path.resolve(import.meta.dirname, "..", "..");

// 1×1 透明 PNG
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

const fm = (title, tags = []) =>
  `---\ntitle: "${title}"\ntags: ${JSON.stringify(tags)}\ncreatedAt: "2026-10-04"\nupdatedAt: "2026-10-04"\n---\n\n`;

export const IGNORE = {
  $schema: "https://cdn.jsdelivr.net/npm/notecraftapp/schemas/ignore.schema.json",
  ignore: [
    "# 範例：草稿與私人檔",
    "drafts/",
    "**/*.private.md",
    "fixtures/**/*.json",
    "private/",
    "archive/*",
    "!archive/keep.mdx",
    "!dist/",
  ],
};

export const FILES = {
  ".notecraft/ignore.json": JSON.stringify(IGNORE, null, 2),
  ".notecraft/plugins.json": JSON.stringify({ plugins: [{ plugin: "er-diagram-renderer", files: ["fixtures/**/*.json"] }] }, null, 2),
  ".notecraft/series.json": JSON.stringify({
    series: [
      { id: "s", title: "S", eyebrow: "S", description: "", accent: "blue", icon: "target", slugs: ["a", "drafts/b"] },
    ],
  }),
  "a.mdx":
    fm("A", ["t1"]) +
    "連到 [草稿](./drafts/b.mdx)、[保留](./archive/keep.mdx)。\n\n![私人圖](./private/x.png)\n\n![公開圖](./img/ok.png)\n",
  "drafts/b.mdx": fm("B", ["t1"]) + "IGNORED_SENTINEL_B\n",
  // 壞掉的 frontmatter：被排除的檔不會被 parse，build 不應因它失敗
  "drafts/broken.md": "---\ntitle: [unclosed\n---\n\nIGNORED_SENTINEL_BROKEN\n",
  "c.private.md": fm("C") + "IGNORED_SENTINEL_C\n",
  "archive/old.md": fm("Old") + "IGNORED_SENTINEL_OLD\n",
  "archive/keep.mdx": fm("Keep") + "KEEP_SENTINEL\n",
  "node_modules/pkg/README.md": fm("NM") + "IGNORED_SENTINEL_NM\n",
  "dist/x.md": fm("Dist") + "IGNORED_SENTINEL_DIST\n",
  "fixtures/x.json": JSON.stringify({ meta: { title: "X" } }),
};

/** 在 notesDir 重建整棵範例樹（先清空）。 */
export function writeTree(notesDir) {
  fs.rmSync(notesDir, { recursive: true, force: true });
  for (const [rel, content] of Object.entries(FILES)) {
    const abs = path.join(notesDir, ...rel.split("/"));
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  }
  for (const rel of ["private/x.png", "img/ok.png"]) {
    const abs = path.join(notesDir, ...rel.split("/"));
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, PNG);
  }
}

/** 簡易 check runner：與 scripts/checks 同一個樣子。 */
export function makeChecker() {
  const state = { failed: 0 };
  const check = async (name, fn) => {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
    } catch (err) {
      state.failed++;
      console.error(`  ✗ ${name}\n    ${String(err.message).split("\n").join("\n    ")}`);
    }
  };
  return { check, state };
}
