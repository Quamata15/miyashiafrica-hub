
-- =============================================
-- FIX 1: Prevent wallet self-inflation
-- Remove direct UPDATE policy on wallets, replace with restricted one
-- =============================================

-- Drop the permissive UPDATE policy
DROP POLICY IF EXISTS "Users can update own wallet" ON public.wallets;

-- Create a restricted UPDATE policy that only allows updating updated_at (no balance/total changes directly)
-- Actually, we'll block all direct updates and use functions instead
-- But we need to keep a minimal policy for the function to work via SECURITY DEFINER
-- So we remove the authenticated direct update entirely

-- =============================================
-- FIX 2: Prevent admin privilege escalation
-- =============================================

DROP POLICY IF EXISTS "Users can insert their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert own roles" ON public.user_roles;

CREATE POLICY "Users can insert own non-admin roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND role != 'admin'
  );

-- =============================================
-- FIX 3: Server-side escrow release + wallet mutation functions
-- =============================================

-- Function to confirm order reception and release escrow atomically
CREATE OR REPLACE FUNCTION public.confirm_order_reception(p_order_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_escrow RECORD;
  v_delivery RECORD;
  v_seller_amount NUMERIC;
  v_driver_amount NUMERIC;
BEGIN
  -- 1. Validate caller is the buyer and order is in shipped status
  SELECT * INTO v_order FROM orders WHERE id = p_order_id AND buyer_id = auth.uid() AND status = 'shipped';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found or not authorized';
  END IF;

  -- 2. Update order status
  UPDATE orders SET status = 'completed', delivery_status = 'delivered', updated_at = now()
  WHERE id = p_order_id;

  -- 3. Find and release escrow
  SELECT * INTO v_escrow FROM escrow_transactions
  WHERE order_id = p_order_id AND status = 'held';

  IF FOUND THEN
    UPDATE escrow_transactions SET status = 'released', released_at = now()
    WHERE id = v_escrow.id;

    -- 4. Calculate seller amount
    v_seller_amount := COALESCE(v_escrow.seller_amount, v_order.total_price * 0.9);

    -- 5. Credit seller wallet (upsert)
    INSERT INTO wallets (user_id, balance, total_earned)
    VALUES (v_order.seller_id, v_seller_amount, v_seller_amount)
    ON CONFLICT (user_id) DO UPDATE SET
      balance = wallets.balance + v_seller_amount,
      total_earned = wallets.total_earned + v_seller_amount,
      updated_at = now();

    -- 6. Log seller transaction
    INSERT INTO wallet_transactions (user_id, type, amount, description, reference_id)
    VALUES (v_order.seller_id, 'escrow_release', v_seller_amount,
            'Vente commande #' || left(p_order_id::text, 8), p_order_id);

    -- 7. Credit driver if delivery exists
    SELECT driver_id, total_delivery_price, commission INTO v_delivery
    FROM delivery_requests WHERE order_id = p_order_id LIMIT 1;

    IF v_delivery.driver_id IS NOT NULL THEN
      v_driver_amount := COALESCE(v_delivery.total_delivery_price, 0) - COALESCE(v_delivery.commission, 0);
      
      IF v_driver_amount > 0 THEN
        INSERT INTO wallets (user_id, balance, total_earned)
        VALUES (v_delivery.driver_id, v_driver_amount, v_driver_amount)
        ON CONFLICT (user_id) DO UPDATE SET
          balance = wallets.balance + v_driver_amount,
          total_earned = wallets.total_earned + v_driver_amount,
          updated_at = now();

        INSERT INTO wallet_transactions (user_id, type, amount, description, reference_id)
        VALUES (v_delivery.driver_id, 'escrow_release', v_driver_amount,
                'Livraison commande #' || left(p_order_id::text, 8), p_order_id);
      END IF;
    END IF;
  END IF;
END;
$$;

-- Function for wallet withdrawals (replaces direct UPDATE)
CREATE OR REPLACE FUNCTION public.debit_wallet(p_amount NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;
  
  UPDATE wallets
  SET balance = balance - p_amount,
      total_withdrawn = total_withdrawn + p_amount,
      updated_at = now()
  WHERE user_id = auth.uid() AND balance >= p_amount;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient balance or wallet not found';
  END IF;
END;
$$;

-- Add unique constraint on wallets.user_id if not exists (needed for ON CONFLICT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wallets_user_id_key'
  ) THEN
    ALTER TABLE public.wallets ADD CONSTRAINT wallets_user_id_key UNIQUE (user_id);
  END IF;
END $$;
