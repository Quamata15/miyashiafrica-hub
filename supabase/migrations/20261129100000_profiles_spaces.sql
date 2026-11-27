-- Complete spaces for every profile: buyer, seller, driver, provider, freelance, recruiter.
--   * Recruiting: detailed job offers, candidate pipeline, CV scoring, notes, talent pool,
--     live video interviews and recorded AI interviews.
--   * Freelance: saved jobs, CV, recommended jobs, own interviews.
--   * Provider: Basic/Standard/Premium packs, numbered invoices, public profile, clients.
--   * Every space: summary numbers and a progress checklist for its guide.
-- Also fixes a hole: candidates could set their own application to "accepted".

-- =====================================================================================
-- 1. Company profile for recruiters
-- =====================================================================================
CREATE TABLE IF NOT EXISTS public.employer_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text NOT NULL CHECK (char_length(company_name) BETWEEN 2 AND 120),
  logo_url text,
  website text CHECK (website IS NULL OR website ~* '^https?://'),
  sector text CHECK (char_length(sector) <= 80),
  size text CHECK (size IS NULL OR size IN ('1-10','11-50','51-200','201-1000','1000+')),
  city text CHECK (char_length(city) <= 80),
  country text CHECK (char_length(country) <= 2),
  about text CHECK (char_length(about) <= 3000),
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.employer_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company profiles are public" ON public.employer_profiles FOR SELECT USING (true);
CREATE POLICY "Recruiters manage their company" ON public.employer_profiles FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

-- Only admins set the "verified" badge.
CREATE OR REPLACE FUNCTION public.guard_employer_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.verified := CASE WHEN TG_OP = 'UPDATE' THEN OLD.verified ELSE false END;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_employer_profile ON public.employer_profiles;
CREATE TRIGGER guard_employer_profile BEFORE INSERT OR UPDATE ON public.employer_profiles FOR EACH ROW EXECUTE FUNCTION public.guard_employer_profile();

-- =====================================================================================
-- 2. Job offers: everything a candidate needs to decide, everything the scoring needs
-- =====================================================================================
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS company_name text CHECK (char_length(company_name) <= 120),
  ADD COLUMN IF NOT EXISTS location text CHECK (char_length(location) <= 120),
  ADD COLUMN IF NOT EXISTS country text CHECK (char_length(country) <= 2),
  ADD COLUMN IF NOT EXISTS remote_mode text NOT NULL DEFAULT 'onsite' CHECK (remote_mode IN ('onsite','hybrid','remote')),
  ADD COLUMN IF NOT EXISTS contract_type text NOT NULL DEFAULT 'freelance' CHECK (contract_type IN ('freelance','mission','cdi','cdd','stage','temps_partiel','apprentissage')),
  ADD COLUMN IF NOT EXISTS pay_period text NOT NULL DEFAULT 'mission' CHECK (pay_period IN ('mission','heure','jour','mois','an')),
  ADD COLUMN IF NOT EXISTS experience_min integer NOT NULL DEFAULT 0 CHECK (experience_min BETWEEN 0 AND 40),
  ADD COLUMN IF NOT EXISTS education_level text CHECK (char_length(education_level) <= 60),
  ADD COLUMN IF NOT EXISTS languages text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS nice_to_have text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS skill_weights jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(skill_weights) = 'object'),
  ADD COLUMN IF NOT EXISTS screening_questions jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(screening_questions) = 'array' AND jsonb_array_length(screening_questions) <= 10),
  ADD COLUMN IF NOT EXISTS openings integer NOT NULL DEFAULT 1 CHECK (openings BETWEEN 1 AND 500),
  ADD COLUMN IF NOT EXISTS blind_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_interview boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS interview_questions jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(interview_questions) = 'array' AND jsonb_array_length(interview_questions) <= 12),
  ADD COLUMN IF NOT EXISTS views integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS jobs_active_created_idx ON public.jobs (created_at DESC) WHERE is_active;
CREATE INDEX IF NOT EXISTS jobs_employer_idx ON public.jobs (employer_id);

