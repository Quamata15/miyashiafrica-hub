-- FedaPay integration: wallet top-ups by mobile money (TMoney, Flooz, MTN, Moov,
-- Orange, Wave...) or card. The edge function `fedapay-checkout` creates the
-- FedaPay transaction; `fedapay-webhook` confirms it with FedaPay and credits the
-- wallet through credit_wallet_from_fedapay(), which only the service role can run.

CREATE TABLE IF NOT EXISTS public.fedapay_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fedapay_id bigint UNIQUE,
  amount numeric(12,0) NOT NULL CHECK (amount >= 100 AND amount <= 5000000),
  currency text NOT NULL DEFAULT 'XOF',
  status text NOT NULL DEFAULT 'pending',   -- pending | approved | declined | canceled | refunded
  mode text,                                -- mtn_open, moov, tmoney, card...
  return_path text,
  credited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fedapay_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own fedapay transactions" ON public.fedapay_transactions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS fedapay_transactions_user_idx ON public.fedapay_transactions(user_id, created_at DESC);
CREATE TRIGGER update_fedapay_transactions_updated_at BEFORE UPDATE ON public.fedapay_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Idempotent: crediting the same FedaPay transaction twice does nothing.
CREATE OR REPLACE FUNCTION public.credit_wallet_from_fedapay(p_fedapay_id bigint, p_status text, p_mode text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.fedapay_transactions;
BEGIN
  SELECT * INTO t FROM public.fedapay_transactions WHERE fedapay_id = p_fedapay_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown FedaPay transaction %', p_fedapay_id; END IF;

  IF t.credited_at IS NOT NULL THEN
    RETURN jsonb_build_object('credited', false, 'reason', 'already_credited');
  END IF;

  UPDATE public.fedapay_transactions SET status = p_status, mode = COALESCE(p_mode, mode)
  WHERE id = t.id;

  IF p_status <> 'approved' THEN
    RETURN jsonb_build_object('credited', false, 'reason', p_status);
  END IF;

  INSERT INTO public.wallets (user_id) VALUES (t.user_id) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.wallets SET balance = balance + t.amount WHERE user_id = t.user_id;
  INSERT INTO public.wallet_transactions (user_id, type, amount, status, payment_method, reference_id, description, metadata)
  VALUES (t.user_id, 'deposit', t.amount, 'completed', COALESCE(p_mode, 'fedapay'), t.id,
          'Recharge FedaPay', jsonb_build_object('fedapay_id', p_fedapay_id));
  UPDATE public.fedapay_transactions SET credited_at = now() WHERE id = t.id;

  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (t.user_id, 'wallet', 'Recharge confirmée',
    'Votre portefeuille a été crédité de ' || t.amount::text || ' FCFA.', jsonb_build_object('fedapay_id', p_fedapay_id));

  RETURN jsonb_build_object('credited', true, 'amount', t.amount, 'user_id', t.user_id);
END $$;
REVOKE EXECUTE ON FUNCTION public.credit_wallet_from_fedapay(bigint, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_wallet_from_fedapay(bigint, text, text) TO service_role;
