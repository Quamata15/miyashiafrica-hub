// Dynamic sitemap: static pages, active products and services, shops.
import { SITE, rest } from "./_supabase.js";

const STATIC = ["/", "/marketplace", "/services", "/freelance", "/devenir-point-relais", "/driver-registration", "/help", "/faq", "/contact", "/terms", "/status"];

export default async function handler(_req, res) {
  const [products, services, shops] = await Promise.all([
    rest("products?is_active=eq.true&deleted_at=is.null&select=id,updated_at&order=updated_at.desc&limit=5000"),
    rest("services?is_active=eq.true&select=id,updated_at&order=updated_at.desc&limit=2000"),
    rest("shops?select=slug,updated_at&limit=2000"),
  ]);
  const u = (loc, lastmod, pri) => `<url><loc>${SITE}${loc}</loc>${lastmod ? `<lastmod>${String(lastmod).slice(0, 10)}</lastmod>` : ""}<priority>${pri}</priority></url>`;
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[
    ...STATIC.map((p) => u(p, null, p === "/" ? "1.0" : "0.7")),
    ...(products ?? []).map((p) => u(`/product/${p.id}`, p.updated_at, "0.8")),
    ...(services ?? []).map((s) => u(`/service/${s.id}`, s.updated_at, "0.7")),
    ...(shops ?? []).map((s) => u(`/boutique/${s.slug}`, s.updated_at, "0.6")),
  ].join("")}</urlset>`;
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).send(xml);
}
