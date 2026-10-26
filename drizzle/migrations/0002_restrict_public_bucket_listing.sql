DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view portfolios" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view product media" ON storage.objects;
CREATE POLICY "Owners can view own public media" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id IN ('avatars','portfolios','product-media') AND (storage.foldername(name))[1] = (select auth.uid()::text));