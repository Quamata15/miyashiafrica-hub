-- Scheduled promotions. The form sends discount / bulk / seasonal, which the original CHECK
-- refused, so no promotion could be created. A promotion now runs between start_date and
-- end_date, on one product (target_id) or the whole shop, and the price charged at checkout
-- is the discounted one (it was only shown in the marketplace before).
ALTER TABLE public.promotions DROP CONSTRAINT IF EXISTS promotions_type_check;
ALTER TABLE public.promotions ADD CONSTRAINT promotions_type_check
  CHECK (type IN ('discount','bulk','seasonal','product','service','profile','freelance'));
ALTER TABLE public.promotions DROP CONSTRAINT IF EXISTS promotions_value_check;
ALTER TABLE public.promotions ADD CONSTRAINT promotions_value_check CHECK (
  discount_value IS NULL OR (discount_value > 0 AND (discount_type <> 'percentage' OR discount_value <= 90)));
ALTER TABLE public.promotions DROP CONSTRAINT IF EXISTS promotions_dates_check;
ALTER TABLE public.promotions ADD CONSTRAINT promotions_dates_check CHECK (end_date > start_date);
CREATE INDEX IF NOT EXISTS promotions_live_idx ON public.promotions (user_id, end_date) WHERE is_active;

-- A target must belong to the seller.
CREATE OR REPLACE FUNCTION public.guard_promotion() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NEW.target_id IS NOT NULL AND NEW.type IN ('discount','bulk','seasonal')
     AND NOT EXISTS (SELECT 1 FROM products WHERE id = NEW.target_id AND seller_id = NEW.user_id) THEN
    RAISE EXCEPTION 'Ce produit n''est pas dans votre boutique';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_promotion ON public.promotions;
CREATE TRIGGER guard_promotion BEFORE INSERT OR UPDATE ON public.promotions FOR EACH ROW EXECUTE FUNCTION public.guard_promotion();

-- Best promotion running now (or, with p_upcoming, the next one within 30 days) for a product.
CREATE OR REPLACE FUNCTION public.product_promotion(p_product_id uuid, p_quantity int DEFAULT 1, p_upcoming boolean DEFAULT false)
RETURNS TABLE (id uuid, name text, discount_type text, discount_value numeric, min_quantity int, event_tag text, start_date timestamptz, end_date timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT pr.id, pr.name, pr.discount_type, pr.discount_value, pr.min_quantity, pr.event_tag, pr.start_date, pr.end_date
  FROM promotions pr JOIN products p ON p.id = p_product_id AND p.seller_id = pr.user_id
  WHERE pr.is_active AND pr.type IN ('discount','bulk','seasonal')
    AND (pr.target_id IS NULL OR pr.target_id = p_product_id)
    AND pr.end_date > now()
    AND CASE WHEN p_upcoming THEN pr.start_date <= now() + interval '30 days'
             ELSE pr.start_date <= now() AND COALESCE(pr.min_quantity, 1) <= GREATEST(p_quantity, 1) END
  ORDER BY (pr.start_date <= now()) DESC, (COALESCE(pr.min_quantity, 1) <= GREATEST(p_quantity, 1)) DESC,
    CASE pr.discount_type WHEN 'percentage' THEN p.price * pr.discount_value / 100 ELSE pr.discount_value END DESC,
    pr.start_date
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.product_promotion(uuid, int, boolean) TO anon, authenticated;

-- Price charged: variant / tier price, then the running promotion (never below 0).
CREATE OR REPLACE FUNCTION public.quote_product_price(p_product_id uuid, p_variant_id uuid, p_quantity int)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_base numeric; pr record;
BEGIN
  SELECT LEAST(
    COALESCE((SELECT v.price FROM product_variants v WHERE v.id = p_variant_id AND v.product_id = p_product_id), p.price),
    COALESCE((SELECT min(t.unit_price) FROM product_price_tiers t WHERE t.product_id = p_product_id AND t.min_qty <= p_quantity), 'infinity'::numeric))
  INTO v_base FROM products p WHERE p.id = p_product_id;
  IF v_base IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO pr FROM public.product_promotion(p_product_id, p_quantity, false);
  IF pr.id IS NULL THEN RETURN v_base; END IF;
  RETURN GREATEST(0, round(CASE pr.discount_type WHEN 'percentage' THEN v_base * (1 - pr.discount_value / 100)
                                                   ELSE v_base - pr.discount_value END));
END $$;
GRANT EXECUTE ON FUNCTION public.quote_product_price(uuid, uuid, int) TO anon, authenticated;

-- Shoppers see promotions that are running or announced (for the countdown).
DROP POLICY IF EXISTS "Active promotions visible to all" ON public.promotions;
CREATE POLICY "Active promotions visible to all" ON public.promotions FOR SELECT USING (is_active = true AND end_date > now());
