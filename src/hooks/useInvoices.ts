import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Invoice {
  id: string;
  user_id: string;
  project_id: string;
  assigned_to?: string; // Hangi işçi/usta
  work_type: string;
  work_type_label: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_amount: number;
  description?: string;
  status: "pending" | "approved" | "invoiced";
  invoice_date?: string;
  created_at: string;
  updated_at: string;
}

export const WORK_TYPES = [
  { value: "boya", label: "Boya İşleri", unit: "m²" },
  { value: "siva", label: "Sıva İşleri", unit: "m²" },
  { value: "dekorasyon", label: "Dekorasyon", unit: "m²" },
  { value: "cati", label: "Çatı İşleri", unit: "m²" },
  { value: "doseme", label: "Döşeme İşleri", unit: "m²" },
  { value: "cam", label: "Cam İşleri", unit: "m²" },
  { value: "kapi_pencere", label: "Kapı-Pencere Kurulumu", unit: "adet" },
  { value: "insaat", label: "İnşaat İşleri", unit: "m³" },
  { value: "elektrik", label: "Elektrik İşleri", unit: "adet" },
  { value: "tesisata", label: "Tesisatçı İşleri", unit: "m" },
  { value: "bahce", label: "Bahçe İşleri", unit: "m²" },
  { value: "omur_isi", label: "Öğür İşi (İnsan Günü)", unit: "günü" },
];

export const useInvoices = (projectId: string) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hakkedis")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as Invoice[];
    },
  });

  const createInvoice = useMutation({
    mutationFn: async (newInvoice: Omit<Invoice, "id" | "created_at" | "updated_at" | "user_id">) => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (!user || authError) {
        throw new Error(t("invoice.toast.noUser"));
      }

      const invoiceWithUser = {
        ...newInvoice,
        user_id: user.id,
      };

      const { data, error } = await supabase
        .from("hakkedis")
        .insert([invoiceWithUser])
        .select()
        .single();

      if (error) throw error;
      return data as Invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices", projectId] });
      toast.success(t("invoice.toast.created"));
    },
    onError: (error) => {
      console.error("Create invoice error:", error);
      toast.error(t("invoice.toast.createError"));
    },
  });

  const updateInvoice = useMutation({
    mutationFn: async (invoice: Invoice) => {
      const { data, error } = await supabase
        .from("hakkedis")
        .update(invoice)
        .eq("id", invoice.id)
        .select()
        .single();

      if (error) throw error;
      return data as Invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices", projectId] });
      toast.success(t("invoice.toast.updated"));
    },
    onError: (error) => {
      console.error("Update invoice error:", error);
      toast.error(t("invoice.toast.updateError"));
    },
  });

  const deleteInvoice = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { error } = await supabase
        .from("hakkedis")
        .delete()
        .eq("id", invoiceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices", projectId] });
      toast.success(t("invoice.toast.deleted"));
    },
    onError: (error) => {
      console.error("Delete invoice error:", error);
      toast.error(t("invoice.toast.deleteError"));
    },
  });

  const approveInvoice = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data, error } = await supabase
        .from("hakkedis")
        .update({ status: "approved" })
        .eq("id", invoiceId)
        .select()
        .single();

      if (error) throw error;
      return data as Invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices", projectId] });
      toast.success(t("invoice.toast.approved"));
    },
    onError: (error) => {
      console.error("Approve invoice error:", error);
      toast.error(t("invoice.toast.approveError"));
    },
  });

  return {
    invoices,
    isLoading,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    approveInvoice,
  };
};
