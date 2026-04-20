import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  projectId: string;
  assignedTo: string;
  dueDate: string;
  estimatedCost: number;
  quantity: number;
  unit: string;
}

export const useTasks = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description || "",
        status: t.status,
        priority: t.priority,
        projectId: t.project_id || "",
        assignedTo: t.assigned_to || "",
        dueDate: t.due_date,
        estimatedCost: Number(t.estimated_cost) || 0,
        quantity: Number(t.quantity) || 0,
        unit: t.unit || "adet",
      }));
    },
  });

  const addTask = useMutation({
    mutationFn: async (task: Omit<Task, "id">) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("tasks").insert({
        user_id: user.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        project_id: task.projectId || null,
        assigned_to: task.assignedTo,
        due_date: task.dueDate,
        estimated_cost: task.estimatedCost,
        quantity: task.quantity || 0,
        unit: task.unit || "adet",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: t("task.added") });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message,
      });
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
      const { error } = await supabase
        .from("tasks")
        .update({
          title: updates.title,
          description: updates.description,
          status: updates.status,
          priority: updates.priority,
          project_id: updates.projectId || null,
          assigned_to: updates.assignedTo,
          due_date: updates.dueDate,
          estimated_cost: updates.estimatedCost,
          quantity: updates.quantity,
          unit: updates.unit,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: t("task.updated") });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message,
      });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: t("task.deleted") });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message,
      });
    },
  });

  return {
    tasks,
    isLoading,
    addTask: addTask.mutate,
    updateTask: updateTask.mutate,
    deleteTask: deleteTask.mutate,
  };
};
