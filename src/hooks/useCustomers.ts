import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSubscription, PLAN_LIMITS } from "@/hooks/useSubscription";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes: string;
  totalReceivable: number;
  totalPaid: number;
}

export const useCustomers = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isPremium } = useSubscription();

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone || "",
        address: c.address || "",
        notes: c.notes || "",
        totalReceivable: Number(c.total_receivable) || 0,
        totalPaid: Number(c.total_paid) || 0,
      }));
    },
  });

  const addCustomer = useMutation({
    mutationFn: async (customer: Omit<Customer, "id">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check subscription limits
      const currentLimit = isPremium ? PLAN_LIMITS.premium.maxCustomers : PLAN_LIMITS.free.maxCustomers;
      const { count } = await supabase.from("customers").select("*", { count: "exact", head: true }).eq("user_id", user.id);
      
      if (count !== null && count >= currentLimit) {
        throw new Error(`Müşteri limiti aşıldı. ${isPremium ? "Premium" : "Ücretsiz"} planda maksimum ${currentLimit} müşteri ekleyebilirsiniz.`);
      }

      const { error } = await supabase.from("customers").insert({
        user_id: user.id,
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        notes: customer.notes,
        total_receivable: customer.totalReceivable,
        total_paid: customer.totalPaid,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({ title: "Müşteri eklendi" });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Hata", description: error.message });
    },
  });

  const updateCustomer = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Customer> & { id: string }) => {
      const { error } = await supabase
        .from("customers")
        .update({
          name: updates.name,
          phone: updates.phone,
          address: updates.address,
          notes: updates.notes,
          total_receivable: updates.totalReceivable,
          total_paid: updates.totalPaid,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({ title: "Müşteri güncellendi" });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Hata", description: error.message });
    },
  });

  const deleteCustomer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({ title: "Müşteri silindi" });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Hata", description: error.message });
    },
  });

  return {
    customers,
    isLoading,
    addCustomer: addCustomer.mutate,
    updateCustomer: updateCustomer.mutate,
    deleteCustomer: deleteCustomer.mutate,
  };
};
