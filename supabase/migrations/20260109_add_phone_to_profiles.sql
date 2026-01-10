-- Add phone column to profiles table if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;

-- Create or update function to sync auth metadata to profiles
CREATE OR REPLACE FUNCTION public.sync_auth_to_profiles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Update profile with metadata from auth.users
  UPDATE public.profiles
  SET 
    full_name = COALESCE(new.raw_user_meta_data ->> 'full_name', old.full_name),
    phone = COALESCE(new.raw_user_meta_data ->> 'phone', old.phone)
  WHERE id = new.id;
  
  RETURN new;
END;
$$;

-- Create trigger to sync auth updates to profiles
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_auth_to_profiles();

-- Update existing profiles with data from auth metadata
UPDATE public.profiles p
SET 
  full_name = COALESCE(au.raw_user_meta_data ->> 'full_name', p.full_name),
  phone = au.raw_user_meta_data ->> 'phone'
FROM auth.users au
WHERE p.id = au.id AND (
  p.full_name IS NULL OR au.raw_user_meta_data ->> 'full_name' IS NOT NULL
);
