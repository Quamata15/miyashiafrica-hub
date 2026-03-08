
-- 1. Atomic promo code validation + increment
CREATE OR REPLACE FUNCTION public.validate_and_use_promo(p_code text, p_order_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_promo RECORD;
  v_discount numeric;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Lock the row to prevent race conditions
  SELECT * INTO v_promo
  FROM promo_codes
  WHERE code = upper(trim(p_code))
    AND is_active = true
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Code invalide ou expiré');
  END IF;

  IF v_promo.max_uses IS NOT NULL AND v_promo.used_count >= v_promo.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'Code promo épuisé');
  END IF;

  IF v_promo.min_order_amount IS NOT NULL AND p_order_amount < v_promo.min_order_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Montant minimum non atteint: ' || v_promo.min_order_amount || ' FCFA');
  END IF;

  -- Atomically increment
  UPDATE promo_codes SET used_count = used_count + 1 WHERE id = v_promo.id;

  -- Calculate discount
  IF v_promo.discount_type = 'percentage' THEN
    v_discount := LEAST(p_order_amount, round(p_order_amount * v_promo.discount_value / 100));
  ELSE
    v_discount := LEAST(p_order_amount, v_promo.discount_value);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'promo_id', v_promo.id,
    'code', v_promo.code,
    'discount_type', v_promo.discount_type,
    'discount_value', v_promo.discount_value,
    'discount_amount', v_discount,
    'seller_id', v_promo.seller_id
  );
END;
$$;

-- 2. Server-side order creation with price verification
CREATE OR REPLACE FUNCTION public.create_secure_order(
  p_product_id uuid DEFAULT NULL,
  p_service_id uuid DEFAULT NULL,
  p_quantity integer DEFAULT 1,
  p_shipping_address text DEFAULT '',
  p_notes text DEFAULT NULL,
  p_payment_method text DEFAULT 'tmoney',
  p_phone text DEFAULT NULL,
  p_promo_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_buyer_id uuid := auth.uid();
  v_seller_id uuid;
  v_unit_price numeric;
  v_total_price numeric;
  v_discount numeric := 0;
  v_promo_result jsonb;
  v_order_id uuid;
  v_stock integer;
BEGIN
  IF v_buyer_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_quantity < 1 OR p_quantity > 1000 THEN
    RAISE EXCEPTION 'Invalid quantity';
  END IF;

  -- Determine price and seller from DB (not client)
  IF p_product_id IS NOT NULL THEN
    SELECT seller_id, price, stock INTO v_seller_id, v_unit_price, v_stock
    FROM products
    WHERE id = p_product_id AND is_active = true AND deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product not found or inactive';
    END IF;

    IF v_stock IS NOT NULL AND v_stock < p_quantity THEN
      RAISE EXCEPTION 'Insufficient stock';
    END IF;

    -- Decrement stock
    IF v_stock IS NOT NULL THEN
      UPDATE products SET stock = stock - p_quantity WHERE id = p_product_id;
    END IF;

  ELSIF p_service_id IS NOT NULL THEN
    SELECT provider_id, price INTO v_seller_id, v_unit_price
    FROM services
    WHERE id = p_service_id AND is_active = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Service not found or inactive';
    END IF;

    IF v_unit_price IS NULL THEN
      RAISE EXCEPTION 'Service price not set';
    END IF;
  ELSE
    RAISE EXCEPTION 'Product or service ID required';
  END IF;

  -- Buyer cannot buy own product/service
  IF v_seller_id = v_buyer_id THEN
    RAISE EXCEPTION 'Cannot buy your own item';
  END IF;

  v_total_price := v_unit_price * p_quantity;

  -- Apply promo code if provided
  IF p_promo_code IS NOT NULL AND p_promo_code != '' THEN
    v_promo_result := validate_and_use_promo(p_promo_code, v_total_price);
    IF (v_promo_result->>'success')::boolean THEN
      v_discount := (v_promo_result->>'discount_amount')::numeric;
    END IF;
  END IF;

  v_total_price := v_total_price - v_discount;
  IF v_total_price < 0 THEN v_total_price := 0; END IF;

  -- Create order
  INSERT INTO orders (buyer_id, seller_id, product_id, service_id, quantity, total_price, status, payment_status, shipping_address, notes)
  VALUES (v_buyer_id, v_seller_id, p_product_id, p_service_id, p_quantity, v_total_price, 'pending', 'paid', p_shipping_address,
    CASE WHEN p_promo_code IS NOT NULL THEN COALESCE(p_notes, '') || ' [Promo: ' || p_promo_code || ']' ELSE p_notes END)
  RETURNING id INTO v_order_id;

  -- Create payment record
  INSERT INTO payments (order_id, payer_id, amount, payment_method, status, metadata)
  VALUES (v_order_id, v_buyer_id, v_total_price, p_payment_method, 'completed',
    jsonb_build_object('phone', p_phone, 'promo_code', p_promo_code, 'discount', v_discount));

  -- Create escrow
  INSERT INTO escrow_transactions (order_id, payer_id, total_amount, seller_amount, platform_commission, status)
  VALUES (v_order_id, v_buyer_id, v_total_price, v_total_price * 0.9, v_total_price * 0.1, 'held');

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'total_price', v_total_price,
    'discount', v_discount
  );
END;
$$;