-- Counting views without letting anyone write other columns.
CREATE OR REPLACE FUNCTION public.record_job_view(p_job_id uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE jobs SET views = views + 1 WHERE id = p_job_id AND is_active AND employer_id IS DISTINCT FROM auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.record_job_view(uuid) TO anon, authenticated;

-- =====================================================================================
-- 3. Candidate side of the freelance profile
-- =====================================================================================
ALTER TABLE public.freelance_profiles
  ADD COLUMN IF NOT EXISTS languages text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS location text CHECK (char_length(location) <= 120),
  ADD COLUMN IF NOT EXISTS education text CHECK (char_length(education) <= 300),
  ADD COLUMN IF NOT EXISTS contract_types text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS open_to_work boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS cv_path text,
  ADD COLUMN IF NOT EXISTS cv_text text CHECK (char_length(cv_text) <= 20000);

-- =====================================================================================
-- 4. Applications: pipeline stage, answers, CV, score, recruiter notes
-- =====================================================================================
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'new' CHECK (stage IN ('new','screening','shortlisted','interview','offer','hired','rejected','withdrawn')),
  ADD COLUMN IF NOT EXISTS answers jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(answers) = 'object'),
  ADD COLUMN IF NOT EXISTS cv_path text,
  ADD COLUMN IF NOT EXISTS expected_salary numeric CHECK (expected_salary IS NULL OR expected_salary >= 0),
  ADD COLUMN IF NOT EXISTS available_from date,
  ADD COLUMN IF NOT EXISTS match_score integer CHECK (match_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS match_breakdown jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS knocked_out boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_summary jsonb,
  ADD COLUMN IF NOT EXISTS rating integer CHECK (rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS reject_reason text CHECK (char_length(reject_reason) <= 500),
  ADD COLUMN IF NOT EXISTS stage_changed_at timestamptz NOT NULL DEFAULT now();

UPDATE public.applications SET stage = CASE status WHEN 'accepted' THEN 'hired' WHEN 'rejected' THEN 'rejected' ELSE 'new' END
WHERE stage = 'new' AND status IN ('accepted','rejected');

CREATE INDEX IF NOT EXISTS applications_job_stage_idx ON public.applications (job_id, stage);
CREATE INDEX IF NOT EXISTS applications_freelance_idx ON public.applications (freelance_id);

-- Lowercase, accent-free, trimmed, unique tags: "Développement Web " = "developpement web".
CREATE OR REPLACE FUNCTION public.norm_tags(p text[]) RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT COALESCE(array_agg(DISTINCT lower(public.f_unaccent(trim(x)))) FILTER (WHERE trim(x) <> ''), '{}')
  FROM unnest(COALESCE(p, '{}'::text[])) x
$$;

-- Rules-based match between a job and a candidate (0-100), explained part by part:
-- skills 50 (weighted 1-3), experience 20, languages 10, location 10, screening 10, +6 nice-to-have.
-- A failed knockout question (e.g. "Avez-vous le permis ?" expected "oui") flags the candidate.
CREATE OR REPLACE FUNCTION public.compute_match(p_job public.jobs, p_skills text[], p_exp integer, p_langs text[], p_location text, p_cv_text text, p_answers jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path = public, extensions AS $$
DECLARE
  req text[] := public.norm_tags(p_job.skills_required);
  nice text[] := public.norm_tags(p_job.nice_to_have);
  have text[] := public.norm_tags(p_skills);
  cv text := lower(public.f_unaccent(COALESCE(p_cv_text, '')));
  weights jsonb := '{}';
  k text; r text; wt numeric; tot numeric := 0; got numeric := 0;
  matched text[] := '{}'; missing text[] := '{}'; nice_hit text[] := '{}';
  lreq text[] := public.norm_tags(p_job.languages); lhave text[] := public.norm_tags(p_langs); lok int := 0;
  s_skills numeric; s_exp numeric; s_lang numeric; s_loc numeric; s_screen numeric; s_bonus numeric;
  loc_job text := lower(public.f_unaccent(COALESCE(p_job.location, '')));
  loc_me text := lower(public.f_unaccent(COALESCE(p_location, '')));
  q jsonb; a text; failed jsonb := '[]'; unanswered int := 0;
  v_score int;
BEGIN
  FOR k IN SELECT jsonb_object_keys(COALESCE(p_job.skill_weights, '{}')) LOOP
    weights := weights || jsonb_build_object(lower(public.f_unaccent(trim(k))), p_job.skill_weights -> k);
  END LOOP;

  FOREACH r IN ARRAY req LOOP
    wt := GREATEST(LEAST(COALESCE(NULLIF(weights ->> r, '')::numeric, 1), 3), 1);
    tot := tot + wt;
    IF EXISTS (SELECT 1 FROM unnest(have) h WHERE h = r OR (length(r) >= 3 AND length(h) >= 3 AND (position(r IN h) > 0 OR position(h IN r) > 0)) OR similarity(h, r) > 0.55)
       OR (length(r) >= 3 AND cv ~ ('(^|[^a-z0-9])' || regexp_replace(r, '([.+*?^$()\[\]{}|\\])', '\\\1', 'g') || '([^a-z0-9]|$)')) THEN
      got := got + wt; matched := matched || r;
    ELSE
      missing := missing || r;
    END IF;
  END LOOP;
  s_skills := CASE WHEN tot = 0 THEN 50 ELSE 50 * got / tot END;

  FOREACH r IN ARRAY nice LOOP
    IF EXISTS (SELECT 1 FROM unnest(have) h WHERE h = r OR similarity(h, r) > 0.55) OR (length(r) >= 3 AND position(r IN cv) > 0) THEN nice_hit := nice_hit || r; END IF;
  END LOOP;
  s_bonus := LEAST(COALESCE(array_length(nice_hit, 1), 0) * 2, 6);

  s_exp := CASE WHEN COALESCE(p_job.experience_min, 0) <= 0 THEN 20 ELSE 20 * LEAST(COALESCE(p_exp, 0)::numeric / p_job.experience_min, 1) END;

  IF COALESCE(array_length(lreq, 1), 0) = 0 THEN s_lang := 10;
  ELSE
    SELECT count(*) INTO lok FROM unnest(lreq) l WHERE l = ANY (lhave);
    s_lang := 10 * lok::numeric / array_length(lreq, 1);
  END IF;

  s_loc := CASE
    WHEN p_job.remote_mode = 'remote' OR loc_job = '' THEN 10
    WHEN loc_me <> '' AND (position(loc_job IN loc_me) > 0 OR position(loc_me IN loc_job) > 0) THEN 10
    WHEN p_job.remote_mode = 'hybrid' THEN 5
    ELSE 2 END;

  FOR q IN SELECT * FROM jsonb_array_elements(COALESCE(p_job.screening_questions, '[]')) LOOP
    a := lower(trim(COALESCE(p_answers ->> (q ->> 'id'), '')));
    IF COALESCE((q ->> 'required')::boolean, false) AND a = '' THEN unanswered := unanswered + 1; END IF;
    IF NULLIF(q ->> 'knockout', '') IS NOT NULL THEN
      IF (q ->> 'type') = 'number' THEN
        IF a !~ '^\d+([.,]\d+)?$' OR replace(a, ',', '.')::numeric < (q ->> 'knockout')::numeric THEN
          failed := failed || jsonb_build_object('id', q ->> 'id', 'text', q ->> 'text', 'expected', '≥ ' || (q ->> 'knockout'), 'answer', a);
        END IF;
      ELSIF a <> lower(q ->> 'knockout') THEN
        failed := failed || jsonb_build_object('id', q ->> 'id', 'text', q ->> 'text', 'expected', q ->> 'knockout', 'answer', a);
      END IF;
    END IF;
  END LOOP;
  s_screen := CASE WHEN jsonb_array_length(failed) > 0 THEN 0 ELSE GREATEST(10 - unanswered * 5, 0) END;

  v_score := LEAST(100, round(s_skills + s_exp + s_lang + s_loc + s_screen + s_bonus))::int;
  RETURN jsonb_build_object(
    'score', v_score,
    'knocked_out', jsonb_array_length(failed) > 0,
    'skills', jsonb_build_object('points', round(s_skills), 'max', 50, 'matched', to_jsonb(matched), 'missing', to_jsonb(missing)),
    'nice_to_have', jsonb_build_object('points', s_bonus, 'matched', to_jsonb(nice_hit)),
    'experience', jsonb_build_object('points', round(s_exp), 'max', 20, 'required', p_job.experience_min, 'have', COALESCE(p_exp, 0)),
    'languages', jsonb_build_object('points', round(s_lang), 'max', 10, 'required', to_jsonb(lreq), 'have', to_jsonb(lhave)),
    'location', jsonb_build_object('points', s_loc, 'max', 10, 'job', p_job.location, 'mode', p_job.remote_mode, 'candidate', p_location),
    'screening', jsonb_build_object('points', s_screen, 'max', 10, 'failed', failed, 'unanswered', unanswered)
  );
END $$;

-- Match for one candidate on one job, from their freelance profile (or nothing).
CREATE OR REPLACE FUNCTION public.match_for(p_job_id uuid, p_user_id uuid, p_answers jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE j jobs; f freelance_profiles; v_loc text;
BEGIN
  SELECT * INTO j FROM jobs WHERE id = p_job_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO f FROM freelance_profiles WHERE user_id = p_user_id;
  SELECT COALESCE(f.location, p.location) INTO v_loc FROM profiles p WHERE p.user_id = p_user_id;
  RETURN public.compute_match(j, f.skills, f.experience_years, f.languages, COALESCE(v_loc, f.location), f.cv_text || ' ' || COALESCE(f.title, '') || ' ' || COALESCE(f.bio, ''), COALESCE(p_answers, '{}'));
END $$;
REVOKE EXECUTE ON FUNCTION public.match_for(uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;

-- Who may change what on an application. Candidates edit while it is new and may withdraw;
-- recruiters move it through the pipeline but cannot rewrite what the candidate sent.
CREATE OR REPLACE FUNCTION public.guard_application() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_employer uuid; m jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF v_uid IS NOT NULL AND NOT public.has_role(v_uid, 'admin') THEN
      NEW.stage := 'new'; NEW.rating := NULL; NEW.tags := '{}'; NEW.ai_summary := NULL; NEW.reject_reason := NULL;
    END IF;
    m := public.match_for(NEW.job_id, NEW.freelance_id, NEW.answers);
    NEW.match_score := (m ->> 'score')::int; NEW.match_breakdown := COALESCE(m, '{}'); NEW.knocked_out := COALESCE((m ->> 'knocked_out')::boolean, false);
    NEW.status := 'pending'; NEW.stage_changed_at := now();
    RETURN NEW;
  END IF;

  IF NEW.job_id <> OLD.job_id OR NEW.freelance_id <> OLD.freelance_id THEN RAISE EXCEPTION 'Candidature non modifiable'; END IF;

  -- Older screens still write the legacy status column.
  IF NEW.stage = OLD.stage AND NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.stage := CASE NEW.status WHEN 'accepted' THEN 'hired' WHEN 'rejected' THEN 'rejected' WHEN 'withdrawn' THEN 'withdrawn' ELSE OLD.stage END;
  END IF;

  IF v_uid IS NOT NULL AND NOT public.has_role(v_uid, 'admin') THEN
    SELECT employer_id INTO v_employer FROM jobs WHERE id = OLD.job_id;
    IF v_uid = OLD.freelance_id THEN
      IF NEW.stage IS DISTINCT FROM OLD.stage AND NEW.stage <> 'withdrawn' THEN RAISE EXCEPTION 'Seul le recruteur fait avancer une candidature'; END IF;
      IF OLD.stage IN ('hired','rejected','withdrawn') AND NEW.stage IS DISTINCT FROM OLD.stage THEN RAISE EXCEPTION 'Candidature déjà clôturée'; END IF;
      IF OLD.stage NOT IN ('new','screening') AND (NEW.cover_letter IS DISTINCT FROM OLD.cover_letter OR NEW.proposed_rate IS DISTINCT FROM OLD.proposed_rate
         OR NEW.answers IS DISTINCT FROM OLD.answers OR NEW.cv_path IS DISTINCT FROM OLD.cv_path) THEN
        RAISE EXCEPTION 'Candidature déjà en cours d''examen : elle ne peut plus être modifiée';
      END IF;
      NEW.rating := OLD.rating; NEW.tags := OLD.tags; NEW.ai_summary := OLD.ai_summary; NEW.reject_reason := OLD.reject_reason;
      IF NEW.answers IS DISTINCT FROM OLD.answers THEN
        m := public.match_for(NEW.job_id, NEW.freelance_id, NEW.answers);
        NEW.match_score := (m ->> 'score')::int; NEW.match_breakdown := COALESCE(m, '{}'); NEW.knocked_out := COALESCE((m ->> 'knocked_out')::boolean, false);
      ELSE
        NEW.match_score := OLD.match_score; NEW.match_breakdown := OLD.match_breakdown; NEW.knocked_out := OLD.knocked_out;
      END IF;
    ELSIF v_uid = v_employer THEN
      NEW.cover_letter := OLD.cover_letter; NEW.proposed_rate := OLD.proposed_rate; NEW.answers := OLD.answers; NEW.cv_path := OLD.cv_path;
      NEW.expected_salary := OLD.expected_salary; NEW.available_from := OLD.available_from;
      IF OLD.stage = 'withdrawn' AND NEW.stage <> 'withdrawn' THEN RAISE EXCEPTION 'Le candidat a retiré sa candidature'; END IF;
      IF NEW.stage = 'withdrawn' AND OLD.stage <> 'withdrawn' THEN RAISE EXCEPTION 'Seul le candidat peut retirer sa candidature'; END IF;
    ELSE
      RAISE EXCEPTION 'Accès refusé';
    END IF;
  END IF;

  IF NEW.stage IS DISTINCT FROM OLD.stage THEN NEW.stage_changed_at := now(); END IF;
  NEW.status := CASE NEW.stage WHEN 'hired' THEN 'accepted' WHEN 'rejected' THEN 'rejected' WHEN 'withdrawn' THEN 'withdrawn' ELSE 'pending' END;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.guard_application() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_application ON public.applications;
CREATE TRIGGER guard_application BEFORE INSERT OR UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.guard_application();

-- Timeline of an application. Internal entries (notes) are for the recruiter only.
CREATE TABLE IF NOT EXISTS public.application_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  actor_id uuid,
  kind text NOT NULL CHECK (kind IN ('applied','stage','note','message','interview','rating','ai')),
  from_stage text,
  to_stage text,
  body text CHECK (char_length(body) <= 4000),
  internal boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS application_events_app_idx ON public.application_events (application_id, created_at);
ALTER TABLE public.application_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Recruiter reads the whole timeline" ON public.application_events FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM applications a JOIN jobs j ON j.id = a.job_id WHERE a.id = application_id AND j.employer_id = (select auth.uid())));
CREATE POLICY "Candidate reads what concerns them" ON public.application_events FOR SELECT TO authenticated USING (
  NOT internal AND EXISTS (SELECT 1 FROM applications a WHERE a.id = application_id AND a.freelance_id = (select auth.uid())));

-- Candidate applies: checks, scoring (in the trigger), timeline, notification.
CREATE OR REPLACE FUNCTION public.apply_to_job(p_job_id uuid, p_cover_letter text, p_proposed_rate numeric DEFAULT NULL, p_answers jsonb DEFAULT '{}',
  p_cv_path text DEFAULT NULL, p_expected_salary numeric DEFAULT NULL, p_available_from date DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE j jobs; v_id uuid; v_score int; v_ko boolean; q jsonb; v_name text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  IF NOT public.hit_rate_limit('apply:' || auth.uid(), 30, 86400) THEN RAISE EXCEPTION 'Trop de candidatures aujourd''hui, réessayez demain'; END IF;
  SELECT * INTO j FROM jobs WHERE id = p_job_id AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cette offre n''est plus disponible'; END IF;
  IF j.employer_id = auth.uid() THEN RAISE EXCEPTION 'Vous ne pouvez pas postuler à votre propre offre'; END IF;
  IF j.deadline IS NOT NULL AND j.deadline < now() THEN RAISE EXCEPTION 'La date limite de candidature est passée'; END IF;
  IF char_length(trim(COALESCE(p_cover_letter, ''))) < 30 THEN RAISE EXCEPTION 'Présentez-vous en quelques phrases (30 caractères minimum)'; END IF;
  IF char_length(p_cover_letter) > 5000 THEN RAISE EXCEPTION 'Message trop long (5000 caractères maximum)'; END IF;
  IF p_cv_path IS NOT NULL AND p_cv_path NOT LIKE auth.uid()::text || '/%' THEN RAISE EXCEPTION 'CV invalide'; END IF;
  IF jsonb_typeof(COALESCE(p_answers, '{}')) <> 'object' THEN RAISE EXCEPTION 'Réponses invalides'; END IF;
  FOR q IN SELECT * FROM jsonb_array_elements(j.screening_questions) LOOP
    IF COALESCE((q ->> 'required')::boolean, false) AND trim(COALESCE(p_answers ->> (q ->> 'id'), '')) = '' THEN
      RAISE EXCEPTION 'Répondez à la question : %', q ->> 'text';
    END IF;
  END LOOP;

  INSERT INTO applications (job_id, freelance_id, cover_letter, proposed_rate, answers, cv_path, expected_salary, available_from)
  VALUES (p_job_id, auth.uid(), trim(p_cover_letter), p_proposed_rate, COALESCE(p_answers, '{}'),
          COALESCE(p_cv_path, (SELECT cv_path FROM freelance_profiles WHERE user_id = auth.uid())), p_expected_salary, p_available_from)
  RETURNING id, match_score, knocked_out INTO v_id, v_score, v_ko;

  INSERT INTO application_events (application_id, actor_id, kind, to_stage, body, internal)
  VALUES (v_id, auth.uid(), 'applied', 'new', 'Candidature envoyée', false);

  SELECT COALESCE(full_name, 'Un candidat') INTO v_name FROM profiles WHERE user_id = auth.uid();
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (j.employer_id, 'application', 'Nouvelle candidature',
          CASE WHEN j.blind_review THEN 'Candidature anonyme' ELSE v_name END || ' — ' || j.title || ' · correspondance ' || COALESCE(v_score, 0) || '/100',
          jsonb_build_object('job_id', j.id, 'application_id', v_id, 'link', '/dashboard?espace=recruteur&onglet=pipeline&offre=' || j.id));
  RETURN jsonb_build_object('id', v_id, 'match_score', v_score, 'knocked_out', v_ko);
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'Vous avez déjà postulé à cette offre';
END $$;
GRANT EXECUTE ON FUNCTION public.apply_to_job(uuid, text, numeric, jsonb, text, numeric, date) TO authenticated;

-- What the candidate sees for each stage.
CREATE OR REPLACE FUNCTION public.stage_label(p_stage text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_stage WHEN 'new' THEN 'Reçue' WHEN 'screening' THEN 'En cours d''examen' WHEN 'shortlisted' THEN 'Présélectionnée'
    WHEN 'interview' THEN 'Entretien' WHEN 'offer' THEN 'Proposition' WHEN 'hired' THEN 'Retenue' WHEN 'rejected' THEN 'Non retenue'
    WHEN 'withdrawn' THEN 'Retirée' ELSE p_stage END
$$;

-- Recruiter moves one or many applications; the candidate is told, with an optional message.
CREATE OR REPLACE FUNCTION public.move_applications(p_ids uuid[], p_stage text, p_message text DEFAULT NULL, p_reason text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a record; n int := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  IF p_stage NOT IN ('new','screening','shortlisted','interview','offer','hired','rejected') THEN RAISE EXCEPTION 'Étape inconnue'; END IF;
  IF array_length(p_ids, 1) > 200 THEN RAISE EXCEPTION '200 candidatures maximum à la fois'; END IF;
  IF char_length(p_message) > 2000 THEN RAISE EXCEPTION 'Message trop long'; END IF;
  FOR a IN SELECT ap.*, j.title AS job_title, j.employer_id FROM applications ap JOIN jobs j ON j.id = ap.job_id
           WHERE ap.id = ANY (p_ids) AND j.employer_id = auth.uid() AND ap.stage <> 'withdrawn' FOR UPDATE OF ap LOOP
    IF a.stage = p_stage THEN CONTINUE; END IF;
    UPDATE applications SET stage = p_stage, reject_reason = CASE WHEN p_stage = 'rejected' THEN COALESCE(p_reason, reject_reason) ELSE reject_reason END WHERE id = a.id;
    INSERT INTO application_events (application_id, actor_id, kind, from_stage, to_stage, body, internal)
    VALUES (a.id, auth.uid(), 'stage', a.stage, p_stage, NULLIF(trim(COALESCE(p_message, '')), ''), false);
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (a.freelance_id, 'application', 'Candidature : ' || public.stage_label(p_stage),
            a.job_title || COALESCE(' — ' || NULLIF(trim(COALESCE(p_message, '')), ''), ''),
            jsonb_build_object('application_id', a.id, 'job_id', a.job_id, 'stage', p_stage, 'link', '/dashboard?espace=freelance&onglet=candidatures'));
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;
GRANT EXECUTE ON FUNCTION public.move_applications(uuid[], text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.add_application_note(p_id uuid, p_body text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF char_length(trim(COALESCE(p_body, ''))) < 1 OR char_length(p_body) > 4000 THEN RAISE EXCEPTION 'Note vide ou trop longue'; END IF;
  IF NOT EXISTS (SELECT 1 FROM applications a JOIN jobs j ON j.id = a.job_id WHERE a.id = p_id AND j.employer_id = auth.uid()) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  INSERT INTO application_events (application_id, actor_id, kind, body, internal) VALUES (p_id, auth.uid(), 'note', trim(p_body), true);
END $$;
GRANT EXECUTE ON FUNCTION public.add_application_note(uuid, text) TO authenticated;

-- Re-score every application of a job after its criteria changed.
CREATE OR REPLACE FUNCTION public.rescore_job(p_job_id uuid) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a record; m jsonb; n int := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM jobs WHERE id = p_job_id AND employer_id = auth.uid()) AND NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  FOR a IN SELECT id, freelance_id, answers FROM applications WHERE job_id = p_job_id LOOP
    m := public.match_for(p_job_id, a.freelance_id, a.answers);
    UPDATE applications SET match_score = (m ->> 'score')::int, match_breakdown = COALESCE(m, '{}'), knocked_out = COALESCE((m ->> 'knocked_out')::boolean, false) WHERE id = a.id;
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;
GRANT EXECUTE ON FUNCTION public.rescore_job(uuid) TO authenticated;

-- Applications of one job for the recruiter, with candidate details (hidden in blind review).
CREATE OR REPLACE FUNCTION public.get_job_pipeline(p_job_id uuid) RETURNS TABLE (
  id uuid, freelance_id uuid, stage text, created_at timestamptz, stage_changed_at timestamptz, match_score integer, match_breakdown jsonb,
  knocked_out boolean, rating integer, tags text[], cover_letter text, proposed_rate numeric, expected_salary numeric, available_from date,
  answers jsonb, cv_path text, ai_summary jsonb, reject_reason text, full_name text, avatar_url text, location text, title text,
  skills text[], experience_years integer, languages text[], hourly_rate numeric, portfolio_urls text[], email text, phone text,
  interviews integer, notes integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
DECLARE j jobs;
BEGIN
  SELECT * INTO j FROM jobs WHERE jobs.id = p_job_id AND (jobs.employer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
  IF NOT FOUND THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  RETURN QUERY
  SELECT a.id, a.freelance_id, a.stage, a.created_at, a.stage_changed_at, a.match_score, a.match_breakdown, a.knocked_out, a.rating, a.tags,
         a.cover_letter, a.proposed_rate, a.expected_salary, a.available_from, a.answers, a.cv_path, a.ai_summary, a.reject_reason,
         CASE WHEN j.blind_review AND a.stage IN ('new','screening') THEN 'Candidat ' || upper(left(replace(a.id::text, '-', ''), 4)) ELSE p.full_name END,
         CASE WHEN j.blind_review AND a.stage IN ('new','screening') THEN NULL ELSE p.avatar_url END,
         COALESCE(f.location, p.location), f.title, f.skills, f.experience_years, f.languages, f.hourly_rate, f.portfolio_urls,
         CASE WHEN a.stage IN ('shortlisted','interview','offer','hired') THEN u.email::text END,
         CASE WHEN a.stage IN ('shortlisted','interview','offer','hired') THEN p.phone END,
         (SELECT count(*)::int FROM interviews i WHERE i.application_id = a.id),
         (SELECT count(*)::int FROM application_events e WHERE e.application_id = a.id AND e.kind = 'note')
  FROM applications a
  LEFT JOIN profiles p ON p.user_id = a.freelance_id
  LEFT JOIN freelance_profiles f ON f.user_id = a.freelance_id
  LEFT JOIN auth.users u ON u.id = a.freelance_id
  WHERE a.job_id = p_job_id
  ORDER BY a.knocked_out, a.match_score DESC NULLS LAST, a.created_at;
END $$;
GRANT EXECUTE ON FUNCTION public.get_job_pipeline(uuid) TO authenticated;


-- Talent pool: recruiters search open-to-work profiles and save candidates.
CREATE TABLE IF NOT EXISTS public.saved_candidates (
  employer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note text CHECK (char_length(note) <= 1000),
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (employer_id, candidate_id)
);
ALTER TABLE public.saved_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own talent pool" ON public.saved_candidates FOR ALL TO authenticated
  USING ((select auth.uid()) = employer_id) WITH CHECK ((select auth.uid()) = employer_id);

CREATE OR REPLACE FUNCTION public.search_talent(p_q text DEFAULT NULL, p_skills text[] DEFAULT '{}', p_location text DEFAULT NULL, p_min_exp integer DEFAULT 0, p_limit integer DEFAULT 30)
RETURNS TABLE (user_id uuid, full_name text, avatar_url text, title text, skills text[], experience_years integer, location text, languages text[],
  hourly_rate numeric, availability text, matched integer, saved boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
#variable_conflict use_column
DECLARE want text[] := public.norm_tags(p_skills); qn text := lower(public.f_unaccent(trim(COALESCE(p_q, ''))));
BEGIN
  IF NOT (public.has_role(auth.uid(), 'employer') OR public.has_role(auth.uid(), 'admin')) THEN RAISE EXCEPTION 'Réservé aux recruteurs'; END IF;
  RETURN QUERY
  SELECT f.user_id, p.full_name, p.avatar_url, f.title, f.skills, f.experience_years, COALESCE(f.location, p.location), f.languages, f.hourly_rate, f.availability,
         (SELECT count(*)::int FROM unnest(want) w WHERE w = ANY (public.norm_tags(f.skills))),
         EXISTS (SELECT 1 FROM saved_candidates s WHERE s.employer_id = auth.uid() AND s.candidate_id = f.user_id)
  FROM freelance_profiles f JOIN profiles p ON p.user_id = f.user_id
  WHERE f.open_to_work AND f.user_id <> auth.uid()
    AND COALESCE(f.experience_years, 0) >= COALESCE(p_min_exp, 0)
    AND (p_location IS NULL OR p_location = '' OR lower(public.f_unaccent(COALESCE(f.location, p.location, ''))) LIKE '%' || lower(public.f_unaccent(p_location)) || '%')
    AND (qn = '' OR lower(public.f_unaccent(COALESCE(f.title, '') || ' ' || COALESCE(f.bio, '') || ' ' || array_to_string(f.skills, ' ') || ' ' || COALESCE(p.full_name, ''))) LIKE '%' || qn || '%')
    AND (COALESCE(array_length(want, 1), 0) = 0 OR public.norm_tags(f.skills) && want)
  ORDER BY 11 DESC, f.experience_years DESC NULLS LAST, f.updated_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 30), 1), 100);
END $$;
GRANT EXECUTE ON FUNCTION public.search_talent(text, text[], text, integer, integer) TO authenticated;

-- Reusable messages (invitation, refusal, offer…).
CREATE TABLE IF NOT EXISTS public.recruiter_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  kind text NOT NULL DEFAULT 'custom' CHECK (kind IN ('invite','reject','offer','interview','custom')),
  body text NOT NULL CHECK (char_length(body) BETWEEN 2 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.recruiter_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own templates" ON public.recruiter_templates FOR ALL TO authenticated
  USING ((select auth.uid()) = owner_id) WITH CHECK ((select auth.uid()) = owner_id);

-- =====================================================================================
-- 5. Interviews: live video (WebRTC) and recorded AI interviews
-- =====================================================================================
CREATE TABLE IF NOT EXISTS public.interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  employer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('live','ai')),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','completed','cancelled','expired')),
  scheduled_at timestamptz,
  duration_min integer NOT NULL DEFAULT 30 CHECK (duration_min BETWEEN 10 AND 180),
  expires_at timestamptz,
  room_code text NOT NULL DEFAULT (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  external_url text CHECK (external_url IS NULL OR external_url ~* '^https://'),
  questions jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(questions) = 'array' AND jsonb_array_length(questions) <= 12),
  consent_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  report jsonb,
  scorecard jsonb,
  employer_notes text CHECK (char_length(employer_notes) <= 5000),
  cancel_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS interviews_employer_idx ON public.interviews (employer_id, status);
CREATE INDEX IF NOT EXISTS interviews_candidate_idx ON public.interviews (candidate_id, status);
CREATE INDEX IF NOT EXISTS interviews_application_idx ON public.interviews (application_id);
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
-- Recruiters read their interviews directly; candidates go through my_interviews() so they
-- never see the recruiter's notes, scorecard or evaluation keywords.
CREATE POLICY "Recruiter reads own interviews" ON public.interviews FOR SELECT TO authenticated USING ((select auth.uid()) = employer_id);

CREATE TABLE IF NOT EXISTS public.interview_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  question_id text NOT NULL,
  question text NOT NULL,
  transcript text CHECK (char_length(transcript) <= 20000),
  video_path text,
  duration_s numeric CHECK (duration_s IS NULL OR duration_s BETWEEN 0 AND 1800),
  metrics jsonb NOT NULL DEFAULT '{}',
  evaluation jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (interview_id, question_id)
);
ALTER TABLE public.interview_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Recruiter reads answers" ON public.interview_answers FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM interviews i WHERE i.id = interview_id AND i.employer_id = (select auth.uid())));

-- Default AI interview when the recruiter wrote no questions.
CREATE OR REPLACE FUNCTION public.default_interview_questions(p_title text, p_skills text[]) RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
  SELECT jsonb_build_array(
    jsonb_build_object('id', 'q1', 'text', 'Présentez-vous en deux minutes : votre parcours et ce qui vous amène vers ce poste de ' || COALESCE(p_title, 'ce poste') || '.', 'competency', 'Présentation', 'keywords', jsonb_build_array('expérience','projet','formation','motivation'), 'seconds', 120),
    jsonb_build_object('id', 'q2', 'text', 'Racontez une réalisation dont vous êtes fier : la situation, ce que vous avez fait, et le résultat obtenu.', 'competency', 'Réalisations', 'keywords', jsonb_build_array('résultat','client','équipe','objectif','chiffre'), 'seconds', 150),
    jsonb_build_object('id', 'q3', 'text', 'Comment utilisez-vous concrètement ' || COALESCE(NULLIF(array_to_string(p_skills[1:3], ', '), ''), 'vos compétences principales') || ' dans votre travail ?', 'competency', 'Compétences techniques', 'keywords', COALESCE(to_jsonb(p_skills[1:5]), '[]'::jsonb), 'seconds', 150),
    jsonb_build_object('id', 'q4', 'text', 'Parlez d''un désaccord ou d''une difficulté avec un client ou un collègue. Comment l''avez-vous réglé ?', 'competency', 'Relationnel', 'keywords', jsonb_build_array('écoute','solution','compromis','communication'), 'seconds', 120),
    jsonb_build_object('id', 'q5', 'text', 'Quelles sont vos disponibilités et vos attentes pour ce poste ?', 'competency', 'Disponibilité', 'keywords', jsonb_build_array('disponible','date','salaire','tarif'), 'seconds', 90)
  )
$$;

CREATE OR REPLACE FUNCTION public.schedule_interview(p_application_id uuid, p_kind text, p_scheduled_at timestamptz DEFAULT NULL, p_duration integer DEFAULT 30,
  p_questions jsonb DEFAULT NULL, p_expires_days integer DEFAULT 7, p_external_url text DEFAULT NULL, p_message text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a applications; j jobs; v_id uuid; v_q jsonb; q jsonb; i int := 0; v_clean jsonb := '[]';
BEGIN
  SELECT * INTO a FROM applications WHERE id = p_application_id;
  SELECT * INTO j FROM jobs WHERE id = a.job_id;
  IF NOT FOUND OR j.employer_id <> auth.uid() THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  IF a.stage IN ('rejected','withdrawn','hired') THEN RAISE EXCEPTION 'Candidature clôturée'; END IF;
  IF p_kind NOT IN ('live','ai') THEN RAISE EXCEPTION 'Type d''entretien inconnu'; END IF;
  IF p_kind = 'live' AND (p_scheduled_at IS NULL OR p_scheduled_at < now() - interval '5 minutes') THEN RAISE EXCEPTION 'Choisissez une date à venir'; END IF;
  IF EXISTS (SELECT 1 FROM interviews WHERE application_id = a.id AND kind = p_kind AND status IN ('scheduled','in_progress')) THEN
    RAISE EXCEPTION 'Un entretien de ce type est déjà prévu pour ce candidat';
  END IF;

  v_q := COALESCE(NULLIF(p_questions, '[]'::jsonb), NULLIF(j.interview_questions, '[]'::jsonb), public.default_interview_questions(j.title, j.skills_required));
  IF jsonb_typeof(v_q) <> 'array' OR jsonb_array_length(v_q) > 12 THEN RAISE EXCEPTION 'Questions invalides (12 maximum)'; END IF;
  FOR q IN SELECT * FROM jsonb_array_elements(v_q) LOOP
    i := i + 1;
    IF char_length(COALESCE(q ->> 'text', '')) < 5 THEN RAISE EXCEPTION 'Question % trop courte', i; END IF;
    v_clean := v_clean || jsonb_build_object('id', COALESCE(NULLIF(q ->> 'id', ''), 'q' || i), 'text', left(q ->> 'text', 500),
      'competency', left(COALESCE(q ->> 'competency', ''), 60), 'keywords', COALESCE(q -> 'keywords', '[]'),
      'seconds', LEAST(GREATEST(COALESCE((q ->> 'seconds')::int, 120), 30), 600));
  END LOOP;

  INSERT INTO interviews (application_id, job_id, employer_id, candidate_id, kind, scheduled_at, duration_min, expires_at, external_url, questions)
  VALUES (a.id, j.id, auth.uid(), a.freelance_id, p_kind, p_scheduled_at, LEAST(GREATEST(COALESCE(p_duration, 30), 10), 180),
          CASE WHEN p_kind = 'ai' THEN now() + make_interval(days => LEAST(GREATEST(COALESCE(p_expires_days, 7), 1), 30)) END,
          NULLIF(trim(COALESCE(p_external_url, '')), ''), v_clean)
  RETURNING id INTO v_id;

  IF a.stage IN ('new','screening','shortlisted') THEN
    UPDATE applications SET stage = 'interview' WHERE id = a.id;
  END IF;
  INSERT INTO application_events (application_id, actor_id, kind, from_stage, to_stage, body, internal)
  VALUES (a.id, auth.uid(), 'interview', a.stage, 'interview',
          CASE WHEN p_kind = 'live' THEN 'Entretien vidéo prévu le ' || to_char(p_scheduled_at AT TIME ZONE 'Africa/Abidjan', 'DD/MM/YYYY à HH24:MI') || ' (GMT)'
               ELSE 'Entretien enregistré avec l''assistant à passer avant le ' || to_char((now() + make_interval(days => COALESCE(p_expires_days, 7))) AT TIME ZONE 'Africa/Abidjan', 'DD/MM/YYYY') END
          || COALESCE(E'\n' || NULLIF(trim(COALESCE(p_message, '')), ''), ''), false);
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (a.freelance_id, 'interview',
          CASE WHEN p_kind = 'live' THEN 'Entretien vidéo prévu' ELSE 'Entretien à passer en ligne' END,
          j.title || ' — ' || CASE WHEN p_kind = 'live' THEN to_char(p_scheduled_at AT TIME ZONE 'Africa/Abidjan', 'DD/MM à HH24:MI') || ' (GMT)' ELSE 'à faire quand vous voulez avant l''échéance' END,
          jsonb_build_object('interview_id', v_id, 'link', '/dashboard?espace=freelance&onglet=entretiens'));
  RETURN v_id;
END $$;
GRANT EXECUTE ON FUNCTION public.schedule_interview(uuid, text, timestamptz, integer, jsonb, integer, text, text) TO authenticated;

-- Candidate's interviews, without anything the recruiter keeps private.
CREATE OR REPLACE FUNCTION public.my_interviews() RETURNS TABLE (
  id uuid, kind text, status text, scheduled_at timestamptz, duration_min integer, expires_at timestamptz, external_url text,
  consent_at timestamptz, completed_at timestamptz, questions_count integer, answered integer, job_id uuid, job_title text, company text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT i.id, i.kind,
         CASE WHEN i.status = 'scheduled' AND i.kind = 'ai' AND i.expires_at < now() THEN 'expired' ELSE i.status END,
         i.scheduled_at, i.duration_min, i.expires_at, i.external_url, i.consent_at, i.completed_at,
         jsonb_array_length(i.questions), (SELECT count(*)::int FROM interview_answers x WHERE x.interview_id = i.id),
         j.id, j.title, COALESCE(j.company_name, e.company_name, p.full_name)
  FROM interviews i JOIN jobs j ON j.id = i.job_id
  LEFT JOIN employer_profiles e ON e.user_id = i.employer_id
  LEFT JOIN profiles p ON p.user_id = i.employer_id
  WHERE i.candidate_id = auth.uid()
  ORDER BY COALESCE(i.scheduled_at, i.expires_at) DESC NULLS LAST
$$;
GRANT EXECUTE ON FUNCTION public.my_interviews() TO authenticated;

-- Candidate opens an AI interview: consent required; returns the questions (without keywords).
CREATE OR REPLACE FUNCTION public.start_ai_interview(p_id uuid, p_consent boolean) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE i interviews;
BEGIN
  SELECT * INTO i FROM interviews WHERE id = p_id AND candidate_id = auth.uid() AND kind = 'ai' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Entretien introuvable'; END IF;
  IF i.status IN ('completed','cancelled') THEN RAISE EXCEPTION 'Cet entretien est terminé'; END IF;
  IF i.expires_at < now() THEN UPDATE interviews SET status = 'expired' WHERE id = p_id; RAISE EXCEPTION 'Le délai pour passer cet entretien est dépassé'; END IF;
  IF NOT COALESCE(p_consent, false) THEN RAISE EXCEPTION 'Votre accord est nécessaire pour enregistrer vos réponses'; END IF;
  UPDATE interviews SET status = 'in_progress', consent_at = COALESCE(consent_at, now()), started_at = COALESCE(started_at, now()), updated_at = now() WHERE id = p_id;
  RETURN jsonb_build_object(
    'questions', (SELECT jsonb_agg(jsonb_build_object('id', q ->> 'id', 'text', q ->> 'text', 'seconds', (q ->> 'seconds')::int)) FROM jsonb_array_elements(i.questions) q),
    'answered', (SELECT COALESCE(jsonb_agg(question_id), '[]') FROM interview_answers WHERE interview_id = p_id),
    'job_title', (SELECT title FROM jobs WHERE id = i.job_id));
END $$;
GRANT EXECUTE ON FUNCTION public.start_ai_interview(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.save_interview_answer(p_id uuid, p_question_id text, p_transcript text, p_video_path text, p_duration numeric, p_metrics jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE i interviews; v_q text;
BEGIN
  SELECT * INTO i FROM interviews WHERE id = p_id AND candidate_id = auth.uid() AND kind = 'ai';
  IF NOT FOUND OR i.status <> 'in_progress' THEN RAISE EXCEPTION 'Entretien non démarré'; END IF;
  SELECT q ->> 'text' INTO v_q FROM jsonb_array_elements(i.questions) q WHERE q ->> 'id' = p_question_id;
  IF v_q IS NULL THEN RAISE EXCEPTION 'Question inconnue'; END IF;
  IF p_video_path IS NOT NULL AND p_video_path NOT LIKE p_id::text || '/%' THEN RAISE EXCEPTION 'Enregistrement invalide'; END IF;
  INSERT INTO interview_answers (interview_id, question_id, question, transcript, video_path, duration_s, metrics)
  VALUES (p_id, p_question_id, v_q, left(p_transcript, 20000), p_video_path, p_duration, COALESCE(p_metrics, '{}'))
  ON CONFLICT (interview_id, question_id) DO UPDATE SET transcript = EXCLUDED.transcript, video_path = COALESCE(EXCLUDED.video_path, interview_answers.video_path),
    duration_s = EXCLUDED.duration_s, metrics = EXCLUDED.metrics, evaluation = NULL, created_at = now();
END $$;
GRANT EXECUTE ON FUNCTION public.save_interview_answer(uuid, text, text, text, numeric, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.finish_ai_interview(p_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE i interviews; v_name text; v_title text;
BEGIN
  SELECT * INTO i FROM interviews WHERE id = p_id AND candidate_id = auth.uid() AND kind = 'ai' FOR UPDATE;
  IF NOT FOUND OR i.status <> 'in_progress' THEN RAISE EXCEPTION 'Entretien non démarré'; END IF;
  IF NOT EXISTS (SELECT 1 FROM interview_answers WHERE interview_id = p_id) THEN RAISE EXCEPTION 'Répondez au moins à une question'; END IF;
  UPDATE interviews SET status = 'completed', completed_at = now(), updated_at = now() WHERE id = p_id;
  SELECT full_name INTO v_name FROM profiles WHERE user_id = auth.uid();
  SELECT title INTO v_title FROM jobs WHERE id = i.job_id;
  INSERT INTO application_events (application_id, actor_id, kind, body, internal) VALUES (i.application_id, auth.uid(), 'interview', 'Entretien enregistré terminé', false);
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (i.employer_id, 'interview', 'Entretien terminé', COALESCE(v_name, 'Le candidat') || ' a passé l''entretien pour « ' || v_title || ' »',
          jsonb_build_object('interview_id', p_id, 'link', '/dashboard?espace=recruteur&onglet=entretiens'));
END $$;
GRANT EXECUTE ON FUNCTION public.finish_ai_interview(uuid) TO authenticated;

-- Live interview room: both parties get the room code within the time window.
CREATE OR REPLACE FUNCTION public.join_interview_room(p_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE i interviews; v_role text; v_other uuid;
BEGIN
  SELECT * INTO i FROM interviews WHERE id = p_id AND kind = 'live' AND (employer_id = auth.uid() OR candidate_id = auth.uid());
  IF NOT FOUND THEN RAISE EXCEPTION 'Entretien introuvable'; END IF;
  IF i.status IN ('completed','cancelled','expired') THEN RAISE EXCEPTION 'Cet entretien est terminé'; END IF;
  IF now() < i.scheduled_at - interval '15 minutes' THEN RAISE EXCEPTION 'La salle ouvre 15 minutes avant l''heure prévue'; END IF;
  IF now() > i.scheduled_at + make_interval(mins => i.duration_min + 120) THEN RAISE EXCEPTION 'L''heure de cet entretien est passée'; END IF;
  v_role := CASE WHEN auth.uid() = i.employer_id THEN 'host' ELSE 'guest' END;
  v_other := CASE WHEN v_role = 'host' THEN i.candidate_id ELSE i.employer_id END;
  UPDATE interviews SET status = 'in_progress', started_at = COALESCE(started_at, now()), updated_at = now() WHERE id = p_id AND status = 'scheduled';
  RETURN jsonb_build_object('room', i.room_code, 'role', v_role, 'duration_min', i.duration_min, 'scheduled_at', i.scheduled_at,
    'other_name', (SELECT full_name FROM profiles WHERE user_id = v_other),
    'job_title', (SELECT title FROM jobs WHERE id = i.job_id),
    'questions', CASE WHEN v_role = 'host' THEN i.questions ELSE '[]'::jsonb END);
END $$;
GRANT EXECUTE ON FUNCTION public.join_interview_room(uuid) TO authenticated;

-- Recruiter closes a live interview with a structured scorecard (or reviews an AI one).
CREATE OR REPLACE FUNCTION public.save_interview_scorecard(p_id uuid, p_scorecard jsonb, p_notes text DEFAULT NULL, p_complete boolean DEFAULT true)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE i interviews;
BEGIN
  SELECT * INTO i FROM interviews WHERE id = p_id AND employer_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  IF jsonb_typeof(COALESCE(p_scorecard, '{}')) <> 'object' THEN RAISE EXCEPTION 'Grille invalide'; END IF;
  UPDATE interviews SET scorecard = p_scorecard, employer_notes = left(p_notes, 5000),
    status = CASE WHEN p_complete AND status IN ('scheduled','in_progress') THEN 'completed' ELSE status END,
    completed_at = CASE WHEN p_complete AND completed_at IS NULL THEN now() ELSE completed_at END, updated_at = now()
  WHERE id = p_id;
  INSERT INTO application_events (application_id, actor_id, kind, body, internal)
  VALUES (i.application_id, auth.uid(), 'rating', 'Grille d''entretien : ' || COALESCE(p_scorecard ->> 'recommendation', '—') || COALESCE(' · ' || (p_scorecard ->> 'average') || '/5', ''), true);
END $$;
GRANT EXECUTE ON FUNCTION public.save_interview_scorecard(uuid, jsonb, text, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_interview(p_id uuid, p_reason text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE i interviews; v_other uuid;
BEGIN
  SELECT * INTO i FROM interviews WHERE id = p_id AND (employer_id = auth.uid() OR candidate_id = auth.uid()) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Entretien introuvable'; END IF;
  IF i.status NOT IN ('scheduled','in_progress') THEN RAISE EXCEPTION 'Cet entretien ne peut plus être annulé'; END IF;
  UPDATE interviews SET status = 'cancelled', cancel_reason = left(p_reason, 500), updated_at = now() WHERE id = p_id;
  v_other := CASE WHEN auth.uid() = i.employer_id THEN i.candidate_id ELSE i.employer_id END;
  INSERT INTO application_events (application_id, actor_id, kind, body, internal) VALUES (i.application_id, auth.uid(), 'interview', 'Entretien annulé' || COALESCE(' : ' || p_reason, ''), false);
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (v_other, 'interview', 'Entretien annulé', COALESCE(p_reason, 'L''entretien a été annulé.'), jsonb_build_object('interview_id', p_id));
END $$;
GRANT EXECUTE ON FUNCTION public.cancel_interview(uuid, text) TO authenticated;

-- Recruiter's numbers: funnel, time to hire, upcoming interviews.
CREATE OR REPLACE FUNCTION public.get_recruiting_stats() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH my_jobs AS (SELECT * FROM jobs WHERE employer_id = auth.uid()),
       apps AS (SELECT a.* FROM applications a JOIN my_jobs j ON j.id = a.job_id)
  SELECT jsonb_build_object(
    'jobs_total', (SELECT count(*) FROM my_jobs),
    'jobs_active', (SELECT count(*) FROM my_jobs WHERE is_active),
    'views', (SELECT COALESCE(sum(views), 0) FROM my_jobs),
    'applications', (SELECT count(*) FROM apps),
    'new_7d', (SELECT count(*) FROM apps WHERE created_at > now() - interval '7 days'),
    'to_review', (SELECT count(*) FROM apps WHERE stage IN ('new','screening')),
    'by_stage', (SELECT COALESCE(jsonb_object_agg(stage, n), '{}') FROM (SELECT stage, count(*) n FROM apps GROUP BY stage) s),
    'avg_score', (SELECT round(avg(match_score)) FROM apps),
    'hired', (SELECT count(*) FROM apps WHERE stage = 'hired'),
    'days_to_hire', (SELECT round(avg(extract(epoch FROM stage_changed_at - created_at) / 86400)::numeric, 1) FROM apps WHERE stage = 'hired'),
    'interviews_upcoming', (SELECT count(*) FROM interviews WHERE employer_id = auth.uid() AND status IN ('scheduled','in_progress')),
    'interviews_to_review', (SELECT count(*) FROM interviews WHERE employer_id = auth.uid() AND status = 'completed' AND kind = 'ai' AND scorecard IS NULL)
  )
$$;
GRANT EXECUTE ON FUNCTION public.get_recruiting_stats() TO authenticated;

-- =====================================================================================
-- 6. Private files: CVs and interview recordings
-- =====================================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('cvs', 'cvs', false, 10485760, ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/jpeg','image/png','image/webp']),
  ('interviews', 'interviews', false, 104857600, ARRAY['video/webm','video/mp4','audio/webm','audio/ogg','audio/mp4'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Candidates upload their CV" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cvs' AND (storage.foldername(name))[1] = (select auth.uid())::text);
CREATE POLICY "Candidates replace their CV" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'cvs' AND (storage.foldername(name))[1] = (select auth.uid())::text);
CREATE POLICY "Candidates delete their CV" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'cvs' AND (storage.foldername(name))[1] = (select auth.uid())::text);
CREATE POLICY "CV readable by owner and recruiters they applied to" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'cvs' AND (
    (storage.foldername(name))[1] = (select auth.uid())::text
    OR EXISTS (SELECT 1 FROM public.applications a JOIN public.jobs j ON j.id = a.job_id
               WHERE j.employer_id = (select auth.uid()) AND a.freelance_id::text = (storage.foldername(name))[1])
    OR public.has_role((select auth.uid()), 'admin')));

CREATE POLICY "Candidate records answers during the interview" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'interviews' AND EXISTS (SELECT 1 FROM public.interviews i
    WHERE i.id::text = (storage.foldername(name))[1] AND i.candidate_id = (select auth.uid()) AND i.status = 'in_progress'));
CREATE POLICY "Interview recordings readable by both parties" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'interviews' AND EXISTS (SELECT 1 FROM public.interviews i
    WHERE i.id::text = (storage.foldername(name))[1] AND (i.employer_id = (select auth.uid()) OR i.candidate_id = (select auth.uid()))));

-- =====================================================================================
-- 7. Freelance: saved jobs and recommendations
-- =====================================================================================
CREATE TABLE IF NOT EXISTS public.saved_jobs (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, job_id)
);
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own saved jobs" ON public.saved_jobs FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION public.recommended_jobs(p_limit integer DEFAULT 20) RETURNS TABLE (
  id uuid, title text, company text, location text, remote_mode text, contract_type text, budget_min numeric, budget_max numeric, pay_period text,
  skills_required text[], deadline timestamptz, created_at timestamptz, score integer, breakdown jsonb, applied boolean, saved boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
DECLARE f freelance_profiles; v_loc text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  SELECT * INTO f FROM freelance_profiles WHERE user_id = auth.uid();
  SELECT COALESCE(f.location, p.location) INTO v_loc FROM profiles p WHERE p.user_id = auth.uid();
  RETURN QUERY
  SELECT x.id, x.title, x.company, x.location, x.remote_mode, x.contract_type, x.budget_min, x.budget_max, x.pay_period, x.skills_required, x.deadline, x.created_at,
         (x.m ->> 'score')::int, x.m, x.applied, x.saved
  FROM (
    SELECT j.*, COALESCE(j.company_name, e.company_name) AS company,
           public.compute_match(j, f.skills, f.experience_years, f.languages, v_loc, COALESCE(f.cv_text, '') || ' ' || COALESCE(f.title, ''), '{}') AS m,
           EXISTS (SELECT 1 FROM applications a WHERE a.job_id = j.id AND a.freelance_id = auth.uid()) AS applied,
           EXISTS (SELECT 1 FROM saved_jobs s WHERE s.job_id = j.id AND s.user_id = auth.uid()) AS saved
    FROM (SELECT jj.* FROM jobs jj WHERE jj.is_active AND jj.employer_id <> auth.uid() AND (jj.deadline IS NULL OR jj.deadline > now()) ORDER BY jj.created_at DESC LIMIT 300) j
    LEFT JOIN employer_profiles e ON e.user_id = j.employer_id
  ) x
  ORDER BY x.applied, (x.m ->> 'score')::int DESC, x.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
END $$;
GRANT EXECUTE ON FUNCTION public.recommended_jobs(integer) TO authenticated;

-- Candidate's applications with job, stage and next step.
CREATE OR REPLACE FUNCTION public.my_applications() RETURNS TABLE (
  id uuid, job_id uuid, job_title text, company text, stage text, stage_label text, created_at timestamptz, stage_changed_at timestamptz,
  match_score integer, proposed_rate numeric, is_active boolean, next_interview timestamptz, pending_ai_interview uuid, last_message text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, j.id, j.title, COALESCE(j.company_name, e.company_name, p.full_name), a.stage, public.stage_label(a.stage), a.created_at, a.stage_changed_at,
         a.match_score, a.proposed_rate, j.is_active,
         (SELECT min(i.scheduled_at) FROM interviews i WHERE i.application_id = a.id AND i.kind = 'live' AND i.status IN ('scheduled','in_progress') AND i.scheduled_at > now() - interval '3 hours'),
         (SELECT i.id FROM interviews i WHERE i.application_id = a.id AND i.kind = 'ai' AND i.status IN ('scheduled','in_progress') AND (i.expires_at IS NULL OR i.expires_at > now()) LIMIT 1),
         (SELECT ev.body FROM application_events ev WHERE ev.application_id = a.id AND NOT ev.internal AND ev.body IS NOT NULL ORDER BY ev.created_at DESC LIMIT 1)
  FROM applications a JOIN jobs j ON j.id = a.job_id
  LEFT JOIN employer_profiles e ON e.user_id = j.employer_id
  LEFT JOIN profiles p ON p.user_id = j.employer_id
  WHERE a.freelance_id = auth.uid()
  ORDER BY a.stage_changed_at DESC
$$;
GRANT EXECUTE ON FUNCTION public.my_applications() TO authenticated;

-- =====================================================================================
-- 8. Provider: packs, invoices, public profile, clients, numbers
-- =====================================================================================
CREATE TABLE IF NOT EXISTS public.service_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  tier text NOT NULL CHECK (tier IN ('basic','standard','premium')),
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 60),
  description text CHECK (char_length(description) <= 600),
  price numeric NOT NULL CHECK (price >= 500 AND price <= 100000000),
  delivery_days integer NOT NULL DEFAULT 3 CHECK (delivery_days BETWEEN 0 AND 365),
  revisions integer NOT NULL DEFAULT 1 CHECK (revisions BETWEEN 0 AND 20),
  features text[] NOT NULL DEFAULT '{}' CHECK (array_length(features, 1) IS NULL OR array_length(features, 1) <= 12),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (service_id, tier)
);
ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Packs of active services are public" ON public.service_packages FOR SELECT USING (
  is_active AND EXISTS (SELECT 1 FROM services s WHERE s.id = service_id AND s.is_active));
CREATE POLICY "Providers manage their packs" ON public.service_packages FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM services s WHERE s.id = service_id AND s.provider_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM services s WHERE s.id = service_id AND s.provider_id = (select auth.uid())));

-- Ordering a pack: a one-line quote, accepted at once (wallet → escrow → order).
CREATE OR REPLACE FUNCTION public.order_service_package(p_package_id uuid, p_notes text DEFAULT NULL, p_address text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pk service_packages; s services; v_quote uuid; v_res jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  SELECT * INTO pk FROM service_packages WHERE id = p_package_id AND is_active;
  SELECT * INTO s FROM services WHERE id = pk.service_id AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Formule indisponible'; END IF;
  IF s.provider_id = auth.uid() THEN RAISE EXCEPTION 'Vous ne pouvez pas commander votre propre formule'; END IF;
  INSERT INTO quotes (provider_id, client_id, service_id, title, items, total, notes, valid_until, status)
  VALUES (s.provider_id, auth.uid(), s.id, s.title || ' — formule ' || pk.name,
          jsonb_build_array(jsonb_build_object('label', s.title || ' — ' || pk.name || ' (' || pk.delivery_days || ' j, ' || pk.revisions || ' retouche(s))', 'qty', 1, 'unit_price', pk.price)),
          pk.price, left(p_notes, 2000), current_date + 1, 'sent')
  RETURNING id INTO v_quote;
  v_res := public.accept_quote(v_quote, p_address);
  RETURN v_res || jsonb_build_object('quote_id', v_quote);
END $$;
GRANT EXECUTE ON FUNCTION public.order_service_package(uuid, text, text) TO authenticated;

CREATE TABLE IF NOT EXISTS public.provider_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  number text,
  client_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  client_name text NOT NULL CHECK (char_length(client_name) BETWEEN 2 AND 120),
  client_email text CHECK (char_length(client_email) <= 160),
  client_phone text CHECK (char_length(client_phone) <= 40),
  client_address text CHECK (char_length(client_address) <= 300),
  items jsonb NOT NULL CHECK (jsonb_typeof(items) = 'array'),
  subtotal numeric NOT NULL DEFAULT 0,
  vat_rate numeric NOT NULL DEFAULT 0 CHECK (vat_rate BETWEEN 0 AND 30),
  vat_amount numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','cancelled')),
  issued_at date NOT NULL DEFAULT current_date,
  due_date date,
  paid_at timestamptz,
  payment_method text CHECK (char_length(payment_method) <= 40),
  notes text CHECK (char_length(notes) <= 2000),
  quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id, number)
);
CREATE INDEX IF NOT EXISTS provider_invoices_provider_idx ON public.provider_invoices (provider_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS provider_invoices_client_idx ON public.provider_invoices (client_id);
ALTER TABLE public.provider_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Providers read their invoices" ON public.provider_invoices FOR SELECT TO authenticated USING ((select auth.uid()) = provider_id);
CREATE POLICY "Providers create invoices" ON public.provider_invoices FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = provider_id);
CREATE POLICY "Providers update their invoices" ON public.provider_invoices FOR UPDATE TO authenticated
  USING ((select auth.uid()) = provider_id) WITH CHECK ((select auth.uid()) = provider_id);
-- Only drafts can be deleted: an issued invoice is cancelled, never erased.
CREATE POLICY "Providers delete draft invoices" ON public.provider_invoices FOR DELETE TO authenticated USING ((select auth.uid()) = provider_id AND status = 'draft');
CREATE POLICY "Clients read invoices sent to them" ON public.provider_invoices FOR SELECT TO authenticated
  USING ((select auth.uid()) = client_id AND status <> 'draft');

-- Totals are computed here; numbers are sequential per provider and per year (F2026-0001);
-- once an invoice is issued its content is frozen (cancel and reissue to correct it).
CREATE OR REPLACE FUNCTION public.prepare_provider_invoice() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE it jsonb; v_sub numeric := 0; v_n int;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status <> 'draft' THEN
    IF NEW.items IS DISTINCT FROM OLD.items OR NEW.client_name IS DISTINCT FROM OLD.client_name OR NEW.client_id IS DISTINCT FROM OLD.client_id
       OR NEW.vat_rate IS DISTINCT FROM OLD.vat_rate OR NEW.discount IS DISTINCT FROM OLD.discount OR NEW.number IS DISTINCT FROM OLD.number OR NEW.issued_at IS DISTINCT FROM OLD.issued_at THEN
      RAISE EXCEPTION 'Une facture émise ne se modifie plus : annulez-la et créez-en une nouvelle';
    END IF;
    IF OLD.status IN ('paid','cancelled') AND NEW.status IS DISTINCT FROM OLD.status THEN RAISE EXCEPTION 'Facture déjà clôturée'; END IF;
    IF OLD.status = 'sent' AND NEW.status = 'draft' THEN RAISE EXCEPTION 'Une facture émise ne repasse pas en brouillon'; END IF;
  END IF;
  IF jsonb_array_length(NEW.items) = 0 OR jsonb_array_length(NEW.items) > 50 THEN RAISE EXCEPTION 'Ajoutez entre 1 et 50 lignes'; END IF;
  FOR it IN SELECT * FROM jsonb_array_elements(NEW.items) LOOP
    IF char_length(COALESCE(it ->> 'label', '')) < 2 OR COALESCE((it ->> 'qty')::numeric, 0) <= 0 OR COALESCE((it ->> 'unit_price')::numeric, -1) < 0 THEN
      RAISE EXCEPTION 'Ligne de facture invalide';
    END IF;
    v_sub := v_sub + (it ->> 'qty')::numeric * (it ->> 'unit_price')::numeric;
  END LOOP;
  NEW.subtotal := round(v_sub);
  NEW.discount := LEAST(COALESCE(NEW.discount, 0), NEW.subtotal);
  NEW.vat_amount := round((NEW.subtotal - NEW.discount) * NEW.vat_rate / 100);
  NEW.total := NEW.subtotal - NEW.discount + NEW.vat_amount;
  IF NEW.status = 'paid' AND NEW.paid_at IS NULL THEN NEW.paid_at := now(); END IF;
  IF TG_OP = 'INSERT' OR NEW.number IS NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext('invoice:' || NEW.provider_id::text));
    SELECT COALESCE(max(split_part(number, '-', 2)::int), 0) + 1 INTO v_n FROM provider_invoices
    WHERE provider_id = NEW.provider_id AND number LIKE 'F' || to_char(NEW.issued_at, 'YYYY') || '-%';
    NEW.number := 'F' || to_char(NEW.issued_at, 'YYYY') || '-' || lpad(v_n::text, 4, '0');
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS prepare_provider_invoice ON public.provider_invoices;
CREATE TRIGGER prepare_provider_invoice BEFORE INSERT OR UPDATE ON public.provider_invoices FOR EACH ROW EXECUTE FUNCTION public.prepare_provider_invoice();

CREATE OR REPLACE FUNCTION public.notify_invoice_sent() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.client_id IS NOT NULL AND NEW.status = 'sent' AND (TG_OP = 'INSERT' OR OLD.status = 'draft') THEN
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (NEW.client_id, 'invoice', 'Nouvelle facture ' || NEW.number,
            (SELECT COALESCE(full_name, 'Votre prestataire') FROM profiles WHERE user_id = NEW.provider_id) || ' — ' || NEW.total::text || ' FCFA',
            jsonb_build_object('invoice_id', NEW.id, 'link', '/dashboard?espace=acheteur&onglet=factures'));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS notify_invoice_sent ON public.provider_invoices;
CREATE TRIGGER notify_invoice_sent AFTER INSERT OR UPDATE OF status ON public.provider_invoices FOR EACH ROW EXECUTE FUNCTION public.notify_invoice_sent();
REVOKE EXECUTE ON FUNCTION public.prepare_provider_invoice(), public.notify_invoice_sent(), public.guard_employer_profile() FROM PUBLIC, anon, authenticated;

-- Draft invoice from an accepted quote.
CREATE OR REPLACE FUNCTION public.invoice_from_quote(p_quote_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q quotes; v_id uuid; c profiles; v_email text;
BEGIN
  SELECT * INTO q FROM quotes WHERE id = p_quote_id AND provider_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Devis introuvable'; END IF;
  SELECT id INTO v_id FROM provider_invoices WHERE quote_id = q.id AND status <> 'cancelled';
  IF FOUND THEN RETURN v_id; END IF;
  SELECT * INTO c FROM profiles WHERE user_id = q.client_id;
  SELECT email INTO v_email FROM auth.users WHERE id = q.client_id;
  INSERT INTO provider_invoices (provider_id, client_id, client_name, client_email, client_phone, client_address, items, quote_id, order_id, notes, due_date)
  VALUES (auth.uid(), q.client_id, COALESCE(c.full_name, 'Client'), v_email, c.phone, c.location,
          (SELECT jsonb_agg(jsonb_build_object('label', x ->> 'label', 'qty', (x ->> 'qty')::numeric, 'unit_price', (x ->> 'unit_price')::numeric)) FROM jsonb_array_elements(q.items) x),
          q.id, q.order_id, 'Devis : ' || q.title, current_date + 15)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;
GRANT EXECUTE ON FUNCTION public.invoice_from_quote(uuid) TO authenticated;

CREATE TABLE IF NOT EXISTS public.provider_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  headline text CHECK (char_length(headline) <= 100),
  about text CHECK (char_length(about) <= 3000),
  service_areas text[] NOT NULL DEFAULT '{}',
  languages text[] NOT NULL DEFAULT '{}',
  years_experience integer CHECK (years_experience BETWEEN 0 AND 70),
  certifications jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(certifications) = 'array'),
  response_hours integer NOT NULL DEFAULT 24 CHECK (response_hours BETWEEN 1 AND 168),
  accepts_urgent boolean NOT NULL DEFAULT false,
  travels boolean NOT NULL DEFAULT true,
  travel_fee numeric CHECK (travel_fee IS NULL OR travel_fee >= 0),
  is_available boolean NOT NULL DEFAULT true,
  cover_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.provider_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Provider profiles are public" ON public.provider_profiles FOR SELECT USING (true);
CREATE POLICY "Providers manage their profile" ON public.provider_profiles FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

-- The provider's clients, from orders, quotes and bookings.
CREATE OR REPLACE FUNCTION public.get_provider_clients() RETURNS TABLE (
  client_id uuid, full_name text, avatar_url text, phone text, orders integer, spent numeric, quotes integer, bookings integer, last_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH ev AS (
    SELECT buyer_id AS cid, 1 AS o, CASE WHEN payment_status = 'paid' THEN total_price ELSE 0 END AS amount, 0 AS q, 0 AS b, created_at FROM orders WHERE seller_id = auth.uid() AND service_id IS NOT NULL
    UNION ALL SELECT client_id, 0, 0, 1, 0, created_at FROM quotes WHERE provider_id = auth.uid()
    UNION ALL SELECT client_id, 0, 0, 0, 1, created_at FROM bookings WHERE provider_id = auth.uid()
  )
  SELECT ev.cid, p.full_name, p.avatar_url, p.phone, sum(o)::int, sum(amount), sum(q)::int, sum(b)::int, max(ev.created_at)
  FROM ev LEFT JOIN profiles p ON p.user_id = ev.cid
  GROUP BY ev.cid, p.full_name, p.avatar_url, p.phone
  ORDER BY max(ev.created_at) DESC
  LIMIT 500
$$;
GRANT EXECUTE ON FUNCTION public.get_provider_clients() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_provider_stats(p_days integer DEFAULT 30) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'revenue', (SELECT COALESCE(sum(total_price), 0) FROM orders WHERE seller_id = auth.uid() AND service_id IS NOT NULL AND payment_status = 'paid' AND created_at > now() - make_interval(days => p_days)),
    'orders_active', (SELECT count(*) FROM orders WHERE seller_id = auth.uid() AND service_id IS NOT NULL AND status NOT IN ('delivered','completed','cancelled','refunded')),
    'escrow_held', (SELECT COALESCE(sum(e.seller_amount), 0) FROM escrow_transactions e JOIN orders o ON o.id = e.order_id WHERE o.seller_id = auth.uid() AND o.service_id IS NOT NULL AND e.status = 'held'),
    'quotes_sent', (SELECT count(*) FROM quotes WHERE provider_id = auth.uid() AND created_at > now() - make_interval(days => p_days)),
    'quotes_accepted', (SELECT count(*) FROM quotes WHERE provider_id = auth.uid() AND status = 'accepted' AND created_at > now() - make_interval(days => p_days)),
    'quotes_pending', (SELECT count(*) FROM quotes WHERE provider_id = auth.uid() AND status = 'sent'),
    'bookings_upcoming', (SELECT count(*) FROM bookings WHERE provider_id = auth.uid() AND starts_at > now() AND status NOT IN ('cancelled')),
    'next_booking', (SELECT min(starts_at) FROM bookings WHERE provider_id = auth.uid() AND starts_at > now() AND status NOT IN ('cancelled')),
    'invoices_unpaid', (SELECT COALESCE(sum(total), 0) FROM provider_invoices WHERE provider_id = auth.uid() AND status = 'sent'),
    'invoices_overdue', (SELECT count(*) FROM provider_invoices WHERE provider_id = auth.uid() AND status = 'sent' AND due_date < current_date),
    'rating', (SELECT round(avg(rating)::numeric, 1) FROM reviews WHERE reviewed_user_id = auth.uid()),
    'reviews', (SELECT count(*) FROM reviews WHERE reviewed_user_id = auth.uid()),
    'services', (SELECT count(*) FROM services WHERE provider_id = auth.uid() AND is_active),
    'daily', (SELECT COALESCE(jsonb_agg(jsonb_build_object('day', d::date, 'revenue', COALESCE(r, 0)) ORDER BY d), '[]') FROM (
       SELECT d, (SELECT sum(total_price) FROM orders WHERE seller_id = auth.uid() AND service_id IS NOT NULL AND payment_status = 'paid' AND created_at::date = d::date) r
       FROM generate_series(current_date - (p_days - 1), current_date, interval '1 day') d) s)
  )
$$;
GRANT EXECUTE ON FUNCTION public.get_provider_stats(integer) TO authenticated;

-- =====================================================================================
-- 9. Buyer, seller and driver numbers
-- =====================================================================================
CREATE OR REPLACE FUNCTION public.get_buyer_summary() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'orders_active', (SELECT count(*) FROM orders WHERE buyer_id = auth.uid() AND status NOT IN ('delivered','completed','cancelled','refunded')),
    'orders_total', (SELECT count(*) FROM orders WHERE buyer_id = auth.uid()),
    'escrow_protected', (SELECT COALESCE(sum(total_amount), 0) FROM escrow_transactions WHERE payer_id = auth.uid() AND status = 'held'),
    'to_confirm', (SELECT count(*) FROM orders o WHERE o.buyer_id = auth.uid() AND o.status IN ('delivered','shipped') AND EXISTS (SELECT 1 FROM escrow_transactions e WHERE e.order_id = o.id AND e.status = 'held')),
    'to_review', (SELECT count(*) FROM orders o WHERE o.buyer_id = auth.uid() AND o.status IN ('delivered','completed') AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.order_id = o.id AND r.reviewer_id = auth.uid())),
    'wallet', (SELECT COALESCE(balance, 0) FROM wallets WHERE user_id = auth.uid()),
    'favorites', (SELECT count(*) FROM favorites WHERE user_id = auth.uid()),
    'offers_open', (SELECT count(*) FROM price_offers WHERE buyer_id = auth.uid() AND status IN ('pending','countered')),
    'disputes_open', (SELECT count(*) FROM disputes WHERE opened_by = auth.uid() AND status NOT IN ('resolved','closed','rejected')),
    'quotes_received', (SELECT count(*) FROM quotes WHERE client_id = auth.uid() AND status = 'sent'),
    'invoices', (SELECT count(*) FROM provider_invoices WHERE client_id = auth.uid() AND status <> 'draft'),
    'spent', (SELECT COALESCE(sum(total_price), 0) FROM orders WHERE buyer_id = auth.uid() AND payment_status = 'paid')
  )
$$;
GRANT EXECUTE ON FUNCTION public.get_buyer_summary() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_driver_stats(p_days integer DEFAULT 30) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'available', (SELECT is_available FROM driver_profiles WHERE user_id = auth.uid()),
    'zone', (SELECT zone FROM driver_profiles WHERE user_id = auth.uid()),
    'rating', (SELECT average_rating FROM driver_profiles WHERE user_id = auth.uid()),
    'deliveries_total', (SELECT count(*) FROM delivery_requests WHERE driver_id = auth.uid() AND status = 'delivered'),
    'active', (SELECT count(*) FROM delivery_requests WHERE driver_id = auth.uid() AND status NOT IN ('delivered','cancelled','pending')),
    'open_requests', (SELECT count(*) FROM delivery_requests WHERE status = 'pending' AND driver_id IS NULL),
    'earned_period', (SELECT COALESCE(sum(total_delivery_price - COALESCE(commission, 0)), 0) FROM delivery_requests WHERE driver_id = auth.uid() AND status = 'delivered' AND delivered_at > now() - make_interval(days => p_days)),
    'earned_today', (SELECT COALESCE(sum(total_delivery_price - COALESCE(commission, 0)), 0) FROM delivery_requests WHERE driver_id = auth.uid() AND status = 'delivered' AND delivered_at::date = current_date),
    'km_period', (SELECT COALESCE(sum(distance_km), 0) FROM delivery_requests WHERE driver_id = auth.uid() AND status = 'delivered' AND delivered_at > now() - make_interval(days => p_days)),
    'proof_rate', (SELECT round(100.0 * count(*) FILTER (WHERE proof_photo_path IS NOT NULL OR proof_code_verified) / NULLIF(count(*), 0)) FROM delivery_requests WHERE driver_id = auth.uid() AND status = 'delivered'),
    'contract_signed', EXISTS (SELECT 1 FROM driver_contracts WHERE user_id = auth.uid()),
    'kyc', (SELECT status FROM kyc_documents WHERE user_id = auth.uid() ORDER BY submitted_at DESC LIMIT 1),
    'daily', (SELECT COALESCE(jsonb_agg(jsonb_build_object('day', d::date, 'earned', COALESCE(e, 0), 'count', COALESCE(c, 0)) ORDER BY d), '[]') FROM (
       SELECT d, (SELECT sum(total_delivery_price - COALESCE(commission, 0)) FROM delivery_requests WHERE driver_id = auth.uid() AND status = 'delivered' AND delivered_at::date = d::date) e,
                 (SELECT count(*) FROM delivery_requests WHERE driver_id = auth.uid() AND status = 'delivered' AND delivered_at::date = d::date) c
       FROM generate_series(current_date - (LEAST(p_days, 90) - 1), current_date, interval '1 day') d) s)
  )
$$;
GRANT EXECUTE ON FUNCTION public.get_driver_stats(integer) TO authenticated;

-- =====================================================================================
-- 10. Guide checklist for each space, from real data
-- =====================================================================================
CREATE OR REPLACE FUNCTION public.get_space_progress(p_space text) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE u uuid := auth.uid(); p profiles; r jsonb;
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  SELECT * INTO p FROM profiles WHERE user_id = u;
  r := jsonb_build_object(
    'email_verified', (SELECT email_confirmed_at IS NOT NULL FROM auth.users WHERE id = u),
    'name', COALESCE(char_length(p.full_name), 0) >= 3,
    'photo', p.avatar_url IS NOT NULL,
    'phone', p.phone IS NOT NULL,
    'kyc', EXISTS (SELECT 1 FROM kyc_documents WHERE user_id = u AND status IN ('approved','verified')),
    'kyc_sent', EXISTS (SELECT 1 FROM kyc_documents WHERE user_id = u),
    'mfa', EXISTS (SELECT 1 FROM auth.mfa_factors WHERE user_id = u AND status = 'verified'));
  r := r || CASE p_space
    WHEN 'acheteur' THEN jsonb_build_object(
      'address', EXISTS (SELECT 1 FROM addresses WHERE user_id = u),
      'wallet', EXISTS (SELECT 1 FROM wallet_transactions WHERE user_id = u AND amount > 0),
      'first_order', EXISTS (SELECT 1 FROM orders WHERE buyer_id = u),
      'review', EXISTS (SELECT 1 FROM reviews WHERE reviewer_id = u),
      'favorite', EXISTS (SELECT 1 FROM favorites WHERE user_id = u))
    WHEN 'vendeur' THEN jsonb_build_object(
      'shop', EXISTS (SELECT 1 FROM shops WHERE owner_id = u),
      'logo', EXISTS (SELECT 1 FROM shops WHERE owner_id = u AND logo_url IS NOT NULL),
      'first_product', EXISTS (SELECT 1 FROM products WHERE seller_id = u),
      'five_products', (SELECT count(*) >= 5 FROM products WHERE seller_id = u AND is_active),
      'photos', EXISTS (SELECT 1 FROM products WHERE seller_id = u AND COALESCE(array_length(images, 1), 0) >= 3),
      'first_sale', EXISTS (SELECT 1 FROM orders WHERE seller_id = u AND payment_status = 'paid'),
      'cod', EXISTS (SELECT 1 FROM shops WHERE owner_id = u AND accepts_cod))
    WHEN 'livreur' THEN jsonb_build_object(
      'driver_profile', EXISTS (SELECT 1 FROM driver_profiles WHERE user_id = u),
      'contract', EXISTS (SELECT 1 FROM driver_contracts WHERE user_id = u),
      'available', EXISTS (SELECT 1 FROM driver_profiles WHERE user_id = u AND is_available),
      'first_delivery', EXISTS (SELECT 1 FROM delivery_requests WHERE driver_id = u AND status = 'delivered'),
      'proof', EXISTS (SELECT 1 FROM delivery_requests WHERE driver_id = u AND (proof_photo_path IS NOT NULL OR proof_code_verified)))
    WHEN 'prestataire' THEN jsonb_build_object(
      'pro_profile', EXISTS (SELECT 1 FROM provider_profiles WHERE user_id = u AND headline IS NOT NULL),
      'first_service', EXISTS (SELECT 1 FROM services WHERE provider_id = u),
      'packs', EXISTS (SELECT 1 FROM service_packages sp JOIN services s ON s.id = sp.service_id WHERE s.provider_id = u),
      'availability', EXISTS (SELECT 1 FROM provider_availability WHERE provider_id = u),
      'portfolio', EXISTS (SELECT 1 FROM portfolio_items WHERE user_id = u),
      'first_quote', EXISTS (SELECT 1 FROM quotes WHERE provider_id = u),
      'first_invoice', EXISTS (SELECT 1 FROM provider_invoices WHERE provider_id = u))
    WHEN 'freelance' THEN jsonb_build_object(
      'freelance_profile', EXISTS (SELECT 1 FROM freelance_profiles WHERE user_id = u AND title IS NOT NULL),
      'skills', EXISTS (SELECT 1 FROM freelance_profiles WHERE user_id = u AND COALESCE(array_length(skills, 1), 0) >= 3),
      'cv', EXISTS (SELECT 1 FROM freelance_profiles WHERE user_id = u AND cv_path IS NOT NULL),
      'languages', EXISTS (SELECT 1 FROM freelance_profiles WHERE user_id = u AND COALESCE(array_length(languages, 1), 0) >= 1),
      'portfolio', EXISTS (SELECT 1 FROM portfolio_items WHERE user_id = u),
      'first_application', EXISTS (SELECT 1 FROM applications WHERE freelance_id = u))
    WHEN 'recruteur' THEN jsonb_build_object(
      'company', EXISTS (SELECT 1 FROM employer_profiles WHERE user_id = u),
      'first_job', EXISTS (SELECT 1 FROM jobs WHERE employer_id = u),
      'screening', EXISTS (SELECT 1 FROM jobs WHERE employer_id = u AND jsonb_array_length(screening_questions) > 0),
      'reviewed', EXISTS (SELECT 1 FROM applications a JOIN jobs j ON j.id = a.job_id WHERE j.employer_id = u AND a.stage <> 'new'),
      'interview', EXISTS (SELECT 1 FROM interviews WHERE employer_id = u),
      'template', EXISTS (SELECT 1 FROM recruiter_templates WHERE owner_id = u))
    ELSE '{}'::jsonb END;
  RETURN r;
END $$;
GRANT EXECUTE ON FUNCTION public.get_space_progress(text) TO authenticated;

-- Internal helpers are not callable from the API.
REVOKE EXECUTE ON FUNCTION public.compute_match(public.jobs, text[], integer, text[], text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.default_interview_questions(text, text[]) FROM PUBLIC, anon;
