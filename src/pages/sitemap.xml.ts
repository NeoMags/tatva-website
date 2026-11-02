/**
 * Sitemap of indexable pages. Language versions are listed only once their translation
 * is marked reviewed (unreviewed pages also carry noindex), so search engines never
 * index machine-quality text.
 */
import type { APIRoute } from "astro";
import { projects } from "../data/projects";
import { localeMeta, locales, localizePath } from "../i18n/ui";

/** Paths that exist in every language */
const localizedPaths = ["/"];
/** English-only pages */
const englishPaths = ["/work/", ...projects.map((p) => `/work/${p.slug}/`), "/privacy/"];

export const GET: APIRoute = ({ site }) => {
  const urls: string[] = [];
  for (const path of localizedPaths) {
    for (const l of locales) if (localeMeta[l].reviewed) urls.push(new URL(localizePath(path, l), site).href);
  }
  for (const path of englishPaths) urls.push(new URL(path, site).href);
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${u}</loc></url>`).join("\n") +
    `\n</urlset>\n`;
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
