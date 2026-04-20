import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export interface WorkerPortalLink {
  id: string;
  teamMemberId: string;
  authUserId: string | null;
  email: string;
  isActive: boolean;
  createdAt: string;
}

export interface WorkerLog {
  id: string;
  teamMemberId: string;
  workDate: string;
  weekNumber: number;
  year: number;
  startTime: string | null;
  endTime: string | null;
  break1Start: string | null;
  break1End: string | null;
  break2Start: string | null;
  break2End: string | null;
  hoursWorked: number;
  zone: string | null;
  workType: "demir" | "kalip" | "beton" | "diger";
  notes: string | null;
  isDayOff: boolean;
  dayOffReason: string | null;
}

export interface WorkerTaskComment {
  id: string;
  taskId: string;
  teamMemberId: string;
  comment: string;
  photos: string[];
  createdAt: string;
  memberName?: string;
}

// ─── Admin: portal link yönetimi ───────────────────────────────────────────

export const useWorkerPortalAdmin = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: portalLinks = [], isLoading } = useQuery({
    queryKey: ["worker_portal_links"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("worker_portal_links")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((l) => ({
        id: l.id,
        teamMemberId: l.team_member_id,
        authUserId: l.auth_user_id,
        email: l.email,
        isActive: l.is_active,
        createdAt: l.created_at,
      })) as WorkerPortalLink[];
    },
  });

  // Admin ustaya portal erişimi açar, magic link gönderir
  const inviteWorker = useMutation({
    mutationFn: async ({
      teamMemberId,
      email,
    }: {
      teamMemberId: string;
      email: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      // 1. portal_links tablosuna ekle (ya da güncelle)
      const { error: linkError } = await supabase
        .from("worker_portal_links")
        .upsert(
          {
            team_member_id: teamMemberId,
            owner_user_id: user.id,
            email,
            is_active: true,
          },
          { onConflict: "team_member_id" }
        );
      if (linkError) throw linkError;

      // 2. Supabase magic link gönder — direkt /portal'a yönlendir
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/portal`,
          shouldCreateUser: true,
        },
      });
      if (authError) throw authError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worker_portal_links"] });
      toast({ title: "Davet gönderildi", description: "Magic link e-posta ile iletildi." });
    },
    onError: (e: Error) => {
      toast({ variant: "destructive", title: "Hata", description: e.message });
    },
  });

  const deactivateWorker = useMutation({
    mutationFn: async (teamMemberId: string) => {
      const { error } = await supabase
        .from("worker_portal_links")
        .update({ is_active: false })
        .eq("team_member_id", teamMemberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worker_portal_links"] });
      toast({ title: "Erişim kaldırıldı" });
    },
  });

  // Admin tüm worker loglarını okur
  const { data: allWorkerLogs = [] } = useQuery({
    queryKey: ["worker_logs_admin"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("worker_logs")
        .select("*")
        .order("work_date", { ascending: false });
      if (error) throw error;
      return (data || []).map(mapLog);
    },
  });

  // Admin tüm görev yorumlarını okur
  const { data: allComments = [] } = useQuery({
    queryKey: ["worker_comments_admin"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("worker_task_comments")
        .select("*, team_members(name), tasks(title, status, priority, due_date)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((c: any) => ({
        ...mapComment(c),
        memberName: c.team_members?.name || "Usta",
        taskTitle: c.tasks?.title || "",
        taskStatus: c.tasks?.status || "",
        taskPriority: c.tasks?.priority || "",
        taskDueDate: c.tasks?.due_date || "",
      }));
    },
  });

  return {
    portalLinks,
    isLoading,
    allWorkerLogs,
    allComments,
    inviteWorker: inviteWorker.mutateAsync,
    deactivateWorker: deactivateWorker.mutate,
    isInviting: inviteWorker.isPending,
  };
};

// ─── Worker (usta): kendi verilerini yönetir ────────────────────────────────

export const useWorkerPortal = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Ustanın kendi team_member kaydını bul
  const { data: workerLink } = useQuery({
    queryKey: ["my_worker_link", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("worker_portal_links")
        .select("*")
        .eq("auth_user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data
        ? {
            id: data.id,
            teamMemberId: data.team_member_id,
            ownerUserId: data.owner_user_id,
          }
        : null;
    },
  });

  // Usta kendi loglarını okur
  const { data: myLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["my_worker_logs", workerLink?.teamMemberId],
    enabled: !!workerLink,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("worker_logs")
        .select("*")
        .eq("team_member_id", workerLink!.teamMemberId)
        .order("work_date", { ascending: false });
      if (error) throw error;
      return (data || []).map(mapLog);
    },
  });

  const upsertLog = useMutation({
    mutationFn: async (log: Omit<WorkerLog, "id">) => {
      if (!workerLink) throw new Error("Usta bağlantısı bulunamadı");
      const { error } = await supabase.from("worker_logs").upsert(
        {
          team_member_id: workerLink.teamMemberId,
          work_date: log.workDate,
          week_number: log.weekNumber,
          year: log.year,
          start_time: log.startTime,
          end_time: log.endTime,
          break1_start: log.break1Start,
          break1_end: log.break1End,
          break2_start: log.break2Start,
          break2_end: log.break2End,
          hours_worked: log.hoursWorked,
          zone: log.zone,
          work_type: log.workType,
          notes: log.notes,
          is_day_off: log.isDayOff,
          day_off_reason: log.dayOffReason,
        },
        { onConflict: "team_member_id,work_date" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my_worker_logs"] });
      queryClient.invalidateQueries({ queryKey: ["worker_logs_admin"] });
      toast({ title: "Kayıt güncellendi" });
    },
    onError: (e: Error) => {
      toast({ variant: "destructive", title: "Hata", description: e.message });
    },
  });

  // Usta kendine atanan görevleri okur
  const { data: myTasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["my_worker_tasks", workerLink?.teamMemberId],
    enabled: !!workerLink,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, projects(title)")
        .eq("assigned_to", workerLink!.teamMemberId)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return (data || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        description: t.description || "",
        status: t.status,
        priority: t.priority,
        projectTitle: t.projects?.title || "",
        dueDate: t.due_date,
        estimatedCost: Number(t.estimated_cost) || 0,
        quantity: Number(t.quantity) || 0,
        unit: t.unit || "adet",
      }));
    },
  });

  // Yorumlar
  const { data: taskComments = [] } = useQuery({
    queryKey: ["my_task_comments", workerLink?.teamMemberId],
    enabled: !!workerLink,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("worker_task_comments")
        .select("*, team_members(name)")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []).map((c: any) => ({
        ...mapComment(c),
        memberName: c.team_members?.name || "Usta",
      }));
    },
  });

  const addComment = useMutation({
    mutationFn: async ({
      taskId,
      comment,
      photos,
    }: {
      taskId: string;
      comment: string;
      photos: string[];
    }) => {
      if (!workerLink) throw new Error("Usta bağlantısı bulunamadı");
      const { error } = await supabase.from("worker_task_comments").insert({
        task_id: taskId,
        team_member_id: workerLink.teamMemberId,
        owner_user_id: workerLink.ownerUserId,
        comment,
        photos,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my_task_comments"] });
      queryClient.invalidateQueries({ queryKey: ["worker_comments_admin"] });
      toast({ title: "Yorum eklendi" });
    },
    onError: (e: Error) => {
      toast({ variant: "destructive", title: "Hata", description: e.message });
    },
  });

  // Fotoğraf yükleme
  const uploadPhoto = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `${user!.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("worker-photos")
      .upload(path, file);
    if (error) throw error;
    // Signed URL — 1 yıl geçerli
    const { data } = await supabase.storage
      .from("worker-photos")
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    if (!data?.signedUrl) throw new Error("Signed URL alınamadı");
    return data.signedUrl;
  };

  return {
    workerLink,
    myLogs,
    logsLoading,
    myTasks,
    tasksLoading,
    taskComments,
    upsertLog: upsertLog.mutateAsync,
    addComment: addComment.mutateAsync,
    uploadPhoto,
    isSubmitting: upsertLog.isPending || addComment.isPending,
  };
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function mapLog(l: any): WorkerLog {
  return {
    id: l.id,
    teamMemberId: l.team_member_id,
    workDate: l.work_date,
    weekNumber: l.week_number,
    year: l.year,
    startTime: l.start_time,
    endTime: l.end_time,
    break1Start: l.break1_start || null,
    break1End: l.break1_end || null,
    break2Start: l.break2_start || null,
    break2End: l.break2_end || null,
    hoursWorked: Number(l.hours_worked) || 0,
    zone: l.zone,
    workType: l.work_type,
    notes: l.notes,
    isDayOff: l.is_day_off,
    dayOffReason: l.day_off_reason,
  };
}

function mapComment(c: any): WorkerTaskComment {
  return {
    id: c.id,
    taskId: c.task_id,
    teamMemberId: c.team_member_id,
    comment: c.comment,
    photos: c.photos || [],
    createdAt: c.created_at,
  };
}
