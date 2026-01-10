import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-user-id",
  "Access-Control-Allow-Credentials": "true",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("STRIPE_SECRET_KEY not configured, returning unsubscribed");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("No authorization header, returning unsubscribed");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const supabaseUserClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      }
    );

    const { data: userData, error: userError } = await supabaseUserClient.auth.getUser();
    if (userError || !userData?.user) {
      logStep("Auth failed", { error: userError?.message });
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const userId = userData.user.id;
    let userEmail: string | null = userData.user.email ?? null;

    logStep("User authenticated", { userId, userEmail });

    if (!userEmail) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );
      const { data: adminData } = await supabaseAdmin.auth.admin.getUserById(userId);
      userEmail = adminData?.user?.email ?? null;
      if (!userEmail) {
        logStep("Could not fetch user email from admin API");
        return new Response(JSON.stringify({ subscribed: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      logStep("Fetched user email from admin API", { userEmail });
    }

    const stripe = new Stripe(stripeKey);
    // Find customer by email: try search, fallback to list+filter
    let customerId: string | null = null;
    try {
      const searchRes = await stripe.customers.search({ query: `email:\"${userEmail!}\"`, limit: 1 });
      if (searchRes.data.length > 0) {
        customerId = searchRes.data[0].id;
        logStep("Found Stripe customer via search", { customerId });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logStep("Stripe customer search unavailable, falling back to list", { message: msg });
    }

    if (!customerId) {
      const listRes = await stripe.customers.list({ limit: 100 });
      const match = listRes.data.find(c => (c.email ?? "").toLowerCase() === userEmail!.toLowerCase());
      if (match) {
        customerId = match.id;
        logStep("Found Stripe customer via list", { customerId });
      }
    }

    if (!customerId) {
      logStep("No customer found for email", { userEmail });
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    const hasActiveSub = subscriptions.data.length > 0;
    let productId = null;
    let subscriptionEnd = null;
    let priceId = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      try {
        subscriptionEnd = subscription.current_period_end 
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null;
      } catch (e) {
        logStep("Failed to parse subscription end date", { current_period_end: subscription.current_period_end });
        subscriptionEnd = null;
      }
      logStep("Active subscription found", { subscriptionId: subscription.id, endDate: subscriptionEnd });
      productId = subscription.items.data[0].price.product;
      priceId = subscription.items.data[0].price.id;
      logStep("Determined subscription tier", { productId, priceId });
    } else {
      logStep("No active subscription found");
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      product_id: productId,
      price_id: priceId,
      subscription_end: subscriptionEnd
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    // Return 200 with unsubscribed state on error to prevent blocking the app
    return new Response(JSON.stringify({ subscribed: false, error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
