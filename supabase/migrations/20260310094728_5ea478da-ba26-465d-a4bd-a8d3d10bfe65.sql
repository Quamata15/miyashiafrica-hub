
-- Fix 1: Restrict send_notification to only be callable by admins and triggers
REVOKE EXECUTE ON FUNCTION public.send_notification(uuid, text, text, text, jsonb) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.send_notification(uuid, text, text, text, jsonb) FROM public;

-- Fix 2: Drop the leftover permissive policy that allows non-admin role self-assignment
DROP POLICY IF EXISTS "Users can insert own non-admin roles" ON public.user_roles;

-- Fix 3: Fix chat-attachments upload policy to enforce folder ownership
DROP POLICY IF EXISTS "Users can upload chat attachments" ON storage.objects;
CREATE POLICY "Users can upload own chat attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
