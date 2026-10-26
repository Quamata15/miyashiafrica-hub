REVOKE EXECUTE ON FUNCTION public.award_loyalty_points(uuid, integer, text, text, uuid) FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Buyers can rate drivers" ON public.driver_ratings;
CREATE POLICY "Buyers can rate drivers" ON public.driver_ratings
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = rated_by
  AND EXISTS (
    SELECT 1 FROM public.delivery_requests dr
    WHERE dr.id = delivery_id
      AND dr.buyer_id = auth.uid()
      AND dr.driver_id = driver_ratings.driver_id
      AND dr.status = 'delivered'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.driver_ratings r2
    WHERE r2.delivery_id = driver_ratings.delivery_id AND r2.rated_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "Authenticated users can upload product media" ON storage.objects;
CREATE POLICY "Authenticated users can upload product media" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-media' AND (storage.foldername(name))[1] = (select auth.uid()::text));