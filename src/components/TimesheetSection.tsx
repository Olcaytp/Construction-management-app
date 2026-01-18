import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { TimesheetForm } from "@/components/TimesheetForm";
import { useTimesheets } from "@/hooks/useTimesheets";
import type { CreateTimesheetInput, TimesheetEntry, UpdateTimesheetInput } from "@/hooks/useTimesheets";
import type { TeamMember } from "@/hooks/useTeamMembers";
import { Plus, Trash2, Clock, CalendarDays, DollarSign, Pencil, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface TimesheetSectionProps {
  teamMembers: TeamMember[];
}

export const TimesheetSection = ({ teamMembers }: TimesheetSectionProps) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { timesheets, isLoading, createTimesheet, updateTimesheet, deleteTimesheet } = useTimesheets();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TimesheetEntry | null>(null);
  const [userCurrency, setUserCurrency] = useState<string>("");
  const [userCountry, setUserCountry] = useState<string>("");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      const { data } = await supabase.from('profiles').select('country, currency').eq('id', user.id).single();
      if (data) {
        setUserCountry(data.country || "");
        setUserCurrency(data.currency || "");
      }
    };
    loadProfile();
  }, [user]);

  const memberMap = useMemo(() => {
    const map: Record<string, TeamMember> = {};
    teamMembers.forEach((m) => { map[m.id] = m; });
    return map;
  }, [teamMembers]);

  const memberTimesheets = useMemo(() => {
    if (!selectedMemberId) return timesheets;
    return timesheets.filter(ts => ts.team_member_id === selectedMemberId);
  }, [timesheets, selectedMemberId]);

  const selectedMember = selectedMemberId ? memberMap[selectedMemberId] : null;

  // Always show totals for all team members (not filtered)
  const allTotals = useMemo(() => {
    return timesheets.reduce(
      (acc, entry) => {
        acc.hours += entry.hours_worked;
        acc.overtime += entry.overtime_hours;
        acc.leave += entry.leave_hours;
        acc.payable += entry.payable_amount;
        return acc;
      },
      { hours: 0, overtime: 0, leave: 0, payable: 0 }
    );
  }, [timesheets]);

  const currencyInfo = useMemo(() => {
    // Use profile currency first, fallback to language
    const currency = userCurrency || (i18n.language.startsWith("sv") ? "SEK" : i18n.language.startsWith("en") ? "USD" : "TRY");
    
    if (currency === "SEK") return { symbol: "kr", locale: "sv-SE", symbolAtEnd: true };
    if (currency === "USD") return { symbol: "$", locale: "en-US", symbolAtEnd: false };
    if (currency === "GBP") return { symbol: "£", locale: "en-GB", symbolAtEnd: false };
    if (currency === "EUR") return { symbol: "€", locale: "de-DE", symbolAtEnd: false };
    if (currency === "TRY") return { symbol: "₺", locale: "tr-TR", symbolAtEnd: false };
    return { symbol: "₺", locale: "tr-TR", symbolAtEnd: false };
  }, [userCurrency, i18n.language]);

  const formatMoney = (value: number) => {
    const { symbol, locale, symbolAtEnd } = currencyInfo;
    const formatted = value.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    return symbolAtEnd ? `${formatted} ${symbol}` : `${symbol}${formatted}`;
  };

  const totals = useMemo(() => {
    return memberTimesheets.reduce(
      (acc, entry) => {
        acc.hours += entry.hours_worked;
        acc.overtime += entry.overtime_hours;
        acc.leave += entry.leave_hours;
        acc.payable += entry.payable_amount;
        return acc;
      },
      { hours: 0, overtime: 0, leave: 0, payable: 0 }
    );
  }, [memberTimesheets]);

  const handleSubmit = (payload: CreateTimesheetInput | UpdateTimesheetInput) => {
    if (editing) {
      updateTimesheet({ ...(payload as UpdateTimesheetInput), id: editing.id });
      setEditing(null);
    } else {
      createTimesheet(payload as CreateTimesheetInput);
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirm) {
      deleteTimesheet(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-foreground">{t("timesheet.title")}</h3>
          <p className="text-sm text-muted-foreground">{t("timesheet.subtitle")}</p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          {t("timesheet.addEntry")}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("timesheet.metrics.hours")}</CardDescription>
            <CardTitle className="text-2xl">
              {allTotals.hours.toLocaleString(i18n.language)} {t("timesheet.metrics.hoursUnit")}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("timesheet.metrics.overtime")}</CardDescription>
            <CardTitle className="text-2xl text-amber-600">
              {allTotals.overtime.toLocaleString(i18n.language)} {t("timesheet.metrics.hoursUnit")}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("timesheet.metrics.leave")}</CardDescription>
            <CardTitle className="text-2xl text-blue-600">
              {allTotals.leave.toLocaleString(i18n.language)} {t("timesheet.metrics.hoursUnit")}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("timesheet.metrics.payable")}</CardDescription>
            <CardTitle className="text-2xl text-green-600">{formatMoney(allTotals.payable)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Team Members Dropdown */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">{t("app.team")}</CardTitle>
          </CardHeader>
          <CardContent>
            {teamMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("team.noTeamMembers") || "Ekip üyesi eklenmemiş"}
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                <Select value={selectedMemberId || ""} onValueChange={(value) => setSelectedMemberId(value || null)}>
                  <SelectTrigger className="w-full rounded-full border-2 border-orange-200 hover:border-orange-400 hover:bg-orange-50/50 dark:border-orange-800 dark:hover:border-orange-600 dark:hover:bg-orange-950/20 transition-all bg-background text-foreground">
                    <SelectValue placeholder="Ekip üyesi seçin" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name} ({member.specialty})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timesheet Records */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span>{t("timesheet.tableTitle")}</span>
            </div>
            {selectedMember && (
              <div className="text-lg font-semibold text-foreground">{selectedMember.name}</div>
            )}
          </CardHeader>
          <CardContent>
            {!selectedMemberId ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Lütfen ekip üyesi seçiniz</p>
              </div>
            ) : isLoading ? (
              <div className="text-center py-6 text-muted-foreground">{t("common.loading")}</div>
            ) : memberTimesheets.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                {t("timesheet.empty") || "Bu kişinin puantaj kaydı bulunamadı"}
              </div>
            ) : (
            <div className="space-y-3">
              {/* Desktop View - Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("timesheet.table.member")}</TableHead>
                      <TableHead>{t("timesheet.table.date")}</TableHead>
                      <TableHead>{t("timesheet.table.hours")}</TableHead>
                      <TableHead>{t("timesheet.table.overtime")}</TableHead>
                      <TableHead>{t("timesheet.table.leave")}</TableHead>
                      <TableHead>{t("timesheet.table.payable")}</TableHead>
                      <TableHead>{t("timesheet.table.status")}</TableHead>
                      <TableHead className="w-[80px]">{t("timesheet.table.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {memberTimesheets.map((entry) => {
                      const member = memberMap[entry.team_member_id];
                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div>{member?.name || t("common.noData")}</div>
                                <div className="text-xs text-muted-foreground">{member?.specialty}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{format(new Date(entry.work_date), "yyyy-MM-dd")}</TableCell>
                          <TableCell>{entry.hours_worked.toLocaleString(i18n.language)}</TableCell>
                          <TableCell>{entry.overtime_hours.toLocaleString(i18n.language)}</TableCell>
                          <TableCell>{entry.leave_hours.toLocaleString(i18n.language)} {entry.leave_type ? `(${entry.leave_type})` : ""}</TableCell>
                          <TableCell className="font-semibold text-green-600">{formatMoney(entry.payable_amount)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                entry.status === "approved"
                                  ? "default"
                                  : entry.status === "paid"
                                  ? "outline"
                                  : "secondary"
                              }
                            >
                              {t(`timesheet.status.${entry.status}`)}
                            </Badge>
                          </TableCell>
                          <TableCell className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditing(entry);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(entry.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile View - Expandable Cards */}
              <div className="md:hidden space-y-2">
                {memberTimesheets.map((entry) => {
                  const member = memberMap[entry.team_member_id];
                  const isExpanded = expandedMemberId === entry.id;
                  return (
                    <div key={entry.id} className="border border-border rounded-lg overflow-hidden bg-card">
                      <button
                        onClick={() => setExpandedMemberId(isExpanded ? null : entry.id)}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0 text-left">
                          <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{format(new Date(entry.work_date), "yyyy-MM-dd")}</div>
                            <div className="text-xs text-muted-foreground truncate">{member?.name || t("common.noData")}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge
                            variant={
                              entry.status === "approved"
                                ? "default"
                                : entry.status === "paid"
                                ? "outline"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {t(`timesheet.status.${entry.status}`)}
                          </Badge>
                          <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-4 py-3 border-t border-border bg-muted/30 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs text-muted-foreground">{t("timesheet.table.hours")}</p>
                              <p className="font-semibold">{entry.hours_worked.toLocaleString(i18n.language)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">{t("timesheet.table.overtime")}</p>
                              <p className="font-semibold text-amber-600">{entry.overtime_hours.toLocaleString(i18n.language)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">{t("timesheet.table.leave")}</p>
                              <p className="font-semibold text-blue-600">
                                {entry.leave_hours.toLocaleString(i18n.language)} {entry.leave_type ? `(${entry.leave_type})` : ""}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">{t("timesheet.table.payable")}</p>
                              <p className="font-semibold text-green-600">{formatMoney(entry.payable_amount)}</p>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs text-muted-foreground mb-1">{t("team.info") || "Bilgi"}</p>
                            <p className="text-sm">{member?.specialty}</p>
                          </div>

                          <div className="flex gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => {
                                setEditing(entry);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil className="h-3 w-3 mr-1" />
                              {t("common.edit") || "Düzenle"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-destructive hover:text-destructive"
                              onClick={() => setDeleteConfirm(entry.id)}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              {t("common.delete") || "Sil"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
            </CardContent>
          </Card>
        </div>

      <TimesheetForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
        onSubmit={handleSubmit}
        teamMembers={teamMembers}
        defaultValues={editing}
      />

      <AlertDialog open={deleteConfirm !== null} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("timesheet.confirmDelete")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
              {t("common.delete")}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
