import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

// Stripe ürün ve fiyat bilgileri
// Plan limitleri
export const PLAN_LIMITS = {
  free: {
    maxProjects: 2,
    maxCustomers: 2,
    maxTeamMembers: 2,
    maxTasksPerProject: 3,
    maxPhotosPerProject: 2,
  },
  premium: {
    maxProjects: Infinity,
    maxCustomers: Infinity,
    maxTeamMembers: Infinity,
    maxTasksPerProject: Infinity,
    maxPhotosPerProject: 5,
  },
} as const;

export const SUBSCRIPTION_TIERS = {
  free: {
    product_id: null,
    price_id: null,
    name: "Başlangıç",
    price: 0,
    currency: "TRY",
    features: [
      "2 proje",
      "2 müşteri",
      "2 ekip üyesi",
      "3 görev/proje",
      "2 fotoğraf/proje",
      "Temel raporlama",
      "Basit AI sözleşme ve malzeme önerileri",
      "E-posta desteği"
    ]
  },
  premium_monthly: {
    product_id: "prod_Tm6RaLjOTuAMgO",
    price_id: "price_1SoYEUBqz5IswCfZPLnFK8VG",
    name: "Premium (Aylık)",
    price: 250,
    currency: "TRY",
    billing_period: "monthly",
    features: [
      "Sınırsız proje",
      "Sınırsız müşteri",
      "Sınırsız ekip üyesi",
      "Sınırsız görev",
      "5 fotoğraf/proje",
      "Gelişmiş raporlama",
      "Gelişmiş AI sözleşme şablonları ve malzeme optimizasyonu",
      "Öncelikli destek"
    ]
  },
  premium_yearly: {
    product_id: "prod_Tm6SDgRvgAk69w",
    price_id: "price_1SoYFrBqz5IswCfZqC0zTj9e",
    name: "Premium (Yıllık)",
    price: 2500,
    currency: "TRY",
    billing_period: "yearly",
    save_percentage: 25,
    monthly_equivalent: 208.33,
    features: [
      "Sınırsız proje",
      "Sınırsız müşteri",
      "Sınırsız ekip üyesi",
      "Sınırsız görev",
      "5 fotoğraf/proje",
      "Gelişmiş raporlama",
      "Gelişmiş AI sözleşme şablonları ve malzeme optimizasyonu",
      "Öncelikli destek",
      "✨ %25 tasarruf! (Aylık 208.33₺)"
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
      const { data: currentSession, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.warn("[SUBSCRIPTION] Auth session error:", sessionError);
        setState(prev => ({ ...prev, loading: false, subscribed: false }));
        return;
      }
      
      const token = currentSession?.session?.access_token;
      if (!token) {
        console.warn("[SUBSCRIPTION] No valid token available");
        setState(prev => ({ ...prev, loading: false, subscribed: false }));
        return;
      }
      
      console.log("[SUBSCRIPTION] About to invoke check-subscription...")
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) {
        console.warn("[SUBSCRIPTION] Edge function error:", error.message);
        // Don't throw - gracefully handle subscription check failures
        setState(prev => ({
          ...prev,
          loading: false,
          subscribed: false,
        }));
        return;
      }
      
      console.log("[SUBSCRIPTION] Response data:", data);

      setState({
        subscribed: data?.subscribed || false,
        productId: data?.product_id || null,
        priceId: data?.price_id || null,
        subscriptionEnd: data?.subscription_end || null,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error("Error checking subscription:", error);
      // Gracefully fail - don't crash the app
      setState(prev => ({
        ...prev,
        loading: false,
        subscribed: false,
        error: null, // Don't show error to user
      }));
    }
  }, [session?.access_token, user?.id]);

  const createCheckout = useCallback(async (priceId: string): Promise<string | null> => {
    if (!session?.access_token) {
      return null;
    }

    try {
      // Validate session first
      const { data: currentSession, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !currentSession?.session?.access_token) {
        console.warn("[CHECKOUT] Invalid session");
        return null;
      }
      
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId },
      });

      if (error) {
        console.warn("[CHECKOUT] Error:", error.message);
        return null;
      }
      return data?.url || null;
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
      // Validate session first
      const { data: currentSession, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !currentSession?.session?.access_token) {
        console.warn("[PORTAL] Invalid session");
        return null;
      }
      
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) {
        console.warn("[PORTAL] Error:", error.message);
        return null;
      }
      return data?.url || null;
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

  const isPremium = state.subscribed && [
    SUBSCRIPTION_TIERS.premium_monthly.product_id,
    SUBSCRIPTION_TIERS.premium_yearly.product_id,
  ].includes(state.productId as string);

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
