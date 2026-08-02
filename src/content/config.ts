import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import path from "node:path";
import { pathToFileURL } from "node:url";

// P1: 支援 NOTECRAFT_NOTES_DIR 讓 viewer 讀外部絕對路徑；沒設就走原本的 src/content/notes/
const envDir = process.env.NOTECRAFT_NOTES_DIR;
const notesDir = envDir
  ? path.resolve(envDir)
  : path.resolve(process.cwd(), "src/content/notes");

// glob loader 的 base 若為絕對路徑必須是 file URL：內部走 new URL(base, root)，
// Windows 的 "D:\..." 會被當成 scheme「d:」解析，導致 fileURLToPath 丟 "The URL must be of scheme file"。
const notesBase = pathToFileURL(notesDir + path.sep);

const notes = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: notesBase }),
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
