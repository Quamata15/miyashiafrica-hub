// Server-rendered meta tags for crawlers and link previews (Google, WhatsApp, Facebook, X…).
// vercel.json routes bot user-agents on /product/:id, /service/:id and /boutique/:slug here.
import { SITE, esc, rest } from "./_supabase.js";

const DEFAULT_IMG = "https://images.unsplash.com/photo-1734255026082-82fdc81991f0?auto=format&fit=crop&w=1200&h=630&q=75";

function page({ title, description, url, image, jsonLd, body }) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} | MIYASHI</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="MIYASHI"><meta property="og:locale" content="fr_FR">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(image)}"><meta name="twitter:card" content="summary_large_image">
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>` : ""}
</head><body><main><h1>${esc(title)}</h1>${body}<p><a href="${esc(url)}">Voir sur MIYASHI</a></p></main></body></html>`;
}

export default async function handler(req, res) {
  const path = String(req.query.path || "/").split("?")[0];
  const url = SITE + path;
  let html;
  try {
    let m;
    if ((m = path.match(/^\/product\/([0-9a-f-]{36})$/))) {
      const [p] = (await rest(`products?id=eq.${m[1]}&is_active=eq.true&select=title,description,price,images,stock,location`)) ?? [];
      if (p) {
        const desc = (p.description || `${p.title} à ${p.price} FCFA sur MIYASHI`).slice(0, 160);
        const image = p.images?.[0] || DEFAULT_IMG;
        html = page({ title: p.title, description: desc, url, image,
          jsonLd: { "@context": "https://schema.org", "@type": "Product", name: p.title, description: desc, image: p.images ?? [],
            offers: { "@type": "Offer", price: p.price, priceCurrency: "XOF", availability: (p.stock ?? 0) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", url } },
          body: `<p>${esc(p.price)} FCFA${p.location ? ` · ${esc(p.location)}` : ""}</p><p>${esc(desc)}</p>` });
      }
    } else if ((m = path.match(/^\/service\/([0-9a-f-]{36})$/))) {
      const [s] = (await rest(`services?id=eq.${m[1]}&is_active=eq.true&select=title,description,price,images`)) ?? [];
      if (s) {
        const desc = (s.description || s.title).slice(0, 160);
        html = page({ title: s.title, description: desc, url, image: s.images?.[0] || DEFAULT_IMG,
          jsonLd: { "@context": "https://schema.org", "@type": "Service", name: s.title, description: desc, ...(s.price ? { offers: { "@type": "Offer", price: s.price, priceCurrency: "XOF" } } : {}) },
          body: `<p>${esc(desc)}</p>` });
      }
    } else if ((m = path.match(/^\/boutique\/([a-z0-9-]{3,40})$/))) {
      const [b] = (await rest(`shops?slug=eq.${m[1]}&select=name,description,logo_url,banner_url,city`)) ?? [];
      if (b) {
        const desc = (b.description || `Boutique ${b.name} sur MIYASHI${b.city ? `, ${b.city}` : ""}`).slice(0, 160);
        html = page({ title: b.name, description: desc, url, image: b.banner_url || b.logo_url || DEFAULT_IMG,
          jsonLd: { "@context": "https://schema.org", "@type": "Store", name: b.name, description: desc, ...(b.city ? { address: { "@type": "PostalAddress", addressLocality: b.city } } : {}) },
          body: `<p>${esc(desc)}</p>` });
      }
    }
  } catch { /* fall through to the default page */ }
  html ??= page({ title: "Le grand marché d'Afrique de l'Ouest", description: "Produits, services, talents et livraison. Paiement mobile money protégé jusqu'à la réception.", url, image: DEFAULT_IMG, body: "" });
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=86400");
  res.status(200).send(html);
}
