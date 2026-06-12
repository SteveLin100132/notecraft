import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import devApi from "./src/dev-api/integration.ts";

export default defineConfig({
  output: "static",
  integrations: [
    mdx(),
    react(),
    tailwind({ applyBaseStyles: false }),
    devApi(),
  ],
  vite: {
    server: { host: "127.0.0.1" },
  },
  markdown: {
    shikiConfig: {
      theme: "github-dark",
      wrap: true,
    },
  },
});
