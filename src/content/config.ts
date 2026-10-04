import { defineCollection, z } from "astro:content";
import { ignoringNotesLoader } from "../lib/ignoring-loader";
import { getNotesDir } from "../lib/notes-ignore-state.mjs";

// P1: 支援 NOTECRAFT_NOTES_DIR 讓 viewer 讀外部絕對路徑；沒設就走原本的 src/content/notes/
const notesDir = getNotesDir();

const notes = defineCollection({
  // glob("**/*.{md,mdx}") 外包一層套用 .notecraft/ignore.json 與內建排除（. 開頭、node_modules/、dist/），
  // 見 src/lib/ignoring-loader.ts。
  loader: ignoringNotesLoader(notesDir),
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
