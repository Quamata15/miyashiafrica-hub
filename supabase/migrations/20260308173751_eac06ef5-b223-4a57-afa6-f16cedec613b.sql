
-- Create dispute_events table
CREATE TABLE IF NOT EXISTS public.dispute_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  user_id uuid,
  event_type text NOT NULL DEFAULT 'message',
  content text,
  attachment_url text,
  attachment_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dispute_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dispute participants can view events"
  ON public.dispute_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM disputes d
      WHERE d.id = dispute_events.dispute_id
        AND (d.opened_by = auth.uid() OR d.against_user = auth.uid())
    )
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Dispute participants can add events"
  ON public.dispute_events FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM disputes d
      WHERE d.id = dispute_events.dispute_id
        AND (d.opened_by = auth.uid() OR d.against_user = auth.uid())
    )
  );

CREATE POLICY "Admins can manage dispute events"
  ON public.dispute_events FOR ALL
  USING (has_role(auth.uid(), 'admin'));
