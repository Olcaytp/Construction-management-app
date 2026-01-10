import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TimesheetForm } from "@/components/TimesheetForm";
import { useTimesheets } from "@/hooks/useTimesheets";
import type { CreateTimesheetInput, TimesheetEntry, UpdateTimesheetInput } from "@/hooks/useTimesheets";
import type { TeamMember } from "@/hooks/useTeamMembers";
import { Plus, Trash2, Clock, CalendarDays, DollarSign, Pencil } from "lucide-react";
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

  const handleSubmit = (payload: CreateTimesheetInput | UpdateTimesheetInput) => {
    if (editing) {
      updateTimesheet({ ...(payload as UpdateTimesheetInput), id: editing.id });
      setEditing(null);
    } else {
      createTimesheet(payload as CreateTimesheetInput);
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
              {totals.hours.toLocaleString(i18n.language)} {t("timesheet.metrics.hoursUnit")}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("timesheet.metrics.overtime")}</CardDescription>
            <CardTitle className="text-2xl text-amber-600">
              {totals.overtime.toLocaleString(i18n.language)} {t("timesheet.metrics.hoursUnit")}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("timesheet.metrics.leave")}</CardDescription>
            <CardTitle className="text-2xl text-blue-600">
              {totals.leave.toLocaleString(i18n.language)} {t("timesheet.metrics.hoursUnit")}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("timesheet.metrics.payable")}</CardDescription>
            <CardTitle className="text-2xl text-green-600">{formatMoney(totals.payable)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            <span>{t("timesheet.tableTitle")}</span>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-6 text-muted-foreground">{t("common.loading")}</div>
          ) : timesheets.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">{t("timesheet.empty")}</div>
          ) : (
            <div className="overflow-x-auto">
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
                  {timesheets.map((entry) => {
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
                          <Button variant="ghost" size="icon" onClick={() => deleteTimesheet(entry.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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
    </div>
  );
};
