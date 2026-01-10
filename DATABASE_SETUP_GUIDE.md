# Supabase Database Setup Guide

Your app is getting 404 errors because the database tables don't exist yet. Follow these steps:

## Step 1: Open Supabase SQL Editor

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Select your project: **xumnfngrhcxfhnemrozu**
3. Click **SQL Editor** (left sidebar)
4. Click **New Query**

## Step 2: Copy and Execute Setup SQL

1. Open the file: `SUPABASE_SETUP.sql` (in your project root)
2. Copy all the SQL content (Ctrl+A, Ctrl+C)
3. Paste it into the Supabase SQL Editor
4. Click **Run** (or press Ctrl+Enter)

Wait for it to complete. You should see:
```
✓ CREATE TABLE
✓ ALTER TABLE
✓ CREATE FUNCTION
... etc
```

## Step 3: Verify Tables Were Created

In Supabase Dashboard:
1. Click **Table Editor** (left sidebar)
2. You should see these tables:
   - ✓ projects
   - ✓ tasks
   - ✓ team_members
   - ✓ materials
   - ✓ customers
   - ✓ user_roles
   - ✓ profiles
   - ✓ project-photos (in Storage)

## Step 4: Create Admin User (Optional)

If you want to set your test user as admin:

```sql
-- Make test@example.com an admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'test@example.com'
ON CONFLICT (user_id, role) DO NOTHING;
```

## Step 5: Refresh Your App

1. Close `http://localhost:8081` tab
2. Hard refresh (Ctrl+Shift+R)
3. Navigate to `http://localhost:8081`
4. Try logging in again

The 404 errors should be gone!

## Troubleshooting

### If you get "Table already exists" error
- The table was created in a previous run
- That's okay, just skip that CREATE TABLE statement
- The script uses "ON CONFLICT" to handle duplicates

### If you still get 404 errors
- Verify all tables exist in Table Editor
- Make sure you're logged in with a valid user account
- Check browser Console (F12) for the actual error

### If you get CORS error on Edge Functions
- This is separate from the table issue
- We'll fix this after the tables are created
