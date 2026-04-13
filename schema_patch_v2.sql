-- Final Repair for Users Table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive'));

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS avatar_color TEXT;
