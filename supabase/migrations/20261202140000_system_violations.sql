-- Automatic reports (3 contact attempts in 30 days) have no human reporter: reported_by was
-- NOT NULL, so the third attempt raised an error and the person's message could not be sent.
ALTER TABLE public.vendor_violations ALTER COLUMN reported_by DROP NOT NULL;
COMMENT ON COLUMN public.vendor_violations.reported_by IS 'NULL = signalement automatique';
