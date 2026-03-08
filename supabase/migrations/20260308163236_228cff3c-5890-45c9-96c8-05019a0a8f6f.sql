
-- Create full-text search index on products
CREATE INDEX IF NOT EXISTS idx_products_fts ON public.products 
  USING gin(to_tsvector('french', coalesce(title, '') || ' ' || coalesce(description, '')));

-- Create full-text search index on services
CREATE INDEX IF NOT EXISTS idx_services_fts ON public.services 
  USING gin(to_tsvector('french', coalesce(title, '') || ' ' || coalesce(description, '')));

-- Full-text search function for products
CREATE OR REPLACE FUNCTION public.search_products(
  p_query text DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_min_price numeric DEFAULT 0,
  p_max_price numeric DEFAULT 99999999,
  p_location text DEFAULT NULL,
  p_sort_by text DEFAULT 'newest',
  p_page integer DEFAULT 1,
  p_per_page integer DEFAULT 24
)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  price numeric,
  images text[],
  location text,
  seller_id uuid,
  category_id uuid,
  stock integer,
  is_active boolean,
  created_at timestamptz,
  rank real
)
LANGUAGE plpgsql STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id, p.title, p.description, p.price, p.images,
    p.location, p.seller_id, p.category_id, p.stock,
    p.is_active, p.created_at,
    CASE
      WHEN p_query IS NOT NULL AND p_query != '' THEN
        ts_rank(to_tsvector('french', coalesce(p.title, '') || ' ' || coalesce(p.description, '')),
                plainto_tsquery('french', p_query))
      ELSE 0.0
    END::real AS rank
  FROM products p
  WHERE p.is_active = true
    AND p.deleted_at IS NULL
    AND p.price >= p_min_price
    AND p.price <= p_max_price
    AND (p_category_id IS NULL OR p.category_id = p_category_id)
    AND (p_location IS NULL OR p_location = '' OR p.location ILIKE '%' || p_location || '%')
    AND (p_query IS NULL OR p_query = '' OR
         to_tsvector('french', coalesce(p.title, '') || ' ' || coalesce(p.description, ''))
         @@ plainto_tsquery('french', p_query)
         OR p.title ILIKE '%' || p_query || '%')
  ORDER BY
    CASE WHEN p_sort_by = 'newest' THEN extract(epoch from p.created_at) END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'oldest' THEN extract(epoch from p.created_at) END ASC NULLS LAST,
    CASE WHEN p_sort_by = 'price-asc' THEN p.price END ASC NULLS LAST,
    CASE WHEN p_sort_by = 'price-desc' THEN p.price END DESC NULLS LAST,
    CASE WHEN p_query IS NOT NULL AND p_query != '' THEN
      ts_rank(to_tsvector('french', coalesce(p.title, '') || ' ' || coalesce(p.description, '')),
              plainto_tsquery('french', p_query))
    ELSE 0.0 END DESC
  LIMIT p_per_page
  OFFSET (p_page - 1) * p_per_page;
END;
$$;

-- Full-text search function for services
CREATE OR REPLACE FUNCTION public.search_services(
  p_query text DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_min_price numeric DEFAULT 0,
  p_max_price numeric DEFAULT 99999999,
  p_sort_by text DEFAULT 'newest',
  p_page integer DEFAULT 1,
  p_per_page integer DEFAULT 24
)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  price numeric,
  price_type text,
  images text[],
  provider_id uuid,
  category_id uuid,
  delivery_days integer,
  is_active boolean,
  created_at timestamptz,
  rank real
)
LANGUAGE plpgsql STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id, s.title, s.description, s.price, s.price_type, s.images,
    s.provider_id, s.category_id, s.delivery_days,
    s.is_active, s.created_at,
    CASE
      WHEN p_query IS NOT NULL AND p_query != '' THEN
        ts_rank(to_tsvector('french', coalesce(s.title, '') || ' ' || coalesce(s.description, '')),
                plainto_tsquery('french', p_query))
      ELSE 0.0
    END::real AS rank
  FROM services s
  WHERE s.is_active = true
    AND (s.price IS NULL OR (s.price >= p_min_price AND s.price <= p_max_price))
    AND (p_category_id IS NULL OR s.category_id = p_category_id)
    AND (p_query IS NULL OR p_query = '' OR
         to_tsvector('french', coalesce(s.title, '') || ' ' || coalesce(s.description, ''))
         @@ plainto_tsquery('french', p_query)
         OR s.title ILIKE '%' || p_query || '%')
  ORDER BY
    CASE WHEN p_sort_by = 'newest' THEN extract(epoch from s.created_at) END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'oldest' THEN extract(epoch from s.created_at) END ASC NULLS LAST,
    CASE WHEN p_sort_by = 'price-asc' THEN s.price END ASC NULLS LAST,
    CASE WHEN p_sort_by = 'price-desc' THEN s.price END DESC NULLS LAST,
    CASE WHEN p_query IS NOT NULL AND p_query != '' THEN
      ts_rank(to_tsvector('french', coalesce(s.title, '') || ' ' || coalesce(s.description, '')),
              plainto_tsquery('french', p_query))
    ELSE 0.0 END DESC
  LIMIT p_per_page
  OFFSET (p_page - 1) * p_per_page;
END;
$$;
