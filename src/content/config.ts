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
  schema: z.object({
    title: z.string(),
    description: z.string().default(""),
    tags: z.array(z.string()).default([]),
    category: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
});

export const collections = { notes };
