
-- Referral codes table
CREATE TABLE public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  uses_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Referral rewards table
CREATE TABLE public.referral_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL,
  referrer_reward numeric NOT NULL DEFAULT 500,
  referred_reward numeric NOT NULL DEFAULT 500,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(referred_id)
);

-- Enable RLS
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

-- RLS policies for referral_codes
CREATE POLICY "Users can view own referral code"
  ON public.referral_codes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own referral code"
  ON public.referral_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS policies for referral_rewards
CREATE POLICY "Users can view own rewards"
  ON public.referral_rewards FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION public.get_or_create_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT code INTO v_code FROM referral_codes WHERE user_id = v_user_id;
  
  IF v_code IS NOT NULL THEN
    RETURN v_code;
  END IF;

  -- Generate unique code: MYS- + 6 random alphanumeric chars
  LOOP
    v_code := 'MYS-' || upper(substr(md5(random()::text), 1, 6));
    BEGIN
      INSERT INTO referral_codes (user_id, code) VALUES (v_user_id, v_code);
      RETURN v_code;
    EXCEPTION WHEN unique_violation THEN
      -- Try again with new code
    END;
  END LOOP;
END;
$$;

-- Function to apply referral on signup
CREATE OR REPLACE FUNCTION public.apply_referral(p_referral_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referred_id uuid := auth.uid();
  v_referrer_id uuid;
  v_reward numeric := 500;
BEGIN
  IF v_referred_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check if already used a referral
  IF EXISTS (SELECT 1 FROM referral_rewards WHERE referred_id = v_referred_id) THEN
    RETURN false;
  END IF;

  -- Find referrer
  SELECT user_id INTO v_referrer_id FROM referral_codes WHERE code = upper(trim(p_referral_code));
  IF v_referrer_id IS NULL THEN
    RETURN false;
  END IF;

  -- Can't refer yourself
  IF v_referrer_id = v_referred_id THEN
    RETURN false;
  END IF;

  -- Create reward record
  INSERT INTO referral_rewards (referrer_id, referred_id, referrer_reward, referred_reward, status)
  VALUES (v_referrer_id, v_referred_id, v_reward, v_reward, 'credited');

  -- Increment uses count
  UPDATE referral_codes SET uses_count = uses_count + 1 WHERE user_id = v_referrer_id;

  -- Credit referrer wallet
  INSERT INTO wallets (user_id, balance, total_earned)
  VALUES (v_referrer_id, v_reward, v_reward)
  ON CONFLICT (user_id) DO UPDATE SET
    balance = wallets.balance + v_reward,
    total_earned = wallets.total_earned + v_reward,
    updated_at = now();

  INSERT INTO wallet_transactions (user_id, type, amount, description, status)
  VALUES (v_referrer_id, 'referral_bonus', v_reward, 'Bonus parrainage - nouveau filleul', 'completed');

  -- Credit referred wallet
  INSERT INTO wallets (user_id, balance, total_earned)
  VALUES (v_referred_id, v_reward, v_reward)
  ON CONFLICT (user_id) DO UPDATE SET
    balance = wallets.balance + v_reward,
    total_earned = wallets.total_earned + v_reward,
    updated_at = now();

  INSERT INTO wallet_transactions (user_id, type, amount, description, status)
  VALUES (v_referred_id, 'referral_bonus', v_reward, 'Bonus de bienvenue - parrainage', 'completed');

  -- Notify referrer
  PERFORM send_notification(
    v_referrer_id, 'promotion',
    'Parrainage réussi ! 🎉',
    'Un filleul a utilisé votre code. Vous avez reçu ' || v_reward || ' FCFA !',
    jsonb_build_object('type', 'referral', 'amount', v_reward)
  );

  RETURN true;
END;
$$;
