-- Interview recordings: the storage rules looked the interview up in public.interviews, which
-- candidates cannot read directly (they use my_interviews()), so their uploads were refused.
-- The checks now go through two narrow functions that see the row whatever its read rules.
CREATE OR REPLACE FUNCTION public.interview_upload_allowed(p_folder text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM interviews WHERE id::text = p_folder AND candidate_id = auth.uid() AND kind = 'ai' AND status = 'in_progress')
$$;
CREATE OR REPLACE FUNCTION public.interview_participant(p_folder text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM interviews WHERE id::text = p_folder AND (employer_id = auth.uid() OR candidate_id = auth.uid()))
$$;
REVOKE EXECUTE ON FUNCTION public.interview_upload_allowed(text), public.interview_participant(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.interview_upload_allowed(text), public.interview_participant(text) TO authenticated;

DROP POLICY IF EXISTS "Candidate records answers during the interview" ON storage.objects;
DROP POLICY IF EXISTS "Interview recordings readable by both parties" ON storage.objects;
CREATE POLICY "Candidate records answers during the interview" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'interviews' AND public.interview_upload_allowed((storage.foldername(name))[1]));
CREATE POLICY "Interview recordings readable by both parties" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'interviews' AND public.interview_participant((storage.foldername(name))[1]));
