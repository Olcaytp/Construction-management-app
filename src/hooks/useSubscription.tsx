import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

// Stripe ürün ve fiyat bilgileri
// Plan limitleri
export const PLAN_LIMITS = {
  free: {
    maxProjects: 5,
    maxCustomers: 5,
    maxTeamMembers: 5,
    maxPhotosPerProject: 2,
  },
  premium: {
    maxProjects: Infinity,
    maxCustomers: Infinity,
    maxTeamMembers: Infinity,
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
      "5 proje",
      "5 müşteri",
      "5 ekip üyesi",
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
      const { data: currentSession } = await supabase.auth.getSession();
      const token = currentSession?.session?.access_token;
      console.log("[SUBSCRIPTION] Current JWT token:", token);
      console.log("[SUBSCRIPTION] Token exists:", !!token);
      if (token) {
        console.log("[SUBSCRIPTION] Token length:", token.length);
        console.log("[SUBSCRIPTION] Token starts with:", token.substring(0, 20) + "...");
      }
      
      console.log("[SUBSCRIPTION] About to invoke check-subscription...")
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      console.log("[SUBSCRIPTION] Response error:", error);
      if (error) {
        console.log("[SUBSCRIPTION] Error name:", error.name);
        console.log("[SUBSCRIPTION] Error message:", error.message);
        console.log("[SUBSCRIPTION] Error context:", error.context);
      }
      console.log("[SUBSCRIPTION] Response data:", data);

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

  const isPremium = state.subscribed && state.productId === SUBSCRIPTION_TIERS.premium_monthly.product_id;

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
