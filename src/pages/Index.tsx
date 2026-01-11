import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/StatsCard";
import { ProjectCard } from "@/components/ProjectCard";
import { TaskItem } from "@/components/TaskItem";
import { TeamMemberCard } from "@/components/TeamMemberCard";
import { TeamMemberForm } from "@/components/TeamMemberForm";
import { ProjectForm } from "@/components/ProjectForm";
import { TaskForm } from "@/components/TaskForm";
import { MaterialsSection } from "@/components/MaterialsSection";
import { CustomerCard } from "@/components/CustomerCard";
import { CustomerForm } from "@/components/CustomerForm";
import { UpgradeAlert } from "@/components/UpgradeAlert";
import { ReportsSection } from "@/components/ReportsSection";
import { AdminPanel } from "@/components/AdminPanel";
import { InvoicesSection } from "@/components/InvoicesSection";
import { TimesheetSection } from "@/components/TimesheetSection";
import { LayoutDashboard, FolderKanban, ListTodo, Users, Plus, Building2, Pencil, Trash2, DollarSign, Package, UserCircle, Crown, BarChart3, Shield, FileText, Receipt } from "lucide-react";
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

const Index = () => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showOnboarding, setShowOnboarding] = useState(false);

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
  const { isPremium } = useSubscription();
  const { isAdmin } = useAdmin();

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
  const hasPremiumAccess = isPremium || isAdmin;
  const currentLimits = hasPremiumAccess ? PLAN_LIMITS.premium : PLAN_LIMITS.free;
  const canAddProject = projects.length < currentLimits.maxProjects;
  const canAddTeamMember = teamMembers.length < currentLimits.maxTeamMembers;
  
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const [teamFormOpen, setTeamFormOpen] = useState(false);
  const [customerFormOpen, setCustomerFormOpen] = useState(false);
  
  const [editingTask, setEditingTask] = useState<any>(null);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [editingTeamMember, setEditingTeamMember] = useState<any>(null);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);

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
    deleteTeamMember(id);
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

  const handleDeleteCustomer = (id: string) => {
    deleteCustomer(id);
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

  const handleDeleteProject = (id: string) => {
    deleteProject(id);
  };

  const handleAddTask = (data: any) => {
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

  const handleEditTask = (data: any) => {
    if (!editingTask) return;
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

  const handleDeleteTask = (id: string) => {
    deleteTask(id);
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
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 sm:py-4">
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

      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-3 sm:py-4 flex justify-center">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-0 w-full">
            <div className="flex items-center justify-center gap-2">
              {/* Desktop Tabs */}
              <div className="hidden md:block">
                <TabsList className="bg-transparent inline-flex flex-wrap gap-3 justify-center p-0">
                  <TabsTrigger value="dashboard" className="gap-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2">
                    <LayoutDashboard className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('app.dashboard')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="projects" className="gap-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2">
                    <FolderKanban className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('app.projects')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="tasks" className="gap-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2">
                    <ListTodo className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('app.tasks')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="teams" className="gap-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2">
                    <Users className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('app.team')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="finance" className="gap-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2">
                    <DollarSign className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('app.economy')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="materials" className="gap-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2">
                    <Package className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('app.materials')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="customers" className="gap-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2">
                    <UserCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('app.customers')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="reports" className="gap-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2">
                    <BarChart3 className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('app.reports')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="invoices" className="gap-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2">
                    <Receipt className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('app.invoices')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="contracts" className="gap-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2">
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('app.contracts')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="subscription" className="gap-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2">
                    <Crown className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('app.subscription')}</span>
                  </TabsTrigger>
                  {isAdmin && (
                    <TabsTrigger value="admin" className="gap-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2">
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

      <div className="container mx-auto px-4 py-4 sm:py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsContent value="dashboard" className="space-y-4 sm:space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatsCard
                title={t('stats.totalProjects')}
                value={projects.filter(p => p.status === 'active').length}
                icon={FolderKanban}
                variant="default"
              />
              <StatsCard
                title={t('stats.activeTasks')}
                value={tasks.filter(t => t.status === 'in-progress').length}
                icon={ListTodo}
                variant="info"
              />
              <StatsCard
                title={t('stats.completedTasks')}
                value={tasks.filter(t => t.status === 'completed').length}
                icon={ListTodo}
                variant="success"
              />
              <StatsCard
                title={t('stats.teamMembers')}
                value={teamMembers.length}
                icon={Users}
                variant="warning"
              />
            </div>

            {/* Recent Projects */}
            <div className="space-y-3 sm:space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">{t('app.projects')}</h2>
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {projects.filter(p => p.status === 'active').slice(0, 3).map(project => {
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
                    <div key={task.id} className="relative group">
                      <TaskItem
                        title={task.title}
                        project={projects.find(p => p.id === task.projectId)?.title || t('common.noData')}
                        assignee={assigneeName}
                        dueDate={task.dueDate}
                        status={task.status as any}
                        priority={task.priority as any}
                        onStatusChange={(status) => handleStatusChange(task.id, status)}
                      />
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">{t('app.projects')}</h2>
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
              {projects.map(project => {
                const teamNames = project.assignedTeam.map(id => teamMembers.find(m => m.id === id)?.name || id).join(', ');
                return (
                  <div key={project.id} className="relative group">
                    <ProjectCard
                      title={project.title}
                      location={project.description}
                      startDate={project.startDate}
                      team={teamNames}
                      progress={project.progress}
                      status={project.status as any}
                      photos={project.photos}
                      onClick={() => {
                        setEditingProject(project);
                        setProjectFormOpen(true);
                      }}
                    />
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div onClick={(e) => e.stopPropagation()}>
                        <ContractGenerator
                          project={project}
                          customer={customers.find(c => c.id === project.customerId) || null}
                          teamMembers={teamMembers.filter(m => project.assignedTeam.includes(m.id))}
                        />
                      </div>
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8"
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
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(project.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">{t('app.tasks')}</h2>
              <Button onClick={() => {
                setEditingTask(null);
                setTaskFormOpen(true);
              }} className="gap-2 w-full sm:w-auto">
                <Plus className="h-4 w-4" />
                {t('task.add')}
              </Button>
            </div>
            <div className="space-y-2 sm:space-y-3">
              {tasks.map(task => {
                const assigneeName = teamMembers.find(m => m.id === task.assignedTo)?.name || task.assignedTo || t('common.noData');
                return (
                  <div key={task.id} className="relative group">
                    <TaskItem 
                      title={task.title}
                      project={projects.find(p => p.id === task.projectId)?.title || t('common.noData')}
                      assignee={assigneeName}
                      dueDate={task.dueDate}
                      status={task.status as any}
                      priority={task.priority as any}
                      onStatusChange={(newStatus) => handleStatusChange(task.id, newStatus)}
                    />
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {teamMembers.map(member => (
                <TeamMemberCard
                  key={member.id}
                  id={member.id}
                  name={member.name}
                  phone={member.phone}
                  specialty={member.specialty}
                  dailyWage={member.dailyWage}
                  totalReceivable={member.totalReceivable}
                  totalPaid={member.totalPaid}
                  onEdit={() => {
                    setEditingTeamMember(member);
                    setTeamFormOpen(true);
                  }}
                  onDelete={() => handleDeleteTeamMember(member.id)}
                />
              ))}
            </div>

            <TimesheetSection teamMembers={teamMembers} />
          </TabsContent>

          <TabsContent value="finance" className="space-y-4 sm:space-y-6">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">{t('app.economy')}</h2>
            
            {/* Financial Summary Cards */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
                title={t('stats.totalBudget')}
                // GÜNCELLENMİŞ
                value={formatCurrency(
                    projects.reduce((sum, p) => sum + (p.budget || 0), 0)
                )}
                icon={DollarSign}
                variant="default"
            />
            <StatsCard
                title={t('stats.totalRevenue')}
                // GÜNCELLENMİŞ
                value={formatCurrency(
                    projects.reduce((sum, p) => sum + (p.revenue || 0), 0)
                )}
                icon={DollarSign}
                variant="success"
            />
            <StatsCard
                title={t('stats.totalCost')}
                // GÜNCELLENMİŞ
                value={formatCurrency(
                    projects.reduce((sum, p) => sum + (p.actualCost || 0), 0)
                )}
                icon={DollarSign}
                variant="warning"
            />
            <StatsCard
                title={t('stats.netProfit')}
                // GÜNCELLENMİŞ
                value={formatCurrency(
                    projects.reduce((sum, p) => sum + (p.revenue || 0), 0) - projects.reduce((sum, p) => sum + (p.actualCost || 0), 0)
                )}
                icon={DollarSign}
                variant="info"
            />
        </div>

            {/* Project Financial Details */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-foreground">{t('finance.projectFinancials')}</h3>
                <div className="grid gap-4">
                    {projects.map(project => {
                        const profit = (project.revenue || 0) - (project.actualCost || 0);
                        const isProfitable = profit >= 0;
                        
                        return (
                            <div key={project.id} className="p-4 bg-card border border-border rounded-lg">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-semibold text-foreground">{project.title}</h4>
                                    <span className={`text-sm font-medium ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                                        {/* Kâr/Zarar: + veya - işaretini ve formatlamayı formatCurrency halledecek */}
                                        {formatCurrency(profit)}
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-4 mb-3">
                                    <div>
                                    <p className="text-xs text-muted-foreground">{t('project.budget')}</p>
                                        {/* Bütçe Değeri */}
                                        <p className="font-semibold">{formatCurrency(project.budget || 0)}</p>
                                    </div>
                                    <div>
                                    <p className="text-xs text-muted-foreground">{t('project.revenue')}</p>
                                        {/* Gelir Değeri */}
                                        <p className="font-semibold text-green-600">{formatCurrency(project.revenue || 0)}</p>
                                    </div>
                                    <div>
                                    <p className="text-xs text-muted-foreground">{t('project.actualCost')}</p>
                                      {/* Maliyet Değeri */}
                                      <p className="font-semibold text-orange-600 text-right">{formatCurrency(project.actualCost || 0)}</p>
                                    </div>
                                </div>
                                {/* ... Bütçe Kullanımı çubuğu ve yüzdesi (burada değişiklik yok) ... */}
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-muted-foreground">{t('finance.budgetUsage')}</span>
                                        <span className="font-medium">
                                            {project.budget > 0 ? Math.round(((project.actualCost || 0) / project.budget) * 100) : 0}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-2">
                                        <div 
                                            className="bg-primary h-2 rounded-full transition-all"
                                            style={{ 
                                                width: `${Math.min(project.budget > 0 ? ((project.actualCost || 0) / project.budget) * 100 : 0, 100)}%` 
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Task Costs */}
            <div className="space-y-4">
                {/* Başlık yerelleştirilmemiş görünüyor, t() fonksiyonu ile yerelleştirmeniz önerilir */}
                <h3 className="text-xl font-semibold text-foreground">{t('finance.taskCosts')}</h3> 
                <div className="bg-card border border-border rounded-lg p-4">
                    <div className="space-y-3">
                        {tasks.map(task => (
                            <div key={task.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                                <div className="flex-1">
                                    <p className="font-medium text-foreground">{task.title}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {/* Proje Başlığı (Bu kısım finansal formatlama gerektirmiyor) */}
                            {projects.find(p => p.id === task.projectId)?.title || t('common.noData')}
                                    </p>
                                </div>
                                {/* 1. Her Görev Maliyeti (task.estimatedCost) */}
                                <span className="font-semibold text-foreground">
                                    {/* Orijinal: {(task.estimatedCost || 0).toLocaleString('tr-TR')} ₺ */}
                                    {formatCurrency(task.estimatedCost || 0)}
                                </span>
                            </div>
                        ))}
                        <div className="flex items-center justify-between pt-2 mt-2 border-t-2 border-border">
                      <span className="font-bold text-foreground">{t('finance.totalEstimatedCost')}</span>
                            {/* 2. Toplam Tahmini Maliyet */}
                            <span className="font-bold text-lg text-foreground">
                                {/* Orijinal: {tasks.reduce((sum, t) => sum + (t.estimatedCost || 0), 0).toLocaleString('tr-TR')} ₺ */}
                                {formatCurrency(
                                    tasks.reduce((sum, t) => sum + (t.estimatedCost || 0), 0)
                                )}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Team Costs */}
            {/* Not: Bu blok, 'i18n' objesinin Index bileşeni içinde tanımlı olduğunu varsayar. */}
            <div className="space-y-4">
                <h3 className="text-xl font-semibold text-foreground">{t('finance.teamCosts')}</h3>
                <div className="bg-card border border-border rounded-lg p-4">
                    <div className="space-y-3">
                        {teamMembers.map(member => {
                            const currentLanguage = i18n.language;
                            let locale = 'tr-TR';
                            let currencySymbol = '₺';
                            let symbolAtEnd = false;

                            if (currentLanguage.startsWith('sv')) {
                                locale = 'sv-SE';
                                currencySymbol = 'kr';
                                symbolAtEnd = true;
                            } else if (currentLanguage.startsWith('en')) {
                                locale = 'en-US';
                                currencySymbol = '$';
                                symbolAtEnd = false;
                            }

                            // Formatlama Fonksiyonu (satır içi tekrar)
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
                                <div key={member.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                                    <div className="flex-1">
                                        <p className="font-medium text-foreground">{member.name}</p>
                                        <p className="text-xs text-muted-foreground">{member.specialty}</p>
                                    </div>
                                    <div className="text-right">
                                        {/* Günlük Ücret */}
                                        <p className="font-semibold text-foreground">
                                            {formatWage(member.dailyWage || 0, t('finance.day'))}
                                        </p>
                                        {/* Aylık Tahmini Ücret */}
                                        <p className="text-xs text-muted-foreground">
                                            ~{formatWage((member.dailyWage || 0) * 26, t('finance.month'))}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                        
                        {/* Toplam Günlük Maliyet */}
                        <div className="flex items-center justify-between pt-2 mt-2 border-t-2 border-border">
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
            </div>
          </TabsContent>

          <TabsContent value="materials" className="space-y-4 sm:space-y-6">
            <MaterialsSection />
          </TabsContent>

          <TabsContent value="customers" className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">{t('app.customers')}</h2>
              <Button onClick={() => {
                setEditingCustomer(null);
                setCustomerFormOpen(true);
              }} className="gap-2 w-full sm:w-auto">
                <Plus className="h-4 w-4" />
                {t('customer.add')}
              </Button>
            </div>
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
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">{t('app.subscription')}</h2>
            <div className="max-w-3xl">
              <SubscriptionCard />
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
          if (!open) setEditingTeamMember(null);
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
