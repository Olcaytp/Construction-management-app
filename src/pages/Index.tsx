import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatsCard } from "@/components/StatsCard";
import { ProjectCard } from "@/components/ProjectCard";
import { TaskItem } from "@/components/TaskItem";
import { TeamMemberCard } from "@/components/TeamMemberCard";
import { TeamMemberForm } from "@/components/TeamMemberForm";
import { ProjectForm } from "@/components/ProjectForm";
import { TaskForm } from "@/components/TaskForm";
import { MaterialsSection } from "@/components/MaterialsSection";
import { EmptyState } from "@/components/EmptyState";
import { CustomerCard } from "@/components/CustomerCard";
import { CustomerForm } from "@/components/CustomerForm";
import { UpgradeAlert } from "@/components/UpgradeAlert";
import { ReportsSection } from "@/components/ReportsSection";
import { AdminPanel } from "@/components/AdminPanel";
import { InvoicesSection } from "@/components/InvoicesSection";
import { TimesheetSection } from "@/components/TimesheetSection";
import { LayoutDashboard, FolderKanban, ListTodo, Users, Plus, Building2, Pencil, Trash2, DollarSign, Package, UserCircle, Crown, BarChart3, Shield, FileText, Receipt, Phone, Briefcase, Banknote, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { ContractGenerator } from "@/components/ContractGenerator";
import { ContractsSection } from "@/components/ContractsSection";
import { SubscriptionCard } from "@/components/SubscriptionCard";
import { HeaderMenu } from "@/components/HeaderMenu";
import { MobileTabMenu } from "@/components/MobileTabMenu";
import { OnboardingModal } from "@/components/OnboardingModal";
import { useAuth } from "@/hooks/useAuth";
import { useProjects } from "@/hooks/useProjects";
import { useTasks } from "@/hooks/useTasks";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useCustomers } from "@/hooks/useCustomers";
import { useSubscription, PLAN_LIMITS } from "@/hooks/useSubscription";
import { useAdmin } from "@/hooks/useAdmin";
import { useEffect } from "react";
import { useContracts } from "@/hooks/useContracts";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(() => {
    // localStorage'dan kayıtlı sekmeyi al, yoksa "dashboard" döndür
    if (typeof window !== 'undefined') {
      return localStorage.getItem('activeTab') || 'dashboard';
    }
    return 'dashboard';
  });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedFinanceProjectId, setSelectedFinanceProjectId] = useState<string | null>(null);
  const [selectedFinanceTeamMemberId, setSelectedFinanceTeamMemberId] = useState<string | null>(null);
  const [projectSort, setProjectSort] = useState("startDate");
  const [taskSort, setTaskSort] = useState("dueDate");

  // Dil bilgisini buradan çekiyoruz:
    const currentLanguage = i18n.language; // 'tr', 'sv', 'en' gibi bir değer dönecektir.
    const isSwedish = currentLanguage.startsWith('sv'); // 'sv' ile başlayan dilleri (sv-SE gibi) İsveççe kabul ederiz.
    const isEnglish = currentLanguage.startsWith('en'); // 'en' ile başlayan dilleri (en-US gibi) İngilizce kabul ederiz.

    const getCurrencyFormat = (language: string) => {
      if (language.startsWith('sv')) {
        return { locale: 'sv-SE', symbol: 'kr', symbolAtEnd: true };
      }
      if (language.startsWith('en')) {
        return { locale: 'en-US', symbol: '$', symbolAtEnd: false };
      }
      return { locale: 'tr-TR', symbol: '₺', symbolAtEnd: false };
    };

    const formatCurrency = (amount: number) => {
      const { locale, symbol, symbolAtEnd } = getCurrencyFormat(i18n.language);
      const formattedAmount = amount.toLocaleString(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
      return symbolAtEnd ? `${formattedAmount} ${symbol}` : `${symbol}${formattedAmount}`;
    };

  const { user, signOut } = useAuth();
  const { isPremium, subscription } = useSubscription();
  const { isAdmin } = useAdmin();
  // hasPremiumAccess: premium, admin veya standard plan için true
  const hasPremiumAccess = isPremium || isAdmin || subscription?.tier === 'standard';

  // Scroll to top on component mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  // Aktif sekmeyi localStorage'a kaydet
  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  // Show onboarding if user hasn't filled in profile yet
  useEffect(() => {
    if (user && !user.user_metadata?.full_name) {
      setShowOnboarding(true);
    }
  }, [user]);
  const { projects, isLoading: projectsLoading, addProject, updateProject, deleteProject } = useProjects();
  const { tasks, isLoading: tasksLoading, addTask, updateTask, deleteTask } = useTasks();
  const { teamMembers, isLoading: membersLoading, addTeamMember, updateTeamMember, deleteTeamMember } = useTeamMembers();
  const { customers, isLoading: customersLoading, addCustomer, updateCustomer, deleteCustomer } = useCustomers();
  const { contracts } = useContracts();

  // Tab menu items
  const tabItems = [
    { value: "dashboard", label: t("app.dashboard"), icon: <LayoutDashboard className="h-6 w-6" /> },
    { value: "projects", label: t("app.projects"), icon: <FolderKanban className="h-6 w-6" /> },
    { value: "tasks", label: t("app.tasks"), icon: <ListTodo className="h-6 w-6" /> },
    { value: "teams", label: t("app.team"), icon: <Users className="h-6 w-6" /> },
    { value: "finance", label: t("app.economy"), icon: <DollarSign className="h-6 w-6" /> },
    { value: "materials", label: t("app.materials"), icon: <Package className="h-6 w-6" /> },
    { value: "customers", label: t("app.customers"), icon: <UserCircle className="h-6 w-6" /> },
    { value: "reports", label: t("app.reports"), icon: <BarChart3 className="h-6 w-6" /> },
    { value: "invoices", label: t("app.invoices"), icon: <Receipt className="h-6 w-6" /> },
    { value: "contracts", label: t("app.contracts"), icon: <FileText className="h-6 w-6" /> },
    { value: "subscription", label: t("app.subscription"), icon: <Crown className="h-6 w-6" /> },
    ...(isAdmin ? [{ value: "admin", label: t("app.admin"), icon: <Shield className="h-6 w-6" /> }] : []),
  ];

  // Plan limitleri - Admin'ler premium özelliklerine sahip
  // Standart ve Premium planlar için aynı fotoğraf limiti kullanılacak
  let currentLimits: any = PLAN_LIMITS.free;
  if (isPremium || isAdmin) {
    currentLimits = PLAN_LIMITS.premium;
  } else if (subscription?.tier === 'standard') {
    currentLimits = PLAN_LIMITS.standard;
  }
  const canAddProject = projects.length < currentLimits.maxProjects;
  const canAddTeamMember = teamMembers.length < currentLimits.maxTeamMembers;
  const canAddCustomer = customers.length < currentLimits.maxCustomers;
  
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const [teamFormOpen, setTeamFormOpen] = useState(false);
  const [customerFormOpen, setCustomerFormOpen] = useState(false);
  
  const [editingTask, setEditingTask] = useState<any>(null);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [editingTeamMember, setEditingTeamMember] = useState<any>(null);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [expandedTeamMemberId, setExpandedTeamMemberId] = useState<string | null>(null);

  // Delete confirmation states
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string } | null>(null);

  const handleStatusChange = (taskId: string, newStatus: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      updateTask({ id: taskId, status: newStatus });
    }
  };

  const handleAddTeamMember = (data: any) => {
    addTeamMember(data);
    setTeamFormOpen(false);
  };

  const handleEditTeamMember = (data: any) => {
    if (!editingTeamMember) return;
    updateTeamMember({ id: editingTeamMember.id, ...data });
    setEditingTeamMember(null);
    setTeamFormOpen(false);
  };

  const handleDeleteTeamMember = (id: string) => {
    setDeleteConfirm({ type: "teamMember", id });
  };

  const handleDeleteCustomer = (id: string) => {
    setDeleteConfirm({ type: "customer", id });
  };

  const handleDeleteProject = (id: string) => {
    setDeleteConfirm({ type: "project", id });
  };

  const handleDeleteTask = (id: string) => {
    setDeleteConfirm({ type: "task", id });
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    
    switch (deleteConfirm.type) {
      case "teamMember":
        deleteTeamMember(deleteConfirm.id);
        toast({ title: "Ekip üyesi silindi" });
        break;
      case "customer":
        deleteCustomer(deleteConfirm.id);
        toast({ title: "Müşteri silindi" });
        break;
      case "project":
        // Projeye ait görevleri sil
        const relatedTasks = tasks.filter(t => t.projectId === deleteConfirm.id);
        relatedTasks.forEach(task => {
          deleteTask(task.id);
        });
        // Sonra projeyi sil
        deleteProject(deleteConfirm.id);
        toast({ title: "Proje silindi" });
        break;
      case "task":
        deleteTask(deleteConfirm.id);
        toast({ title: "Görev silindi" });
        break;
    }
    setDeleteConfirm(null);
  };

  const handleAddCustomer = (data: any) => {
    addCustomer(data);
    setCustomerFormOpen(false);
  };

  const handleEditCustomer = (data: any) => {
    if (!editingCustomer) return;
    updateCustomer({ id: editingCustomer.id, ...data });
    setEditingCustomer(null);
    setCustomerFormOpen(false);
  };

  const handleAddProject = (data: any) => {
    const projectData = {
      title: data.title,
      description: data.description || "",
      status: data.status,
      progress: data.progress,
      startDate: data.startDate,
      endDate: data.endDate,
      assignedTeam: data.assignedTeam || [],
      customerId: data.customerId || null,
      budget: data.budget,
      actualCost: data.actualCost,
      revenue: data.revenue,
      photos: data.photos || [],
    };
    addProject(projectData);
    setProjectFormOpen(false);
  };

  const handleEditProject = (data: any) => {
    if (!editingProject) return;
    const projectData = {
      id: editingProject.id,
      title: data.title,
      description: data.description || "",
      status: data.status,
      progress: data.progress,
      startDate: data.startDate,
      endDate: data.endDate,
      assignedTeam: data.assignedTeam || [],
      customerId: data.customerId || null,
      budget: data.budget,
      actualCost: data.actualCost,
      revenue: data.revenue,
      photos: data.photos || [],
    };
    updateProject(projectData);
    setEditingProject(null);
    setProjectFormOpen(false);
  };

  const validateProjectId = (projectId: string): boolean => {
    // Validate that projectId exists in projects array
    if (!projectId) return true; // Empty projectId is acceptable
    return projects.some(p => p.id === projectId);
  };

  // Clean up tasks with corrupted projectIds (e.g., team member IDs stored as projectIds)
  const getCleanedTasks = (tasksToClean: typeof tasks) => {
    return tasksToClean.map(task => {
      // If task has a projectId that doesn't match any project, clear it
      if (task.projectId && !projects.some(p => p.id === task.projectId)) {
        // Automatically clear the corrupted projectId
        if (task.projectId) {
          updateTask({ id: task.id, projectId: "" });
        }
        return { ...task, projectId: "" };
      }
      return task;
    });
  };

  const handleAddTask = (data: any) => {
    // Validate that projectId is a valid project
    if (data.project && !validateProjectId(data.project)) {
      handleTaskValidationError("Seçilen proje geçersiz. Lütfen geçerli bir proje seçin.");
      return;
    }

    const taskData = {
      title: data.title,
      description: "",
      status: data.status,
      priority: data.priority,
      projectId: data.project,
      assignedTo: data.assignee,
      dueDate: data.dueDate,
      estimatedCost: data.estimatedCost,
    };
    addTask(taskData);
    setTaskFormOpen(false);
  };

  const handleTaskValidationError = (message: string) => {
    toast({
      variant: "destructive",
      title: "Hata",
      description: message,
    });
  };

  const handleEditTask = (data: any) => {
    if (!editingTask) return;

    // Validate that projectId is a valid project
    if (data.project && !validateProjectId(data.project)) {
      handleTaskValidationError("Seçilen proje geçersiz. Lütfen geçerli bir proje seçin.");
      return;
    }

    const taskData = {
      id: editingTask.id,
      title: data.title,
      description: "",
      status: data.status,
      priority: data.priority,
      projectId: data.project,
      assignedTo: data.assignee,
      dueDate: data.dueDate,
      estimatedCost: data.estimatedCost,
    };
    updateTask(taskData);
    setEditingTask(null);
    setTaskFormOpen(false);
  };

  if (projectsLoading || tasksLoading || membersLoading || customersLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleLogoClick = () => {
    setActiveTab("dashboard");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <OnboardingModal open={showOnboarding} onComplete={() => setShowOnboarding(false)} />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Silmek istediğinize emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm?.type === "project" 
                ? `Bu projeye ait ${tasks.filter(t => t.projectId === deleteConfirm.id).length} görev de silinecek. Bu işlem geri alınamaz.`
                : "Bu işlem geri alınamaz."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              {t("common.delete")}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50 w-full">
        <div className="w-full px-4 py-3 sm:py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button onClick={handleLogoClick} className="flex items-center gap-2 sm:gap-3 min-w-0 hover:opacity-80 transition-opacity">
              <div className="bg-primary p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate">{t('app.title')}</h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">{t('app.dashboard')}</p>
              </div>
            </button>
            <div className="flex items-center gap-2 flex-shrink-0">
              <HeaderMenu />
            </div>
          </div>
        </div>
      </header>

      <div className="border-b border-border bg-card w-full">
        <div className="w-full px-4 py-3 sm:py-4 flex justify-center">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-0 w-full">
            <div className="flex items-center justify-center gap-2">
              {/* Desktop Tabs */}
              <div className="hidden md:block">
                <TabsList className="bg-transparent inline-flex flex-wrap gap-3 justify-center p-0">
                  <TabsTrigger value="dashboard" className="gap-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:font-semibold rounded-none px-2 sm:px-3 py-2 pb-2">
                    <LayoutDashboard className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('app.dashboard')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="projects" className="gap-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:font-semibold rounded-none px-2 sm:px-3 py-2 pb-2">
                    <FolderKanban className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('app.projects')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="tasks" className="gap-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:font-semibold rounded-none px-2 sm:px-3 py-2 pb-2">
                    <ListTodo className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('app.tasks')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="teams" className="gap-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:font-semibold rounded-none px-2 sm:px-3 py-2 pb-2">
                    <Users className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('app.team')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="finance" className="gap-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:font-semibold rounded-none px-2 sm:px-3 py-2 pb-2">
                    <DollarSign className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('app.economy')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="materials" className="gap-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:font-semibold rounded-none px-2 sm:px-3 py-2 pb-2">
                    <Package className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('app.materials')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="customers" className="gap-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:font-semibold rounded-none px-2 sm:px-3 py-2 pb-2">
                    <UserCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('app.customers')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="reports" className="gap-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:font-semibold rounded-none px-2 sm:px-3 py-2 pb-2">
                    <BarChart3 className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('app.reports')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="invoices" className="gap-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:font-semibold rounded-none px-2 sm:px-3 py-2 pb-2">
                    <Receipt className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('app.invoices')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="contracts" className="gap-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:font-semibold rounded-none px-2 sm:px-3 py-2 pb-2">
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('app.contracts')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="subscription" className="gap-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:font-semibold rounded-none px-2 sm:px-3 py-2 pb-2">
                    <Crown className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('app.subscription')}</span>
                  </TabsTrigger>
                  {isAdmin && (
                    <TabsTrigger value="admin" className="gap-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:font-semibold rounded-none px-2 sm:px-3 py-2 pb-2">
                      <Shield className="h-4 w-4" />
                      <span className="hidden sm:inline">{t('app.admin')}</span>
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>

            {/* Mobile Menu + Quick Access */}
            <div className="flex items-center justify-center gap-3 md:hidden w-full">
              {/* Mobile Tab Menu - Left */}
              <MobileTabMenu
                tabs={tabItems}
                currentValue={activeTab}
                onTabChange={setActiveTab}
              />
              
              {/* Quick Access Tabs - Right */}
              <div className="flex items-center gap-3">
                <Button
                  variant={activeTab === "dashboard" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("dashboard")}
                  className="gap-1.5"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="text-xs">{t('app.dashboard')}</span>
                </Button>
                <Button
                  variant={activeTab === "projects" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("projects")}
                  className="gap-1.5"
                >
                  <FolderKanban className="h-4 w-4" />
                  <span className="text-xs">{t('app.projects')}</span>
                </Button>
                <Button
                  variant={activeTab === "tasks" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("tasks")}
                  className="gap-1.5"
                >
                  <ListTodo className="h-4 w-4" />
                  <span className="text-xs">{t('app.tasks')}</span>
                </Button>
              </div>
            </div>
          </div>
        </Tabs>
      </div>

      <div className="w-full min-h-screen bg-gray-50">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6 px-3 sm:px-4 py-4 sm:py-8">
          <TabsContent value="dashboard" className="space-y-4 sm:space-y-6">
            {/* Compact Stats Header */}
            <div className="bg-card border border-border rounded-lg p-3 sm:p-4 flex justify-center">
              <div className="flex flex-wrap items-center gap-3 sm:gap-6 justify-center">
                <div className="flex items-center gap-2">
                  <FolderKanban className="h-4 w-4 text-primary" />
                  <span className="text-xs sm:text-sm text-muted-foreground">{t('stats.totalProjects')}:</span>
                  <span className="font-bold text-sm sm:text-base text-foreground">{projects.filter(p => p.status === 'active').length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ListTodo className="h-4 w-4 text-blue-500" />
                  <span className="text-xs sm:text-sm text-muted-foreground">{t('stats.activeTasks')}:</span>
                  <span className="font-bold text-sm sm:text-base text-foreground">{tasks.filter(t => t.status === 'in-progress').length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ListTodo className="h-4 w-4 text-green-500" />
                  <span className="text-xs sm:text-sm text-muted-foreground">{t('stats.completedTasks')}:</span>
                  <span className="font-bold text-sm sm:text-base text-foreground">{tasks.filter(t => t.status === 'completed').length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-orange-500" />
                  <span className="text-xs sm:text-sm text-muted-foreground">{t('stats.teamMembers')}:</span>
                  <span className="font-bold text-sm sm:text-base text-foreground">{teamMembers.length}</span>
                </div>
              </div>
            </div>

            {/* Recent Projects */}
            <div className="space-y-3 sm:space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">{t('app.projects')}</h2>
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {projects.filter(p => p.status === 'active' || p.status === 'planning').slice(0, 3).map(project => {
                  const teamNames = project.assignedTeam.map(id => teamMembers.find(m => m.id === id)?.name || id).join(', ');
                  return (
                    <ProjectCard
                      key={project.id}
                      title={project.title}
                      location={project.description}
                      startDate={project.startDate}
                      team={teamNames}
                      progress={project.progress}
                      status={project.status as any}
                      photos={project.photos}
                      budget={project.budget}
                      actualCost={project.actualCost}
                      revenue={project.revenue}
                      onClick={() => {
                        setEditingProject(project);
                        setProjectFormOpen(true);
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Recent Tasks */}
            <div className="space-y-3 sm:space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">{t('app.tasks')}</h2>
              <div className="space-y-2 sm:space-y-3">
                {tasks.slice(0, 3).map(task => {
                  const assigneeName = teamMembers.find(m => m.id === task.assignedTo)?.name || task.assignedTo || t('common.noData');
                  return (
                    <div 
                      key={task.id} 
                      className="relative group cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => {
                        setEditingTask(task);
                        setTaskFormOpen(true);
                      }}
                    >
                      <TaskItem
                        title={task.title}
                        project={projects.find(p => p.id === task.projectId)?.title || t('common.noData')}
                        assignee={assigneeName}
                        dueDate={task.dueDate}
                        status={task.status as any}
                        priority={task.priority as any}
                        onStatusChange={(status) => handleStatusChange(task.id, status)}
                      />
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingTask(task);
                            setTaskFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          className="h-8 w-8"
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="projects" className="space-y-4 sm:space-y-6">
            {!canAddProject && (
              <UpgradeAlert 
                type="projects" 
                current={projects.length} 
                limit={PLAN_LIMITS.free.maxProjects} 
              />
            )}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground">{t('app.projects')}</h2>
                <Select value={projectSort} onValueChange={setProjectSort}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="startDate">{t('sort.startDate') || 'Başlangıç Tarihi'}</SelectItem>
                    <SelectItem value="endDate">{t('sort.endDate') || 'Bitiş Tarihi'}</SelectItem>
                    <SelectItem value="status">{t('sort.status') || 'Durum'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={() => {
                  setEditingProject(null);
                  setProjectFormOpen(true);
                }} 
                className="gap-2 w-full sm:w-auto"
                disabled={!canAddProject}
              >
                <Plus className="h-4 w-4" />
                {t('project.add')}
              </Button>
            </div>
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {projects.length === 0 ? (
                <div className="col-span-full">
                  <EmptyState
                    icon={FolderKanban}
                    title={t('common.noData')}
                    description={t('project.empty') || 'Henüz proje oluşturmadınız. Yeni bir proje ekleyerek başlayın.'}
                    actionLabel={t('project.add')}
                    onAction={() => {
                      setEditingProject(null);
                      setProjectFormOpen(true);
                    }}
                  />
                </div>
            ) : (
              (() => {
                const sortedProjects = [...projects].sort((a, b) => {
                  if (projectSort === 'startDate') {
                    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
                  } else if (projectSort === 'endDate') {
                    return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
                  } else if (projectSort === 'status') {
                    const statusOrder = { 'planning': 0, 'active': 1, 'completed': 2 };
                    return (statusOrder[a.status as keyof typeof statusOrder] || 0) - (statusOrder[b.status as keyof typeof statusOrder] || 0);
                  }
                  return 0;
                });
                return sortedProjects.map((project) => {
                  const teamNames = project.assignedTeam.map(id => teamMembers.find(m => m.id === id)?.name || id).join(', ');
                  const projectContract = contracts.find(c => c.project_id === project.id) || null;
                  
                  // Check if contract-relevant fields changed (excluding photos)
                  const currentRelevantFields = JSON.stringify({
                    title: project.title,
                    description: project.description,
                    startDate: project.startDate,
                    endDate: project.endDate,
                    budget: project.budget,
                    customerId: project.customerId,
                    assignedTeam: [...project.assignedTeam].sort(),
                  });
                  const canRegenerate = !projectContract || projectContract.project_snapshot !== currentRelevantFields;
                  const disableReason = !canRegenerate && projectContract
                    ? t('contract.alreadyGenerated') || 'Sözleşme zaten oluşturuldu. Proje bilgilerini düzenlerseniz yeniden oluşturabilirsiniz.'
                    : undefined;

                  return (
                    <ProjectCard
                      key={project.id}
                      title={project.title}
                      location={project.description}
                      startDate={project.startDate}
                      team={teamNames}
                      progress={project.progress}
                      status={project.status as any}
                      photos={project.photos}
                      budget={project.budget}
                      actualCost={project.actualCost}
                      revenue={project.revenue}
                      onClick={() => {
                        setEditingProject(project);
                        setProjectFormOpen(true);
                      }}
                      footer={
                        <div className="flex gap-1 sm:gap-2 w-full" onClick={(e) => e.stopPropagation()}>
                          <div title={disableReason}>
                            <ContractGenerator
                              project={project}
                              customer={customers.find(c => c.id === project.customerId) || null}
                              teamMembers={teamMembers.filter(m => project.assignedTeam.includes(m.id))}
                              regenerationAllowed={canRegenerate}
                            />
                          </div>
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-8 w-8 sm:h-9 sm:w-9"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingProject(project);
                              setProjectFormOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="destructive"
                            className="h-8 w-8 sm:h-9 sm:w-9"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProject(project.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      }
                    />
                  );
                });
              })())}
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground">{t('app.tasks')}</h2>
                <Select value={taskSort} onValueChange={setTaskSort}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dueDate">{t('sort.dueDate') || 'Bitiş Tarihi'}</SelectItem>
                    <SelectItem value="priority">{t('sort.priority') || 'Öncelik'}</SelectItem>
                    <SelectItem value="status">{t('sort.status') || 'Durum'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={() => {
                  setEditingTask(null);
                  setTaskFormOpen(true);
                }} 
                className="gap-2 w-full sm:w-auto"
                disabled={
                  projects.length === 0 || 
                  (!hasPremiumAccess && projects.every(p => tasks.filter(t => t.projectId === p.id).length >= currentLimits.maxTasksPerProject))
                }
                title={
                  projects.length === 0 
                    ? 'Önce proje oluşturunuz' 
                    : (!hasPremiumAccess && projects.every(p => tasks.filter(t => t.projectId === p.id).length >= currentLimits.maxTasksPerProject) 
                      ? 'Tüm projelerin görev limiti dolu' 
                      : '')
                }
              >
                <Plus className="h-4 w-4" />
                {t('task.add')}
              </Button>
            </div>
            {projects.length > 0 && tasks.length > 0 && projects.some(p => tasks.filter(t => t.projectId === p.id).length >= currentLimits.maxTasksPerProject) && !hasPremiumAccess && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                <div className="font-medium mb-2">⚠️ Görev limitine ulaşan projeler:</div>
                <ul className="list-disc list-inside space-y-1">
                  {projects.filter(p => tasks.filter(t => t.projectId === p.id).length >= currentLimits.maxTasksPerProject).map(p => (
                    <li key={p.id}>{p.title} ({tasks.filter(t => t.projectId === p.id).length}/{currentLimits.maxTasksPerProject})</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {tasks.length === 0 ? (
                <div className="col-span-full">
                  <EmptyState
                    icon={ListTodo}
                    title={t('common.noData')}
                    description={t('task.empty') || 'Henüz görev oluşturmadınız. Yeni bir görev ekleyerek başlayın.'}
                    actionLabel={t('task.add')}
                    onAction={() => {
                      setEditingTask(null);
                      setTaskFormOpen(true);
                    }}
                  />
                </div>
              ) : (
              (() => {
                const cleanedTasks = getCleanedTasks(tasks);
                const sortedTasks = [...cleanedTasks].sort((a, b) => {
                  if (taskSort === 'dueDate') {
                    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                  } else if (taskSort === 'priority') {
                    const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
                    return (priorityOrder[a.priority as keyof typeof priorityOrder] || 0) - (priorityOrder[b.priority as keyof typeof priorityOrder] || 0);
                  } else if (taskSort === 'status') {
                    const statusOrder = { 'pending': 0, 'in-progress': 1, 'completed': 2 };
                    return (statusOrder[a.status as keyof typeof statusOrder] || 0) - (statusOrder[b.status as keyof typeof statusOrder] || 0);
                  }
                  return 0;
                });
                return sortedTasks.map(task => {
                  const assigneeName = teamMembers.find(m => m.id === task.assignedTo)?.name || task.assignedTo || t('common.noData');
                  const project = projects.find(p => p.id === task.projectId);
                  return (
                    <div
                      key={task.id}
                      onClick={() => {
                        setEditingTask(task);
                        setTaskFormOpen(true);
                      }}
                      className="p-3 sm:p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer hover:shadow-lg hover:border-primary/50"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm sm:text-base break-words mb-1">{task.title}</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">{project?.title || t('common.noData')}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-1 sm:gap-2 mb-3">
                        <Badge variant={
                          task.status === 'completed' ? 'default' :
                          task.status === 'in-progress' ? 'secondary' :
                          'outline'
                        } className="text-xs">
                          {t(`task.status.${task.status}`)}
                        </Badge>
                        <Badge variant={
                          task.priority === 'high' ? 'destructive' :
                          task.priority === 'medium' ? 'secondary' :
                          'outline'
                        } className="text-xs">
                          {t(`task.priority.${task.priority}`)}
                        </Badge>
                      </div>

                      <div className="space-y-2 text-xs sm:text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className="truncate">👤 {assigneeName}</span>
                        </div>
                        {task.dueDate && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <span>📅 {task.dueDate}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-1 sm:gap-2 pt-3 border-t border-border mt-3" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8"
                          onClick={() => {
                            setEditingTask(task);
                            setTaskFormOpen(true);
                          }}
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          <span className="text-xs">{t('common.edit')}</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive h-8 px-2"
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                });
              })())}
            </div>
          </TabsContent>

          <TabsContent value="teams" className="space-y-4 sm:space-y-6">
            {!canAddTeamMember && (
              <UpgradeAlert 
                type="teamMembers" 
                current={teamMembers.length} 
                limit={PLAN_LIMITS.free.maxTeamMembers} 
              />
            )}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">{t('app.team')}</h2>
              <Button 
                onClick={() => {
                  setEditingTeamMember(null);
                  setTeamFormOpen(true);
                }} 
                className="gap-2 w-full sm:w-auto"
                disabled={!canAddTeamMember}
              >
                <Plus className="h-4 w-4" />
                {t('team.add')}
              </Button>
            </div>
            {teamMembers.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                {t('team.noTeamMembers') || "Henüz ekip üyesi eklenmemiş"}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left side - Dropdown selector */}
                <div className="lg:col-span-1 flex flex-col justify-center">
                  <div className="p-4 border border-border rounded-lg bg-card">
                    <label className="block text-sm font-medium mb-2">{t('finance.allTeamMembers') || 'Tüm Ustalar'}</label>
                    <Select value={expandedTeamMemberId || ""} onValueChange={(value) => setExpandedTeamMemberId(value)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('team.selectMember') || "Usta seçiniz"} />
                      </SelectTrigger>
                      <SelectContent>
                        {teamMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            <div className="flex flex-col">
                              <span>{member.name}</span>
                              <span className="text-xs text-muted-foreground">{member.specialty}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Right side - Team member details */}
                <div className="lg:col-span-2">
                  {expandedTeamMemberId && teamMembers.find(m => m.id === expandedTeamMemberId) ? (
                    (() => {
                      const member = teamMembers.find(m => m.id === expandedTeamMemberId)!;
                      return (
                        <div className="p-4 rounded-lg border-2 border-primary bg-card space-y-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-lg">{member.name}</h3>
                              <p className="text-sm text-muted-foreground">{member.specialty}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTeamMember(member);
                                  setTeamFormOpen(true);
                                }}
                              >
                                <Pencil className="h-3 w-3 mr-1" />
                                {t('common.edit') || "Düzenle"}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTeamMember(member.id);
                                }}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                {t('common.delete') || "Sil"}
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
                            <div className="p-3 rounded-lg bg-muted/50">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                <Phone className="h-3 w-3" />
                                {t('team.phone') || "Telefon"}
                              </div>
                              <p className="text-sm font-medium break-all">{member.phone}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                <Briefcase className="h-3 w-3" />
                                {t('team.specialty') || "Uzmanlık"}
                              </div>
                              <p className="text-sm font-medium">{member.specialty}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                <Banknote className="h-3 w-3" />
                                {t('team.dailyWage') || "Günlük Ücret"}
                              </div>
                              <p className="text-sm font-medium">{member.dailyWage}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                <DollarSign className="h-3 w-3" />
                                {t('team.totalReceivable') || "Toplam Alacak"}
                              </div>
                              <p className="text-sm font-medium">{member.totalReceivable}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                              <p className="text-xs text-muted-foreground mb-1">{t('team.totalPaid') || "Ödenen Tutar"}</p>
                              <p className="text-sm font-semibold text-green-600">{member.totalPaid}</p>
                            </div>
                            <div className={`p-3 rounded-lg ${(member.totalReceivable || 0) - (member.totalPaid || 0) >= 0 ? 'bg-green-50 dark:bg-green-950/20' : 'bg-red-50 dark:bg-red-950/20'}`}>
                              <p className="text-xs text-muted-foreground mb-1">{t('team.balance') || "Kalan"}</p>
                              <p className={`text-sm font-semibold ${(member.totalReceivable || 0) - (member.totalPaid || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {(member.totalReceivable || 0) - (member.totalPaid || 0)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="p-8 rounded-lg border-2 border-dashed border-border flex items-center justify-center min-h-[300px]">
                      <div className="text-center">
                        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                        <p className="text-muted-foreground">{t('team.selectMember') || 'Ekip üyesi seçiniz'}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <TimesheetSection teamMembers={teamMembers} />
          </TabsContent>

          <TabsContent value="finance" className="space-y-4 sm:space-y-6">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">{t('app.economy')}</h2>
            
            {/* Financial Summary Cards - Renkli ve İkonlu */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Toplam Bütçe */}
              <div className="p-4 sm:p-6 rounded-lg border border-border bg-card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950/30">
                    <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <p className="text-sm font-medium text-muted-foreground mb-1">{t('stats.totalBudget')}</p>
                <p className="text-2xl sm:text-3xl font-bold text-foreground">{formatCurrency(projects.reduce((sum, p) => sum + (p.budget || 0), 0))}</p>
              </div>

              {/* Toplam Gelir - Yeşil */}
              <div className="p-4 sm:p-6 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/40">
                    <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <p className="text-sm font-medium text-muted-foreground mb-1">{t('stats.totalRevenue')}</p>
                <p className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">{formatCurrency(projects.reduce((sum, p) => sum + (p.revenue || 0), 0))}</p>
              </div>

              {/* Toplam Maliyet - Turuncu/Kırmızı */}
              <div className="p-4 sm:p-6 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/40">
                    <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                </div>
                <p className="text-sm font-medium text-muted-foreground mb-1">{t('stats.totalCost')}</p>
                <p className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400">{formatCurrency(projects.reduce((sum, p) => sum + (p.actualCost || 0), 0))}</p>
              </div>

              {/* Net Kar - Dinamik Renk (Pozitif = Yeşil, Negatif = Kırmızı) */}
              {(() => {
                const netProfit = projects.reduce((sum, p) => sum + (p.revenue || 0), 0) - projects.reduce((sum, p) => sum + (p.actualCost || 0), 0);
                const isProfitable = netProfit >= 0;
                return (
                  <div className={`p-4 sm:p-6 rounded-lg border ${isProfitable ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20' : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20'} hover:shadow-md transition-shadow`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-2 rounded-lg ${isProfitable ? 'bg-green-100 dark:bg-green-900/40' : 'bg-red-100 dark:bg-red-900/40'}`}>
                        <BarChart3 className={`h-5 w-5 ${isProfitable ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
                      </div>
                    </div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">{t('stats.netProfit')}</p>
                    <p className={`text-2xl sm:text-3xl font-bold ${isProfitable ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{formatCurrency(netProfit)}</p>
                  </div>
                );
              })()}
            </div>

            {/* Project Financial Details */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h3 className="text-xl font-semibold text-foreground">{t('finance.projectFinancials')}</h3>
                {projects.length > 0 && (
                  <div className="w-full sm:w-64">
                    <Select value={selectedFinanceProjectId || (projects.length > 0 ? projects[0]?.id : "")} onValueChange={setSelectedFinanceProjectId}>
                      <SelectTrigger className="w-full rounded-full border-2 border-orange-200 hover:border-orange-400 hover:bg-orange-50/50 dark:border-orange-800 dark:hover:border-orange-600 dark:hover:bg-orange-950/20 transition-all bg-card text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg">
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
                <div className="grid gap-4">
                    {(() => {
                      const currentProjectId = selectedFinanceProjectId || (projects.length > 0 ? projects[0]?.id : null);
                      const projectToShow = projects.find(p => p.id === currentProjectId);
                      
                      if (!projectToShow) {
                        return <p className="text-muted-foreground text-center py-4">{t('common.noData')}</p>;
                      }

                      const profit = (projectToShow.revenue || 0) - (projectToShow.actualCost || 0);
                      const isProfitable = profit >= 0;
                      
                      return (
                        <div className="p-4 bg-card border border-border rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-foreground">{projectToShow.title}</h4>
                                <span className={`text-sm font-medium ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(profit)}
                                </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 mb-3">
                                <div>
                                <p className="text-xs text-muted-foreground">{t('project.budget')}</p>
                                    <p className="font-semibold text-sm sm:text-base">{formatCurrency(projectToShow.budget || 0)}</p>
                                </div>
                                <div>
                                <p className="text-xs text-muted-foreground">{t('project.revenue')}</p>
                                    <p className="font-semibold text-green-600 text-sm sm:text-base">{formatCurrency(projectToShow.revenue || 0)}</p>
                                </div>
                                <div>
                                <p className="text-xs text-muted-foreground">{t('project.actualCost')}</p>
                                  <p className="font-semibold text-orange-600 text-right text-sm sm:text-base">{formatCurrency(projectToShow.actualCost || 0)}</p>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">{t('finance.budgetUsage')}</span>
                                    <span className="font-medium">
                                        {projectToShow.budget > 0 ? Math.round(((projectToShow.actualCost || 0) / projectToShow.budget) * 100) : 0}%
                                    </span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-2">
                                    <div 
                                        className="bg-primary h-2 rounded-full transition-all"
                                        style={{ 
                                            width: `${Math.min(projectToShow.budget > 0 ? ((projectToShow.actualCost || 0) / projectToShow.budget) * 100 : 0, 100)}%` 
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                      );
                    })()}
                </div>
            </div>

            {/* Task Costs */}
            <div className="space-y-4">
                <h3 className="text-xl font-semibold text-foreground">{t('finance.taskCosts')}</h3> 
                <div className="bg-card border border-border rounded-lg p-4">
                    <div className="space-y-3">
                        {(() => {
                          const currentProjectId = selectedFinanceProjectId || (projects.length > 0 ? projects[0]?.id : null);
                          const projectTasks = tasks.filter(task => task.projectId === currentProjectId);
                          
                          if (projectTasks.length === 0) {
                            return <p className="text-muted-foreground text-center py-4">{t('common.noData')}</p>;
                          }
                          
                          return projectTasks.map(task => (
                            <div key={task.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                                <div className="flex-1">
                                    <p className="font-medium text-foreground">{task.title}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {projects.find(p => p.id === task.projectId)?.title || t('common.noData')}
                                    </p>
                                </div>
                                <span className="font-semibold text-foreground">
                                    {formatCurrency(task.estimatedCost || 0)}
                                </span>
                            </div>
                          ));
                        })()}
                        {(() => {
                          const currentProjectId = selectedFinanceProjectId || (projects.length > 0 ? projects[0]?.id : null);
                          const projectTasks = tasks.filter(task => task.projectId === currentProjectId);
                          const totalCost = projectTasks.reduce((sum, t) => sum + (t.estimatedCost || 0), 0);
                          
                          if (projectTasks.length > 0) {
                            return (
                              <div className="flex items-center justify-between pt-2 mt-2 border-t-2 border-border">
                                <span className="font-bold text-foreground">{t('finance.totalEstimatedCost')}</span>
                                <span className="font-bold text-lg text-foreground">
                                  {formatCurrency(totalCost)}
                                </span>
                              </div>
                            );
                          }
                        })()}
                    </div>
                </div>
            </div>

            {/* Team Costs */}
            {/* Not: Bu blok, 'i18n' objesinin Index bileşeni içinde tanımlı olduğunu varsayar. */}
            <div className="space-y-4">
                <h3 className="text-xl font-semibold text-foreground">{t('finance.teamCosts')}</h3>
                <div className="bg-card border border-border rounded-lg p-4 space-y-4">
                    <div>
                        <label className="text-sm font-medium">{t('team.selectMember')}</label>
                        <Select value={selectedFinanceTeamMemberId || "none"} onValueChange={(value) => setSelectedFinanceTeamMemberId(value === "none" ? null : value)}>
                            <SelectTrigger className="w-full mt-2">
                                <SelectValue placeholder={t('team.selectMember')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">{t('team.selectMember')}</SelectItem>
                                {teamMembers.map((member) => (
                                    <SelectItem key={member.id} value={member.id}>
                                        {member.name} - {member.specialty}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedFinanceTeamMemberId ? (
                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
                            {teamMembers.filter(m => m.id === selectedFinanceTeamMemberId).map(member => {
                                const formatWage = (wage: number, unit: string) => {
                                  const { symbol, symbolAtEnd, locale } = getCurrencyFormat(i18n.language);
                                  const formattedAmount = wage.toLocaleString(locale, {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0,
                                  });
                                  const formattedWage = symbolAtEnd 
                                    ? `${formattedAmount} ${symbol}` 
                                    : `${symbol}${formattedAmount}`;
                                  return `${formattedWage}/${unit}`;
                                };

                                return (
                                    <div key={member.id} className="space-y-3">
                                        <div>
                                            <h4 className="font-semibold text-foreground mb-1">{member.name}</h4>
                                            <p className="text-sm text-muted-foreground">{member.specialty}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-3 bg-card border border-border rounded">
                                                <p className="text-xs text-muted-foreground mb-1">{t('finance.day')}</p>
                                                <p className="font-bold text-lg text-foreground">{formatWage(member.dailyWage || 0, t('finance.day'))}</p>
                                            </div>
                                            <div className="p-3 bg-card border border-border rounded">
                                                <p className="text-xs text-muted-foreground mb-1">{t('finance.month')}</p>
                                                <p className="font-bold text-lg text-foreground">{formatWage((member.dailyWage || 0) * 26, t('finance.month'))}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-6 text-muted-foreground">
                            {t('team.selectMember')}
                        </div>
                    )}

                    {/* Toplam Günlük Maliyet */}
                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <span className="font-bold text-foreground">{t('finance.totalDailyTeamCost')}</span>
                      <span className="font-bold text-lg text-foreground">
                        {(() => {
                          const totalWage = teamMembers.reduce((sum, m) => sum + (m.dailyWage || 0), 0);
                          const { symbol, locale, symbolAtEnd } = getCurrencyFormat(i18n.language);
                          const formattedAmount = totalWage.toLocaleString(locale, {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          });
                          const formattedTotal = symbolAtEnd 
                            ? `${formattedAmount} ${symbol}` 
                            : `${symbol}${formattedAmount}`;
                          return `${formattedTotal}/${t('finance.day')}`;
                        })()}
                      </span>
                    </div>
                </div>
            </div>
          </TabsContent>

          <TabsContent value="materials" className="space-y-4 sm:space-y-6">
            <MaterialsSection />
          </TabsContent>

          <TabsContent value="customers" className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">{t('app.customers')}</h2>
              <Button 
                onClick={() => {
                  setEditingCustomer(null);
                  setCustomerFormOpen(true);
                }} 
                className="gap-2 w-full sm:w-auto"
                disabled={!canAddCustomer && !hasPremiumAccess}
              >
                <Plus className="h-4 w-4" />
                {t('customer.add')}
              </Button>
            </div>
            {!canAddCustomer && !hasPremiumAccess && (
              <UpgradeAlert 
                type="customers" 
                current={customers.length} 
                limit={currentLimits.maxCustomers} 
              />
            )}
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {customers.map(customer => {
                const projectCount = projects.filter(p => p.customerId === customer.id).length;
                return (
                  <CustomerCard
                    key={customer.id}
                    id={customer.id}
                    name={customer.name}
                    phone={customer.phone}
                    address={customer.address}
                    notes={customer.notes}
                    totalReceivable={customer.totalReceivable}
                    totalPaid={customer.totalPaid}
                    projectCount={projectCount}
                    onEdit={() => {
                      setEditingCustomer(customer);
                      setCustomerFormOpen(true);
                    }}
                    onDelete={() => handleDeleteCustomer(customer.id)}
                  />
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4 sm:space-y-6">
            <ReportsSection />
          </TabsContent>

          <TabsContent value="invoices" className="space-y-4 sm:space-y-6">
            {projects.length > 0 ? (
              <InvoicesSection projects={projects} />
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Hakedis yönetimi için önce bir proje oluşturun.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="contracts" className="space-y-4 sm:space-y-6">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">{t('app.contracts')}</h2>
            <ContractsSection />
          </TabsContent>

          <TabsContent value="subscription" className="space-y-4 sm:space-y-6">
            <div className="flex justify-center">
              <div className="w-full">
                <SubscriptionCard />
              </div>
            </div>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="admin" className="space-y-4 sm:space-y-6">
              <AdminPanel />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Modals */}
      <TeamMemberForm
        open={teamFormOpen}
        onOpenChange={(open) => {
          setTeamFormOpen(open);
        }}
        onSubmit={editingTeamMember ? handleEditTeamMember : handleAddTeamMember}
        title={editingTeamMember ? t('team.edit') : t('team.add')}
        defaultValues={editingTeamMember ? {
          name: editingTeamMember.name,
          phone: editingTeamMember.phone,
          specialty: editingTeamMember.specialty,
          dailyWage: editingTeamMember.dailyWage,
          totalReceivable: editingTeamMember.totalReceivable || 0,
          totalPaid: editingTeamMember.totalPaid || 0,
        } : undefined}
      />

      <ProjectForm
        open={projectFormOpen}
        resetKey={editingProject ? editingProject.id : "new"}
        onOpenChange={(open) => {
          setProjectFormOpen(open);
          if (!open) setEditingProject(null);
        }}
        onSubmit={editingProject ? handleEditProject : handleAddProject}
        title={editingProject ? t('project.edit') : t('project.add')}
        teamMembers={teamMembers}
        customers={customers}
        maxPhotos={currentLimits.maxPhotosPerProject}
        onSavePhotos={
          editingProject
            ? (urls) => {
                setEditingProject((prev: any) => (prev ? { ...prev, photos: urls } : prev));
                updateProject({ id: editingProject.id, photos: urls });
              }
            : undefined
        }
        defaultValues={editingProject ? {
          title: editingProject.title,
          description: editingProject.description,
          startDate: editingProject.startDate,
          endDate: editingProject.endDate,
          assignedTeam: editingProject.assignedTeam,
          customerId: editingProject.customerId || "",
          progress: editingProject.progress,
          status: editingProject.status,
          budget: editingProject.budget,
          actualCost: editingProject.actualCost,
          revenue: editingProject.revenue,
          photos: editingProject.photos || [],
        } : undefined}
      />

      <CustomerForm
        open={customerFormOpen}
        onOpenChange={(open) => {
          setCustomerFormOpen(open);
          if (!open) setEditingCustomer(null);
        }}
        onSubmit={editingCustomer ? handleEditCustomer : handleAddCustomer}
        title={editingCustomer ? t('customer.edit') : t('customer.add')}
        defaultValues={editingCustomer ? {
          name: editingCustomer.name,
          phone: editingCustomer.phone,
          address: editingCustomer.address,
          notes: editingCustomer.notes,
          totalReceivable: editingCustomer.totalReceivable || 0,
          totalPaid: editingCustomer.totalPaid || 0,
        } : undefined}
      />

      <TaskForm
        open={taskFormOpen}
        onOpenChange={(open) => {
          setTaskFormOpen(open);
          if (!open) setEditingTask(null);
        }}
        onSubmit={editingTask ? handleEditTask : handleAddTask}
        title={editingTask ? t('task.edit') : t('task.add')}
        projects={projects}
        teamMembers={teamMembers}
        tasksByProject={Object.fromEntries(projects.map(p => [p.id, getCleanedTasks(tasks).filter(t => t.projectId === p.id).length]))}
        maxTasksPerProject={currentLimits.maxTasksPerProject}
        hasPremiumAccess={hasPremiumAccess}
        onValidationError={handleTaskValidationError}
        defaultValues={editingTask ? {
          title: editingTask.title,
          project: editingTask.projectId,
          assignee: editingTask.assignedTo,
          dueDate: editingTask.dueDate,
          status: editingTask.status,
          priority: editingTask.priority,
          estimatedCost: editingTask.estimatedCost,
        } : undefined}
      />
    </div>
    </div>
  );
};

export default Index;
