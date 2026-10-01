import { defineConfig } from "astro/config";
import react from "@astrojs/react";

// GitHub Pages 的專案站：https://stevelin100132.github.io/notecraft/
// 站內連結一律經 import.meta.env.BASE_URL 組出，不寫死 /notecraft。
export default defineConfig({
  site: "https://stevelin100132.github.io",
  base: "/notecraft",
  trailingSlash: "ignore",
  output: "static",
  integrations: [react()],
});
