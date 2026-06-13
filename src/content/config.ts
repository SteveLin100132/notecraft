import { defineCollection, z } from "astro:content";

const notes = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string().default(""),
    tags: z.array(z.string()).default([]),
    category: z.string().optional(),
    series: z.string().optional(),
    order: z.number().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
});

export const collections = { notes };
