import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export interface TimesheetEntry {
  id: string;
  user_id: string;
  team_member_id: string;
  work_date: string;
  hours_worked: number;
  overtime_hours: number;
  leave_hours: number;
  leave_type?: string | null;
  hourly_rate: number;
  payable_amount: number;
  status: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTimesheetInput {
  team_member_id: string;
  work_date: string;
  hours_worked: number;
  overtime_hours?: number;
  leave_hours?: number;
  leave_type?: string | null;
  hourly_rate: number;
  payable_amount: number;
  status?: string;
  notes?: string | null;
}

export interface UpdateTimesheetInput extends CreateTimesheetInput {
  id: string;
}

export const useTimesheets = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: timesheets = [], isLoading } = useQuery({
    queryKey: ["timesheets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_timesheets")
        .select("*")
        .order("work_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((row) => ({
        ...row,
        hours_worked: Number(row.hours_worked) || 0,
        overtime_hours: Number(row.overtime_hours) || 0,
        leave_hours: Number(row.leave_hours) || 0,
        hourly_rate: Number(row.hourly_rate) || 0,
        payable_amount: Number(row.payable_amount) || 0,
      })) as TimesheetEntry[];
    },
  });

  const createTimesheet = useMutation({
    mutationFn: async (payload: CreateTimesheetInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t("timesheet.toast.noUser"));

      const { data, error } = await supabase.from("team_timesheets").insert({
        user_id: user.id,
        team_member_id: payload.team_member_id,
        work_date: payload.work_date,
        hours_worked: payload.hours_worked,
        overtime_hours: payload.overtime_hours ?? 0,
        leave_hours: payload.leave_hours ?? 0,
        leave_type: payload.leave_type ?? null,
        hourly_rate: payload.hourly_rate,
        payable_amount: payload.payable_amount,
        status: payload.status ?? "pending",
        notes: payload.notes ?? null,
      }).select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheets"] });
      toast({ title: t("timesheet.toast.created") });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: t("timesheet.toast.error"), description: error instanceof Error ? error.message : String(error) });
    },
  });

  const updateTimesheet = useMutation({
    mutationFn: async (payload: UpdateTimesheetInput) => {
      const { data, error } = await supabase
        .from("team_timesheets")
        .update({
          team_member_id: payload.team_member_id,
          work_date: payload.work_date,
          hours_worked: payload.hours_worked,
          overtime_hours: payload.overtime_hours ?? 0,
          leave_hours: payload.leave_hours ?? 0,
          leave_type: payload.leave_type ?? null,
          hourly_rate: payload.hourly_rate,
          payable_amount: payload.payable_amount,
          status: payload.status ?? "pending",
          notes: payload.notes ?? null,
        })
        .eq("id", payload.id)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheets"] });
      toast({ title: t("timesheet.toast.updated") });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: t("timesheet.toast.error"), description: error instanceof Error ? error.message : String(error) });
    },
  });

  const deleteTimesheet = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("team_timesheets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheets"] });
      toast({ title: t("timesheet.toast.deleted") });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: t("timesheet.toast.error"), description: error instanceof Error ? error.message : String(error) });
    },
  });

  return {
    timesheets,
    isLoading,
    createTimesheet: createTimesheet.mutate,
    updateTimesheet: updateTimesheet.mutate,
    deleteTimesheet: deleteTimesheet.mutate,
  };
};
