
-- Loyalty points system
CREATE TABLE public.loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  level TEXT NOT NULL DEFAULT 'bronze',
  total_earned INTEGER NOT NULL DEFAULT 0,
  total_spent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own loyalty" ON public.loyalty_points
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own loyalty" ON public.loyalty_points
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all loyalty" ON public.loyalty_points
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Loyalty transactions log
CREATE TABLE public.loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  points INTEGER NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own loyalty transactions" ON public.loyalty_transactions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Function to award loyalty points
CREATE OR REPLACE FUNCTION public.award_loyalty_points(
  p_user_id UUID,
  p_points INTEGER,
  p_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_total INTEGER;
  v_new_level TEXT;
BEGIN
  -- Upsert loyalty record
  INSERT INTO loyalty_points (user_id, points, total_earned)
  VALUES (p_user_id, p_points, p_points)
  ON CONFLICT (user_id) DO UPDATE SET
    points = loyalty_points.points + p_points,
    total_earned = loyalty_points.total_earned + p_points,
    updated_at = now();

  -- Get new total
  SELECT total_earned INTO v_new_total FROM loyalty_points WHERE user_id = p_user_id;

  -- Compute level
  v_new_level := CASE
    WHEN v_new_total >= 10000 THEN 'platinum'
    WHEN v_new_total >= 5000 THEN 'gold'
    WHEN v_new_total >= 2000 THEN 'silver'
    ELSE 'bronze'
  END;

  UPDATE loyalty_points SET level = v_new_level WHERE user_id = p_user_id;

  -- Log transaction
  INSERT INTO loyalty_transactions (user_id, points, type, description, reference_id)
  VALUES (p_user_id, p_points, p_type, p_description, p_reference_id);
END;
$$;

-- Trigger to award points on order completion
CREATE OR REPLACE FUNCTION public.award_points_on_order_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- 1 point per 100 FCFA spent
    PERFORM award_loyalty_points(
      NEW.buyer_id,
      GREATEST(1, (NEW.total_price / 100)::integer),
      'purchase',
      'Achat commande #' || left(NEW.id::text, 8),
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_award_loyalty_on_order
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.award_points_on_order_complete();

-- Allow conversations to be updated (for last_message_at)
CREATE POLICY "Participants can update conversations" ON public.conversations
  FOR UPDATE TO authenticated
  USING (auth.uid() = participant_1 OR auth.uid() = participant_2);
