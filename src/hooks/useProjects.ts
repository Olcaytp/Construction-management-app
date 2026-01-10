import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
  progress: number;
  startDate: string;
  endDate: string;
  assignedTeam: string[];
  customerId: string | null;
  budget: number;
  actualCost: number;
  revenue: number;
  photos: string[];
}

export const useProjects = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      // 🚨 Supabase'den gelen ham veriyi görmek için buraya ekleyin
      // console.log("Supabase'den Gelen Ham Veri:", data);

      return (data || []).map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description || "",
        status: p.status,
        progress: p.progress,
        startDate: p.start_date,
        endDate: p.end_date,
        assignedTeam: p.assigned_team || [],
        customerId: p.customer_id || null,
        budget: Number(p.budget) || 0,
        actualCost: Number(p.actual_cost) || 0,
        revenue: Number(p.revenue) || 0,
        photos: p.photos || [],
      }));
    },
  });

  const addProject = useMutation({
    mutationFn: async (project: Omit<Project, "id">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("projects").insert({
        user_id: user.id,
        title: project.title,
        description: project.description,
        status: project.status,
        progress: project.progress,
        start_date: project.startDate,
        end_date: project.endDate,
        assigned_team: project.assignedTeam,
        customer_id: project.customerId || null,
        budget: project.budget,
        actual_cost: project.actualCost,
        revenue: project.revenue,
        photos: project.photos,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Proje eklendi" });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Hata", description: error.message });
    },
  });

  const updateProject = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Project> & { id: string }) => {
      const { error } = await supabase
        .from("projects")
        .update({
          title: updates.title,
          description: updates.description,
          status: updates.status,
          progress: updates.progress,
          start_date: updates.startDate,
          end_date: updates.endDate,
          assigned_team: updates.assignedTeam,
          customer_id: updates.customerId || null,
          budget: updates.budget,
          actual_cost: updates.actualCost,
          revenue: updates.revenue,
          photos: updates.photos,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Proje güncellendi" });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Hata", description: error.message });
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Proje silindi" });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Hata", description: error.message });
    },
  });
  // 💡 Dönüştürülmüş (camelCase'e çevrilmiş) proje listesini görmek için buraya ekleyin
  // console.log("Dönüştürülmüş Projeler (formattedProjects):", projects);

  return {
    projects,
    isLoading,
    addProject: addProject.mutate,
    updateProject: updateProject.mutate,
    deleteProject: deleteProject.mutate,
  };
};
