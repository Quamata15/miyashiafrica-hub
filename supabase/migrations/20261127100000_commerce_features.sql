-- MIYASHI commerce features
--  3 direct mobile-money checkout (pending_checkouts + FedaPay)
--  4 cash on delivery with a hand-over code
--  5 currencies (display only, prices stay in XOF)
--  6 invoices
--  7 savings goals (pay in several times)
--  8 platform revenue for admins
--  9 price offers (haggling)
-- 10 product variants
-- 11 address book
-- 12 back-in-stock alerts
-- 13 group buying
-- 17 product views + recommendations
-- 18/22/23/24 shops: slug, team members, opening hours, quick replies, vacation mode
-- 19 bulk import
-- 20 seller statistics
-- 21 wholesale price tiers
-- plus: a single internal order function (_place_order) used by every flow,
-- a guard on client-side order updates and refunds on cancellation.

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- ───────────────────────── Shops (18, 22, 23, 24) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$'),
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  description text CHECK (char_length(description) <= 2000),
  logo_url text,
  banner_url text,
  theme_color text CHECK (theme_color IS NULL OR theme_color ~ '^#[0-9a-fA-F]{6}$'),
  country text NOT NULL DEFAULT 'TG',
  city text,
  opening_hours jsonb NOT NULL DEFAULT '{}'::jsonb,   -- {"mon":[["08:00","18:00"]],...}
  quick_replies jsonb NOT NULL DEFAULT '[]'::jsonb,   -- ["Disponible", ...]
  vacation_mode boolean NOT NULL DEFAULT false,
  vacation_message text,
  vacation_until date,
  accepts_cod boolean NOT NULL DEFAULT true,
  store_pickup_address text,
  vat_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shops are public" ON public.shops FOR SELECT USING (true);
CREATE POLICY "Owner creates shop" ON public.shops FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = owner_id);
CREATE POLICY "Owner updates shop" ON public.shops FOR UPDATE TO authenticated USING ((select auth.uid()) = owner_id) WITH CHECK ((select auth.uid()) = owner_id);
CREATE POLICY "Owner deletes shop" ON public.shops FOR DELETE TO authenticated USING ((select auth.uid()) = owner_id);
CREATE TRIGGER shops_updated_at BEFORE UPDATE ON public.shops FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.shop_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('manager','staff')),
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','active')),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, user_id)
);
ALTER TABLE public.shop_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS shop_members_user_idx ON public.shop_members(user_id);
CREATE POLICY "Members and owner see team" ON public.shop_members FOR SELECT TO authenticated USING (
  user_id = (select auth.uid()) OR EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.owner_id = (select auth.uid())));
CREATE POLICY "Owner removes members" ON public.shop_members FOR DELETE TO authenticated USING (
  user_id = (select auth.uid()) OR EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.owner_id = (select auth.uid())));

-- Can the current user act for this seller (owner or active team member)?
CREATE OR REPLACE FUNCTION public.can_manage_seller(p_seller uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() = p_seller OR EXISTS (
    SELECT 1 FROM shop_members m JOIN shops s ON s.id = m.shop_id
    WHERE s.owner_id = p_seller AND m.user_id = auth.uid() AND m.status = 'active')
$$;

CREATE POLICY "Team members view seller products" ON public.products FOR SELECT TO authenticated USING (public.can_manage_seller(seller_id));
CREATE POLICY "Team members create seller products" ON public.products FOR INSERT TO authenticated WITH CHECK (public.can_manage_seller(seller_id));
CREATE POLICY "Team members update seller products" ON public.products FOR UPDATE TO authenticated USING (public.can_manage_seller(seller_id)) WITH CHECK (public.can_manage_seller(seller_id));
CREATE POLICY "Team members view seller orders" ON public.orders FOR SELECT TO authenticated USING (public.can_manage_seller(seller_id));
CREATE POLICY "Team members update seller orders" ON public.orders FOR UPDATE TO authenticated USING (public.can_manage_seller(seller_id));

CREATE OR REPLACE FUNCTION public.invite_shop_member(p_email text, p_role text DEFAULT 'staff')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_shop shops; v_user uuid;
BEGIN
  SELECT * INTO v_shop FROM shops WHERE owner_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Créez d''abord votre boutique'; END IF;
  IF p_role NOT IN ('manager','staff') THEN RAISE EXCEPTION 'Rôle invalide'; END IF;
  SELECT id INTO v_user FROM auth.users WHERE lower(email) = lower(trim(p_email));
  IF v_user IS NULL THEN RAISE EXCEPTION 'Aucun compte MIYASHI avec cet e-mail'; END IF;
  IF v_user = auth.uid() THEN RAISE EXCEPTION 'Vous êtes déjà propriétaire'; END IF;
  IF (SELECT count(*) FROM shop_members WHERE shop_id = v_shop.id) >= 20 THEN RAISE EXCEPTION 'Équipe limitée à 20 membres'; END IF;
  INSERT INTO shop_members (shop_id, user_id, role, invited_by) VALUES (v_shop.id, v_user, p_role, auth.uid())
  ON CONFLICT (shop_id, user_id) DO UPDATE SET role = EXCLUDED.role;
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (v_user, 'shop_invite', 'Invitation d''équipe', 'Vous êtes invité à gérer la boutique ' || v_shop.name || '.', jsonb_build_object('shop_id', v_shop.id));
  RETURN jsonb_build_object('success', true);
END $$;

CREATE OR REPLACE FUNCTION public.accept_shop_invite(p_shop_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE shop_members SET status = 'active' WHERE shop_id = p_shop_id AND user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.update_shop_member_role(p_member_id uuid, p_role text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_role NOT IN ('manager','staff') THEN RAISE EXCEPTION 'Rôle invalide'; END IF;
  UPDATE shop_members m SET role = p_role FROM shops s
  WHERE m.id = p_member_id AND s.id = m.shop_id AND s.owner_id = auth.uid();
END $$;

-- ───────────────────────── Currencies (5) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.currencies (
  code text PRIMARY KEY,
  name text NOT NULL,
  symbol text NOT NULL,
  xof_per_unit numeric NOT NULL CHECK (xof_per_unit > 0),  -- 1 unit = n XOF
  decimals int NOT NULL DEFAULT 0,
  countries text[] NOT NULL DEFAULT '{}',
  is_pegged boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Currencies are public" ON public.currencies FOR SELECT USING (true);
CREATE POLICY "Admins manage currencies" ON public.currencies FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin')) WITH CHECK (public.has_role((select auth.uid()), 'admin'));
INSERT INTO public.currencies (code, name, symbol, xof_per_unit, decimals, countries, is_pegged) VALUES
  ('XOF', 'Franc CFA (UEMOA)', 'FCFA', 1, 0, '{TG,BJ,CI,SN,BF,ML,NE,GW}', true),
  ('XAF', 'Franc CFA (CEMAC)', 'FCFA', 1, 0, '{CM,GA,CG,TD,CF,GQ}', true),
  ('EUR', 'Euro', '€', 655.957, 2, '{FR,BE}', true),
  ('GHS', 'Cedi ghanéen', 'GH₵', 50, 2, '{GH}', false),
  ('NGN', 'Naira', '₦', 0.38, 0, '{NG}', false),
  ('GNF', 'Franc guinéen', 'GNF', 0.07, 0, '{GN}', false),
  ('USD', 'Dollar US', '$', 560, 2, '{}', false)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'XOF',
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'fr',
  ADD COLUMN IF NOT EXISTS data_saver boolean NOT NULL DEFAULT false;

-- ───────────────────────── Products: variants, tiers (10, 21) ─────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS min_order_qty integer NOT NULL DEFAULT 1 CHECK (min_order_qty >= 1),
  ADD COLUMN IF NOT EXISTS has_variants boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'TG';
CREATE INDEX IF NOT EXISTS products_title_trgm_idx ON public.products USING gin (title extensions.gin_trgm_ops);

CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  label text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 80),     -- "Rouge / XL"
  options jsonb NOT NULL DEFAULT '{}'::jsonb,                           -- {"Couleur":"Rouge","Taille":"XL"}
  price numeric CHECK (price IS NULL OR price >= 0),                    -- NULL = product price
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  sku text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS product_variants_product_idx ON public.product_variants(product_id);
CREATE POLICY "Variants are public" ON public.product_variants FOR SELECT USING (true);
CREATE POLICY "Sellers manage variants" ON public.product_variants FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND public.can_manage_seller(p.seller_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND public.can_manage_seller(p.seller_id)));

CREATE TABLE IF NOT EXISTS public.product_price_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  min_qty integer NOT NULL CHECK (min_qty >= 2),
  unit_price numeric NOT NULL CHECK (unit_price >= 0),
  UNIQUE (product_id, min_qty)
);
ALTER TABLE public.product_price_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tiers are public" ON public.product_price_tiers FOR SELECT USING (true);
CREATE POLICY "Sellers manage tiers" ON public.product_price_tiers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND public.can_manage_seller(p.seller_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND public.can_manage_seller(p.seller_id)));

ALTER TABLE public.cart_items ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES public.product_variants(id) ON DELETE CASCADE;

