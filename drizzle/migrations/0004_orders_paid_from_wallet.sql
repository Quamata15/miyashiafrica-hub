CREATE OR REPLACE FUNCTION public.create_secure_order(p_product_id uuid DEFAULT NULL::uuid, p_service_id uuid DEFAULT NULL::uuid, p_quantity integer DEFAULT 1, p_shipping_address text DEFAULT ''::text, p_notes text DEFAULT NULL::text, p_payment_method text DEFAULT 'tmoney'::text, p_phone text DEFAULT NULL::text, p_promo_code text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  IF p_product_id IS NOT NULL THEN
    SELECT seller_id, price, stock INTO v_seller_id, v_unit_price, v_stock
    FROM products
    WHERE id = p_product_id AND is_active = true AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product not found or inactive';
    END IF;

    IF v_stock IS NOT NULL AND v_stock < p_quantity THEN
      RAISE EXCEPTION 'Insufficient stock';
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

  IF v_seller_id = v_buyer_id THEN
    RAISE EXCEPTION 'Cannot buy your own item';
  END IF;

  v_total_price := v_unit_price * p_quantity;

  IF p_promo_code IS NOT NULL AND p_promo_code != '' THEN
    v_promo_result := validate_and_use_promo(p_promo_code, v_total_price);
    IF (v_promo_result->>'success')::boolean THEN
      v_discount := (v_promo_result->>'discount_amount')::numeric;
    END IF;
  END IF;

  v_total_price := v_total_price - v_discount;
  IF v_total_price < 0 THEN v_total_price := 0; END IF;

  -- Real payment: debit the buyer's wallet (fails the whole order if insufficient)
  IF v_total_price > 0 THEN
    UPDATE wallets
    SET balance = balance - v_total_price, updated_at = now()
    WHERE user_id = v_buyer_id AND balance >= v_total_price;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Insufficient wallet balance';
    END IF;
  END IF;

  IF p_product_id IS NOT NULL AND v_stock IS NOT NULL THEN
    UPDATE products SET stock = stock - p_quantity WHERE id = p_product_id;
  END IF;

  INSERT INTO orders (buyer_id, seller_id, product_id, service_id, quantity, total_price, status, payment_status, shipping_address, notes)
  VALUES (v_buyer_id, v_seller_id, p_product_id, p_service_id, p_quantity, v_total_price, 'pending', 'paid', p_shipping_address,
    CASE WHEN p_promo_code IS NOT NULL THEN COALESCE(p_notes, '') || ' [Promo: ' || p_promo_code || ']' ELSE p_notes END)
  RETURNING id INTO v_order_id;

  INSERT INTO wallet_transactions (user_id, type, amount, description, reference_id, payment_method, status)
  VALUES (v_buyer_id, 'purchase', -v_total_price, 'Achat commande #' || left(v_order_id::text, 8), v_order_id, 'wallet', 'completed');

  INSERT INTO payments (order_id, payer_id, amount, payment_method, status, metadata)
  VALUES (v_order_id, v_buyer_id, v_total_price, 'wallet', 'completed',
    jsonb_build_object('promo_code', p_promo_code, 'discount', v_discount));

  INSERT INTO escrow_transactions (order_id, payer_id, total_amount, seller_amount, platform_commission, status)
  VALUES (v_order_id, v_buyer_id, v_total_price, v_total_price * 0.9, v_total_price * 0.1, 'held');

  RETURN jsonb_build_object('success', true, 'order_id', v_order_id, 'total_price', v_total_price, 'discount', v_discount);
END;
$function$;