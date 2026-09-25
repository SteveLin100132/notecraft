import path from "node:path";

// viewer 模式（CLI 設了 NOTECRAFT_NOTES_DIR / NOTECRAFT_USER_CWD）下，AI 生成元件、plugin 渲染器與
// 筆記 MDX 都在使用者專案、不在 app 的 src/ —— 不掃它們，裡面用到而 src/ 沒用過的 class
// （grid-cols-7、bg-[#1F4E8C]…）就不會進 CSS。.notecraft 的位置判斷與 astro.config.mjs 的 @notes alias 一致。
const notesDir = process.env.NOTECRAFT_NOTES_DIR ? path.resolve(process.env.NOTECRAFT_NOTES_DIR) : null;
const userCwd = process.env.NOTECRAFT_USER_CWD ? path.resolve(process.env.NOTECRAFT_USER_CWD) : null;
const notecraftDir = userCwd
  ? path.join(userCwd, ".notecraft")
  : notesDir
    ? path.join(notesDir, ".notecraft")
    : null;

// glob 要用正斜線（Windows 的 D:\ 路徑要轉），路徑本身的 glob 特殊字元（如 "Program Files (x86)"）要跳脫
const toGlobBase = (p) => p.split(path.sep).join("/").replace(/[()[\]{}*?!]/g, "\\$&");

const externalContent = [
  ...(notecraftDir
    ? [
        `${toGlobBase(notecraftDir)}/components/**/*.{js,jsx,ts,tsx}`,
        `${toGlobBase(notecraftDir)}/plugins/**/*.{js,jsx,ts,tsx}`,
      ]
    : []),
  // 筆記 MDX 可以直接寫 <div className="…">。notesDir 可能就是專案根（`view .`），排除 node_modules
  ...(notesDir ? [`${toGlobBase(notesDir)}/**/*.{md,mdx}`, "!**/node_modules/**"] : []),
];

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}", ...externalContent],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      colors: {
        blue: {
          50: "var(--blue-50)",
          100: "var(--blue-100)",
          200: "var(--blue-200)",
          300: "var(--blue-300)",
          400: "var(--blue-400)",
          500: "var(--blue-500)",
          600: "var(--blue-600)",
          700: "var(--blue-700)",
          800: "var(--blue-800)",
          900: "var(--blue-900)",
          950: "var(--blue-950)",
        },
        orange: {
          50: "var(--orange-50)",
          100: "var(--orange-100)",
          200: "var(--orange-200)",
          300: "var(--orange-300)",
          400: "var(--orange-400)",
          500: "var(--orange-500)",
          600: "var(--orange-600)",
          700: "var(--orange-700)",
        },
        sky: {
          400: "var(--sky-400)",
          500: "var(--sky-500)",
          600: "var(--sky-600)",
        },
        neutral: {
          50: "var(--neutral-50)",
          100: "var(--neutral-100)",
          200: "var(--neutral-200)",
          300: "var(--neutral-300)",
          400: "var(--neutral-400)",
          500: "var(--neutral-500)",
          700: "var(--neutral-700)",
          900: "var(--neutral-900)",
        },
      },
      borderRadius: {
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
      },
    },
  },
};
