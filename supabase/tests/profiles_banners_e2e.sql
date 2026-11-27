-- Profile edits, admin banners and sponsored visuals.
-- One transaction, always rolled back by the final RAISE. Any "=NO" in the result is a failure.
DO $$
DECLARE u1 uuid := gen_random_uuid(); u2 uuid := gen_random_uuid(); adm uuid; pr uuid; b uuid; n int; r record; log text := '';
BEGIN
  INSERT INTO auth.users (id, email, instance_id, aud, role, created_at) VALUES
    (u1, 'pb1_t@x.test', '00000000-0000-0000-0000-000000000000','authenticated','authenticated', now()),
    (u2, 'pb2_t@x.test', '00000000-0000-0000-0000-000000000000','authenticated','authenticated', now());
  SELECT user_id INTO adm FROM user_roles WHERE role = 'admin' LIMIT 1;

  -- Renaming works, the badge does not move
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', u1, 'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  UPDATE profiles SET full_name = '  Kossi   Agbéko ', username = 'Kossi.Agbeko', is_verified = true WHERE user_id = u1;
  SELECT full_name, username, is_verified INTO r FROM profiles WHERE user_id = u1;
  log := log || ' rename=' || CASE WHEN r.full_name = 'Kossi Agbéko' THEN 'ok' ELSE 'NO(' || r.full_name || ')' END;
  log := log || ' username_lower=' || CASE WHEN r.username = 'kossi.agbeko' THEN 'ok' ELSE 'NO' END;
  log := log || ' self_verified=' || CASE WHEN r.is_verified THEN 'NO' ELSE 'ok' END;
  BEGIN UPDATE profiles SET username = 'a b' WHERE user_id = u1; log := log || ' bad_username=NO'; EXCEPTION WHEN OTHERS THEN log := log || ' bad_username=ok'; END;
  BEGIN UPDATE profiles SET full_name = 'K' WHERE user_id = u1; log := log || ' short_name=NO'; EXCEPTION WHEN OTHERS THEN log := log || ' short_name=ok'; END;
  BEGIN UPDATE profiles SET avatar_url = 'javascript:alert(1)' WHERE user_id = u1; log := log || ' bad_avatar=NO'; EXCEPTION WHEN OTHERS THEN log := log || ' bad_avatar=ok'; END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', u2, 'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN UPDATE profiles SET username = 'kossi.agbeko' WHERE user_id = u2; log := log || ' username_taken=NO'; EXCEPTION WHEN OTHERS THEN log := log || ' username_taken=ok'; END;
  -- Banners are for the admin only
  BEGIN INSERT INTO site_banners (placement, title) VALUES ('home_top', 'Pub pirate'); log := log || ' user_banner=NO'; EXCEPTION WHEN OTHERS THEN log := log || ' user_banner=ok'; END;
  RESET ROLE;

  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', adm, 'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  INSERT INTO site_banners (placement, title, subtitle, image_url, cta_label, cta_href, is_active)
  VALUES ('services_top', 'Soldes de fin d''année', 'Jusqu''à -30 %', 'https://images.unsplash.com/photo-1734868032501-448d1457dc38', 'Voir', '/marketplace', true) RETURNING id INTO b;
  UPDATE site_banners SET title = 'Soldes de Noël' WHERE id = b;
  log := log || ' admin_banner=' || CASE WHEN (SELECT title FROM site_banners WHERE id = b) = 'Soldes de Noël' THEN 'ok' ELSE 'NO' END;
  BEGIN INSERT INTO site_banners (placement, title, cta_href) VALUES ('home_top', 'Lien piège', 'javascript:alert(1)'); log := log || ' bad_link=NO'; EXCEPTION WHEN OTHERS THEN log := log || ' bad_link=ok'; END;
  BEGIN INSERT INTO site_banners (placement, title) VALUES ('nulle_part', 'Mauvais emplacement'); log := log || ' bad_place=NO'; EXCEPTION WHEN OTHERS THEN log := log || ' bad_place=ok'; END;
  RESET ROLE;
  -- Visitors see live banners only
  PERFORM set_config('request.jwt.claims', jsonb_build_object('role','anon')::text, true);
  SET LOCAL ROLE anon;
  SELECT count(*) INTO n FROM site_banners WHERE id = b; log := log || ' visitor_sees=' || CASE WHEN n = 1 THEN 'ok' ELSE 'NO' END;
  RESET ROLE;
  UPDATE site_banners SET starts_at = now() + interval '2 days' WHERE id = b;
  SET LOCAL ROLE anon;
  SELECT count(*) INTO n FROM site_banners WHERE id = b; log := log || ' scheduled_hidden=' || CASE WHEN n = 0 THEN 'ok' ELSE 'NO' END;
  RESET ROLE;

  -- A seller's boost visual is shown to visitors, only while the product is on sale
  INSERT INTO user_roles (user_id, role) VALUES (u1, 'seller');
  INSERT INTO products (seller_id, title, price, stock, is_active) VALUES (u1, 'Sac en raphia tressé', 8000, 5, true) RETURNING id INTO pr;
  INSERT INTO boosts (user_id, boost_type, target_id, target_name, zone_radius_km, period, price_paid, starts_at, expires_at, is_active, creative_url, creative_type)
  VALUES (u1, 'product', pr, 'Sac en raphia tressé', 50, 'weekly', 2500, now() - interval '1 minute', now() + interval '7 days', true, 'https://example.com/sac.jpg', 'image');
  SET LOCAL ROLE anon;
  SELECT count(*) INTO n FROM get_sponsored('product', 12) WHERE target_id = pr; log := log || ' sponsored_visible=' || CASE WHEN n = 1 THEN 'ok' ELSE 'NO' END;
  BEGIN SELECT count(*) INTO n FROM boosts; log := log || ' boosts_private=' || CASE WHEN n = 0 THEN 'ok' ELSE 'NO' END; EXCEPTION WHEN OTHERS THEN log := log || ' boosts_private=ok'; END;
  RESET ROLE;
  UPDATE products SET is_active = false WHERE id = pr;
  SELECT count(*) INTO n FROM get_sponsored('product', 12) WHERE target_id = pr; log := log || ' sponsored_hidden_offsale=' || CASE WHEN n = 0 THEN 'ok' ELSE 'NO' END;

  -- Shop names stay clean
  INSERT INTO shops (owner_id, slug, name) VALUES (u1, 'Raphia-Lome', '  Raphia   de Lomé ');
  SELECT name, slug INTO r FROM shops WHERE owner_id = u1;
  log := log || ' shop_clean=' || CASE WHEN r.name = 'Raphia de Lomé' AND r.slug = 'raphia-lome' THEN 'ok' ELSE 'NO' END;
  BEGIN UPDATE shops SET slug = 'à éviter!' WHERE owner_id = u1; log := log || ' bad_slug=NO'; EXCEPTION WHEN OTHERS THEN log := log || ' bad_slug=ok'; END;

  RAISE EXCEPTION 'RESULT:%', log;
END $$;
