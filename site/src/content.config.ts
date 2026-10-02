import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// 使用文件：章節標題與順序在 src/lib/docs.ts，frontmatter 只放頁標題下的導言。
const docs = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/docs" }),
  schema: z.object({
    description: z.string(),
  }),
});

export const collections = { docs };
