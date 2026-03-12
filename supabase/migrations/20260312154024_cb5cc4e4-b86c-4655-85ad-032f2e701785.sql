-- Drop the insecure INSERT policy that allows users to self-assign arbitrary loyalty points
DROP POLICY IF EXISTS "Users can insert own loyalty" ON public.loyalty_points;

-- Also drop any UPDATE policy that could allow direct manipulation
DROP POLICY IF EXISTS "Users can update own loyalty" ON public.loyalty_points;