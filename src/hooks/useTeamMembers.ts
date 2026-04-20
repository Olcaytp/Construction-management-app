import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export interface TeamMember {
  id: string;
  name: string;
  phone: string;
  specialty: string;
  dailyWage: number;
  totalReceivable: number;
  totalPaid: number;
}

export const useTeamMembers = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: teamMembers = [], isLoading } = useQuery({
    queryKey: ["team_members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((m) => ({
        id: m.id,
        name: m.name,
        phone: m.phone,
        specialty: m.specialty,
        dailyWage: Number(m.daily_wage) || 0,
        totalReceivable: Number(m.total_receivable) || 0,
        totalPaid: Number(m.total_paid) || 0,
      }));
    },
  });

  const addTeamMember = useMutation({
    mutationFn: async (member: Omit<TeamMember, "id">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("team_members").insert({
        user_id: user.id,
        name: member.name,
        phone: member.phone,
        specialty: member.specialty,
        daily_wage: member.dailyWage,
        total_receivable: member.totalReceivable,
        total_paid: member.totalPaid,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team_members"] });
      toast({ title: t("team.added") });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: t("common.error"), description: error.message });
    },
  });

  const updateTeamMember = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TeamMember> & { id: string }) => {
      const { error } = await supabase
        .from("team_members")
        .update({
          name: updates.name,
          phone: updates.phone,
          specialty: updates.specialty,
          daily_wage: updates.dailyWage,
          total_receivable: updates.totalReceivable,
          total_paid: updates.totalPaid,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team_members"] });
      toast({ title: t("team.updated") });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: t("common.error"), description: error.message });
    },
  });

  const deleteTeamMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("team_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team_members"] });
      toast({ title: t("team.deleted") });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: t("common.error"), description: error.message });
    },
  });

  return {
    teamMembers,
    isLoading,
    addTeamMember: addTeamMember.mutate,
    updateTeamMember: updateTeamMember.mutate,
    deleteTeamMember: deleteTeamMember.mutate,
  };
};
