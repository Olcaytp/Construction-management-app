-- Create RPC function to fetch admin users with full auth metadata
CREATE OR REPLACE FUNCTION public.fetch_admin_users()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  phone text,
  created_at timestamp with time zone,
  role text
) 
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.email,
    COALESCE(p.full_name, au.raw_user_meta_data ->> 'full_name', '') as full_name,
    COALESCE(au.raw_user_meta_data ->> 'phone', '') as phone,
    p.created_at,
    COALESCE(ur.role::text, 'user') as role
  FROM public.profiles p
  LEFT JOIN auth.users au ON p.id = au.id
  LEFT JOIN public.user_roles ur ON p.id = ur.user_id
  ORDER BY p.created_at DESC;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.fetch_admin_users() TO authenticated;
