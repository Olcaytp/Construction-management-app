import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

export interface TaskStatistics {
  id: string;
  user_id: string;
  task_id: string;
  worker_count: number;
  hours_worked: number;
  days_worked: number;
  actual_cost: number;
  created_at: string;
  updated_at: string;
}

export const useTaskStatistics = () => {
  const { user } = useAuth();
  const [statistics, setStatistics] = useState<Record<string, TaskStatistics> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all task statistics for the user
  useEffect(() => {
    const fetchStatistics = async () => {
      if (!user?.id) {
        setStatistics({});
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from("task_statistics")
          .select("*")
          .eq("user_id", user.id);

        if (fetchError) throw fetchError;

        // Convert to Record<taskId, TaskStatistics> for easy lookup
        const statsMap: Record<string, TaskStatistics> = {};
        (data || []).forEach((stat) => {
          statsMap[stat.task_id] = stat;
        });

        setStatistics(statsMap);
        setError(null);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to fetch statistics";
        setError(errorMsg);
        console.error("Error fetching task statistics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, [user?.id]);

  // Save or update task statistics
  const saveTaskStatistics = async (taskId: string, stats: Omit<TaskStatistics, "id" | "user_id" | "task_id" | "created_at" | "updated_at">) => {
    if (!user?.id) {
      setError("User not authenticated");
      return false;
    }

    try {
      // Check if statistics already exist
      const existing = statistics?.[taskId];

      if (existing) {
        // Update existing
        const { error: updateError } = await supabase
          .from("task_statistics")
          .update({
            worker_count: stats.worker_count,
            hours_worked: stats.hours_worked,
            days_worked: stats.days_worked,
            actual_cost: stats.actual_cost,
          })
          .eq("id", existing.id);

        if (updateError) throw updateError;
      } else {
        // Insert new
        const { error: insertError } = await supabase
          .from("task_statistics")
          .insert([
            {
              user_id: user.id,
              task_id: taskId,
              worker_count: stats.worker_count,
              hours_worked: stats.hours_worked,
              days_worked: stats.days_worked,
              actual_cost: stats.actual_cost,
            },
          ]);

        if (insertError) throw insertError;
      }

      // Refetch to get updated data
      const { data: newData, error: fetchError } = await supabase
        .from("task_statistics")
        .select("*")
        .eq("user_id", user.id);

      if (fetchError) throw fetchError;

      const statsMap: Record<string, TaskStatistics> = {};
      (newData || []).forEach((stat) => {
        statsMap[stat.task_id] = stat;
      });
      setStatistics(statsMap);
      setError(null);
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to save statistics";
      setError(errorMsg);
      console.error("Error saving task statistics:", err);
      return false;
    }
  };

  // Delete task statistics
  const deleteTaskStatistics = async (taskId: string) => {
    if (!user?.id) {
      setError("User not authenticated");
      return false;
    }

    try {
      const existing = statistics?.[taskId];
      if (!existing) return false;

      const { error: deleteError } = await supabase
        .from("task_statistics")
        .delete()
        .eq("id", existing.id);

      if (deleteError) throw deleteError;

      // Update state
      const updated = { ...statistics };
      delete updated[taskId];
      setStatistics(updated);
      setError(null);
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to delete statistics";
      setError(errorMsg);
      console.error("Error deleting task statistics:", err);
      return false;
    }
  };

  return {
    statistics: statistics || {},
    loading,
    error,
    saveTaskStatistics,
    deleteTaskStatistics,
  };
};
