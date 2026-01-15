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

const getFormSchema = (t: any) => z.object({
  memberId: z.string().min(1, t("validation.required") || "Member must be selected"),
  workDate: z.string().min(1, t("validation.required") || "Date must be selected"),
  calculationType: z.enum(["hours", "days"]).default("hours"),
  hoursWorked: z.coerce.number().min(0).default(0),
  daysWorked: z.coerce.number().min(0).default(0),
  overtimeHours: z.coerce.number().min(0).default(0),
  leaveHours: z.coerce.number().min(0).default(0),
  leaveType: z.string().optional(),
  hourlyRate: z.coerce.number().min(0.01, t("validation.hourlyRateRequired") || "Hourly rate must be greater than 0").default(0),
  status: z.enum(["pending", "approved", "paid"]).default("pending"),
  notes: z.string().optional(),
});

export type TimesheetFormValues = z.infer<ReturnType<typeof getFormSchema>>;

interface TimesheetFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateTimesheetInput | UpdateTimesheetInput) => void;
  teamMembers: TeamMember[];
  defaultValues?: TimesheetEntry | null;
}

export const TimesheetForm = ({ open, onOpenChange, onSubmit, teamMembers, defaultValues }: TimesheetFormProps) => {
  const { t, i18n } = useTranslation();
  const formSchema = getFormSchema(t);

  const resolveDefaults = () => ({
    memberId: defaultValues?.team_member_id || "",
    workDate: defaultValues?.work_date || new Date().toISOString().split("T")[0],
    calculationType: "hours" as const,
    hoursWorked: defaultValues?.hours_worked ? defaultValues.hours_worked : 0,
    daysWorked: defaultValues?.hours_worked ? defaultValues.hours_worked / 8 : 0,
    overtimeHours: defaultValues?.overtime_hours ? defaultValues.overtime_hours : 0,
    leaveHours: defaultValues?.leave_hours ? defaultValues.leave_hours : 0,
    leaveType: defaultValues?.leave_type || "",
    hourlyRate: defaultValues?.hourly_rate ? defaultValues.hourly_rate : 0,
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
    let hours = 0;
    
    // Calculate hours based on calculation type
    if (values.calculationType === "days") {
      hours = toNumber(values.daysWorked) * 8;
    } else {
      hours = toNumber(values.hoursWorked);
    }
    
    const hourly = toNumber(values.hourlyRate);
    const overtimeHours = toNumber(values.overtimeHours);
    const leaveHours = toNumber(values.leaveHours);
    const leaveType = values.leaveType;

    // Only deduct leave hours if it's unpaid leave
    // Paid leave (paid), sick leave (sick), and annual leave (annual) are fully paid
    let deductibleLeaveHours = 0;
    if (leaveType === "unpaid") {
      deductibleLeaveHours = leaveHours;
    }

    const regularHours = Math.max(0, hours - deductibleLeaveHours);
    const base = regularHours * hourly;
    const overtime = overtimeHours * hourly * 1.5;
    return Math.max(0, base + overtime);
  };

  // Synchronize hours and days based on calculation type
  useEffect(() => {
    if (watchValues.calculationType === "days") {
      // If user enters days, keep daysWorked and sync hoursWorked
      if (watchValues.daysWorked > 0) {
        form.setValue("hoursWorked", watchValues.daysWorked * 8);
      }
    } else {
      // If user enters hours, keep hoursWorked and sync daysWorked
      if (watchValues.hoursWorked > 0) {
        form.setValue("daysWorked", watchValues.hoursWorked / 8);
      }
    }
  }, [watchValues.calculationType, form]);

  // Update hourly rate when member changes
  useEffect(() => {
    const member = teamMembers.find((m) => m.id === watchValues.memberId);
    if (member) {
      const hourly = (member.dailyWage || 0) / 8;
      form.setValue("hourlyRate", Number(hourly.toFixed(2)));
    }
  }, [watchValues.memberId, form, teamMembers]);

  const handleSubmit = async (values: TimesheetFormValues) => {
    try {
      // Convert days to hours if needed
      let finalHours = 0;
      if (values.calculationType === "days") {
        finalHours = (values.daysWorked || 0) * 8;
      } else {
        finalHours = values.hoursWorked || 0;
      }
      
      if (!values.memberId) {
        console.error("Ekip üyesi seçilmedi");
        return;
      }

      if (finalHours <= 0) {
        console.error("Çalışılan saat/gün 0'dan büyük olmalı");
        return;
      }

      if (!values.hourlyRate || values.hourlyRate <= 0) {
        console.error("Saatlik ücret gerekli");
        return;
      }
      
      const payable = computePayable(values);
      
      onSubmit({
        team_member_id: values.memberId,
        work_date: values.workDate,
        hours_worked: finalHours,
        overtime_hours: values.overtimeHours || 0,
        leave_hours: values.leaveHours || 0,
        leave_type: values.leaveType || null,
        hourly_rate: values.hourlyRate,
        payable_amount: payable,
        status: values.status,
        notes: values.notes || null,
      });
      
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sticky top-0 bg-background z-10">
          <DialogTitle>{t("timesheet.form.title")}</DialogTitle>
          <DialogDescription>{t("timesheet.form.subtitle")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 px-0">
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
                name="calculationType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("timesheet.form.calculationType") || "Hesap Türü"}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hours">{t("timesheet.form.hours") || "Saat"}</SelectItem>
                        <SelectItem value="days">{t("timesheet.form.days") || "Gün"}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch("calculationType") === "hours" ? (
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
                          value={field.value && field.value > 0 ? field.value : ""}
                          onChange={(e) => {
                            const val = e.target.value === "" ? 0 : Number(e.target.value);
                            field.onChange(val);
                            form.setValue("daysWorked", val / 8);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="daysWorked"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("timesheet.form.daysWorked") || "Çalışılan Gün"}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          value={field.value && field.value > 0 ? field.value : ""}
                          onChange={(e) => {
                            const val = e.target.value === "" ? 0 : Number(e.target.value);
                            field.onChange(val);
                            form.setValue("hoursWorked", val * 8);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

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
                        value={field.value && field.value > 0 ? field.value : ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
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
                        value={field.value && field.value > 0 ? field.value : ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
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
                        value={field.value && field.value > 0 ? field.value : ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
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

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 sticky bottom-0 bg-background border-t">
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
