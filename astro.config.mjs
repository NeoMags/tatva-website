// @ts-check
import { defineConfig } from "astro/config";

export default defineConfig({
  // Replace with the final domain once it is confirmed.
  site: "https://tatva.pages.dev",
  i18n: {
    locales: ["en", "kn", "hi"],
    defaultLocale: "en",
    routing: { prefixDefaultLocale: false },
  },
  build: { inlineStylesheets: "auto" },
  devToolbar: { enabled: false },
});
