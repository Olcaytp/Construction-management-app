import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TeamMember } from "@/hooks/useTeamMembers";
import type { CreateTimesheetInput, TimesheetEntry, UpdateTimesheetInput } from "@/hooks/useTimesheets";

const formSchema = z.object({
  memberId: z.string().min(1),
  workDate: z.string().min(1),
  hoursWorked: z.coerce.number().min(0),
  overtimeHours: z.coerce.number().min(0),
  leaveHours: z.coerce.number().min(0),
  leaveType: z.string().optional(),
  hourlyRate: z.coerce.number().min(0),
  status: z.enum(["pending", "approved", "paid"]).default("pending"),
  notes: z.string().optional(),
});

export type TimesheetFormValues = z.infer<typeof formSchema>;

interface TimesheetFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateTimesheetInput | UpdateTimesheetInput) => void;
  teamMembers: TeamMember[];
  defaultValues?: TimesheetEntry | null;
}

export const TimesheetForm = ({ open, onOpenChange, onSubmit, teamMembers, defaultValues }: TimesheetFormProps) => {
  const { t, i18n } = useTranslation();

  const resolveDefaults = () => ({
    memberId: defaultValues?.team_member_id || "",
    workDate: defaultValues?.work_date || new Date().toISOString().split("T")[0],
    hoursWorked: defaultValues?.hours_worked ?? undefined,
    overtimeHours: defaultValues?.overtime_hours ?? undefined,
    leaveHours: defaultValues?.leave_hours ?? undefined,
    leaveType: defaultValues?.leave_type || "",
    hourlyRate: defaultValues?.hourly_rate ?? undefined,
    status: (defaultValues?.status as TimesheetFormValues["status"]) || "pending",
    notes: defaultValues?.notes || "",
  });

  const form = useForm<TimesheetFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: resolveDefaults(),
  });

  useEffect(() => {
    form.reset(resolveDefaults());
  }, [defaultValues, form]);

  const watchValues = form.watch();

  const getCurrency = () => {
    const lang = i18n.language;
    if (lang.startsWith("sv")) return { symbol: "kr", locale: "sv-SE", symbolAtEnd: true };
    if (lang.startsWith("en")) return { symbol: "$", locale: "en-US", symbolAtEnd: false };
    return { symbol: "₺", locale: "tr-TR", symbolAtEnd: false };
  };

  const formatMoney = (value: number) => {
    const { symbol, locale, symbolAtEnd } = getCurrency();
    const formatted = value.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    return symbolAtEnd ? `${formatted} ${symbol}` : `${symbol}${formatted}`;
  };

  const toNumber = (value: number | undefined) => (Number.isFinite(value) ? Number(value) : 0);

  const computePayable = (values: TimesheetFormValues) => {
    const hours = toNumber(values.hoursWorked);
    const hourly = toNumber(values.hourlyRate);
    const overtimeHours = toNumber(values.overtimeHours);
    const leaveHours = toNumber(values.leaveHours);

    const base = hours * hourly;
    const overtime = overtimeHours * hourly * 1.5;
    const leaveDeduction = leaveHours * hourly;
    return Math.max(0, base + overtime - leaveDeduction);
  };

  // Update hourly rate when member changes
  useEffect(() => {
    const member = teamMembers.find((m) => m.id === watchValues.memberId);
    if (member) {
      const hourly = (member.dailyWage || 0) / 8;
      form.setValue("hourlyRate", Number(hourly.toFixed(2)));
    }
  }, [watchValues.memberId, form, teamMembers]);

  const handleSubmit = (values: TimesheetFormValues) => {
    const payable = computePayable(values);
    onSubmit({
      team_member_id: values.memberId,
      work_date: values.workDate,
      hours_worked: values.hoursWorked,
      overtime_hours: values.overtimeHours,
      leave_hours: values.leaveHours,
      leave_type: values.leaveType || null,
      hourly_rate: values.hourlyRate,
      payable_amount: payable,
      status: values.status,
      notes: values.notes || null,
    });
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("timesheet.form.title")}</DialogTitle>
          <DialogDescription>{t("timesheet.form.subtitle")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="memberId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("timesheet.form.member")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("timesheet.form.memberPlaceholder") || undefined} />
                      </SelectTrigger>
                      <SelectContent>
                        {teamMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="workDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("timesheet.form.date")}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="hoursWorked"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("timesheet.form.hoursWorked")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="overtimeHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("timesheet.form.overtimeHours")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="leaveHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("timesheet.form.leaveHours")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="leaveType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("timesheet.form.leaveType")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("timesheet.form.leaveTypePlaceholder") || undefined} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paid">{t("timesheet.form.leaveTypes.paid")}</SelectItem>
                        <SelectItem value="unpaid">{t("timesheet.form.leaveTypes.unpaid")}</SelectItem>
                        <SelectItem value="sick">{t("timesheet.form.leaveTypes.sick")}</SelectItem>
                        <SelectItem value="annual">{t("timesheet.form.leaveTypes.annual")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hourlyRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("timesheet.form.hourlyRate")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("timesheet.form.status")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("timesheet.form.status") || undefined} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">{t("timesheet.status.pending")}</SelectItem>
                        <SelectItem value="approved">{t("timesheet.status.approved")}</SelectItem>
                        <SelectItem value="paid">{t("timesheet.status.paid")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("timesheet.form.notes")}</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder={t("timesheet.form.notesPlaceholder") || undefined} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between bg-muted/40 rounded-lg p-3 border border-muted">
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>{t("timesheet.form.payableHint")}</p>
                <p>{t("timesheet.form.formula")}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{t("timesheet.form.estimatedPayable")}</p>
                <p className="text-xl font-bold text-primary">{formatMoney(computePayable(watchValues))}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  onOpenChange(false);
                }}
                className="w-full sm:w-auto"
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" className="w-full sm:w-auto">
                {t("timesheet.form.submit")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
