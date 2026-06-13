#!/usr/bin/env node
// CLI to create a new MDX note. Mirrors POST /api/notes for offline use.
//   npm run new-note -- --title "WebSocket 連線生命週期" --tags "前端,WebSocket"
import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const args = new Map();
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith("--")) {
    const k = a.slice(2);
    const v = process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[++i] : "true";
    args.set(k, v);
  }
}

const title = args.get("title");
if (!title) {
  console.error("usage: new-note --title <title> [--tags a,b,c] [--folder src/content/notes/]");
  process.exit(1);
}
const tags = (args.get("tags") || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const folder = (args.get("folder") || "src/content/notes/").replace(/^\/+/, "");

const today = new Date().toISOString().slice(0, 10);
const slug =
  title
    .trim()
    .toLowerCase()
    .replace(/[^\w一-鿿\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50) || "untitled-note";

const tagsYaml = `[${tags.map((t) => JSON.stringify(t)).join(", ")}]`;
const body = `---
title: ${JSON.stringify(title)}
description: ""
tags: ${tagsYaml}
createdAt: "${today}"
updatedAt: "${today}"
---

在此撰寫筆記內文。

## 概念

於下方標記區塊填入提示詞，描述你想看到的視覺化。

{/* @ai-visualize
id: placeholder
type: free
status: pending
prompt: |
  在這裡描述你想要的視覺化或互動。
*/}

接著在 Claude Code 中執行 content-visualize-skill，AI 會掃描標記、生成元件，並在標記下方插入對應的 \`import\` 與 \`<Component client:visible />\`。
`;

const abs = path.resolve(process.cwd(), folder, `${slug}.mdx`);
await fs.mkdir(path.dirname(abs), { recursive: true });
try {
  await fs.access(abs);
  console.error(`error: ${abs} already exists`);
  process.exit(1);
} catch {}
await fs.writeFile(abs, body, "utf8");
console.log(`created: ${path.relative(process.cwd(), abs)}`);
console.log(`vscode://file/${abs.replace(/\\/g, "/").replace(/^\/+/, "")}`);
