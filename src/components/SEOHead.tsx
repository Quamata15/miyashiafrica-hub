import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonical?: string;
  type?: string;
  image?: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown>;
  price?: number;
  currency?: string;
  availability?: "InStock" | "OutOfStock" | "PreOrder";
  ratingValue?: number;
  reviewCount?: number;
  breadcrumbs?: Array<{ name: string; url: string }>;
}

const SITE_NAME = "MIYASHI";
const DEFAULT_DESC = "MIYASHI, la marketplace africaine qui connecte acheteurs, vendeurs, prestataires et freelances. Produits, services et emplois en Afrique.";
const BASE_URL = (import.meta.env.VITE_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "https://miyashi-hub.lovable.app")).replace(/\/$/, "");
const DEFAULT_OG_IMAGE = "/pwa-icon-512.png";

const SEOHead = ({
  title,
  description = DEFAULT_DESC,
  canonical,
  type = "website",
  image,
  noindex = false,
  jsonLd,
  price,
  currency = "XOF",
  availability,
  ratingValue,
  reviewCount,
  breadcrumbs,
}: SEOHeadProps) => {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} - Marketplace Africaine`;
  const url = canonical ? `${BASE_URL}${canonical}` : BASE_URL;
  const ogImage = image || `${BASE_URL}${DEFAULT_OG_IMAGE}`;

  // Build JSON-LD for products
  const productJsonLd = type === "product" && price ? {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": title,
    "description": description,
    "image": image,
    "url": url,
    "offers": {
      "@type": "Offer",
      "price": price,
      "priceCurrency": currency,
      "availability": availability ? `https://schema.org/${availability}` : "https://schema.org/InStock",
    },
    ...(ratingValue && reviewCount ? {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": ratingValue,
        "reviewCount": reviewCount,
      }
    } : {}),
  } : null;

  // Build breadcrumb JSON-LD
  const breadcrumbJsonLd = breadcrumbs?.length ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbs.map((bc, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": bc.name,
      "item": `${BASE_URL}${bc.url}`,
    })),
  } : null;

  // Organization JSON-LD for homepage
  const orgJsonLd = type === "website" && !canonical ? {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": SITE_NAME,
    "url": BASE_URL,
    "logo": `${BASE_URL}/pwa-icon-512.png`,
    "description": DEFAULT_DESC,
    "sameAs": [],
  } : null;

  const finalJsonLd = jsonLd || productJsonLd || orgJsonLd;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type === "product" ? "product" : "website"} />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:locale" content="fr_FR" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* JSON-LD */}
      {finalJsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(finalJsonLd)}
        </script>
      )}
      {breadcrumbJsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbJsonLd)}
        </script>
      )}
    </Helmet>
  );
};

export default SEOHead;
