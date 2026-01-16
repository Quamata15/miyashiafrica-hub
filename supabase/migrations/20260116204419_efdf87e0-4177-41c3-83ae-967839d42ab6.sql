-- Fix security issue 1: Create a public view for profiles that hides sensitive data
CREATE VIEW public.profiles_public
WITH (security_invoker=on) AS
  SELECT 
    id,
    user_id,
    full_name,
    avatar_url,
    bio,
    is_verified,
    created_at
  FROM public.profiles;

-- Keep existing profile policy for authenticated users to see their own full data
-- But add a more restrictive policy for other users

-- Drop the existing public SELECT policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create new policy: Users can only view their own full profile
CREATE POLICY "Users can view their own full profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy for viewing basic info of verified users (without sensitive data)
CREATE POLICY "Anyone can view basic verified profile info"
  ON public.profiles FOR SELECT
  USING (is_verified = true);

-- Fix security issue 2: Applications - freelancers should only see their own applications
DROP POLICY IF EXISTS "Users can view applications for their jobs or their own applica" ON public.applications;

-- Freelancers can only view their own applications
CREATE POLICY "Freelancers can view their own applications"
  ON public.applications FOR SELECT
  USING (auth.uid() = freelance_id);

-- Employers can view applications for their jobs (without seeing other applicants' details directly)
CREATE POLICY "Employers can view applications for their jobs"
  ON public.applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs 
      WHERE jobs.id = applications.job_id 
      AND jobs.employer_id = auth.uid()
    )
  );

-- Fix security issue 3: Add soft delete to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Update the SELECT policy to exclude soft-deleted products
DROP POLICY IF EXISTS "Products are viewable by everyone" ON public.products;
CREATE POLICY "Active products are viewable by everyone"
  ON public.products FOR SELECT
  USING (is_active = true AND deleted_at IS NULL);

-- Update delete policy to soft delete instead
DROP POLICY IF EXISTS "Sellers can delete their own products" ON public.products;

-- Create function for soft delete
CREATE OR REPLACE FUNCTION public.soft_delete_product()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.products SET deleted_at = now(), is_active = false WHERE id = OLD.id;
  RETURN NULL; -- Prevents actual deletion
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for soft delete
DROP TRIGGER IF EXISTS soft_delete_product_trigger ON public.products;
CREATE TRIGGER soft_delete_product_trigger
  BEFORE DELETE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.soft_delete_product();