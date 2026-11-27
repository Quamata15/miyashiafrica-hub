-- Space rules: compatible spaces only, 3 professional spaces at most, 30-day delay between
-- opposite spaces, and every space-owned write checked whatever the path.
-- One transaction, always rolled back by the final RAISE. Any "=NO" in the result is a failure.
DO $$
DECLARE sel uuid := gen_random_uuid(); fl uuid := gen_random_uuid(); bu uuid := gen_random_uuid(); ex uuid := gen_random_uuid();
  dr uuid := gen_random_uuid(); adm uuid; pr uuid; o uuid; d1 uuid; d2 uuid; j uuid; r jsonb; log text := ''; n int; msg text;
BEGIN
  INSERT INTO auth.users (id, email, instance_id, aud, role, created_at) VALUES
    (sel, 'sel_t@x.test', '00000000-0000-0000-0000-000000000000','authenticated','authenticated', now()),
    (fl,  'fl_t@x.test',  '00000000-0000-0000-0000-000000000000','authenticated','authenticated', now()),
    (bu,  'bu_t@x.test',  '00000000-0000-0000-0000-000000000000','authenticated','authenticated', now()),
    (ex,  'ex_t@x.test',  '00000000-0000-0000-0000-000000000000','authenticated','authenticated', now()),
    (dr,  'dr_t@x.test',  '00000000-0000-0000-0000-000000000000','authenticated','authenticated', now());
  SELECT user_id INTO adm FROM user_roles WHERE role = 'admin' LIMIT 1;

  -- Seller opens related spaces, never opposite ones
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', sel, 'role','authenticated')::text, true);
  PERFORM assign_own_role('seller');
  BEGIN PERFORM assign_own_role('freelance'); log := log || ' seller_freelance=NO'; EXCEPTION WHEN OTHERS THEN log := log || ' seller_freelance=ok'; END;
  BEGIN PERFORM assign_own_role('driver'); log := log || ' driver_without_registration=NO'; EXCEPTION WHEN OTHERS THEN log := log || ' driver_without_registration=ok'; END;
  -- A seller may also deliver (the buyer's handover code still releases the money)
  BEGIN PERFORM register_driver('Lomé', 'moto'); log := log || ' seller_driver=ok'; PERFORM deactivate_own_role('driver');
  EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS msg = MESSAGE_TEXT; log := log || ' seller_driver=NO(' || msg || ')'; END;
  PERFORM assign_own_role('provider'); PERFORM assign_own_role('employer');
  SELECT count(*) INTO n FROM user_roles WHERE user_id = sel; log := log || ' seller_spaces=' || n || CASE WHEN n = 4 THEN '' ELSE '=NO' END;
  r := get_space_options();
  log := log || ' options_reason=' || CASE WHEN (SELECT x ->> 'reason' FROM jsonb_array_elements(r -> 'roles') x WHERE x ->> 'role' = 'freelance') LIKE 'Incompatible%' THEN 'ok' ELSE 'NO' END;
  log := log || ' options_used=' || CASE WHEN (r ->> 'used')::int = 3 THEN 'ok' ELSE 'NO' END;

  -- The limit holds for compatible spaces too
  BEGIN PERFORM register_driver('Lomé', 'moto'); log := log || ' limit3=NO';
  EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS msg = MESSAGE_TEXT; log := log || ' limit3=' || CASE WHEN msg LIKE '%maximum%' THEN 'ok' ELSE 'NO(' || msg || ')' END; END;

  -- Direct inserts into user_roles are refused for users
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', bu, 'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN INSERT INTO user_roles (user_id, role) VALUES (bu, 'seller'); log := log || ' direct_role=NO'; EXCEPTION WHEN OTHERS THEN log := log || ' direct_role=ok'; END;
  -- A buyer cannot publish anything that belongs to a space
  BEGIN INSERT INTO products (seller_id, title, price, stock) VALUES (bu, 'Sac en raphia', 5000, 3); log := log || ' buyer_product=NO'; EXCEPTION WHEN OTHERS THEN log := log || ' buyer_product=ok'; END;
  BEGIN INSERT INTO services (provider_id, title, price) VALUES (bu, 'Coiffure', 5000); log := log || ' buyer_service=NO'; EXCEPTION WHEN OTHERS THEN log := log || ' buyer_service=ok'; END;
  BEGIN INSERT INTO jobs (employer_id, title, description, is_active) VALUES (bu, 'Comptable', 'Poste', true); log := log || ' buyer_job=NO'; EXCEPTION WHEN OTHERS THEN log := log || ' buyer_job=ok'; END;
  BEGIN INSERT INTO shops (owner_id, slug, name) VALUES (bu, 'test-bu-shop', 'Boutique'); log := log || ' buyer_shop=NO'; EXCEPTION WHEN OTHERS THEN log := log || ' buyer_shop=ok'; END;
  BEGIN INSERT INTO campaigns (user_id, name) VALUES (bu, 'Campagne'); log := log || ' buyer_campaign=NO'; EXCEPTION WHEN OTHERS THEN log := log || ' buyer_campaign=ok'; END;
  RESET ROLE;

  -- Freelance: no job offers, no recruiting tools
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', fl, 'role','authenticated')::text, true);
  PERFORM assign_own_role('freelance'); PERFORM assign_own_role('provider');
  BEGIN PERFORM assign_own_role('employer'); log := log || ' freelance_employer=NO'; EXCEPTION WHEN OTHERS THEN log := log || ' freelance_employer=ok'; END;
  BEGIN INSERT INTO jobs (employer_id, title, description, is_active) VALUES (fl, 'Mission logo', 'Logo', true); log := log || ' freelance_job=NO'; EXCEPTION WHEN OTHERS THEN log := log || ' freelance_job=ok'; END;
  BEGIN PERFORM search_talent(); log := log || ' freelance_talent=NO'; EXCEPTION WHEN OTHERS THEN log := log || ' freelance_talent=ok'; END;
  INSERT INTO freelance_profiles (user_id, title, skills, open_to_work) VALUES (fl, 'Graphiste', ARRAY['Illustrator'], true);
  PERFORM register_driver('Lomé', 'moto', NULL, NULL, NULL);
  SELECT count(*) INTO n FROM user_roles WHERE user_id = fl AND role <> 'buyer'; log := log || ' freelance_spaces=' || n || CASE WHEN n = 3 THEN '' ELSE '=NO' END;

  -- Recruiter (the seller's account) publishes; the freelance applies; the recruiter cannot apply
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', sel, 'role','authenticated')::text, true);
  INSERT INTO jobs (employer_id, title, description, skills_required, is_active) VALUES (sel, 'Graphiste junior', 'Création de visuels', ARRAY['Illustrator'], true) RETURNING id INTO j;
  SELECT count(*) INTO n FROM search_talent(); log := log || ' recruiter_finds=' || n || CASE WHEN n >= 1 THEN '' ELSE '=NO' END;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', bu, 'role','authenticated')::text, true);
  BEGIN PERFORM apply_to_job(j, 'Bonjour, je souhaite postuler à cette offre de graphiste junior.'); log := log || ' buyer_apply=NO'; EXCEPTION WHEN OTHERS THEN log := log || ' buyer_apply=ok'; END;
  BEGIN PERFORM recommended_jobs(5); log := log || ' buyer_recommended=NO'; EXCEPTION WHEN OTHERS THEN log := log || ' buyer_recommended=ok'; END;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', fl, 'role','authenticated')::text, true);
  r := apply_to_job(j, 'Bonjour, je suis graphiste et je maîtrise Illustrator depuis trois ans.');
  log := log || ' freelance_apply=' || CASE WHEN r ? 'id' THEN 'ok' ELSE 'NO' END;

  -- Boosts: only your own content, in its space
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', sel, 'role','authenticated')::text, true);
  INSERT INTO products (seller_id, title, price, stock, is_active) VALUES (sel, 'Pagne wax 6 yards', 12000, 10, true) RETURNING id INTO pr;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', fl, 'role','authenticated')::text, true);
  UPDATE wallets SET balance = 50000 WHERE user_id = fl;
  BEGIN PERFORM purchase_boost('product', pr, 'x', 10, 'weekly'); log := log || ' boost_foreign=NO'; EXCEPTION WHEN OTHERS THEN log := log || ' boost_foreign=ok'; END;
  BEGIN PERFORM purchase_boost('job', j, 'x', 10, 'weekly'); log := log || ' boost_job_freelance=NO'; EXCEPTION WHEN OTHERS THEN log := log || ' boost_job_freelance=ok'; END;
  SELECT balance INTO r FROM (SELECT to_jsonb(balance) balance FROM wallets WHERE user_id = fl) z;
  log := log || ' wallet_untouched=' || CASE WHEN (r #>> '{}')::numeric = 50000 THEN 'ok' ELSE 'NO' END;

  -- Deliveries: never on your own order, accepted through the function
  INSERT INTO orders (buyer_id, seller_id, product_id, quantity, total_price, status) VALUES (bu, sel, pr, 1, 12000, 'paid') RETURNING id INTO o;
  INSERT INTO delivery_requests (order_id, buyer_id, seller_id, status) VALUES (o, bu, sel, 'pending') RETURNING id INTO d1;
  BEGIN INSERT INTO delivery_requests (order_id, buyer_id, seller_id, driver_id, status) VALUES (o, bu, sel, bu, 'pending'); log := log || ' unregistered_driver=NO';
  EXCEPTION WHEN OTHERS THEN log := log || ' unregistered_driver=ok'; END;
  UPDATE driver_profiles SET is_available = true WHERE user_id = fl;
  r := accept_delivery(d1); log := log || ' accept=' || CASE WHEN (SELECT driver_id FROM delivery_requests WHERE id = d1) = fl THEN 'ok' ELSE 'NO' END;
  INSERT INTO orders (buyer_id, seller_id, product_id, quantity, total_price, status) VALUES (fl, sel, pr, 1, 12000, 'paid') RETURNING id INTO o;
  INSERT INTO delivery_requests (order_id, buyer_id, seller_id, status) VALUES (o, fl, sel, 'pending') RETURNING id INTO d2;
  BEGIN PERFORM accept_delivery(d2); log := log || ' own_order_delivery=NO'; EXCEPTION WHEN OTHERS THEN log := log || ' own_order_delivery=ok'; END;

  -- Closing a space: refused while orders are open, then content goes offline and stays offline
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', sel, 'role','authenticated')::text, true);
  BEGIN PERFORM deactivate_own_role('seller'); log := log || ' close_with_orders=NO'; EXCEPTION WHEN OTHERS THEN log := log || ' close_with_orders=ok'; END;
  UPDATE orders SET status = 'completed' WHERE seller_id = sel;
  PERFORM deactivate_own_role('seller');
  log := log || ' product_hidden=' || CASE WHEN (SELECT is_active FROM products WHERE id = pr) THEN 'NO' ELSE 'ok' END;
  SET LOCAL ROLE authenticated;
  BEGIN UPDATE products SET is_active = true WHERE id = pr; log := log || ' reactivate_without_space=NO'; EXCEPTION WHEN OTHERS THEN log := log || ' reactivate_without_space=ok'; END;
  RESET ROLE;
  -- Recruiter closes too; the freelance space then waits 30 days (it was opposite to both)
  PERFORM deactivate_own_role('employer');
  BEGIN PERFORM assign_own_role('freelance'); log := log || ' cooldown=NO';
  EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS msg = MESSAGE_TEXT; log := log || ' cooldown=' || CASE WHEN msg LIKE '%30 jours%' THEN 'ok' ELSE 'NO(' || msg || ')' END; END;
  PERFORM assign_own_role('seller');
  log := log || ' reopen_same=' || CASE WHEN has_role(sel, 'seller') THEN 'ok' ELSE 'NO' END;
  SELECT count(*) INTO n FROM user_role_events WHERE user_id = sel AND action = 'deactivated'; log := log || ' history=' || n || CASE WHEN n = 3 THEN '' ELSE '=NO' END;

  -- Freelance closes: open applications are withdrawn and the profile leaves the talent pool
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', fl, 'role','authenticated')::text, true);
  UPDATE delivery_requests SET status = 'cancelled' WHERE driver_id = fl;
  PERFORM deactivate_own_role('freelance');
  log := log || ' apps_withdrawn=' || CASE WHEN (SELECT stage FROM applications WHERE freelance_id = fl LIMIT 1) = 'withdrawn' THEN 'ok' ELSE 'NO' END;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', adm, 'role','authenticated')::text, true);
  SELECT count(*) INTO n FROM search_talent() WHERE user_id = fl; log := log || ' talent_hidden=' || CASE WHEN n = 0 THEN 'ok' ELSE 'NO' END;

  -- The admin keeps every space, but assigning an opposite space to someone is still refused
  log := log || ' admin_all=' || CASE WHEN (SELECT count(*) FROM user_roles WHERE user_id = adm) >= 7 THEN 'ok' ELSE 'NO' END;
  INSERT INTO user_roles (user_id, role) VALUES (ex, 'employer');
  BEGIN INSERT INTO user_roles (user_id, role) VALUES (ex, 'freelance'); log := log || ' admin_assign_conflict=NO'; EXCEPTION WHEN OTHERS THEN log := log || ' admin_assign_conflict=ok'; END;

  -- Deleting an account with spaces still works
  DELETE FROM auth.users WHERE id = ex;
  log := log || ' delete_account=' || CASE WHEN NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = ex) THEN 'ok' ELSE 'NO' END;

  RAISE EXCEPTION 'RESULT:%', log;
END $$;