-- ───────────────────────── Address book (11) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Maison',
  recipient_name text,
  phone text,
  country text NOT NULL DEFAULT 'TG',
  city text NOT NULL,
  district text,
  landmark text,          -- "derrière la pharmacie du Grand Marché"
  details text,
  lat double precision,
  lng double precision,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS addresses_user_idx ON public.addresses(user_id);
CREATE POLICY "Own addresses" ON public.addresses FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION public.format_address(a public.addresses)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT concat_ws(', ', NULLIF(a.recipient_name,''), NULLIF(a.details,''), NULLIF(a.district,''), a.city,
    CASE WHEN NULLIF(a.landmark,'') IS NOT NULL THEN 'Repère : ' || a.landmark END,
    CASE WHEN NULLIF(a.phone,'') IS NOT NULL THEN 'Tél. ' || a.phone END)
$$;

-- ───────────────────────── Orders: new columns ─────────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS variant_label text,
  ADD COLUMN IF NOT EXISTS unit_price numeric,
  ADD COLUMN IF NOT EXISTS payment_mode text NOT NULL DEFAULT 'wallet',        -- wallet | cod | prefunded
  ADD COLUMN IF NOT EXISTS fulfillment_method text NOT NULL DEFAULT 'delivery', -- delivery | pickup_point | store_pickup
  ADD COLUMN IF NOT EXISTS pickup_point_id uuid,
  ADD COLUMN IF NOT EXISTS delivery_zone_id uuid,
  ADD COLUMN IF NOT EXISTS delivery_fee_estimate numeric,
  ADD COLUMN IF NOT EXISTS address_id uuid REFERENCES public.addresses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source text,          -- offer | quote | group_buy | savings | booking | checkout
  ADD COLUMN IF NOT EXISTS source_id uuid;

DO $$ DECLARE c text; BEGIN
  SELECT conname INTO c FROM pg_constraint WHERE conrelid = 'public.payments'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%payment_method%';
  IF c IS NOT NULL THEN EXECUTE format('ALTER TABLE public.payments DROP CONSTRAINT %I', c); END IF;
END $$;
ALTER TABLE public.payments ADD CONSTRAINT payments_payment_method_check
  CHECK (payment_method IN ('card','orange_money','wave','tmoney','wallet','cod','prefunded','fedapay'));

-- Hand-over code: proves delivery / pickup / cash payment. Visible to the buyer only.
CREATE TABLE IF NOT EXISTS public.order_codes (
  order_id uuid PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  code text NOT NULL,
  used_at timestamptz,
  attempts int NOT NULL DEFAULT 0
);
ALTER TABLE public.order_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyer sees own code" ON public.order_codes FOR SELECT TO authenticated USING ((select auth.uid()) = buyer_id);

