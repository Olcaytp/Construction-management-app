import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  role: 'admin' | 'user';
  subscribed: boolean;
  subscription_end: string | null;
}

interface AdminStats {
  totalUsers: number;
  premiumUsers: number;
  standardUsers: number;
  totalProjects: number;
  totalTasks: number;
}

export const useAdmin = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);

  const checkAdminRole = useCallback(async () => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) throw error;
      setIsAdmin(!!data);
    } catch (error) {
      console.error("Error checking admin role:", error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;

    try {
      // Use RPC function to fetch admin users with auth metadata
      const { data: users, error: rpcError } = await supabase.rpc('fetch_admin_users');

      if (!rpcError && users) {
        const usersWithSubscription = (users as any[]).map((u: any) => ({
          id: u.id,
          email: u.email,
          full_name: u.full_name || '',
          created_at: u.created_at,
          role: (u.role as 'admin' | 'user') || 'user',
          subscribed: false,
          subscription_end: null
        }));
        setUsers(usersWithSubscription);
        return;
      }

      // Fallback to direct database query if RPC fails
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        return {
          id: profile.id,
          email: profile.email || '',
          full_name: profile.full_name || '',
          created_at: profile.created_at,
          role: (userRole?.role as 'admin' | 'user') || 'user',
          subscribed: false,
          subscription_end: null
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }, [isAdmin]);

  const fetchStats = useCallback(async () => {
    if (!isAdmin) return;

    try {
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: projectsCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true });

      const { count: tasksCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalUsers: usersCount || 0,
        premiumUsers: 0, // Will be checked via Stripe
        standardUsers: usersCount || 0,
        totalProjects: projectsCount || 0,
        totalTasks: tasksCount || 0
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, [isAdmin]);

  const updateUserRole = async (userId: string, newRole: 'admin' | 'user') => {
    try {
      // First delete existing role
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Then insert new role
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: newRole });

      if (error) throw error;
      
      await fetchUsers();
      return true;
    } catch (error) {
      console.error("Error updating user role:", error);
      return false;
    }
  };

  useEffect(() => {
    checkAdminRole();
  }, [checkAdminRole]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchStats();
    }
  }, [isAdmin, fetchUsers, fetchStats]);

  return {
    isAdmin,
    loading,
    users,
    stats,
    fetchUsers,
    fetchStats,
    updateUserRole
  };
};
