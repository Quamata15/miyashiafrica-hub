
-- Drop the overly permissive UPDATE policy
DROP POLICY IF EXISTS "Participants can update delivery requests" ON public.delivery_requests;

-- Drivers can only update status and timestamps (financial fields locked)
CREATE POLICY "Drivers can update delivery status"
  ON public.delivery_requests FOR UPDATE
  USING (auth.uid() = driver_id)
  WITH CHECK (
    total_delivery_price = (SELECT total_delivery_price FROM public.delivery_requests dr WHERE dr.id = delivery_requests.id)
    AND commission = (SELECT commission FROM public.delivery_requests dr WHERE dr.id = delivery_requests.id)
    AND base_price = (SELECT base_price FROM public.delivery_requests dr WHERE dr.id = delivery_requests.id)
    AND surcharge_amount = (SELECT surcharge_amount FROM public.delivery_requests dr WHERE dr.id = delivery_requests.id)
    AND buyer_id = (SELECT buyer_id FROM public.delivery_requests dr WHERE dr.id = delivery_requests.id)
    AND seller_id = (SELECT seller_id FROM public.delivery_requests dr WHERE dr.id = delivery_requests.id)
    AND order_id = (SELECT order_id FROM public.delivery_requests dr WHERE dr.id = delivery_requests.id)
  );

-- Buyers can update only non-financial fields
CREATE POLICY "Buyers can update delivery requests"
  ON public.delivery_requests FOR UPDATE
  USING (auth.uid() = buyer_id)
  WITH CHECK (
    total_delivery_price = (SELECT total_delivery_price FROM public.delivery_requests dr WHERE dr.id = delivery_requests.id)
    AND commission = (SELECT commission FROM public.delivery_requests dr WHERE dr.id = delivery_requests.id)
    AND base_price = (SELECT base_price FROM public.delivery_requests dr WHERE dr.id = delivery_requests.id)
    AND surcharge_amount = (SELECT surcharge_amount FROM public.delivery_requests dr WHERE dr.id = delivery_requests.id)
    AND driver_id IS NOT DISTINCT FROM (SELECT driver_id FROM public.delivery_requests dr WHERE dr.id = delivery_requests.id)
    AND seller_id = (SELECT seller_id FROM public.delivery_requests dr WHERE dr.id = delivery_requests.id)
    AND order_id = (SELECT order_id FROM public.delivery_requests dr WHERE dr.id = delivery_requests.id)
  );

-- Sellers can update only non-financial fields
CREATE POLICY "Sellers can update delivery requests"
  ON public.delivery_requests FOR UPDATE
  USING (auth.uid() = seller_id)
  WITH CHECK (
    total_delivery_price = (SELECT total_delivery_price FROM public.delivery_requests dr WHERE dr.id = delivery_requests.id)
    AND commission = (SELECT commission FROM public.delivery_requests dr WHERE dr.id = delivery_requests.id)
    AND base_price = (SELECT base_price FROM public.delivery_requests dr WHERE dr.id = delivery_requests.id)
    AND surcharge_amount = (SELECT surcharge_amount FROM public.delivery_requests dr WHERE dr.id = delivery_requests.id)
    AND buyer_id = (SELECT buyer_id FROM public.delivery_requests dr WHERE dr.id = delivery_requests.id)
    AND order_id = (SELECT order_id FROM public.delivery_requests dr WHERE dr.id = delivery_requests.id)
  );
