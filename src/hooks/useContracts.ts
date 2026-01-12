import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

export interface Contract {
  id: string;
  user_id: string;
  project_id?: string;
  customer_id?: string;
  title: string;
  content: string;
  contractor_name?: string;
  contractor_phone?: string;
  contractor_address?: string;
  contract_date?: string;
  status: 'draft' | 'signed' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
  project_snapshot?: string; // JSON snapshot of contract-relevant project fields
  project?: { title: string };
  customer?: { name: string };
}

export const useContracts = () => {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContracts = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('contracts' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContracts((data || []) as unknown as Contract[]);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      setContracts([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const saveContract = async (contractData: Omit<Contract, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('contracts' as any)
        .insert([
          {
            ...contractData,
            user_id: user.id,
          },
        ])
        .select();

      if (error) throw error;
      
      const newContract = data?.[0] as unknown as Contract;
      setContracts(prev => [newContract, ...prev]);
      
      return newContract;
    } catch (error) {
      console.error("Error saving contract:", error);
      throw error;
    }
  };

  const updateContract = async (id: string, contractData: Partial<Omit<Contract, 'id' | 'created_at' | 'updated_at' | 'user_id'>>) => {
    try {
      const { data, error } = await supabase
        .from('contracts' as any)
        .update(contractData)
        .eq('id', id)
        .eq('user_id', user?.id || '')
        .select();

      if (error) throw error;
      
      const updated = data?.[0] as unknown as Contract;
      setContracts(prev => prev.map(c => c.id === id ? updated : c));
      
      return updated;
    } catch (error) {
      console.error("Error updating contract:", error);
      throw error;
    }
  };

  const deleteContract = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contracts' as any)
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id || '');

      if (error) throw error;
      
      setContracts(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error("Error deleting contract:", error);
      throw error;
    }
  };

  return {
    contracts,
    loading,
    fetchContracts,
    saveContract,
    updateContract,
    deleteContract,
  };
};
