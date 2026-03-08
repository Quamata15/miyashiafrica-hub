
-- Shipping labels table for QR-based delivery
CREATE TABLE public.shipping_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  delivery_request_id uuid REFERENCES public.delivery_requests(id) ON DELETE SET NULL,
  seller_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  qr_token text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  pickup_address text,
  delivery_address text,
  pickup_instructions text,
  delivery_instructions text,
  label_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  scanned_at timestamptz,
  UNIQUE(order_id),
  UNIQUE(qr_token)
);

ALTER TABLE public.shipping_labels ENABLE ROW LEVEL SECURITY;

-- Sellers can create labels for their orders
CREATE POLICY "Sellers can create shipping labels"
  ON public.shipping_labels FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

-- Sellers see their own labels (but with masked buyer address)
CREATE POLICY "Sellers can view own labels"
  ON public.shipping_labels FOR SELECT
  USING (auth.uid() = seller_id);

-- Buyers see their own labels
CREATE POLICY "Buyers can view own labels"
  ON public.shipping_labels FOR SELECT
  USING (auth.uid() = buyer_id);

-- Assigned driver can view label
CREATE POLICY "Assigned driver can view label"
  ON public.shipping_labels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.delivery_requests dr
      WHERE dr.id = shipping_labels.delivery_request_id
      AND dr.driver_id = auth.uid()
    )
  );

-- Drivers can update scanned_at when they scan the QR
CREATE POLICY "Driver can scan label"
  ON public.shipping_labels FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.delivery_requests dr
      WHERE dr.id = shipping_labels.delivery_request_id
      AND dr.driver_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Can only update scanned_at and label_status
    seller_id = (SELECT sl.seller_id FROM public.shipping_labels sl WHERE sl.id = shipping_labels.id)
    AND buyer_id = (SELECT sl.buyer_id FROM public.shipping_labels sl WHERE sl.id = shipping_labels.id)
    AND order_id = (SELECT sl.order_id FROM public.shipping_labels sl WHERE sl.id = shipping_labels.id)
    AND qr_token = (SELECT sl.qr_token FROM public.shipping_labels sl WHERE sl.id = shipping_labels.id)
    AND pickup_address = (SELECT sl.pickup_address FROM public.shipping_labels sl WHERE sl.id = shipping_labels.id)
    AND delivery_address = (SELECT sl.delivery_address FROM public.shipping_labels sl WHERE sl.id = shipping_labels.id)
  );

-- RPC: reveal delivery address only to assigned driver after scanning QR
CREATE OR REPLACE FUNCTION public.scan_shipping_label(p_qr_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_label RECORD;
  v_driver_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Find label by QR token
  SELECT sl.*, dr.driver_id INTO v_label
  FROM shipping_labels sl
  LEFT JOIN delivery_requests dr ON dr.id = sl.delivery_request_id
  WHERE sl.qr_token = p_qr_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Label not found';
  END IF;

  -- Only the assigned driver can scan
  IF v_label.driver_id IS NULL OR v_label.driver_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the assigned driver can scan this label';
  END IF;

  -- Mark as scanned
  UPDATE shipping_labels 
  SET scanned_at = now(), label_status = 'scanned'
  WHERE qr_token = p_qr_token;

  -- Return full addresses to driver
  RETURN jsonb_build_object(
    'order_id', v_label.order_id,
    'pickup_address', v_label.pickup_address,
    'delivery_address', v_label.delivery_address,
    'pickup_instructions', v_label.pickup_instructions,
    'delivery_instructions', v_label.delivery_instructions
  );
END;
$$;

-- Vendor violation tracking
CREATE TABLE public.vendor_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  reported_by uuid NOT NULL,
  order_id uuid REFERENCES public.orders(id),
  violation_type text NOT NULL DEFAULT 'contact_on_package',
  evidence_url text,
  description text,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  penalty_applied text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

ALTER TABLE public.vendor_violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can report violations"
  ON public.vendor_violations FOR INSERT
  WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Users can view own reports"
  ON public.vendor_violations FOR SELECT
  USING (auth.uid() = reported_by);

CREATE POLICY "Sellers can view violations against them"
  ON public.vendor_violations FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Admins can manage violations"
  ON public.vendor_violations FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));
