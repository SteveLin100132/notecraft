import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import path from "node:path";

// P1: 支援 NOTECRAFT_NOTES_DIR 讓 viewer 讀外部絕對路徑；沒設就走原本的 src/content/notes/
const envDir = process.env.NOTECRAFT_NOTES_DIR;
const notesDir = envDir
  ? path.resolve(envDir)
  : path.resolve(process.cwd(), "src/content/notes");

const notes = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: notesDir }),
  // P3: title/createdAt/updatedAt 改為 optional，缺欄位由 lib/notes.ts 的 enrichNote() 補 fallback
  // （H1 或檔名、fs.stat 的 birthtime / mtime）。主專案既有筆記都有完整 frontmatter，行為不變。
  schema: z.object({
    title: z.string().optional(),
    description: z.string().default(""),
    tags: z.array(z.string()).default([]),
    category: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  }),
});

export const collections = { notes };
