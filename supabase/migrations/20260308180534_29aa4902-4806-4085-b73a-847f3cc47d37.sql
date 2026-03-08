
-- Table to store driver signed contracts/commitments
CREATE TABLE public.driver_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contract_version text NOT NULL DEFAULT '1.0',
  signed_at timestamp with time zone NOT NULL DEFAULT now(),
  oath_accepted boolean NOT NULL DEFAULT false,
  no_contact_on_packages boolean NOT NULL DEFAULT false,
  loyalty_commitment boolean NOT NULL DEFAULT false,
  honesty_commitment boolean NOT NULL DEFAULT false,
  confidentiality_commitment boolean NOT NULL DEFAULT false,
  badge_number text UNIQUE,
  badge_generated_at timestamp with time zone,
  kyc_verified boolean NOT NULL DEFAULT false,
  ip_address text,
  UNIQUE(user_id, contract_version)
);

ALTER TABLE public.driver_contracts ENABLE ROW LEVEL SECURITY;

-- Drivers can view their own contracts
CREATE POLICY "Drivers can view own contracts"
  ON public.driver_contracts FOR SELECT
  USING (auth.uid() = user_id);

-- Drivers can insert their own contract
CREATE POLICY "Drivers can sign contract"
  ON public.driver_contracts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all contracts
CREATE POLICY "Admins can manage contracts"
  ON public.driver_contracts FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Function to generate unique badge number after contract signing + KYC
CREATE OR REPLACE FUNCTION public.generate_driver_badge(p_contract_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_contract RECORD;
  v_badge text;
  v_kyc_ok boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get contract
  SELECT * INTO v_contract FROM driver_contracts
  WHERE id = p_contract_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract not found';
  END IF;

  -- Check all commitments are signed
  IF NOT (v_contract.oath_accepted AND v_contract.no_contact_on_packages
          AND v_contract.loyalty_commitment AND v_contract.honesty_commitment
          AND v_contract.confidentiality_commitment) THEN
    RAISE EXCEPTION 'All commitments must be accepted';
  END IF;

  -- Check KYC
  SELECT EXISTS (
    SELECT 1 FROM kyc_documents
    WHERE user_id = auth.uid() AND status = 'approved'
  ) INTO v_kyc_ok;

  IF NOT v_kyc_ok THEN
    RAISE EXCEPTION 'KYC verification required before badge generation';
  END IF;

  -- Already has badge?
  IF v_contract.badge_number IS NOT NULL THEN
    RETURN v_contract.badge_number;
  END IF;

  -- Generate badge: MYS-DRV-XXXX
  LOOP
    v_badge := 'MYS-DRV-' || upper(substr(md5(random()::text), 1, 6));
    BEGIN
      UPDATE driver_contracts
      SET badge_number = v_badge,
          badge_generated_at = now(),
          kyc_verified = true
      WHERE id = p_contract_id;
      RETURN v_badge;
    EXCEPTION WHEN unique_violation THEN
      -- retry
    END;
  END LOOP;
END;
$$;
