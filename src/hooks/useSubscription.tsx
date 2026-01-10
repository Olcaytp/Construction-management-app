import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

// Stripe ürün ve fiyat bilgileri
// Plan limitleri
export const PLAN_LIMITS = {
  standard: {
    maxProjects: 3,
    maxTeamMembers: 2,
    maxPhotosPerProject: 2,
  },
  premium: {
    maxProjects: Infinity,
    maxTeamMembers: Infinity,
    maxPhotosPerProject: 4,
  },
} as const;

export const SUBSCRIPTION_TIERS = {
  standard: {
    product_id: null,
    price_id: null,
    name: "Standard",
    price: 0,
    currency: "TRY",
    features: [
      "3 proje",
      "2 ekip üyesi",
      "Temel raporlama",
      "E-posta desteği"
    ]
  },
  premium: {
    product_id: "prod_TiJnuqsH5SgpBF",
    price_id: "price_1Skt9sBqz5IswCfZjnSobzU9",
    name: "Premium",
    price: 49.99,
    currency: "TRY",
    features: [
      "Sınırsız proje",
      "Sınırsız ekip üyesi",
      "Gelişmiş raporlama",
      "Öncelikli destek",
      "AI malzeme önerileri"
    ]
  }
} as const;

interface SubscriptionState {
  subscribed: boolean;
  productId: string | null;
  priceId: string | null;
  subscriptionEnd: string | null;
  loading: boolean;
  error: string | null;
}

interface SubscriptionContextType extends SubscriptionState {
  checkSubscription: () => Promise<void>;
  createCheckout: (priceId: string) => Promise<string | null>;
  openCustomerPortal: () => Promise<string | null>;
  isPremium: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider = ({ children }: { children: React.ReactNode }) => {
  const { session, user } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    subscribed: false,
    productId: null,
    priceId: null,
    subscriptionEnd: null,
    loading: true,
    error: null,
  });

  // Always fetch a fresh JWT from Supabase Auth before invoking protected Edge Functions
  const getAuthToken = useCallback(async (): Promise<string | null> => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const checkSubscription = useCallback(async () => {
    if (!session?.access_token || !user?.id) {
      setState(prev => ({ ...prev, loading: false, subscribed: false }));
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      // JWT debug logging
      const { data: currentSession } = await supabase.auth.getSession();
      const token = currentSession?.session?.access_token;
      console.log("[SUBSCRIPTION] Current JWT token:", token);
      console.log("[SUBSCRIPTION] Token exists:", !!token);
      if (token) {
        console.log("[SUBSCRIPTION] Token length:", token.length);
        console.log("[SUBSCRIPTION] Token starts with:", token.substring(0, 20) + "...");
      }
      
      const { data, error } = await supabase.functions.invoke('check-subscription');

      if (error) throw error;

      setState({
        subscribed: data.subscribed || false,
        productId: data.product_id || null,
        priceId: data.price_id || null,
        subscriptionEnd: data.subscription_end || null,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error("Error checking subscription:", error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Abonelik kontrolü başarısız",
      }));
    }
  }, [session?.access_token]);

  const createCheckout = useCallback(async (priceId: string): Promise<string | null> => {
    if (!session?.access_token) {
      return null;
    }

    try {
      // JWT debug logging
      const { data: currentSession } = await supabase.auth.getSession();
      const token = currentSession?.session?.access_token;
      console.log("[CHECKOUT] Current JWT token:", token);
      console.log("[CHECKOUT] Token exists:", !!token);
      if (token) {
        console.log("[CHECKOUT] Token length:", token.length);
        console.log("[CHECKOUT] Token starts with:", token.substring(0, 20) + "...");
      }
      
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId },
      });

      if (error) throw error;
      return data.url;
    } catch (error) {
      console.error("Error creating checkout:", error);
      return null;
    }
  }, [session?.access_token]);

  const openCustomerPortal = useCallback(async (): Promise<string | null> => {
    if (!session?.access_token) {
      return null;
    }

    try {
      // JWT debug logging
      const { data: currentSession } = await supabase.auth.getSession();
      const token = currentSession?.session?.access_token;
      console.log("[PORTAL] Current JWT token:", token);
      console.log("[PORTAL] Token exists:", !!token);
      if (token) {
        console.log("[PORTAL] Token length:", token.length);
        console.log("[PORTAL] Token starts with:", token.substring(0, 20) + "...");
      }
      
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) throw error;
      return data.url;
    } catch (error) {
      console.error("Error opening customer portal:", error);
      return null;
    }
  }, [session?.access_token]);

  // Check subscription on mount and when session changes
  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Auto-refresh subscription status every minute
  useEffect(() => {
    if (!session) return;
    
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [session, checkSubscription]);

  // Check URL for subscription success/cancel
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('subscription') === 'success') {
      // Clear URL params and refresh subscription
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(checkSubscription, 2000);
    }
  }, [checkSubscription]);

  const isPremium = state.subscribed && state.productId === SUBSCRIPTION_TIERS.premium.product_id;

  return (
    <SubscriptionContext.Provider
      value={{
        ...state,
        checkSubscription,
        createCheckout,
        openCustomerPortal,
        isPremium,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
};
