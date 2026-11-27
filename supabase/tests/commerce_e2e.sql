-- End-to-end scenario run inside one transaction that is always rolled back.
-- Run: scripts/db-test.sh   (expects the line RESULT: ... with no 'NO' and no error)
DO $$
DECLARE b uuid := gen_random_uuid(); s uuid := gen_random_uuid(); c uuid := gen_random_uuid();
  p uuid; v uuid; r jsonb; log text := ''; o uuid; off uuid; g uuid; sg uuid; q uuid; cd text; bal numeric; svc uuid; ck jsonb; fid bigint;
BEGIN
  INSERT INTO auth.users (id, email, instance_id, aud, role, created_at) VALUES
    (b, 'buyer_t@x.test', '00000000-0000-0000-0000-000000000000','authenticated','authenticated', now() - interval '30 days'),
    (s, 'seller_t@x.test', '00000000-0000-0000-0000-000000000000','authenticated','authenticated', now() - interval '30 days'),
    (c, 'buyer2_t@x.test', '00000000-0000-0000-0000-000000000000','authenticated','authenticated', now() - interval '30 days');
  UPDATE wallets SET balance = 500000 WHERE user_id IN (b, c);
  INSERT INTO user_roles (user_id, role) VALUES (s, 'seller'), (s, 'provider');
  INSERT INTO products (seller_id, title, price, stock, is_active) VALUES (s, 'Pagne wax test', 10000, 20, true) RETURNING id INTO p;
  INSERT INTO product_variants (product_id, label, price, stock) VALUES (p, 'Rouge / 6 yards', 12000, 30) RETURNING id INTO v;
  INSERT INTO product_price_tiers (product_id, min_qty, unit_price) VALUES (p, 3, 11000);
  INSERT INTO shops (owner_id, slug, name) VALUES (s, 'pagnes-test', 'Pagnes Test');

  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', b, 'role','authenticated')::text, true);
  -- variant + tier pricing
  r := place_order(jsonb_build_object('product_id', p, 'variant_id', v, 'quantity', 3, 'shipping_address', 'Lomé'));
  log := log || ' order3=' || (r->>'total_price');
  SELECT stock INTO STRICT bal FROM product_variants WHERE id = v; log := log || ' vstock=' || bal;
  -- offer
  r := make_offer(p, 8000, 1, v, 'svp'); off := (r->>'offer_id')::uuid;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', s, 'role','authenticated')::text, true);
  PERFORM respond_offer(off, 'counter', 9000);
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', b, 'role','authenticated')::text, true);
  PERFORM respond_offer(off, 'accept');
  r := place_order(jsonb_build_object('offer_id', off, 'shipping_address', 'Lomé'));
  log := log || ' offer_total=' || (r->>'total_price');
  -- COD
  r := place_order(jsonb_build_object('product_id', p, 'variant_id', v, 'quantity', 1, 'payment_mode', 'cod', 'shipping_address', 'Lomé'));
  o := (r->>'order_id')::uuid; SELECT oc.code INTO STRICT cd FROM order_codes oc WHERE order_id = o;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', s, 'role','authenticated')::text, true);
  log := log || ' wrongcode=' || confirm_handover(o, '000000x')::text || (SELECT attempts FROM order_codes WHERE order_id=o);
  PERFORM confirm_handover(o, cd);
  SELECT status || '/' || payment_status INTO STRICT cd FROM orders WHERE id = o; log := log || ' cod=' || cd;
  SELECT balance INTO STRICT bal FROM wallets WHERE user_id = s; log := log || ' sellerbal=' || bal;
  -- invoice
  r := get_invoice(o); log := log || ' inv=' || (r->'invoice'->>'number');
  -- seller cancels a paid order -> refund
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', b, 'role','authenticated')::text, true);
  SELECT balance INTO STRICT bal FROM wallets WHERE user_id = b; log := log || ' buyerbal_before=' || bal;
  r := place_order(jsonb_build_object('product_id', p, 'variant_id', v, 'quantity', 1));
  o := (r->>'order_id')::uuid;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', s, 'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  UPDATE orders SET status = 'cancelled' WHERE id = o;
  BEGIN UPDATE orders SET total_price = 1 WHERE seller_id = s; EXCEPTION WHEN OTHERS THEN log := log || ' guard=' || SQLERRM; END;
  RESET ROLE;
  SELECT balance INTO STRICT bal FROM wallets WHERE user_id = b; log := log || ' buyerbal_after_refund=' || bal;
  -- group buy
  g := create_group_buy(p, 8500, 2, 3, v);
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', b, 'role','authenticated')::text, true);
  PERFORM join_group_buy(g, 1, 'Lomé');
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', c, 'role','authenticated')::text, true);
  PERFORM join_group_buy(g, 1, 'Kara');
  SELECT status INTO STRICT cd FROM group_buys WHERE id = g; log := log || ' group=' || cd || '/' || (SELECT count(*) FROM orders WHERE source='group_buy' AND source_id=g);
  -- savings
  sg := create_savings_goal(p, 1, v);
  r := contribute_savings(sg, 4000); r := contribute_savings(sg, 8000);
  log := log || ' savings=' || (r->>'completed');
  -- pending checkout + fedapay credit
  ck := create_pending_checkout(jsonb_build_array(jsonb_build_object('product_id', p, 'variant_id', v, 'quantity', 2)), jsonb_build_object('shipping_address','Kara'));
  INSERT INTO fedapay_transactions (user_id, amount, checkout_id, fedapay_id) VALUES (c, (ck->>'total')::numeric, (ck->>'checkout_id')::uuid, 999999991);
  r := credit_wallet_from_fedapay(999999991, 'approved', 'tmoney');
  log := log || ' direct=' || jsonb_array_length(r->'checkout'->'orders') || 'ok/' || jsonb_array_length(r->'checkout'->'errors') || 'err';
  -- quote + booking
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', s, 'role','authenticated')::text, true);
  INSERT INTO services (provider_id, title, price, is_active) VALUES (s, 'Couture sur mesure', 15000, true) RETURNING id INTO svc;
  INSERT INTO provider_availability (provider_id, weekday, start_time, end_time, slot_minutes) SELECT s, d, '08:00', '12:00', 60 FROM generate_series(0,6) d;
  q := send_quote(c, 'Robe de mariée', '[{"label":"Tissu","qty":2,"unit_price":20000},{"label":"Main d''oeuvre","qty":1,"unit_price":30000}]');
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', c, 'role','authenticated')::text, true);
  r := accept_quote(q); log := log || ' quote_order=' || (SELECT total_price FROM orders WHERE id = (r->>'order_id')::uuid);
  r := book_slot(svc, (SELECT starts_at FROM get_available_slots(svc, current_date + 2) LIMIT 1), 'test');
  log := log || ' booking=' || (r ? 'booking_id');
  BEGIN r := book_slot(svc, (SELECT b2.starts_at FROM bookings b2 WHERE b2.id = (r->>'booking_id')::uuid), 'double'); EXCEPTION WHEN OTHERS THEN log := log || ' dbl=' || SQLERRM; END;
  log := log || ' customs=' || estimate_customs('GH','TG',100000)::text || ' uemoa=' || (estimate_customs('BJ','TG',100000)->>'total');
  log := log || ' stats=' || (SELECT get_seller_stats(30, s)->>'orders' FROM (SELECT set_config('request.jwt.claims', jsonb_build_object('sub', s, 'role','authenticated')::text, true)) z);
  log := log || ' risk=' || (compute_user_risk(b)->>'score');
  log := log || ' export_keys=' || (SELECT count(*) FROM jsonb_object_keys(export_my_data()));
  log := log || ' modflag=' || (SELECT count(*) FROM moderation_flags WHERE target_id = p);
  INSERT INTO products (seller_id, title, price, stock, is_active) VALUES (s, 'Pistolet à vendre', 10000, 1, true) RETURNING id INTO p;
  log := log || ' blocked_active=' || (SELECT is_active FROM products WHERE id = p);

  -- ledger stays balanced and mirrors every wallet move
  log := log || ' ledger_balanced=' || (SELECT sum(debit) = sum(credit) FROM ledger_entries);
  log := log || ' ledger_rows=' || (SELECT count(*) FROM ledger_entries l JOIN wallet_transactions t ON t.id = l.txn_id WHERE t.user_id IN (b, c, s));
  BEGIN UPDATE wallet_transactions SET amount = 1 WHERE user_id = b; log := log || ' immutable=NO'; EXCEPTION WHEN OTHERS THEN log := log || ' immutable=yes'; END;
  -- accent and typo tolerant search
  log := log || ' search_accent=' || (SELECT count(*) FROM search_products('pagne fleur'));
  log := log || ' search_typo=' || (SELECT count(*) FROM search_products('pange wax'));
  -- relay point application: incomplete then complete, approve requires checks
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', c, 'role','authenticated')::text, true);
  INSERT INTO pickup_partner_applications (user_id, company_name) VALUES (c, 'Kodjo Logistique') RETURNING id INTO q;
  r := submit_partner_application(q); log := log || ' relay_missing=' || jsonb_array_length(r->'missing');
  UPDATE pickup_partner_applications SET rccm_number='TG-LOM-01', nif_number='1000', manager_name='Kodjo', manager_id_number='CNI1', phone='+22890000001',
    city='Lomé', address='Rue 12', lat=6.13, lng=1.22, storage_area_m2=6, has_secure_storage=true, has_smartphone=true,
    opening_hours='{"mon":[["08:00","18:00"]],"tue":[["08:00","18:00"]],"wed":[["08:00","18:00"]],"thu":[["08:00","18:00"]],"fri":[["08:00","18:00"]]}',
    payout_method='mobile_money', payout_account='90000001',
    documents='{"rccm":"x","nif":"x","id_front":"x","id_back":"x","proof_address":"x","storefront_photo":"x","storage_photo":"x","premises_title":"x"}',
    commitments='{"charter":true,"storage_rules":true,"prohibited_goods":true,"data_protection":true,"verification_consent":true,"truthful":true}' WHERE id = q;
  r := submit_partner_application(q); log := log || ' relay_submit=' || (r->>'success');
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', (SELECT user_id FROM user_roles WHERE role='admin' LIMIT 1), 'role','authenticated')::text, true);
  BEGIN r := review_partner_application(q, 'approve'); log := log || ' approve_unchecked=NO'; EXCEPTION WHEN OTHERS THEN log := log || ' approve_unchecked=refused'; END;
  UPDATE pickup_partner_applications SET check_documents=true, check_identity=true, check_phone=true, check_site_visit=true, check_training=true, check_contract=true WHERE id = q;
  r := review_partner_application(q, 'approve'); log := log || ' relay_point=' || ((r->>'pickup_point_id') IS NOT NULL) || '/' || (SELECT is_pickup_partner FROM (SELECT set_config('request.jwt.claims', jsonb_build_object('sub', c, 'role','authenticated')::text, true)) z, LATERAL (SELECT public.is_pickup_partner((r->>'pickup_point_id')::uuid)) w(is_pickup_partner));
  RAISE EXCEPTION 'RESULT:%', log;
END $$;
