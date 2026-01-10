-- Migration to sync full_name from auth metadata to profiles table
-- Run this in Supabase SQL Editor

-- 1. First, update existing profiles with full_name from auth metadata
UPDATE public.profiles p
SET full_name = (
  SELECT au.raw_user_meta_data ->> 'full_name'
  FROM auth.users au
  WHERE au.id = p.id
)
WHERE full_name IS NULL OR full_name = '';

-- 2. Verify the update worked by checking if any profiles still have NULL full_name
SELECT 
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN full_name IS NULL OR full_name = '' THEN 1 END) as missing_names
FROM public.profiles;
