import { useState, useEffect } from "react";
import { useWorkerPortal } from "@/hooks/useWorkerPortal";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkerWeeklyLog } from "@/components/portal/WorkerWeeklyLog";
import { WorkerTaskList } from "@/components/portal/WorkerTaskList";
import { Building2, CalendarDays, ListTodo, LogOut, HardHat, Loader2 } from "lucide-react";

const WorkerPortal = () => {
  const { user, signOut } = useAuth();
  const { workerLink, myTasks, tasksLoading } = useWorkerPortal();
  const [activeTab, setActiveTab] = useState("logs");
  const [tokenProcessing, setTokenProcessing] = useState(true);

  // Magic link token'ını yakala ve işle (hem hash hem ?code= formatı)
  useEffect(() => {
    const handleMagicLink = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const hash = window.location.hash;

      if (code) {
        // PKCE flow: ?code=xxx
        await supabase.auth.exchangeCodeForSession(code);
      } else if (hash && hash.includes("access_token")) {
        // Implicit flow: #access_token=xxx
        await supabase.auth.getSession();
      }
      setTokenProcessing(false);
    };
    handleMagicLink();
  }, []);

  const pendingTasks = myTasks.filter((t) => t.status !== "completed").length;

  if (tokenProcessing) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
          <p className="text-slate-400 text-sm">Giriş yapılıyor...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto">
            <HardHat className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-xl font-semibold text-white">Geçersiz Link</h1>
          <p className="text-slate-400 text-sm">
            Bu link süresi dolmuş veya geçersiz. Yöneticinizden yeni link isteyin.
          </p>
        </div>
      </div>
    );
  }

  if (!workerLink) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto">
            <HardHat className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-xl font-semibold text-white">Erişim Bekleniyor</h1>
          <p className="text-slate-400 text-sm">
            Yöneticiniz sizi henüz sisteme davet etmemiş. Lütfen şantiye şefine başvurun.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={signOut}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Çıkış
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 p-1.5 rounded-lg">
              <Building2 className="w-5 h-5 text-slate-900" />
            </div>
            <div>
              <p className="text-xs text-slate-400 leading-none">Usta Portalı</p>
              <p className="text-sm font-semibold text-white leading-tight">
                {user?.email}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full bg-slate-900 border border-slate-800 p-1 rounded-xl mb-6">
            <TabsTrigger
              value="logs"
              className="flex-1 gap-2 data-[state=active]:bg-amber-500 data-[state=active]:text-slate-900 text-slate-400 rounded-lg"
            >
              <CalendarDays className="w-4 h-4" />
              Çalışma Takibi
            </TabsTrigger>
            <TabsTrigger
              value="tasks"
              className="flex-1 gap-2 data-[state=active]:bg-amber-500 data-[state=active]:text-slate-900 text-slate-400 rounded-lg"
            >
              <ListTodo className="w-4 h-4" />
              Görevlerim
              {pendingTasks > 0 && (
                <Badge className="bg-red-500 text-white text-xs px-1.5 py-0 h-4 min-w-4">
                  {pendingTasks}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="logs">
            <WorkerWeeklyLog />
          </TabsContent>

          <TabsContent value="tasks">
            <WorkerTaskList tasks={myTasks} isLoading={tasksLoading} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default WorkerPortal;
