
-- Add missing onboarding dismissed flags
ALTER TABLE public.user_preferences 
  ADD COLUMN IF NOT EXISTS dismissed_buyer_onboarding boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dismissed_freelance_onboarding boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dismissed_employer_onboarding boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dismissed_driver_onboarding boolean NOT NULL DEFAULT false;
