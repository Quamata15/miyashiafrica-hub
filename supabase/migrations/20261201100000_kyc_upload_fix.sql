-- Identity documents could not be sent: the screen sends cni_recto, cni_verso, passeport,
-- selfie_verification and permis_conduire, but the table only accepted an older list of types.
-- Users could also edit their own rows, including the status, so they could mark a document
-- "approved" themselves. Now they can only send (pending) and withdraw a pending document.
ALTER TABLE public.kyc_documents DROP CONSTRAINT IF EXISTS kyc_documents_document_type_check;
ALTER TABLE public.kyc_documents ADD CONSTRAINT kyc_documents_document_type_check CHECK (document_type = ANY (ARRAY[
  'cni_recto','cni_verso','passeport','selfie_verification','nif','permis_conduire',
  -- older values kept for existing rows
  'identity_card','passport','drivers_license','attestation','diploma','municipality_cert','commerce_card','company_nif','tax_invoice','other']));

DROP POLICY IF EXISTS "Users can manage own KYC docs" ON public.kyc_documents;
CREATE POLICY "Users view own KYC docs" ON public.kyc_documents FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users send own KYC docs" ON public.kyc_documents FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending' AND split_part(document_url, '/', 1) = auth.uid()::text);
CREATE POLICY "Users withdraw pending KYC docs" ON public.kyc_documents FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending');

-- A sent document always starts unreviewed, whatever the client sends.
CREATE OR REPLACE FUNCTION public.guard_kyc_insert() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated','anon') AND NOT public.is_admin() THEN
    NEW.status := 'pending'; NEW.rejection_reason := NULL; NEW.reviewed_at := NULL; NEW.submitted_at := now();
    IF (SELECT count(*) FROM kyc_documents WHERE user_id = NEW.user_id AND status = 'pending') >= 12 THEN
      RAISE EXCEPTION 'Trop de documents en attente : patientez pendant la vérification';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_kyc_insert ON public.kyc_documents;
CREATE TRIGGER guard_kyc_insert BEFORE INSERT ON public.kyc_documents FOR EACH ROW EXECUTE FUNCTION public.guard_kyc_insert();

-- Withdrawing a pending document also removes the file.
DROP POLICY IF EXISTS "Users delete own pending KYC files" ON storage.objects;
CREATE POLICY "Users delete own pending KYC files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'kyc-documents' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- The verified badge follows the approved documents: identity (both sides of the card, or a
-- passport) and a selfie. Set by the database so the admin screen cannot get it wrong.
CREATE OR REPLACE FUNCTION public.kyc_sync_verified() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_types text[];
BEGIN
  SELECT array_agg(document_type) INTO v_types FROM kyc_documents WHERE user_id = NEW.user_id AND status = 'approved';
  v_types := COALESCE(v_types, '{}');
  IF ('selfie_verification' = ANY (v_types)) AND (('cni_recto' = ANY (v_types) AND 'cni_verso' = ANY (v_types)) OR 'passeport' = ANY (v_types)) THEN
    UPDATE profiles SET is_verified = true WHERE user_id = NEW.user_id AND NOT COALESCE(is_verified, false);
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS kyc_sync_verified ON public.kyc_documents;
CREATE TRIGGER kyc_sync_verified AFTER UPDATE OF status ON public.kyc_documents FOR EACH ROW
  WHEN (NEW.status = 'approved') EXECUTE FUNCTION public.kyc_sync_verified();
