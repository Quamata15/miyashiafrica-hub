-- Delivery and cash on delivery, savings plans, contact guard, service requests, guests,
-- featured flags, KYC, proximity and rankings.
-- One transaction, always rolled back by the final RAISE. Any "=NO" in the result is a failure.
DO $$
DECLARE sel uuid := gen_random_uuid(); bu uuid := gen_random_uuid(); dr uuid := gen_random_uuid(); pv uuid := gen_random_uuid();
  gu uuid := gen_random_uuid(); adm uuid; pr uuid; o uuid; o2 uuid; r jsonb; d uuid; g uuid; sv uuid; q uuid; n int; v numeric; msg text; log text := ''; hcode text;
BEGIN
  INSERT INTO auth.users (id, email, instance_id, aud, role, created_at, is_anonymous) VALUES
    (sel, 'l2s_t@x.test', '00000000-0000-0000-0000-000000000000','authenticated','authenticated', now(), false),
    (bu,  'l2b_t@x.test', '00000000-0000-0000-0000-000000000000','authenticated','authenticated', now(), false),
    (dr,  'l2d_t@x.test', '00000000-0000-0000-0000-000000000000','authenticated','authenticated', now(), false),
    (pv,  'l2p_t@x.test', '00000000-0000-0000-0000-000000000000','authenticated','authenticated', now(), false),
    (gu,  NULL,           '00000000-0000-0000-0000-000000000000','authenticated','authenticated', now(), true);
  SELECT user_id INTO adm FROM user_roles WHERE role = 'admin' LIMIT 1;
  INSERT INTO user_roles (user_id, role) VALUES (sel, 'seller'), (pv, 'provider');
  UPDATE profiles SET location = 'Lomé, Togo' WHERE user_id IN (sel, bu, dr, pv);
  INSERT INTO shops (owner_id, slug, name, city, accepts_cod) VALUES (sel, 'l2-shop', 'Boutique test', 'Lomé', true);
  INSERT INTO products (seller_id, title, price, stock, is_active, location) VALUES (sel, 'Pagne test', 10000, 5, true, 'Lomé') RETURNING id INTO pr;
  UPDATE wallets SET balance = 100000 WHERE user_id IN (bu, dr);

  -- A seller may also be a driver
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', sel, 'role','authenticated')::text, true);
  BEGIN PERFORM register_driver('Lomé', 'moto'); log := log || ' seller_driver=ok';
  EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS msg = MESSAGE_TEXT; log := log || ' seller_driver=NO(' || msg || ')'; END;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', dr, 'role','authenticated')::text, true);
  PERFORM register_driver('Lomé', 'moto');
  UPDATE driver_profiles SET is_available = true WHERE user_id IN (dr, sel);

  -- Cash on delivery: no payment first, the chosen driver may refuse, another accepts
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', bu, 'role','authenticated')::text, true);
  r := place_order(jsonb_build_object('product_id', pr, 'quantity', 1, 'payment_mode', 'cod', 'shipping_address', 'Bè, Lomé'));
  o := (r->>'order_id')::uuid;
  SELECT balance INTO v FROM wallets WHERE user_id = bu; log := log || ' cod_no_payment=' || CASE WHEN v = 100000 THEN 'ok' ELSE 'NO' END;
  r := request_driver(o, dr, 'moto');
  d := (r->>'delivery_id')::uuid;
  log := log || ' cash_to_collect=' || CASE WHEN (r->>'cash_to_collect')::numeric > 10000 THEN 'ok' ELSE 'NO' END;
  log := log || ' estimate_in_city=' || CASE WHEN (r->>'distance_km')::numeric BETWEEN 3 AND 10 THEN 'ok' ELSE 'NO(' || (r->>'distance_km') || ')' END;
  BEGIN PERFORM request_driver(o, sel, 'moto'); log := log || ' one_ride=NO'; EXCEPTION WHEN OTHERS THEN log := log || ' one_ride=ok'; END;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', dr, 'role','authenticated')::text, true);
  PERFORM decline_delivery(d, 'pas d''espèces');
  log := log || ' declined=' || CASE WHEN (SELECT status FROM delivery_requests WHERE id = d) = 'declined' THEN 'ok' ELSE 'NO' END;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', bu, 'role','authenticated')::text, true);
  r := request_driver(o, NULL, 'moto'); d := (r->>'delivery_id')::uuid;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', dr, 'role','authenticated')::text, true);
  r := accept_delivery(d);
  SELECT oc.code INTO hcode FROM order_codes oc WHERE oc.order_id = o;
  r := confirm_handover(o, hcode);
  log := log || ' cod_done=' || CASE WHEN (SELECT status FROM orders WHERE id = o) = 'completed' THEN 'ok' ELSE 'NO' END;
  SELECT balance INTO v FROM wallets WHERE user_id = sel; log := log || ' seller_paid=' || CASE WHEN v = 9000 THEN 'ok' ELSE 'NO(' || v || ')' END;
  SELECT commission_balance INTO v FROM driver_profiles WHERE user_id = dr; log := log || ' driver_owes=' || CASE WHEN v > 10000 THEN 'ok' ELSE 'NO(' || v || ')' END;
  r := settle_driver_cash(NULL);
  SELECT commission_balance INTO v FROM driver_profiles WHERE user_id = dr; log := log || ' settled=' || CASE WHEN v = 0 THEN 'ok' ELSE 'NO' END;

  -- Prepaid order: the delivery fee is held, refunded if the request is cancelled
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', bu, 'role','authenticated')::text, true);
  r := place_order(jsonb_build_object('product_id', pr, 'quantity', 1, 'payment_mode', 'wallet', 'shipping_address', 'Bè, Lomé'));
  o2 := (r->>'order_id')::uuid;
  SELECT balance INTO v FROM wallets WHERE user_id = bu;
  r := request_driver(o2, NULL, 'moto'); d := (r->>'delivery_id')::uuid;
  log := log || ' fee_held=' || CASE WHEN (SELECT balance FROM wallets WHERE user_id = bu) = v - (r->>'price')::numeric THEN 'ok' ELSE 'NO' END;
  PERFORM cancel_delivery_request(d);
  log := log || ' fee_refunded=' || CASE WHEN (SELECT balance FROM wallets WHERE user_id = bu) = v THEN 'ok' ELSE 'NO' END;
  -- The seller can deliver their own order (code still required)
  r := request_driver(o2, sel, 'moto'); d := (r->>'delivery_id')::uuid;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', sel, 'role','authenticated')::text, true);
  BEGIN PERFORM accept_delivery(d); log := log || ' seller_self_delivery=ok';
  EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS msg = MESSAGE_TEXT; log := log || ' seller_self_delivery=NO(' || msg || ')'; END;

  -- Savings: seller accepts and holds the items; instalments; full amount places the order
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', bu, 'role','authenticated')::text, true);
  UPDATE products SET stock = 5 WHERE id = pr;
  BEGIN PERFORM create_savings_plan(pr, 2, NULL, 'installments', 6); log := log || ' six_installments=NO'; EXCEPTION WHEN OTHERS THEN log := log || ' six_installments=ok'; END;
  g := create_savings_plan(pr, 2, NULL, 'installments', 2, 60);
  BEGIN PERFORM contribute_savings(g, 10000); log := log || ' pay_before_accept=NO'; EXCEPTION WHEN OTHERS THEN log := log || ' pay_before_accept=ok'; END;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', sel, 'role','authenticated')::text, true);
  r := respond_savings_plan(g, true);
  log := log || ' reserved=' || CASE WHEN (SELECT stock FROM products WHERE id = pr) = 3 THEN 'ok' ELSE 'NO' END;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', bu, 'role','authenticated')::text, true);
  BEGIN PERFORM contribute_savings(g, 1000); log := log || ' min_installment=NO'; EXCEPTION WHEN OTHERS THEN log := log || ' min_installment=ok'; END;
  r := contribute_savings(g, 10000);
  r := contribute_savings(g, 10000);
  log := log || ' savings_order=' || CASE WHEN (r->>'completed')::boolean AND (SELECT status FROM savings_goals WHERE id = g) = 'completed' THEN 'ok' ELSE 'NO(' || r::text || ')' END;
  log := log || ' stock_after=' || CASE WHEN (SELECT stock FROM products WHERE id = pr) = 3 THEN 'ok' ELSE 'NO(' || (SELECT stock FROM products WHERE id = pr) || ')' END;
  -- Refused plan, and cancelled plan frees the items
  g := create_savings_plan(pr, 1, NULL, 'free', NULL, 30);
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', sel, 'role','authenticated')::text, true);
  r := respond_savings_plan(g, true);
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', bu, 'role','authenticated')::text, true);
  PERFORM cancel_savings(g);
  log := log || ' freed=' || CASE WHEN (SELECT stock FROM products WHERE id = pr) = 3 THEN 'ok' ELSE 'NO' END;

  -- Contact details: masked in messages, refused in listings
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', bu, 'role','authenticated')::text, true);
  INSERT INTO conversations (participant_1, participant_2) VALUES (bu, sel) RETURNING id INTO q;
  SET LOCAL ROLE authenticated;
  INSERT INTO messages (conversation_id, sender_id, receiver_id, content) VALUES (q, bu, sel, 'Appelle-moi au 90 12 34 56 ou wa.me/22890123456');
  RESET ROLE;
  log := log || ' masked=' || CASE WHEN (SELECT content FROM messages WHERE conversation_id = q ORDER BY created_at DESC LIMIT 1) NOT LIKE '%90 12%' THEN 'ok' ELSE 'NO' END;
  log := log || ' recorded=' || CASE WHEN EXISTS (SELECT 1 FROM contact_violations WHERE user_id = bu) THEN 'ok' ELSE 'NO' END;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', sel, 'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN INSERT INTO products (seller_id, title, description, price, stock) VALUES (sel, 'Sac', 'Contact : vendeur@gmail.com', 5000, 1); log := log || ' listing_refused=NO';
  EXCEPTION WHEN OTHERS THEN log := log || ' listing_refused=ok'; END;
  INSERT INTO products (seller_id, title, description, price, stock) VALUES (sel, 'Sac en raphia', 'Prix 15 000 000 FCFA pour le lot', 5000, 1);
  log := log || ' price_ok=ok';
  RESET ROLE;

  -- Service request: no price needed, conversation opened, quote with terms, escrow on acceptance
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', pv, 'role','authenticated')::text, true);
  INSERT INTO services (provider_id, title, price, price_type, is_active) VALUES (pv, 'Électricité à domicile', NULL, 'negotiable', true) RETURNING id INTO sv;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', bu, 'role','authenticated')::text, true);
  r := request_service(sv, 'Installer 4 prises et un tableau électrique', true, 'Bè, Lomé', current_date + 3, 40000);
  log := log || ' request_msg=' || CASE WHEN EXISTS (SELECT 1 FROM messages WHERE conversation_id = (r->>'conversation_id')::uuid AND message_type = 'service_request') THEN 'ok' ELSE 'NO' END;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', pv, 'role','authenticated')::text, true);
  q := send_quote(bu, 'Installation électrique', '[{"label":"Main d''oeuvre","qty":1,"unit_price":30000},{"label":"Matériel","qty":1,"unit_price":15000}]'::jsonb,
    NULL, NULL, 15, 'Matériel fourni, garantie 3 mois', current_date + 3, 2, true, 'Bè, Lomé', (r->>'request_id')::uuid);
  log := log || ' quoted=' || CASE WHEN (SELECT status FROM service_requests WHERE id = (r->>'request_id')::uuid) = 'quoted' THEN 'ok' ELSE 'NO' END;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', bu, 'role','authenticated')::text, true);
  r := accept_quote(q);
  log := log || ' escrow=' || CASE WHEN EXISTS (SELECT 1 FROM escrow_transactions WHERE order_id = (r->>'order_id')::uuid AND status = 'held') THEN 'ok' ELSE 'NO' END;
  log := log || ' terms_accepted=' || CASE WHEN (SELECT terms_accepted_at FROM quotes WHERE id = q) IS NOT NULL THEN 'ok' ELSE 'NO' END;
  SET LOCAL ROLE authenticated;
  BEGIN INSERT INTO orders (buyer_id, seller_id, service_id, total_price) VALUES (bu, pv, sv, 1); log := log || ' unpaid_order=NO'; EXCEPTION WHEN OTHERS THEN log := log || ' unpaid_order=ok'; END;
  RESET ROLE;

  -- Guests buy but cannot open a professional space or publish
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', gu, 'role','authenticated', 'is_anonymous', true)::text, true);
  UPDATE wallets SET balance = 20000 WHERE user_id = gu;
  r := place_order(jsonb_build_object('product_id', pr, 'quantity', 1, 'payment_mode', 'cod', 'shipping_address', 'Tokoin, Lomé'));
  log := log || ' guest_order=' || CASE WHEN (r->>'order_id') IS NOT NULL THEN 'ok' ELSE 'NO' END;
  BEGIN PERFORM assign_own_role('seller'); log := log || ' guest_space=NO'; EXCEPTION WHEN OTHERS THEN log := log || ' guest_space=ok'; END;

  -- Featured: only the admin
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', sel, 'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  UPDATE products SET is_featured = true WHERE id = pr;
  RESET ROLE;
  log := log || ' self_feature=' || CASE WHEN (SELECT is_featured FROM products WHERE id = pr) THEN 'NO' ELSE 'ok' END;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', adm, 'role','authenticated')::text, true);
  PERFORM set_featured('product', pr, true);
  log := log || ' admin_feature=' || CASE WHEN (SELECT is_featured FROM products WHERE id = pr) THEN 'ok' ELSE 'NO' END;

  -- KYC: types accepted, status always pending for the user
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', bu, 'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  INSERT INTO kyc_documents (user_id, document_type, document_url, status) VALUES (bu, 'selfie_verification', bu::text || '/s.jpg', 'approved');
  RESET ROLE;
  log := log || ' kyc_pending=' || CASE WHEN (SELECT status FROM kyc_documents WHERE user_id = bu) = 'pending' THEN 'ok' ELSE 'NO' END;

  -- Proximity and rankings
  SELECT count(*) INTO n FROM products_near(6.1319, 1.2228, 25) WHERE product_id = pr; log := log || ' near=' || CASE WHEN n = 1 THEN 'ok' ELSE 'NO' END;
  SELECT count(*) INTO n FROM products_near(5.36, -4.0083, 25) WHERE product_id = pr; log := log || ' far=' || CASE WHEN n = 0 THEN 'ok' ELSE 'NO' END;
  SELECT count(*) INTO n FROM get_rankings('week') WHERE role = 'seller'; log := log || ' rankings=' || CASE WHEN n BETWEEN 1 AND 3 THEN 'ok' ELSE 'NO' END;

  RAISE EXCEPTION 'RESULT:%', log;
END $$;
