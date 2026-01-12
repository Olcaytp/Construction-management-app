import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  // Use a stable Stripe API version
  apiVersion: "2022-11-15",
});

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Manual HMAC verification
async function verifyStripeSignature(body: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const secretBytes = encoder.encode(secret);
  const bodyBytes = encoder.encode(body);

  const key = await crypto.subtle.importKey("raw", secretBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signatureBytes = await crypto.subtle.sign("HMAC", key, bodyBytes);
  const computedSignature = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  return signature === computedSignature;
}

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    console.error("Missing signature or webhook secret");
    return new Response("Missing signature or webhook secret", { status: 400 });
  }

  try {
    const body = await req.text();

    // Extract timestamp and signature from stripe-signature header
    const parts = signature.split(",");
    let timestamp = "";
    let sig = "";
    for (const part of parts) {
      const [key, value] = part.split("=");
      if (key === "t") timestamp = value;
      if (key === "v1") sig = value;
    }

    if (!timestamp || !sig) {
      console.error("Invalid signature format");
      return new Response("Invalid signature format", { status: 400 });
    }

    // Verify signature
    const signedContent = `${timestamp}.${body}`;
    const isValid = await verifyStripeSignature(signedContent, sig, webhookSecret);

    if (!isValid) {
      console.error("Invalid webhook signature");
      return new Response("Invalid webhook signature", { status: 401 });
    }

    const event = JSON.parse(body);
    console.log(`Webhook verified. Received event: ${event.type}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const userId = session.metadata?.user_id;
        const priceId = session.metadata?.price_id;

        if (!userId) {
          console.error("No user_id in session metadata");
          break;
        }

        // Determine subscription tier
        let subscriptionTier = "free";
        if (priceId?.includes("premium") || session.amount_total === 999) {
          subscriptionTier = "premium";
        } else if (priceId?.includes("pro") || session.amount_total === 1999) {
          subscriptionTier = "pro";
        }

        // Update user profile
        const { error } = await supabase
          .from("profiles")
          .update({
            subscription_tier: subscriptionTier,
            stripe_customer_id: session.customer as string,
            subscription_status: "active",
          })
          .eq("id", userId);

        if (error) {
          console.error("Error updating profile:", error);
        } else {
          console.log(`Updated user ${userId} to ${subscriptionTier} tier`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as any;
        const customerId = subscription.customer as string;

        // Find user by customer ID
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (!profile) {
          console.error("No profile found for customer:", customerId);
          break;
        }

        // Update subscription status
        const { error } = await supabase
          .from("profiles")
          .update({
            subscription_status: subscription.status,
          })
          .eq("id", profile.id);

        if (error) {
          console.error("Error updating subscription:", error);
        } else {
          console.log(`Updated subscription status for user ${profile.id}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        const customerId = subscription.customer as string;

        // Find user by customer ID
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (!profile) {
          console.error("No profile found for customer:", customerId);
          break;
        }

        // Downgrade to free tier
        const { error } = await supabase
          .from("profiles")
          .update({
            subscription_tier: "free",
            subscription_status: "canceled",
          })
          .eq("id", profile.id);

        if (error) {
          console.error("Error downgrading user:", error);
        } else {
          console.log(`Downgraded user ${profile.id} to free tier`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(`Webhook Error: ${err instanceof Error ? err.message : "Unknown error"}`, {
      status: 400,
    });
  }
});
