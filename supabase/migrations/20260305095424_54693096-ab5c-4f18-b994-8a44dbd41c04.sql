
-- Fix 1: Add admin RLS policies for server-side enforcement on profiles, orders, kyc_documents
-- (has_role function already exists in the database)

-- Admin can view ALL profiles (not just verified ones)
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin can view ALL orders
CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin can view ALL KYC documents
CREATE POLICY "Admins can view all KYC docs"
  ON public.kyc_documents FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin can update KYC documents (approve/reject)
CREATE POLICY "Admins can update KYC docs"
  ON public.kyc_documents FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix 2: Replace the overly permissive profiles public SELECT policy
-- Drop the old policy that exposes phone numbers
DROP POLICY IF EXISTS "Anyone can view basic verified profile info" ON public.profiles;

-- Recreate without exposing sensitive data - verified profiles visible but phone only to owner
-- Since column-level RLS isn't possible, we rely on the profiles_public VIEW for public access
-- and restrict the table policy to authenticated users viewing their own profile
-- The "Users can view their own full profile" policy already covers self-access
-- For other users, they should use profiles_public view (which excludes phone/location)

-- Fix 3: Add unique index to prevent review spam
CREATE UNIQUE INDEX IF NOT EXISTS unique_review_product_per_user 
  ON public.reviews (reviewer_id, product_id) 
  WHERE product_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS unique_review_service_per_user 
  ON public.reviews (reviewer_id, service_id) 
  WHERE service_id IS NOT NULL;
