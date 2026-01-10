import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export interface Material {
  id: string;
  projectId: string;
  name: string;
  quantity: number;
  unit: string;
  estimatedCost: number;
  actualCost: number;
  status: string;
  supplier: string | null;
  notes: string | null;
}

export const useMaterials = (projectId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["materials", projectId],
    queryFn: async () => {
      let query = supabase
        .from("materials")
        .select("*")
        .order("created_at", { ascending: false });

      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((m: any) => ({
        id: m.id,
        projectId: m.project_id,
        name: m.name,
        quantity: Number(m.quantity) || 0,
        unit: m.unit,
        estimatedCost: Number(m.estimated_cost) || 0,
        actualCost: Number(m.actual_cost) || 0,
        status: m.status,
        supplier: m.supplier,
        notes: m.notes,
      }));
    },
  });

  const addMaterial = useMutation({
    mutationFn: async (material: Omit<Material, "id">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("materials").insert({
        user_id: user.id,
        project_id: material.projectId,
        name: material.name,
        quantity: material.quantity,
        unit: material.unit,
        estimated_cost: material.estimatedCost,
        actual_cost: material.actualCost,
        status: material.status,
        supplier: material.supplier,
        notes: material.notes,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast({ title: t("material.toast.added") });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: t("material.toast.error"), description: error.message });
    },
  });

  const updateMaterial = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Material> & { id: string }) => {
      const { error } = await supabase
        .from("materials")
        .update({
          name: updates.name,
          quantity: updates.quantity,
          unit: updates.unit,
          estimated_cost: updates.estimatedCost,
          actual_cost: updates.actualCost,
          status: updates.status,
          supplier: updates.supplier,
          notes: updates.notes,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast({ title: t("material.toast.updated") });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: t("material.toast.error"), description: error.message });
    },
  });

  const deleteMaterial = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("materials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast({ title: t("material.toast.deleted") });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: t("material.toast.error"), description: error.message });
    },
  });

  const addBulkMaterials = useMutation({
    mutationFn: async (materials: Omit<Material, "id">[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("materials").insert(
        materials.map(m => ({
          user_id: user.id,
          project_id: m.projectId,
          name: m.name,
          quantity: m.quantity,
          unit: m.unit,
          estimated_cost: m.estimatedCost,
          actual_cost: m.actualCost,
          status: m.status,
          supplier: m.supplier,
          notes: m.notes,
        }))
      );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast({ title: t("material.toast.bulkAdded") });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: t("material.toast.error"), description: error.message });
    },
  });

  return {
    materials,
    isLoading,
    addMaterial: addMaterial.mutate,
    updateMaterial: updateMaterial.mutate,
    deleteMaterial: deleteMaterial.mutate,
    addBulkMaterials: addBulkMaterials.mutate,
  };
};
