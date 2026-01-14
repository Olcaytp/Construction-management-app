/**
 * Copyright © 2026 Olcaytp. All rights reserved.
 * This file is part of the Construction Management Application.
 * Licensed under the MIT License. See LICENSE file for details.
 */

import { useState, useEffect, createContext, useContext } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  updateUserProfile: (data: { full_name?: string; phone?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        // First, try to restore session from storage
        const { data: { session } } = await supabase.auth.getSession();
        
        if (isMounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
          
          try {
            const tag = session?.access_token?.startsWith('eyJ') ? 'jwt' : session?.access_token ? 'other' : 'none';
            console.log(`[AUTH] initial user=${session?.user?.id ?? 'null'} token=${tag}`);
          } catch {}
        }
      } catch (error) {
        console.error('[AUTH] Session restore error:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Initialize auth on app load
    initializeAuth();

    // Set up auth state listener for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (isMounted) {
          setSession(session);
          setUser(session?.user ?? null);
          try {
            const tag = session?.access_token?.startsWith('eyJ') ? 'jwt' : session?.access_token ? 'other' : 'none';
            console.log(`[AUTH] event=${event} user=${session?.user?.id ?? 'null'} token=${tag}`);
          } catch {}
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      navigate("/auth");
    } catch (error) {
      console.error('Sign out error:', error);
      // Even if signOut fails, clear local state and redirect
      setSession(null);
      setUser(null);
      navigate("/auth");
    }
  };

  const updateUserProfile = async (data: { full_name?: string; phone?: string }) => {
    try {
      // Update auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: data.full_name,
          phone: data.phone,
        },
      });
      if (authError) throw authError;

      // Also update profiles table for admin panel visibility
      if (user) {
        const updateData: Record<string, string | null> = {};
        if (data.full_name !== undefined) {
          updateData.full_name = data.full_name || null;
        }
        
        if (Object.keys(updateData).length > 0) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', user.id);
          
          if (profileError) {
            console.error("Profile update error:", profileError);
            // Don't throw - auth update succeeded, only profile sync failed
          }
        }
      }

      // Update local user state
      setUser(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          user_metadata: {
            ...prev.user_metadata,
            full_name: data.full_name,
            phone: data.phone,
          },
        };
      });
    } catch (error) {
      console.error("Update profile error:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
