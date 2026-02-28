import type { Plugin } from "vite";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { siteConfig } from "../config/site";

const PLACEHOLDER = "{{SITE_URL}}";

function getRobotsContent() {
  return `User-agent: *
Allow: /

Sitemap: ${siteConfig.SITE_URL}sitemap.xml
`;
}

function getSitemapContent() {
  const lastmod = new Date().toISOString().split("T")[0];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteConfig.SITE_URL}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;
}

export function siteConfigPlugin(): Plugin {
  let outDir = "dist";
  return {
    name: "site-config",
    configResolved(config) {
      outDir = config.build.outDir;
    },
    transformIndexHtml(html) {
      return html.replaceAll(PLACEHOLDER, siteConfig.SITE_URL);
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === "/robots.txt") {
          res.setHeader("Content-Type", "text/plain");
          res.end(getRobotsContent());
          return;
        }
        if (req.url === "/sitemap.xml") {
          res.setHeader("Content-Type", "application/xml");
          res.end(getSitemapContent());
          return;
        }
        next();
      });
    },
    closeBundle() {

      writeFileSync(join(outDir, "robots.txt"), getRobotsContent());
      writeFileSync(join(outDir, "sitemap.xml"), getSitemapContent());
    },
  };
}
