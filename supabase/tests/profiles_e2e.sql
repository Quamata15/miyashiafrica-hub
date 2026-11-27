-- Recruiting, interviews, provider packs and invoices, space summaries.
-- One transaction, always rolled back by the final RAISE. Any "=NO" in the result is a failure.
DO $$
DECLARE emp uuid := gen_random_uuid(); c1 uuid := gen_random_uuid(); c2 uuid := gen_random_uuid(); other uuid := gen_random_uuid();
  prov uuid := gen_random_uuid(); cli uuid := gen_random_uuid();
  j uuid; a1 uuid; a2 uuid; r jsonb; log text := ''; n int; iv uuid; lv uuid; svc uuid; pk uuid; inv1 uuid; inv2 uuid; t text; bal numeric;
  ok boolean;
BEGIN
  INSERT INTO auth.users (id, email, instance_id, aud, role, created_at) VALUES
    (emp, 'emp_t@x.test', '00000000-0000-0000-0000-000000000000','authenticated','authenticated', now()),
    (c1, 'cand1_t@x.test', '00000000-0000-0000-0000-000000000000','authenticated','authenticated', now()),
    (c2, 'cand2_t@x.test', '00000000-0000-0000-0000-000000000000','authenticated','authenticated', now()),
    (other, 'other_t@x.test', '00000000-0000-0000-0000-000000000000','authenticated','authenticated', now()),
    (prov, 'prov_t@x.test', '00000000-0000-0000-0000-000000000000','authenticated','authenticated', now()),
    (cli, 'cli_t@x.test', '00000000-0000-0000-0000-000000000000','authenticated','authenticated', now());
  UPDATE profiles SET full_name = 'Afi Mensah', location = 'Lomé' WHERE user_id = c1;
  UPDATE profiles SET full_name = 'Kofi Boateng' WHERE user_id = c2;
  INSERT INTO user_roles (user_id, role) VALUES (emp, 'employer'), (c1, 'freelance'), (c2, 'freelance'), (prov, 'provider');
  INSERT INTO freelance_profiles (user_id, title, skills, experience_years, languages, location)
  VALUES (c1, 'Développeuse full-stack', ARRAY['React.js','Node','SQL','Figma'], 4, ARRAY['Français','anglais'], 'Lomé, Togo'),
         (c2, 'Graphiste', ARRAY['Photoshop'], 1, ARRAY['Anglais'], 'Accra');

  -- Recruiter publishes a detailed offer
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', emp, 'role','authenticated')::text, true);
  INSERT INTO employer_profiles (user_id, company_name, verified) VALUES (emp, 'Togo Tech SARL', true);
  log := log || ' verified_forced=' || CASE WHEN (SELECT verified FROM employer_profiles WHERE user_id = emp) THEN 'NO' ELSE 'ok' END;
  INSERT INTO jobs (employer_id, title, description, skills_required, skill_weights, nice_to_have, experience_min, languages, location, remote_mode, contract_type, screening_questions, is_active)
  VALUES (emp, 'Développeur web', 'Application de livraison', ARRAY['React','Node.js','SQL'], '{"React":3}', ARRAY['Figma'], 3, ARRAY['Français','Anglais'], 'Lomé', 'hybrid', 'cdi',
          '[{"id":"s1","text":"Avez-vous le permis moto ?","type":"yesno","required":true,"knockout":"oui"},{"id":"s2","text":"Années de React","type":"number","knockout":"2"}]', true)
  RETURNING id INTO j;

  -- Candidates apply
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', c1, 'role','authenticated')::text, true);
  r := apply_to_job(j, 'Bonjour, je développe des applications React et Node depuis quatre ans à Lomé.', NULL, '{"s1":"oui","s2":"4"}');
  a1 := (r->>'id')::uuid; log := log || ' score1=' || (r->>'match_score') || CASE WHEN (r->>'match_score')::int >= 85 AND NOT (r->>'knocked_out')::boolean THEN '' ELSE '=NO' END;
  BEGIN PERFORM apply_to_job(j, 'Deuxième candidature identique pour tester le doublon.', NULL, '{"s1":"oui"}'); log := log || ' dup=NO';
  EXCEPTION WHEN OTHERS THEN log := log || ' dup=ok'; END;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', c2, 'role','authenticated')::text, true);
  r := apply_to_job(j, 'Je suis graphiste et je souhaite apprendre le développement web.', NULL, '{"s1":"non","s2":"1"}');
  a2 := (r->>'id')::uuid; log := log || ' score2=' || (r->>'match_score') || CASE WHEN (r->>'knocked_out')::boolean AND (r->>'match_score')::int < 40 THEN '' ELSE '=NO' END;

  -- Candidate cannot hire themselves (the hole this migration fixes)
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', c1, 'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN UPDATE applications SET stage = 'hired' WHERE id = a1; log := log || ' selfhire=NO'; EXCEPTION WHEN OTHERS THEN log := log || ' selfhire=ok'; END;
  BEGIN UPDATE applications SET status = 'accepted' WHERE id = a1; log := log || ' selfaccept=NO'; EXCEPTION WHEN OTHERS THEN log := log || ' selfaccept=ok'; END;
  UPDATE applications SET cover_letter = 'Version corrigée de ma lettre de motivation, plus précise.' WHERE id = a1;
  SELECT count(*) INTO n FROM interviews; log := log || ' cand_reads_interviews=' || CASE WHEN n = 0 THEN 'ok' ELSE 'NO' END;
  RESET ROLE;

  -- Recruiter works the pipeline
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', emp, 'role','authenticated')::text, true);
  SELECT count(*) INTO n FROM get_job_pipeline(j); log := log || ' pipeline=' || n;
  SELECT id INTO r FROM (SELECT to_jsonb(p.id) id FROM get_job_pipeline(j) p LIMIT 1) z;
  log := log || ' best_first=' || CASE WHEN (r #>> '{}')::uuid = a1 THEN 'ok' ELSE 'NO' END;
  n := move_applications(ARRAY[a1, a2], 'shortlisted', 'Votre profil nous intéresse.'); log := log || ' moved=' || n;
  PERFORM add_application_note(a1, 'Très bon profil, à appeler.');
  SET LOCAL ROLE authenticated;
  UPDATE applications SET cover_letter = 'falsifié', rating = 5, tags = ARRAY['top'] WHERE id = a1;
  RESET ROLE;
  SELECT cover_letter <> 'falsifié' AND rating = 5 INTO ok FROM applications WHERE id = a1; log := log || ' recruiter_cant_rewrite=' || CASE WHEN ok THEN 'ok' ELSE 'NO' END;
  log := log || ' rescored=' || rescore_job(j);
  r := get_recruiting_stats(); log := log || ' stats_apps=' || (r->>'applications');

  -- Candidate sees the stage but not the private note
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', c1, 'role','authenticated')::text, true);
  SELECT stage_label INTO t FROM my_applications() WHERE id = a1; log := log || ' cand_stage=' || t;
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM application_events WHERE application_id = a1 AND kind = 'note'; log := log || ' note_hidden=' || CASE WHEN n = 0 THEN 'ok' ELSE 'NO' END;
  RESET ROLE;

  -- AI interview end to end
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', emp, 'role','authenticated')::text, true);
  iv := schedule_interview(a1, 'ai');
  log := log || ' ai_questions=' || (SELECT jsonb_array_length(questions) FROM interviews WHERE id = iv);
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', c1, 'role','authenticated')::text, true);
  BEGIN PERFORM start_ai_interview(iv, false); log := log || ' consent_required=NO'; EXCEPTION WHEN OTHERS THEN log := log || ' consent_required=ok'; END;
  r := start_ai_interview(iv, true);
  log := log || ' keywords_hidden=' || CASE WHEN (r->'questions'->0) ? 'keywords' THEN 'NO' ELSE 'ok' END;
  log := log || ' upload_allowed=' || CASE WHEN interview_upload_allowed(iv::text) THEN 'ok' ELSE 'NO' END;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', other, 'role','authenticated')::text, true);
  log := log || ' stranger_upload=' || CASE WHEN interview_upload_allowed(iv::text) OR interview_participant(iv::text) THEN 'NO' ELSE 'ok' END;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', c1, 'role','authenticated')::text, true);
  PERFORM save_interview_answer(iv, 'q1', 'Je suis développeuse depuis quatre ans, j''ai livré trois projets pour des clients à Lomé.', iv::text || '/q1.webm', 75, '{"words":18}');
  BEGIN PERFORM save_interview_answer(iv, 'q1', 'x', 'autre/q1.webm', 5, '{}'); log := log || ' path_check=NO'; EXCEPTION WHEN OTHERS THEN log := log || ' path_check=ok'; END;
  PERFORM finish_ai_interview(iv);
  log := log || ' ai_status=' || (SELECT status FROM interviews WHERE id = iv);
  SELECT count(*) INTO n FROM my_interviews(); log := log || ' my_interviews=' || n;

  -- Live interview room
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', emp, 'role','authenticated')::text, true);
  lv := schedule_interview(a1, 'live', now() + interval '10 minutes', 45);
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', c1, 'role','authenticated')::text, true);
  r := join_interview_room(lv); log := log || ' room=' || (r->>'role') || CASE WHEN length(r->>'room') = 64 THEN '' ELSE '=NO' END;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', other, 'role','authenticated')::text, true);
  BEGIN PERFORM join_interview_room(lv); log := log || ' stranger_room=NO'; EXCEPTION WHEN OTHERS THEN log := log || ' stranger_room=ok'; END;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', emp, 'role','authenticated')::text, true);
  PERFORM save_interview_scorecard(lv, '{"criteria":{"technique":4,"communication":5},"average":4.5,"recommendation":"Recommandé"}', 'RAS');
  log := log || ' live_status=' || (SELECT status FROM interviews WHERE id = lv);

  -- Talent pool and recommendations
  SELECT count(*) INTO n FROM search_talent(NULL, ARRAY['react.js'], NULL, 0, 10) WHERE user_id = c1; log := log || ' talent=' || n;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', c2, 'role','authenticated')::text, true);
  BEGIN PERFORM search_talent(); log := log || ' talent_guard=NO'; EXCEPTION WHEN OTHERS THEN log := log || ' talent_guard=ok'; END;
  SET LOCAL ROLE authenticated;
  UPDATE applications SET stage = 'withdrawn' WHERE id = a2;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', c1, 'role','authenticated')::text, true);
  SELECT applied INTO ok FROM recommended_jobs(10) WHERE id = j; log := log || ' reco_applied=' || CASE WHEN ok THEN 'ok' ELSE 'NO' END;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', emp, 'role','authenticated')::text, true);
  log := log || ' move_withdrawn=' || move_applications(ARRAY[a2], 'interview');
  r := get_space_progress('recruteur'); log := log || ' progress=' || CASE WHEN (r->>'company')::boolean AND (r->>'screening')::boolean AND (r->>'interview')::boolean THEN 'ok' ELSE 'NO' END;

  -- Provider: pack ordered from the wallet, numbered invoices, frozen once issued
  UPDATE wallets SET balance = 50000 WHERE user_id = cli;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', prov, 'role','authenticated')::text, true);
  INSERT INTO services (provider_id, title, description, price, is_active) VALUES (prov, 'Installation solaire', 'Pose de panneaux', 10000, true) RETURNING id INTO svc;
  INSERT INTO service_packages (service_id, tier, name, price, delivery_days, revisions, features) VALUES (svc, 'standard', 'Standard', 15000, 2, 1, ARRAY['Pose','Réglage']) RETURNING id INTO pk;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', cli, 'role','authenticated')::text, true);
  r := order_service_package(pk, 'Toit en tôle', 'Lomé, Bè');
  SELECT balance INTO bal FROM wallets WHERE user_id = cli; log := log || ' pack_order=' || CASE WHEN (r->>'order_id') IS NOT NULL AND bal = 35000 THEN 'ok' ELSE 'NO' END;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', prov, 'role','authenticated')::text, true);
  INSERT INTO provider_invoices (provider_id, client_id, client_name, items, vat_rate) VALUES (prov, cli, 'Client test', '[{"label":"Pose","qty":2,"unit_price":5000}]', 18) RETURNING id INTO inv1;
  INSERT INTO provider_invoices (provider_id, client_name, items) VALUES (prov, 'Client comptoir', '[{"label":"Dépannage","qty":1,"unit_price":3000}]') RETURNING id INTO inv2;
  SELECT number || '/' || total INTO t FROM provider_invoices WHERE id = inv1; log := log || ' inv1=' || t;
  log := log || ' inv2=' || (SELECT number FROM provider_invoices WHERE id = inv2);
  UPDATE provider_invoices SET status = 'sent' WHERE id = inv1;
  BEGIN UPDATE provider_invoices SET items = '[{"label":"Pose","qty":1,"unit_price":1}]' WHERE id = inv1; log := log || ' frozen=NO'; EXCEPTION WHEN OTHERS THEN log := log || ' frozen=ok'; END;
  SET LOCAL ROLE authenticated;
  DELETE FROM provider_invoices WHERE id = inv1;
  RESET ROLE;
  log := log || ' sent_not_deleted=' || CASE WHEN EXISTS (SELECT 1 FROM provider_invoices WHERE id = inv1) THEN 'ok' ELSE 'NO' END;
  log := log || ' from_quote=' || CASE WHEN invoice_from_quote((r->>'quote_id')::uuid) IS NOT NULL THEN 'ok' ELSE 'NO' END;
  log := log || ' clients=' || (SELECT count(*) FROM get_provider_clients());
  log := log || ' unpaid=' || (get_provider_stats(30)->>'invoices_unpaid');
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', cli, 'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM provider_invoices; log := log || ' client_sees=' || n;
  RESET ROLE;
  r := get_buyer_summary(); log := log || ' buyer_escrow=' || (r->>'escrow_protected');
  log := log || ' notif_cli=' || (SELECT count(*) FROM notifications WHERE user_id = cli AND type = 'invoice');

  RAISE EXCEPTION 'RESULT:%', log;
END $$;