-- ───────────────────────── Offers (9) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.price_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 1000),
  list_price numeric NOT NULL,
  offered_price numeric NOT NULL CHECK (offered_price > 0),
  counter_price numeric,
  message text CHECK (char_length(message) <= 500),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','countered','accepted','rejected','expired','used','cancelled')),
  agreed_price numeric,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '48 hours',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.price_offers ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS price_offers_buyer_idx ON public.price_offers(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS price_offers_seller_idx ON public.price_offers(seller_id, created_at DESC);
CREATE POLICY "Parties see offers" ON public.price_offers FOR SELECT TO authenticated
  USING ((select auth.uid()) IN (buyer_id, seller_id) OR public.can_manage_seller(seller_id));

CREATE OR REPLACE FUNCTION public.make_offer(p_product_id uuid, p_price numeric, p_quantity int DEFAULT 1, p_variant_id uuid DEFAULT NULL, p_message text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_p products; v_list numeric; v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  SELECT * INTO v_p FROM products WHERE id = p_product_id AND is_active AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Produit introuvable'; END IF;
  IF v_p.seller_id = auth.uid() THEN RAISE EXCEPTION 'Vous ne pouvez pas marchander votre propre produit'; END IF;
  IF p_variant_id IS NULL AND EXISTS (SELECT 1 FROM product_variants WHERE product_id = p_product_id AND is_active) THEN
    RAISE EXCEPTION 'Choisissez une variante (taille, couleur…)';
  END IF;
  v_list := COALESCE((SELECT price FROM product_variants WHERE id = p_variant_id AND product_id = p_product_id), v_p.price);
  IF p_price < v_list * 0.3 THEN RAISE EXCEPTION 'Offre trop basse (minimum 30 %% du prix)'; END IF;
  IF p_price >= v_list THEN RAISE EXCEPTION 'Votre offre doit être inférieure au prix affiché'; END IF;
  IF (SELECT count(*) FROM price_offers WHERE buyer_id = auth.uid() AND product_id = p_product_id AND created_at > now() - interval '24 hours') >= 3 THEN
    RAISE EXCEPTION 'Maximum 3 offres par jour pour ce produit';
  END IF;
  INSERT INTO price_offers (product_id, variant_id, buyer_id, seller_id, quantity, list_price, offered_price, message)
  VALUES (p_product_id, p_variant_id, auth.uid(), v_p.seller_id, GREATEST(p_quantity,1), v_list, round(p_price), left(p_message, 500))
  RETURNING id INTO v_id;
  INSERT INTO notifications (user_id, type, title, message, data) VALUES (v_p.seller_id, 'offer', 'Nouvelle offre',
    'Un acheteur propose ' || round(p_price)::text || ' FCFA pour « ' || v_p.title || ' ».', jsonb_build_object('offer_id', v_id, 'product_id', p_product_id));
  RETURN jsonb_build_object('success', true, 'offer_id', v_id);
END $$;

CREATE OR REPLACE FUNCTION public.respond_offer(p_offer_id uuid, p_action text, p_counter_price numeric DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o price_offers; v_title text;
BEGIN
  SELECT * INTO o FROM price_offers WHERE id = p_offer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Offre introuvable'; END IF;
  IF o.expires_at < now() AND o.status IN ('pending','countered') THEN
    UPDATE price_offers SET status = 'expired' WHERE id = o.id; RAISE EXCEPTION 'Offre expirée';
  END IF;
  SELECT title INTO v_title FROM products WHERE id = o.product_id;

  IF public.can_manage_seller(o.seller_id) AND o.status = 'pending' THEN
    IF p_action = 'accept' THEN
      UPDATE price_offers SET status = 'accepted', agreed_price = offered_price, expires_at = now() + interval '48 hours', updated_at = now() WHERE id = o.id;
    ELSIF p_action = 'reject' THEN
      UPDATE price_offers SET status = 'rejected', updated_at = now() WHERE id = o.id;
    ELSIF p_action = 'counter' THEN
      IF p_counter_price IS NULL OR p_counter_price <= o.offered_price OR p_counter_price >= o.list_price THEN
        RAISE EXCEPTION 'La contre-offre doit être entre l''offre et le prix affiché';
      END IF;
      UPDATE price_offers SET status = 'countered', counter_price = round(p_counter_price), expires_at = now() + interval '48 hours', updated_at = now() WHERE id = o.id;
    ELSE RAISE EXCEPTION 'Action invalide'; END IF;
    INSERT INTO notifications (user_id, type, title, message, data) VALUES (o.buyer_id, 'offer',
      CASE p_action WHEN 'accept' THEN 'Offre acceptée 🎉' WHEN 'reject' THEN 'Offre refusée' ELSE 'Contre-offre reçue' END,
      CASE p_action WHEN 'accept' THEN 'Le vendeur accepte ' || o.offered_price::text || ' FCFA pour « ' || v_title || ' ». Payez sous 48 h.'
                    WHEN 'reject' THEN 'Le vendeur a refusé votre offre pour « ' || v_title || ' ».'
                    ELSE 'Le vendeur propose ' || round(p_counter_price)::text || ' FCFA pour « ' || v_title || ' ».' END,
      jsonb_build_object('offer_id', o.id, 'product_id', o.product_id));
  ELSIF auth.uid() = o.buyer_id THEN
    IF o.status = 'countered' AND p_action = 'accept' THEN
      UPDATE price_offers SET status = 'accepted', agreed_price = counter_price, expires_at = now() + interval '48 hours', updated_at = now() WHERE id = o.id;
      INSERT INTO notifications (user_id, type, title, message, data) VALUES (o.seller_id, 'offer', 'Contre-offre acceptée',
        'L''acheteur accepte ' || o.counter_price::text || ' FCFA pour « ' || v_title || ' ».', jsonb_build_object('offer_id', o.id));
    ELSIF o.status IN ('pending','countered') AND p_action IN ('reject','cancel') THEN
      UPDATE price_offers SET status = 'cancelled', updated_at = now() WHERE id = o.id;
    ELSE RAISE EXCEPTION 'Action non autorisée'; END IF;
  ELSE
    RAISE EXCEPTION 'Action non autorisée';
  END IF;
  RETURN jsonb_build_object('success', true);
END $$;

-- ───────────────────────── Pricing + the one order function ─────────────────────────
CREATE OR REPLACE FUNCTION public.quote_product_price(p_product_id uuid, p_variant_id uuid, p_quantity int)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT LEAST(
    COALESCE((SELECT v.price FROM product_variants v WHERE v.id = p_variant_id AND v.product_id = p_product_id), p.price),
    COALESCE((SELECT min(t.unit_price) FROM product_price_tiers t WHERE t.product_id = p_product_id AND t.min_qty <= p_quantity), 'infinity'::numeric))
  FROM products p WHERE p.id = p_product_id
$$;

-- Internal: never exposed to clients. Every way of buying goes through here.
-- p: product_id, service_id, variant_id, quantity, shipping_address, address_id, notes,
--    payment_mode (wallet|cod|prefunded), promo_code, unit_price_override, source, source_id,
--    fulfillment_method, pickup_point_id, delivery_zone_id
CREATE OR REPLACE FUNCTION public._place_order(p_buyer uuid, p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_product_id uuid := NULLIF(p->>'product_id','')::uuid;
  v_service_id uuid := NULLIF(p->>'service_id','')::uuid;
  v_variant_id uuid := NULLIF(p->>'variant_id','')::uuid;
  v_qty int := COALESCE((p->>'quantity')::int, 1);
  v_mode text := COALESCE(p->>'payment_mode', 'wallet');
  v_fulfil text := COALESCE(p->>'fulfillment_method', 'delivery');
  v_address_id uuid := NULLIF(p->>'address_id','')::uuid;
  v_ship text := COALESCE(p->>'shipping_address', '');
  v_seller uuid; v_unit numeric; v_stock int; v_vstock int; v_vlabel text; v_min int;
  v_total numeric; v_discount numeric := 0; v_promo jsonb; v_order uuid; v_shop shops; v_addr addresses;
  v_zone_fee numeric;
BEGIN
  IF p_buyer IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF v_qty < 1 OR v_qty > 1000 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
  IF v_mode NOT IN ('wallet','cod','prefunded') THEN RAISE EXCEPTION 'Invalid payment mode'; END IF;
  IF v_fulfil NOT IN ('delivery','pickup_point','store_pickup') THEN RAISE EXCEPTION 'Invalid fulfillment'; END IF;

  IF v_address_id IS NOT NULL THEN
    SELECT * INTO v_addr FROM addresses WHERE id = v_address_id AND user_id = p_buyer;
    IF FOUND THEN v_ship := public.format_address(v_addr); END IF;
  END IF;

  IF v_product_id IS NOT NULL THEN
    SELECT seller_id, stock, min_order_qty INTO v_seller, v_stock, v_min
    FROM products WHERE id = v_product_id AND is_active AND deleted_at IS NULL FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Product not found or inactive'; END IF;
    IF v_qty < v_min AND p->>'unit_price_override' IS NULL THEN RAISE EXCEPTION 'Quantité minimum : %', v_min; END IF;
    IF v_variant_id IS NOT NULL THEN
      SELECT stock, label INTO v_vstock, v_vlabel FROM product_variants
      WHERE id = v_variant_id AND product_id = v_product_id AND is_active FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Variante introuvable'; END IF;
      IF v_vstock < v_qty THEN RAISE EXCEPTION 'Insufficient stock'; END IF;
    ELSIF EXISTS (SELECT 1 FROM product_variants WHERE product_id = v_product_id AND is_active) THEN
      RAISE EXCEPTION 'Choisissez une variante (taille, couleur…)';
    ELSIF v_stock IS NOT NULL AND v_stock < v_qty THEN
      RAISE EXCEPTION 'Insufficient stock';
    END IF;
    v_unit := public.quote_product_price(v_product_id, v_variant_id, v_qty);
  ELSIF v_service_id IS NOT NULL THEN
    SELECT provider_id, price INTO v_seller, v_unit FROM services WHERE id = v_service_id AND is_active;
    IF NOT FOUND THEN RAISE EXCEPTION 'Service not found or inactive'; END IF;
  ELSE
    RAISE EXCEPTION 'Product or service ID required';
  END IF;

  IF p->>'unit_price_override' IS NOT NULL THEN v_unit := (p->>'unit_price_override')::numeric; END IF;
  IF v_unit IS NULL THEN RAISE EXCEPTION 'Service price not set'; END IF;
  IF v_seller = p_buyer THEN RAISE EXCEPTION 'Cannot buy your own item'; END IF;

  SELECT * INTO v_shop FROM shops WHERE owner_id = v_seller;
  IF FOUND AND v_shop.vacation_mode AND (v_shop.vacation_until IS NULL OR v_shop.vacation_until >= current_date) THEN
    RAISE EXCEPTION 'Boutique en congé : %', COALESCE(v_shop.vacation_message, 'revenez bientôt');
  END IF;

  IF v_mode = 'cod' THEN
    IF v_product_id IS NULL THEN RAISE EXCEPTION 'Le paiement à la livraison concerne les produits'; END IF;
    IF FOUND AND NOT v_shop.accepts_cod THEN RAISE EXCEPTION 'Ce vendeur n''accepte pas le paiement à la livraison'; END IF;
  END IF;

  v_total := v_unit * v_qty;
  IF COALESCE(p->>'promo_code','') <> '' AND p->>'unit_price_override' IS NULL THEN
    v_promo := validate_and_use_promo(p->>'promo_code', v_total);
    IF (v_promo->>'success')::boolean THEN v_discount := (v_promo->>'discount_amount')::numeric; END IF;
  END IF;
  v_total := GREATEST(v_total - v_discount, 0);

  IF v_mode = 'cod' AND v_total > 150000 THEN RAISE EXCEPTION 'Paiement à la livraison limité à 150 000 FCFA'; END IF;

  IF v_mode = 'wallet' AND v_total > 0 THEN
    UPDATE wallets SET balance = balance - v_total, updated_at = now() WHERE user_id = p_buyer AND balance >= v_total;
    IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;
  END IF;

  IF v_variant_id IS NOT NULL THEN
    UPDATE product_variants SET stock = stock - v_qty WHERE id = v_variant_id;
  ELSIF v_product_id IS NOT NULL AND v_stock IS NOT NULL THEN
    UPDATE products SET stock = stock - v_qty WHERE id = v_product_id;
  END IF;

  IF NULLIF(p->>'delivery_zone_id','') IS NOT NULL AND to_regclass('public.delivery_zones') IS NOT NULL THEN
    EXECUTE 'SELECT base_fee FROM public.delivery_zones WHERE id = $1' INTO v_zone_fee USING (p->>'delivery_zone_id')::uuid;
  END IF;

  INSERT INTO orders (buyer_id, seller_id, product_id, service_id, quantity, total_price, unit_price, status, payment_status,
    shipping_address, notes, variant_id, variant_label, payment_mode, fulfillment_method, pickup_point_id, delivery_zone_id,
    delivery_fee_estimate, address_id, source, source_id)
  VALUES (p_buyer, v_seller, v_product_id, v_service_id, v_qty, v_total, v_unit, 'pending',
    CASE WHEN v_mode = 'cod' THEN 'cod_pending' ELSE 'paid' END,
    v_ship,
    CASE WHEN COALESCE(p->>'promo_code','') <> '' THEN concat_ws(' ', p->>'notes', '[Promo: ' || (p->>'promo_code') || ']') ELSE p->>'notes' END,
    v_variant_id, v_vlabel, v_mode, v_fulfil, NULLIF(p->>'pickup_point_id','')::uuid, NULLIF(p->>'delivery_zone_id','')::uuid,
    v_zone_fee, v_address_id, COALESCE(p->>'source','checkout'), NULLIF(p->>'source_id','')::uuid)
  RETURNING id INTO v_order;

  IF v_mode = 'wallet' THEN
    INSERT INTO wallet_transactions (user_id, type, amount, description, reference_id, payment_method, status)
    VALUES (p_buyer, 'purchase', -v_total, 'Achat commande #' || left(v_order::text, 8), v_order, 'wallet', 'completed');
  END IF;

  INSERT INTO payments (order_id, payer_id, amount, payment_method, status, metadata)
  VALUES (v_order, p_buyer, v_total, v_mode, CASE WHEN v_mode = 'cod' THEN 'pending' ELSE 'completed' END,
    jsonb_build_object('promo_code', p->>'promo_code', 'discount', v_discount, 'source', p->>'source'));

  IF v_mode <> 'cod' THEN
    INSERT INTO escrow_transactions (order_id, payer_id, total_amount, seller_amount, platform_commission, status)
    VALUES (v_order, p_buyer, v_total, round(v_total * 0.9), v_total - round(v_total * 0.9), 'held');
  END IF;

  IF v_product_id IS NOT NULL THEN
    INSERT INTO order_codes (order_id, buyer_id, code) VALUES (v_order, p_buyer, lpad((floor(random() * 1000000))::int::text, 6, '0'));
  END IF;

  INSERT INTO notifications (user_id, type, title, message, data) VALUES (v_seller, 'order', 'Nouvelle commande',
    'Commande #' || left(v_order::text, 8) || ' — ' || v_total::text || ' FCFA' || CASE WHEN v_mode = 'cod' THEN ' (paiement à la livraison)' ELSE '' END,
    jsonb_build_object('order_id', v_order));

  RETURN jsonb_build_object('success', true, 'order_id', v_order, 'total_price', v_total, 'discount', v_discount);
END $$;
REVOKE EXECUTE ON FUNCTION public._place_order(uuid, jsonb) FROM PUBLIC, anon, authenticated;

-- Public entry point for the checkout. Price overrides only come from an accepted offer.
CREATE OR REPLACE FUNCTION public.place_order(p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_offer price_offers; v_p jsonb := p - 'unit_price_override' - 'source' - 'source_id';
BEGIN
  IF COALESCE(p->>'payment_mode','wallet') = 'prefunded' THEN RAISE EXCEPTION 'Invalid payment mode'; END IF;
  IF NULLIF(p->>'offer_id','') IS NOT NULL THEN
    SELECT * INTO v_offer FROM price_offers WHERE id = (p->>'offer_id')::uuid AND buyer_id = auth.uid() FOR UPDATE;
    IF NOT FOUND OR v_offer.status <> 'accepted' OR v_offer.expires_at < now() THEN RAISE EXCEPTION 'Offre non valable'; END IF;
    v_p := v_p || jsonb_build_object('product_id', v_offer.product_id, 'variant_id', v_offer.variant_id, 'quantity', v_offer.quantity,
      'unit_price_override', v_offer.agreed_price, 'source', 'offer', 'source_id', v_offer.id, 'promo_code', NULL);
    UPDATE price_offers SET status = 'used', updated_at = now() WHERE id = v_offer.id;
  END IF;
  RETURN public._place_order(auth.uid(), v_p);
END $$;

-- Keep the old RPC working, now with variants/tiers/vacation checks.
CREATE OR REPLACE FUNCTION public.create_secure_order(p_product_id uuid DEFAULT NULL, p_service_id uuid DEFAULT NULL, p_quantity integer DEFAULT 1,
  p_shipping_address text DEFAULT '', p_notes text DEFAULT NULL, p_payment_method text DEFAULT 'tmoney', p_phone text DEFAULT NULL, p_promo_code text DEFAULT NULL)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT public._place_order(auth.uid(), jsonb_build_object('product_id', p_product_id, 'service_id', p_service_id, 'quantity', p_quantity,
    'shipping_address', p_shipping_address, 'notes', p_notes, 'promo_code', p_promo_code, 'payment_mode', 'wallet'))
$$;

-- ───────────────────────── Order guard + cancellation refund ─────────────────────────
CREATE OR REPLACE FUNCTION public.guard_order_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('authenticated','anon') THEN RETURN NEW; END IF;  -- server functions
  IF NEW.buyer_id IS DISTINCT FROM OLD.buyer_id OR NEW.seller_id IS DISTINCT FROM OLD.seller_id
     OR NEW.total_price IS DISTINCT FROM OLD.total_price OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
     OR NEW.product_id IS DISTINCT FROM OLD.product_id OR NEW.service_id IS DISTINCT FROM OLD.service_id
     OR NEW.quantity IS DISTINCT FROM OLD.quantity OR NEW.unit_price IS DISTINCT FROM OLD.unit_price
     OR NEW.payment_mode IS DISTINCT FROM OLD.payment_mode OR NEW.variant_id IS DISTINCT FROM OLD.variant_id THEN
    RAISE EXCEPTION 'Ces informations de commande ne peuvent pas être modifiées';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IN ('completed','refunded') THEN
      RAISE EXCEPTION 'Utilisez la confirmation de réception';
    END IF;
    IF OLD.status IN ('completed','cancelled','refunded') THEN RAISE EXCEPTION 'Commande clôturée'; END IF;
    IF auth.uid() = OLD.buyer_id AND NOT public.can_manage_seller(OLD.seller_id) THEN
      IF NEW.status <> 'cancelled' OR OLD.status <> 'pending' THEN
        RAISE EXCEPTION 'Vous pouvez seulement annuler une commande en attente';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_order_update ON public.orders;
CREATE TRIGGER guard_order_update BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.guard_order_update();

CREATE OR REPLACE FUNCTION public.refund_cancelled_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_escrow escrow_transactions;
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    SELECT * INTO v_escrow FROM escrow_transactions WHERE order_id = NEW.id AND status = 'held' FOR UPDATE;
    IF FOUND THEN
      UPDATE escrow_transactions SET status = 'refunded', released_at = now() WHERE id = v_escrow.id;
      INSERT INTO wallets (user_id) VALUES (NEW.buyer_id) ON CONFLICT (user_id) DO NOTHING;
      UPDATE wallets SET balance = balance + v_escrow.total_amount, updated_at = now() WHERE user_id = NEW.buyer_id;
      INSERT INTO wallet_transactions (user_id, type, amount, description, reference_id, status)
      VALUES (NEW.buyer_id, 'refund', v_escrow.total_amount, 'Remboursement commande #' || left(NEW.id::text, 8), NEW.id, 'completed');
      UPDATE orders SET payment_status = 'refunded' WHERE id = NEW.id;
    END IF;
    IF NEW.variant_id IS NOT NULL THEN
      UPDATE product_variants SET stock = stock + NEW.quantity WHERE id = NEW.variant_id;
    ELSIF NEW.product_id IS NOT NULL THEN
      UPDATE products SET stock = stock + NEW.quantity WHERE id = NEW.product_id AND stock IS NOT NULL;
    END IF;
    INSERT INTO notifications (user_id, type, title, message, data)
    SELECT u, 'order', 'Commande annulée', 'La commande #' || left(NEW.id::text, 8) || ' a été annulée' ||
      CASE WHEN v_escrow.id IS NOT NULL THEN ' et remboursée sur le portefeuille.' ELSE '.' END, jsonb_build_object('order_id', NEW.id)
    FROM unnest(ARRAY[NEW.buyer_id, NEW.seller_id]) u;
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS refund_cancelled_order ON public.orders;
CREATE TRIGGER refund_cancelled_order AFTER UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.refund_cancelled_order();

-- ───────────────────────── Cash on delivery (4) / hand-over code ─────────────────────────
-- The seller, a team member or the assigned driver types the buyer's 6-digit code.
CREATE OR REPLACE FUNCTION public.confirm_handover(p_order_id uuid, p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o orders; c order_codes; v_driver uuid; v_comm numeric;
BEGIN
  SELECT * INTO o FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Commande introuvable'; END IF;
  SELECT driver_id INTO v_driver FROM delivery_requests WHERE order_id = p_order_id ORDER BY created_at DESC LIMIT 1;
  IF NOT (public.can_manage_seller(o.seller_id) OR auth.uid() = v_driver
          OR (o.pickup_point_id IS NOT NULL AND to_regclass('public.pickup_points') IS NOT NULL AND public.is_pickup_partner(o.pickup_point_id))) THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;
  SELECT * INTO c FROM order_codes WHERE order_id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pas de code pour cette commande'; END IF;
  IF c.used_at IS NOT NULL THEN RETURN jsonb_build_object('success', true, 'already', true); END IF;
  IF c.attempts >= 5 THEN RAISE EXCEPTION 'Trop d''essais : contactez le support'; END IF;
  IF c.code <> trim(COALESCE(p_code, '')) THEN
    -- Return instead of raising so the attempt counter is kept.
    UPDATE order_codes SET attempts = attempts + 1 WHERE order_id = p_order_id;
    RETURN jsonb_build_object('success', false, 'error', 'Code incorrect', 'attempts_left', 4 - c.attempts);
  END IF;
  UPDATE order_codes SET used_at = now() WHERE order_id = p_order_id;

  IF o.payment_mode = 'cod' THEN
    -- Cash was collected by the seller: order is done; the commission is owed by the seller.
    v_comm := o.total_price - round(o.total_price * 0.9);
    UPDATE orders SET status = 'completed', payment_status = 'paid', delivery_status = 'delivered', actual_delivery = now() WHERE id = o.id;
    UPDATE payments SET status = 'completed' WHERE order_id = o.id;
    INSERT INTO wallets (user_id) VALUES (o.seller_id) ON CONFLICT (user_id) DO NOTHING;
    UPDATE wallets SET balance = balance - v_comm, updated_at = now() WHERE user_id = o.seller_id;
    INSERT INTO wallet_transactions (user_id, type, amount, description, reference_id, status)
    VALUES (o.seller_id, 'commission', -v_comm, 'Commission paiement à la livraison #' || left(o.id::text, 8), o.id, 'completed');
    INSERT INTO escrow_transactions (order_id, payer_id, total_amount, seller_amount, platform_commission, status, released_at)
    VALUES (o.id, o.buyer_id, o.total_price, o.total_price - v_comm, v_comm, 'released', now());
  ELSE
    UPDATE orders SET status = 'shipped', delivery_status = 'delivered', actual_delivery = now() WHERE id = o.id AND status NOT IN ('completed','cancelled');
  END IF;
  INSERT INTO notifications (user_id, type, title, message, data) VALUES (o.buyer_id, 'order', 'Commande remise',
    'La remise de la commande #' || left(o.id::text, 8) || ' est confirmée.' ||
    CASE WHEN o.payment_mode <> 'cod' THEN ' Confirmez la réception pour libérer le paiement.' ELSE '' END, jsonb_build_object('order_id', o.id));
  RETURN jsonb_build_object('success', true);
END $$;

-- Escrow auto-release: buyer did not confirm or open a dispute 7 days after hand-over.
CREATE OR REPLACE FUNCTION public.auto_release_escrow()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; n int := 0;
BEGIN
  FOR r IN SELECT o.id, o.buyer_id FROM orders o
    WHERE o.status = 'shipped' AND o.actual_delivery < now() - interval '7 days'
      AND EXISTS (SELECT 1 FROM escrow_transactions e WHERE e.order_id = o.id AND e.status = 'held')
      AND NOT EXISTS (SELECT 1 FROM disputes d WHERE d.order_id = o.id AND d.status NOT IN ('resolved','closed','rejected'))
  LOOP
    PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', r.buyer_id, 'role', 'authenticated')::text, true);
    PERFORM public.confirm_order_reception(r.id);
    n := n + 1;
  END LOOP;
  PERFORM set_config('request.jwt.claims', '', true);
  RETURN n;
END $$;
REVOKE EXECUTE ON FUNCTION public.auto_release_escrow() FROM PUBLIC, anon, authenticated;

-- ───────────────────────── Direct mobile-money checkout (3) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.pending_checkouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  items jsonb NOT NULL,       -- [{product_id, service_id, variant_id, quantity, offer_id}]
  common jsonb NOT NULL DEFAULT '{}'::jsonb,   -- shipping_address, address_id, notes, promo_code, fulfillment...
  total numeric NOT NULL CHECK (total >= 100),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','partial','failed','expired')),
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pending_checkouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own pending checkouts" ON public.pending_checkouts FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
ALTER TABLE public.fedapay_transactions ADD COLUMN IF NOT EXISTS checkout_id uuid REFERENCES public.pending_checkouts(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.create_pending_checkout(p_items jsonb, p_common jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE it jsonb; v_total numeric := 0; v_unit numeric; v_id uuid; v_offer price_offers;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 30 THEN RAISE EXCEPTION 'Panier invalide'; END IF;
  FOR it IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    IF NULLIF(it->>'offer_id','') IS NOT NULL THEN
      SELECT * INTO v_offer FROM price_offers WHERE id = (it->>'offer_id')::uuid AND buyer_id = auth.uid() AND status = 'accepted' AND expires_at > now();
      IF NOT FOUND THEN RAISE EXCEPTION 'Offre non valable'; END IF;
      v_total := v_total + v_offer.agreed_price * v_offer.quantity;
    ELSIF NULLIF(it->>'product_id','') IS NOT NULL THEN
      v_unit := public.quote_product_price((it->>'product_id')::uuid, NULLIF(it->>'variant_id','')::uuid, COALESCE((it->>'quantity')::int,1));
      IF v_unit IS NULL THEN RAISE EXCEPTION 'Produit introuvable'; END IF;
      v_total := v_total + v_unit * COALESCE((it->>'quantity')::int,1);
    ELSE
      SELECT price INTO v_unit FROM services WHERE id = (it->>'service_id')::uuid AND is_active;
      IF v_unit IS NULL THEN RAISE EXCEPTION 'Service introuvable'; END IF;
      v_total := v_total + v_unit * COALESCE((it->>'quantity')::int,1);
    END IF;
  END LOOP;
  INSERT INTO pending_checkouts (user_id, items, common, total)
  VALUES (auth.uid(), p_items, (p_common - 'payment_mode' - 'unit_price_override' - 'source' - 'source_id'), GREATEST(ceil(v_total), 100))
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('checkout_id', v_id, 'total', GREATEST(ceil(v_total), 100));
END $$;

-- Called by the FedaPay credit once the money is in the wallet.
CREATE OR REPLACE FUNCTION public._finalize_checkout(p_checkout_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pc pending_checkouts; it jsonb; v_res jsonb; v_ok jsonb := '[]'; v_err jsonb := '[]'; v_first boolean := true; v_offer price_offers; v_item jsonb;
BEGIN
  SELECT * INTO pc FROM pending_checkouts WHERE id = p_checkout_id FOR UPDATE;
  IF NOT FOUND OR pc.status <> 'pending' THEN RETURN jsonb_build_object('skipped', true); END IF;
  FOR it IN SELECT * FROM jsonb_array_elements(pc.items) LOOP
    BEGIN
      v_item := pc.common || it || jsonb_build_object('payment_mode', 'wallet');
      IF NOT v_first THEN v_item := v_item - 'promo_code'; END IF;
      IF NULLIF(it->>'offer_id','') IS NOT NULL THEN
        SELECT * INTO v_offer FROM price_offers WHERE id = (it->>'offer_id')::uuid AND buyer_id = pc.user_id AND status = 'accepted' FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION 'Offre non valable'; END IF;
        v_item := v_item || jsonb_build_object('product_id', v_offer.product_id, 'variant_id', v_offer.variant_id, 'quantity', v_offer.quantity,
          'unit_price_override', v_offer.agreed_price, 'source', 'offer', 'source_id', v_offer.id) - 'promo_code';
        UPDATE price_offers SET status = 'used' WHERE id = v_offer.id;
      END IF;
      v_res := public._place_order(pc.user_id, v_item);
      v_ok := v_ok || jsonb_build_array(v_res);
      v_first := false;
    EXCEPTION WHEN OTHERS THEN
      v_err := v_err || jsonb_build_array(jsonb_build_object('item', it, 'error', SQLERRM));
    END;
  END LOOP;
  UPDATE pending_checkouts SET status = CASE WHEN jsonb_array_length(v_err) = 0 THEN 'completed' WHEN jsonb_array_length(v_ok) = 0 THEN 'failed' ELSE 'partial' END,
    result = jsonb_build_object('orders', v_ok, 'errors', v_err) WHERE id = pc.id;
  IF jsonb_array_length(v_ok) > 0 THEN DELETE FROM cart_items WHERE user_id = pc.user_id; END IF;
  IF jsonb_array_length(v_err) > 0 THEN
    INSERT INTO notifications (user_id, type, title, message, data) VALUES (pc.user_id, 'wallet', 'Commande incomplète',
      'Certains articles n''ont pas pu être commandés. Le montant correspondant reste sur votre portefeuille.', jsonb_build_object('checkout_id', pc.id));
  END IF;
  RETURN jsonb_build_object('orders', v_ok, 'errors', v_err);
END $$;
REVOKE EXECUTE ON FUNCTION public._finalize_checkout(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.credit_wallet_from_fedapay(p_fedapay_id bigint, p_status text, p_mode text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.fedapay_transactions; v_checkout jsonb;
BEGIN
  SELECT * INTO t FROM public.fedapay_transactions WHERE fedapay_id = p_fedapay_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown FedaPay transaction %', p_fedapay_id; END IF;
  IF t.credited_at IS NOT NULL THEN RETURN jsonb_build_object('credited', false, 'reason', 'already_credited'); END IF;
  UPDATE public.fedapay_transactions SET status = p_status, mode = COALESCE(p_mode, mode) WHERE id = t.id;
  IF p_status <> 'approved' THEN RETURN jsonb_build_object('credited', false, 'reason', p_status); END IF;

  INSERT INTO public.wallets (user_id) VALUES (t.user_id) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.wallets SET balance = balance + t.amount WHERE user_id = t.user_id;
  INSERT INTO public.wallet_transactions (user_id, type, amount, status, payment_method, reference_id, description, metadata)
  VALUES (t.user_id, 'deposit', t.amount, 'completed', COALESCE(p_mode, 'fedapay'), t.id,
          CASE WHEN t.checkout_id IS NULL THEN 'Recharge FedaPay' ELSE 'Paiement mobile money' END, jsonb_build_object('fedapay_id', p_fedapay_id));
  UPDATE public.fedapay_transactions SET credited_at = now() WHERE id = t.id;

  IF t.checkout_id IS NOT NULL THEN
    v_checkout := public._finalize_checkout(t.checkout_id);
  ELSE
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (t.user_id, 'wallet', 'Recharge confirmée', 'Votre portefeuille a été crédité de ' || t.amount::text || ' FCFA.', jsonb_build_object('fedapay_id', p_fedapay_id));
  END IF;
  RETURN jsonb_build_object('credited', true, 'amount', t.amount, 'user_id', t.user_id, 'checkout', v_checkout);
END $$;
REVOKE EXECUTE ON FUNCTION public.credit_wallet_from_fedapay(bigint, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_wallet_from_fedapay(bigint, text, text) TO service_role;

-- ───────────────────────── Invoices (6) ─────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.invoice_seq;
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  number text NOT NULL UNIQUE,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  amount numeric NOT NULL,
  vat_rate numeric NOT NULL DEFAULT 0,
  vat_amount numeric NOT NULL DEFAULT 0,
  issued_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parties see invoices" ON public.invoices FOR SELECT TO authenticated
  USING ((select auth.uid()) IN (buyer_id, seller_id) OR public.can_manage_seller(seller_id) OR public.has_role((select auth.uid()), 'admin'));

CREATE OR REPLACE FUNCTION public.get_invoice(p_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o orders; i invoices; v_shop shops; v_rate numeric := 0; v_item text; v_buyer profiles; v_seller profiles;
BEGIN
  SELECT * INTO o FROM orders WHERE id = p_order_id;
  IF NOT FOUND OR NOT (auth.uid() = o.buyer_id OR public.can_manage_seller(o.seller_id) OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Facture introuvable';
  END IF;
  IF o.payment_status NOT IN ('paid','refunded') THEN RAISE EXCEPTION 'La facture est disponible après paiement'; END IF;
  SELECT * INTO v_shop FROM shops WHERE owner_id = o.seller_id;
  IF v_shop.vat_number IS NOT NULL AND to_regclass('public.tax_rates') IS NOT NULL THEN
    EXECUTE 'SELECT rate FROM public.tax_rates WHERE country = $1' INTO v_rate USING v_shop.country;
  END IF;
  SELECT * INTO i FROM invoices WHERE order_id = o.id;
  IF NOT FOUND THEN
    INSERT INTO invoices (order_id, number, buyer_id, seller_id, amount, vat_rate, vat_amount)
    VALUES (o.id, 'MY-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('invoice_seq')::text, 6, '0'), o.buyer_id, o.seller_id, o.total_price,
      COALESCE(v_rate, 0), round(o.total_price - o.total_price / (1 + COALESCE(v_rate, 0) / 100)))
    RETURNING * INTO i;
  END IF;
  SELECT COALESCE(pr.title, s.title, 'Article') INTO v_item FROM orders x LEFT JOIN products pr ON pr.id = x.product_id LEFT JOIN services s ON s.id = x.service_id WHERE x.id = o.id;
  SELECT * INTO v_buyer FROM profiles WHERE user_id = o.buyer_id;
  SELECT * INTO v_seller FROM profiles WHERE user_id = o.seller_id;
  RETURN jsonb_build_object('invoice', to_jsonb(i), 'order', to_jsonb(o) - 'delivery_location', 'item', v_item,
    'buyer', jsonb_build_object('name', v_buyer.full_name, 'phone', v_buyer.phone, 'location', v_buyer.location),
    'seller', jsonb_build_object('name', COALESCE(v_shop.name, v_seller.full_name), 'phone', v_seller.phone, 'location', COALESCE(v_shop.city, v_seller.location), 'vat_number', v_shop.vat_number, 'country', v_shop.country));
END $$;

-- ───────────────────────── Savings goals (7) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.savings_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  title text NOT NULL,
  quantity int NOT NULL DEFAULT 1,
  target_amount numeric NOT NULL CHECK (target_amount >= 500),
  saved_amount numeric NOT NULL DEFAULT 0,
  deadline date,
  shipping_address text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own savings" ON public.savings_goals FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION public.create_savings_goal(p_product_id uuid, p_quantity int DEFAULT 1, p_variant_id uuid DEFAULT NULL, p_deadline date DEFAULT NULL, p_shipping_address text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_p products; v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  SELECT * INTO v_p FROM products WHERE id = p_product_id AND is_active AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Produit introuvable'; END IF;
  IF (SELECT count(*) FROM savings_goals WHERE user_id = auth.uid() AND status = 'active') >= 10 THEN RAISE EXCEPTION '10 objectifs actifs maximum'; END IF;
  INSERT INTO savings_goals (user_id, product_id, variant_id, title, quantity, target_amount, deadline, shipping_address)
  VALUES (auth.uid(), p_product_id, p_variant_id, v_p.title, GREATEST(p_quantity,1),
    public.quote_product_price(p_product_id, p_variant_id, GREATEST(p_quantity,1)) * GREATEST(p_quantity,1), p_deadline, p_shipping_address)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.contribute_savings(p_goal_id uuid, p_amount numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g savings_goals; v_amount numeric := round(p_amount); v_price numeric; v_res jsonb; v_extra numeric;
BEGIN
  SELECT * INTO g FROM savings_goals WHERE id = p_goal_id AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND OR g.status <> 'active' THEN RAISE EXCEPTION 'Objectif introuvable'; END IF;
  IF v_amount < 100 THEN RAISE EXCEPTION 'Minimum 100 FCFA'; END IF;
  v_amount := LEAST(v_amount, g.target_amount - g.saved_amount);
  IF v_amount <= 0 THEN RAISE EXCEPTION 'Objectif déjà atteint'; END IF;
  UPDATE wallets SET balance = balance - v_amount, updated_at = now() WHERE user_id = auth.uid() AND balance >= v_amount;
  IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;
  INSERT INTO wallet_transactions (user_id, type, amount, description, reference_id, status)
  VALUES (auth.uid(), 'savings', -v_amount, 'Épargne : ' || g.title, g.id, 'completed');
  UPDATE savings_goals SET saved_amount = saved_amount + v_amount WHERE id = g.id RETURNING * INTO g;

  IF g.saved_amount >= g.target_amount AND g.product_id IS NOT NULL THEN
    v_price := public.quote_product_price(g.product_id, g.variant_id, g.quantity) * g.quantity;
    IF v_price IS NULL OR v_price > g.saved_amount THEN
      UPDATE savings_goals SET target_amount = COALESCE(v_price, target_amount) WHERE id = g.id;
      RETURN jsonb_build_object('success', true, 'completed', false, 'price_changed', true);
    END IF;
    BEGIN
      v_res := public._place_order(auth.uid(), jsonb_build_object('product_id', g.product_id, 'variant_id', g.variant_id, 'quantity', g.quantity,
        'shipping_address', COALESCE(g.shipping_address, ''), 'payment_mode', 'prefunded', 'unit_price_override', v_price / g.quantity,
        'source', 'savings', 'source_id', g.id));
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object('success', true, 'completed', false, 'error', SQLERRM);
    END;
    v_extra := g.saved_amount - v_price;
    IF v_extra > 0 THEN
      UPDATE wallets SET balance = balance + v_extra WHERE user_id = auth.uid();
      INSERT INTO wallet_transactions (user_id, type, amount, description, reference_id, status) VALUES (auth.uid(), 'refund', v_extra, 'Reliquat épargne', g.id, 'completed');
    END IF;
    UPDATE savings_goals SET status = 'completed', order_id = (v_res->>'order_id')::uuid WHERE id = g.id;
    RETURN jsonb_build_object('success', true, 'completed', true, 'order_id', v_res->>'order_id');
  END IF;
  RETURN jsonb_build_object('success', true, 'completed', false, 'saved', g.saved_amount, 'target', g.target_amount);
END $$;

CREATE OR REPLACE FUNCTION public.cancel_savings(p_goal_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g savings_goals;
BEGIN
  SELECT * INTO g FROM savings_goals WHERE id = p_goal_id AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND OR g.status <> 'active' THEN RAISE EXCEPTION 'Objectif introuvable'; END IF;
  IF g.saved_amount > 0 THEN
    UPDATE wallets SET balance = balance + g.saved_amount, updated_at = now() WHERE user_id = auth.uid();
    INSERT INTO wallet_transactions (user_id, type, amount, description, reference_id, status) VALUES (auth.uid(), 'refund', g.saved_amount, 'Épargne annulée : ' || g.title, g.id, 'completed');
  END IF;
  UPDATE savings_goals SET status = 'cancelled' WHERE id = g.id;
END $$;

-- ───────────────────────── Back-in-stock alerts (12) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.stock_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE CASCADE,
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS stock_alerts_unique ON public.stock_alerts(user_id, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid));
ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own stock alerts" ON public.stock_alerts FOR ALL TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION public.notify_back_in_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pid uuid; v_vid uuid; v_title text;
BEGIN
  IF COALESCE(OLD.stock, 0) > 0 OR COALESCE(NEW.stock, 0) <= 0 THEN RETURN NULL; END IF;
  IF TG_TABLE_NAME = 'product_variants' THEN v_pid := NEW.product_id; v_vid := NEW.id; ELSE v_pid := NEW.id; END IF;
  SELECT title INTO v_title FROM products WHERE id = v_pid;
  INSERT INTO notifications (user_id, type, title, message, data)
  SELECT a.user_id, 'stock', 'De retour en stock', '« ' || v_title || ' » est de nouveau disponible.', jsonb_build_object('product_id', v_pid)
  FROM stock_alerts a WHERE a.product_id = v_pid AND a.notified_at IS NULL AND (v_vid IS NULL OR a.variant_id IS NULL OR a.variant_id = v_vid);
  UPDATE stock_alerts SET notified_at = now() WHERE product_id = v_pid AND notified_at IS NULL AND (v_vid IS NULL OR variant_id IS NULL OR variant_id = v_vid);
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS products_back_in_stock ON public.products;
CREATE TRIGGER products_back_in_stock AFTER UPDATE OF stock ON public.products FOR EACH ROW EXECUTE FUNCTION public.notify_back_in_stock();
DROP TRIGGER IF EXISTS variants_back_in_stock ON public.product_variants;
CREATE TRIGGER variants_back_in_stock AFTER UPDATE OF stock ON public.product_variants FOR EACH ROW EXECUTE FUNCTION public.notify_back_in_stock();

-- ───────────────────────── Group buying (13) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.group_buys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_price numeric NOT NULL CHECK (group_price > 0),
  target_qty int NOT NULL CHECK (target_qty BETWEEN 2 AND 10000),
  current_qty int NOT NULL DEFAULT 0,
  deadline timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','succeeded','failed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.group_buys ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS group_buys_product_idx ON public.group_buys(product_id, status);
CREATE POLICY "Group buys are public" ON public.group_buys FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.group_buy_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_buy_id uuid NOT NULL REFERENCES public.group_buys(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quantity int NOT NULL CHECK (quantity BETWEEN 1 AND 100),
  amount_held numeric NOT NULL,
  shipping_address text,
  status text NOT NULL DEFAULT 'held' CHECK (status IN ('held','ordered','refunded')),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_buy_id, user_id)
);
ALTER TABLE public.group_buy_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own participation" ON public.group_buy_participants FOR SELECT TO authenticated USING (
  (select auth.uid()) = user_id OR EXISTS (SELECT 1 FROM public.group_buys g WHERE g.id = group_buy_id AND public.can_manage_seller(g.seller_id)));

CREATE OR REPLACE FUNCTION public.create_group_buy(p_product_id uuid, p_group_price numeric, p_target_qty int, p_days int DEFAULT 7, p_variant_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_p products; v_id uuid;
BEGIN
  SELECT * INTO v_p FROM products WHERE id = p_product_id AND deleted_at IS NULL;
  IF NOT FOUND OR NOT public.can_manage_seller(v_p.seller_id) THEN RAISE EXCEPTION 'Produit introuvable'; END IF;
  IF p_group_price >= v_p.price THEN RAISE EXCEPTION 'Le prix groupé doit être inférieur au prix normal'; END IF;
  IF p_days < 1 OR p_days > 30 THEN RAISE EXCEPTION 'Durée entre 1 et 30 jours'; END IF;
  IF EXISTS (SELECT 1 FROM group_buys WHERE product_id = p_product_id AND status = 'open') THEN RAISE EXCEPTION 'Un achat groupé est déjà ouvert pour ce produit'; END IF;
  INSERT INTO group_buys (product_id, variant_id, seller_id, group_price, target_qty, deadline)
  VALUES (p_product_id, p_variant_id, v_p.seller_id, round(p_group_price), p_target_qty, now() + make_interval(days => p_days))
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public._settle_group_buy(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g group_buys; r group_buy_participants; v_res jsonb;
BEGIN
  SELECT * INTO g FROM group_buys WHERE id = p_id FOR UPDATE;
  IF g.status <> 'open' THEN RETURN; END IF;
  IF g.current_qty >= g.target_qty THEN
    UPDATE group_buys SET status = 'succeeded' WHERE id = g.id;
    FOR r IN SELECT * FROM group_buy_participants WHERE group_buy_id = g.id AND status = 'held' FOR UPDATE LOOP
      BEGIN
        v_res := public._place_order(r.user_id, jsonb_build_object('product_id', g.product_id, 'variant_id', g.variant_id, 'quantity', r.quantity,
          'shipping_address', COALESCE(r.shipping_address, ''), 'payment_mode', 'prefunded', 'unit_price_override', g.group_price,
          'source', 'group_buy', 'source_id', g.id));
        UPDATE group_buy_participants SET status = 'ordered', order_id = (v_res->>'order_id')::uuid WHERE id = r.id;
        INSERT INTO notifications (user_id, type, title, message, data) VALUES (r.user_id, 'group_buy', 'Achat groupé réussi 🎉',
          'Objectif atteint : votre commande est passée au prix de groupe.', jsonb_build_object('order_id', v_res->>'order_id'));
      EXCEPTION WHEN OTHERS THEN
        UPDATE wallets SET balance = balance + r.amount_held WHERE user_id = r.user_id;
        INSERT INTO wallet_transactions (user_id, type, amount, description, reference_id, status) VALUES (r.user_id, 'refund', r.amount_held, 'Achat groupé : remboursement', g.id, 'completed');
        UPDATE group_buy_participants SET status = 'refunded' WHERE id = r.id;
      END;
    END LOOP;
  ELSIF g.deadline < now() THEN
    UPDATE group_buys SET status = 'failed' WHERE id = g.id;
    FOR r IN SELECT * FROM group_buy_participants WHERE group_buy_id = g.id AND status = 'held' FOR UPDATE LOOP
      UPDATE wallets SET balance = balance + r.amount_held WHERE user_id = r.user_id;
      INSERT INTO wallet_transactions (user_id, type, amount, description, reference_id, status) VALUES (r.user_id, 'refund', r.amount_held, 'Achat groupé non atteint : remboursement', g.id, 'completed');
      UPDATE group_buy_participants SET status = 'refunded' WHERE id = r.id;
      INSERT INTO notifications (user_id, type, title, message, data) VALUES (r.user_id, 'group_buy', 'Achat groupé non atteint',
        'L''objectif n''a pas été atteint : ' || r.amount_held::text || ' FCFA sont revenus sur votre portefeuille.', jsonb_build_object('group_buy_id', g.id));
    END LOOP;
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public._settle_group_buy(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.join_group_buy(p_id uuid, p_quantity int DEFAULT 1, p_shipping_address text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g group_buys; v_amount numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  SELECT * INTO g FROM group_buys WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR g.status <> 'open' OR g.deadline < now() THEN RAISE EXCEPTION 'Achat groupé fermé'; END IF;
  IF g.seller_id = auth.uid() THEN RAISE EXCEPTION 'Vous êtes le vendeur'; END IF;
  IF EXISTS (SELECT 1 FROM group_buy_participants WHERE group_buy_id = p_id AND user_id = auth.uid()) THEN RAISE EXCEPTION 'Vous participez déjà'; END IF;
  v_amount := g.group_price * p_quantity;
  UPDATE wallets SET balance = balance - v_amount, updated_at = now() WHERE user_id = auth.uid() AND balance >= v_amount;
  IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;
  INSERT INTO wallet_transactions (user_id, type, amount, description, reference_id, status) VALUES (auth.uid(), 'group_buy', -v_amount, 'Achat groupé (montant bloqué)', g.id, 'completed');
  INSERT INTO group_buy_participants (group_buy_id, user_id, quantity, amount_held, shipping_address) VALUES (p_id, auth.uid(), p_quantity, v_amount, p_shipping_address);
  UPDATE group_buys SET current_qty = current_qty + p_quantity WHERE id = p_id;
  PERFORM public._settle_group_buy(p_id);
  RETURN jsonb_build_object('success', true);
END $$;

CREATE OR REPLACE FUNCTION public.leave_group_buy(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r group_buy_participants;
BEGIN
  SELECT * INTO r FROM group_buy_participants WHERE group_buy_id = p_id AND user_id = auth.uid() AND status = 'held' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Participation introuvable'; END IF;
  UPDATE wallets SET balance = balance + r.amount_held WHERE user_id = auth.uid();
  INSERT INTO wallet_transactions (user_id, type, amount, description, reference_id, status) VALUES (auth.uid(), 'refund', r.amount_held, 'Achat groupé quitté', p_id, 'completed');
  UPDATE group_buys SET current_qty = current_qty - r.quantity WHERE id = p_id;
  DELETE FROM group_buy_participants WHERE id = r.id;
END $$;

CREATE OR REPLACE FUNCTION public.process_group_buys()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; n int := 0;
BEGIN
  FOR r IN SELECT id FROM group_buys WHERE status = 'open' AND deadline < now() LOOP
    PERFORM public._settle_group_buy(r.id); n := n + 1;
  END LOOP;
  UPDATE price_offers SET status = 'expired' WHERE status IN ('pending','countered','accepted') AND expires_at < now();
  UPDATE pending_checkouts SET status = 'expired' WHERE status = 'pending' AND created_at < now() - interval '2 days';
  RETURN n;
END $$;
REVOKE EXECUTE ON FUNCTION public.process_group_buys() FROM PUBLIC, anon, authenticated;

-- ───────────────────────── Views + recommendations (17) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.product_views (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text,
  viewed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS product_views_product_idx ON public.product_views(product_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS product_views_user_idx ON public.product_views(user_id, viewed_at DESC);
CREATE POLICY "Own views" ON public.product_views FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION public.track_product_view(p_product_id uuid, p_session text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL AND (p_session IS NULL OR char_length(p_session) > 64) THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM product_views WHERE product_id = p_product_id AND viewed_at > now() - interval '30 minutes'
             AND ((auth.uid() IS NOT NULL AND user_id = auth.uid()) OR (auth.uid() IS NULL AND session_id = p_session))) THEN RETURN; END IF;
  INSERT INTO product_views (product_id, user_id, session_id) VALUES (p_product_id, auth.uid(), CASE WHEN auth.uid() IS NULL THEN p_session END);
END $$;
GRANT EXECUTE ON FUNCTION public.track_product_view(uuid, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_recommendations(p_limit int DEFAULT 12, p_exclude uuid DEFAULT NULL)
RETURNS SETOF public.products LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH interest AS (
    SELECT p.category_id, count(*) w FROM (
      SELECT product_id FROM product_views WHERE user_id = auth.uid() AND viewed_at > now() - interval '60 days'
      UNION ALL SELECT product_id FROM favorites WHERE user_id = auth.uid() AND product_id IS NOT NULL
      UNION ALL SELECT product_id FROM orders WHERE buyer_id = auth.uid() AND product_id IS NOT NULL
    ) x JOIN products p ON p.id = x.product_id GROUP BY p.category_id
  ), popular AS (
    SELECT product_id, count(*) c FROM product_views WHERE viewed_at > now() - interval '30 days' GROUP BY product_id
  )
  SELECT p.* FROM products p
  LEFT JOIN interest i ON i.category_id = p.category_id
  LEFT JOIN popular pop ON pop.product_id = p.id
  WHERE p.is_active AND p.deleted_at IS NULL AND (p.stock IS NULL OR p.stock > 0)
    AND p.seller_id IS DISTINCT FROM auth.uid() AND p.id IS DISTINCT FROM p_exclude
    AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.buyer_id = auth.uid() AND o.product_id = p.id)
  ORDER BY COALESCE(i.w, 0) DESC, COALESCE(pop.c, 0) DESC, p.created_at DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 48)
$$;
GRANT EXECUTE ON FUNCTION public.get_recommendations(int, uuid) TO anon, authenticated;

-- ───────────────────────── Seller statistics (20) ─────────────────────────
CREATE OR REPLACE FUNCTION public.get_seller_stats(p_days int DEFAULT 30, p_seller uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_seller uuid := COALESCE(p_seller, auth.uid()); v_from timestamptz := now() - make_interval(days => LEAST(GREATEST(p_days,1),365));
BEGIN
  IF NOT public.can_manage_seller(v_seller) AND NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Non autorisé'; END IF;
  RETURN jsonb_build_object(
    'views', (SELECT count(*) FROM product_views v JOIN products p ON p.id = v.product_id WHERE p.seller_id = v_seller AND v.viewed_at >= v_from),
    'visitors', (SELECT count(DISTINCT COALESCE(v.user_id::text, v.session_id)) FROM product_views v JOIN products p ON p.id = v.product_id WHERE p.seller_id = v_seller AND v.viewed_at >= v_from),
    'orders', (SELECT count(*) FROM orders WHERE seller_id = v_seller AND created_at >= v_from AND status <> 'cancelled'),
    'revenue', (SELECT COALESCE(sum(total_price),0) FROM orders WHERE seller_id = v_seller AND created_at >= v_from AND status <> 'cancelled' AND payment_status IN ('paid','cod_pending')),
    'buyers', (SELECT count(DISTINCT buyer_id) FROM orders WHERE seller_id = v_seller AND created_at >= v_from AND status <> 'cancelled'),
    'daily', COALESCE((SELECT jsonb_agg(d ORDER BY d->>'day') FROM (
      SELECT jsonb_build_object('day', day::date, 'views', (SELECT count(*) FROM product_views v JOIN products p ON p.id = v.product_id WHERE p.seller_id = v_seller AND v.viewed_at::date = day::date),
        'orders', (SELECT count(*) FROM orders WHERE seller_id = v_seller AND created_at::date = day::date AND status <> 'cancelled'),
        'revenue', (SELECT COALESCE(sum(total_price),0) FROM orders WHERE seller_id = v_seller AND created_at::date = day::date AND status <> 'cancelled')) d
      FROM generate_series(v_from::date, current_date, '1 day') day) s), '[]'),
    'top_products', COALESCE((SELECT jsonb_agg(t) FROM (
      SELECT p.id, p.title, p.price, p.stock,
        (SELECT count(*) FROM product_views v WHERE v.product_id = p.id AND v.viewed_at >= v_from) views,
        (SELECT count(*) FROM orders o WHERE o.product_id = p.id AND o.created_at >= v_from AND o.status <> 'cancelled') orders,
        (SELECT COALESCE(sum(total_price),0) FROM orders o WHERE o.product_id = p.id AND o.created_at >= v_from AND o.status <> 'cancelled') revenue
      FROM products p WHERE p.seller_id = v_seller AND p.deleted_at IS NULL ORDER BY revenue DESC, views DESC LIMIT 10) t), '[]'));
END $$;

-- ───────────────────────── Bulk import (19) ─────────────────────────
CREATE OR REPLACE FUNCTION public.bulk_import_products(p_rows jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb; i int := 0; v_ok int := 0; v_err jsonb := '[]'; v_cat uuid; v_price numeric; v_stock int; v_imgs text[];
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  IF jsonb_typeof(p_rows) <> 'array' OR jsonb_array_length(p_rows) > 500 THEN RAISE EXCEPTION '500 lignes maximum par import'; END IF;
  FOR r IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    i := i + 1;
    BEGIN
      IF char_length(trim(COALESCE(r->>'title',''))) < 3 THEN RAISE EXCEPTION 'titre manquant'; END IF;
      v_price := replace(replace(COALESCE(r->>'price',''), ' ', ''), ',', '.')::numeric;
      IF v_price IS NULL OR v_price < 0 THEN RAISE EXCEPTION 'prix invalide'; END IF;
      v_stock := NULLIF(trim(COALESCE(r->>'stock','')), '')::int;
      SELECT id INTO v_cat FROM categories WHERE type = 'product' AND (slug = lower(trim(r->>'category')) OR lower(name) = lower(trim(r->>'category'))) LIMIT 1;
      v_imgs := CASE WHEN COALESCE(r->>'images','') = '' THEN NULL ELSE
        ARRAY(SELECT trim(x) FROM unnest(string_to_array(r->>'images', '|')) x WHERE trim(x) ~ '^https://') END;
      INSERT INTO products (seller_id, title, description, price, stock, category_id, location, images, is_active)
      VALUES (auth.uid(), left(trim(r->>'title'), 150), left(r->>'description', 5000), v_price, COALESCE(v_stock, 0), v_cat,
        NULLIF(trim(COALESCE(r->>'location','')), ''), v_imgs, true);
      v_ok := v_ok + 1;
    EXCEPTION WHEN OTHERS THEN
      v_err := v_err || jsonb_build_array(jsonb_build_object('line', i + 1, 'error', SQLERRM));
    END;
  END LOOP;
  RETURN jsonb_build_object('imported', v_ok, 'errors', v_err);
END $$;

-- ───────────────────────── Platform revenue (8) ─────────────────────────
CREATE OR REPLACE FUNCTION public.get_platform_revenue(p_days int DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_from timestamptz := now() - make_interval(days => LEAST(GREATEST(p_days,1),730));
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accès admin requis'; END IF;
  RETURN jsonb_build_object(
    'commission_released', (SELECT COALESCE(sum(platform_commission),0) FROM escrow_transactions WHERE status = 'released' AND COALESCE(released_at, created_at) >= v_from),
    'commission_pending', (SELECT COALESCE(sum(platform_commission),0) FROM escrow_transactions WHERE status = 'held'),
    'delivery_commission', (SELECT COALESCE(sum(commission),0) FROM delivery_requests WHERE status = 'delivered' AND created_at >= v_from),
    'boosts', (SELECT COALESCE(sum(price_paid),0) FROM boosts WHERE created_at >= v_from),
    'gmv', (SELECT COALESCE(sum(total_price),0) FROM orders WHERE created_at >= v_from AND status <> 'cancelled'),
    'orders', (SELECT count(*) FROM orders WHERE created_at >= v_from AND status <> 'cancelled'),
    'escrow_held', (SELECT COALESCE(sum(total_amount),0) FROM escrow_transactions WHERE status = 'held'),
    'wallets_total', (SELECT COALESCE(sum(balance),0) FROM wallets),
    'topups', (SELECT COALESCE(sum(amount),0) FROM fedapay_transactions WHERE credited_at >= v_from),
    'daily', COALESCE((SELECT jsonb_agg(jsonb_build_object('day', day::date,
        'commission', (SELECT COALESCE(sum(platform_commission),0) FROM escrow_transactions WHERE status = 'released' AND COALESCE(released_at, created_at)::date = day::date),
        'boosts', (SELECT COALESCE(sum(price_paid),0) FROM boosts WHERE created_at::date = day::date),
        'gmv', (SELECT COALESCE(sum(total_price),0) FROM orders WHERE created_at::date = day::date AND status <> 'cancelled')) ORDER BY day)
      FROM generate_series(v_from::date, current_date, '1 day') day), '[]'),
    'top_sellers', COALESCE((SELECT jsonb_agg(t) FROM (
      SELECT o.seller_id, pr.full_name, sum(o.total_price) gmv, count(*) orders FROM orders o LEFT JOIN profiles pr ON pr.user_id = o.seller_id
      WHERE o.created_at >= v_from AND o.status <> 'cancelled' GROUP BY o.seller_id, pr.full_name ORDER BY gmv DESC LIMIT 10) t), '[]'));
END $$;

-- ───────────────────────── Schedules ─────────────────────────
SELECT cron.schedule('miyashi-group-buys', '7 * * * *', $$SELECT public.process_group_buys()$$);
SELECT cron.schedule('miyashi-escrow-auto-release', '41 3 * * *', $$SELECT public.auto_release_escrow()$$);

-- Functions that must not be called anonymously.
DO $$ DECLARE f text; BEGIN
  FOREACH f IN ARRAY ARRAY['can_manage_seller(uuid)','invite_shop_member(text,text)','accept_shop_invite(uuid)','update_shop_member_role(uuid,text)',
    'make_offer(uuid,numeric,int,uuid,text)','respond_offer(uuid,text,numeric)','place_order(jsonb)','confirm_handover(uuid,text)',
    'create_pending_checkout(jsonb,jsonb)','get_invoice(uuid)','create_savings_goal(uuid,int,uuid,date,text)','contribute_savings(uuid,numeric)',
    'cancel_savings(uuid)','create_group_buy(uuid,numeric,int,int,uuid)','join_group_buy(uuid,int,text)','leave_group_buy(uuid)',
    'get_seller_stats(int,uuid)','bulk_import_products(jsonb)','get_platform_revenue(int)'] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', f);
  END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION public.quote_product_price(uuid, uuid, int) TO anon, authenticated;
