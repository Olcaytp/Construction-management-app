import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useProjects } from "@/hooks/useProjects";
import { useTasks } from "@/hooks/useTasks";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useTimesheets } from "@/hooks/useTimesheets";
import { useMaterials } from "@/hooks/useMaterials";
import { useFormatCurrency } from "@/hooks/useCurrencyFormat";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, ScatterChart, Scatter
} from "recharts";
import { Users, Clock, DollarSign, ListTodo, TrendingUp, AlertCircle } from "lucide-react";
import { StatsCard } from "@/components/StatsCard";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const STATUS_COLORS = {
  'pending': '#f59e0b',
  'in-progress': '#3b82f6',
  'completed': '#10b981'
};

export const DashboardStats = () => {
  const { t } = useTranslation();
  const { projects } = useProjects();
  const { tasks } = useTasks();
  const { teamMembers } = useTeamMembers();
  const { timesheets } = useTimesheets();
  const { materials } = useMaterials();
  const { formatCurrency } = useFormatCurrency();

  // İstatistikler hesaplama
  const stats = useMemo(() => {
    // Aktif çalışanlar (en az 1 timesheet kaydı olan)
    const activeWorkers = teamMembers.filter(member => 
      timesheets.some(ts => ts.team_member_id === member.id)
    ).length;

    // Toplam çalışılan saat
    const totalHours = timesheets.reduce((sum, ts) => sum + (ts.hours_worked || 0), 0);

    // Toplam overtime
    const totalOvertime = timesheets.reduce((sum, ts) => sum + (ts.overtime_hours || 0), 0);

    // Toplam maliyet (timesheet ödemeleri)
    const totalTimesheetCost = timesheets.reduce((sum, ts) => sum + (ts.payable_amount || 0), 0);

    // Toplam görev tahmini maliyeti
    const totalTaskCost = tasks.reduce((sum, task) => sum + (task.estimatedCost || 0), 0);

    // Toplam maliyet
    const totalCost = totalTimesheetCost + totalTaskCost;

    // Görev dağılımı
    const taskDistribution = {
      pending: tasks.filter(t => t.status === 'pending').length,
      'in-progress': tasks.filter(t => t.status === 'in-progress').length,
      completed: tasks.filter(t => t.status === 'completed').length
    };

    // İşçi başına saat
    const workerHours = teamMembers.map(member => {
      const memberSheets = timesheets.filter(ts => ts.team_member_id === member.id);
      const hours = memberSheets.reduce((sum, ts) => sum + (ts.hours_worked || 0), 0);
      const cost = memberSheets.reduce((sum, ts) => sum + (ts.payable_amount || 0), 0);
      return {
        name: member.name.split(' ')[0], // İlk isim
        hours: Math.round(hours * 10) / 10,
        cost: cost,
        fullName: member.name
      };
    });

    // Proje maliyeti analizi
    const projectCosts = projects.map(project => {
      const projectTasks = tasks.filter(t => t.projectId === project.id);
      const tasksCost = projectTasks.reduce((sum, t) => sum + (t.estimatedCost || 0), 0);
      const projectTimesheets = timesheets.filter(ts => {
        const task = projectTasks.find(t => t.id === ts.team_member_id); // Approximation
        return !!task;
      });
      const timesheetCost = projectTimesheets.reduce((sum, ts) => sum + (ts.payable_amount || 0), 0);
      
      return {
        name: project.title.substring(0, 15),
        fullName: project.title,
        estimatedBudget: project.budget,
        actualCost: project.actualCost,
        tasksCost: tasksCost
      };
    });

    // Görev tamamlama oranı
    const completionRate = tasks.length > 0 
      ? Math.round((taskDistribution.completed / tasks.length) * 100)
      : 0;

    // Gerçekleşen birim maliyet (malzemelerdeki gerçek maliyet)
    const materialsWithQuantity = materials.filter(m => m.quantity && m.quantity > 0);
    const totalRealizedCost = materialsWithQuantity.reduce((sum, m) => sum + (m.actualCost || 0), 0);
    const totalMaterialQuantity = materialsWithQuantity.reduce((sum, m) => sum + m.quantity, 0);
    const realizedUnitPrice = totalMaterialQuantity > 0 ? totalRealizedCost / totalMaterialQuantity : 0;

    return {
      activeWorkers,
      totalHours,
      totalOvertime,
      totalTimesheetCost,
      totalTaskCost,
      totalCost,
      taskDistribution,
      completionRate,
      realizedUnitPrice,
      totalRealizedCost,
      totalMaterialQuantity,
      workerHours: workerHours.filter(w => w.hours > 0).sort((a, b) => b.hours - a.hours),
      projectCosts: projectCosts.filter(p => p.actualCost > 0 || p.tasksCost > 0),
      totalTeamMembers: teamMembers.length,
      totalProjects: projects.length,
      totalTasks: tasks.length
    };
  }, [projects, tasks, teamMembers, timesheets, materials]);

  // Görev dağılımı için pie chart data
  const taskDistributionData = [
    { name: t('task.status.pending') || 'Pending', value: stats.taskDistribution.pending, color: STATUS_COLORS['pending'] },
    { name: t('task.status.in-progress') || 'In Progress', value: stats.taskDistribution['in-progress'], color: STATUS_COLORS['in-progress'] },
    { name: t('task.status.completed') || 'Completed', value: stats.taskDistribution.completed, color: STATUS_COLORS['completed'] }
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">{t('stats.summary') || 'İstatistikler'}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('stats.overviewDescription') || 'Proje ve işçi performans analizi'}</p>
      </div>

      {/* Temel istatistik kartları */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-6">
        <StatsCard
          title={t('stats.activeWorkers') || 'Aktif Çalışan'}
          value={stats.activeWorkers}
          icon={Users}
          variant="info"
          trend={`${stats.totalTeamMembers} toplam`}
        />
        <StatsCard
          title={t('stats.totalHours') || 'Toplam Saat'}
          value={Math.round(stats.totalHours * 10) / 10}
          icon={Clock}
          variant="success"
          trend={`+${stats.totalOvertime.toFixed(1)} OT`}
        />
        <StatsCard
          title={t('stats.totalCost') || 'Toplam Maliyet'}
          value={formatCurrency(stats.totalCost)}
          icon={DollarSign}
          variant="warning"
        />
        <StatsCard
          title={t('stats.completedTasks') || 'Tamamlanan Görev'}
          value={stats.taskDistribution.completed}
          icon={ListTodo}
          variant="success"
          trend={`%${stats.completionRate} tamamlanma`}
        />
        <StatsCard
          title={t('stats.activeProjects') || 'Aktif Projeler'}
          value={projects.filter(p => p.status === 'active' || p.status === 'planning').length}
          icon={TrendingUp}
          variant="info"
          trend={`${stats.totalProjects} toplam`}
        />
        <StatsCard
          title={t('stats.realizedUnitPrice') || 'Gerçekleşen Birim Fiyatı'}
          value={stats.totalMaterialQuantity > 0 ? formatCurrency(stats.realizedUnitPrice) : formatCurrency(0)}
          icon={DollarSign}
          variant="info"
          trend={stats.totalMaterialQuantity > 0 ? `${stats.totalMaterialQuantity.toFixed(2)} miktar` : 'Veri yok'}
        />
      </div>

      {/* Grafikler */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Görev dağılımı */}
        {taskDistributionData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('stats.taskDistribution') || 'Görev Dağılımı'}</CardTitle>
              <CardDescription>{t('stats.byStatus') || 'Duruma göre görevler'}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={taskDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {taskDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2 text-sm">
                {taskDistributionData.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span>{item.name}</span>
                    </div>
                    <span className="font-semibold">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* İşçi başına çalışılan saat */}
        {stats.workerHours.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('stats.workerHours') || 'İşçi Saatleri'}</CardTitle>
              <CardDescription>{t('stats.hoursPerWorker') || 'İşçi başına toplam saat'}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={stats.workerHours}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 120 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={100} />
                  <Tooltip />
                  <Bar dataKey="hours" fill="#3b82f6" name={t('stats.hours') || 'Saat'} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Maliyetler detayı */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Gider analizi */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('stats.costanalysis') || 'Maliyet Analizi'}</CardTitle>
            <CardDescription>{t('stats.costBreakdown') || 'Gider dağılımı'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-sm font-medium">{t('stats.timesheetCosts') || 'Timesheet Maliyeti'}</span>
                </div>
                <span className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(stats.totalTimesheetCost)}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <span className="text-sm font-medium">{t('stats.taskCosts') || 'Görev Maliyeti'}</span>
                </div>
                <span className="font-bold text-amber-600 dark:text-amber-400">{formatCurrency(stats.totalTaskCost)}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950 mt-4">
                <span className="text-sm font-bold">{t('stats.totalCost') || 'Toplam Maliyet'}</span>
                <span className="font-bold text-lg text-green-600 dark:text-green-400">{formatCurrency(stats.totalCost)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* İşçi maliyet özeti */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('stats.workerCosts') || 'İşçi Maliyetleri'}</CardTitle>
            <CardDescription>{t('stats.costPerWorker') || 'İşçi başına toplam maliyet'}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {stats.workerHours.length > 0 ? (
                stats.workerHours.map((worker, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded hover:bg-accent/50 transition-colors">
                    <span className="text-sm font-medium">{worker.fullName}</span>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{formatCurrency(worker.cost)}</div>
                      <div className="text-xs text-muted-foreground">{worker.hours} saat</div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">{t('common.noData')}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ek bilgiler */}
      {stats.completionRate >= 80 && (
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-semibold text-sm">{t('stats.excellent') || 'Mükemmel Performans'}</p>
                <p className="text-xs text-muted-foreground">{t('stats.excellentMessage') || `%${stats.completionRate} görev tamamlandı. Harika ilerleme!`}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {stats.completionRate < 30 && stats.totalTasks > 0 && (
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <div>
                <p className="font-semibold text-sm">{t('stats.attention') || 'Dikkat Gerekli'}</p>
                <p className="text-xs text-muted-foreground">{t('stats.attentionMessage') || `Sadece %${stats.completionRate} görev tamamlandı. Pending görevleri kontrol edin.`}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
