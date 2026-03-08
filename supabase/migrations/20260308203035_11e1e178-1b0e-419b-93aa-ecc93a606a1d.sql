
-- 1. Fix driver_profiles: Remove blanket public SELECT, add proper policies
DROP POLICY IF EXISTS "Driver profiles are viewable by everyone" ON public.driver_profiles;

-- Owner can view their own profile
CREATE POLICY "Drivers can view own profile"
ON public.driver_profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all driver profiles
CREATE POLICY "Admins can view all driver profiles"
ON public.driver_profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Buyers/sellers can see available drivers (limited info via the public view)
-- The driver_profiles_public view already handles this

-- 2. Fix freelance_profiles: Remove blanket public SELECT, add proper policies
DROP POLICY IF EXISTS "Freelance profiles are viewable by everyone" ON public.freelance_profiles;

-- Owner can view their own full profile
CREATE POLICY "Freelancers can view own full profile"
ON public.freelance_profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all freelance profiles
CREATE POLICY "Admins can view all freelance profiles"
ON public.freelance_profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 3. Fix user_roles: Remove self-assignment INSERT policy
DROP POLICY IF EXISTS "Users can insert own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can assign non-admin roles to themselves" ON public.user_roles;

-- Only admins can assign roles
CREATE POLICY "Only admins can assign roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
