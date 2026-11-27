-- Space functions are for signed-in users only (each checks rights itself); visitors keep
-- record_job_view. Fixed search_path on the two helpers flagged by the advisor.
DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'add_application_note(uuid, text)', 'apply_to_job(uuid, text, numeric, jsonb, text, numeric, date)', 'cancel_interview(uuid, text)', 'finish_ai_interview(uuid)',
    'get_buyer_summary()', 'get_driver_stats(integer)', 'get_job_pipeline(uuid)', 'get_provider_clients()', 'get_provider_stats(integer)', 'get_recruiting_stats()',
    'get_space_progress(text)', 'invoice_from_quote(uuid)', 'join_interview_room(uuid)', 'move_applications(uuid[], text, text, text)', 'my_applications()', 'my_interviews()',
    'order_service_package(uuid, text, text)', 'recommended_jobs(integer)', 'rescore_job(uuid)', 'save_interview_answer(uuid, text, text, text, numeric, jsonb)',
    'save_interview_scorecard(uuid, jsonb, text, boolean)', 'schedule_interview(uuid, text, timestamptz, integer, jsonb, integer, text, text)', 'search_talent(text, text[], text, integer, integer)',
    'start_ai_interview(uuid, boolean)'] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', f);
  END LOOP;
END $$;

ALTER FUNCTION public.stage_label(text) SET search_path = public;
ALTER FUNCTION public.default_interview_questions(text, text[]) SET search_path = public;
