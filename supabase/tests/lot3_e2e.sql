-- Lot 3: scheduled promotions in the price, service start/finish, verified reviews,
-- ambassador bonus, disputes with partial refund, accounting export, sanctions, contact
-- attempts, newsletter, calendar token, delivery quote, guest cleanup, fraud signals.
-- One transaction, always rolled back by the final RAISE. Any "=NO" in the result is a failure.
DO $$
DECLARE sel uuid := gen_random_uuid(); bu uuid := gen_random_uuid(); pv uuid := gen_random_uuid(); rf uuid := gen_random_uuid();
  g1 uuid := gen_random_uuid(); g2 uuid := gen_random_uuid(); adm uuid; pr uuid; sv uuid; q uuid; os uuid; op uuid; dsp uuid; ad uuid; conv uuid;
  r jsonb; v numeric; v2 numeric; n int; t1 text; t2 text; msg text; log text := '';
BEGIN
  INSERT INTO auth.users (id, email, instance_id, aud, role, created_at, is_anonymous) VALUES
    (sel, 'l3s_t@x.test', '00000000-0000-0000-0000-000000000000','authenticated','authenticated', now(), false),
    (bu,  'l3b_t@x.test', '00000000-0000-0000-0000-000000000000','authenticated','authenticated', now(), false),
    (pv,  'l3p_t@x.test', '00000000-0000-0000-0000-000000000000','authenticated','authenticated', now(), false),
    (rf,  'l3r_t@x.test', '00000000-0000-0000-0000-000000000000','authenticated','authenticated', now(), false),
    (g1,  NULL, '00000000-0000-0000-0000-000000000000','authenticated','authenticated', now() - interval '40 days', true),
    (g2,  NULL, '00000000-0000-0000-0000-000000000000','authenticated','authenticated', now() - interval '40 days', true);
  SELECT user_id INTO adm FROM user_roles WHERE role = 'admin' LIMIT 1;
  INSERT INTO user_roles (user_id, role) VALUES (sel, 'seller'), (pv, 'provider');
  INSERT INTO shops (owner_id, slug, name, city, country, vat_number, lat, lng) VALUES (sel, 'l3-shop', 'Boutique L3', 'Lomé', 'TG', 'NIF-123', 6.1319, 1.2228);
  INSERT INTO products (seller_id, title, price, stock, is_active, location) VALUES (sel, 'Sac test', 10000, 20, true, 'Lomé') RETURNING id INTO pr;
  INSERT INTO referral_rewards (referrer_id, referred_id) VALUES (rf, pv);
  UPDATE wallets SET balance = 200000 WHERE user_id = bu;

  -- Scheduled promotions: running one in the price, future one not yet, quantity one from 3
  INSERT INTO promotions (user_id, type, name, discount_type, discount_value, start_date, end_date) VALUES (sel, 'discount', 'Soldes', 'percentage', 20, now() - interval '1 hour', now() + interval '3 days');
  INSERT INTO promotions (user_id, type, name, discount_type, discount_value, start_date, end_date, target_id) VALUES (sel, 'seasonal', 'Noël', 'percentage', 50, now() + interval '1 day', now() + interval '5 days', pr);
  INSERT INTO promotions (user_id, type, name, discount_type, discount_value, min_quantity, start_date, end_date) VALUES (sel, 'bulk', 'Lot de 3', 'percentage', 30, 3, now() - interval '1 hour', now() + interval '3 days');
  log := log || ' promo_price=' || CASE WHEN quote_product_price(pr, NULL, 1) = 8000 THEN 'ok' ELSE 'NO(' || quote_product_price(pr, NULL, 1) || ')' END;
  log := log || ' promo_bulk=' || CASE WHEN quote_product_price(pr, NULL, 3) = 7000 THEN 'ok' ELSE 'NO(' || quote_product_price(pr, NULL, 3) || ')' END;
  log := log || ' promo_upcoming=' || CASE WHEN (SELECT name FROM product_promotion(pr, 1, true)) = 'Soldes' THEN 'ok' ELSE 'NO' END;
  BEGIN INSERT INTO promotions (user_id, type, name, discount_type, discount_value, end_date) VALUES (sel, 'discount', 'Trop', 'percentage', 95, now() + interval '1 day'); log := log || ' promo_max=NO';
  EXCEPTION WHEN check_violation THEN log := log || ' promo_max=ok'; END;
  BEGIN INSERT INTO promotions (user_id, type, name, discount_type, discount_value, end_date, target_id) VALUES (pv, 'discount', 'Pas à moi', 'percentage', 10, now() + interval '1 day', pr); log := log || ' promo_owner=NO';
  EXCEPTION WHEN OTHERS THEN log := log || ' promo_owner=ok'; END;

  -- Product order paid from the wallet at the promotional price, then a dispute with partial refund
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', bu, 'role','authenticated')::text, true);
  SELECT balance INTO v FROM wallets WHERE user_id = bu;
  r := place_order(jsonb_build_object('product_id', pr, 'quantity', 1, 'payment_mode', 'wallet', 'shipping_address', 'Bè, Lomé'));
  op := (r->>'order_id')::uuid;
  SELECT total_price INTO v2 FROM orders WHERE id = op;
  log := log || ' order_promo=' || CASE WHEN v2 < 10000 THEN 'ok' ELSE 'NO(' || v2 || ')' END;
  dsp := open_dispute(op, 'Article non conforme', 'Couleur différente de la photo');
  log := log || ' dispute_against=' || CASE WHEN (SELECT against_user FROM disputes WHERE id = dsp) = sel THEN 'ok' ELSE 'NO' END;
  BEGIN PERFORM open_dispute(op, 'Encore', NULL); log := log || ' one_dispute=NO'; EXCEPTION WHEN OTHERS THEN log := log || ' one_dispute=ok'; END;
  BEGIN PERFORM resolve_dispute(dsp, 'refund_full'); log := log || ' resolve_admin_only=NO'; EXCEPTION WHEN OTHERS THEN log := log || ' resolve_admin_only=ok'; END;
  SELECT balance INTO v FROM wallets WHERE user_id = bu;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', adm, 'role','authenticated')::text, true);
  r := resolve_dispute(dsp, 'refund_partial', 3000, 'Remise accordée');
  log := log || ' partial_refund=' || CASE WHEN (SELECT balance FROM wallets WHERE user_id = bu) = v + 3000 THEN 'ok' ELSE 'NO' END;
  log := log || ' seller_rest=' || CASE WHEN (SELECT balance FROM wallets WHERE user_id = sel) = round((v2 - 3000) * 0.9) THEN 'ok' ELSE 'NO(' || (SELECT balance FROM wallets WHERE user_id = sel) || ')' END;
  log := log || ' dispute_closed=' || CASE WHEN (SELECT status FROM disputes WHERE id = dsp) = 'resolved' AND (SELECT status FROM orders WHERE id = op) = 'completed' THEN 'ok' ELSE 'NO' END;
  log := log || ' fraud_signals=' || CASE WHEN (SELECT count(*) FROM fraud_signals()) >= 0 THEN 'ok' ELSE 'NO' END;

  -- Service: request, quote, escrow; provider starts and finishes; buyer reviews and validates
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', pv, 'role','authenticated')::text, true);
  INSERT INTO services (provider_id, title, price, price_type, is_active) VALUES (pv, 'Peinture', NULL, 'negotiable', true) RETURNING id INTO sv;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', bu, 'role','authenticated')::text, true);
  r := request_service(sv, 'Peindre deux chambres et le salon', false, 'Bè, Lomé', current_date + 2, 50000);
  conv := (r->>'conversation_id')::uuid;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', pv, 'role','authenticated')::text, true);
  q := send_quote(bu, 'Peinture', '[{"label":"Main d''oeuvre","qty":1,"unit_price":40000}]'::jsonb, NULL, NULL, 7, 'Peinture fournie', current_date + 2, 2, false, 'Bè, Lomé', (r->>'request_id')::uuid);
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', bu, 'role','authenticated')::text, true);
  r := accept_quote(q); os := (r->>'order_id')::uuid;
  BEGIN PERFORM complete_service(os); log := log || ' finish_by_buyer=NO'; EXCEPTION WHEN OTHERS THEN log := log || ' finish_by_buyer=ok'; END;
  BEGIN INSERT INTO reviews (reviewer_id, reviewed_user_id, order_id, rating, target) VALUES (bu, pv, os, 5, 'listing'); log := log || ' review_too_early=NO';
  EXCEPTION WHEN OTHERS THEN log := log || ' review_too_early=ok'; END;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', pv, 'role','authenticated')::text, true);
  PERFORM start_service(os);
  log := log || ' started=' || CASE WHEN (SELECT status FROM orders WHERE id = os) = 'processing' THEN 'ok' ELSE 'NO' END;
  PERFORM complete_service(os, 'Travail terminé');
  log := log || ' finished=' || CASE WHEN (SELECT status FROM orders WHERE id = os) = 'shipped' THEN 'ok' ELSE 'NO' END;
  log := log || ' still_held=' || CASE WHEN EXISTS (SELECT 1 FROM escrow_transactions WHERE order_id = os AND status = 'held') THEN 'ok' ELSE 'NO' END;
  INSERT INTO reviews (reviewer_id, reviewed_user_id, order_id, rating, comment, photos, target) VALUES (bu, bu, os, 5, 'Très propre', ARRAY['https://example.com/p.jpg'], 'listing');
  log := log || ' review_verified=' || CASE WHEN (SELECT is_verified AND reviewed_user_id = pv FROM reviews WHERE order_id = os) THEN 'ok' ELSE 'NO' END;
  BEGIN INSERT INTO reviews (reviewer_id, reviewed_user_id, order_id, rating, target) VALUES (bu, pv, os, 1, 'listing'); log := log || ' one_review=NO';
  EXCEPTION WHEN OTHERS THEN log := log || ' one_review=ok'; END;
  BEGIN INSERT INTO reviews (reviewer_id, reviewed_user_id, order_id, rating, target) VALUES (sel, pv, os, 1, 'listing'); log := log || ' review_not_buyer=NO';
  EXCEPTION WHEN OTHERS THEN log := log || ' review_not_buyer=ok'; END;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', bu, 'role','authenticated')::text, true);
  PERFORM confirm_order_reception(os);
  log := log || ' validated=' || CASE WHEN (SELECT status FROM orders WHERE id = os) = 'completed' THEN 'ok' ELSE 'NO' END;
  log := log || ' ambassador=' || CASE WHEN EXISTS (SELECT 1 FROM ambassador_bonuses WHERE referrer_id = rf AND referred_id = pv AND kind = 'first_sale' AND amount = 2000) THEN 'ok' ELSE 'NO' END;

  -- Contact attempts: the 3rd one is still delivered (masked) and reported automatically
  FOR n IN 1..3 LOOP
    INSERT INTO messages (conversation_id, sender_id, receiver_id, content) VALUES (conv, bu, pv, 'Appelle moi au 90 12 34 56 ' || n);
  END LOOP;
  log := log || ' third_attempt_sent=' || CASE WHEN (SELECT count(*) FROM messages WHERE conversation_id = conv AND sender_id = bu AND content LIKE '%masqué%') = 3 THEN 'ok' ELSE 'NO' END;
  log := log || ' auto_report=' || CASE WHEN EXISTS (SELECT 1 FROM vendor_violations WHERE seller_id = bu AND reported_by IS NULL AND violation_type = 'off_platform_contact') THEN 'ok' ELSE 'NO' END;

  -- Accounting export (shop with a tax number: Togo VAT 18 %) and insights
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', sel, 'role','authenticated')::text, true);
  log := log || ' export_vat=' || CASE WHEN EXISTS (SELECT 1 FROM accounting_export(current_date - 1, current_date) WHERE vat_rate = 18 AND vat > 0 AND total_ht + vat = total_ttc) THEN 'ok' ELSE 'NO' END;
  log := log || ' insights=' || CASE WHEN (seller_insights(NULL, 30) ->> 'orders')::int >= 1 THEN 'ok' ELSE 'NO' END;

  -- Sanctions: listings suspended, then lifted
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', adm, 'role','authenticated')::text, true);
  PERFORM apply_sanction(sel, 'listings_suspended', 3, 'Test');
  log := log || ' listings_off=' || CASE WHEN NOT (SELECT is_active FROM products WHERE id = pr) THEN 'ok' ELSE 'NO' END;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', sel, 'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN INSERT INTO products (seller_id, title, price, stock, is_active) VALUES (sel, 'Interdit', 1000, 1, true); log := log || ' publish_blocked=NO';
  EXCEPTION WHEN OTHERS THEN log := log || ' publish_blocked=ok'; END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', adm, 'role','authenticated')::text, true);
  PERFORM apply_sanction(sel, 'lifted');
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', sel, 'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN INSERT INTO products (seller_id, title, price, stock, is_active) VALUES (sel, 'Autorisé', 1000, 1, true); log := log || ' publish_again=ok';
  EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS msg = MESSAGE_TEXT; log := log || ' publish_again=NO(' || msg || ')'; END;
  RESET ROLE;

  -- Delivery quote from GPS (shop and address both located)
  INSERT INTO addresses (user_id, city, lat, lng) VALUES (bu, 'Lomé', 6.1700, 1.2500) RETURNING id INTO ad;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', bu, 'role','authenticated')::text, true);
  r := quote_delivery(sel, ad, 'moto');
  log := log || ' km_precise=' || CASE WHEN (r->>'precise')::boolean AND (r->>'distance_km')::numeric BETWEEN 4 AND 9 THEN 'ok' ELSE 'NO(' || r::text || ')' END;

  -- Calendar link for providers
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', pv, 'role','authenticated')::text, true);
  t1 := my_calendar_token(false); t2 := my_calendar_token(false);
  log := log || ' calendar_stable=' || CASE WHEN t1 = t2 AND length(t1) = 48 THEN 'ok' ELSE 'NO' END;
  log := log || ' calendar_reset=' || CASE WHEN my_calendar_token(true) <> t1 THEN 'ok' ELSE 'NO' END;

  -- Newsletter: subscribe, confirm, unsubscribe
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', rf, 'role','authenticated')::text, true);
  r := subscribe_newsletter('L3_News@X.test', 'test');
  SELECT token INTO t1 FROM newsletter_subscribers WHERE email = 'l3_news@x.test';
  log := log || ' nl_pending=' || CASE WHEN r->>'status' = 'pending' AND t1 IS NOT NULL THEN 'ok' ELSE 'NO' END;
  log := log || ' nl_confirm=' || CASE WHEN confirm_newsletter(t1)->>'status' = 'confirmed' THEN 'ok' ELSE 'NO' END;
  r := unsubscribe_newsletter(t1);
  log := log || ' nl_unsub=' || CASE WHEN r->>'status' = 'unsubscribed' AND (SELECT unsubscribed_at FROM newsletter_subscribers WHERE token = t1) IS NOT NULL THEN 'ok' ELSE 'NO' END;
  BEGIN PERFORM subscribe_newsletter('pas-un-email', 'test'); log := log || ' nl_invalid=NO'; EXCEPTION WHEN OTHERS THEN log := log || ' nl_invalid=ok'; END;

  -- Guests: an empty 40-day-old guest is removed, one with money in the wallet is kept
  UPDATE wallets SET balance = 500 WHERE user_id = g2;
  PERFORM set_config('request.jwt.claims', '', true);
  PERFORM cleanup_guests();
  log := log || ' guest_removed=' || CASE WHEN NOT EXISTS (SELECT 1 FROM auth.users WHERE id = g1) THEN 'ok' ELSE 'NO' END;
  log := log || ' guest_kept=' || CASE WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = g2) THEN 'ok' ELSE 'NO' END;

  RAISE EXCEPTION 'RESULT:%', log;
END $$;
