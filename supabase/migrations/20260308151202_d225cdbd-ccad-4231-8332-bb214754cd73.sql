
-- Add username column to profiles
ALTER TABLE public.profiles ADD COLUMN username text;

-- Create unique index on username (case insensitive)
CREATE UNIQUE INDEX profiles_username_unique ON public.profiles (lower(username));
