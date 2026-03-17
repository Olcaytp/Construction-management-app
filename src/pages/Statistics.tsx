import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Users, Clock, DollarSign, Calendar, ArrowLeft, Edit2, X, Check } from "lucide-react";
import { useTasks } from "@/hooks/useTasks";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useTimesheets } from "@/hooks/useTimesheets";
import { useProjects } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface TaskStatistics {
  taskId: string;
  taskTitle: string;
  projectId: string;
  projectName: string;
  status: string;
  priority: string;
  estimatedCost: number;
  workers: Array<{
    id: string;
    name: string;
    hourlyRate: number;
    totalHours: number;
    totalDays: number;
    actualCost: number;
  }>;
  totalWorkers: number;
  totalHours: number;
  totalDays: number;
  totalCost: number;
  personHours: number;
  dailyPersonHours: number;
}

interface CustomTaskStats {
  workerCount: number;
  hoursWorked: number;
  daysWorked: number;
  actualCost: number;
}

const Statistics = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { tasks } = useTasks();
  const { teamMembers } = useTeamMembers();
  const { timesheets } = useTimesheets();
  const { projects } = useProjects();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [customStats, setCustomStats] = useState<Record<string, CustomTaskStats>>(() => {
    try {
      const saved = localStorage.getItem("taskCustomStats");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [editForm, setEditForm] = useState<CustomTaskStats>({
    workerCount: 0,
    hoursWorked: 0,
    daysWorked: 0,
    actualCost: 0,
  });

  const saveCustomStats = (taskId: string, stats: CustomTaskStats) => {
    const updated = { ...customStats, [taskId]: stats };
    setCustomStats(updated);
    localStorage.setItem("taskCustomStats", JSON.stringify(updated));
  };

  const openEditModal = (taskId: string) => {
    const existing = customStats[taskId] || {
      workerCount: 0,
      hoursWorked: 0,
      daysWorked: 0,
      actualCost: 0,
    };
    setEditForm(existing);
    setEditingTaskId(taskId);
  };

  const saveEdit = () => {
    if (editingTaskId) {
      saveCustomStats(editingTaskId, editForm);
      setEditingTaskId(null);
    }
  };

  const getCurrencyFormat = (language: string) => {
    if (language.startsWith("sv")) {
      return { locale: "sv-SE", symbol: "kr", symbolAtEnd: true };
    }
    if (language.startsWith("en")) {
      return { locale: "en-US", symbol: "$", symbolAtEnd: false };
    }
    return { locale: "tr-TR", symbol: "TL", symbolAtEnd: false };
  };

  const formatCurrency = (amount: number) => {
    const { locale, symbol, symbolAtEnd } = getCurrencyFormat(i18n.language);
    const formattedAmount = amount.toLocaleString(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return symbolAtEnd ? `${formattedAmount} ${symbol}` : `${symbol}${formattedAmount}`;
  };

  const calculateTaskStatistics = (): TaskStatistics[] => {
    return tasks.map((task) => {
      const projectName = projects?.find((p) => p.id === task.projectId)?.title || "N/A";
      const custom = customStats[task.id];

      if (custom && custom.actualCost > 0) {
        // Custom stats'dan hesapla
        const totalCost = custom.actualCost;
        const personHours = custom.daysWorked * custom.hoursWorked * custom.workerCount;
        const dailyPersonHours = custom.hoursWorked * custom.workerCount;

        return {
          taskId: task.id,
          taskTitle: task.title,
          projectId: task.projectId,
          projectName,
          status: task.status,
          priority: task.priority,
          estimatedCost: task.estimatedCost,
          workers: [],
          totalWorkers: custom.workerCount,
          totalHours: custom.hoursWorked,
          totalDays: custom.daysWorked,
          totalCost,
          personHours,
          dailyPersonHours,
        };
      }

      // Varsayılan hesaplamalar
      const assignedWorkers = new Set<string>();
      const workerStats: Record<string, {name: string; hourlyRate: number; totalHours: number; dates: Set<string>}> = {};

      timesheets.forEach((timesheet) => {
        if ("task_id" in timesheet && timesheet.task_id === task.id) {
          const worker = teamMembers?.find((m) => m.id === timesheet.team_member_id);
          if (worker) {
            assignedWorkers.add(timesheet.team_member_id);
            if (!workerStats[timesheet.team_member_id]) {
              workerStats[timesheet.team_member_id] = {
                name: worker.name,
                hourlyRate: timesheet.hourly_rate || worker.dailyWage || 0,
                totalHours: 0,
                dates: new Set(),
              };
            }
            workerStats[timesheet.team_member_id].totalHours += timesheet.hours_worked + (timesheet.overtime_hours || 0);
            workerStats[timesheet.team_member_id].dates.add(timesheet.work_date);
          }
        }
      });

      if (task.assignedTo && assignedWorkers.size === 0) {
        const worker = teamMembers?.find((m) => m.id === task.assignedTo);
        if (worker) {
          assignedWorkers.add(task.assignedTo);
          if (!workerStats[task.assignedTo]) {
            workerStats[task.assignedTo] = {
              name: worker.name,
              hourlyRate: worker.dailyWage || 0,
              totalHours: 0,
              dates: new Set(),
            };
          }
        }
      }

      const workers = Array.from(assignedWorkers).map((workerId) => {
        const stats = workerStats[workerId];
        return {
          id: workerId,
          name: stats.name,
          hourlyRate: stats.hourlyRate,
          totalHours: stats.totalHours,
          totalDays: stats.dates.size,
          actualCost: stats.totalHours * stats.hourlyRate,
        };
      });

      const totalHours = workers.reduce((sum, w) => sum + w.totalHours, 0);
      const totalDays = Math.max(...Array.from(assignedWorkers).map((id) => workerStats[id].dates.size), 0);
      const totalCost = workers.reduce((sum, w) => sum + w.actualCost, 0);
      const totalWorkers = assignedWorkers.size;
      const personHours = totalDays * totalHours;
      const dailyPersonHours = totalHours * totalWorkers;

      return {
        taskId: task.id,
        taskTitle: task.title,
        projectId: task.projectId,
        projectName,
        status: task.status,
        priority: task.priority,
        estimatedCost: task.estimatedCost,
        workers,
        totalWorkers,
        totalHours,
        totalDays,
        totalCost,
        personHours,
        dailyPersonHours,
      };
    });
  };

  const statistics = calculateTaskStatistics();

  const filteredStatistics = useMemo(() => {
    return statistics.filter((stat) => {
      const matchesSearch =
        stat.taskTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stat.projectName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || stat.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [statistics, searchQuery, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-orange-100 text-orange-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="sm" onClick={() => navigate("/")} className="gap-2 flex-shrink-0">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{t("common.back") || "Back"}</span>
          </Button>
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-slate-900">{t("statistics.title") || "Statistics"}</h1>
            <p className="text-slate-600 mt-2">{t("statistics.description") || "Detailed statistics for each task"}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div>
            <Input
              placeholder={t("common.search") || "Search"}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white"
            />
          </div>
          <div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder={t("common.status") || "Status"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all") || "All"}</SelectItem>
                <SelectItem value="pending">{t("task.status.pending") || "Pending"}</SelectItem>
                <SelectItem value="in-progress">{t("task.status.in-progress") || "In Progress"}</SelectItem>
                <SelectItem value="completed">{t("task.status.completed") || "Completed"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-right pt-2">
            <p className="text-sm text-slate-600">
              {t("statistics.totalTasks") || "Total Tasks"}: <span className="font-bold text-slate-900">{filteredStatistics.length}</span>
            </p>
          </div>
        </div>

        {filteredStatistics.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-slate-600">{t("common.noData") || "No data"}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredStatistics.map((stat) => (
              <Card key={stat.taskId} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <CardTitle className="text-xl text-slate-900">{stat.taskTitle}</CardTitle>
                      <CardDescription className="text-slate-600">
                        {t("common.project") || "Project"}: {stat.projectName}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2 items-start">
                      <div className="flex gap-2">
                        <Badge className={getStatusColor(stat.status)}>
                          {t(`task.status.${stat.status}`) || stat.status}
                        </Badge>
                        <Badge className={getPriorityColor(stat.priority)}>
                          {t(`task.priority.${stat.priority}`) || stat.priority}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditModal(stat.taskId)}
                        className="gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>{t("common.edit") || "Edit"}</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        <p className="text-sm text-blue-600 font-medium">{t("statistics.workers") || "Workers"}</p>
                      </div>
                      <p className="text-3xl font-bold text-blue-900">{stat.totalWorkers}</p>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-purple-600" />
                        <p className="text-sm text-purple-600 font-medium">{t("statistics.dailyHours") || "Hours"}</p>
                      </div>
                      <p className="text-3xl font-bold text-purple-900">{stat.totalHours.toFixed(1)}</p>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-amber-600" />
                        <p className="text-sm text-amber-600 font-medium">{t("statistics.days") || "Days"}</p>
                      </div>
                      <p className="text-3xl font-bold text-amber-900">{stat.totalDays}</p>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <p className="text-sm text-green-600 font-medium">{t("statistics.actualCost") || "Actual"}</p>
                      </div>
                      <p className="text-2xl font-bold text-green-900">{formatCurrency(stat.totalCost)}</p>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="w-4 h-4 text-orange-600" />
                        <p className="text-sm text-orange-600 font-medium">{t("statistics.estimatedCost") || "Est."}</p>
                      </div>
                      <p className="text-2xl font-bold text-orange-900">{formatCurrency(stat.estimatedCost)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-sm text-slate-600">{t("statistics.personHours") || "Person-Hours"}</p>
                      <p className="text-xl font-bold text-slate-900">{stat.personHours.toFixed(0)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">{t("statistics.dailyPersonHours") || "Daily Person-Hours"}</p>
                      <p className="text-xl font-bold text-slate-900">{stat.dailyPersonHours.toFixed(0)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">{t("statistics.costDifference") || "Difference"}</p>
                      <div className="flex items-baseline gap-1">
                        <p className="text-xl font-bold text-slate-900">{formatCurrency(Math.abs(stat.totalCost - stat.estimatedCost))}</p>
                        <span className={`text-sm font-semibold ${stat.totalCost > stat.estimatedCost ? "text-red-600" : "text-green-600"}`}>
                          {stat.totalCost > stat.estimatedCost ? "+" : "-"}
                          {Math.abs((stat.totalCost / (stat.estimatedCost || 1) - 1) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {stat.workers.length > 0 && (
                    <div className="pt-4 border-t">
                      <h3 className="font-semibold text-slate-900 mb-4">{t("statistics.workerDetails") || "Worker Details"}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {stat.workers.map((worker) => (
                          <div key={worker.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <p className="font-medium text-slate-900 mb-3">{worker.name}</p>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-slate-600">{t("statistics.hoursWorked") || "Hours"}:</span>
                                <span className="font-semibold text-slate-900">{worker.totalHours.toFixed(1)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-600">{t("statistics.daysWorked") || "Days"}:</span>
                                <span className="font-semibold text-slate-900">{worker.totalDays}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-600">{t("statistics.hourlyRate") || "Rate"}:</span>
                                <span className="font-semibold text-slate-900">{formatCurrency(worker.hourlyRate)}</span>
                              </div>
                              <div className="flex justify-between pt-2 border-t border-slate-300">
                                <span className="text-slate-600 font-medium">{t("statistics.totalWorkerCost") || "Total"}:</span>
                                <span className="font-bold text-slate-900">{formatCurrency(worker.actualCost)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {stat.workers.length === 0 && (
                    <div className="p-4 bg-slate-50 rounded-lg text-center text-slate-600">
                      {t("statistics.noWorkerData") || "No worker data"}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Modal */}
        <Dialog open={!!editingTaskId} onOpenChange={(open) => !open && setEditingTaskId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("statistics.editTaskStats") || "Edit Task Statistics"}</DialogTitle>
              <DialogDescription>
                {t("statistics.editTaskStatsDesc") || "Update the task statistics below"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="workerCount">{t("statistics.workers") || "Number of Workers"}</Label>
                <Input
                  id="workerCount"
                  type="number"
                  min="0"
                  value={editForm.workerCount}
                  onChange={(e) => setEditForm({ ...editForm, workerCount: parseInt(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="hoursWorked">{t("statistics.hoursWorked") || "Hours Worked"}</Label>
                <Input
                  id="hoursWorked"
                  type="number"
                  min="0"
                  step="0.5"
                  value={editForm.hoursWorked}
                  onChange={(e) => setEditForm({ ...editForm, hoursWorked: parseFloat(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="daysWorked">{t("statistics.daysWorked") || "Days Worked"}</Label>
                <Input
                  id="daysWorked"
                  type="number"
                  min="0"
                  value={editForm.daysWorked}
                  onChange={(e) => setEditForm({ ...editForm, daysWorked: parseInt(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="actualCost">{t("statistics.actualCost") || "Actual Cost"}</Label>
                <Input
                  id="actualCost"
                  type="number"
                  min="0"
                  step="100"
                  value={editForm.actualCost}
                  onChange={(e) => setEditForm({ ...editForm, actualCost: parseFloat(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
                <p className="font-semibold mb-2">{t("statistics.preview") || "Preview"}:</p>
                <div className="space-y-1 text-xs">
                  <p>• {t("statistics.workers")}: {editForm.workerCount}</p>
                  <p>• {t("statistics.totalHours")}: {editForm.hoursWorked.toFixed(1)}</p>
                  <p>• {t("statistics.days")}: {editForm.daysWorked}</p>
                  <p>• {t("statistics.actualCost")}: {formatCurrency(editForm.actualCost)}</p>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setEditingTaskId(null)}
                  className="gap-1"
                >
                  <X className="w-4 h-4" />
                  {t("common.cancel") || "Cancel"}
                </Button>
                <Button
                  onClick={saveEdit}
                  className="gap-1"
                >
                  <Check className="w-4 h-4" />
                  {t("common.save") || "Save"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Statistics;
