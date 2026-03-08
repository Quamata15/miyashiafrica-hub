
-- 1. DROP the permissive INSERT policy on wallet_transactions that allows users to forge audit logs
DROP POLICY IF EXISTS "Users can create own transactions" ON public.wallet_transactions;

-- 2. Update debit_wallet to also create the withdrawal transaction record
CREATE OR REPLACE FUNCTION public.debit_wallet(p_amount numeric, p_payment_method text DEFAULT NULL, p_phone text DEFAULT NULL)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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

  -- Create the withdrawal transaction record server-side
  INSERT INTO wallet_transactions (user_id, type, amount, description, payment_method, status, metadata)
  VALUES (
    auth.uid(),
    'withdrawal',
    -p_amount,
    'Retrait via ' || COALESCE(p_payment_method, 'unknown'),
    p_payment_method,
    'pending',
    CASE WHEN p_phone IS NOT NULL THEN jsonb_build_object('phone', p_phone) ELSE '{}'::jsonb END
  );
END;
$$;

-- 3. Secure send_notification with caller authorization and type whitelist
CREATE OR REPLACE FUNCTION public.send_notification(p_user_id uuid, p_type text, p_title text, p_message text, p_data jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_admin_types text[] := ARRAY['kyc_approved', 'kyc_rejected', 'kyc_verified', 'admin_alert', 'system'];
  v_user_types text[] := ARRAY['order', 'delivery', 'delivery_request', 'message', 'follow', 'review', 'promotion', 'boost'];
BEGIN
  -- Validate inputs
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id is required';
  END IF;
  IF length(p_title) > 200 THEN
    RAISE EXCEPTION 'Title too long';
  END IF;
  IF length(p_message) > 1000 THEN
    RAISE EXCEPTION 'Message too long';
  END IF;

  -- Check type is in allowed list
  IF NOT (p_type = ANY(v_admin_types) OR p_type = ANY(v_user_types)) THEN
    RAISE EXCEPTION 'Invalid notification type: %', p_type;
  END IF;

  -- Admin-only types require admin role
  IF p_type = ANY(v_admin_types) THEN
    IF NOT public.has_role(v_caller_id, 'admin') THEN
      RAISE EXCEPTION 'Unauthorized: admin-only notification type';
    END IF;
  ELSE
    -- Regular users can only send notifications to others (not arbitrary)
    -- They must be authenticated
    IF v_caller_id IS NULL THEN
      RAISE EXCEPTION 'Authentication required';
    END IF;
    -- Users cannot send notifications to themselves (spam prevention)
    IF v_caller_id = p_user_id AND p_type NOT IN ('order', 'delivery', 'delivery_request') THEN
      RAISE EXCEPTION 'Cannot send this notification type to yourself';
    END IF;
  END IF;
  
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (p_user_id, p_type, p_title, p_message, p_data);
END;
$$;

-- 4. Create admin data verification RPC
CREATE OR REPLACE FUNCTION public.get_admin_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;
  
  SELECT jsonb_build_object(
    'users_count', (SELECT count(*) FROM profiles),
    'orders_count', (SELECT count(*) FROM orders),
    'revenue', (SELECT COALESCE(sum(total_price), 0) FROM orders),
    'disputes_count', (SELECT count(*) FROM disputes)
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- 5. Create admin-only RPC to verify admin access server-side  
CREATE OR REPLACE FUNCTION public.verify_admin_access()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  RETURN public.has_role(auth.uid(), 'admin');
END;
$$;
