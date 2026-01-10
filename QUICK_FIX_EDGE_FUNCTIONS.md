# Quick Fix: Deploy Functions Manually

Since the CLI has installation issues, here's the fastest way to get your Edge Functions working:

## Step 1: Go to Supabase Dashboard

1. Open https://app.supabase.com
2. Select your project: **xumnfngrhcxfhnemrozu**
3. Click **Functions** (left sidebar)

## Step 2: Create suggest-materials Function

1. Click **Create a New Function**
2. Name: `suggest-materials`
3. Click **Create Function**
4. Delete the default code
5. Copy-paste from: `supabase/functions/suggest-materials/index.ts`
6. Click **Deploy**

## Step 3: Create generate-contract Function

1. Click **Create a New Function**
2. Name: `generate-contract`
3. Click **Create Function**
4. Delete the default code
5. Copy-paste from: `supabase/functions/generate-contract/index.ts`
6. Click **Deploy**

## Step 4: Set Environment Variables

For BOTH functions (`suggest-materials` and `generate-contract`):

1. Go to Function → **Settings** tab
2. Add Secret:
   - Name: `OPENAI_API_KEY`
   - Value: `[Your OpenAI API Key from https://platform.openai.com/api-keys]`
3. Click **Save**

(For check-subscription, you'll need STRIPE_SECRET_KEY if you have Stripe)

## Step 5: Verify Deployment

1. Go to **Functions** page
2. You should see:
   - ✓ suggest-materials (Active)
   - ✓ generate-contract (Active)
   - ✓ check-subscription (should already exist)
3. Click on each to verify Status: **Active**

## Step 6: Test Your App

1. Refresh your app: Ctrl+Shift+R
2. Log in: test@example.com / Test123456!
3. Go to **Malzeme Yönetimi** (Materials Management)
4. Click **Malzeme Önerileri** (Material Suggestions) button
5. It should work now! ✓

## Troubleshooting

**Still getting CORS error?**
- Did you copy the `corsHeaders` code including OPTIONS handler?
- Restart your dev server (npm run dev)
- Hard refresh browser again

**Function not found (404)?**
- Check function name is exactly: `suggest-materials` (with hyphen, not underscore)
- Make sure Status shows "Active"

**OPENAI_API_KEY error?**
- Copy the key exactly from `.env.local`
- No extra spaces or quotes
- Verify key is valid at https://platform.openai.com/account/api-keys

## Which Functions Do You Need?

**Essential (for basic app):**
- ✓ suggest-materials - AI material suggestions
- ✓ generate-contract - AI contract generation

**Optional (if using payments):**
- check-subscription - Stripe subscription checking
- create-checkout - Stripe checkout
- customer-portal - Stripe customer portal
